import { loadAllegories, bookBySlug, esc } from '../data.js';

export async function renderAllegories(el, params, focusId) {
  const data = await loadAllegories();
  el.innerHTML = `
  <div class="wrap">
    <div class="eyebrow">Seeing the symbols</div>
    <h1 class="page-title">Allegories, Visualized</h1>
    <p class="section-intro">The record teaches in pictures. Each guide below pairs the scene with the text's own interpretation —
    click any symbol to see what the prophets said it means.</p>
    <div id="alle-list">${data.allegories.map(a => alleCard(a)).join('')}</div>
  </div>`;

  for (const a of data.allegories) {
    const card = el.querySelector(`[data-alle="${a.id}"]`);
    if (a.kind === 'scene') wireScene(card, a);
    if (a.kind === 'stages') wireStages(card, a);
  }
  const focusEl = focusId && el.querySelector(`[data-alle="${focusId}"]`);
  if (focusEl) focusEl.scrollIntoView({ behavior: 'smooth' });
}

function alleCard(a) {
  const ref = r => `<a href="#/read/${r.slug}/${r.c}">${bookBySlug[r.slug].name} ${r.c}</a>`;
  const body = a.kind === 'scene'
    ? `<div class="alle-stage">${a.id === 'tree-of-life' ? treeOfLifeSVG(a) : liahonaSVG(a)}</div>
       <div class="symbol-list">${a.symbols.map(s => `<div class="symbol-item" data-sym="${s.id}"><h4>${esc(s.name)}</h4><p>${esc(s.meaning)}</p></div>`).join('')}</div>`
    : `<div class="legend-grid">${a.legend.map(l => `<div class="lg"><span class="s">${esc(l.symbol)}</span><span class="m">${esc(l.meaning)}</span></div>`).join('')}</div>
       <div class="alle-stage">${vineyardSVG()}</div>
       <div class="stage-controls">
         <button class="btn" data-step="-1">←</button>
         <div class="stage-dots">${a.stages.map((s, i) => `<button data-stage="${i}" class="${i === 0 ? 'on' : ''}">${s.n}</button>`).join('')}</div>
         <button class="btn" data-step="1">→</button>
       </div>
       <div class="stage-desc" id="stage-desc-${a.id}"></div>`;
  return `<article class="alle-card" data-alle="${a.id}">
    <h2 style="margin:0 0 2px">${esc(a.title)}</h2>
    <div style="font-size:12.5px;color:var(--gold-dim);margin-bottom:10px">${ref(a.ref)}${a.interpretationRef ? ` · interpreted in ${ref(a.interpretationRef)}` : ''}</div>
    <p style="color:var(--ink-dim);font-size:14.5px">${esc(a.intro)}</p>
    ${body}
  </article>`;
}

function wireScene(card, a) {
  const sel = id => {
    card.querySelectorAll('.symbol-item').forEach(i => i.classList.toggle('sel', i.dataset.sym === id));
    card.querySelectorAll('[data-hot]').forEach(h => {
      h.setAttribute('opacity', h.dataset.hot === id ? '1' : '0');
    });
    const item = card.querySelector(`.symbol-item[data-sym="${id}"]`);
    if (item) item.scrollIntoView({ block: 'nearest' });
  };
  card.addEventListener('click', e => {
    const it = e.target.closest('.symbol-item');
    if (it) return sel(it.dataset.sym);
    const hs = e.target.closest('[data-spot]');
    if (hs) sel(hs.dataset.spot);
  });
}

