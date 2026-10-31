// Reels reklamı (animasyon): Dede bulmacasını gazetede çözer, torun QORVEX'te; sonunda ikisi birlikte + logo.
// Kullanım: node scripts/make-ad-story.mjs [--stills 2,5,...] [--only-stills] → store/ads/qorvex-ad-story.mp4
import { W, H, C, esc, logo, prog, easeOut, easeInOut, easeBack, lerp, clamp, brandDefs, brandBg, cta, makeVideo } from './ad-kit.mjs';

const DUR = 21;
const T1 = 6.2, T2 = 7.4, T3 = 13.4, T4 = 17.4; // sahne başları
const SEPIA = { wall: '#EFE2C8', wall2: '#E3CFAB', floor: '#B98A5C', rug: '#9E3B2E', wood: '#7A4A2E', ink: '#3B2A20' };
const SKIN = '#F1C9A5', SKIN_D = '#E2AE88';

const rad = (d) => (d * Math.PI) / 180;
const rot = (x, y, deg) => [x * Math.cos(rad(deg)) - y * Math.sin(rad(deg)), x * Math.sin(rad(deg)) + y * Math.cos(rad(deg))];
const blink = (t, phase = 0) => { const m = (t + phase) % 3.3; return m < 0.13 ? 0.12 : 1; };

