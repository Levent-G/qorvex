// Izgara tabanlı oyunlar için ortak motor: Kare Bulmaca, Şifreli Bulmaca, Sarmal.
// Çengel bulmaca üreticisinin ızgarası alınır; ipucu ve boş kareler siyah kareye dönüşür.
import { generatePuzzle, mulberry32, shuffle } from './generator';

export const cellKey = (r, c) => `${r},${c}`;

// Çengel bulmaca çıktısından siyah kareli ızgara + kelime listesi
export function blockGridFrom(p) {
  const rows = p.rows.map((row) => row.replace(/[^A-Z]/g, '#'));
  const words = p.clues.map((k) => ({ answer: k.answer, text: k.text, dir: k.dir, sr: k.sr, sc: k.sc }));
  return { w: p.w, h: p.h, rows, words };
}

// Kelime başlangıçlarını gazete gibi numaralandır (soldan sağa, yukarıdan aşağı)
export function numberWords(words) {
  const starts = [...new Set(words.map((x) => cellKey(x.sr, x.sc)))]
    .map((k) => k.split(',').map(Number))
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const num = new Map(starts.map(([r, c], i) => [cellKey(r, c), i + 1]));
  return words.map((x) => ({ ...x, num: num.get(cellKey(x.sr, x.sc)) }));
}

/**
 * Genel kelime modeli (board.js reducer'ı ile uyumlu).
 * words: [{ answer, text, dir, cells: [[r,c]...] }]
 */
export function buildWordModel(words, order) {
  const ws = words.map((w, i) => ({ ...w, index: i, keys: w.cells.map(([r, c]) => cellKey(r, c)) }));
  const at = {};
  const solution = {};
  for (const w of ws)
    w.keys.forEach((k, j) => {
      at[k] = at[k] || {};
      at[k][w.dir] = w.index;
      solution[k] = w.answer[j];
    });
  const ord =
    order ||
    [...ws].sort((a, b) => (a.dir !== b.dir ? (a.dir === 'A' ? -1 : 1) : (a.num || 0) - (b.num || 0) || a.cells[0][0] - b.cells[0][0])).map((w) => w.index);
  return { words: ws, at, solution, order: ord, clueCells: {}, total: Object.keys(solution).length };
}

export function cellsOf(word) {
  const [dr, dc] = word.dir === 'A' ? [0, 1] : [1, 0];
  return Array.from({ length: word.answer.length }, (_, j) => [word.sr + dr * j, word.sc + dc * j]);
}

// ---------------- Kare Bulmaca / Şifreli için ızgara üret ----------------
export async function makeBlockPuzzle({ w, h, entries, dict, prio, seed, yieldFn, budgetMs = 1100 }) {
  const p = await generatePuzzle({ w, h, entries, dict, prio, seed, budgetMs, yieldFn });
  const g = blockGridFrom(p);
  g.words = numberWords(g.words);
  return g;
}

// ---------------- Şifreli Bulmaca (Codeword) ----------------
// Her harfe 1–26 arası bir sayı; birkaç harf başta verilir.
export function makeCodeword(grid, seed, givenCount) {
  const rand = mulberry32(seed ^ 0x9e3779b9);
  const letters = [...new Set(grid.rows.join('').replace(/#/g, ''))];
  const nums = shuffle(Array.from({ length: 26 }, (_, i) => i + 1), rand);
  const code = {};
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((ch, i) => (code[ch] = nums[i]));
  // En sık geçen harflerden rastgele seçerek ver (çözmeye başlanabilsin)
  const freq = {};
  for (const ch of grid.rows.join('')) if (ch !== '#') freq[ch] = (freq[ch] || 0) + 1;
  const common = letters.sort((a, b) => freq[b] - freq[a]).slice(0, 8);
  const given = shuffle(common, rand).slice(0, givenCount);
  return { ...grid, code, given };
}

/**
 * Şifreli Bulmaca'nın gizli cümlesi: yalnızca ızgaradaki harflerle yazılabilen anlamlı bir örnek cümle.
 * Bulmaca çözülünce (tüm sayılar kesinleşince) alttaki şeritte okunur. Bulmacanın kendi kelimelerinin
 * örnek cümleleri önceliklidir. words: tam kelime verisi (ex: [[en, tr]]), allowed: seviye sözlüğü (Set|Map).
 * Dönüş: { text: 'The car ran out of fuel.', tr, word } | null
 */
export function pickHiddenSentence(grid, words, allowed, seed, { maxChars = 30, minLetters = 10 } = {}) {
  const rand = mulberry32(seed ^ 0x85ebca6b);
  const have = new Set(grid.rows.join('').replace(/#/g, ''));
  const own = new Set(grid.words.map((x) => x.answer));
  const pick = (strict, minL) => {
    let best = null;
    for (const w of words) {
      if (strict && allowed && !allowed.has(w.a)) continue;
      for (const [en, tr] of w.ex || []) {
        if (en.length > maxChars || !/^[A-Za-z][A-Za-z ,.'!?-]*$/.test(en)) continue;
        const letters = en.toUpperCase().replace(/[^A-Z]/g, '');
        if (letters.length < minL) continue;
        let ok = true;
        for (const ch of letters) if (!have.has(ch)) { ok = false; break; }
        if (!ok) continue;
        const score = (own.has(w.a) ? 30 : 0) + letters.length * 0.4 + rand() * 8;
        if (!best || score > best.score) best = { score, text: en, tr, word: w.a };
      }
    }
    return best;
  };
  // önce seviyeye uygun cümle; olmazsa herhangi biri; o da olmazsa daha kısa cümle
  const b = pick(true, minLetters) || pick(false, minLetters) || pick(false, 5);
  if (b) return { text: b.text, tr: b.tr, word: b.word };
  // çok az harfli ızgara: en uzun kelime "gizli kelime" olur
  const longest = grid.words.slice().sort((x, y) => y.answer.length - x.answer.length)[0];
  return longest ? { text: longest.answer.charAt(0) + longest.answer.slice(1).toLowerCase(), tr: longest.text, word: longest.answer, single: true } : null;
}
