// Reels reklamı: "Tek uygulama, 9 bulmaca oyunu" — her oyun kendi kartında kısa bir animasyonla.
// Kullanım: node scripts/make-ad-games.mjs [--stills 3,5.5,...] [--only-stills] → store/ads/qorvex-ad-games.mp4
import { W, H, C, esc, logo, prog, easeOut, easeInOut, easeBack, lerp, clamp, brandDefs, brandBg, cta, makeVideo } from './ad-kit.mjs';

const DUR = 20;
const T_GAMES = 2.0, PER = 1.5;

// ---------- küçük çizim yardımcıları (yerel koordinat, kutu 780x560) ----------
export const BW = 780, BH = 560;
const cellR = (x, y, s, fill = '#FFFFFF') => `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${fill}" stroke="${C.LINE}" stroke-width="2"/>`;
const ltr = (x, y, s, ch, o = 1, color = C.INK, k = 0.56) => (o > 0 ? `<text x="${x + s / 2}" y="${y + s / 2 + s * 0.2}" opacity="${o}" text-anchor="middle" font-family="Libre Franklin" font-weight="600" font-size="${s * k}" fill="${color}">${ch}</text>` : '');
const clueTxt = (x, y, s, txt, size = 22) => `<text x="${x + s / 2}" y="${y + s / 2 + size * 0.35}" text-anchor="middle" font-family="Archivo Narrow" font-weight="500" font-size="${size}" fill="${C.INK}">${esc(txt)}</text>`;
const arrowR = (x, y) => `<path d="M${x} ${y - 8}l12 8-12 8z" fill="${C.INK}"/>`;
const arrowD = (x, y) => `<path d="M${x - 8} ${y}l8 12 8-12z" fill="${C.INK}"/>`;
const center = (gw, gh) => [(BW - gw) / 2, (BH - gh) / 2];
// bir dizi öğeyi p (0..1) boyunca sırayla göster: i. öğenin görünürlüğü
const seq = (p, i, n, a = 0.08, b = 0.82) => easeOut(clamp((p - a - ((b - a) * i) / n) / ((b - a) / n) * 1.4));

// 1) Çengel Bulmaca: ipucu kareleri + harfler satır satır dolar, biten kelime yeşil
function gArrow(p) {
  const s = 100, cols = 6;
  const rowsDef = [['Bitki', 'PLANT'], ['Elma', 'APPLE'], ['Su', 'WATER'], ['Ev', 'HOUSE']];
  const [ox, oy] = center(cols * s, rowsDef.length * s);
  let g = '';
  const n = rowsDef.length * 5;
  rowsDef.forEach(([clue, word], ri) => {
    const y = oy + ri * s;
    g += cellR(ox, y, s, C.CLUE) + clueTxt(ox, y, s, clue) + arrowR(ox + s, y + s / 2);
    const os = [...word].map((_, k) => seq(p, ri * 5 + k, n));
    const done = os.every((o) => o >= 1);
    [...word].forEach((ch, k) => { const x = ox + (k + 1) * s; g += cellR(x, y, s, done ? C.OK : os[k] > 0 ? C.HL : '#FFFFFF') + ltr(x, y, s, ch, os[k]); });
  });
  return g + `<rect x="${ox}" y="${oy}" width="${cols * s}" height="${rowsDef.length * s}" fill="none" stroke="${C.INK}" stroke-width="4" rx="4"/>`;
}

