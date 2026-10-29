window.P = window.P || {};

P.papers = [
  { id: 'A3', name: 'A3 (297 × 420 мм)', w: 297, h: 420, xlsx: 8 },
  { id: 'A4', name: 'A4 (210 × 297 мм)', w: 210, h: 297, xlsx: 9 },
  { id: 'A5', name: 'A5 (148 × 210 мм)', w: 148, h: 210, xlsx: 11 },
  { id: 'A6', name: 'A6 (105 × 148 мм)', w: 105, h: 148, xlsx: 0 },
  { id: 'B4', name: 'B4 (250 × 353 мм)', w: 250, h: 353, xlsx: 12 },
  { id: 'B5', name: 'B5 (176 × 250 мм)', w: 176, h: 250, xlsx: 13 },
  { id: 'Letter', name: 'Letter (8.5 × 11 дюймов)', w: 215.9, h: 279.4, xlsx: 1 },
  { id: 'Legal', name: 'Legal (8.5 × 14 дюймов)', w: 215.9, h: 355.6, xlsx: 5 },
  { id: 'Tabloid', name: 'Tabloid (11 × 17 дюймов)', w: 279.4, h: 431.8, xlsx: 3 },
  { id: 'Executive', name: 'Executive (7.25 × 10.5 дюймов)', w: 184.2, h: 266.7, xlsx: 7 },
  { id: 'custom', name: 'Свой размер…', w: 0, h: 0, xlsx: 0 }
];

P.layouts = [
  { id: 'month', name: 'Месяц — сетка' },
  { id: 'monthnotes', name: 'Месяц + заметки' },
  { id: 'year', name: 'Весь год на одной странице' },
  { id: 'week', name: 'Неделя' }
];

P.locales = [
  { id: 'ru', name: 'Русский' },
  { id: 'uk', name: 'Українська' },
  { id: 'en', name: 'English' },
  { id: 'de', name: 'Deutsch' },
  { id: 'fr', name: 'Français' },
  { id: 'es', name: 'Español' },
  { id: 'it', name: 'Italiano' },
  { id: 'pl', name: 'Polski' },
  { id: 'pt', name: 'Português' },
  { id: 'tr', name: 'Türkçe' }
];

P.labels = {
  ru: { notes: 'Заметки', week: 'Неделя' },
  uk: { notes: 'Нотатки', week: 'Тиждень' },
  en: { notes: 'Notes', week: 'Week' },
  de: { notes: 'Notizen', week: 'Woche' },
  fr: { notes: 'Notes', week: 'Semaine' },
  es: { notes: 'Notas', week: 'Semana' },
  it: { notes: 'Note', week: 'Settimana' },
  pl: { notes: 'Notatki', week: 'Tydzień' },
  pt: { notes: 'Notas', week: 'Semana' },
  tr: { notes: 'Notlar', week: 'Hafta' }
};

P.weekStarts = [
  { id: 1, name: 'Понедельник' },
  { id: 0, name: 'Воскресенье' },
  { id: 6, name: 'Суббота' }
];

P.fonts = {
  sans: "'Segoe UI','Helvetica Neue',Arial,'Liberation Sans',sans-serif",
  serif: "Georgia,'Times New Roman','Liberation Serif',serif",
  round: "'Trebuchet MS','Verdana','DejaVu Sans',sans-serif",
  mono: "Consolas,'Courier New','Liberation Mono',monospace",
  hand: "'Segoe Print','Bradley Hand','Comic Sans MS','Comic Neue',cursive"
};

P.fontNames = [
  { id: 'sans', name: 'Без засечек' },
  { id: 'serif', name: 'С засечками' },
  { id: 'round', name: 'Округлый' },
  { id: 'mono', name: 'Моноширинный' },
  { id: 'hand', name: 'Рукописный' }
];

P.palettes = [
  { id: 'pastel', name: 'Пастель', ink: '#111111', muted: '#a9a9a9', line: '#9b9b9b', accent: '#c0504d', bg: ['#d5dbe6', '#d3dccd', '#f0d6cb', '#dbe2ec'] },
  { id: 'ocean', name: 'Океан', ink: '#10263a', muted: '#9fb0bf', line: '#8fa6b8', accent: '#0b6e99', bg: ['#bfe0ee', '#9fcbe0', '#d5eef2', '#8db8d6'] },
  { id: 'forest', name: 'Лес', ink: '#1d2b20', muted: '#a1b3a3', line: '#93ab97', accent: '#2e7d4f', bg: ['#cfe3cf', '#b6d2b8', '#e3efd9', '#a7c7ab'] },
  { id: 'sunset', name: 'Закат', ink: '#2b1a14', muted: '#b9a79d', line: '#c4a590', accent: '#d9531e', bg: ['#fbd9b8', '#f7b9a0', '#fde8c9', '#f2a6a0'] },
  { id: 'lavender', name: 'Лаванда', ink: '#241b36', muted: '#aaa3bd', line: '#a79fc0', accent: '#7a4fc2', bg: ['#dcd3f0', '#cbbfe8', '#eadcf3', '#bfcdee'] },
  { id: 'rose', name: 'Роза', ink: '#3a1a24', muted: '#bba3ab', line: '#c9a3b0', accent: '#c2415f', bg: ['#f6d3dc', '#f1bccb', '#fbe3e8', '#e8a9bb'] },
  { id: 'mono', name: 'Графит', ink: '#1a1a1a', muted: '#a8a8a8', line: '#8a8a8a', accent: '#444444', bg: ['#e3e3e3', '#d0d0d0', '#eeeeee', '#bdbdbd'] },
  { id: 'night', name: 'Ночь', paper: '#12151c', cell: '#1b2030', ink: '#f1f3f8', muted: '#69708a', line: '#3a4258', accent: '#ff8a5c', bg: ['#2a3350', '#34406a', '#3b2f55', '#223a52'] }
];

