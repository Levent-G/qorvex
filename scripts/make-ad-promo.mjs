// Reels reklamı (dönüşüm odaklı): "Ezber sıkıcı mı?" → kartlar bulmacaya dönüşür → uygulama demosu → 9 oyun + seviye/rozet
// → faydalar → "İndir" çağrısı. Sesli. Kullanım: node scripts/make-ad-promo.mjs [--stills 1,4,...] [--only-stills]
import { W, H, C, esc, logo, prog, easeOut, easeInOut, easeBack, lerp, clamp, brandDefs, brandBg, makeVideo, makeAudio } from './ad-kit.mjs';
import { phoneScreen, confetti } from './make-ad-story.mjs';
import { GAMES, BW } from './make-ad-games.mjs';

const DUR = 24.5;
const S2 = 3.0, S3 = 5.2, S4 = 11.6, S5 = 16.4, S6 = 19.6;
const TYPE_T0 = 6.4; // telefonda TREE yazılmaya başlar (harf başına 0,45 sn)
const DONE = TYPE_T0 + 3 * 0.45 + 0.35;

// büyük başlık: punch (küçükten büyüğe sıçrayarak gelir)
function title(t, a, b, l1, l2, { y = 330, c2 = C.TEAL, size = 92 } = {}) {
  const o = Math.min(easeOut(prog(t, a, a + 0.3)), 1 - prog(t, b - 0.25, b));
  if (o <= 0) return '';
  const p1 = easeBack(prog(t, a, a + 0.35)), p2 = easeBack(prog(t, a + 0.15, a + 0.5));
  return `<g opacity="${o}">
    <g transform="translate(${W / 2} ${y}) scale(${0.6 + 0.4 * p1})"><text text-anchor="middle" font-family="Newsreader" font-weight="700" font-size="${size}" fill="${C.CREAM}">${esc(l1)}</text></g>
    ${l2 ? `<g transform="translate(${W / 2} ${y + size + 10}) scale(${0.6 + 0.4 * p2})"><text text-anchor="middle" font-family="Newsreader" font-style="italic" font-weight="500" font-size="${size + 4}" fill="${c2}">${esc(l2)}</text></g>` : ''}
  </g>`;
}
// parmak (dokunma işaretçisi), uç noktası (x,y)
const finger = (x, y, press = 0) => `<g transform="translate(${x} ${y}) rotate(-18) scale(${1 - press * 0.08})">
  <path d="M-14 6 v-58 a14 14 0 0 1 28 0 v40 l22 6 a14 14 0 0 1 10 16 l-8 46 a20 20 0 0 1 -20 16 h-34 a20 20 0 0 1 -18 -12 l-20 -40 a12 12 0 0 1 20 -12 z" transform="translate(0 52)" fill="#FFE3C7" stroke="${C.INK}" stroke-width="5" stroke-linejoin="round"/>
</g>`;
const ripple = (x, y, q) => (q > 0 && q < 1 ? `<circle cx="${x}" cy="${y}" r="${18 + 60 * easeOut(q)}" fill="none" stroke="#FFFFFF" stroke-width="5" opacity="${1 - q}"/>` : '');

