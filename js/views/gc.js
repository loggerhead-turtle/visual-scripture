// General Conference: every talk since 1942 that cites scripture, browsable by
// date or by speaker, each with the same kind of cross-referencing the
// chapters get — the passages it cites (linked into the reader), the themes,
// people and places of those passages, its "scripture fingerprint" across the
// five volumes, and the talks that cite the most similar scripture.
//
//   #/conference                      browse (?by=date|speaker|insights, ?d=1990)
//   #/conference/talk/<id>            one talk
//   #/conference/speaker/<slug>       one speaker's scripture profile
//
// Built by scripts/build-gc.mjs from the BYU Scripture Citation Index data the
// reader already uses. Talk text is never stored; titles, speakers and URLs
// were scraped, so they are escaped and links pass through safeExternalUrl.
import {
  VOLUMES, bookBySlug, esc, isSlugLike, safeExternalUrl, themeName,
  loadGcIndex, loadGcYear, loadGcSpeaker, loadText, loadMeta, entities, loadTopics,
  loadPlaces, loadPlacesHolyLand, loadPlacesUSA,
} from '../data.js';
import { avatar } from '../portraits.js';

const SEASON = { A: 'April', O: 'October' };
// The site's own volume colours put OT, NT and the Book of Mormon in three
// near-identical golds; a fingerprint has to tell them apart at a glance.
const VOL_COLOR = { ot: '#b5603c', nt: '#e6d6a8', bom: '#e8a72c', dc: '#3fa7a0', pgp: '#8e6bb8' };
const vc = v => VOL_COLOR[v.id] || v.color;
const CREDIT = `<p class="gc-credit">Citation data: <a href="https://scriptures.byu.edu/" target="_blank" rel="noopener noreferrer">BYU Scripture Citation Index</a>.
  Talk text belongs to The Church of Jesus Christ of Latter-day Saints and is not reproduced here — every talk links to its official page.
  Themes, people and places are drawn from this site's own notes on the chapters each talk cites.</p>`;

// ---------- the index, decoded once ----------
let IDX = null;
async function gcIndex() {
  if (IDX) return IDX;
  const raw = await loadGcIndex();
  const speakers = raw.speakers.map(([name, slug, n, first, last]) => ({ name, slug, n, first, last }));
  const talks = raw.talks.map(([id, y, s, sp, ti, u, vol], i) => ({
    id, y, s, ti, vol, i,
    sp: speakers[sp] || { name: 'Unknown', slug: '' },
    u: typeof u === 'string' && u[0] === '~' ? `https://www.churchofjesuschrist.org/study/general-conference/${u.slice(1)}?lang=eng` : u,
  }));
  const byId = Object.create(null);
  for (const t of talks) byId[t.id] = t;
  const bySpeaker = Object.create(null);
  for (const s of speakers) bySpeaker[s.slug] = s;
  IDX = { ...raw, speakers, talks, byId, bySpeaker };
  return IDX;
}

// ---------- small shared pieces ----------
const sessionLabel = t => `${SEASON[t.s] || ''} ${t.y}`;
const bookName = slug => (bookBySlug[slug] ? bookBySlug[slug].name : slug);
const refName = (slug, c) => slug === 'dc' ? `D&C ${c}` : (bookBySlug[slug] && bookBySlug[slug].chapters === 1 ? bookName(slug) : `${bookName(slug)} ${c}`);

// [4,5,6,9] -> "4–6, 9"
function verseRange(vs) {
  const s = vs.filter(Number.isInteger).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    out.push(j > i ? `${s[i]}–${s[j]}` : `${s[i]}`);
    i = j;
  }
  return out.join(', ');
}
const refLabel = (slug, c, vs) => {
  const one = bookBySlug[slug] && bookBySlug[slug].chapters === 1;
  const head = slug === 'dc' ? `D&C ${c}` : one ? bookName(slug) : `${bookName(slug)} ${c}`;
  return vs && vs.length ? `${head}${one ? ' ' : ':'}${verseRange(vs)}` : head;
};
const readHref = (slug, c, v) => isSlugLike(slug) && bookBySlug[slug] ? `#/read/${slug}/${+c}${Number.isInteger(v) ? `?v=${v}` : ''}` : '#/read';
const talkHref = t => `#/conference/talk/${t.id}`;
const speakerHref = s => `#/conference/speaker/${s.slug}`;

