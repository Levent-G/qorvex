// Oyun kataloğu: ana sayfa, seviye ekranı ve yönlendirme bu tanımları kullanır.
import {
  LEVELS, getDailySession, peekDaily, getWordSearchDaily, peekWordSearchDaily, wordSearchLevelState,
  getLadderDaily, peekLadderDaily, ladderLevelState, WS_LEVELS, LADDER_LEVELS,
  crossword, codeword, spiral, jumble, cryptogram, picture,
  CODEWORD_GIVEN, SPIRAL_LEVELS, JUMBLE_LEVELS, CRYPTO_LEVELS,
} from './engine/session';
import { getStore } from './storage';

const typedCount = (e) => (e ? Object.values(e).filter(Boolean).length : 0);
const startedEntries = (s) => !!(s && !s.solved && typedCount(s.entries) > 0);
const startedFound = (s) => !!(s && !s.solved && s.found && Object.keys(s.found).length > 0);
// Merdivende otomatik dolan harfler "başlandı" sayılmasın
const startedLadder = (s) => {
  if (!s || s.solved || !s.entries) return false;
  const p = s.puzzle;
  const auto = p.hint ? (p.rungs.length - 2) * (p.len - 1) : 0;
  return typedCount(s.entries) > auto;
};
// Şifreli oyunlarda verilen harfler "başlandı" sayılmasın
const startedGiven = (s) => !!(s && !s.solved && typedCount(s.entries) > (s.puzzle.given || []).length);
// Şifreli Bulmaca kaydı: { committed: sayı->harf, cells: kare->geçici harf }
const startedCodeword = (s) => {
  if (!s || s.solved || !s.entries) return false;
  const e = s.entries;
  if (!e.committed) return typedCount(e) > (s.puzzle.given || []).length; // eski kayıt
  return Object.keys(e.cells || {}).length > 0 || Object.keys(e.committed).length > (s.puzzle.given || []).length;
};
const startedJumble =(s) => !!(s && !s.solved && s.entries?.slots && Object.values(s.entries.slots).some((a) => a.some((x) => x != null)));

const range = (lv) => (lv.mixed ? 'A1–C2 karışık' : lv.idx === 0 ? 'A1 kelimeleri' : `A1–${lv.id} kelimeleri`);
const fromStore = (st) => ({ getDaily: st.getDaily, peekDaily: st.peekDaily, levelState: st.levelState });

