// Data loading + indexes. All content is static JSON fetched on demand.

const cache = new Map();
async function fetchJSON(url) {
  if (cache.has(url)) return cache.get(url);
  const p = fetch(url).then(r => {
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    return r.json();
  });
  cache.set(url, p);
  return p;
}

export const BOOKS = [
  { slug: '1-nephi', name: '1 Nephi', chapters: 22 },
  { slug: '2-nephi', name: '2 Nephi', chapters: 33 },
  { slug: 'jacob', name: 'Jacob', chapters: 7 },
  { slug: 'enos', name: 'Enos', chapters: 1 },
  { slug: 'jarom', name: 'Jarom', chapters: 1 },
  { slug: 'omni', name: 'Omni', chapters: 1 },
  { slug: 'words-of-mormon', name: 'Words of Mormon', chapters: 1 },
  { slug: 'mosiah', name: 'Mosiah', chapters: 29 },
  { slug: 'alma', name: 'Alma', chapters: 63 },
  { slug: 'helaman', name: 'Helaman', chapters: 16 },
  { slug: '3-nephi', name: '3 Nephi', chapters: 30 },
  { slug: '4-nephi', name: '4 Nephi', chapters: 1 },
  { slug: 'mormon', name: 'Mormon', chapters: 9 },
  { slug: 'ether', name: 'Ether', chapters: 15 },
  { slug: 'moroni', name: 'Moroni', chapters: 10 },
];
export const bookBySlug = BOOKS.reduce((m, b) => { m[b.slug] = b; return m; }, {});

export const loadText = slug => fetchJSON(`data/text/${slug}.json`);
export const loadMeta = slug => fetchJSON(`data/meta/${slug}.json`);
export const loadCharacters = () => fetchJSON('data/characters.json');
export const loadPlaces = () => fetchJSON('data/places.json');
export const loadTimeline = () => fetchJSON('data/timeline.json');
export const loadStories = () => fetchJSON('data/stories.json');
export const loadAllegories = () => fetchJSON('data/allegories.json');
export const loadPlates = () => fetchJSON('data/plates.json');
export const loadArtManifest = () => fetchJSON('data/art-manifest.json').catch(() => ({}));

let entityIndex = null;
export async function entities() {
  if (entityIndex) return entityIndex;
  const d = await loadCharacters();
  const byId = {};
  for (const c of d.characters) byId[c.id] = { ...c, isGroup: false };
  for (const g of d.groups) byId[g.id] = { title: 'Group', era: '', ...g, isGroup: true };
  entityIndex = { byId, characters: d.characters, groups: d.groups };
  return entityIndex;
}

export const allMeta = () => Promise.all(BOOKS.map(b => loadMeta(b.slug)));

// character id -> [{slug, bookName, chapter}]
let appearanceIndex = null;
export async function appearances() {
  if (appearanceIndex) return appearanceIndex;
  const metas = await allMeta();
  const idx = {};
  for (const m of metas) {
    for (const ch of m.chapters) {
      const ids = new Set([...(ch.characters || [])]);
      for (const s of ch.segments || []) { ids.add(s.speaker); }
      for (const id of ids) {
        (idx[id] = idx[id] || []).push({ slug: m.slug, book: m.book, c: ch.c });
      }
    }
  }
  appearanceIndex = idx;
  return idx;
}

export function segmentFor(chapterMeta, verse) {
  if (!chapterMeta || !chapterMeta.segments) return null;
  return chapterMeta.segments.find(s => verse >= s.s && verse <= s.e) || null;
}

export function prevNextChapter(slug, c) {
  const i = BOOKS.findIndex(b => b.slug === slug);
  const b = BOOKS[i];
  let prev = null, next = null;
  if (c > 1) prev = { slug, c: c - 1 };
  else if (i > 0) prev = { slug: BOOKS[i - 1].slug, c: BOOKS[i - 1].chapters };
  if (c < b.chapters) next = { slug, c: c + 1 };
  else if (i < BOOKS.length - 1) next = { slug: BOOKS[i + 1].slug, c: 1 };
  return { prev, next };
}

export const fmtYear = n => n == null ? 'date unknown' : (n < 0 ? `${-n} BC` : `AD ${n}`);
export const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const themeName = id => id.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ').replace('And', '&');
