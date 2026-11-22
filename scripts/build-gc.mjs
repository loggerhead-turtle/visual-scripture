// General Conference section: turns the per-chapter citation files
// (data/conference/<slug>/<c>.json, built by build-conference.mjs) into
// talk-level and speaker-level records with a scripture "fingerprint" for
// each, so talks can be browsed by date or by speaker and cross-referenced
// with the scriptures the same way chapters are.
//
//   node scripts/build-gc.mjs
//
// Writes:
//   data/gc/index.json           every talk (session order), every speaker,
//                                 decade-by-volume citation counts, the most
//                                 cited verses and chapters of all time
//   data/gc/talks/<year>.json    per talk: its references, the themes, people
//                                 and places of the passages it cites, and the
//                                 talks that cite the most similar scripture
//   data/gc/speakers/<slug>.json per speaker: favourite books, chapters and
//                                 verses, themes, people, volume mix, talks per
//                                 year, and speakers with a similar profile
// and stamps a stable talk `id` onto every talk in data/conference/** so the
// reader's conference card can link to the talk's own page.
//
// Talk text is not used or stored (it is the Church's copyright): everything
// here is derived from which scriptures a talk cites, plus the site's own
// chapter metadata (themes, people, places).
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { BOOKS, VOLUMES } from '../js/data.js';

const root = new URL('../', import.meta.url);
const read = f => JSON.parse(readFileSync(new URL(f, root)));
const counts = read('data/versecounts.json');

const VOL_IDX = {};
VOLUMES.forEach((v, i) => v.books.forEach(b => { VOL_IDX[b.slug] = i; }));
const BOOK_ORDER = {};
BOOKS.forEach((b, i) => { BOOK_ORDER[b.slug] = i; });

// ---- chapter metadata (themes, people, places) ----
function metaFor(slug) {
  if (slug === 'dc') {
    const parts = ['data/meta/dc-1.json', 'data/meta/dc-2.json'].filter(f => existsSync(new URL(f, root))).map(read);
    return { chapters: parts.flatMap(p => p.chapters) };
  }
  const f = `data/meta/${slug}.json`;
  return existsSync(new URL(f, root)) ? read(f) : { chapters: [] };
}
const META = {};
for (const { slug } of BOOKS) {
  META[slug] = {};
  for (const ch of metaFor(slug).chapters) META[slug][ch.c] = ch;
}
// individuals only — groups ("church", "reader", "multitude") say little about a talk
const PEOPLE = new Set();
for (const f of ['data/characters.json', 'data/cast-ot.json', 'data/cast-nt.json', 'data/cast-dc.json', 'data/cast-pgp.json']) {
  if (!existsSync(new URL(f, root))) continue;
  for (const c of read(f).characters || []) PEOPLE.add(c.id);
}
// narrators who "speak" whole books; counting them would drown the signal
const NARRATORS = new Set(['chronicler', 'mormon', 'moses', 'psalmist', 'the-lord']);

// ---- helpers ----
// "Chad H Webb" -> "Chad H. Webb" (the index is inconsistent about initials)
const normName = s => String(s).replace(/\b([A-Z])(?=\s)/g, '$1.').replace(/\s+/g, ' ').trim();
const slugify = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const lastName = s => {
  const w = s.replace(/,?\s+(Jr\.?|Sr\.?|II|III)$/i, '').split(' ');
  return w[w.length - 1];
};
const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, n);
const r2 = x => Math.round(x * 100) / 100;
const inc = (m, k, w = 1) => m.set(k, (m.get(k) || 0) + w);

// ---- 1. invert the chapter files into talks ----
const talks = new Map(); // key -> talk
const keyOf = t => `${t.y}|${t.s}|${normName(t.sp)}|${t.ti}`;
const orderEdges = new Map(); // key -> Set(keys that come *before* it in its session)
for (const { slug } of BOOKS) {
  counts[slug].forEach((_, i) => {
    const c = i + 1;
    const f = read(`data/conference/${slug}/${c}.json`);
    const keys = f.talks.map(keyOf);
    f.talks.forEach((t, j) => {
      const k = keys[j];
      if (!talks.has(k)) talks.set(k, { y: t.y, s: t.s, sp: normName(t.sp), ti: t.ti, u: t.u || null, refs: [] });
      const o = talks.get(k);
      if (!o.u && t.u) o.u = t.u;
    });
    for (const [ti, vs] of f.cites) talks.get(keys[ti]).refs.push([slug, c, vs]);
    // each file lists talks newest first (BYU talk id descending), so two
    // neighbours from the same session tell us their order within it
    for (let j = 0; j + 1 < keys.length; j++) {
      const a = f.talks[j], b = f.talks[j + 1];
      if (a.y === b.y && a.s === b.s) {
        const s = orderEdges.get(keys[j]) || new Set();
        s.add(keys[j + 1]);
        orderEdges.set(keys[j], s);
      }
    }
  });
}

