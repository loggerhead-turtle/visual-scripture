import { bookBySlug, loadText, esc } from '../data.js';
import {
  listUsers, currentUser, signUp, signIn, signOut, deleteProfile,
  getStudy, setNote, setHighlight, toggleBookmark, refOf, parseRef,
  exportAll, importAll,
} from '../account.js';
import { HL_COLORS } from '../study-marks.js';

const initialOf = name => [...String(name || '?').trim()][0].toUpperCase();
const fmtWhen = iso => {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};
const refName = r => {
  const b = bookBySlug[r.slug];
  const base = r.slug === 'dc' ? `Section ${r.c}` : `${b ? b.name : r.slug} ${r.c}`;
  return r.v ? `${base}:${r.v}` : base;
};
const refHref = r => `#/read/${r.slug}/${r.c}${r.v ? `?v=${r.v}` : ''}`;

export async function renderStudy(el) {
  const user = currentUser();
  if (!user) { renderSignedOut(el); return; }
  await renderDashboard(el, user);
}

/* ---------------- signed out: pick a profile or create one ---------------- */

function renderSignedOut(el) {
  const users = listUsers();
  el.innerHTML = `
  <div class="wrap study-wrap">
    <div class="eyebrow">My Study</div>
    <h1 class="page-title">Keep your own margins</h1>
    <p class="section-intro">Sign in to bookmark where you are, highlight verses, and write notes that
    wait for you when you come back. Profiles live <strong>in this browser only</strong> — nothing is
    sent to any server — and your whole study journal can be exported as a file and imported on
    another device.</p>

    ${users.length ? `
    <section class="study-card">
      <h2>Sign in</h2>
      <div class="profile-pick">
        ${users.map(u => `
          <button class="profile-btn" data-id="${u.id}" data-locked="${u.hash ? '1' : ''}">
            <span class="acct-badge">${esc(initialOf(u.name))}</span>
            <span class="pb-name">${esc(u.name)}</span>
            <span class="pb-sub">${u.hash ? '🔒 password' : 'tap to open'}</span>
          </button>`).join('')}
      </div>
      <form class="unlock-row" id="unlock-row" hidden>
        <input type="password" id="unlock-pass" placeholder="Password" autocomplete="current-password">
        <button class="btn primary" type="submit">Unlock</button>
        <span class="form-err" id="unlock-err"></span>
      </form>
    </section>` : ''}

    <section class="study-card">
      <h2>${users.length ? 'Or create a new profile' : 'Create your profile'}</h2>
      <form class="signup-form" id="signup-form">
        <label>Name<input type="text" id="su-name" maxlength="40" placeholder="e.g. Erik" autocomplete="username" required></label>
        <label>Password <span class="opt">(optional — locks the profile on shared devices)</span>
          <input type="password" id="su-pass" placeholder="Leave blank for none" autocomplete="new-password"></label>
        <div><button class="btn primary" type="submit">Create profile &amp; sign in</button>
        <span class="form-err" id="su-err"></span></div>
      </form>
    </section>
  </div>`;

  let pendingId = null;
  const unlockRow = el.querySelector('#unlock-row');
  el.querySelectorAll('.profile-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!btn.dataset.locked) {
        await signIn(id, '');
        renderStudy(el);
        return;
      }
      pendingId = id;
      el.querySelectorAll('.profile-btn').forEach(b => b.classList.toggle('sel', b === btn));
      unlockRow.hidden = false;
      el.querySelector('#unlock-err').textContent = '';
      el.querySelector('#unlock-pass').focus();
    });
  });
  if (unlockRow) unlockRow.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await signIn(pendingId, el.querySelector('#unlock-pass').value);
      renderStudy(el);
    } catch (err) {
      el.querySelector('#unlock-err').textContent = err.message;
    }
  });

  el.querySelector('#signup-form').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await signUp(el.querySelector('#su-name').value, el.querySelector('#su-pass').value);
      renderStudy(el);
    } catch (err) {
      el.querySelector('#su-err').textContent = err.message;
    }
  });
}

/* ---------------- signed in: the study dashboard ---------------- */

