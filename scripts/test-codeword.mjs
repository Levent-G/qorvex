// Şifreli Bulmaca tahta mantığı testi: node scripts/test-codeword.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qorvex-cw-'));
for (const f of ['generator', 'gridgames', 'codewordBoard']) {
  const src = fs.readFileSync(path.resolve(__dirname, `../src/engine/${f}.js`), 'utf8').replace(/from '\.\/(\w+)'/g, "from './$1.mjs'");
  fs.writeFileSync(path.join(tmp, `${f}.mjs`), src);
}
const imp = (f) => import(pathToFileURL(path.join(tmp, `${f}.mjs`)).href);
const { makeBlockPuzzle, makeCodeword, buildWordModel, cellsOf } = await imp('gridgames');
const cw = await imp('codewordBoard');
const WORDS = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/words.json'), 'utf8'));

let fails = 0;
const assert = (c, m) => { if (!c) { fails++; console.log('HATA:', m); } };
const entries = WORDS.filter((w) => w.l <= 1 || w.a.length === 2).map((w) => ({ a: w.a, c: w.c, bonus: 0 }));
const dict = new Map(entries.map((e) => [e.a, e]));
const p = makeCodeword(await makeBlockPuzzle({ w: 8, h: 10, entries, dict, prio: null, seed: 21, budgetMs: 500 }), 21, 2);
const model = buildWordModel(p.words.map((x) => ({ ...x, cells: cellsOf(x) })));
let s = cw.initCodeword(p, model, {});

// Kesinleşmemiş harfi olan, en az 3 harfli bir kelime seç
const w = model.words.find((x) => x.answer.length >= 3 && x.keys.some((k) => !cw.isLockedCell(p, s, k)));
const openKeys = w.keys.filter((k) => !cw.isLockedCell(p, s, k));
const wrongLetter = (k) => (model.solution[k] === 'Q' ? 'Z' : 'Q');

// 1) Yanlış kelime: hiçbir sayı kesinleşmemeli
const before = { ...s.committed };
let key = openKeys[0];
for (const k of openKeys) ({ s, key } = cw.typeLetter(p, model, s, w, k, wrongLetter(k)));
assert(JSON.stringify(s.committed) === JSON.stringify(before), 'yanlış kelime harfleri işlenmemeli');
assert(openKeys.every((k) => cw.displayLetter(p, s, k) === wrongLetter(k)), 'yanlış harfler sadece kendi karesinde görünmeli');

// 2) Silme: kesinleşmiş kareler atlanır, geçiciler silinir
for (let i = 0; i < w.keys.length + 2; i++) ({ s, key } = cw.deleteLetter(p, s, w, key));
assert(openKeys.every((k) => !s.cells[k]), 'geçici harfler silinmeli');
assert(w.keys.filter((k) => cw.isLockedCell(p, s, k)).every((k) => cw.displayLetter(p, s, k) === model.solution[k]), 'kesinleşmiş kareler silinmemeli');

// 3a) Doğru harf: kelime bitmeden de kesinleşir ve aynı sayılı tüm karelere işlenir
{
  const k0 = openKeys[0];
  const t = cw.typeLetter(p, model, s, w, k0, model.solution[k0]).s;
  const n0 = p.code[model.solution[k0]];
  assert(t.committed[n0] === model.solution[k0], 'doğru harf hemen kesinleşmeli');
  assert(Object.keys(model.solution).filter((k) => p.code[model.solution[k]] === n0).every((k) => cw.displayLetter(p, t, k) === model.solution[k]), 'doğru harf aynı sayılı her kareye gitmeli');
}

// 3) Doğru kelime: harfler kesinleşir ve aynı sayılı tüm karelere işlenir
for (const k of openKeys) ({ s } = cw.typeLetter(p, model, s, w, k, model.solution[k]));
for (const k of w.keys) assert(cw.isLockedCell(p, s, k), 'doğru kelimenin harfleri kesinleşmeli');
const someNum = p.code[model.solution[openKeys[0]]];
const sameCells = Object.keys(model.solution).filter((k) => p.code[model.solution[k]] === someNum);
assert(sameCells.every((k) => cw.displayLetter(p, s, k) === model.solution[k]), 'doğru harf aynı sayılı her kareye işlenmeli');

