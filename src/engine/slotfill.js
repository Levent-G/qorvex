// Boşluksuz çengel bulmaca üretici (desen + yuva doldurma).
// 1) Desen: hangi kare ipucu, hangisi harf. Kurallar: her harf en az bir kelimede (2+ harflik dizi);
//    her kelimenin ipucu başının solunda (R/RD) ya da üstünde (D/DR); her ipucu karesi 1–2 ipucu taşır
//    (eşleştirme ile denetlenir). Desen ucuzdur, binlercesi denenebilir.
// 2) Doldurma: kelime yuvaları en az seçeneği kalandan başlanarak doldurulur; her yerleştirmede kesişen
//    yuvaların hâlâ adayı var mı bakılır (harf/konum bit kümeleri). Çıkmazda başka desen denenir.
// Fotoğraf alanı (blocks) ne harf ne ipucudur: ızgara kenarı gibi davranır, '@' olarak yazılır.
// must: bulmacada mutlaka yer alacak kelime (resimli bulmacada fotoğraftaki nesne).
// Çıktı generator.serialize / swedish.js ile aynı biçim: { w, h, rows, clues }.
import { mulberry32, CLUE_SLOT_ORDER } from './generator';

const A = 65;

// ---------- bit kümeleri ----------
const popcount = (x) => {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
};

// Sözlük dizini: uzunluk → kelimeler + (konum, harf) bit kümeleri
function buildIndex(entries, fillers, prio, maxLen) {
  const byA = new Map();
  for (const e of entries) if (/^[A-Z]{2,}$/.test(e.a) && e.a.length <= maxLen) byA.set(e.a, { ...e, tier: prio && prio.has(e.a) ? 0 : 1 });
  for (const e of fillers) if (/^[A-Z]{2,}$/.test(e.a) && e.a.length <= maxLen && !byA.has(e.a)) byA.set(e.a, { ...e, tier: 2 });
  const lens = new Map();
  for (const e of byA.values()) {
    if (!lens.has(e.a.length)) lens.set(e.a.length, []);
    lens.get(e.a.length).push(e);
  }
  const idx = new Map();
  for (const [L, words] of lens) {
    const nw = (words.length + 31) >>> 5;
    const bits = Array.from({ length: L * 26 }, () => new Uint32Array(nw));
    words.forEach((e, i) => {
      for (let p = 0; p < L; p++) bits[p * 26 + e.a.charCodeAt(p) - A][i >>> 5] |= 1 << (i & 31);
    });
    const all = new Uint32Array(nw);
    for (let i = 0; i < words.length; i++) all[i >>> 5] |= 1 << (i & 31);
    idx.set(L, { words, bits, all, nw });
  }
  return { byA, idx };
}

