// Yeni oyunların üretici testi: node scripts/test-newgames.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qorvex-new-'));
for (const f of ['generator', 'gridgames', 'wordgames', 'model', 'board']) {
  const src = fs.readFileSync(path.resolve(__dirname, `../src/engine/${f}.js`), 'utf8').replace(/from '\.\/(\w+)'/g, "from './$1.mjs'");
  fs.writeFileSync(path.join(tmp, `${f}.mjs`), src);
}
const imp = (f) => import(pathToFileURL(path.join(tmp, `${f}.mjs`)).href);
const { generateSpiral, generateJumble, generateCryptogram } = await imp('wordgames');
const { makeBlockPuzzle, makeCodeword, buildWordModel, cellsOf, cellKey } = await imp('gridgames');
const { reducer, selectWordState } = await imp('board');
const { wordStatus } = await imp('model');
const WORDS = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/words.json'), 'utf8'));

let fails = 0;
const assert = (c, m) => { if (!c) { fails++; if (fails < 25) console.log('HATA:', m); } };
const pool = (maxL) => WORDS.filter((w) => w.l <= maxL || w.a.length === 2).map((w) => ({ a: w.a, c: w.c, bonus: w.l === maxL ? 3 : 0 }));

// ---- Sarmal ----
for (const [name, n, maxL] of [['A1', 5, 0], ['A2', 6, 1], ['B1', 6, 2], ['C1', 7, 4]]) {
  let ms = 0, ex = '';
  for (let i = 0; i < 10; i++) {
    const t0 = Date.now();
    const p = generateSpiral({ n, minLen: 3, maxLen: 7, entries: pool(maxL), seed: 100 + i });
    ms += Date.now() - t0;
    const filled = new Set();
    p.words.forEach((w, j) => {
      w.cells.forEach(([r, c]) => filled.add(cellKey(r, c)));
      if (j > 0) assert(w.answer[0] === p.words[j - 1].answer.at(-1), `sarmal ${name} zincir kopuk`);
      assert(w.cells.length === w.answer.length, `sarmal ${name} hücre sayısı`);
    });
    assert(filled.size === n * n, `sarmal ${name} tam dolmadı (${filled.size}/${n * n})`);
    const last = p.words.at(-1);
    assert(last.start + last.answer.length === n * n, `sarmal ${name} yol sonu`);
    if (!ex) ex = p.words.map((w) => w.answer).join(' → ');
  }
  console.log(`Sarmal ${name} ${n}×${n}: ${Math.round(ms / 10)} ms · ${ex}`);
}

// ---- Jumble ----
for (const [name, cfg, maxL] of [
  ['A1', { count: 4, minLen: 4, maxLen: 5, bonusLen: 4 }, 0],
  ['B1', { count: 5, minLen: 5, maxLen: 6, bonusLen: 6 }, 2],
  ['C2', { count: 5, minLen: 6, maxLen: 7, bonusLen: 7 }, 5],
]) {
  let ms = 0, ex = '';
  for (let i = 0; i < 10; i++) {
    const t0 = Date.now();
    const p = generateJumble({ ...cfg, entries: pool(maxL), seed: 300 + i });
    ms += Date.now() - t0;
    assert(p.words.length === cfg.count, `jumble ${name} kelime sayısı`);
    const circled = p.words.flatMap((w) => w.circles.map((c) => w.answer[c])).sort().join('');
    assert(circled === p.bonus.answer.split('').sort().join(''), `jumble ${name} daireli harfler bonusu oluşturmuyor`);
    for (const w of p.words) {
      assert(w.scrambled !== w.answer && w.scrambled.split('').sort().join('') === w.answer.split('').sort().join(''), `jumble ${name} karışım`);
    }
    if (!ex) ex = p.words.map((w) => `${w.scrambled}→${w.answer}`).join(', ') + ` | bonus ${p.bonus.answer}`;
  }
  console.log(`Jumble ${name}: ${Math.round(ms / 10)} ms · ${ex}`);
}

