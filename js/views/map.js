import { loadPlaces, loadPlacesHolyLand, loadPlacesUSA, allMeta, bookBySlug, esc } from '../data.js';

const KIND_STYLE = {
  capital: { r: 9, fill: '#e8b64c', label: 'Capital / major center' },
  city: { r: 6.5, fill: '#d9c08a', label: 'City' },
  land: { r: 6.5, fill: '#9fb886', label: 'Land / region' },
  water: { r: 6.5, fill: '#6fb3c9', label: 'Waters' },
  feature: { r: 6.5, fill: '#b98aa6', label: 'Geographic feature' },
  camp: { r: 6, fill: '#c8b17e', label: 'Encampment' },
};

const marker = p => {
  const st = KIND_STYLE[p.kind] || KIND_STYLE.city;
  return `<g class="map-marker" data-id="${p.id}" transform="translate(${p.x != null ? p.x : p.ox},${p.y != null ? p.y : p.oy})">
    <circle r="${st.r}" fill="${st.fill}" stroke="#14110c" stroke-width="1.5"/>
    ${p.kind === 'capital' ? `<circle r="${st.r + 4}" fill="none" stroke="${st.fill}" stroke-width="1.2" opacity=".6"/>` : ''}
    <text x="0" y="${-st.r - 5}" fill="#ece4d2" font-size="13" text-anchor="middle" font-family="Georgia,serif">${esc(p.name)}</text>
  </g>`;
};

export async function renderMap(el, params) {
  const [bom, hl, usa, metas] = await Promise.all([loadPlaces(), loadPlacesHolyLand(), loadPlacesUSA(), allMeta()]);

  const chaptersAt = {};
  for (const m of metas) for (const ch of m.chapters) {
    if (ch.place) (chaptersAt[ch.place] = chaptersAt[ch.place] || []).push({ slug: m.slug, book: m.book, c: ch.c });
  }

  const MAPS = [
    { id: 'holy-land', name: '🕎 The Holy Land', data: hl, render: () => holyLandSVG(hl) },
    { id: 'internal', name: '📜 Book of Mormon (Internal)', data: bom, render: () => internalSVG(bom) },
    { id: 'usa', name: '🇺🇸 The Restoration', data: usa, render: () => usaSVG(usa) },
  ].filter(m => m.data);

  let mapId = params.get('m');
  const pre = params.get('place');
  if (!mapId && pre) {
    const owner = MAPS.find(m => (m.data.places || []).some(p => p.id === pre));
    mapId = owner ? owner.id : 'holy-land';
  }
  if (!MAPS.some(m => m.id === mapId)) mapId = 'holy-land';

  el.innerHTML = `
  <div class="wrap">
    <div class="eyebrow">Where the story happens</div>
    <h1 class="page-title">Maps of the Scriptures</h1>
    <p class="section-intro">Three worlds, one story. The Holy Land carries the Old and New Testaments; the Book of Mormon map is an
    <em>internal</em> reconstruction built purely from the text's own distances and directions (deliberately not the Americas);
    and the Restoration unfolds across the American frontier.</p>
    <div class="tl-toolbar" id="map-tabs">
      ${MAPS.map(m => `<button class="btn" data-map="${m.id}">${m.name}</button>`).join('')}
    </div>
    <div class="map-layout">
      <div id="map-panel"></div>
      <aside class="map-side">
        <div class="place-card" id="place-card"><h3>Select a place</h3><p>Click any marker to see what happened there — and jump into the chapters.</p></div>
      </aside>
    </div>
  </div>`;

  const panel = el.querySelector('#map-panel');
  const card = el.querySelector('#place-card');
  const allPlaces = MAPS.reduce((a, m) => a.concat(m.data.places || []), []);

  const select = id => {
    const p = allPlaces.find(x => x.id === id);
    if (!p) return;
    el.querySelectorAll('.map-marker').forEach(m => m.classList.toggle('sel', m.dataset.id === id));
    const chs = (chaptersAt[id] || []);
    const shown = chs.slice(0, 14);
    card.innerHTML = `
      <h3>${esc(p.name)}</h3>
      <div class="kind">${(KIND_STYLE[p.kind] || {}).label || p.kind}</div>
      <p>${esc(p.desc)}</p>
      ${shown.length ? `<h4 style="font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-faint);margin:14px 0 4px">Read what happened here</h4>
      <div class="chapters">${shown.map(r => `<a class="pill link" href="#/read/${r.slug}/${r.c}">${bookBySlug[r.slug].name} ${r.c}</a>`).join('')}${chs.length > shown.length ? `<span class="pill">+${chs.length - shown.length} more</span>` : ''}</div>` : ''}`;
  };

  const show = id => {
    mapId = id;
    const m = MAPS.find(x => x.id === id);
    el.querySelectorAll('#map-tabs .btn').forEach(b => b.style.borderColor = b.dataset.map === id ? 'var(--gold)' : '');
    panel.innerHTML = m.render() + `<p class="map-note">${esc(m.data.note || '')}</p>`;
  };

  el.querySelector('#map-tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-map]');
    if (b) show(b.dataset.map);
  });
  el.addEventListener('click', e => {
    const m = e.target.closest('.map-marker');
    if (m) select(m.dataset.id);
  });

  show(mapId);
  if (pre) select(pre);
}

