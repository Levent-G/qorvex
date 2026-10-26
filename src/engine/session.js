// Bulmaca oturumları: seviye başına tek aktif bulmaca, günün bulmacası, öğrenme takibi.
import { generatePuzzle, mulberry32 } from './generator';
import { generateSwedish } from './swedish';
import { generateWordSearch } from './wordsearch';
import { generateLadder } from './ladder';
import { makeBlockPuzzle, makeCodeword, pickHiddenSentence } from './gridgames';
import { generateSpiral, generateJumble, generateCryptogram } from './wordgames';
import { WORDS } from './words';
import { buildInputs as buildPoolInputs, recordAnswersTo, TWO_LETTER_COOLDOWN } from './pool';
import { findPhoto, photoCache } from '../services/pexels';
import { photoBlock } from './picture';
import { wordOfDay, isoWeek } from './practice';
import { fillerEntries } from './fillers';
import { newlyEarned, badgeList, PUZZLE_GAMES } from './badges';
import { getStore, persist } from '../storage';

export const LEVELS = [
  { id: 'A1', idx: 0, title: 'Başlangıç', subtitle: 'Beginner', w: 8, h: 10 },
  { id: 'A2', idx: 1, title: 'Temel', subtitle: 'Elementary', w: 8, h: 10 },
  { id: 'B1', idx: 2, title: 'Orta', subtitle: 'Intermediate', w: 9, h: 11 },
  { id: 'B2', idx: 3, title: 'Orta Üstü', subtitle: 'Upper Intermediate', w: 9, h: 11 },
  { id: 'C1', idx: 4, title: 'İleri', subtitle: 'Advanced', w: 9, h: 11 },
  { id: 'C2', idx: 5, title: 'Uzman', subtitle: 'Proficiency', w: 9, h: 11 },
  { id: 'MIX', idx: 5, title: 'Karışık', subtitle: 'Mixed Bag', w: 9, h: 11, mixed: true },
];
export const getLevel = (id) => LEVELS.find((l) => l.id === id);

export const LEARN_LIMIT = 5; // bir bulmacada açılabilecek kelime kartı
const yieldFn = () => new Promise((r) => setTimeout(r, 0));

// Havuz kuralları engine/pool.js'de (simülasyonla aynı kod)
const buildInputs = (level, learn, withPrio, strict = false) => buildPoolInputs(WORDS, level, learn, withPrio, strict);
// Çengel bulmacalarda öğrenilecek kelimelerle dolmayan köşeler için kısa dolgu kelimeleri (istatistiğe sayılmaz)
const FILLERS = fillerEntries(WORDS);
const realAnswers = (clues) => clues.filter((k) => !k.filler).map((k) => k.answer);
// Dolgu olarak kullanılan kısa kelimeler istatistiğe sayılmaz ama dönüşüm için ayrı izlenir
// İki harfli kelime (gerçek ya da dolgu, fark etmez) son geldiği bulmacadan sonra en az 5 bulmaca dinlenir:
// en erken 6. bulmacada yeniden gelebilir. (pool.js'deki gerçek kelime kuralıyla aynı sayaç)
const twoRested = (a) => {
  const learn = getStore().learn;
  const last = Math.max(learn.recent[a] ?? -1e9, (learn.fillerRecent || {})[a] ?? -1e9);
  return learn.counter - last >= TWO_LETTER_COOLDOWN;
};
const restOk = (f) => f.a.length > 2 || twoRested(f.a);
function fillersNow() {
  return FILLERS.filter(restOk);
}
function recordFillers(clues) {
  const learn = getStore().learn;
  const fr = learn.fillerRecent || (learn.fillerRecent = {});
  for (const k of clues) if (k.filler) fr[k.answer] = learn.counter;
}

function newSession(puzzle) {
  return { puzzle, entries: {}, revealed: {}, seconds: 0, solved: false, opened: [] };
}

// Çengel bulmaca boyutu: 6x9'da boşluksuz (sıfır boş kare) üretici her seferinde ~1 sn'de bulur
export const ARROW_SIZE = { w: 6, h: 9 };
async function makePuzzle(level, seed, withPrio, strict = true, size = ARROW_SIZE) {
  const store = getStore();
  const { entries, dict, prio } = buildInputs(level, store.learn, withPrio, strict);
  const fillers = fillersNow();
  // 1) boşluksuz üretici (İsveç tipi): her kare harf ya da ipucu
  const p = await generateSwedish({ w: size.w, h: size.h, entries, fillers, prio, seed, timeMs: 1500, maxTwo: 4, yieldFn });
  if (p) return p;
  // 1b) havuz daralmışsa: seviyedeki görülmüş kelimeler de dolgu olarak (istatistiğe sayılmaz) — yine boşluksuz
  const seenAsFill = buildInputs(level, store.learn, false, false).entries.map((e) => ({ a: e.a, c: e.c, filler: true })).filter(restOk);
  const p2 = await generateSwedish({ w: size.w, h: size.h, entries, fillers: [...fillers, ...seenAsFill], prio, seed: seed ^ 0x5bd1e995, timeMs: 3000, maxTwo: 5, yieldFn });
  if (p2) return p2;
  // 1c) son boşluksuz deneme: öncelik zorunluluğu yok, biraz daha fazla iki harfliye izin (dinlenme kuralı yine geçerli)
  const p3 = await generateSwedish({ w: size.w, h: size.h, entries, fillers: [...fillers, ...seenAsFill], prio: undefined, seed: seed ^ 0x27d4eb2f, timeMs: 3000, maxTwo: 6, yieldFn });
  if (p3) return p3;
  // 2) yedek: eski üretici (nadiren; boş kare kalabilir)
  return generatePuzzle({ w: size.w, h: size.h, entries, dict, prio, seed, budgetMs: 1600, restarts: 5, yieldFn, fillers });
}

