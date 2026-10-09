// davinci2 kelime veritabanından uygulamanın kullandığı src/data/words.json dosyasını üretir.
// Kullanım: node scripts/build-words.mjs [wordDatabase.js yolu]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = process.argv[2] || path.resolve(__dirname, '../../davinci2/src/data/wordDatabase.js');
const OUT = path.resolve(__dirname, '../src/data/words.json');
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const text = fs.readFileSync(SRC, 'utf8');
const re = /\{\s*id:[^}]*?word:\s*"([^"]+)",\s*translation:\s*"([^"]+)",\s*level:\s*"([^"]+)",\s*example:\s*"((?:[^"\\]|\\.)*)",\s*exampleTr:\s*"((?:[^"\\]|\\.)*)",\s*partOfSpeech:\s*"([^"]*)",\s*category:\s*"([^"]*)"/g;

function trCapitalize(s) {
  const f = s[0];
  return (f === 'i' ? 'İ' : f === 'ı' ? 'I' : f.toLocaleUpperCase('tr-TR')) + s.slice(1);
}
const splitMeanings = (t) =>
  t
    .split(/[,;/]/)
    .map((x) => x.replace(/\(.*?\)/g, '').trim())
    .filter(Boolean);

const map = new Map();
let m;
while ((m = re.exec(text))) {
  const word = m[1].trim().toLowerCase();
  if (!/^[a-z]{2,10}$/.test(word)) continue;
  const lv = LEVELS.indexOf(m[3].trim().toUpperCase());
  if (lv < 0) continue;
  let e = map.get(word);
  if (!e) {
    e = { a: word.toUpperCase(), l: lv, m: [], ex: [], p: m[6], cat: m[7] };
    map.set(word, e);
  }
  e.l = Math.min(e.l, lv);
  for (const mm of splitMeanings(m[2])) if (!e.m.includes(mm)) e.m.push(mm);
  const ex = m[4].replace(/\\"/g, '"');
  const exTr = m[5].replace(/\\"/g, '"');
  if (ex && e.ex.length < 3 && !e.ex.some((x) => x[0] === ex)) e.ex.push([ex, exTr]);
}

const words = [];
for (const e of map.values()) {
  // Izgarada gösterilecek kısa ipucu: 18 karakteri geçmeyen ilk anlam
  const clue = e.m.find((x) => x.length <= 18 && x.toLowerCase() !== e.a.toLowerCase());
  if (!clue) continue;
  words.push({ ...e, c: trCapitalize(clue) });
}
words.sort((x, y) => x.l - y.l || (x.a < y.a ? -1 : 1));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(words));
const per = LEVELS.map((l, i) => `${l}:${words.filter((w) => w.l === i).length}`).join(' ');
console.log(`${words.length} kelime yazıldı (${per}), ${Math.round(fs.statSync(OUT).size / 1024)} KB`);