// ---------- Book of Mormon internal map (with Old-World trail strip) ----------
function internalSVG(data) {
  const newWorld = data.places.filter(p => !p.oldWorld);
  const oldWorld = data.places.filter(p => p.oldWorld);
  const markers = newWorld.map(marker).join('');
  const owMarkers = oldWorld.map(marker).join('');
  const owPath = 'M 60 60 C 140 95 150 120 185 150 C 230 195 260 225 305 258 C 360 290 430 265 520 232';
  return `
  <div class="map-stage">
    <svg viewBox="0 0 1000 1400">
      <defs>
        <linearGradient id="sea" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#16222b"/><stop offset="1" stop-color="#101a21"/></linearGradient>
        <linearGradient id="landg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2c1d"/><stop offset=".55" stop-color="#252718"/><stop offset="1" stop-color="#2b2416"/></linearGradient>
      </defs>
      <rect width="1000" height="1400" fill="url(#sea)"/>
      <text x="80" y="700" fill="#3f5766" font-size="26" font-family="Georgia,serif" font-style="italic" transform="rotate(-90 80 700)">West Sea</text>
      <text x="945" y="700" fill="#3f5766" font-size="26" font-family="Georgia,serif" font-style="italic" transform="rotate(90 945 700)">East Sea</text>
      <text x="500" y="55" fill="#3f5766" font-size="22" font-family="Georgia,serif" font-style="italic" text-anchor="middle">Sea North</text>
      <text x="500" y="1370" fill="#3f5766" font-size="22" font-family="Georgia,serif" font-style="italic" text-anchor="middle">Sea South</text>
      <path d="M 300 90 C 190 120 150 200 165 280 C 175 330 240 335 300 355 C 350 372 390 375 405 330 L 430 305 C 445 345 460 360 470 385 C 430 420 330 430 250 470 C 175 508 140 570 135 660 C 130 760 150 860 185 950 C 215 1030 200 1090 230 1170 C 260 1250 330 1310 430 1330 C 540 1350 680 1345 770 1300 C 850 1258 880 1170 870 1080 C 862 1005 900 950 895 870 C 890 795 855 745 860 680 C 866 610 845 540 800 500 C 760 465 700 450 640 430 C 590 413 545 405 530 380 L 545 330 C 570 290 640 280 700 255 C 770 225 800 160 760 110 C 710 55 560 60 470 70 C 400 78 350 78 300 90 Z" fill="url(#landg)" stroke="#3f3a28" stroke-width="3"/>
      <ellipse cx="480" cy="1140" rx="290" ry="150" fill="#33301c" opacity=".55"/>
      <path d="M 165 985 C 350 940 650 940 875 985" stroke="#4a4028" stroke-width="26" fill="none" opacity=".65" stroke-linecap="round"/>
      <text x="500" y="1000" fill="#8a8069" font-size="13" text-anchor="middle" font-style="italic">narrow strip of wilderness</text>
      <path d="M 540 930 C 520 860 470 820 480 760 C 490 700 460 640 470 580 C 478 530 455 490 460 445" stroke="#4f7d92" stroke-width="7" fill="none" stroke-linecap="round" opacity=".9"/>
      <ellipse cx="300" cy="1198" rx="26" ry="15" fill="#4f7d92" opacity=".9"/>
      <path d="M 415 318 L 540 348" stroke="#b98aa6" stroke-width="2" stroke-dasharray="5 5" opacity=".8"/>
      <text x="450" y="215" fill="#77704f" font-size="24" font-family="Georgia,serif" font-style="italic" text-anchor="middle">Land Northward</text>
      <text x="640" y="650" fill="#77704f" font-size="24" font-family="Georgia,serif" font-style="italic" text-anchor="middle" opacity=".8">Land of Zarahemla</text>
      <text x="490" y="1105" fill="#77704f" font-size="24" font-family="Georgia,serif" font-style="italic" text-anchor="middle" opacity=".8">Land of Nephi</text>
      ${markers}
    </svg>
  </div>
  <div class="oldworld-strip map-stage">
    <svg viewBox="0 0 600 320">
      <rect width="600" height="320" fill="#181510"/>
      <text x="18" y="28" fill="#8a8069" font-size="14" font-family="Georgia,serif" font-style="italic">The Old-World Trail — Jerusalem to Bountiful, c. 600–589 BC</text>
      <path d="${owPath}" stroke="#5a4f3a" stroke-width="2.5" stroke-dasharray="7 6" fill="none"/>
      <text x="555" y="255" fill="#3f5766" font-size="15" font-family="Georgia,serif" font-style="italic" text-anchor="end">Irreantum — “many waters”</text>
      <path d="M 540 245 C 560 265 570 290 575 315" stroke="#3f5766" stroke-width="14" fill="none" opacity=".5" stroke-linecap="round"/>
      ${owMarkers}
    </svg>
  </div>`;
}

