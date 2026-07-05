// Parametric SVG portrait engine.
// Every character card is drawn from a small set of appearance parameters in
// characters.json, giving the whole site a consistent "illuminated deck" style.
// If data/art-manifest.json maps a character id to an image URL (e.g. official
// art you are licensed to use), that image is shown instead of the drawing.

let artManifest = {};
export function setArtManifest(m) { artManifest = m || {}; }

const shade = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, c + amt));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

function emblemPath(name, accent) {
  const a = accent;
  switch (name) {
    case 'plates': return `<rect x="-9" y="-6" width="15" height="12" rx="1.5" fill="none" stroke="${a}" stroke-width="2"/><rect x="-6" y="-9" width="15" height="12" rx="1.5" fill="#00000055" stroke="${a}" stroke-width="2"/><line x1="-3" y1="-5.5" x2="6" y2="-5.5" stroke="${a}" stroke-width="1.4"/><line x1="-3" y1="-2" x2="6" y2="-2" stroke="${a}" stroke-width="1.4"/>`;
    case 'sword': return `<g stroke="${a}" stroke-width="2.2" stroke-linecap="round"><line x1="0" y1="-10" x2="0" y2="6"/><line x1="-5" y1="2" x2="5" y2="2"/></g><circle cx="0" cy="9" r="1.8" fill="${a}"/>`;
    case 'bow': return `<path d="M -6 -9 Q 8 0 -6 9" fill="none" stroke="${a}" stroke-width="2.2"/><line x1="-6" y1="-9" x2="-6" y2="9" stroke="${a}" stroke-width="1.3"/>`;
    case 'tree': return `<line x1="0" y1="3" x2="0" y2="10" stroke="${a}" stroke-width="2"/><circle cx="0" cy="-3" r="7" fill="none" stroke="${a}" stroke-width="2"/><circle cx="0" cy="-3" r="2.4" fill="${a}"/>`;
    case 'star': return `<path d="M 0 -10 L 2.6 -3.2 9.5 -3.2 4 1.2 6.2 8.5 0 4.2 -6.2 8.5 -4 1.2 -9.5 -3.2 -2.6 -3.2 Z" fill="${a}"/>`;
    case 'tower': return `<rect x="-5" y="-4" width="10" height="14" fill="none" stroke="${a}" stroke-width="2"/><path d="M -7 -4 L -7 -9 L -3 -6.5 L 0 -10 L 3 -6.5 L 7 -9 L 7 -4 Z" fill="${a}"/>`;
    case 'banner': return `<line x1="-6" y1="-10" x2="-6" y2="10" stroke="${a}" stroke-width="2"/><path d="M -6 -9 L 9 -6.5 L -6 -1.5 Z" fill="${a}"/>`;
    case 'olive': return `<path d="M -8 8 Q 0 -2 8 -8" fill="none" stroke="${a}" stroke-width="2"/><ellipse cx="-2" cy="1" rx="3" ry="1.8" fill="${a}" transform="rotate(-40 -2 1)"/><ellipse cx="3" cy="-4" rx="3" ry="1.8" fill="${a}" transform="rotate(-40 3 -4)"/>`;
    case 'stones': return `<circle cx="-4" cy="3" r="4" fill="${a}"/><circle cx="4" cy="-1" r="4" fill="${a}" opacity=".75"/><circle cx="-1" cy="-6" r="3" fill="${a}" opacity=".55"/>`;
    case 'liahona': return `<circle cx="0" cy="0" r="8" fill="none" stroke="${a}" stroke-width="2"/><line x1="0" y1="0" x2="5" y2="-5" stroke="${a}" stroke-width="2"/><line x1="0" y1="0" x2="-3" y2="5" stroke="${a}" stroke-width="1.4"/><circle cx="0" cy="0" r="1.6" fill="${a}"/>`;
    case 'scroll': return `<path d="M -7 -8 Q -3 -10 0 -8 L 0 8 Q -3 6 -7 8 Z" fill="none" stroke="${a}" stroke-width="1.8"/><path d="M 0 -8 Q 3 -10 7 -8 L 7 8 Q 3 6 0 8" fill="none" stroke="${a}" stroke-width="1.8"/>`;
    case 'shield': return `<path d="M 0 -9 C 5 -7 8 -7 8 -4 C 8 3 4 8 0 10 C -4 8 -8 3 -8 -4 C -8 -7 -5 -7 0 -9 Z" fill="none" stroke="${a}" stroke-width="2"/><circle cx="0" cy="-1" r="2.4" fill="${a}"/>`;
    case 'dove': return `<path d="M -8 2 Q -2 -6 8 -4 Q 4 0 6 4 Q -2 6 -8 2 Z" fill="${a}"/><circle cx="6.6" cy="-4.4" r="1.5" fill="${a}"/>`;
    case 'fire': return `<path d="M 0 -10 C 4 -5 7 -2 7 3 A 7 7 0 0 1 -7 3 C -7 -1 -4 -4 -3 -7 C -2 -4 0 -3 1 -5 C 1 -7 0 -8 0 -10 Z" fill="${a}"/>`;
    case 'water': return `<path d="M -9 -3 Q -4.5 -8 0 -3 T 9 -3" fill="none" stroke="${a}" stroke-width="2.2"/><path d="M -9 4 Q -4.5 -1 0 4 T 9 4" fill="none" stroke="${a}" stroke-width="2.2"/>`;
    case 'sun': return `<circle cx="0" cy="0" r="4.5" fill="${a}"/>${[0,45,90,135,180,225,270,315].map(d => `<line x1="0" y1="-7" x2="0" y2="-10" stroke="${a}" stroke-width="2" transform="rotate(${d})"/>`).join('')}`;
    case 'heart': return `<path d="M 0 8 C -9 1 -9 -6 -4 -7 C -1.5 -7.5 0 -5 0 -4 C 0 -5 1.5 -7.5 4 -7 C 9 -6 9 1 0 8 Z" fill="${a}"/>`;
    case 'mount': return `<path d="M -10 8 L -3 -6 L 1 0 L 5 -8 L 10 8 Z" fill="none" stroke="${a}" stroke-width="2" stroke-linejoin="round"/>`;
    case 'trumpet': return `<path d="M -9 4 L 3 -2 L 3 -6 L 9 -9 L 9 1 L 3 -2" fill="none" stroke="${a}" stroke-width="2" stroke-linejoin="round"/><circle cx="-9" cy="4" r="2" fill="${a}"/>`;
    case 'crown': return `<path d="M -8 5 L -8 -3 L -3.5 1 L 0 -6 L 3.5 1 L 8 -3 L 8 5 Z" fill="${a}"/>`;
    default: return `<circle cx="0" cy="0" r="5" fill="${a}"/>`;
  }
}

