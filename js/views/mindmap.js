import { entities, relationEdges, esc } from '../data.js';
import { avatar } from '../portraits.js';

// ---------------------------------------------------------------------------
// Mind Map — an interactive node-link graph of every relationship recorded
// between scripture characters across all four volumes. Nodes are laid out
// with a small hand-rolled force-directed simulation (no external libs),
// settled once, then rendered as a static SVG + HTML scene the user can pan,
// zoom, drag, select and search.
// ---------------------------------------------------------------------------

const CSS = `
#mindmap-view .mm-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
#mindmap-view .mm-search-wrap { position: relative; }
#mindmap-view #mm-search {
  background: var(--panel2); border: 1px solid var(--line); color: var(--ink); border-radius: 9px;
  padding: 8px 12px; font-size: 13.5px; width: 220px; font-family: var(--sans);
}
#mindmap-view #mm-search:focus { outline: none; border-color: var(--gold-dim); }
#mindmap-view .mm-search-results {
  display: none; position: absolute; top: calc(100% + 4px); left: 0; min-width: 220px; max-width: 300px;
  background: var(--panel); border: 1px solid var(--line); border-radius: 10px; box-shadow: var(--shadow);
  z-index: 20; overflow: hidden; max-height: 260px; overflow-y: auto;
}
#mindmap-view .mm-search-item, #mindmap-view .mm-search-none {
  display: block; width: 100%; text-align: left; background: none; border: none; color: var(--ink-dim);
  padding: 8px 12px; font-size: 13px; cursor: pointer; font-family: var(--sans);
}
#mindmap-view .mm-search-item:hover { background: var(--panel2); color: var(--gold); }
#mindmap-view .mm-filters { display: flex; gap: 6px; flex-wrap: wrap; }
#mindmap-view .mm-filters .pill { cursor: pointer; }
#mindmap-view .mm-filters .pill.active, #mindmap-view .mm-toolbar .btn.active {
  border-color: var(--gold); color: var(--gold); background: var(--panel2);
}
#mindmap-view .mm-spacer { flex: 1; }
#mindmap-view .mm-legend { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 14px; font-size: 11.5px; color: var(--ink-faint); }
#mindmap-view .mm-legend .lg-item { display: flex; align-items: center; gap: 6px; }
#mindmap-view .mm-legend .lg-dot { width: 10px; height: 10px; border-radius: 50%; flex: none; box-shadow: 0 0 0 1px rgba(0,0,0,.5); }
#mindmap-view .mm-layout { display: flex; gap: 16px; align-items: stretch; }
#mindmap-view .mm-stage {
  flex: 1; position: relative; min-width: 0; height: min(70vh, 620px); min-height: 420px;
  background:
    radial-gradient(ellipse at 50% 30%, rgba(232,182,76,.05), transparent 60%), var(--bg2);
  border: 1px solid var(--line); border-radius: var(--rad); overflow: hidden; cursor: grab; touch-action: none;
}
#mindmap-view .mm-stage.panning { cursor: grabbing; }
#mindmap-view .mm-world { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
#mindmap-view .mm-world.mm-anim { transition: transform .35s ease; }
#mindmap-view .mm-edges { position: absolute; left: 0; top: 0; overflow: visible; }
#mindmap-view .mm-edge { stroke: var(--line); stroke-width: 1.4; transition: opacity .2s ease, stroke .2s ease, stroke-width .2s ease; }
#mindmap-view .mm-edge.dim { opacity: .07; }
#mindmap-view .mm-edge.hl { stroke: var(--gold); stroke-width: 2.2; opacity: .95; }
#mindmap-view .mm-nodes { position: absolute; left: 0; top: 0; }
#mindmap-view .mm-node {
  position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center;
  width: 84px; cursor: pointer; user-select: none; transition: opacity .2s ease;
}
#mindmap-view .mm-node .avatar {
  width: 42px; height: 42px; border-radius: 50%; overflow: hidden; background: var(--bg2);
  border: 2px solid var(--grp-color, var(--line)); box-shadow: 0 2px 10px rgba(0,0,0,.5); transition: border-color .2s ease, box-shadow .2s ease, transform .15s ease;
}
#mindmap-view .mm-node .avatar svg, #mindmap-view .mm-node .avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
#mindmap-view .mm-node .mm-label {
  margin-top: 4px; font-size: 10.5px; line-height: 1.2; color: var(--ink-dim); text-align: center; max-width: 84px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-shadow: 0 1px 3px #000, 0 1px 3px #000;
}
#mindmap-view .mm-node:hover .avatar { transform: scale(1.08); }
#mindmap-view .mm-node.dim { opacity: .16; }
#mindmap-view .mm-node.sel .avatar { border-color: var(--gold); box-shadow: 0 0 0 4px rgba(232,182,76,.3), 0 2px 10px rgba(0,0,0,.5); }
#mindmap-view .mm-node.sel .mm-label { color: var(--gold); }
#mindmap-view .mm-node.neighbor .avatar { border-color: var(--gold-dim); }
#mindmap-view .mm-node.neighbor .mm-label { color: var(--ink); }
#mindmap-view .mm-hint {
  position: absolute; left: 10px; bottom: 8px; font-size: 11px; color: var(--ink-faint); pointer-events: none;
  background: rgba(20,17,12,.55); padding: 3px 8px; border-radius: 6px;
}
#mindmap-view .mm-zoom-note { position: absolute; right: 10px; bottom: 8px; font-size: 11px; color: var(--ink-faint); pointer-events: none; background: rgba(20,17,12,.55); padding: 3px 8px; border-radius: 6px; }
#mindmap-view .mm-side {
  width: 300px; flex: none; background: var(--panel); border: 1px solid var(--line); border-radius: var(--rad);
  padding: 16px; max-height: min(70vh, 620px); min-height: 420px; overflow-y: auto;
}
#mindmap-view .mm-side-empty { color: var(--ink-faint); font-size: 13.5px; padding-top: 10px; }
#mindmap-view .mm-side-head { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
#mindmap-view .mm-side-avatar { width: 58px; height: 58px; border-radius: 50%; overflow: hidden; border: 2px solid var(--gold-dim); flex: none; background: var(--bg2); }
#mindmap-view .mm-side-avatar .avatar, #mindmap-view .mm-side-avatar svg, #mindmap-view .mm-side-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
#mindmap-view .mm-side-head h3 { margin: 0 0 2px; font-size: 17px; }
#mindmap-view .mm-side-title { font-size: 12.5px; color: var(--gold-dim); }
#mindmap-view .mm-side-era { font-size: 11.5px; color: var(--ink-faint); margin-top: 1px; }
#mindmap-view .mm-open-link { display: inline-flex; margin: 4px 0 14px; font-size: 13px; padding: 7px 12px; }
#mindmap-view .mm-side-sub {
  font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: var(--ink-faint); margin: 10px 0 6px; font-family: var(--sans);
}
#mindmap-view .mm-rel-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
#mindmap-view .mm-rel-item {
  display: flex; flex-direction: column; align-items: flex-start; width: 100%; text-align: left; gap: 1px;
  background: var(--panel2); border: 1px solid var(--line); border-radius: 8px; padding: 6px 10px; cursor: pointer; font-family: var(--sans);
}
#mindmap-view .mm-rel-item:hover { border-color: var(--gold-dim); }
#mindmap-view .mm-rel-item.offscreen { border-style: dashed; }
#mindmap-view .mm-rel-phrase { font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; color: var(--gold-dim); }
#mindmap-view .mm-rel-name { font-size: 13.5px; color: var(--ink); }
#mindmap-view .mm-side-empty-note { color: var(--ink-faint); font-size: 13px; }
#mindmap-view .mm-focus-note { font-size: 12px; color: var(--ink-faint); margin: 0 0 12px; }
@media (max-width: 860px) {
  #mindmap-view .mm-layout { flex-direction: column; }
  #mindmap-view .mm-side { width: auto; max-height: 320px; }
  #mindmap-view .mm-hint { display: none; }
}
`;

