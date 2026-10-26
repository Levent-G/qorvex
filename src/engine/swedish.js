// Boşluksuz çengel bulmaca üretici (İsveç tipi): ızgara satır satır, soldan sağa kurulur.
// Her kare ya bir harf ya da ipucu karesidir; boş kare kavramı yoktur. Bir kare doldurulamazsa
// geri dönülüp önceki seçim değiştirilir (geri izleme). Kurallar:
// - Yatay/dikey her harf dizisi (2+ harf) sözlükte bir kelimedir ve tek kullanılır; 1 harflik dizi serbesttir.
// - Her harf en az bir kelimenin içindedir (yalnız harf olmaz).
// - Her kelimenin ipucu, başının solunda (R/RD) ya da üstünde (D/DR) bir ipucu karesindedir; bir karede en fazla 2 ipucu.
// - Her ipucu karesi en az bir kelimeye ipucu verir (ipucusuz kare = boşluk olmaz).
import { mulberry32, shuffle, CLUE_SLOT_ORDER } from './generator';

const CLUE = '#';

// Eşzamansız: her denemeden sonra yieldFn ile arayüze nefes aldırır (telefon donmasın). Bulamazsa null.
export async function generateSwedish({ w, h, entries, fillers = [], prio, seed = Date.now(), timeMs = 2500, maxTwo = 4, isCancelled, nodeCap = 2000, perCell = 4, scanCap = 40, yieldFn }) {
  const rand = mulberry32(seed);
  // sözlük: öğrenme kelimeleri önce, dolgular sonra (aynı kelime bir kez)
  const byA = new Map();
  for (const e of entries) if (/^[A-Z]{2,}$/.test(e.a) && e.a.length <= Math.max(w, h)) byA.set(e.a, { ...e, tier: prio && prio.has(e.a) ? 0 : 1 });
  for (const e of fillers) if (/^[A-Z]{2,}$/.test(e.a) && e.a.length <= Math.max(w, h) && !byA.has(e.a)) byA.set(e.a, { ...e, tier: 2 });
  const prefixes = new Set();
  const minExt = new Map();
  const prefCount = new Map(); // ön ek → bu ön ekle başlayan (daha uzun) kelime sayısı
  const byLen = new Map();
  for (const e of byA.values()) {
    for (let k = 1; k < e.a.length; k++) {
      const pf = e.a.slice(0, k);
      prefixes.add(pf);
      prefCount.set(pf, (prefCount.get(pf) || 0) + 1);
      const ext = e.a.length - k; // bu ön ekten sonra en az kaç harf daha gerekir
      if (!(minExt.get(pf) <= ext)) minExt.set(pf, ext);
    }
    if (!byLen.has(e.a.length)) byLen.set(e.a.length, []);
    byLen.get(e.a.length).push(e);
  }
  const deadline = Date.now() + timeMs;
  const N = w * h;
  const at = (r, c) => r * w + c;

  let best = null;
  let attempts = 0;
  for (let attempt = 0; attempt < 5000 && Date.now() < deadline; attempt++) {
    attempts++;
    if (isCancelled && isCancelled()) break;
    const res = solveOnce(deadline);
    if (res) { best = res; break; }
    if (yieldFn) await yieldFn();
  }
  return best;

  function solveOnce(until) {
    const cell = new Array(N).fill(null); // null | '#' | 'A'..'Z'
    const inH = new Uint8Array(N); // bu harf 2+ harfli yatay kelimede mi
    const claims = new Uint8Array(N); // ipucu karesindeki ipucu sayısı
    const words = []; // { a, r, c, dir, ci, arrow }
    const used = new Set();
    let twos = 0;
    let nodes = 0;
    // her sütunda açık dikey dizi: başlangıç satırı (-1: yok)
    const vStart = new Array(w).fill(-1);
    // açık dikey dizinin ipucu yeri yoksa (üstü/solu ipucu değil) dizi 1 harfte kalmalı: alt kare ipucu olur
    const vNoClue = new Uint8Array(w);
    const vStr = new Array(w).fill(''); // sütundaki açık dikey dizinin harfleri
    // sırayla listelerin karışık kopyaları (her denemede farklı bulmaca)
    const lists = new Map();
    for (const [L, arr] of byLen) {
      const t0 = shuffle(arr.filter((e) => e.tier === 0), rand), t1 = shuffle(arr.filter((e) => e.tier === 1), rand), t2 = shuffle(arr.filter((e) => e.tier === 2), rand);
      lists.set(L, [...t0, ...t1, ...t2]);
    }

    // c sütununun açık dikey dizisi (çağrıldığı anda o sütunun bu satırdaki karesi henüz yazılmamış ya da az önce yazılmış olur)
    const vRunStr = (c) => vStr[c];
    const letterOkV = (r, c, ch) => {
      const s = vRunStr(c, r);
      if (!s) return true;
      if (vNoClue[c]) return false; // ipucusuz dikey dizi uzayamaz
      const t = s + ch;
      // son satırda dizi kapanır: tam kelime olmalı
      if (r === h - 1) return byA.has(t) && !used.has(t);
      if (byA.has(t) && !used.has(t)) return true;
      // kalan satırlara sığacak bir kelimeyle tamamlanabilmeli
      const ext = minExt.get(t);
      return ext !== undefined && ext <= h - 1 - r;
    };
    const isClueOrEdge = (r, c) => r < 0 || c < 0 || cell[at(r, c)] === CLUE;

    // dikey diziyi (c sütunu, r satırında biten: r hariç) kapat: 2+ harfse kelime + ipucu ata; 1 harfse yatayda olmalı
    function closeV(c, r, undo) {
      const s0 = vStart[c];
      if (s0 < 0) return true;
      const len = r - s0;
      vStart[c] = -1;
      undo.push(() => { vStart[c] = s0; });
      const s = vStr[c];
      vStr[c] = '';
      undo.push(() => { vStr[c] = s; });
      if (len === 1) return !!inH[at(s0, c)];
      if (!byA.has(s) || used.has(s)) return false;
      if (s.length === 2 && twos >= maxTwo) return false;
      // ipucu: üstte (D) ya da başın solunda (RD)
      const opts = [];
      if (s0 > 0 && cell[at(s0 - 1, c)] === CLUE) opts.push([at(s0 - 1, c), 'D']);
      if (c > 0 && cell[at(s0, c - 1)] === CLUE) opts.push([at(s0, c - 1), 'RD']);
      opts.sort((x, y) => claims[x[0]] - claims[y[0]]);
      const o = opts.find((x) => claims[x[0]] < 2);
      if (!o) return false;
      claims[o[0]]++;
      used.add(s);
      if (s.length === 2) twos++;
      words.push({ a: s, r: s0, c, dir: 'D', ci: o[0], arrow: o[1] });
      undo.push(() => { claims[o[0]]--; used.delete(s); if (s.length === 2) twos--; words.pop(); });
      return true;
    }
    // İleriye bakma: (r,c)'ye harf kondu; c sütunu bir alt satırda devam edebilir mi? (harf ya da ipucu karesi)
    function colFeasible(r, c) {
      if (r >= h - 1) return true; // son satırda dizi zaten kapandı
      const s = vRunStr(c, r + 1);
      // alt kareye ipucu: dikey dizi kapanır (1 harfse yatayda olmalı; 2+ harfse kullanılmamış kelime)
      const nr = r + 1;
      const clueBanned = (nr === h - 1 && c >= w - 2) || (c === w - 1 && nr >= h - 2);
      if (!clueBanned && (s.length === 1 ? inH[at(r, c)] : byA.has(s) && !used.has(s))) return true;
      if (vNoClue[c]) return false; // uzayamaz ve alta ipucu da konamıyor
      // alt kareye harf: kalan satırlara sığan bir kelimeyle devam edebilmeli
      const ext = minExt.get(s);
      return ext !== undefined && ext <= h - 1 - r;
    }
    // ipucu karesi koy: o sütunun açık dikey dizisi kapanır
    function putClue(r, c, undo) {
      // son satır/sütunun sonunda ipucu karesi hiçbir yöne kelime veremez
      if ((r === h - 1 && c >= w - 2) || (c === w - 1 && r >= h - 2)) return false;
      cell[at(r, c)] = CLUE;
      undo.push(() => { cell[at(r, c)] = null; });
      return closeV(c, r, undo);
    }
    function putLetter(r, c, ch, hWord, undo) {
      cell[at(r, c)] = ch;
      inH[at(r, c)] = hWord ? 1 : 0;
      undo.push(() => { cell[at(r, c)] = null; inH[at(r, c)] = 0; });
      const prevStr = vStr[c];
      vStr[c] = vStart[c] < 0 ? ch : prevStr + ch;
      undo.push(() => { vStr[c] = prevStr; });
      if (vStart[c] < 0) {
        vStart[c] = r;
        // dikey kelime olursa ipucu: üstte (D) ya da solda (RD) ipucu karesi gerekir
        // ipucu karesi var ve dolu değil (en fazla 2 ipucu)
        const has = (r > 0 && cell[at(r - 1, c)] === CLUE && claims[at(r - 1, c)] < 2) || (c > 0 && cell[at(r, c - 1)] === CLUE && claims[at(r, c - 1)] < 2);
        const prev = vNoClue[c];
        vNoClue[c] = has ? 0 : 1;
        undo.push(() => { vStart[c] = -1; vNoClue[c] = prev; });
      }
      if (r === h - 1) return closeV(c, h, undo);
      return true;
    }
    // satır bitince: bir üst satırdaki ipucu karelerinden hiç ipucu alamayacak olan var mı?
    function rowOk(r) {
      if (r < 1) return true;
      const pr = r - 1;
      for (let c = 0; c < w; c++) {
        const i = at(pr, c);
        if (cell[i] !== CLUE || claims[i]) continue;
        // hâlâ alabilir mi: altından başlayan açık dikey dizi (D) ya da sağından başlayan açık dikey dizi (RD)
        const dOpen = cell[at(r, c)] !== CLUE && vStart[c] === r;
        const rdOpen = c + 1 < w && vStart[c + 1] === pr;
        if (!dOpen && !rdOpen) return false;
      }
      return true;
    }
    function finalOk() {
      for (let i = 0; i < N; i++) if (cell[i] === CLUE && !claims[i]) return false;
      return true;
    }

    // (r,c) karesinden devam et
    function step(r, c) {
      if (Date.now() > until) return false;
      if (++nodes > nodeCap) return false;
      if (c >= w) {
        if (!rowOk(r)) return false;
        if (r + 1 >= h) return finalOk();
        return step(r + 1, 0);
      }
      if (cell[at(r, c)] !== null) return step(r, c + 1);
      const opts = [];
      // her sütunda bu satırda konabilecek harfler (bit maskesi): dikey desen bir kez hesaplanır
      const mask = new Int32Array(w);
      for (let cc = c; cc < w; cc++) {
        let m = 0;
        for (let q = 0; q < 26; q++) if (letterOkV(r, cc, String.fromCharCode(65 + q))) m |= 1 << q;
        mask[cc] = m;
      }
      // 1) bu kareden başlayan yatay kelime (solu ipucu ya da kenar)
      const maxL = w - c;
      const hClue = c > 0 ? at(r, c - 1) : -1; // R ipucu
      const lens = shuffle(Array.from({ length: Math.min(maxL, 9) - 1 }, (_, i) => i + 2), rand);
      for (const L of lens) {
        const list = lists.get(L);
        if (!list) continue;
        // ipucu yeri: solda (R) ya da üstte (DR)
        const canR = c > 0 && cell[hClue] === CLUE && claims[hClue] < 2;
        const up = r > 0 ? at(r - 1, c) : -1;
        const canDR = r > 0 && cell[up] === CLUE && claims[up] < 2;
        if (!canR && !canDR) continue;
        if (c + L < w && cell[at(r, c + L)] !== null) continue;
        if (L === 2 && twos >= maxTwo) continue;
        let seen = 0;
        for (const e of list) {
          if (used.has(e.a)) continue;
          let ok = true;
          for (let k = 0; k < L && ok; k++) if (!((mask[c + k] >> (e.a.charCodeAt(k) - 65)) & 1)) ok = false;
          if (!ok) continue;
          // puan: her harfin altındaki dikey dizinin kaç kelimeyle devam edebildiği (log), + öğrenme kelimesi önceliği
          let sc = 0;
          for (let k = 0; k < L; k++) {
            const v = vRunStr(c + k, r) + e.a[k];
            const cont = (prefCount.get(v) || 0) + (byA.has(v) ? 1 : 0);
            sc += Math.log(1 + cont);
          }
          sc += (2 - e.tier) * 1.5 + rand() * 1.2;
          opts.push({ kind: 'word', e, L, ci: canR ? hClue : up, arrow: canR ? 'R' : 'DR', sc });
          if (++seen >= scanCap) break;
        }
      }
      // en çok seçenek bırakan birkaç kelime
      opts.sort((x, y) => y.sc - x.sc);
      const wordOpts = opts.slice(0, perCell);
      const all = [...wordOpts];
      // 2) tek harf (yatayda 1 harflik dizi; dikeyde kelime olmalı) — yalnızca dikey dizi devam ediyorsa
      if (vStart[c] >= 0 && r < h - 1) {
        const letters = shuffle('ETAOINSRHLDCUMPGBYFWKVXZJQ'.split(''), rand).filter((ch) => (mask[c] >> (ch.charCodeAt(0) - 65)) & 1).slice(0, 3);
        for (const ch of letters) all.push({ kind: 'single', ch });
      }
      // 3) ipucu karesi
      all.push({ kind: 'clue' });
      // biraz rastgelelik: ipucunu bazen öne al (çok kelimeli ama sıkışmayan ızgara)
      if (rand() < 0.15) all.unshift(all.pop());

      for (const o of all) {
        const undo = [];
        let ok = true;
        if (o.kind === 'clue') ok = putClue(r, c, undo);
        else if (o.kind === 'single') {
          ok = putLetter(r, c, o.ch, false, undo) && colFeasible(r, c);
          // sağına ipucu karesi ya da kenar gelmeli (yatay dizi 1 harf kalsın)
          if (ok && c + 1 < w) ok = putClue(r, c + 1, undo);
        } else {
          const { e, L } = o;
          // ipucunu ata
          claims[o.ci]++;
          undo.push(() => { claims[o.ci]--; });
          used.add(e.a);
          if (L === 2) twos++;
          words.push({ a: e.a, r, c, dir: 'A', ci: o.ci, arrow: o.arrow });
          undo.push(() => { used.delete(e.a); if (L === 2) twos--; words.pop(); });
          for (let k = 0; k < L && ok; k++) ok = putLetter(r, c + k, e.a[k], true, undo);
          for (let k = 0; k < L && ok; k++) ok = colFeasible(r, c + k);
          if (ok && c + L < w) ok = putClue(r, c + L, undo);
        }
        if (ok && step(r, c + (o.kind === 'word' ? o.L + (c + o.L < w ? 1 : 0) : o.kind === 'single' ? 2 : 1))) return true;
        while (undo.length) undo.pop()();
      }
      return false;
    }

    if (!step(0, 0)) return null;
    // sonuç: generator.serialize ile aynı biçim
    const rows = [];
    for (let r = 0; r < h; r++) {
      let s = '';
      for (let c = 0; c < w; c++) s += cell[at(r, c)];
      rows.push(s);
    }
    const byCell = new Map();
    for (const x of words) {
      if (!byCell.has(x.ci)) byCell.set(x.ci, []);
      byCell.get(x.ci).push(x);
    }
    const clues = [];
    for (const [ci, list] of byCell) {
      list.sort((p, q) => CLUE_SLOT_ORDER[p.arrow] - CLUE_SLOT_ORDER[q.arrow]);
      list.forEach((x, slot) => {
        const e = byA.get(x.a);
        clues.push({
          r: Math.floor(ci / w), c: ci % w, slot, of: list.length, arrow: x.arrow,
          text: e.c, answer: x.a, sr: x.r, sc: x.c, dir: x.dir,
          ...(e.tier === 2 ? { filler: true } : null),
        });
      });
    }
    return { w, h, rows, clues };
  }
}
