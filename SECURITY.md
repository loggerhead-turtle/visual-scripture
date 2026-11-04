# Visual Scripture — Security & Performance Audit

**Scope:** the static site in this repository (index.html, `css/`, `js/`, `data/`), both deploy targets (Render static site via `render.yaml`; Docker/nginx via `Dockerfile`, `nginx.conf`, `fly.toml`), the build scripts in `scripts/`, and the git history.
**Date:** 2026-11-04. **Method:** manual source review of every DOM sink and its sources, adversarial payload testing in headless Chromium (Playwright), header verification against a local server that applies the production headers, byte-level and heap-level performance measurement. Everything below marked *Fixed* is fixed in this tree and re-tested.

---

## 1. Executive summary

| | Before | After |
|---|---|---|
| **Overall risk** | **High** — two working cross-site-scripting paths (one reachable by sending a link, one by sharing a "study export" file), no security headers at all, weak password hashing, external links that could point anywhere. | **Low** — all script-execution paths closed and covered by a strict Content-Security-Policy (`script-src 'self'`, no inline script), full header set on both deploy targets, PBKDF2 password lock, allow-listed outbound links, validated imports, no third-party resources of any kind. |

The site has no server, no accounts of consequence and no secrets, so the worst realistic outcomes were (a) script running in the site's origin on a victim's browser (read/alter their private notes, deface, phish) and (b) privacy leakage to third parties. Both are closed. 24 findings: 2 High, 6 Medium, 10 Low, 6 Informational — 21 fixed in this tree, 1 accepted with rationale, 2 require action in dashboards the repository cannot reach (§7).

Performance: a chapter view fetched the *whole book's* commentary and conference files. Splitting them per chapter cuts the first-view transfer by 44–58 % (D&C 76: 634 KB → 268 KB gzipped), a reader-page DOM/listener leak is closed, and caching is now correct for unhashed assets.

---

## 2. Threat model

**Assets.** Integrity of the rendered site (no injected script, no defacement); confidentiality of a visitor's private study notes (localStorage, same-origin); visitor privacy (no third-party calls); availability (no cheap client-side DoS).

**Attackers & entry points.**

| Source | Attacker control | Reaches |
|---|---|---|
| URL hash (`#/read/<slug>/<c>?v=`, `#/index?topic=`, `#/map?place=`, `#/allegory/<id>`, `#/character/<id>`, …) | Full — anyone can send a link | router, every view's `params` |
| Study export/import JSON | Full — a file a victim is talked into importing | `importAll`, study dashboard, home "continue" card, reader decorations |
| Notes, profile names | The user themselves (self-XSS) but also anything that reached localStorage | reader, study page, header button |
| `data/**.json` | Written by other agents; conference titles/speakers/URLs scraped from scriptures.byu.edu | every view (treated as untrusted text) |
| Network position | Passive/active MITM before HTTPS | mitigated by HSTS, `upgrade-insecure-requests` |
| Third parties | — | none: no scripts, fonts, analytics or images are loaded from anywhere but the site itself |

**Out of scope / not applicable.** Server-side logic (none), SQL/command injection (none), authentication bypass (the "lock" is explicitly not authentication — see VS-007/VS-018), subresource integrity (no third-party resources).

---

## 3. Findings

Severity is contextual for a static site; a CVSS 3.1 vector is given for calibration.

