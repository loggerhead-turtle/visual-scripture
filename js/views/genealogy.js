import { loadGenealogy, entities, VOLUMES, esc } from '../data.js';
import { avatar } from '../portraits.js';

// ---------------------------------------------------------------- helpers

const volColor = id => {
  const v = VOLUMES.filter(x => x.id === id)[0];
  return v ? v.color : '#e8b64c';
};

// Turn a bare id into a readable fallback name when the entity record is
// missing (e.g. a name mentioned in a tree that hasn't been fully cast yet).
function prettyId(id) {
  const words = String(id).replace(/-/g, ' ').replace(/(\D)(\d+)$/, '$1 $2').trim();
  return words.replace(/\b\w/g, c => c.toUpperCase());
}

function getEntity(id, ents) {
  const e = ents.byId[id];
  if (e) return e;
  return { id, name: prettyId(id), title: '', era: '', relations: [], _unknown: true };
}

// Union-find over the tree's spouse pairs, so a person with one or more
// spouses can be rendered as a single "family unit" card row.
function buildSpouseIndex(spouses) {
  const parent = {};
  const find = x => {
    if (!(x in parent)) parent[x] = x;
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  };
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  const order = [];
  (spouses || []).forEach(pair => {
    const a = pair[0], b = pair[1];
    if (order.indexOf(a) === -1) order.push(a);
    if (order.indexOf(b) === -1) order.push(b);
    union(a, b);
  });
  const membersByRep = {};
  order.forEach(id => {
    const r = find(id);
    (membersByRep[r] = membersByRep[r] || []).push(id);
  });
  return {
    // Members of id's spouse group, arranged with `id` in the middle and
    // any other spouses fanned out to either side. That way every card
    // that sits next to `id` really is married to `id` — with 3+ spouses
    // the outer cards still read correctly via the "married to" title.
    unitFor(id) {
      const r = find(id);
      const all = membersByRep[r] || [id];
      const others = all.filter(x => x !== id);
      const left = [], right = [];
      others.forEach((x, i) => { (i % 2 === 0 ? right : left).push(x); });
      return left.concat([id]).concat(right);
    },
  };
}

// Build the forest of nodes for one tree from its flat edge list.
function buildForest(tree, ents) {
  const spouseIdx = buildSpouseIndex(tree.spouses);
  const edges = tree.edges || [];

  const childrenOfRaw = {};
  edges.forEach(e => {
    (childrenOfRaw[e.parent] = childrenOfRaw[e.parent] || []).push({ child: e.child, gap: e.gap || null });
  });
  const isChild = {};
  edges.forEach(e => { isChild[e.child] = true; });

  // candidate roots: the declared root, plus any parent that never appears
  // as a child (covers disconnected side-branches like an in-law's line)
  const rootIds = [];
  const seenRootGroup = {};
  const consider = id => {
    if (id == null) return;
    const key = spouseIdx.unitFor(id).slice().sort().join('|');
    if (seenRootGroup[key]) return;
    seenRootGroup[key] = true;
    rootIds.push(id);
  };
  consider(tree.root);
  edges.forEach(e => { if (!isChild[e.parent]) consider(e.parent); });

  const placed = {};

  function buildNode(anchorId) {
    if (placed[anchorId]) return null;
    const members = spouseIdx.unitFor(anchorId);
    members.forEach(m => { placed[m] = true; });

    const kidsMap = {}; // childId -> gap note (or null)
    const kidsOrder = [];
    members.forEach(m => {
      (childrenOfRaw[m] || []).forEach(({ child, gap }) => {
        if (kidsOrder.indexOf(child) === -1) kidsOrder.push(child);
        if (!(child in kidsMap) || (gap && !kidsMap[child])) kidsMap[child] = gap;
      });
    });

    const kids = [];
    kidsOrder.forEach(cid => {
      if (placed[cid]) return;
      const node = buildNode(cid);
      if (node) kids.push({ gap: kidsMap[cid], node });
    });

    return { anchorId, members: members.map(m => getEntity(m, ents)), kids };
  }

  const roots = [];
  rootIds.forEach(id => {
    if (placed[id]) return;
    const node = buildNode(id);
    if (node) roots.push(node);
  });
  return roots;
}

// ---------------------------------------------------------------- markup

function unitHtml(node) {
  const cards = node.members.map((ent, i) => {
    const card = `<a class="gen-card${ent._unknown ? ' gen-card--unknown' : ''}" href="#/character/${esc(ent.id)}">
      ${avatar(ent)}
      <div class="gen-card-name">${esc(ent.name)}</div>
      ${ent.title ? `<div class="gen-card-title">${esc(ent.title)}</div>` : ''}
    </a>`;
    return i === 0 ? card : `<span class="gen-marriage" title="married to"></span>${card}`;
  }).join('');
  return `<div class="gen-unit">${cards}</div>`;
}

