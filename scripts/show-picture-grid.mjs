// Resimli çengel örneği: ortada fotoğraf alanı (@) + resimdeki kelime öncelikli. node scripts/show-picture-grid.mjs [seviyeIdx]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qorvex-pg-'));
for (const f of ['generator', 'picture']) {
  fs.writeFileSync(path.join(tmp, `${f}.mjs`), fs.readFileSync(path.resolve(__dirname, `../src/engine/${f}.js`), 'utf8').replace(/from '\.\/(\w+)'/g, "from './$1.mjs'"));
}
const { generatePuzzle } = await import(pathToFileURL(path.join(tmp, 'generator.mjs')).href);
const { photoBlock } = await import(pathToFileURL(path.join(tmp, 'picture.mjs')).href);
const WORDS = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/words.json'), 'utf8'));
const lvl = Number(process.argv[2] || 0);
const W = lvl >= 2 ? 9 : 8, H = lvl >= 2 ? 11 : 10;
const entries = WORDS.filter((w) => w.l <= lvl || w.a.length === 2).map((w) => ({ a: w.a, c: w.c, bonus: w.l === lvl ? 3 : 0 }));
const dict = new Map(entries.map((e) => [e.a, e]));
const nouns = WORDS.filter((w) => w.p === 'noun' && w.l <= lvl && w.a.length >= 4 && w.a.length <= 6).map((w) => w.a);
let placed = 0, blanks = 0;
const N = 8;
for (let seed = 1; seed <= N; seed++) {
  const target = nouns[(seed * 37) % nouns.length];
  const p = await generatePuzzle({ w: W, h: H, entries, dict, prio: new Set([target]), seed, budgetMs: 1600, restarts: 4, blocks: [photoBlock(W, H)] });
  const ok = p.clues.some((k) => k.answer === target);
  if (ok) placed++;
  blanks += p.stats.blanks;
  if (seed <= 2) {
    console.log(p.rows.map((r) => r.split('').join(' ')).join('\n'));
    console.log('resimdeki kelime:', target, ok ? 'yerleşti' : 'YERLEŞMEDİ', '· boş:', p.stats.blanks, '\n');
  }
}
console.log(`${placed}/${N} bulmacada resimdeki kelime yerleşti · ortalama boş %${((blanks / N / (W * H)) * 100).toFixed(1)}`);
