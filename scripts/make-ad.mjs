// Instagram reklam görseli (1080x1350, 4:5) — marka renkleri, logo ve gerçek ekran görüntüsüyle
// Kullanım: node scripts/make-ad.mjs  →  store/ads/qorvex-ad-01.png
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'store', 'ads');
fs.mkdirSync(OUT_DIR, { recursive: true });

const FONTS = [
  'node_modules/@expo-google-fonts/newsreader/700Bold/Newsreader_700Bold.ttf',
  'node_modules/@expo-google-fonts/newsreader/500Medium_Italic/Newsreader_500Medium_Italic.ttf',
  'node_modules/@expo-google-fonts/hanken-grotesk/500Medium/HankenGrotesk_500Medium.ttf',
  'node_modules/@expo-google-fonts/hanken-grotesk/700Bold/HankenGrotesk_700Bold.ttf',
  'node_modules/@expo-google-fonts/space-grotesk/700Bold/SpaceGrotesk_700Bold.ttf',
  'node_modules/@expo-google-fonts/libre-franklin/700Bold/LibreFranklin_700Bold.ttf', // logo yazısı
  'node_modules/@expo-google-fonts/libre-franklin/900Black/LibreFranklin_900Black.ttf',
].map((f) => path.join(ROOT, f));

const NAVY = '#18324D', NAVY_HI = '#26496E', NAVY_DEEP = '#0F2238';
const CREAM = '#F4EFE2', TEAL = '#19B5C2', ORANGE = '#F37216', CLUE = '#E9E5DD', INK = '#141B26';
const W = 1080, H = 1350;

const dataUri = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
// logo: SVG'nin içeriği zeminsiz gömülür (reklamın degrade zemininde kutu gibi durmasın)
const LOGO_SVG = fs.readFileSync(path.join(ROOT, 'assets/brand/qorvex-logo.svg'), 'utf8').replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<rect width="1720" height="560" fill="[^"]+"\/>/, '');
const SHOT = dataUri(path.join(ROOT, 'store/screenshots/v1.2/raw/01-ana-sayfa.jpg'), 'image/jpeg'); // 738x1600

// arka planda hafif bulmaca ızgarası (gazete dokusu)
let grid = '';
const S = 54;
for (let y = 0; y < H; y += S) for (let x = 0; x < W; x += S) grid += `<rect x="${x + 1}" y="${y + 1}" width="${S - 2}" height="${S - 2}" rx="3" fill="none" stroke="#FFFFFF" stroke-opacity="0.035" stroke-width="1.5"/>`;

// "Elma → APPLE" çengel şeridi
const cell = 92, stripY = 560, letters = 'APPLE';
const stripW = cell * (letters.length + 1);
const sx = (W - stripW) / 2;
let strip = `<rect x="${sx}" y="${stripY}" width="${cell}" height="${cell}" fill="${CLUE}"/>
  <text x="${sx + cell / 2}" y="${stripY + cell / 2 + 9}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="26" fill="${INK}">Elma</text>
  <polygon points="${sx + cell + 2},${stripY + cell / 2 - 10} ${sx + cell + 2},${stripY + cell / 2 + 10} ${sx + cell + 16},${stripY + cell / 2}" fill="${INK}"/>`;
letters.split('').forEach((ch, i) => {
  const x = sx + cell * (i + 1);
  strip += `<rect x="${x}" y="${stripY}" width="${cell}" height="${cell}" fill="#FFFFFF"/>
  <text x="${x + cell / 2}" y="${stripY + cell / 2 + 17}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="50" fill="${NAVY}">${ch}</text>`;
});
// ızgara çizgileri ve çerçeve
for (let i = 1; i <= letters.length; i++) strip += `<line x1="${sx + cell * i}" y1="${stripY}" x2="${sx + cell * i}" y2="${stripY + cell}" stroke="#CFCAC0" stroke-width="2"/>`;
strip += `<rect x="${sx}" y="${stripY}" width="${stripW}" height="${cell}" fill="none" stroke="${CREAM}" stroke-width="4" rx="4"/>`;
// şeridin altında açıklama
strip += `<text x="${W / 2}" y="${stripY + cell + 50}" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="22" letter-spacing="5" fill="${TEAL}">İPUCU TÜRKÇE · CEVAP İNGİLİZCE</text>`;