// başlık: üst satır koyu/krem, alt satır italik vurgulu
function caption(t, a, b, l1, l2, { y = 330, c1 = C.CREAM, c2 = C.TEAL, kicker, kc = C.TEAL } = {}) {
  const o = Math.min(easeOut(prog(t, a, a + 0.5)), 1 - prog(t, b - 0.35, b));
  if (o <= 0) return '';
  const o2 = Math.min(easeOut(prog(t, a + 0.35, a + 0.85)), 1 - prog(t, b - 0.35, b));
  return `${kicker ? `<text x="${W / 2}" y="${y - 120}" opacity="${o}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="30" letter-spacing="8" fill="${kc}">${esc(kicker)}</text>` : ''}
    <text x="${W / 2}" y="${y + 20 * (1 - o)}" opacity="${o}" text-anchor="middle" font-family="Newsreader" font-weight="700" font-size="92" fill="${c1}">${esc(l1)}</text>
    <text x="${W / 2}" y="${y + 100 + 20 * (1 - o2)}" opacity="${o2}" text-anchor="middle" font-family="Newsreader" font-style="italic" font-weight="500" font-size="96" fill="${c2}">${esc(l2)}</text>`;
}

// ---------------- Sahne 1: oturma odası (sepya) ----------------
function room(t) {
  const flick = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 3.7);
  let s = `<defs>
      <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SEPIA.wall}"/><stop offset="1" stop-color="${SEPIA.wall2}"/></linearGradient>
      <radialGradient id="lamp" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE2A0" stop-opacity="0.75"/><stop offset="1" stop-color="#FFE2A0" stop-opacity="0"/></radialGradient>
      <radialGradient id="vign" cx="50%" cy="55%" r="75%"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3B2A20" stop-opacity="0.35"/></radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#wall)"/>`;
  for (let x = 30; x < W; x += 70) s += `<rect x="${x}" y="0" width="22" height="1500" fill="#FFFFFF" fill-opacity="0.12"/>`;
  // duvardaki çerçeve
  s += `<rect x="740" y="560" width="210" height="160" rx="6" fill="${SEPIA.wood}"/><rect x="756" y="576" width="178" height="128" fill="#D9C6A2"/>
    <path d="M770 690 l45 -50 35 35 25 -25 45 40z" fill="#A98C63"/><circle cx="905" cy="606" r="14" fill="#E9D7B2"/>`;
  // zemin ve halı
  s += `<rect x="0" y="1500" width="${W}" height="420" fill="${SEPIA.floor}"/>
    <rect x="0" y="1494" width="${W}" height="12" fill="${SEPIA.wood}"/>
    <ellipse cx="540" cy="1700" rx="470" ry="120" fill="${SEPIA.rug}"/><ellipse cx="540" cy="1700" rx="420" ry="96" fill="none" stroke="#E8C48E" stroke-width="6" stroke-dasharray="18 12"/>`;
  // ayaklı lamba (solda)
  s += `<circle cx="170" cy="760" r="${260 * flick}" fill="url(#lamp)"/>
    <rect x="164" y="800" width="12" height="700" fill="${SEPIA.wood}"/><ellipse cx="170" cy="1500" rx="70" ry="16" fill="${SEPIA.wood}"/>
    <path d="M90 800 L250 800 L210 690 L130 690 Z" fill="#E9B95C"/>`;
  // sehpa + çay bardağı (sağda), buhar
  s += `<rect x="830" y="1250" width="190" height="20" rx="6" fill="${SEPIA.wood}"/><rect x="900" y="1270" width="16" height="230" fill="${SEPIA.wood}"/><ellipse cx="908" cy="1500" rx="60" ry="12" fill="${SEPIA.wood}"/>
    <ellipse cx="925" cy="1246" rx="48" ry="9" fill="#D7D7D7"/>
    <path d="M900 1150 q-8 30 4 52 q-10 18 -2 40 l46 0 q8 -22 -2 -40 q12 -22 4 -52 z" fill="#B5371F" fill-opacity="0.9" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="3"/>
    <rect x="898" y="1144" width="56" height="10" rx="4" fill="#FFFFFF" fill-opacity="0.55"/>`;
  for (let k = 0; k < 3; k++) {
    const ph = (t * 0.7 + k / 3) % 1;
    s += `<path d="M${915 + k * 14} ${1130 - ph * 120} q${16 * Math.sin(t * 2 + k)} -24 0 -48 q${-16 * Math.sin(t * 2 + k)} -24 0 -48" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="${0.55 * Math.sin(ph * Math.PI)}"/>`;
  }
  return s;
}

function armchair() {
  return `<rect x="250" y="760" width="580" height="560" rx="120" fill="${SEPIA.wood}"/>
    <rect x="290" y="800" width="500" height="480" rx="96" fill="#8E5536"/>
    <rect x="200" y="1080" width="160" height="330" rx="70" fill="${SEPIA.wood}"/><rect x="720" y="1080" width="160" height="330" rx="70" fill="${SEPIA.wood}"/>
    <rect x="300" y="1260" width="480" height="170" rx="50" fill="#9C6040"/>
    <rect x="250" y="1410" width="580" height="60" rx="24" fill="${SEPIA.wood}"/>
    <rect x="280" y="1470" width="26" height="40" fill="#4A2E1C"/><rect x="774" y="1470" width="26" height="40" fill="#4A2E1C"/>`;
}

// Gazete bulmacası (yerel koordinat): 6x5 ızgara, yazılan harfler
const NEWS_GRID = { ox: 12, oy: -118, s: 36 };
function newspaper(t, written) {
  const { ox, oy, s } = NEWS_GRID;
  const black = new Set(['0,2', '1,4', '2,0', '3,5', '4,1', '4,3', '0,5']);
  const pre = { '0,0': 'K', '0,1': 'A', '1,0': 'O', '1,1': 'L', '1,2': 'A', '2,1': 'E', '2,2': 'L', '4,4': 'S', '4,5': 'U' };
  let g = `<rect x="-232" y="-152" width="464" height="304" rx="6" fill="#000" fill-opacity="0.18" transform="translate(8 10)"/>
    <rect x="-232" y="-152" width="464" height="304" rx="6" fill="#F4EFE3"/>
    <line x1="0" y1="-150" x2="0" y2="150" stroke="#D8CFBE" stroke-width="3"/>
    <text x="-214" y="-108" font-family="Newsreader" font-weight="700" font-size="34" fill="${SEPIA.ink}">BULMACA</text>
    <rect x="-214" y="-92" width="190" height="5" fill="${SEPIA.ink}"/>`;
  for (let k = 0; k < 9; k++) g += `<rect x="-214" y="${-70 + k * 24}" width="${k % 3 === 2 ? 120 : 190}" height="9" rx="3" fill="#B7AC98"/>`;
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 6; c++) {
      const x = ox + c * s, y = oy + r * s, k = `${r},${c}`;
      g += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${black.has(k) ? '#2B2420' : '#FFFFFF'}" stroke="#6B5E50" stroke-width="1.5"/>`;
      if (pre[k]) g += `<text x="${x + s / 2}" y="${y + s / 2 + 9}" text-anchor="middle" font-family="Archivo Narrow" font-weight="500" font-size="25" fill="#4A3F36">${pre[k]}</text>`;
    }
  for (const w of written) g += `<text x="${ox + w.c * s + s / 2}" y="${oy + w.r * s + s / 2 + 9 + 4 * (1 - w.o)}" opacity="${w.o}" text-anchor="middle" font-family="Archivo Narrow" font-weight="700" font-size="27" fill="#2D3A8C">${w.ch}</text>`;
  return g;
}