| ID | Sev. | Finding | Where | Status |
|---|---|---|---|---|
| VS-001 | **High** | Reflected DOM XSS: router prints `err.message` as HTML; `#/index?topic=<payload>` makes `querySelector` throw with the payload in the message | `js/app.js:97`, `js/views/index.js:115` | Fixed |
| VS-002 | **High** | Stored XSS via crafted import file: bookmark `slug`, note/highlight keys and `lastRead` rendered unescaped into text and `href`/`data-ref` attributes on the Study and Home pages | `js/views/study.js:16-20,159,172-174,191,207`, `js/views/home.js:60-62`, `js/account.js:importAll` | Fixed |
| VS-003 | Medium | Unvalidated hash ids interpolated into CSS selectors (`[data-alle="${focusId}"]`); Chromium percent-encodes the fragment so it only crashed there, Firefox does not — same sink as VS-001 | `js/views/allegories.js:19`, `js/views/index.js:115` | Fixed |
| VS-004 | Medium | Prototype pollution: `Object.assign(d.highlights, s.highlights)` with a `"__proto__"` key from an import file re-parents the live study object; `"constructor"` keys accepted as refs | `js/account.js:importAll` | Fixed |
| VS-005 | Medium | Prototype-chain lookups with URL-controlled keys: `bookBySlug['constructor']` and `ents.byId['constructor']` resolve to `Object.prototype` members → crashes / nonsense pages | `js/data.js:bookBySlug,entities`, `js/views/cast.js:openModal`, `js/app.js` | Fixed |
| VS-006 | Medium | Outbound talk links rendered from scraped data with no scheme/host check (`javascript:`, any host); 15,705 links were plain `http://www.lds.org` with a literal `&amp;` in the query | `js/conference.js:18`, `scripts/build-conference.mjs` | Fixed |
| VS-007 | Medium | Password lock hashed with one SHA-256 round (FNV-1a on http), salt from `Math.random()` — trivially brute-forced if the device's storage is read | `js/account.js:hashPass` | Fixed |
| VS-008 | Medium | No security headers on either deploy target (no CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, COOP/CORP); clickjacking and MIME sniffing possible | `render.yaml`, `nginx.conf` | Fixed |
| VS-009 | Low | Inline `<script>` in index.html forces `'unsafe-inline'` or a nonce into any CSP; its error overlay also used `innerHTML` | `index.html:50-93` | Fixed |
| VS-010 | Low | Four views inject `<style>` elements at runtime (`genealogy`, `mindmap`, `index`, `currency`), forcing `style-src 'unsafe-inline'` for *elements* | `js/views/*.js` | Fixed |
| VS-011 | Low | `esc()` did not escape `'`, so any single-quoted attribute built later would be injectable | `js/data.js:esc` | Fixed |
| VS-012 | Low | Attribute contexts fed straight from data JSON: `<img src/alt>` from `art-manifest.json`, portrait colours into SVG `fill`/`style`, record colours into `style`, ids into `href` | `js/portraits.js:avatar,normalize`, `js/views/reader.js` (12 sites), `js/views/cast.js` | Fixed |
| VS-013 | Low | Import accepted any size/shape: a 3 MB note or 10⁵ bookmarks fills the localStorage quota and freezes the Study page | `js/account.js:importAll`, `js/views/study.js` | Fixed |
| VS-014 | Low | `<link rel="preconnect" href="https://fonts.googleapis.com">` with no Google font in use — every visit opened a connection (IP + SNI) to Google for nothing | `index.html:8` | Fixed |
| VS-015 | Low | Docker image: floating `nginx:alpine` tag, runs as root, `server_tokens` on, no `.dockerignore` (local `data/commentary/_parts` and anything else in the tree would ship) | `Dockerfile`, `nginx.conf` | Fixed |
| VS-016 | Low | Render published the repository root, so `scripts/fetch-conference.py`, `render.yaml`, `nginx.conf`, `README.md` were public URLs | `render.yaml` | Fixed |
| VS-017 | Low | External links used `rel="noopener"` without `noreferrer` (7 sites) | `js/conference.js`, `js/footnotes.js`, `js/views/reader.js` | Fixed |
| VS-018 | Low | UI/README copy implied the password "locks" the profile; it is a picker lock on unencrypted data | `js/views/study.js`, `README.md` | Fixed |
| VS-019 | Info | Memory/listener leak: the reader's `IntersectionObserver` and two `document` keydown handlers outlived the view, retaining the whole previous chapter DOM; a debounced last-read timer could overwrite the new chapter's position | `js/views/reader.js:265-284,329-335,375-381` | Fixed |
| VS-020 | Info | Whole-book commentary/conference JSON downloaded for a single chapter (up to 1.5 MB raw / 400 KB gz per view) | `js/data.js`, `scripts/build-*.mjs` | Fixed |
| VS-021 | Info | Caching: `max-age=3600` on data, nothing on code (browser heuristics on unhashed JS could serve stale modules alongside fresh ones) | `render.yaml`, `nginx.conf` | Fixed |
| VS-022 | Info | Secrets in git history | `git log -p --all` | None found |
| VS-023 | Info | `style-src-attr 'unsafe-inline'` kept: 94 `style="…"` attributes set colours/positions per element | CSP | Accepted |
| VS-024 | Info | HTTPS enforcement, HSTS preload, custom-domain, repository protections and a disclosure contact live outside the repo | Render / GitHub / DNS | Owner action (§7) |

