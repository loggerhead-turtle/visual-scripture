// Study footnotes: the little lettered markers inside a verse (1a, 1b …), the
// popover that opens when one is tapped, and the "Footnotes" list at the end
// of the chapter. The data comes from the per-verse "f" arrays in
// data/commentary/<slug>.json:
//   { "w": "exact word/phrase in the verse", "r": "2 Kings 15:1-7; Isaiah 6:1" }
//   { "w": "...", "g": "short gloss" }
// Everything here is Visual Scripture's own study material; the official
// edition's footnotes are reached only by link (see official-links.js).
import { esc, bookBySlug } from './data.js';
import { parseRefs, refHref } from './refs.js';
import { officialChapterUrl, officialVerseUrl } from './official-links.js';

// a..z, then aa, ab … (a verse rarely has more than a handful)
export const fnLetter = i => (i < 26 ? '' : fnLetter(Math.floor(i / 26) - 1)) + String.fromCharCode(97 + (i % 26));

// "2 Kings 15:1-7; Isaiah 6:1" -> linked refs; pieces we can't parse stay plain
export function refsHtml(str) {
  return parseRefs(str).map(r => {
    const href = refHref(r);
    const label = esc(r.text);
    return href ? `<a class="fn-ref" href="${href}" title="Read ${esc(bookBySlug[r.slug].name)} ${r.c}">${label}</a>` : `<span class="fn-ref plain">${label}</span>`;
  }).join('<span class="fn-sep">; </span>');
}

// the body shared by the popover and the end-of-chapter list
function noteBody(f) {
  return (f.r ? `<div class="fn-refs"><span class="fn-k">See</span> ${refsHtml(f.r)}</div>` : '')
    + (f.g ? `<div class="fn-gloss">${esc(f.g)}</div>` : '');
}

// Where in the verse each marker goes: the end of the first occurrence of
// its word. A word the author mistyped (not found) still gets a marker, at
// the end of the verse, so the note is never lost.
export function markerPositions(text, notes) {
  let from = 0;
  return (notes || []).map((f, i) => {
    const at = f.w ? text.indexOf(f.w, from) : -1;
    const pos = at < 0 ? text.length : at + f.w.length;
    if (at >= 0) from = at; // later notes usually sit later in the verse — but allow the same word twice
    return { pos, letter: fnLetter(i), i };
  });
}

// a <span role=button> rather than a <button>, so the marker stays glued to
// its word (no line break between "void" and "a;") — the reader wires
// Enter/Space for keyboard users
export const markerHtml = (v, letter, i) =>
  `<span class="fn" role="button" tabindex="0" data-fn="${v}${letter}" data-i="${i}" aria-label="Footnote ${v}${letter}" title="Footnote ${v}${letter}">${letter}</span>`;

// the popover shown under a verse when a letter is tapped
export function buildFootnotePop(slug, c, v, letter, f) {
  const box = document.createElement('div');
  box.className = 'fnpop';
  const official = officialVerseUrl(slug, c, v);
  box.innerHTML = `
    <div class="fnpop-head">
      <span class="fn-tag">${v}${esc(letter)}</span>
      <span class="fn-word">${esc(f.w || '')}</span>
      <button type="button" class="fnpop-x" aria-label="Close footnote">✕</button>
    </div>
    ${noteBody(f)}
    <div class="fnpop-foot">
      <span class="fn-orig">Study note original to Visual Scripture</span>
      <button type="button" class="fnpop-all">All footnotes ↓</button>
      ${official ? `<a class="fnpop-official" href="${official}" target="_blank" rel="noopener">Official footnotes ↗</a>` : ''}
    </div>`;
  return box;
}

// the "Footnotes" section at the end of the chapter — every verse's notes,
// plus the link to the official edition's own footnotes for this chapter
export function buildFootnotesSection(slug, c, chapterNotes, cw) {
  const official = officialChapterUrl(slug, c);
  const officialLink = official ? `<a class="btn fn-official" href="${official}" target="_blank" rel="noopener">Official footnotes on ChurchofJesusChrist.org ↗</a>` : '';
  const verses = [];
  (chapterNotes || []).forEach((entry, i) => {
    const notes = (entry && entry.f) || [];
    if (!notes.length) return;
    verses.push(`<div class="fn-verse">
      <a class="fn-vn" href="#/read/${slug}/${c}?v=${i + 1}" title="Back to verse ${i + 1}">${i + 1}</a>
      <div class="fn-items">${notes.map((f, j) => `
        <div class="fn-item" id="fn-${i + 1}${fnLetter(j)}">
          <span class="fn-tag">${i + 1}${fnLetter(j)}</span>
          <span class="fn-word">${esc(f.w || '')}</span>
          ${noteBody(f)}
        </div>`).join('')}</div>
    </div>`);
  });
  return `<section class="footnotes" id="footnotes" aria-labelledby="fn-title">
    <div class="fn-head">
      <h3 id="fn-title">Footnotes</h3>
      ${officialLink}
    </div>
    <p class="fn-about">The lettered notes below are <strong>study notes original to Visual Scripture</strong> — plain-language glosses and cross-references, not the official edition's footnotes. For the Church's own footnotes, Topical Guide and Bible Dictionary links, open this ${cw.toLowerCase()} on ChurchofJesusChrist.org.</p>
    ${verses.length ? verses.join('') : `<p class="fn-empty">No study footnotes have been written for this ${cw.toLowerCase()} yet.</p>`}
  </section>`;
}