P.holidaySets = [
  { id: 'none', name: 'Не отмечать' },
  { id: 'RU', name: 'Россия' },
  { id: 'UA', name: 'Украина' },
  { id: 'BY', name: 'Беларусь' },
  { id: 'US', name: 'США' }
];

P.holidayData = {
  RU: {
    fixed: {
      '01-01': 'Новый год', '01-02': 'Новогодние каникулы', '01-03': 'Новогодние каникулы',
      '01-04': 'Новогодние каникулы', '01-05': 'Новогодние каникулы', '01-06': 'Новогодние каникулы',
      '01-07': 'Рождество Христово', '01-08': 'Новогодние каникулы', '02-23': 'День защитника Отечества',
      '03-08': 'Международный женский день', '05-01': 'Праздник Весны и Труда', '05-09': 'День Победы',
      '06-12': 'День России', '11-04': 'День народного единства'
    }
  },
  UA: {
    fixed: {
      '01-01': 'Новий рік', '01-07': 'Різдво Христове', '03-08': 'Міжнародний жіночий день',
      '05-01': 'День праці', '05-09': 'День пам’яті та перемоги', '06-28': 'День Конституції',
      '08-24': 'День Незалежності', '12-25': 'Різдво Христове'
    }
  },
  BY: {
    fixed: {
      '01-01': 'Новый год', '01-02': 'Новый год', '01-07': 'Рождество Христово', '03-08': 'День женщин',
      '05-01': 'Праздник труда', '05-09': 'День Победы', '07-03': 'День Независимости',
      '11-07': 'День Октябрьской революции', '12-25': 'Рождество Христово'
    }
  },
  US: {
    fixed: {
      '01-01': 'New Year’s Day', '06-19': 'Juneteenth', '07-04': 'Independence Day',
      '11-11': 'Veterans Day', '12-25': 'Christmas Day'
    },
    nth: [
      { m: 0, wd: 1, n: 3, name: 'Martin Luther King Jr. Day' },
      { m: 1, wd: 1, n: 3, name: 'Presidents’ Day' },
      { m: 4, wd: 1, n: -1, name: 'Memorial Day' },
      { m: 8, wd: 1, n: 1, name: 'Labor Day' },
      { m: 9, wd: 1, n: 2, name: 'Columbus Day' },
      { m: 10, wd: 4, n: 4, name: 'Thanksgiving' }
    ]
  }
};

P.defaults = {
  layout: 'month',
  paper: 'A4',
  orient: 'landscape',
  cw: 210,
  ch: 297,
  margin: 8,
  locale: 'ru',
  weekStart: 1,
  holidays: 'none',
  weekNums: false,
  showAdj: true,
  font: 'sans',
  palette: 'pastel',
  bg: 'arcs',
  bgAlpha: 0.8,
  cellOp: 0.92,
  vary: false,
  accent: '',
  dpi: 200,
  scope: 'page'
};

P.paperDims = function (st) {
  let w, h;
  if (st.paper === 'custom') {
    w = Math.max(50, Math.min(1200, +st.cw || 210));
    h = Math.max(50, Math.min(1200, +st.ch || 297));
  } else {
    const p = P.papers.find(function (x) { return x.id === st.paper; }) || P.papers[1];
    w = p.w;
    h = p.h;
  }
  const lo = Math.min(w, h);
  const hi = Math.max(w, h);
  return st.orient === 'portrait' ? { w: lo, h: hi } : { w: hi, h: lo };
};

P.palette = function (st) {
  const base = P.palettes.find(function (x) { return x.id === st.palette; }) || P.palettes[0];
  const p = Object.assign({ paper: '#ffffff', cell: '#ffffff' }, base);
  if (/^#[0-9a-f]{6}$/i.test(st.accent || '')) p.accent = st.accent;
  return p;
};
