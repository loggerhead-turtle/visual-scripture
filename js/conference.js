// "In General Conference" — the sidebar card listing conference talks that
// cite the chapter being read, from data/conference/<slug>/<c>.json:
//   { slug, c, talks: [{ y, s: 'A'|'O', sp, ti, u }], cites: [[talkIndex, [verses]], ...] }
// A verse list of [] means the whole chapter was cited. Talks are listed
// newest first. The "citing the verse in view" strip is refreshed as the
// reader scrolls (cheap: a precomputed verse -> talks map).
//
// Titles, speakers and URLs were scraped from scriptures.byu.edu, so they are
// escaped like any other untrusted text, and a talk only gets a link when its
// URL is an https address on the Church's own site (see safeExternalUrl).
import { esc, safeExternalUrl } from './data.js';

const SHOW_FIRST = 8; // rows visible before "show more"
const CREDIT = '<div class="conf-credit">Citations: <a href="https://scriptures.byu.edu/" target="_blank" rel="noopener noreferrer">BYU Scripture Citation Index</a></div>';

const season = t => `${t.s === 'A' ? 'Apr' : 'Oct'} ${esc(t.y)}`;

const idOk = s => typeof s === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(s);

function rowHtml(t, vs) {
  const where = vs && vs.length ? `<span class="conf-vs">v.&thinsp;${esc(verseRange(vs))}</span>` : '';
  const href = safeExternalUrl(t.u);
  // with a talk id (scripts/build-gc.mjs) the title opens the talk's page in
  // the General Conference section and the speaker their profile; the
  // official talk is one click further, or via the ↗ beside the title
  if (idOk(t.id)) {
    const sp = idOk(t.ss) ? `<a href="#/conference/speaker/${t.ss}">${esc(t.sp)}</a>` : esc(t.sp);
    const ext = href ? ` <a class="conf-ext" href="${esc(href)}" target="_blank" rel="noopener noreferrer" title="Read the talk on churchofjesuschrist.org" aria-label="Read the talk on churchofjesuschrist.org">↗</a>` : '';
    return `<div class="conf-row linked"><span class="conf-when">${season(t)} · ${sp}${where}</span><span class="conf-title"><a href="#/conference/talk/${t.id}">${esc(t.ti)}</a>${ext}</span></div>`;
  }
  const inner = `<span class="conf-when">${season(t)} · ${esc(t.sp)}${where}</span><span class="conf-title">${esc(t.ti)}</span>`;
  return href
    ? `<a class="conf-row" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
    : `<div class="conf-row plain">${inner}<span class="conf-cr">Conference Report</span></div>`;
}

// [4,5,6,9] -> "4–6, 9"
function verseRange(vs) {
  const s = vs.map(Number).filter(Number.isInteger).sort((a, b) => a - b);
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
  const cites = conf && Array.isArray(conf.cites) ? conf.cites.filter(Array.isArray) : null;
  if (!cites || !cites.length || !Array.isArray(conf.talks)) return null;
  const talks = conf.talks;
  const byVerse = {};   // verse -> [[talk, verses]]
  let wholeChapter = 0;
  for (const [ti, vs] of cites) {
    const t = talks[ti];
    if (!t) continue;
    if (!vs || !vs.length) { wholeChapter++; continue; }
    for (const v of vs) if (Number.isInteger(v)) (byVerse[v] = byVerse[v] || []).push([t, vs]);
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
