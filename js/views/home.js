import { VOLUMES } from '../data.js';

const START = { ot: 'genesis/1', nt: 'matthew/1', bom: '1-nephi/1', dc: 'dc/1' };

// The Book of Mormon: a set of engraved gold plates bound with rings (no emoji exists for it).
const GOLD_PLATES = `<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" style="vertical-align:-4px">
  <rect x="9" y="8" width="18" height="20" rx="1.5" fill="#b0801f"/>
  <rect x="7" y="6" width="18" height="20" rx="1.5" fill="#e8b64c" stroke="#8a6a1e" stroke-width="1"/>
  <g stroke="#8a6a1e" stroke-width="1" opacity=".55">
    <line x1="11" y1="10" x2="22" y2="10"/><line x1="11" y1="13" x2="22" y2="13"/>
    <line x1="11" y1="16" x2="20" y2="16"/><line x1="11" y1="19" x2="22" y2="19"/>
    <line x1="11" y1="22" x2="19" y2="22"/>
  </g>
  <g fill="none" stroke="#f2d488" stroke-width="1.6">
    <circle cx="7" cy="9.5" r="2.3"/><circle cx="7" cy="16" r="2.3"/><circle cx="7" cy="22.5" r="2.3"/>
  </g>
</svg>`;
// The Doctrine & Covenants: the Salt Lake Temple — six spires, the tallest east-centre spire crowned by the angel Moroni.
const SLC_TEMPLE = `<svg viewBox="0 0 44 42" width="32" height="30" aria-hidden="true" style="vertical-align:-4px">
  <g fill="#e8b64c">
    <rect x="6" y="26" width="35" height="14"/>
    <rect x="7" y="17" width="4" height="23"/><rect x="12" y="14" width="4" height="26"/><rect x="17" y="17" width="4" height="23"/>
    <rect x="26" y="14" width="4" height="26"/><rect x="31" y="9" width="5" height="31"/><rect x="37" y="17" width="4" height="23"/>
  </g>
  <g fill="#f2d488">
    <path d="M7 17 l2 -4 l2 4Z"/><path d="M12 14 l2 -4 l2 4Z"/><path d="M17 17 l2 -4 l2 4Z"/>
    <path d="M26 14 l2 -4 l2 4Z"/><path d="M31 9 l2.5 -5 l2.5 5Z"/><path d="M37 17 l2 -4 l2 4Z"/>
  </g>
  <g stroke="#f2d488" stroke-width="1" stroke-linecap="round">
    <line x1="33.5" y1="4" x2="33.5" y2="1"/><line x1="33.5" y1="2" x2="35.5" y2="1"/>
  </g>
  <g fill="#8a6a1e" opacity=".5">
    <path d="M8 40 v-6 a1.5 1.5 0 0 1 3 0 v6Z"/><path d="M18 40 v-6 a1.5 1.5 0 0 1 3 0 v6Z"/>
    <path d="M25 40 v-6 a1.5 1.5 0 0 1 3 0 v6Z"/><path d="M35 40 v-6 a1.5 1.5 0 0 1 3 0 v6Z"/>
    <path d="M20.5 40 v-8 a2.5 2.5 0 0 1 5 0 v8Z"/>
  </g>
</svg>`;
const VOL_FIG = { ot: '🕎', nt: '✝️', bom: GOLD_PLATES, dc: SLC_TEMPLE };

