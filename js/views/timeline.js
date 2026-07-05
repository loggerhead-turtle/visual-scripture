import { loadTimeline, entities, bookBySlug, esc } from '../data.js';
import { avatar } from '../portraits.js';

const BANDS = [
  { id: 'ot', label: 'Old Testament', range: 'Creation – c. 400 BC · Eden to Malachi', color: '#6f9e6a', t0: -4150, t1: -330, x0: 60, x1: 2600, y: 170, tick: 500 },
  { id: 'jaredite', label: 'The Jaredites', range: 'c. 2200 – 580 BC · from the tower to Ramah', color: '#8e6bb8', t0: -2250, t1: -540, x0: 60, x1: 1050, y: 370, tick: 400 },
  { id: 'lehite', label: 'Nephites & Lamanites', range: '600 BC – AD 421 · from Jerusalem to Cumorah', color: '#e8b64c', t0: -640, t1: 460, x0: 60, x1: 3350, y: 570, tick: 100 },
  { id: 'nt', label: 'New Testament', range: '4 BC – c. AD 95 · from Bethlehem to Patmos', color: '#d98f3a', t0: -15, t1: 108, x0: 60, x1: 1700, y: 770, tick: 20 },
  { id: 'dc', label: 'The Restoration', range: '1823 – 1918 · from the Sacred Grove to the spirit world', color: '#3fa7a0', t0: 1815, t1: 1928, x0: 60, x1: 2300, y: 970, tick: 20 },
];
const H = 1120;

// cross-record connections — the "mind map" threads between civilizations
const LINKS = [
  { a: 'ramah', b: 'escape-to-zarahemla', label: "24 gold plates found by Limhi's explorers → translated by Mosiah" },
  { a: 'crucifixion', b: 'destruction', label: 'the same three days — darkness falls on the New World (3 Nephi 8)' },
  { a: 'revelation-patmos', b: 'moroni-visits', label: 'long centuries of apostasy → a boy prays in a grove, and heaven answers' },
  { a: 'jerusalem-falls', b: 'lehi-leaves', label: 'as Jerusalem falls, Lehi’s family is already gone (1 Nephi 1)' },
];

