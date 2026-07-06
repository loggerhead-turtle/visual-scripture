import { VOLUMES, bookBySlug, volumeOf, chapterWord, loadText, loadMeta, loadPlaces, loadPlacesHolyLand, loadPlacesUSA, loadPlates, entities, segmentFor, prevNextChapter, esc, themeName } from '../data.js';
import { avatar } from '../portraits.js';
import { currentUser, getStudy, setHighlight, setNote, toggleBookmark, setLastRead, refOf } from '../account.js';
import { HL_COLORS, applyHighlight, refreshFlags, decorateVerses } from '../study-marks.js';

let observer = null;

const MINI_RANGE = { ot: [-4000, -400], nt: [-5, 100], bom: [-600, 421], dc: [1820, 1920] };

export async function renderReader(el, slug, c, params) {
  const book = bookBySlug[slug];
  if (!book) { location.hash = '#/read/1-nephi/1'; return; }
  c = Math.min(c, book.chapters);
  const vol = volumeOf(slug);

  const [text, meta, ents, placesBom, placesHL, placesUSA, platesData] = await Promise.all([
    loadText(slug), loadMeta(slug), entities(), loadPlaces(), loadPlacesHolyLand(), loadPlacesUSA(), loadPlates(),
  ]);
  const allPlaces = [
    ...placesBom.places,
    ...((placesHL && placesHL.places) || []),
    ...((placesUSA && placesUSA.places) || []),
  ];
  const verses = text.chapters[c - 1];
  const cm = meta.chapters[c - 1] || {};
  const platesKey = cm.plates || meta.plates;
  const pk = platesData.platesKeys[platesKey] || {};
  const place = cm.place ? allPlaces.find(p => p.id === cm.place) : null;
  const mapParam = vol.id === 'bom' ? 'internal' : vol.id === 'dc' ? 'usa' : 'holy-land';
  const { prev, next } = prevNextChapter(slug, c);
  const narrator = ents.byId[meta.narrator];
  const cw = chapterWord(slug);

  const bookColor = s => {
    const all = [].concat(platesData.books || [],
      (platesData.bibleBooks && platesData.bibleBooks.ot) || [],
      (platesData.bibleBooks && platesData.bibleBooks.nt) || [],
      (platesData.bibleBooks && platesData.bibleBooks.dc) || []);
    const entry = all.find(x => x.slug === s);
    return (entry && (platesData.platesKeys[entry.plates] || {}).color) || '#888';
  };

  const toc = VOLUMES.map(v => {
    const curVol = v.id === vol.id;
    return `<div class="toc-volume ${curVol ? 'open' : ''}">
      <button type="button" class="toc-vol-btn" data-vol="${v.id}"><span class="dot" style="background:${v.color}"></span>${v.name}</button>
      <div class="toc-vol-books" ${curVol ? '' : 'hidden'}>
        ${v.books.map(b => {
          const cur = b.slug === slug;
          return `<div class="toc-book ${cur ? 'current' : ''}">
            <button type="button"><span class="dot" style="background:${bookColor(b.slug)}"></span>${b.name}</button>
            <div class="toc-chapters" ${cur ? '' : 'hidden'}>${Array.from({ length: b.chapters }, (_, i) =>
              `<a href="#/read/${b.slug}/${i + 1}" class="${cur && i + 1 === c ? 'current' : ''}">${i + 1}</a>`).join('')}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');

  const versesHtml = verses.map((v, i) =>
    `<p class="verse" id="v${i + 1}" data-v="${i + 1}"><span class="vnum">${i + 1}</span>${esc(v)}</p>`).join('');

  const themes = (cm.themes || []).map(t => `<span class="pill">✦ ${themeName(t)}</span>`).join('');
  const chars = (cm.characters || []).map(id => {
    const e = ents.byId[id]; return e ? `<a class="pill link" href="#/character/${id}">${e.name}</a>` : '';
  }).join('');

  // the full cast of this chapter: flagged characters + everyone who speaks
  const castIds = [];
  const castSeen = {};
  const addCast = id => {
    if (!id || id === 'reader' || castSeen[id]) return;
    const e = ents.byId[id];
    if (!e) return;
    castSeen[id] = true; castIds.push(id);
  };
  (cm.characters || []).forEach(addCast);
  (cm.segments || []).forEach(s => { addCast(s.speaker); });
  const castCard = castIds.length ? `<div class="context-card">
      <h4>Cast of this ${cw.toLowerCase()}</h4>
      <div class="reader-cast">${castIds.map(id => {
        const e = ents.byId[id];
        return `<a class="rc" href="#/character/${id}" title="${esc(e.title || e.name)}">${avatar(e)}<span class="rc-name">${esc(e.name)}</span></a>`;
      }).join('')}</div>
      <div class="rc-hint">Tap a face for their story &amp; every chapter they appear in.</div>
    </div>` : '';

  el.innerHTML = `
  <div class="wrap">
    <div class="reader-layout">
      <aside class="reader-toc">${toc}</aside>
      <article>
        <section class="chapter-browser" id="chapter-browser">
          <button class="cb-toggle" id="cb-toggle" aria-expanded="false">
            <span class="cb-toggle-label">Browse all scripture</span>
            <span class="cb-here">${book.slug === 'dc' ? 'Doctrine &amp; Covenants' : esc(vol.name) + ' · ' + esc(book.name)}</span>
            <span class="cb-caret">▾</span>
          </button>
          <div class="cb-panel" id="cb-panel" hidden>
            <div class="cb-crumbs" id="cb-crumbs"></div>
            <div class="cb-grid" id="cb-grid"></div>
          </div>
        </section>
        <header class="chapter-head">
          <div class="crumbs">${esc(vol.name)} · ${pk.short || ''}${cm.years ? ' · ' + esc(cm.years) : ''}</div>
          <h1>${book.slug === 'dc' ? `Section ${c}` : `${book.name} ${c}`}</h1>
          ${cm.title ? `<h2 class="ctitle">${esc(cm.title)}</h2>` : ''}
          ${cm.synopsis ? `<div class="synopsis"><strong style="color:var(--gold-dim)">Synopsis — </strong>${esc(cm.synopsis)}</div>` : (meta.stub ? '<div class="synopsis" style="border-left-color:var(--line)">Study notes for this chapter are still being illuminated — the full text is below.</div>' : '')}
          <div class="chapter-meta">
            <button type="button" class="pill link bm-pill" id="bm-chapter">🔖 <span>Bookmark</span></button>
            <a class="pill link" href="#/plates?p=${platesKey}"><span class="dot" style="background:${pk.color || '#888'}"></span>${pk.short || 'Record'}</a>
            ${place ? `<a class="pill link" href="#/map?place=${place.id}&m=${mapParam}">📍 ${place.name}</a>` : ''}
            ${cm.yearNum != null ? `<a class="pill link" href="#/timeline?y=${cm.yearNum}&era=${vol.id === 'bom' ? 'lehite' : vol.id}">🕰 ${esc(cm.years || 'Timeline')}</a>` : ''}
            ${themes}
          </div>
          ${chars ? `<div class="chapter-meta" style="margin-top:8px">${chars}</div>` : ''}
        </header>
        <div class="verses" id="verses">${versesHtml}</div>
        <nav class="chapter-nav">
          ${prev ? `<a class="btn" href="#/read/${prev.slug}/${prev.c}">← ${prev.slug === 'dc' ? 'Section ' + prev.c : bookBySlug[prev.slug].name + ' ' + prev.c}</a>` : '<span></span>'}
          ${next ? `<a class="btn" href="#/read/${next.slug}/${next.c}">${next.slug === 'dc' ? 'Section ' + next.c : bookBySlug[next.slug].name + ' ' + next.c} →</a>` : '<span></span>'}
        </nav>
      </article>
      <aside class="speaker-rail" id="speaker-rail">
        <div class="rail-head">
          <span>Who's speaking</span>
          <button type="button" id="rail-close" aria-label="Close panel">✕</button>
        </div>
        <div class="speaker-card" id="speaker-card"></div>
        <div class="context-card">
          <h4>${cw} context</h4>
          <div class="row"><span class="k">When</span><span class="v">${esc(cm.years || '—')}${cm.approx ? ' (approx.)' : ''}</span></div>
          <div class="row"><span class="k">Where</span><span class="v">${place ? `<a href="#/map?place=${place.id}&m=${mapParam}">${place.name}</a>` : '—'}</span></div>
          <div class="row"><span class="k">Record</span><span class="v"><a href="#/plates?p=${platesKey}">${pk.short || '—'}</a></span></div>
          <div class="row"><span class="k">Narrator</span><span class="v">${narrator ? `<a href="#/character/${narrator.id}">${narrator.name}</a>` : '—'}</span></div>
          <div class="mini-timeline" id="mini-tl"></div>
        </div>
        ${castCard}
      </aside>
      <button type="button" class="rail-handle" id="rail-handle" aria-expanded="false" aria-label="Show who is speaking, when and where">
        <span class="rh-avatar" id="rh-avatar"></span>
        <span class="rh-label">Speaking</span>
        <span class="rh-chev">‹</span>
      </button>
      <div class="rail-scrim" id="rail-scrim"></div>
    </div>
  </div>`;

  el.querySelectorAll('.toc-vol-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrap = btn.parentElement.querySelector('.toc-vol-books');
      wrap.hidden = !wrap.hidden;
      btn.parentElement.classList.toggle('open', !wrap.hidden);
    });
  });
  el.querySelectorAll('.toc-book > button').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrap = btn.parentElement.querySelector('.toc-chapters');
      wrap.hidden = !wrap.hidden;
    });
  });
  const curBtn = el.querySelector('.toc-book.current');
  if (curBtn) curBtn.scrollIntoView({ block: 'center' });

  setupChapterBrowser(el, vol, book, c);
  setupRailDrawer(el);
  setupStudyTools(el, slug, c, book, cm);

  renderMiniTimeline(el.querySelector('#mini-tl'), cm.yearNum, vol);

  const cardEl = el.querySelector('#speaker-card');
  const handleAvatar = el.querySelector('#rh-avatar');
  let activeSeg;
  const setSegment = seg => {
    if (seg === activeSeg) return;
    activeSeg = seg;
    renderSpeakerCard(cardEl, seg, ents, meta);
    if (handleAvatar) handleAvatar.innerHTML = avatar(seg && ents.byId[seg.speaker]);
    el.querySelectorAll('.verse').forEach(p => {
      const v = +p.dataset.v;
      const on = !!seg && v >= seg.s && v <= seg.e;
      p.classList.toggle('seg-active', on);
      if (seg) {
        const spk = ents.byId[seg.speaker];
        p.style.borderLeftColor = on ? ((spk && spk.portrait && spk.portrait.accent) || 'var(--gold-dim)') : 'transparent';
      }
    });
  };
  setSegment(segmentFor(cm, 1) || defaultSeg(meta, verses.length));

  // remember where this profile is reading (debounced — fires as you scroll)
  let lrTimer = null;
  const saveLastRead = v => {
    clearTimeout(lrTimer);
    lrTimer = setTimeout(() => setLastRead({ slug, c, v }), 900);
  };

  if (observer) observer.disconnect();
  const visible = new Set();
  observer = new IntersectionObserver(entriesList => {
    for (const en of entriesList) {
      const v = +en.target.dataset.v;
      if (en.isIntersecting) visible.add(v); else visible.delete(v);
    }
    if (visible.size) {
      const top = Math.min(...visible);
      setSegment(segmentFor(cm, top) || defaultSeg(meta, verses.length));
      saveLastRead(top);
    }
  }, { rootMargin: '-15% 0px -55% 0px', threshold: 0 });
  el.querySelectorAll('.verse').forEach(p => observer.observe(p));

  const vParam = parseInt(params.get('v') || '', 10);
  const vEl = vParam && document.getElementById(`v${vParam}`);
  if (vEl) vEl.scrollIntoView({ block: 'center' });
  setLastRead({ slug, c, v: vParam || 1 }); // record the visit at once; scrolling refines it
}