// 4) Kesinleşmiş harf silinemez
let s2 = cw.deleteLetter(p, s, w, w.keys[w.keys.length - 1]).s;
assert(w.keys.every((k) => cw.displayLetter(p, s2, k) === model.solution[k]), 'kesinleşmiş kelime silinememeli');

// 5) Tüm kelimeleri doğru yazınca bulmaca çözülür
for (const x of model.words) for (const k of x.keys) if (!cw.isLockedCell(p, s, k)) ({ s } = cw.typeLetter(p, model, s, x, k, model.solution[k]));
assert(cw.isSolved(p, s), 'bulmaca çözülmeli');
// 5b) Kelime bitmeden doğru yazılan harf silinmez, üzerine yazılmaz
{
  let q = cw.initCodeword(p, model, {});
  const wq = model.words.find((x) => x.keys.filter((k) => !cw.isLockedCell(p, q, k)).length >= 2);
  const [k1, k2] = wq.keys.filter((k) => !cw.isLockedCell(p, q, k));
  ({ s: q } = cw.typeLetter(p, model, q, wq, k1, model.solution[k1]));
  if (!cw.isLockedCell(p, q, k1)) {
    const d = cw.deleteLetter(p, q, wq, k1).s;
    assert(cw.displayLetter(p, d, k1) === model.solution[k1], 'doğru harf silinmemeli');
    const o = cw.typeLetter(p, model, q, wq, k1, model.solution[k1] === 'Q' ? 'Z' : 'Q');
    assert(cw.displayLetter(p, o.s, k1) === model.solution[k1] && o.key !== k1, 'doğru harfin üzerine yazılmamalı');
    // yanlış harf hâlâ silinebilir
    const bad = cw.typeLetter(p, model, q, wq, k2, model.solution[k2] === 'Q' ? 'Z' : 'Q').s;
    if (!cw.isLockedCell(p, bad, k2)) assert(!cw.deleteLetter(p, bad, wq, k2).s.cells[k2], 'yanlış harf silinebilmeli');
  }
}
// 6) Gizli cümle çözülünce bulmacanın tamamı çözülür
{
  // cümle: ızgarada geçen ilk 4 harften (verilmemiş olanlar)
  const lettersIn = [...new Set(Object.values(model.solution))].filter((ch) => !p.given.includes(ch)).slice(0, 4);
  const hp = { ...p, hidden: { text: lettersIn.slice(0, 2).join('') + ', ' + lettersIn.slice(2).join('') + '!', tr: 'deneme' } };
  let hs = cw.initCodeword(hp, model, {});
  const need = lettersIn;
  if (need.length === 4) {
    assert(!cw.hiddenSolved(hp, hs, {}), 'cümle harfleri bilinmeden çözülmüş sayılmamalı');
    const typed = Object.fromEntries(need.map((ch) => [hp.code[ch], ch]));
    assert(cw.hiddenSolved(hp, hs, typed), 'cümlenin harfleri doğru yazılınca gizli cümle çözülmüş olmalı');
    hs = cw.solveAll(hp, model, hs);
    assert(cw.isSolved(hp, hs), 'gizli cümle çözülünce bulmacanın tamamı çözülmeli');
    assert(Object.keys(model.solution).every((k) => cw.displayLetter(hp, hs, k) === model.solution[k]), 'ızgaradaki her kare doğru harfle dolmalı');
    console.log('Gizli cümle testi: ' + hp.hidden.text + ' → bulmaca çözüldü=' + cw.isSolved(hp, hs));
  } else assert(false, 'test için yeterli harf yok');
}
console.log(`Şifreli bulmaca: ${model.words.length} kelime, ${p.given.length} harf verildi, çözüldü=${cw.isSolved(p, s)}`);
console.log(fails ? `${fails} hata` : 'Tüm şifreli bulmaca testleri geçti');
process.exit(fails ? 1 : 0);
