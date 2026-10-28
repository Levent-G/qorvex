// Tüm oyunların oturum üretimini uçtan uca dener (telefon deposu yerine bellek içi sahte depo).
// Kullanım: node scripts/smoke-sessions.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '../src');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qorvex-smoke-'));
fs.mkdirSync(path.join(tmp, 'engine'));
fs.mkdirSync(path.join(tmp, 'services'));
fs.mkdirSync(path.join(tmp, 'data'));
const fix = (s) => s.replace(/from '(\.{1,2}\/[^']+?)'/g, (m, p) => (p.endsWith('.json') ? `from '${p}' with { type: 'json' }` : `from '${p}.mjs'`));
for (const f of fs.readdirSync(path.join(SRC, 'engine'))) {
  if (f.endsWith('.js')) fs.writeFileSync(path.join(tmp, 'engine', f.replace(/\.js$/, '.mjs')), fix(fs.readFileSync(path.join(SRC, 'engine', f), 'utf8')));
}
fs.writeFileSync(path.join(tmp, 'services', 'pexels.mjs'), fix(fs.readFileSync(path.join(SRC, 'services', 'pexels.js'), 'utf8')));
fs.copyFileSync(path.join(SRC, 'data', 'words.json'), path.join(tmp, 'data', 'words.json'));
// sahte depo (storage.js ile aynı şekil)
fs.writeFileSync(path.join(tmp, 'storage.mjs'), `
const store = { levels: {}, daily: null, learn: { marked: {}, recent: {}, counter: 0, times: {} }, ws: { levels: {}, daily: null }, ladder: { levels: {}, daily: null }, stats: { streak: 0, best: 0, lastDay: null, total: 0, byDay: {} }, profile: { level: 'A1' } };
export const getStore = () => store;
export const persist = () => {};
export const loadStore = async () => store;
`);

const S = await import(pathToFileURL(path.join(tmp, 'engine', 'session.mjs')).href);
const games = [
  ['Çengel', (lv, n) => S.getLevelSession(lv, n)],
  ['Kare Bulmaca', (lv, n) => S.crossword.getSession(lv, n)],
  ['Şifreli Bulmaca', (lv, n) => S.codeword.getSession(lv, n)],
  ['Sarmal', (lv, n) => S.spiral.getSession(lv, n)],
  ['Kelime Avı', (lv, n) => S.getWordSearchSession(lv, n)],
  ['Kelime Merdiveni', (lv, n) => S.getLadderSession(lv, n)],
  ['Karışık Harfler', (lv, n) => S.jumble.getSession(lv, n)],
  ['Şifreli Cümle', (lv, n) => S.cryptogram.getSession(lv, n)],
];
let fails = 0;
for (const [name, get] of games) {
  for (const lv of ['A1', 'B1', 'MIX']) {
    try {
      for (let k = 0; k < 3; k++) {
        const s = await get(lv, true);
        if (!s || !s.puzzle) throw new Error('oturum boş');
      }
      process.stdout.write(`✓ ${name} ${lv}  `);
    } catch (e) {
      fails++;
      console.log(`\nHATA: ${name} ${lv}: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`);
    }
  }
  console.log('');
}
// İstatistikler: çözüm süresi, en hızlı süre, ipucu sayaçları
{
  const a = await S.getLevelSession('A1', true);
  a.seconds = 95;
  S.markSolved('level', 'A1');
  const b = await S.getLevelSession('A1', true);
  b.seconds = 70;
  S.recordHint('letter', b);
  S.markSolved('level', 'A1');
  const c = await S.crossword.getSession('A1', true);
  c.seconds = 120;
  S.recordHint('word', c);
  S.crossword.markSolved('level', 'A1');
  const d = S.getDetailedStats();
  const ok =
    d.games.arrow && d.games.arrow.fastest === 70 && d.games.arrow.solved === 2 &&
    d.games.crossword && d.games.crossword.fastest === 120 &&
    d.hints.letter === 1 && d.hints.word === 1 && d.clean === 1 && d.seenWords > 0 && d.encounters >= d.seenWords;
  if (!ok) {
    fails++;
    console.log('HATA: istatistikler beklendiği gibi değil', JSON.stringify({ games: d.games, hints: d.hints, clean: d.clean }));
  } else console.log(`✓ İstatistikler: en hızlı çengel 70 sn, ipucusuz 1, karşılaşılan kelime ${d.seenWords}`);
}

