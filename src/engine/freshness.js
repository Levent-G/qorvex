// Kelime tazeliği: yakın zamanda / sık gelen kelimelere ceza (bulmacalar hep aynı kelimelerle dolmasın).
// learn.counter her oyunda artar; learn.recent[a] = son geldiği sayaç; learn.times[a] = toplam kaç kez geldi.

const RECENT_MAX = 14; // az önce geldiyse ceza
const RECENT_FADE = 0.35; // sayaç başına azalma (~40 oyunda sıfırlanır)
const TIMES_W = 2.2; // sık gelenlere ek ceza (karekök ile yavaş büyür)
const TIMES_MAX = 9;

export function freshnessPenalty(answer, learn) {
  let pen = 0;
  const last = learn.recent ? learn.recent[answer] : null;
  if (last != null) pen += Math.max(0, RECENT_MAX - (learn.counter - last) * RECENT_FADE);
  const n = learn.times ? learn.times[answer] || 0 : 0;
  if (n) pen += Math.min(TIMES_MAX, TIMES_W * Math.sqrt(n));
  return pen;
}
