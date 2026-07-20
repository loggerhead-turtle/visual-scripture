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
const tryJSON = url => fetchJSON(url).catch(() => null);

export const VOLUMES = [
  {
    id: 'ot', name: 'Old Testament', short: 'OT', color: '#d9a441',
    blurb: 'Creation, covenant, kings, and prophets — the story of Israel.',
    books: [
      { slug: 'genesis', name: 'Genesis', chapters: 50 },
      { slug: 'exodus', name: 'Exodus', chapters: 40 },
      { slug: 'leviticus', name: 'Leviticus', chapters: 27 },
      { slug: 'numbers', name: 'Numbers', chapters: 36 },
      { slug: 'deuteronomy', name: 'Deuteronomy', chapters: 34 },
      { slug: 'joshua', name: 'Joshua', chapters: 24 },
      { slug: 'judges', name: 'Judges', chapters: 21 },
      { slug: 'ruth', name: 'Ruth', chapters: 4 },
      { slug: '1-samuel', name: '1 Samuel', chapters: 31 },
      { slug: '2-samuel', name: '2 Samuel', chapters: 24 },
      { slug: '1-kings', name: '1 Kings', chapters: 22 },
      { slug: '2-kings', name: '2 Kings', chapters: 25 },
      { slug: '1-chronicles', name: '1 Chronicles', chapters: 29 },
      { slug: '2-chronicles', name: '2 Chronicles', chapters: 36 },
      { slug: 'ezra', name: 'Ezra', chapters: 10 },
      { slug: 'nehemiah', name: 'Nehemiah', chapters: 13 },
      { slug: 'esther', name: 'Esther', chapters: 10 },
      { slug: 'job', name: 'Job', chapters: 42 },
      { slug: 'psalms', name: 'Psalms', chapters: 150 },
      { slug: 'proverbs', name: 'Proverbs', chapters: 31 },
      { slug: 'ecclesiastes', name: 'Ecclesiastes', chapters: 12 },
      { slug: 'song-of-solomon', name: 'Song of Solomon', chapters: 8 },
      { slug: 'isaiah', name: 'Isaiah', chapters: 66 },
      { slug: 'jeremiah', name: 'Jeremiah', chapters: 52 },
      { slug: 'lamentations', name: 'Lamentations', chapters: 5 },
      { slug: 'ezekiel', name: 'Ezekiel', chapters: 48 },
      { slug: 'daniel', name: 'Daniel', chapters: 12 },
      { slug: 'hosea', name: 'Hosea', chapters: 14 },
      { slug: 'joel', name: 'Joel', chapters: 3 },
      { slug: 'amos', name: 'Amos', chapters: 9 },
      { slug: 'obadiah', name: 'Obadiah', chapters: 1 },
      { slug: 'jonah', name: 'Jonah', chapters: 4 },
      { slug: 'micah', name: 'Micah', chapters: 7 },
      { slug: 'nahum', name: 'Nahum', chapters: 3 },
      { slug: 'habakkuk', name: 'Habakkuk', chapters: 3 },
      { slug: 'zephaniah', name: 'Zephaniah', chapters: 3 },
      { slug: 'haggai', name: 'Haggai', chapters: 2 },
      { slug: 'zechariah', name: 'Zechariah', chapters: 14 },
      { slug: 'malachi', name: 'Malachi', chapters: 4 },
    ],
  },
  {
    id: 'nt', name: 'New Testament', short: 'NT', color: '#d98f3a',
    blurb: 'The life of the Savior and the church His apostles carried to the world.',
    books: [
      { slug: 'matthew', name: 'Matthew', chapters: 28 },
      { slug: 'mark', name: 'Mark', chapters: 16 },
      { slug: 'luke', name: 'Luke', chapters: 24 },
      { slug: 'john', name: 'John', chapters: 21 },
      { slug: 'acts', name: 'Acts', chapters: 28 },
      { slug: 'romans', name: 'Romans', chapters: 16 },
      { slug: '1-corinthians', name: '1 Corinthians', chapters: 16 },
      { slug: '2-corinthians', name: '2 Corinthians', chapters: 13 },
      { slug: 'galatians', name: 'Galatians', chapters: 6 },
      { slug: 'ephesians', name: 'Ephesians', chapters: 6 },
      { slug: 'philippians', name: 'Philippians', chapters: 4 },
      { slug: 'colossians', name: 'Colossians', chapters: 4 },
      { slug: '1-thessalonians', name: '1 Thessalonians', chapters: 5 },
      { slug: '2-thessalonians', name: '2 Thessalonians', chapters: 3 },
      { slug: '1-timothy', name: '1 Timothy', chapters: 6 },
      { slug: '2-timothy', name: '2 Timothy', chapters: 4 },
      { slug: 'titus', name: 'Titus', chapters: 3 },
      { slug: 'philemon', name: 'Philemon', chapters: 1 },
      { slug: 'hebrews', name: 'Hebrews', chapters: 13 },
      { slug: 'james', name: 'James', chapters: 5 },
      { slug: '1-peter', name: '1 Peter', chapters: 5 },
      { slug: '2-peter', name: '2 Peter', chapters: 3 },
      { slug: '1-john', name: '1 John', chapters: 5 },
      { slug: '2-john', name: '2 John', chapters: 1 },
      { slug: '3-john', name: '3 John', chapters: 1 },
      { slug: 'jude', name: 'Jude', chapters: 1 },
      { slug: 'revelation', name: 'Revelation', chapters: 22 },
    ],
  },
  {
    id: 'bom', name: 'Book of Mormon', short: 'BoM', color: '#e8b64c',
    blurb: 'Another testament of Jesus Christ — a thousand-year record from a new promised land.',
    books: [
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
    ],
  },
  {
    id: 'dc', name: 'Doctrine & Covenants', short: 'D&C', color: '#3fa7a0',
    blurb: 'Revelations of the restoration, 1823–1918 — the Lord speaking in modern time.',
    books: [
      { slug: 'dc', name: 'Doctrine & Covenants', chapters: 138 },
    ],
  },
];

