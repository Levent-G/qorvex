// Resim Bulmaca: fotoğraftaki nesnenin İngilizcesini harf taşlarıyla yaz. Saf fonksiyonlar (test edilebilir).
import { mulberry32, shuffle } from './generator';

// rounds: resim sayısı · decoys: fazladan (yanıltıcı) harf · firstGiven: ilk harf hazır gelir
export const PICTURE_LEVELS = {
  A1: { rounds: 6, decoys: 2, minLen: 3, maxLen: 6, firstGiven: true },
  A2: { rounds: 6, decoys: 3, minLen: 3, maxLen: 7, firstGiven: true },
  B1: { rounds: 6, decoys: 3, minLen: 4, maxLen: 8, firstGiven: false },
  B2: { rounds: 7, decoys: 4, minLen: 4, maxLen: 9, firstGiven: false },
  C1: { rounds: 7, decoys: 4, minLen: 4, maxLen: 9, firstGiven: false },
  C2: { rounds: 7, decoys: 5, minLen: 4, maxLen: 10, firstGiven: false },
  MIX: { rounds: 7, decoys: 4, minLen: 3, maxLen: 9, firstGiven: false },
};

/**
 * Fotoğrafı anlatan metinde kelime ana konu mu? İlk `within` kelimede (çoğul eki dahil) geçmeli.
 * Dönüş: konumu (0 = ilk kelime) ya da -1.
 */
export function altPosition(alt, word, within = 6) {
  const w = word.toLowerCase();
  const toks = String(alt || '').toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean);
  for (let i = 0; i < Math.min(within, toks.length); i++) {
    const t = toks[i];
    if (t === w || t === w + 's' || t === w + 'es' || (w.endsWith('y') && t === w.slice(0, -1) + 'ies')) return i;
  }
  return -1;
}

/** Pexels sonuçlarından nesnenin ana konu olduğu en iyi fotoğrafı seç (yoksa null). */
export function pickPhoto(photos, word) {
  let best = null, bestPos = 99;
  for (const p of photos || []) {
    const pos = altPosition(p.alt, word);
    if (pos >= 0 && pos < bestPos) {
      bestPos = pos;
      best = p;
    }
  }
  if (!best) return null;
  return {
    url: best.src?.large || best.src?.medium,
    by: best.photographer || '',
    link: best.url || '',
    alt: best.alt || '',
  };
}

/**
 * Aday kelimeler: seviye havuzundaki somut olabilecek isimler (uzunluk aralığında).
 * cache: daha önce bakılan fotoğraflar (null = fotoğrafı yok, atlanır; varsa öne alınır).
 */
export function pictureCandidates(entries, nouns, cfg, prio, cache, seed) {
  const rand = mulberry32(seed);
  const out = [];
  for (const e of entries) {
    if (!nouns.has(e.a) || e.a.length < cfg.minLen || e.a.length > cfg.maxLen) continue;
    if (cache && cache[e.a] === null) continue; // fotoğrafı olmadığı biliniyor
    const s = (prio && prio.has(e.a) ? 30 : 0) + (e.bonus || 0) + (cache && cache[e.a] ? 4 : 0) + rand() * 6;
    out.push({ a: e.a, c: e.c, s });
  }
  return out.sort((x, y) => y.s - x.s);
}

const DECOY_LETTERS = 'EEAAIIOOTTNNSSRRLLCDUMPHGBFYWKV';

/** Bir tur: cevap harfleri + yanıltıcı harfler karışık; ilk harf verilecekse onun taşı. */
export function makeRound(answer, clue, photo, cfg, seed) {
  const rand = mulberry32(seed);
  const letters = answer.split('');
  for (let k = 0; k < cfg.decoys; k++) letters.push(DECOY_LETTERS[Math.floor(rand() * DECOY_LETTERS.length)]);
  let tiles;
  for (let t = 0; t < 10; t++) {
    tiles = shuffle(letters.slice(), rand);
    if (tiles.slice(0, answer.length).join('') !== answer) break;
  }
  return { answer, clue, photo, tiles: tiles.join('') };
}

/** Başlangıç durumu: her tur için boş kutular; ilk harf veriliyorsa ilk kutuya o taş konur. */
export function initSlots(round, firstGiven) {
  const slots = Array(round.answer.length).fill(null);
  if (firstGiven) slots[0] = round.tiles.indexOf(round.answer[0]);
  return slots;
}

/** Taşa dokun: ilk boş kutuya koy (kullanılmışsa yok say). */
export function placeTile(slots, t) {
  if (slots.includes(t)) return slots;
  const j = slots.indexOf(null);
  if (j < 0) return slots;
  const next = slots.slice();
  next[j] = t;
  return next;
}

/** Kutuya dokun: taşı geri al (verilen ilk harf hariç). */
export function removeAt(slots, j, firstGiven) {
  if (firstGiven && j === 0) return slots;
  if (slots[j] == null) return slots;
  const next = slots.slice();
  next[j] = null;
  return next;
}

export const slotsWord = (round, slots) => slots.map((t) => (t == null ? '' : round.tiles[t])).join('');
export const slotsFull = (slots) => slots.every((t) => t != null);
export const slotsOk = (round, slots) => slotsFull(slots) && slotsWord(round, slots) === round.answer;

/** Harf aç: ilk yanlış/boş kutuya doğru harfin (boştaki) taşını koy. */
export function revealOne(round, slots) {
  const cur = slots.slice();
  const j = cur.findIndex((t, k) => t == null || round.tiles[t] !== round.answer[k]);
  if (j < 0) return slots;
  const want = round.answer[j];
  // doğru yerde duran taşları koru; o harfin boştaki taşını bul
  const locked = new Set(cur.filter((t, k) => t != null && round.tiles[t] === round.answer[k]));
  const free = [...round.tiles].findIndex((ch, t) => ch === want && !locked.has(t));
  if (free < 0) return slots;
  const k = cur.indexOf(free);
  if (k >= 0) cur[k] = null;
  cur[j] = free;
  return cur;
}
