// Parametric SVG portrait engine (v2).
// Each character is drawn as a flat-cartoon bust from a rich set of appearance
// parameters in characters.json, so ~180 figures stay visually distinct while
// sharing one illuminated-deck style. If data/art-manifest.json maps an id to
// an image URL, that image is shown instead of the drawing.

let artManifest = {};
export function setArtManifest(m) { artManifest = m || {}; }

const shade = (hex, amt) => {
  const n = parseInt((hex || '#888888').slice(1), 16);
  const f = c => Math.max(0, Math.min(255, c + amt));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};
const P = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + ' Z';

// ---------------------------------------------------------------- emblems
function emblemPath(name, a) {
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
    case 'sun': return `<circle cx="0" cy="0" r="4.5" fill="${a}"/>${[0, 45, 90, 135, 180, 225, 270, 315].map(d => `<line x1="0" y1="-7" x2="0" y2="-10" stroke="${a}" stroke-width="2" transform="rotate(${d})"/>`).join('')}`;
    case 'heart': return `<path d="M 0 8 C -9 1 -9 -6 -4 -7 C -1.5 -7.5 0 -5 0 -4 C 0 -5 1.5 -7.5 4 -7 C 9 -6 9 1 0 8 Z" fill="${a}"/>`;
    case 'mount': return `<path d="M -10 8 L -3 -6 L 1 0 L 5 -8 L 10 8 Z" fill="none" stroke="${a}" stroke-width="2" stroke-linejoin="round"/>`;
    case 'trumpet': return `<path d="M -9 4 L 3 -2 L 3 -6 L 9 -9 L 9 1 L 3 -2" fill="none" stroke="${a}" stroke-width="2" stroke-linejoin="round"/><circle cx="-9" cy="4" r="2" fill="${a}"/>`;
    case 'crown': return `<path d="M -8 5 L -8 -3 L -3.5 1 L 0 -6 L 3.5 1 L 8 -3 L 8 5 Z" fill="${a}"/>`;
    default: return '';
  }
}

// ---------------------------------------------------------------- geometry
// Face outline as a smooth cubic path. cx/cy = head centre; hw/hh = half sizes.
// shape tunes cheek fullness, jaw width and chin length/shape.
const FACE = {
  oval:   { cheek: 0.92, jaw: 0.60, chin: 1.04, square: 0.20 },
  round:  { cheek: 1.02, jaw: 0.80, chin: 0.90, square: 0.30 },
  long:   { cheek: 0.82, jaw: 0.56, chin: 1.16, square: 0.18 },
  square: { cheek: 0.96, jaw: 0.86, chin: 0.96, square: 0.62 },
  heart:  { cheek: 1.02, jaw: 0.50, chin: 1.06, square: 0.16 },
  broad:  { cheek: 1.06, jaw: 0.88, chin: 0.86, square: 0.40 },
};

function facePath(cx, cy, hw, hh, shapeKey) {
  const s = FACE[shapeKey] || FACE.oval;
  const chinY = cy + hh * s.chin;
  const jawY = cy + hh * 0.52;
  const cheekY = cy + hh * 0.06;
  const tempY = cy - hh * 0.62;
  const topY = cy - hh;
  const jx = hw * s.jaw, cw = hw * s.cheek, chinW = hw * s.square * 0.5;
  // right side down to chin, then mirror up the left
  return `M ${cx} ${topY}`
    + ` C ${cx + cw * 0.7} ${topY} ${cx + cw} ${tempY} ${cx + cw} ${cheekY}`
    + ` C ${cx + cw} ${(cheekY + jawY) / 2} ${cx + jx + 4} ${jawY} ${cx + jx} ${jawY + hh * 0.14}`
    + ` C ${cx + jx - 2} ${chinY - hh * 0.18} ${cx + chinW + hw * 0.22} ${chinY} ${cx + chinW} ${chinY}`
    + ` L ${cx - chinW} ${chinY}`
    + ` C ${cx - chinW - hw * 0.22} ${chinY} ${cx - jx + 2} ${chinY - hh * 0.18} ${cx - jx} ${jawY + hh * 0.14}`
    + ` C ${cx - jx - 4} ${jawY} ${cx - cw} ${(cheekY + jawY) / 2} ${cx - cw} ${cheekY}`
    + ` C ${cx - cw} ${tempY} ${cx - cw * 0.7} ${topY} ${cx} ${topY} Z`;
}

// eyebrows
function brows(cx, y, ex, kind, col) {
  const w = 8.5, tilt = { soft: 1.4, straight: 0, arched: 2.6, heavy: 1.0, worried: -2.4 }[kind] ?? 1.2;
  const th = kind === 'heavy' ? 3.2 : kind === 'soft' ? 1.7 : 2.1;
  const one = sx => `<path d="M ${cx + sx * (ex - w * 0.5) - w * 0.5 * sx} ${y + (sx < 0 ? tilt : tilt)} q ${w * 0.5} ${-tilt - 1.6} ${w} ${sx < 0 ? tilt * 0.3 : tilt * 0.3}" fill="none" stroke="${col}" stroke-width="${th}" stroke-linecap="round"/>`;
  // left & right (mirror by drawing two arcs)
  const arc = (dir) => {
    const bx = cx + dir * ex;
    return `<path d="M ${bx - dir * w * 0.55} ${y + 1.2} Q ${bx} ${y - tilt} ${bx + dir * w * 0.55} ${y + (kind === 'arched' ? 1.6 : 0.4)}" fill="none" stroke="${col}" stroke-width="${th}" stroke-linecap="round"/>`;
  };
  return arc(-1) + arc(1);
}