// ---------- desen ----------
// clue[i]=1 ipucu karesi. Onarım döngüsüyle kurallara uydurulur; uymazsa null.
function makePattern(w, h, rand, { p, maxLen, maxTwo, lensOk, blk }) {
  const N = w * h;
  const clue = new Uint8Array(N);
  for (let i = 0; i < N; i++) clue[i] = !blk[i] && rand() < p ? 1 : 0;
  clue[0] = 1;
  const isLet = (i) => !clue[i] && !blk[i];
  // dizi tabloları: her harf karesi için içinde bulunduğu yatay/dikey dizinin başı ve uzunluğu (O(N) ile yenilenir)
  const hS = new Int16Array(N), hL = new Int8Array(N), vS = new Int16Array(N), vL = new Int8Array(N);
  const rec = () => {
    for (let r = 0; r < h; r++) {
      let c = 0;
      while (c < w) {
        const i = r * w + c;
        if (!isLet(i)) { hS[i] = -1; hL[i] = 0; c++; continue; }
        let k = c;
        while (k < w && isLet(r * w + k)) k++;
        for (let x = c; x < k; x++) { hS[r * w + x] = i; hL[r * w + x] = k - c; }
        c = k;
      }
    }
    for (let c = 0; c < w; c++) {
      let r = 0;
      while (r < h) {
        const i = r * w + c;
        if (!isLet(i)) { vS[i] = -1; vL[i] = 0; r++; continue; }
        let k = r;
        while (k < h && isLet(k * w + c)) k++;
        for (let y = r; y < k; y++) { vS[y * w + c] = i; vL[y * w + c] = k - r; }
        r = k;
      }
    }
  };
  const bad = (L) => L > maxLen || (L >= 2 && !lensOk(L));
  // ipucu karesi bir kelimeye ipucu verebilir mi (R, D, RD, DR)
  const useful = (i) => {
    const r = (i / w) | 0, c = i % w;
    if (c + 1 < w) { const j = i + 1; if (isLet(j) && ((hS[j] === j && hL[j] >= 2) || (vS[j] === j && vL[j] >= 2))) return true; }
    if (r + 1 < h) { const j = i + w; if (isLet(j) && ((vS[j] === j && vL[j] >= 2) || (hS[j] === j && hL[j] >= 2))) return true; }
    return false;
  };
  rec();
  for (let it = 0; it < 120; it++) {
    let changed = false;
    for (let i = 0; i < N && !changed; i++) {
      if (!isLet(i)) continue;
      const r = (i / w) | 0, c = i % w;
      // uzun / uygunsuz uzunluktaki diziyi böl
      if (hS[i] === i && bad(hL[i])) { const L = hL[i]; clue[i + Math.min(L - 1, 1 + Math.floor(rand() * (L - 1)))] = 1; changed = true; break; }
      if (vS[i] === i && bad(vL[i])) { const L = vL[i]; clue[i + w * Math.min(L - 1, 1 + Math.floor(rand() * (L - 1)))] = 1; changed = true; break; }
      // ipucu yeri olmayan kelime (solu/üstü kenar ya da fotoğraf): başı ipucu karesi olur
      if (hS[i] === i && hL[i] >= 2 && !(c > 0 && clue[i - 1]) && !(r > 0 && clue[i - w])) { clue[i] = 1; changed = true; break; }
      if (vS[i] === i && vL[i] >= 2 && !(r > 0 && clue[i - w]) && !(c > 0 && clue[i - 1])) { clue[i] = 1; changed = true; break; }
      // yalnız harf (iki yönde de 1 harflik dizi): komşu ipucunu harfe çevir ya da kendisi ipucu olsun
      if (hL[i] < 2 && vL[i] < 2) {
        const nb = [];
        if (c + 1 < w && clue[i + 1]) nb.push(i + 1);
        if (r + 1 < h && clue[i + w]) nb.push(i + w);
        if (c > 0 && clue[i - 1] && i - 1 !== 0) nb.push(i - 1);
        if (r > 0 && clue[i - w] && i - w !== 0) nb.push(i - w);
        if (nb.length && rand() < 0.75) clue[nb[Math.floor(rand() * nb.length)]] = 0;
        else clue[i] = 1;
        changed = true;
        break;
      }
    }
    if (!changed) {
      // iki harfli kelime fazlaysa: birinin sonundaki (ya da satır/sütun sonundaysa önündeki) ipucunu kaldır
      const twos = [];
      for (let i = 0; i < N; i++) {
        if (!isLet(i)) continue;
        const r = (i / w) | 0, c = i % w;
        if (hS[i] === i && hL[i] === 2) {
          if (c + 2 < w && clue[i + 2]) twos.push(i + 2);
          else if (c > 1 && clue[i - 1]) twos.push(i - 1);
        }
        if (vS[i] === i && vL[i] === 2) {
          if (r + 2 < h && clue[i + 2 * w]) twos.push(i + 2 * w);
          else if (r > 1 && clue[i - w]) twos.push(i - w);
        }
      }
      if (twos.length > maxTwo) { clue[twos[Math.floor(rand() * twos.length)]] = 0; changed = true; }
    }
    if (!changed) {
      // işe yaramayan ipucu karesi harfe döner
      for (let i = 1; i < N; i++) if (clue[i] && !useful(i)) { clue[i] = 0; changed = true; break; }
    }
    if (!changed) break;
    if (it === 119) return null;
    rec();
  }
  if (!clue[0]) return null;
  // yuvalar
  const slots = [];
  for (let i = 0; i < N; i++) {
    if (!isLet(i)) continue;
    const r = (i / w) | 0, c = i % w;
    if (hS[i] === i && hL[i] >= 2) {
      const L = hL[i], opts = [];
      if (c > 0 && clue[i - 1]) opts.push([i - 1, 'R']);
      if (r > 0 && clue[i - w]) opts.push([i - w, 'DR']);
      slots.push({ r, c, dir: 'A', len: L, cells: Array.from({ length: L }, (_, k) => i + k), opts });
    }
    if (vS[i] === i && vL[i] >= 2) {
      const L = vL[i], opts = [];
      if (r > 0 && clue[i - w]) opts.push([i - w, 'D']);
      if (c > 0 && clue[i - 1]) opts.push([i - 1, 'RD']);
      slots.push({ r, c, dir: 'D', len: L, cells: Array.from({ length: L }, (_, k) => i + k * w), opts });
    }
  }
  if (slots.some((s) => !s.opts.length || bad(s.len))) return null;
  if (slots.filter((s) => s.len === 2).length > maxTwo) return null;
  // her harf bir yuvada mı
  for (let i = 0; i < N; i++) if (isLet(i) && hL[i] < 2 && vL[i] < 2) return null;
  // ipucu ataması: her yuva bir ipucu karesine, karede en fazla 2, her karede en az 1
  const assign = assignClues(slots, clue, N);
  if (!assign) return null;
  return { clue, slots, assign };
}

