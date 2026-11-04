// Prebuilt cross-reference index: which chapters each character, theme and
// place appears in. The Cast, Index and Map pages read this one small file
// instead of fetching all 88 per-book meta files.
//   node scripts/build-index.mjs           write data/index.json
//   node scripts/build-index.mjs --check   exit 1 if data/index.json is stale
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { BOOKS } from '../js/data.js';

const root = new URL('../', import.meta.url);
const read = f => JSON.parse(readFileSync(new URL(f, root)));

function metaFor(slug) {
  if (slug === 'dc') {
    const parts = ['data/meta/dc-1.json', 'data/meta/dc-2.json'].filter(f => existsSync(new URL(f, root))).map(read);
    return { slug, chapters: parts.flatMap(p => p.chapters) };
  }
  const f = `data/meta/${slug}.json`;
  return existsSync(new URL(f, root)) ? read(f) : { slug, chapters: [] };
}

// each list holds "slug:c" refs in canonical book order
export function buildIndex() {
  const characters = {}, themes = {}, places = {};
  const add = (m, k, ref) => { if (!k) return; const l = m[k] || (m[k] = []); if (l[l.length - 1] !== ref) l.push(ref); };
  for (const { slug } of BOOKS) {
    for (const ch of metaFor(slug).chapters) {
      const ref = `${slug}:${ch.c}`;
      const ids = new Set(ch.characters || []);
      for (const s of ch.segments || []) ids.add(s.speaker);
      for (const id of ids) add(characters, id, ref);
      for (const t of ch.themes || []) add(themes, t, ref);
      add(places, ch.place, ref);
    }
  }
  return { characters, themes, places };
}

const out = JSON.stringify(buildIndex());
const path = new URL('data/index.json', root);
if (process.argv.includes('--check')) {
  const stale = !existsSync(path) || readFileSync(path, 'utf8') !== out;
  console.log(stale ? '✗ data/index.json is stale — run node scripts/build-index.mjs' : '✓ data/index.json is current');
  process.exit(stale ? 1 : 0);
}
writeFileSync(path, out);
console.log(`wrote data/index.json (${(out.length / 1024).toFixed(0)} KB)`);
