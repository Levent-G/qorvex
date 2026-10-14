// Örnek çengel ızgarası yazdırır: node scripts/show-grid.mjs [seviyeIdx] [seed]
// L = harf, # = ipucu karesi, . = boş (gri) kare
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qorvex-show-'));
fs.writeFileSync(path.join(tmp, 'generator.mjs'), fs.readFileSync(path.resolve(__dirname, '../src/engine/generator.js'), 'utf8'));
const { generatePuzzle } = await import(pathToFileURL(path.join(tmp, 'generator.mjs')).href);
const WORDS = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/words.json'), 'utf8'));
const lvl = Number(process.argv[2] || 0);
const seed = Number(process.argv[3] || 5);
const W = lvl >= 2 ? 9 : 8, H = lvl >= 2 ? 11 : 10;
const entries = WORDS.filter((w) => w.l <= lvl || w.a.length === 2).map((w) => ({ a: w.a, c: w.c, bonus: w.l === lvl ? 3 : 0 }));
const dict = new Map(entries.map((e) => [e.a, e]));
const p = await generatePuzzle({ w: W, h: H, entries, dict, prio: null, seed, budgetMs: 1200 });
console.log(p.rows.map((r) => r.split('').join(' ')).join('\n'));
console.log('boş:', p.stats.blanks, '/', W * H, ' kelime:', p.clues.length, ' az kesişme puanı:', p.stats.lowCross);
