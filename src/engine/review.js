// Kelime tekrar modu: soru seti üretimi (saf fonksiyonlar, test edilebilir)
import { mulberry32, shuffle } from './generator';
import { isDue } from './pool';

/**
 * Soru seti: defter (vakti gelenler önce, sonra en uzun süredir görülmeyenler) ya da zor kelimeler.
 * words: tam kelime verisi; learn: öğrenme kaydı; hard: hardWords() çıktısı.
 * Dönüş: [{ answer, word, options: [A, B, C, D] }]
 */
export const REVIEW_TYPES = ['tr2en', 'en2tr', 'listen', 'write', 'cloze'];

// Kelimenin örnek cümlesinde geçtiği yer boşlukla: "I ____ to school." (yoksa null)
export function clozeOf(w) {
  for (const [en, tr] of w.ex || []) {
    const re = new RegExp(`\\b${w.a}\\b`, 'i');
    if (re.test(en)) return { text: en.replace(re, '_'.repeat(Math.max(4, w.a.length))), tr };
  }
  return null;
}

const fits = (type, w) => (type === 'write' ? w.a.length <= 10 : type === 'cloze' ? !!clozeOf(w) : true);

// Soru türü atama: 'mix' ise türler sırayla dağıtılır (uymayan kelimede TR→EN)
function assignTypes(qs, mode, rand) {
  const order = mode === 'mix' ? shuffle(REVIEW_TYPES.slice(), rand) : [mode];
  return qs.map((q, i) => {
    const t = order[i % order.length];
    const type = fits(t, q.word) ? t : 'tr2en';
    return type === 'cloze' ? { ...q, type, cloze: clozeOf(q.word) } : { ...q, type };
  });
}

export function buildReview(opts) {
  const { mode = 'tr2en', seed = Date.now() } = opts;
  const qs = buildReviewBase(opts);
  return assignTypes(qs, mode, mulberry32((seed ^ 0x9e3779b9) >>> 0));
}

function buildReviewBase({ words, learn, hard, source = 'notebook', count = 10, seed = Date.now() }) {
  const rand = mulberry32(seed);
  const byA = new Map(words.map((w) => [w.a, w]));
  let pool;
  if (source === 'hard') {
    pool = hard.map((h) => h.answer);
  } else if (Array.isArray(source)) {
    pool = source; // hazır liste (ör. günün kelimesi)
  } else {
    const marked = Object.entries(learn.marked || {}).filter(([a]) => byA.has(a));
    const due = marked.filter(([, m]) => isDue(m, learn.counter)).sort((x, y) => (x[1].last ?? 0) - (y[1].last ?? 0));
    const rest = marked.filter(([, m]) => !isDue(m, learn.counter)).sort((x, y) => (x[1].last ?? 0) - (y[1].last ?? 0));
    pool = [...due, ...rest].map(([a]) => a);
  }
  const picked = pool.filter((a) => byA.has(a)).slice(0, count);
  return shuffle(picked.slice(), rand).map((a) => {
    const w = byA.get(a);
    return { answer: a, word: w, options: shuffle([a, ...distractors(words, w, rand)], rand) };
  });
}

// Yanlış seçenekler: aynı tür, yakın seviye ve uzunluk; Türkçe ipucu farklı (eş anlamlı şık olmasın)
export function distractors(words, w, rand, n = 3) {
  const near = (x) => x.a !== w.a && x.p === w.p && Math.abs(x.l - w.l) <= 1 && Math.abs(x.a.length - w.a.length) <= 3 && x.c !== w.c && x.a.length > 2;
  let cands = words.filter(near);
  if (cands.length < n) cands = words.filter((x) => x.a !== w.a && x.c !== w.c && x.a.length > 2);
  const out = [];
  const used = new Set([w.a]);
  for (const x of shuffle(cands.slice(), rand)) {
    if (used.has(x.a)) continue;
    used.add(x.a);
    out.push(x.a);
    if (out.length === n) break;
  }
  return out;
}
