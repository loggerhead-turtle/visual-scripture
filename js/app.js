import { loadArtManifest } from './data.js';
import { setArtManifest } from './portraits.js';
import { renderHome } from './views/home.js';
import { renderReader } from './views/reader.js';
import { renderTimeline } from './views/timeline.js';
import { renderMap } from './views/map.js';
import { renderPlates } from './views/plates.js';
import { renderCast } from './views/cast.js';
import { renderStories } from './views/stories.js';
import { renderAllegories } from './views/allegories.js';
import { renderStudy } from './views/study.js';
import { currentUser, lastRead, onAccount } from './account.js';
import { renderGenealogy } from './views/genealogy.js';
import { renderMindmap } from './views/mindmap.js';
import { renderCurrency } from './views/currency.js';
import { renderIndex } from './views/index.js';

const view = document.getElementById('view');
const nav = document.getElementById('mainnav');
const acctBtn = document.getElementById('acctbtn');

const ACCT_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
  <circle cx="12" cy="8" r="3.8" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M4.6 20.2 q0 -5.8 7.4 -5.8 q7.4 0 7.4 5.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`;
function refreshAcctBtn() {
  const u = currentUser();
  if (u) {
    acctBtn.classList.add('on');
    acctBtn.textContent = [...u.name.trim()][0].toUpperCase();
    acctBtn.title = `${u.name} — My Study`;
  } else {
    acctBtn.classList.remove('on');
    acctBtn.innerHTML = ACCT_ICON;
    acctBtn.title = 'Sign in — bookmarks, notes & highlights';
  }
}
onAccount(refreshAcctBtn);
refreshAcctBtn();
// (nav toggle handlers live in an inline script in index.html so the menu
// works even if this module fails to load)

loadArtManifest().then(m => setArtManifest(m.art || m));

let token = 0;
async function route() {
  const my = ++token;
  const hash = location.hash.replace(/^#\/?/, '');
  const [path, query] = hash.split('?');
  const parts = path.split('/').filter(Boolean);
  const params = new URLSearchParams(query || '');
  const section = parts[0] || 'home';

  for (const a of nav.querySelectorAll('a')) {
    a.classList.toggle('active', a.dataset.nav === section || (section.startsWith('allegor') && a.dataset.nav === 'allegories') || (section === 'character' && a.dataset.nav === 'cast'));
  }
  acctBtn.classList.toggle('active', section === 'study');

  document.querySelectorAll('.modal-back').forEach(m => m.remove());
  document.body.classList.remove('no-scroll');
  view.innerHTML = '<div class="loading">Opening the record&hellip;</div>';
  const done = html => { if (my === token) return true; return false; };
  try {
    switch (section) {
      case 'home': await renderHome(view); break;
      case 'read': {
        if (!parts[1]) {
          // bare #/read — reopen where this profile left off
          const lr = lastRead();
          if (lr && lr.slug) {
            location.hash = `#/read/${lr.slug}/${lr.c}${lr.v ? `?v=${lr.v}` : ''}`;
            return;
          }
        }
        const slug = parts[1] || '1-nephi';
        const c = Math.max(1, parseInt(parts[2] || '1', 10) || 1);
        await renderReader(view, slug, c, params);
        break;
      }
      case 'timeline': await renderTimeline(view, params); break;
      case 'map': await renderMap(view, params); break;
      case 'plates': await renderPlates(view, params); break;
      case 'cast': await renderCast(view, params); break;
      case 'character': await renderCast(view, params, parts[1]); break;
      case 'stories': await renderStories(view, params); break;
      case 'genealogy': await renderGenealogy(view, params); break;
      case 'mindmap': await renderMindmap(view, params); break;
      case 'currency': await renderCurrency(view, params); break;
      case 'index': await renderIndex(view, params); break;
      case 'allegories': await renderAllegories(view, params, null); break;
      case 'allegory': await renderAllegories(view, params, parts[1]); break;
      case 'study': await renderStudy(view, params); break;
      default: await renderHome(view);
    }
  } catch (err) {
    console.error(err);
    if (my === token) view.innerHTML = `<div class="wrap"><h1 class="page-title">Something went wrong</h1><p class="section-intro">${err.message}. Try <a href="#/">returning home</a>.</p></div>`;
  }
  if (my === token && !params.get('v')) window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
