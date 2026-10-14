// Resimli Bulmaca fotoğraf seçimi testi: node scripts/test-picture.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qorvex-pic-'));
fs.writeFileSync(path.join(tmp, 'picture.mjs'), fs.readFileSync(path.resolve(__dirname, '../src/engine/picture.js'), 'utf8'));
const P = await import(pathToFileURL(path.join(tmp, 'picture.mjs')).href);

let fails = 0;
const assert = (c, m) => { if (!c) { fails++; console.log('HATA:', m); } };

// Fotoğraf açıklaması: kelime ana konu olmalı (ilk 6 kelimede, çoğul dahil)
assert(P.altPosition('Vibrant red apples with water droplets', 'apple') === 2, 'çoğul eşleşmeli');
assert(P.altPosition('Joyful children flying kites in a field during sunrise, capturing freedom', 'freedom') === -1, 'sonda geçen kelime ana konu sayılmamalı');
assert(P.altPosition('Fresh berries on a plate', 'berry') === 1, '-ies çoğulu eşleşmeli');
assert(P.altPosition('Teacher conducting a lesson', 'TEACHER') === 0, 'büyük harf cevap eşleşmeli');
assert(P.altPosition('', 'dog') === -1, 'boş açıklama');

const ph = P.pickPhoto([
  { alt: 'A serene scene featuring a champagne bucket beside a wooden chair', src: { large: 'x' } },
  { alt: 'Modern wooden chairs in a minimalist room', src: { large: 'y' }, photographer: 'Ana', url: 'L' },
], 'chair');
assert(ph && ph.url === 'y' && ph.by === 'Ana' && ph.link === 'L', 'ana konusu sandalye olan fotoğraf seçilmeli');
assert(P.pickPhoto([{ alt: 'Abstract art', src: { large: 'z' } }], 'chair') === null, 'eşleşme yoksa null');
assert(P.pickPhoto(undefined, 'chair') === null, 'sonuç yoksa null');

if (fails) { console.log(fails + ' hata'); process.exit(1); }
console.log('Tüm resimli bulmaca testleri geçti');
