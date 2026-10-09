// Tahta mantığı + öncelikli kelime testi: node scripts/test-board.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cengel-'));
for (const f of ['generator', 'model', 'board']) {
  let src = fs.readFileSync(path.resolve(__dirname, `../src/engine/${f}.js`), 'utf8');
  src = src.replace(/from '\.\/(\w+)'/g, "from './$1.mjs'");
  fs.writeFileSync(path.join(tmp, `${f}.mjs`), src);
}
const imp = (f) => import(pathToFileURL(path.join(tmp, `${f}.mjs`)).href);
const { generatePuzzle } = await imp('generator');
const { buildModel, wordStatus } = await imp('model');
const { reducer, selectWordState } = await imp('board');
const words = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/words.json'), 'utf8'));

let fails = 0;
const assert = (cond, msg) => {
  if (!cond) {
    fails++;
    console.log('HATA:', msg);
  }
};

// 1) Öncelikli kelimeler (A2 kümülatif havuz)
const pool = words.filter((w) => w.l <= 1 || w.a.length === 2).map((w) => ({ a: w.a, c: w.c, bonus: w.l === 1 ? 3 : 0 }));
const dict = new Map(pool.map((e) => [e.a, e]));
const prioWords = ['FAMILY', 'GARDEN', 'ORANGE', 'TICKET'].filter((a) => dict.has(a));
let hit = 0;
for (let i = 0; i < 5; i++) {
  const p = await generatePuzzle({ w: 8, h: 10, entries: pool, dict, prio: new Set(prioWords), seed: 100 + i, budgetMs: 600 });
  const got = prioWords.filter((a) => p.clues.some((k) => k.answer === a));
  hit += got.length;
}
console.log(`Öncelikli kelime isabeti: ${hit}/${prioWords.length * 5}`);
assert(hit >= prioWords.length * 5 * 0.5, 'öncelikli kelimeler yeterince yerleşmiyor');

// 2) Tahta: tüm kelimeleri yazarak çöz
const p = await generatePuzzle({ w: 8, h: 10, entries: pool, dict, seed: 7, budgetMs: 600 });
const model = buildModel(p);
let s = selectWordState({ model, entries: {}, revealed: {}, solved: false, active: model.order[0], sel: null }, model.order[0]);
const run = (a) => (s = reducer(s, a));

// Yanlış kelime -> kırmızı, yakın -> sarı
const w0 = model.words[model.order[0]];
run({ type: 'selectWord', idx: w0.index });
for (let i = 0; i < w0.answer.length; i++) run({ type: 'type', ch: 'Q' });
assert(wordStatus(w0, s.entries, model.solution) === 'bad', 'yanlış kelime kırmızı olmalı');
// Silme: basılı tutma simülasyonu (kelime uzunluğu kadar)
for (let i = 0; i < w0.answer.length + 2; i++) run({ type: 'del' });
assert(w0.keys.every((k) => !s.entries[k]), 'seri silme kelimeyi temizlemeli');
// Yakın: tek harf hatalı
run({ type: 'selectWord', idx: w0.index });
for (let i = 0; i < w0.answer.length; i++) run({ type: 'type', ch: i === 0 ? (w0.answer[0] === 'Z' ? 'Y' : 'Z') : w0.answer[i] });
assert(wordStatus(w0, s.entries, model.solution) === 'close', 'tek harf hatalı kelime sarı olmalı');
run({ type: 'clearWord' });

// Doğru yazarak tüm bulmacayı çöz
for (const idx of model.order) {
  const w = model.words[idx];
  run({ type: 'selectWord', idx });
  // seçimden itibaren sadece boş karelere yazılır; imleç otomatik ilerler
  let guard = 0;
  while (w.keys.some((k) => !s.entries[k]) && guard++ < 50) {
    const key = `${s.sel.r},${s.sel.c}`;
    run({ type: 'type', ch: model.solution[key] });
  }
}
assert(s.solved, 'bulmaca çözülmüş olmalı');
assert(model.words.every((w) => wordStatus(w, s.entries, model.solution) === 'ok'), 'tüm kelimeler yeşil olmalı');
console.log(`Tahta testi: ${model.words.length} kelime, çözüldü=${s.solved}`);

// Okla gezinme: yeşil kelimeler atlanmalı
{
  let t = selectWordState({ model, entries: {}, revealed: {}, solved: false, active: model.order[0], sel: null }, model.order[0]);
  const second = model.words[model.order[1]];
  for (const k of second.keys) t.entries = { ...t.entries, [k]: model.solution[k] };
  t = reducer(t, { type: 'step', delta: 1 });
  assert(t.active !== second.index, 'ileri ok yeşil kelimeyi atlamalı');
  t = reducer(t, { type: 'step', delta: -1 });
  assert(t.active === model.order[0] || wordStatus(model.words[t.active], t.entries, model.solution) !== 'ok', 'geri ok yeşil kelimeye gitmemeli');
  console.log('Okla gezinme testi tamam');
}

// Doğru kelime bitince sıradakine geçiş (diğerleri dolu ama yanlışken bile)
{
  const first = model.words[model.order[0]];
  const ents = {};
  for (const w of model.words) for (const k of w.keys) ents[k] = 'Q'; // her şey dolu ve yanlış
  for (const k of first.keys) ents[k] = model.solution[k];
  const lastKey = first.keys[first.keys.length - 1];
  ents[lastKey] = undefined; // son harf eksik
  let t = selectWordState({ model, entries: ents, revealed: {}, solved: false, active: first.index, sel: null }, first.index);
  t = reducer(t, { type: 'type', ch: model.solution[lastKey] });
  assert(wordStatus(first, t.entries, model.solution) === 'ok', 'kelime doğru olmalı');
  assert(t.active !== first.index, 'doğru kelimeden sonra sıradaki kelimeye geçmeli');
  console.log('Otomatik geçiş testi tamam');
}

console.log(fails ? `${fails} hata` : 'Tüm testler geçti');
process.exit(fails ? 1 : 0);