function pencil(x, y, wig) {
  return `<g transform="translate(${x} ${y}) rotate(${-32 + wig * 6})">
    <polygon points="0,0 9,-22 -9,-22" fill="#E8C48E"/><polygon points="0,0 3.5,-8 -3.5,-8" fill="#333"/>
    <rect x="-9" y="-160" width="18" height="138" fill="#F2B21B"/><rect x="-9" y="-160" width="6" height="138" fill="#FFFFFF" fill-opacity="0.25"/>
    <rect x="-9" y="-176" width="18" height="16" fill="#C9C9C9"/><rect x="-9" y="-198" width="18" height="22" rx="5" fill="#E58A8A"/>
    <ellipse cx="10" cy="-70" rx="34" ry="30" fill="${SKIN}"/><ellipse cx="-14" cy="-58" rx="16" ry="12" fill="${SKIN_D}"/>
  </g>`;
}

// Dede: başı (540, 820) merkezli, gazete kucağında, kalemle yazar
function grandpa(t, { writing = true, lookAt = 0 } = {}) {
  // yazılan harfler: AĞAÇ (gazetedeki 3. satır, 1–4. sütunlar)
  const word = ['A', 'Ğ', 'A', 'Ç'];
  const starts = [1.4, 2.25, 3.1, 3.95];
  const written = word.map((ch, i) => ({ r: 3, c: 1 + i, ch, o: writing ? easeOut(prog(t, starts[i] + 0.25, starts[i] + 0.6)) : 1 }));
  // kalemin ucu: sıradaki kareye gider, yazarken kıpırdar
  const { ox, oy, s } = NEWS_GRID;
  let ci = 0;
  for (let i = 0; i < 4; i++) if (t > starts[i] - 0.35) ci = i;
  const moving = prog(t, starts[ci] - 0.35, starts[ci]);
  const prev = ci > 0 ? ci - 1 : ci;
  const fx = ox + (1 + prev) * s + s / 2, tx = ox + (1 + ci) * s + s / 2;
  let px = writing ? lerp(fx, tx, easeInOut(moving)) + 6 : ox + 5 * s + 30, py = oy + 3 * s + s / 2 + 6;
  const wig = writing && t > starts[ci] && t < starts[ci] + 0.6 ? Math.sin(t * 40) : 0;
  if (writing && t < starts[0] - 0.4) { px = ox + 4 * s; py = oy + 5 * s + 20; }
  const npDeg = -4;
  const [hx, hy] = rot(px + 10 + 0, py - 70, npDeg); // kalemi tutan elin yaklaşık yeri
  const handR = [540 + hx, 1150 + hy];
  const eyes = blink(t);
  const look = lookAt; // göz bebeklerinin yatay kayması
  return `<g>
    <!-- bacaklar -->
    <rect x="410" y="1290" width="110" height="250" rx="40" fill="#4A4038"/><rect x="560" y="1290" width="110" height="250" rx="40" fill="#4A4038"/>
    <ellipse cx="455" cy="1545" rx="80" ry="30" fill="#2A211C"/><ellipse cx="625" cy="1545" rx="80" ry="30" fill="#2A211C"/>
    <!-- gövde (hırka) -->
    <path d="M390 1320 Q380 990 470 950 L610 950 Q700 990 690 1320 Z" fill="#7B5A3A"/>
    <path d="M500 950 L540 1050 L580 950 Z" fill="#F2E8D4"/><path d="M540 1050 L540 1320" stroke="#5E4329" stroke-width="5"/>
    <circle cx="552" cy="1110" r="7" fill="#D9C39A"/><circle cx="552" cy="1170" r="7" fill="#D9C39A"/>
    <!-- kollar -->
    <path d="M420 990 Q330 1080 330 1150" fill="none" stroke="#7B5A3A" stroke-width="64" stroke-linecap="round"/>
    <path d="M660 990 Q${lerp(700, handR[0] + 20, 0.5)} ${lerp(1030, handR[1], 0.5)} ${handR[0] + 22} ${handR[1] + 10}" fill="none" stroke="#7B5A3A" stroke-width="64" stroke-linecap="round"/>
    <!-- gazete + kalem -->
    <g transform="translate(540 1150) rotate(${npDeg})">${newspaper(t, written)}${pencil(px, py, wig)}</g>
    <ellipse cx="318" cy="1150" rx="32" ry="36" fill="${SKIN}"/>
    <!-- baş -->
    <rect x="512" y="900" width="56" height="60" fill="${SKIN_D}"/>
    <circle cx="418" cy="830" r="26" fill="${SKIN}"/><circle cx="662" cy="830" r="26" fill="${SKIN}"/>
    <circle cx="540" cy="820" r="122" fill="${SKIN}"/>
    <ellipse cx="500" cy="740" rx="40" ry="18" fill="#FFFFFF" fill-opacity="0.35"/>
    <path d="M424 830 Q410 740 470 720 Q440 770 448 830 Z" fill="#DADADA"/><path d="M656 830 Q670 740 610 720 Q640 770 632 830 Z" fill="#DADADA"/>
    <path d="M462 784 Q495 768 522 784" stroke="#BDBDBD" stroke-width="12" fill="none" stroke-linecap="round"/>
    <path d="M558 784 Q585 768 618 784" stroke="#BDBDBD" stroke-width="12" fill="none" stroke-linecap="round"/>
    <ellipse cx="${495 + look}" cy="834" rx="9" ry="${9 * eyes}" fill="#2B2420"/><ellipse cx="${585 + look}" cy="834" rx="9" ry="${9 * eyes}" fill="#2B2420"/>
    <circle cx="495" cy="830" r="36" fill="#FFFFFF" fill-opacity="0.18" stroke="#3B2F2A" stroke-width="6"/><circle cx="585" cy="830" r="36" fill="#FFFFFF" fill-opacity="0.18" stroke="#3B2F2A" stroke-width="6"/>
    <path d="M531 828 Q540 820 549 828" stroke="#3B2F2A" stroke-width="5" fill="none"/>
    <path d="M459 826 L428 818 M621 826 L652 818" stroke="#3B2F2A" stroke-width="5"/>
    <ellipse cx="540" cy="868" rx="20" ry="26" fill="${SKIN_D}"/>
    <path d="M470 905 Q500 880 540 900 Q580 880 610 905 Q590 935 540 918 Q490 935 470 905 Z" fill="#F4F4F4"/>
    <path d="M515 940 Q540 955 565 940" stroke="#9C5B45" stroke-width="5" fill="none" stroke-linecap="round"/>
  </g>`;
}