function nodeHtml(node) {
  const kidsHtml = node.kids.length
    ? `<ul class="gen-level">${node.kids.map(({ gap, node: kid }) => `
        <li${node.kids.length === 1 ? ' class="only-kid"' : ''}>
          ${gap ? `<div class="gen-gap-connector"><span class="gen-gap-label">${esc(gap)}</span></div>` : ''}
          ${nodeHtml(kid)}
        </li>`).join('')}</ul>`
    : '';
  return `<div class="gen-node">${unitHtml(node)}${kidsHtml}</div>`;
}

function treeHtml(tree, ents) {
  const roots = buildForest(tree, ents);
  if (!roots.length) return `<p class="gen-empty">This tree has no charted lineage yet.</p>`;
  return `<div class="gen-scroll"><div class="gen-tree">
    <ul class="gen-level gen-root-level">${roots.map(r => `<li>${nodeHtml(r)}</li>`).join('')}</ul>
  </div></div>`;
}

// ---------------------------------------------------------------- view

const CSS = `
.gen-picker { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 22px; }
.gen-pill {
  display: inline-flex; align-items: center; gap: 7px; padding: 7px 14px; border-radius: 999px;
  font-size: 13px; border: 1px solid var(--line); color: var(--ink-dim); background: var(--panel);
  cursor: pointer; font-family: var(--sans); transition: border-color .15s ease, color .15s ease;
}
.gen-pill::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--pc, var(--gold)); flex: none; }
.gen-pill:hover { color: var(--ink); border-color: var(--pc, var(--gold-dim)); }
.gen-pill.active { color: var(--ink); border-color: var(--pc, var(--gold)); background: var(--panel2); box-shadow: 0 0 0 1px var(--pc, var(--gold)) inset; }

.gen-head {
  border-left: 4px solid var(--tc, var(--gold)); padding: 4px 0 4px 16px; margin-bottom: 22px;
}
.gen-head h2 { margin: 0 0 6px; font-family: var(--serif); font-size: 23px; color: var(--ink); }
.gen-head p { margin: 0; color: var(--ink-dim); font-size: 14px; max-width: 760px; }

.gen-legend { display: flex; flex-wrap: wrap; gap: 16px; margin: 0 0 18px; font-size: 12px; color: var(--ink-faint); }
.gen-legend span { display: inline-flex; align-items: center; gap: 6px; }
.gen-legend i { display: inline-block; width: 22px; height: 0; border-top: 2px solid var(--ink-faint); }
.gen-legend i.gap { border-top-style: dashed; border-color: var(--gold-dim); }
.gen-legend i.wed { border: none; width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--gold-dim); }

.gen-empty { color: var(--ink-dim); font-style: italic; }

.gen-scroll { overflow-x: auto; overflow-y: hidden; padding-bottom: 10px; }
.gen-tree { display: inline-block; min-width: 100%; padding: 6px 24px 10px; box-sizing: border-box; }

.gen-level, .gen-level ul { list-style: none; margin: 0; padding: 0; display: flex; }
.gen-level { justify-content: center; }
.gen-level li { position: relative; padding: 30px 12px 0; text-align: center; }
.gen-level li.only-kid { padding-top: 30px; }

.gen-root-level { padding-top: 0; }
.gen-root-level > li { padding-top: 0; gap: 36px; }
.gen-root-level > li::before, .gen-root-level > li::after { display: none; }

.gen-level li::before, .gen-level li::after {
  content: ''; position: absolute; top: 0; width: 50%; height: 30px; border-top: 2px solid var(--line-strong, #4a4230);
}
.gen-level li::before { right: 50%; }
.gen-level li::after { left: 50%; border-left: 2px solid var(--line-strong, #4a4230); }
.gen-level li:only-child::before, .gen-level li:only-child::after { display: none; }
.gen-level li:only-child { padding-top: 0; }
.gen-level li:first-child::before, .gen-level li:last-child::after { border: 0 none; }
.gen-level li:last-child::before { border-right: 2px solid var(--line-strong, #4a4230); border-radius: 0 8px 0 0; }
.gen-level li:first-child::after { border-radius: 8px 0 0 0; }
.gen-root-level > li:only-child { padding-top: 0; }

.gen-node > ul.gen-level { padding-top: 30px; position: relative; }
.gen-node > ul.gen-level::before {
  content: ''; position: absolute; top: 0; left: 50%; width: 0; height: 30px;
  border-left: 2px solid var(--line-strong, #4a4230); transform: translateX(-50%);
}

.gen-gap-connector { position: relative; height: 64px; margin-top: -30px; padding-top: 30px; }
.gen-gap-connector::before {
  content: ''; position: absolute; top: 30px; left: 50%; width: 0; height: 64px;
  border-left: 2px dashed var(--gold-dim); transform: translateX(-50%);
}
.gen-gap-label {
  position: absolute; top: 38px; left: 50%; transform: translateX(-50%);
  background: var(--bg2); color: var(--gold-dim); font-size: 10.5px; line-height: 1.3;
  padding: 3px 9px; border-radius: 10px; border: 1px solid var(--line);
  white-space: normal; width: max-content; max-width: 140px; text-align: center; z-index: 2;
}

.gen-unit { display: inline-flex; align-items: center; }
.gen-marriage { display: inline-block; width: 20px; height: 2px; background: var(--gold-dim); margin: 0 -1px; position: relative; top: 34px; }
.gen-marriage::before {
  content: '\\2721'; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  font-size: 9px; color: var(--gold-dim); background: var(--bg); border-radius: 50%; width: 13px; height: 13px;
  display: flex; align-items: center; justify-content: center; line-height: 1;
}

.gen-card {
  display: inline-flex; flex-direction: column; align-items: center; width: 104px; padding: 8px 6px 10px;
  background: var(--panel); border: 1px solid var(--line); border-radius: 10px; color: var(--ink);
  text-decoration: none; transition: transform .15s ease, border-color .15s ease; vertical-align: top;
}
.gen-card:hover { transform: translateY(-3px); border-color: var(--gold-dim); text-decoration: none; }
.gen-card .avatar { width: 58px; height: 58px; border-radius: 50%; overflow: hidden; border: 1px solid var(--line); background: var(--bg2); margin-bottom: 6px; }
.gen-card .avatar svg, .gen-card .avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.gen-card-name { font-size: 12px; font-weight: 600; line-height: 1.2; }
.gen-card-title { font-size: 10px; color: var(--gold-dim); line-height: 1.25; margin-top: 2px; }
.gen-card--unknown .gen-card-name { color: var(--ink-faint); font-style: italic; font-weight: 400; }

@media (max-width: 760px) {
  .gen-card { width: 86px; padding: 6px 4px 8px; }
  .gen-card .avatar { width: 46px; height: 46px; }
  .gen-card-name { font-size: 11px; }
  .gen-card-title { font-size: 9px; }
  .gen-level li { padding-left: 8px; padding-right: 8px; }
  .gen-root-level > li { gap: 22px; }
  .gen-marriage { width: 14px; }
}
`;

