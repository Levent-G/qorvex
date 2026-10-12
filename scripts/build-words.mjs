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
// Parantez içindeki açıklamaları (virgüllü olabilir) bölmeden ÖNCE çıkar; yoksa "enerjiyi", "zamanı" gibi parçalar oluşur
const splitMeanings = (t) =>
  t
    .replace(/\([^)]*\)?/g, '')
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

// Elle düzeltilmiş Türkçe ipuçları (scripts/clue-fixes/*.json): tuhaf, eski ya da yanlış anlamları düzeltir
const FIX_DIR = path.resolve(__dirname, 'clue-fixes');
const fixes = {};
if (fs.existsSync(FIX_DIR))
  for (const f of fs.readdirSync(FIX_DIR).filter((x) => x.endsWith('.json')).sort())
    Object.assign(fixes, JSON.parse(fs.readFileSync(path.join(FIX_DIR, f), 'utf8')));
const lower = (s) => s.toLocaleLowerCase('tr-TR');

// Kelime kartındaki anlam listesinden atılacaklar: bozuk parçalar ve açıkça yanlış anlamlar
const BAD_MEANINGS = {
  MUM: ['maske ile oynamak'], CD: ['dış çap'], THREE: ['iskambilde üçlü'], SHE: ['dişi hayvan'], BYE: ['ast'],
  KIDNAP: ['adam'], MERE: ['bataklık', 'göl'], GUITAR: ['gitarist'], VIDEO: ['video terminal'], FARE: ['başarmak'],
  PIANO: ['piyano çalgı'], DOG: ['it'], FAMILY: ['sülale'], FRIEND: ['ahbap'], ARTICLE: ['bent'], PARAGRAPH: ['fıkra'],
  CLAUSE: ['fıkra'], SOMETIME: ['sabık'], EVERYBODY: ['cümle alem'], BLACK: ['siyahi'], NURSE: ['hemşirelik yapmak'],
  PARENT: ['ebeveynlik etmek'], FRUIT: ['meyve vermek'], LINE: ['astarlamak'], FLOOR: ['yeri kaplamak'], COAT: ['kaplamak'],
  PLANE: ['düzlemek'], FRONT: ['yönelmek'], OK: ['onaylamak'], OF: ['karşı'], TO: ['karşı'], BY: ['geçecek biçimde'],
  HARBOUR: ['barındırmak'], PRIME: ['astar vurmak'], CHIP: ['topu aşırtmak'], WIRE: ['telle bağlamak'], THUMB: ['çevirmek'],
  SLAVE: ['köle gibi çalışmak'], INK: ['mürekkeplemek'], NICHE: ['oyuğa koymak'], NOD: ['seçilmek'], TROOP: ['topluca ilerlemek'],
  MANDATE: ['manda altına almak', 'manda'], ELEVATE: ['aklı'], ALIEN: ['yabancı kelime'], SCHEME: ['fesat karıştırmak'], TIDE: ['akıntı ile yüzmek'],
};
const brokenMeaning = (x) =>
  (x.split('(').length !== x.split(')').length) || /^[ivxlc]+\)?$/i.test(x) || /^(eril|dişil) /.test(x) || x.length < 2;

const words = [];
let fixed = 0;
for (const e of map.values()) {
  const bad = new Set((BAD_MEANINGS[e.a] || []).map((x) => x.toLocaleLowerCase('tr-TR')));
  e.m = e.m.filter((x) => !brokenMeaning(x) && !bad.has(x.toLocaleLowerCase('tr-TR')));
  if (!e.m.length && !fixes[e.a]) continue;
  const fix = fixes[e.a];
  if (fix) {
    fixed++;
    if (fix.length > 18) console.warn(`UYARI: ${e.a} ipucu 18 karakterden uzun: "${fix}"`);
    // düzeltilmiş anlam kelime kartında en başta görünsün
    const m = lower(fix).replace(/\s*\(.*?\)\s*/g, '').trim();
    if (m && !e.m.some((x) => lower(x) === m)) e.m.unshift(m);
    else if (m) e.m = [e.m.find((x) => lower(x) === m), ...e.m.filter((x) => lower(x) !== m)];
    words.push({ ...e, c: fix });
    continue;
  }
  // Izgarada gösterilecek kısa ipucu: 18 karakteri geçmeyen ilk anlam
  const clue = e.m.find((x) => x.length <= 18 && x.toLowerCase() !== e.a.toLowerCase());
  if (!clue) continue;
  words.push({ ...e, c: trCapitalize(clue) });
}
const missing = Object.keys(fixes).filter((a) => !map.has(a.toLowerCase()));
if (missing.length) console.warn(`UYARI: listede olmayan düzeltmeler: ${missing.join(', ')}`);
console.log(`${fixed} ipucu elle düzeltildi`);
words.sort((x, y) => x.l - y.l || (x.a < y.a ? -1 : 1));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(words));
const per = LEVELS.map((l, i) => `${l}:${words.filter((w) => w.l === i).length}`).join(' ');
console.log(`${words.length} kelime yazıldı (${per}), ${Math.round(fs.statSync(OUT).size / 1024)} KB`);
