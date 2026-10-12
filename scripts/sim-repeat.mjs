// Çengel bulmacada kelime tekrarını ölçer: art arda N bulmaca üretir (uygulamadaki gibi geçmişi güncelleyerek).
// Kullanım: node scripts/sim-repeat.mjs [seviyeIdx=0] [adet=12]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qorvex-sim-'));
for (const f of ['generator', 'freshness']) {
  const p = path.resolve(__dirname, `../src/engine/${f}.js`);
  if (!fs.existsSync(p)) continue;
  fs.writeFileSync(path.join(tmp, `${f}.mjs`), fs.readFileSync(p, 'utf8').replace(/from '\.\/(\w+)'/g, "from './$1.mjs'"));
}
const { generatePuzzle } = await import(pathToFileURL(path.join(tmp, 'generator.mjs')).href);
const fresh = fs.existsSync(path.join(tmp, 'freshness.mjs')) ? await import(pathToFileURL(path.join(tmp, 'freshness.mjs')).href) : null;
const WORDS = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/words.json'), 'utf8'));

const lvl = Number(process.argv[2] || 0);
const N = Number(process.argv[3] || 12);
const W = lvl >= 2 ? 9 : 8, H = lvl >= 2 ? 11 : 10;
// Uygulamada sayaç diğer oyunlarda da artar; burada her bulmaca arasına 2 başka oyun koyuyoruz
const OTHER_GAMES = 2;
const learn = { counter: 0, recent: {}, times: {}, marked: {} };

const counts = new Map();
const seenBefore = new Set();
let repeatSum = 0, blankSum = 0, wordSum = 0, longRep = 0, longTot = 0;
for (let i = 0; i < N; i++) {
  const entries = [];
  const dict = new Map();
  for (const w of WORDS) {
    if (w.l > lvl && w.a.length > 2) continue;
    let bonus = w.l === lvl ? 3 : 0;
    if (fresh) bonus -= fresh.freshnessPenalty(w.a, learn);
    else {
      const last = learn.recent[w.a];
      if (last != null && learn.counter - last < 8) bonus -= 6;
    }
    const e = { a: w.a, c: w.c, bonus };
    entries.push(e);
    dict.set(w.a, e);
  }
  const t0 = Date.now();
  const p = await generatePuzzle({ w: W, h: H, entries, dict, prio: null, seed: 1000 + i * 7919, budgetMs: 1200 });
  const ms = Date.now() - t0;
  const ans = p.clues.map((k) => k.answer);
  const rep = ans.filter((a) => seenBefore.has(a)).length;
  if (i > 0) repeatSum += rep / ans.length;
  if (i > 0) for (const a of ans) if (a.length > 2) { longTot++; if (seenBefore.has(a)) longRep++; }
  const cells = W * H;
  blankSum += p.stats.blanks / cells;
  wordSum += ans.length;
  for (const a of ans) { seenBefore.add(a); counts.set(a, (counts.get(a) || 0) + 1); }
  // uygulamadaki recordAnswers
  learn.counter++;
  for (const a of ans) {
    learn.recent[a] = learn.counter;
    learn.times[a] = (learn.times[a] || 0) + 1;
  }
  learn.counter += OTHER_GAMES;
  console.log(`#${i + 1}: ${ans.length} kelime, daha önce gelmiş ${rep}, boş %${((p.stats.blanks / cells) * 100).toFixed(1)}, ${ms}ms`);
}
const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
console.log('\nEn çok gelenler:', top.map(([a, n]) => `${a}×${n}`).join(' '));
console.log(`3+ harfli kelimelerde tekrar: %${((longRep / Math.max(1, longTot)) * 100).toFixed(1)}`);
console.log(`Ortalama tekrar oranı: %${((repeatSum / (N - 1)) * 100).toFixed(1)} · ortalama boş: %${((blankSum / N) * 100).toFixed(1)} · ortalama kelime: ${(wordSum / N).toFixed(1)} · farklı kelime: ${counts.size}`);
