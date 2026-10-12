// Arrowword (çengel bulmaca) üretici — telefonda çalışır.
// Hücre tipleri: 0 boş, 1 harf, 2 blok (harf olamaz, ipucu yok), 3 ipucu
// Oklar: R  ipucu solda, kelime sağa | D  ipucu üstte, kelime aşağı
//        RD ipucu solda, kelime sağdaki hücreden aşağı | DR ipucu üstte, kelime alttaki hücreden sağa

const E = 0, L = 1, B = 2, C = 3;

export function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

function makeGrid(w, h) {
  const n = w * h;
  return {
    w, h,
    t: new Uint8Array(n),
    ch: new Array(n).fill(''),
    covA: new Uint8Array(n),
    covD: new Uint8Array(n),
    clues: Array.from({ length: n }, () => []),
    words: [],
    used: new Set(),
  };
}

function cloneGrid(g) {
  return {
    w: g.w, h: g.h,
    t: g.t.slice(), ch: g.ch.slice(), covA: g.covA.slice(), covD: g.covD.slice(),
    clues: g.clues.map((x) => x.slice()),
    words: g.words.slice(),
    used: new Set(g.used),
  };
}

// Kelimenin başlangıcı için olası ipucu hücreleri
function clueOpts(g, r, c, dir) {
  const out = [];
  const a = dir === 'A' ? [[r, c - 1, 'R'], [r - 1, c, 'DR']] : [[r - 1, c, 'D'], [r, c - 1, 'RD']];
  for (let k = 0; k < 2; k++) {
    const cr = a[k][0], cc = a[k][1];
    if (cr < 0 || cc < 0 || cr >= g.h || cc >= g.w) continue;
    const i = cr * g.w + cc;
    const t = g.t[i];
    if (t === L) continue;
    const cl = g.clues[i];
    if (cl.length >= 2) continue;
    if (cl.length && cl[0].arrow === a[k][2]) continue;
    out.push({ i, cr, cc, arrow: a[k][2], kind: t });
  }
  return out;
}