// 2) Kare Bulmaca: numaralı klasik ızgara, harfler rastgele sırayla
function gCross(p) {
  const rows = ['MOON#', 'A#W#S', 'PLANE', '#E#T#', 'SEAT#'];
  const nums = { '0,0': 1, '0,2': 2, '0,4': 3, '1,4': 3, '2,0': 4, '2,4': 5, '4,0': 6 };
  const s = 100;
  const [ox, oy] = center(500, 500);
  const order = [];
  rows.forEach((r, ri) => [...r].forEach((ch, c) => ch !== '#' && order.push([ri, c, ch])));
  const rk = order.map((_, i) => (i * 7919) % order.length);
  let g = '';
  order.forEach(([ri, c, ch], i) => {
    const x = ox + c * s, y = oy + ri * s;
    const o = seq(p, rk[i], order.length);
    g += cellR(x, y, s, o >= 1 ? '#FFFFFF' : o > 0 ? C.HL : '#FFFFFF') + ltr(x, y, s, ch, o);
  });
  rows.forEach((r, ri) => [...r].forEach((ch, c) => { if (ch === '#') g += `<rect x="${ox + c * s}" y="${oy + ri * s}" width="${s}" height="${s}" fill="${C.INK}"/>`; }));
  for (const [k, n] of Object.entries(nums)) { const [ri, c] = k.split(',').map(Number); if (rows[ri][c] !== '#') g += `<text x="${ox + c * s + 8}" y="${oy + ri * s + 24}" font-family="Hanken Grotesk" font-weight="700" font-size="20" fill="${C.SOFT}">${n}</text>`; }
  return g + `<rect x="${ox}" y="${oy}" width="500" height="500" fill="none" stroke="${C.INK}" stroke-width="4"/>`;
}

// 3) Şifreli Bulmaca: her karede sayı; bir sayı çözülünce aynı sayılı tüm kareler birden açılır
function gCode(p) {
  const rows = ['APPLE', 'SMILE', 'TOAST', 'WATER', 'HOUSE'];
  const letters = [...new Set(rows.join(''))];
  const num = Object.fromEntries(letters.map((l, i) => [l, i + 1]));
  const order = ['E', 'A', 'T', 'S', 'O', 'L', 'P', 'M', 'I', 'H', 'U', 'W', 'R'];
  const s = 100;
  const [ox, oy] = center(500, 500);
  let g = '';
  rows.forEach((r, ri) => [...r].forEach((ch, c) => {
    const x = ox + c * s, y = oy + ri * s;
    const o = seq(p, order.indexOf(ch), order.length);
    const flash = o > 0 && o < 1;
    g += cellR(x, y, s, flash ? '#C9EEF2' : '#FFFFFF') + ltr(x, y + 6, s, ch, o, C.INK, 0.5) +
      `<text x="${x + 8}" y="${y + 24}" font-family="Hanken Grotesk" font-weight="700" font-size="20" fill="${C.SOFT}">${num[ch]}</text>`;
  }));
  return g + `<rect x="${ox}" y="${oy}" width="500" height="500" fill="none" stroke="${C.INK}" stroke-width="4"/>`;
}

// 4) Sarmal: yol dıştan içe çizilir, harfler yol geçtikçe belirir
function gSpiral(p) {
  const n = 5, s = 100;
  const [ox, oy] = center(500, 500);
  const path = [];
  let top = 0, left = 0, bottom = n - 1, right = n - 1;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) path.push([top, c]);
    top++;
    for (let r = top; r <= bottom; r++) path.push([r, right]);
    right--;
    if (top <= bottom) { for (let c = right; c >= left; c--) path.push([bottom, c]); bottom--; }
    if (left <= right) { for (let r = bottom; r >= top; r--) path.push([r, left]); left++; }
  }
  const text = 'STARTREEEGGNOTERAINBOWCAT';
  const k = clamp((p - 0.05) / 0.85) * (path.length - 1);
  let g = '';
  path.forEach(([r, c], i) => { g += cellR(ox + c * s, oy + r * s, s, i <= k ? '#FFFFFF' : '#F6F3EE'); });
  const pts = path.slice(0, Math.floor(k) + 1).map(([r, c]) => [ox + c * s + s / 2, oy + r * s + s / 2]);
  const fr = k - Math.floor(k);
  if (Math.floor(k) + 1 < path.length) { const [r, c] = path[Math.floor(k) + 1]; const a = pts[pts.length - 1]; pts.push([lerp(a[0], ox + c * s + s / 2, fr), lerp(a[1], oy + r * s + s / 2, fr)]); }
  g += `<polyline points="${pts.map((q) => q.join(',')).join(' ')}" fill="none" stroke="${C.TEAL}" stroke-opacity="0.35" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>`;
  path.forEach(([r, c], i) => { g += ltr(ox + c * s, oy + r * s, s, text[i], clamp(k - i + 1)); });
  return g + `<rect x="${ox}" y="${oy}" width="500" height="500" fill="none" stroke="${C.INK}" stroke-width="4"/>`;
}