// ---- 2. order talks: by session, then by position within the session ----
const sessions = new Map();
for (const [k, t] of talks) {
  const sk = `${t.y}${t.s}`;
  (sessions.get(sk) || sessions.set(sk, []).get(sk)).push(k);
}
const ordered = [];
for (const sk of [...sessions.keys()].sort((a, b) => a.slice(0, 4) - b.slice(0, 4) || (a[4] === 'O') - (b[4] === 'O'))) {
  const ks = sessions.get(sk);
  const inSet = new Set(ks);
  const indeg = new Map(ks.map(k => [k, 0]));
  for (const k of ks) for (const b of orderEdges.get(k) || []) if (inSet.has(b)) inc(indeg, k);
  // Kahn's algorithm, ties broken by speaker so the result is deterministic
  const ready = ks.filter(k => indeg.get(k) === 0);
  const out = [];
  const seen = new Set();
  const revEdges = new Map();
  for (const k of ks) for (const b of orderEdges.get(k) || []) if (inSet.has(b)) (revEdges.get(b) || revEdges.set(b, []).get(b)).push(k);
  while (ready.length) {
    ready.sort((a, b) => a.localeCompare(b));
    const k = ready.shift();
    if (seen.has(k)) continue;
    seen.add(k); out.push(k);
    for (const a of revEdges.get(k) || []) { indeg.set(a, indeg.get(a) - 1); if (indeg.get(a) === 0) ready.push(a); }
  }
  for (const k of ks.sort()) if (!seen.has(k)) out.push(k); // a cycle in scraped data — keep everything
  ordered.push(...out);
}

// ---- 3. stable ids: 2024-a-russell-m-nelson, 2024-a-russell-m-nelson-2 ----
const ids = new Set();
const list = ordered.map(k => {
  const t = talks.get(k);
  let base = `${t.y}-${t.s.toLowerCase()}-${slugify(t.sp) || 'talk'}`.slice(0, 58).replace(/-$/, '');
  let id = base, n = 2;
  while (ids.has(id)) id = `${base}-${n++}`;
  ids.add(id);
  t.id = id;
  t.key = k;
  // canonical scripture order; merge duplicate chapter refs
  const m = new Map();
  for (const [slug, c, vs] of t.refs) {
    const rk = `${slug}:${c}`;
    const set = m.get(rk) || new Set();
    if (!vs.length) set.add(0);
    vs.forEach(v => set.add(v));
    m.set(rk, set);
  }
  t.refs = [...m.entries()].map(([rk, set]) => {
    const [slug, c] = rk.split(':');
    return [slug, +c, [...set].filter(v => v > 0).sort((a, b) => a - b)];
  }).sort((a, b) => BOOK_ORDER[a[0]] - BOOK_ORDER[b[0]] || a[1] - b[1]);
  return t;
});
const byKey = new Map(list.map(t => [t.key, t]));
console.log(`${list.length} talks, ${sessions.size} sessions`);

// ---- 4. fingerprint every talk ----
// features: each cited chapter, and each cited verse (verses weigh more —
// two talks quoting Moroni 10:4 have more in common than two that cite Moroni 10)
const feats = t => {
  const f = new Map();
  for (const [slug, c, vs] of t.refs) {
    f.set(`${slug}:${c}`, 1);
    for (const v of vs) f.set(`${slug}:${c}:${v}`, 1.6);
  }
  return f;
};
const df = new Map();
for (const t of list) { t.f = feats(t); for (const k of t.f.keys()) inc(df, k); }
const N = list.length;
const idf = k => Math.log(N / df.get(k));
for (const t of list) {
  let norm = 0;
  for (const [k, w] of t.f) { const x = w * idf(k); t.f.set(k, x); norm += x * x; }
  t.norm = Math.sqrt(norm) || 1;
}
const posting = new Map();
list.forEach((t, i) => { for (const [k, x] of t.f) (posting.get(k) || posting.set(k, []).get(k)).push([i, x]); });