// ---------- Sahne 1–2: ezber kartları yağar, sonra bulmaca ızgarasına dönüşür ----------
const CARDS = [
  ['ABANDON', 'terk etmek'], ['ACQUIRE', 'edinmek'], ['BENEATH', 'altında'], ['CEASE', 'son vermek'], ['DIVERSE', 'çeşitli'],
  ['ELABORATE', 'ayrıntılı'], ['FLOURISH', 'serpilmek'], ['GENUINE', 'hakiki'], ['HOSTILE', 'hasmane'], ['IMPEDE', 'engellemek'],
  ['JUSTIFY', 'haklı çıkarmak'], ['LETHAL', 'öldürücü'], ['MERE', 'sırf'], ['NOTION', 'kavram'], ['OBTAIN', 'elde etmek'], ['PROFOUND', 'derin'],
];
const GRID = { cols: 4, rows: 4, s: 150 };
const GRID_LETTERS = ['#OWL', '#SUN', '#SEA', '#ICE'];
const rnd = (i, k) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
function cards(t) {
  if (t > S3 + 0.4) return '';
  let g = '';
  const gw = GRID.cols * GRID.s, gx = (W - gw) / 2, gy = 760;
  const morph = easeInOut(prog(t, S2 + 0.45, S2 + 1.45));
  const fadeOut = 1 - prog(t, S3, S3 + 0.4);
  CARDS.forEach(([en, tr], i) => {
    const land = 0.15 + i * 0.13;
    const fall = easeOut(prog(t, land, land + 0.45));
    if (fall <= 0) return;
    const px = 140 + rnd(i, 1) * 800, py = 1080 + rnd(i, 2) * 520, rot = (rnd(i, 3) - 0.5) * 50;
    const x0 = px, y0 = lerp(-300, py, fall), r0 = rot * (2 - fall);
    // hedef ızgara hücresi
    const ci = i % (GRID.cols * GRID.rows), gxC = gx + (ci % GRID.cols) * GRID.s + GRID.s / 2, gyC = gy + Math.floor(ci / GRID.cols) * GRID.s + GRID.s / 2;
    const x = lerp(x0, gxC, morph), y = lerp(y0, gyC, morph), r = lerp(r0, 0, morph);
    const w = lerp(300, GRID.s, morph), h = lerp(190, GRID.s, morph);
    const ch = GRID_LETTERS[Math.floor(ci / GRID.cols)][ci % GRID.cols];
    const isClue = ch === '#';
    const fill = morph < 0.6 ? '#FFFFFF' : isClue ? C.CLUE : '#FFFFFF';
    g += `<g opacity="${fadeOut}" transform="translate(${x} ${y}) rotate(${r})">
      <rect x="${-w / 2 + 6}" y="${-h / 2 + 10}" width="${w}" height="${h}" rx="${lerp(18, 4, morph)}" fill="#000" fill-opacity="${0.25 * (1 - morph)}"/>
      <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${lerp(18, 4, morph)}" fill="${fill}" stroke="${morph > 0.5 ? C.LINE : '#E6E1D6'}" stroke-width="3"/>
      ${morph < 0.5 ? `<g opacity="${1 - morph * 2}"><text y="-6" text-anchor="middle" font-family="Libre Franklin" font-weight="600" font-size="44" fill="${C.INK}">${en}</text><text y="44" text-anchor="middle" font-family="Hanken Grotesk" font-weight="500" font-size="28" fill="${C.SOFT}">${esc(tr)}</text></g>` : ''}
    </g>`;
  });
  // ızgara harfleri dolar
  const fillQ = prog(t, S2 + 1.5, S2 + 2.1);
  if (fillQ > 0 && fadeOut > 0) {
    GRID_LETTERS.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch === '#') return;
      const k = r * 4 + c, o = clamp(fillQ * 16 - k);
      if (o > 0) g += `<text opacity="${o * fadeOut}" x="${gx + c * GRID.s + GRID.s / 2}" y="${gy + r * GRID.s + GRID.s / 2 + 30}" text-anchor="middle" font-family="Libre Franklin" font-weight="600" font-size="84" fill="${C.INK}">${ch}</text>`;
    }));
    g += `<rect opacity="${fadeOut}" x="${gx}" y="${gy}" width="${gw}" height="${GRID.rows * GRID.s}" fill="none" stroke="${C.INK}" stroke-width="6" rx="4"/>`;
  }
  // üzgün yüz (kart yığınının üstünde)
  const face = Math.min(easeBack(prog(t, 1.4, 1.8)), 1 - prog(t, S2 + 0.2, S2 + 0.5));
  if (face > 0) {
    const sweat = (t * 1.5) % 1;
    g += `<g transform="translate(${W / 2} 1260) scale(${face})">
      <circle r="110" fill="#FFD36B" stroke="${C.INK}" stroke-width="6"/>
      <circle cx="-38" cy="-18" r="12" fill="${C.INK}"/><circle cx="38" cy="-18" r="12" fill="${C.INK}"/>
      <path d="M-45 52 q45 -36 90 0" fill="none" stroke="${C.INK}" stroke-width="8" stroke-linecap="round"/>
      <path d="M78 ${-60 + sweat * 50} q14 22 0 30 q-14 -8 0 -30z" fill="#7CC6F2" opacity="${1 - sweat}"/>
    </g>`;
  }
  return g;
}