function recordAppearance(puzzle) {
  recordAnswers(realAnswers(puzzle.clues));
  recordFillers(puzzle.clues);
}

// Bir oyunda çıkan kelimeleri kaydet (tüm oyunlar ortak kelime defterini kullanır)
function recordAnswers(answers) {
  recordAnswersTo(getStore().learn, answers);
}

// Sonraki seviye bulmacası, oyuncu mevcut bulmacayı çözerken arka planda hazırlanır ("Sonraki" anında açılsın).
// Yalnızca bellekte tutulur; kelimeler bulmaca kullanılınca kaydedilir.
const prefetched = new Map(); // levelId -> { at: learn.counter, job: Promise<puzzle | null> }
export function prefetchLevel(levelId) {
  if (prefetched.has(levelId)) return;
  const level = getLevel(levelId);
  if (!level) return;
  const st = getStore().levels[levelId];
  const seed = (Date.now() ^ (((st && st.no) || 0) + 1) * 7919) >>> 0;
  prefetched.set(levelId, { at: getStore().learn.counter, job: makePuzzle(level, seed, true).catch(() => null) });
}

export async function getLevelSession(levelId, forceNew = false) {
  const store = getStore();
  const level = getLevel(levelId);
  const st = store.levels[levelId] || (store.levels[levelId] = { no: 0, solvedCount: 0, current: null });
  if (st.current && !forceNew) return st.current;
  let puzzle = null;
  if (prefetched.has(levelId)) {
    const pf = prefetched.get(levelId);
    prefetched.delete(levelId);
    puzzle = await pf.job; // arka planda hazırlanan
    // hazırlandıktan sonra bu kelimelerden biri başka bir oyunda geldiyse kullanma (tekrar kuralı)
    const recent = getStore().learn.recent;
    if (puzzle && puzzle.clues.some((k) => !k.filler && (recent[k.answer] ?? -1) > pf.at)) puzzle = null;
  }
  if (!puzzle) puzzle = await makePuzzle(level, (Date.now() ^ (st.no * 7919)) >>> 0, true);
  recordAppearance(puzzle);
  st.no++;
  puzzle.no = st.no;
  st.current = newSession(puzzle);
  persist();
  return st.current;
}

const todayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export async function getDailySession() {
  const store = getStore();
  const key = todayKey();
  if (store.daily && store.daily.date === key) return store.daily;
  const level = getLevel('MIX');
  const seed = key.split('').reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 17);
  const puzzle = await makePuzzle(level, seed, false);
  const start = new Date(new Date().getFullYear(), 0, 0);
  puzzle.no = Math.floor((Date.now() - start) / 86400000);
  store.daily = { ...newSession(puzzle), date: key };
  persist();
  return store.daily;
}

export function peekDaily() {
  const d = getStore().daily;
  return d && d.date === todayKey() ? d : null;
}

export function markSolved(kind, levelId) {
  const store = getStore();
  recordSolve(kind, levelId, 'arrow', kind === 'level' ? store.levels[levelId]?.current : store.daily);
  if (kind === 'level') {
    const st = store.levels[levelId];
    if (st) st.solvedCount = (st.solvedCount || 0) + 1;
  }
  persist();
}

// Kelime kartı açıldı: kelimeyi işaretle (sonraki bulmacalarda sık gelir)
export function markLearned(answer) {
  const learn = getStore().learn;
  // zaten defterdeyse ilerlemesi sıfırlanmasın (yoksa kartı her açışta en sık tekrara döner)
  if (!learn.marked[answer]) learn.marked[answer] = { at: Date.now(), seen: 0, last: learn.counter };
  recordHard(answer, 'card'); // kartını açmak: kelimeyi bilmiyordu
  persist();
}

export function markedCount() {
  return Object.keys(getStore().learn.marked).length;
}

// ---------------- Kelime Avı ----------------
// A1'de liste İngilizce, üst seviyelerde Türkçe (kullanıcı İngilizcesini arar)
export const WS_LEVELS = {
  A1: { w: 9, h: 11, count: 9, dirs: ['E', 'S', 'SE'], list: 'en', decoys: 3, lure: 0.4 },
  A2: { w: 10, h: 12, count: 11, dirs: ['E', 'S', 'SE', 'NE'], list: 'tr', decoys: 4, lure: 0.5 },
  B1: { w: 10, h: 12, count: 12, dirs: ['E', 'S', 'SE', 'NE', 'W', 'N'], list: 'tr', decoys: 5, lure: 0.55 },
  B2: { w: 10, h: 12, count: 14, dirs: ['E', 'S', 'SE', 'NE', 'W', 'N', 'NW', 'SW'], list: 'tr', decoys: 6, lure: 0.6 },
  C1: { w: 11, h: 13, count: 15, dirs: ['E', 'S', 'SE', 'NE', 'W', 'N', 'NW', 'SW'], list: 'tr', decoys: 7, lure: 0.65 },
  C2: { w: 11, h: 13, count: 16, dirs: ['E', 'S', 'SE', 'NE', 'W', 'N', 'NW', 'SW'], list: 'tr', decoys: 8, lure: 0.7 },
  MIX: { w: 11, h: 13, count: 15, dirs: ['E', 'S', 'SE', 'NE', 'W', 'N', 'NW', 'SW'], list: 'tr', decoys: 7, lure: 0.65 },
};