// origin: 'tr' Türk gazetelerinden, 'en' İngiliz ve Amerikan gazetelerinden
export const GAMES = [
  {
    id: 'arrow', route: 'puzzle', origin: 'tr', no: 'I', kicker: 'ARROWWORD', title: 'Çengel Bulmaca',
    deck: 'Gri karedeki Türkçe ipucunu oku, okun gösterdiği yöne İngilizcesini yaz.',
    howTo: [
      'Bir kareye dokun ve yaz; aynı kareye tekrar dokununca yön değişir.',
      'Kelime bitince renk söyler: yeşil doğru, sarı yakın, kırmızı yanlış.',
      'İpucu karesine iki kez dokun: kelime kartı açılır.',
    ],
    getDaily: getDailySession, peekDaily, levelState: (id) => getStore().levels[id] || null,
    started: startedEntries, levelInfo: (lv) => `${lv.subtitle} · ${range(lv)}`,
  },
  {
    id: 'crossword', route: 'crossword', origin: 'tr', no: 'II', kicker: 'KARE BULMACA', title: 'Kare Bulmaca',
    deck: 'Siyah kareli klasik bulmaca: numaralı Türkçe ipuçlarının İngilizcesini soldan sağa ve yukarıdan aşağı yaz.',
    howTo: [
      'Kareye dokun, klavyeden yaz; aynı kareye tekrar dokununca yön değişir.',
      'Ampuldeki "İpucu listesi" gazetedeki gibi tüm ipuçlarını numaralarıyla gösterir.',
      'Alttaki ipucu çubuğuna dokun: kelime kartı açılır.',
    ],
    ...fromStore(crossword), started: startedEntries, levelInfo: (lv) => `${lv.w}×${lv.h} ızgara · ${range(lv)}`,
  },
  {
    id: 'codeword', route: 'codeword', origin: 'tr', no: 'III', kicker: 'CODEWORD', title: 'Şifreli Bulmaca',
    deck: 'Her harfin yerinde bir sayı var. Aynı sayı her yerde aynı harf: şifreyi çöz, İngilizce kelimeleri ortaya çıkar.',
    howTo: [
      'Bir kareye dokun ve harfi yaz; aynı sayılı tüm karelere yerleşir.',
      'Altta 1–26 anahtar tablosu hangi sayıyı çözdüğünü gösterir.',
      'Bir kelimeyi tamamladığında Türkçesi üstte belirir.',
    ],
    ...fromStore(codeword), started: startedCodeword, levelInfo: (lv) => `${lv.w}×${lv.h} ızgara · ${CODEWORD_GIVEN[lv.id]} harf verilir`,
  },
  {
    id: 'spiral', route: 'spiral', origin: 'tr', no: 'V', kicker: 'SARMAL BULMACA', title: 'Sarmal Bulmaca',
    deck: 'Kelimeler bir sarmal boyunca dizilir; her kelime bir öncekinin son harfiyle başlar.',
    howTo: [
      'Sol üst köşeden başla, saat yönünde içeri doğru ilerle.',
      'İki kelime arasındaki harf ortaktır: birinin sonu, diğerinin başı.',
      'Kalın çizgiler sarmalın yolunu gösterir.',
    ],
    ...fromStore(spiral), started: startedEntries, levelInfo: (lv) => `${SPIRAL_LEVELS[lv.id]}×${SPIRAL_LEVELS[lv.id]} sarmal · ${range(lv)}`,
  },
  {
    id: 'ws', route: 'wordsearch', origin: 'en', no: 'VI', kicker: 'WORD SEARCH', title: 'Kelime Avı',
    deck: 'Harflerin arasına gizlenmiş İngilizce kelimeleri bul, parmağınla üzerini çiz.',
    howTo: [
      'Parmağını kelimenin ilk harfinden son harfine sürükle.',
      "A1'de liste İngilizce; üst seviyelerde Türkçesi verilir, İngilizcesini ararsın.",
      'Listedeki kelimeye dokun: kelime kartı açılır.',
    ],
    getDaily: getWordSearchDaily, peekDaily: peekWordSearchDaily, levelState: wordSearchLevelState, started: startedFound,
    levelInfo: (lv) => {
      const c = WS_LEVELS[lv.id];
      const dirs = { 2: 'yatay ve dikey', 3: 'çapraz dahil', 4: 'iki çapraz dahil', 6: 'ters yazılanlar dahil' }[c.dirs.length] || 'sekiz yön, tuzaklı';
      return `${c.w}×${c.h} · ${c.count} kelime · ${dirs} · ${c.list === 'en' ? 'İngilizce liste' : 'Türkçe ipucu'}`;
    },
  },
  {
    id: 'ladder', route: 'ladder', origin: 'en', no: 'VII', kicker: 'WORD LADDER', title: 'Kelime Merdiveni',
    deck: 'Her basamakta tek harfi değiştirerek başlangıç kelimesinden hedefe tırman.',
    howTo: [
      'Her basamağın solunda o kelimenin Türkçesi yazar.',
      'A1–B1 seviyelerinde değişecek harf okla gösterilir; yalnızca onu yazarsın.',
      'Üst seviyelerde hangi harfin değişeceğini sen bulursun.',
    ],
    getDaily: getLadderDaily, peekDaily: peekLadderDaily, levelState: ladderLevelState, started: startedLadder,
    levelInfo: (lv) => {
      const c = LADDER_LEVELS[lv.id];
      return `${c.lens.join('–')} harf · ${c.steps} adım · ${c.hint ? 'harf okla gösterilir' : 'oksuz'}`;
    },
  },
  {
    id: 'jumble', route: 'jumble', origin: 'en', no: 'VIII', kicker: 'JUMBLE', title: 'Karışık Harfler',
    deck: 'Harfleri karışmış İngilizce kelimeleri düzelt; daire içindeki harfler son bir bonus kelimeyi verir.',
    howTo: [
      'Karışık harflere dokunarak kelimeyi sırayla diz; kutuya dokunursan harf geri gelir.',
      'Her kelimenin Türkçesi ipucu olarak yazar.',
      'Daire içindeki harfler en alttaki bonus kelimenin taşları olur.',
    ],
    ...fromStore(jumble), started: startedJumble,
    levelInfo: (lv) => {
      const c = JUMBLE_LEVELS[lv.id];
      return `${c.count} kelime · ${c.minLen}–${c.maxLen} harf · ${c.bonusLen} harfli bonus`;
    },
  },
  {
    id: 'cryptogram', route: 'cryptogram', origin: 'en', no: 'IX', kicker: 'CRYPTOGRAM', title: 'Şifreli Cümle',
    deck: 'Bir İngilizce cümlenin her harfi başka bir harfle şifrelendi. Türkçesi ipucu: şifreyi çöz, cümleyi oku.',
    howTo: [
      'Şifreli harfe dokun ve gerçek harfi yaz; cümledeki tüm aynı harfler dolar.',
      'Üstteki Türkçe çeviri cümlenin anlamını verir.',
      'Çözünce cümlenin anahtar kelimesinin kartını açabilirsin.',
    ],
    ...fromStore(cryptogram), started: startedGiven,
    levelInfo: (lv) => {
      const c = CRYPTO_LEVELS[lv.id];
      return `${c.minChars}–${c.maxChars} harflik cümle · ${c.given} harf verilir`;
    },
  },
  {
    id: 'picture', route: 'picture', origin: 'en', no: 'X', kicker: 'RESİMLİ BULMACA', title: 'Resimli Bulmaca',
    deck: 'Gazetedeki gibi: çengel bulmacanın ortasında bir fotoğraf var. "Resimdeki nesne" ipucunun cevabı fotoğraftaki nesnenin İngilizcesi. Fotoğraflar Pexels\'ten gelir; internet gerekir.',
    howTo: [
      'Çengel bulmaca gibi oyna: ipucu karesindeki Türkçenin İngilizcesini okun yönüne yaz.',
      '"Resimdeki nesne" yazan ipucunun cevabı ortadaki fotoğraftır.',
      'Fotoğrafa dokunursan büyür.',
    ],
    ...fromStore(picture), started: startedEntries,
    levelInfo: (lv) => `${lv.w}×${lv.h} çengel · ortada resim · ${range(lv)}`,
  },
];