// eyes
function eyes(cx, y, ex, kind, hairCol) {
  const shape = {
    calm:    { w: 6.2, h: 3.4, lid: 0.4 },
    wide:    { w: 6.6, h: 4.4, lid: 0.1 },
    narrow:  { w: 6.4, h: 2.3, lid: 0.7 },
    downcast:{ w: 6.0, h: 3.0, lid: 0.9 },
    fierce:  { w: 6.6, h: 3.0, lid: 0.5 },
    gentle:  { w: 6.0, h: 3.4, lid: 0.35 },
  }[kind] || { w: 6.2, h: 3.4, lid: 0.4 };
  const one = (dir) => {
    const ox = cx + dir * ex;
    const w = shape.w, h = shape.h;
    const white = `<path d="M ${ox - w} ${y} Q ${ox} ${y - h} ${ox + w} ${y} Q ${ox} ${y + h} ${ox - w} ${y} Z" fill="#f4efe6"/>`;
    const irisY = y - h * 0.05 + (kind === 'downcast' ? 0.8 : 0);
    const iris = `<circle cx="${ox + dir * 0.6}" cy="${irisY}" r="2.5" fill="#3a2a1a"/><circle cx="${ox + dir * 0.6}" cy="${irisY}" r="1.1" fill="#120c06"/><circle cx="${ox + dir * 0.6 + 0.9}" cy="${irisY - 0.9}" r="0.6" fill="#fff"/>`;
    const lid = `<path d="M ${ox - w} ${y} Q ${ox} ${y - h} ${ox + w} ${y}" fill="none" stroke="#2a1c10" stroke-width="1.3" stroke-linecap="round"/>`;
    const lidShade = shape.lid > 0.5 ? `<path d="M ${ox - w} ${y - h * shape.lid} Q ${ox} ${y - h * (shape.lid + 0.5)} ${ox + w} ${y - h * shape.lid}" fill="none" stroke="#00000022" stroke-width="1.4"/>` : '';
    return white + iris + lid + lidShade;
  };
  return one(-1) + one(1);
}

function nose(cx, topY, baseY, kind, skin) {
  const w = { straight: 2.6, round: 3.4, aquiline: 2.2, broad: 4.2, small: 2.0 }[kind] ?? 2.8;
  const bridge = kind === 'aquiline'
    ? `<path d="M ${cx - 1} ${topY} Q ${cx + 2.5} ${(topY + baseY) / 2} ${cx - w * 0.4} ${baseY}" fill="none" stroke="${shade(skin, -34)}" stroke-width="1.5" stroke-linecap="round"/>`
    : `<path d="M ${cx - 0.6} ${topY + 2} L ${cx - w * 0.5} ${baseY}" fill="none" stroke="${shade(skin, -30)}" stroke-width="1.4" stroke-linecap="round"/>`;
  const tip = `<path d="M ${cx - w} ${baseY} Q ${cx} ${baseY + 3} ${cx + w} ${baseY - 0.4}" fill="none" stroke="${shade(skin, -34)}" stroke-width="1.5" stroke-linecap="round"/>`;
  return bridge + tip;
}

function mouth(cx, y, kind, skin, hidden) {
  if (hidden) return '';
  const lip = shade(skin, -46);
  switch (kind) {
    case 'smile': return `<path d="M ${cx - 6} ${y - 1} Q ${cx} ${y + 4} ${cx + 6} ${y - 1}" fill="none" stroke="${lip}" stroke-width="1.8" stroke-linecap="round"/>`;
    case 'frown': return `<path d="M ${cx - 6} ${y + 2} Q ${cx} ${y - 3} ${cx + 6} ${y + 2}" fill="none" stroke="${lip}" stroke-width="1.8" stroke-linecap="round"/>`;
    case 'set': return `<path d="M ${cx - 6} ${y} L ${cx + 6} ${y}" fill="none" stroke="${lip}" stroke-width="1.8" stroke-linecap="round"/>`;
    case 'open': return `<ellipse cx="${cx}" cy="${y + 1}" rx="3.4" ry="2.6" fill="${shade(skin, -52)}"/>`;
    default: return `<path d="M ${cx - 5.5} ${y} Q ${cx} ${y + 2.4} ${cx + 5.5} ${y}" fill="none" stroke="${lip}" stroke-width="1.7" stroke-linecap="round"/>`;
  }
}

