// Kelime Merdiveni üretici testi: node scripts/test-ladder.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qorvex-ladder-'));
for (const f of ['generator', 'ladder']) {
  let src = fs.readFileSync(path.resolve(__dirname, `../src/engine/${f}.js`), 'utf8');
  src = src.replace(/from '\.\/(\w+)'/g, "from './$1.mjs'");
  fs.writeFileSync(path.join(tmp, `${f}.mjs`), src);
}
const { generateLadder, shortestDistance } = await import(pathToFileURL(path.join(tmp, 'ladder.mjs')).href);
const words = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/words.json'), 'utf8'));

// Uygulamadaki seviye ayarlarıyla aynı
const LEVELS = {
  A1: { idx: 0, lens: [3], steps: 4 },
  A2: { idx: 1, lens: [3, 4], steps: 4 },
  B1: { idx: 2, lens: [4], steps: 5 },
  B2: { idx: 3, lens: [4], steps: 5 },
  C1: { idx: 4, lens: [4, 5], steps: 5 },
  C2: { idx: 5, lens: [4, 5], steps: 6 },
};
let fails = 0;
const assert = (c, m) => { if (!c) { fails++; if (fails < 20) console.log('HATA:', m); } };

for (const [id, cfg] of Object.entries(LEVELS)) {
  const entries = words.filter((w) => w.l <= cfg.idx).map((w) => ({ a: w.a, c: w.c, bonus: w.l === cfg.idx ? 3 : 0 }));
  const set = new Set(entries.map((e) => e.a));
  let ms = 0, stepsSum = 0, example = '';
  const N = 15;
  for (let i = 0; i < N; i++) {
    const t0 = Date.now();
    const p = generateLadder({ ...cfg, entries, prio: null, seed: 500 + i });
    ms += Date.now() - t0;
    stepsSum += p.steps;
    const a = p.rungs.map((r) => r.answer);
    if (!example) example = a.join(' > ');
    assert(p.steps >= cfg.steps - 1, `${id} adım sayısı ${p.steps}`);
    assert(a.every((x) => set.has(x) && x.length === p.len), `${id} havuz dışı/uzunluk`);
    assert(new Set(a).size === a.length, `${id} tekrar eden kelime`);
    for (let k = 1; k < a.length; k++) {
      let diff = 0;
      for (let j = 0; j < p.len; j++) if (a[k][j] !== a[k - 1][j]) diff++;
      assert(diff === 1, `${id} ${a[k - 1]}>${a[k]} tek harf değil`);
      assert(p.rungs[k].change >= 0 && a[k][p.rungs[k].change] !== a[k - 1][p.rungs[k].change], `${id} change indeksi`);
    }
    const sameLen = entries.filter((e) => e.a.length === p.len).map((e) => e.a);
    assert(shortestDistance(sameLen, a[0], a[a.length - 1]) === p.steps, `${id} kestirme yol var`);
    assert(p.rungs.every((r) => r.clue), `${id} ipucu eksik`);
  }
  console.log(`${id}: ort. ${(stepsSum / N).toFixed(1)} adım, ${Math.round(ms / N)} ms · örnek: ${example}`);
}

// Öncelikli kelime yerleşiyor mu?
{
  const entries = words.filter((w) => w.l <= 2).map((w) => ({ a: w.a, c: w.c, bonus: 0 }));
  let hit = 0;
  for (let i = 0; i < 10; i++) {
    const p = generateLadder({ lens: [4], steps: 5, entries, prio: new Set(['BOOK']), seed: 900 + i });
    if (p.rungs.some((r) => r.answer === 'BOOK')) hit++;
  }
  console.log(`Öncelikli kelime (BOOK) isabeti: ${hit}/10`);
  assert(hit >= 7, 'öncelikli kelime yeterince gelmiyor');
}

console.log(fails ? `${fails} hata` : 'Tüm Kelime Merdiveni testleri geçti');
process.exit(fails ? 1 : 0);