/* ---- mobile: the speaker rail as a pull-over drawer ------------------- */
// On phones in portrait the right-hand rail (who is speaking, when, where)
// has no room, so it becomes an off-canvas drawer. A handle hugging the
// right edge — showing the current speaker's face — pulls it over the text.
function setupRailDrawer(el) {
  const rail = el.querySelector('#speaker-rail');
  const handle = el.querySelector('#rail-handle');
  const scrim = el.querySelector('#rail-scrim');
  const closeBtn = el.querySelector('#rail-close');
  if (!rail || !handle || !scrim) return;

  const set = open => {
    rail.classList.toggle('open', open);
    scrim.classList.toggle('open', open);
    handle.classList.toggle('tucked', open);
    handle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('no-scroll', open);
  };
  handle.addEventListener('click', () => set(true));
  scrim.addEventListener('click', () => set(false));
  closeBtn.addEventListener('click', () => set(false));
  // tapping any link inside the drawer navigates away — close it first
  rail.addEventListener('click', e => { if (e.target.closest('a')) set(false); });

  // swipe right on the drawer to push it back off-screen
  let x0 = null, y0 = null;
  rail.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  rail.addEventListener('touchend', e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    if (dx > 70 && Math.abs(dy) < 60) set(false);
    x0 = y0 = null;
  }, { passive: true });

  if (railEscHandler) document.removeEventListener('keydown', railEscHandler);
  railEscHandler = e => {
    if (e.key === 'Escape' && document.body.contains(rail) && rail.classList.contains('open')) set(false);
  };
  document.addEventListener('keydown', railEscHandler);
}
let railEscHandler = null;