### 3.1 Details and proof

**VS-001 — Reflected XSS through the router's error page.** `route()` catches any exception and does `view.innerHTML = … ${err.message} …`. `#/index?topic=<img src=x onerror=…>` reaches `el.querySelector('#topic-' + topic)`; the selector is invalid, Chromium throws `SyntaxError: Failed to execute 'querySelector' … '#topic-<img src=x onerror=…>' is not a valid selector`, and the payload lands in the DOM.
*Before:* `http://127.0.0.1:8080/#/index?topic=%3Cimg%20src%3Dx%20onerror%3D%22window.__pwned%3D1%22%3E` → `window.__pwned === 1`, `<img src="x">` present. *After:* `pwned=0`, no element; the topic is ignored unless it matches `^[a-z0-9][a-z0-9-]{0,63}$` (`isSlugLike`), and the error page escapes the message. CVSS 3.1 `AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N` 6.1.

**VS-002 — Stored XSS through a study export file.** `importAll` copied `bookmarks`, `notes`, `highlights` and `lastRead` verbatim; the Study page then rendered `b.slug` in text (`refName`) and `href`/`data-ref` attributes, and the Home page rendered `lastRead.slug` into the "Continue reading" button.
*Before:* importing `{"kind":"study-export","study":{"bookmarks":[{"slug":"\"><img src=x onerror=\"window.__pwned=1\">","c":1}]}}` → `pwned=1` on `#/study` (and on every later visit — persistent). *After:* every ref is pushed through `cleanRef` (real book, chapter in range, verse 1–300), objects are rebuilt key by key, strings are capped, and the renderers escape anyway; the test file's 10 hostile entries are dropped with the message "Imported 2 items; 8 unrecognised entries were skipped." CVSS `AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N` 6.1.

**VS-003 — Selector injection from the fragment.** Same sink as VS-001 but through `#/allegory/<id>`. Chromium's `location.hash` percent-encodes `"<>` so the proof only fired for the query-string form; Firefox leaves the fragment raw. Both sites now accept slug-like ids only.

**VS-004 — Prototype pollution.** `JSON.parse` yields an own property named `__proto__`; `Object.assign` then invokes the setter on the target, re-parenting `d.highlights`. Not persisted (JSON.stringify drops it) but it changes behaviour for the session. The validated rebuild never passes a key it did not construct from a parsed ref (keys are `slug/c[/v]`, so `__proto__`/`constructor` are impossible).

**VS-005 — Prototype-chain lookups.** `#/read/constructor/1` resolved `bookBySlug['constructor']` to `Function`, then crashed on `volumeOf(...).id`; `#/character/constructor` opened a modal for `Object`. Maps keyed by outside input (`bookBySlug`, `entities().byId`) are now `Object.create(null)` and ids are validated.