// ---------- Lehi's dream scene ----------
function treeOfLifeSVG(a) {
  const spots = a.symbols.map(s => `
    <g data-spot="${s.id}" style="cursor:pointer">
      <circle cx="${s.x}" cy="${s.y}" r="26" fill="transparent"/>
      <circle cx="${s.x}" cy="${s.y}" r="13" fill="#e8b64c22" stroke="#e8b64c" stroke-width="1.4"/>
      <text x="${s.x}" y="${s.y + 4}" fill="#e8b64c" font-size="12" text-anchor="middle">?</text>
      <circle data-hot="${s.id}" cx="${s.x}" cy="${s.y}" r="22" fill="none" stroke="#fff" stroke-width="2" opacity="0"/>
    </g>`).join('');
  return `<svg viewBox="0 0 900 560">
    <defs>
      <linearGradient id="tolSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#191d2b"/><stop offset="1" stop-color="#171410"/></linearGradient>
      <radialGradient id="tolGlow" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#f2ecd8" stop-opacity=".9"/><stop offset="1" stop-color="#f2ecd8" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="900" height="560" fill="url(#tolSky)"/>
    <!-- dark and dreary waste -->
    <path d="M 0 470 Q 220 430 450 460 T 900 450 L 900 560 L 0 560 Z" fill="#20180f"/>
    <!-- filthy river -->
    <path d="M 260 560 C 340 500 430 500 520 470 C 590 445 640 430 660 390" stroke="#39505c" stroke-width="34" fill="none" opacity=".8" stroke-linecap="round"/>
    <path d="M 280 560 C 350 505 440 495 525 462" stroke="#22333c" stroke-width="10" fill="none" opacity=".9"/>
    <!-- path + rod of iron -->
    <path d="M 60 545 C 240 520 420 460 660 330" stroke="#4c4230" stroke-width="16" fill="none" stroke-linecap="round"/>
    <path d="M 70 528 C 250 505 430 445 665 318" stroke="#9aa3ad" stroke-width="4.5" fill="none"/>
    ${[0.12, 0.3, 0.48, 0.66, 0.84].map(t => `<line x1="${70 + t * 595}" y1="${528 - t * 210 + 4}" x2="${70 + t * 595}" y2="${528 - t * 210 + 22}" stroke="#78828c" stroke-width="4"/>`).join('')}
    <!-- mists -->
    <g opacity=".8">
      <ellipse cx="360" cy="250" rx="130" ry="34" fill="#3a3f4a" opacity=".55"/>
      <ellipse cx="430" cy="290" rx="150" ry="30" fill="#333844" opacity=".5"/>
      <ellipse cx="300" cy="300" rx="110" ry="26" fill="#404654" opacity=".45"/>
    </g>
    <!-- tree of life -->
    <circle cx="700" cy="255" r="115" fill="url(#tolGlow)"/>
    <path d="M 695 400 C 690 340 692 320 700 290 M 700 290 C 680 260 660 250 650 230 M 700 290 C 720 255 745 250 752 225" stroke="#5a4630" stroke-width="14" fill="none" stroke-linecap="round"/>
    <g>
      <circle cx="700" cy="235" r="62" fill="#e8e2cf"/>
      <circle cx="650" cy="260" r="40" fill="#efe9d8"/>
      <circle cx="752" cy="258" r="40" fill="#efe9d8"/>
      <circle cx="700" cy="200" r="42" fill="#f4efdf"/>
      ${[[668, 228], [712, 214], [736, 250], [676, 268], [704, 250]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#fffdf4" stroke="#d8cfa8" stroke-width="1.5"/>`).join('')}
    </g>
    <!-- great and spacious building -->
    <g>
      <rect x="95" y="95" width="150" height="120" fill="#2b2f3d" stroke="#454b5e" stroke-width="2"/>
      <rect x="115" y="60" width="110" height="45" fill="#333849" stroke="#454b5e" stroke-width="2"/>
      ${[0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => `<rect x="${112 + c * 32}" y="${112 + r * 26}" width="14" height="14" fill="#e8d48a" opacity="${(r * 4 + c) % 3 ? .8 : .3}"/>`).join('')).join('')}
      <text x="170" y="48" fill="#6b7288" font-size="11" text-anchor="middle" font-style="italic">high above the earth — no foundation</text>
    </g>
    <!-- people groups on the path -->
    ${[[150, 512], [300, 480], [470, 420], [590, 360]].map(([x, y]) => `
      <g opacity=".85"><circle cx="${x}" cy="${y - 14}" r="6" fill="#c8b17e"/><path d="M ${x - 7} ${y + 8} Q ${x} ${y - 10} ${x + 7} ${y + 8} Z" fill="#7a6a48"/></g>`).join('')}
    <text x="450" y="30" fill="#8a8069" font-size="13" font-style="italic" text-anchor="middle">“I beheld a tree, whose fruit was desirable to make one happy.” — 1 Nephi 8:10</text>
    ${spots}
  </svg>`;
}

// ---------- Liahona scene ----------
function liahonaSVG(a) {
  const spots = a.symbols.map(s => `
    <g data-spot="${s.id}" style="cursor:pointer">
      <circle cx="${s.x}" cy="${s.y}" r="26" fill="transparent"/>
      <circle cx="${s.x}" cy="${s.y}" r="13" fill="#e8b64c22" stroke="#e8b64c" stroke-width="1.4"/>
      <text x="${s.x}" y="${s.y + 4}" fill="#e8b64c" font-size="12" text-anchor="middle">?</text>
      <circle data-hot="${s.id}" cx="${s.x}" cy="${s.y}" r="22" fill="none" stroke="#fff" stroke-width="2" opacity="0"/>
    </g>`).join('');
  return `<svg viewBox="0 0 900 480">
    <defs>
      <radialGradient id="liaBall" cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="#e8c579"/><stop offset=".55" stop-color="#b08d3f"/><stop offset="1" stop-color="#6e5320"/></radialGradient>
      <linearGradient id="liaSand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#191511"/><stop offset="1" stop-color="#241c12"/></linearGradient>
    </defs>
    <rect width="900" height="480" fill="url(#liaSand)"/>
    <path d="M 0 380 Q 200 350 420 375 T 900 365 L 900 480 L 0 480 Z" fill="#2b2214"/>
    <path d="M 620 385 L 700 300 L 780 385 Z" fill="#332818"/>
    <path d="M 700 300 L 700 385" stroke="#241c12" stroke-width="2"/>
    <text x="702" y="415" fill="#8a8069" font-size="11" text-anchor="middle" font-style="italic">the tent of Lehi</text>
    <circle cx="450" cy="245" r="105" fill="url(#liaBall)" stroke="#3d2f12" stroke-width="3"/>
    <ellipse cx="415" cy="205" rx="34" ry="20" fill="#ffffff30"/>
    <path d="M 355 245 A 95 95 0 0 1 545 245" fill="none" stroke="#3d2f1266" stroke-width="2"/>
    <path d="M 365 285 A 85 85 0 0 0 535 285" fill="none" stroke="#3d2f1266" stroke-width="2"/>
    <!-- spindles -->
    <g stroke="#241b08" stroke-width="5" stroke-linecap="round">
      <line x1="450" y1="245" x2="522" y2="185"/>
      <line x1="450" y1="245" x2="405" y2="300"/>
    </g>
    <path d="M 522 185 L 538 172 L 528 194 Z" fill="#241b08"/>
    <circle cx="450" cy="245" r="8" fill="#241b08"/>
    <!-- changing writing -->
    <g font-family="Georgia,serif" fill="#3d2f12" opacity=".85">
      <text x="418" y="320" font-size="13" font-style="italic">✦ ✧ ✦ ✧ ✦</text>
    </g>
    <text x="450" y="40" fill="#8a8069" font-size="13" font-style="italic" text-anchor="middle">“…a round ball of curious workmanship; and it was of fine brass.” — 1 Nephi 16:10</text>
    ${spots}
  </svg>`;
}

// ---------- Olive tree vineyard (staged) ----------
function vineyardSVG() {
  const tree = (id, x, y, scale = 1) => `
    <g id="${id}" transform="translate(${x},${y}) scale(${scale})">
      <path class="trunk" d="M -6 0 C -4 -30 -8 -45 -2 -70 M -2 -70 C -14 -85 -26 -88 -30 -102 M -2 -70 C 8 -92 20 -94 24 -108 M -2 -70 C -2 -84 0 -92 -4 -104" stroke="#5a4630" stroke-width="9" fill="none" stroke-linecap="round"/>
      <g class="crown">
        <circle class="cl" cx="-30" cy="-112" r="26"/>
        <circle class="cl" cx="24" cy="-118" r="26"/>
        <circle class="cl" cx="-4" cy="-124" r="30"/>
        <circle class="cl" cx="-2" cy="-138" r="22"/>
      </g>
      <g class="fruitdots"></g>
      <g class="graftmark" opacity="0">
        <line x1="-30" y1="-96" x2="-16" y2="-84" stroke="#e8b64c" stroke-width="3"/>
        <line x1="24" y1="-102" x2="12" y2="-88" stroke="#e8b64c" stroke-width="3"/>
      </g>
      <g class="flames" opacity="0">
        <path d="M -20 -150 C -16 -140 -12 -138 -14 -128 A 9 9 0 0 1 -30 -132 C -30 -140 -24 -142 -20 -150" fill="#e07b3a"/>
        <path d="M 14 -155 C 18 -145 22 -143 20 -133 A 9 9 0 0 1 4 -137 C 4 -145 10 -147 14 -155" fill="#e8b64c"/>
      </g>
    </g>`;
  return `<svg viewBox="0 0 960 460" id="vineyard">
    <defs>
      <linearGradient id="vySky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1712"/><stop offset="1" stop-color="#141109"/></linearGradient>
    </defs>
    <rect width="960" height="460" fill="url(#vySky)"/>
    <path d="M 0 380 Q 240 355 480 372 T 960 368 L 960 460 L 0 460 Z" fill="#221c10"/>
    <text x="480" y="34" fill="#8a8069" font-size="13" font-style="italic" text-anchor="middle" id="vy-caption"></text>
    <text x="180" y="425" fill="#8a8069" font-size="12" text-anchor="middle">The mother tree — Israel</text>
    <text x="640" y="440" fill="#8a8069" font-size="12" text-anchor="middle" id="vy-scatter-label">Nethermost parts — the scattered branches</text>
    ${tree('vy-main', 180, 385, 1.35)}
    ${tree('vy-s1', 560, 400, 0.8)}
    ${tree('vy-s2', 700, 405, 0.75)}
    ${tree('vy-s3', 840, 400, 0.8)}
    <g id="vy-lord" opacity="0">
      <circle cx="352" cy="300" r="10" fill="#e8ddc2"/>
      <path d="M 340 360 Q 352 285 364 360 Z" fill="#c8b17e"/>
      <text x="352" y="386" fill="#8a8069" font-size="11" text-anchor="middle">the Lord of the vineyard</text>
    </g>
    <g id="vy-servants" opacity="0">
      <circle cx="420" cy="315" r="8" fill="#b3a88e"/><path d="M 410 360 Q 420 300 430 360 Z" fill="#75503a"/>
      <circle cx="455" cy="318" r="8" fill="#b3a88e"/><path d="M 445 360 Q 455 305 465 360 Z" fill="#54633f"/>
      <text x="438" y="386" fill="#8a8069" font-size="11" text-anchor="middle">“and they were few”</text>
    </g>
  </svg>`;
}

const FRUIT = { good: '#f4efdf', wild: '#a4552f', corrupt: '#4a3a28', none: null };
const CROWN = { good: '#5b7a4a', decaying: '#6e6a3c', corrupt: '#57503a', recovering: '#5b7a4a' };

function setTree(svg, id, { crown = 'good', fruit = 'good', visible = true, graft = false, fire = false }) {
  const g = svg.querySelector(`#${id}`);
  if (!g) return;
  g.style.transition = 'opacity .5s';
  g.style.opacity = visible ? 1 : 0.12;
  g.querySelectorAll('.cl').forEach((c, i) => {
    c.setAttribute('fill', CROWN[crown] || CROWN.good);
    c.setAttribute('opacity', crown === 'decaying' ? .8 - i * .1 : .95);
  });
  const fd = g.querySelector('.fruitdots');
  const col = FRUIT[fruit];
  fd.innerHTML = col ? [[-30, -112], [24, -118], [-4, -128], [-16, -100], [12, -104], [-2, -142]].map(([x, y]) =>
    `<circle cx="${x}" cy="${y}" r="4.5" fill="${col}" stroke="#00000040"/>`).join('') : '';
  g.querySelector('.graftmark').setAttribute('opacity', graft ? 1 : 0);
  g.querySelector('.flames').setAttribute('opacity', fire ? 1 : 0);
}