// Zor kelimeler + tekrar modu
{
  const R = await import(pathToFileURL(path.join(tmp, 'engine', 'review.mjs')).href);
  const { WORDS } = await import(pathToFileURL(path.join(tmp, 'engine', 'words.mjs')).href);
  const learn = S.__store ? S.__store.learn : (await import(pathToFileURL(path.join(tmp, 'storage.mjs')).href)).getStore().learn;
  const sample = WORDS.filter((w) => w.a.length > 3).slice(100, 112);
  for (const w of sample) learn.marked[w.a] = { at: Date.now(), seen: 0, last: 0 };
  S.recordHard(sample[0].a, 'hint'); // 2 puan → zor
  S.recordHard(sample[1].a, 'card'); // 1 puan → henüz zor değil
  const hard = S.hardWords();
  let ok = hard.length === 1 && hard[0].answer === sample[0].a;
  const qs = R.buildReview({ words: WORDS, learn, hard, source: 'notebook', count: 10, seed: 7 });
  ok = ok && qs.length === 10 && qs.every((q) => q.options.length === 4 && new Set(q.options).size === 4 && q.options.includes(q.answer));
  ok = ok && qs.every((q) => q.options.every((o) => o === q.answer || WORDS.find((x) => x.a === o).c !== q.word.c));
  const hq = R.buildReview({ words: WORDS, learn, hard, source: 'hard', seed: 3 });
  ok = ok && hq.length === 1;
  S.recordReview(sample[0].a, true);
  S.recordReview(sample[0].a, true); // 2 doğru → puan 2-6 <2 → zordan çıkar
  ok = ok && S.hardWords().length === 0 && learn.marked[sample[0].a].seen === 2;
  S.recordReview(sample[2].a, false); // yanlış → quiz 3 puan → zor
  ok = ok && S.hardWords()[0]?.answer === sample[2].a;
  if (!ok) { fails++; console.log('HATA: zor kelimeler / tekrar modu', JSON.stringify(S.hardWords())); }
  else console.log('✓ Zor kelimeler ve tekrar modu (10 soru, 4 farklı şık)');
}

// Soru türleri, zamana karşı, günün kelimesi, telaffuz eşleştirme, haftalık, rozetler
{
  const R = await import(pathToFileURL(path.join(tmp, 'engine', 'review.mjs')).href);
  const P = await import(pathToFileURL(path.join(tmp, 'engine', 'practice.mjs')).href);
  const { WORDS } = await import(pathToFileURL(path.join(tmp, 'engine', 'words.mjs')).href);
  const learn = (await import(pathToFileURL(path.join(tmp, 'storage.mjs')).href)).getStore().learn;
  const errs = [];
  const qs = R.buildReview({ words: WORDS, learn, hard: [], source: 'notebook', mode: 'mix', count: 10, seed: 11 });
  const types = new Set(qs.map((q) => q.type));
  if (types.size < 4) errs.push('karışık türler az: ' + [...types]);
  for (const q of qs) {
    if (!R.REVIEW_TYPES.includes(q.type)) errs.push('bilinmeyen tür ' + q.type);
    if (q.type === 'cloze' && (!q.cloze || !q.cloze.text.includes('____') || new RegExp(`\\b${q.answer}\\b`, 'i').test(q.cloze.text))) errs.push('boşluk hatalı ' + q.answer);
    if (q.type === 'write' && q.answer.length > 10) errs.push('yazma çok uzun');
  }
  const ta = P.buildTimeAttack(WORDS, 1, 5);
  if (ta.length < 60 || !ta.every((q) => q.options.length === 4 && q.options.includes(q.answer))) errs.push('zamana karşı soruları');
  const w1 = P.wordOfDay(WORDS, 2, '2026-10-17'), w2 = P.wordOfDay(WORDS, 2, '2026-10-17'), w3 = P.wordOfDay(WORDS, 2, '2026-10-18');
  if (w1.a !== w2.a || w1.l !== 2 || !w1.ex?.length) errs.push('günün kelimesi sabit/seviye değil');
  if (w1.a === w3.a) errs.push('günün kelimesi her gün aynı');
  const M = P.matchSpoken;
  if (!M('APPLE', ['Apple.']) || !M('APPLE', ['I said apples']) || !M('BEAUTIFUL', ['beautifull']) || M('APPLE', ['maple syrup']) || M('CAT', ['cut'])) errs.push('telaffuz eşleştirme');
  if (P.isoWeek(new Date(2026, 9, 17)).key !== '2026-W42' || P.isoWeek(new Date(2027, 0, 1)).key !== '2026-W53') errs.push('ISO hafta ' + P.isoWeek(new Date(2026, 9, 17)).key);
  const ps = P.pronounceSet(WORDS, learn, 0, 3);
  if (ps.length !== 8 || !ps.every((w) => w.ipa)) errs.push('telaffuz seti');
  // haftalık
  const wk = await S.weekly.getDaily();
  const wk2 = await S.weekly.getDaily();
  if (wk !== wk2 || wk.puzzle.clues.length < 16 || wk.levelId !== 'A2') errs.push('haftalık bulmaca ' + wk.levelId + ' ' + wk.puzzle.clues.length);
  S.weekly.markSolved();
  // rozetler
  S.recordTimeAttack(12);
  S.recordReviewSession(10, 10);
  const fresh = S.checkBadges().map((b) => b.id);
  for (const id of ['first', 'weekly1', 'ta10', 'perfect', 'review1']) if (!fresh.includes(id)) errs.push('rozet yok: ' + id);
  if (S.checkBadges().length) errs.push('rozet iki kez verildi');
  if (S.getBadges().length !== 23) errs.push('rozet listesi');
  if (errs.length) { fails++; console.log('HATA:', errs.join(' | ')); }
  else console.log(`✓ 5 soru türü (${[...types].join(',')}), zamana karşı, günün kelimesi (${w1.a}), telaffuz, haftalık (${wk.puzzle.clues.length} kelime), rozetler (${fresh.length} yeni)`);
}

