import { loadTimeline, entities, bookBySlug, esc, fmtYear } from '../data.js';
import { avatar } from '../portraits.js';

export async function renderTimeline(el, params) {
  const [tl, ents] = await Promise.all([loadTimeline(), entities()]);

  // layout: one long horizontal canvas, Jaredite band above, Lehite band below.
  const J = { y: 150, x0: 60, x1: 1050, t0: -2250, t1: -540, color: '#8e6bb8' };
  const L = { y: 430, x0: 60, x1: 3350, t0: -640, t1: 460, color: '#e8b64c' };
  const H = 640;
  const xOf = (e) => {
    const b = e.era === 'jaredite' ? J : L;
    return b.x0 + (e.yearNum - b.t0) / (b.t1 - b.t0) * (b.x1 - b.x0);
  };
  const events = tl.events.map((e, i) => ({ ...e, i, x: xOf(e), band: e.era === 'jaredite' ? J : L }));
  // alternate above/below the spine per band
  const perBand = { jaredite: 0, lehite: 0 };
  for (const e of events) { e.alt = (perBand[e.era]++ % 2 === 0) ? -1 : 1; }
  // spread node labels so dense periods (600-570 BC) stay readable:
  // the spine dot keeps true time; the labelled node may shift right.
  for (const era of ['jaredite', 'lehite']) {
    for (const side of [-1, 1]) {
      let cursor = -Infinity;
      for (const e of events.filter(v => v.era === era && v.alt === side)) {
        e.nx = Math.max(e.x, cursor + 170);
        cursor = e.nx;
      }
    }
  }

  const spine = (b, label, range) => `
    <line x1="${b.x0 - 20}" y1="${b.y}" x2="${b.x1 + 20}" y2="${b.y}" stroke="${b.color}" stroke-width="3" stroke-linecap="round" opacity=".8"/>
    <text x="${b.x0 - 20}" y="${b.y - 58}" fill="${b.color}" font-size="20" font-family="Georgia,serif">${label}</text>
    <text x="${b.x0 - 20}" y="${b.y - 38}" fill="#8a8069" font-size="12">${range}</text>`;

  const ticks = (b, step) => {
    let out = '';
    const start = Math.ceil(b.t0 / step) * step;
    for (let y = start; y <= b.t1; y += step) {
      const x = b.x0 + (y - b.t0) / (b.t1 - b.t0) * (b.x1 - b.x0);
      out += `<line x1="${x}" y1="${b.y - 6}" x2="${x}" y2="${b.y + 6}" stroke="#5a4f3a" stroke-width="1.5"/>
        <text x="${x}" y="${b.y + 24}" fill="#8a8069" font-size="11" text-anchor="middle">${y < 0 ? -y + ' BC' : y === 0 ? '·' : 'AD ' + y}</text>`;
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

  // connector: the Jaredite record flows into the Lehite story (Ether's 24 plates found c. 121 BC)
  const ramah = events.find(e => e.id === 'ramah');
  const found = events.find(e => e.id === 'escape-to-zarahemla') || events.find(e => e.era === 'lehite');
  const connector = ramah && found ? `
    <path d="M ${ramah.x} ${J.y} C ${ramah.x + 160} ${J.y + 90}, ${found.x - 200} ${L.y - 110}, ${found.x} ${L.y}" stroke="#8e6bb8" stroke-width="1.6" stroke-dasharray="6 6" fill="none" opacity=".6"/>
    <text x="${(ramah.x + found.x) / 2}" y="${(J.y + L.y) / 2 - 4}" fill="#8e6bb8" font-size="11.5" text-anchor="middle" font-style="italic">24 gold plates found by Limhi's explorers → translated by Mosiah</text>` : '';

  el.innerHTML = `
  <div class="wrap">
    <div class="eyebrow">A thousand-year river</div>
    <h1 class="page-title">Timeline of the Record</h1>
    <p class="section-intro">Two civilizations, one warning arc. Drag to pan, scroll to zoom, click any node — or step
    <strong>forward and backward in time</strong> with the arrows. Jaredite dates are approximations; the record gives genealogy, not years.</p>
    <div class="tl-toolbar">
      <button class="btn" id="tl-prev">← Back in time</button>
      <button class="btn" id="tl-next">Forward in time →</button>
      <span class="pill"><span class="dot" style="background:#8e6bb8"></span>Jaredites</span>
      <span class="pill"><span class="dot" style="background:#e8b64c"></span>Nephites &amp; Lamanites</span>
      <button class="btn" id="tl-reset" style="margin-left:auto">Reset view</button>
    </div>
    <div class="tl-stage" id="tl-stage">
      <svg id="tl-svg" viewBox="0 0 1200 ${H}">
        <g id="tl-world">
          ${spine(J, 'The Jaredites', 'c. 2200 – 580 BC · from the tower to Ramah')}
          ${ticks(J, 400)}
          ${spine(L, 'Nephites & Lamanites', '600 BC – AD 421 · from Jerusalem to Cumorah')}
          ${ticks(L, 100)}
          ${connector}
          ${nodes}
          <circle id="tl-halo" r="16" fill="none" stroke="#fff" stroke-width="2" opacity="0"/>
        </g>
      </svg>
      <div class="tl-detail" id="tl-detail"></div>
      <div class="tl-hint">drag to pan · scroll to zoom · click a node</div>
    </div>
  </div>`;

  // ---- pan/zoom ----
  const svg = el.querySelector('#tl-svg');
  const world = el.querySelector('#tl-world');
  let tx = 0, ty = 0, k = 1;
  const apply = () => world.setAttribute('transform', `translate(${tx},${ty}) scale(${k})`);
  const clientToWorld = (cx, cy) => {
    const r = svg.getBoundingClientRect();
    const vx = (cx - r.left) / r.width * 1200, vy = (cy - r.top) / r.height * H;
    return [(vx - tx) / k, (vy - ty) / k];
  };
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
    const [wx, wy] = clientToWorld(e.clientX, e.clientY);
    const f = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    k = Math.max(.35, Math.min(4, k * f));
    tx = (e.clientX - svg.getBoundingClientRect().left) / svg.getBoundingClientRect().width * 1200 - wx * k;
    ty = (e.clientY - svg.getBoundingClientRect().top) / svg.getBoundingClientRect().height * H - wy * k;
    apply();
  }, { passive: false });

  const halo = el.querySelector('#tl-halo');
  const detail = el.querySelector('#tl-detail');
  let cur = -1;
  const ordered = [...events].sort((a, b) => (a.era === b.era ? a.yearNum - b.yearNum : a.era === 'jaredite' ? -1 : 1));

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
    detail.innerHTML = `
      <button class="close" aria-label="Close">✕</button>
      <h3>${esc(e.title)}</h3>
      <div class="yrs">${esc(e.years)} · ${e.era === 'jaredite' ? 'Jaredite era' : 'Lehite era'}</div>
      <p>${esc(e.blurb)}</p>
      ${faces ? `<div class="faces">${faces}</div>` : ''}
      <a class="btn primary" href="#/read/${e.ref.slug}/${e.ref.c}">Read ${bookBySlug[e.ref.slug].name} ${e.ref.c} →</a>`;
    detail.classList.add('open');
    detail.querySelector('.close').addEventListener('click', () => detail.classList.remove('open'));
  };

  svg.addEventListener('click', e => {
    const node = e.target.closest('.tl-node');
    if (!node) return;
    const ev = events[+node.dataset.i];
    focus(ordered.indexOf(ev));
  });
  el.querySelector('#tl-prev').addEventListener('click', () => focus(cur <= 0 ? ordered.length - 1 : cur - 1));
  el.querySelector('#tl-next').addEventListener('click', () => focus(cur >= ordered.length - 1 ? 0 : cur + 1));
  el.querySelector('#tl-reset').addEventListener('click', () => { tx = 0; ty = 0; k = 1; apply(); halo.setAttribute('opacity', 0); detail.classList.remove('open'); cur = -1; });

  // deep link ?y=  → focus nearest lehite/jaredite event
  const y = parseFloat(params.get('y'));
  if (!Number.isNaN(y)) {
    let best = 0, bd = Infinity;
    ordered.forEach((e, i) => { const d = Math.abs(e.yearNum - y); if (d < bd) { bd = d; best = i; } });
    focus(best, false);
  } else {
    // start framing the whole lehite band
    k = .38; tx = 20; ty = 100; apply();
  }
}