// a horizontal bar split by volume (the "scripture fingerprint")
function volBar(vol, { legend = false, tall = false } = {}) {
  const total = vol.reduce((a, b) => a + b, 0);
  if (!total) return '';
  const segs = VOLUMES.map((v, i) => vol[i] ? `<span style="flex:${vol[i]};background:${vc(v)}" title="${esc(v.name)}: ${Math.round(100 * vol[i] / total)}%"></span>` : '').join('');
  const leg = legend ? `<div class="gc-legend">${VOLUMES.map((v, i) => vol[i] ? `<span><i style="background:${vc(v)}"></i>${esc(v.short)} ${Math.round(100 * vol[i] / total)}%</span>` : '').join('')}</div>` : '';
  return `<div class="gc-volbar${tall ? ' tall' : ''}" role="img" aria-label="${esc(VOLUMES.map((v, i) => vol[i] ? `${v.name} ${Math.round(100 * vol[i] / total)}%` : '').filter(Boolean).join(', '))}">${segs}</div>${leg}`;
}

function talkRow(t, { showSpeaker = true, showDate = false } = {}) {
  const n = t.vol.reduce((a, b) => a + b, 0);
  return `<div class="gc-talk" data-hay="${esc((t.ti + ' ' + t.sp.name).toLowerCase())}">
    <a class="gc-talk-title" href="${talkHref(t)}">${esc(t.ti)}</a>
    <div class="gc-talk-sub">
      ${showDate ? `<span>${esc(sessionLabel(t))}</span>` : ''}
      ${showSpeaker ? `<a href="${speakerHref(t.sp)}">${esc(t.sp.name)}</a>` : ''}
      <span class="gc-n">${n} verse ref${n === 1 ? '' : 's'}</span>
    </div>
    ${volBar(t.vol)}
  </div>`;
}

const tabsHtml = by => `<div class="idx-tabs gc-tabs">
    <a class="idx-tab${by === 'date' ? ' on' : ''}" href="#/conference?by=date">By date</a>
    <a class="idx-tab${by === 'speaker' ? ' on' : ''}" href="#/conference?by=speaker">By speaker</a>
    <a class="idx-tab${by === 'insights' ? ' on' : ''}" href="#/conference?by=insights">Insights</a>
  </div>`;

// ---------- browse ----------
export async function renderConference(el, params, parts) {
  if (parts[1] === 'talk' && isSlugLike(parts[2])) return renderTalk(el, parts[2]);
  if (parts[1] === 'speaker' && isSlugLike(parts[2])) return renderSpeaker(el, parts[2]);

  const ix = await gcIndex();
  const by = ['date', 'speaker', 'insights'].includes(params.get('by')) ? params.get('by') : 'date';
  const totalRefs = ix.talks.reduce((a, t) => a + t.vol.reduce((x, y) => x + y, 0), 0);
  const first = ix.talks[0].y, last = ix.talks[ix.talks.length - 1].y;

  el.innerHTML = `<div class="wrap gc">
    <div class="eyebrow">Prophets and apostles on the standard works</div>
    <h1 class="page-title">General Conference</h1>
    <p class="section-intro">${ix.talks.length.toLocaleString()} conference talks from ${first} to ${last}, by ${ix.speakers.length} speakers,
      citing scripture ${totalRefs.toLocaleString()} times. Open any talk to see every passage it draws on — linked straight into the
      reader — with the themes, people and places of those passages and the talks that lean on the same verses.</p>
    ${tabsHtml(by)}
    <div id="gc-body"></div>
    ${CREDIT}
  </div>`;
  const body = el.querySelector('#gc-body');
  if (by === 'speaker') browseSpeakers(body, ix, params);
  else if (by === 'insights') insights(body, ix);
  else browseDates(body, ix, params);
}