// telefon (sağ alt, hafif eğik, alttan taşar)
const pw = 400, ph = Math.round(pw * (1600 / 738)), px = 612, py = 790;
const phone = `<g transform="rotate(6 ${px + pw / 2} ${py + ph / 2})">
  <rect x="${px - 16}" y="${py - 16}" width="${pw + 32}" height="${ph + 32}" rx="58" fill="${NAVY_DEEP}" stroke="#3A5677" stroke-width="3"/>
  <clipPath id="scr"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="44"/></clipPath>
  <image href="${SHOT}" x="${px}" y="${py}" width="${pw}" height="${ph}" clip-path="url(#scr)" preserveAspectRatio="xMidYMid slice"/>
</g>`;

// sol alt: özellikler + çağrı
const feats = [
  ['9', 'bulmaca oyunu'],
  ['5.500+', 'kelime · A1 → C2'],
  ['🔊', 'sesli telaffuz &amp; kelime defteri'],
];
let left = '';
feats.forEach(([big, small], i) => {
  const y = 860 + i * 112;
  left += `<text x="80" y="${y}" font-family="Newsreader" font-weight="700" font-size="${big.length > 2 ? 56 : 64}" fill="${CREAM}">${big === '🔊' ? '' : big}</text>`;
  if (big === '🔊') left += `<g transform="translate(80 ${y - 44})"><path d="M0 14h12l14-12v44L12 34H0z" fill="${CREAM}"/><path d="M34 10c6 6 6 22 0 28M42 4c10 10 10 32 0 42" stroke="${CREAM}" stroke-width="5" fill="none" stroke-linecap="round"/></g>`;
  left += `<text x="80" y="${y + 38}" font-family="Hanken Grotesk" font-weight="500" font-size="28" fill="${CREAM}" fill-opacity="0.82">${small}</text>`;
});
// çağrı düğmesi
left += `<rect x="80" y="1190" width="440" height="96" rx="48" fill="${ORANGE}"/>
  <text x="300" y="1250" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="36" fill="#FFFFFF">App Store'da ücretsiz</text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><radialGradient id="glow" cx="50%" cy="28%" r="75%"><stop offset="0" stop-color="${NAVY_HI}"/><stop offset="1" stop-color="${NAVY}"/></radialGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${grid}
  <g transform="translate(${(W - 430) / 2} 48) scale(${430 / 1720})">${LOGO_SVG}</g>
  <text x="${W / 2}" y="330" text-anchor="middle" font-family="Newsreader" font-weight="700" font-size="88" fill="${CREAM}">Gazete bulmacası,</text>
  <text x="${W / 2}" y="430" text-anchor="middle" font-family="Newsreader" font-style="italic" font-weight="500" font-size="96" fill="${TEAL}">ama İngilizce.</text>
  <text x="${W / 2}" y="498" text-anchor="middle" font-family="Hanken Grotesk" font-weight="500" font-size="31" fill="${CREAM}" fill-opacity="0.85">Çözdükçe kelime dağarcığın büyüsün. Reklamsız.</text>
  ${strip}
  ${phone}
  ${left}
</svg>`;

const png = new Resvg(svg, {
  fitTo: { mode: 'width', value: W },
  font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Hanken Grotesk' },
}).render().asPng();
const out = path.join(OUT_DIR, 'qorvex-ad-01.png');
fs.writeFileSync(out, png);
console.log(out, Math.round(png.length / 1024) + ' KB');