// ---------------- Sahne 2: çocuk odası (lacivert) ----------------
function kidRoom(t) {
  let s = brandBg(t);
  // pencere ve yıldızlar
  s += `<rect x="90" y="560" width="240" height="300" rx="16" fill="#0D1C30" stroke="#46658A" stroke-width="6"/>
    <line x1="210" y1="560" x2="210" y2="860" stroke="#46658A" stroke-width="5"/><line x1="90" y1="710" x2="330" y2="710" stroke="#46658A" stroke-width="5"/>
    <circle cx="280" cy="620" r="26" fill="#F4EFE2"/><circle cx="270" cy="612" r="24" fill="#0D1C30"/>`;
  [[130, 600], [175, 660], [250, 780], [140, 800], [300, 690]].forEach(([x, y], i) => {
    const o = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i));
    s += `<circle cx="${x}" cy="${y}" r="4" fill="#FFFFFF" opacity="${o}"/>`;
  });
  // raf + saksı
  s += `<rect x="760" y="760" width="230" height="14" rx="6" fill="#46658A"/>
    <rect x="780" y="700" width="30" height="60" fill="${C.ORANGE}"/><rect x="814" y="712" width="26" height="48" fill="${C.TEAL}"/><rect x="844" y="694" width="22" height="66" fill="${C.CREAM}"/>
    <path d="M920 760 l8 -44 h44 l8 44z" fill="#C8693B"/><path d="M950 716 q-30 -40 -10 -70 q20 30 10 70 M950 716 q30 -36 20 -64 q-26 22 -20 64" fill="#4DA24D"/>
    <rect x="0" y="1560" width="${W}" height="360" fill="#0C1A2C"/><ellipse cx="540" cy="1690" rx="460" ry="110" fill="#1F3A5A"/>`;
  return s;
}

