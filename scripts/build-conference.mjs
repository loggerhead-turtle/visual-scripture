// Turns the raw citation cache from scripts/fetch-conference.py into one file
// per chapter: data/conference/<slug>/<c>.json
//   { slug, c, talks: [{ y, s, sp, ti, u }], cites: [[talkIndex, [verses]], ...] }
// Verse list [] = the whole chapter was cited. Talks are listed newest first
// and indexed within the chapter's own `talks` array. Every chapter gets a
// file (an empty one when nothing cites it) so the reader never 404s.
//   node scripts/build-conference.mjs RAW.json
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { parseRefs } from '../js/refs.js';

const root = new URL('../', import.meta.url);
const counts = JSON.parse(readFileSync(new URL('data/versecounts.json', root)));
const raw = JSON.parse(readFileSync(process.argv[2]));

// The scraped talk URLs are rendered as links, so only https addresses on the
// Church's own hosts are kept; the index also hands out http://www.lds.org
// links with a stale "&amp;" in them — normalised here rather than at runtime.
const LINK_HOSTS = /^(www\.)?(churchofjesuschrist\.org|lds\.org)$/i;
function cleanUrl(u) {
  if (!u) return null;
  let url;
  try { url = new URL(String(u).replace(/&amp;/g, '&')); } catch { return null; }
  if (!LINK_HOSTS.test(url.hostname)) return null;
  url.protocol = 'https:';
  return url.href;
}

// newest first: year, then October before April, then talk order
raw.sort((a, b) => b.y - a.y || (b.s === 'O') - (a.s === 'O') || b.id - a.id);

const books = {}; // slug -> { talks: [], idx: Map(talkId -> i), chapters: {c: Map(i -> Set)} }
let cites = 0, skipped = 0;
for (const t of raw) {
  // a talk's citations are read in order: bare "36:2" continues the previous
  // book, "verse 3" the previous chapter, and "section 25" means D&C 25
  let ctx = null, ctxC = null;
  for (let c of t.c || []) {
    c = c.replace(/^section\s+/i, 'D&C ').replace(/^Joseph Smith Translation,\s*/i, '');
    const vm = c.match(/^verses?\s+([\d,\s\u2013-]+)$/i);
    if (vm && ctx && ctxC) c = `${ctxC}:${vm[1]}`;
    for (const r of parseRefs(c, ctx)) {
      if (r.slug) { ctx = r.slug; ctxC = r.c; }
      if (!r.slug || !counts[r.slug] || !(r.c >= 1 && r.c <= counts[r.slug].length)) { skipped++; continue; }
      const max = counts[r.slug][r.c - 1];
      const b = books[r.slug] || (books[r.slug] = { talks: [], idx: new Map(), chapters: {} });
      if (!b.idx.has(t.id)) { b.idx.set(t.id, b.talks.length); b.talks.push({ y: t.y, s: t.s, sp: t.sp, ti: t.ti, u: cleanUrl(t.u) }); }
      const i = b.idx.get(t.id);
      const ch = b.chapters[r.c] || (b.chapters[r.c] = new Map());
      const set = ch.get(i) || new Set();
      if (!r.vs.length) set.add(0); // 0 marks a whole-chapter citation
      for (const v of r.vs) if (v <= max) set.add(v);
      ch.set(i, set);
      cites++;
    }
  }
}

let files = 0;
for (const slug of Object.keys(counts)) {
  const dir = new URL(`data/conference/${slug}/`, root);
  rmSync(dir, { recursive: true, force: true }); // stale chapters never linger
  mkdirSync(dir, { recursive: true });
  const b = books[slug] || { talks: [], chapters: {} };
  counts[slug].forEach((_, i) => {
    const c = i + 1;
    const m = b.chapters[c] || new Map();
    // only this chapter's talks, re-indexed from 0 — order (newest first) is kept
    const talks = [], local = new Map();
    const cites = [...m.entries()].sort((x, y) => x[0] - y[0]).map(([ti, set]) => {
      if (!local.has(ti)) { local.set(ti, talks.length); talks.push(b.talks[ti]); }
      return [local.get(ti), [...set].filter(v => v > 0).sort((x, y) => x - y)];
    });
    writeFileSync(new URL(`${c}.json`, dir), JSON.stringify({ slug, c, talks, cites }));
    files++;
  });
}
console.log(`${raw.length} talks, ${cites} citations into ${files} chapter files across ${Object.keys(books).length} books; ${skipped} unparsed pieces skipped`);
