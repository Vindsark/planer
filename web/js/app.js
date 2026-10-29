(function () {
  const P = window.P;
  const $ = function (s) { return document.querySelector(s); };
  const $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  const numeric = { cw: 1, ch: 1, margin: 1, bgAlpha: 1, cellOp: 1, weekStart: 1, dpi: 1 };

  let st = Object.assign({}, P.defaults);
  let notes = {};
  let image = null;
  let serverMode = false;
  let busy = false;
  const today = new Date();
  const view = { y: today.getFullYear(), m: today.getMonth(), d: today.getDate() };

  const sheet = $('#sheet');
  const stage = $('#stage');

  const Store = {
    timer: null,
    async load() {
      try {
        const r = await fetch('api/state', { cache: 'no-store' });
        if (r.ok) {
          const j = await r.json();
          serverMode = true;
          return j;
        }
      } catch (e) {
        serverMode = false;
      }
      try {
        return JSON.parse(localStorage.getItem('planer.state') || 'null');
      } catch (e) {
        return null;
      }
    },
    save() {
      clearTimeout(this.timer);
      this.timer = setTimeout(function () {
        const data = { settings: st, notes: notes, image: image };
        if (serverMode) {
          fetch('api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).catch(function () {});
          return;
        }
        try {
          localStorage.setItem('planer.state', JSON.stringify(data));
        } catch (e) {
          try {
            localStorage.setItem('planer.state', JSON.stringify({ settings: st, notes: notes, image: null }));
          } catch (e2) {}
        }
      }, 250);
    }
  };

  function toast(text, keep) {
    const t = $('#toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toast.timer);
    if (!keep) toast.timer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  function opt(value, label) {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    return o;
  }

  function fillSelect(sel, items, valueKey, labelKey) {
    sel.innerHTML = '';
    items.forEach(function (it) { sel.appendChild(opt(it[valueKey], it[labelKey])); });
  }

  function buildStaticControls() {
    fillSelect($('[data-key="layout"]'), P.layouts, 'id', 'name');
    fillSelect($('[data-key="paper"]'), P.papers, 'id', 'name');
    fillSelect($('[data-key="locale"]'), P.locales, 'id', 'name');
    fillSelect($('[data-key="weekStart"]'), P.weekStarts, 'id', 'name');
    fillSelect($('[data-key="holidays"]'), P.holidaySets, 'id', 'name');
    fillSelect($('[data-key="font"]'), P.fontNames, 'id', 'name');
    fillSelect($('[data-key="dpi"]'), [72, 150, 200, 300].map(function (v) { return { id: v, name: v + ' dpi' }; }), 'id', 'name');
    fillSelect($('[data-key="scope"]'), [{ id: 'page', name: 'Текущую страницу' }, { id: 'year', name: 'Весь год' }], 'id', 'name');
  }

  function buildMonthSelect() {
    const sel = $('#monthSel');
    sel.innerHTML = '';
    for (let i = 0; i < 12; i++) sel.appendChild(opt(i, P.monthName(st.locale, i)));
    sel.value = view.m;
  }

  function buildPalettes() {
    const box = $('#palettes');
    box.innerHTML = '';
    P.palettes.forEach(function (p) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sw' + (st.palette === p.id ? ' on' : '');
      b.title = p.name;
      b.setAttribute('aria-label', p.name);
      b.dataset.id = p.id;
      const stops = [p.bg[0], p.bg[1], p.bg[2], p.accent];
      b.style.background = 'conic-gradient(' + stops.map(function (c, i) { return c + ' ' + i * 25 + '% ' + (i + 1) * 25 + '%'; }).join(',') + ')';
      b.addEventListener('click', function () {
        st.palette = p.id;
        change();
      });
      box.appendChild(b);
    });
  }

  function buildBgs() {
    const box = $('#bgs');
    box.innerHTML = '';
    P.backgrounds.forEach(function (b) {
      if (b.hidden && !image) return;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'th' + (st.bg === b.id ? ' on' : '');
      el.title = b.name;
      el.setAttribute('aria-label', b.name);
      if (b.id === 'image') el.innerHTML = '<img alt="" src="' + image + '">';
      else el.innerHTML = P.bgThumb(b.id, st);
      el.addEventListener('click', function () {
        st.bg = b.id;
        change();
      });
      box.appendChild(el);
    });
  }

  function syncControls() {
    $$('[data-key]').forEach(function (el) {
      const k = el.dataset.key;
      if (el.type === 'checkbox') el.checked = !!st[k];
      else if (el.type === 'radio') el.checked = String(st[k]) === el.value;
      else el.value = st[k];
    });
    $('#customRow').style.display = st.paper === 'custom' ? '' : 'none';
    $('#accentIn').value = /^#[0-9a-f]{6}$/i.test(st.accent) ? st.accent : P.palette(st).accent;
    $('#monthSel').value = view.m;
    $('#monthSel').disabled = st.layout === 'year';
    $('#yearIn').value = view.y;
    $$('#palettes .sw').forEach(function (b) { b.classList.toggle('on', b.dataset.id === st.palette); });
    buildBgs();
  }

  function anchor() {
    return new Date(view.y, view.m, Math.min(view.d, P.daysIn(view.y, view.m)));
  }

  function setView(dt) {
    view.y = dt.getFullYear();
    view.m = dt.getMonth();
    view.d = dt.getDate();
  }

  function curSpec() {
    if (st.layout === 'year') return { kind: 'year', y: view.y };
    if (st.layout === 'week') return { kind: 'week', start: P.weekStartOf(anchor(), +st.weekStart) };
    return { kind: 'month', y: view.y, m: view.m };
  }

  function pageList(scope) {
    scope = scope || st.scope;
    if (scope !== 'year') return [curSpec()];
    if (st.layout === 'year') return [{ kind: 'year', y: view.y }];
    const out = [];
    if (st.layout === 'week') {
      let s = P.weekStartOf(new Date(view.y, 0, 1), +st.weekStart);
      const end = new Date(view.y, 11, 31);
      while (s <= end) {
        out.push({ kind: 'week', start: s });
        s = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7);
      }
      return out;
    }
    for (let m = 0; m < 12; m++) out.push({ kind: 'month', y: view.y, m: m });
    return out;
  }

  function renderSpec(spec) {
    return P.render(spec, st, { notes: notes, image: image });
  }

  function render() {
    const r = renderSpec(curSpec());
    sheet.innerHTML = r.svg;
    sheet.dataset.w = r.W;
    sheet.dataset.h = r.H;
    fit();
  }

  function fit() {
    const w = +sheet.dataset.w, h = +sheet.dataset.h;
    if (!w) return;
    const cs = getComputedStyle(stage);
    const aw = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const ah = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const k = Math.max(0.05, Math.min(aw / w, ah / h));
    sheet.style.width = Math.floor(w * k) + 'px';
    sheet.style.height = Math.floor(h * k) + 'px';
  }

  function change() {
    syncControls();
    render();
    Store.save();
  }

  function shift(dir) {
    if (st.layout === 'year') {
      view.y += dir;
    } else if (st.layout === 'week') {
      const a = anchor();
      setView(new Date(a.getFullYear(), a.getMonth(), a.getDate() + 7 * dir));
    } else {
      setView(new Date(view.y, view.m + dir, 1));
    }
    change();
  }

  function bindControls() {
    $$('[data-key]').forEach(function (el) {
      const k = el.dataset.key;
      const handler = function () {
        if (el.type === 'radio' && !el.checked) return;
        if (el.type === 'checkbox') st[k] = el.checked;
        else if (numeric[k]) st[k] = parseFloat(el.value) || 0;
        else st[k] = el.value;
        if (k === 'locale') buildMonthSelect();
        if (k === 'paper' && st.paper !== 'custom') {
          const d = P.paperDims(st);
          st.cw = Math.min(d.w, d.h);
          st.ch = Math.max(d.w, d.h);
        }
        change();
      };
      el.addEventListener(el.type === 'range' || el.type === 'number' ? 'input' : 'change', handler);
    });
    $('#monthSel').addEventListener('change', function (e) {
      view.m = +e.target.value;
      view.d = 1;
      change();
    });
    $('#yearIn').addEventListener('input', function (e) {
      const v = parseInt(e.target.value, 10);
      if (v >= 1583 && v <= 9999) {
        view.y = v;
        render();
        Store.save();
      }
    });
    $('#yearIn').addEventListener('change', syncControls);
    $('#prev').addEventListener('click', function () { shift(-1); });
    $('#next').addEventListener('click', function () { shift(1); });
    $('#today').addEventListener('click', function () {
      setView(new Date());
      change();
    });
    $('#accentIn').addEventListener('input', function (e) {
      st.accent = e.target.value;
      render();
      Store.save();
    });
    $('#accentReset').addEventListener('click', function () {
      st.accent = '';
      change();
    });
    $('#imgIn').addEventListener('change', function (e) {
      const f = e.target.files[0];
      e.target.value = '';
      if (f) loadImageFile(f);
    });
    $('#imgClear').addEventListener('click', function () {
      image = null;
      if (st.bg === 'image') st.bg = 'arcs';
      change();
    });
    $$('[data-export]').forEach(function (b) {
      b.addEventListener('click', function () { runExport(b.dataset.export); });
    });
    $('#printBtn').addEventListener('click', doPrint);
    window.addEventListener('keydown', function (e) {
      if (e.target.closest('input,select,textarea') || $('#noteDlg').open) return;
      if (e.key === 'ArrowLeft') shift(-1);
      if (e.key === 'ArrowRight') shift(1);
    });
    if (window.ResizeObserver) new ResizeObserver(fit).observe(stage);
    window.addEventListener('resize', fit);
  }

  function loadImageFile(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = function () {
      const k = Math.min(1, 2600 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * k));
      c.height = Math.max(1, Math.round(img.height * k));
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      image = c.toDataURL('image/jpeg', 0.88);
      URL.revokeObjectURL(url);
      st.bg = 'image';
      change();
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      toast('Не удалось открыть картинку');
    };
    img.src = url;
  }

  function download(blob, name) {
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  const tick = function () { return new Promise(function (r) { setTimeout(r, 0); }); };

  async function runExport(kind) {
    if (busy) return;
    busy = true;
    document.body.classList.add('busy');
    try {
      if (kind === 'xlsx' || kind === 'csv') await exportTable(kind);
      else if (kind === 'pdf') await exportPdf();
      else await exportImages(kind);
      toast('Готово');
    } catch (e) {
      toast('Не удалось сохранить файл');
    } finally {
      busy = false;
      document.body.classList.remove('busy');
    }
  }

  async function exportImages(kind) {
    const specs = pageList();
    const files = [];
    for (let i = 0; i < specs.length; i++) {
      if (specs.length > 1) toast('Страница ' + (i + 1) + ' из ' + specs.length, true);
      await tick();
      const r = renderSpec(specs[i]);
      let blob;
      if (kind === 'svg') {
        blob = new Blob([r.svg], { type: 'image/svg+xml' });
      } else {
        const cv = await P.exp.rasterize(r.svg, r.W, r.H, st.dpi);
        blob = await P.exp.canvasBlob(cv, kind === 'png' ? 'image/png' : 'image/jpeg', 0.93);
      }
      files.push({ name: 'planer-' + P.specName(specs[i]) + '.' + kind, blob: blob });
    }
    if (files.length === 1) {
      download(files[0].blob, files[0].name);
      return;
    }
    const entries = [];
    for (const f of files) entries.push({ name: f.name, data: new Uint8Array(await f.blob.arrayBuffer()) });
    download(P.exp.zip(entries), 'planer-' + view.y + '.zip');
  }

  async function exportPdf() {
    const specs = pageList();
    const pages = [];
    for (let i = 0; i < specs.length; i++) {
      if (specs.length > 1) toast('Страница ' + (i + 1) + ' из ' + specs.length, true);
      await tick();
      const r = renderSpec(specs[i]);
      const cv = await P.exp.rasterize(r.svg, r.W, r.H, st.dpi);
      const blob = await P.exp.canvasBlob(cv, 'image/jpeg', 0.92);
      pages.push({ wmm: r.W, hmm: r.H, pw: cv.width, ph: cv.height, jpeg: new Uint8Array(await blob.arrayBuffer()) });
    }
    const name = specs.length === 1 ? 'planer-' + P.specName(specs[0]) : 'planer-' + view.y;
    download(P.exp.pdf(pages), name + '.pdf');
  }

  function tableMonths() {
    if (st.scope === 'year' || st.layout === 'year') {
      const out = [];
      for (let m = 0; m < 12; m++) out.push({ y: view.y, m: m });
      return out;
    }
    const spec = curSpec();
    if (spec.kind === 'week') return [{ y: spec.start.getFullYear(), m: spec.start.getMonth() }];
    return [{ y: spec.y, m: spec.m }];
  }

  async function exportTable(kind) {
    const months = tableMonths();
    const name = months.length === 1 ? 'planer-' + months[0].y + '-' + String(months[0].m + 1).padStart(2, '0') : 'planer-' + view.y;
    if (kind === 'csv') download(P.exp.csv(st, months, notes), name + '.csv');
    else download(P.exp.xlsx(st, months, notes), name + '.xlsx');
  }

  function doPrint() {
    const specs = pageList();
    const d = P.paperDims(st);
    const root = $('#printRoot');
    root.innerHTML = specs.map(function (s) {
      const r = renderSpec(s);
      return '<div class="sheet" style="background:' + r.paper + '">' + r.svg + '</div>';
    }).join('');
    $('#pageStyle').textContent = '@page{size:' + d.w + 'mm ' + d.h + 'mm;margin:0}.sheet{width:' + d.w + 'mm;height:' + (d.h - 0.3) + 'mm}';
    setTimeout(function () { window.print(); }, 50);
  }

  function noteTitle(key) {
    const loc = st.locale;
    if (/^w/.test(key)) {
      const p = key.slice(1).split('-').map(Number);
      const lab = (P.labels[loc] || P.labels.en);
      return lab.week + ' · ' + new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long' }).format(new Date(p[0], p[1] - 1, p[2]));
    }
    const p = key.split('-').map(Number);
    if (p.length === 2) return (P.labels[loc] || P.labels.en).notes + ' · ' + P.monthName(loc, p[1] - 1) + ' ' + p[0];
    return new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(p[0], p[1] - 1, p[2]));
  }

  function openNote(key) {
    const dlg = $('#noteDlg');
    $('#noteTitle').textContent = noteTitle(key);
    const p = key.split('-').map(Number);
    const hol = p.length === 3 && !/^w/.test(key) ? P.holidayFn(st.holidays)(p[0], p[1] - 1, p[2]) : '';
    $('#noteHol').textContent = hol;
    $('#noteHol').style.display = hol ? '' : 'none';
    $('#noteText').value = notes[key] || '';
    dlg.dataset.key = key;
    dlg.showModal();
    $('#noteText').focus();
  }

  function saveNote() {
    const key = $('#noteDlg').dataset.key;
    const v = $('#noteText').value.replace(/\s+$/, '');
    if (v) notes[key] = v;
    else delete notes[key];
    render();
    Store.save();
  }

  function bindNotes() {
    sheet.addEventListener('click', function (e) {
      const g = e.target.closest('[data-goto]');
      if (g) {
        const p = g.getAttribute('data-goto').split('-').map(Number);
        view.y = p[0];
        view.m = p[1];
        view.d = 1;
        st.layout = 'month';
        change();
        return;
      }
      const n = e.target.closest('[data-note]');
      if (n) openNote(n.getAttribute('data-note'));
    });
    $('#noteForm').addEventListener('submit', function () { saveNote(); });
    $('#noteCancel').addEventListener('click', function () { $('#noteDlg').close(); });
    $('#noteDel').addEventListener('click', function () {
      $('#noteText').value = '';
      saveNote();
      $('#noteDlg').close();
    });
    $('#noteText').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        $('#noteOk').click();
      }
    });
    $('#notesSave').addEventListener('click', function () {
      download(new Blob([JSON.stringify({ version: 1, notes: notes }, null, 2)], { type: 'application/json' }), 'planer-notes.json');
    });
    $('#notesLoad').addEventListener('change', function (e) {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      f.text().then(function (t) {
        const j = JSON.parse(t);
        const src = j && j.notes ? j.notes : j;
        Object.keys(src).forEach(function (k) {
          if (typeof src[k] === 'string' && src[k]) notes[k] = src[k];
        });
        render();
        Store.save();
        toast('Заметки загружены');
      }).catch(function () { toast('Не удалось прочитать файл'); });
    });
    $('#notesClear').addEventListener('click', function () {
      if (!Object.keys(notes).length) return;
      if (confirm('Удалить все заметки?')) {
        notes = {};
        render();
        Store.save();
      }
    });
  }

  function startHeartbeat() {
    if (!serverMode) return;
    const ping = function () { fetch('api/ping', { method: 'POST' }).catch(function () {}); };
    ping();
    setInterval(ping, 5000);
    window.addEventListener('pagehide', function () { navigator.sendBeacon('api/bye'); });
  }

  async function init() {
    const saved = await Store.load();
    if (saved && saved.settings) st = Object.assign({}, P.defaults, saved.settings);
    if (saved && saved.notes) notes = saved.notes;
    if (saved && saved.image) image = saved.image;
    if (st.bg === 'image' && !image) st.bg = 'arcs';
    buildStaticControls();
    buildMonthSelect();
    buildPalettes();
    bindControls();
    bindNotes();
    window.addEventListener('afterprint', function () { $('#printRoot').innerHTML = ''; });
    syncControls();
    render();
    startHeartbeat();
  }

  init();
})();