// Telefon ekranı (yerel 260x500): QORVEX çengel, TREE yazılır
function phoneScreen(t, t0) {
  const s = 52, ox = 12, oy = 120;
  let g = `<rect x="0" y="0" width="260" height="500" rx="30" fill="#FAF8F5"/>
    <text x="130" y="62" text-anchor="middle" font-family="Newsreader" font-style="italic" font-weight="500" font-size="24" fill="${C.INK}">Çengel Bulmaca</text>
    <text x="130" y="88" text-anchor="middle" font-family="Hanken Grotesk" font-weight="500" font-size="13" fill="${C.SOFT}">A1 · Başlangıç</text>`;
  const word = 'TREE';
  const typed = word.split('').filter((_, i) => t >= t0 + i * 0.45).length;
  const done = t >= t0 + 3 * 0.45 + 0.35;
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 5; c++) {
      const x = ox + c * (s - 2) - 0, y = oy + r * (s - 2);
      let fill = '#FFFFFF', txt = '';
      if (c === 0) { fill = r === 1 ? '#C6DDEB' : C.CLUE; txt = ['Kedi', 'Ağaç', 'Ev', 'Su'][r]; }
      if (r === 1 && c > 0) fill = done ? C.OK : c - 1 === Math.min(typed, 3) ? C.SEL : C.HL;
      g += `<rect x="${x}" y="${y}" width="${s - 2}" height="${s - 2}" fill="${fill}" stroke="${C.LINE}" stroke-width="1.5"/>`;
      if (txt) g += `<text x="${x + 25}" y="${y + 30}" text-anchor="middle" font-family="Archivo Narrow" font-weight="${r === 1 ? 700 : 500}" font-size="13" fill="${C.INK}">${txt}</text>`;
      if (r === 1 && c > 0 && c - 1 < typed) {
        const pop = easeBack(prog(t, t0 + (c - 1) * 0.45, t0 + (c - 1) * 0.45 + 0.18));
        g += `<text x="${x + 25}" y="${y + 36}" text-anchor="middle" font-family="Libre Franklin" font-weight="600" font-size="${30 * (0.6 + 0.4 * pop)}" fill="${C.INK}">${word[c - 1]}</text>`;
      }
    }
  // mini klavye
  const rowsK = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  rowsK.forEach((row, ri) => {
    const kw = 22, gap = 3, tw = row.length * (kw + gap);
    const x0 = (260 - tw) / 2;
    [...row].forEach((ch, k) => {
      const hit = word.split('').some((L, i) => L === ch && t >= t0 + i * 0.45 - 0.02 && t < t0 + i * 0.45 + 0.2);
      g += `<rect x="${x0 + k * (kw + gap)}" y="${340 + ri * 44}" width="${kw}" height="38" rx="5" fill="${hit ? C.TEAL : '#FFFFFF'}" stroke="#E4E0D8" stroke-width="1"/>
        <text x="${x0 + k * (kw + gap) + kw / 2}" y="${340 + ri * 44 + 25}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="12" fill="${C.INK}">${ch}</text>`;
    });
  });
  return g;
}