// ---- Cryptogram ----
for (const [name, cfg, maxL] of [['A1', { minChars: 15, maxChars: 30, given: 3 }, 0], ['C1', { minChars: 30, maxChars: 60, given: 1 }, 4]]) {
  const allowed = new Set(WORDS.filter((w) => w.l <= maxL).map((w) => w.a));
  const p = generateCryptogram({ ...cfg, words: WORDS, allowed, seed: 9 });
  const letters = p.text.replace(/[^A-Z]/g, '');
  assert(letters.length >= cfg.minChars && letters.length <= cfg.maxChars, `crypto ${name} uzunluk`);
  assert(Object.entries(p.cipher).every(([a, b]) => a !== b), `crypto ${name} kendine eşleme`);
  assert(new Set(Object.values(p.cipher)).size === 26, `crypto ${name} şifre birebir değil`);
  const enc = p.text.replace(/[A-Z]/g, (ch) => p.cipher[ch]);
  console.log(`Cryptogram ${name}: "${enc}" ← "${p.text}" · ipucu: ${p.tr}`);
}

// ---- Kare bulmaca / Şifreli ızgarası ----
{
  const entries = pool(1);
  const dict = new Map(entries.map((e) => [e.a, e]));
  const g = await makeBlockPuzzle({ w: 8, h: 10, entries, dict, prio: null, seed: 5, budgetMs: 500 });
  const model = buildWordModel(g.words.map((x) => ({ ...x, cells: cellsOf(x) })));
  // her kelime ızgaradaki harflerle uyuşmalı, numaralar 1'den başlayıp sıralı olmalı
  for (const w of model.words) assert(w.cells.every(([r, c], j) => g.rows[r][c] === w.answer[j]), `ızgara ${w.answer} uyuşmuyor`);
  const nums = [...new Set(g.words.map((x) => x.num))].sort((a, b) => a - b);
  assert(nums[0] === 1 && nums.every((n, i) => n === i + 1), 'numaralar sıralı değil');
  // tahta reducer ile çözülebilmeli
  let s = selectWordState({ model, entries: {}, revealed: {}, solved: false, active: model.order[0], sel: null }, model.order[0]);
  for (const idx of model.order) {
    s = reducer(s, { type: 'selectWord', idx });
    let guard = 0;
    while (model.words[idx].keys.some((k) => !s.entries[k]) && guard++ < 30) s = reducer(s, { type: 'type', ch: model.solution[`${s.sel.r},${s.sel.c}`] });
  }
  assert(s.solved, 'kare bulmaca reducer ile çözülemedi');
  const cw = makeCodeword(g, 5, 3);
  assert(new Set(Object.values(cw.code)).size === 26 && cw.given.length === 3, 'şifreli bulmaca eşlemesi');
  console.log(`Kare bulmaca: ${g.words.length} kelime, ${nums.length} numara · Şifreli: verilen harfler ${cw.given.join(',')}`);
  console.log(g.rows.map((r) => r.split('').join(' ')).join('\n'));
}

// ---- Sarmal tahta (board reducer ile ortak hücreler) ----
{
  const p = generateSpiral({ n: 5, entries: pool(0), seed: 11 });
  const model = buildWordModel(p.words, p.words.map((_, i) => i));
  let s = selectWordState({ model, entries: {}, revealed: {}, solved: false, active: 0, sel: null }, 0);
  for (let i = 0; i < p.words.length; i++) {
    s = reducer(s, { type: 'selectWord', idx: i });
    let guard = 0;
    while (model.words[i].keys.some((k) => !s.entries[k]) && guard++ < 30) s = reducer(s, { type: 'type', ch: model.solution[`${s.sel.r},${s.sel.c}`] });
  }
  assert(s.solved && model.words.every((w) => wordStatus(w, s.entries, model.solution) === 'ok'), 'sarmal reducer ile çözülemedi');
  console.log(`Sarmal tahta çözüldü: ${p.words.map((w) => w.answer).join(' → ')}`);
}

console.log(fails ? `${fails} hata` : 'Tüm yeni oyun testleri geçti');
process.exit(fails ? 1 : 0);
