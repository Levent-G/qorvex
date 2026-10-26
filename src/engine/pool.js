// Kelime havuzu: hangi kelimeler bulmacaya girebilir? Saf fonksiyonlar (uygulama ve simülasyon aynı kodu kullanır).
//
// Tekrar kuralları
// - Daha önce gelmiş ama öğrenilmeyen (deftere eklenmemiş) kelime tekrar gelmez (strict: ızgara oyunları).
// - Defterdeki kelime yalnızca tekrar vakti gelince gelir; aralıklar giderek açılır (aralıklı tekrar).
// - Taze kelime azalırsa en eski görülenler geri döner (havuz tükenmez).
import { freshnessPenalty } from './freshness';

// learn.counter her yeni bulmacada (hangi oyun olursa olsun) bir artar.
// Defter kelimesi kaçıncı tekrarındaysa en az bu kadar bulmaca sonra yeniden gelir.
export const REVIEW_GAPS = [6, 12, 24, 48, 80];
export const PRIO_MAX = 2; // bir bulmacada en fazla bu kadar defter kelimesi öne çıkar
export const MIN_FRESH = 120; // taze kelime bunun altına düşünce en eski görülenler geri döner
// 2 harfliler (yalnızca 27 tane) ızgarayı dolduran yapıştırıcıdır; hiç dönmezlerse bulmacalar seyrekleşir.
// Hepsi birden dönüp 3-4 bulmacada bitmesin diye zamana yayılır: her bulmacaya en uzun süredir
// gelmeyenlerden en fazla TWO_LETTER_MAX tane girer; bir kez gelen en az TWO_LETTER_COOLDOWN oyun dinlenir.
export const TWO_LETTER_COOLDOWN = 5; // en erken 6. bulmacada (gerçek ya da dolgu olarak) yeniden gelir
export const TWO_LETTER_MAX = 27;

// Seviye kademesi: oyuncunun seviyesi en ağırlıklı, her alt seviye bir öncekinden daha az gelir
// (ör. B2'de: B2 > B1 > A2 > A1). Uzaklık = oyuncu seviyesi − kelime seviyesi.
// LEVEL_BONUS: üretici puanına eklenir; LEVEL_SHARE: alt seviye kelimelerinin her bulmacada havuza girme oranı.
export const LEVEL_BONUS = [3, 1.5, 0, -1.5, -3, -4.5];
export const LEVEL_SHARE = [1, 0.6, 0.35, 0.2, 0.12, 0.08];
const levelDist = (level, w) => (level.mixed || w.l > level.idx ? 0 : level.idx - w.l);

export function isDue(m, counter) {
  const gap = counter - (m.last ?? m.at ?? 0);
  return gap >= REVIEW_GAPS[Math.min(m.seen || 0, REVIEW_GAPS.length - 1)];
}

// Bu bulmacada tekrar edilecek defter kelimeleri: vakti gelenlerden en eskileri, en fazla PRIO_MAX
export function prioOf(learn, allowed, withPrio) {
  if (!withPrio) return null;
  return new Set(
    Object.entries(learn.marked)
      .filter(([a, m]) => allowed.has(a) && isDue(m, learn.counter))
      .sort((x, y) => (x[1].last ?? 0) - (y[1].last ?? 0))
      .slice(0, PRIO_MAX)
      .map(([a]) => a),
  );
}

// strict değil (kelime avı, merdiven, jumble...): havuz tam kalır, görülenler yalnızca cezalanır;
// bu oyunlar belirli uzunluk/zincir ister, havuz daralırsa üretilemeyebilir.
function softInputs(words, level, learn, withPrio) {
  const entries = [];
  const dict = new Map();
  for (const w of words) {
    if (w.l > level.idx && w.a.length > 2) continue;
    let bonus = level.mixed ? 0 : LEVEL_BONUS[levelDist(level, w)];
    const m = learn.marked[w.a];
    if (!(m && isDue(m, learn.counter))) bonus -= freshnessPenalty(w.a, learn);
    const e = { a: w.a, c: w.c, bonus };
    entries.push(e);
    dict.set(w.a, e);
  }
  return { entries, dict, prio: prioOf(learn, dict, withPrio) };
}

/**
 * Bulmaca girdileri. Kümülatif ve kademeli: oyuncunun seviyesi en çok, alt seviyeler azalan oranda (LEVEL_SHARE/LEVEL_BONUS).
 * 2 harfli kelimeler her zaman.
 * strict: ızgara oyunları (çengel, kare, şifreli, resimli) — görülmüş/öğrenilmeyen kelimeler tamamen dışarıda.
 */
export function buildInputs(words, level, learn, withPrio, strict = false, rand = Math.random) {
  if (!strict) return softInputs(words, level, learn, withPrio);
  const entries = [];
  const dict = new Map(); // ızgarada kendiliğinden oluşan kelimeleri doğrulamak için (yalnızca havuzdakiler)
  const seenPool = [];
  let freshCount = 0;
  const times = learn.times || {};
  const inLevel = (w) => !(w.l > level.idx && w.a.length > 2);
  // defterden yalnızca bu bulmacanın tekrar kelimeleri (en fazla PRIO_MAX) girer; diğerleri vakti gelse de bekler
  const prio = prioOf(learn, new Set(words.filter(inLevel).map((w) => w.a)), withPrio);
  // bu bulmacaya girebilecek 2 harfliler: hiç gelmemişler önce, sonra en uzun süredir dinlenenler
  // dolgu olarak gelmesi de sayılır (learn.fillerRecent)
  const rest = (a) => learn.counter - Math.max(learn.recent[a] ?? -1e9, (learn.fillerRecent || {})[a] ?? -1e9);
  const twoAllowed = new Set(
    words
      .filter((w) => w.a.length <= 2 && rest(w.a) >= TWO_LETTER_COOLDOWN)
      .sort((x, y) => rest(y.a) - rest(x.a))
      .slice(0, TWO_LETTER_MAX)
      .map((w) => w.a),
  );
  for (const w of words) {
    if (!inLevel(w)) continue;
    const dist = levelDist(level, w);
    const bonus = level.mixed ? 0 : LEVEL_BONUS[dist]; // seviyenin kendi kelimeleri en önde, alt seviyeler kademeli
    const seen = !!times[w.a] || learn.recent[w.a] != null;
    const due = !!prio && prio.has(w.a);
    // alt seviye kelimeleri her bulmacada belli oranda havuza girer (defter tekrarı ve 2 harfliler hariç)
    if (dist > 0 && !due && w.a.length > 2 && rand() > LEVEL_SHARE[dist]) continue;
    const e = { a: w.a, c: w.c, bonus };
    // 2 harfliler yalnızca bu bulmacanın payındakiler (twoAllowed); 3+ harfli bir kez gelen kelime bir daha gelmez
    if (w.a.length <= 2) {
      if (!twoAllowed.has(w.a)) continue;
    } else if (seen && !due) {
      seenPool.push(e);
      continue;
    }
    entries.push(e);
    dict.set(w.a, e);
    if (w.a.length > 2) freshCount++;
  }
  if (freshCount < MIN_FRESH) {
    const back = seenPool.filter((e) => e.a.length > 2);
    back.sort((x, y) => (learn.recent[x.a] ?? -1) - (learn.recent[y.a] ?? -1));
    for (const e of back.slice(0, MIN_FRESH - freshCount)) {
      entries.push(e);
      dict.set(e.a, e);
    }
  }
  return { entries, dict, prio };
}

/** Bir bulmacada çıkan kelimeleri kaydet (tüm oyunlar ortak sayaç ve defteri kullanır). */
export function recordAnswersTo(learn, answers) {
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