function ensureCss() {
  if (document.getElementById('genealogy-css')) return '';
  return `<style id="genealogy-css">${CSS}</style>`;
}

export async function renderGenealogy(el, params) {
  el.innerHTML = `<div class="wrap"><div class="loading">Unrolling the family records&hellip;</div></div>`;

  let gen, ents;
  try {
    [gen, ents] = await Promise.all([loadGenealogy(), entities()]);
  } catch (err) {
    el.innerHTML = `${ensureCss()}<div class="wrap"><div class="eyebrow">Genealogy</div>
      <h1 class="page-title">Family Trees</h1>
      <p class="section-intro">The family-tree records couldn't be loaded right now. Try refreshing the page.</p></div>`;
    return;
  }

  if (!gen || !gen.trees || !gen.trees.length) {
    el.innerHTML = `${ensureCss()}<div class="wrap"><div class="eyebrow">Genealogy</div>
      <h1 class="page-title">Family Trees</h1>
      <p class="section-intro">The family-tree charts are still being copied out by the scribes &mdash; check back soon.</p></div>`;
    return;
  }

  const trees = gen.trees;
  const wanted = params && params.get ? params.get('tree') : null;
  const initial = trees.filter(t => t.id === wanted)[0] || trees[0];

  el.innerHTML = `${ensureCss()}
  <div class="wrap gen-wrap">
    <div class="eyebrow">Genealogy</div>
    <h1 class="page-title">Family Trees</h1>
    <p class="section-intro">Trace the bloodlines and covenant lines that run through the scriptures. Choose a family below,
    then click any name to open their story.</p>
    <div class="gen-picker" id="gen-picker">
      ${trees.map(t => `<button type="button" class="gen-pill${t.id === initial.id ? ' active' : ''}" data-tree="${esc(t.id)}" style="--pc:${volColor(t.vol)}">${esc(t.title)}</button>`).join('')}
    </div>
    <div class="gen-legend">
      <span><i></i> parent &amp; child</span>
      <span><i class="gap"></i> generations skipped</span>
      <span><i class="wed"></i> married</span>
    </div>
    <div id="gen-head"></div>
    <div id="gen-body"></div>
  </div>`;

  const picker = el.querySelector('#gen-picker');
  const head = el.querySelector('#gen-head');
  const body = el.querySelector('#gen-body');

  function paint(tree) {
    picker.querySelectorAll('.gen-pill').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tree') === tree.id);
    });
    head.innerHTML = `<div class="gen-head" style="--tc:${volColor(tree.vol)}">
      <h2>${esc(tree.title)}</h2>
      ${tree.note ? `<p>${esc(tree.note)}</p>` : ''}
    </div>`;
    body.innerHTML = treeHtml(tree, ents);
    if (window.history && history.replaceState) {
      history.replaceState(null, '', '#/genealogy?tree=' + encodeURIComponent(tree.id));
    }
  }

  picker.addEventListener('click', e => {
    const btn = e.target.closest('.gen-pill');
    if (!btn) return;
    const t = trees.filter(x => x.id === btn.getAttribute('data-tree'))[0];
    if (t) paint(t);
  });

  paint(initial);
}
