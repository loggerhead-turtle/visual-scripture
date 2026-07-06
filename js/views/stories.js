import { VOLUMES, loadAllStories, loadPlaces, loadPlacesHolyLand, loadPlacesUSA, entities, bookBySlug, esc } from '../data.js';
import { avatar } from '../portraits.js';

export async function renderStories(el, params) {
  const [data, ents, pBom, pHL, pUSA] = await Promise.all([
    loadAllStories(), entities(), loadPlaces(), loadPlacesHolyLand(), loadPlacesUSA(),
  ]);
  const allPlaces = [
    ...pBom.places,
    ...((pHL && pHL.places) || []),
    ...((pUSA && pUSA.places) || []),
  ];

  const catPills = [{ id: 'all', name: 'All kinds' }, ...data.categories].map(c =>
    `<button class="pill link" data-cat="${c.id}">${esc(c.name)}</button>`).join('');
  const volPills = [`<button class="pill link" data-vol="all">All volumes</button>`,
    ...VOLUMES.map(v => `<button class="pill link" data-vol="${v.id}"><span class="dot" style="background:${v.color}"></span>${v.short}</button>`)].join('');

  const refName = r => r.slug === 'dc' ? `D&amp;C ${r.c}` : `${bookBySlug[r.slug] ? bookBySlug[r.slug].name : r.slug} ${r.c}`;

  const cards = data.stories.map(s => {
    const refs = s.refs.map(r => `<a href="#/read/${r.slug}/${r.c}">${refName(r)}</a>`).join(' · ');
    const faces = (s.characters || []).slice(0, 4).map(id => {
      const e = ents.byId[id];
      return e ? `<a class="fc" href="#/character/${id}" title="${esc(e.name)}">${avatar(e)}<span class="fc-name">${esc(e.name)}</span></a>` : '';
    }).join('');
    const place = s.place ? allPlaces.find(p => p.id === s.place) : null;
    const hay = `${s.title} ${s.blurb} ${(s.characters || []).map(id => (ents.byId[id] || {}).name || '').join(' ')}`.toLowerCase();
    const placeLink = place ? ` · <a href="#/map?place=${s.place}">📍 ${esc(place.name)}</a>` : '';
    const guideLink = s.allegory ? ` · <a href="#/allegory/${s.allegory}" style="color:var(--teal)">visual guide ↗</a>` : '';
    const goto = `${s.refs[0].slug}/${s.refs[0].c}`;
    return `<div class="story-card" role="link" style="cursor:pointer" data-cat="${s.cat}" data-vol="${s.vol}" data-hay="${esc(hay)}" data-goto="${goto}">
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.blurb)}</p>
      <div class="faces">${faces}</div>
      <div class="refs">${refs}${placeLink}${guideLink}</div>
    </div>`;
  }).join('');

  el.innerHTML = `
  <div class="wrap">
    <div class="eyebrow">Topic navigator</div>
    <h1 class="page-title">Find the Story</h1>
    <p class="section-intro">${data.stories.length} stories across all four volumes — the ones everyone remembers, and exactly where they
    live in the text. Filter by volume or kind, search by name or character, and jump straight to the chapter.</p>
    <div class="stories-controls">
      <input type="search" id="story-search" placeholder="Search stories, characters… (e.g. Goliath)">
      ${volPills}
    </div>
    <div class="stories-controls">${catPills}</div>
    <div class="story-grid" id="story-grid">${cards}</div>
  </div>`;

  let cat = 'all', vol = 'all';
  const searchEl = el.querySelector('#story-search');
  const applyFilter = () => {
    const q = searchEl.value.trim().toLowerCase();
    el.querySelectorAll('.story-card').forEach(c => {
      const okCat = cat === 'all' || c.dataset.cat === cat;
      const okVol = vol === 'all' || c.dataset.vol === vol;
      const okQ = !q || c.dataset.hay.includes(q);
      c.style.display = okCat && okVol && okQ ? '' : 'none';
    });
  };
  searchEl.addEventListener('input', applyFilter);
  el.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => {
    cat = b.dataset.cat;
    el.querySelectorAll('[data-cat]').forEach(x => x.style.borderColor = x === b ? 'var(--gold)' : '');
    applyFilter();
  }));
  el.querySelectorAll('[data-vol]').forEach(b => b.addEventListener('click', () => {
    vol = b.dataset.vol;
    el.querySelectorAll('[data-vol]').forEach(x => x.style.borderColor = x === b ? 'var(--gold)' : '');
    applyFilter();
  }));

  const grid = el.querySelector('#story-grid');
  grid.addEventListener('click', e => {
    if (e.target.closest('a')) return;
    const card = e.target.closest('.story-card');
    if (!card) return;
    location.hash = '#/read/' + card.dataset.goto;
  });
}