// hair silhouettes (front piece over the head). Returns {back, front}.
function hair(cx, cy, hw, hh, style, col, age) {
  const dk = shade(col, -22), lt = shade(col, 20);
  const topY = cy - hh, sideY = cy + hh * 0.1;
  const recede = age === 'old' ? 0.14 : 0;
  let back = '', front = '';
  const cap = (peakUp, hairline) => `M ${cx - hw - 1} ${sideY} C ${cx - hw - 3} ${topY - peakUp} ${cx - hw * 0.5} ${topY - peakUp - 3} ${cx} ${topY - peakUp - 3} C ${cx + hw * 0.5} ${topY - peakUp - 3} ${cx + hw + 3} ${topY - peakUp} ${cx + hw + 1} ${sideY} C ${cx + hw * 0.6} ${topY + hh * (0.34 + hairline)} ${cx + hw * 0.2} ${topY + hh * (0.2 + hairline)} ${cx} ${topY + hh * (0.2 + hairline)} C ${cx - hw * 0.2} ${topY + hh * (0.2 + hairline)} ${cx - hw * 0.6} ${topY + hh * (0.34 + hairline)} ${cx - hw - 1} ${sideY} Z`;
  switch (style) {
    case 'bald': front = age === 'old'
      ? `<path d="M ${cx - hw - 1} ${sideY} C ${cx - hw - 2} ${cy - hh * 0.2} ${cx - hw * 0.7} ${cy + hh * 0.2} ${cx - hw * 0.55} ${cy + hh * 0.4}" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round"/><path d="M ${cx + hw + 1} ${sideY} C ${cx + hw + 2} ${cy - hh * 0.2} ${cx + hw * 0.7} ${cy + hh * 0.2} ${cx + hw * 0.55} ${cy + hh * 0.4}" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round"/>` : '';
      break;
    case 'buzz': front = `<path d="${cap(2, recede)}" fill="${col}"/><path d="${cap(2, recede)}" fill="${dk}" opacity=".25"/>`; break;
    case 'short': front = `<path d="${cap(4, recede)}" fill="${col}"/><path d="M ${cx - hw * 0.5} ${topY + 1} q ${hw * 0.5} ${-3} ${hw} 1" fill="none" stroke="${lt}" stroke-width="2" opacity=".5"/>`; break;
    case 'receding': front = `<path d="M ${cx - hw - 1} ${sideY} C ${cx - hw - 3} ${cy - hh * 0.5} ${cx - hw * 0.8} ${topY - 3} ${cx - hw * 0.2} ${topY + hh * 0.28} C ${cx - hw * 0.1} ${topY + 2} ${cx + hw * 0.1} ${topY + 2} ${cx + hw * 0.2} ${topY + hh * 0.28} C ${cx + hw * 0.8} ${topY - 3} ${cx + hw + 3} ${cy - hh * 0.5} ${cx + hw + 1} ${sideY} C ${cx + hw * 0.7} ${cy - hh * 0.55} ${cx + hw * 0.4} ${cy - hh * 0.5} ${cx + hw * 0.3} ${cy - hh * 0.3} L ${cx - hw * 0.3} ${cy - hh * 0.3} C ${cx - hw * 0.4} ${cy - hh * 0.5} ${cx - hw * 0.7} ${cy - hh * 0.55} ${cx - hw - 1} ${sideY} Z" fill="${col}"/>`; break;
    case 'wavy': front = `<path d="${cap(5, recede)}" fill="${col}"/><path d="M ${cx - hw * 0.7} ${topY + 2} q ${hw * 0.35} ${-4} ${hw * 0.7} 0 q ${hw * 0.35} ${4} ${hw * 0.7} 0" fill="none" stroke="${dk}" stroke-width="2" opacity=".5"/>`; break;
    case 'curly':
      back = `<g fill="${col}">` + [[-hw, sideY - 4], [hw, sideY - 4], [-hw * 0.9, cy - hh * 0.4], [hw * 0.9, cy - hh * 0.4]].map(([x, y]) => `<circle cx="${cx + x}" cy="${y}" r="7"/>`).join('') + `</g>`;
      front = `<g fill="${col}">` + [[-hw * 0.75, topY + 2], [-hw * 0.28, topY - 3], [hw * 0.28, topY - 3], [hw * 0.75, topY + 2], [-hw, cy - hh * 0.55], [hw, cy - hh * 0.55]].map(([x, y]) => `<circle cx="${cx + x}" cy="${y}" r="8"/>`).join('') + `</g>`
        + `<g fill="${dk}" opacity=".4">` + [[-hw * 0.4, topY + 1], [hw * 0.4, topY + 1]].map(([x, y]) => `<circle cx="${cx + x}" cy="${y}" r="4"/>`).join('') + `</g>`;
      break;
    case 'topknot':
      front = `<path d="${cap(3, recede)}" fill="${col}"/><ellipse cx="${cx}" cy="${topY - 5}" rx="7" ry="8" fill="${col}"/><ellipse cx="${cx}" cy="${topY - 5}" rx="7" ry="8" fill="${dk}" opacity=".3"/>`;
      break;
    case 'long': {
      // two side locks that fall behind the shoulders; the chest stays open
      const lock = dir => `M ${cx + dir * (hw - 2)} ${cy - hh * 0.1} C ${cx + dir * (hw + 9)} ${cy + hh * 0.8} ${cx + dir * (hw + 4)} ${cy + hh * 1.7} ${cx + dir * hw * 0.62} ${cy + hh * 2.35} C ${cx + dir * hw * 0.5} ${cy + hh * 1.8} ${cx + dir * (hw - 1)} ${cy + hh * 1.0} ${cx + dir * (hw - 2)} ${cy - hh * 0.1} Z`;
      back = `<path d="${lock(-1)}" fill="${col}"/><path d="${lock(1)}" fill="${col}"/>`
        + `<path d="${lock(1)}" fill="${dk}" opacity=".22"/><path d="${lock(-1)}" fill="${lt}" opacity=".18"/>`;
      front = `<path d="${cap(5, recede)}" fill="${col}"/><path d="M ${cx - hw * 0.6} ${topY + hh * 0.05} q ${hw * 0.6} ${-4} ${hw * 1.2} 0" fill="none" stroke="${lt}" stroke-width="1.8" opacity=".45"/>`;
      break;
    }
    case 'veil':
      // a solid mantle over head + shoulders; the face (drawn later) opens the centre
      back = `<path d="M ${cx - hw - 10} ${cy + hh * 2.45} C ${cx - hw - 15} ${cy - hh * 0.4} ${cx - hw * 0.55} ${topY - 13} ${cx} ${topY - 13} C ${cx + hw * 0.55} ${topY - 13} ${cx + hw + 15} ${cy - hh * 0.4} ${cx + hw + 10} ${cy + hh * 2.45} Z" fill="VEILCOL"/>`
        + `<path d="M ${cx - hw * 0.75} ${topY - 4} C ${cx - hw * 0.4} ${topY - 11} ${cx + hw * 0.4} ${topY - 11} ${cx + hw * 0.75} ${topY - 4}" fill="none" stroke="VEILHI" stroke-width="2" opacity=".5"/>`;
      front = '';
      break;
    case 'covered': front = ''; break; // headgear hides hair
    default: front = `<path d="${cap(4, recede)}" fill="${col}"/>`;
  }
  return { back, front };
}

