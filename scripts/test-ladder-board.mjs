// Kelime Merdiveni tahta mantığı testi: node scripts/test-ladder-board.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qorvex-lb-'));
for (const f of ['generator', 'ladder', 'ladderBoard']) {
  let src = fs.readFileSync(path.resolve(__dirname, `../src/engine/${f}.js`), 'utf8');
  src = src.replace(/from '\.\/(\w+)'/g, "from './$1.mjs'");
  fs.writeFileSync(path.join(tmp, `${f}.mjs`), src);
}
const imp = (f) => import(pathToFileURL(path.join(tmp, `${f}.mjs`)).href);
const { generateLadder } = await imp('ladder');
const { reducer, initState, rowStatus, fillableRows, key } = await imp('ladderBoard');
const words = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/words.json'), 'utf8'));

let fails = 0;
const assert = (c, m) => { if (!c) { fails++; console.log('HATA:', m); } };
const entries = words.filter((w) => w.l <= 2).map((w) => ({ a: w.a, c: w.c, bonus: 0 }));
const p = generateLadder({ lens: [4], steps: 5, entries, prio: null, seed: 42 });
let s = initState(p);
const run = (a) => (s = reducer(s, a));
const rows = fillableRows(p);
assert(s.sel.row === rows[0] && s.sel.col === 0, 'başlangıç seçimi');

// Yanlış kelime -> kırmızı, sonra seri silme
const r1 = rows[0];
for (let i = 0; i < p.len; i++) run({ type: 'type', ch: 'Q' });
assert(rowStatus(p, s.entries, r1) === 'bad', 'yanlış basamak kırmızı olmalı');
for (let i = 0; i < p.len + 2; i++) run({ type: 'del' });
assert(Array.from({ length: p.len }, (_, c) => !s.entries[key(r1, c)]).every(Boolean), 'seri silme temizlemeli');

// Tek harf hatalı -> sarı
run({ type: 'selectRow', row: r1 });
const ans = p.rungs[r1].answer;
for (let i = 0; i < p.len; i++) run({ type: 'type', ch: i === 0 ? (ans[0] === 'Z' ? 'Y' : 'Z') : ans[i] });
assert(rowStatus(p, s.entries, r1) === 'close', 'tek harf hatalı basamak sarı olmalı');
run({ type: 'clearRow' });

// Doğru yazınca otomatik sonraki basamağa geçip bulmaca çözülmeli
for (const r of rows) {
  run({ type: 'selectRow', row: r });
  let guard = 0;
  while (Array.from({ length: p.len }, (_, c) => !s.entries[key(r, c)]).some(Boolean) && guard++ < 20) {
    run({ type: 'type', ch: p.rungs[r].answer[s.sel.col] });
  }
  if (r !== rows[rows.length - 1]) assert(s.sel.row !== r, `doğru basamaktan sonra geçiş (${r})`);
}
assert(s.solved, 'merdiven çözülmüş olmalı');
console.log(`Merdiven: ${p.rungs.map((x) => x.answer).join(' > ')}, çözüldü=${s.solved}`);

// İpuçlu seviye: değişmeyen harfler otomatik dolu ve kilitli, her basamağa tek harf yazılır
{
  const a1 = words.filter((w) => w.l === 0).map((w) => ({ a: w.a, c: w.c, bonus: 0 }));
  const hp = { ...generateLadder({ lens: [3], steps: 4, entries: a1, prio: null, seed: 7 }), hint: true };
  let t = initState(hp);
  const hrows = fillableRows(hp);
  for (const r of hrows) {
    const filled = Array.from({ length: hp.len }, (_, c) => t.entries[key(r, c)]).filter(Boolean).length;
    assert(filled === hp.len - 1, `ipuçlu basamak ${r}: ${filled} harf otomatik dolmalı`);
  }
  assert(t.sel.col === hp.rungs[hrows[0]].change, 'seçim değişecek harfte başlamalı');
  // kilitli kareye dokununca değişecek kareye gider
  const lockedCol = hp.rungs[hrows[0]].change === 0 ? 1 : 0;
  t = reducer(t, { type: 'tap', row: hrows[0], col: lockedCol });
  assert(t.sel.col === hp.rungs[hrows[0]].change, 'kilitli kareye dokunma değişecek kareye gitmeli');
  // silme tuşu kilitli harfi silmez
  t = reducer(t, { type: 'del' });
  t = reducer(t, { type: 'del' });
  assert(t.entries[key(hrows[0], lockedCol)] === hp.rungs[hrows[0]].answer[lockedCol], 'kilitli harf silinmemeli');
  // her basamağa tek harf yazarak çöz
  for (const r of hrows) {
    t = reducer(t, { type: 'selectRow', row: r });
    t = reducer(t, { type: 'type', ch: hp.rungs[r].answer[hp.rungs[r].change] });
  }
  assert(t.solved, 'ipuçlu merdiven tek harflerle çözülmeli');
  console.log(`İpuçlu merdiven: ${hp.rungs.map((x) => x.answer).join(' > ')}, ${hrows.length} harf yazılarak çözüldü`);
}

console.log(fails ? `${fails} hata` : 'Tüm merdiven tahta testleri geçti');
process.exit(fails ? 1 : 0);