// ---------- Sahne 3: telefonda demo ----------
const PH = { x: 280, y: 560, k: 2 };
const keyPos = (ch) => {
  const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  for (let ri = 0; ri < 3; ri++) {
    const k = rows[ri].indexOf(ch);
    if (k >= 0) { const x0 = (260 - rows[ri].length * 25) / 2; return [PH.x + (x0 + k * 25 + 11) * PH.k, PH.y + (340 + ri * 44 + 19) * PH.k]; }
  }
  return [W / 2, H / 2];
};
function demo(t) {
  if (t < S3 - 0.1 || t > S4 + 0.6) return '';
  const inQ = easeOut(prog(t, S3, S3 + 0.6));
  const outQ = easeInOut(prog(t, S4 - 0.1, S4 + 0.5));
  const sc = lerp(1, 0.42, outQ), tx = lerp(0, -260, outQ), ty = lerp((1 - inQ) * 1300, -330, outQ);
  let g = `<g transform="translate(${W / 2 + tx} ${PH.y + 500 + ty}) scale(${sc}) translate(${-W / 2} ${-(PH.y + 500)})">
    <rect x="${PH.x - 24}" y="${PH.y - 24}" width="${260 * PH.k + 48}" height="${500 * PH.k + 48}" rx="80" fill="${C.NAVY_DEEP}" stroke="#46658A" stroke-width="4"/>
    <g transform="translate(${PH.x} ${PH.y}) scale(${PH.k})">${phoneScreen(t, TYPE_T0)}</g>
    <rect x="${PH.x + 190}" y="${PH.y + 12}" width="140" height="32" rx="16" fill="${C.NAVY_DEEP}"/>`;
  // kelime kartı (alttan açılan sayfa)
  const card = easeOut(prog(t, DONE + 0.5, DONE + 0.9)) * (1 - easeInOut(prog(t, S4 - 0.6, S4 - 0.2)));
  if (card > 0) {
    const cy = PH.y + 1000 - 560 * card;
    const wave = (t * 3) % 1;
    g += `<clipPath id="phc"><rect x="${PH.x}" y="${PH.y}" width="${260 * PH.k}" height="${500 * PH.k}" rx="60"/></clipPath>
      <g clip-path="url(#phc)"><rect x="${PH.x}" y="${PH.y}" width="${260 * PH.k}" height="${500 * PH.k}" fill="#000" opacity="${0.35 * card}"/>
      <rect x="${PH.x}" y="${cy}" width="${260 * PH.k}" height="600" rx="40" fill="${C.CREAM}"/>
      <rect x="${PH.x + 230}" y="${cy + 18}" width="60" height="8" rx="4" fill="#CFC8B8"/>
      <text x="${PH.x + 40}" y="${cy + 110}" font-family="Newsreader" font-weight="700" font-size="76" fill="${C.INK}">tree</text>
      <text x="${PH.x + 42}" y="${cy + 160}" font-family="Hanken Grotesk" font-weight="500" font-size="32" fill="${C.SOFT}">/tri:/ · isim · A1</text>
      <g transform="translate(${PH.x + 430} ${cy + 95})"><circle r="44" fill="${C.NAVY}"/><path d="M-20 -10h12l16-14v48l-16-14h-12z" fill="${C.TEAL}"/>
        <path d="M16 -14a20 20 0 0 1 0 28" fill="none" stroke="${C.TEAL}" stroke-width="5" stroke-linecap="round" opacity="${1 - wave}"/>
        <path d="M24 -24a34 34 0 0 1 0 48" fill="none" stroke="${C.TEAL}" stroke-width="5" stroke-linecap="round" opacity="${wave}"/></g>
      <text x="${PH.x + 40}" y="${cy + 240}" font-family="Newsreader" font-weight="700" font-size="52" fill="${C.TEAL}">ağaç</text>
      <text x="${PH.x + 40}" y="${cy + 310}" font-family="Newsreader" font-style="italic" font-weight="500" font-size="30" fill="${C.INK}">“A tall tree stands in our garden.”</text>
      <text x="${PH.x + 40}" y="${cy + 352}" font-family="Hanken Grotesk" font-weight="500" font-size="26" fill="${C.SOFT}">Bahçemizde uzun bir ağaç var.</text></g>`;
  }
  g += '</g>';
  // parmak: harflere basar
  if (outQ < 0.2) {
    const word = 'TREE';
    let fx = W / 2 + 160, fy = PH.y + 900, press = 0;
    for (let i = 0; i < 4; i++) {
      const a = TYPE_T0 + i * 0.45;
      if (t >= a - 0.3) {
        const [kx, ky] = keyPos(word[i]);
        const prev = i ? keyPos(word[i - 1]) : [W / 2 + 160, PH.y + 900];
        const m = easeInOut(prog(t, a - 0.3, a - 0.05));
        fx = lerp(prev[0], kx, m); fy = lerp(prev[1], ky, m);
        press = Math.max(press, 1 - Math.abs(t - a) / 0.08);
      }
    }
    if (t > DONE + 0.2) { const m = easeInOut(prog(t, DONE + 0.2, DONE + 0.5)); fy = lerp(fy, H + 300, m); }
    if (t > TYPE_T0 - 0.8) g += finger(fx, fy + (1 - inQ) * 600, clamp(press));
  }
  // +1 kelime → defter sayacı
  const fly = prog(t, DONE, DONE + 0.8);
  if (t > DONE - 0.2 && t < S4) {
    const cnt = t > DONE + 0.75 ? 13 : 12;
    const bump = 1 + 0.25 * Math.max(0, 1 - Math.abs(t - DONE - 0.8) / 0.15);
    g += `<g transform="translate(860 470) scale(${bump})"><rect x="-110" y="-40" width="220" height="80" rx="40" fill="${C.CREAM}"/>
      <path d="M-62 -18 q14 -8 28 0 v34 q-14 -8 -28 0z M-34 -18 q14 -8 28 0 v34 q-14 -8 -28 0z" fill="none" stroke="${C.NAVY}" stroke-width="5" stroke-linejoin="round"/>
      <text x="22" y="13" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="34" fill="${C.INK}">${cnt}</text></g>`;
    if (fly > 0 && fly < 1) {
      const x = lerp(W / 2, 860, easeInOut(fly)), y = lerp(PH.y + 300, 470, easeInOut(fly)) - Math.sin(fly * Math.PI) * 120;
      g += `<g transform="translate(${x} ${y}) scale(${1 - fly * 0.4})"><rect x="-90" y="-32" width="180" height="64" rx="32" fill="#3FB47A"/><text y="11" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="30" fill="#FFFFFF">+1 kelime</text></g>`;
    }
  }
  return g;
}