/* ---- study tools: highlights, notes & bookmarks on each verse --------- */
function setupStudyTools(el, slug, c, book, cm) {
  const versesEl = el.querySelector('#verses');
  const study = getStudy();
  decorateVerses(versesEl, study, slug, c);

  // chapter bookmark pill
  const bmPill = el.querySelector('#bm-chapter');
  const chRef = refOf(slug, c);
  const paintPill = on => {
    bmPill.classList.toggle('on', !!on);
    bmPill.querySelector('span').textContent = on ? 'Bookmarked' : 'Bookmark';
  };
  const d0 = getStudy();
  paintPill(d0 && d0.bookmarks.some(b => refOf(b.slug, b.c, b.v) === chRef));
  bmPill.addEventListener('click', () => {
    if (!currentUser()) { location.hash = '#/study'; return; }
    paintPill(toggleBookmark({ slug, c, title: cm.title || `${book.name} ${c}` }));
  });

  // tap a verse -> tools popover (highlight colours, note, bookmark)
  let openTools = null;
  const closeTools = () => { if (openTools) { openTools.remove(); openTools = null; } };
  versesEl.addEventListener('click', e => {
    if (e.target.closest('.vtools') || e.target.closest('a')) return;
    const p = e.target.closest('.verse');
    if (!p) { closeTools(); return; }
    const sel = window.getSelection && window.getSelection();
    if (sel && String(sel).length) return; // don't hijack text selection
    const v = +p.dataset.v;
    const already = openTools && openTools.dataset.v === String(v);
    closeTools();
    if (already) return;
    openTools = buildVerseTools(p, slug, c, v);
    p.insertAdjacentElement('afterend', openTools);
    openTools.dataset.v = v;
  });
}

