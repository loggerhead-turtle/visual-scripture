// Validates the content data: meta files tile every chapter's verses exactly,
// and every id (character, place, theme, plates) resolves. Run: node scripts/validate.mjs
import { readFileSync } from 'fs';

const read = f => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url)));
const BOOKS = ['1-nephi', '2-nephi', 'jacob', 'enos', 'jarom', 'omni', 'words-of-mormon',
  'mosiah', 'alma', 'helaman', '3-nephi', '4-nephi', 'mormon', 'ether', 'moroni'];

const chars = read('data/characters.json');
const ids = new Set([...chars.characters.map(c => c.id), ...chars.groups.map(g => g.id)]);
const places = new Set(read('data/places.json').places.map(p => p.id));
const platesKeys = new Set(Object.keys(read('data/plates.json').platesKeys));

let errors = 0;
const err = m => { errors++; console.error('✗', m); };

for (const slug of BOOKS) {
  const text = read(`data/text/${slug}.json`);
  const meta = read(`data/meta/${slug}.json`);
  if (meta.chapters.length !== text.chapters.length)
    err(`${slug}: meta has ${meta.chapters.length} chapters, text has ${text.chapters.length}`);
  if (!platesKeys.has(meta.plates)) err(`${slug}: bad book plates '${meta.plates}'`);
  if (!ids.has(meta.narrator)) err(`${slug}: unknown narrator '${meta.narrator}'`);
  meta.chapters.forEach((ch, i) => {
    const n = text.chapters[i].length;
    const where = `${slug} ${ch.c}`;
    if (ch.c !== i + 1) err(`${where}: chapter number mismatch`);
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

// timeline + stories reference checks
const tl = read('data/timeline.json');
for (const e of tl.events) {
  for (const c of e.characters || []) if (!ids.has(c)) err(`timeline ${e.id}: unknown character '${c}'`);
  if (!BOOKS.includes(e.ref.slug)) err(`timeline ${e.id}: bad ref slug`);
}
const st = read('data/stories.json');
for (const s of st.stories) {
  for (const c of s.characters || []) if (!ids.has(c)) err(`story ${s.id}: unknown character '${c}'`);
  if (s.place && !places.has(s.place)) err(`story ${s.id}: unknown place '${s.place}'`);
  for (const r of s.refs) if (!BOOKS.includes(r.slug)) err(`story ${s.id}: bad ref slug '${r.slug}'`);
}

console.log(errors ? `\n${errors} problem(s) found` : '✓ all data valid');
process.exit(errors ? 1 : 0);
