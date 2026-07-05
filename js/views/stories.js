import { loadStories, loadPlaces, entities, bookBySlug, esc } from '../data.js';
import { avatar } from '../portraits.js';

export async function renderStories(el, params) {
  const [data, ents, places] = await Promise.all([loadStories(), entities(), loadPlaces()]);

  const catPills = [{ id: 'all', name: 'All stories' }, ...data.categories].map(c =>
    `<button class="pill link" data-cat="${c.id}">${esc(c.name)}</button>`).join('');

  const cards = data.stories.map(s => {
    const refs = s.refs.map(r => `<a href="#/read/${r.slug}/${r.c}">${bookBySlug[r.slug].name} ${r.c}</a>`).join(' · ');
    const faces = (s.characters || []).slice(0, 4).map(id => {
      const e = ents.byId[id];
      return e ? `<span class="fc" title="${esc(e.name)}">${avatar(e)}</span>` : '';
    }).join('');
    const place = s.place ? places.places.find(p => p.id === s.place) : null;
    const hay = `${s.title} ${s.blurb} ${(s.characters || []).map(id => ents.byId[id]?.name || '').join(' ')}`.toLowerCase();
    return `<a class="story-card" data-cat="${s.cat}" data-hay="${esc(hay)}" href="#/read/${s.refs[0].slug}/${s.refs[0].c}">
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.blurb)}</p>
      <div class="faces">${faces}</div>
      <div class="refs">${refs}${place ? ` · 📍 ${esc(place.name)}` : ''}${s.allegory ? ` · <span style="color:var(--teal)">visual guide ↗</span>` : ''}</div>
    </a>`;
  }).join('');

  el.innerHTML = `
  <div class="wrap">
    <div class="eyebrow">Topic navigator</div>
    <h1 class="page-title">Find the Story</h1>
    <p class="section-intro">The stories everyone remembers — and where they actually live in the text. Filter by kind, search by
    name or character, and jump straight to the chapter.</p>
    <div class="stories-controls">
      <input type="search" id="story-search" placeholder="Search stories, characters… (e.g. stripling)">
      ${catPills}
    </div>
    <div class="story-grid" id="story-grid">${cards}</div>
  </div>`;

  let cat = 'all';
  const searchEl = el.querySelector('#story-search');
  const applyFilter = () => {
    const q = searchEl.value.trim().toLowerCase();
    el.querySelectorAll('.story-card').forEach(c => {
      const okCat = cat === 'all' || c.dataset.cat === cat;
      const okQ = !q || c.dataset.hay.includes(q);
      c.style.display = okCat && okQ ? '' : 'none';
    });
  };
  searchEl.addEventListener('input', applyFilter);
  el.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => {
    cat = b.dataset.cat;
    el.querySelectorAll('[data-cat]').forEach(x => x.style.borderColor = x === b ? 'var(--gold)' : '');
    applyFilter();
  }));
}
