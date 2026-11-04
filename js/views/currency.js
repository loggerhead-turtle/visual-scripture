import { loadCurrency, bookBySlug, esc } from '../data.js';

// Metal gradients for the drawn coins/weights.
const METAL = {
  gold: { a: '#f6dc92', b: '#e0b23a', c: '#9a6f1c', ring: '#8a6212', ink: '#6e4e12' },
  silver: { a: '#f0f1f6', b: '#cfd2dc', c: '#9298a6', ring: '#7d838f', ink: '#5a5f6b' },
  copper: { a: '#e6b483', b: '#c8823f', c: '#8a5223', ring: '#6f4420', ink: '#5c3517' },
};

// A drawn coin (or, for Israel, a weight-stone) scaled by value.
function coin(metal, value, label, kind) {
  const m = METAL[metal] || METAL.silver;
  // sqrt scale with clamps so a lepton and a talent both stay legible
  const r = Math.max(24, Math.min(58, 24 + Math.sqrt(value) * 7));
  const gid = 'cn-' + Math.round(r * 100) + metal + kind;
  const size = 128;
  const cx = size / 2;
  if (kind === 'weight') {
    // a rounded weight-stone / ingot
    const w = Math.max(40, Math.min(104, r * 1.9)), h = w * 0.62;
    const x = cx - w / 2, y = cx - h / 2 + 6;
    return `<svg viewBox="0 0 ${size} ${size}" class="cn"><defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${m.a}"/><stop offset=".55" stop-color="${m.b}"/><stop offset="1" stop-color="${m.c}"/></linearGradient></defs>
      <ellipse cx="${cx}" cy="${size - 22}" rx="${w * 0.55}" ry="7" fill="#0006"/>
      <path d="M ${x + 8} ${y} Q ${cx} ${y - 8} ${x + w - 8} ${y} L ${x + w} ${y + h} Q ${cx} ${y + h + 8} ${x} ${y + h} Z" fill="url(#${gid})" stroke="${m.ring}" stroke-width="2"/>
      <text x="${cx}" y="${y + h / 2 + 5}" text-anchor="middle" font-size="15" font-family="Georgia,serif" fill="${m.ink}" font-weight="700">${esc(label)}</text>
    </svg>`;
  }
  const face = r - 6;
  return `<svg viewBox="0 0 ${size} ${size}" class="cn"><defs>
    <radialGradient id="${gid}" cx="38%" cy="34%" r="72%">
      <stop offset="0" stop-color="${m.a}"/><stop offset=".6" stop-color="${m.b}"/><stop offset="1" stop-color="${m.c}"/></radialGradient></defs>
    <ellipse cx="${cx}" cy="${cx + r - 2}" rx="${r * 0.82}" ry="6" fill="#0006"/>
    <circle cx="${cx}" cy="${cx}" r="${r}" fill="url(#${gid})" stroke="${m.ring}" stroke-width="2.5"/>
    <circle cx="${cx}" cy="${cx}" r="${face}" fill="none" stroke="${m.ring}" stroke-width="1.4" opacity=".7"/>
    ${dots(cx, face, m.ring)}
    <text x="${cx}" y="${cx + 5.5}" text-anchor="middle" font-size="${r > 40 ? 16 : 13}" font-family="Georgia,serif" fill="${m.ink}" font-weight="700">${esc(label)}</text>
  </svg>`;
}
function dots(cx, r, col) {
  let out = '';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    out += `<circle cx="${(cx + Math.cos(a) * (r - 3)).toFixed(1)}" cy="${(cx + Math.sin(a) * (r - 3)).toFixed(1)}" r="1" fill="${col}" opacity=".5"/>`;
  }
  return out;
}

const fmtVal = (v, base) => {
  if (v === 1) return '1 ' + base;
  if (v < 1) {
    const inv = 1 / v;
    if (Math.abs(inv - Math.round(inv)) < 0.02) return '1⁄' + Math.round(inv) + ' ' + base;
    return v + ' ' + base;
  }
  return (Math.round(v * 100) / 100) + ' × ' + base;
};