// ---------- Sahne 4: 9 oyun + seviye/rozet ----------
function variety(t) {
  if (t < S4 - 0.1 || t > S5 + 0.3) return '';
  const out = 1 - prog(t, S5 - 0.1, S5 + 0.3);
  let g = `<g opacity="${out}">`;
  // 9 oyun karosu
  for (let i = 0; i < 9; i++) {
    const q = easeBack(prog(t, S4 + 0.1 + i * 0.09, S4 + 0.45 + i * 0.09));
    if (q <= 0) continue;
    const col = i % 3, row = Math.floor(i / 3);
    const tx = 120 + col * 290, ty = 620 + row * 300;
    const fadeT = 1 - easeOut(prog(t, S4 + 1.9, S4 + 2.3));
    if (fadeT <= 0) continue;
    g += `<g opacity="${fadeT}" transform="translate(${tx + 130} ${ty + 130}) scale(${q}) translate(-130 -130)">
      <rect width="260" height="270" rx="26" fill="${C.CREAM}"/>
      <g transform="translate(14 14) scale(${232 / BW})">${GAMES[i][3](1)}</g>
      <text x="130" y="248" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="23" fill="${C.INK}">${esc(GAMES[i][1])}</text></g>`;
  }
  // seviye çubuğu + rozetler (karoların üstüne kayar)
  const lv = easeOut(prog(t, S4 + 2.0, S4 + 2.4));
  if (lv > 0) {
    g += `<g opacity="${lv}"><rect x="60" y="560" width="960" height="980" rx="40" fill="${C.NAVY_DEEP}" fill-opacity="${0.92 * lv}"/>`;
    const fillQ = easeInOut(prog(t, S4 + 2.4, S4 + 3.6));
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    g += `<rect x="140" y="760" width="800" height="40" rx="20" fill="#FFFFFF" fill-opacity="0.12"/>
      <rect x="140" y="760" width="${800 * fillQ}" height="40" rx="20" fill="${C.TEAL}"/>`;
    levels.forEach((l, k) => {
      const x = 140 + (k / 5) * 800, on = fillQ >= k / 5 - 0.001;
      g += `<circle cx="${x}" cy="780" r="34" fill="${on ? C.TEAL : C.NAVY}" stroke="#FFFFFF" stroke-width="4"/><text x="${x}" y="792" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="28" fill="#FFFFFF">${l}</text>`;
    });
    const BADGES = [['flame', '7 gün seri'], ['cap', '100 kelime'], ['cup', 'Haftanın şampiyonu']];
    BADGES.forEach(([ic, name], k) => {
      const q = easeBack(prog(t, S4 + 3.4 + k * 0.3, S4 + 3.8 + k * 0.3));
      if (q <= 0) return;
      const x = 260 + k * 280, y = 1120;
      const icon = ic === 'flame' ? `<path d="M0 -50 C34 -10 46 20 20 44 C10 54 -10 54 -20 44 C-44 20 -30 -10 -8 -24 C-6 -8 2 0 8 -6 C16 -18 6 -34 0 -50z" fill="${C.ORANGE}"/>`
        : ic === 'cap' ? `<path d="M-52 -8 L0 -32 L52 -8 L0 16z" fill="${C.CREAM}"/><path d="M-30 4 v24 q30 18 60 0 v-24" fill="${C.CREAM}"/><path d="M44 -6 v34" stroke="${C.ORANGE}" stroke-width="6"/>`
        : `<path d="M-30 -40 h60 v26 a30 30 0 0 1 -60 0z" fill="#F2B21B"/><rect x="-8" y="16" width="16" height="22" fill="#F2B21B"/><rect x="-28" y="36" width="56" height="12" rx="4" fill="#F2B21B"/>`;
      g += `<g transform="translate(${x} ${y}) scale(${q})"><circle r="92" fill="${C.NAVY}" stroke="${C.TEAL}" stroke-width="6"/>${icon}
        <text y="150" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="30" fill="${C.CREAM}">${esc(name)}</text></g>`;
    });
    g += '</g>';
  }
  return g + '</g>';
}

