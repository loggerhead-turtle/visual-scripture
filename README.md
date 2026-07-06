# Visual Scripture — The Book of Mormon, Illuminated

A fast, fully static study site for the Book of Mormon that keeps the *context* of every
chapter in view while you read:

- **📖 The Reader** — full scripture text (all 239 chapters / 6,604 verses, public-domain
  edition) with a **living speaker card**: as you scroll, the portrait changes to show whose
  voice you're hearing (narrator, quoted sermon, epistle, the Lord) and who they're speaking
  to, plus a synopsis, themes, dates, place, and plates source for every chapter.
- **🕰 Timeline** — a pan/zoom mind-map of both civilizations (Jaredite and Lehite bands,
  connected where the 24 gold plates enter the Nephite story). Step forward and backward in
  time, click any event to read it.
- **🗺 Internal Map** — a relative-geography map built only from the text's own distance and
  direction clues (after Sorenson and the BYU internal-model tradition), deliberately **not**
  a map of the Americas — plus an Old-World trail strip (Jerusalem → Nahom → Bountiful).
  Every chapter links to where it happens; every place links back to its chapters.
- **🥇 The Plates** — a flow diagram of how five records (brass, small, large, the 24 Jaredite
  plates, and Mormon/Moroni's own words) became one book. Every book and chapter in the
  reader is color-coded by its source record.
- **🎭 The Cast** — 70+ characters and 14 peoples/groups as illustrated cards, grouped under
  the book where they first appear, with bios, relationships, and every chapter they're in.
- **🌳 Allegories** — interactive visual guides to Lehi's dream (every symbol glossed from
  Nephi's interpretation), Zenos's olive-tree allegory (five animated stages of the vineyard),
  and the Liahona as Alma likens it.
- **🔎 Story Navigator** — 46 famous stories, searchable and filterable, jumping straight to
  chapter and verse.
- **👤 My Study** — local-first profiles (no server, no tracking): sign in to bookmark
  chapters and verses, highlight verses in five colours, write per-verse notes, and pick up
  reading exactly where you left off. Everything is stored in your browser's localStorage
  per profile (passwords are salted-and-hashed, never stored in the clear) and can be
  exported/imported as a JSON file to move between devices. Tap any verse in the reader to
  highlight, note, or bookmark it.
- **📱 Mobile speaker drawer** — on phones in portrait, the "who is speaking to whom,
  when and where" rail becomes a pull-over drawer: a handle on the right edge (showing the
  current speaker's face, live as you scroll) slides the full context card over the text.

Everything is plain HTML/CSS/ES-modules + JSON — **no build step, no server code, no
dependencies** — so it hosts for free anywhere static files can live.

## Run locally

```bash
cd visual-scripture
python3 -m http.server 8080     # or: npx serve
# open http://localhost:8080
```

## Deploy — Render (free)

The repo contains `render.yaml` (a free **static site**):

1. Push this repo to GitHub.
2. In the Render dashboard: **New → Blueprint**, pick this repo, accept the defaults.
3. Done — Render serves the site from its CDN at `https://<name>.onrender.com`.

## Deploy — Fly.io (free allowance)

The repo contains a `Dockerfile` (nginx, ~10 MB) and `fly.toml` configured to **sleep when
idle** so it stays within Fly's free allowance:

```bash
fly launch --no-deploy   # accepts existing fly.toml; pick your own app name
fly deploy
```

## Editing the content

All content lives in `data/`:

| File | What it holds |
|---|---|
| `data/text/<book>.json` | Verse text (public domain) |
| `data/meta/<book>.json` | Per-chapter title, synopsis, dates, place, themes, characters, and **speaker segments** (who speaks which verses, to whom) |
| `data/characters.json` | Cast bios, relationships, and portrait parameters |
| `data/places.json` | Internal-map places and coordinates |
| `data/timeline.json` | Timeline events |
| `data/stories.json` | Story navigator entries |
| `data/allegories.json` | Allegory scenes, symbols, and vineyard stages |
| `data/plates.json` | Records/plates model and per-book mapping |

`data/SCHEMA.md` documents the metadata format and canonical ids. After editing, run:

```bash
node scripts/validate.mjs
```

which checks that every chapter's speaker segments tile its verses exactly and that every
character/place/theme/plates id resolves.

## About the artwork

Character portraits are generated as stylized SVG from parameters in `characters.json`, so
the site is fully self-contained. Official Church art is copyrighted and therefore **not
bundled**; if you have images you're licensed to use (e.g. downloads from the
[Church Media Library](https://www.churchofjesuschrist.org/media) for personal,
noncommercial use), drop them in `assets/art/` and map them in `data/art-manifest.json`:

```json
{ "art": { "nephi1": "assets/art/nephi.jpg", "abinadi": "assets/art/abinadi.jpg" } }
```

Any mapped character instantly shows that image everywhere (reader cards, cast, timeline).

## Disclaimers

- Scripture text is from the public-domain tradition of the 1830 edition.
- Synopses, chronology, the internal map, and all visualizations are original study aids —
  not official publications of The Church of Jesus Christ of Latter-day Saints.
- Jaredite dates are approximations; the record gives genealogy, not years. Dates elsewhere
  follow the chronology printed in LDS edition chapter footnotes.