**VS-006 — Outbound links.** `rowHtml` did `href="${esc(t.u)}"` — correct escaping, wrong trust: a tampered or mis-scraped `u` of `javascript:…` would be a click-to-execute link (under the new CSP it would be blocked, but not under the old one). `safeExternalUrl` accepts only `https:` on `churchofjesuschrist.org` / `lds.org` / `scriptures.byu.edu` (no credentials in the URL); the build script normalises `http://` → `https://` and `&amp;` → `&` and nulls anything off-host, and `scripts/validate.mjs` now fails the build if a published link is not https on a Church host. *Proof:* with `data/conference/isaiah/53.json` served as `{"u":"javascript:window.__pwned=1"}` / `https://evil.example/…`, both rows render as plain "Conference Report" text; the legitimate URL keeps its link.

**VS-007 — Password hashing.** Now PBKDF2-SHA-256, 600,000 iterations (OWASP's current recommendation for SHA-256), 128-bit salt from `crypto.getRandomValues`, stored as `{salt, hash, kdf:'pbkdf2-sha256', iter}`. Measured 235 ms per derivation in headless Chromium on this machine. Existing profiles with the old single-SHA-256 or FNV hash still open and are rehashed in place on the next successful unlock (tested). Setting a password now requires a secure context (there is no weak fallback any more); a profile without a password works everywhere. Constant-time comparison is not meaningful client-side (the attacker who can time the compare already holds the hash) and is noted only for completeness.

**VS-008/009/010 — Headers and CSP.** See §4. Moving the inline bootstrap script to `js/boot.js` and the four view stylesheets into `css/main.css` is what makes `script-src 'self'` and `style-src-elem 'self'` possible without nonces.

**VS-012 — Data-fed attributes.** `avatar()` now accepts only same-origin image paths (`^(?!//)[\w][\w./%-]*\.(png|jpe?g|webp|svg|gif|avif)$`) and escapes `alt`; portrait and record colours go through `safeColor` (hex / rgb() / colour keyword only); every `href="#/character/${id}"`, `#/index?topic=${t}`, `#/map?place=${id}` and the names beside them are escaped. *Proof:* an `art-manifest.json` of `{"isaiah":"javascript:…","jesus-christ":"x\" onerror=…","lehi1":"https://evil.example/x.png"}` renders no `<img>` at all.

**VS-013 — Import limits.** File > 2 MB rejected before it is read ("That file is 3.0 MB — a study export is never more than 2 MB."); ≤ 2,000 bookmarks, 5,000 notes, 20,000 highlights, 20,000 characters per note, 200 per title; timestamps must parse.

**VS-019 — Leak.** Measured with CDP `Runtime.queryObjects` after forced GC, reading Psalm 119 then leaving to the home page four times. *Before:* 176 verse `<p>` elements, 1 `IntersectionObserver` and 2 `document` keydown listeners still alive. *After:* 0 / 0 / 0. The reader now registers a one-shot `hashchange` cleanup (the pattern the mind map already used) that disconnects the observer, removes the two handlers and clears the pending last-read timer (which could previously fire ~900 ms after navigation and record the *previous* chapter as the last-read position).

**VS-022 — Git history.** `git log -p --all` grepped for AWS/GitHub/Slack/OpenAI/Google key shapes, private-key headers and `*_key|secret|token =` assignments: nothing. No `.env`, `.pem` or credential files are tracked. The only network-touching script (`scripts/fetch-conference.py`, BYU citation index) carries no credentials and is not shipped (`.dockerignore`, Render `_site`).

**VS-023 — Accepted: inline style attributes.** The views set per-element colours (`style="background:${color}"`, `--c:` custom properties, marker positions on SVG maps) in 94 places. Rewriting them as classes or CSSOM calls is a large, low-value diff: an inline *style attribute* cannot execute script, and the realistic residual (an attacker who can already inject HTML using CSS to exfiltrate attribute values) is moot because HTML injection itself is closed. The policy therefore splits: `style-src-elem 'self'` (no injected `<style>` or external stylesheet) and `style-src-attr 'unsafe-inline'`. Browsers without the `-elem/-attr` split fall back to `style-src 'self' 'unsafe-inline'`. Every colour that reaches a style attribute from data is filtered by `safeColor`.

### 3.2 Reviewed and found sound

* `linkifyVerse` regex: alternation of regex-escaped literal names, anchored by `\b` — linear, no ReDoS; `parseRefs` patterns are all bounded (`[\d,\s-]+` with nothing to backtrack into); `markerPositions` uses `indexOf`.
* `refHref`/`bookSlugFor`: a ref's book is resolved through the (now null-prototype) `BOOK_KEYS` table, chapter through `parseInt` — footnote links cannot be made to point off-site.
* Open redirects: every navigation is a `location.hash =` or `history.replaceState('#…')` with a validated or constant value; there is no `location.href`/`assign`/`window.open`.
* `data.js` fetch cache stores the *promise* per URL, so concurrent callers share one request; verified 15 requests per chapter view with no duplicates.
* Hash parameters in `map`, `plates`, `timeline`, `currency`, `genealogy`, `mindmap` were already compared against known ids or parsed as numbers.
* No service worker (none to poison; do not add one without versioned caches and a kill switch). No third-party scripts, so SRI does not apply. Query strings cannot poison static caches (Render/nginx key on path; data URLs carry none).

---

## 4. Headers deployed

Identical on Render (`render.yaml` `headers`, path `/*`) and nginx (`nginx.conf`, `add_header … always` at `server` level — nothing is added inside a `location`, because nginx's `add_header` does not merge across levels and a single `add_header` in a `location` would silently drop every server-level header; `Cache-Control` is chosen by a `map $uri` for the same reason). `server_tokens off`. A copy of the CSP (minus the two header-only directives) is in `<meta http-equiv>` in `index.html` so it also applies when the files are served by something else.

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
  style-src-elem 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self';
  connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self';
  frame-ancestors 'none'; upgrade-insecure-requests
Strict-Transport-Security: max-age=63072000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Cache-Control: public, max-age=0, must-revalidate          (index.html, css/, js/)
Cache-Control: public, max-age=21600, stale-while-revalidate=86400   (data/)
```

Why these values: `img-src data:` is for the inline SVG favicon only; `font-src 'self'` because the site uses system fonts (no Google Fonts — the stale preconnect is gone); no `report-uri` because there is no endpoint to receive reports; HSTS without `preload` until the owner submits the domain (§7). Code files have no content hashes, so they are revalidated on every load (Render and nginx both emit ETags → cheap 304s and no mixed-version module graphs); data files are immutable per deploy in practice and get six hours plus background refresh. `upgrade-insecure-requests` is header-only on purpose: in the meta tag it would break testing over `http://<lan-ip>:8080` from a phone.

**Verified:** `csp-smoke.mjs` loads all 19 routes (home, reader ×4 incl. Psalm 119 and D&C 76, timeline, map, map?place, cast, character modal, genealogy, mind map, currency, index, index?topic, stories, allegories, study, records) at 1440 px and 412 px under these exact headers and exercises verse tools, footnote popovers, the conference card and the drawers: **0 CSP violations, 0 page errors, every view rendered**.

---

## 5. Performance — before / after

Measured in headless Chromium against a local server; "before" sizes come from the per-book files in git `HEAD`, "after" from the regenerated tree; gzip at level 6 (Render compresses automatically; nginx now has `gzip_vary`, `gzip_min_length 1024`, `gzip_comp_level 5` and JSON/SVG/JS types).

| Cold view (bytes under `data/`) | Requests | Before raw / gz | After raw / gz | Δ gz |
|---|---|---|---|---|
| `#/read/isaiah/53` | 15 | 964 KB / 278 KB | 504 KB / 137 KB | −51 % |
| `#/read/psalms/119` | 15 | 1,140 KB / 331 KB | 596 KB / 155 KB | −53 % |
| `#/read/dc/76` | 16 | 2,431 KB / 634 KB | 1,016 KB / 268 KB | −58 % |
| `#/read/alma/32` | 15 | 1,402 KB / 368 KB | 772 KB / 199 KB | −46 % |
| `#/read/matthew/5` | 15 | 1,064 KB / 268 KB | 470 KB / 120 KB | −55 % |
| `#/read/obadiah/1` (1-chapter book) | 15 | 246 KB / 60 KB | 246 KB / 60 KB | 0 |
| `#/cast`, `#/index` | 95–99 | 1,546 KB / 377 KB | unchanged | — |

What changed: `data/commentary/<slug>.json` and `data/conference/<slug>.json` (174 files, 24 MB, largest 813 KB) became `data/commentary/<slug>/<c>.json` and `data/conference/<slug>/<c>.json` (3,164 files; a chapter's commentary is typically 2–8 KB, its conference card 1–40 KB; every chapter has a file, so there are never 404s — and on Render a 404 would have returned `index.html` because of the SPA rewrite). `scripts/build-commentary.mjs` and `scripts/build-conference.mjs` produce the new layout, remove stale chapters, and `scripts/validate.mjs` checks shape, verse ranges and link hosts for all 3,164 files. Each conference chapter file carries only the talks it cites, re-indexed locally. Request count per chapter view is unchanged (the two whole-book fetches became two small ones); moving within a book now costs two tiny requests per chapter instead of zero, which is the right trade for a 2–4× smaller first view.

What was *not* changed, and why: `data/text/<slug>.json` (D&C 608 KB raw / 175 KB gz, Alma 457 / 125) stays per book — it is cached for the session, prev/next within a book is free, and the Study page needs it for snippets. The remaining first-view cost is now dominated by that file plus the shared cast/places/plates/topics set (~190 KB gz). Cast/Index pull all 88 meta files (≈380 KB gz, 95+ requests); a single prebuilt appearance/topic index would cut that to one request — recommended next step, left out of this change set to keep the diff focused.

DOM: Psalm 119 renders 5,259 nodes (176 verses, 176 commentary blocks, 192 footnote markers) — fine. One `IntersectionObserver` watches the verses; `setSegment` is O(verses) per segment change and only runs on change; nothing runs per scroll event. Leak closed (VS-019): old chapter DOM retention 176 nodes → 0.

Caching before: data `max-age=3600`, code uncontrolled. After: as in §4.

---

## 6. Verification (reproducible)

Scripts live in the session scratchpad (not in the repo; they need Playwright): `/tmp/claude-0/-home-user-visual-scripture/0302be90-968e-5139-91e6-258ac65e9166/scratchpad/pw/`.

* `secserver.py 8081` — serves the repo with the production headers. `python3 -I secserver.py 8081`
* `sec-test.mjs` — 31 checks: 21 hash payloads (incl. `constructor`/`__proto__`), profile-name payload, note payload, crafted import (XSS + `__proto__` + oversize), tampered `conference`/`commentary`/`art-manifest` JSON served through `page.route`, `target=_blank` rel audit, zero page errors, zero CSP violations. **Before: 27/31 (VS-001, VS-002, VS-013 failing). After: 31/31.**
* `csp-smoke.mjs` — all routes × 2 viewports under the headers. **All clean.**
* `acct-test.mjs` — PBKDF2 record shape, wrong/right password, legacy-hash upgrade. **Pass; 235 ms per derivation.**
* `perf.mjs`, `leak.mjs` — the numbers in §5.
* `node scripts/validate.mjs` — ✓ all present data valid; 1,582 + 1,582 chapter files checked.

---

## 7. Owner action checklist (outside the repository)

**Render**
- [ ] Dashboard → service → Settings: confirm the service builds from `main` and that the new `buildCommand`/`staticPublishPath: _site` took effect (first deploy after this change must show `_site` being populated; if the build environment ever lacks `cp`, revert to `staticPublishPath: .` and accept VS-016).
- [ ] Verify headers on the live site: `curl -sI https://<site>/ | grep -i -E 'content-security|strict-transport|x-frame'` and `curl -sI https://<site>/data/text/isaiah.json | grep -i cache-control`.
- [ ] Render serves `*.onrender.com` over HTTPS and redirects HTTP by default — keep it; after adding a custom domain, confirm the HTTP→HTTPS redirect there too.
- [ ] Custom domain: add CAA records (`0 issue "letsencrypt.org"` or whatever Render's CA is at the time), and once HTTPS is confirmed stable for a few weeks, change HSTS to `max-age=63072000; includeSubDomains; preload` in **both** `render.yaml` and `nginx.conf` and submit at hstspreload.org. (Preload is irreversible in practice — only do it with a domain you will keep on HTTPS forever.)
- [ ] Decide whether `data/` should be a longer `max-age` once content authoring settles (currently 6 h + 24 h stale-while-revalidate).

**Fly.io / Docker**
- [ ] `fly deploy` picks up `nginxinc/nginx-unprivileged:1.27-alpine`; the container needs no root and can run with a read-only root FS + tmpfs `/tmp` if you want to add `[[mounts]]`/`cap_drop` hardening. `force_https = true` is already set in `fly.toml`.
- [ ] Rebuild the image whenever the base tag publishes a security fix (watch `nginxinc/nginx-unprivileged` 1.27.x).

**GitHub**
- [ ] Branch protection on `main` (require PR, no force-push), required status check running `node scripts/validate.mjs`.
- [ ] Enforce 2FA for all collaborators; enable secret scanning + push protection; enable Dependabot alerts (the repo has no package manifests today, so this is mostly for the Docker base image — add `.github/dependabot.yml` with a `docker` ecosystem entry).
- [ ] Keep the repository private *or* accept that the whole tree is public either way; nothing in it is secret.

**Disclosure**
- [ ] Pick a contact (email or a GitHub Security Advisory URL) and then add `/.well-known/security.txt` (RFC 9116: `Contact:`, `Expires:`, `Preferred-Languages: en`) — it was deliberately not created because it must name a real contact. Put the same contact in §8 below.

**Hygiene**
- [ ] The validator now rejects stale per-book files and off-host links; run `node scripts/validate.mjs` before every deploy (or as the Render build command's first step).
- [ ] If a service worker is ever added, give it versioned caches and a way to unregister; today's absence is a feature.

---

## 8. Responsible disclosure

_Placeholder — to be completed by the owner._

Report security issues to: **security@<your-domain>** (or open a private GitHub Security Advisory on the repository). Please include the URL/hash you used, the browser, and a minimal payload. We aim to acknowledge within 7 days. Do not test against other people's browsers or data; the site stores nothing server-side, so all testing can be done locally with `python3 -m http.server 8080` from a checkout.

---

## Appendix A — files changed by this audit

`index.html` (inline script → `js/boot.js`, meta CSP, no Google preconnect) · `js/boot.js` (new) · `js/data.js` (`esc` escapes `'`, null-prototype maps, `isSlugLike`, `safeExternalUrl`, `safeColor`, per-chapter loaders) · `js/app.js` (escaped error page, validated last-read redirect and slug) · `js/account.js` (PBKDF2, validated import, limits, honest comments) · `js/conference.js` (per-chapter shape, allow-listed links) · `js/portraits.js` (safe art URLs/alt, colour filtering) · `js/footnotes.js`, `js/views/{reader,study,home,index,allegories,cast}.js` (escaping, validation, leak cleanup, copy) · `js/views/{genealogy,mindmap,index,currency}.js` + `css/main.css` (stylesheets moved out of JS) · `render.yaml`, `nginx.conf`, `Dockerfile`, `.dockerignore`, `.gitignore` · `scripts/build-commentary.mjs`, `scripts/build-conference.mjs`, `scripts/validate.mjs` · `README.md` · `data/commentary/**`, `data/conference/**` (regenerated per chapter; 174 per-book files removed).
