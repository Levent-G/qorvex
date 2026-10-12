// Kelime Avı (Word Search) üretici — telefonda çalışır, saf JS.
import { mulberry32, shuffle } from './generator';

// Yönler: [dr, dc]
export const DIRS = {
  E: [0, 1], S: [1, 0], SE: [1, 1], NE: [-1, 1],
  W: [0, -1], N: [-1, 0], NW: [-1, -1], SW: [1, -1],
};

// İngilizce harf sıklığı (dolgu harfleri gerçekçi görünsün)
const FREQ = 'EEEEEEEEEEEETTTTTTTTTAAAAAAAAOOOOOOOOIIIIIIINNNNNNNSSSSSSHHHHHHRRRRRRDDDDLLLLCCCUUUMMMWWFFGGYYPPBVKJXQZ';

function tryPlace(grid, w, h, word, dir, rand, tries) {
  const [dr, dc] = DIRS[dir];
  const n = word.length;
  // geçerli başlangıç aralığı
  const rMin = dr < 0 ? n - 1 : 0, rMax = dr > 0 ? h - n : h - 1;
  const cMin = dc < 0 ? n - 1 : 0, cMax = dc > 0 ? w - n : w - 1;
  if (rMin > rMax || cMin > cMax) return null;
  let best = null;
  for (let t = 0; t < tries; t++) {
    const r = rMin + Math.floor(rand() * (rMax - rMin + 1));
    const c = cMin + Math.floor(rand() * (cMax - cMin + 1));
    let overlap = 0, ok = true;
    for (let k = 0; k < n; k++) {
      const ch = grid[(r + dr * k) * w + (c + dc * k)];
      if (ch && ch !== word[k]) { ok = false; break; }
      if (ch) overlap++;
    }
    if (!ok || overlap === n) continue;
    // kesişmeyi ödüllendir: kelimeler birbirine geçtikçe bulmak zorlaşır
    const score = overlap * 3 + rand();
    if (!best || score > best.score) best = { r, c, score };
    if (overlap >= 3) break;
  }
  if (!best) return null;
  for (let k = 0; k < n; k++) grid[(best.r + dr * k) * w + (best.c + dc * k)] = word[k];
  return { r: best.r, c: best.c, dir };
}

// Kelime ızgarada (herhangi bir yönde) kaç kez geçiyor?
function countOccurrences(rows, w, h, word) {
  let n = 0;
  for (let r = 0; r < h; r++)
    for (let c = 0; c < w; c++) {
      if (rows[r][c] !== word[0]) continue;
      for (const [dr, dc] of Object.values(DIRS)) {
        let k = 1;
        for (; k < word.length; k++) {
          const rr = r + dr * k, cc = c + dc * k;
          if (rr < 0 || cc < 0 || rr >= h || cc >= w || rows[rr][cc] !== word[k]) break;
        }
        if (k === word.length) n++;
      }
    }
  // palindrom kelimeler iki yönde sayılır
  const pal = word === [...word].reverse().join('');
  return pal ? n / 2 : n;
}

/**
 * opts: { w, h, count, dirs: ['E','S',...], entries: [{a, c, bonus?}], prio: Set, seed }
 * Dönüş: { w, h, rows: [string], words: [{answer, clue, r, c, dir}] }
 */
