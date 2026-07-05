export async function renderHome(el) {
  el.innerHTML = `
  <div class="wrap">
    <section class="hero">
      <div class="eyebrow">The Book of Mormon, Illuminated</div>
      <h1>See the story <em>while</em> you read it</h1>
      <p class="lead">Every chapter carries its own time, place, voice, and purpose. This reader keeps them all in view —
      who is speaking and to whom, where you are on the internal map, which plates you're reading from,
      and where you stand in a thousand-year story.</p>
      <p>
        <a class="btn primary" href="#/read/1-nephi/1">Begin at 1 Nephi 1 &nbsp;→</a>
        <a class="btn" href="#/stories">Find a story</a>
      </p>
    </section>
    <section class="feature-grid">
      <a class="feature" href="#/read/1-nephi/1"><div class="fig">📖</div><h3>The Reader</h3><p>Full scripture text with a living speaker card — as you scroll, the portraits change to show whose voice you're hearing and who they're addressing.</p></a>
      <a class="feature" href="#/timeline"><div class="fig">🕰️</div><h3>Timeline</h3><p>Pan and zoom through both civilizations — Jaredite and Lehite — and jump from any event straight into the text.</p></a>
      <a class="feature" href="#/map"><div class="fig">🗺️</div><h3>Internal Map</h3><p>A scholarly relative-geography map built purely from the text's own distances and directions — Zarahemla, the narrow neck, the land of Nephi.</p></a>
      <a class="feature" href="#/plates"><div class="fig">🥇</div><h3>The Plates</h3><p>Brass, small, large, twenty-four, and gold: how five records flowed into one book, and which pages you're reading from at any moment.</p></a>
      <a class="feature" href="#/cast"><div class="fig">🎭</div><h3>The Cast</h3><p>Every named voice as a visual card — prophets, kings, converts, and adversaries — grouped under the chapters where they appear.</p></a>
      <a class="feature" href="#/allegories"><div class="fig">🌳</div><h3>Allegories</h3><p>Lehi's dream, Zenos's olive tree, and the Liahona — visual walkthroughs with every symbol interpreted from the text itself.</p></a>
    </section>
    <blockquote class="home-verse">
      “And now, I, Mormon … make a record of the things which I have both seen and heard, and call it the Book of Mormon.”
      <cite>— Title-page tradition; see Words of Mormon</cite>
    </blockquote>
  </div>`;
}