function hairAndHead(p, cx, headY, headR) {
  const hair = p.hair, skin = p.skin;
  let out = '';
  const style = p.style || 'short';
  // hair behind head
  if (style === 'long') out += `<path d="M ${cx - headR - 4} ${headY} Q ${cx - headR - 8} ${headY + headR * 1.9} ${cx - headR * 0.7} ${headY + headR * 2.1} L ${cx + headR * 0.7} ${headY + headR * 2.1} Q ${cx + headR + 8} ${headY + headR * 1.9} ${cx + headR + 4} ${headY} Q ${cx + headR + 2} ${headY - headR - 4} ${cx} ${headY - headR - 5} Q ${cx - headR - 2} ${headY - headR - 4} ${cx - headR - 4} ${headY} Z" fill="${hair}"/>`;
  if (style === 'veil') out += `<path d="M ${cx - headR - 7} ${headY + headR * 2.4} Q ${cx - headR - 9} ${headY - headR} ${cx} ${headY - headR - 8} Q ${cx + headR + 9} ${headY - headR} ${cx + headR + 7} ${headY + headR * 2.4} Z" fill="${p.headColor || shade(p.garb, 24)}"/>`;
  // head
  out += `<ellipse cx="${cx}" cy="${headY}" rx="${headR}" ry="${headR * 1.14}" fill="${skin}"/>`;
  // face shading
  out += `<ellipse cx="${cx - headR * 0.33}" cy="${headY + headR * 0.1}" rx="${headR * 0.72}" ry="${headR * 0.9}" fill="#00000012"/>`;
  // hair on top
  if (style === 'short') out += `<path d="M ${cx - headR} ${headY - headR * 0.1} Q ${cx - headR} ${headY - headR * 1.25} ${cx} ${headY - headR * 1.22} Q ${cx + headR} ${headY - headR * 1.25} ${cx + headR} ${headY - headR * 0.1} Q ${cx + headR * 0.6} ${headY - headR * 0.62} ${cx} ${headY - headR * 0.58} Q ${cx - headR * 0.6} ${headY - headR * 0.62} ${cx - headR} ${headY - headR * 0.1} Z" fill="${hair}"/>`;
  if (style === 'long') out += `<path d="M ${cx - headR} ${headY} Q ${cx - headR - 1} ${headY - headR * 1.28} ${cx} ${headY - headR * 1.24} Q ${cx + headR + 1} ${headY - headR * 1.28} ${cx + headR} ${headY} Q ${cx + headR * 0.55} ${headY - headR * 0.55} ${cx} ${headY - headR * 0.52} Q ${cx - headR * 0.55} ${headY - headR * 0.55} ${cx - headR} ${headY} Z" fill="${hair}"/>`;
  if (style === 'veil') out += `<path d="M ${cx - headR - 1} ${headY - headR * 0.05} Q ${cx - headR - 1} ${headY - headR * 1.3} ${cx} ${headY - headR * 1.26} Q ${cx + headR + 1} ${headY - headR * 1.3} ${cx + headR + 1} ${headY - headR * 0.05} Q ${cx} ${headY - headR * 0.75} ${cx - headR - 1} ${headY - headR * 0.05} Z" fill="${hair}"/>`;
  // eyes + brows
  const eyeY = headY + headR * 0.02, ex = headR * 0.42;
  out += `<circle cx="${cx - ex}" cy="${eyeY}" r="1.7" fill="#241b10"/><circle cx="${cx + ex}" cy="${eyeY}" r="1.7" fill="#241b10"/>`;
  out += `<path d="M ${cx - ex - 4} ${eyeY - 5} q 4 -2.6 8 -.4" fill="none" stroke="${shade(hair, -18)}" stroke-width="1.6" stroke-linecap="round"/>`;
  out += `<path d="M ${cx + ex - 4} ${eyeY - 5.4} q 4 -2.2 8 .4" fill="none" stroke="${shade(hair, -18)}" stroke-width="1.6" stroke-linecap="round"/>`;
  // nose + mouth
  out += `<path d="M ${cx} ${eyeY + 2} q -2 5 .4 6.4" fill="none" stroke="#00000030" stroke-width="1.5" stroke-linecap="round"/>`;
  // beard / mouth
  if (p.beard === 'long') {
    out += `<path d="M ${cx - headR * 0.82} ${headY + headR * 0.35} Q ${cx - headR * 0.7} ${headY + headR * 2.0} ${cx} ${headY + headR * 2.1} Q ${cx + headR * 0.7} ${headY + headR * 2.0} ${cx + headR * 0.82} ${headY + headR * 0.35} Q ${cx} ${headY + headR * 0.95} ${cx - headR * 0.82} ${headY + headR * 0.35} Z" fill="${hair}"/>`;
    out += `<path d="M ${cx - 4.5} ${headY + headR * 0.62} q 4.5 2.6 9 0" fill="none" stroke="#00000045" stroke-width="1.6" stroke-linecap="round"/>`;
  } else if (p.beard === 'short') {
    out += `<path d="M ${cx - headR * 0.8} ${headY + headR * 0.3} Q ${cx - headR * 0.62} ${headY + headR * 1.34} ${cx} ${headY + headR * 1.36} Q ${cx + headR * 0.62} ${headY + headR * 1.34} ${cx + headR * 0.8} ${headY + headR * 0.3} Q ${cx} ${headY + headR * 0.9} ${cx - headR * 0.8} ${headY + headR * 0.3} Z" fill="${hair}" opacity=".92"/>`;
    out += `<path d="M ${cx - 4.5} ${headY + headR * 0.6} q 4.5 2.4 9 0" fill="none" stroke="#00000045" stroke-width="1.6" stroke-linecap="round"/>`;
  } else {
    out += `<path d="M ${cx - 4.5} ${headY + headR * 0.58} q 4.5 3 9 0" fill="none" stroke="#00000055" stroke-width="1.8" stroke-linecap="round"/>`;
  }
  return out;
}