function wsStore() {
  const store = getStore();
  return store.ws || (store.ws = { levels: {}, daily: null });
}

function newWsSession(puzzle) {
  return { puzzle, found: {}, hinted: {}, seconds: 0, solved: false, opened: [] };
}

function makeWordSearch(levelId, seed, withPrio) {
  const level = getLevel(levelId);
  const cfg = WS_LEVELS[levelId];
  const { entries, prio } = buildInputs(level, getStore().learn, withPrio);
  const p = generateWordSearch({ ...cfg, entries, prio, seed });
  p.list = cfg.list;
  return p;
}

export async function getWordSearchSession(levelId, forceNew = false) {
  const ws = wsStore();
  const st = ws.levels[levelId] || (ws.levels[levelId] = { no: 0, solvedCount: 0, current: null });
  if (st.current && !forceNew) return st.current;
  await yieldFn();
  const puzzle = makeWordSearch(levelId, (Date.now() ^ (st.no * 104729)) >>> 0, true);
  recordAnswers(puzzle.words.map((x) => x.answer));
  st.no++;
  puzzle.no = st.no;
  st.current = newWsSession(puzzle);
  persist();
  return st.current;
}

export async function getWordSearchDaily() {
  const ws = wsStore();
  const key = todayKey();
  if (ws.daily && ws.daily.date === key) return ws.daily;
  await yieldFn();
  const seed = ('ws' + key).split('').reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 23);
  const puzzle = makeWordSearch('MIX', seed, false);
  const start = new Date(new Date().getFullYear(), 0, 0);
  puzzle.no = Math.floor((Date.now() - start) / 86400000);
  ws.daily = { ...newWsSession(puzzle), date: key };
  persist();
  return ws.daily;
}

export function peekWordSearchDaily() {
  const d = wsStore().daily;
  return d && d.date === todayKey() ? d : null;
}

export function markWordSearchSolved(kind, levelId) {
  recordSolve(kind, levelId, 'ws', kind === 'level' ? wsStore().levels[levelId]?.current : wsStore().daily);
  if (kind === 'level') {
    const st = wsStore().levels[levelId];
    if (st) st.solvedCount = (st.solvedCount || 0) + 1;
  }
  persist();
}

export function wordSearchLevelState(levelId) {
  return wsStore().levels[levelId] || null;
}
// ---------------- Kelime Merdiveni ----------------
// hint: değişecek harfin sütununu okla göster (alt seviyeler)
export const LADDER_LEVELS = {
  A1: { lens: [3], steps: 4, hint: true },
  A2: { lens: [3, 4], steps: 4, hint: true },
  B1: { lens: [4], steps: 5, hint: true },
  B2: { lens: [4], steps: 5, hint: false },
  C1: { lens: [4, 5], steps: 5, hint: false },
  C2: { lens: [4, 5], steps: 6, hint: false },
  MIX: { lens: [4, 5], steps: 5, hint: false },
};

function ladderStore() {
  const store = getStore();
  return store.ladder || (store.ladder = { levels: {}, daily: null });
}

function newLadderSession(puzzle) {
  return { puzzle, entries: {}, revealed: {}, seconds: 0, solved: false, opened: [] };
}

function makeLadder(levelId, seed, withPrio) {
  const level = getLevel(levelId);
  const cfg = LADDER_LEVELS[levelId];
  const { entries, prio } = buildInputs(level, getStore().learn, withPrio);
  const p = generateLadder({ lens: cfg.lens, steps: cfg.steps, entries, prio, seed });
  p.hint = cfg.hint;
  return p;
}

export async function getLadderSession(levelId, forceNew = false) {
  const ls = ladderStore();
  const st = ls.levels[levelId] || (ls.levels[levelId] = { no: 0, solvedCount: 0, current: null });
  if (st.current && !forceNew) return st.current;
  await yieldFn();
  const puzzle = makeLadder(levelId, (Date.now() ^ (st.no * 15485863)) >>> 0, true);
  recordAnswers(puzzle.rungs.map((x) => x.answer));
  st.no++;
  puzzle.no = st.no;
  st.current = newLadderSession(puzzle);
  persist();
  return st.current;
}

export async function getLadderDaily() {
  const ls = ladderStore();
  const key = todayKey();
  if (ls.daily && ls.daily.date === key) return ls.daily;
  await yieldFn();
  const seed = ('ladder' + key).split('').reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 29);
  const puzzle = makeLadder('B1', seed, false);
  const start = new Date(new Date().getFullYear(), 0, 0);
  puzzle.no = Math.floor((Date.now() - start) / 86400000);
  ls.daily = { ...newLadderSession(puzzle), date: key };
  persist();
  return ls.daily;
}

export function peekLadderDaily() {
  const d = ladderStore().daily;
  return d && d.date === todayKey() ? d : null;
}

export function markLadderSolved(kind, levelId) {
  recordSolve(kind, levelId, 'ladder', kind === 'level' ? ladderStore().levels[levelId]?.current : ladderStore().daily);
  if (kind === 'level') {
    const st = ladderStore().levels[levelId];
    if (st) st.solvedCount = (st.solvedCount || 0) + 1;
  }
  persist();
}