function evaluate(g, entry, r, c, dir, first, ctx) {
  const word = entry.a;
  const w = g.w, h = g.h, n = word.length;
  const dr = dir === 'A' ? 0 : 1, dc = dir === 'A' ? 1 : 0;
  const er = r + dr * (n - 1), ec = c + dc * (n - 1);
  if (r < 0 || c < 0 || er >= h || ec >= w) return null;
  const br = r - dr, bc = c - dc, ar = er + dr, ac = ec + dc;
  const bIn = br >= 0 && bc >= 0;
  const aIn = ar < h && ac < w;
  if (bIn && g.t[br * w + bc] === L) return null;
  if (aIn && g.t[ar * w + ac] === L) return null;
  const cov = dir === 'A' ? g.covA : g.covD;
  let cross = 0;
  let news = null;
  for (let k = 0; k < n; k++) {
    const rr = r + dr * k, cc = c + dc * k;
    const i = rr * w + cc;
    const t = g.t[i];
    if (t === L) {
      if (g.ch[i] !== word[k] || cov[i]) return null;
      cross++;
    } else if (t !== E) {
      return null;
    } else {
      // dik komşular
      const p1r = rr + dc, p1c = cc + dr, p2r = rr - dc, p2c = cc - dr;
      const n1 = p1r < h && p1c < w && g.t[p1r * w + p1c] === L;
      const n2 = p2r >= 0 && p2c >= 0 && g.t[p2r * w + p2c] === L;
      if (n1 || n2) (news || (news = [])).push(rr, cc, k);
    }
  }
  if (!first && cross === 0) return null;
  if (cross === n) return null;

  // Bu değerlendirmede ayrılan ipucu yuvaları
  const reserved = [];
  const onWord = (cr, cc) => (dir === 'A' ? cr === r && cc >= c && cc <= ec : cc === c && cr >= r && cr <= er);
  const pick = (sr, sc, d) => {
    const opts = clueOpts(g, sr, sc, d);
    let best = null, bestS = -1e9;
    for (const o of opts) {
      if (onWord(o.cr, o.cc)) continue;
      let cnt = g.clues[o.i].length, dup = false;
      for (let q = 0; q < reserved.length; q += 2)
        if (reserved[q] === o.i) {
          cnt++;
          if (reserved[q + 1] === o.arrow) dup = true;
        }
      if (cnt >= 2 || dup) continue;
      // blok hücreyi ipucuna çevirmek en iyisi, sonra mevcut ipucu hücresi, en son yeni boş hücre
      const s = (o.kind === B ? 6 : o.kind === C ? 3 : 0) + (o.arrow.length === 1 ? 1 : 0);
      if (s > bestS) {
        bestS = s;
        best = o;
      }
    }
    if (best) reserved.push(best.i, best.arrow);
    return best;
  };

  const opt = pick(r, c, dir);
  if (!opt) return null;

  let extra = null;
  if (news) {
    const pdir = dir === 'A' ? 'D' : 'A';
    const pr = pdir === 'A' ? 0 : 1, pc = pdir === 'A' ? 1 : 0;
    const pcov = pdir === 'A' ? g.covA : g.covD;
    for (let q = 0; q < news.length; q += 3) {
      const rr = news[q], cc = news[q + 1], k = news[q + 2];
      let sr = rr, sc = cc;
      while (sr - pr >= 0 && sc - pc >= 0 && g.t[(sr - pr) * w + (sc - pc)] === L) {
        sr -= pr;
        sc -= pc;
      }
      let s = '';
      let tr = sr, tc = sc;
      while (tr < h && tc < w) {
        const i = tr * w + tc;
        const isNew = tr === rr && tc === cc;
        if (!isNew && g.t[i] !== L) break;
        if (!isNew && pcov[i]) return null;
        s += isNew ? word[k] : g.ch[i];
        tr += pr;
        tc += pc;
      }
      const ent = ctx.dict.get(s);
      if (!ent || g.used.has(s) || s === word) return null;
      if (extra) for (const x of extra) if (x.entry.a === s) return null;
      const o = pick(sr, sc, pdir);
      if (!o) return null;
      (extra || (extra = [])).push({ entry: ent, r: sr, c: sc, dir: pdir, opt: o });
    }
  }

  // Yeni oluşacak harf-dışı hücreler (gri kare) — cezalandır
  let newGrey = 0, blockToClue = 0;
  const seen = new Set();
  const consider = (i, becomesClue) => {
    if (seen.has(i)) return;
    seen.add(i);
    const t = g.t[i];
    if (t === E) newGrey++;
    else if (t === B && becomesClue) blockToClue++;
  };
  for (let q = 0; q < reserved.length; q += 2) consider(reserved[q], true);
  if (bIn) consider(br * w + bc, false);
  if (aIn) consider(ar * w + ac, false);
  const newLetters = n - cross + (extra ? 0 : 0);
  let score =
    newLetters * 2 + cross * 4 + (extra ? extra.length * 9 : 0) - newGrey * 2 + blockToClue * 5 +
    (opt.kind === C ? 1 : 0) + ctx.rand() * 4;
  if (ctx.prio && ctx.prio.has(word)) score += 30;
  if (entry.bonus) score += entry.bonus;
  // kendiliğinden oluşan ek kelimelerin tazeliği de sayılsın
  if (extra) for (const x of extra) if (x.entry.bonus) score += x.entry.bonus;
  return { r, c, dir, opt, extra, score };
}

function placeOne(g, entry, r, c, dir, opt) {
  const word = entry.a;
  const w = g.w, n = word.length;
  const dr = dir === 'A' ? 0 : 1, dc = dir === 'A' ? 1 : 0;
  const cov = dir === 'A' ? g.covA : g.covD;
  for (let k = 0; k < n; k++) {
    const i = (r + dr * k) * w + (c + dc * k);
    g.t[i] = L;
    g.ch[i] = word[k];
    cov[i] = 1;
  }
  const br = r - dr, bc = c - dc, ar = r + dr * n, ac = c + dc * n;
  if (br >= 0 && bc >= 0 && g.t[br * w + bc] === E) g.t[br * w + bc] = B;
  if (ar < g.h && ac < w && g.t[ar * w + ac] === E) g.t[ar * w + ac] = B;
  g.t[opt.i] = C;
  g.clues[opt.i].push({ arrow: opt.arrow, a: word });
  g.used.add(word);
  g.words.push({ entry, r, c, dir, ci: opt.i, arrow: opt.arrow });
}