export const BOOKS = VOLUMES.flatMap ? VOLUMES.reduce((a, v) => a.concat(v.books), []) : [];
export const bookBySlug = BOOKS.reduce((m, b) => { m[b.slug] = b; return m; }, {});
export const volumeOf = slug => VOLUMES.find(v => v.books.some(b => b.slug === slug));
export const volumeById = id => VOLUMES.find(v => v.id === id);
export const chapterWord = slug => slug === 'dc' ? 'Section' : 'Chapter';

export const loadText = slug => fetchJSON(`data/text/${slug}.json`);
export const loadPlaces = () => fetchJSON('data/places.json');
export const loadStories = () => fetchJSON('data/stories.json');
export const loadAllegories = () => fetchJSON('data/allegories.json');
export const loadPlates = () => fetchJSON('data/plates.json');
export const loadArtManifest = () => fetchJSON('data/art-manifest.json').catch(() => ({}));

// ---- meta (with graceful stub while rich data is being authored) ----
function stubMeta(slug, platesData) {
  const b = bookBySlug[slug];
  const entry = platesData && [].concat(platesData.books || [],
    (platesData.bibleBooks && platesData.bibleBooks.ot) || [],
    (platesData.bibleBooks && platesData.bibleBooks.nt) || [],
    (platesData.bibleBooks && platesData.bibleBooks.dc) || []).find(x => x.slug === slug);
  return {
    book: b.name, slug, stub: true,
    narrator: (entry && entry.writer) || 'chronicler',
    plates: (entry && entry.plates) || 'history',
    chapters: Array.from({ length: b.chapters }, (_, i) => ({ c: i + 1, themes: [], characters: [], segments: [] })),
  };
}
export async function loadMeta(slug) {
  if (slug === 'dc') {
    const key = 'meta:dc';
    if (cache.has(key)) return cache.get(key);
    const p = Promise.all([tryJSON('data/meta/dc-1.json'), tryJSON('data/meta/dc-2.json'), loadPlates()])
      .then(([a, b, plates]) => {
        if (!a && !b) return stubMeta('dc', plates);
        const base = a || b;
        return { ...base, chapters: [...(a ? a.chapters : []), ...(b ? b.chapters : [])] };
      });
    cache.set(key, p);
    return p;
  }
  const key = `meta:${slug}`;
  if (cache.has(key)) return cache.get(key);
  const p = fetchJSON(`data/meta/${slug}.json`).catch(async () => stubMeta(slug, await loadPlates()));
  cache.set(key, p);
  return p;
}
export const allMeta = () => Promise.all(BOOKS.map(b => loadMeta(b.slug)));