// beard hugging the jaw. Drawn over the lower face.
function beard(cx, cy, hw, hh, kind, col, mouthY) {
  if (!kind || kind === 'none') return { over: '', lip: false };
  const dk = shade(col, -20);
  const jawL = cx - hw * 0.9, jawR = cx + hw * 0.9;
  const jawTop = cy + hh * 0.02;      // near the ears / sideburns
  const chinY = cy + hh * 1.04;
  const cheekLine = cy + hh * 0.38;   // upper edge of the beard across cheeks
  const mustache = (full) => `<path d="M ${cx - 6.5} ${mouthY - 2.5} Q ${cx - 3} ${mouthY - (full ? 0 : 1)} ${cx} ${mouthY - 1.5} Q ${cx + 3} ${mouthY - (full ? 0 : 1)} ${cx + 6.5} ${mouthY - 2.5} Q ${cx + 3} ${mouthY + 1.5} ${cx} ${mouthY + 0.5} Q ${cx - 3} ${mouthY + 1.5} ${cx - 6.5} ${mouthY - 2.5} Z" fill="${col}"/>`;
  switch (kind) {
    case 'stubble':
      return { over: `<path d="M ${jawL} ${cheekLine} C ${jawL - 2} ${chinY - hh * 0.2} ${cx - hw * 0.4} ${chinY} ${cx} ${chinY} C ${cx + hw * 0.4} ${chinY} ${jawR + 2} ${chinY - hh * 0.2} ${jawR} ${cheekLine}" fill="${col}" opacity=".28"/>`, lip: false };
    case 'mustache':
      return { over: mustache(false), lip: false };
    case 'goatee':
      return { over: mustache(false) + `<path d="M ${cx - 6} ${mouthY + 3} Q ${cx} ${mouthY + 2} ${cx + 6} ${mouthY + 3} Q ${cx + 5} ${chinY - 2} ${cx} ${chinY + 1} Q ${cx - 5} ${chinY - 2} ${cx - 6} ${mouthY + 3} Z" fill="${col}"/>`, lip: false };
    case 'short': {
      const outer = `M ${jawL - 1} ${jawTop} C ${jawL - 3} ${cheekLine + 6} ${cx - hw * 0.4} ${chinY - 2} ${cx} ${chinY} C ${cx + hw * 0.4} ${chinY - 2} ${jawR + 3} ${cheekLine + 6} ${jawR + 1} ${jawTop}`;
      const inner = `C ${cx + hw * 0.55} ${cheekLine + 3} ${cx + 8} ${mouthY + 4} ${cx} ${mouthY + 4} C ${cx - 8} ${mouthY + 4} ${cx - hw * 0.55} ${cheekLine + 3} ${jawL - 1} ${jawTop} Z`;
      return { over: `<path d="${outer} ${inner}" fill="${col}"/>` + mustache(false), lip: true };
    }
    case 'chinstrap': { // chin-curtain / Donegal (jawline beard, no mustache) — e.g. Brigham Young
      const outer = `M ${jawL - 1} ${jawTop} C ${jawL - 3} ${cheekLine + 7} ${cx - hw * 0.4} ${chinY} ${cx} ${chinY + 1} C ${cx + hw * 0.4} ${chinY} ${jawR + 3} ${cheekLine + 7} ${jawR + 1} ${jawTop}`;
      const inner = `C ${cx + hw * 0.64} ${cheekLine + 6} ${cx + 9} ${mouthY + 5} ${cx} ${mouthY + 5} C ${cx - 9} ${mouthY + 5} ${cx - hw * 0.64} ${cheekLine + 6} ${jawL - 1} ${jawTop} Z`;
      return { over: `<path d="${outer} ${inner}" fill="${col}"/>`, lip: false };
    }
    case 'forked': {
      const outer = `M ${jawL - 1} ${jawTop} C ${jawL - 4} ${chinY} ${cx - hw * 0.5} ${chinY + hh * 0.5} ${cx - 4} ${chinY + hh * 0.7} L ${cx} ${chinY + hh * 0.35} L ${cx + 4} ${chinY + hh * 0.7} C ${cx + hw * 0.5} ${chinY + hh * 0.5} ${jawR + 4} ${chinY} ${jawR + 1} ${jawTop}`;
      const inner = `C ${cx + hw * 0.6} ${cheekLine + 2} ${cx + 9} ${mouthY + 5} ${cx} ${mouthY + 5} C ${cx - 9} ${mouthY + 5} ${cx - hw * 0.6} ${cheekLine + 2} ${jawL - 1} ${jawTop} Z`;
      return { over: `<path d="${outer} ${inner}" fill="${col}"/><path d="${outer} ${inner}" fill="${dk}" opacity=".25"/>` + mustache(true), lip: true };
    }
    case 'long': {
      const hang = chinY + hh * 0.85;
      const outer = `M ${jawL - 1} ${jawTop} C ${jawL - 5} ${chinY} ${cx - hw * 0.6} ${hang} ${cx} ${hang + hh * 0.08} C ${cx + hw * 0.6} ${hang} ${jawR + 5} ${chinY} ${jawR + 1} ${jawTop}`;
      const inner = `C ${cx + hw * 0.6} ${cheekLine + 2} ${cx + 9} ${mouthY + 5} ${cx} ${mouthY + 5} C ${cx - 9} ${mouthY + 5} ${cx - hw * 0.6} ${cheekLine + 2} ${jawL - 1} ${jawTop} Z`;
      return { over: `<path d="${outer} ${inner}" fill="${col}"/><path d="M ${cx} ${mouthY + 6} L ${cx} ${hang}" stroke="${dk}" stroke-width="1.6" opacity=".35"/>` + mustache(true), lip: true };
    }
    default: { // 'full'
      const outer = `M ${jawL - 1} ${jawTop} C ${jawL - 4} ${chinY - hh * 0.1} ${cx - hw * 0.45} ${chinY + hh * 0.14} ${cx} ${chinY + hh * 0.16} C ${cx + hw * 0.45} ${chinY + hh * 0.14} ${jawR + 4} ${chinY - hh * 0.1} ${jawR + 1} ${jawTop}`;
      const inner = `C ${cx + hw * 0.58} ${cheekLine + 2} ${cx + 9} ${mouthY + 4} ${cx} ${mouthY + 4} C ${cx - 9} ${mouthY + 4} ${cx - hw * 0.58} ${cheekLine + 2} ${jawL - 1} ${jawTop} Z`;
      return { over: `<path d="${outer} ${inner}" fill="${col}"/><path d="${outer} ${inner}" fill="${dk}" opacity=".2"/>` + mustache(true), lip: true };
    }
  }
}

