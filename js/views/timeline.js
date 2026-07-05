import { loadTimeline, entities, bookBySlug, esc } from '../data.js';
import { avatar } from '../portraits.js';

// One shared chronological spine (top = earliest). Every event sits in true
// time order on the same axis; long empty stretches are compressed into
// explicit "years pass" markers so dense clusters stay readable.

const ERAS = [
  { id: 'ot', label: 'Old Testament', range: 'Creation – c. 400 BC · Eden to Malachi', color: '#6f9e6a' },
  { id: 'jaredite', label: 'The Jaredites', range: 'c. 2200 – 580 BC · from the tower to Ramah', color: '#8e6bb8' },
  { id: 'lehite', label: 'Nephites & Lamanites', range: '600 BC – AD 421 · from Jerusalem to Cumorah', color: '#e8b64c' },
  { id: 'nt', label: 'New Testament', range: '4 BC – c. AD 95 · from Bethlehem to Patmos', color: '#d98f3a' },
  { id: 'dc', label: 'The Restoration', range: '1823 – 1918 · from the Sacred Grove to the spirit world', color: '#3fa7a0' },
];

// the few cross-record threads worth keeping — rendered as quiet inline
// chips on both ends, never as diagonal lines over the chart
const LINKS = [
  { a: 'ramah', b: 'escape-to-zarahemla', note: 'the 24 gold plates' },
  { a: 'crucifixion', b: 'destruction', note: 'the same three days' },
  { a: 'revelation-patmos', b: 'moroni-visits', note: 'after long centuries of apostasy' },
  { a: 'jerusalem-falls', b: 'lehi-leaves', note: 'as the city falls, Lehi is already gone' },
];

const GAP_YEARS = 90; // a pause marker appears when this much time passes

function gapLabel(g) {
  let n;
  if (g >= 1000) n = Math.round(g / 100) * 100;
  else if (g >= 300) n = Math.round(g / 50) * 50;
  else n = Math.round(g / 10) * 10;
  return 'about ' + n.toLocaleString() + ' years pass';
}

