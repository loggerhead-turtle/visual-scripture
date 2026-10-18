// "In General Conference" — the sidebar card listing conference talks that
// cite the chapter being read, from data/conference/<slug>.json:
//   { slug, talks: [{ y, s: 'A'|'O', sp, ti, u }], chapters: { "<c>": [[talkIndex, [verses]], ...] } }
// A verse list of [] means the whole chapter was cited. Talks within a
// chapter are listed newest first. The "citing the verse in view" strip is
// refreshed as the reader scrolls (cheap: a precomputed verse -> talks map).
import { esc } from './data.js';

const SHOW_FIRST = 8; // rows visible before "show more"
const CREDIT = '<div class="conf-credit">Citations: <a href="https://scriptures.byu.edu/" target="_blank" rel="noopener">BYU Scripture Citation Index</a></div>';

const season = t => `${t.s === 'A' ? 'Apr' : 'Oct'} ${t.y}`;

function rowHtml(t, vs) {
  const where = vs && vs.length ? `<span class="conf-vs">v.&thinsp;${esc(verseRange(vs))}</span>` : '';
  const inner = `<span class="conf-when">${season(t)} · ${esc(t.sp)}${where}</span><span class="conf-title">${esc(t.ti)}</span>`;
  return t.u
    ? `<a class="conf-row" href="${esc(t.u)}" target="_blank" rel="noopener">${inner}</a>`
    : `<div class="conf-row plain">${inner}<span class="conf-cr">Conference Report</span></div>`;
}

// [4,5,6,9] -> "4–6, 9"
function verseRange(vs) {
  const s = [...vs].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    out.push(j > i ? `${s[i]}–${s[j]}` : `${s[i]}`);
    i = j;
  }
  return out.join(', ');
}

// Returns null when nothing cites this chapter; otherwise the card's HTML
// plus a controller whose setVerse(v) updates the "verse in view" strip.
export function conferenceCard(conf, c, cw) {
  const cites = conf && conf.chapters && conf.chapters[String(c)];
  if (!cites || !cites.length || !conf.talks) return null;
  const talks = conf.talks;
  const byVerse = {};   // verse -> [[talk, verses]]
  let wholeChapter = 0;
  for (const [ti, vs] of cites) {
    const t = talks[ti];
    if (!t) continue;
    if (!vs || !vs.length) { wholeChapter++; continue; }
    for (const v of vs) (byVerse[v] = byVerse[v] || []).push([t, vs]);
  }
  const n = cites.length;
  const all = cites.filter(([ti]) => talks[ti]).map(([ti, vs]) => rowHtml(talks[ti], vs));

  const html = `<div class="context-card conf-card" id="conf-card">
      <h4>In General Conference</h4>
      <div class="conf-now" id="conf-now"></div>
      <button type="button" class="conf-toggle" id="conf-toggle" aria-expanded="false">
        <span>All ${n} talk${n === 1 ? '' : 's'} citing this ${cw.toLowerCase()}</span><span class="conf-caret">▾</span>
      </button>
      <div class="conf-all" id="conf-all" hidden>
        ${all.slice(0, SHOW_FIRST).join('')}
        ${all.length > SHOW_FIRST ? `<div class="conf-more" hidden>${all.slice(SHOW_FIRST).join('')}</div>
          <button type="button" class="conf-show-more">Show ${all.length - SHOW_FIRST} more</button>` : ''}
      </div>
      ${CREDIT}
    </div>`;

  // wires the card once it's in the DOM
  const setup = root => {
    const card = root.querySelector('#conf-card');
    if (!card) return { setVerse() {} };
    const now = card.querySelector('#conf-now');
    const toggle = card.querySelector('#conf-toggle');
    const allEl = card.querySelector('#conf-all');
    toggle.addEventListener('click', () => {
      const open = allEl.hidden;
      allEl.hidden = !open;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.classList.toggle('open', open);
    });
    const more = card.querySelector('.conf-show-more');
    if (more) more.addEventListener('click', () => { card.querySelector('.conf-more').hidden = false; more.remove(); });

    let lastKey = null;
    const setVerse = v => {
      const list = byVerse[v] || [];
      const key = v + ':' + list.length; // same verse & count -> nothing to redraw
      if (key === lastKey) return;
      lastKey = key;
      if (list.length) {
        now.innerHTML = `<div class="conf-now-label">Citing verse ${v}</div>` + list.slice(0, 3).map(([t, vs]) => rowHtml(t, vs)).join('')
          + (list.length > 3 ? `<div class="conf-now-more">+${list.length - 3} more below</div>` : '');
      } else {
        now.innerHTML = `<div class="conf-now-label muted">No talk quotes verse ${v} by itself${wholeChapter ? ` — ${wholeChapter} cite${wholeChapter === 1 ? 's' : ''} the whole ${cw.toLowerCase()}` : ''}.</div>`;
      }
    };
    return { setVerse };
  };
  return { html, setup };
}