// Sayfa numaraları ve Romen rakamları sıraya göre: 1 ön sayfa, sonra oyunlar, en sonda arka sayfa
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
GAMES.forEach((g, i) => {
  g.page = i + 2;
  g.no = ROMAN[i];
});
export const BACK_PAGE = GAMES.length + 2;

// Kartlarda görünen kısa açıklamalar
const TAGLINES = {
  arrow: 'İpucunu çöz, kelimeyi bul.',
  crossword: 'Numaralı klasik bulmaca.',
  codeword: 'Sayıların harfini çöz.',
  spiral: 'Kelimeler sarmalda zincirlenir.',
  ws: 'Gizli kelimeleri bul, çiz.',
  ladder: 'Tek harf değiştir, tırman.',
  jumble: 'Karışık harfleri düzelt.',
  cryptogram: 'Şifreli cümleyi oku.',
  picture: 'Ortadaki resimdeki nesneyi bul.'
};
GAMES.forEach((g) => (g.tagline = TAGLINES[g.id] || ''));

export const getGame = (id) => GAMES.find((g) => g.id === id);
export { LEVELS };

export function gameTotals(game) {
  let solved = 0, inProgress = 0;
  for (const lv of LEVELS) {
    const st = game.levelState(lv.id);
    solved += st?.solvedCount || 0;
    if (game.started(st?.current)) inProgress++;
  }
  return { solved, inProgress };
}
