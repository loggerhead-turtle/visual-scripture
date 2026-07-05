import { loadPlaces, allMeta, bookBySlug, esc } from '../data.js';

const KIND_STYLE = {
  capital: { r: 9, fill: '#e8b64c', label: 'Capital / major center' },
  city: { r: 6.5, fill: '#d9c08a', label: 'City' },
  land: { r: 6.5, fill: '#9fb886', label: 'Land / region' },
  water: { r: 6.5, fill: '#6fb3c9', label: 'Waters' },
  feature: { r: 6.5, fill: '#b98aa6', label: 'Geographic feature' },
  camp: { r: 6, fill: '#c8b17e', label: 'Encampment' },
};

export async function renderMap(el, params) {
  const [data, metas] = await Promise.all([loadPlaces(), allMeta()]);
  // index: placeId -> chapters
  const chaptersAt = {};
  for (const m of metas) for (const ch of m.chapters) {
    if (ch.place) (chaptersAt[ch.place] = chaptersAt[ch.place] || []).push({ slug: m.slug, book: m.book, c: ch.c });
  }

  const newWorld = data.places.filter(p => !p.oldWorld);
  const oldWorld = data.places.filter(p => p.oldWorld);

  const markers = newWorld.map(p => {
    const st = KIND_STYLE[p.kind] || KIND_STYLE.city;
    return `<g class="map-marker" data-id="${p.id}" transform="translate(${p.x},${p.y})">
      <circle r="${st.r}" fill="${st.fill}" stroke="#14110c" stroke-width="1.5"/>
      ${p.kind === 'capital' ? `<circle r="${st.r + 4}" fill="none" stroke="${st.fill}" stroke-width="1.2" opacity=".6"/>` : ''}
      <text x="0" y="${-st.r - 5}" fill="#ece4d2" font-size="13" text-anchor="middle" font-family="Georgia,serif">${esc(p.name)}</text>
    </g>`;
  }).join('');

  const owPath = 'M 60 60 C 140 95 150 120 185 150 C 230 195 260 225 305 258 C 360 290 430 265 520 232';
  const owMarkers = oldWorld.map(p => `
    <g class="map-marker" data-id="${p.id}" transform="translate(${p.ox},${p.oy})">
      <circle r="6" fill="#c8b17e" stroke="#14110c" stroke-width="1.5"/>
      <text x="0" y="-11" fill="#ece4d2" font-size="12" text-anchor="middle" font-family="Georgia,serif">${esc(p.name)}</text>
    </g>`).join('');

  el.innerHTML = `
  <div class="wrap">
    <div class="eyebrow">Where the story happens</div>
    <h1 class="page-title">The Internal Map</h1>
    <p class="section-intro">${esc(data.note)}</p>
    <div class="map-layout">
      <div>
        <div class="map-stage">
          <svg viewBox="0 0 1000 1400" id="nw-map">
            <defs>
              <linearGradient id="sea" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#16222b"/><stop offset="1" stop-color="#101a21"/>
              </linearGradient>
              <linearGradient id="landg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#2a2c1d"/><stop offset=".55" stop-color="#252718"/><stop offset="1" stop-color="#2b2416"/>
              </linearGradient>
            </defs>
            <rect width="1000" height="1400" fill="url(#sea)"/>
            <text x="80" y="700" fill="#3f5766" font-size="26" font-family="Georgia,serif" font-style="italic" transform="rotate(-90 80 700)">West Sea</text>
            <text x="945" y="700" fill="#3f5766" font-size="26" font-family="Georgia,serif" font-style="italic" transform="rotate(90 945 700)">East Sea</text>
            <text x="500" y="55" fill="#3f5766" font-size="22" font-family="Georgia,serif" font-style="italic" text-anchor="middle">Sea North</text>
            <text x="500" y="1370" fill="#3f5766" font-size="22" font-family="Georgia,serif" font-style="italic" text-anchor="middle">Sea South</text>
            <!-- landmass: land northward, narrow neck, land southward -->
            <path d="M 300 90
                     C 190 120 150 200 165 280
                     C 175 330 240 335 300 355
                     C 350 372 390 375 405 330
                     L 430 305
                     C 445 345 460 360 470 385
                     C 430 420 330 430 250 470
                     C 175 508 140 570 135 660
                     C 130 760 150 860 185 950
                     C 215 1030 200 1090 230 1170
                     C 260 1250 330 1310 430 1330
                     C 540 1350 680 1345 770 1300
                     C 850 1258 880 1170 870 1080
                     C 862 1005 900 950 895 870
                     C 890 795 855 745 860 680
                     C 866 610 845 540 800 500
                     C 760 465 700 450 640 430
                     C 590 413 545 405 530 380
                     L 545 330
                     C 570 290 640 280 700 255
                     C 770 225 800 160 760 110
                     C 710 55 560 60 470 70
                     C 400 78 350 78 300 90 Z"
                  fill="url(#landg)" stroke="#3f3a28" stroke-width="3"/>
            <!-- highlands of Nephi -->
            <ellipse cx="480" cy="1140" rx="290" ry="150" fill="#33301c" opacity=".55"/>
            <!-- narrow strip of wilderness -->
            <path d="M 165 985 C 350 940 650 940 875 985" stroke="#4a4028" stroke-width="26" fill="none" opacity=".65" stroke-linecap="round"/>
            <text x="500" y="1000" fill="#8a8069" font-size="13" text-anchor="middle" font-style="italic">narrow strip of wilderness</text>
            <!-- river sidon -->
            <path d="M 540 930 C 520 860 470 820 480 760 C 490 700 460 640 470 580 C 478 530 455 490 460 445"
                  stroke="#4f7d92" stroke-width="7" fill="none" stroke-linecap="round" opacity=".9"/>
            <!-- waters of mormon -->
            <ellipse cx="300" cy="1198" rx="26" ry="15" fill="#4f7d92" opacity=".9"/>
            <!-- narrow neck annotation -->
            <path d="M 415 318 L 540 348" stroke="#b98aa6" stroke-width="2" stroke-dasharray="5 5" opacity=".8"/>
            <!-- region labels -->
            <text x="450" y="215" fill="#77704f" font-size="24" font-family="Georgia,serif" font-style="italic" text-anchor="middle">Land Northward</text>
            <text x="640" y="650" fill="#77704f" font-size="24" font-family="Georgia,serif" font-style="italic" text-anchor="middle" opacity=".8">Land of Zarahemla</text>
            <text x="490" y="1105" fill="#77704f" font-size="24" font-family="Georgia,serif" font-style="italic" text-anchor="middle" opacity=".8">Land of Nephi</text>
            ${markers}
          </svg>
        </div>
        <div class="oldworld-strip map-stage">
          <svg viewBox="0 0 600 320" id="ow-map">
            <rect width="600" height="320" fill="#181510"/>
            <text x="18" y="28" fill="#8a8069" font-size="14" font-family="Georgia,serif" font-style="italic">The Old-World Trail — Jerusalem to Bountiful, c. 600–589 BC</text>
            <path d="${owPath}" stroke="#5a4f3a" stroke-width="2.5" stroke-dasharray="7 6" fill="none"/>
            <text x="555" y="255" fill="#3f5766" font-size="15" font-family="Georgia,serif" font-style="italic" text-anchor="end">Irreantum — “many waters”</text>
            <path d="M 540 245 C 560 265 570 290 575 315" stroke="#3f5766" stroke-width="14" fill="none" opacity=".5" stroke-linecap="round"/>
            ${owMarkers}
          </svg>
        </div>
        <p class="map-note">Marker positions are relative, derived from travel times and directions in the text — “up” to Nephi, “down” to Zarahemla, a day-and-a-half across the narrow neck.</p>
      </div>
      <aside class="map-side">
        <div class="place-card" id="place-card"><h3>Select a place</h3><p>Click any marker to see what happened there — and jump into the chapters.</p></div>
      </aside>
    </div>
  </div>`;

  const card = el.querySelector('#place-card');
  const select = id => {
    const p = data.places.find(x => x.id === id);
    if (!p) return;
    el.querySelectorAll('.map-marker').forEach(m => m.classList.toggle('sel', m.dataset.id === id));
    const chs = (chaptersAt[id] || []);
    const shown = chs.slice(0, 14);
    card.innerHTML = `
      <h3>${esc(p.name)}</h3>
      <div class="kind">${(KIND_STYLE[p.kind] || {}).label || p.kind}${p.oldWorld ? ' · Old World' : ''}</div>
      <p>${esc(p.desc)}</p>
      ${shown.length ? `<h4 style="font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-faint);margin:14px 0 4px">Read what happened here</h4>
      <div class="chapters">${shown.map(r => `<a class="pill link" href="#/read/${r.slug}/${r.c}">${bookBySlug[r.slug].name} ${r.c}</a>`).join('')}${chs.length > shown.length ? `<span class="pill">+${chs.length - shown.length} more</span>` : ''}</div>` : ''}`;
  };
  el.addEventListener('click', e => {
    const m = e.target.closest('.map-marker');
    if (m) select(m.dataset.id);
  });
  const pre = params.get('place');
  if (pre) {
    select(pre);
    card.scrollIntoView({ block: 'nearest' });
  }
}