// 5) Kelime Avı: harf tablosunda kelimelerin üstüne sırayla işaret çizilir
function gSearch(p) {
  const grid = ['QAPPLEZ', 'KTRWCMB', 'DOREAPN', 'HSLEETX', 'UVBGKFR', 'MYCIDOG'];
  const s = 86;
  const [ox, oy0] = center(7 * s, 6 * s);
  const oy = oy0 - 30;
  const words = [
    { w: 'APPLE', a: [0, 1], b: [0, 5] },
    { w: 'TREE', a: [1, 1], b: [4, 4] },
    { w: 'DOG', a: [5, 4], b: [5, 6] },
  ];
  let g = '';
  words.forEach((wd, i) => {
    const q = easeInOut(clamp((p - 0.1 - i * 0.27) / 0.22));
    if (q <= 0) return;
    const x1 = ox + wd.a[1] * s + s / 2, y1 = oy + wd.a[0] * s + s / 2;
    const x2 = lerp(x1, ox + wd.b[1] * s + s / 2, q), y2 = lerp(y1, oy + wd.b[0] * s + s / 2, q);
    g += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${[C.TEAL, C.ORANGE, '#7A5CC7'][i]}" stroke-opacity="0.32" stroke-width="${s * 0.78}" stroke-linecap="round"/>`;
  });
  grid.forEach((row, r) => [...row].forEach((ch, c) => { g += ltr(ox + c * s, oy + r * s, s, ch, 1, C.INK, 0.5); }));
  // bulunan kelimeler
  words.forEach((wd, i) => {
    const found = p > 0.1 + i * 0.27 + 0.22;
    const x = 120 + i * 190, y = oy + 6 * s + 34;
    g += `<rect x="${x}" y="${y}" width="170" height="52" rx="26" fill="${found ? C.OK : '#F2EFEA'}"/>
      <text x="${x + (found ? 72 : 85)}" y="${y + 35}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="25" fill="${C.INK}" ${found ? '' : 'fill-opacity="0.45"'}>${wd.w}</text>
      ${found ? `<path d="M${x + 128} ${y + 27}l8 8 14-16" fill="none" stroke="${C.INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` : ''}`;
  });
  return g;
}

// 6) Kelime Merdiveni: CAT → COT → DOT → DOG, değişen harf vurgulu
function gLadder(p) {
  const rungs = ['CAT', 'COT', 'DOT', 'DOG'];
  const changed = [-1, 1, 0, 2];
  const s = 96, gap = 34;
  const ox = (BW - 3 * s) / 2, oy = (BH - (4 * s + 3 * gap)) / 2;
  let g = '';
  rungs.forEach((wd, i) => {
    const o = seq(p, i, 4, 0.05, 0.85);
    const y = oy + i * (s + gap) + 20 * (1 - o);
    [...wd].forEach((ch, c) => {
      const x = ox + c * s;
      const hot = c === changed[i] && o > 0;
      g += `<g opacity="${i === 0 ? 1 : o}">${cellR(x, y, s, hot ? '#C9EEF2' : i === 3 && o >= 1 ? C.OK : '#FFFFFF')}${ltr(x, y, s, ch, 1)}</g>`;
    });
    if (i < 3) g += `<path d="M${BW / 2} ${oy + i * (s + gap) + s + 6}v${gap - 12}" stroke="${C.SOFT}" stroke-width="3" opacity="${seq(p, i + 1, 4, 0.05, 0.85)}"/>`;
  });
  g += `<text x="${ox - 30}" y="${oy + s / 2 + 10}" text-anchor="end" font-family="Hanken Grotesk" font-weight="700" font-size="26" fill="${C.SOFT}">kedi</text>
    <text x="${ox + 3 * s + 30}" y="${oy + 3 * (s + gap) + s / 2 + 10}" opacity="${seq(p, 3, 4, 0.05, 0.85)}" font-family="Hanken Grotesk" font-weight="700" font-size="26" fill="${C.SOFT}">köpek</text>`;
  return g;
}

