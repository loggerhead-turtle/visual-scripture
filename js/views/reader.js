import { BOOKS, bookBySlug, loadText, loadMeta, loadPlaces, loadPlates, loadTimeline, entities, segmentFor, prevNextChapter, esc, themeName } from '../data.js';
import { avatar } from '../portraits.js';

let observer = null;

export async function renderReader(el, slug, c, params) {
  const book = bookBySlug[slug];
  if (!book) { location.hash = '#/read/1-nephi/1'; return; }
  c = Math.min(c, book.chapters);

  const [text, meta, ents, placesData, platesData, tl] = await Promise.all([
    loadText(slug), loadMeta(slug), entities(), loadPlaces(), loadPlates(), loadTimeline(),
  ]);
  const verses = text.chapters[c - 1];
  const cm = meta.chapters[c - 1] || {};
  const platesKey = cm.plates || meta.plates;
  const pk = platesData.platesKeys[platesKey] || {};
  const place = cm.place ? placesData.places.find(p => p.id === cm.place) : null;
  const { prev, next } = prevNextChapter(slug, c);
  const narrator = ents.byId[meta.narrator];

  const toc = BOOKS.map(b => {
    const cur = b.slug === slug;
    const color = platesData.platesKeys[(platesData.books.find(x => x.slug === b.slug) || {}).plates]?.color || '#888';
    return `<div class="toc-book ${cur ? 'current' : ''}" data-slug="${b.slug}">
      <button type="button"><span class="dot" style="background:${color}"></span>${b.name}</button>
      <div class="toc-chapters" ${cur ? '' : 'hidden'}>${Array.from({ length: b.chapters }, (_, i) =>
        `<a href="#/read/${b.slug}/${i + 1}" class="${cur && i + 1 === c ? 'current' : ''}">${i + 1}</a>`).join('')}</div>
    </div>`;
  }).join('');

  const versesHtml = verses.map((v, i) =>
    `<p class="verse" id="v${i + 1}" data-v="${i + 1}"><span class="vnum">${i + 1}</span>${esc(v)}</p>`).join('');

  const themes = (cm.themes || []).map(t => `<span class="pill">✦ ${themeName(t)}</span>`).join('');
  const chars = (cm.characters || []).map(id => {
    const e = ents.byId[id]; return e ? `<a class="pill link" href="#/character/${id}">${e.name}</a>` : '';
  }).join('');

  el.innerHTML = `
  <div class="wrap">
    <div class="reader-layout">
      <aside class="reader-toc">${toc}</aside>
      <article>
        <header class="chapter-head">
          <div class="crumbs"><a href="#/read">Book of Mormon</a> · ${pk.short || ''} · ${esc(cm.years || '')}</div>
          <h1>${book.name} ${c}</h1>
          ${cm.title ? `<h2 class="ctitle">${esc(cm.title)}</h2>` : ''}
          ${cm.synopsis ? `<div class="synopsis"><strong style="color:var(--gold-dim)">Synopsis — </strong>${esc(cm.synopsis)}</div>` : ''}
          <div class="chapter-meta">
            <a class="pill link" href="#/plates?p=${platesKey}"><span class="dot" style="background:${pk.color || '#888'}"></span>${pk.short || 'Plates'}</a>
            ${place ? `<a class="pill link" href="#/map?place=${place.id}">📍 ${place.name}</a>` : ''}
            <a class="pill link" href="#/timeline?y=${cm.yearNum ?? ''}">🕰 ${esc(cm.years || 'Timeline')}</a>
            ${themes}
          </div>
          ${chars ? `<div class="chapter-meta" style="margin-top:8px">${chars}</div>` : ''}
        </header>
        <div class="verses" id="verses">${versesHtml}</div>
        <nav class="chapter-nav">
          ${prev ? `<a class="btn" href="#/read/${prev.slug}/${prev.c}">← ${bookBySlug[prev.slug].name} ${prev.c}</a>` : '<span></span>'}
          ${next ? `<a class="btn" href="#/read/${next.slug}/${next.c}">${bookBySlug[next.slug].name} ${next.c} →</a>` : '<span></span>'}
        </nav>
      </article>
      <aside class="speaker-rail">
        <div class="speaker-card" id="speaker-card"></div>
        <div class="context-card">
          <h4>Chapter context</h4>
          <div class="row"><span class="k">When</span><span class="v">${esc(cm.years || '—')}${cm.approx ? ' (approx.)' : ''}</span></div>
          <div class="row"><span class="k">Where</span><span class="v">${place ? `<a href="#/map?place=${place.id}">${place.name}</a>` : 'Doctrinal — no single place'}</span></div>
          <div class="row"><span class="k">Record</span><span class="v"><a href="#/plates?p=${platesKey}">${pk.short || '—'}</a></span></div>
          <div class="row"><span class="k">Narrator</span><span class="v">${narrator ? `<a href="#/character/${narrator.id}">${narrator.name}</a>` : '—'}</span></div>
          <div class="mini-timeline" id="mini-tl"></div>
        </div>
      </aside>
    </div>
  </div>`;

  // TOC book expand/collapse
  el.querySelectorAll('.toc-book > button').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrap = btn.parentElement.querySelector('.toc-chapters');
      wrap.hidden = !wrap.hidden;
    });
  });
  const curBtn = el.querySelector('.toc-book.current');
  if (curBtn) curBtn.scrollIntoView({ block: 'center' });

  renderMiniTimeline(el.querySelector('#mini-tl'), tl, cm.yearNum);

  // ---- living speaker card ----
  const cardEl = el.querySelector('#speaker-card');
  let activeSeg;
  const setSegment = seg => {
    if (seg === activeSeg) return;
    activeSeg = seg;
    renderSpeakerCard(cardEl, seg, ents, meta);
    el.querySelectorAll('.verse').forEach(p => {
      const v = +p.dataset.v;
      p.classList.toggle('seg-active', !!seg && v >= seg.s && v <= seg.e);
      if (seg) {
        const spk = ents.byId[seg.speaker];
        p.style.borderLeftColor = (!!seg && v >= seg.s && v <= seg.e) ? (spk?.portrait?.accent || 'var(--gold-dim)') : 'transparent';
      }
    });
  };
  setSegment(segmentFor(cm, 1) || defaultSeg(meta, verses.length));

  if (observer) observer.disconnect();
  const visible = new Set();
  observer = new IntersectionObserver(entriesList => {
    for (const en of entriesList) {
      const v = +en.target.dataset.v;
      if (en.isIntersecting) visible.add(v); else visible.delete(v);
    }
    if (visible.size) {
      const top = Math.min(...visible);
      setSegment(segmentFor(cm, top) || defaultSeg(meta, verses.length));
    }
  }, { rootMargin: '-15% 0px -55% 0px', threshold: 0 });
  el.querySelectorAll('.verse').forEach(p => observer.observe(p));

  const vParam = parseInt(params.get('v') || '', 10);
  if (vParam) document.getElementById(`v${vParam}`)?.scrollIntoView({ block: 'center' });
}