// ---------------------------------------------------------------------------
// relationship-category classification (for the filter control)
// ---------------------------------------------------------------------------
const FAMILY_RE = /son|daughter|father|mother|brother|sister|husband|wife|spouse|parent|child|sibling|grandfather|grandmother|grandson|granddaughter|uncle|aunt|nephew|niece|cousin|kin|marri|betroth|widow/i;
const CONFLICT_RE = /enemy|oppos|betray|\bkill|slew|slain|\bwar\b|warred|warring|rival|persecut|imprison|conspir|hunted|hostile|threat/i;
const MENTOR_RE = /taught|teach|disciple|convert|mentor|ordain|baptiz|apostle|companion|missionary|successor|predecessor|minister|servant|master|heal|prophes|guide|led\b|follow|wrote to|received/i;

function classify(rel) {
  const r = String(rel || '').toLowerCase();
  if (FAMILY_RE.test(r)) return 'family';
  if (CONFLICT_RE.test(r)) return 'conflict';
  if (MENTOR_RE.test(r)) return 'mentor';
  return 'other';
}

const FILTERS = [
  { id: 'all', label: 'All ties' },
  { id: 'family', label: 'Family' },
  { id: 'mentor', label: 'Mentor & convert' },
  { id: 'conflict', label: 'Conflict' },
];

// best-effort reverse phrasing, e.g. "son of" seen from the other side reads "parent of"
const REV = {
  'son of': 'parent of', 'daughter of': 'parent of', 'father of': 'child of', 'mother of': 'child of',
  'brother of': 'sibling of', 'sister of': 'sibling of', 'husband of': 'spouse of', 'wife of': 'spouse of',
  'grandfather of': 'grandchild of', 'grandmother of': 'grandchild of', 'grandson of': 'grandparent of', 'granddaughter of': 'grandparent of',
  'uncle of': 'niece/nephew of', 'aunt of': 'niece/nephew of', 'nephew of': 'aunt/uncle of', 'niece of': 'aunt/uncle of',
  'taught by': 'taught', 'teacher of': 'disciple of', 'disciple of': 'teacher of', 'mentor of': 'mentored by', 'mentored by': 'mentor of',
  'converted': 'converted by', 'converted by': 'converted', 'baptized': 'baptized by', 'baptized by': 'baptized',
  'ordained': 'ordained by', 'ordained by': 'ordained', 'enemy of': 'enemy of', 'rival of': 'rival of',
  'betrayed': 'betrayed by', 'betrayed by': 'betrayed', 'killed': 'killed by', 'killed by': 'killed',
  'opposed': 'opposed by', 'opposed by': 'opposed', 'companion of': 'companion of', 'friend of': 'friend of',
  'wrote to': 'received a letter from', 'received a letter from': 'wrote to',
  'successor of': 'predecessor of', 'predecessor of': 'successor of',
  'apostle of': "called as apostle by", 'servant of': 'master of', 'master of': 'servant of',
};
function reversePhrase(rel) {
  const key = String(rel || '').toLowerCase().trim();
  return REV[key] || rel;
}