// yuva → ipucu karesi ataması (kapasite 2, alt sınır 1). Önce herkese yer, sonra boş kalan karelere zincirle aktarım.
function assignClues(slots, clue, N) {
  const cap = new Uint8Array(N);
  const owner = new Int32Array(slots.length).fill(-1);
  // artırımlı yol ile yuvaları yerleştir
  const place = (si, seen) => {
    for (const [ci] of slots[si].opts) {
      if (seen.has(ci)) continue;
      seen.add(ci);
      if (cap[ci] < 2) { cap[ci]++; owner[si] = ci; return true; }
      // bu kareyi tutan bir yuvayı başka kareye kaydır
      for (let sj = 0; sj < slots.length; sj++) {
        if (owner[sj] !== ci) continue;
        owner[sj] = -1; cap[ci]--;
        if (place(sj, seen)) { cap[ci]++; owner[si] = ci; return true; }
        owner[sj] = ci; cap[ci]++;
      }
    }
    return false;
  };
  for (let si = 0; si < slots.length; si++) if (!place(si, new Set())) return null;
  // boş ipucu kareleri: komşu yuvayı, iki yuvası olan karelerden zincirle al
  const clues = [];
  for (let i = 0; i < N; i++) if (clue[i]) clues.push(i);
  for (const x of clues) {
    if (cap[x]) continue;
    // BFS: x ← s1 (B1'de) ← s2 (B2'de) ... Bk'de 2 yuva var
    const prev = new Map([[x, null]]);
    const q = [x];
    let end = -1;
    while (q.length && end < 0) {
      const a = q.shift();
      for (let si = 0; si < slots.length && end < 0; si++) {
        if (!slots[si].opts.some(([ci]) => ci === a)) continue;
        const b = owner[si];
        if (b === a || prev.has(b)) continue;
        prev.set(b, [a, si]);
        if (cap[b] === 2) end = b;
        else q.push(b);
      }
    }
    if (end < 0) return null;
    // zinciri uygula: end'den x'e doğru yuvaları kaydır
    let b = end;
    cap[end]--;
    while (b !== x) {
      const [a, si] = prev.get(b);
      owner[si] = a;
      b = a;
    }
    cap[x]++;
  }
  return slots.map((s, si) => s.opts.find(([ci]) => ci === owner[si]));
}

