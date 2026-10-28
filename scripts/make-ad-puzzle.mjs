// Instagram reklamı (1.3): gerçek çengel bulmaca ekran görüntüsü + özellik kartları, marka renklerinde.
// Gönderi 1080x1350 ve hikâye 1080x1920. Kullanım: node scripts/make-ad-puzzle.mjs → store/ads/qorvex-ad-puzzle-*.png
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'store', 'ads');
const SHOT = path.join(ROOT, 'store/screenshots/v1.3/raw/01-cengel-bulmaca.png');
fs.mkdirSync(OUT_DIR, { recursive: true });

const FONTS = [
  'newsreader/700Bold/Newsreader_700Bold.ttf',
  'newsreader/500Medium_Italic/Newsreader_500Medium_Italic.ttf',
  'hanken-grotesk/500Medium/HankenGrotesk_500Medium.ttf',
  'hanken-grotesk/700Bold/HankenGrotesk_700Bold.ttf',
  'space-grotesk/700Bold/SpaceGrotesk_700Bold.ttf',
].map((f) => path.join(ROOT, 'node_modules/@expo-google-fonts', f));
const render = (svg, width) => new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Hanken Grotesk' } }).render().asPng();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Marka renkleri
const NAVY = '#18324D', NAVY_HI = '#2A5079', NAVY_DEEP = '#0F2238';
const CREAM = '#F4EFE2', TEAL = '#19B5C2', ORANGE = '#F37216', INK = '#141B26', CLUE = '#E9E5DD';
const LOGO_SVG = fs.readFileSync(path.join(ROOT, 'assets/brand/qorvex-logo.svg'), 'utf8').replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<rect width="1720" height="560" fill="[^"]+"\/>/, '');
const shot = `data:image/png;base64,${fs.readFileSync(SHOT).toString('base64')}`;
const SHOT_RATIO = 1598 / 736;

// Basit çizgi ikonlar (24x24 ölçeğinde)
const ICON = {
  grid: (c) => `<rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="${c}" stroke-width="2.2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="${c}" stroke-width="2"/>`,
  swap: (c) => `<path d="M4 8h13l-3-3M20 16H7l3 3" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  sound: (c) => `<path d="M4 9h4l5-4v14l-5-4H4z" fill="${c}"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`,
  steps: (c) => `<path d="M3 20h5v-5h5v-5h5V5h3" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
};

// Özellik kartı: ikon dairesi + başlık + açıklama
function card(x, y, w, icon, head, body) {
  return `<g>
    <rect x="${x}" y="${y + 6}" width="${w}" height="112" rx="26" fill="${NAVY_DEEP}" fill-opacity="0.35"/>
    <rect x="${x}" y="${y}" width="${w}" height="112" rx="26" fill="${CREAM}"/>
    <circle cx="${x + 56}" cy="${y + 56}" r="32" fill="${NAVY}"/>
    <g transform="translate(${x + 56 - 17} ${y + 56 - 17}) scale(${34 / 24})">${ICON[icon](TEAL)}</g>
    <text x="${x + 104}" y="${y + 50}" font-family="Hanken Grotesk" font-weight="700" font-size="29" fill="${INK}">${esc(head)}</text>
    <text x="${x + 104}" y="${y + 84}" font-family="Hanken Grotesk" font-weight="500" font-size="22" fill="#5F6672">${esc(body)}</text>
  </g>`;
}

// İpucu → cevap şeridi: "Ağaç" ipucu karesi + T R E E
function clueStrip(x, y, s) {
  const letters = 'TREE';
  let out = `<rect x="${x - 6}" y="${y - 6}" width="${s * 5 + 12}" height="${s + 12}" rx="10" fill="${CREAM}"/>
    <rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${CLUE}"/>
    <text x="${x + s / 2}" y="${y + s / 2 + 9}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="${s * 0.3}" fill="${INK}">Ağaç</text>
    <path d="M${x + s} ${y + s / 2 - 9}l13 9-13 9z" fill="${INK}"/>`;
  letters.split('').forEach((ch, i) => {
    const cx = x + s * (i + 1);
    out += `<rect x="${cx}" y="${y}" width="${s}" height="${s}" fill="#FFFFFF" stroke="#CFCAC0" stroke-width="2"/>
      <text x="${cx + s / 2}" y="${y + s / 2 + s * 0.2}" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="${s * 0.56}" fill="${INK}">${ch}</text>`;
  });
  return out;
}

function phone(px, py, pw, angle) {
  const ph = Math.round(pw * SHOT_RATIO);
  const cx = px + pw / 2, cy = py + ph / 2;
  return `<g transform="rotate(${angle} ${cx} ${cy})">
    <rect x="${px - 22}" y="${py - 10}" width="${pw + 44}" height="${ph + 44}" rx="74" fill="#000" fill-opacity="0.28" transform="translate(18 26)"/>
    <rect x="${px - 18}" y="${py - 18}" width="${pw + 36}" height="${ph + 36}" rx="70" fill="${NAVY_DEEP}" stroke="#46658A" stroke-width="3"/>
    <clipPath id="scr"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="54"/></clipPath>
    <image href="${shot}" x="${px}" y="${py}" width="${pw}" height="${ph}" clip-path="url(#scr)" preserveAspectRatio="xMidYMid slice"/>
  </g>`;
}

