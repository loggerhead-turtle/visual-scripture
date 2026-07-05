# Schema extension: Old Testament, New Testament, Doctrine & Covenants

Read `data/SCHEMA.md` first — chapter objects, segment tiling rules, and field meanings are identical.
This file adds the canonical ids for the additional volumes. Verse counts for every book are in
`data/versecounts.json` (keyed by slug; array index = chapter-1).

## Book file header

Same as before, but `plates` is now a generic "record/collection" key:

- OT collections: `law` (Genesis–Deuteronomy), `history` (Joshua–Esther), `wisdom` (Job–Song of Solomon),
  `prophets-major` (Isaiah–Daniel), `prophets-minor` (Hosea–Malachi).
- NT collections: `gospels` (Matthew–John), `acts-history` (Acts), `pauline-epistles` (Romans–Philemon + Hebrews),
  `general-epistles` (James–Jude), `apocalypse` (Revelation).
- D&C periods (use as chapter-level `plates` override per section; book default `dc-kirtland`):
  `dc-newyork` (sections received in NY/PA era, 1823–Jan 1831), `dc-kirtland` (Ohio era, 1831–1837),
  `dc-missouri` (Missouri-focused revelations incl. Liberty Jail, 1831–1839), `dc-nauvoo` (1839–1846),
  `dc-later` (1847+, incl. 136 Winter Quarters and 138 vision of the redemption of the dead, 1918).

Traditional narrators: Gen–Deut `moses`; Joshua `joshua`; Judges/Ruth/Samuel/Kings/Chronicles/Esther/Job
`chronicler`; Ezra `ezra`; Nehemiah `nehemiah`; Psalms `david` (use `psalmist` where clearly not David);
Prov/Eccl/Song `solomon`; each prophet his own book; Lamentations `jeremiah`.
NT: `matthew`, `mark`, `luke` (Luke+Acts), `john-beloved` (John, 1–3 John, Revelation), `paul` (Romans–Philemon,
Hebrews), `james-just`, `peter`, `jude`. D&C: narrator `joseph-smith`, but most section text is speaker
`the-lord` — set segment audience to the person(s) the revelation addresses where the heading names them.

Dates: `years` human string + `yearNum` integer (negative = BC). Early Genesis uses traditional dating with
`approx: true` (creation ≈ -4000, flood ≈ -2350, Babel ≈ -2200). Patriarchs ≈ 2000–1700 BC, Exodus ≈ 1300 BC
(approx), David ≈ 1000 BC, kingdom divides 930 BC, Israel falls 722 BC, Jerusalem falls 586 BC, return 538 BC,
Malachi ≈ 430 BC. NT: Jesus's ministry AD 30–33 (approx), Acts 33–62, epistles ≈ 50–95, Revelation ≈ 95.
D&C: use each section's actual historical date (1823–1918).

## Additional canonical character ids

OT individuals: `adam`, `eve`, `enoch`, `noah` (the patriarch — NOT `king-noah`), `melchizedek`, `abraham`,
`sarah`, `hagar`, `isaac`, `rebekah`, `jacob-israel`, `rachel`, `joseph-egypt`, `pharaoh` (any/era-generic),
`miriam`, `aaron` (brother of Moses — NOT `aaron2`), `joshua`, `rahab`, `deborah`, `gideon` (judge — NOT
`gideon1`), `samson`, `ruth`, `naomi`, `boaz`, `hannah`, `samuel`, `saul`, `david`, `jonathan`, `goliath`,
`nathan`, `solomon`, `elijah`, `elisha`, `ahab`, `jezebel`, `naaman`, `hezekiah`, `josiah`, `jeremiah`,
`ezekiel`, `daniel`, `three-hebrews` (Shadrach, Meshach & Abed-nego — one card), `nebuchadnezzar`, `esther`,
`mordecai`, `haman`, `job`, `jonah`, `hosea`, `amos`, `micah`, `zechariah-prophet`, `ezra`, `nehemiah`,
`cyrus`, `satan` (the adversary — Job 1–2, Zech 3, Matt 4), `chronicler` (unnamed narrator), `psalmist`,
`asaph`. Reuse existing: `moses`, `isaiah`, `malachi`, `the-lord`, `angel`, `god-the-father`.