// A parchment scroll (for The Records) and a robed prophet bust (for The Cast).
const SCROLL = `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" style="vertical-align:-3px">
  <rect x="7" y="7" width="18" height="18" rx="1.5" fill="#ece0c6"/>
  <g stroke="#8a6a1e" stroke-width="1.2" opacity=".5" stroke-linecap="round"><line x1="11" y1="12" x2="21" y2="12"/><line x1="11" y1="16" x2="21" y2="16"/><line x1="11" y1="20" x2="18" y2="20"/></g>
  <path d="M5 9 a2.4 2.4 0 0 1 4.8 0 v14 a2.4 2.4 0 0 1 -4.8 0 a2 2 0 0 0 3 -1.7 v-10.6 a2 2 0 0 0 -3 -1.7Z" fill="#c8a94f"/>
  <path d="M27 9 a2.4 2.4 0 0 0 -4.8 0 v14 a2.4 2.4 0 0 0 4.8 0 a2 2 0 0 1 -3 -1.7 v-10.6 a2 2 0 0 1 3 -1.7Z" fill="#c8a94f"/>
</svg>`;
const PROPHET = `<svg viewBox="0 0 32 34" width="27" height="29" aria-hidden="true" style="vertical-align:-4px">
  <path d="M3 34 q0 -10 13 -10 q13 0 13 10Z" fill="#e8b64c"/>
  <path d="M16 24 l-2.5 8 h5Z" fill="#c99027"/>
  <path d="M8 13 a8 8 0 0 1 16 0 q-2 -6 -8 -6 q-6 0 -8 6Z" fill="#c99027"/>
  <circle cx="16" cy="13" r="6" fill="#f2d488"/>
  <path d="M10.5 13 q0 4 1.5 7 q1.5 4 4 4.5 q2.5 -.5 4 -4.5 q1.5 -3 1.5 -7 q-5.5 3 -11 0Z" fill="#efe6d0"/>
  <circle cx="14" cy="12.5" r=".9" fill="#5a4327"/><circle cx="18" cy="12.5" r=".9" fill="#5a4327"/>
</svg>`;

export async function renderHome(el) {
  el.innerHTML = `
  <div class="wrap">
    <section class="hero">
      <div class="eyebrow">The Standard Works, Illuminated</div>
      <h1>See the story <em>while</em> you read it</h1>
      <p class="lead">Old Testament, New Testament, Book of Mormon, and Doctrine &amp; Covenants — every chapter carries its own
      time, place, voice, and purpose. This reader keeps them all in view: who is speaking and to whom, where you are on
      the map, which record you're reading from, and where you stand in six thousand years of covenant story.</p>
      <p>
        <a class="btn primary" href="#/read/1-nephi/1">Begin reading →</a>
        <a class="btn" href="#/stories">Find a story</a>
        <a class="btn" href="#/timeline">See the whole timeline</a>
      </p>
    </section>
    <section class="feature-grid" style="grid-template-columns:repeat(auto-fit,minmax(230px,1fr))">
      ${VOLUMES.map(v => `
        <a class="feature" href="#/read/${START[v.id]}" style="border-top:3px solid ${v.color}">
          <div class="fig">${VOL_FIG[v.id]}</div>
          <h3 style="color:${v.color}">${v.name}</h3>
          <p>${v.blurb}</p>
          <p style="margin-top:8px;color:var(--ink-faint);font-size:12px">${v.books.length === 1 ? '138 sections' : v.books.length + ' books'} · read →</p>
        </a>`).join('')}
    </section>
    <section class="feature-grid">
      <a class="feature" href="#/read/mosiah/2"><div class="fig">📖</div><h3>The Reader</h3><p>Full text with a living speaker card — as you scroll, the portraits change to show whose voice you're hearing and who they're addressing.</p></a>
      <a class="feature" href="#/timeline"><div class="fig">🕰️</div><h3>Timeline</h3><p>One river of time — Old Testament, Jaredites, Nephites, New Testament, and the Restoration in true chronological order. Step forward and backward through history.</p></a>
      <a class="feature" href="#/map"><div class="fig">🗺️</div><h3>Maps</h3><p>The Holy Land, the Book of Mormon's internal geography, and the American road of the Restoration — every chapter located, every place linked to its chapters.</p></a>
      <a class="feature" href="#/plates"><div class="fig">${SCROLL}</div><h3>The Records</h3><p>Brass, small, and gold plates; Law, Prophets, Gospels, Epistles; five eras of modern revelation — how the library fits together, color-coded everywhere.</p></a>
      <a class="feature" href="#/cast"><div class="fig">${PROPHET}</div><h3>The Cast</h3><p>Nearly two hundred prophets, kings, converts, and adversaries as visual cards — grouped under the chapters where they first appear.</p></a>
      <a class="feature" href="#/allegories"><div class="fig">🌳</div><h3>Allegories</h3><p>Lehi's dream, Zenos's olive tree, and the Liahona — visual walkthroughs with every symbol interpreted from the text itself.</p></a>
    </section>
    <blockquote class="home-verse">
      “For my soul delighteth in the scriptures, and my heart pondereth them.”
      <cite>— 2 Nephi 4:15</cite>
    </blockquote>
  </div>`;
}