// ---------- Sahne 5: fayda damgaları ----------
function benefits(t) {
  if (t < S5 || t > S6 + 0.2) return '';
  const out = 1 - prog(t, S6 - 0.2, S6 + 0.2);
  const items = [['⏱', 'Günde 5 dakika'], ['📚', '6.200+ kelime'], ['🚫', 'Reklamsız'], ['🎁', 'Tamamen ücretsiz']];
  let g = `<g opacity="${out}">`;
  items.forEach(([, label], k) => {
    const a = S5 + 0.25 + k * 0.6;
    const q = prog(t, a, a + 0.25);
    if (q <= 0) return;
    const sc = lerp(1.7, 1, easeOut(q)), y = 760 + k * 190;
    g += `<g transform="translate(${W / 2} ${y}) scale(${sc}) rotate(${(k % 2 ? 2 : -2) * (1 - q)})" opacity="${easeOut(q)}">
      <rect x="-380" y="-70" width="760" height="140" rx="70" fill="${k === 3 ? C.ORANGE : C.CREAM}"/>
      <circle cx="-300" cy="0" r="46" fill="${k === 3 ? '#FFFFFF' : C.NAVY}"/>
      <path d="M-322 2 l15 15 30 -34" fill="none" stroke="${k === 3 ? C.ORANGE : C.TEAL}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="30" y="20" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="56" fill="${k === 3 ? '#FFFFFF' : C.INK}">${esc(label)}</text></g>`;
  });
  return g + '</g>';
}

