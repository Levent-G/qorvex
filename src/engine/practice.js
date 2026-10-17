// Alıştırma modları için saf fonksiyonlar: günün kelimesi, zamana karşı soruları, telaffuz seti ve eşleştirme.
import { mulberry32, shuffle } from './generator';
import { distractors } from './review';

const hashStr = (s) => s.split('').reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) >>> 0, 2166136261);

// Günün kelimesi: tarihe göre sabit; profil seviyesinde, örnek cümlesi ve okunuşu olan kelimeler
export function wordOfDay(words, levelIdx, dateKey) {
  const lv = Math.max(0, Math.min(5, levelIdx));
  const cands = words.filter((w) => w.l === lv && w.ipa && w.ex && w.ex.length && w.a.length >= 4 && w.a.length <= 10);
  const pool = cands.length ? cands : words.filter((w) => w.ex && w.ex.length);
  return pool[hashStr('wotd' + dateKey) % pool.length];
}

// Zamana karşı: seviyedeki (±1) kelimelerden hızlı 4 şıklı sorular; yön karışık (TR→EN / EN→TR)
export function buildTimeAttack(words, levelIdx, seed, count = 80) {
  const rand = mulberry32(seed);
  const pool = words.filter((w) => Math.abs(w.l - levelIdx) <= 1 && w.a.length >= 3 && w.a.length <= 10);
  return shuffle(pool.slice(), rand)
    .slice(0, count)
    .map((w, i) => ({
      answer: w.a,
      word: w,
      type: i % 3 === 2 ? 'en2tr' : 'tr2en',
      options: shuffle([w.a, ...distractors(words, w, rand)], rand),
    }));
}

// Telaffuz seti: önce defterdeki kelimeler, eksikse seviyedeki okunuşu bilinen kelimeler
export function pronounceSet(words, learn, levelIdx, seed, count = 8) {
  const rand = mulberry32(seed);
  const byA = new Map(words.map((w) => [w.a, w]));
  const book = shuffle(Object.keys(learn.marked || {}).filter((a) => byA.get(a)?.ipa), rand).map((a) => byA.get(a));
  const level = shuffle(
    words.filter((w) => w.l === Math.max(0, Math.min(5, levelIdx)) && w.ipa && w.a.length >= 3 && w.a.length <= 10),
    rand,
  );
  const out = [];
  const used = new Set();
  for (const w of [...book.slice(0, Math.ceil(count / 2)), ...level]) {
    if (used.has(w.a)) continue;
    used.add(w.a);
    out.push(w);
    if (out.length === count) break;
  }
  return out;
}

const norm = (s) => s.toLowerCase().replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim();
function lev(a, b) {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = t;
    }
  }
  return d[b.length];
}

// Söylenen (tanıyıcının alternatifleri) hedef kelimeyle eşleşiyor mu? Çoğul / ufak tanıma farkı kabul.
export function matchSpoken(target, alternatives) {
  const t = norm(target);
  for (const alt of alternatives || []) {
    const s = norm(alt);
    if (!s) continue;
    if (s === t) return true;
    for (const w of s.split(' ')) {
      if (w === t || w === t + 's' || w === t + 'es' || t === w + 's') return true;
      if (t.length >= 6 && lev(w, t) <= 1) return true;
    }
  }
  return false;
}

// Hafta anahtarı (ISO hafta): "2026-W42"
export function isoWeek(d = new Date()) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((x - y0) / 86400000 + 1) / 7);
  return { key: `${x.getUTCFullYear()}-W${wk}`, no: wk };
}