// ---------- doldurma ----------
function fill(w, h, pat, index, rand, { nodeCap, branch, deadline, must, mustSlot }) {
  const { slots } = pat;
  const N = w * h;
  const letter = new Int8Array(N).fill(-1);
  const filled = new Uint8Array(slots.length);
  const used = new Set();
  const choice = new Array(slots.length);
  // kare → içinden geçen yuvalar
  const cellSlots = Array.from({ length: N }, () => []);
  slots.forEach((s, si) => s.cells.forEach((ci, p) => cellSlots[ci].push([si, p])));
  // her denemede kelimelere rastgele sıra puanı (aynı katmanda karışık)
  const jitter = new Map();
  const tmp = new Map();
  const cand = (si) => {
    const s = slots[si];
    const ix = index.idx.get(s.len);
    if (!ix) return null;
    let out = null;
    for (let p = 0; p < s.len; p++) {
      const l = letter[s.cells[p]];
      if (l < 0) continue;
      const b = ix.bits[p * 26 + l];
      if (!out) { out = tmp.get(s.len) || new Uint32Array(ix.nw); tmp.set(s.len, out); out.set(b); }
      else for (let k = 0; k < ix.nw; k++) out[k] &= b[k];
    }
    return out || ix.all;
  };
  const cnt = new Int32Array(slots.length).fill(-1); // -1: yeniden sayılmalı
  const count = (si) => {
    if (cnt[si] >= 0) return cnt[si];
    const b = cand(si);
    let n = 0;
    if (b) for (let k = 0; k < b.length; k++) if (b[k]) n += popcount(b[k]);
    cnt[si] = n;
    return n;
  };
  const touch = (ci) => { for (const [sj] of cellSlots[ci]) cnt[sj] = -1; };
  let nodes = 0;
  function solve(left) {
    if (left === 0) return true;
    if (++nodes > nodeCap || Date.now() > deadline) return false;
    // en az seçenekli yuva
    let best = -1, bestN = Infinity;
    for (let si = 0; si < slots.length; si++) {
      if (filled[si]) continue;
      const n = count(si);
      if (n < bestN) { bestN = n; best = si; if (n === 0) return false; }
    }
    const s = slots[best];
    const ix = index.idx.get(s.len);
    const bits = cand(best).slice();
    const list = [];
    for (let k = 0; k < bits.length; k++) {
      let x = bits[k];
      while (x) {
        const t = x & -x;
        const i = (k << 5) + (31 - Math.clz32(t));
        x ^= t;
        const e = ix.words[i];
        if (used.has(e.a)) continue;
        let j = jitter.get(e.a);
        if (j === undefined) { j = rand(); jitter.set(e.a, j); }
        list.push([e.tier + j * 0.9, e]);
      }
    }
    if (!list.length) return false;
    list.sort((x, y) => x[0] - y[0]);
    let tries = 0;
    for (const [, e] of list) {
      if (tries++ >= branch) break;
      // yerleştir
      const set = [];
      let ok = true;
      for (let p = 0; p < s.len; p++) {
        const ci = s.cells[p], l = e.a.charCodeAt(p) - A;
        if (letter[ci] < 0) { letter[ci] = l; set.push(ci); touch(ci); }
        else if (letter[ci] !== l) { ok = false; break; }
      }
      if (ok) {
        filled[best] = 1; used.add(e.a); choice[best] = e;
        // ileriye bakış: kesişen boş yuvaların adayı kaldı mı
        for (const ci of set) {
          for (const [sj] of cellSlots[ci]) if (sj !== best && !filled[sj] && count(sj) === 0) { ok = false; break; }
          if (!ok) break;
        }
        if (ok && solve(left - 1)) return true;
        filled[best] = 0; used.delete(e.a); choice[best] = undefined;
      }
      for (const ci of set) { letter[ci] = -1; touch(ci); }
    }
    return false;
  }
  let left = slots.length;
  if (must) {
    // zorunlu kelime: verilen yuvaya önceden yerleşir
    const si = mustSlot;
    slots[si].cells.forEach((ci, p) => { letter[ci] = must.a.charCodeAt(p) - A; touch(ci); });
    filled[si] = 1; used.add(must.a); choice[si] = must; left--;
    for (const ci of slots[si].cells) for (const [sj] of cellSlots[ci]) if (sj !== si && count(sj) === 0) return null;
  }
  if (!solve(left)) return null;
  return { letter, choice };
}