export function ladderLevelState(levelId) {
  return ladderStore().levels[levelId] || null;
}
// ================= Yeni oyunlar: ortak oturum fabrikası =================
// Her oyun: seviye başına tek aktif bulmaca + günün bulmacası + ortak kelime defteri.
function makeGameStore(storeKey, { make, answersOf, dailyLevel = 'MIX', salt, strict = false, gameId = storeKey }) {
  const st = () => {
    const store = getStore();
    return store[storeKey] || (store[storeKey] = { levels: {}, daily: null });
  };
  const fresh = (puzzle) => ({ puzzle, entries: {}, revealed: {}, seconds: 0, solved: false, opened: [] });
  return {
    async getSession(levelId, forceNew = false) {
      const gs = st();
      const ls = gs.levels[levelId] || (gs.levels[levelId] = { no: 0, solvedCount: 0, current: null });
      if (ls.current && !forceNew) return ls.current;
      await yieldFn();
      const level = getLevel(levelId);
      const inputs = buildInputs(level, getStore().learn, true, strict);
      const puzzle = await make(levelId, (Date.now() ^ (ls.no * salt)) >>> 0, inputs);
      recordAnswers(answersOf(puzzle));
      if (puzzle.clues) recordFillers(puzzle.clues);
      ls.no++;
      puzzle.no = ls.no;
      ls.current = fresh(puzzle);
      persist();
      return ls.current;
    },
    async getDaily() {
      const gs = st();
      const key = todayKey();
      if (gs.daily && gs.daily.date === key) return gs.daily;
      await yieldFn();
      const seed = (storeKey + key).split('').reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 31);
      const inputs = buildInputs(getLevel(dailyLevel), getStore().learn, false, strict);
      const puzzle = await make(dailyLevel, seed, inputs);
      const start = new Date(new Date().getFullYear(), 0, 0);
      puzzle.no = Math.floor((Date.now() - start) / 86400000);
      gs.daily = { ...fresh(puzzle), date: key };
      persist();
      return gs.daily;
    },
    peekDaily() {
      const d = st().daily;
      return d && d.date === todayKey() ? d : null;
    },
    markSolved(kind, levelId) {
      recordSolve(kind, levelId, gameId, kind === 'level' ? st().levels[levelId]?.current : st().daily);
      if (kind === 'level') {
        const ls = st().levels[levelId];
        if (ls) ls.solvedCount = (ls.solvedCount || 0) + 1;
      }
      persist();
    },
    levelState(levelId) {
      return st().levels[levelId] || null;
    },
  };
}

const gridSize = (levelId) => {
  const lv = getLevel(levelId);
  return { w: lv.w, h: lv.h };
};

// ---- Resimli Bulmaca: gazetedeki gibi ortasında fotoğraf olan çengel ("Resimdeki nesne ne?") ----
// Önce fotoğrafı olan bir isim seçilir (Pexels), sonra o kelime öncelikli olarak çengel üretilir;
// kelimenin ipucu karesinde "Resimdeki nesne" yazar, fotoğraf ızgaranın ortasındaki alanda durur.
const NOUNS = new Set(WORDS.filter((w) => w.p === 'noun').map((w) => w.a));
// 'picture3': önceki biçimlerin kayıtları yeni ekranda açılmasın
export const picture = makeGameStore('picture3', {
  gameId: 'picture',
  strict: true,
  salt: 2246822519,
  make: async (levelId, seed, { entries, dict, prio }) => {
    const level = getLevel(levelId);
    const cache = photoCache();
    const block = photoBlock(level.w, level.h);
    // aday isimler: fotoğrafı bilinenler önce, sonra rastgele (fotoğrafı olmadığı bilinenler hariç)
    const rand = mulberry32(seed);
    const cands = entries
      .filter((e) => NOUNS.has(e.a) && e.a.length >= 4 && e.a.length <= Math.min(7, level.w - 1) && cache[e.a] !== null)
      .map((e) => ({ e, s: (cache[e.a] ? 10 : 0) + rand() * 10 }))
      .sort((x, y) => y.s - x.s)
      .map((x) => x.e);
    const tried = new Set();
    for (let attempt = 0; attempt < 3; attempt++) {
      // fotoğrafı olan bir isim bul (en fazla 8 sorgu)
      let target = null, photo = null;
      for (const c of cands) {
        if (tried.has(c.a)) continue;
        tried.add(c.a);
        photo = await findPhoto(c.a);
        if (photo) {
          target = c;
          break;
        }
        if (tried.size >= 8 * (attempt + 1)) break;
      }
      if (!target) break;
      const pr = new Set([...(prio || []), target.a]);
      for (let t = 0; t < 2; t++) {
        const p = await generatePuzzle({
          w: level.w, h: level.h, entries, dict, prio: pr, seed: (seed + attempt * 7919 + t * 104729) >>> 0,
          budgetMs: 1600, restarts: 4, blocks: [block], yieldFn, fillers: fillersNow(),
        });
        const clue = p.clues.find((k) => k.answer === target.a);
        if (!clue) continue;
        clue.tr = clue.text;
        clue.text = 'Resimdeki nesne';
        p.photo = { ...block, ...photo, answer: target.a, tr: target.c };
        return p;
      }
    }
    throw new Error('Resimli bulmaca hazırlanamadı. İnternet bağlantını kontrol edip tekrar dene.');
  },
  answersOf: (p) => realAnswers(p.clues),
});