// ---- entities (base cast + per-volume cast files merged) ----
let entityIndex = null;
export async function entities() {
  if (entityIndex) return entityIndex;
  const [base, ot, nt, dc] = await Promise.all([
    fetchJSON('data/characters.json'), tryJSON('data/cast-ot.json'), tryJSON('data/cast-nt.json'), tryJSON('data/cast-dc.json'),
  ]);
  const characters = [...base.characters], groups = [...base.groups];
  const seen = new Set([...characters.map(c => c.id), ...groups.map(g => g.id)]);
  for (const extra of [ot, nt, dc]) {
    if (!extra) continue;
    for (const c of extra.characters || []) if (!seen.has(c.id)) { seen.add(c.id); characters.push(c); }
    for (const g of extra.groups || []) if (!seen.has(g.id)) { seen.add(g.id); groups.push(g); }
  }
  const byId = {};
  for (const c of characters) byId[c.id] = { ...c, isGroup: false };
  for (const g of groups) byId[g.id] = { title: 'Group', era: '', ...g, isGroup: true };
  entityIndex = { byId, characters, groups };
  return entityIndex;
}

// ---- timeline (base + per-volume event files merged) ----
export async function loadTimeline() {
  const [base, ot, nt, dc] = await Promise.all([
    fetchJSON('data/timeline.json'), tryJSON('data/timeline-ot.json'), tryJSON('data/timeline-nt.json'), tryJSON('data/timeline-dc.json'),
  ]);
  return {
    ...base,
    events: [
      ...((ot && ot.events) || []),
      ...base.events,
      ...((nt && nt.events) || []),
      ...((dc && dc.events) || []),
    ],
  };
}

// ---- stories (base BoM set + per-volume files merged) ----
export async function loadAllStories() {
  const [base, ot, nt, dc] = await Promise.all([
    loadStories(), tryJSON('data/stories-ot.json'), tryJSON('data/stories-nt.json'), tryJSON('data/stories-dc.json'),
  ]);
  const tag = (list, vol) => (list || []).map(s => ({ vol, ...s }));
  return {
    categories: base.categories,
    stories: [
      ...tag(ot && ot.stories, 'ot'),
      ...tag(nt && nt.stories, 'nt'),
      ...tag(base.stories, 'bom'),
      ...tag(dc && dc.stories, 'dc'),
    ],
  };
}

// ---- extra place files (holy land + USA) ----
export const loadPlacesHolyLand = () => tryJSON('data/places-holy-land.json');
export const loadPlacesUSA = () => tryJSON('data/places-usa.json');

// ---- genealogy (authored family lineages) ----
export const loadGenealogy = () => tryJSON('data/genealogy.json');

// ---- ancient currency systems ----
export const loadCurrency = () => tryJSON('data/currency.json');

// ---- every relationship edge across all cast files, for the mind map ----
// Returns [{ from, to, rel }] using only edges whose endpoints are real entities.
export async function relationEdges() {
  const e = await entities();
  const out = [];
  for (const c of e.characters) {
    for (const r of (c.relations || [])) {
      if (e.byId[r.to]) out.push({ from: c.id, to: r.to, rel: r.rel });
    }
  }
  return out;
}

// character id -> [{slug, book, c}]
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

// theme id -> [{slug, book, c}] — computed from the themes already tagged on
// every chapter, so this costs a scan, not new authored content.
let topicIdxCache = null;
export async function topicIndex() {
  if (topicIdxCache) return topicIdxCache;
  const metas = await allMeta();
  const idx = {};
  for (const m of metas) {
    for (const ch of m.chapters) {
      for (const t of ch.themes || []) {
        (idx[t] = idx[t] || []).push({ slug: m.slug, book: m.book, c: ch.c });
      }
    }
  }
  topicIdxCache = idx;
  return idx;
}
export const loadTopics = () => tryJSON('data/topics.json');

export function segmentFor(chapterMeta, verse) {
  if (!chapterMeta || !chapterMeta.segments) return null;
  return chapterMeta.segments.find(s => verse >= s.s && verse <= s.e) || null;
}

export function prevNextChapter(slug, c) {
  const vol = volumeOf(slug);
  const books = vol.books;
  const i = books.findIndex(b => b.slug === slug);
  const b = books[i];
  let prev = null, next = null;
  if (c > 1) prev = { slug, c: c - 1 };
  else if (i > 0) prev = { slug: books[i - 1].slug, c: books[i - 1].chapters };
  if (c < b.chapters) next = { slug, c: c + 1 };
  else if (i < books.length - 1) next = { slug: books[i + 1].slug, c: 1 };
  return { prev, next };
}

export const fmtYear = n => n == null ? 'date unknown' : (n < 0 ? `${-n} BC` : `AD ${n}`);
export const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const themeName = id => id.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ').replace('And', '&');