function place(g, entry, pl) {
  placeOne(g, entry, pl.r, pl.c, pl.dir, pl.opt);
  if (pl.extra) for (const x of pl.extra) placeOne(g, x.entry, x.r, x.c, x.dir, x.opt);
}

function buildIndex(entries) {
  const idx = new Map();
  for (const e of entries)
    for (let k = 0; k < e.a.length; k++) {
      const ch = e.a[k];
      let list = idx.get(ch);
      if (!list) idx.set(ch, (list = []));
      list.push(e, k);
    }
  return idx;
}

function greedy(g, idx, ctx, maxIter) {
  const w = g.w, h = g.h;
  for (let iter = 0; iter < maxIter; iter++) {
    let best = null, bestE = null;
    for (let r = 0; r < h; r++)
      for (let c = 0; c < w; c++) {
        const i = r * w + c;
        if (g.t[i] !== L) continue;
        const list = idx.get(g.ch[i]);
        if (!list) continue;
        for (let d = 0; d < 2; d++) {
          const dir = d === 0 ? 'A' : 'D';
          if ((d === 0 ? g.covA : g.covD)[i]) continue;
          const dr = d === 0 ? 0 : 1, dc = d === 0 ? 1 : 0;
          for (let q = 0; q < list.length; q += 2) {
            const e = list[q];
            if (g.used.has(e.a)) continue;
            const k = list[q + 1];
            const pl = evaluate(g, e, r - dr * k, c - dc * k, dir, false, ctx);
            if (pl && (!best || pl.score > best.score)) {
              best = pl;
              bestE = e;
            }
          }
        }
      }
    if (!best) return;
    place(g, bestE, best);
  }
}

// Boş ceplere kesişmesiz kelime koy
function fillPockets(g, entries, ctx) {
  const w = g.w, h = g.h;
  const byLen = new Map();
  for (const e of entries) {
    const l = e.a.length;
    if (!byLen.has(l)) byLen.set(l, []);
    byLen.get(l).push(e);
  }
  for (let iter = 0; iter < 25; iter++) {
    let best = null, bestE = null, bestS = -1e9;
    for (let r = 0; r < h; r++)
      for (let c = 0; c < w; c++) {
        const i = r * w + c;
        if (g.t[i] !== E) continue;
        for (let d = 0; d < 2; d++) {
          const dir = d === 0 ? 'A' : 'D';
          const dr = d === 0 ? 0 : 1, dc = d === 0 ? 1 : 0;
          // (r,c) ilk boş hücre olacak şekilde, uzunluk 2..max
          const maxLen = d === 0 ? w - c : h - r;
          for (let len = 2; len <= maxLen; len++) {
            const list = byLen.get(len);
            if (!list) continue;
            let tries = 0;
            for (const e of list) {
              if (g.used.has(e.a)) continue;
              if (++tries > 120) break;
              const pl = evaluate(g, e, r, c, dir, true, ctx);
              if (!pl) continue;
              let fresh = 0;
              for (let k = 0; k < len; k++) if (g.t[(r + dr * k) * w + (c + dc * k)] === E) fresh++;
              const s = fresh * 4 + pl.score;
              if (s > bestS) {
                bestS = s;
                best = pl;
                bestE = e;
              }
            }
          }
        }
      }
    if (!best) return;
    place(g, bestE, best);
  }
}

// Çift ipuçlu hücrelerden birini komşu boş (blok) hücreye taşı
function relocateClues(g) {
  const w = g.w;
  let moved = true;
  while (moved) {
    moved = false;
    for (const wd of g.words) {
      const cell = g.clues[wd.ci];
      if (cell.length < 2) continue;
      const alts = wd.dir === 'A' ? [[wd.r, wd.c - 1, 'R'], [wd.r - 1, wd.c, 'DR']] : [[wd.r - 1, wd.c, 'D'], [wd.r, wd.c - 1, 'RD']];
      for (const [cr, cc, arrow] of alts) {
        if (cr < 0 || cc < 0) continue;
        const i = cr * w + cc;
        if (i === wd.ci || g.t[i] !== B || g.clues[i].length) continue;
        g.clues[wd.ci] = cell.filter((k) => k.a !== wd.entry.a);
        g.clues[i] = [{ arrow, a: wd.entry.a }];
        g.t[i] = C;
        wd.ci = i;
        wd.arrow = arrow;
        moved = true;
        break;
      }
    }
  }
}