// ---- Kare Bulmaca (klasik çapraz bulmaca) ----
export const crossword = makeGameStore('crossword', {
  strict: true,
  salt: 2654435761,
  make: (levelId, seed, { entries, dict, prio }) => makeBlockPuzzle({ ...gridSize(levelId), entries, dict, prio, seed, yieldFn }),
  answersOf: (p) => p.words.map((x) => x.answer),
});

// ---- Şifreli Bulmaca (Codeword) ----
export const CODEWORD_GIVEN = { A1: 4, A2: 3, B1: 3, B2: 2, C1: 2, C2: 2, MIX: 2 };
export const codeword = makeGameStore('codeword', {
  strict: true,
  salt: 40503,
  make: async (levelId, seed, { entries, dict, prio }) => {
    const p = makeCodeword(await makeBlockPuzzle({ ...gridSize(levelId), entries, dict, prio, seed, yieldFn }), seed, CODEWORD_GIVEN[levelId]);
    // gizli cümle: bulmaca bitince alttaki şeritte okunur
    p.hidden = pickHiddenSentence(p, WORDS, dict, seed);
    return p;
  },
  answersOf: (p) => p.words.map((x) => x.answer),
});

// ---- Sarmal Bulmaca ----
export const SPIRAL_LEVELS = { A1: 5, A2: 6, B1: 6, B2: 6, C1: 7, C2: 7, MIX: 7 };
export const spiral = makeGameStore('spiral', {
  salt: 1103515245,
  make: (levelId, seed, { entries, prio }) =>
    generateSpiral({ n: SPIRAL_LEVELS[levelId], minLen: 3, maxLen: levelId === 'A1' ? 6 : 7, entries, prio, seed }),
  answersOf: (p) => p.words.map((x) => x.answer),
});

// ---- Jumble (Karışık Harfler) ----
export const JUMBLE_LEVELS = {
  A1: { count: 4, minLen: 4, maxLen: 5, bonusLen: 4 },
  A2: { count: 4, minLen: 4, maxLen: 5, bonusLen: 5 },
  B1: { count: 5, minLen: 5, maxLen: 6, bonusLen: 6 },
  B2: { count: 5, minLen: 5, maxLen: 6, bonusLen: 6 },
  C1: { count: 5, minLen: 5, maxLen: 7, bonusLen: 7 },
  C2: { count: 5, minLen: 6, maxLen: 7, bonusLen: 7 },
  MIX: { count: 5, minLen: 5, maxLen: 7, bonusLen: 6 },
};
export const jumble = makeGameStore('jumble', {
  salt: 22695477,
  make: (levelId, seed, { entries, prio }) => generateJumble({ ...JUMBLE_LEVELS[levelId], entries, prio, seed }),
  answersOf: (p) => [...p.words.map((x) => x.answer), p.bonus.answer],
});

// ---- Cryptogram (Şifreli Cümle) ----
export const CRYPTO_LEVELS = {
  A1: { minChars: 15, maxChars: 30, given: 3 },
  A2: { minChars: 18, maxChars: 35, given: 3 },
  B1: { minChars: 22, maxChars: 45, given: 2 },
  B2: { minChars: 26, maxChars: 55, given: 2 },
  C1: { minChars: 30, maxChars: 65, given: 1 },
  C2: { minChars: 35, maxChars: 80, given: 1 },
  MIX: { minChars: 25, maxChars: 60, given: 2 },
};
export const cryptogram = makeGameStore('cryptogram', {
  salt: 134775813,
  make: (levelId, seed, { dict, prio }) => {
    const learn = getStore().learn;
    const recent = new Set(Object.entries(learn.recent).filter(([, n]) => learn.counter - n < 8).map(([a]) => a));
    return generateCryptogram({ ...CRYPTO_LEVELS[levelId], words: WORDS, allowed: new Set(dict.keys()), prio, recent, seed });
  },
  answersOf: (p) => [p.word],
});

// ---------------- Kayıtlı bulmacalardaki ipuçlarını güncelle ----------------
// Kelime listesindeki Türkçe ipuçları düzeltildiğinde yarım kalan bulmacalar da yeni ipucunu göstersin.
// Bulmaca nesnelerinde { answer, text | clue } çiftlerini ve şifreli cümlenin { word, wordClue } alanını tarar.
export function refreshStoredClues() {
  const byAnswer = new Map(WORDS.map((w) => [w.a, w.c]));
  const seen = new Set();
  const walk = (o) => {
    if (!o || typeof o !== 'object' || seen.has(o)) return;
    seen.add(o);
    if (typeof o.answer === 'string' && byAnswer.has(o.answer)) {
      const c = byAnswer.get(o.answer);
      // resimli çengelde "Resimdeki nesne" ipucu (tr alanı olan) Türkçeyle değiştirilmesin
      if (typeof o.text === 'string' && !o.tr) o.text = c;
      else if (typeof o.tr === 'string') o.tr = c;
      if (typeof o.clue === 'string') o.clue = c;
    }
    if (typeof o.word === 'string' && typeof o.wordClue === 'string' && byAnswer.has(o.word)) o.wordClue = byAnswer.get(o.word);
    for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v);
  };
  const store = getStore();
  // öğrenme kayıtları (learn) büyük ve ipucu içermez; atla
  for (const [k, v] of Object.entries(store)) if (k !== 'learn') walk(v);
}
// ================= Günlük seri, profil ve istatistikler =================
function statsStore() {
  const store = getStore();
  return store.stats || (store.stats = { streak: 0, best: 0, lastDay: null, total: 0, byDay: {} });
}
function profileStore() {
  const store = getStore();
  return store.profile || (store.profile = { level: 'A1' });
}
const dayDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const isoDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Çözülen bulmacadaki kelimeler (oyun türüne göre; dolgu kelimeler hariç) — "karşılaşılan kelime" istatistiği
function solvedAnswers(p) {
  if (!p) return [];
  if (Array.isArray(p.clues)) return realAnswers(p.clues);
  if (Array.isArray(p.rungs)) return p.rungs.map((x) => x.answer);
  const out = Array.isArray(p.words) ? p.words.map((x) => x.answer) : [];
  if (p.bonus && p.bonus.answer) out.push(p.bonus.answer);
  if (p.word) out.push(p.word);
  return out;
}

