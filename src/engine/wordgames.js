// Sarmal Bulmaca, Jumble (Karışık Harfler) ve Cryptogram (Şifreli Cümle) üreticileri — saf JS.
import { mulberry32, shuffle } from './generator';

// ---------------- Sarmal Bulmaca ----------------
// Kare spiral yol: sol üstten saat yönünde içe doğru
export function spiralPath(n) {
  const path = [];
  let top = 0, left = 0, bottom = n - 1, right = n - 1;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) path.push([top, c]);
    for (let r = top + 1; r <= bottom; r++) path.push([r, right]);
    if (top < bottom) for (let c = right - 1; c >= left; c--) path.push([bottom, c]);
    if (left < right) for (let r = bottom - 1; r > top; r--) path.push([r, left]);
    top++; left++; bottom--; right--;
  }
  return path;
}

/**
 * Her kelime bir öncekinin son harfiyle başlar (o harf ortaktır) ve spiral yolu tam doldurur.
 * opts: { n, minLen, maxLen, entries:[{a,c,bonus}], prio:Set, seed }
 */
export function generateSpiral(opts) {
  const { n, minLen = 3, maxLen = 7, entries, prio, seed = Date.now() } = opts;
  const rand = mulberry32(seed);
  const T = n * n;
  const pool = entries.filter((e) => e.a.length >= minLen && e.a.length <= maxLen);
  const byFirst = new Map();
  for (const e of pool) {
    if (!byFirst.has(e.a[0])) byFirst.set(e.a[0], []);
    byFirst.get(e.a[0]).push(e);
  }
  const score = (e) => (prio && prio.has(e.a) ? 30 : 0) + (e.bonus || 0) + rand() * 6;
  for (const list of byFirst.values()) list.sort((x, y) => score(y) - score(x));

  let nodes = 0;
  const used = new Set();
  const chain = [];
  function dfs(remaining) {
    if (remaining === 0) return true;
    if (++nodes > 40000) return false;
    const last = chain[chain.length - 1].a;
    const cands = byFirst.get(last[last.length - 1]) || [];
    for (const e of cands) {
      const add = e.a.length - 1;
      if (used.has(e.a) || add > remaining) continue;
      // tam bitmeyecek kadar küçük bir artık kalmasın (en kısa kelime minLen-1 ekler)
      const rest = remaining - add;
      if (rest !== 0 && rest < minLen - 1) continue;
      used.add(e.a);
      chain.push(e);
      if (dfs(rest)) return true;
      chain.pop();
      used.delete(e.a);
    }
    return false;
  }
  const starts = shuffle(pool.slice(), rand).sort((x, y) => score(y) - score(x)).slice(0, 60);
  for (const s of starts) {
    if (s.a.length > T) continue;
    nodes = 0;
    used.clear();
    chain.length = 0;
    used.add(s.a);
    chain.push(s);
    if (dfs(T - s.a.length)) break;
    chain.length = 0;
  }
  if (!chain.length) throw new Error('Sarmal bulmaca üretilemedi');
  const path = spiralPath(n);
  let pos = 0;
  const words = chain.map((e, i) => {
    const start = i === 0 ? 0 : pos;
    const cells = path.slice(start, start + e.a.length);
    pos = start + e.a.length - 1;
    // board reducer için yön: ardışık kelimeler ortak hücre paylaştığından A/D sırayla
    return { answer: e.a, text: e.c, num: i + 1, start, cells, dir: i % 2 === 0 ? 'A' : 'D' };
  });
  return { n, path, words };
}

// ---------------- Jumble (Karışık Harfler) ----------------
function scramble(word, rand) {
  for (let t = 0; t < 20; t++) {
    const s = shuffle(word.split(''), rand).join('');
    if (s !== word) return s;
  }
  return word.split('').reverse().join('');
}

/**
 * opts: { count, minLen, maxLen, bonusLen, entries, prio, seed }
 * Dönüş: { words: [{answer, clue, scrambled, circles:[pos]}], bonus: {answer, clue} }
 * Daire içindeki harfler birleşince bonus kelimeyi oluşturur.
 */
