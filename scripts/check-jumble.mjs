// Karışık Harfler geniş kontrol: tüm seviyeler × 200 bulmaca
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qorvex-jc-'));
for (const f of ['generator', 'wordgames']) {
  const src = fs.readFileSync(path.resolve(__dirname, `../src/engine/${f}.js`), 'utf8').replace(/from '\.\/(\w+)'/g, "from './$1.mjs'");
  fs.writeFileSync(path.join(tmp, `${f}.mjs`), src);
}
const { generateJumble } = await import(pathToFileURL(path.join(tmp, 'wordgames.mjs')).href);
const WORDS = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/words.json'), 'utf8'));
const LEVELS = {
  A1: [0, { count: 4, minLen: 4, maxLen: 5, bonusLen: 4 }],
  A2: [1, { count: 4, minLen: 4, maxLen: 5, bonusLen: 5 }],
  B1: [2, { count: 5, minLen: 5, maxLen: 6, bonusLen: 6 }],
  B2: [3, { count: 5, minLen: 5, maxLen: 6, bonusLen: 6 }],
  C1: [4, { count: 5, minLen: 5, maxLen: 7, bonusLen: 7 }],
  C2: [5, { count: 5, minLen: 6, maxLen: 7, bonusLen: 7 }],
  MIX: [5, { count: 5, minLen: 5, maxLen: 7, bonusLen: 6 }],
};
const sorted = (s) => s.split('').sort().join('');
let bad = 0, maxLen = 0;
for (const [id, [lvl, cfg]] of Object.entries(LEVELS)) {
  const entries = WORDS.filter((w) => w.l <= lvl || w.a.length === 2).map((w) => ({ a: w.a, c: w.c, bonus: 0 }));
  for (let i = 0; i < 200; i++) {
    const p = generateJumble({ ...cfg, entries, seed: 1000 + i });
    for (const w of p.words) {
      maxLen = Math.max(maxLen, w.answer.length);
      if (sorted(w.scrambled) !== sorted(w.answer)) { bad++; console.log(id, 'karışım eksik/fazla:', w.answer, w.scrambled); }
      if (w.circles.some((c) => c < 0 || c >= w.answer.length)) { bad++; console.log(id, 'daire konumu hatalı', w); }
    }
    const circled = p.words.flatMap((w) => w.circles.map((c) => w.answer[c])).join('');
    if (sorted(circled) !== sorted(p.bonus.answer)) { bad++; console.log(id, 'bonus harfleri uyuşmuyor', p.bonus.answer, circled); }
  }
}
console.log(`Kontrol bitti: ${bad} sorun · en uzun kelime ${maxLen} harf`);