export async function renderTimeline(el, params) {
  const [tl, ents] = await Promise.all([loadTimeline(), entities()]);

  const eraOf = {}; ERAS.forEach((b, i) => { eraOf[b.id] = b; b.order = i; });
  const events = tl.events
    .filter(e => eraOf[e.era])
    .map((e, i) => ({ ...e, src: i }))
    .sort((a, b) => a.yearNum - b.yearNum || eraOf[a.era].order - eraOf[b.era].order || a.src - b.src);
  events.forEach((e, i) => { e.i = i; });

  const byId = {}; events.forEach(e => { byId[e.id] = e; });
  const threads = {}; // event id -> [{ other, note }]
  LINKS.forEach(l => {
    const a = byId[l.a], b = byId[l.b];
    if (!a || !b) return;
    (threads[a.id] = threads[a.id] || []).push({ other: b, note: l.note });
    (threads[b.id] = threads[b.id] || []).push({ other: a, note: l.note });
  });

  // ---- build the river ------------------------------------------------
  const seenEra = {};
  let prevYear = null, prevYearsStr = null;
  const rows = [];
  events.forEach(e => {
    const era = eraOf[e.era];
    if (prevYear != null && e.yearNum - prevYear >= GAP_YEARS) {
      rows.push(`<div class="tl-gap"><span class="tl-gap-node"></span><span class="tl-gap-txt">${esc(gapLabel(e.yearNum - prevYear))}</span></div>`);
      prevYearsStr = null;
    }
    if (!seenEra[e.era]) {
      seenEra[e.era] = true;
      rows.push(`<div class="tl-era" id="tl-era-${era.id}">
        <span class="tl-era-node"><span class="tl-gem" style="border-color:${era.color}"></span></span>
        <span class="tl-era-body">
          <span class="tl-era-name" style="color:${era.color}">${esc(era.label)}</span>
          <span class="tl-era-range">${esc(era.range)}</span>
        </span></div>`);
      prevYearsStr = null;
    }
    const showYear = e.years !== prevYearsStr;
    const th = (threads[e.id] || []).map(t =>
      `<button class="tl-thread" data-goto="${t.other.i}" title="${esc(t.note)}">&#10554; ${esc(t.note)} &middot; <em>${esc(t.other.title)}</em></button>`).join('');
    rows.push(`<div class="tl-ev" role="button" tabindex="0" data-i="${e.i}" id="tl-ev-${e.i}" aria-label="${esc(e.title)}, ${esc(e.years)}">
      <span class="tl-year">${showYear ? esc(e.years) : ''}</span>
      <span class="tl-node"><span class="tl-dot" style="border-color:${era.color}"></span></span>
      <span class="tl-body">
        <span class="tl-title">${esc(e.title)}</span>
        <span class="tl-meta"><span class="tl-swatch" style="background:${era.color}"></span>${esc(era.label)}</span>
        ${th}
      </span></div>`);
    prevYear = e.yearNum;
    prevYearsStr = e.years;
  });

  el.innerHTML = `
  <div class="wrap">
    <div class="eyebrow">Six thousand years, five records</div>
    <h1 class="page-title">Timeline of the Scriptures</h1>
    <p class="section-intro">One river of time, top to bottom — Old Testament, Jaredites, Nephites, New Testament, and the
    Restoration, interleaved in true chronological order. Long silent stretches are folded into quiet pauses.
    Click any event for the story, or step <strong>forward and backward in time</strong>.
    Early dates are traditional; Jaredite dates are approximations.</p>
    <div class="tl-toolbar">
      <button class="btn" id="tl-prev" title="Previous event">&larr; Earlier</button>
      <button class="btn" id="tl-next" title="Next event">Later &rarr;</button>
      <span class="tl-count" id="tl-count"></span>
      <span class="tl-legend">
        ${ERAS.map(b => `<button class="pill link" data-era="${b.id}" title="Jump to ${esc(b.label)}"><span class="dot" style="background:${b.color}"></span>${esc(b.label)}</button>`).join('')}
      </span>
    </div>
    <div class="tl-layout">
      <div class="tl-river" id="tl-river">${rows.join('')}</div>
      <aside class="tl-side">
        <div class="tl-detail" id="tl-detail"></div>
      </aside>
    </div>
  </div>`;

  const river = el.querySelector('#tl-river');
  const detail = el.querySelector('#tl-detail');
  const count = el.querySelector('#tl-count');
  let cur = -1;

  const showHint = () => {
    detail.innerHTML = `
      <div class="tl-hint-card">
        <div class="tl-hint-mark">&#10086;</div>
        <p>Select an event on the timeline, or use <strong>Earlier / Later</strong> to walk through history one moment at a time.</p>
      </div>`;
    detail.classList.remove('open');
    count.textContent = events.length + ' events';
  };

  const showDetail = e => {
    const era = eraOf[e.era];
    const faces = (e.characters || []).map(id => {
      const en = ents.byId[id];
      return en ? `<a class="fc" href="#/character/${id}" title="${esc(en.name)}">${avatar(en)}<span class="fc-name">${esc(en.name)}</span></a>` : '';
    }).join('');
    const bk = bookBySlug[e.ref.slug];
    const bookLabel = e.ref.slug === 'dc' ? 'D&amp;C' : esc(bk ? bk.name : e.ref.slug);
    const th = (threads[e.id] || []).map(t =>
      `<button class="tl-thread" data-goto="${t.other.i}">&#10554; ${esc(t.note)} &middot; <em>${esc(t.other.title)}</em></button>`).join('');
    detail.innerHTML = `
      <button class="close" aria-label="Close">&#10005;</button>
      <div class="tl-detail-era" style="color:${era.color}"><span class="tl-swatch" style="background:${era.color}"></span>${esc(era.label)}</div>
      <h3>${esc(e.title)}</h3>
      <div class="yrs">${esc(e.years)}</div>
      <p>${esc(e.blurb)}</p>
      ${faces ? `<div class="faces">${faces}</div>` : ''}
      ${th ? `<div class="tl-detail-threads">${th}</div>` : ''}
      <a class="btn primary" href="#/read/${e.ref.slug}/${e.ref.c}">Read ${bookLabel} ${e.ref.c} &rarr;</a>
      <div class="tl-detail-step">
        <button class="btn" data-step="-1">&larr; Earlier</button>
        <button class="btn" data-step="1">Later &rarr;</button>
      </div>`;
    detail.classList.add('open');
    detail.querySelector('.close').addEventListener('click', () => { clearSel(); showHint(); });
    detail.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => step(+b.dataset.step)));
    detail.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => focus(+b.dataset.goto)));
    count.textContent = (e.i + 1) + ' of ' + events.length + ' · ' + e.years;
  };

  const clearSel = () => {
    const s = river.querySelector('.tl-ev.sel');
    if (s) s.classList.remove('sel');
    cur = -1;
  };

  const focus = (idx, scroll, smooth) => {
    const e = events[idx];
    if (!e) return;
    const s = river.querySelector('.tl-ev.sel');
    if (s) s.classList.remove('sel');
    cur = idx;
    const row = el.querySelector('#tl-ev-' + idx);
    if (row) {
      row.classList.add('sel');
      if (scroll !== false) row.scrollIntoView({ behavior: smooth === false ? 'auto' : 'smooth', block: 'center' });
    }
    showDetail(e);
  };
  const step = d => focus(cur < 0 ? (d > 0 ? 0 : events.length - 1) : (cur + d + events.length) % events.length);

  river.addEventListener('click', ev => {
    const goto = ev.target.closest('.tl-thread');
    if (goto) { ev.stopPropagation(); focus(+goto.dataset.goto); return; }
    const row = ev.target.closest('.tl-ev');
    if (row) focus(+row.dataset.i, false);
  });
  river.addEventListener('keydown', ev => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const row = ev.target.closest('.tl-ev');
    if (row) { ev.preventDefault(); focus(+row.dataset.i, false); }
  });
  el.querySelector('#tl-prev').addEventListener('click', () => step(-1));
  el.querySelector('#tl-next').addEventListener('click', () => step(1));
  el.querySelectorAll('[data-era]').forEach(btn => btn.addEventListener('click', () => {
    const head = el.querySelector('#tl-era-' + btn.dataset.era);
    if (head) {
      head.scrollIntoView({ behavior: 'smooth', block: 'start' });
      head.classList.remove('flash'); void head.offsetWidth; head.classList.add('flash');
    }
  }));

  // ---- deep link: ?y=<yearNum>&era=<id> --------------------------------
  const y = parseFloat(params.get('y'));
  const era = params.get('era');
  if (!Number.isNaN(y)) {
    let best = -1, bd = Infinity;
    events.forEach(e => {
      if (era && e.era !== era) return;
      const d = Math.abs(e.yearNum - y);
      if (d < bd) { bd = d; best = e.i; }
    });
    if (best < 0 && era) events.forEach(e => { const d = Math.abs(e.yearNum - y); if (d < bd) { bd = d; best = e.i; } });
    if (best >= 0) {
      const b = best;
      // the router resets scroll after rendering; jump once it has finished
      setTimeout(() => focus(b, true, false), 0);
    }
  } else if (era && eraOf[era]) {
    let first = -1;
    events.forEach(e => { if (first < 0 && e.era === era) first = e.i; });
    if (first >= 0) { const f = first; setTimeout(() => focus(f, true, false), 0); }
  } else {
    showHint();
  }
}