// Bir bulmaca çözüldüğünde: toplam, günlük seri, seviye ilerlemesi ve oyun başına süre/ipucu
export function recordSolve(kind, levelId, gameId, session) {
  const st = statsStore();
  if (gameId) {
    const games = st.games || (st.games = {});
    const g = games[gameId] || (games[gameId] = { solved: 0, fastest: null, totalSec: 0, timed: 0, recent: [] });
    g.solved++;
    const sec = session && session.seconds;
    if (sec > 0) {
      g.fastest = g.fastest == null ? sec : Math.min(g.fastest, sec);
      g.totalSec += sec;
      g.timed++;
      g.recent = [...(g.recent || []), sec].slice(-10);
      st.recentAll = [...(st.recentAll || []), sec].slice(-10); // tüm oyunlarda son 10 çözüm
    }
    // karşılaşılan kelimeler: yalnızca çözülen bulmacalardan
    const wmap = st.words || (st.words = {});
    if (!st.wordsSince) st.wordsSince = isoDay();
    for (const a of solvedAnswers(session && session.puzzle)) wmap[a] = (wmap[a] || 0) + 1;
    // ipucusuz çözüm: hiç kare/harf açılmadıysa
    const opened = session && session.revealed ? Object.keys(session.revealed).length : 0;
    if (session && !opened && !session.hinted) st.clean = (st.clean || 0) + 1;
  }
  const today = isoDay();
  st.total = (st.total || 0) + 1;
  st.byDay[today] = (st.byDay[today] || 0) + 1;
  if (st.lastDay !== today) {
    st.streak = st.lastDay && dayDiff(st.lastDay, today) === 1 ? st.streak + 1 : 1;
    st.lastDay = today;
  }
  st.best = Math.max(st.best || 0, st.streak);
  if (kind === 'level' && levelId) {
    st.levelSolved = st.levelSolved || {};
    st.levelSolved[levelId] = (st.levelSolved[levelId] || 0) + 1;
    maybePromote(levelId, st.levelSolved[levelId]);
  }
  persist();
}

// Kendi seviyesinde hedefe ulaşınca profil seviyesi otomatik bir üste geçer (her seviye için bir kez).
// Ana Sayfa'daki tebrik kartı için profile.promoted doldurulur.
const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
function maybePromote(levelId, solvedCount) {
  const pr = profileStore();
  if (levelId !== pr.level || solvedCount < LEVEL_GOAL) return;
  const done = pr.completed || (pr.completed = {});
  if (done[levelId]) return; // bu seviyeyi zaten bitirmişti; bilerek geri döndüyse tekrar atlatma
  done[levelId] = true;
  const next = LEVEL_ORDER[LEVEL_ORDER.indexOf(levelId) + 1];
  pr.promoted = { from: levelId, to: next || null };
  if (next) pr.level = next;
}

// Ana Sayfa tebrik kartı: gösterilecek seviye atlama (varsa) ve kapatma
export function getPromotion() {
  return profileStore().promoted || null;
}
export function clearPromotion() {
  delete profileStore().promoted;
  persist();
}

// İpucu kullanımı (Harf aç / Kelime aç). type: 'letter' | 'word'
export function recordHint(type, session) {
  if (session) session.hinted = true; // bu bulmaca ipucusuz sayılmasın
  const st = statsStore();
  const h = st.hints || (st.hints = { letter: 0, word: 0 });
  h[type] = (h[type] || 0) + 1;
  persist();
}

// İstatistikler sekmesi için ayrıntılı özet
export function getDetailedStats() {
  const st = statsStore();
  const learn = getStore().learn;
  // karşılaşılan = çözülen bulmacalardaki kelimeler (üretilip çözülmeyenler sayılmaz)
  const wmap = st.words || {};
  const seenCount = Object.keys(wmap).length;
  const encounters = Object.values(wmap).reduce((a, b) => a + b, 0);
  const marked = Object.values(learn.marked || {});
  const sumDays = (from, to) => {
    let n = 0;
    for (let i = from; i < to; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      n += st.byDay[isoDay(d)] || 0;
    }
    return n;
  };
  // ortalama süre: tüm oyunlarda son 10 çözüm ile tüm zamanlar
  let allSum = 0, allN = 0;
  for (const g of Object.values(st.games || {})) {
    allSum += g.totalSec || 0;
    allN += g.timed || 0;
  }
  const recentList = st.recentAll || [];
  const recentSum = recentList.reduce((a, b) => a + b, 0), recentN = recentList.length;
  return {
    games: st.games || {},
    hints: st.hints || { letter: 0, word: 0 },
    clean: st.clean || 0,
    total: st.total || 0,
    seenWords: seenCount,
    wordsSince: st.wordsSince || null,
    encounters,
    notebook: marked.length,
    learned: marked.filter((m) => (m.seen || 0) >= 3).length,
    thisWeek: sumDays(0, 7),
    lastWeek: sumDays(7, 14),
    activeDays: Object.values(st.byDay || {}).filter((n) => n > 0).length,
    avgRecent: recentN ? recentSum / recentN : null,
    avgAll: allN ? allSum / allN : null,
    levelSolved: st.levelSolved || {},
  };
}