for (let i = 0; i < list.length; i++) {
  const t = list[i];
  const score = new Map();
  for (const [k, x] of t.f) {
    if (idf(k) < 0.7) continue; // hyper-common features (cited by half the talks) only add noise
    for (const [j, y] of posting.get(k)) if (j !== i) inc(score, j, x * y);
  }
  t.rel = [...score.entries()]
    .map(([j, s]) => [j, s / (t.norm * list[j].norm)])
    .filter(([, s]) => s > 0.08)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([j, s]) => [list[j].id, r2(s)]);

  // themes / people / places of the passages the talk cites
  const th = new Map(), pe = new Map(), pl = new Map();
  for (const [slug, c, vs] of t.refs) {
    const ch = META[slug] && META[slug][c];
    if (!ch) continue;
    for (const x of ch.themes || []) inc(th, x);
    if (ch.place) inc(pl, ch.place);
    for (const p of ch.characters || []) if (PEOPLE.has(p) && !NARRATORS.has(p)) inc(pe, p, 0.5);
    for (const s of ch.segments || []) {
      if (!PEOPLE.has(s.speaker) || NARRATORS.has(s.speaker)) continue;
      const hit = !vs.length || vs.some(v => v >= s.s && v <= s.e);
      if (hit) inc(pe, s.speaker, 1);
    }
  }
  t.th = top(th, 8);
  t.pe = top(pe, 8).map(([k, w]) => [k, r2(w)]);
  t.pl = top(pl, 5);
  t.vol = [0, 0, 0, 0, 0];
  for (const [slug, , vs] of t.refs) t.vol[VOL_IDX[slug]] += Math.max(1, vs.length);
}

// ---- 5. speakers ----
const speakers = new Map();
for (const t of list) {
  const s = speakers.get(t.sp) || speakers.set(t.sp, { name: t.sp, talks: [] }).get(t.sp);
  s.talks.push(t);
}
const spSlugs = new Set();
for (const s of speakers.values()) {
  let base = slugify(s.name) || 'speaker', slug = base, n = 2;
  while (spSlugs.has(slug)) slug = `${base}-${n++}`;
  spSlugs.add(slug);
  s.slug = slug;
}
const spList = [...speakers.values()].sort((a, b) => lastName(a.name).localeCompare(lastName(b.name)) || a.name.localeCompare(b.name));
const spIdx = new Map(spList.map((s, i) => [s.name, i]));

// speaker vectors over chapters (tf-idf) for "similar speakers"
const chDf = new Map();
for (const s of spList) {
  s.ch = new Map();
  for (const t of s.talks) for (const [slug, c] of t.refs) inc(s.ch, `${slug}:${c}`);
  for (const k of s.ch.keys()) inc(chDf, k);
}
for (const s of spList) {
  let norm = 0;
  s.vec = new Map();
  for (const [k, n] of s.ch) { const x = (1 + Math.log(n)) * Math.log(spList.length / chDf.get(k)); s.vec.set(k, x); norm += x * x; }
  s.norm = Math.sqrt(norm) || 1;
}

const outDir = new URL('data/gc/', root);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(new URL('talks/', outDir), { recursive: true });
mkdirSync(new URL('speakers/', outDir), { recursive: true });

for (const s of spList) {
  const books = new Map(), chapters = new Map(), verses = new Map(), th = new Map(), pe = new Map(), years = new Map();
  const vol = [0, 0, 0, 0, 0];
  for (const t of s.talks) {
    inc(years, t.y);
    for (const [slug, c, vs] of t.refs) {
      inc(books, slug); inc(chapters, `${slug}:${c}`);
      for (const v of vs) inc(verses, `${slug}:${c}:${v}`);
    }
    t.vol.forEach((n, i) => { vol[i] += n; });
    for (const [k, w] of t.th) inc(th, k, w);
    for (const [k, w] of t.pe) inc(pe, k, w);
  }
  const similar = s.talks.length < 2 ? [] : spList
    .filter(o => o !== s && o.talks.length >= 2)
    .map(o => {
      let d = 0;
      const [a, b] = s.vec.size < o.vec.size ? [s.vec, o.vec] : [o.vec, s.vec];
      for (const [k, x] of a) { const y = b.get(k); if (y) d += x * y; }
      return [o.slug, r2(d / (s.norm * o.norm))];
    })
    .filter(([, x]) => x > 0.05)
    .sort((a, b) => b[1] - a[1]).slice(0, 6);
  const rec = {
    name: s.name, slug: s.slug,
    talks: s.talks.map(t => t.id),
    years: Object.fromEntries([...years].sort((a, b) => a[0] - b[0])),
    vol,
    books: top(books, 12),
    chapters: top(chapters, 12).filter(([, n]) => n > 1).map(([k, n]) => { const [slug, c] = k.split(':'); return [slug, +c, n]; }),
    verses: top(verses, 12).filter(([, n]) => n > 1).map(([k, n]) => { const [slug, c, v] = k.split(':'); return [slug, +c, +v, n]; }),
    themes: top(th, 10),
    people: top(pe, 10).map(([k, w]) => [k, r2(w)]),
    similar,
  };
  writeFileSync(new URL(`speakers/${s.slug}.json`, outDir), JSON.stringify(rec));
}

