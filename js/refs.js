// Scripture reference parsing: "2 Kings 15:1-7; Isa. 53:4" -> structured refs
// that the reader can link. Shared by the browser (footnotes) and the build
// scripts in scripts/ (conference citations), so keep it dependency-light.
import { BOOKS } from './data.js';

const norm = s => s.toLowerCase().replace(/[ \s]+/g, ' ').replace(/[.]/g, '').replace(/[—–-]+/g, '-').trim();

// every spelling we accept for each book: its full name, the slug, and the
// common abbreviations used in footnotes and conference citations
const ALIASES = {
  genesis: ['gen'], exodus: ['ex', 'exod'], leviticus: ['lev'], numbers: ['num'], deuteronomy: ['deut'],
  joshua: ['josh'], judges: ['judg'], ruth: [], '1-samuel': ['1 sam'], '2-samuel': ['2 sam'],
  '1-kings': ['1 kgs'], '2-kings': ['2 kgs'], '1-chronicles': ['1 chr', '1 chron'], '2-chronicles': ['2 chr', '2 chron'],
  ezra: [], nehemiah: ['neh'], esther: ['esth'], job: [], psalms: ['psalm', 'ps', 'psa'], proverbs: ['prov'],
  ecclesiastes: ['eccl', 'eccles'], 'song-of-solomon': ['song', 'song of songs'], isaiah: ['isa'], jeremiah: ['jer'],
  lamentations: ['lam'], ezekiel: ['ezek'], daniel: ['dan'], hosea: ['hosea'], joel: [], amos: [], obadiah: ['obad'],
  jonah: [], micah: [], nahum: [], habakkuk: ['hab'], zephaniah: ['zeph'], haggai: ['hag'], zechariah: ['zech'],
  malachi: ['mal'], matthew: ['matt', 'mt'], mark: [], luke: [], john: [], acts: [], romans: ['rom'],
  '1-corinthians': ['1 cor'], '2-corinthians': ['2 cor'], galatians: ['gal'], ephesians: ['eph'],
  philippians: ['philip', 'phil'], colossians: ['col'], '1-thessalonians': ['1 thes', '1 thess'],
  '2-thessalonians': ['2 thes', '2 thess'], '1-timothy': ['1 tim'], '2-timothy': ['2 tim'], titus: [],
  philemon: ['philem'], hebrews: ['heb'], james: [], '1-peter': ['1 pet'], '2-peter': ['2 pet'], '1-john': [],
  '2-john': [], '3-john': [], jude: [], revelation: ['rev'],
  '1-nephi': ['1 ne'], '2-nephi': ['2 ne'], jacob: [], enos: [], jarom: [], omni: [],
  'words-of-mormon': ['w of m', 'wofm'], mosiah: [], alma: [], helaman: ['hel'], '3-nephi': ['3 ne'],
  '4-nephi': ['4 ne'], mormon: ['morm'], ether: [], moroni: ['moro'],
  dc: ['d&c', 'd & c', 'doctrine and covenants', 'doctrine & covenants'],
  moses: [], abraham: ['abr'], 'js-matthew': ['js-m', 'joseph smith-matthew', 'jsm'],
  'js-history': ['js-h', 'joseph smith-history', 'jsh'], 'articles-of-faith': ['a of f', 'aof', 'article of faith'],
};

const BOOK_KEYS = {};
for (const b of BOOKS) {
  BOOK_KEYS[norm(b.name)] = b.slug;
  BOOK_KEYS[norm(b.slug.replace(/-/g, ' '))] = b.slug;
  for (const a of ALIASES[b.slug] || []) BOOK_KEYS[norm(a)] = b.slug;
}
// longest names first so "1 John" wins over "John" and "Song of Solomon" over "Song"
const KEY_LIST = Object.keys(BOOK_KEYS).sort((a, b) => b.length - a.length);

export function bookSlugFor(name) {
  return BOOK_KEYS[norm(name)] || null;
}

// "2 Kings 15:1-7, 9; 16:2; Isa 53:4" -> [{ slug, c, vs: [1..7, 9], text }, ...]
// A ref without a book ("16:2") inherits the previous book. Unparseable
// pieces come back with slug: null so callers can still print the text.
export function parseRefs(str) {
  const out = [];
  let lastSlug = null;
  for (const raw of String(str || '').split(/;/)) {
    const piece = raw.trim();
    if (!piece) continue;
    const n = norm(piece);
    let slug = null, rest = n;
    for (const k of KEY_LIST) {
      if (n === k || n.startsWith(k + ' ')) { slug = BOOK_KEYS[k]; rest = n.slice(k.length).trim(); break; }
    }
    if (!slug && /^\d+(:|$)/.test(n)) { slug = lastSlug; rest = n; }
    const m = slug && rest.match(/^(\d+)(?::\s*([\d,\s-]+))?/);
    if (!m) { out.push({ slug: null, text: piece }); continue; }
    lastSlug = slug;
    const vs = [];
    for (const part of (m[2] || '').split(',')) {
      const [a, b] = part.split('-').map(x => parseInt(x, 10));
      if (!a) continue;
      for (let v = a; v <= (b && b >= a && b - a < 200 ? b : a); v++) vs.push(v);
    }
    out.push({ slug, c: parseInt(m[1], 10), vs, text: piece });
  }
  return out;
}

export function refHref(r) {
  if (!r || !r.slug) return null;
  return `#/read/${r.slug}/${r.c}${r.vs && r.vs.length ? `?v=${r.vs[0]}` : ''}`;
}