function headgear(p, cx, headY, headR) {
  const a = p.accent, g = p.garb;
  switch (p.head) {
    case 'crown': return `<path d="M ${cx - headR * 0.95} ${headY - headR * 0.72} L ${cx - headR * 0.95} ${headY - headR * 1.5} L ${cx - headR * 0.45} ${headY - headR * 1.05} L ${cx} ${headY - headR * 1.75} L ${cx + headR * 0.45} ${headY - headR * 1.05} L ${cx + headR * 0.95} ${headY - headR * 1.5} L ${cx + headR * 0.95} ${headY - headR * 0.72} Z" fill="${a}" stroke="${shade(a, -50)}" stroke-width="1"/><circle cx="${cx}" cy="${headY - headR * 1.62}" r="2.2" fill="${shade(a, 55)}"/>`;
    case 'helmet': return `<path d="M ${cx - headR - 2} ${headY - headR * 0.15} Q ${cx - headR - 2} ${headY - headR * 1.5} ${cx} ${headY - headR * 1.5} Q ${cx + headR + 2} ${headY - headR * 1.5} ${cx + headR + 2} ${headY - headR * 0.15} L ${cx + headR - 2} ${headY - headR * 0.15} Q ${cx + headR - 2} ${headY - headR * 1.05} ${cx} ${headY - headR * 1.05} Q ${cx - headR + 2} ${headY - headR * 1.05} ${cx - headR + 2} ${headY - headR * 0.15} Z" fill="${shade(g, 30)}" stroke="${a}" stroke-width="1.4"/><path d="M ${cx - 3} ${headY - headR * 1.45} Q ${cx} ${headY - headR * 2.05} ${cx + 3} ${headY - headR * 1.45} Z" fill="${a}"/>`;
    case 'hood': return `<path d="M ${cx - headR - 6} ${headY + headR * 1.1} Q ${cx - headR - 8} ${headY - headR * 1.2} ${cx} ${headY - headR * 1.55} Q ${cx + headR + 8} ${headY - headR * 1.2} ${cx + headR + 6} ${headY + headR * 1.1} L ${cx + headR + 1} ${headY + headR * 0.6} Q ${cx + headR + 1} ${headY - headR * 0.9} ${cx} ${headY - headR * 1.1} Q ${cx - headR - 1} ${headY - headR * 0.9} ${cx - headR - 1} ${headY + headR * 0.6} Z" fill="${shade(g, 18)}"/>`;
    case 'turban': return `<path d="M ${cx - headR - 2} ${headY - headR * 0.3} Q ${cx - headR - 3} ${headY - headR * 1.6} ${cx} ${headY - headR * 1.6} Q ${cx + headR + 3} ${headY - headR * 1.6} ${cx + headR + 2} ${headY - headR * 0.3} Q ${cx} ${headY - headR * 0.85} ${cx - headR - 2} ${headY - headR * 0.3} Z" fill="${shade(g, 40)}"/><path d="M ${cx - headR - 2} ${headY - headR * 0.55} Q ${cx} ${headY - headR * 1.15} ${cx + headR + 2} ${headY - headR * 0.55}" fill="none" stroke="${a}" stroke-width="1.6"/>`;
    case 'circlet': return `<path d="M ${cx - headR} ${headY - headR * 0.55} Q ${cx} ${headY - headR * 0.95} ${cx + headR} ${headY - headR * 0.55}" fill="none" stroke="${a}" stroke-width="3"/><circle cx="${cx}" cy="${headY - headR * 0.78}" r="2" fill="${shade(a, 55)}"/>`;
    case 'radiance': return `<g opacity=".85">${[-60, -30, 0, 30, 60].map(d => `<line x1="${cx}" y1="${headY - headR * 1.35}" x2="${cx}" y2="${headY - headR * 1.85}" stroke="${a}" stroke-width="2.4" stroke-linecap="round" transform="rotate(${d} ${cx} ${headY})"/>`).join('')}</g>`;
    default: return '';
  }
}

