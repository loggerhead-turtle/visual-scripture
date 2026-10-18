// Verse-by-verse commentary + study footnotes.
//
// Authors write one file per chapter: data/commentary/_parts/<slug>/<c>.json,
// an array with one entry per verse:
//   { "n": "plain-language commentary",
//     "f": [ { "w": "word in the verse", "r": "Isaiah 53:4; Mosiah 14:4" },
//            { "w": "another word", "g": "short meaning / translation note" } ] }
//
//   node scripts/build-commentary.mjs show <slug> <chapter>        print the numbered verses
//   node scripts/build-commentary.mjs check <slug> [chapter ...]   validate parts
//   node scripts/build-commentary.mjs                              merge every book into
//                                                                  data/commentary/<slug>.json
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { parseRefs } from '../js/refs.js';

const root = new URL('../', import.meta.url);
const read = f => JSON.parse(readFileSync(new URL(f, root)));
const counts = read('data/versecounts.json');
const texts = {};
const textOf = slug => texts[slug] || (texts[slug] = read(`data/text/${slug}.json`));
const partPath = (slug, c) => new URL(`data/commentary/_parts/${slug}/${c}.json`, root);

function checkChapter(slug, c) {
  const errs = [];
  const p = partPath(slug, c);
  if (!existsSync(p)) return { missing: true, errs };
  let arr;
  try { arr = JSON.parse(readFileSync(p)); } catch (e) { return { errs: [`${slug} ${c}: invalid JSON (${e.message})`] }; }
  const want = counts[slug][c - 1];
  if (!Array.isArray(arr)) return { errs: [`${slug} ${c}: not an array`] };
  if (arr.length !== want) errs.push(`${slug} ${c}: ${arr.length} entries, expected ${want} verses`);
  arr.forEach((e, i) => {
    const at = `${slug} ${c}:${i + 1}`;
    if (!e || typeof e.n !== 'string' || e.n.trim().length < 8) errs.push(`${at}: missing commentary "n"`);
    for (const f of (e && e.f) || []) {
      if (!f.w) errs.push(`${at}: footnote without "w"`);
      else if (!textOf(slug).chapters[c - 1][i].includes(f.w)) errs.push(`${at}: footnote word "${f.w}" is not in the verse text (must match exactly)`);
      if (!f.r && !f.g) errs.push(`${at}: footnote needs "r" or "g"`);
      if (f.r) for (const r of parseRefs(f.r)) if (!r.slug) errs.push(`${at}: unparseable ref "${r.text}"`);
    }
  });
  return { arr, errs };
}

const [cmd, slug, ...chs] = process.argv.slice(2);
if (cmd === 'show') {
  textOf(slug).chapters[Number(chs[0]) - 1].forEach((v, i) => console.log(`${i + 1}. ${v}`));
} else if (cmd === 'check') {
  if (!counts[slug]) { console.error(`unknown slug ${slug}`); process.exit(1); }
  const list = chs.length ? chs.map(Number) : counts[slug].map((_, i) => i + 1);
  let bad = 0;
  for (const c of list) {
    const r = checkChapter(slug, c);
    if (r.missing) { console.log(`${slug} ${c}: missing`); bad++; continue; }
    for (const e of r.errs) console.log(e);
    if (r.errs.length) bad++;
  }
  console.log(bad ? `${bad} chapter(s) need fixing` : 'all ok');
  process.exit(bad ? 1 : 0);
} else {
  mkdirSync(new URL('data/commentary/', root), { recursive: true });
  const partsDir = new URL('data/commentary/_parts/', root);
  const slugs = existsSync(partsDir) ? readdirSync(partsDir) : [];
  let done = 0, total = 0, problems = 0;
  for (const s of Object.keys(counts)) {
    total += counts[s].length;
    if (!slugs.includes(s)) continue;
    const chapters = counts[s].map((_, i) => {
      const r = checkChapter(s, i + 1);
      if (r.missing) return null;
      if (r.errs.length) { problems += r.errs.length; r.errs.slice(0, 3).forEach(e => console.log(e)); }
      done++;
      return r.arr.map(e => (e.f && e.f.length ? { n: e.n.trim(), f: e.f } : { n: e.n.trim() }));
    });
    writeFileSync(new URL(`data/commentary/${s}.json`, root), JSON.stringify({ slug: s, chapters }));
  }
  console.log(`merged ${done}/${total} chapters; ${problems} problem(s)`);
}