function background(W, H) {
  let grid = '';
  for (let y = 0; y < H; y += 60) for (let x = 0; x < W; x += 60) grid += `<rect x="${x + 2}" y="${y + 2}" width="56" height="56" rx="4" fill="none" stroke="#FFFFFF" stroke-opacity="0.035" stroke-width="1.5"/>`;
  return `<defs>
      <radialGradient id="glow" cx="30%" cy="22%" r="85%"><stop offset="0" stop-color="${NAVY_HI}"/><stop offset="0.6" stop-color="${NAVY}"/><stop offset="1" stop-color="${NAVY_DEEP}"/></radialGradient>
      <radialGradient id="tealGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${TEAL}" stop-opacity="0.35"/><stop offset="1" stop-color="${TEAL}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>${grid}`;
}

const logo = (x, y, w) => `<g transform="translate(${x} ${y}) scale(${w / 1720})">${LOGO_SVG}</g>`;
const cta = (x, y, w, label) => `<rect x="${x}" y="${y}" width="${w}" height="96" rx="48" fill="${ORANGE}"/>
  <text x="${x + w / 2}" y="${y + 60}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="35" fill="#FFFFFF">${esc(label)}</text>`;

const FEATS = [
  ['grid', 'Sınırsız bulmaca', 'Her seferinde yepyeni ızgara'],
  ['swap', 'Türkçe ipucu, İngilizce cevap', 'Çözdükçe kelime öğren'],
  ['steps', '5.500+ kelime · A1 → C2', 'Seviyene göre bulmacalar'],
  ['sound', 'Sesli telaffuz & kelime kartı', 'Örnek cümle ve okunuş'],
];

// ---------- Gönderi 1080x1350 ----------
function post() {
  const W = 1080, H = 1350;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${background(W, H)}
    <circle cx="790" cy="900" r="420" fill="url(#tealGlow)"/>
    ${logo(64, 40, 300)}
    <text x="64" y="262" font-family="Newsreader" font-weight="700" font-size="92" fill="${CREAM}">Bulmaca çöz,</text>
    <text x="64" y="360" font-family="Newsreader" font-style="italic" font-weight="500" font-size="96" fill="${TEAL}">İngilizce öğren.</text>
    <text x="66" y="424" font-family="Hanken Grotesk" font-weight="500" font-size="30" fill="${CREAM}" fill-opacity="0.85">9 bulmaca oyunu · reklamsız · her gün yeni bulmaca</text>
    ${phone(598, 488, 400, 5)}
    ${clueStrip(64, 488, 74)}
    ${FEATS.map(([ic, h, b], i) => card(64, 618 + i * 132, 560, ic, h, b)).join('')}
    ${cta(64, 1176, 470, "App Store'da ücretsiz")}
  </svg>`;
}

// ---------- Hikâye 1080x1920 ----------
function story() {
  const W = 1080, H = 1920;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${background(W, H)}
    <circle cx="${W / 2}" cy="1080" r="520" fill="url(#tealGlow)"/>
    ${logo((W - 340) / 2, 150, 340)}
    <text x="${W / 2}" y="410" text-anchor="middle" font-family="Newsreader" font-weight="700" font-size="96" fill="${CREAM}">Bulmaca çöz,</text>
    <text x="${W / 2}" y="512" text-anchor="middle" font-family="Newsreader" font-style="italic" font-weight="500" font-size="100" fill="${TEAL}">İngilizce öğren.</text>
    <text x="${W / 2}" y="580" text-anchor="middle" font-family="Hanken Grotesk" font-weight="500" font-size="32" fill="${CREAM}" fill-opacity="0.85">Türkçe ipucu · İngilizce cevap · 5.500+ kelime</text>
    ${phone(330, 660, 420, -4)}
    ${card(60, 820, 470, 'grid', 'Sınırsız bulmaca', 'Her seferinde yepyeni ızgara')}
    ${card(550, 1180, 470, 'sound', 'Sesli telaffuz', 'Kelime kartı ve örnek cümle')}
    ${clueStrip(120, 1440, 76)}
    ${cta((W - 560) / 2, 1640, 560, "App Store'da ücretsiz")}
    <text x="${W / 2}" y="1800" text-anchor="middle" font-family="Hanken Grotesk" font-weight="500" font-size="26" fill="${CREAM}" fill-opacity="0.7">9 bulmaca oyunu · reklamsız · A1 → C2</text>
  </svg>`;
}

for (const [name, svg, w] of [['post', post(), 1080], ['story', story(), 1080]]) {
  const out = path.join(OUT_DIR, `qorvex-ad-puzzle-${name}.png`);
  fs.writeFileSync(out, render(svg, w));
  console.log(path.relative(ROOT, out));
}