// Çocuk: başı (540, 940); telefon ekranı izleyiciye dönük kucağında
function kid(t, { t0 = 9.0, happy = false } = {}) {
  const eyes = blink(t, 1.1);
  const smile = happy ? 1 : 0.3;
  const bob = Math.sin(t * 2.2) * 4;
  return `<g transform="translate(0 ${bob})">
    <!-- puf koltuk -->
    <path d="M250 1560 Q230 1220 540 1200 Q850 1220 830 1560 Z" fill="${C.ORANGE}"/><path d="M300 1540 Q300 1300 540 1280" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="18" fill="none"/>
    <!-- bacaklar (bağdaş) -->
    <ellipse cx="460" cy="1470" rx="150" ry="58" fill="#34507A"/><ellipse cx="620" cy="1470" rx="150" ry="58" fill="#2C4568"/>
    <ellipse cx="340" cy="1490" rx="46" ry="30" fill="#FFFFFF"/><ellipse cx="740" cy="1490" rx="46" ry="30" fill="#FFFFFF"/>
    <!-- kapüşonlu gövde -->
    <path d="M400 1440 Q390 1110 470 1080 L610 1080 Q690 1110 680 1440 Z" fill="${C.TEAL}"/>
    <path d="M455 1080 Q540 1150 625 1080" fill="#128E99"/>
    <line x1="515" y1="1120" x2="510" y2="1200" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/><line x1="565" y1="1120" x2="570" y2="1200" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>
    <!-- kollar telefona -->
    <path d="M425 1130 Q350 1380 410 1590" fill="none" stroke="${C.TEAL}" stroke-width="58" stroke-linecap="round"/>
    <path d="M655 1130 Q730 1380 670 1590" fill="none" stroke="${C.TEAL}" stroke-width="58" stroke-linecap="round"/>
    <!-- telefon -->
    <g transform="translate(398 1150)">
      <rect x="-12" y="-12" width="284" height="524" rx="40" fill="${C.NAVY_DEEP}" stroke="#46658A" stroke-width="3"/>
      ${phoneScreen(t, t0)}
      <rect x="95" y="6" width="70" height="16" rx="8" fill="${C.NAVY_DEEP}"/>
    </g>
    <ellipse cx="400" cy="1600" rx="30" ry="34" fill="${SKIN}"/><ellipse cx="680" cy="1600" rx="30" ry="34" fill="${SKIN}"/>
    <!-- ekran ışığı yüzde -->
    <ellipse cx="540" cy="1010" rx="150" ry="60" fill="#BDEFF5" fill-opacity="0.12"/>
    <!-- baş -->
    <rect x="515" y="1040" width="50" height="50" fill="${SKIN_D}"/>
    <circle cx="410" cy="950" r="28" fill="${SKIN}"/><circle cx="670" cy="950" r="28" fill="${SKIN}"/>
    <circle cx="540" cy="940" r="130" fill="${SKIN}"/>
    <path d="M408 930 Q400 800 540 790 Q690 795 676 925 Q640 860 560 868 Q600 840 590 830 Q520 880 450 870 Q420 890 408 930 Z" fill="#3A2A20"/>
    <path d="M530 795 q20 -50 60 -40 q-30 10 -30 44z" fill="#3A2A20"/>
    <ellipse cx="490" cy="960" rx="24" ry="${28 * eyes}" fill="#FFFFFF"/><ellipse cx="590" cy="960" rx="24" ry="${28 * eyes}" fill="#FFFFFF"/>
    <circle cx="492" cy="${968}" r="${13 * eyes}" fill="#2B2420"/><circle cx="592" cy="${968}" r="${13 * eyes}" fill="#2B2420"/>
    <circle cx="497" cy="962" r="${4 * eyes}" fill="#FFFFFF"/><circle cx="597" cy="962" r="${4 * eyes}" fill="#FFFFFF"/>
    <circle cx="450" cy="1010" r="20" fill="#F29A8E" fill-opacity="0.5"/><circle cx="630" cy="1010" r="20" fill="#F29A8E" fill-opacity="0.5"/>
    <path d="M${510 - 8 * smile} 1020 Q540 ${1028 + 24 * smile} ${570 + 8 * smile} 1020" stroke="#8C3B2E" stroke-width="6" fill="${happy ? '#FFFFFF' : 'none'}" stroke-linecap="round"/>
  </g>`;
}

// konfeti
function confetti(t, a, cx, cy) {
  const q = prog(t, a, a + 1.6);
  if (q <= 0 || q >= 1) return '';
  let g = '';
  const cols = [C.ORANGE, C.TEAL, C.CREAM, '#F2B21B', '#7A5CC7'];
  for (let i = 0; i < 36; i++) {
    const ang = (i / 36) * Math.PI * 2 + i;
    const sp = 260 + (i * 37) % 200;
    const x = cx + Math.cos(ang) * sp * easeOut(q);
    const y = cy + Math.sin(ang) * sp * easeOut(q) * 0.7 + 420 * q * q;
    g += `<rect x="${x}" y="${y}" width="16" height="9" rx="2" fill="${cols[i % 5]}" opacity="${1 - q}" transform="rotate(${i * 40 + q * 500} ${x} ${y})"/>`;
  }
  return g;
}

function bubble(x, y, w, text, o, tail = 'left', fill = '#FFFFFF') {
  if (o <= 0) return '';
  const tx = tail === 'left' ? x + 60 : x + w - 60;
  return `<g opacity="${Math.min(1, o)}" transform="translate(${x + w / 2} ${y + 50}) scale(${0.6 + 0.4 * Math.min(1, o)}) translate(${-(x + w / 2)} ${-(y + 50)})">
    <rect x="${x}" y="${y + 6}" width="${w}" height="100" rx="50" fill="#000" fill-opacity="0.18"/>
    <rect x="${x}" y="${y}" width="${w}" height="100" rx="50" fill="${fill}"/>
    <path d="M${tx - 18} ${y + 96} L${tx + (tail === 'left' ? -10 : 10)} ${y + 140} L${tx + 18} ${y + 96} Z" fill="${fill}"/>
    <text x="${x + w / 2}" y="${y + 64}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="40" fill="${C.INK}">${esc(text)}</text>
  </g>`;
}