function buildVerseTools(p, slug, c, v) {
  const box = document.createElement('div');
  box.className = 'vtools';

  if (!currentUser()) {
    box.innerHTML = `<div class="vt-signin">
      <a class="btn primary" href="#/study">Sign in</a>
      <span>to highlight this verse, write a note, or bookmark it. Free — kept in your browser.</span>
    </div>`;
    return box;
  }

  const ref = refOf(slug, c, v);
  const d = getStudy();
  const cur = d.highlights[ref] && d.highlights[ref].color;
  const note = d.notes[ref];
  const bm = d.bookmarks.some(b => refOf(b.slug, b.c, b.v) === ref);

  box.innerHTML = `
    <div class="vt-row">
      <span class="vt-vlabel">v.&thinsp;${v}</span>
      ${HL_COLORS.map(cc => `<button type="button" class="vt-swatch ${cur === cc.id ? 'on' : ''}" data-color="${cc.id}" title="Highlight — ${cc.name}" style="background:${cc.hex}"></button>`).join('')}
      <button type="button" class="vt-swatch clear ${cur ? '' : 'on'}" data-color="" title="Remove highlight">⊘</button>
      <span class="vt-gap"></span>
      <button type="button" class="vt-act" data-act="note">✎ <span>${note ? 'Edit note' : 'Note'}</span></button>
      <button type="button" class="vt-act ${bm ? 'on' : ''}" data-act="bm">🔖 <span>${bm ? 'Saved' : 'Save'}</span></button>
    </div>
    <div class="vt-note" ${note ? '' : 'hidden'}>
      <textarea rows="3" placeholder="Your note on verse ${v}…">${note ? esc(note.text) : ''}</textarea>
      <div class="vt-note-btns">
        <button type="button" class="btn primary vt-save">Save note</button>
        <button type="button" class="btn vt-del" ${note ? '' : 'hidden'}>Delete note</button>
        <span class="vt-saved" hidden>Saved ✓</span>
      </div>
    </div>`;

  const ta = box.querySelector('textarea');
  const refresh = () => refreshFlags(p, getStudy(), ref);

  box.addEventListener('click', e => {
    const sw = e.target.closest('.vt-swatch');
    if (sw) {
      const color = sw.dataset.color || null;
      setHighlight(ref, color);
      applyHighlight(p, color);
      box.querySelectorAll('.vt-swatch').forEach(b => b.classList.toggle('on', b === sw));
      return;
    }
    const act = e.target.closest('.vt-act');
    if (act && act.dataset.act === 'note') {
      const ed = box.querySelector('.vt-note');
      ed.hidden = !ed.hidden;
      if (!ed.hidden) ta.focus();
      return;
    }
    if (act && act.dataset.act === 'bm') {
      const on = toggleBookmark({ slug, c, v });
      act.classList.toggle('on', !!on);
      act.querySelector('span').textContent = on ? 'Saved' : 'Save';
      refresh();
      return;
    }
    if (e.target.closest('.vt-save')) {
      setNote(ref, ta.value);
      const hasText = !!ta.value.trim();
      box.querySelector('.vt-del').hidden = !hasText;
      box.querySelector('[data-act=note] span').textContent = hasText ? 'Edit note' : 'Note';
      const ok = box.querySelector('.vt-saved');
      ok.hidden = false;
      setTimeout(() => { ok.hidden = true; }, 1400);
      refresh();
      return;
    }
    if (e.target.closest('.vt-del')) {
      setNote(ref, '');
      ta.value = '';
      box.querySelector('.vt-note').hidden = true;
      box.querySelector('.vt-del').hidden = true;
      box.querySelector('[data-act=note] span').textContent = 'Note';
      refresh();
    }
  });

  return box;
}

