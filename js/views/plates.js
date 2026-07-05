import { loadPlates, esc } from '../data.js';

export async function renderPlates(el, params) {
  const data = await loadPlates();

  // node layout for the flow diagram
  const pos = {
    'brass-plates': { x: 120, y: 90, w: 210 },
    'small-plates': { x: 120, y: 250, w: 210 },
    'large-plates': { x: 120, y: 390, w: 210 },
    'ether-24': { x: 120, y: 520, w: 210 },
    'plates-of-mormon': { x: 640, y: 290, w: 250 },
  };
  const src = id => data.sources.find(s => s.id === id);

  const plateShape = (s, p, big = false) => `
    <g class="plate-node" data-id="${s.id}" transform="translate(${p.x},${p.y})">
      ${[14, 7, 0].map(o => `<rect x="${-o}" y="${o}" width="${p.w}" height="${big ? 96 : 76}" rx="8"
          fill="${o === 0 ? '#241d10' : '#1a1509'}" stroke="${s.color}" stroke-width="${o === 0 ? 2.6 : 1.2}" opacity="${o === 0 ? 1 : .75}"/>`).join('')}
      <circle cx="16" cy="${big ? 48 : 38}" r="5" fill="none" stroke="${s.color}" stroke-width="2"/>
      <circle cx="16" cy="${big ? 68 : 58}" r="5" fill="none" stroke="${s.color}" stroke-width="2"/>
      <text x="${p.w / 2 + 8}" y="${big ? 42 : 34}" fill="#ece4d2" font-size="${big ? 17 : 14.5}" text-anchor="middle" font-family="Georgia,serif">${esc(s.name)}</text>
      <text x="${p.w / 2 + 8}" y="${big ? 64 : 54}" fill="#8a8069" font-size="11.5" text-anchor="middle">${esc(s.era)}</text>
    </g>`;

  const arrows = data.flows.map(f => {
    const a = pos[f.from], b = pos[f.to];
    const x1 = a.x + a.w + 16, y1 = a.y + 38, x2 = b.x - 16, y2 = b.y + 48;
    const c = src(f.from).color;
    if (f.from === 'brass-plates') {
      // brass feeds the small plates (quotation), a short vertical arrow
      return `<path d="M ${a.x + a.w / 2} ${a.y + 90} L ${a.x + a.w / 2} ${pos['small-plates'].y - 18}" stroke="${c}" stroke-width="2" fill="none" marker-end="url(#arr)" stroke-dasharray="4 4"/>
        <text x="${a.x + a.w / 2 + 12}" y="${(a.y + 90 + pos['small-plates'].y) / 2 + 2}" fill="#8a8069" font-size="11">${esc(f.label)}</text>`;
    }
    const my = (y1 + y2) / 2;
    return `<path d="M ${x1} ${y1} C ${x1 + 120} ${y1}, ${x2 - 150} ${y2}, ${x2} ${y2}" stroke="${c}" stroke-width="2.4" fill="none" marker-end="url(#arr)"/>
      <text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 8}" fill="#b3a88e" font-size="11.5" text-anchor="middle">${esc(f.label)}</text>`;
  }).join('');

  const bookChips = data.books.map(b => {
    const pk = data.platesKeys[b.plates];
    return `<a class="book-chip" href="#/read/${b.slug}/1">
      <span class="b">${esc(b.name)}</span>
      <span class="s">${esc(b.span)}${b.note ? ' · ' + esc(b.note) : ''}</span>
      <span class="s" style="color:${pk.color}">${esc(pk.short)}</span>
      <div class="bar" style="background:${pk.color}"></div>
    </a>`;
  }).join('');

  el.innerHTML = `
  <div class="wrap">
    <div class="eyebrow">Five records, one book</div>
    <h1 class="page-title">The Plates</h1>
    <p class="section-intro">The Book of Mormon is a library, not a single scroll: personal ministry records written first-hand,
    a national chronicle abridged by Mormon, and a fallen civilization's epic abridged by his son.
    Click any set of plates; the colored bars below show exactly which record every book comes from —
    the same colors used throughout the reader.</p>
    <div class="plates-stage">
      <svg viewBox="0 0 1000 650">
        <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#b3a88e"/></marker></defs>
        <text x="120" y="46" fill="#8a8069" font-size="13" letter-spacing="2">SOURCE RECORDS</text>
        <text x="640" y="46" fill="#8a8069" font-size="13" letter-spacing="2">DELIVERED TO JOSEPH SMITH, 1827</text>
        ${arrows}
        ${data.sources.filter(s => s.kind === 'source').map(s => plateShape(s, pos[s.id])).join('')}
        ${plateShape(src('plates-of-mormon'), pos['plates-of-mormon'], true)}
        <text x="765" y="415" fill="#8a8069" font-size="11.5" text-anchor="middle" font-style="italic">…including a sealed portion,</text>
        <text x="765" y="431" fill="#8a8069" font-size="11.5" text-anchor="middle" font-style="italic">not translated</text>
      </svg>
    </div>
    <div class="plate-detail" id="plate-detail"></div>
    <h2 style="font-size:22px">Every book, by its record</h2>
    <div class="books-strip">${bookChips}</div>
  </div>`;

  const detail = el.querySelector('#plate-detail');
  const show = id => {
    const s = src(id) || data.platesKeys[id];
    if (!s) return;
    detail.innerHTML = `<h3 style="color:${s.color}">${esc(s.name)}</h3>
      <div style="font-size:12px;color:var(--ink-faint);margin-bottom:8px">${esc(s.era || s.writer || '')}</div>
      <p style="color:var(--ink-dim);font-size:14.5px;margin:0">${esc(s.desc)}</p>`;
    detail.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  el.addEventListener('click', e => {
    const n = e.target.closest('.plate-node');
    if (n) show(n.dataset.id);
  });
  show(params.get('p') || 'plates-of-mormon');
}
