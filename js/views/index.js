import { entities, appearances, loadPlaces, loadPlacesHolyLand, loadPlacesUSA, loadTopics, topicIndex, bookBySlug, VOLUMES, esc, themeName } from '../data.js';
import { avatar } from '../portraits.js';

// The Index: an alphabetical topical guide over the whole site — characters,
// places, and topics — each entry linking to its home page (character/map/
// reader) rather than duplicating content already built elsewhere.

const mapParamFor = place => place.oldWorld || place.strip ? 'holy-land' : (place.trail ? 'usa' : (place.ox != null ? 'holy-land' : 'internal'));

export async function renderIndex(el, params) {
  const [ents, apps, pBom, pHL, pUSA, topicsData, tIdx] = await Promise.all([
    entities(), appearances(), loadPlaces(), loadPlacesHolyLand(), loadPlacesUSA(), loadTopics(), topicIndex(),
  ]);

  const places = [
    ...pBom.places.map(p => ({ ...p, map: 'internal' })),
    ...((pHL && pHL.places) || []).map(p => ({ ...p, map: 'holy-land' })),
    ...((pUSA && pUSA.places) || []).map(p => ({ ...p, map: 'usa' })),
  ];

  const topics = (topicsData && topicsData.topics ? topicsData.topics : Object.keys(tIdx).map(id => ({ id, name: themeName(id), blurb: '' })))
    .map(t => ({ ...t, refs: (tIdx[t.id] || []).slice().sort((a, b) => a.slug.localeCompare(b.slug) || a.c - b.c) }))
    .filter(t => t.refs.length);

  const people = ents.characters
    .map(c => ({ c, refs: apps[c.id] || [] }))
    .filter(x => x.refs.length)
    .sort((a, b) => a.c.name.localeCompare(b.c.name));

  const placesSorted = places.filter((p, i, arr) => arr.findIndex(q => q.id === p.id) === i).sort((a, b) => a.name.localeCompare(b.name));

  const refChip = r => `<a class="pill link" href="#/read/${r.slug}/${r.c}">${r.slug === 'dc' ? 'D&C ' + r.c : (bookBySlug[r.slug] ? bookBySlug[r.slug].name : r.slug) + ' ' + r.c}</a>`;
  const refList = (refs, max) => {
    const shown = refs.slice(0, max);
    return shown.map(refChip).join('') + (refs.length > max ? `<span class="pill">+${refs.length - max} more</span>` : '');
  };

  const topicCards = topics.sort((a, b) => a.name.localeCompare(b.name)).map(t => `
    <div class="idx-card" id="topic-${t.id}" data-kind="topic" data-hay="${esc(t.name.toLowerCase())}">
      <h3>${esc(t.name)}</h3>
      ${t.blurb ? `<p>${esc(t.blurb)}</p>` : ''}
      <div class="idx-refs">${refList(t.refs, 10)}</div>
    </div>`).join('');

  // NB: a card can't be one big <a> here — it also holds inner ref-chip <a>
  // tags, and nested anchors get silently split apart by the HTML parser.
  // So only the head (avatar + name) is a link; the ref chips are siblings.
  const charCards = people.map(({ c, refs }) => `
    <div class="idx-card" data-kind="character" data-hay="${esc(c.name.toLowerCase())}">
      <a class="idx-card-head" href="#/character/${c.id}">${avatar(c)}<div><h3>${esc(c.name)}</h3><div class="idx-sub">${esc(c.title || '')}</div></div></a>
      <div class="idx-refs">${refList(refs, 6)}</div>
    </div>`).join('');

  const placeCards = placesSorted.map(p => `
    <a class="idx-card idx-card-link" data-kind="place" data-hay="${esc(p.name.toLowerCase())}" href="#/map?place=${p.id}&m=${p.map}">
      <h3>📍 ${esc(p.name)}</h3>
      <p>${esc((p.desc || '').slice(0, 140))}${(p.desc || '').length > 140 ? '…' : ''}</p>
    </a>`).join('');

  el.innerHTML = `
  <style id="index-css">
    .idx-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
    .idx-tab { background: var(--panel); border: 1px solid var(--line); color: var(--ink-dim); border-radius: 999px; padding: 8px 16px; cursor: pointer; font-size: 14px; font-family: var(--sans); }
    .idx-tab:hover { color: var(--ink); border-color: var(--gold-dim); }
    .idx-tab.on { color: #241b08; background: var(--gold); border-color: var(--gold); font-weight: 600; }
    .idx-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
    .idx-card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--rad); padding: 14px 16px; color: var(--ink); }
    .idx-card-link:hover { border-color: var(--gold-dim); text-decoration: none; transform: translateY(-2px); }
    .idx-card { transition: transform .15s, border-color .15s; }
    .idx-card:has(.idx-card-head:hover) { border-color: var(--gold-dim); }
    .idx-card h3 { margin: 0 0 4px; font-size: 16px; }
    .idx-card p { margin: 0 0 8px; font-size: 12.5px; color: var(--ink-dim); line-height: 1.45; }
    .idx-sub { font-size: 11.5px; color: var(--gold-dim); }
    .idx-card-head { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; color: var(--ink); }
    .idx-card-head:hover { text-decoration: none; color: var(--gold); }
    .idx-card-head .avatar { width: 42px; border-radius: 8px; overflow: hidden; flex: none; }
    .idx-refs { display: flex; flex-wrap: wrap; gap: 5px; }
    .idx-refs .pill { font-size: 11px; padding: 2px 8px; }
    .idx-section-label { font-size: 12px; color: var(--ink-faint); margin: 4px 0 14px; }
  </style>
  <div class="wrap">
    <div class="eyebrow">A–Z across all four volumes</div>
    <h1 class="page-title">Index</h1>
    <p class="section-intro">Every topic, person, and place — the same index at the back of the standard works, made clickable.
    Jump straight to the chapters where each one appears.</p>
    <div class="stories-controls">
      <input type="search" id="idx-search" placeholder="Search the index…">
    </div>
    <div class="idx-tabs">
      <button class="idx-tab on" data-tab="topics">Topics (${topics.length})</button>
      <button class="idx-tab" data-tab="characters">Characters (${people.length})</button>
      <button class="idx-tab" data-tab="places">Places (${placesSorted.length})</button>
    </div>
    <div id="idx-panel-topics" class="idx-grid">${topicCards}</div>
    <div id="idx-panel-characters" class="idx-grid" hidden>${charCards}</div>
    <div id="idx-panel-places" class="idx-grid" hidden>${placeCards}</div>
  </div>`;

  const tabs = el.querySelectorAll('.idx-tab');
  const panels = { topics: el.querySelector('#idx-panel-topics'), characters: el.querySelector('#idx-panel-characters'), places: el.querySelector('#idx-panel-places') };
  const showTab = name => {
    tabs.forEach(t => t.classList.toggle('on', t.dataset.tab === name));
    Object.entries(panels).forEach(([k, p]) => { p.hidden = k !== name; });
  };
  tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));

  const search = el.querySelector('#idx-search');
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    el.querySelectorAll('.idx-card').forEach(c => { c.style.display = !q || c.dataset.hay.includes(q) ? '' : 'none'; });
  });

  const topic = params.get('topic');
  if (topic) {
    showTab('topics');
    const card = el.querySelector('#topic-' + topic);
    if (card) {
      card.style.outline = '1px solid var(--gold)';
      // deferred: app.js scrolls the page back to (0,0) right after this
      // view finishes rendering, which would otherwise clobber this jump
      setTimeout(() => card.scrollIntoView({ block: 'center' }), 0);
    }
  }
}
