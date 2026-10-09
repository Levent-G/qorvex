// Bulmaca oturumları: seviye başına tek aktif bulmaca, günün bulmacası, öğrenme takibi.
import { generatePuzzle } from './generator';
import { WORDS } from './words';
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

function buildInputs(level, learn, withPrio) {
  // Kümülatif havuz: A2 = A1 + A2, B1 = A1..B1 ... (2 harfli kelimeler her zaman)
  const entries = [];
  const dict = new Map();
  for (const w of WORDS) {
    if (w.l > level.idx && w.a.length > 2) continue;
    let bonus = 0;
    if (!level.mixed && w.l === level.idx) bonus += 3; // seviyenin kendi kelimeleri öne
    const last = learn.recent[w.a];
    if (last != null && learn.counter - last < 8) bonus -= 6; // yakın zamanda geldi
    const e = { a: w.a, c: w.c, bonus };
    entries.push(e);
    dict.set(w.a, e);
  }
  let prio = null;
  if (withPrio) {
    const due = Object.entries(learn.marked)
      .filter(([a, m]) => dict.has(a) && isDue(m, learn.counter))
      .sort((x, y) => x[1].last - y[1].last)
      .slice(0, PRIO_MAX)
      .map(([a]) => a);
    prio = new Set(due);
  }
  return { entries, dict, prio };
}

function newSession(puzzle) {
  return { puzzle, entries: {}, revealed: {}, seconds: 0, solved: false, opened: [] };
}

async function makePuzzle(level, seed, withPrio) {
  const store = getStore();
  const { entries, dict, prio } = buildInputs(level, store.learn, withPrio);
  const puzzle = await generatePuzzle({
    w: level.w, h: level.h, entries, dict, prio, seed, budgetMs: 1200, yieldFn,
  });
  return puzzle;
}

function recordAppearance(puzzle) {
  const learn = getStore().learn;
  learn.counter++;
  for (const k of puzzle.clues) {
    learn.recent[k.answer] = learn.counter;
    const m = learn.marked[k.answer];
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
