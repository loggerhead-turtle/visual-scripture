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

const view = document.getElementById('view');
const nav = document.getElementById('mainnav');
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

  document.querySelectorAll('.modal-back').forEach(m => m.remove());
  view.innerHTML = '<div class="loading">Opening the record&hellip;</div>';
  const done = html => { if (my === token) return true; return false; };
  try {
    switch (section) {
      case 'home': await renderHome(view); break;
      case 'read': {
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
      case 'allegories': await renderAllegories(view, params, null); break;
      case 'allegory': await renderAllegories(view, params, parts[1]); break;
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