function browseDates(body, ix, params) {
  const decades = [...new Set(ix.talks.map(t => Math.floor(t.y / 10) * 10))].sort((a, b) => b - a);
  const want = parseInt(params.get('d') || '', 10);
  const yParam = parseInt(params.get('y') || '', 10);
  let dec = decades.includes(want) ? want : decades.includes(Math.floor(yParam / 10) * 10) ? Math.floor(yParam / 10) * 10 : decades[0];

  body.innerHTML = `
    <div class="stories-controls"><input type="search" id="gc-q" placeholder="Search every talk by title or speaker…" autocomplete="off"></div>
    <div class="gc-decades">${decades.map(d => `<button type="button" class="pill link${d === dec ? ' on' : ''}" data-d="${d}">${d}s</button>`).join('')}</div>
    <div id="gc-list"></div>`;
  const list = body.querySelector('#gc-list');

  const drawDecade = d => {
    dec = d;
    body.querySelectorAll('.gc-decades .pill').forEach(b => b.classList.toggle('on', +b.dataset.d === d));
    const years = new Map();
    for (const t of ix.talks) {
      if (Math.floor(t.y / 10) * 10 !== d) continue;
      const k = `${t.y}${t.s}`;
      (years.get(k) || years.set(k, []).get(k)).push(t);
    }
    const keys = [...years.keys()].sort((a, b) => b.slice(0, 4) - a.slice(0, 4) || (b[4] === 'O') - (a[4] === 'O'));
    list.innerHTML = `<div class="gc-yearjump">${[...new Set(keys.map(k => k.slice(0, 4)))].map(y => `<a href="#gc-y${y}" data-jump="${y}">${y}</a>`).join('')}</div>` +
      keys.map((k, i) => {
        const ts = years.get(k);
        const y = k.slice(0, 4), s = k[4];
        const firstOfYear = i === 0 || keys[i - 1].slice(0, 4) !== y;
        return `<section class="gc-session"${firstOfYear ? ` id="gc-y${y}"` : ''}>
          <h2><span>${SEASON[s]} ${y}</span><small>${ts.length} talk${ts.length === 1 ? '' : 's'} citing scripture</small></h2>
          <div class="gc-talks">${ts.map(t => talkRow(t)).join('')}</div>
        </section>`;
      }).join('');
    list.querySelectorAll('[data-jump]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault(); // keep the hash route intact
      const target = list.querySelector('#gc-y' + a.dataset.jump);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  };
  body.querySelectorAll('.gc-decades .pill').forEach(b => b.addEventListener('click', () => {
    q.value = '';
    drawDecade(+b.dataset.d);
  }));

  const q = body.querySelector('#gc-q');
  let timer = 0;
  q.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const s = q.value.trim().toLowerCase();
      if (!s) return drawDecade(dec);
      const hits = ix.talks.filter(t => t.ti.toLowerCase().includes(s) || t.sp.name.toLowerCase().includes(s)).reverse();
      body.querySelectorAll('.gc-decades .pill').forEach(b => b.classList.remove('on'));
      list.innerHTML = `<p class="gc-hits">${hits.length.toLocaleString()} talk${hits.length === 1 ? '' : 's'} match “${esc(q.value.trim())}”${hits.length > 300 ? ' — showing the newest 300' : ''}.</p>
        <div class="gc-talks">${hits.slice(0, 300).map(t => talkRow(t, { showDate: true })).join('')}</div>`;
    }, 120);
  });

  drawDecade(dec);
  if (Number.isInteger(yParam)) setTimeout(() => { const t = list.querySelector('#gc-y' + yParam); if (t) t.scrollIntoView({ block: 'start' }); }, 0);
}