// ---------- Holy Land ----------
function holyLandSVG(data) {
  const main = data.places.filter(p => !p.strip);
  const strip = data.places.filter(p => p.strip);
  return `
  <div class="oldworld-strip map-stage" style="margin:0 0 16px">
    <svg viewBox="0 0 1000 150">
      <rect width="1000" height="150" fill="#181510"/>
      <text x="16" y="24" fill="#8a8069" font-size="13" font-family="Georgia,serif" font-style="italic">The Wider World — empire, exile &amp; epistle</text>
      <path d="M 80 60 C 200 40 300 70 390 60 C 480 50 520 85 545 75 C 640 70 740 60 870 90" stroke="#5a4f3a" stroke-width="2" stroke-dasharray="6 6" fill="none" opacity=".6"/>
      ${strip.map(marker).join('')}
    </svg>
  </div>
  <div class="map-stage">
    <svg viewBox="0 150 1000 1050">
      <defs>
        <linearGradient id="hlsea" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#14202a"/><stop offset="1" stop-color="#182734"/></linearGradient>
        <linearGradient id="hlland" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2c1d"/><stop offset="1" stop-color="#2e2517"/></linearGradient>
      </defs>
      <rect x="0" y="150" width="1000" height="1050" fill="url(#hlsea)"/>
      <text x="180" y="600" fill="#3f5766" font-size="24" font-family="Georgia,serif" font-style="italic" transform="rotate(-72 180 600)">The Great Sea</text>
      <!-- landmass -->
      <path d="M 1000 170 L 560 170 C 500 200 470 260 455 330 C 442 390 430 420 400 470
               C 375 515 360 570 355 640 C 350 700 330 740 310 790
               C 290 840 270 880 250 930 C 210 1010 140 1010 60 1050
               L 0 1080 L 0 1200 L 1000 1200 Z" fill="url(#hlland)" stroke="#3f3a28" stroke-width="3"/>
      <!-- Egypt & Nile -->
      <path d="M 120 1200 C 130 1130 110 1080 95 1040" stroke="#4f7d92" stroke-width="7" fill="none" opacity=".85" stroke-linecap="round"/>
      <text x="120" y="980" fill="#77704f" font-size="22" font-family="Georgia,serif" font-style="italic">Egypt</text>
      <!-- Sinai desert -->
      <path d="M 300 1160 L 420 1080 L 520 1170 Z" fill="#33301c" opacity=".6"/>
      <text x="470" y="1180" fill="#77704f" font-size="16" font-family="Georgia,serif" font-style="italic">Sinai</text>
      <!-- Jordan river & lakes -->
      <ellipse cx="660" cy="370" rx="26" ry="34" fill="#4f7d92" opacity=".95"/>
      <path d="M 660 404 C 655 470 685 520 678 590 C 672 650 660 700 655 760" stroke="#4f7d92" stroke-width="6" fill="none" opacity=".9"/>
      <ellipse cx="650" cy="815" rx="24" ry="55" fill="#43606f" opacity=".95"/>
      <!-- region labels -->
      <text x="580" y="345" fill="#77704f" font-size="20" font-family="Georgia,serif" font-style="italic" text-anchor="middle">Galilee</text>
      <text x="520" y="565" fill="#77704f" font-size="20" font-family="Georgia,serif" font-style="italic" text-anchor="middle">Samaria</text>
      <text x="500" y="760" fill="#77704f" font-size="20" font-family="Georgia,serif" font-style="italic" text-anchor="middle">Judea</text>
      <text x="810" y="500" fill="#77704f" font-size="18" font-family="Georgia,serif" font-style="italic" text-anchor="middle" opacity=".8">Wilderness &amp; the East</text>
      <!-- exodus trail -->
      <path d="M 130 1060 C 220 1110 260 1120 300 1118 C 360 1115 400 1140 430 1128 C 470 1110 480 1050 480 1020 C 480 970 480 930 480 895" stroke="#8a6f42" stroke-width="2.5" stroke-dasharray="7 6" fill="none" opacity=".7"/>
      <text x="330" y="1155" fill="#8a8069" font-size="12" font-style="italic" text-anchor="middle">the way of the Exodus</text>
      ${main.map(marker).join('')}
    </svg>
  </div>`;
}