// primary-group -> legend bucket, so ~20 raw tags collapse into a readable legend
const LEGEND_GROUPS = [
  { id: 'divine', label: 'Divine', color: '#e8b64c', tags: ['divine', 'godhead'] },
  { id: 'prophet', label: 'Prophet & witness', color: '#3fa7a0', tags: ['prophet', 'witness'] },
  { id: 'king', label: 'King, judge & patriarch', color: '#c87f3a', tags: ['king', 'ruler', 'judge', 'patriarch', 'matriarch', 'priest'] },
  { id: 'mission', label: 'Apostle & missionary', color: '#8e6bb8', tags: ['apostle', 'disciple', 'missionary'] },
  { id: 'antagonist', label: 'Antagonist', color: '#b8524f', tags: ['antagonist', 'pharisee'] },
  { id: 'convert', label: 'Convert & martyr', color: '#7fae63', tags: ['convert', 'martyr'] },
  { id: 'family', label: 'Family', color: '#d9c08a', tags: ['family'] },
  { id: 'other', label: 'Other', color: '#8a8069', tags: ['hero', 'leader', 'record-keeper', 'quoted'] },
];
const GROUP_BY_TAG = {};
for (const g of LEGEND_GROUPS) for (const t of g.tags) GROUP_BY_TAG[t] = g;
const FALLBACK_GROUP = { id: 'other', label: 'Other', color: '#8a8069' };
function primaryGroup(ent) {
  const groups = (ent && ent.groups) || [];
  for (const t of groups) if (GROUP_BY_TAG[t]) return GROUP_BY_TAG[t];
  return FALLBACK_GROUP;
}

// ---------------------------------------------------------------------------
// deterministic PRNG (mulberry32) so the initial layout seed is stable
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// dimensions for a single connected component's own force-layout canvas —
// generous enough that repulsion has room to work, but small enough that a
// two- or three-person branch doesn't waste huge amounts of empty packing
// space next to the big clusters.
function componentDims(n) {
  const side = Math.round(Math.sqrt(Math.max(n, 1)) * 130 + 170);
  const w = Math.max(220, Math.min(1400, side));
  return { width: w, height: Math.round(w * 0.76) };
}

// simple Fruchterman-Reingold-style force layout, settled over a fixed
// number of iterations then handed back as static positions.
function layoutGraph(nodeIds, edges, dims) {
  const width = dims.width, height = dims.height;
  const n = nodeIds.length;
  const rand = mulberry32(2026070 + n * 97);
  const nodes = nodeIds.map((id, i) => {
    const a = (i / Math.max(n, 1)) * Math.PI * 2;
    const r = Math.min(width, height) * (0.16 + 0.3 * rand());
    return { id: id, x: width / 2 + Math.cos(a) * r, y: height / 2 + Math.sin(a) * r };
  });
  if (n <= 1) return nodes;
  const idx = new Map(nodes.map((nd, i) => [nd.id, i]));
  const pairs = [];
  for (const e of edges) {
    const a = idx.get(e.from), b = idx.get(e.to);
    if (a != null && b != null && a !== b) pairs.push([a, b]);
  }
  const area = width * height;
  // Repulsion is intentionally weak relative to gravity (below): tuned by
  // measuring how densely nodes fill their bounding circle across a range of
  // real component sizes (2 to 51 nodes) until the middle stopped hollowing
  // out into a ring. Stronger repulsion looks "more physically correct" but
  // actually makes every loosely-tied pocket shove itself out to the rim.
  const k = Math.sqrt(area / n) * 0.25;
  let temp = Math.max(width, height) * 0.05;
  const iterations = n > 90 ? 170 : (n > 40 ? 220 : 260);
  const dx = new Float64Array(n), dy = new Float64Array(n);
  const centerX = width / 2, centerY = height / 2;
  // Constant pull toward the canvas center. Without this, weakly-tied
  // pockets within a component (in-laws, one-off encounters — connected to
  // the whole only by a single bridging edge) have nothing pulling them
  // inward and pure repulsion flings them out to the clamped canvas edges,
  // hollowing out the middle. This gravity term keeps everything gathered
  // into one legible, roughly-filled scene regardless of how loosely the
  // graph is knit together.
  const gravity = 0.12;
  for (let iter = 0; iter < iterations; iter++) {
    dx.fill(0); dy.fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let ddx = nodes[i].x - nodes[j].x, ddy = nodes[i].y - nodes[j].y;
        let dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dist < 0.01) dist = 0.01;
        const force = (k * k) / dist;
        const ux = ddx / dist, uy = ddy / dist;
        dx[i] += ux * force; dy[i] += uy * force;
        dx[j] -= ux * force; dy[j] -= uy * force;
      }
    }
    for (let p = 0; p < pairs.length; p++) {
      const a = pairs[p][0], b = pairs[p][1];
      let ddx = nodes[a].x - nodes[b].x, ddy = nodes[a].y - nodes[b].y;
      let dist = Math.sqrt(ddx * ddx + ddy * ddy);
      if (dist < 0.01) dist = 0.01;
      const force = (dist * dist) / k;
      const ux = ddx / dist, uy = ddy / dist;
      dx[a] -= ux * force; dy[a] -= uy * force;
      dx[b] += ux * force; dy[b] += uy * force;
    }
    for (let i = 0; i < n; i++) {
      dx[i] += (centerX - nodes[i].x) * gravity;
      dy[i] += (centerY - nodes[i].y) * gravity;
    }
    for (let i = 0; i < n; i++) {
      let dlen = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]);
      if (dlen < 0.01) dlen = 0.01;
      const lim = Math.min(dlen, temp);
      nodes[i].x += (dx[i] / dlen) * lim;
      nodes[i].y += (dy[i] / dlen) * lim;
      nodes[i].x = Math.max(50, Math.min(width - 50, nodes[i].x));
      nodes[i].y = Math.max(50, Math.min(height - 50, nodes[i].y));
    }
    // Loose safety-net containment: gravity above does the real work of
    // keeping the component gathered; this just guards against pathological
    // blow-ups (e.g. a future data change producing an oddly dense
    // component) by gently reining things in only if the cloud gets
    // implausibly wide, without otherwise interfering with where gravity and
    // repulsion settle it.
    {
      let sx = 0, sy = 0;
      for (let i = 0; i < n; i++) { sx += nodes[i].x; sy += nodes[i].y; }
      const gx = sx / n, gy = sy / n;
      let maxR = 0;
      for (let i = 0; i < n; i++) {
        const ddx = nodes[i].x - gx, ddy = nodes[i].y - gy;
        const r = Math.sqrt(ddx * ddx + ddy * ddy);
        if (r > maxR) maxR = r;
      }
      const targetR = Math.min(width, height) * 0.6;
      if (maxR > targetR) {
        const shrink = 0.985;
        for (let i = 0; i < n; i++) {
          nodes[i].x = gx + (nodes[i].x - gx) * shrink;
          nodes[i].y = gy + (nodes[i].y - gy) * shrink;
        }
      }
    }
    temp *= 0.985;
  }
  // Direct post-process collision relaxation: guarantee a minimum visual
  // separation between every pair of avatars regardless of how the force
  // simulation happened to settle them. Folding this into the main force
  // loop above (as just another repulsion term) turned out to barely move
  // the needle — it gets diluted once summed together with every other
  // node's pull and clipped to the per-iteration step size — so instead it
  // runs as its own small constraint-relaxation pass on the final positions.
  const minSep = 78;
  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let ddx = nodes[i].x - nodes[j].x, ddy = nodes[i].y - nodes[j].y;
        let dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dist < 0.01) dist = 0.01;
        if (dist < minSep) {
          const overlap = (minSep - dist) / 2;
          const ux = ddx / dist, uy = ddy / dist;
          nodes[i].x += ux * overlap; nodes[i].y += uy * overlap;
          nodes[j].x -= ux * overlap; nodes[j].y -= uy * overlap;
        }
      }
    }
  }
  return nodes;
}

