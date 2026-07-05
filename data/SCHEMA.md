# Data schema for chapter metadata (data/meta/<slug>.json)

Each book file:

```json
{
  "book": "1 Nephi",
  "slug": "1-nephi",
  "narrator": "nephi1",
  "plates": "small-plates",
  "chapters": [ { ...chapter... } ]
}
```

`plates` is one of: `small-plates`, `mormon-abridgment`, `mormon-own`, `ether-abridgment`, `moroni-own`.
Book mapping: 1 Nephi, 2 Nephi, Jacob, Enos, Jarom, Omni = `small-plates`. Words of Mormon = `mormon-own`.
Mosiah, Alma, Helaman, 3 Nephi, 4 Nephi = `mormon-abridgment`. Mormon = `mormon-own` (chapters 8–9 get a
chapter-level override `"plates": "moroni-own"`). Ether = `ether-abridgment`. Moroni = `moroni-own`.

Chapter object:

```json
{
  "c": 4,
  "title": "Nephi Obtains the Brass Plates",
  "synopsis": "Two to three plain-language sentences describing what happens in the chapter and why it matters to the larger story.",
  "years": "600-592 BC",
  "yearNum": -598,
  "approx": false,
  "place": "jerusalem",
  "themes": ["obedience", "records"],
  "characters": ["nephi1", "zoram1", "laban"],
  "segments": [
    { "s": 1, "e": 5, "speaker": "nephi1", "to": "reader", "note": "Nephi narrates the return to Jerusalem" },
    { "s": 6, "e": 18, "speaker": "the-lord", "to": "nephi1", "note": "The Spirit directs Nephi" }
  ]
}
```

Rules:
- `title`: evocative, 3–7 words, no verse refs.
- `synopsis`: 2–3 sentences, plain language, present tense.
- `years`: human string matching standard LDS chapter-footnote chronology ("about 600-592 BC", "AD 34"). `yearNum`: single representative integer, negative = BC. Ether chapters: `approx: true`, spread roughly -2150 to -580 ending with the Jaredite destruction near -580.
- `place`: one primary place id from the canonical list, or `null` for purely doctrinal chapters.
- `themes`: 1–4 ids from the canonical theme list.
- `characters`: individuals (not groups) who appear or act, max 8, canonical ids only. Empty array allowed.
- `segments`: MUST tile verses 1..N contiguously (N = the chapter's verse count, provided) with no gaps or overlaps. `speaker` = whose voice the reader hears (narrator vs. quoted sermon/dialogue). `to` = audience id (a character/group id or `reader`, `multitude`, `church`, `house-of-israel`, `the-lord` for prayers). Keep coarse: 1–8 segments per chapter; a single narrator segment is fine for pure narration. `note` ≤ 12 words.

## Canonical character ids

Individuals — old world & small plates: `lehi1` (Lehi the patriarch prophet), `sariah`, `nephi1` (son of Lehi),
`sam`, `laman`, `lemuel`, `zoram1` (servant of Laban), `ishmael1`, `laban`, `jacob1` (son of Lehi), `joseph1`
(son of Lehi), `enos1`, `jarom1`, `omni1`, `amaron`, `chemish`, `abinadom`, `amaleki1`.
Quoted prophets: `isaiah`, `zenos`, `zenock`, `neum`, `malachi`, `moses`.
Kingdom era: `mosiah1` (first king Mosiah), `benjamin` (King Benjamin), `mosiah2` (son of Benjamin), `zeniff`,
`king-noah`, `limhi`, `gideon1`, `abinadi`, `alma1` (Alma the Elder), `alma2` (Alma the Younger), `amulon`,
`ammon1` (leader of expedition that finds Limhi), `ammon2` (son of Mosiah, missionary), `aaron2` (son of Mosiah),
`omner`, `himni`, `lamoni`, `lamoni-father` (King Lamoni's father), `abish`, `anti-nephi-lehi` (the king),
`amulek`, `zeezrom`, `nehor`, `amlici`, `korihor`.
War era: `captain-moroni`, `teancum`, `amalickiah`, `ammoron`, `zerahemnah`, `pahoran`, `moronihah`,
`lehi2` (Nephite commander), `helaman1` (son of Alma2, led the stripling warriors), `shiblon`, `corianton`.
Helaman–3 Nephi: `helaman2` (son of Helaman1, chief judge), `nephi2` (son of Helaman2), `lehi3` (son of
Helaman2), `samuel-lamanite`, `gadianton`, `kishkumen`, `lachoneus`, `gidgiddoni`, `giddianhi`,
`nephi3` (disciple, son of Nephi2).
Final era: `mormon` (prophet-historian), `moroni` (son of Mormon, final author).
Jaredites: `jared` (Jaredite founder), `brother-of-jared`, `ether`, `coriantumr` (last Jaredite king), `shiz`, `akish`.
Divine/heavenly: `jesus-christ`, `god-the-father`, `the-lord` (voice of the Lord in vision/quotation), `angel`.

Groups (usable as speaker/audience): `nephites`, `lamanites`, `people-of-zarahemla`, `people-of-ammon`,
`zoramites`, `gadianton-robbers`, `three-nephites`, `stripling-warriors`, `twelve-disciples`, `jaredites`,
`multitude`, `church`, `house-of-israel`, `reader`.

## Canonical place ids

Old world: `jerusalem`, `valley-of-lemuel`, `nahom`, `bountiful-old` (Old World Bountiful, includes Irreantum).
New world (internal map): `land-of-first-inheritance`, `city-of-nephi` (land of Nephi / Lehi-Nephi), `shilom`,
`shemlon`, `waters-of-mormon`, `helam`, `land-of-ishmael`, `middoni`, `zarahemla`, `river-sidon`, `gideon`,
`ammonihah`, `melek`, `jershon`, `antionum`, `manti`, `nephihah`, `moroni-city`, `mulek-city`,
`narrow-strip-wilderness`, `bountiful`, `narrow-neck`, `desolation`, `cumorah`, `moron` (Jaredite seat).

## Canonical theme ids

`faith`, `obedience`, `covenant`, `deliverance`, `atonement`, `repentance`, `prophecy`, `revelation`, `prayer`,
`records`, `pride-cycle`, `humility`, `charity`, `missionary-work`, `conversion`, `liberty`, `war`, `peace`,
`justice-and-mercy`, `resurrection`, `judgment`, `apostasy`, `secret-combinations`, `leadership`, `family`,
`gathering-of-israel`, `endurance`, `hope`, `baptism`, `sacrament`, `priesthood`.
