// Validates the content data across all four volumes: meta files tile every
// chapter's verses exactly and every id resolves. Missing meta files are
// reported as "pending" (the app falls back to a stub), not as errors.
// Run: node scripts/validate.mjs
import { readFileSync, existsSync } from 'fs';

const read = f => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url)));
const exists = f => existsSync(new URL(`../${f}`, import.meta.url));
const counts = read('data/versecounts.json');
const BOOKS = Object.keys(counts);

const chars = read('data/characters.json');
const ids = new Set([...chars.characters.map(c => c.id), ...chars.groups.map(g => g.id)]);
for (const f of ['data/cast-ot.json', 'data/cast-nt.json', 'data/cast-dc.json']) {
  if (!exists(f)) continue;
  const d = read(f);
  for (const c of d.characters || []) ids.add(c.id);
  for (const g of d.groups || []) ids.add(g.id);
}
const places = new Set(read('data/places.json').places.map(p => p.id));
for (const f of ['data/places-holy-land.json', 'data/places-usa.json']) {
  if (exists(f)) for (const p of read(f).places) places.add(p.id);
}
const platesKeys = new Set(Object.keys(read('data/plates.json').platesKeys));

let errors = 0;
const pending = [];
const err = m => { errors++; console.error('✗', m); };

function checkMeta(meta, slug, chapterOffset = 0, expected = null) {
  const vc = counts[slug];
  if (!platesKeys.has(meta.plates)) err(`${slug}: bad book plates '${meta.plates}'`);
  if (!ids.has(meta.narrator)) err(`${slug}: unknown narrator '${meta.narrator}'`);
  if (expected != null && meta.chapters.length !== expected)
    err(`${slug}: expected ${expected} chapters, found ${meta.chapters.length}`);
  meta.chapters.forEach((ch, i) => {
    const cNum = chapterOffset + i + 1;
    const n = vc[cNum - 1];
    const where = `${slug} ${ch.c}`;
    if (ch.c !== cNum) err(`${where}: chapter number mismatch (expected ${cNum})`);
    if (n == null) { err(`${where}: no verse count`); return; }
    if (ch.plates && !platesKeys.has(ch.plates)) err(`${where}: bad plates override '${ch.plates}'`);
    if (ch.place && !places.has(ch.place)) err(`${where}: unknown place '${ch.place}'`);
    for (const c of ch.characters || []) if (!ids.has(c)) err(`${where}: unknown character '${c}'`);
    let cursor = 1;
    for (const s of ch.segments || []) {
      if (s.s !== cursor) err(`${where}: segment gap/overlap at verse ${s.s} (expected ${cursor})`);
      if (!ids.has(s.speaker)) err(`${where}: unknown speaker '${s.speaker}'`);
      if (s.to && !ids.has(s.to)) err(`${where}: unknown audience '${s.to}'`);
      cursor = s.e + 1;
    }
    if ((ch.segments || []).length && cursor !== n + 1) err(`${where}: segments end at ${cursor - 1}, chapter has ${n} verses`);
  });
}

for (const slug of BOOKS) {
  if (slug === 'dc') {
    const a = exists('data/meta/dc-1.json') ? read('data/meta/dc-1.json') : null;
    const b = exists('data/meta/dc-2.json') ? read('data/meta/dc-2.json') : null;
    if (!a) pending.push('dc-1'); else checkMeta(a, 'dc', 0, 70);
    if (!b) pending.push('dc-2'); else checkMeta(b, 'dc', 70, 68);
    continue;
  }
  const f = `data/meta/${slug}.json`;
  if (!exists(f)) { pending.push(slug); continue; }
  const meta = read(f);
  if (meta.chapters.length !== counts[slug].length)
    err(`${slug}: meta has ${meta.chapters.length} chapters, text has ${counts[slug].length}`);
  checkMeta(meta, slug);
}

// timeline + stories reference checks
const tlFiles = ['data/timeline.json', 'data/timeline-ot.json', 'data/timeline-nt.json', 'data/timeline-dc.json'];
for (const f of tlFiles) {
  if (!exists(f)) continue;
  for (const e of read(f).events) {
    for (const c of e.characters || []) if (!ids.has(c)) err(`${f} ${e.id}: unknown character '${c}'`);
    if (!BOOKS.includes(e.ref.slug)) err(`${f} ${e.id}: bad ref slug '${e.ref.slug}'`);
    else if (e.ref.c < 1 || e.ref.c > counts[e.ref.slug].length) err(`${f} ${e.id}: ref chapter out of range`);
  }
}
const stFiles = ['data/stories.json', 'data/stories-ot.json', 'data/stories-nt.json', 'data/stories-dc.json'];
const cats = new Set(read('data/stories.json').categories.map(c => c.id));
for (const f of stFiles) {
  if (!exists(f)) continue;
  for (const s of read(f).stories) {
    if (!cats.has(s.cat)) err(`${f} ${s.id}: unknown category '${s.cat}'`);
    for (const c of s.characters || []) if (!ids.has(c)) err(`${f} ${s.id}: unknown character '${c}'`);
    if (s.place && !places.has(s.place)) err(`${f} ${s.id}: unknown place '${s.place}'`);
    for (const r of s.refs) {
      if (!BOOKS.includes(r.slug)) err(`${f} ${s.id}: bad ref slug '${r.slug}'`);
      else if (r.c < 1 || r.c > counts[r.slug].length) err(`${f} ${s.id}: ref chapter out of range`);
    }
  }
}

if (pending.length) console.log(`… pending meta (stub shown in app): ${pending.join(', ')}`);
console.log(errors ? `\n${errors} problem(s) found` : '✓ all present data valid');
process.exit(errors ? 1 : 0);