// ---------- dışa açık ----------
export async function generateSlotFill({
  w, h, entries, fillers = [], prio, seed = Date.now(), timeMs = 2500, maxTwo = 5, maxLen = Math.max(w, h),
  clueP = 0.24, nodeCap = 1500, branch = 6, blocks = [], must = null, isCancelled, yieldFn,
}) {
  const rand = mulberry32(seed);
  const index = buildIndex(entries, fillers, prio, maxLen);
  const blk = new Uint8Array(w * h);
  for (const b of blocks) for (let r = b.r; r < b.r + b.h; r++) for (let c = b.c; c < b.c + b.w; c++) blk[r * w + c] = 1;
  const mustE = must ? index.byA.get(must.a) || { ...must, tier: 0 } : null;
  const lensOk = (L) => index.idx.has(L) && index.idx.get(L).words.length >= (L <= 3 ? 8 : 20);
  const deadline = Date.now() + timeMs;
  let lastYield = Date.now();
  while (Date.now() < deadline) {
    if (isCancelled && isCancelled()) return null;
    const pat = makePattern(w, h, rand, { p: clueP * (0.8 + rand() * 0.5), maxLen, maxTwo, lensOk, blk });
    if (pat) {
      if (mustE) {
        // zorunlu kelime: desendeki uygun uzunluktaki yuvalardan birkaçını sırayla dene
        const fit = pat.slots.map((_, si) => si).filter((si) => pat.slots[si].len === mustE.a.length);
        for (let k = fit.length - 1; k > 0; k--) { const j = Math.floor(rand() * (k + 1)); [fit[k], fit[j]] = [fit[j], fit[k]]; }
        for (const si of fit.slice(0, 4)) {
          const res = fill(w, h, pat, index, rand, { nodeCap, branch, deadline, must: mustE, mustSlot: si });
          if (res) return serialize(w, h, pat, res, blk);
        }
      } else {
        const res = fill(w, h, pat, index, rand, { nodeCap, branch, deadline });
        if (res) return serialize(w, h, pat, res, blk);
      }
    }
    if (yieldFn && Date.now() - lastYield > 30) { await yieldFn(); lastYield = Date.now(); }
  }
  return null;
}

function serialize(w, h, pat, res, blk) {
  const rows = [];
  for (let r = 0; r < h; r++) {
    let s = '';
    for (let c = 0; c < w; c++) { const i = r * w + c; s += blk[i] ? '@' : pat.clue[i] ? '#' : String.fromCharCode(A + res.letter[i]); }
    rows.push(s);
  }
  const byCell = new Map();
  pat.slots.forEach((s, si) => {
    const [ci, arrow] = pat.assign[si];
    if (!byCell.has(ci)) byCell.set(ci, []);
    byCell.get(ci).push({ s, e: res.choice[si], arrow });
  });
  const clues = [];
  for (const [ci, list] of byCell) {
    list.sort((p, q) => CLUE_SLOT_ORDER[p.arrow] - CLUE_SLOT_ORDER[q.arrow]);
    list.forEach(({ s, e, arrow }, slot) => {
      clues.push({
        r: Math.floor(ci / w), c: ci % w, slot, of: list.length, arrow,
        text: e.c, answer: e.a, sr: s.r, sc: s.c, dir: s.dir,
        ...(e.tier === 2 ? { filler: true } : null),
      });
    });
  }
  return { w, h, rows, clues };
}