const defaultSeg = (meta, n) => ({ s: 1, e: n, speaker: meta.narrator, to: 'reader', note: `${meta.book}: the narrator addresses the reader` });

function renderSpeakerCard(cardEl, seg, ents, meta) {
  if (!seg) { cardEl.innerHTML = ''; return; }
  const spk = ents.byId[seg.speaker];
  const aud = ents.byId[seg.to];
  cardEl.innerHTML = `
    <div class="sc-label">Now speaking — verses ${seg.s}–${seg.e}</div>
    <div class="sc-duo">
      <a class="sc-portrait" href="#/character/${seg.speaker}">
        ${avatar(spk)}
        <div class="who">${spk ? esc(spk.name) : esc(seg.speaker)}</div>
        <div class="role">${spk ? esc(spk.title || '') : ''}</div>
      </a>
      <div class="sc-arrow"><span class="to-label">speaking to</span>➤</div>
      <a class="sc-portrait small" href="#/character/${seg.to}">
        ${avatar(aud)}
        <div class="who">${aud ? esc(aud.name) : esc(seg.to || '')}</div>
      </a>
    </div>
    ${seg.note ? `<div class="sc-note">${esc(seg.note)}</div>` : ''}
    <div class="sc-verses">Voices change as you scroll — from ${esc(meta.book)}'s segment notes.</div>`;
}

function renderMiniTimeline(el, tl, yearNum) {
  if (!el) return;
  const min = -600, max = 421;
  const w = 260, h = 46;
  const x = v => 12 + (Math.max(min, Math.min(max, v)) - min) / (max - min) * (w - 24);
  let marks = '';
  for (const y of [-600, -400, -200, 0, 200, 400]) {
    marks += `<line x1="${x(y)}" y1="18" x2="${x(y)}" y2="26" stroke="#3a3225" stroke-width="1"/>
      <text x="${x(y)}" y="40" fill="#8a8069" font-size="8" text-anchor="middle">${y < 0 ? -y + ' BC' : 'AD ' + y}</text>`;
  }
  const pos = yearNum == null ? null : x(yearNum);
  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}">
    <line x1="12" y1="22" x2="${w - 12}" y2="22" stroke="#3a3225" stroke-width="2"/>${marks}
    ${pos != null ? `<circle cx="${pos}" cy="22" r="5" fill="var(--gold)"/><circle cx="${pos}" cy="22" r="8" fill="none" stroke="var(--gold)" stroke-opacity=".4"/>` : ''}
  </svg>
  <div style="text-align:center"><a href="#/timeline${yearNum != null ? '?y=' + yearNum : ''}" style="font-size:11.5px">Open full timeline →</a></div>`;
}