// Seri: dün ya da bugün çözülmediyse 0 görünür
export function getStats() {
  const st = statsStore();
  const today = isoDay();
  const alive = st.lastDay && dayDiff(st.lastDay, today) <= 1;
  return {
    streak: alive ? st.streak : 0,
    best: st.best || 0,
    total: st.total || 0,
    solvedToday: st.byDay[today] || 0,
    levelSolved: st.levelSolved || {},
    week: Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { day: d.getDay(), count: st.byDay[isoDay(d)] || 0 };
    }),
  };
}

export const LEVEL_GOAL = 50; // bir seviyede hedef bulmaca sayısı
export function getProfile() {
  return profileStore();
}
export function setProfileLevel(levelId) {
  profileStore().level = levelId;
  persist();
}

// Kelime defteri: kartı açılmış kelimeler (en yeni önce)
export function notebookWords() {
  const learn = getStore().learn;
  return Object.entries(learn.marked)
    .map(([answer, m]) => ({ answer, at: m.at || 0, seen: m.seen || 0, last: m.last }))
    .sort((a, b) => b.at - a.at);
}
export function removeFromNotebook(answer) {
  delete getStore().learn.marked[answer];
  persist();
}

// ================= Zor kelimeler =================
// Bir kelimede zorlanma işaretleri: harf/kelime açma (hint), yanlış/eksik tamamlama (miss),
// kelime kartını açma (card), tekrar modunda yanlış (quiz). Tekrar modunda doğru bilmek (ok) puanı düşürür.
const HARD_W = { hint: 2, miss: 2, card: 1, quiz: 3 };
function hardStore() {
  const learn = getStore().learn;
  return learn.hard || (learn.hard = {});
}
export function recordHard(answer, kind) {
  if (!answer || !HARD_W[kind]) return;
  const h = hardStore();
  const e = h[answer] || (h[answer] = { hint: 0, miss: 0, card: 0, quiz: 0, ok: 0, at: 0 });
  e[kind] = (e[kind] || 0) + 1;
  e.at = Date.now();
  persist();
}
const hardScore = (e) => Object.entries(HARD_W).reduce((a, [k, w]) => a + (e[k] || 0) * w, 0) - (e.ok || 0) * 3;
// Zor kelimeler: puanı en yüksekten (eşitlikte en yeni), en az 2 puanlılar
export function hardWords() {
  return Object.entries(hardStore())
    .map(([answer, e]) => ({ answer, score: hardScore(e), ...e }))
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score || b.at - a.at);
}

// Tekrar modu sonucu: doğru bilinen defter kelimesi tekrar sayısında ilerler, yanlış bilinen geri düşer ve zorlara eklenir
export function recordReview(answer, correct) {
  const learn = getStore().learn;
  const m = learn.marked[answer];
  if (correct) {
    if (m) {
      m.seen = (m.seen || 0) + 1;
      m.last = learn.counter;
    }
    const h = hardStore()[answer];
    if (h) h.ok = (h.ok || 0) + 1;
  } else {
    if (m) m.seen = Math.max(0, (m.seen || 0) - 1);
    recordHard(answer, 'quiz');
  }
  persist();
}

// ================= Alıştırma modları: tekrar turu, zamana karşı, telaffuz, günün kelimesi =================
function extraStore() {
  const store = getStore();
  const x = store.extra || (store.extra = {});
  x.review = x.review || { sessions: 0, perfect: 0 };
  x.ta = x.ta || { best: 0, plays: 0 };
  x.pron = x.pron || { ok: 0, tries: 0 };
  x.wotd = x.wotd || { days: {} };
  x.weekly = x.weekly || { done: {} };
  return x;
}
export function getExtra() {
  return extraStore();
}

export function recordReviewSession(score, total) {
  const r = extraStore().review;
  r.sessions++;
  if (total > 0 && score === total) r.perfect++;
  persist();
}

// Zamana karşı: rekor güncellenirse isRecord
export function recordTimeAttack(score) {
  const t = extraStore().ta;
  t.plays++;
  const isRecord = score > t.best;
  if (isRecord) t.best = score;
  persist();
  return { best: t.best, isRecord };
}

export function recordPronunciation(answer, ok) {
  const p = extraStore().pron;
  p.tries++;
  if (ok) p.ok++;
  else recordHard(answer, 'miss');
  persist();
}

// Günün kelimesi (profil seviyesinde, tarihe göre sabit). Görüldüğü gün kaydedilir (rozet için).
export function getWordOfDay() {
  const lv = getLevel(profileStore().level) || LEVELS[0];
  const w = wordOfDay(WORDS, lv.mixed ? 3 : lv.idx, isoDay());
  return w;
}
export function markWordOfDaySeen() {
  const x = extraStore();
  const day = isoDay();
  if (!x.wotd.days[day]) {
    x.wotd.days[day] = getWordOfDay().a;
    persist();
  }
}
export function addToNotebook(answer) {
  const learn = getStore().learn;
  if (!learn.marked[answer]) learn.marked[answer] = { at: Date.now(), seen: 0, last: learn.counter };
  persist();
}