// Karşılaşılan kelime: yalnızca çözülen bulmacalar sayılır; son 10 çözüm ortalaması gerçekten son 10 çözüm
{
  const errs = [];
  const before = S.getDetailedStats();
  await S.getLevelSession('A1', true); // üretildi ama çözülmedi → sayılmamalı
  const mid = S.getDetailedStats();
  if (mid.seenWords !== before.seenWords || mid.encounters !== before.encounters) errs.push('çözülmeyen bulmaca sayıldı');
  const sess = await S.getLevelSession('A1', true);
  const words = sess.puzzle.clues.filter((k) => !k.filler).map((k) => k.answer);
  sess.seconds = 30;
  S.markSolved('level', 'A1');
  const after = S.getDetailedStats();
  if (after.encounters - mid.encounters !== words.length) errs.push(`karşılaşma ${after.encounters - mid.encounters} ≠ ${words.length}`);
  if (after.seenWords <= mid.seenWords) errs.push('farklı kelime artmadı');
  for (let i = 0; i < 12; i++) { const s2 = await S.getLevelSession('A1', true); s2.seconds = 100 + i; S.markSolved('level', 'A1'); }
  const avg = S.getDetailedStats().avgRecent;
  const want = Array.from({ length: 10 }, (_, i) => 102 + i).reduce((a, b) => a + b, 0) / 10;
  if (Math.abs(avg - want) > 0.01) errs.push(`son 10 ortalama ${avg} ≠ ${want}`);
  if (errs.length) { fails++; console.log('HATA:', errs.join(' | ')); }
  else console.log(`✓ İstatistik: çözülmeyen sayılmıyor, +${words.length} karşılaşma, son 10 ortalaması ${avg.toFixed(1)} sn`);
}

// Çengel B1 9x11 boşluksuz + arka planda hazırlanan sonraki bulmaca anında gelir
{
  const errs = [];
  S.prefetchLevel('B1');
  await new Promise((r) => setTimeout(r, 6000)); // hazırlansın
  const t0 = Date.now();
  const sess = await S.getLevelSession('B1', true);
  const ms = Date.now() - t0;
  const p = sess.puzzle;
  if (p.w !== 9 || p.h !== 11) errs.push(`boyut ${p.w}x${p.h}`);
  if (p.rows.join('').includes('.')) errs.push('boş kare var');
  if (ms > 300) errs.push(`hazır bulmaca gecikti (${ms} ms)`);
  if (errs.length) { fails++; console.log('HATA:', errs.join(' | ')); }
  else console.log(`✓ Çengel 9x11 boşluksuz, arka planda hazırlanan bulmaca ${ms} ms'de geldi`);
}

// Bulmaca arşivi: geçmiş gün üretilir, kaydedilir, çözülünce listede "solved" görünür
{
  const errs = [];
  const days = S.archiveDays();
  if (days.length !== S.ARCHIVE_DAYS || days.some((d) => d.state !== 'new')) errs.push('arşiv listesi');
  const key = days[2].key;
  const st = S.archiveStore(key);
  if (S.archiveStore(key) !== st) errs.push('arşiv mağazası sabit değil');
  const sess = await st.getDaily();
  if (!sess.puzzle || sess.puzzle.clues.length < 10 || (await st.getDaily()) !== sess) errs.push('arşiv bulmacası');
  sess.solved = true;
  sess.seconds = 95;
  st.markSolved();
  const after = S.archiveDays().find((d) => d.key === key);
  if (after.state !== 'solved' || after.seconds !== 95) errs.push('arşiv çözüldü durumu');
  if (errs.length) { fails++; console.log('HATA:', errs.join(' | ')); }
  else console.log(`✓ Bulmaca arşivi (${days.length} gün, ${sess.puzzle.clues.length} ipuçlu bulmaca, çözüldü işareti)`);
}

// Resimli bulmaca ağ ister; anahtarsız anlaşılır hata vermeli
try {
  await S.picture.getSession('A1', true);
  console.log('Resimli Bulmaca: üretildi');
} catch (e) {
  console.log('Resimli Bulmaca (anahtarsız beklenen hata):', e.message);
}
if (fails) { console.log(fails + ' hata'); process.exit(1); }
console.log('Tüm oyun oturumları üretildi');
