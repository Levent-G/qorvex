import WORDS from '../data/words.json';

export { WORDS };
export const LEVEL_NAMES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const byAnswer = new Map(WORDS.map((w) => [w.a, w]));
export const getWord = (answer) => byAnswer.get(answer);

const POS_TR = {
  noun: 'isim', verb: 'fiil', adjective: 'sıfat', adverb: 'zarf', preposition: 'edat',
  conjunction: 'bağlaç', pronoun: 'zamir', interjection: 'ünlem', determiner: 'belirteç',
  number: 'sayı', phrase: 'ifade', 'phrasal verb': 'deyimsel fiil',
};
export const posTr = (p) => POS_TR[p] || p || '';

// Anlam -> kelimeler (aynı anlamdaki diğer İngilizce kelimeler için)
let meaningIndex = null;
function getMeaningIndex() {
  if (meaningIndex) return meaningIndex;
  meaningIndex = new Map();
  for (const w of WORDS)
    for (const m of w.m) {
      const k = m.toLocaleLowerCase('tr-TR');
      if (!meaningIndex.has(k)) meaningIndex.set(k, []);
      meaningIndex.get(k).push(w);
    }
  return meaningIndex;
}

export function similarWords(word, limit = 6) {
  const idx = getMeaningIndex();
  const out = [];
  const seen = new Set([word.a]);
  for (const m of word.m) {
    for (const x of idx.get(m.toLocaleLowerCase('tr-TR')) || []) {
      if (seen.has(x.a)) continue;
      seen.add(x.a);
      out.push({ a: x.a, m: m });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

// Aynı kökten gelen kelimeler (act, actor, action...)
export function familyWords(word, limit = 6) {
  const a = word.a;
  if (a.length < 4) return [];
  const stem = a.slice(0, Math.max(4, a.length - 3));
  const out = [];
  for (const w of WORDS) {
    if (w.a === a) continue;
    if (w.a.startsWith(stem) || (a.startsWith(w.a) && w.a.length >= 4)) {
      out.push({ a: w.a, m: w.m[0] });
      if (out.length >= limit) break;
    }
  }
  return out;
}
