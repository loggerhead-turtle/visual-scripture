// Local-first accounts & study data.
//
// The site is fully static — there is no server to log into — so profiles
// live in this browser's localStorage. Each profile keeps its own bookmarks,
// verse notes, verse highlights, and last-read position, and can be exported
// to a JSON file (and imported on another device) at any time.
//
// A profile password is a convenience lock for shared devices, not real
// authentication: nothing is encrypted, and anyone who can open this browser's
// storage (or its dev tools) can read the notes. The password itself is never
// stored — only a PBKDF2-SHA-256 hash with a random per-profile salt.
//
// Keys:
//   vs-users            [{id, name, salt, hash|null, kdf?, iter?, created}]
//   vs-session          "<userId>" | null
//   vs-study-<userId>   {bookmarks:[], notes:{}, highlights:{}, lastRead:null}
import { bookBySlug } from './data.js';

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

// ---- password hashing ----
// PBKDF2-SHA-256 via Web Crypto, 600 000 iterations (OWASP's current floor),
// 128-bit random salt. Web Crypto's subtle API only exists in a secure context
// (https / localhost), so a password can't be set over plain http — the
// profile still works, just without the lock.
const KDF = 'pbkdf2-sha256';
const ITERATIONS = 600000;
const hex = buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
const randomHex = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return hex(a); };
const haveSubtle = () => !!(globalThis.crypto && crypto.subtle);

async function pbkdf2(salt, pass, iterations) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations }, key, 256);
  return hex(bits);
}

// profiles created before PBKDF2 was adopted: a single SHA-256 of "salt::pass",
// or FNV-1a where subtle crypto was unavailable. Still verified so nobody is
// locked out; upgraded to PBKDF2 on the next successful sign-in.
async function legacyHash(salt, pass) {
  const bytes = new TextEncoder().encode(`${salt}::${pass}`);
  if (haveSubtle()) return hex(await crypto.subtle.digest('SHA-256', bytes));
  let h = 0x811c9dc5;
  for (const b of bytes) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
  return 'fnv-' + h.toString(16);
}

async function verifyPass(user, pass) {
  if (user.kdf === KDF) {
    if (!haveSubtle()) throw new Error('Unlocking a password-locked profile needs a secure (https) connection.');
    return (await pbkdf2(user.salt, pass, user.iter || ITERATIONS)) === user.hash;
  }
  return (await legacyHash(user.salt, pass)) === user.hash;
}

async function makeLock(pass) {
  if (!haveSubtle()) throw new Error('Setting a password needs a secure (https) connection. Leave it blank to continue without one.');
  const salt = randomHex(16);
  return { salt, hash: await pbkdf2(salt, pass, ITERATIONS), kdf: KDF, iter: ITERATIONS };
}

const rid = () => (globalThis.crypto && crypto.getRandomValues ? randomHex(6) : Math.random().toString(36).slice(2, 10)) + Date.now().toString(36);

export async function signUp(name, pass) {
  name = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!name) throw new Error('Give your profile a name.');
  const users = listUsers();
  if (users.some(u => u.name.toLowerCase() === name.toLowerCase()))
    throw new Error('A profile with that name already exists on this device.');
  const lock = pass ? await makeLock(pass) : { salt: rid(), hash: null };
  const user = { id: 'u' + rid(), name, ...lock, created: new Date().toISOString() };
  users.push(user);
  if (!saveUsers(users)) throw new Error('Could not save — this browser is blocking local storage.');
  lsSet(SESSION_KEY, user.id);
  emit();
  return user;
}

