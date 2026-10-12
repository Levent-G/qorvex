// Şifreli Bulmaca gizli cümle testi: node scripts/test-hidden.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qorvex-hid-'));
for (const f of ['generator', 'gridgames']) {
  const src = fs.readFileSync(path.resolve(__dirname, `../src/engine/${f}.js`), 'utf8').replace(/from '\.\/(\w+)'/g, "from './$1.mjs'");
  fs.writeFileSync(path.join(tmp, `${f}.mjs`), src);
}
const { makeBlockPuzzle, makeCodeword, pickHiddenSentence } = await import(pathToFileURL(path.join(tmp, 'gridgames.mjs')).href);
const WORDS = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/words.json'), 'utf8'));

let fails = 0, strictMiss = 0, total = 0;
for (const [lvl, w, h] of [[0, 7, 9], [1, 8, 10], [3, 9, 11]]) {
  const entries = WORDS.filter((x) => x.l <= lvl || x.a.length === 2).map((x) => ({ a: x.a, c: x.c, bonus: 0 }));
  const dict = new Map(entries.map((e) => [e.a, e]));
  for (let seed = 1; seed <= 8; seed++) {
    total++;
    const p = makeCodeword(await makeBlockPuzzle({ w, h, entries, dict, prio: null, seed, budgetMs: 300 }), seed, 2);
    const hd = pickHiddenSentence(p, WORDS, dict, seed);
    if (!hd) { fails++; console.log('HATA: cümle yok', lvl, seed); continue; }
    if (!dict.has(hd.word)) strictMiss++;
    const have = new Set(p.rows.join('').replace(/#/g, ''));
    for (const ch of hd.text.toUpperCase().replace(/[^A-Z]/g, '')) if (!have.has(ch)) { fails++; console.log('HATA: ızgarada olmayan harf', ch, hd.text); }
    if (seed <= 2) console.log(`seviye ${lvl}: ${hd.text}  |  ${hd.tr}`);
  }
}
console.log(`${total} bulmaca, seviye dışı cümle: ${strictMiss}`);
if (fails) { console.log(fails + ' hata'); process.exit(1); }
console.log('Tüm gizli cümle testleri geçti');