function bust(p, cx, w, h) {
  const headR = w * 0.155;
  const headY = h * 0.42;
  const shY = h * 0.78;
  let out = '';
  // shoulders / robe
  out += `<path d="M ${cx - w * 0.34} ${h + 2} L ${cx - w * 0.34} ${shY + w * 0.05} Q ${cx - w * 0.3} ${shY - w * 0.1} ${cx - w * 0.12} ${shY - w * 0.13} L ${cx - w * 0.055} ${headY + headR * 1.55} L ${cx + w * 0.055} ${headY + headR * 1.55} L ${cx + w * 0.12} ${shY - w * 0.13} Q ${cx + w * 0.3} ${shY - w * 0.1} ${cx + w * 0.34} ${shY + w * 0.05} L ${cx + w * 0.34} ${h + 2} Z" fill="${p.garb}"/>`;
  // robe fold highlight + sash
  out += `<path d="M ${cx - w * 0.12} ${shY - w * 0.13} L ${cx - w * 0.16} ${h + 2} L ${cx - w * 0.04} ${h + 2} L ${cx - w * 0.02} ${headY + headR * 1.62} Z" fill="${shade(p.garb, 22)}" opacity=".65"/>`;
  out += `<path d="M ${cx + w * 0.055} ${headY + headR * 1.55} L ${cx + w * 0.13} ${h + 2} L ${cx + w * 0.2} ${h + 2} L ${cx + w * 0.12} ${shY - w * 0.13} Z" fill="${shade(p.garb, -20)}" opacity=".6"/>`;
  out += `<path d="M ${cx - w * 0.055} ${headY + headR * 1.5} L ${cx} ${shY + w * 0.06} L ${cx + w * 0.055} ${headY + headR * 1.5}" fill="none" stroke="${p.accent}" stroke-width="2" opacity=".8"/>`;
  // neck
  out += `<rect x="${cx - headR * 0.42}" y="${headY + headR * 0.9}" width="${headR * 0.84}" height="${headR * 0.9}" fill="${shade(p.skin, -14)}"/>`;
  out += hairAndHead(p, cx, headY, headR);
  out += headgear(p, cx, headY, headR);
  return out;
}