const defaultSeg = (meta, n) => ({ s: 1, e: n, speaker: meta.narrator, to: 'reader', note: `${meta.book}: the narrator addresses the reader` });

function renderSpeakerCard(cardEl, seg, ents, meta) {
  if (!seg) { cardEl.innerHTML = ''; return; }
  const spk = ents.byId[seg.speaker];
  const aud = ents.byId[seg.to];
  cardEl.innerHTML = `
    <div class="sc-label">Now speaking — verses ${seg.s}–${seg.e}</div>
    <div class="sc-duo">
      <a class="sc-portrait" href="#/character/${seg.speaker}">
        ${avatar(spk)}
        <div class="who">${spk ? esc(spk.name) : esc(seg.speaker)}</div>
        <div class="role">${spk ? esc(spk.title || '') : ''}</div>
      </a>
      <div class="sc-arrow"><span class="to-label">speaking to</span>➤</div>
      <a class="sc-portrait small" href="#/character/${seg.to}">
        ${avatar(aud)}
        <div class="who">${aud ? esc(aud.name) : esc(seg.to || '')}</div>
      </a>
    </div>
    ${seg.note ? `<div class="sc-note">${esc(seg.note)}</div>` : ''}
    <div class="sc-verses">Voices change as you scroll — from ${esc(meta.book)}'s segment notes.</div>`;
}

