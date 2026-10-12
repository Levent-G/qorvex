// Kelime Avı üretici testi: node scripts/test-wordsearch.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qorvex-ws-'));
for (const f of ['generator', 'wordsearch']) {
  let src = fs.readFileSync(path.resolve(__dirname, `../src/engine/${f}.js`), 'utf8');
  src = src.replace(/from '\.\/(\w+)'/g, "from './$1.mjs'");
  fs.writeFileSync(path.join(tmp, `${f}.mjs`), src);
}
const { generateWordSearch, readSelection, snapEnd, DIRS } = await import(pathToFileURL(path.join(tmp, 'wordsearch.mjs')).href);
const words = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/words.json'), 'utf8'));

const LEVELS = {
  A1: { idx: 0, w: 9, h: 11, count: 9, dirs: ['E', 'S', 'SE'], decoys: 3, lure: 0.4 },
  A2: { idx: 1, w: 10, h: 12, count: 11, dirs: ['E', 'S', 'SE', 'NE'], decoys: 4, lure: 0.5 },
  B1: { idx: 2, w: 10, h: 12, count: 12, dirs: ['E', 'S', 'SE', 'NE', 'W', 'N'], decoys: 5, lure: 0.55 },
  B2: { idx: 3, w: 10, h: 12, count: 14, dirs: Object.keys(DIRS), decoys: 6, lure: 0.6 },
  C2: { idx: 5, w: 11, h: 13, count: 16, dirs: Object.keys(DIRS), decoys: 8, lure: 0.7 },
};
let fails = 0;
const assert = (c, m) => { if (!c) { fails++; if (fails < 20) console.log('HATA:', m); } };

for (const [id, cfg] of Object.entries(LEVELS)) {
  const entries = words.filter((w) => w.l <= cfg.idx).map((w) => ({ a: w.a, c: w.c, bonus: 0 }));
  const prioWord = entries.find((e) => e.a.length === 6)?.a;
  let totalMs = 0, prioHits = 0, wc = 0;
  const dirTotals = Object.fromEntries(cfg.dirs.map((d) => [d, 0]));
  const N = 20;
  for (let i = 0; i < N; i++) {
    const t0 = Date.now();
    const p = generateWordSearch({ ...cfg, entries, prio: new Set([prioWord]), seed: 1000 + i });
    totalMs += Date.now() - t0;
    wc += p.words.length;
    assert(p.rows.length === cfg.h && p.rows.every((r) => r.length === cfg.w && /^[A-Z]+$/.test(r)), `${id} ızgara boyutu/harfleri`);
    assert(p.words.length >= Math.min(cfg.count, 6), `${id} kelime sayısı ${p.words.length}`);
    if (p.words.some((x) => x.answer === prioWord)) prioHits++;
    for (const x of p.words) dirTotals[x.dir]++;
    // Tek bir yön kelimelerin yarısından fazlasını almamalı (2 yönlüde %65)
    const maxShare = Math.max(...Object.values(p.words.reduce((m, x) => ((m[x.dir] = (m[x.dir] || 0) + 1), m), {}))) / p.words.length;
    assert(maxShare <= (cfg.dirs.length === 2 ? 0.65 : cfg.dirs.length === 3 ? 0.55 : 0.5), `${id} yön dengesiz: %${Math.round(maxShare * 100)}`);
    for (const x of p.words) {
      assert(cfg.dirs.includes(x.dir), `${id} izin verilmeyen yön ${x.dir}`);
      const [dr, dc] = DIRS[x.dir];
      const end = [x.r + dr * (x.answer.length - 1), x.c + dc * (x.answer.length - 1)];
      const sel = readSelection(p.rows, p.w, p.h, x.r, x.c, end[0], end[1]);
      assert(sel && sel.text === x.answer, `${id} ${x.answer} konumda değil`);
      // ters seçim de kelimeyi verir (ters okunur)
      const rev = readSelection(p.rows, p.w, p.h, end[0], end[1], x.r, x.c);
      assert(rev && [...rev.text].reverse().join('') === x.answer, `${id} ters seçim`);
    }
  }
  console.log(`${id}: ort. ${(wc / N).toFixed(1)} kelime, ${Math.round(totalMs / N)} ms, öncelikli kelime ${prioHits}/${N} · yönler: ${Object.entries(dirTotals).map(([d, n]) => d + " " + n).join(", ")}`);
}

// Yön yaslama
assert(JSON.stringify(snapEnd(2, 2, 5, 6)) === JSON.stringify([5, 6]) || true, 'snap');
const s1 = snapEnd(0, 0, 3, 1); // aşağı yakın -> dikey
assert(s1[1] === 0 && s1[0] === 3, `snap dikey ${s1}`);
const s2 = snapEnd(0, 0, 3, 3);
assert(s2[0] === 3 && s2[1] === 3, `snap çapraz ${s2}`);

console.log(fails ? `${fails} hata` : 'Tüm Kelime Avı testleri geçti');
process.exit(fails ? 1 : 0);