// Real relationship data is rarely one giant connected blob — a scripture
// graph is a big central web of family/ministry ties plus a long tail of
// small isolated pairs and triples (in-laws, one-off encounters, etc). Pure
// pairwise repulsion has no way to pull those disconnected pieces toward the
// middle, so laying the whole node set out in one shared force simulation
// leaves a hollow ring (everything shoved to the canvas edge). Instead, each
// connected component gets its own compact force-settled layout, and the
// components are then tiled together like boxes — legible regardless of how
// fragmented the graph is.
function connectedComponents(nodeIds, edges) {
  const nodeSet = new Set(nodeIds);
  const adjLocal = new Map();
  const add = (a, b) => { if (!adjLocal.has(a)) adjLocal.set(a, new Set()); adjLocal.get(a).add(b); };
  for (const e of edges) {
    if (nodeSet.has(e.from) && nodeSet.has(e.to)) { add(e.from, e.to); add(e.to, e.from); }
  }
  const seen = new Set();
  const comps = [];
  for (const id of nodeIds) {
    if (seen.has(id)) continue;
    const comp = [];
    const stack = [id];
    seen.add(id);
    while (stack.length) {
      const cur = stack.pop();
      comp.push(cur);
      const nb = adjLocal.get(cur);
      if (nb) nb.forEach(x => { if (!seen.has(x)) { seen.add(x); stack.push(x); } });
    }
    comps.push(comp);
  }
  return comps;
}

// simple shelf/row bin-packing: place each component's tight bounding box
// left-to-right, wrapping to a new row once a target row width is exceeded.
function packComponents(pieces) {
  const gap = 46;
  const totalArea = pieces.reduce((s, p) => s + p.width * p.height, 0);
  const rowWidth = Math.max(900, Math.ceil(Math.sqrt(totalArea) * 1.25));
  let x = 0, y = 0, rowH = 0, totalW = 0, totalH = 0;
  const placedNodes = [];
  for (const p of pieces) {
    if (x > 0 && x + p.width > rowWidth) { x = 0; y += rowH + gap; rowH = 0; }
    for (const nd of p.nodes) placedNodes.push({ id: nd.id, x: nd.x + x, y: nd.y + y });
    x += p.width + gap;
    rowH = Math.max(rowH, p.height);
    totalW = Math.max(totalW, x - gap);
    totalH = Math.max(totalH, y + rowH);
  }
  return { nodes: placedNodes, width: Math.max(600, totalW), height: Math.max(450, totalH) };
}