// ---- Haftalık Meydan Okuma: haftada bir, profil seviyesinin bir üstünden büyük çengel bulmaca ----
export const weekly = {
  label: 'Haftalık Meydan Okuma',
  level() {
    const cur = profileStore().level;
    const i = LEVEL_ORDER.indexOf(cur);
    return i < 0 || i >= LEVEL_ORDER.length - 1 ? 'MIX' : LEVEL_ORDER[i + 1];
  },
  async getDaily() {
    const store = getStore();
    const wk = isoWeek();
    if (store.weekly && store.weekly.week === wk.key) return store.weekly;
    await yieldFn();
    const levelId = weekly.level();
    const base = getLevel(levelId);
    const seed = ('weekly' + wk.key + levelId).split('').reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 23);
    // tekrar kuralı gevşek: haftada bir gelen büyük bulmaca dolu olsun (daha önce çıkmış kelime de gelebilir)
    const puzzle = await makePuzzle(base, seed, false, false, { w: 6, h: 10 }); // haftalık: biraz daha büyük, yine boşluksuz
    recordAnswers(realAnswers(puzzle.clues));
    recordFillers(puzzle.clues);
    puzzle.no = wk.no;
    store.weekly = { ...newSession(puzzle), week: wk.key, levelId };
    persist();
    return store.weekly;
  },
  getSession() {
    return weekly.getDaily();
  },
  peekDaily() {
    const w = getStore().weekly;
    return w && w.week === isoWeek().key ? w : null;
  },
  markSolved() {
    const w = getStore().weekly;
    recordSolve('daily', null, 'weekly', w);
    extraStore().weekly.done[isoWeek().key] = true;
    persist();
  },
};

// ================= Rozetler =================
export function badgeContext() {
  const st = statsStore();
  const d = getDetailedStats();
  const x = extraStore();
  const games = st.games || {};
  return {
    total: st.total || 0,
    best: st.best || 0,
    clean: st.clean || 0,
    gameKinds: PUZZLE_GAMES.filter((g) => games[g]?.solved > 0).length,
    arrowFastest: games.arrow?.fastest ?? null,
    notebook: d.notebook,
    learned: d.learned,
    reviewSessions: x.review.sessions,
    reviewPerfect: x.review.perfect,
    taBest: x.ta.best,
    pronOk: x.pron.ok,
    wotdDays: Object.keys(x.wotd.days).length,
    weeklyDone: Object.keys(x.weekly.done).length,
    levelsDone: Object.keys(profileStore().completed || {}).length,
  };
}
function earnedStore() {
  const store = getStore();
  return store.badges || (store.badges = {});
}
// Yeni kazanılan rozetleri kaydedip döndürür (kutlama için)
export function checkBadges() {
  const earned = earnedStore();
  const fresh = newlyEarned(badgeContext(), earned);
  if (fresh.length) {
    const now = Date.now();
    fresh.forEach((b) => (earned[b.id] = now));
    persist();
  }
  return fresh;
}
export function getBadges() {
  return badgeList(badgeContext(), earnedStore());
}
// ================= Bulmaca arşivi: geçmiş günlerin "Günün Gazete Bulmacası" (Çengel) =================
export const ARCHIVE_DAYS = 30;
const dayKeyOf = (d) => todayKey(d);
const dayNo = (d) => Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
function archiveMap() {
  const store = getStore();
  return store.archive || (store.archive = {});
}
// Son N gün (bugün hariç; bugün ana sayfadaki günün bulmacası): { key, date, no, state: 'new'|'started'|'solved', seconds }
export function archiveDays(n = ARCHIVE_DAYS) {
  const a = archiveMap();
  const out = [];
  for (let i = 1; i <= n; i++) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = dayKeyOf(d);
    const s = a[key];
    const started = s && Object.keys(s.entries || {}).some((k) => s.entries[k]);
    out.push({ key, date: d, no: dayNo(d), state: s?.solved ? 'solved' : started ? 'started' : 'new', seconds: s?.seconds || 0 });
  }
  return out;
}
const archiveStores = new Map();
// PuzzleScreen'e verilecek mağaza nesnesi (haftalık meydan okumayla aynı arayüz); tarih başına sabit nesne
export function archiveStore(key) {
  if (archiveStores.has(key)) return archiveStores.get(key);
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12);
  const st = {
    label: `Arşiv · ${d}.${m}.${y}`,
    async getDaily() {
      const a = archiveMap();
      if (a[key]) return a[key];
      await yieldFn();
      const seed = key.split('').reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 17); // o günün tohumu
      const puzzle = await makePuzzle(getLevel('MIX'), seed, false);
      puzzle.no = dayNo(date);
      a[key] = { ...newSession(puzzle), date: key };
      // en fazla ARCHIVE_DAYS + 5 kayıt tut (eskiler silinir)
      const num = (k) => k.split('-').map(Number).reduce((acc, v) => acc * 100 + v, 0); // 2026-10-5 → 20261005
      const keys = Object.keys(a).sort((x, z) => num(z) - num(x));
      for (const k of keys.slice(ARCHIVE_DAYS + 5)) delete a[k];
      persist();
      return a[key];
    },
    getSession() {
      return st.getDaily();
    },
    peekDaily() {
      return archiveMap()[key] || null;
    },
    markSolved() {
      recordSolve('daily', null, 'arrow', archiveMap()[key]);
      persist();
    },
  };
  archiveStores.set(key, st);
  return st;
}