function headgear(p, cx, cy, hw, hh) {
  const a = p.accent, g = p.garb, topY = cy - hh;
  switch (p.head) {
    case 'crown': return `<path d="M ${cx - hw * 0.92} ${topY + hh * 0.16} L ${cx - hw * 0.92} ${topY - hh * 0.34} L ${cx - hw * 0.42} ${topY + hh * 0.04} L ${cx} ${topY - hh * 0.5} L ${cx + hw * 0.42} ${topY + hh * 0.04} L ${cx + hw * 0.92} ${topY - hh * 0.34} L ${cx + hw * 0.92} ${topY + hh * 0.16} Z" fill="${a}" stroke="${shade(a, -55)}" stroke-width="1.2"/><circle cx="${cx}" cy="${topY - hh * 0.34}" r="2.4" fill="${shade(a, 60)}"/><circle cx="${cx - hw * 0.92}" cy="${topY - hh * 0.34}" r="2" fill="${shade(a, 60)}"/><circle cx="${cx + hw * 0.92}" cy="${topY - hh * 0.34}" r="2" fill="${shade(a, 60)}"/>`;
    case 'helmet': return `<path d="M ${cx - hw - 3} ${cy - hh * 0.05} C ${cx - hw - 3} ${topY - hh * 0.5} ${cx + hw + 3} ${topY - hh * 0.5} ${cx + hw + 3} ${cy - hh * 0.05} L ${cx + hw - 1} ${cy - hh * 0.05} C ${cx + hw - 1} ${topY - hh * 0.02} ${cx - hw + 1} ${topY - hh * 0.02} ${cx - hw + 1} ${cy - hh * 0.05} Z" fill="${shade(g, 26)}" stroke="${a}" stroke-width="1.6"/><path d="M ${cx} ${topY - hh * 0.5} L ${cx} ${topY - hh * 0.85} Q ${cx + 5} ${topY - hh * 0.7} ${cx + 3} ${topY - hh * 0.35}" fill="${a}"/><line x1="${cx}" y1="${cy - hh * 0.05}" x2="${cx}" y2="${cy + hh * 0.5}" stroke="${shade(g, 10)}" stroke-width="2.5"/>`;
    case 'hood': return `<path d="M ${cx - hw - 7} ${cy + hh * 1.15} C ${cx - hw - 10} ${cy - hh * 0.9} ${cx - hw * 0.5} ${topY - 11} ${cx} ${topY - 11} C ${cx + hw * 0.5} ${topY - 11} ${cx + hw + 10} ${cy - hh * 0.9} ${cx + hw + 7} ${cy + hh * 1.15} L ${cx + hw + 1} ${cy + hh * 0.7} C ${cx + hw + 2} ${cy - hh * 0.55} ${cx + hw * 0.5} ${topY - 2} ${cx} ${topY - 2} C ${cx - hw * 0.5} ${topY - 2} ${cx - hw - 2} ${cy - hh * 0.55} ${cx - hw - 1} ${cy + hh * 0.7} Z" fill="${shade(g, 16)}" stroke="${shade(g, -14)}" stroke-width="1"/>`;
    case 'turban': return `<path d="M ${cx - hw - 2} ${cy - hh * 0.2} C ${cx - hw - 4} ${topY - hh * 0.6} ${cx + hw + 4} ${topY - hh * 0.6} ${cx + hw + 2} ${cy - hh * 0.2} C ${cx + hw * 0.5} ${cy - hh * 0.55} ${cx - hw * 0.5} ${cy - hh * 0.55} ${cx - hw - 2} ${cy - hh * 0.2} Z" fill="${shade(g, 34)}"/><path d="M ${cx - hw - 2} ${cy - hh * 0.4} Q ${cx} ${topY - hh * 0.2} ${cx + hw + 2} ${cy - hh * 0.4}" fill="none" stroke="${shade(g, 6)}" stroke-width="2.4"/><path d="M ${cx - hw + 2} ${cy - hh * 0.55} Q ${cx} ${topY - hh * 0.45} ${cx + hw - 2} ${cy - hh * 0.55}" fill="none" stroke="${a}" stroke-width="1.6"/>`;
    case 'nemes': { // Egyptian striped headdress with lappets over the shoulders
      const stripe = shade(a, -40), cloth = a;
      return `<path d="M ${cx - hw - 4} ${cy + hh * 1.5} L ${cx - hw - 7} ${cy - hh * 0.2} C ${cx - hw - 7} ${topY - 12} ${cx + hw + 7} ${topY - 12} ${cx + hw + 7} ${cy - hh * 0.2} L ${cx + hw + 4} ${cy + hh * 1.5} L ${cx + hw * 0.5} ${cy + hh * 1.5} L ${cx + hw * 0.55} ${cy + hh * 0.2} C ${cx + hw * 0.4} ${topY + 2} ${cx - hw * 0.4} ${topY + 2} ${cx - hw * 0.55} ${cy + hh * 0.2} L ${cx - hw * 0.5} ${cy + hh * 1.5} Z" fill="${cloth}"/>`
        + `<g stroke="${stripe}" stroke-width="2" opacity=".55">${[-0.8, -0.55, -0.3, 0.3, 0.55, 0.8].map(f => `<line x1="${cx + hw * f * 1.1}" y1="${cy - hh * 0.3}" x2="${cx + hw * f * 1.3}" y2="${cy + hh * 1.45}"/>`).join('')}</g>`
        + `<path d="M ${cx - hw - 6} ${cy - hh * 0.25} C ${cx - hw - 6} ${topY - 10} ${cx + hw + 6} ${topY - 10} ${cx + hw + 6} ${cy - hh * 0.25}" fill="none" stroke="${stripe}" stroke-width="2.5"/>`
        + `<ellipse cx="${cx}" cy="${topY - 3}" rx="4" ry="5" fill="${shade(a, -20)}"/><ellipse cx="${cx}" cy="${topY - 4}" rx="2" ry="3" fill="#c0492f"/>`;
    }
    case 'circlet': return `<path d="M ${cx - hw} ${cy - hh * 0.52} Q ${cx} ${cy - hh * 0.92} ${cx + hw} ${cy - hh * 0.52}" fill="none" stroke="${a}" stroke-width="3.2"/><circle cx="${cx}" cy="${cy - hh * 0.74}" r="2.4" fill="${shade(a, 55)}"/>`;
    case 'veilband': return `<path d="M ${cx - hw} ${cy - hh * 0.5} Q ${cx} ${cy - hh * 0.8} ${cx + hw} ${cy - hh * 0.5}" fill="none" stroke="${a}" stroke-width="2.4" opacity=".8"/>`;
    default: return '';
  }
}