function layoutMultiComponent(nodeIds, edges) {
  const comps = connectedComponents(nodeIds, edges).sort((a, b) => b.length - a.length);
  const pieces = comps.map(comp => {
    const compSet = new Set(comp);
    const compEdges = edges.filter(e => compSet.has(e.from) && compSet.has(e.to));
    const dims = componentDims(comp.length);
    const nodes = comp.length <= 1
      ? comp.map(id => ({ id: id, x: dims.width / 2, y: dims.height / 2 }))
      : layoutGraph(comp, compEdges, dims);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const nd of nodes) {
      if (nd.x < minX) minX = nd.x; if (nd.x > maxX) maxX = nd.x;
      if (nd.y < minY) minY = nd.y; if (nd.y > maxY) maxY = nd.y;
    }
    const pad = 55;
    const w = (maxX - minX) + pad * 2, h = (maxY - minY) + pad * 2;
    const shifted = nodes.map(nd => ({ id: nd.id, x: nd.x - minX + pad, y: nd.y - minY + pad }));
    return { nodes: shifted, width: w, height: h };
  });
  return packComponents(pieces);
}

function buildAdjacency(edges) {
  const m = new Map();
  const add = (a, b) => { if (!m.has(a)) m.set(a, new Set()); m.get(a).add(b); };
  for (const e of edges) { add(e.from, e.to); add(e.to, e.from); }
  return m;
}
function bfsHops(adj, start, maxHops) {
  const visited = new Set([start]);
  let frontier = [start];
  for (let h = 0; h < maxHops; h++) {
    const next = [];
    for (const id of frontier) {
      const nb = adj.get(id);
      if (!nb) continue;
      nb.forEach(nId => { if (!visited.has(nId)) { visited.add(nId); next.push(nId); } });
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return visited;
}

export async function renderMindmap(el, params) {
  // The CSS ships as a <style id="mindmap-css"> inline in the template below.
  // Because el.innerHTML is replaced wholesale on every render (navigation or
  // re-render), the old <style> node — if any — is discarded along with it,
  // so the id can never end up duplicated in the document.
  el.innerHTML = '<div class="wrap"><h1 class="page-title">Mind Map</h1><p class="section-intro">Charting every relationship in scripture&hellip;</p></div>';

  const [ents, edgesAllRaw] = await Promise.all([entities(), relationEdges()]);
  const byId = ents.byId;
  const edgesAll = edgesAllRaw.filter(e => byId[e.from] && byId[e.to] && e.from !== e.to);

  const nodeIdSetAll = new Set();
  for (const e of edgesAll) { nodeIdSetAll.add(e.from); nodeIdSetAll.add(e.to); }
  const nodeIdsAll = Array.from(nodeIdSetAll);

  if (!nodeIdsAll.length) {
    el.innerHTML = `<div class="wrap"><h1 class="page-title">Mind Map</h1><p class="section-intro">No relationships are recorded yet.</p></div>`;
    return;
  }

  const adj = buildAdjacency(edgesAll);
  const degree = new Map();
  for (const id of nodeIdsAll) degree.set(id, (adj.get(id) || new Set()).size);

  const HUB_CANDIDATES = ['lehi1', 'jesus-christ', 'nephi1'];
  const focusParam = params && typeof params.get === 'function' ? params.get('focus') : null;
  let defaultFocus = (focusParam && nodeIdSetAll.has(focusParam)) ? focusParam : null;
  if (!defaultFocus) {
    let best = null, bestDeg = -1;
    for (const c of HUB_CANDIDATES) {
      if (nodeIdSetAll.has(c) && degree.get(c) > bestDeg) { best = c; bestDeg = degree.get(c); }
    }
    if (!best) {
      for (const id of nodeIdsAll) { const d = degree.get(id) || 0; if (d > bestDeg) { bestDeg = d; best = id; } }
    }
    defaultFocus = best;
  }

  el.id = el.id || 'view';
  el.innerHTML = `
  <style id="mindmap-css">${CSS}</style>
  <div class="wrap" id="mindmap-view">
    <div class="eyebrow">How the story connects</div>
    <h1 class="page-title">Mind Map</h1>
    <p class="section-intro">Every recorded tie between the ${nodeIdsAll.length} characters who have a relationship on record — family,
    covenant, mentorship and conflict — across all four volumes. Drag the canvas to pan, scroll to zoom, drag a person to move
    them, and click anyone to see how they connect.</p>

    <div class="mm-toolbar">
      <div class="mm-search-wrap">
        <input type="search" id="mm-search" placeholder="Find a character…" autocomplete="off">
        <div class="mm-search-results" id="mm-search-results"></div>
      </div>
      <div class="mm-filters" id="mm-filters">
        ${FILTERS.map(f => `<button type="button" class="pill link${f.id === 'all' ? ' active' : ''}" data-filter="${f.id}">${esc(f.label)}</button>`).join('')}
      </div>
      <div class="mm-spacer"></div>
      <button type="button" class="btn" id="mm-scope">Show everyone</button>
      <button type="button" class="btn" id="mm-reset">Reset view</button>
    </div>
    <div class="mm-legend" id="mm-legend">
      ${LEGEND_GROUPS.map(g => `<span class="lg-item"><span class="lg-dot" style="background:${g.color}"></span>${esc(g.label)}</span>`).join('')}
    </div>

    <div class="mm-layout">
      <div class="mm-stage" id="mm-stage">
        <div class="mm-world" id="mm-world">
          <svg class="mm-edges" id="mm-edges"></svg>
          <div class="mm-nodes" id="mm-nodes"></div>
        </div>
        <div class="mm-hint">drag background to pan · scroll to zoom · drag a person · click to select</div>
        <div class="mm-zoom-note" id="mm-zoom-note"></div>
      </div>
      <aside class="mm-side" id="mm-side"></aside>
    </div>
  </div>`;

  const stageEl = el.querySelector('#mm-stage');
  const worldEl = el.querySelector('#mm-world');
  const edgesEl = el.querySelector('#mm-edges');
  const nodesEl = el.querySelector('#mm-nodes');
  const sideEl = el.querySelector('#mm-side');
  const filtersEl = el.querySelector('#mm-filters');
  const scopeBtn = el.querySelector('#mm-scope');
  const resetBtn = el.querySelector('#mm-reset');
  const searchInput = el.querySelector('#mm-search');
  const searchResultsEl = el.querySelector('#mm-search-results');
  const zoomNoteEl = el.querySelector('#mm-zoom-note');

  const state = { mode: 'focus', focusId: defaultFocus, selectedId: defaultFocus, filter: 'all' };
  let scale = 1, tx = 0, ty = 0;
  const layoutCache = new Map();
  let currentLayout = { nodes: [], width: 800, height: 600 };
  let currentNodeSet = new Set();
  let currentEdges = [];
  let posById = new Map();
  let nodeElsById = new Map();
  let edgeEls = [];

  function computeSubgraph() {
    let nodeSet;
    if (state.mode === 'all') nodeSet = nodeIdSetAll;
    else nodeSet = bfsHops(adj, state.focusId, 2);
    const edges = edgesAll.filter(e => nodeSet.has(e.from) && nodeSet.has(e.to));
    return { nodeIds: Array.from(nodeSet), edges: edges };
  }

  function getLayout(key, nodeIds, edges) {
    if (layoutCache.has(key)) return layoutCache.get(key);
    const result = layoutMultiComponent(nodeIds, edges);
    layoutCache.set(key, result);
    return result;
  }

  function applyTransform() {
    worldEl.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    zoomNoteEl.textContent = Math.round(scale * 100) + '%';
  }

  function fitToView(animate) {
    const rect = stageEl.getBoundingClientRect();
    const sw = rect.width || 800, sh = rect.height || 600;
    const nodes = currentLayout.nodes;
    if (animate) { worldEl.classList.add('mm-anim'); setTimeout(() => worldEl.classList.remove('mm-anim'), 370); }
    if (!nodes.length) { scale = 1; tx = sw / 2; ty = sh / 2; applyTransform(); return; }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const nd of nodes) {
      if (nd.x < minX) minX = nd.x; if (nd.x > maxX) maxX = nd.x;
      if (nd.y < minY) minY = nd.y; if (nd.y > maxY) maxY = nd.y;
    }
    const pad = 70;
    const bw = Math.max(1, (maxX - minX) + pad * 2), bh = Math.max(1, (maxY - minY) + pad * 2);
    let s = Math.min(sw / bw, sh / bh);
    s = Math.max(0.3, Math.min(1.5, s));
    scale = s;
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    tx = sw / 2 - cx * s;
    ty = sh / 2 - cy * s;
    applyTransform();
  }

  function centerOn(id) {
    const pos = posById.get(id);
    if (!pos) return;
    const rect = stageEl.getBoundingClientRect();
    const sw = rect.width || 800, sh = rect.height || 600;
    scale = Math.max(scale, 0.65);
    tx = sw / 2 - pos.x * scale;
    ty = sh / 2 - pos.y * scale;
    worldEl.classList.add('mm-anim');
    setTimeout(() => worldEl.classList.remove('mm-anim'), 370);
    applyTransform();
  }

  function renderGraphDOM() {
    const nodes = currentLayout.nodes, width = currentLayout.width, height = currentLayout.height;
    worldEl.style.width = width + 'px';
    worldEl.style.height = height + 'px';
    edgesEl.setAttribute('width', String(width));
    edgesEl.setAttribute('height', String(height));
    nodesEl.style.width = width + 'px';
    nodesEl.style.height = height + 'px';

    posById = new Map(nodes.map(nd => [nd.id, nd]));

    const defs = '<defs><marker id="mm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--line)"></path></marker></defs>';
    const edgeMarkup = currentEdges.map((e, i) => {
      const a = posById.get(e.from), b = posById.get(e.to);
      if (!a || !b) return '';
      const cat = classify(e.rel);
      const fromName = byId[e.from] ? byId[e.from].name : e.from;
      const toName = byId[e.to] ? byId[e.to].name : e.to;
      return `<line class="mm-edge" data-i="${i}" data-cat="${cat}" x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" marker-end="url(#mm-arrow)"><title>${esc(fromName)} — ${esc(e.rel)} — ${esc(toName)}</title></line>`;
    }).join('');
    edgesEl.innerHTML = defs + edgeMarkup;

    nodesEl.innerHTML = nodes.map(nd => {
      const ent = byId[nd.id];
      if (!ent) return '';
      const grp = primaryGroup(ent);
      return `<div class="mm-node" data-id="${esc(nd.id)}" style="left:${nd.x.toFixed(1)}px;top:${nd.y.toFixed(1)}px;--grp-color:${grp.color};">
        ${avatar(ent)}
        <div class="mm-label">${esc(ent.name)}</div>
      </div>`;
    }).join('');

    nodeElsById = new Map();
    nodesEl.querySelectorAll('.mm-node').forEach(nEl => nodeElsById.set(nEl.getAttribute('data-id'), nEl));
    edgeEls = [];
    edgesEl.querySelectorAll('.mm-edge').forEach(eEl => {
      const i = parseInt(eEl.getAttribute('data-i'), 10);
      const e = currentEdges[i];
      if (e) edgeEls.push({ el: eEl, from: e.from, to: e.to });
    });
  }

  function updateHighlight() {
    const sel = state.selectedId;
    const nbSet = sel ? (adj.get(sel) || new Set()) : null;
    nodeElsById.forEach((nEl, id) => {
      const isSel = id === sel;
      const isNb = !!sel && !isSel && !!nbSet && nbSet.has(id);
      nEl.classList.toggle('sel', isSel);
      nEl.classList.toggle('neighbor', isNb);
      nEl.classList.toggle('dim', !!sel && !isSel && !isNb);
    });
    for (const eo of edgeEls) {
      const cat = eo.el.getAttribute('data-cat');
      const filterDim = state.filter !== 'all' && cat !== state.filter;
      const touchesSel = !!sel && (eo.from === sel || eo.to === sel);
      const selDim = !!sel && !touchesSel;
      eo.el.classList.toggle('hl', touchesSel);
      eo.el.classList.toggle('dim', filterDim || selDim);
    }
  }

  function relsFor(id) {
    const out = [];
    const seen = new Set();
    for (const e of edgesAll) {
      if (e.from === id) { out.push({ other: e.to, label: e.rel }); seen.add(e.to); }
    }
    for (const e of edgesAll) {
      if (e.to === id && !seen.has(e.from)) { out.push({ other: e.from, label: reversePhrase(e.rel) }); seen.add(e.from); }
    }
    return out;
  }

  function renderSidePanelEmpty() {
    sideEl.innerHTML = `<div class="mm-side-empty"><p>Select anyone in the graph — or search above — to see their portrait and
    every relationship recorded for them. Click a listed name to jump straight to that person.</p></div>`;
  }

  function renderSidePanel(id) {
    const ent = byId[id];
    if (!ent) { renderSidePanelEmpty(); return; }
    const rels = relsFor(id);
    sideEl.innerHTML = `
      <div class="mm-side-head">
        <div class="mm-side-avatar">${avatar(ent)}</div>
        <div>
          <h3>${esc(ent.name)}</h3>
          <div class="mm-side-title">${esc(ent.title || '')}</div>
          ${ent.era ? `<div class="mm-side-era">${esc(ent.era)}</div>` : ''}
        </div>
      </div>
      <a class="btn primary mm-open-link" href="#/character/${encodeURIComponent(id)}">Open character page →</a>
      <h4 class="mm-side-sub">Relationships${rels.length ? ' (' + rels.length + ')' : ''}</h4>
      ${rels.length ? `<ul class="mm-rel-list">${rels.map(r => {
        const o = byId[r.other];
        const offscreen = !currentNodeSet.has(r.other);
        return `<li><button type="button" class="mm-rel-item${offscreen ? ' offscreen' : ''}" data-id="${esc(r.other)}" title="${offscreen ? 'Not shown in this view — click to jump there' : ''}">
          <span class="mm-rel-phrase">${esc(r.label)}</span>
          <span class="mm-rel-name">${esc(o ? o.name : r.other)}</span>
        </button></li>`;
      }).join('')}</ul>` : `<p class="mm-side-empty-note">No recorded ties.</p>`}
    `;
  }

  function selectNode(id) {
    if (!byId[id]) return;
    if (!currentNodeSet.has(id)) {
      state.mode = 'focus';
      state.focusId = id;
      state.selectedId = id;
      rebuild(true);
      return;
    }
    state.selectedId = id;
    updateHighlight();
    renderSidePanel(id);
    centerOn(id);
  }

  function clearSelection() {
    state.selectedId = null;
    updateHighlight();
    renderSidePanelEmpty();
  }

  function rebuild(animateFit) {
    const sub = computeSubgraph();
    const key = state.mode === 'all' ? 'all' : ('focus:' + state.focusId);
    currentLayout = getLayout(key, sub.nodeIds, sub.edges);
    currentNodeSet = new Set(sub.nodeIds);
    currentEdges = sub.edges;
    renderGraphDOM();
    fitToView(!!animateFit);
    updateHighlight();
    scopeBtn.textContent = state.mode === 'all' ? 'Focus view' : 'Show everyone';
    scopeBtn.classList.toggle('active', state.mode === 'all');
    if (state.selectedId && byId[state.selectedId]) renderSidePanel(state.selectedId);
    else renderSidePanelEmpty();
  }

  // ---- interaction: pan, zoom, drag ----
  let panState = null, nodeDragState = null;

  function onStageMouseDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest && e.target.closest('.mm-node')) return;
    panState = { startX: e.clientX, startY: e.clientY, origTx: tx, origTy: ty, moved: false };
    stageEl.classList.add('panning');
  }
  function onNodesMouseDown(e) {
    const nd = e.target.closest && e.target.closest('.mm-node');
    if (!nd) return;
    e.preventDefault();
    e.stopPropagation();
    const id = nd.getAttribute('data-id');
    const pos = posById.get(id);
    if (!pos) return;
    nodeDragState = { id: id, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y, moved: false };
  }
  function onWindowMouseMove(e) {
    if (nodeDragState) {
      const dxp = (e.clientX - nodeDragState.startX) / scale;
      const dyp = (e.clientY - nodeDragState.startY) / scale;
      if (Math.abs(dxp) > 2 || Math.abs(dyp) > 2) nodeDragState.moved = true;
      const pos = posById.get(nodeDragState.id);
      if (!pos) return;
      pos.x = nodeDragState.origX + dxp;
      pos.y = nodeDragState.origY + dyp;
      const nEl = nodeElsById.get(nodeDragState.id);
      if (nEl) { nEl.style.left = pos.x + 'px'; nEl.style.top = pos.y + 'px'; }
      for (const eo of edgeEls) {
        if (eo.from === nodeDragState.id) { eo.el.setAttribute('x1', pos.x.toFixed(1)); eo.el.setAttribute('y1', pos.y.toFixed(1)); }
        if (eo.to === nodeDragState.id) { eo.el.setAttribute('x2', pos.x.toFixed(1)); eo.el.setAttribute('y2', pos.y.toFixed(1)); }
      }
      return;
    }
    if (panState) {
      const dxp = e.clientX - panState.startX, dyp = e.clientY - panState.startY;
      if (Math.abs(dxp) > 2 || Math.abs(dyp) > 2) panState.moved = true;
      tx = panState.origTx + dxp;
      ty = panState.origTy + dyp;
      applyTransform();
    }
  }
  function onWindowMouseUp() {
    if (nodeDragState) {
      const dragged = nodeDragState.moved;
      const id = nodeDragState.id;
      nodeDragState = null;
      if (!dragged) selectNode(id);
    }
    if (panState) {
      const clicked = !panState.moved;
      panState = null;
      stageEl.classList.remove('panning');
      if (clicked) clearSelection();
    }
  }
  function onWheel(e) {
    e.preventDefault();
    const rect = stageEl.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const delta = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newScale = Math.max(0.2, Math.min(2.5, scale * delta));
    const wx = (mx - tx) / scale, wy = (my - ty) / scale;
    tx = mx - wx * newScale;
    ty = my - wy * newScale;
    scale = newScale;
    applyTransform();
  }

  let resizeTimer = null;
  function onResize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => fitToView(false), 150); }

  function onDocClickAway(e) {
    if (!searchResultsEl || searchResultsEl.style.display === 'none') return;
    if (e.target === searchInput) return;
    if (searchResultsEl.contains(e.target)) return;
    searchResultsEl.style.display = 'none';
  }

  stageEl.addEventListener('mousedown', onStageMouseDown);
  nodesEl.addEventListener('mousedown', onNodesMouseDown);
  stageEl.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('mousemove', onWindowMouseMove);
  window.addEventListener('mouseup', onWindowMouseUp);
  window.addEventListener('resize', onResize);
  document.addEventListener('mousedown', onDocClickAway);
  window.addEventListener('hashchange', function cleanup() {
    window.removeEventListener('mousemove', onWindowMouseMove);
    window.removeEventListener('mouseup', onWindowMouseUp);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('mousedown', onDocClickAway);
  }, { once: true });

  sideEl.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.mm-rel-item');
    if (b) selectNode(b.getAttribute('data-id'));
  });

  filtersEl.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-filter]');
    if (!b) return;
    state.filter = b.getAttribute('data-filter');
    filtersEl.querySelectorAll('[data-filter]').forEach(x => x.classList.toggle('active', x === b));
    updateHighlight();
  });

  scopeBtn.addEventListener('click', () => {
    state.mode = state.mode === 'all' ? 'focus' : 'all';
    if (state.mode === 'focus' && !state.focusId) state.focusId = defaultFocus;
    rebuild(true);
  });

  resetBtn.addEventListener('click', () => {
    state.mode = 'focus';
    state.focusId = defaultFocus;
    state.selectedId = defaultFocus;
    state.filter = 'all';
    filtersEl.querySelectorAll('[data-filter]').forEach(x => x.classList.toggle('active', x.getAttribute('data-filter') === 'all'));
    searchInput.value = '';
    searchResultsEl.style.display = 'none';
    rebuild(true);
  });

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) { searchResultsEl.innerHTML = ''; searchResultsEl.style.display = 'none'; return; }
    const matches = nodeIdsAll.filter(id => {
      const e = byId[id];
      return e && e.name.toLowerCase().indexOf(q) !== -1;
    }).slice(0, 8);
    searchResultsEl.innerHTML = matches.length
      ? matches.map(id => `<button type="button" class="mm-search-item" data-id="${esc(id)}">${esc(byId[id].name)}${byId[id].title ? ` <span style="color:var(--ink-faint)">— ${esc(byId[id].title)}</span>` : ''}</button>`).join('')
      : '<div class="mm-search-none">No matches</div>';
    searchResultsEl.style.display = 'block';
  });
  searchResultsEl.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.mm-search-item');
    if (!b) return;
    const id = b.getAttribute('data-id');
    searchInput.value = byId[id] ? byId[id].name : '';
    searchResultsEl.style.display = 'none';
    selectNode(id);
  });
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const first = searchResultsEl.querySelector('.mm-search-item');
      if (first) first.click();
    } else if (e.key === 'Escape') {
      searchResultsEl.style.display = 'none';
    }
  });

  rebuild(false);
}