export async function renderCurrency(el, params) {
  const data = await loadCurrency();
  if (!data || !data.systems) {
    el.innerHTML = '<div class="wrap"><h1 class="page-title">Money of the Scriptures</h1><p class="section-intro">Currency data is still being minted.</p></div>';
    return;
  }
  const systems = data.systems;
  const baseOf = { nephite: 'senum', israel: 'shekel', roman: 'denarius' };

  let sel = params.get('s');
  if (!systems.some(s => s.id === sel)) sel = systems[0].id;

  const tabs = systems.map(s =>
    `<button class="cur-tab" data-sys="${s.id}" style="--c:${s.color}">${esc(s.name)}</button>`).join('');

  el.innerHTML = `
  <div class="wrap">
    <div class="eyebrow">What things were worth</div>
    <h1 class="page-title">Money of the Scriptures</h1>
    <p class="cur-intro">Coins, weighed silver, and grain measures — reckoned by place and time. The only complete monetary
    system in scripture is the Nephite one that Mormon spells out in <strong>Alma 11</strong>, where a single senine of gold
    bought a measure of barley and paid a judge for a day.</p>
    <div class="cur-tabs">${tabs}</div>
    <div id="cur-body"></div>
    <p class="cur-note">${esc(data.note || '')}</p>
  </div>`;

  const body = el.querySelector('#cur-body');

  const render = id => {
    const s = systems.find(x => x.id === id) || systems[0];
    const base = baseOf[s.id] || 'unit';
    el.querySelectorAll('.cur-tab').forEach(t => t.classList.toggle('on', t.dataset.sys === s.id));
    el.querySelector('.wrap').style.setProperty('--c', s.color);
    const bk = bookBySlug[s.ref.slug];
    const bookName = s.ref.slug === 'dc' ? 'D&amp;C' : (bk ? esc(bk.name) : esc(s.ref.slug));

    const groups = s.groups.map(g => `
      <div class="cur-group" style="--c:${s.color}">
        <h3>${esc(g.label)}</h3>
        <div class="cur-grid">
          ${g.items.map(it => `
            <div class="cur-coin">
              ${coin(g.metal, it.value, it.name.split(' ')[0].slice(0, 7), s.id === 'israel' ? 'weight' : 'coin')}
              <h4>${esc(it.name)}</h4>
              <div class="cur-worth">${esc(fmtVal(it.value, base))}</div>
              <p>${esc(it.note)}</p>
              <div class="cur-ref">${esc(it.ref)}</div>
            </div>`).join('')}
        </div>
      </div>`).join('');

    const facts = (s.facts || []).map(f => `
      <div class="cur-fact" style="--c:${s.color}">
        <h4>${esc(f.t)}</h4><p>${esc(f.d)}</p><div class="cur-ref">${esc(f.ref)}</div>
      </div>`).join('');

    body.innerHTML = `
      <div class="cur-head" style="--c:${s.color}">
        <h2 style="color:${s.color}">${esc(s.name)}</h2>
        <div class="cur-where">${esc(s.place)} · ${esc(s.era)}</div>
      </div>
      <p class="cur-lead">${esc(s.intro)}</p>
      <div class="cur-anchor" style="--c:${s.color}"><span class="eq">⚖</span><span>${esc(s.anchor)}</span></div>
      <div class="cur-read"><a class="btn primary" href="#/read/${s.ref.slug}/${s.ref.c}">Read ${bookName} ${s.ref.c} →</a></div>
      ${groups}
      ${facts ? `<div class="cur-facts">${facts}</div>` : ''}`;
    history.replaceState(null, '', '#/currency?s=' + s.id);
  };

  el.querySelector('.cur-tabs').addEventListener('click', e => {
    const t = e.target.closest('[data-sys]');
    if (t) render(t.dataset.sys);
  });
  render(sel);
}