function radiance(cx, cy, hw, hh, a) {
  const topY = cy - hh;
  return `<g opacity=".8">${[-70, -45, -22, 0, 22, 45, 70].map(d => `<line x1="${cx}" y1="${topY - 4}" x2="${cx}" y2="${topY - 16}" stroke="${a}" stroke-width="2.4" stroke-linecap="round" transform="rotate(${d} ${cx} ${cy})"/>`).join('')}</g>`;
}

// ---------------------------------------------------------------- bust
function bust(p, cx, w, h) {
  const hw = w * 0.20, hh = w * 0.24;
  const cy = h * 0.40;
  const shY = h * 0.74;
  const skin = p.skin, dkskin = shade(skin, -26);
  const eyeY = cy + hh * 0.08, ex = hw * 0.44;
  const noseTop = eyeY + 3, noseBase = cy + hh * 0.5;
  const mouthY = cy + hh * 0.74;
  let out = '';

  // shoulders / robe
  const collar = shade(p.garb, 18);
  out += `<path d="M ${cx - w * 0.40} ${h + 2} C ${cx - w * 0.40} ${shY} ${cx - w * 0.30} ${shY - w * 0.05} ${cx - w * 0.15} ${shY - w * 0.06} L ${cx - w * 0.075} ${cy + hh * 1.35} L ${cx + w * 0.075} ${cy + hh * 1.35} L ${cx + w * 0.15} ${shY - w * 0.06} C ${cx + w * 0.30} ${shY - w * 0.05} ${cx + w * 0.40} ${shY} ${cx + w * 0.40} ${h + 2} Z" fill="${p.garb}"/>`;
  out += `<path d="M ${cx - w * 0.075} ${cy + hh * 1.32} L ${cx} ${cy + hh * 1.75} L ${cx + w * 0.075} ${cy + hh * 1.32} L ${cx + w * 0.15} ${shY - w * 0.06} C ${cx + w * 0.06} ${shY - w * 0.12} ${cx - w * 0.06} ${shY - w * 0.12} ${cx - w * 0.15} ${shY - w * 0.06} Z" fill="${collar}" opacity=".8"/>`;
  out += `<path d="M ${cx - w * 0.05} ${cy + hh * 1.34} L ${cx} ${shY - w * 0.02} L ${cx + w * 0.05} ${cy + hh * 1.34}" fill="none" stroke="${p.accent}" stroke-width="2" opacity=".85"/>`;
  out += `<path d="M ${cx + w * 0.13} ${shY - w * 0.05} L ${cx + w * 0.34} ${h} L ${cx + w * 0.40} ${h} C ${cx + w * 0.36} ${shY + w * 0.02} ${cx + w * 0.24} ${shY - w * 0.04} ${cx + w * 0.15} ${shY - w * 0.06} Z" fill="${shade(p.garb, -24)}" opacity=".55"/>`;

  // hair (behind)
  const H = hair(cx, cy, hw, hh, p.hairStyle, p.hair, p.age);
  const veilCol = p.headColor || shade(p.garb, 26);
  const paintVeil = s => (s || '').replace(/VEILCOL/g, veilCol).replace(/VEILHI/g, shade(veilCol, 30));
  out += paintVeil(H.back);

  // neck
  out += `<path d="M ${cx - hw * 0.34} ${cy + hh * 0.92} L ${cx - hw * 0.36} ${cy + hh * 1.4} L ${cx + hw * 0.36} ${cy + hh * 1.4} L ${cx + hw * 0.34} ${cy + hh * 0.92} Z" fill="${skin}"/>`;
  out += `<path d="M ${cx - hw * 0.34} ${cy + hh * 0.98} Q ${cx} ${cy + hh * 1.24} ${cx + hw * 0.34} ${cy + hh * 0.98}" fill="none" stroke="${dkskin}" stroke-width="1.4" opacity=".5"/>`;

  // ears
  out += `<ellipse cx="${cx - hw}" cy="${eyeY + 4}" rx="3.4" ry="5" fill="${skin}"/><ellipse cx="${cx + hw}" cy="${eyeY + 4}" rx="3.4" ry="5" fill="${skin}"/><path d="M ${cx - hw + 1} ${eyeY + 1} q -2 3 0 6" fill="none" stroke="${dkskin}" stroke-width="1" opacity=".6"/><path d="M ${cx + hw - 1} ${eyeY + 1} q 2 3 0 6" fill="none" stroke="${dkskin}" stroke-width="1" opacity=".6"/>`;

  // face
  out += `<path d="${facePath(cx, cy, hw, hh, p.face)}" fill="${skin}"/>`;
  out += `<path d="${facePath(cx, cy, hw, hh, p.face)}" fill="${dkskin}" opacity=".10" transform="translate(2.2,1.5) scale(0.98)" transform-origin="${cx} ${cy}"/>`;
  // cheeks / age lines
  if (p.age === 'old') {
    out += `<path d="M ${cx - hw * 0.5} ${cy + hh * 0.5} q 3 3 1 7 M ${cx + hw * 0.5} ${cy + hh * 0.5} q -3 3 -1 7" fill="none" stroke="${dkskin}" stroke-width="1" opacity=".4"/>`;
    out += `<path d="M ${cx - 9} ${cy - hh * 0.5} q 3 -2 6 0 M ${cx + 9} ${cy - hh * 0.5} q -3 -2 -6 0" fill="none" stroke="${dkskin}" stroke-width="1" opacity=".35"/>`;
  }

  // features
  out += brows(cx, eyeY - 7, ex, p.brow, shade(p.hair, -10));
  out += eyes(cx, eyeY, ex, p.eyes, p.hair);
  out += nose(cx, noseTop, noseBase, p.nose, skin);

  // beard (over jaw) — may cover the mouth
  const B = beard(cx, cy, hw, hh, p.beard, p.hair, mouthY);
  out += mouth(cx, mouthY, p.mouth, skin, B.lip && (p.beard === 'long' || p.beard === 'forked'));
  out += B.over;

  // hair (front) + headgear
  out += paintVeil(H.front);
  if (p.head === 'radiance') out += radiance(cx, cy, hw, hh, p.accent);
  else out += headgear(p, cx, cy, hw, hh);

  return out;
}

