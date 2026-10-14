// Bulmaca oturumları: seviye başına tek aktif bulmaca, günün bulmacası, öğrenme takibi.
import { generatePuzzle } from './generator';
import { generateWordSearch } from './wordsearch';
import { generateLadder } from './ladder';
import { makeBlockPuzzle, makeCodeword, pickHiddenSentence } from './gridgames';
import { generateSpiral, generateJumble, generateCryptogram } from './wordgames';
import { WORDS } from './words';
import { freshnessPenalty } from './freshness';
import { PICTURE_LEVELS, pictureCandidates, makeRound } from './picture';
import { findPhoto, photoCache } from '../services/pexels';
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
const PRIO_MAX = 6;
const yieldFn = () => new Promise((r) => setTimeout(r, 0));

// İşaretli kelime vadesi geldi mi? İlk 3 tekrar sık (aralıklı), sonra giderek seyrek.
function isDue(m, counter) {
  const gap = counter - m.last;
  if (m.seen < 3) return gap >= 1;
  return gap >= 3 * (m.seen - 1);
}

const MIN_FRESH = 300; // havuzda en az bu kadar (3+ harfli) kelime kalsın

function prioOf(learn, dict, withPrio) {
  if (!withPrio) return null;
  return new Set(
    Object.entries(learn.marked)
      .filter(([a, m]) => dict.has(a) && isDue(m, learn.counter))
      .sort((x, y) => x[1].last - y[1].last)
      .slice(0, PRIO_MAX)
      .map(([a]) => a),
  );
}

function buildSoftInputs(level, learn, withPrio) {
  const entries = [];
  const dict = new Map();
  for (const w of WORDS) {
    if (w.l > level.idx && w.a.length > 2) continue;
    let bonus = 0;
    if (!level.mixed && w.l === level.idx) bonus += 3;
    if (!learn.marked[w.a]) bonus -= freshnessPenalty(w.a, learn); // yakın zamanda / sık geldiyse geri plana
    const e = { a: w.a, c: w.c, bonus };
    entries.push(e);
    dict.set(w.a, e);
  }
  return { entries, dict, prio: prioOf(learn, dict, withPrio) };
}

// strict: ızgara oyunları (çengel, kare, şifreli) — görülmüş/öğrenilmeyen kelimeler tamamen dışarıda.
// strict değilse (kelime avı, merdiven, jumble...) havuz tam kalır, görülenler yalnızca cezalanır;
// bu oyunlar belirli uzunluk/zincir ister, havuz daralırsa üretilemeyebilir.
function buildInputs(level, learn, withPrio, strict = false) {
  if (!strict) return buildSoftInputs(level, learn, withPrio);
  // Kümülatif havuz: A2 = A1 + A2, B1 = A1..B1 ... (2 harfli kelimeler her zaman)
  // Tekrar kuralı: daha önce gelmiş ama öğrenilmeyen (deftere eklenmemiş) kelimeler havuza girmez.
  // Defterdeki (öğrenilen) kelimeler her zaman havuzdadır; vadesi gelenler prio ile öne çıkar.
  // Taze kelime azalırsa en eski görülenler geri döner (havuz hiç tükenmez).
  const entries = [];
  const dict = new Map(); // ızgarada kendiliğinden oluşan kelimeleri doğrulamak için (yalnızca havuzdakiler)
  const seenPool = [];
  let freshCount = 0;
  const times = learn.times || {};
  for (const w of WORDS) {
    if (w.l > level.idx && w.a.length > 2) continue;
    let bonus = 0;
    if (!level.mixed && w.l === level.idx) bonus += 3; // seviyenin kendi kelimeleri öne
    const seen = times[w.a] || learn.recent[w.a] != null;
    const marked = !!learn.marked[w.a];
    if (w.a.length <= 2) bonus -= Math.min(3, (times[w.a] || 0) * 0.3); // az sayıdalar, hafif dönüşüm
    const e = { a: w.a, c: w.c, bonus };
    if (w.a.length > 2 && seen && !marked) {
      seenPool.push(e);
      continue;
    }
    entries.push(e);
    dict.set(w.a, e);
    if (w.a.length > 2) freshCount++;
  }
  if (freshCount < MIN_FRESH) {
    // en eski görülenlerden tamamla
    seenPool.sort((x, y) => (learn.recent[x.a] ?? -1) - (learn.recent[y.a] ?? -1));
    for (const e of seenPool.slice(0, MIN_FRESH - freshCount)) {
      entries.push(e);
      dict.set(e.a, e);
    }
  }
  return { entries, dict, prio: prioOf(learn, dict, withPrio) };
}