// 7) Karışık Harfler: karolar karışık sıradan doğru sıraya kayar
function gJumble(p) {
  const target = 'APPLE', start = [2, 4, 0, 3, 1]; // başlangıçta i. harf start[i] konumunda
  const s = 112, gap = 14;
  const ox = (BW - (5 * s + 4 * gap)) / 2, oy = 230;
  const q = easeInOut(clamp((p - 0.2) / 0.5));
  const ok = p > 0.75;
  let g = `<text x="${BW / 2}" y="140" text-anchor="middle" font-family="Newsreader" font-weight="600" font-size="46" fill="${C.INK}">“Elma”</text>`;
  [...target].forEach((ch, i) => {
    const x = lerp(ox + start[i] * (s + gap), ox + i * (s + gap), q);
    const y = oy - Math.sin(q * Math.PI) * (i % 2 ? 40 : -30);
    g += `<rect x="${x}" y="${y + 6}" width="${s}" height="${s}" rx="16" fill="#000" fill-opacity="0.12"/>
      <rect x="${x}" y="${y}" width="${s}" height="${s}" rx="16" fill="${ok ? C.OK : '#FFFFFF'}" stroke="${C.LINE}" stroke-width="2"/>${ltr(x, y, s, ch, 1)}`;
  });
  return g;
}

// 8) Şifreli Cümle: harflerin altında şifre sayıları, harfler açılır, Türkçesi gelir
function gCrypto(p) {
  const words = ['I', 'LOVE', 'TEA'];
  const code = { I: 9, L: 12, O: 15, V: 22, E: 5, T: 20, A: 1 };
  const s = 76, gap = 10, wgap = 44;
  const total = words.reduce((a, w) => a + w.length * (s + gap), 0) + wgap * (words.length - 1);
  let x = (BW - total) / 2;
  const y = 170;
  let g = '';
  let i = 0;
  const n = words.join('').length;
  for (const wd of words) {
    for (const ch of wd) {
      const o = seq(p, i++, n, 0.05, 0.7);
      g += `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="8" fill="${o >= 1 ? '#FFFFFF' : '#F6F3EE'}" stroke="${C.LINE}" stroke-width="2"/>${ltr(x, y, s, ch, o)}
        <text x="${x + s / 2}" y="${y + s + 38}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="26" fill="${C.SOFT}">${code[ch]}</text>`;
      x += s + gap;
    }
    x += wgap - gap;
  }
  const tr = easeOut(prog(p, 0.75, 0.95));
  g += `<text x="${BW / 2}" y="${420 + 20 * (1 - tr)}" opacity="${tr}" text-anchor="middle" font-family="Newsreader" font-style="italic" font-weight="500" font-size="48" fill="${C.INK}">“Çayı seviyorum.”</text>`;
  return g;
}

// 9) Resimli Bulmaca: ortada çizilmiş elma, "Resimdeki nesne" ipucu, APPLE yazılır
function gPicture(p) {
  const s = 92, cols = 7, rows = 5;
  const [ox, oy] = center(cols * s, rows * s);
  let g = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) g += cellR(ox + c * s, oy + r * s, s, (r + c) % 4 === 0 ? C.CLUE : '#FFFFFF');
  // fotoğraf alanı (3x3, ortada üstte)
  const px = ox + 2 * s, py = oy, pw = 3 * s, ph = 3 * s;
  g += `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="#FFE9D6" stroke="${C.INK}" stroke-width="3"/>
    <circle cx="${px + pw / 2}" cy="${py + ph / 2 + 14}" r="${pw * 0.3}" fill="#E0413A"/>
    <circle cx="${px + pw / 2 - 26}" cy="${py + ph / 2 - 6}" r="${pw * 0.07}" fill="#FFFFFF" fill-opacity="0.45"/>
    <path d="M${px + pw / 2} ${py + ph / 2 - pw * 0.27} q4 -30 18 -40" stroke="#6B4423" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M${px + pw / 2 + 8} ${py + ph / 2 - pw * 0.3} q34 -26 56 -6 q-30 22 -56 6z" fill="#4DA24D"/>
    <rect x="${px}" y="${py + ph - 30}" width="150" height="30" fill="${C.NAVY}"/>
    <text x="${px + 75}" y="${py + ph - 9}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="15" fill="#FFFFFF">RESİMDEKİ NESNE</text>`;
  // ipucu + APPLE (4. satır)
  const r = 3;
  g += cellR(ox + s, oy + r * s, s, '#D8EEF6') + `<text x="${ox + s * 1.5}" y="${oy + r * s + 40}" text-anchor="middle" font-family="Archivo Narrow" font-weight="700" font-size="19" fill="${C.INK}">Resimdeki</text><text x="${ox + s * 1.5}" y="${oy + r * s + 64}" text-anchor="middle" font-family="Archivo Narrow" font-weight="700" font-size="19" fill="${C.INK}">nesne</text>` + arrowR(ox + 2 * s, oy + r * s + s / 2);
  const done = p > 0.8;
  [...'APPLE'].forEach((ch, i) => {
    const o = seq(p, i, 5, 0.15, 0.75);
    const x = ox + (2 + i) * s, y = oy + r * s;
    g += cellR(x, y, s, done ? C.OK : o > 0 ? C.HL : '#FFFFFF') + ltr(x, y, s, ch, o);
  });
  return g + `<rect x="${ox}" y="${oy}" width="${cols * s}" height="${rows * s}" fill="none" stroke="${C.INK}" stroke-width="4"/>`;
}

