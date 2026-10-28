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
  const at = (r, c) => r * w + c;
  const clue = new Uint8Array(N);
  for (let i = 0; i < N; i++) clue[i] = !blk[i] && rand() < p ? 1 : 0;
  clue[0] = 1;
  const isL = (r, c) => r >= 0 && c >= 0 && r < h && c < w && !clue[at(r, c)] && !blk[at(r, c)];
  const hLen = (r, c) => { let k = 0; while (isL(r, c + k)) k++; return k; }; // (r,c)'den sağa harf sayısı
  const vLen = (r, c) => { let k = 0; while (isL(r + k, c)) k++; return k; };
  const hStart = (r, c) => isL(r, c) && !isL(r, c - 1);
  const vStart = (r, c) => isL(r, c) && !isL(r - 1, c);
  // ipucu karesi bir kelimeye ipucu verebilir mi
  const useful = (r, c) =>
    (hStart(r, c + 1) && hLen(r, c + 1) >= 2) || // R
    (vStart(r + 1, c) && vLen(r + 1, c) >= 2) || // D
    (c + 1 < w && vStart(r, c + 1) && vLen(r, c + 1) >= 2 && r === 0) || // RD (yalnız üst satırda gerekir; altta D zaten var)
    (r + 1 < h && hStart(r + 1, c) && hLen(r + 1, c) >= 2 && c === 0) || // DR (yalnız sol sütunda)
    (c + 1 < w && vStart(r, c + 1) && vLen(r, c + 1) >= 2) ||
    (r + 1 < h && hStart(r + 1, c) && hLen(r + 1, c) >= 2);

  for (let it = 0; it < 80; it++) {
    let changed = false;
    // uzun dizileri böl
    for (let r = 0; r < h; r++)
      for (let c = 0; c < w; c++) {
        if (hStart(r, c)) { const L = hLen(r, c); if (L > maxLen || (L >= 2 && !lensOk(L))) { clue[at(r, c + Math.min(L - 1, 1 + Math.floor(rand() * (L - 1))))] = 1; changed = true; } }
        if (vStart(r, c)) { const L = vLen(r, c); if (L > maxLen || (L >= 2 && !lensOk(L))) { clue[at(r + Math.min(L - 1, 1 + Math.floor(rand() * (L - 1))), c)] = 1; changed = true; } }
      }
    // ipucu yeri olmayan kelime (solu/üstü kenar ya da fotoğraf): başı ipucu karesi olur, kelime bir kare kısalır
    for (let r = 0; r < h; r++)
      for (let c = 0; c < w; c++) {
        if (hStart(r, c) && hLen(r, c) >= 2 && !(c > 0 && clue[at(r, c - 1)]) && !(r > 0 && clue[at(r - 1, c)])) { clue[at(r, c)] = 1; changed = true; continue; }
        if (vStart(r, c) && vLen(r, c) >= 2 && !(r > 0 && clue[at(r - 1, c)]) && !(c > 0 && clue[at(r, c - 1)])) { clue[at(r, c)] = 1; changed = true; }
      }
    // yalnız harf (iki yönde de 1 harflik dizi): komşu ipucunu harfe çevir ya da kendisi ipucu olsun
    for (let r = 0; r < h; r++)
      for (let c = 0; c < w; c++) {
        if (!isL(r, c)) continue;
        const hl = (() => { let a = c; while (isL(r, a - 1)) a--; return hLen(r, a); })();
        const vl = (() => { let a = r; while (isL(a - 1, c)) a--; return vLen(a, c); })();
        if (hl >= 2 || vl >= 2) continue;
        const nb = [[r, c + 1], [r + 1, c], [r, c - 1], [r - 1, c]].filter(([y, x]) => y >= 0 && x >= 0 && y < h && x < w && clue[at(y, x)] && !(y === 0 && x === 0));
        if (nb.length && rand() < 0.75) { const [y, x] = nb[Math.floor(rand() * nb.length)]; clue[at(y, x)] = 0; }
        else clue[at(r, c)] = 1;
        changed = true;
      }
    // iki harfli kelime fazlaysa: birinin sonundaki ipucu karesini kaldır, kelime uzasın (komşu diziyle birleşir)
    if (!changed) {
      const twos = [];
      for (let r = 0; r < h; r++)
        for (let c = 0; c < w; c++) {
          if (hStart(r, c) && hLen(r, c) === 2) {
            if (c + 2 < w && clue[at(r, c + 2)]) twos.push(at(r, c + 2));
            else if (c > 1 && clue[at(r, c - 1)]) twos.push(at(r, c - 1)); // satır sonunda: öndeki ipucunu kaldır
          }
          if (vStart(r, c) && vLen(r, c) === 2) {
            if (r + 2 < h && clue[at(r + 2, c)]) twos.push(at(r + 2, c));
            else if (r > 1 && clue[at(r - 1, c)]) twos.push(at(r - 1, c)); // sütun sonunda
          }
        }
      if (twos.length > maxTwo) { clue[twos[Math.floor(rand() * twos.length)]] = 0; changed = true; }
    }
    // işe yaramayan ipucu karesi harfe döner
    for (let r = 0; r < h; r++)
      for (let c = 0; c < w; c++) if (clue[at(r, c)] && !(r === 0 && c === 0) && !useful(r, c)) { clue[at(r, c)] = 0; changed = true; }
    if (!changed) break;
    if (it === 79) return null;
  }
  if (!clue[0]) return null;
  // yuvalar
  const slots = [];
  for (let r = 0; r < h; r++)
    for (let c = 0; c < w; c++) {
      if (hStart(r, c) && hLen(r, c) >= 2) {
        const L = hLen(r, c), opts = [];
        if (c > 0 && clue[at(r, c - 1)]) opts.push([at(r, c - 1), 'R']);
        if (r > 0 && clue[at(r - 1, c)]) opts.push([at(r - 1, c), 'DR']);
        slots.push({ r, c, dir: 'A', len: L, cells: Array.from({ length: L }, (_, k) => at(r, c + k)), opts });
      }
      if (vStart(r, c) && vLen(r, c) >= 2) {
        const L = vLen(r, c), opts = [];
        if (r > 0 && clue[at(r - 1, c)]) opts.push([at(r - 1, c), 'D']);
        if (c > 0 && clue[at(r, c - 1)]) opts.push([at(r, c - 1), 'RD']);
        slots.push({ r, c, dir: 'D', len: L, cells: Array.from({ length: L }, (_, k) => at(r + k, c)), opts });
      }
    }
  if (slots.some((s) => !s.opts.length || s.len > maxLen || !lensOk(s.len))) return null;
  if (slots.filter((s) => s.len === 2).length > maxTwo) return null;
  // her harf bir yuvada mı (onarım sonrası güvence)
  const cover = new Uint8Array(N);
  for (const s of slots) for (const i of s.cells) cover[i] = 1;
  for (let i = 0; i < N; i++) if (!clue[i] && !blk[i] && !cover[i]) return null;
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
  const count = (si) => {
    const b = cand(si);
    if (!b) return 0;
    let n = 0;
    for (let k = 0; k < b.length; k++) if (b[k]) n += popcount(b[k]);
    return n;
  };
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
        if (letter[ci] < 0) { letter[ci] = l; set.push(ci); }
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
      for (const ci of set) letter[ci] = -1;
    }
    return false;
  }
  let left = slots.length;
  if (must) {
    // zorunlu kelime: verilen yuvaya önceden yerleşir
    const si = mustSlot;
    slots[si].cells.forEach((ci, p) => { letter[ci] = must.a.charCodeAt(p) - A; });
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