export function generateWordSearch(opts) {
  const { w, h, count, dirs, entries, prio, seed = Date.now() } = opts;
  const rand = mulberry32(seed);
  // Kelimeler kısa kenardan uzun olmasın: her kelime her yöne sığabilsin (yoksa uzunlar hep dikey kalır)
  const maxLen = Math.min(w, h);
  const fit = entries.filter((e) => e.a.length >= 3 && e.a.length <= maxLen);
  const prioList = shuffle(fit.filter((e) => prio && prio.has(e.a)), rand);
  // Yakın zamanda gelenleri (bonus < 0) sona at
  const rest = shuffle(fit.filter((e) => !(prio && prio.has(e.a))), rand).sort((x, y) => (y.bonus || 0) - (x.bonus || 0));

  for (let attempt = 0; attempt < 30; attempt++) {
    const grid = new Array(w * h).fill('');
    const placed = [];
    const used = new Set();
    const dirCount = Object.fromEntries(dirs.map((d) => [d, 0]));
    // Önce uzun kelimeler daha kolay yerleşir; öncelikli kelimeler en başta
    const pool = [...prioList, ...rest.slice(attempt * 7, attempt * 7 + 400)];
    const ordered = [
      ...pool.filter((e) => prio && prio.has(e.a)),
      ...pool.filter((e) => !(prio && prio.has(e.a))).sort((x, y) => y.a.length - x.a.length + (rand() - 0.5) * 4),
    ];
    const usable = (e) =>
      !used.has(e.a) && !placed.some((p) => p.answer.includes(e.a) || e.a.includes(p.answer)); // CAT / CATCH olmasın
    // Yön dengesi: önce EN AZ kullanılan yönü seç, sonra o yöne sığan bir kelime ara.
    // (Önce kelime seçilirse dar ızgarada yatay sık başarısız olur ve kelimeler hep dikey kalır.)
    let stalls = 0;
    while (placed.length < count && stalls < dirs.length * 2) {
      const ds = shuffle(dirs.slice(), rand).sort((x, y) => dirCount[x] - dirCount[y]);
      let done = false;
      for (const d of ds) {
        let tried = 0;
        for (const e of ordered) {
          if (!usable(e)) continue;
          if (++tried > 140) break;
          const pos = tryPlace(grid, w, h, e.a, d, rand, 40);
          if (!pos) continue;
          used.add(e.a);
          dirCount[d]++;
          placed.push({ answer: e.a, clue: e.c, ...pos });
          done = true;
          break;
        }
        if (done) break;
      }
      stalls = done ? 0 : stalls + 1;
      if (!done) break;
    }
    if (placed.length < Math.min(count, 6)) continue;

    // Dolgu harfleri: büyük kısmı aranan kelimelerin harflerinden (göz yanılsın), kalanı İngilizce sıklığından
    const wordLetters = placed.map((p) => p.answer).join('');
    const pickFill = () =>
      rand() < (opts.lure ?? 0.5) ? wordLetters[Math.floor(rand() * wordLetters.length)] : FREQ[Math.floor(rand() * FREQ.length)];

    // Dolgu: kelimelerin kazara ikinci kez oluşmamasına dikkat et
    for (let fillTry = 0; fillTry < 12; fillTry++) {
      const g = grid.slice();
      // Tuzak parçalar: aranan kelimelerin yarım başlangıçları (GAR, GARD...) başka yerlere serpiştirilir
      const decoys = opts.decoys || 0;
      for (let d = 0; d < decoys; d++) {
        const src = placed[Math.floor(rand() * placed.length)].answer;
        const len = Math.max(2, Math.min(src.length - 1, 2 + Math.floor(rand() * (src.length - 2))));
        tryPlace(g, w, h, src.slice(0, len), dirs[Math.floor(rand() * dirs.length)], rand, 20);
      }
      for (let i = 0; i < g.length; i++) if (!g[i]) g[i] = fillTry > 8 ? FREQ[Math.floor(rand() * FREQ.length)] : pickFill();
      const rows = [];
      for (let r = 0; r < h; r++) rows.push(g.slice(r * w, r * w + w).join(''));
      if (placed.every((p) => countOccurrences(rows, w, h, p.answer) === 1)) {
        // listeyi alfabetik sırala (gazete gibi)
        placed.sort((a, b) => (a.answer < b.answer ? -1 : 1));
        return { w, h, rows, words: placed };
      }
    }
  }
  throw new Error('Kelime avı üretilemedi');
}

// Seçimden (başlangıç -> bitiş hücresi) kelime oku; 8 yönden birine oturtur
export function readSelection(rows, w, h, r0, c0, r1, c1) {
  const dr = Math.sign(r1 - r0), dc = Math.sign(c1 - c0);
  const lr = Math.abs(r1 - r0), lc = Math.abs(c1 - c0);
  if (lr && lc && lr !== lc) return null; // düz çizgi değil
  const n = Math.max(lr, lc) + 1;
  let s = '';
  const cells = [];
  for (let k = 0; k < n; k++) {
    const r = r0 + dr * k, c = c0 + dc * k;
    if (r < 0 || c < 0 || r >= h || c >= w) return null;
    s += rows[r][c];
    cells.push([r, c]);
  }
  return { text: s, cells };
}

// Parmak hareketini en yakın 8 yöne yasla
export function snapEnd(r0, c0, r, c) {
  const dr = r - r0, dc = c - c0;
  if (!dr && !dc) return [r0, c0];
  const ang = Math.atan2(dr, dc);
  const step = Math.round(ang / (Math.PI / 4));
  const a = step * (Math.PI / 4);
  const sr = Math.round(Math.sin(a)), sc = Math.round(Math.cos(a));
  const len = Math.max(Math.abs(dr), Math.abs(dc));
  return [r0 + sr * len, c0 + sc * len];
}