function frame(t) {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${brandDefs}</defs>`;

  // Sahne 1 (+ geçişte yakınlaşma)
  if (t < T2) {
    const z = easeInOut(prog(t, T1, T1 + 0.7));
    const [gx, gy] = rot(NEWS_GRID.ox + 3 * NEWS_GRID.s, NEWS_GRID.oy + 2.5 * NEWS_GRID.s, -4);
    const fc = [540 + gx, 1150 + gy]; // gazete ızgarasının ortası (döndürülmüş)
    const sc = lerp(1, 5.5, z);
    s += `<g transform="translate(${W / 2} ${H / 2}) scale(${sc}) translate(${-lerp(W / 2, fc[0], z)} ${-lerp(H / 2, fc[1], z)})">`;
    s += room(t) + armchair() + grandpa(t) + `<rect width="${W}" height="${H}" fill="url(#vign)"/>`;
    s += `</g>`;
    s += caption(t, 0.3, T1, 'Dedem bulmacasını', 'gazetede çözerdi…', { y: 330, c1: SEPIA.ink, c2: '#9E3B2E', kicker: 'ESKİDEN', kc: '#9E3B2E' });
    // kare kare lacivertleşme
    const tp = prog(t, T1 + 0.45, T2);
    if (tp > 0) {
      const S = 120;
      for (let y = 0; y < H; y += S)
        for (let x = 0; x < W; x += S) {
          const d = (x / W + y / H) / 2;
          const q = easeOut(clamp((tp - d * 0.6) / 0.4));
          if (q > 0) s += `<rect x="${x + ((S + 2) * (1 - q)) / 2 - 1}" y="${y + ((S + 2) * (1 - q)) / 2 - 1}" width="${(S + 2) * q}" height="${(S + 2) * q}" rx="${10 * (1 - q)}" fill="${C.NAVY}"/>`;
        }
    }
    if (t < 0.4) s += `<rect width="${W}" height="${H}" fill="#000" opacity="${1 - t / 0.4}"/>`;
    return s + '</svg>';
  }

  // Sahne 2: torun ve QORVEX
  if (t < T3) {
    const inQ = easeOut(prog(t, T2, T2 + 0.5));
    const tType = T2 + 1.6;
    const solved = tType + 3 * 0.45 + 0.35;
    s += kidRoom(t);
    s += `<g opacity="${inQ}" transform="translate(0 ${80 * (1 - inQ)})">${kid(t, { t0: tType, happy: t > solved })}</g>`;
    s += caption(t, T2 + 0.2, solved + 0.2, "Ben QORVEX'te", 'çözüyorum…', { kicker: 'BUGÜN' });
    s += caption(t, solved + 0.2, T3, 'üstelik', 'İngilizce öğreniyorum!', { c2: C.ORANGE, kicker: 'BUGÜN' });
    // TREE = ağaç çipi
    const ch = easeBack(prog(t, solved, solved + 0.35));
    if (ch > 0) s += `<g transform="translate(700 1060) scale(${ch})"><rect x="0" y="0" width="320" height="104" rx="52" fill="${C.CREAM}"/>
        <circle cx="52" cy="52" r="34" fill="${C.NAVY}"/><path d="M36 53l11 11 20-23" fill="none" stroke="${C.TEAL}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="102" y="50" font-family="Hanken Grotesk" font-weight="700" font-size="36" fill="${C.INK}">TREE</text>
        <text x="102" y="82" font-family="Hanken Grotesk" font-weight="500" font-size="24" fill="${C.SOFT}">= ağaç</text></g>`;
    s += confetti(t, solved, 540, 1250);
    // sahne sonunda beyaz parlama
    const fl = prog(t, T3 - 0.25, T3);
    if (fl > 0) s += `<rect width="${W}" height="${H}" fill="#FFFFFF" opacity="${fl * 0.9}"/>`;
    return s + '</svg>';
  }

  // Sahne 3: ikisi birlikte
  if (t < T4) {
    const inQ = easeOut(prog(t, T3, T3 + 0.4));
    s += `<defs><clipPath id="leftHalf"><polygon points="0,0 620,0 460,${H} 0,${H}"/></clipPath><clipPath id="rightHalf"><polygon points="620,0 ${W},0 ${W},${H} 460,${H}"/></clipPath></defs>`;
    s += `<g clip-path="url(#leftHalf)">${room(t)}</g><g clip-path="url(#rightHalf)">${kidRoom(t)}</g>`;
    s += `<line x1="620" y1="0" x2="460" y2="${H}" stroke="${C.CREAM}" stroke-width="8"/>`;
    s += `<g transform="translate(-130 280) scale(0.72)">${armchair()}${grandpa(t, { writing: false, lookAt: 14 })}</g>`;
    s += `<g transform="translate(410 300) scale(0.68)">${kid(t, { t0: -10, happy: true })}</g>`;
    s += bubble(70, 590, 440, 'TREE ne demek?', easeBack(prog(t, T3 + 0.5, T3 + 0.85)) * (1 - prog(t, T4 - 0.3, T4)), 'left');
    s += bubble(610, 690, 380, 'Ağaç, dede!', easeBack(prog(t, T3 + 1.6, T3 + 1.95)) * (1 - prog(t, T4 - 0.3, T4)), 'right', C.CREAM);
    const po = Math.min(easeOut(prog(t, T3 + 2.2, T3 + 2.7)), 1 - prog(t, T4 - 0.35, T4));
    if (po > 0) s += `<rect x="170" y="${120 + 20 * (1 - po)}" width="740" height="290" rx="44" fill="${C.NAVY_DEEP}" fill-opacity="${0.88 * po}"/>`;
    s += caption(t, T3 + 2.2, T4, 'Aynı keyif,', 'yeni nesil.', { y: 250, c1: C.CREAM, c2: C.TEAL });
    // kalpler
    for (let i = 0; i < 5; i++) {
      const q = prog(t, T3 + 2.0 + i * 0.25, T3 + 3.4 + i * 0.25);
      if (q <= 0 || q >= 1) continue;
      const x = 480 + (i - 2) * 50 + Math.sin(q * 6 + i) * 20, y = 1150 - q * 300;
      s += `<path d="M${x} ${y} c-12 -18 -40 -6 -30 14 l30 26 l30 -26 c10 -20 -18 -32 -30 -14z" fill="${i % 2 ? C.ORANGE : '#E0413A'}" opacity="${1 - q}"/>`;
    }
    if (inQ < 1) s += `<rect width="${W}" height="${H}" fill="#FFFFFF" opacity="${(1 - inQ) * 0.9}"/>`;
    const out = prog(t, T4 - 0.3, T4);
    if (out > 0) s += `<rect width="${W}" height="${H}" fill="${C.NAVY}" opacity="${out}"/>`;
    return s + '</svg>';
  }

  // Sahne 4: logo + çağrı
  s += brandBg(t);
  const lg = easeBack(prog(t, T4 + 0.1, T4 + 0.7));
  s += `<g transform="translate(${W / 2} 640) scale(${Math.max(0.01, lg)}) translate(${-W / 2} -640)">${logo((W - 640) / 2, 540, 640)}</g>`;
  const h1 = easeOut(prog(t, T4 + 0.6, T4 + 1.1)), h2 = easeOut(prog(t, T4 + 0.9, T4 + 1.4));
  s += `<text x="${W / 2}" y="${960 + 24 * (1 - h1)}" opacity="${h1}" text-anchor="middle" font-family="Newsreader" font-weight="700" font-size="96" fill="${C.CREAM}">Bulmaca çöz,</text>
    <text x="${W / 2}" y="${1062 + 24 * (1 - h2)}" opacity="${h2}" text-anchor="middle" font-family="Newsreader" font-style="italic" font-weight="500" font-size="100" fill="${C.TEAL}">İngilizce öğren.</text>
    <text x="${W / 2}" y="1150" opacity="${easeOut(prog(t, T4 + 1.2, T4 + 1.7))}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="500" font-size="34" fill="${C.CREAM}" fill-opacity="0.85">Türkçe ipucu · İngilizce cevap · 5.500+ kelime</text>`;
  s += cta(t, T4 + 1.5, 1380);
  return s + '</svg>';
}

makeVideo({ name: 'qorvex-ad-story', dur: DUR, frame });
