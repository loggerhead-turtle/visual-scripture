// Deep links into the Church's own scripture pages on ChurchofJesusChrist.org
// (the official standard-works edition, with its footnotes). We only ever link
// there — none of the official footnote text is copied into this site.
//
//   officialChapterUrl('isaiah', 53)      -> .../study/scriptures/ot/isa/53?lang=eng
//   officialVerseUrl('isaiah', 53, 4)     -> ...?lang=eng&id=p4#p4
import { volumeOf } from './data.js';

const VOL_PATH = { ot: 'ot', nt: 'nt', bom: 'bofm', dc: 'dc-testament', pgp: 'pgp' };

// our slug -> the Church site's book abbreviation
const BOOK_ABBR = {
  // Old Testament
  genesis: 'gen', exodus: 'ex', leviticus: 'lev', numbers: 'num', deuteronomy: 'deut', joshua: 'josh',
  judges: 'judg', ruth: 'ruth', '1-samuel': '1-sam', '2-samuel': '2-sam', '1-kings': '1-kgs', '2-kings': '2-kgs',
  '1-chronicles': '1-chr', '2-chronicles': '2-chr', ezra: 'ezra', nehemiah: 'neh', esther: 'esth', job: 'job',
  psalms: 'ps', proverbs: 'prov', ecclesiastes: 'eccl', 'song-of-solomon': 'song', isaiah: 'isa', jeremiah: 'jer',
  lamentations: 'lam', ezekiel: 'ezek', daniel: 'dan', hosea: 'hosea', joel: 'joel', amos: 'amos', obadiah: 'obad',
  jonah: 'jonah', micah: 'micah', nahum: 'nahum', habakkuk: 'hab', zephaniah: 'zeph', haggai: 'hag',
  zechariah: 'zech', malachi: 'mal',
  // New Testament
  matthew: 'matt', mark: 'mark', luke: 'luke', john: 'john', acts: 'acts', romans: 'rom', '1-corinthians': '1-cor',
  '2-corinthians': '2-cor', galatians: 'gal', ephesians: 'eph', philippians: 'philip', colossians: 'col',
  '1-thessalonians': '1-thes', '2-thessalonians': '2-thes', '1-timothy': '1-tim', '2-timothy': '2-tim', titus: 'titus',
  philemon: 'philem', hebrews: 'heb', james: 'james', '1-peter': '1-pet', '2-peter': '2-pet', '1-john': '1-jn',
  '2-john': '2-jn', '3-john': '3-jn', jude: 'jude', revelation: 'rev',
  // Book of Mormon
  '1-nephi': '1-ne', '2-nephi': '2-ne', jacob: 'jacob', enos: 'enos', jarom: 'jarom', omni: 'omni',
  'words-of-mormon': 'w-of-m', mosiah: 'mosiah', alma: 'alma', helaman: 'hel', '3-nephi': '3-ne', '4-nephi': '4-ne',
  mormon: 'morm', ether: 'ether', moroni: 'moro',
  // Doctrine & Covenants
  dc: 'dc',
  // Pearl of Great Price
  moses: 'moses', abraham: 'abr', 'js-matthew': 'js-m', 'js-history': 'js-h', 'articles-of-faith': 'a-of-f',
};

export function officialChapterUrl(slug, c) {
  const vol = volumeOf(slug);
  const abbr = BOOK_ABBR[slug];
  if (!vol || !abbr) return null;
  return `https://www.churchofjesuschrist.org/study/scriptures/${VOL_PATH[vol.id]}/${abbr}/${c}?lang=eng`;
}

export function officialVerseUrl(slug, c, v) {
  const base = officialChapterUrl(slug, c);
  return base && v ? `${base}&id=p${v}#p${v}` : base;
}
