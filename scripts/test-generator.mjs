// Üretici performans/kalite testi: node scripts/test-generator.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = path.join(os.tmpdir(), 'cengel-gen-test.mjs');
fs.copyFileSync(path.resolve(__dirname, '../src/engine/generator.js'), tmp);
const { generatePuzzle } = await import(pathToFileURL(tmp).href + '?t=' + Date.now());
const words = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/words.json'), 'utf8'));

const isL = (p, r, c) => r >= 0 && c >= 0 && r < p.h && c < p.w && /[A-Z]/.test(p.rows[r][c]);
function verify(p) {
  const errs = [];
  const byStart = new Map(p.clues.map((k) => [`${k.sr},${k.sc},${k.dir}`, k]));
  for (const dir of ['A', 'D']) {
    const [dr, dc] = dir === 'A' ? [0, 1] : [1, 0];
    for (let r = 0; r < p.h; r++)
      for (let c = 0; c < p.w; c++) {
        if (!isL(p, r, c) || isL(p, r - dr, c - dc)) continue;
        let s = '', rr = r, cc = c;
        while (isL(p, rr, cc)) { s += p.rows[rr][cc]; rr += dr; cc += dc; }
        if (s.length < 2) continue;
        const k = byStart.get(`${r},${c},${dir}`);
        if (!k || k.answer !== s) errs.push(`dizi ${s}`);
      }
  }
  for (const k of p.clues) {
    if (p.rows[k.r][k.c] !== '#') errs.push('ipucu hücresi');
    const exp = { R: [k.r, k.c + 1, 'A'], D: [k.r + 1, k.c, 'D'], RD: [k.r, k.c + 1, 'D'], DR: [k.r + 1, k.c, 'A'] }[k.arrow];
    if (exp[0] !== k.sr || exp[1] !== k.sc || exp[2] !== k.dir) errs.push('ok');
  }
  for (let r = 0; r < p.h; r++)
    for (let c = 0; c < p.w; c++)
      if (isL(p, r, c) && !isL(p, r, c - 1) && !isL(p, r, c + 1) && !isL(p, r - 1, c) && !isL(p, r + 1, c)) errs.push('yalnız harf');
  return errs;
}

const configs = [
  { name: 'A1', w: 8, h: 10, maxL: 0 },
  { name: 'B1', w: 9, h: 11, maxL: 2 },
  { name: 'C2', w: 9, h: 11, maxL: 5 },
];
globalThis.__BW = Number(process.env.BW || 6); globalThis.__NG = Number(process.env.NG || 3);
const N = Number(process.env.N || 6);
const budget = Number(process.env.BUDGET || 900);
for (const cfg of configs) {
  const pool = words.filter((x) => x.l <= cfg.maxL || x.a.length === 2);
  const dict = new Map(pool.map((x) => [x.a, x]));
  for (const x of words) if (x.a.length <= 3) dict.set(x.a, x);
  let tl = 0, tb = 0, tw = 0, tt = 0, errs = 0;
  let last;
  for (let i = 0; i < N; i++) {
    const t0 = Date.now();
    const p = await generatePuzzle({ w: cfg.w, h: cfg.h, entries: pool, dict, seed: i * 7919 + 1, budgetMs: budget, sampleSize: Number(process.env.SAMPLE || 650), maxAttempts: Number(process.env.ATT || 60) });
    tt += Date.now() - t0;
    tl += p.stats.letters; tb += p.stats.blanks; tw += p.stats.words;
    errs += verify(p).length;
    last = p;
  }
  const n = cfg.w * cfg.h;
  console.log(`${cfg.name} ${cfg.w}x${cfg.h}: harf %${Math.round((tl / N / n) * 100)}, boş gri ${(tb / N).toFixed(1)} kare (%${Math.round((tb / N / n) * 100)}), ${(tw / N).toFixed(1)} kelime, ${Math.round(tt / N)} ms, hata ${errs}`);
  console.log(last.rows.join('\n'));
}