// Kelime listesinden ızgarayı yeniden kur
function rebuild(w, h, words) {
  const g = makeGrid(w, h);
  for (const wd of words) placeOne(g, wd.entry, wd.r, wd.c, wd.dir, { i: wd.ci, arrow: wd.arrow });
  return g;
}

// Yerel arama: rastgele kelimeleri söküp yeniden doldur, daha iyiyse tut
function improve(g, idx, ctx, deadline) {
  let cur = g;
  let curS = scoreOf(stats(cur), prioCount(cur, ctx));
  let it = 0;
  while (Date.now() < deadline && it < 400) {
    it++;
    const ws = cur.words;
    if (ws.length < 4) break;
    const k = ctx.rand() < 0.55 ? 1 : ctx.rand() < 0.7 ? 2 : 3;
    const remove = new Set();
    // komşu kelimeleri birlikte sök (aynı bölge)
    const first = ws[Math.floor(ctx.rand() * ws.length)];
    remove.add(first);
    for (let q = 1; q < k; q++) {
      let bestW = null, bestD = 1e9;
      for (const x of ws) {
        if (remove.has(x)) continue;
        const d = Math.abs(x.r - first.r) + Math.abs(x.c - first.c) + ctx.rand() * 3;
        if (d < bestD) { bestD = d; bestW = x; }
      }
      if (bestW) remove.add(bestW);
    }
    if ([...remove].some((x) => ctx.prio && ctx.prio.has(x.entry.a)) && ctx.rand() < 0.8) continue;
    const ng = rebuild(cur.w, cur.h, ws.filter((x) => !remove.has(x)));
    if (!runsValid(ng, remove)) continue;
    greedy(ng, idx, ctx, 40);
    const s = scoreOf(stats(ng), prioCount(ng, ctx));
    if (s >= curS) {
      cur = ng;
      curS = s;
    }
  }
  return cur;
}

// Sökülen kelimelerin yerinde ipucusuz harf dizisi kaldı mı?
function runsValid(g, removed) {
  const w = g.w;
  for (const x of removed) {
    const dr = x.dir === 'A' ? 0 : 1, dc = x.dir === 'A' ? 1 : 0;
    for (let k = 0; k < x.entry.a.length - 1; k++) {
      const i1 = (x.r + dr * k) * w + (x.c + dc * k);
      const i2 = (x.r + dr * (k + 1)) * w + (x.c + dc * (k + 1));
      if (g.t[i1] === L && g.t[i2] === L) return false;
    }
  }
  return true;
}
function prioCount(g, ctx) {
  if (!ctx.prio) return 0;
  let n = 0;
  for (const x of g.words) if (ctx.prio.has(x.entry.a)) n++;
  return n;
}

function stats(g) {
  let letters = 0, blanks = 0, fresh = 0;
  for (const x of g.words) fresh += x.entry.bonus || 0;
  for (let i = 0; i < g.t.length; i++) {
    if (g.t[i] === L) letters++;
    else if (g.t[i] === E || (g.t[i] === B && !g.clues[i].length)) blanks++;
  }
  return { letters, blanks, words: g.words.length, fresh };
}

function scoreOf(s, pc) {
  // fresh: kelimelerin tazelik toplamı (yakın zamanda/sık gelenler eksi) — iyileştirme aynı kelimeleri geri getirmesin
  return s.letters * 2 - s.blanks * 6 + s.words * 1.5 + pc * 8 + (s.fresh || 0) * 0.6;
}

