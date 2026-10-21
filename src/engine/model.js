// Bulmaca için yardımcı yapı: kelimeler, hücre -> kelime eşlemesi, çözüm
import { normalizeClueSlots } from './generator';

export function buildModel(p) {
  normalizeClueSlots(p); // çift ipucunda: sağa çıkan üstte, aşağı çıkan altta (ok metnin yanında)
  const words = p.clues.map((k, i) => {
    const [dr, dc] = k.dir === 'A' ? [0, 1] : [1, 0];
    const cells = [];
    for (let j = 0; j < k.answer.length; j++) cells.push([k.sr + dr * j, k.sc + dc * j]);
    return { ...k, index: i, cells, keys: cells.map(([r, c]) => `${r},${c}`) };
  });
  const at = {}; // "r,c" -> { A: wordIndex, D: wordIndex }
  for (const w of words)
    for (const key of w.keys) {
      at[key] = at[key] || {};
      at[key][w.dir] = w.index;
    }
  const clueCells = {}; // "r,c" -> [wordIndex (slot sırası)]
  for (const w of words) {
    const key = `${w.r},${w.c}`;
    clueCells[key] = clueCells[key] || [];
    clueCells[key][w.slot] = w.index;
  }
  const solution = {};
  for (let r = 0; r < p.h; r++)
    for (let c = 0; c < p.w; c++) {
      const ch = p.rows[r][c];
      if (ch >= 'A' && ch <= 'Z') solution[`${r},${c}`] = ch;
    }
  const order = [...words]
    .sort((a, b) => (a.dir !== b.dir ? (a.dir === 'A' ? -1 : 1) : a.sr - b.sr || a.sc - b.sc))
    .map((w) => w.index);
  return { words, at, clueCells, solution, order, total: Object.keys(solution).length };
}

// Kelime durumu: tamamı girilmişse ok (yeşil) / close (sarı) / bad (kırmızı)
export function wordStatus(word, entries, solution) {
  let wrong = 0;
  for (const k of word.keys) {
    const v = entries[k];
    if (!v) return null;
    if (v !== solution[k]) wrong++;
  }
  if (!wrong) return 'ok';
  const tolerance = Math.max(1, Math.floor(word.keys.length / 3));
  return wrong <= tolerance ? 'close' : 'bad';
}
