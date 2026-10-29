(function () {
  const P = window.P;
  const enc = new TextEncoder();
  const bytes = function (s) { return enc.encode(s); };
  const pad2 = function (v) { return String(v).padStart(2, '0'); };
  const xml = function (s) {
    return String(s).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  };

  const crcTable = (function () {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c >>> 0;
    }
    return t;
  })();

  function crc32(u8) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < u8.length; i++) c = crcTable[(c ^ u8[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function concat(parts) {
    let len = 0;
    parts.forEach(function (p) { len += p.length; });
    const out = new Uint8Array(len);
    let o = 0;
    parts.forEach(function (p) {
      out.set(p, o);
      o += p.length;
    });
    return out;
  }

  function zip(files) {
    const parts = [];
    const central = [];
    let offset = 0;
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    files.forEach(function (f) {
      const name = bytes(f.name);
      const data = f.data;
      const crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true);
      lh.setUint16(4, 20, true);
      lh.setUint16(6, 0x0800, true);
      lh.setUint16(8, 0, true);
      lh.setUint16(10, dosTime, true);
      lh.setUint16(12, dosDate, true);
      lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true);
      lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true);
      lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true);
      ch.setUint16(4, 20, true);
      ch.setUint16(6, 20, true);
      ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true);
      ch.setUint16(12, dosTime, true);
      ch.setUint16(14, dosDate, true);
      ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true);
      ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    });
    const cd = concat(central);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, cd.length, true);
    end.setUint32(16, offset, true);
    return new Blob([concat(parts), cd, new Uint8Array(end.buffer)], { type: 'application/zip' });
  }

  function pdf(pages) {
    const parts = [];
    const offsets = [];
    let pos = 0;
    const push = function (u8) {
      parts.push(u8);
      pos += u8.length;
    };
    const pushStr = function (s) { push(bytes(s)); };
    const begin = function (num) {
      offsets[num] = pos;
      pushStr(num + ' 0 obj\n');
    };
    pushStr('%PDF-1.4\n%âãÏÓ\n');
    begin(1);
    pushStr('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    begin(2);
    const kids = pages.map(function (p, i) { return (3 + i * 3) + ' 0 R'; }).join(' ');
    pushStr('<< /Type /Pages /Kids [' + kids + '] /Count ' + pages.length + ' >>\nendobj\n');
    pages.forEach(function (p, i) {
      const po = 3 + i * 3;
      const wpt = (p.wmm * 72 / 25.4).toFixed(2);
      const hpt = (p.hmm * 72 / 25.4).toFixed(2);
      begin(po);
      pushStr('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + wpt + ' ' + hpt + '] /Resources << /XObject << /Im0 ' + (po + 2) + ' 0 R >> >> /Contents ' + (po + 1) + ' 0 R >>\nendobj\n');
      const content = 'q ' + wpt + ' 0 0 ' + hpt + ' 0 0 cm /Im0 Do Q';
      begin(po + 1);
      pushStr('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream\nendobj\n');
      begin(po + 2);
      pushStr('<< /Type /XObject /Subtype /Image /Width ' + p.pw + ' /Height ' + p.ph + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.jpeg.length + ' >>\nstream\n');
      push(p.jpeg);
      pushStr('\nendstream\nendobj\n');
    });
    const total = 3 + pages.length * 3;
    const xrefPos = pos;
    let x = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
    for (let i = 1; i < total; i++) x += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    pushStr(x + 'trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xrefPos + '\n%%EOF\n');
    return new Blob([concat(parts)], { type: 'application/pdf' });
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('render')); };
      img.src = src;
    });
  }

  async function rasterize(svg, wmm, hmm, dpi) {
    const maxSide = 16000;
    let cw = Math.round(wmm / 25.4 * dpi);
    let ch = Math.round(hmm / 25.4 * dpi);
    const k = Math.min(1, maxSide / Math.max(cw, ch));
    cw = Math.round(cw * k);
    ch = Math.round(ch * k);
    const img = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);
    return canvas;
  }

  function canvasBlob(canvas, type, q) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) {
        if (b) resolve(b);
        else reject(new Error('encode'));
      }, type, q);
    });
  }

  function colName(i) { return String.fromCharCode(65 + i); }

  function sheetXml(c, yr, mo, notes, paperId) {
    const ws = +c.weekStart;
    const rows = P.matrix(yr, mo, ws);
    const hol = P.holidayFn(c.holidays);
    const title = P.monthName(c.locale, mo) + ' ' + yr;
    const run = function (text, bold, size, color) {
      return '<r><rPr>' + (bold ? '<b/>' : '') + '<sz val="' + size + '"/><color rgb="' + color + '"/><rFont val="Calibri"/></rPr><t xml:space="preserve">' + xml(text) + '</t></r>';
    };
    let sd = '<row r="1" ht="42" customHeight="1"><c r="A1" s="1" t="inlineStr"><is><t>' + xml(title) + '</t></is></c></row>';
    sd += '<row r="2" ht="24" customHeight="1">';
    for (let i = 0; i < 7; i++) {
      sd += '<c r="' + colName(i) + '2" s="2" t="inlineStr"><is><t>' + xml(P.weekdayName(c.locale, (ws + i) % 7, 'long').toUpperCase()) + '</t></is></c>';
    }
    sd += '</row>';
    rows.forEach(function (row, ri) {
      const r = ri + 3;
      sd += '<row r="' + r + '" ht="84" customHeight="1">';
      row.forEach(function (cell, ci) {
        const key = P.dateKey(cell.y, cell.m, cell.d);
        const weekend = cell.dow === 0 || cell.dow === 6;
        const h = cell.inMonth ? hol(cell.y, cell.m, cell.d) : '';
        const style = !cell.inMonth ? 5 : (weekend || h ? 4 : 3);
        const numColor = !cell.inMonth ? 'FF9E9E9E' : (weekend || h ? 'FFC0504D' : 'FF111111');
        let rich = run(String(cell.d), true, 14, numColor);
        if (h) rich += run('\n' + h, false, 9, 'FFC0504D');
        const note = cell.inMonth ? (notes[key] || '') : '';
        if (note) rich += run('\n' + note, false, 10, 'FF111111');
        sd += '<c r="' + colName(ci) + r + '" s="' + style + '" t="inlineStr"><is>' + rich + '</is></c>';
      });
      sd += '</row>';
    });
    const last = rows.length + 2;
    const paper = P.papers.find(function (p) { return p.id === paperId; });
    const ps = paper && paper.xlsx ? ' paperSize="' + paper.xlsx + '"' : '';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
      '<dimension ref="A1:G' + last + '"/>' +
      '<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      '<cols><col min="1" max="7" width="22" customWidth="1"/></cols>' +
      '<sheetData>' + sd + '</sheetData>' +
      '<mergeCells count="1"><mergeCell ref="A1:G1"/></mergeCells>' +
      '<pageMargins left="0.4" right="0.4" top="0.4" bottom="0.4" header="0.2" footer="0.2"/>' +
      '<pageSetup' + ps + ' orientation="landscape" fitToWidth="1" fitToHeight="1"/>' +
      '</worksheet>';
  }

  function xlsx(c, months, notes) {
    const files = [];
    const add = function (name, text) { files.push({ name: name, data: bytes(text) }); };
    const n = months.length;
    let ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
    for (let i = 1; i <= n; i++) ct += '<Override PartName="/xl/worksheets/sheet' + i + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    add('[Content_Types].xml', ct + '</Types>');
    add('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    let sheets = '';
    let rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
    months.forEach(function (m, i) {
      const name = (P.monthName(c.locale, m.m) + ' ' + m.y).replace(/[\[\]:*?\/\\]/g, '').slice(0, 31);
      sheets += '<sheet name="' + xml(name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
      rels += '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
      add('xl/worksheets/sheet' + (i + 1) + '.xml', sheetXml(c, m.y, m.m, notes, c.paper));
    });
    rels += '<Relationship Id="rId' + (n + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    add('xl/_rels/workbook.xml.rels', rels);
    add('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>' + sheets + '</sheets></workbook>');
    add('xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="24"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
      '<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFDDE3EA"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFBEFEC"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFF4F4F4"/><bgColor indexed="64"/></patternFill></fill></fills>' +
      '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF9B9B9B"/></left><right style="thin"><color rgb="FF9B9B9B"/></right><top style="thin"><color rgb="FF9B9B9B"/></top><bottom style="thin"><color rgb="FF9B9B9B"/></bottom><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
    return zip(files);
  }

  function csv(c, months, notes) {
    const sep = c.locale === 'en' ? ',' : ';';
    const hol = P.holidayFn(c.holidays);
    const q = function (s) { return '"' + String(s).replace(/"/g, '""') + '"'; };
    const lines = [['Date', 'Weekday', 'Holiday', 'Note'].map(q).join(sep)];
    months.forEach(function (m) {
      for (let d = 1; d <= P.daysIn(m.y, m.m); d++) {
        const dt = new Date(m.y, m.m, d);
        const key = P.dateKey(m.y, m.m, d);
        lines.push([key, P.weekdayName(c.locale, dt.getDay(), 'long'), hol(m.y, m.m, d), notes[key] || ''].map(q).join(sep));
      }
    });
    return new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
  }

  P.exp = {
    zip: zip,
    pdf: pdf,
    rasterize: rasterize,
    canvasBlob: canvasBlob,
    xlsx: xlsx,
    csv: csv,
    bytes: bytes
  };
})();