function browseSpeakers(body, ix, params) {
  const sort = ['name', 'talks', 'recent'].includes(params.get('sort')) ? params.get('sort') : 'name';
  const lastOf = n => n.replace(/,?\s+(Jr\.?|Sr\.?|II|III)$/i, '').split(' ').pop();
  const letterOf = s => lastOf(s.name).normalize('NFD')[0].toUpperCase();
  body.innerHTML = `
    <div class="stories-controls gc-sp-controls">
      <input type="search" id="gc-q" placeholder="Find a speaker…" autocomplete="off">
      <div class="gc-sort">Sort:
        <a class="pill link${sort === 'name' ? ' on' : ''}" href="#/conference?by=speaker&sort=name">A–Z</a>
        <a class="pill link${sort === 'talks' ? ' on' : ''}" href="#/conference?by=speaker&sort=talks">Most talks</a>
        <a class="pill link${sort === 'recent' ? ' on' : ''}" href="#/conference?by=speaker&sort=recent">Most recent</a>
      </div>
    </div>
    <div id="gc-splist"></div>`;
  const sorted = ix.speakers.slice();
  if (sort === 'talks') sorted.sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  else if (sort === 'recent') sorted.sort((a, b) => b.last - a.last || b.n - a.n);
  const maxN = Math.max(...ix.speakers.map(s => s.n));
  const card = s => `<a class="gc-sp" href="${speakerHref(s)}" data-hay="${esc(s.name.toLowerCase())}">
      <span class="gc-sp-name">${esc(s.name)}</span>
      <span class="gc-sp-meta">${s.n} talk${s.n === 1 ? '' : 's'} · ${s.first === s.last ? s.first : `${s.first}–${s.last}`}</span>
      <span class="gc-sp-bar"><i style="width:${Math.max(3, Math.round(100 * s.n / maxN))}%"></i></span>
    </a>`;
  const wrap = body.querySelector('#gc-splist');
  if (sort === 'name') {
    const groups = new Map();
    for (const s of sorted) { const L = letterOf(s); (groups.get(L) || groups.set(L, []).get(L)).push(s); }
    wrap.innerHTML = `<div class="gc-yearjump">${[...groups.keys()].map(L => `<a href="#gc-L${L}" data-jump="${L}">${L}</a>`).join('')}</div>` +
      [...groups].map(([L, ss]) => `<section class="gc-letter" id="gc-L${L}"><h2>${L}</h2><div class="gc-spgrid">${ss.map(card).join('')}</div></section>`).join('');
    wrap.querySelectorAll('[data-jump]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      const t = wrap.querySelector('#gc-L' + a.dataset.jump);
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  } else {
    wrap.innerHTML = `<div class="gc-spgrid">${sorted.map(card).join('')}</div>`;
  }
  const q = body.querySelector('#gc-q');
  q.addEventListener('input', () => {
    const s = q.value.trim().toLowerCase();
    wrap.querySelectorAll('.gc-sp').forEach(c => { c.style.display = !s || c.dataset.hay.includes(s) ? '' : 'none'; });
    wrap.querySelectorAll('.gc-letter').forEach(sec => { sec.style.display = [...sec.querySelectorAll('.gc-sp')].some(c => c.style.display !== 'none') ? '' : 'none'; });
  });
}

function insights(body, ix) {
  const decs = Object.keys(ix.decades).map(Number).sort((a, b) => a - b);
  const rows = decs.map(d => {
    const r = ix.decades[d];
    const vol = r.slice(0, 5), tot = vol.reduce((a, b) => a + b, 0);
    return `<div class="gc-dec-row">
      <span class="gc-dec-label">${d}s</span>
      <div class="gc-dec-bar">${VOLUMES.map((v, i) => `<span style="flex:${vol[i]};background:${vc(v)}" title="${esc(v.name)}: ${Math.round(100 * vol[i] / tot)}%">${vol[i] / tot >= 0.09 ? Math.round(100 * vol[i] / tot) + '%' : ''}</span>`).join('')}</div>
      <span class="gc-dec-n">${r[5]} talks</span>
    </div>`;
  }).join('');
  const maxV = ix.topVerses[0] ? ix.topVerses[0][3] : 1;
  const maxC = ix.topChapters[0] ? ix.topChapters[0][2] : 1;
  const topSp = ix.speakers.slice().sort((a, b) => b.n - a.n).slice(0, 15);

  body.innerHTML = `
    <section class="gc-panel">
      <h2>Which volume do conference talks quote?</h2>
      <p class="gc-note">Share of all verse citations in each decade. The Book of Mormon roughly doubles its share after President Ezra Taft Benson’s
        1986 call to “flood the earth” with it, and now trades the lead with the New Testament, while the Old Testament’s share has halved.</p>
      <div class="gc-legend">${VOLUMES.map(v => `<span><i style="background:${vc(v)}"></i>${esc(v.name)}</span>`).join('')}</div>
      <div class="gc-dec">${rows}</div>
    </section>
    <div class="gc-two">
      <section class="gc-panel">
        <h2>The most-quoted verses</h2>
        <ol class="gc-toplist">${ix.topVerses.map(([slug, c, v, n, text]) => `<li>
          <a href="${readHref(slug, c, v)}"><strong>${esc(refLabel(slug, c, [v]))}</strong></a>
          <span class="gc-count">${n} talks</span>
          <span class="gc-meter"><i style="width:${Math.round(100 * n / maxV)}%"></i></span>
          ${text ? `<span class="gc-snip">“${esc(text)}”</span>` : ''}
        </li>`).join('')}</ol>
      </section>
      <div>
        <section class="gc-panel">
          <h2>The most-cited chapters</h2>
          <ol class="gc-toplist compact">${ix.topChapters.map(([slug, c, n]) => `<li>
            <a href="${readHref(slug, c)}"><strong>${esc(refName(slug, c))}</strong></a>
            <span class="gc-count">${n} talks</span>
            <span class="gc-meter"><i style="width:${Math.round(100 * n / maxC)}%"></i></span>
          </li>`).join('')}</ol>
        </section>
        <section class="gc-panel">
          <h2>Most frequent speakers</h2>
          <ol class="gc-toplist compact">${topSp.map(s => `<li>
            <a href="${speakerHref(s)}"><strong>${esc(s.name)}</strong></a>
            <span class="gc-count">${s.n} talks · ${s.first}–${s.last}</span>
            <span class="gc-meter"><i style="width:${Math.round(100 * s.n / topSp[0].n)}%"></i></span>
          </li>`).join('')}</ol>
        </section>
      </div>
    </div>`;
}

// ---------- verse text, loaded lazily per book ----------
async function fillSnippets(root) {
  const nodes = [...root.querySelectorAll('[data-snip]')];
  const books = [...new Set(nodes.map(n => n.dataset.snip.split(':')[0]))].filter(s => bookBySlug[s]);
  await Promise.all(books.map(async slug => {
    const text = await loadText(slug).catch(() => null);
    if (!text) return;
    for (const n of nodes) {
      const [s, c, v] = n.dataset.snip.split(':');
      if (s !== slug) continue;
      const t = ((text.chapters || [])[+c - 1] || [])[+v - 1];
      if (!t || !n.isConnected) continue;
      n.textContent = `“${t.length > 220 ? t.slice(0, 220).replace(/\s+\S*$/, '') + '…' : t}”`;
    }
  }));
}
async function fillChapterTitles(root) {
  const nodes = [...root.querySelectorAll('[data-chtitle]')];
  const books = [...new Set(nodes.map(n => n.dataset.chtitle.split(':')[0]))].filter(s => bookBySlug[s]);
  await Promise.all(books.map(async slug => {
    const meta = await loadMeta(slug).catch(() => null);
    if (!meta || meta.stub) return;
    for (const n of nodes) {
      const [s, c] = n.dataset.chtitle.split(':');
      if (s !== slug) continue;
      const ch = meta.chapters.find(x => x.c === +c);
      if (ch && ch.title && n.isConnected) n.textContent = ch.title;
    }
  }));
}

// people / themes / places chips shared by talk and speaker pages
async function contextChips(themes, people, places) {
  const [ents, topics, pB, pH, pU] = await Promise.all([entities(), loadTopics(), loadPlaces().catch(() => null), loadPlacesHolyLand(), loadPlacesUSA()]);
  const tName = Object.create(null);
  for (const t of (topics && topics.topics) || []) tName[t.id] = t.name;
  const maxT = themes.length ? themes[0][1] : 1;
  const themeHtml = themes.filter(([id]) => isSlugLike(id)).map(([id, w]) =>
    `<a class="pill link gc-theme" style="--w:${(0.55 + 0.45 * w / maxT).toFixed(2)}" href="#/index?topic=${id}">${esc(tName[id] || themeName(id))}</a>`).join('');
  const peopleHtml = people.map(([id]) => ents.byId[id]).filter(Boolean).map(c =>
    `<a class="gc-person" href="#/character/${esc(c.id)}">${avatar(c)}<span>${esc(c.name)}</span></a>`).join('');
  const placeMap = Object.create(null);
  for (const p of ((pB && pB.places) || [])) placeMap[p.id] = { ...p, m: 'internal' };
  for (const p of ((pH && pH.places) || [])) placeMap[p.id] = placeMap[p.id] || { ...p, m: 'holy-land' };
  for (const p of ((pU && pU.places) || [])) placeMap[p.id] = placeMap[p.id] || { ...p, m: 'usa' };
  const placeHtml = (places || []).map(([id]) => placeMap[id]).filter(Boolean).map(p =>
    `<a class="pill link" href="#/map?place=${esc(p.id)}&m=${p.m}">📍 ${esc(p.name)}</a>`).join('');
  return { themeHtml, peopleHtml, placeHtml };
}

// ---------- one talk ----------
async function renderTalk(el, id) {
  const ix = await gcIndex();
  const t = ix.byId[id];
  if (!t) {
    el.innerHTML = `<div class="wrap"><h1 class="page-title">Talk not found</h1><p class="section-intro">No conference talk has that id. <a href="#/conference">Browse all talks →</a></p></div>`;
    return;
  }
  const year = await loadGcYear(t.y);
  const d = (year && year[t.id]) || { r: [], th: [], pe: [], pl: [], rel: [] };
  const href = safeExternalUrl(t.u);
  const total = t.vol.reduce((a, b) => a + b, 0);

  // neighbours in the same session (by position)
  const session = ix.talks.filter(x => x.y === t.y && x.s === t.s);
  const pos = session.indexOf(t);
  const prev = session[pos - 1], next = session[pos + 1];
  const bySame = ix.talks.filter(x => x.sp === t.sp);
  const spPos = bySame.indexOf(t);

  // references grouped by volume, then book
  const groups = VOLUMES.map(v => ({ v, refs: d.r.filter(([slug]) => v.books.some(b => b.slug === slug)) })).filter(g => g.refs.length);
  const refsHtml = groups.map(({ v, refs }) => `
    <div class="gc-vol" style="--vc:${vc(v)}">
      <h3><i style="background:${vc(v)}"></i>${esc(v.name)} <small>${refs.length} passage${refs.length === 1 ? '' : 's'}</small></h3>
      ${refs.map(([slug, c, vs]) => `<a class="gc-ref" href="${readHref(slug, c, vs[0])}">
          <span class="gc-ref-head"><strong>${esc(refLabel(slug, c, vs))}</strong><span class="gc-ref-ch" data-chtitle="${esc(slug)}:${+c}"></span></span>
          ${vs.length ? `<span class="gc-snip" data-snip="${esc(slug)}:${+c}:${+vs[0]}"></span>` : '<span class="gc-snip muted">The whole chapter is cited.</span>'}
        </a>`).join('')}
    </div>`).join('');

  const related = (d.rel || []).map(([rid, score]) => [ix.byId[rid], score]).filter(([x]) => x);

  el.innerHTML = `<div class="wrap gc gc-detail">
    <nav class="gc-crumbs"><a href="#/conference">General Conference</a> › <a href="#/conference?by=date&y=${t.y}">${esc(sessionLabel(t))}</a></nav>
    <div class="eyebrow">${esc(sessionLabel(t))} General Conference</div>
    <h1 class="page-title">${esc(t.ti)}</h1>
    <p class="gc-byline"><a href="${speakerHref(t.sp)}">${esc(t.sp.name)}</a>
      <span class="muted">· talk ${spPos + 1} of ${bySame.length} by this speaker</span></p>
    <p>${href ? `<a class="btn primary" href="${esc(href)}" target="_blank" rel="noopener noreferrer">Read or watch the talk ↗</a>` : '<span class="pill">Printed in the Conference Report</span>'}
      <a class="btn" href="${speakerHref(t.sp)}">More from ${esc(t.sp.name)}</a></p>

    <div class="gc-layout">
      <div class="gc-main">
        <section class="gc-panel">
          <h2>Scripture fingerprint</h2>
          <p class="gc-note">${total} verse reference${total === 1 ? '' : 's'} across ${d.r.length} chapter${d.r.length === 1 ? '' : 's'}.</p>
          ${volBar(t.vol, { legend: true, tall: true })}
        </section>
        <section class="gc-panel">
          <h2>Scriptures cited</h2>
          <p class="gc-note">Each passage opens in the reader at the verse, with its speaker card, commentary and the other talks that cite it.</p>
          ${refsHtml || '<p class="muted">No citations recorded.</p>'}
        </section>
      </div>
      <aside class="gc-side">
        <section class="gc-panel" id="gc-ctx"><h2>Themes of the passages</h2><div class="muted">Loading…</div></section>
        ${related.length ? `<section class="gc-panel">
          <h2>Talks citing similar scripture</h2>
          <div class="gc-talks compact">${related.map(([x, sc]) => `<div class="gc-talk">
            <a class="gc-talk-title" href="${talkHref(x)}">${esc(x.ti)}</a>
            <div class="gc-talk-sub"><span>${esc(sessionLabel(x))}</span><a href="${speakerHref(x.sp)}">${esc(x.sp.name)}</a>
              <span class="gc-n" title="Similarity of the scriptures cited">${Math.round(sc * 100)}% overlap</span></div>
          </div>`).join('')}</div>
        </section>` : ''}
        <section class="gc-panel">
          <h2>In the same conference</h2>
          <div class="gc-pn">
            ${prev ? `<a href="${talkHref(prev)}">‹ ${esc(prev.ti)}<small>${esc(prev.sp.name)}</small></a>` : '<span></span>'}
            ${next ? `<a class="next" href="${talkHref(next)}">${esc(next.ti)} ›<small>${esc(next.sp.name)}</small></a>` : '<span></span>'}
          </div>
          <a class="gc-all" href="#/conference?by=date&y=${t.y}">All ${session.length} talks from ${esc(sessionLabel(t))} →</a>
        </section>
      </aside>
    </div>
    ${CREDIT}
  </div>`;

  fillChapterTitles(el);
  fillSnippets(el);
  const { themeHtml, peopleHtml, placeHtml } = await contextChips(d.th || [], d.pe || [], d.pl || []);
  const ctx = el.querySelector('#gc-ctx');
  if (ctx) ctx.innerHTML = `<h2>Themes of the passages</h2>
    <div class="gc-chips">${themeHtml || '<span class="muted">—</span>'}</div>
    ${peopleHtml ? `<h2>Voices in the passages</h2><div class="gc-people">${peopleHtml}</div>` : ''}
    ${placeHtml ? `<h2>Places</h2><div class="gc-chips">${placeHtml}</div>` : ''}`;
}

// ---------- one speaker ----------
async function renderSpeaker(el, slug) {
  const [ix, sp] = await Promise.all([gcIndex(), loadGcSpeaker(slug)]);
  const s = ix.bySpeaker[slug];
  if (!s || !sp) {
    el.innerHTML = `<div class="wrap"><h1 class="page-title">Speaker not found</h1><p class="section-intro"><a href="#/conference?by=speaker">Browse all speakers →</a></p></div>`;
    return;
  }
  const talks = (sp.talks || []).map(id => ix.byId[id]).filter(Boolean);
  const years = Object.entries(sp.years || {}).map(([y, n]) => [+y, n]);
  const y0 = Math.min(...years.map(x => x[0])), y1 = Math.max(...years.map(x => x[0]));
  const maxY = Math.max(...years.map(x => x[1]));
  const span = [];
  for (let y = y0; y <= y1; y++) span.push([y, sp.years[y] || 0]);
  const spark = span.length > 1 ? `<div class="gc-spark" role="img" aria-label="Talks per year, ${y0} to ${y1}">${span.map(([y, n]) =>
    `<a href="#/conference?by=date&y=${y}" title="${y}: ${n} talk${n === 1 ? '' : 's'}" style="height:${n ? Math.max(14, Math.round(100 * n / maxY)) : 3}%" class="${n ? '' : 'zero'}"></a>`).join('')}</div>
    <div class="gc-spark-axis"><span>${y0}</span><span>${y1}</span></div>` : '';

  const maxB = sp.books.length ? sp.books[0][1] : 1;
  const booksHtml = sp.books.map(([b, n]) => {
    const vol = VOLUMES.find(v => v.books.some(x => x.slug === b));
    return `<li><a href="${readHref(b, 1)}"><strong>${esc(b === 'dc' ? 'Doctrine & Covenants' : bookName(b))}</strong></a>
      <span class="gc-count">${n} citation${n === 1 ? '' : 's'}</span>
      <span class="gc-meter"><i style="width:${Math.round(100 * n / maxB)}%;background:${vol ? vc(vol) : 'var(--gold)'}"></i></span></li>`;
  }).join('');
  const versesHtml = sp.verses.map(([b, c, v, n]) => `<a class="gc-ref" href="${readHref(b, c, v)}">
      <span class="gc-ref-head"><strong>${esc(refLabel(b, c, [v]))}</strong><span class="gc-count">in ${n} talks</span></span>
      <span class="gc-snip" data-snip="${esc(b)}:${+c}:${+v}"></span></a>`).join('');
  const chaptersHtml = sp.chapters.map(([b, c, n]) => `<a class="pill link" href="${readHref(b, c)}">${esc(refName(b, c))} <small>×${n}</small></a>`).join('');
  const similar = (sp.similar || []).map(([sl, sc]) => [ix.bySpeaker[sl], sc]).filter(([x]) => x);

  // talks grouped by year, newest first
  const byYear = new Map();
  for (const t of talks.slice().reverse()) (byYear.get(t.y) || byYear.set(t.y, []).get(t.y)).push(t);

  el.innerHTML = `<div class="wrap gc gc-detail">
    <nav class="gc-crumbs"><a href="#/conference">General Conference</a> › <a href="#/conference?by=speaker">Speakers</a></nav>
    <div class="eyebrow">Conference speaker</div>
    <h1 class="page-title">${esc(sp.name)}</h1>
    <p class="gc-byline">${talks.length} talk${talks.length === 1 ? '' : 's'} citing scripture · ${y0 === y1 ? y0 : `${y0}–${y1}`}</p>
    ${spark}
    <div class="gc-layout">
      <div class="gc-main">
        <section class="gc-panel">
          <h2>Scripture fingerprint</h2>
          <p class="gc-note">Where ${esc(sp.name)}’s citations come from, across every talk.</p>
          ${volBar(sp.vol, { legend: true, tall: true })}
        </section>
        ${sp.verses.length ? `<section class="gc-panel"><h2>Favourite verses</h2>
          <p class="gc-note">Verses this speaker returned to in more than one talk.</p>${versesHtml}</section>` : ''}
        <section class="gc-panel">
          <h2>Talks</h2>
          ${[...byYear].map(([y, ts]) => `<div class="gc-yr"><h3>${y}</h3><div class="gc-talks">${ts.map(t => talkRow(t, { showSpeaker: false, showDate: true })).join('')}</div></div>`).join('')}
        </section>
      </div>
      <aside class="gc-side">
        <section class="gc-panel"><h2>Most-cited books</h2><ol class="gc-toplist compact">${booksHtml}</ol></section>
        ${chaptersHtml ? `<section class="gc-panel"><h2>Most-cited chapters</h2><div class="gc-chips">${chaptersHtml}</div></section>` : ''}
        <section class="gc-panel" id="gc-ctx"><h2>Recurring themes</h2><div class="muted">Loading…</div></section>
        ${similar.length ? `<section class="gc-panel"><h2>Speakers who cite similar scripture</h2>
          <div class="gc-chips">${similar.map(([x, sc]) => `<a class="pill link" href="${speakerHref(x)}">${esc(x.name)} <small>${Math.round(sc * 100)}%</small></a>`).join('')}</div></section>` : ''}
      </aside>
    </div>
    ${CREDIT}
  </div>`;

  fillSnippets(el);
  const { themeHtml, peopleHtml } = await contextChips(sp.themes || [], sp.people || [], []);
  const ctx = el.querySelector('#gc-ctx');
  if (ctx) ctx.innerHTML = `<h2>Recurring themes</h2><div class="gc-chips">${themeHtml || '<span class="muted">—</span>'}</div>
    ${peopleHtml ? `<h2>Scripture voices most quoted</h2><div class="gc-people">${peopleHtml}</div>` : ''}`;
}