export const GAMES = [
  ['ARROWWORD', 'Çengel Bulmaca', 'İpucunu çöz, kelimeyi bul.', gArrow],
  ['CROSSWORD', 'Kare Bulmaca', 'Numaralı klasik bulmaca.', gCross],
  ['CODEWORD', 'Şifreli Bulmaca', 'Sayıların harfini çöz.', gCode],
  ['SPIRAL', 'Sarmal Bulmaca', 'Kelimeler sarmalda zincirlenir.', gSpiral],
  ['WORD SEARCH', 'Kelime Avı', 'Gizli kelimeleri bul, çiz.', gSearch],
  ['WORD LADDER', 'Kelime Merdiveni', 'Tek harf değiştir, tırman.', gLadder],
  ['JUMBLE', 'Karışık Harfler', 'Karışık harfleri düzelt.', gJumble],
  ['CRYPTOGRAM', 'Şifreli Cümle', 'Şifreli cümleyi oku.', gCrypto],
  ['PICTURE PUZZLE', 'Resimli Bulmaca', 'Resimdeki nesneyi bul.', gPicture],
];

// oyun kartı (900x900), içerik ilerlemesi p
function gameCard(i, p, x, y, opacity = 1, scale = 1) {
  const [kicker, title, tag, draw] = GAMES[i];
  return `<g opacity="${opacity}" transform="translate(${x} ${y}) scale(${scale})">
    <rect x="0" y="14" width="900" height="900" rx="44" fill="#000" fill-opacity="0.25"/>
    <rect x="0" y="0" width="900" height="900" rx="44" fill="${C.CREAM}"/>
    <rect x="48" y="48" width="96" height="52" rx="26" fill="${C.NAVY}"/>
    <text x="96" y="83" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="26" fill="#FFFFFF">${i + 1}/9</text>
    <text x="168" y="84" font-family="Hanken Grotesk" font-weight="700" font-size="24" letter-spacing="4" fill="${C.TEAL}">${esc(kicker)}</text>
    <text x="48" y="182" font-family="Newsreader" font-weight="700" font-size="68" fill="${C.INK}">${esc(title)}</text>
    <text x="50" y="236" font-family="Hanken Grotesk" font-weight="500" font-size="32" fill="${C.SOFT}">${esc(tag)}</text>
    <g transform="translate(60 300)">${draw(p)}</g>
  </g>`;
}