// ---------- Restoration USA ----------
function usaSVG(data) {
  const trail = (data.trail || []).map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
  return `
  <div class="map-stage">
    <svg viewBox="0 0 1000 620">
      <defs>
        <linearGradient id="usland" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26281a"/><stop offset="1" stop-color="#2b2317"/></linearGradient>
      </defs>
      <rect width="1000" height="620" fill="#14202a"/>
      <!-- continental outline (stylized): atlantic coast right, gulf bottom -->
      <path d="M 0 40 L 870 40 C 900 90 880 120 905 160 C 930 200 900 260 915 300 C 930 350 880 420 850 470 C 820 520 760 540 700 560 C 600 590 480 570 380 580 C 260 590 150 570 60 580 L 0 585 Z" fill="url(#usland)" stroke="#3f3a28" stroke-width="3"/>
      <!-- great lakes -->
      <path d="M 560 120 C 600 100 640 110 660 140 C 640 160 600 165 575 150 Z" fill="#4f7d92" opacity=".9"/>
      <path d="M 520 170 C 545 150 585 165 600 185 C 580 205 540 205 520 190 Z" fill="#4f7d92" opacity=".85"/>
      <ellipse cx="470" cy="130" rx="55" ry="22" fill="#4f7d92" opacity=".8"/>
      <text x="545" y="95" fill="#3f5766" font-size="16" font-family="Georgia,serif" font-style="italic">The Great Lakes</text>
      <!-- mississippi -->
      <path d="M 400 170 C 380 260 360 320 345 380 C 330 440 340 500 330 560" stroke="#4f7d92" stroke-width="6" fill="none" opacity=".85" stroke-linecap="round"/>
      <text x="392" y="470" fill="#3f5766" font-size="14" font-family="Georgia,serif" font-style="italic" transform="rotate(80 392 470)">Mississippi</text>
      <!-- rockies -->
      ${[[70,250],[95,290],[60,340],[100,380],[75,430]].map(([x, y]) => `<path d="M ${x - 22} ${y + 16} L ${x} ${y - 18} L ${x + 22} ${y + 16}" fill="none" stroke="#4a4028" stroke-width="3" stroke-linejoin="round"/>`).join('')}
      <text x="85" y="480" fill="#77704f" font-size="16" font-family="Georgia,serif" font-style="italic" text-anchor="middle">Rocky Mountains</text>
      <text x="930" y="330" fill="#3f5766" font-size="18" font-family="Georgia,serif" font-style="italic" transform="rotate(90 930 330)">Atlantic</text>
      <!-- trail of the restoration -->
      <path d="${trail}" stroke="#8a6f42" stroke-width="2.5" stroke-dasharray="7 6" fill="none" opacity=".75"/>
      <text x="480" y="250" fill="#8a8069" font-size="12" font-style="italic" text-anchor="middle">the road of the gathering — New York → Ohio → Missouri → Illinois → the Valley</text>
      ${data.places.map(marker).join('')}
    </svg>
  </div>`;
}
