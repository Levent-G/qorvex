// Şifreli Cümle tahta mantığı testi: node scripts/test-crypto.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qorvex-cr-'));
for (const f of ['generator', 'wordgames', 'cryptoBoard']) {
  const src = fs.readFileSync(path.resolve(__dirname, `../src/engine/${f}.js`), 'utf8').replace(/from '\.\/(\w+)'/g, "from './$1.mjs'");
  fs.writeFileSync(path.join(tmp, `${f}.mjs`), src);
}
const imp = (f) => import(pathToFileURL(path.join(tmp, `${f}.mjs`)).href);
const { generateCryptogram } = await imp('wordgames');
const cb = await imp('cryptoBoard');
const WORDS = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/words.json'), 'utf8'));

let fails = 0;
const assert = (c, m) => { if (!c) { fails++; console.log('HATA:', m); } };
const allowed = new Set(WORDS.filter((w) => w.l <= 1).map((w) => w.a));
const p = generateCryptogram({ minChars: 18, maxChars: 35, given: 2, words: WORDS, allowed, seed: 3 });
const c = cb.makeCrypto(p);
let st = cb.initCrypto(c);
console.log('Cümle:', p.text, '| şifre:', c.enc);

// 1) Yazma: seçili konum ileriye doğru sıradaki boş kareye ilerler
const first = st.sel;
st = cb.typeLetter(c, st, c.decode[c.enc[first]]);
assert(st.sel > first || cb.allFilled(c, st), 'yazınca ileri gitmeli');
const nextPos = c.positions.find((i) => i > first && !st.guess[c.enc[i]] && !c.given.has(c.enc[i]));
assert(nextPos === undefined || st.sel === nextPos, `sıradaki boş kareye gitmeli (${st.sel} != ${nextPos})`);

// 2) Silme: boş karede geri gidip öncekini siler
const before = st.sel;
st = cb.deleteLetter(c, st);
assert(st.sel === first && !st.guess[c.enc[first]], 'boş karede silme geri gidip silmeli');

// 3) Verilen harfler silinemez
const g = [...c.given][0];
const gpos = c.positions.find((i) => c.enc[i] === g);
let st2 = cb.select(c, st, gpos);
st2 = cb.deleteLetter(c, st2);
assert(st2.guess[g] === c.decode[g], 'verilen harf silinmemeli');

// 4) Yanlış kelime kırmızı/sarı, doğru yazınca çözülür
for (const ch of c.letters) if (!c.given.has(ch)) st.guess[ch] = 'Q';
assert(cb.allFilled(c, st) && !cb.isSolved(c, st), 'hepsi dolu ama yanlış');
assert(cb.wordStatuses(c, st).some((w) => w.status === 'bad' || w.status === 'close'), 'yanlış kelime işaretlenmeli');
st = cb.initCrypto(c);
let guard = 0;
while (!cb.isSolved(c, st) && guard++ < 100) st = cb.typeLetter(c, st, c.decode[c.enc[st.sel]]);
assert(cb.isSolved(c, st), 'sırayla yazınca çözülmeli');
assert(cb.reading(c, st) === p.text, 'okunuş cümleyle aynı olmalı');
assert(cb.wordStatuses(c, st).every((w) => w.status === 'ok'), 'tüm kelimeler yeşil olmalı');
console.log(`Çözüldü: ${cb.reading(c, st)} (${guard} tuş)`);
console.log(fails ? `${fails} hata` : 'Tüm şifreli cümle testleri geçti');
process.exit(fails ? 1 : 0);