// ---------- Sahne 6: çağrı ----------
function cta(t) {
  if (t < S6) return '';
  const lg = easeBack(prog(t, S6 + 0.1, S6 + 0.6));
  let g = `<g transform="translate(${W / 2} 640) scale(${Math.max(0.01, lg)}) translate(${-W / 2} -640)">${logo((W - 620) / 2, 540, 620)}</g>`;
  g += title(t, S6 + 0.5, DUR + 1, 'Hemen indir,', 'ilk bulmacanı çöz!', { y: 960, size: 88 });
  const b = easeBack(prog(t, S6 + 1.1, S6 + 1.5));
  const taps = [S6 + 2.0, S6 + 3.3];
  let press = 0;
  for (const a of taps) press = Math.max(press, 1 - Math.abs(t - a) / 0.1);
  const bs = Math.max(0.01, b) * (1 - clamp(press) * 0.05);
  g += `<g transform="translate(${W / 2} 1320) scale(${bs})">
      <rect x="-380" y="-62" width="760" height="124" rx="62" fill="#000" fill-opacity="0.3" transform="translate(0 10)"/>
      <rect x="-380" y="-62" width="760" height="124" rx="62" fill="${C.ORANGE}"/>
      <text y="18" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="50" fill="#FFFFFF">App Store'da ücretsiz</text></g>`;
  for (const a of taps) g += ripple(W / 2 + 300, 1335, prog(t, a, a + 0.6));
  if (t > S6 + 1.4) {
    const m = easeInOut(prog(t, S6 + 1.4, S6 + 1.9));
    g += finger(lerp(W + 200, W / 2 + 300, m), lerp(1700, 1340, m), clamp(press));
  }
  g += `<text x="${W / 2}" y="1560" opacity="${easeOut(prog(t, S6 + 1.6, S6 + 2.1))}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="40" fill="${C.CREAM}">Bağlantı profilde</text>
    <text x="${W / 2}" y="1620" opacity="${easeOut(prog(t, S6 + 1.8, S6 + 2.3))}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="500" font-size="30" fill="${C.CREAM}" fill-opacity="0.7">9 bulmaca oyunu · A1 → C2 · Türkçe ipucu, İngilizce cevap</text>`;
  g += confetti(t, S6 + 2.0, W / 2, 1320);
  return g;
}

function frame(t) {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${brandDefs}</defs>${brandBg(t)}`;
  // küçük logo üstte (son sahne hariç)
  if (t < S6) s += logo((W - 260) / 2, 70, 260, easeOut(prog(t, 0, 0.4)) * (1 - prog(t, S6 - 0.3, S6)));
  s += cards(t) + demo(t) + variety(t) + benefits(t) + cta(t);
  // başlıklar
  s += title(t, 0.05, S2, 'Kelime ezberlemek', 'sıkıcı mı?', { c2: C.ORANGE });
  s += title(t, S2, S3 + 0.1, 'Oyun oynayarak', 'öğrenmeye ne dersin?');
  s += title(t, S3 + 0.2, DONE + 0.2, 'Türkçe ipucu,', 'İngilizce cevap.', { y: 300, size: 80 });
  s += title(t, DONE + 0.2, S4, 'Her kelime', 'defterine eklenir.', { y: 300, size: 80 });
  s += title(t, S4, S4 + 2.0, '9 farklı', 'bulmaca oyunu', { y: 330 });
  s += title(t, S4 + 2.0, S5, 'Seviyeni yükselt,', 'rozet kazan.', { y: 330 });
  s += title(t, S5, S6, 'Hepsi', 'tek uygulamada.', { y: 330 });
  return s + '</svg>';
}

// ---------- ses ----------
const au = makeAudio(DUR);
au.pad(0, DUR, 112, 0.05);
CARDS.forEach((_, i) => au.tone(0.15 + i * 0.13 + 0.42, 140 + (i % 3) * 20, 0.12, 0.28, 0.05)); // kart düşme tokları
au.whoosh(S2 + 0.4, 0.6, 0.16);
for (let k = 0; k < 12; k++) au.click(S2 + 1.5 + k * 0.045, 0.12);
au.ding(S2 + 2.15, 0.2);
au.whoosh(S3, 0.45);
for (let i = 0; i < 4; i++) au.click(TYPE_T0 + i * 0.45, 0.22);
au.ding(DONE + 0.05);
au.whoosh(DONE + 0.5, 0.3, 0.1);
au.tone(DONE + 0.8, 1568, 0.25, 0.18, 0.08);
au.whoosh(S4 - 0.1, 0.45);
for (let i = 0; i < 9; i++) au.tone(S4 + 0.15 + i * 0.09, 620 + i * 45, 0.07, 0.2, 0.03);
[523.3, 659.3, 784, 1046.5].forEach((f, k) => au.tone(S4 + 2.5 + k * 0.28, f, 0.4, 0.22, 0.15)); // seviye atlama arpeji
[0, 1, 2].forEach((k) => au.ding(S4 + 3.45 + k * 0.3, 0.16));
au.whoosh(S5, 0.35);
for (let k = 0; k < 4; k++) au.tone(S5 + 0.25 + k * 0.6, 110, 0.18, 0.4, 0.07); // damga gümlemesi
au.whoosh(S6, 0.5, 0.14);
[S6 + 2.0, S6 + 3.3].forEach((a) => { au.click(a, 0.3); au.ding(a + 0.05, 0.2); });

makeVideo({ name: 'qorvex-ad-promo', dur: DUR, frame, audio: au });
