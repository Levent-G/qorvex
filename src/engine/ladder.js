// Kelime Merdiveni (Word Ladder) üretici — telefonda çalışır, saf JS.
// Başlangıçtan hedefe her adımda tek harf değişir. Seçilen yol EN KISA yoldur
// (kestirme yok), ara basamaklar Türkçe ipucuyla verilir.
import { mulberry32, shuffle } from './generator';

// Joker kalıplarıyla komşu bulma: "B_CK" -> [BACK, BUCK, ...]
function buildGraph(words) {
  const buckets = new Map();
  for (const a of words)
    for (let i = 0; i < a.length; i++) {
      const k = a.slice(0, i) + '_' + a.slice(i + 1);
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(a);
    }
  const nb = new Map();
  for (const a of words) {
    const out = [];
    for (let i = 0; i < a.length; i++) {
      for (const b of buckets.get(a.slice(0, i) + '_' + a.slice(i + 1))) if (b !== a) out.push(b);
    }
    nb.set(a, out);
  }
  return nb;
}

function bfs(nb, start, maxDepth, rand) {
  const dist = new Map([[start, 0]]);
  const prev = new Map();
  let frontier = [start];
  for (let d = 0; d < maxDepth && frontier.length; d++) {
    const next = [];
    for (const x of frontier) {
      for (const y of shuffle(nb.get(x).slice(), rand)) {
        if (dist.has(y)) continue;
        dist.set(y, d + 1);
        prev.set(y, x);
        next.push(y);
      }
    }
    frontier = next;
  }
  return { dist, prev };
}

const changedIndex = (a, b) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return i;
  return -1;
};

/**
 * opts: { lens: [3,4], steps: 4, entries: [{a, c, bonus}], prio: Set, seed }
 * Dönüş: { len, steps, rungs: [{ answer, clue, change }] } (rungs[0] başlangıç, son eleman hedef)
 */
export function generateLadder(opts) {
  const { lens, steps, entries, prio, seed = Date.now() } = opts;
  const rand = mulberry32(seed);
  const byAnswer = new Map(entries.map((e) => [e.a, e]));

  let best = null;
  for (const len of shuffle(lens.slice(), rand)) {
    const words = entries.filter((e) => e.a.length === len).map((e) => e.a);
    if (words.length < 20) continue;
    const nb = buildGraph(words);
    const starts = shuffle(words.filter((a) => nb.get(a).length > 0), rand);
    // Öncelikli kelimelerin komşuları/kendileri başlangıç adayı olarak öne
    const pr = starts.filter((a) => prio && (prio.has(a) || nb.get(a).some((b) => prio.has(b))));
    const ordered = [...pr, ...starts].slice(0, 220);
    for (const s of ordered) {
      for (const want of [steps, steps - 1]) {
        if (want < 2) continue;
        const { dist, prev } = bfs(nb, s, want, rand);
        const targets = [];
        for (const [t, d] of dist) if (d === want) targets.push(t);
        if (!targets.length) continue;
        for (const t of shuffle(targets, rand).slice(0, 12)) {
          const path = [t];
          let x = t;
          while (prev.has(x)) {
            x = prev.get(x);
            path.unshift(x);
          }
          // Puan: öncelikli kelimeler, seviyenin kendi kelimeleri, yakın zamanda gelmeyenler, istenen uzunluk
          let score = want === steps ? 10 : 0;
          for (const a of path) {
            const e = byAnswer.get(a);
            if (prio && prio.has(a)) score += 25;
            score += e.bonus || 0;
          }
          score += rand() * 4;
          if (!best || score > best.score) best = { score, path, len };
        }
        break;
      }
      if (best && best.score > 40) break;
    }
    if (best) break;
  }
  if (!best) throw new Error('Kelime merdiveni üretilemedi');
  const rungs = best.path.map((a, i) => ({
    answer: a,
    clue: byAnswer.get(a).c,
    change: i === 0 ? -1 : changedIndex(best.path[i - 1], a),
  }));
  return { len: best.len, steps: rungs.length - 1, rungs };
}

// En kısa yol uzunluğu (test ve doğrulama için)
export function shortestDistance(words, a, b) {
  const nb = buildGraph(words);
  const { dist } = bfs(nb, a, 12, Math.random);
  return dist.get(b);
}
