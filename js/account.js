// Local-first accounts & study data.
//
// The site is fully static — there is no server to log into — so profiles
// live in this browser's localStorage. Each profile keeps its own bookmarks,
// verse notes, verse highlights, and last-read position, and can be exported
// to a JSON file (and imported on another device) at any time.
//
// Keys:
//   vs-users            [{id, name, salt, hash|null, created}]
//   vs-session          "<userId>" | null
//   vs-study-<userId>   {bookmarks:[], notes:{}, highlights:{}, lastRead:null}

const USERS_KEY = 'vs-users';
const SESSION_KEY = 'vs-session';
const studyKey = id => `vs-study-${id}`;

function lsGet(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); }
  catch { return fallback; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

const emit = () => window.dispatchEvent(new CustomEvent('vs:account'));
export const onAccount = fn => window.addEventListener('vs:account', fn);

// ---- profiles ----
export const listUsers = () => lsGet(USERS_KEY, []);
const saveUsers = users => lsSet(USERS_KEY, users);

export function currentUser() {
  const id = lsGet(SESSION_KEY, null);
  return id ? listUsers().find(u => u.id === id) || null : null;
}

async function hashPass(salt, pass) {
  const bytes = new TextEncoder().encode(`${salt}::${pass}`);
  if (crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // crypto.subtle needs a secure context (https / localhost); on plain http
  // fall back to FNV-1a so passwords are at least never stored in the clear.
  let h = 0x811c9dc5;
  for (const b of bytes) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
  return 'fnv-' + h.toString(16);
}

const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export async function signUp(name, pass) {
  name = String(name || '').trim();
  if (!name) throw new Error('Give your profile a name.');
  const users = listUsers();
  if (users.some(u => u.name.toLowerCase() === name.toLowerCase()))
    throw new Error('A profile with that name already exists on this device.');
  const salt = rid();
  const user = {
    id: 'u' + rid(), name, salt,
    hash: pass ? await hashPass(salt, pass) : null,
    created: new Date().toISOString(),
  };
  users.push(user);
  if (!saveUsers(users)) throw new Error('Could not save — this browser is blocking local storage.');
  lsSet(SESSION_KEY, user.id);
  emit();
  return user;
}

export async function signIn(id, pass) {
  const user = listUsers().find(u => u.id === id);
  if (!user) throw new Error('Profile not found.');
  if (user.hash && await hashPass(user.salt, pass || '') !== user.hash)
    throw new Error('Wrong password.');
  lsSet(SESSION_KEY, user.id);
  emit();
  return user;
}

export function signOut() {
  lsSet(SESSION_KEY, null);
  emit();
}

export function deleteProfile(id) {
  saveUsers(listUsers().filter(u => u.id !== id));
  try { localStorage.removeItem(studyKey(id)); } catch { /* ignore */ }
  if (lsGet(SESSION_KEY, null) === id) lsSet(SESSION_KEY, null);
  emit();
}

// ---- study data (per signed-in profile) ----
const EMPTY = () => ({ bookmarks: [], notes: {}, highlights: {}, lastRead: null });

export function getStudy() {
  const u = currentUser();
  if (!u) return null;
  return { ...EMPTY(), ...lsGet(studyKey(u.id), {}) };
}
function putStudy(data, silent) {
  const u = currentUser();
  if (!u) return false;
  lsSet(studyKey(u.id), data);
  if (!silent) emit();
  return true;
}

export const refOf = (slug, c, v) => v ? `${slug}/${c}/${v}` : `${slug}/${c}`;
export function parseRef(ref) {
  const [slug, c, v] = String(ref).split('/');
  return { slug, c: +c, v: v ? +v : null };
}

export function setHighlight(ref, color) {
  const d = getStudy();
  if (!d) return false;
  if (color) d.highlights[ref] = { color, when: new Date().toISOString() };
  else delete d.highlights[ref];
  return putStudy(d);
}

export function setNote(ref, text) {
  const d = getStudy();
  if (!d) return false;
  text = String(text || '').trim();
  if (text) d.notes[ref] = { text, when: new Date().toISOString() };
  else delete d.notes[ref];
  return putStudy(d);
}

// bm: {slug, c, v?, title?} — returns true if now bookmarked, false if removed,
// null if signed out.
export function toggleBookmark(bm) {
  const d = getStudy();
  if (!d) return null;
  const key = refOf(bm.slug, bm.c, bm.v);
  const i = d.bookmarks.findIndex(b => refOf(b.slug, b.c, b.v) === key);
  let on;
  if (i >= 0) { d.bookmarks.splice(i, 1); on = false; }
  else { d.bookmarks.unshift({ ...bm, when: new Date().toISOString() }); on = true; }
  putStudy(d);
  return on;
}

export function setLastRead(pos) {
  const d = getStudy();
  if (!d) return;
  d.lastRead = { ...pos, when: new Date().toISOString() };
  putStudy(d, true); // fires on scroll — don't re-render listeners
}
export const lastRead = () => { const d = getStudy(); return d ? d.lastRead : null; };

// ---- backup / restore ----
export function exportAll() {
  const u = currentUser();
  if (!u) return null;
  return {
    app: 'visual-scripture', kind: 'study-export', version: 1,
    exported: new Date().toISOString(),
    profile: { name: u.name, created: u.created },
    study: getStudy(),
  };
}

export function importAll(obj) {
  if (!obj || obj.kind !== 'study-export' || !obj.study)
    throw new Error('That file is not a Visual Scripture study export.');
  const d = getStudy();
  if (!d) throw new Error('Sign in first, then import.');
  const s = obj.study;
  Object.assign(d.highlights, s.highlights || {});
  Object.assign(d.notes, s.notes || {});
  const have = new Set(d.bookmarks.map(b => refOf(b.slug, b.c, b.v)));
  for (const b of s.bookmarks || []) {
    const key = refOf(b.slug, b.c, b.v);
    if (!have.has(key)) { have.add(key); d.bookmarks.push(b); }
  }
  if (!d.lastRead && s.lastRead) d.lastRead = s.lastRead;
  putStudy(d);
  return d;
}
