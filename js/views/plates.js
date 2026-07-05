import { loadPlates, esc } from '../data.js';

export async function renderPlates(el, params) {
  const data = await loadPlates();

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
    const c = src(f.from).color;
    if (f.from === 'brass-plates') {
      return `<path d="M ${a.x + a.w / 2} ${a.y + 90} L ${a.x + a.w / 2} ${pos['small-plates'].y - 18}" stroke="${c}" stroke-width="2" fill="none" marker-end="url(#arr)" stroke-dasharray="4 4"/>
        <text x="${a.x + a.w / 2 + 12}" y="${(a.y + 90 + pos['small-plates'].y) / 2 + 2}" fill="#8a8069" font-size="11">${esc(f.label)}</text>`;
    }
    const x1 = a.x + a.w + 16, y1 = a.y + 38, x2 = b.x - 16, y2 = b.y + 48;
    return `<path d="M ${x1} ${y1} C ${x1 + 120} ${y1}, ${x2 - 150} ${y2}, ${x2} ${y2}" stroke="${c}" stroke-width="2.4" fill="none" marker-end="url(#arr)"/>
      <text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 8}" fill="#b3a88e" font-size="11.5" text-anchor="middle">${esc(f.label)}</text>`;
  }).join('');

  const chip = b => {
    const pk = data.platesKeys[b.plates] || {};
    return `<a class="book-chip" href="#/read/${b.slug}/1">
      <span class="b">${esc(b.name)}</span>
      <span class="s">${esc(b.span || '')}${b.note ? ' · ' + esc(b.note) : ''}</span>
      <span class="s" style="color:${pk.color}">${esc(pk.short || '')}</span>
      <div class="bar" style="background:${pk.color}"></div>
    </a>`;
  };

  const collectionsFor = books => {
    const seen = [], out = [];
    for (const b of books) if (!seen.includes(b.plates)) { seen.push(b.plates); out.push(b.plates); }
    return out;
  };
  const collectionSection = (books, title, intro) => {
    const cols = collectionsFor(books);
    return `<h2 style="font-size:24px;margin-top:8px">${title}</h2>
      <p class="section-intro">${intro}</p>
      ${cols.map(cid => {
        const pk = data.platesKeys[cid] || {};
        const list = books.filter(b => b.plates === cid);
        return `<div style="margin:18px 0 26px">
          <h3 style="margin:0 0 2px;color:${pk.color};font-size:18px">${esc(pk.name || cid)}</h3>
          <div style="font-size:12px;color:var(--ink-faint);margin-bottom:4px">${esc(pk.writer || '')}</div>
          <p style="font-size:13.5px;color:var(--ink-dim);max-width:720px;margin:4px 0 12px">${esc(pk.desc || '')}</p>
          <div class="books-strip">${list.map(chip).join('')}</div>
        </div>`;
      }).join('')}`;
  };

  const dcEras = ['dc-newyork', 'dc-kirtland', 'dc-missouri', 'dc-nauvoo', 'dc-later'];
  const TABS = [
    {
      id: 'bom', name: '📜 Book of Mormon', html: `
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
      <div class="books-strip">${data.books.map(chip).join('')}</div>` },
    {
      id: 'ot', name: '🕎 Old Testament', html: collectionSection(data.bibleBooks.ot, 'How the Old Testament Is Organized',
        'Thirty-nine books in four great shelves — the Law, the story of the kingdom, the poetry of worship and wisdom, and the prophets who kept the covenant burning through exile and return.') },
    {
      id: 'nt', name: '✝️ New Testament', html: collectionSection(data.bibleBooks.nt, 'How the New Testament Is Organized',
        'Four gospels, one history, and twenty-two letters — eyewitness testimony of the Savior, then the correspondence of the church He left to carry it.') },
    {
      id: 'dc', name: '🕊 Doctrine & Covenants', html: `
      <h2 style="font-size:24px;margin-top:8px">One Book, Five Eras of Revelation</h2>
      <p class="section-intro">The Doctrine &amp; Covenants is not a narrative but a stream of revelations, 1823–1918. The colors below
      mark the eras — the same colors shown on every section in the reader.</p>
      ${dcEras.map(cid => {
        const pk = data.platesKeys[cid];
        return `<div style="margin:14px 0;border-left:4px solid ${pk.color};padding:10px 16px;background:var(--panel);border-radius:0 10px 10px 0">
          <h3 style="margin:0;color:${pk.color};font-size:17px">${esc(pk.name)} <span style="font-size:12px;color:var(--ink-faint);font-weight:400">· ${esc(pk.writer)}</span></h3>
          <p style="font-size:13.5px;color:var(--ink-dim);margin:6px 0 0">${esc(pk.desc)}</p>
        </div>`;
      }).join('')}
      <div class="books-strip" style="margin-top:20px">${data.bibleBooks.dc.map(chip).join('')}</div>` },
  ];

  el.innerHTML = `
  <div class="wrap">
    <div class="eyebrow">Where the words come from</div>
    <h1 class="page-title">The Records</h1>
    <p class="section-intro">Scripture is a library of libraries. Choose a volume to see how its records fit together —
    the same color always means the same source, on this page and throughout the reader.</p>
    <div class="tl-toolbar" id="rec-tabs">${TABS.map(t => `<button class="btn" data-tab="${t.id}">${t.name}</button>`).join('')}</div>
    <div id="rec-panel"></div>
  </div>`;

  const panel = el.querySelector('#rec-panel');
  const show = id => {
    const t = TABS.find(x => x.id === id) || TABS[0];
    el.querySelectorAll('#rec-tabs .btn').forEach(b => b.style.borderColor = b.dataset.tab === t.id ? 'var(--gold)' : '');
    panel.innerHTML = t.html;
    if (t.id === 'bom') {
      const detail = panel.querySelector('#plate-detail');
      const showDetail = pid => {
        const s = src(pid) || data.platesKeys[pid];
        if (!s || !detail) return;
        detail.innerHTML = `<h3 style="color:${s.color}">${esc(s.name)}</h3>
          <div style="font-size:12px;color:var(--ink-faint);margin-bottom:8px">${esc(s.era || s.writer || '')}</div>
          <p style="color:var(--ink-dim);font-size:14.5px;margin:0">${esc(s.desc)}</p>`;
      };
      panel.addEventListener('click', e => {
        const n = e.target.closest('.plate-node');
        if (n) showDetail(n.dataset.id);
      });
      showDetail('plates-of-mormon');
    }
  };
  el.querySelector('#rec-tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]');
    if (b) show(b.dataset.tab);
  });

  // deep link: ?p=<platesKey> opens the right volume tab
  const p = params.get('p');
  const tabFor = p && (['small-plates', 'mormon-abridgment', 'mormon-own', 'ether-abridgment', 'moroni-own'].includes(p) ? 'bom'
    : p.startsWith('dc-') ? 'dc'
    : ['gospels', 'acts-history', 'pauline-epistles', 'general-epistles', 'apocalypse'].includes(p) ? 'nt' : 'ot');
  show(tabFor || 'bom');
}
