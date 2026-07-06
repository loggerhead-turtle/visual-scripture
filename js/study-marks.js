// Shared verse-marking helpers: the highlight palette and the little
// flag icons (bookmark / note) that decorate verses in the reader.

import { refOf } from './account.js';

export const HL_COLORS = [
  { id: 'gold', name: 'Gold', hex: '#e8b64c' },
  { id: 'teal', name: 'Teal', hex: '#3fa7a0' },
  { id: 'lilac', name: 'Lilac', hex: '#8e6bb8' },
  { id: 'ember', name: 'Ember', hex: '#c87f3a' },
  { id: 'rose', name: 'Rose', hex: '#b8524f' },
];

export function applyHighlight(verseEl, color) {
  HL_COLORS.forEach(c => verseEl.classList.remove(`hl-${c.id}`));
  if (color) verseEl.classList.add(`hl-${color}`);
}

// Show/refresh the 🔖 / ✎ flags on one verse element.
export function refreshFlags(verseEl, study, ref) {
  const hasNote = !!(study && study.notes[ref]);
  const hasBm = !!(study && study.bookmarks.some(b => refOf(b.slug, b.c, b.v) === ref));
  let flags = verseEl.querySelector('.vflags');
  if (!hasNote && !hasBm) { if (flags) flags.remove(); return; }
  if (!flags) {
    flags = document.createElement('span');
    flags.className = 'vflags';
    verseEl.appendChild(flags);
  }
  flags.innerHTML =
    (hasBm ? '<span class="vf vf-bm" title="Bookmarked">🔖</span>' : '') +
    (hasNote ? '<span class="vf vf-note" title="You wrote a note here">✎</span>' : '');
}

// Paint all saved highlights & flags for a freshly rendered chapter.
export function decorateVerses(root, study, slug, c) {
  root.querySelectorAll('.verse').forEach(p => {
    const ref = refOf(slug, c, +p.dataset.v);
    const hl = study && study.highlights[ref];
    applyHighlight(p, hl && hl.color);
    refreshFlags(p, study, ref);
  });
}
