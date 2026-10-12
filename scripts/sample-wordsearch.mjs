// Örnek Kelime Avı ızgarası yazdırır: node scripts/sample-wordsearch.mjs [seviye]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qorvex-wss-'));
for (const f of ['generator', 'wordsearch']) {
  const src = fs.readFileSync(path.resolve(__dirname, `../src/engine/${f}.js`), 'utf8').replace(/from '\.\/(\w+)'/g, "from './$1.mjs'");
  fs.writeFileSync(path.join(tmp, `${f}.mjs`), src);
}
const { generateWordSearch } = await import(pathToFileURL(path.join(tmp, 'wordsearch.mjs')).href);
const words = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/words.json'), 'utf8'));
const entries = words.filter((w) => w.l <= 2).map((w) => ({ a: w.a, c: w.c, bonus: 0 }));
const p = generateWordSearch({ w: 10, h: 12, count: 12, dirs: ['E', 'S', 'SE', 'NE', 'W', 'N'], decoys: 5, lure: 0.55, entries, seed: 77 });
console.log(p.rows.map((r) => r.split('').join(' ')).join('\n'));
console.log('Kelimeler: ' + p.words.map((x) => `${x.answer}(${x.dir})`).join(', '));
// Tuzak ölçümü: kelimelerin ilk 3 harfi ızgarada (yatay, iki yönde) kaç kez geçiyor
const lines = [...p.rows, ...p.rows.map((r) => [...r].reverse().join(''))].join('|');
let hits = 0;
for (const x of p.words) hits += lines.split(x.answer.slice(0, 3)).length - 1;
console.log(`Kelime başlangıçları yalnızca yatay satırlarda ${hits} kez geçiyor (${p.words.length} kelime)`);