export async function signIn(id, pass) {
  const users = listUsers();
  const user = users.find(u => u.id === id);
  if (!user) throw new Error('Profile not found.');
  if (user.hash) {
    if (!await verifyPass(user, pass || '')) throw new Error('Wrong password.');
    if (user.kdf !== KDF && haveSubtle()) { // silently move an old hash to PBKDF2
      Object.assign(user, await makeLock(pass));
      saveUsers(users);
    }
  }
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

// "<slug>/<c>[/<v>]" with a real book, a chapter it has, and a plausible
// verse — or null. Everything an import file names is pushed through this.
const REF_RE = /^([a-z0-9-]{1,64})\/(\d{1,3})(?:\/(\d{1,3}))?$/;
export function cleanRef(ref) {
  const m = REF_RE.exec(String(ref));
  if (!m) return null;
  const b = bookBySlug[m[1]];
  const c = +m[2], v = m[3] ? +m[3] : null;
  if (!b || c < 1 || c > b.chapters || (v !== null && (v < 1 || v > 300))) return null;
  return v ? `${m[1]}/${c}/${v}` : `${m[1]}/${c}`;
}

export function setHighlight(ref, color) {
  const d = getStudy();
  if (!d) return false;
  if (color) d.highlights[ref] = { color, when: new Date().toISOString() };
  else delete d.highlights[ref];
  return putStudy(d);
}

export const MAX_NOTE_CHARS = 20000;
export function setNote(ref, text) {
  const d = getStudy();
  if (!d) return false;
  text = String(text || '').trim().slice(0, MAX_NOTE_CHARS);
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

// An import file is attacker-influenced input (it may have been edited, or
// made by someone else), so nothing in it is trusted: every ref must resolve
// to a real chapter, only plain strings are kept, sizes are capped, and
// objects are rebuilt key by key — a "__proto__" or "constructor" entry can
// never reach Object.assign.
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const LIMITS = { bookmarks: 2000, notes: 5000, highlights: 20000, title: 200 };
const isPlain = o => !!o && typeof o === 'object' && !Array.isArray(o);
const cleanWhen = w => (typeof w === 'string' && w.length < 40 && !Number.isNaN(Date.parse(w))) ? new Date(w).toISOString() : new Date().toISOString();
const cleanText = (t, max) => typeof t === 'string' ? t.trim().slice(0, max) : '';
const cleanColor = c => typeof c === 'string' && /^[a-z]{1,16}$/.test(c) ? c : null;
const ownEntries = o => isPlain(o) ? Object.keys(o).map(k => [k, o[k]]) : [];

export function importAll(obj) {
  if (!isPlain(obj) || obj.kind !== 'study-export' || !isPlain(obj.study))
    throw new Error('That file is not a Visual Scripture study export.');
  const d = getStudy();
  if (!d) throw new Error('Sign in first, then import.');
  const s = obj.study;
  let kept = 0, dropped = 0;

  for (const [k, h] of ownEntries(s.highlights).slice(0, LIMITS.highlights)) {
    const ref = cleanRef(k), color = isPlain(h) && cleanColor(h.color);
    if (!ref || !color) { dropped++; continue; }
    d.highlights[ref] = { color, when: cleanWhen(h.when) }; kept++;
  }
  for (const [k, n] of ownEntries(s.notes).slice(0, LIMITS.notes)) {
    const ref = cleanRef(k), text = isPlain(n) ? cleanText(n.text, MAX_NOTE_CHARS) : '';
    if (!ref || !text) { dropped++; continue; }
    d.notes[ref] = { text, when: cleanWhen(n.when) }; kept++;
  }
  const have = new Set(d.bookmarks.map(b => refOf(b.slug, b.c, b.v)));
  for (const b of (Array.isArray(s.bookmarks) ? s.bookmarks : []).slice(0, LIMITS.bookmarks)) {
    const ref = isPlain(b) && cleanRef(refOf(b.slug, b.c, b.v));
    if (!ref || have.has(ref)) { dropped++; continue; }
    have.add(ref);
    const r = parseRef(ref);
    const bm = { slug: r.slug, c: r.c, when: cleanWhen(b.when) };
    if (r.v) bm.v = r.v;
    const title = cleanText(b.title, LIMITS.title);
    if (title) bm.title = title;
    d.bookmarks.push(bm); kept++;
  }
  if (!d.lastRead && isPlain(s.lastRead)) {
    const ref = cleanRef(refOf(s.lastRead.slug, s.lastRead.c, s.lastRead.v));
    if (ref) { const r = parseRef(ref); d.lastRead = { slug: r.slug, c: r.c, v: r.v || 1, when: cleanWhen(s.lastRead.when) }; }
  }
  putStudy(d);
  return { data: d, kept, dropped };
}