function renderMiniTimeline(el, yearNum, vol) {
  if (!el) return;
  const [min, max] = MINI_RANGE[vol.id] || [-600, 421];
  const w = 260, h = 46;
  const x = v => 12 + (Math.max(min, Math.min(max, v)) - min) / (max - min) * (w - 24);
  const step = Math.round((max - min) / 4);
  let marks = '';
  for (let i = 0; i <= 4; i++) {
    const y = min + i * step;
    const lab = vol.id === 'dc' ? y : (y < 0 ? -y + ' BC' : 'AD ' + y);
    marks += `<line x1="${x(y)}" y1="18" x2="${x(y)}" y2="26" stroke="#3a3225" stroke-width="1"/>
      <text x="${x(y)}" y="40" fill="#8a8069" font-size="8" text-anchor="middle">${lab}</text>`;
  }
  const pos = yearNum == null ? null : x(yearNum);
  const era = vol.id === 'bom' ? 'lehite' : vol.id;
  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}">
    <line x1="12" y1="22" x2="${w - 12}" y2="22" stroke="#3a3225" stroke-width="2"/>${marks}
    ${pos != null ? `<circle cx="${pos}" cy="22" r="5" fill="var(--gold)"/><circle cx="${pos}" cy="22" r="8" fill="none" stroke="var(--gold)" stroke-opacity=".4"/>` : ''}
  </svg>
  <div style="text-align:center"><a href="#/timeline${yearNum != null ? `?y=${yearNum}&era=${era}` : ''}" style="font-size:11.5px">Open full timeline →</a></div>`;
}

// ---- drill-up/drill-down chapter browser (below the reader) ----
// Levels: volumes (the standard works) -> books of a volume -> chapters of a book.
// You can back up from your current chapter to its sibling books, up again to the
// standard works, then drill into any volume, book, and chapter.
function setupChapterBrowser(el, vol, book, curChapter) {
  const toggle = el.querySelector('#cb-toggle');
  const panel = el.querySelector('#cb-panel');
  const crumbs = el.querySelector('#cb-crumbs');
  const grid = el.querySelector('#cb-grid');
  if (!toggle || !panel) return;

  const state = { level: 'chapters', volId: vol.id, bookSlug: book.slug };

  const render = () => {
    const v = VOLUMES.find(x => x.id === state.volId) || vol;
    const b = bookBySlug[state.bookSlug] || book;
    const isDC = slug => slug === 'dc';
    // breadcrumb trail — each crumb jumps to that level
    const trail = [`<button class="cb-crumb" data-to="volumes">The Standard Works</button>`];
    if (state.level === 'books' || state.level === 'chapters') {
      trail.push('<span class="cb-sep">›</span>');
      trail.push(`<button class="cb-crumb" data-to="books">${esc(v.name)}</button>`);
    }
    if (state.level === 'chapters') {
      trail.push('<span class="cb-sep">›</span>');
      trail.push(`<span class="cb-crumb current">${isDC(b.slug) ? 'Sections' : esc(b.name)}</span>`);
    }
    const upTo = state.level === 'chapters' ? 'books' : state.level === 'books' ? 'volumes' : null;
    crumbs.innerHTML = (upTo ? `<button class="cb-up" data-to="${upTo}">↑ Up</button>` : '') + `<div class="cb-trail">${trail.join('')}</div>`;

    if (state.level === 'volumes') {
      grid.className = 'cb-grid cb-volumes';
      grid.innerHTML = VOLUMES.map(x => `<button class="cb-vol ${x.id === vol.id ? 'here' : ''}" data-vol="${x.id}" style="border-left:3px solid ${x.color}">
          <span class="cb-vol-name" style="color:${x.color}">${esc(x.name)}</span>
          <span class="cb-vol-sub">${x.books.length === 1 ? '138 sections' : x.books.length + ' books'}</span>
        </button>`).join('');
    } else if (state.level === 'books') {
      grid.className = 'cb-grid cb-books';
      grid.innerHTML = v.books.map(bk => `<button class="cb-book ${bk.slug === book.slug ? 'here' : ''}" data-book="${bk.slug}">
          ${esc(bk.name)}<span class="cb-book-n">${bk.chapters}</span>
        </button>`).join('');
    } else {
      grid.className = 'cb-grid cb-chapters';
      const word = isDC(b.slug) ? 'Section' : 'Chapter';
      grid.innerHTML = `<div class="cb-chapters-head">${esc(b.name)} — ${b.chapters} ${word.toLowerCase()}${b.chapters > 1 ? 's' : ''}</div>`
        + Array.from({ length: b.chapters }, (_, i) =>
          `<a class="cb-ch ${b.slug === book.slug && i + 1 === curChapter ? 'here' : ''}" href="#/read/${b.slug}/${i + 1}">${i + 1}</a>`).join('');
    }
  };

  toggle.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.classList.toggle('open', open);
    if (open) render();
  });

  el.querySelector('#chapter-browser').addEventListener('click', e => {
    const crumb = e.target.closest('[data-to]');
    if (crumb) { state.level = crumb.dataset.to; render(); return; }
    const volBtn = e.target.closest('[data-vol]');
    if (volBtn) { state.volId = volBtn.dataset.vol; state.level = 'books'; render(); return; }
    const bookBtn = e.target.closest('[data-book]');
    if (bookBtn) { state.bookSlug = bookBtn.dataset.book; state.level = 'chapters'; render(); return; }
    // chapter links are real <a> hashes — the router handles them
  });
}