function newSession(puzzle) {
  return { puzzle, entries: {}, revealed: {}, seconds: 0, solved: false, opened: [] };
}

async function makePuzzle(level, seed, withPrio) {
  const store = getStore();
  const { entries, dict, prio } = buildInputs(level, store.learn, withPrio, true);
  const puzzle = await generatePuzzle({
    w: level.w, h: level.h, entries, dict, prio, seed, budgetMs: 1200, yieldFn,
  });
  return puzzle;
}

function recordAppearance(puzzle) {
  recordAnswers(puzzle.clues.map((k) => k.answer));
}

// Bir oyunda çıkan kelimeleri kaydet (tüm oyunlar ortak kelime defterini kullanır)
function recordAnswers(answers) {
  const learn = getStore().learn;
  learn.counter++;
  const times = learn.times || (learn.times = {});
  for (const answer of answers) {
    learn.recent[answer] = learn.counter;
    times[answer] = (times[answer] || 0) + 1;
    const m = learn.marked[answer];
    if (m) {
      m.seen++;
      m.last = learn.counter;
    }
  }
}

export async function getLevelSession(levelId, forceNew = false) {
  const store = getStore();
  const level = getLevel(levelId);
  const st = store.levels[levelId] || (store.levels[levelId] = { no: 0, solvedCount: 0, current: null });
  if (st.current && !forceNew) return st.current;
  const puzzle = await makePuzzle(level, (Date.now() ^ (st.no * 7919)) >>> 0, true);
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
  recordSolve(kind, levelId);
  const store = getStore();
  if (kind === 'level') {
    const st = store.levels[levelId];
    if (st) st.solvedCount = (st.solvedCount || 0) + 1;
  }
  persist();
}

// Kelime kartı açıldı: kelimeyi işaretle (sonraki bulmacalarda sık gelir)
export function markLearned(answer) {
  const learn = getStore().learn;
  learn.marked[answer] = { at: Date.now(), seen: 0, last: learn.counter };
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
  recordSolve(kind, levelId);
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
  recordSolve(kind, levelId);
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
function makeGameStore(storeKey, { make, answersOf, dailyLevel = 'MIX', salt, strict = false }) {
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
      recordSolve(kind, levelId);
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

// ---- Resim Bulmaca: Pexels fotoğrafındaki nesnenin İngilizcesi ----
const NOUNS = new Set(WORDS.filter((w) => w.p === 'noun').map((w) => w.a));
export { PICTURE_LEVELS };
export const picture = makeGameStore('picture', {
  salt: 2246822519,
  make: async (levelId, seed, { entries, prio }) => {
    const cfg = PICTURE_LEVELS[levelId];
    const cands = pictureCandidates(entries, NOUNS, cfg, prio, photoCache(), seed);
    const rounds = [];
    // 4'erli gruplar halinde fotoğraf ara; ana konusu o nesne olan fotoğraf bulunanlar tur olur
    for (let i = 0; i < Math.min(cands.length, 48) && rounds.length < cfg.rounds; i += 4) {
      const batch = cands.slice(i, i + 4);
      const photos = await Promise.all(batch.map((c) => findPhoto(c.a)));
      batch.forEach((c, k) => {
        if (photos[k] && rounds.length < cfg.rounds) rounds.push(makeRound(c.a, c.c, photos[k], cfg, seed + rounds.length * 7919));
      });
    }
    if (rounds.length < 3) throw new Error('Yeterli fotoğraf bulunamadı. Biraz sonra tekrar dene.');
    return { rounds, firstGiven: cfg.firstGiven };
  },
  answersOf: (p) => p.rounds.map((r) => r.answer),
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
      if (typeof o.text === 'string') o.text = c;
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

// Bir bulmaca çözüldüğünde: toplam, günlük seri ve seviye ilerlemesi
export function recordSolve(kind, levelId) {
  const st = statsStore();
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