NT individuals: `mary` (mother of Jesus), `joseph-carpenter`, `john-baptist`, `elisabeth`, `simeon-anna`
(one card), `peter`, `andrew`, `james` (son of Zebedee), `john-beloved`, `matthew`, `thomas`, `philip-apostle`,
`judas-iscariot`, `mary-magdalene`, `martha`, `lazarus`, `nicodemus`, `zacchaeus`, `pilate`, `herod`,
`caiaphas`, `stephen`, `philip-evangelist`, `cornelius`, `barnabas`, `paul`, `silas`, `timothy`, `lydia`,
`aquila-priscilla` (one card), `apollos`, `mark`, `luke`, `james-just` (brother of the Lord), `jude`,
`onesimus`, `felix-festus-agrippa` (one card), `jesus-christ` (existing).

D&C individuals: `joseph-smith`, `emma-smith`, `hyrum-smith`, `joseph-smith-sr`, `oliver-cowdery`,
`martin-harris`, `david-whitmer`, `john-whitmer`, `sidney-rigdon`, `edward-partridge`, `newel-k-whitney`,
`william-w-phelps`, `parley-p-pratt`, `orson-pratt`, `orson-hyde`, `thomas-b-marsh`, `william-marks`?
— do NOT use ids not listed; if a section addresses someone not listed, use `church` or `elders` as audience.
Also: `brigham-young`, `john-taylor`, `joseph-f-smith`. Reuse: `moroni` (the angel), `john-baptist`,
`peter`, `james`, `john-beloved` (priesthood restoration).

Additional groups: `israelites`, `philistines`, `babylonians`, `twelve-apostles`, `pharisees`, `disciples`,
`elders` (elders of the restored church), `saints` (latter-day), `nations` (the gentile nations/world).
All existing groups (`church`, `house-of-israel`, `multitude`, `reader`, …) remain usable.

## Additional canonical place ids

Holy Land map: `egypt-goshen`, `red-sea`, `mount-sinai`, `wilderness-paran`, `beersheba`, `hebron`, `gaza`,
`bethlehem`, `jerusalem` (shared with BoM), `jericho`, `jordan-river`, `dead-sea`, `bethel`, `shiloh`,
`samaria-city`, `mount-carmel`, `nazareth`, `sea-of-galilee`, `capernaum`, `babylon`, `nineveh`, `susa`,
`damascus`, `antioch`, `ephesus`, `corinth`, `athens`, `rome`, `patmos`.
Use `null` for psalms/proverbs/epistle chapters with no single setting.

USA (restoration) map: `sharon-vt`, `palmyra` (incl. Sacred Grove & Hill Cumorah), `fayette`, `colesville`,
`harmony-pa`, `kirtland`, `hiram-oh`, `independence`, `liberty-jail`, `far-west`, `adam-ondi-ahman`,
`nauvoo`, `carthage`, `winter-quarters`, `salt-lake-valley`.

## Additional canonical theme ids

`creation`, `fall`, `law`, `kingship`, `exile`, `wisdom`, `worship`, `messiah`, `miracles`, `parables`,
`discipleship`, `grace`, `mission`, `second-coming`, `restoration`, `zion`, `temple`, `word-of-wisdom`,
`consecration`, `agency`, `martyrdom`. All existing themes remain usable.

## Cultural sensitivity for portraits

Book of Mormon Lamanite characters (e.g. lamoni, lamoni-father, abish, anti-nephi-lehi,
samuel-lamanite, and the `lamanites`/`people-of-ammon` groups) must NOT be drawn with a heavy
Native American motif. Avoid the stereotype cluster: do not combine strongly reddish skin +
long straight jet-black hair + "sun" emblems; no feathers, headbands-as-warpaint, or other
appropriative signals. Use the same warm-neutral skin band as everyone else (light #d3a276 …
deep #a97a4e), ordinary hair styles, and emblems tied to each person's story (faith, conversion,
service) rather than ethnic shorthand. Distinguish Lamanite figures the same way as all others —
by individual face, age, and story — not by racial coding. Apply the same warm-neutral,
region-aware but non-stereotyping approach to every group.

## Portrait parameters (for cast files)

Each character entry: `{ id, name, title, era, bio (1–2 sentences), relations: [{to, rel}], groups: [tags],
portrait: { skin, hair (hex colors), style: short|long|veil, beard: none|short|long,
head: none|circlet|crown|helmet|hood|turban|veil|radiance, garb, accent (hex), emblem } }`.
Emblems available: plates|sword|bow|tree|star|tower|banner|olive|stones|liahona|scroll|shield|dove|fire|water|sun|heart|mount|trumpet|crown.
Palette guidance: earthy robes, one gold-family accent; divine/heavenly figures use head `radiance` and pale garb.