function attempt(w, h, entries, ctx) {
  const g = makeGrid(w, h);
  const idx = buildIndex(entries);
  const minLen = Math.min(w, h) - 3;
  // İlk kelime: öncelikli kelimelerden biri olabilir, üst satır ya da sol sütun
  const starters = entries.filter((e) => e.a.length >= minLen && e.a.length <= w - 1);
  const pr = starters.filter((e) => ctx.prio && ctx.prio.has(e.a));
  const order = pr.length ? [...pr, ...starters] : starters;
  for (const e of order) {
    const across = ctx.rand() < 0.6;
    const pl = across
      ? evaluate(g, e, Math.floor(ctx.rand() * 2), 1, 'A', true, ctx)
      : e.a.length <= h - 1
        ? evaluate(g, e, 1, Math.floor(ctx.rand() * 2), 'D', true, ctx)
        : null;
    if (pl) {
      place(g, e, pl);
      break;
    }
  }
  if (!g.words.length) return null;
  greedy(g, idx, ctx, 90);
  return g;
}

function serialize(g) {
  const w = g.w;
  const rows = [];
  for (let r = 0; r < g.h; r++) {
    let s = '';
    for (let c = 0; c < w; c++) {
      const i = r * w + c;
      s += g.t[i] === L ? g.ch[i] : g.t[i] === C ? '#' : '.';
    }
    rows.push(s);
  }
  const order = { R: 0, RD: 1, DR: 2, D: 3 };
  const byAnswer = new Map(g.words.map((x) => [x.entry.a, x]));
  const clues = [];
  for (let i = 0; i < g.t.length; i++) {
    if (g.t[i] !== C) continue;
    const list = [...g.clues[i]].sort((a, b) => order[a.arrow] - order[b.arrow]);
    list.forEach((k, slot) => {
      const wd = byAnswer.get(k.a);
      clues.push({
        r: Math.floor(i / w), c: i % w, slot, of: list.length, arrow: k.arrow,
        text: wd.entry.c, answer: k.a, sr: wd.r, sc: wd.c, dir: wd.dir,
      });
    });
  }
  return { w: g.w, h: g.h, rows, clues };
}

/**
 * Bulmaca üretir (zaman bütçeli, arada UI'a nefes aldırır).
 * opts: { w, h, entries: [{a, c, bonus?}], dict: Map(answer->entry), prio: Set, seed, budgetMs, minAttempts }
 */
export async function generatePuzzle(opts) {
  const { w, h, entries, dict, prio, seed = Date.now(), budgetMs = 900, minAttempts = 4, maxAttempts = 60, yieldFn } = opts;
  const rand = mulberry32(seed);
  const ctx = { rand, dict, prio };
  const fit = entries.filter((e) => e.a.length >= 2 && e.a.length <= Math.max(w, h) - 1);
  const prioList = fit.filter((e) => prio && prio.has(e.a));
  const rest = fit.filter((e) => !(prio && prio.has(e.a)));
  const start = Date.now();
  const attemptBudget = budgetMs * 0.35;
  let best = null;
  for (let a = 0; a < maxAttempts; a++) {
    if (a >= minAttempts && Date.now() - start > attemptBudget) break;
    const sample = [...prioList, ...shuffle(rest.slice(), rand).slice(0, opts.sampleSize || 650)];
    const g = attempt(w, h, sample, ctx);
    if (g) {
      const sc = scoreOf(stats(g), prioCount(g, ctx));
      if (!best || sc > best.sc) best = { g, sc };
    }
    if (yieldFn) await yieldFn();
  }
  if (!best) throw new Error('Bulmaca üretilemedi');
  // Yerel arama ile iyileştir (parça parça, arada UI'a nefes aldır)
  const bigIdx = buildIndex(fit);
  let g = best.g;
  const end = start + budgetMs;
  while (Date.now() < end) {
    g = improve(g, bigIdx, ctx, Math.min(end, Date.now() + 60));
    if (yieldFn) await yieldFn();
  }
  // Son rötuş: cepleri doldur, ipuçlarını blok hücrelere dağıt
  g = cloneGrid(g);
  const pocketPool = [...dict.values()].filter((e) => e.a.length <= Math.max(w, h) - 1);
  shuffle(pocketPool, rand);
  fillPockets(g, pocketPool.slice(0, 1500), ctx);
  relocateClues(g);  const out = serialize(g);
  out.stats = stats(g);
  return out;
}