async function renderDashboard(el, user) {
  const d = getStudy();
  const noteRefs = Object.keys(d.notes).map(parseRef);
  const hlRefs = Object.keys(d.highlights).map(parseRef);

  // verse snippets for everything we list (text files are small & cached)
  const slugs = [...new Set([...d.bookmarks, ...noteRefs, ...hlRefs].map(r => r.slug))];
  const texts = {};
  await Promise.all(slugs.map(async s => { texts[s] = await loadText(s).catch(() => null); }));
  const snippet = r => {
    if (!r.v) return '';
    const t = texts[r.slug];
    const verse = t && t.chapters[r.c - 1] && t.chapters[r.c - 1][r.v - 1];
    if (!verse) return '';
    return verse.length > 120 ? verse.slice(0, 120).replace(/\s+\S*$/, '') + '…' : verse;
  };

  const notes = Object.entries(d.notes)
    .map(([ref, n]) => ({ ref, r: parseRef(ref), ...n }))
    .sort((a, b) => (b.when || '').localeCompare(a.when || ''));
  const hls = Object.entries(d.highlights)
    .map(([ref, h]) => ({ ref, r: parseRef(ref), ...h }))
    .sort((a, b) => (b.when || '').localeCompare(a.when || ''));
  const colorHex = id => (HL_COLORS.find(c => c.id === id) || {}).hex || 'var(--gold)';
  const lr = d.lastRead;

  el.innerHTML = `
  <div class="wrap study-wrap">
    <div class="eyebrow">My Study</div>
    <header class="study-head">
      <span class="acct-badge big">${esc(initialOf(user.name))}</span>
      <div class="sh-id">
        <h1 class="page-title">${esc(user.name)}</h1>
        <div class="sh-sub">Studying since ${fmtWhen(user.created)} · saved in this browser ·
          <a href="#" id="st-export">export</a> / <a href="#" id="st-import">import</a></div>
      </div>
      <div class="sh-actions">
        <button class="btn" id="st-signout">Sign out</button>
        <button class="btn danger" id="st-delete" title="Remove this profile and its study data from this device">Delete profile</button>
      </div>
      <input type="file" id="st-import-file" accept=".json,application/json" hidden>
    </header>

    ${lr ? `
    <section class="study-card continue-card">
      <div>
        <h2>Continue reading</h2>
        <div class="cc-where">${refName({ slug: lr.slug, c: lr.c, v: lr.v })}<span class="cc-when"> · ${fmtWhen(lr.when)}</span></div>
      </div>
      <a class="btn primary" href="${refHref(lr)}">Open where I left off →</a>
    </section>` : `
    <section class="study-card continue-card">
      <div><h2>Continue reading</h2><div class="cc-where">Open any chapter and your place is remembered automatically.</div></div>
      <a class="btn primary" href="#/read/1-nephi/1">Begin reading →</a>
    </section>`}

    <section class="study-card">
      <h2>Bookmarks <span class="count">${d.bookmarks.length}</span></h2>
      ${d.bookmarks.length ? `<ul class="study-list" id="bm-list">
        ${d.bookmarks.map(b => {
          const r = { slug: b.slug, c: b.c, v: b.v };
          return `<li data-ref="${refOf(b.slug, b.c, b.v)}">
            <span class="sl-ico">🔖</span>
            <div class="sl-body">
              <a class="sl-ref" href="${refHref(r)}">${refName(r)}</a>
              ${b.title ? `<span class="sl-title">${esc(b.title)}</span>` : ''}
              ${snippet(r) ? `<div class="sl-snip">“${esc(snippet(r))}”</div>` : ''}
            </div>
            <span class="sl-when">${fmtWhen(b.when)}</span>
            <button class="sl-x" title="Remove bookmark">✕</button>
          </li>`;
        }).join('')}
      </ul>` : `<p class="study-empty">No bookmarks yet — tap <strong>🔖 Bookmark</strong> at the top of any chapter, or tap a verse while reading.</p>`}
    </section>

    <section class="study-card">
      <h2>Notes <span class="count">${notes.length}</span></h2>
      ${notes.length ? `<ul class="study-list" id="note-list">
        ${notes.map(n => `<li data-ref="${n.ref}">
          <span class="sl-ico">✎</span>
          <div class="sl-body">
            <a class="sl-ref" href="${refHref(n.r)}">${refName(n.r)}</a>
            ${snippet(n.r) ? `<div class="sl-snip">“${esc(snippet(n.r))}”</div>` : ''}
            <div class="sl-note">${esc(n.text)}</div>
          </div>
          <span class="sl-when">${fmtWhen(n.when)}</span>
          <button class="sl-x" title="Delete note">✕</button>
        </li>`).join('')}
      </ul>` : `<p class="study-empty">No notes yet — tap any verse while reading and choose <strong>✎ Note</strong>.</p>`}
    </section>

    <section class="study-card">
      <h2>Highlights <span class="count">${hls.length}</span></h2>
      ${hls.length ? `<ul class="study-list" id="hl-list">
        ${hls.map(h => `<li data-ref="${h.ref}">
          <span class="sl-ico"><span class="hl-dot" style="background:${colorHex(h.color)}"></span></span>
          <div class="sl-body">
            <a class="sl-ref" href="${refHref(h.r)}">${refName(h.r)}</a>
            ${snippet(h.r) ? `<div class="sl-snip">“${esc(snippet(h.r))}”</div>` : ''}
          </div>
          <span class="sl-when">${fmtWhen(h.when)}</span>
          <button class="sl-x" title="Remove highlight">✕</button>
        </li>`).join('')}
      </ul>` : `<p class="study-empty">No highlights yet — tap any verse while reading and pick a colour.</p>`}
    </section>

    <p class="study-foot">Your study journal lives only in this browser. <a href="#" id="st-export2">Export it</a>
    every so often to keep a backup, or to carry it to your phone or another computer.</p>
  </div>`;

  // ---- actions ----
  const rerender = () => renderStudy(el);

  el.querySelector('#st-signout').addEventListener('click', () => { signOut(); rerender(); });
  el.querySelector('#st-delete').addEventListener('click', () => {
    if (confirm(`Delete the profile “${user.name}” and all of its bookmarks, notes, and highlights from this device? Export first if you want a backup.`)) {
      deleteProfile(user.id);
      rerender();
    }
  });

  const doExport = e => {
    e.preventDefault();
    const data = exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `visual-scripture-${user.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  el.querySelector('#st-export').addEventListener('click', doExport);
  el.querySelector('#st-export2').addEventListener('click', doExport);

  const fileInput = el.querySelector('#st-import-file');
  el.querySelector('#st-import').addEventListener('click', e => { e.preventDefault(); fileInput.click(); });
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    if (!f) return;
    try { importAll(JSON.parse(await f.text())); rerender(); }
    catch (err) { alert(err.message); }
  });

  // remove buttons on each list
  const wire = (listId, remove) => {
    const list = el.querySelector(listId);
    if (!list) return;
    list.addEventListener('click', e => {
      const x = e.target.closest('.sl-x');
      if (!x) return;
      remove(x.closest('li').dataset.ref);
      rerender();
    });
  };
  wire('#bm-list', ref => { const r = parseRef(ref); toggleBookmark({ slug: r.slug, c: r.c, v: r.v || undefined }); });
  wire('#note-list', ref => setNote(ref, ''));
  wire('#hl-list', ref => setHighlight(ref, null));
}