export async function renderTimeline(el, params) {
  const [tl, ents] = await Promise.all([loadTimeline(), entities()]);

  const bandOf = {}; BANDS.forEach(b => bandOf[b.id] = b);
  const events = tl.events.filter(e => bandOf[e.era]).map((e, i) => {
    const b = bandOf[e.era];
    const x = b.x0 + (e.yearNum - b.t0) / (b.t1 - b.t0) * (b.x1 - b.x0);
    return { ...e, i, x, band: b };
  });
  const perBand = {};
  for (const e of events) { const n = perBand[e.era] = (perBand[e.era] || 0) + 1; e.alt = (n % 2 === 1) ? -1 : 1; }
  for (const b of BANDS) {
    for (const side of [-1, 1]) {
      let cursor = -Infinity;
      for (const e of events.filter(v => v.era === b.id && v.alt === side)) {
        e.nx = Math.max(e.x, cursor + 170);
        cursor = e.nx;
      }
    }
  }

  const spine = b => `
    <line x1="${b.x0 - 20}" y1="${b.y}" x2="${b.x1 + 20}" y2="${b.y}" stroke="${b.color}" stroke-width="3" stroke-linecap="round" opacity=".8"/>
    <text x="${b.x0 - 20}" y="${b.y - 58}" fill="${b.color}" font-size="20" font-family="Georgia,serif">${b.label}</text>
    <text x="${b.x0 - 20}" y="${b.y - 38}" fill="#8a8069" font-size="12">${b.range}</text>`;
  const ticks = b => {
    let out = '';
    for (let y = Math.ceil(b.t0 / b.tick) * b.tick; y <= b.t1; y += b.tick) {
      const x = b.x0 + (y - b.t0) / (b.t1 - b.t0) * (b.x1 - b.x0);
      out += `<line x1="${x}" y1="${b.y - 6}" x2="${x}" y2="${b.y + 6}" stroke="#5a4f3a" stroke-width="1.5"/>
        <text x="${x}" y="${b.y + 24}" fill="#8a8069" font-size="11" text-anchor="middle">${b.id === 'dc' ? y : (y < 0 ? -y + ' BC' : y === 0 ? '·' : 'AD ' + y)}</text>`;
    }
    return out;
  };

  const nodes = events.map(e => {
    const ny = e.band.y + e.alt * (82 + (e.i % 3) * 26);
    e.ny = ny;
    return `<g class="tl-node" data-i="${e.i}">
      <path d="M ${e.x} ${e.band.y} C ${e.x} ${(e.band.y + ny) / 2}, ${e.nx} ${(e.band.y + ny) / 2}, ${e.nx} ${ny}" stroke="${e.band.color}" stroke-width="1.3" fill="none" opacity=".45"/>
      <circle cx="${e.x}" cy="${e.band.y}" r="4" fill="${e.band.color}"/>
      <circle class="core" cx="${e.nx}" cy="${ny}" r="8" fill="#1c1812" stroke="${e.band.color}" stroke-width="2.5"/>
      <text x="${e.nx}" y="${ny + (e.alt < 0 ? -30 : 34)}" fill="#ece4d2" font-size="12.5" text-anchor="middle" font-weight="600">${esc(e.title)}</text>
      <text x="${e.nx}" y="${ny + (e.alt < 0 ? -16 : 48)}" fill="#8a8069" font-size="10.5" text-anchor="middle">${esc(e.years)}</text>
    </g>`;
  }).join('');

  const byId = {}; events.forEach(e => byId[e.id] = e);
  const links = LINKS.map(l => {
    const a = byId[l.a], b = byId[l.b];
    if (!a || !b) return '';
    const [top, bot] = a.band.y < b.band.y ? [a, b] : [b, a];
    return `<path d="M ${top.x} ${top.band.y} C ${top.x + 140} ${top.band.y + 90}, ${bot.x - 180} ${bot.band.y - 110}, ${bot.x} ${bot.band.y}" stroke="#8a8069" stroke-width="1.6" stroke-dasharray="6 6" fill="none" opacity=".55"/>
      <text x="${(top.x + bot.x) / 2}" y="${(top.band.y + bot.band.y) / 2}" fill="#8a8069" font-size="11.5" text-anchor="middle" font-style="italic">${esc(l.label)}</text>`;
  }).join('');

  el.innerHTML = `
  <div class="wrap">
    <div class="eyebrow">Six thousand years, five records</div>
    <h1 class="page-title">Timeline of the Scriptures</h1>
    <p class="section-intro">Five bands, one covenant story — Old Testament, Jaredites, Nephites, New Testament, and the Restoration —
    with the threads that tie them together. Drag to pan, scroll to zoom, click any node, or step
    <strong>forward and backward in time</strong>. Early dates are traditional; Jaredite dates are approximations.</p>
    <div class="tl-toolbar">
      <button class="btn" id="tl-prev">← Back in time</button>
      <button class="btn" id="tl-next">Forward in time →</button>
      ${BANDS.map(b => `<button class="pill link" data-band="${b.id}"><span class="dot" style="background:${b.color}"></span>${b.label}</button>`).join('')}
      <button class="btn" id="tl-reset" style="margin-left:auto">Reset view</button>
    </div>
    <div class="tl-stage" id="tl-stage">
      <svg id="tl-svg" viewBox="0 0 1200 ${H}">
        <g id="tl-world">
          ${BANDS.map(b => spine(b) + ticks(b)).join('')}
          ${links}
          ${nodes}
          <circle id="tl-halo" r="16" fill="none" stroke="#fff" stroke-width="2" opacity="0"/>
        </g>
      </svg>
      <div class="tl-detail" id="tl-detail"></div>
      <div class="tl-hint">drag to pan · scroll to zoom · click a node</div>
    </div>
  </div>`;

  const svg = el.querySelector('#tl-svg');
  const world = el.querySelector('#tl-world');
  let tx = 0, ty = 0, k = 1;
  const apply = () => world.setAttribute('transform', `translate(${tx},${ty}) scale(${k})`);
  let drag = null;
  svg.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, tx, ty }; svg.classList.add('dragging'); svg.setPointerCapture(e.pointerId); });
  svg.addEventListener('pointermove', e => {
    if (!drag) return;
    const r = svg.getBoundingClientRect();
    tx = drag.tx + (e.clientX - drag.x) / r.width * 1200;
    ty = drag.ty + (e.clientY - drag.y) / r.height * H;
    apply();
  });
  svg.addEventListener('pointerup', () => { drag = null; svg.classList.remove('dragging'); });
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    const vx = (e.clientX - r.left) / r.width * 1200, vy = (e.clientY - r.top) / r.height * H;
    const wx = (vx - tx) / k, wy = (vy - ty) / k;
    const f = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    k = Math.max(.25, Math.min(4, k * f));
    tx = vx - wx * k; ty = vy - wy * k;
    apply();
  }, { passive: false });

  const halo = el.querySelector('#tl-halo');
  const detail = el.querySelector('#tl-detail');
  let cur = -1;
  // step chronologically across ALL records at once
  const ordered = [...events].sort((a, b) => a.yearNum - b.yearNum || a.band.y - b.band.y);

  const focus = (idx, openCard = true) => {
    cur = idx;
    const e = ordered[idx];
    if (!e) return;
    k = Math.max(k, 1);
    tx = 600 - e.nx * k; ty = H / 2 - ((e.band.y + e.ny) / 2) * k;
    apply();
    halo.setAttribute('cx', e.nx); halo.setAttribute('cy', e.ny); halo.setAttribute('opacity', '.8');
    if (openCard) showDetail(e);
  };
  const showDetail = e => {
    const faces = (e.characters || []).map(id => {
      const en = ents.byId[id];
      return en ? `<a class="fc" href="#/character/${id}" title="${esc(en.name)}">${avatar(en)}</a>` : '';
    }).join('');
    const bk = bookBySlug[e.ref.slug];
    detail.innerHTML = `
      <button class="close" aria-label="Close">✕</button>
      <h3>${esc(e.title)}</h3>
      <div class="yrs">${esc(e.years)} · ${esc(e.band.label)}</div>
      <p>${esc(e.blurb)}</p>
      ${faces ? `<div class="faces">${faces}</div>` : ''}
      <a class="btn primary" href="#/read/${e.ref.slug}/${e.ref.c}">Read ${bk ? bk.name : e.ref.slug} ${e.ref.c} →</a>`;
    detail.classList.add('open');
    detail.querySelector('.close').addEventListener('click', () => detail.classList.remove('open'));
  };

  svg.addEventListener('click', e => {
    const node = e.target.closest('.tl-node');
    if (!node) return;
    focus(ordered.indexOf(events[+node.dataset.i]));
  });
  el.querySelector('#tl-prev').addEventListener('click', () => focus(cur <= 0 ? ordered.length - 1 : cur - 1));
  el.querySelector('#tl-next').addEventListener('click', () => focus(cur >= ordered.length - 1 ? 0 : cur + 1));
  const fitAll = () => { k = .34; tx = 10; ty = (H - H * k) / 2 - 40; apply(); };
  el.querySelector('#tl-reset').addEventListener('click', () => { fitAll(); halo.setAttribute('opacity', 0); detail.classList.remove('open'); cur = -1; });
  el.querySelectorAll('[data-band]').forEach(btn => btn.addEventListener('click', () => {
    const b = bandOf[btn.dataset.band];
    k = 1; tx = -b.x0 + 40; ty = H / 2 - b.y; apply();
    detail.classList.remove('open');
  }));

  const y = parseFloat(params.get('y'));
  const era = params.get('era');
  if (!Number.isNaN(y)) {
    let best = 0, bd = Infinity;
    const pool = era ? ordered.filter(e => e.era === era) : ordered;
    pool.forEach(e => { const d = Math.abs(e.yearNum - y); if (d < bd) { bd = d; best = ordered.indexOf(e); } });
    focus(best, false);
  } else {
    fitAll();
  }
}