function wireStages(card, a) {
  const svg = card.querySelector('#vineyard');
  const desc = card.querySelector(`#stage-desc-${a.id}`);
  let cur = 0;
  const apply = i => {
    cur = (i + a.stages.length) % a.stages.length;
    const st = a.stages[cur], s = st.state;
    card.querySelectorAll('[data-stage]').forEach((b, j) => b.classList.toggle('on', j === cur));
    const mainCrown = s.main === 'corrupt' ? 'corrupt' : s.main === 'decaying' ? 'decaying' : 'good';
    const mainFruit = s.main === 'good' ? 'good' : s.main === 'corrupt' ? 'corrupt' : s.main === 'recovering' ? 'good' : 'none';
    setTree(svg, 'vy-main', { crown: mainCrown, fruit: mainFruit, graft: s.graft !== undefined, fire: false });
    const scattered = s.scattered == null ? 0 : s.scattered;
    ['vy-s1', 'vy-s2', 'vy-s3'].forEach((id, j) => {
      const vis = j < (scattered || (s.main === 'recovering' || s.fire ? 0 : 0));
      const corrupt = s.main === 'corrupt';
      setTree(svg, id, {
        crown: corrupt ? 'corrupt' : 'good',
        fruit: corrupt ? 'corrupt' : (s.mixed && j === 2 ? 'wild' : 'good'),
        visible: j < scattered,
        fire: s.fire && j === 1,
      });
    });
    svg.querySelector('#vy-scatter-label').style.opacity = scattered ? 1 : .25;
    svg.querySelector('#vy-lord').setAttribute('opacity', s.weeping || s.servants ? 1 : 0);
    svg.querySelector('#vy-servants').setAttribute('opacity', s.servants ? 1 : 0);
    svg.querySelector('#vy-caption').textContent = s.weeping
      ? '“What could I have done more for my vineyard?” — Jacob 5:41'
      : s.fire ? '“…the bad shall be cast away… and my vineyard will I cause to be burned with fire.” — Jacob 5:77'
      : `Jacob 5:${st.verses}`;
    if (s.fire) setTree(svg, 'vy-main', { crown: 'good', fruit: 'good', fire: true });
    desc.innerHTML = `<h3>Stage ${st.n} — ${esc(st.title)}</h3><div class="era">${esc(st.era)} · verses ${esc(st.verses)}</div><p>${esc(st.desc)}</p>`;
  };
  card.querySelectorAll('[data-stage]').forEach((b, j) => b.addEventListener('click', () => apply(j)));
  card.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => apply(cur + (+b.dataset.step))));
  apply(0);
}
