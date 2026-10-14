// Resim Bulmaca mantık testi: node scripts/test-picture.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qorvex-pic-'));
for (const f of ['generator', 'picture']) {
  const src = fs.readFileSync(path.resolve(__dirname, `../src/engine/${f}.js`), 'utf8').replace(/from '\.\/(\w+)'/g, "from './$1.mjs'");
  fs.writeFileSync(path.join(tmp, `${f}.mjs`), src);
}
const P = await import(pathToFileURL(path.join(tmp, 'picture.mjs')).href);
const WORDS = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/words.json'), 'utf8'));

let fails = 0;
const assert = (c, m) => { if (!c) { fails++; console.log('HATA:', m); } };

// Fotoğraf açıklaması: kelime ana konu olmalı
assert(P.altPosition('Vibrant red apples with water droplets', 'apple') === 2, 'çoğul eşleşmeli');
assert(P.altPosition('Joyful children flying kites in a field during sunrise, capturing freedom', 'freedom') === -1, 'sonda geçen kelime ana konu sayılmamalı');
assert(P.altPosition('Fresh berries on a plate', 'berry') === 1, '-ies çoğulu eşleşmeli');
const ph = P.pickPhoto([
  { alt: 'A serene scene featuring a champagne bucket beside a wooden chair', src: { large: 'x' } },
  { alt: 'Modern wooden chairs in a minimalist room', src: { large: 'y' }, photographer: 'Ana' },
], 'chair');
assert(ph && ph.url === 'y' && ph.by === 'Ana', 'ana konusu sandalye olan fotoğraf seçilmeli');
assert(P.pickPhoto([{ alt: 'Abstract art', src: { large: 'z' } }], 'chair') === null, 'eşleşme yoksa null');

// Adaylar: yalnızca isimler, uzunluk aralığı, fotoğrafı olmadığı bilinenler atlanır
const nouns = new Set(WORDS.filter((w) => w.p === 'noun').map((w) => w.a));
const entries = WORDS.filter((w) => w.l === 0).map((w) => ({ a: w.a, c: w.c, bonus: 0 }));
const cfg = P.PICTURE_LEVELS.A1;
const firstNoun = entries.find((e) => nouns.has(e.a) && e.a.length >= 3 && e.a.length <= 6).a;
const cands = P.pictureCandidates(entries, nouns, cfg, null, { [firstNoun]: null }, 7);
assert(cands.length > 50, 'yeterli aday olmalı: ' + cands.length);
assert(cands.every((c) => nouns.has(c.a) && c.a.length >= 3 && c.a.length <= 6), 'adaylar isim ve uzunluk aralığında olmalı');
assert(!cands.some((c) => c.a === firstNoun), 'fotoğrafı olmayan kelime atlanmalı');

// Turlar: taşlar = cevap harfleri + yanıltıcılar; ilk harf verilir; diz, geri al, harf aç
for (let seed = 1; seed <= 200; seed++) {
  const c = cands[seed % cands.length];
  const r = P.makeRound(c.a, c.c, { url: 'u' }, cfg, seed);
  assert(r.tiles.length === c.a.length + cfg.decoys, 'taş sayısı');
  const pool = [...r.tiles];
  for (const ch of c.a) {
    const i = pool.indexOf(ch);
    assert(i >= 0, `cevabın harfi taşlarda yok: ${c.a} / ${r.tiles}`);
    if (i >= 0) pool.splice(i, 1);
  }
  let s = P.initSlots(r, true);
  assert(r.tiles[s[0]] === c.a[0], 'ilk harf verilmeli');
  assert(P.removeAt(s, 0, true) === s, 'verilen ilk harf geri alınamamalı');
  // harf açarak çöz
  for (let k = 0; k < c.a.length + 2 && !P.slotsOk(r, s); k++) s = P.revealOne(r, s);
  assert(P.slotsOk(r, s), 'harf açarak çözülmeli: ' + c.a);
}
// Yanlış dizilim + harf aç düzeltir
{
  const r = P.makeRound('CAT', 'kedi', { url: 'u' }, { decoys: 2 }, 3);
  let s = [null, null, null];
  const idx = (ch, skip = []) => [...r.tiles].findIndex((x, i) => x === ch && !skip.includes(i));
  s = P.placeTile(s, idx('T'));
  s = P.placeTile(s, idx('A'));
  s = P.placeTile(s, idx('C'));
  assert(P.slotsFull(s) && !P.slotsOk(r, s), 'TAC yanlış olmalı');
  for (let k = 0; k < 4 && !P.slotsOk(r, s); k++) s = P.revealOne(r, s);
  assert(P.slotsOk(r, s), 'harf aç yanlış dizilimi düzeltmeli');
}

if (fails) { console.log(fails + ' hata'); process.exit(1); }
console.log('Tüm resim bulmaca testleri geçti');