function frame(t) {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${brandDefs}</defs>${brandBg(t)}`;
  // logo her zaman üstte
  const lg = easeOut(prog(t, 0.1, 0.7));
  s += logo((W - 320) / 2, 100 + 16 * (1 - lg), 320, lg);

  // giriş başlığı
  const introOut = 1 - prog(t, 1.75, 2.15);
  if (introOut > 0) {
    const a = easeOut(prog(t, 0.35, 0.95)), b = easeOut(prog(t, 0.75, 1.35));
    s += `<g opacity="${introOut}">
      <text x="${W / 2}" y="${880 + 30 * (1 - a)}" opacity="${a}" text-anchor="middle" font-family="Newsreader" font-weight="700" font-size="112" fill="${C.CREAM}">Tek uygulama,</text>
      <text x="${W / 2}" y="${1010 + 30 * (1 - b)}" opacity="${b}" text-anchor="middle" font-family="Newsreader" font-style="italic" font-weight="500" font-size="116" fill="${C.TEAL}">9 bulmaca oyunu.</text>
      <text x="${W / 2}" y="${1100}" opacity="${easeOut(prog(t, 1.1, 1.6))}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="500" font-size="36" fill="${C.CREAM}" fill-opacity="0.85">Hepsiyle İngilizce kelime öğren</text>
    </g>`;
  }

  // oyun kartları: sağdan gelir, sola gider
  const gEnd = T_GAMES + GAMES.length * PER;
  if (t >= T_GAMES - 0.3 && t < gEnd + 0.3) {
    s += `<text x="${W / 2}" y="410" opacity="${Math.min(easeOut(prog(t, T_GAMES - 0.2, T_GAMES + 0.3)), 1 - prog(t, gEnd - 0.2, gEnd + 0.1))}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="34" letter-spacing="6" fill="${C.CREAM}" fill-opacity="0.8">9 OYUN · TEK UYGULAMA</text>`;
    for (let i = 0; i < GAMES.length; i++) {
      const a = T_GAMES + i * PER, b = a + PER;
      if (t < a - 0.3 || t > b + 0.3) continue;
      const inQ = i === 0 ? easeOut(prog(t, a - 0.3, a + 0.05)) : easeOut(prog(t, a - 0.3, a + 0.02));
      const outQ = easeInOut(prog(t, b - 0.3, b - 0.05));
      if (outQ >= 1 && i < GAMES.length - 1) continue;
      const x = 90 + (1 - inQ) * 1000 - outQ * 1150;
      const p = prog(t, a + 0.1, b - 0.35);
      s += gameCard(i, p, x, 520, 1 - outQ * 0.5);
    }
    // ilerleme noktaları
    const cur = Math.min(GAMES.length - 1, Math.max(0, Math.floor((t - T_GAMES) / PER)));
    for (let i = 0; i < GAMES.length; i++) s += `<circle cx="${W / 2 + (i - 4) * 34}" cy="1520" r="${i === cur ? 10 : 7}" fill="${i === cur ? C.TEAL : C.CREAM}" fill-opacity="${i === cur ? 1 : 0.35}"/>`;
  }

  // hepsi bir arada: 3x3 karolar
  const M = gEnd + 0.2;
  if (t >= M) {
    const fade = 1 - prog(t, DUR - 0.01, DUR);
    s += `<text x="${W / 2}" y="${430}" opacity="${easeOut(prog(t, M, M + 0.4))}" text-anchor="middle" font-family="Newsreader" font-weight="700" font-size="76" fill="${C.CREAM}">Hepsi <tspan font-style="italic" font-weight="500" fill="${C.TEAL}">tek yerde.</tspan></text>`;
    for (let i = 0; i < 9; i++) {
      const q = easeBack(prog(t, M + 0.1 + i * 0.07, M + 0.45 + i * 0.07));
      if (q <= 0) continue;
      const col = i % 3, row = Math.floor(i / 3);
      const tx = 90 + col * 310, ty = 500 + row * 330;
      s += `<g opacity="${Math.min(1, q) * fade}" transform="translate(${tx + 140} ${ty + 150}) scale(${q}) translate(${-140} ${-150})">
        <rect x="0" y="8" width="280" height="300" rx="28" fill="#000" fill-opacity="0.22"/>
        <rect x="0" y="0" width="280" height="300" rx="28" fill="${C.CREAM}"/>
        <g transform="translate(12 18) scale(${256 / BW})">${GAMES[i][3](1)}</g>
        <text x="140" y="276" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="25" fill="${C.INK}">${esc(GAMES[i][1])}</text>
      </g>`;
    }
    s += cta(t, M + 1.0, 1530);
  }
  return s + '</svg>';
}

if ((process.argv[1] || '').replace(/\\/g, '/').endsWith('make-ad-games.mjs')) makeVideo({ name: 'qorvex-ad-games', dur: DUR, frame });
