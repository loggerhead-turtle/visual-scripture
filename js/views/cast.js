import { VOLUMES, bookBySlug, volumeOf, entities, appearances, chapterWord, esc } from '../data.js';
import { avatar } from '../portraits.js';

export async function renderCast(el, params, focusId) {
  const [ents, apps] = await Promise.all([entities(), appearances()]);

  // order books globally (volume order, then book order within volume)
  const allBooks = VOLUMES.reduce((a, v) => a.concat(v.books.map(b => ({ ...b, vol: v.id }))), []);
  const order = allBooks.reduce((m, b, i) => { m[b.slug] = i; return m; }, {});

  const byBook = new Map(allBooks.map(b => [b.slug, []]));
  const nowhere = [];
  for (const ch of ents.characters) {
    const a = (apps[ch.id] || []).slice().sort((x, y) => order[x.slug] - order[y.slug] || x.c - y.c);
    if (a.length) byBook.get(a[0].slug).push({ ch, apps: a });
    else nowhere.push({ ch, apps: [] });
  }

  const card = ({ ch, apps: a }) => `
    <button class="char-card" data-id="${ch.id}" data-name="${esc(ch.name.toLowerCase())} ${esc((ch.title || '').toLowerCase())}">
      <div class="avatar">${avatar(ch)}</div>
      <div class="cc-body">
        <h3>${esc(ch.name)}</h3>
        <div class="cc-title">${esc(ch.title || '')}</div>
        <div class="cc-era">${esc(ch.era || '')}${a.length ? ` · ${a.length} chapter${a.length > 1 ? 's' : ''}` : ''}</div>
      </div>
    </button>`;

  const sections = allBooks.map(b => {
    const list = byBook.get(b.slug);
    if (!list || !list.length) return '';
    return `<section class="cast-book-section" data-vol="${b.vol}">
      <h2>${b.name}<span class="n">${list.length} character${list.length > 1 ? 's' : ''} enter here</span></h2>
      <div class="cast-grid">${list.map(card).join('')}</div>
    </section>`;
  }).join('') + (nowhere.length ? `<section class="cast-book-section" data-vol="all"><h2>Quoted &amp; Heavenly Voices</h2><div class="cast-grid">${nowhere.map(card).join('')}</div></section>` : '');

  const groupsHtml = `<section class="cast-book-section" data-vol="all"><h2>Peoples &amp; Groups</h2>
    <div class="cast-grid">${ents.groups.map(g => card({ ch: g, apps: apps[g.id] || [] })).join('')}</div></section>`;

  el.innerHTML = `
  <div class="wrap">
    <div class="eyebrow">The cast</div>
    <h1 class="page-title">Characters of the Scriptures</h1>
    <p class="section-intro">Every voice across all four volumes as a visual card, grouped under the book where they first step onto
    the stage. Click a card for their story, family ties, and every chapter where they appear.</p>
    <div class="cast-controls">
      <input type="search" id="cast-search" placeholder="Search characters… (e.g. Abinadi, Esther, Peter)">
      <button class="pill link" data-volf="all">All volumes</button>
      ${VOLUMES.map(v => `<button class="pill link" data-volf="${v.id}"><span class="dot" style="background:${v.color}"></span>${v.short}</button>`).join('')}
    </div>
    <div id="cast-list">${sections}${groupsHtml}</div>
  </div>`;

  let volFilter = 'all';
  const search = el.querySelector('#cast-search');
  const applyFilter = () => {
    const q = search.value.trim().toLowerCase();
    el.querySelectorAll('.char-card').forEach(cd => { cd.style.display = !q || cd.dataset.name.includes(q) ? '' : 'none'; });
    el.querySelectorAll('.cast-book-section').forEach(s => {
      const volOk = volFilter === 'all' || s.dataset.vol === volFilter || s.dataset.vol === 'all';
      const any = [...s.querySelectorAll('.char-card')].some(cd => cd.style.display !== 'none');
      s.style.display = volOk && any ? '' : 'none';
    });
  };
  search.addEventListener('input', applyFilter);
  el.querySelectorAll('[data-volf]').forEach(b => b.addEventListener('click', () => {
    volFilter = b.dataset.volf;
    el.querySelectorAll('[data-volf]').forEach(x => x.style.borderColor = x === b ? 'var(--gold)' : '');
    applyFilter();
  }));

  const openModal = id => {
    const e = ents.byId[id];
    if (!e) return;
    const a = (apps[id] || []);
    const rel = (e.relations || []).map(r => {
      const t = ents.byId[r.to];
      return t ? `<span class="pill link" data-open="${r.to}">${esc(r.rel)} ${esc(t.name)}</span>` : '';
    }).join('');
    const chips = a.slice(0, 40).map(x => `<a class="pill link" href="#/read/${x.slug}/${x.c}">${x.slug === 'dc' ? 'D&amp;C ' + x.c : bookBySlug[x.slug].name + ' ' + x.c}</a>`).join('');
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="char-modal" role="dialog" aria-label="${esc(e.name)}">
      <button class="close">✕ close</button>
      <div class="cm-grid">
        <div>${avatar(e)}</div>
        <div class="cm-info">
          <h2>${esc(e.name)}</h2>
          <div class="cc-title">${esc(e.title || '')}${e.era ? ` · ${esc(e.era)}` : ''}</div>
          <p>${esc(e.bio || '')}</p>
          ${rel ? `<h4>Connections</h4><div class="cm-apps">${rel}</div>` : ''}
          ${chips ? `<h4>Appears in ${a.length} chapter${a.length > 1 ? 's' : ''}</h4><div class="cm-apps">${chips}${a.length > 40 ? `<span class="pill">+${a.length - 40} more</span>` : ''}</div>` : ''}
        </div>
      </div>
    </div>`;
    document.body.appendChild(back);
    back.addEventListener('click', ev => {
      if (ev.target === back || ev.target.closest('.close')) {
        back.remove();
        if (location.hash.startsWith('#/character/')) history.replaceState(null, '', '#/cast');
      }
      const o = ev.target.closest('[data-open]');
      if (o) { back.remove(); openModal(o.dataset.open); }
      if (ev.target.closest('a')) back.remove();
    });
  };

  el.addEventListener('click', e => {
    const cd = e.target.closest('.char-card');
    if (cd) openModal(cd.dataset.id);
  });
  if (focusId) openModal(focusId);
}
