// Çengel bulmacada kelime tekrarını ölçer: art arda N bulmaca, uygulamanın havuz kodu (engine/pool.js) ile.
// Oyuncu her bulmacada CARDS kelimenin kartını açar (deftere ekler); geri gelen defter kelimelerinin kartını da açabilir.
// Kullanım: node scripts/sim-repeat.mjs [seviyeIdx=0] [adet=15] [kart=3] [önceden-görülmüş=0]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qorvex-sim-'));
for (const f of ['generator', 'freshness', 'pool']) {
  const src = fs.readFileSync(path.resolve(__dirname, `../src/engine/${f}.js`), 'utf8').replace(/from '\.\/(\w+)'/g, "from './$1.mjs'");
  fs.writeFileSync(path.join(tmp, `${f}.mjs`), src);
}
const imp = (f) => import(pathToFileURL(path.join(tmp, `${f}.mjs`)).href);
const { generatePuzzle } = await imp('generator');
const { buildInputs, recordAnswersTo } = await imp('pool');
const WORDS = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/words.json'), 'utf8'));

const lvl = Number(process.argv[2] || 0);
const N = Number(process.argv[3] || 15);
const CARDS = Number(process.argv[4] || 3);
const PRESEEN = Number(process.argv[5] || 0);
const level = { idx: lvl, w: lvl >= 2 ? 9 : 8, h: lvl >= 2 ? 11 : 10 };
const OTHER_GAMES = 1; // her bulmaca arasında başka bir oyun da oynanmış say
const learn = { counter: 0, recent: {}, times: {}, marked: {} };
{
  let k = 0;
  for (const w of WORDS) {
    if (k >= PRESEEN) break;
    if (w.l <= lvl && w.a.length > 2) { learn.recent[w.a] = 0; learn.times[w.a] = 1; k++; }
  }
}
let rand = 12345;
const rnd = () => ((rand = (rand * 1103515245 + 12345) % 2147483648) / 2147483648);

const lastSeenAt = new Map();
let rep3 = 0, repMarked = 0, repUnmarked = 0, tot3 = 0, blanks = 0;
const repeatGaps = [];
for (let i = 0; i < N; i++) {
  const { entries, dict, prio } = buildInputs(WORDS, level, learn, true, true);
  const p = await generatePuzzle({ w: level.w, h: level.h, entries, dict, prio, seed: 1000 + i * 7919, budgetMs: 1200, restarts: 4 });
  const ans = p.clues.map((k) => k.answer);
  blanks += p.stats.blanks / (level.w * level.h);
  const long = ans.filter((a) => a.length > 2);
  const reps = long.filter((a) => lastSeenAt.has(a));
  tot3 += long.length;
  rep3 += reps.length;
  for (const a of reps) {
    if (learn.marked[a]) repMarked++;
    else repUnmarked++;
    repeatGaps.push(i - lastSeenAt.get(a));
  }
  for (const a of long) lastSeenAt.set(a, i);
  recordAnswersTo(learn, ans);
  // oyuncu kart açar: yeni kelimelerden CARDS tane + geri gelen defter kelimelerinin yarısı (eski hatayı yakalamak için)
  const fresh = long.filter((a) => !learn.marked[a]);
  for (let k = 0; k < CARDS && fresh.length; k++) {
    const a = fresh.splice(Math.floor(rnd() * fresh.length), 1)[0];
    learn.marked[a] = { at: i, seen: 0, last: learn.counter };
  }
  learn.counter += OTHER_GAMES;
  console.log(`#${i + 1}: ${ans.length} kelime (${ans.filter((a) => a.length === 2).length} ikili) · boş %${((p.stats.blanks / (level.w * level.h)) * 100).toFixed(0)} · 3+ harfli tekrar ${reps.length}${reps.length ? ' (' + reps.join(', ') + ')' : ''} · defterden öne çıkan ${prio ? prio.size : 0}`);
}
console.log(`\n3+ harfli kelimelerde tekrar: %${((rep3 / Math.max(1, tot3)) * 100).toFixed(1)} · defterdeki: ${repMarked} · defterde olmayan: ${repUnmarked}`);
if (repeatGaps.length) console.log(`Tekrarlar arası ortalama bulmaca: ${(repeatGaps.reduce((a, b) => a + b, 0) / repeatGaps.length).toFixed(1)}`);
console.log(`Ortalama boş: %${((blanks / N) * 100).toFixed(1)}`);