// ---------------------------------------------------------------- defaults
function normalize(raw) {
  const p = { ...(raw || {}) };
  p.skin = p.skin || '#c68863';
  p.hair = p.hair || '#2b1c12';
  p.garb = p.garb || '#4c5b78';
  p.accent = p.accent || '#e8b64c';
  // back-compat with the v1 "style" field
  if (!p.hairStyle) {
    p.hairStyle = p.style === 'long' ? 'long' : p.style === 'veil' ? 'veil'
      : p.head === 'turban' || p.head === 'helmet' || p.head === 'hood' ? 'covered'
      : p.head === 'crown' ? 'short' : 'short';
  }
  p.face = p.face || 'oval';
  p.age = p.age || 'adult';
  p.brow = p.brow || 'soft';
  p.eyes = p.eyes || 'calm';
  p.nose = p.nose || 'straight';
  p.mouth = p.mouth || 'neutral';
  if (p.beard === true) p.beard = 'full';
  return p;
}

export function portraitSVG(raw, opts = {}) {
  const w = 200, h = 210;
  const p = normalize(raw);
  const gid = p._gid || 'p';
  const rad = p.head === 'radiance';
  const bg1 = shade(p.garb, -30), bg2 = shade(p.garb, -56);
  let inner = `<defs><radialGradient id="pg-${gid}" cx="50%" cy="32%" r="88%">
      <stop offset="0%" stop-color="${rad ? '#4a3d1e' : bg1}"/><stop offset="100%" stop-color="${bg2}"/>
    </radialGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#pg-${gid})"/>
    <circle cx="${w / 2}" cy="${h * 0.42}" r="${w * 0.36}" fill="${rad ? '#f2d48822' : '#ffffff0b'}"/>`;

  if (p.style === 'group') {
    const q = normalize({ ...raw, style: undefined, hairStyle: 'short', head: 'none', beard: p.beard === 'long' ? 'short' : p.beard });
    inner += `<g opacity=".5" transform="translate(${-w * 0.2},10) scale(.86)">${bust({ ...q, face: 'round' }, w / 2, w, h)}</g>`;
    inner += `<g opacity=".72" transform="translate(${w * 0.2},10) scale(.86)">${bust({ ...q, face: 'long' }, w / 2, w, h)}</g>`;
    inner += bust(normalize({ ...raw, style: undefined, head: raw.head }), w / 2, w, h);
  } else {
    inner += bust(p, w / 2, w, h);
  }
  if (p.emblem) {
    const e = emblemPath(p.emblem, p.accent);
    if (e) inner += `<g transform="translate(${w - 26},${h - 26})"><circle r="17" fill="#14110cdd" stroke="${p.accent}" stroke-width="1.4"/><g transform="scale(.95)">${e}</g></g>`;
  }
  inner += `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" fill="none" stroke="#ffffff18" stroke-width="1"/>`;
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" ${opts.attrs || ''}>${inner}</svg>`;
}

let gid = 0;
export function avatar(entity, opts = {}) {
  if (!entity) return '<div class="avatar"></div>';
  const url = artManifest[entity.id];
  if (url) return `<div class="avatar"><img src="${url}" alt="${entity.name}" loading="lazy"></div>`;
  const p = { ...(entity.portrait || {}), _gid: `${entity.id}-${gid++}` };
  return `<div class="avatar">${portraitSVG(p, opts)}</div>`;
}