export function generateJumble(opts) {
  const { count, minLen, maxLen, bonusLen, entries, prio, seed = Date.now() } = opts;
  const rand = mulberry32(seed);
  const pool = entries.filter((e) => e.a.length >= minLen && e.a.length <= maxLen);
  const bonusPool = entries.filter((e) => e.a.length === bonusLen);
  const score = (e) => (prio && prio.has(e.a) ? 30 : 0) + (e.bonus || 0) + rand() * 6;
  const bonuses = shuffle(bonusPool.slice(), rand).sort((x, y) => score(y) - score(x)).slice(0, 80);
  const cands = shuffle(pool.slice(), rand).sort((x, y) => score(y) - score(x));

  for (const b of bonuses) {
    // bonus harflerini gruplara böl: her kelime 1, fazlası rastgele kelimelere (en fazla 2)
    for (let attempt = 0; attempt < 6; attempt++) {
      const sizes = Array(count).fill(1);
      for (let extra = bonusLen - count; extra > 0; ) {
        const i = Math.floor(rand() * count);
        if (sizes[i] < 2) { sizes[i]++; extra--; }
      }
      const letters = shuffle(b.a.split(''), rand);
      const groups = [];
      let k = 0;
      for (const s of sizes) { groups.push(letters.slice(k, k + s)); k += s; }
      const used = new Set([b.a]);
      const out = [];
      for (const g of groups) {
        let found = null;
        for (const e of cands) {
          if (used.has(e.a) || e.a.includes(b.a) || b.a.includes(e.a)) continue;
          const pos = [];
          const taken = new Set();
          for (const ch of g) {
            let p = -1;
            for (let j = 0; j < e.a.length; j++) if (e.a[j] === ch && !taken.has(j)) { p = j; break; }
            if (p < 0) break;
            taken.add(p);
            pos.push(p);
          }
          if (pos.length === g.length) { found = { e, pos: pos.sort((x, y) => x - y) }; break; }
        }
        if (!found) break;
        used.add(found.e.a);
        out.push({ answer: found.e.a, clue: found.e.c, scrambled: scramble(found.e.a, rand), circles: found.pos });
      }
      if (out.length === count) return { words: out, bonus: { answer: b.a, clue: b.c, scrambled: scramble(b.a, rand) } };
    }
  }
  throw new Error('Karışık harfler üretilemedi');
}

// ---------------- Cryptogram (Şifreli Cümle) ----------------
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Örnek cümleyi harf değiştirme şifresiyle şifreler; Türkçe çevirisi ipucudur.
 * opts: { minChars, maxChars, given, words: WORDS (tam veri, örnekleriyle), allowed: Set(answer), prio, seed }
 */
export function generateCryptogram(opts) {
  const { minChars, maxChars, given = 2, words, allowed, prio, recent, seed = Date.now() } = opts;
  const rand = mulberry32(seed);
  const cands = [];
  for (const w of words) {
    if (allowed && !allowed.has(w.a)) continue;
    for (const [en, tr] of w.ex || []) {
      const letters = en.replace(/[^A-Za-z]/g, '').length;
      if (letters < minChars || letters > maxChars) continue;
      if (/[^A-Za-z .,'!?-]/.test(en)) continue; // rakam vb. olmasın
      const s = (prio && prio.has(w.a) ? 40 : 0) - (recent && recent.has(w.a) ? 20 : 0) + rand() * 10;
      cands.push({ w, en, tr, s });
    }
  }
  if (!cands.length) throw new Error('Şifreli cümle üretilemedi');
  cands.sort((x, y) => y.s - x.s);
  const pick = cands[0];
  // kendine eşlenen harf olmayan karışık alfabe
  let perm;
  do perm = shuffle(ALPHA.split(''), rand);
  while (perm.some((ch, i) => ch === ALPHA[i]));
  const cipher = {};
  ALPHA.split('').forEach((ch, i) => (cipher[ch] = perm[i]));
  const text = pick.en.toUpperCase();
  const present = [...new Set(text.replace(/[^A-Z]/g, ''))];
  const freq = {};
  for (const ch of text) if (/[A-Z]/.test(ch)) freq[ch] = (freq[ch] || 0) + 1;
  const givenLetters = shuffle(present.sort((a, b) => freq[b] - freq[a]).slice(0, 6), rand).slice(0, given);
  return { text, orig: pick.en, tr: pick.tr, cipher, given: givenLetters, word: pick.w.a, wordClue: pick.w.c };
}