// ---- 6. per-year talk detail files ----
const byYear = new Map();
for (const t of list) (byYear.get(t.y) || byYear.set(t.y, {}).get(t.y))[t.id] = { r: t.refs, th: t.th, pe: t.pe, pl: t.pl, rel: t.rel };
for (const [y, rec] of byYear) writeFileSync(new URL(`talks/${y}.json`, outDir), JSON.stringify(rec));

// ---- 7. the index ----
const decades = {};
const verseAll = new Map(), chapAll = new Map();
for (const t of list) {
  const d = Math.floor(t.y / 10) * 10;
  const row = decades[d] || (decades[d] = [0, 0, 0, 0, 0, 0]); // 5 volumes + talk count
  t.vol.forEach((n, i) => { row[i] += n; });
  row[5]++;
  for (const [slug, c, vs] of t.refs) {
    inc(chapAll, `${slug}:${c}`);
    for (const v of vs) inc(verseAll, `${slug}:${c}:${v}`);
  }
}
const texts = {};
function snippet(slug, c, v) {
  texts[slug] = texts[slug] || read(`data/text/${slug}.json`);
  const t = ((texts[slug].chapters || [])[c - 1] || [])[v - 1] || '';
  return t.length > 170 ? t.slice(0, 170).replace(/\s+\S*$/, '') + '…' : t;
}
// a talk URL is either the modern study page (stored compactly) or kept whole
const GC_URL = /^https:\/\/www\.churchofjesuschrist\.org\/study\/general-conference\/(\d{4}\/\d{2}\/[\w-]+)\?lang=eng$/;
const index = {
  credit: 'Citations: BYU Scripture Citation Index (scriptures.byu.edu)',
  speakers: spList.map(s => [s.name, s.slug, s.talks.length, s.talks[0].y, s.talks[s.talks.length - 1].y]),
  // [id, year, 'A'|'O', speakerIndex, title, url, [ot, nt, bom, dc, pgp]]
  talks: list.map(t => {
    const m = t.u && t.u.match(GC_URL);
    return [t.id, t.y, t.s, spIdx.get(t.sp), t.ti, m ? '~' + m[1] : t.u, t.vol];
  }),
  decades,
  // [slug, c, v, talks citing it, opening words of the verse]
  topVerses: top(verseAll, 40).map(([k, n]) => { const [slug, c, v] = k.split(':'); return [slug, +c, +v, n, snippet(slug, +c, +v)]; }),
  topChapters: top(chapAll, 30).map(([k, n]) => { const [slug, c] = k.split(':'); return [slug, +c, n]; }),
};
const idxStr = JSON.stringify(index);
writeFileSync(new URL('index.json', outDir), idxStr);
console.log(`wrote data/gc/index.json (${(idxStr.length / 1024).toFixed(0)} KB), ${byYear.size} year files, ${spList.length} speakers`);

// ---- 8. stamp talk ids into the chapter files ----
let stamped = 0;
for (const { slug } of BOOKS) {
  counts[slug].forEach((_, i) => {
    const path = new URL(`data/conference/${slug}/${i + 1}.json`, root);
    const f = JSON.parse(readFileSync(path));
    if (!f.talks.length) return;
    f.talks = f.talks.map(t => { const o = byKey.get(keyOf(t)); return o ? { ...t, id: o.id, ss: speakers.get(o.sp).slug } : t; });
    writeFileSync(path, JSON.stringify(f));
    stamped++;
  });
}
console.log(`stamped talk ids into ${stamped} chapter files`);
