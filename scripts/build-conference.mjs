// Turns the raw citation cache from scripts/fetch-conference.py into one file
// per book: data/conference/<slug>.json
//   { slug, talks: [{ y, s, sp, ti, u }], chapters: { "<c>": [[talkIndex, [verses]], ...] } }
// Verse list [] = the whole chapter was cited. Talks are listed newest first.
//   node scripts/build-conference.mjs RAW.json
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { parseRefs } from '../js/refs.js';

const root = new URL('../', import.meta.url);
const counts = JSON.parse(readFileSync(new URL('data/versecounts.json', root)));
const raw = JSON.parse(readFileSync(process.argv[2]));

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
      if (!b.idx.has(t.id)) { b.idx.set(t.id, b.talks.length); b.talks.push({ y: t.y, s: t.s, sp: t.sp, ti: t.ti, u: t.u || null }); }
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

mkdirSync(new URL('data/conference/', root), { recursive: true });
for (const [slug, b] of Object.entries(books)) {
  const chapters = {};
  for (const [c, m] of Object.entries(b.chapters)) {
    chapters[c] = [...m.entries()].sort((x, y) => x[0] - y[0])
      .map(([i, set]) => [i, [...set].filter(v => v > 0).sort((x, y) => x - y)]);
  }
  writeFileSync(new URL(`data/conference/${slug}.json`, root), JSON.stringify({ slug, talks: b.talks, chapters }));
}
console.log(`${raw.length} talks, ${cites} citations into ${Object.keys(books).length} books; ${skipped} unparsed pieces skipped`);