export function portraitSVG(p, opts = {}) {
  const w = 200, h = 210;
  const bg1 = shade(p.garb, -34), bg2 = shade(p.garb, -58);
  const rad = p.head === 'radiance';
  let inner = `
    <defs>
      <radialGradient id="pg-${p._gid}" cx="50%" cy="30%" r="85%">
        <stop offset="0%" stop-color="${rad ? '#4a3d1e' : bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#pg-${p._gid})"/>
    <circle cx="${w / 2}" cy="${h * 0.44}" r="${w * 0.34}" fill="${rad ? '#f2d48818' : '#ffffff0a'}"/>`;
  if (p.style === 'group') {
    const q = { ...p, style: 'short', beard: 'short', head: 'none' };
    inner += `<g opacity=".55" transform="translate(${-w * 0.19},8) scale(.9)">${bust(q, w / 2, w, h)}</g>`;
    inner += `<g opacity=".75" transform="translate(${w * 0.19},8) scale(.9)">${bust(q, w / 2, w, h)}</g>`;
    inner += bust({ ...q, head: p.head || 'none' }, w / 2, w, h);
  } else {
    inner += bust(p, w / 2, w, h);
  }
  if (p.emblem) {
    inner += `<g transform="translate(${w - 26},${h - 26})"><circle r="17" fill="#14110ccc" stroke="${p.accent}" stroke-width="1.4"/><g transform="scale(.95)">${emblemPath(p.emblem, p.accent)}</g></g>`;
  }
  inner += `<rect width="${w}" height="${h}" fill="none" stroke="#ffffff14" stroke-width="1"/>`;
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" ${opts.attrs || ''}>${inner}</svg>`;
}

let gid = 0;
export function avatar(entity, opts = {}) {
  if (!entity) return '<div class="avatar"></div>';
  const url = artManifest[entity.id];
  if (url) return `<div class="avatar"><img src="${url}" alt="${entity.name}" loading="lazy"></div>`;
  const p = { ...(entity.portrait || {}), _gid: `${entity.id}-${gid++}` };
  p.skin = p.skin || '#c68863'; p.hair = p.hair || '#2b1c12';
  p.garb = p.garb || '#4c5b78'; p.accent = p.accent || '#e8b64c';
  return `<div class="avatar">${portraitSVG(p, opts)}</div>`;
}
