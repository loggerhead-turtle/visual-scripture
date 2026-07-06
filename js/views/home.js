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
const VOL_FIG = { ot: '🕎', nt: '✝️', bom: GOLD_PLATES, dc: '🕊' };

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
      <a class="feature" href="#/timeline"><div class="fig">🕰️</div><h3>Timeline</h3><p>Five bands — Old Testament, Jaredites, Nephites, New Testament, Restoration — with the threads that tie them together. Step forward and backward in time.</p></a>
      <a class="feature" href="#/map"><div class="fig">🗺️</div><h3>Maps</h3><p>The Holy Land, the Book of Mormon's internal geography, and the American road of the Restoration — every chapter located, every place linked to its chapters.</p></a>
      <a class="feature" href="#/plates"><div class="fig">🥇</div><h3>The Records</h3><p>Brass, small, and gold plates; Law, Prophets, Gospels, Epistles; five eras of modern revelation — how the library fits together, color-coded everywhere.</p></a>
      <a class="feature" href="#/cast"><div class="fig">🎭</div><h3>The Cast</h3><p>Nearly two hundred prophets, kings, converts, and adversaries as visual cards — grouped under the chapters where they first appear.</p></a>
      <a class="feature" href="#/allegories"><div class="fig">🌳</div><h3>Allegories</h3><p>Lehi's dream, Zenos's olive tree, and the Liahona — visual walkthroughs with every symbol interpreted from the text itself.</p></a>
    </section>
    <blockquote class="home-verse">
      “For my soul delighteth in the scriptures, and my heart pondereth them.”
      <cite>— 2 Nephi 4:15</cite>
    </blockquote>
  </div>`;
}
