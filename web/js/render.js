(function () {
  const P = window.P;
  let uid = 0;
  let mctx = null;

  const n = function (v) { return Math.round(v * 100) / 100; };
  const esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  };
  const cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  const clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
  const pad2 = function (v) { return String(v).padStart(2, '0'); };

  P.dateKey = function (y, m, d) { return y + '-' + pad2(m + 1) + '-' + pad2(d); };

  P.daysIn = function (y, m) { return new Date(y, m + 1, 0).getDate(); };

  P.isoWeek = function (dt) {
    const d = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - y0) / 864e5 + 1) / 7);
  };

  P.matrix = function (y, m, ws) {
    const first = new Date(y, m, 1);
    const offset = (first.getDay() - ws + 7) % 7;
    const rows = Math.ceil((offset + P.daysIn(y, m)) / 7);
    const out = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < 7; c++) {
        const dt = new Date(y, m, 1 - offset + r * 7 + c);
        row.push({
          y: dt.getFullYear(),
          m: dt.getMonth(),
          d: dt.getDate(),
          dow: dt.getDay(),
          date: dt,
          inMonth: dt.getMonth() === m && dt.getFullYear() === y
        });
      }
      out.push(row);
    }
    return out;
  };

  P.weekStartOf = function (dt, ws) {
    const back = (dt.getDay() - ws + 7) % 7;
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() - back);
  };

  P.monthName = function (loc, m, len) {
    return cap(new Intl.DateTimeFormat(loc, { month: len || 'long' }).format(new Date(2001, m, 1)));
  };

  P.weekdayName = function (loc, dow, len) {
    return new Intl.DateTimeFormat(loc, { weekday: len || 'long' }).format(new Date(2023, 0, 1 + dow));
  };

  const holCache = {};

  P.noteOf = function (raw) {
    if (raw == null) return null;
    const r = typeof raw === 'string' ? { t: raw } : raw;
    if (!r || typeof r.t !== 'string' || !r.t.trim()) return null;
    return {
      t: r.t,
      s: clamp(+r.s || 1, 0.4, 5),
      h: ['l', 'c', 'r'].indexOf(r.h) >= 0 ? r.h : 'l',
      v: ['a', 'm', 'b'].indexOf(r.v) >= 0 ? r.v : 'a',
      dx: clamp(+r.dx || 0, -50, 50),
      dy: clamp(+r.dy || 0, -50, 50),
      c: /^#[0-9a-f]{6}$/i.test(r.c || '') ? r.c : '',
      b: !!r.b,
      i: !!r.i
    };
  };

  P.noteText = function (raw) {
    const nt = P.noteOf(raw);
    return nt ? nt.t : '';
  };

  P.noteCompact = function (draft) {
    const nt = P.noteOf(draft);
    if (!nt) return null;
    const out = { t: nt.t };
    if (Math.abs(nt.s - 1) > 0.001) out.s = nt.s;
    if (nt.h !== 'l') out.h = nt.h;
    if (nt.v !== 'a') out.v = nt.v;
    if (nt.dx) out.dx = nt.dx;
    if (nt.dy) out.dy = nt.dy;
    if (nt.c) out.c = nt.c;
    if (nt.b) out.b = true;
    if (nt.i) out.i = true;
    return Object.keys(out).length === 1 ? out.t : out;
  };

  function nthDay(y, m, wd, k) {
    if (k > 0) {
      const off = (wd - new Date(y, m, 1).getDay() + 7) % 7;
      return 1 + off + (k - 1) * 7;
    }
    const last = new Date(y, m + 1, 0);
    return last.getDate() - ((last.getDay() - wd + 7) % 7);
  }

  P.holidayFn = function (code) {
    const data = P.holidayData[code];
    if (!data) return function () { return ''; };
    return function (y, m, d) {
      const key = code + y;
      if (!holCache[key]) {
        const map = Object.assign({}, data.fixed);
        (data.nth || []).forEach(function (r) {
          map[pad2(r.m + 1) + '-' + pad2(nthDay(y, r.m, r.wd, r.n))] = r.name;
        });
        holCache[key] = map;
      }
      return holCache[key][pad2(m + 1) + '-' + pad2(d)] || '';
    };
  };

  function tw(t, size, c, wt) {
    if (!mctx) mctx = document.createElement('canvas').getContext('2d');
    mctx.font = (wt || 400) + ' 100px ' + c.fam;
    return mctx.measureText(t).width * size / 100;
  }

  function wrapText(text, size, maxW, c, maxLines, wt) {
    if (maxLines < 1 || maxW <= 0) return [];
    const lines = [];
    String(text).split('\n').forEach(function (p) {
      const words = p.split(/\s+/).filter(Boolean);
      if (!words.length) {
        lines.push('');
        return;
      }
      let cur = '';
      words.forEach(function (word) {
        let w = word;
        while (tw(w, size, c, wt) > maxW) {
          let k = w.length;
          while (k > 1 && tw(w.slice(0, k), size, c, wt) > maxW) k--;
          if (cur) {
            lines.push(cur);
            cur = '';
          }
          lines.push(w.slice(0, k));
          w = w.slice(k);
        }
        const t = cur ? cur + ' ' + w : w;
        if (tw(t, size, c, wt) <= maxW) {
          cur = t;
        } else {
          lines.push(cur);
          cur = w;
        }
      });
      lines.push(cur);
    });
    if (lines.length > maxLines) {
      lines.length = maxLines;
      let l = lines[maxLines - 1];
      while (l.length > 1 && tw(l + '…', size, c, wt) > maxW) l = l.slice(0, -1);
      lines[maxLines - 1] = l + '…';
    }
    return lines;
  }

  function tx(x, y, str, size, fill, o) {
    o = o || {};
    let a = 'x="' + n(x) + '" y="' + n(y) + '" font-size="' + n(size) + '" fill="' + fill + '"';
    if (o.w) a += ' font-weight="' + o.w + '"';
    if (o.i) a += ' font-style="italic"';
    if (o.anchor) a += ' text-anchor="' + o.anchor + '"';
    if (o.ls) a += ' letter-spacing="' + n(o.ls) + '"';
    if (o.halo) a += ' stroke="' + o.halo + '" stroke-width="' + n(o.hw) + '" stroke-linejoin="round" paint-order="stroke"';
    return '<text ' + a + '>' + esc(str) + '</text>';
  }

  function rect(x, y, w, h, fill, fop, stroke, sw, extra) {
    let a = 'x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(h) + '" fill="' + fill + '"';
    if (fop != null && fop < 1) a += ' fill-opacity="' + n(fop) + '"';
    if (stroke) a += ' stroke="' + stroke + '" stroke-width="' + n(sw) + '"';
    return '<rect ' + a + (extra || '') + '/>';
  }

  function rng(seed) {
    let s = seed | 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function ring(cx, cy, rx, ry, sw, col, a) {
    return '<ellipse cx="' + n(cx) + '" cy="' + n(cy) + '" rx="' + n(rx) + '" ry="' + n(ry) +
      '" fill="none" stroke="' + col + '" stroke-width="' + n(sw) + '" stroke-opacity="' + n(a) + '"/>';
  }

  function wave(W, H, y, amp, col, a, down) {
    const close = down ? 'L' + n(W) + ' ' + n(H) + ' L0 ' + n(H) + 'Z' : 'L' + n(W) + ' 0 L0 0Z';
    return '<path d="M0 ' + n(y) + ' Q' + n(W * 0.25) + ' ' + n(y - amp) + ' ' + n(W * 0.5) + ' ' + n(y) +
      ' T' + n(W) + ' ' + n(y) + close + '" fill="' + col + '" fill-opacity="' + n(a) + '"/>';
  }

  function poly(pts, col, a) {
    return '<polygon points="' + pts.map(function (p) { return n(p[0]) + ',' + n(p[1]); }).join(' ') +
      '" fill="' + col + '" fill-opacity="' + n(a) + '"/>';
  }

  P.backgrounds = [
    { id: 'none', name: 'Без фона', draw: function () { return ''; } },
    {
      id: 'arcs', name: 'Дуги',
      draw: function (b) {
        const W = b.W, H = b.H, c = b.pal.bg, a = b.alpha;
        return ring(W * 0.5, H * 0.1, W * 0.68, H * 0.22, H * 0.085, c[0], a) +
          ring(W * 0.58, H * 0.2, W * 0.52, H * 0.16, H * 0.065, c[1], a) +
          ring(W * 0.5, H * 0.52, W * 0.6, H * 0.48, H * 0.09, c[2], a) +
          ring(W * 0.5, H * 1.02, W * 0.72, H * 0.2, H * 0.08, c[3], a) +
          ring(W * 0.04, H * 0.62, W * 0.08, H * 0.24, H * 0.06, c[1], a);
      }
    },
    {
      id: 'waves', name: 'Волны',
      draw: function (b) {
        const W = b.W, H = b.H, c = b.pal.bg, a = b.alpha;
        return wave(W, H, H * 0.07, H * 0.05, c[0], a, false) +
          wave(W, H, H * 0.1, -H * 0.05, c[1], a, false) +
          wave(W, H, H * 0.84, H * 0.06, c[2], a, true) +
          wave(W, H, H * 0.9, -H * 0.05, c[1], a, true) +
          wave(W, H, H * 0.95, H * 0.04, c[3], a, true);
      }
    },
    {
      id: 'dots', name: 'Горошек',
      draw: function (b) {
        const W = b.W, H = b.H, c = b.pal.bg, a = b.alpha, id = 'p' + (++uid), s = 6 * b.u;
        return '<defs><pattern id="' + id + '" width="' + n(s) + '" height="' + n(s) + '" patternUnits="userSpaceOnUse">' +
          '<circle cx="' + n(s / 2) + '" cy="' + n(s / 2) + '" r="' + n(0.7 * b.u) + '" fill="' + c[3] + '" fill-opacity="' + n(a) + '"/></pattern></defs>' +
          '<rect width="' + n(W) + '" height="' + n(H) + '" fill="url(#' + id + ')"/>' +
          '<circle cx="0" cy="0" r="' + n(Math.min(W, H) * 0.34) + '" fill="' + c[0] + '" fill-opacity="' + n(a * 0.8) + '"/>' +
          '<circle cx="' + n(W) + '" cy="' + n(H) + '" r="' + n(Math.min(W, H) * 0.4) + '" fill="' + c[1] + '" fill-opacity="' + n(a * 0.8) + '"/>' +
          '<circle cx="' + n(W) + '" cy="0" r="' + n(Math.min(W, H) * 0.2) + '" fill="' + c[2] + '" fill-opacity="' + n(a * 0.8) + '"/>';
      }
    },
    {
      id: 'geometry', name: 'Геометрия',
      draw: function (b) {
        const W = b.W, H = b.H, c = b.pal.bg, a = b.alpha * 0.85;
        return poly([[0, 0], [W * 0.36, 0], [0, H * 0.46]], c[0], a) +
          poly([[W, 0], [W, H * 0.52], [W * 0.62, 0]], c[1], a) +
          poly([[0, H], [0, H * 0.56], [W * 0.4, H]], c[3], a) +
          poly([[W, H], [W * 0.56, H], [W, H * 0.42]], c[2], a) +
          '<circle cx="' + n(W * 0.5) + '" cy="' + n(H * 0.5) + '" r="' + n(Math.min(W, H) * 0.42) + '" fill="none" stroke="' + c[1] + '" stroke-width="' + n(b.u * 1.2) + '" stroke-opacity="' + n(b.alpha) + '"/>';
      }
    },
    {
      id: 'blobs', name: 'Пятна',
      draw: function (b) {
        const W = b.W, H = b.H, c = b.pal.bg, a = b.alpha, r = rng(b.seed * 7 + 3);
        let defs = '<defs>';
        let body = '';
        for (let i = 0; i < 7; i++) {
          const id = 'g' + (++uid), col = c[i % 4];
          const edge = r();
          const cx = edge < 0.5 ? (r() < 0.5 ? r() * 0.18 : 0.82 + r() * 0.18) * W : r() * W;
          const cy = edge >= 0.5 ? (r() < 0.5 ? r() * 0.2 : 0.8 + r() * 0.2) * H : r() * H;
          const rad = Math.min(W, H) * (0.18 + r() * 0.2);
          defs += '<radialGradient id="' + id + '"><stop offset="0" stop-color="' + col + '" stop-opacity="' + n(a) + '"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></radialGradient>';
          body += '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(rad) + '" fill="url(#' + id + ')"/>';
        }
        return defs + '</defs>' + body;
      }
    },
    {
      id: 'gradient', name: 'Градиент',
      draw: function (b) {
        const W = b.W, H = b.H, c = b.pal.bg, a = b.alpha, id = 'l' + (++uid), id2 = 'g' + (++uid);
        return '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c[0] + '" stop-opacity="' + n(a) + '"/><stop offset="1" stop-color="' + c[3] + '" stop-opacity="' + n(a) + '"/></linearGradient>' +
          '<radialGradient id="' + id2 + '" cx="0.85" cy="0.9" r="0.6"><stop offset="0" stop-color="' + c[2] + '" stop-opacity="' + n(a) + '"/><stop offset="1" stop-color="' + c[2] + '" stop-opacity="0"/></radialGradient></defs>' +
          '<rect width="' + n(W) + '" height="' + n(H) + '" fill="url(#' + id + ')"/><rect width="' + n(W) + '" height="' + n(H) + '" fill="url(#' + id2 + ')"/>';
      }
    },
    {
      id: 'grid', name: 'Клетка',
      draw: function (b) {
        const W = b.W, H = b.H, id = 'p' + (++uid);
        return '<defs><pattern id="' + id + '" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M5 0H0V5" fill="none" stroke="' + b.pal.bg[3] + '" stroke-width="0.18" stroke-opacity="' + n(b.alpha) + '"/></pattern></defs>' +
          '<rect width="' + n(W) + '" height="' + n(H) + '" fill="url(#' + id + ')"/>';
      }
    },
    {
      id: 'stripes', name: 'Полосы',
      draw: function (b) {
        const W = b.W, H = b.H, c = b.pal.bg, id = 'p' + (++uid), s = 9 * b.u;
        return '<defs><pattern id="' + id + '" width="' + n(s) + '" height="' + n(s) + '" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">' +
          '<rect width="' + n(s / 2) + '" height="' + n(s) + '" fill="' + c[0] + '" fill-opacity="' + n(b.alpha * 0.8) + '"/>' +
          '<rect x="' + n(s / 2) + '" width="' + n(s / 4) + '" height="' + n(s) + '" fill="' + c[2] + '" fill-opacity="' + n(b.alpha * 0.8) + '"/></pattern></defs>' +
          '<rect width="' + n(W) + '" height="' + n(H) + '" fill="url(#' + id + ')"/>';
      }
    },
    {
      id: 'confetti', name: 'Конфетти',
      draw: function (b) {
        const W = b.W, H = b.H, c = b.pal.bg, a = b.alpha, r = rng(b.seed * 13 + 5);
        let out = '';
        for (let i = 0; i < 90; i++) {
          const x = r() * W, y = r() * H, s = (1.2 + r() * 3.8) * b.u, col = c[Math.floor(r() * 4)], k = r();
          const rot = Math.round(r() * 360);
          if (k < 0.4) {
            out += '<circle cx="' + n(x) + '" cy="' + n(y) + '" r="' + n(s) + '" fill="' + col + '" fill-opacity="' + n(a) + '"/>';
          } else if (k < 0.75) {
            out += '<rect x="' + n(x - s) + '" y="' + n(y - s / 2) + '" width="' + n(s * 2) + '" height="' + n(s) + '" rx="' + n(s / 4) + '" fill="' + col + '" fill-opacity="' + n(a) + '" transform="rotate(' + rot + ' ' + n(x) + ' ' + n(y) + ')"/>';
          } else {
            out += '<polygon points="' + n(x) + ',' + n(y - s) + ' ' + n(x + s) + ',' + n(y + s) + ' ' + n(x - s) + ',' + n(y + s) + '" fill="' + col + '" fill-opacity="' + n(a) + '" transform="rotate(' + rot + ' ' + n(x) + ' ' + n(y) + ')"/>';
          }
        }
        return out;
      }
    },
    {
      id: 'image', name: 'Своя картинка', hidden: true,
      draw: function (b) {
        if (!b.image) return '';
        return '<image href="' + b.image + '" x="0" y="0" width="' + n(b.W) + '" height="' + n(b.H) + '" preserveAspectRatio="xMidYMid slice"/>' +
          '<rect width="' + n(b.W) + '" height="' + n(b.H) + '" fill="' + b.pal.paper + '" fill-opacity="' + n(1 - b.alpha) + '"/>';
      }
    }
  ];

  function background(c, W, H, u, seed, image) {
    const def = P.backgrounds.find(function (x) { return x.id === c.st.bg; }) || P.backgrounds[0];
    return def.draw({ W: W, H: H, u: u, pal: c.pal, alpha: clamp(+c.st.bgAlpha, 0.05, 1), seed: seed, image: image });
  }

  P.bgThumb = function (id, st) {
    const pal = P.palette(st);
    const def = P.backgrounds.find(function (x) { return x.id === id; });
    const W = 60, H = 42;
    const body = def ? def.draw({ W: W, H: H, u: 0.32, pal: pal, alpha: 0.95, seed: 4, image: null }) : '';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '"><rect width="' + W + '" height="' + H + '" fill="' + pal.paper + '"/>' + body + '</svg>';
  };

  function titleBar(c, x, y, w, h, left, right) {
    const pal = c.pal;
    const s0 = h * 0.66;
    const wl = tw(left, s0, c);
    const wr = tw(right, s0, c);
    const gap = w * 0.04;
    let s = s0;
    if (wl + wr + gap > w) s = s0 * (w - gap) / (wl + wr);
    const base = y + h * 0.72;
    const halo = { halo: pal.paper, hw: 0.9 * c.u };
    let out = tx(x, base, left, s, pal.ink, halo);
    if (right) out += tx(x + w, base, right, s, pal.ink, Object.assign({ anchor: 'end' }, halo));
    return out;
  }

  function weekdayHeads(c, cw, dhh, ws) {
    const hs0 = Math.min(dhh * 0.46, 4.2 * c.u);
    const order = [];
    for (let i = 0; i < 7; i++) order.push((ws + i) % 7);
    let names = order.map(function (d) { return P.weekdayName(c.loc, d, 'long').toUpperCase(); });
    let hs = hs0;
    const fits = function (arr) {
      return Math.max.apply(null, arr.map(function (t) { return tw(t, hs, c) + t.length * hs * 0.1; })) <= cw * 0.92;
    };
    if (!fits(names)) {
      names = order.map(function (d) { return P.weekdayName(c.loc, d, 'short').toUpperCase().replace(/\.$/, ''); });
      let guard = 0;
      while (!fits(names) && guard++ < 40) hs *= 0.94;
    }
    return { names: names, size: hs, order: order };
  }

  function monthGrid(c, x, y, w, h, yr, mo) {
    const st = c.st, pal = c.pal, u = c.u;
    const rows = P.matrix(yr, mo, +st.weekStart);
    const nr = rows.length;
    const wnW = st.weekNums ? Math.min(w * 0.05, 9 * u) : 0;
    const dhh = Math.min(h * 0.075, 7.5 * u);
    const gy = y + dhh;
    const ch = (h - dhh) / nr;
    const cw = (w - wnW) / 7;
    const heads = weekdayHeads(c, cw, dhh, +st.weekStart);
    let out = '';
    heads.names.forEach(function (name, i) {
      out += tx(x + wnW + i * cw + cw / 2, y + dhh * 0.7, name, heads.size, pal.ink, { anchor: 'middle', ls: heads.size * 0.1 });
    });
    rows.forEach(function (row, ri) {
      const cy = gy + ri * ch;
      if (wnW) {
        const wk = P.isoWeek(row[(4 - +st.weekStart + 7) % 7].date);
        out += tx(x + wnW / 2, cy + Math.min(ch * 0.2, 5 * u) * 1.3, wk, Math.min(ch * 0.14, 3.2 * u), pal.muted, { anchor: 'middle' });
      }
      row.forEach(function (cell, ci) {
        const cx = x + wnW + ci * cw;
        const show = cell.inMonth || st.showAdj;
        if (!show) return;
        const hol = cell.inMonth ? c.hol(cell.y, cell.m, cell.d) : '';
        const weekend = cell.dow === 0 || cell.dow === 6;
        const key = P.dateKey(cell.y, cell.m, cell.d);
        out += '<g data-note="' + key + '" class="cell">' + rect(cx, cy, cw, ch, pal.cell, +st.cellOp, pal.line, 0.25 * u);
        const ns0 = Math.max(2 * u, Math.min(ch * 0.2, cw * 0.24, 6.2 * u));
        const color = !cell.inMonth ? pal.muted : (weekend || hol ? pal.accent : pal.ink);
        out += tx(cx + cw * 0.07, cy + ns0 * 1.3, cell.d, ns0, color);
        if (cell.inMonth) {
          const fs = Math.max(1.5, Math.min(3 * u, ch * 0.1, cw * 0.085));
          const top = cy + ns0 * 1.75;
          let ly = top + fs;
          const maxL = Math.floor((cy + ch - top - fs * 0.4) / (fs * 1.28));
          if (hol && maxL > 0) {
            wrapText(hol, fs, cw - cw * 0.14, c, Math.min(2, maxL)).forEach(function (t) {
              out += tx(cx + cw * 0.07, ly, t, fs, pal.accent);
              ly += fs * 1.28;
            });
          }
          out += cellNote(c, P.noteOf(c.notes[key]), key, cx, cy, cw, ch, ly - fs);
        }
        out += '</g>';
      });
    });
    return out;
  }

  function cellNote(c, nt, key, cx, cy, cw, ch, flowTop) {
    if (!nt) return '';
    const u = c.u;
    const fs = Math.max(1.6, Math.min(3.6 * u, ch * 0.12, cw * 0.1)) * nt.s * clamp(+c.st.noteScale || 1, 0.4, 4);
    const lh = fs * 1.28;
    const padX = cw * 0.07;
    const wt = nt.b ? 700 : 400;
    const auto = nt.v === 'a';
    const top = auto ? flowTop : cy + ch * 0.04;
    const bottom = auto ? cy + ch - fs * 0.4 : cy + ch - ch * 0.04;
    const maxLines = Math.floor((bottom - top) / lh);
    if (auto && maxLines < 1) {
      c.over[key] = true;
      return '';
    }
    const cap = Math.max(1, maxLines);
    const full = wrapText(nt.t, fs, cw - 2 * padX, c, 999, wt);
    const lines = full.length > cap ? wrapText(nt.t, fs, cw - 2 * padX, c, cap, wt) : full;
    if (full.length > cap) c.over[key] = true;
    const block = lines.length * lh;
    let blockTop = top;
    if (nt.v === 'm') blockTop = cy + (ch - block) / 2;
    if (nt.v === 'b') blockTop = cy + ch - ch * 0.04 - block;
    let x = cx + padX;
    let anchor = '';
    if (nt.h === 'c') {
      x = cx + cw / 2;
      anchor = 'middle';
    } else if (nt.h === 'r') {
      x = cx + cw - padX;
      anchor = 'end';
    }
    x += nt.dx / 100 * cw;
    const y0 = blockTop + fs * 0.95 + nt.dy / 100 * ch;
    const color = nt.c || c.pal.ink;
    let out = '';
    lines.forEach(function (t, i) {
      out += tx(x, y0 + i * lh, t, fs, color, { anchor: anchor, w: nt.b ? 700 : 0, i: nt.i });
    });
    return out;
  }

  function ruledNote(c, x, top, w, bottom, ls, raw, key) {
    const pal = c.pal;
    const nt = P.noteOf(raw);
    const sc = clamp(+c.st.noteScale || 1, 0.4, 4) * (nt ? nt.s : 1);
    const step = ls * clamp(sc, 0.7, 3.5);
    const size = step * 0.55;
    const count = Math.max(0, Math.floor((bottom - top - step * 0.3) / step));
    let out = '';
    for (let i = 1; i <= count; i++) {
      const ly = top + i * step;
      out += '<line x1="' + n(x) + '" y1="' + n(ly) + '" x2="' + n(x + w) + '" y2="' + n(ly) + '" stroke="' + pal.line + '" stroke-width="' + n(0.2 * c.u) + '" stroke-opacity="0.7"/>';
    }
    if (!nt) return out;
    const wt = nt.b ? 700 : 400;
    let tx0 = x;
    let anchor = '';
    if (nt.h === 'c') {
      tx0 = x + w / 2;
      anchor = 'middle';
    } else if (nt.h === 'r') {
      tx0 = x + w;
      anchor = 'end';
    }
    const full = wrapText(nt.t, size, w, c, 999, wt);
    if (full.length > count) c.over[key] = true;
    (full.length > count ? wrapText(nt.t, size, w, c, count, wt) : full).forEach(function (t, i) {
      out += tx(tx0, top + (i + 1) * step - step * 0.24, t, size, nt.c || pal.ink, { anchor: anchor, w: nt.b ? 700 : 0, i: nt.i });
    });
    return out;
  }

  function notesPanel(c, x, y, w, h, key) {
    const pal = c.pal, u = c.u;
    let out = '<g data-note="' + key + '" class="cell">' + rect(x, y, w, h, pal.cell, +c.st.cellOp, pal.line, 0.25 * u);
    const ts = Math.min(h * 0.07, 5 * u, w * 0.14);
    out += tx(x + w * 0.05, y + ts * 1.5, c.lab.notes, ts, pal.ink, { w: 600 });
    const top = y + ts * 2.2;
    const ls = clamp((h - ts * 2.2) / 14, 5 * u, 8 * u);
    out += ruledNote(c, x + w * 0.05, top, w * 0.9, y + h, ls, c.notes[key], key);
    return out + '</g>';
  }

  function monthPage(c, yr, mo, withNotes) {
    const W = c.W, H = c.H, mg = c.mg;
    const x = mg, y = mg, w = W - 2 * mg, h = H - 2 * mg;
    const land = W >= H;
    const hh = h * (land ? 0.16 : 0.11);
    const gap = h * 0.025;
    const top = y + hh + gap;
    const area = h - hh - gap;
    let out = titleBar(c, x, y, w, hh, P.monthName(c.loc, mo), String(yr));
    if (!withNotes) return out + monthGrid(c, x, top, w, area, yr, mo);
    const g = 3 * c.u;
    const key = yr + '-' + pad2(mo + 1);
    if (land) {
      const gw = w * 0.7;
      out += monthGrid(c, x, top, gw, area, yr, mo);
      out += notesPanel(c, x + gw + g, top, w - gw - g, area, key);
    } else {
      const gh = area * 0.68;
      out += monthGrid(c, x, top, w, gh, yr, mo);
      out += notesPanel(c, x, top + gh + g, w, area - gh - g, key);
    }
    return out;
  }

  function miniMonth(c, x, y, w, h, yr, mo) {
    const st = c.st, pal = c.pal, u = c.u;
    let out = '<g data-goto="' + yr + '-' + mo + '" class="cell">' + rect(x, y, w, h, pal.cell, +st.cellOp, pal.line, 0.25 * u);
    const ts = Math.min(h * 0.11, 5.2 * u, w * 0.13);
    out += tx(x + w * 0.06, y + ts * 1.25, P.monthName(c.loc, mo), ts, pal.accent, { w: 700 });
    const hy = y + ts * 1.9;
    const hh = Math.min(h * 0.09, 4.4 * u);
    const cw = w * 0.88 / 7;
    const gx = x + w * 0.06;
    const gy = hy + hh;
    const rh = (y + h - gy - h * 0.03) / 6;
    const ws = +st.weekStart;
    const hs = Math.min(hh * 0.7, cw * 0.5);
    for (let i = 0; i < 7; i++) {
      const nm = P.weekdayName(c.loc, (ws + i) % 7, 'narrow').toUpperCase();
      out += tx(gx + i * cw + cw / 2, hy + hh * 0.75, nm, hs, pal.muted, { anchor: 'middle' });
    }
    const ds = Math.min(cw * 0.46, rh * 0.52);
    P.matrix(yr, mo, ws).forEach(function (row, ri) {
      row.forEach(function (cell, ci) {
        if (!cell.inMonth) return;
        const hol = c.hol(cell.y, cell.m, cell.d);
        const weekend = cell.dow === 0 || cell.dow === 6;
        out += tx(gx + ci * cw + cw / 2, gy + ri * rh + rh * 0.5 + ds * 0.36, cell.d, ds, weekend || hol ? pal.accent : pal.ink, { anchor: 'middle', w: hol ? 700 : 400 });
      });
    });
    return out + '</g>';
  }

  function yearPage(c, yr) {
    const W = c.W, H = c.H, mg = c.mg;
    const x = mg, y = mg, w = W - 2 * mg, h = H - 2 * mg;
    const land = W >= H;
    const hh = h * (land ? 0.12 : 0.075);
    const gap = h * 0.025;
    let out = titleBar(c, x, y, w, hh, String(yr), '');
    const cols = land ? 4 : 3;
    const rows = 12 / cols;
    const g = 3 * c.u;
    const top = y + hh + gap;
    const mw = (w - (cols - 1) * g) / cols;
    const mh = (h - hh - gap - (rows - 1) * g) / rows;
    for (let i = 0; i < 12; i++) {
      out += miniMonth(c, x + (i % cols) * (mw + g), top + Math.floor(i / cols) * (mh + g), mw, mh, yr, i);
    }
    return out;
  }

  function weekPage(c, start) {
    const st = c.st, pal = c.pal, u = c.u;
    const W = c.W, H = c.H, mg = c.mg;
    const x = mg, y = mg, w = W - 2 * mg, h = H - 2 * mg;
    const land = W >= H;
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    const sameMonth = start.getMonth() === end.getMonth();
    const left = sameMonth ? P.monthName(c.loc, start.getMonth()) : P.monthName(c.loc, start.getMonth(), 'short').replace(/\.$/, '') + ' – ' + P.monthName(c.loc, end.getMonth(), 'short').replace(/\.$/, '');
    const right = start.getFullYear() === end.getFullYear() ? String(start.getFullYear()) : start.getFullYear() + '/' + end.getFullYear();
    const hh = h * (land ? 0.14 : 0.1);
    let out = titleBar(c, x, y, w, hh, left, right);
    const fmt = new Intl.DateTimeFormat(c.loc, { day: 'numeric', month: 'short' });
    const sub = c.lab.week + ' ' + P.isoWeek(new Date(start.getFullYear(), start.getMonth(), start.getDate() + ((4 - st.weekStart + 7) % 7))) + '  ·  ' + fmt.format(start) + ' – ' + fmt.format(end);
    const sh = Math.min(h * 0.04, 5 * u);
    out += tx(x, y + hh + sh * 0.9, sub, sh, pal.muted);
    const top = y + hh + sh * 1.8;
    const cols = land ? 4 : 2;
    const rows = land ? 2 : 4;
    const g = 3 * u;
    const bw = (w - (cols - 1) * g) / cols;
    const bh = (y + h - top - (rows - 1) * g) / rows;
    for (let i = 0; i < 8; i++) {
      const bx = x + (i % cols) * (bw + g);
      const by = top + Math.floor(i / cols) * (bh + g);
      if (i === 7) {
        out += notesPanel(c, bx, by, bw, bh, 'w' + P.dateKey(start.getFullYear(), start.getMonth(), start.getDate()));
        continue;
      }
      const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const key = P.dateKey(dt.getFullYear(), dt.getMonth(), dt.getDate());
      const hol = c.hol(dt.getFullYear(), dt.getMonth(), dt.getDate());
      const weekend = dt.getDay() === 0 || dt.getDay() === 6;
      const color = weekend || hol ? pal.accent : pal.ink;
      out += '<g data-note="' + key + '" class="cell">' + rect(bx, by, bw, bh, pal.cell, +st.cellOp, pal.line, 0.25 * u);
      const ns = Math.min(bh * 0.2, 9 * u, bw * 0.2);
      const ds = Math.min(bh * 0.07, 3.6 * u, bw * 0.08);
      out += tx(bx + bw - bw * 0.05, by + ns * 1.1, dt.getDate(), ns, color, { anchor: 'end' });
      out += tx(bx + bw * 0.05, by + ds * 1.7, P.weekdayName(c.loc, dt.getDay(), 'long').toUpperCase(), ds, color, { ls: ds * 0.1 });
      let hy = by + ns * 1.1 + ds * 0.2;
      const hs = Math.min(ds * 0.9, bw * 0.06);
      if (hol) {
        const hl = wrapText(hol, hs, bw * 0.9, c, 2);
        hl.forEach(function (t) {
          hy += hs * 1.25;
          out += tx(bx + bw * 0.05, hy, t, hs, pal.accent);
        });
      }
      const tt = Math.max(by + ns * 1.5, hy + hs * 0.8);
      const ls = clamp((by + bh - tt) / 6, 4 * u, 7.5 * u);
      out += ruledNote(c, bx + bw * 0.05, tt, bw * 0.9, by + bh, ls, c.notes[key], key);
      out += '</g>';
    }
    return out;
  }

  P.specName = function (spec, loc) {
    if (spec.kind === 'year') return String(spec.y);
    if (spec.kind === 'week') {
      const d = spec.start;
      return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + '-week';
    }
    return spec.y + '-' + pad2(spec.m + 1);
  };

  P.render = function (spec, st, extra) {
    extra = extra || {};
    const dims = P.paperDims(st);
    const W = dims.w, H = dims.h;
    const pal = P.palette(st);
    const u = Math.min(W, H) / 210;
    const loc = st.locale;
    const c = {
      W: W,
      H: H,
      u: u,
      pal: pal,
      st: st,
      mg: clamp(+st.margin || 0, 0, Math.min(W, H) / 4),
      fam: P.fonts[st.font] || P.fonts.sans,
      loc: loc,
      lab: P.labels[loc] || P.labels.en,
      notes: extra.notes || {},
      over: {},
      hol: P.holidayFn(st.holidays)
    };
    const seed = st.vary && spec.kind === 'month' ? spec.y * 12 + spec.m : 7;
    let body;
    if (spec.kind === 'year') body = yearPage(c, spec.y);
    else if (spec.kind === 'week') body = weekPage(c, spec.start);
    else body = monthPage(c, spec.y, spec.m, st.layout === 'monthnotes');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n(W) + ' ' + n(H) + '" width="' + n(W) + 'mm" height="' + n(H) + 'mm" font-family="' + esc(c.fam) + '">' +
      '<rect width="' + n(W) + '" height="' + n(H) + '" fill="' + pal.paper + '"/>' +
      background(c, W, H, u, seed, extra.image) + body + '</svg>';
    return { svg: svg, W: W, H: H, paper: pal.paper, over: c.over };
  };
})();
