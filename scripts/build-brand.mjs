// QORVEX marka varlıklarını üretir: uygulama ikonu, Android adaptive ikon, splash, favicon, yatay logo.
// Kullanım: node scripts/build-brand.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const BRAND = path.join(ASSETS, 'brand');
fs.mkdirSync(BRAND, { recursive: true });

const FONTS = [
  'node_modules/@expo-google-fonts/old-standard-tt/700Bold/OldStandardTT_700Bold.ttf',
  'node_modules/@expo-google-fonts/libre-franklin/700Bold/LibreFranklin_700Bold.ttf',
  'node_modules/@expo-google-fonts/libre-franklin/900Black/LibreFranklin_900Black.ttf',
  'node_modules/@expo-google-fonts/unifrakturmaguntia/400Regular/UnifrakturMaguntia_400Regular.ttf',
  'node_modules/@expo-google-fonts/old-standard-tt/400Regular_Italic/OldStandardTT_400Regular_Italic.ttf',
].map((f) => path.join(ROOT, f));

// Uygulama teması ile aynı renkler
const PAPER = '#F4F0E6';
const INK = '#141414';
const CLUE = '#A8A49A';
const WHITE = '#FFFFFF';

/**
 * Q işareti: gazete serifi kontrastında (yanlar kalın, üst/alt ince) halka,
 * kuyruğu çengel bulmaca oku (↳), içinde gri ipucu kareli 2x2 bulmaca ızgarası.
 * (cx, cy) işaretin görsel merkezi, s ölçek (1 = 1024'lük ikonda tam boy)
 */
function qMark({ cx = 512, cy = 512, s = 1, ink = INK, clue = CLUE, cell = WHITE, mono = false }) {
  // Halka merkezini, kuyruk dahil tüm işaret ortalanacak şekilde kaydır
  const ox = cx - 22 * s, oy = cy - 88 * s;
  const X = (v) => ox + v * s, Y = (v) => oy + v * s;
  const R = { orx: 300, ory: 318, irx: 194, iry: 262 };
  const ring = `<path fill-rule="evenodd" fill="${ink}" d="
    M${X(-R.orx)} ${Y(0)} A${R.orx * s} ${R.ory * s} 0 1 0 ${X(R.orx)} ${Y(0)} A${R.orx * s} ${R.ory * s} 0 1 0 ${X(-R.orx)} ${Y(0)} Z
    M${X(-R.irx)} ${Y(0)} A${R.irx * s} ${R.iry * s} 0 1 0 ${X(R.irx)} ${Y(0)} A${R.irx * s} ${R.iry * s} 0 1 0 ${X(-R.irx)} ${Y(0)} Z"/>`;

  // Kuyruk: halkanın altından inen ve sağa kırılan kalın ok
  const sw = 60;
  const tail = `
    <path d="M${X(34)} ${Y(278)} V${Y(430)} H${X(232)}" fill="none" stroke="${ink}" stroke-width="${sw * s}" stroke-linejoin="miter"/>
    <polygon points="${X(222)},${Y(352)} ${X(222)},${Y(508)} ${X(352)},${Y(430)}" fill="${ink}"/>`;

  // Izgara: halkanın iç boşluğunda, uygulamadaki ipucu karesi + oklar
  const g = 108, half = g; // hücre
  const gx = -g, gy = -g - 4;
  const inner = 7, outer = 14, a = 19;
  const grid = `
    <rect x="${X(gx)}" y="${Y(gy)}" width="${2 * g * s}" height="${2 * g * s}" fill="${mono ? 'none' : cell}"/>
    <rect x="${X(gx)}" y="${Y(gy)}" width="${g * s}" height="${g * s}" fill="${mono ? ink : clue}"/>
    <path d="M${X(gx + g)} ${Y(gy)} V${Y(gy + 2 * g)} M${X(gx)} ${Y(gy + g)} H${X(gx + 2 * g)}" stroke="${ink}" stroke-width="${inner * s}"/>
    <rect x="${X(gx)}" y="${Y(gy)}" width="${2 * g * s}" height="${2 * g * s}" fill="none" stroke="${ink}" stroke-width="${outer * s}"/>
    <polygon points="${X(gx + g)},${Y(gy + half / 2 - a)} ${X(gx + g)},${Y(gy + half / 2 + a)} ${X(gx + g + a * 1.5)},${Y(gy + half / 2)}" fill="${ink}"/>
    <polygon points="${X(gx + half / 2 - a)},${Y(gy + g)} ${X(gx + half / 2 + a)},${Y(gy + g)} ${X(gx + half / 2)},${Y(gy + g + a * 1.5)}" fill="${ink}"/>`;
  return ring + tail + grid;
}
const svg = (w, h, body, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`;

function render(svgText, width) {
  const r = new Resvg(svgText, {
    fitTo: { mode: 'width', value: width },
    font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Old Standard TT' },
  });
  return r.render();
}

// --- Alfa kanalsız (RGB) PNG kodlayıcı: App Store ikonu saydamlık kabul etmez ---
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodeRGB(rgba, w, h, bg = [244, 240, 230]) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const al = rgba[i + 3] / 255;
      const o = y * (w * 3 + 1) + 1 + x * 3;
      for (let k = 0; k < 3; k++) raw[o + k] = Math.round(rgba[i + k] * al + bg[k] * (1 - al));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function writePng(file, svgText, width, { rgb = false } = {}) {
  const img = render(svgText, width);
  const buf = rgb ? encodeRGB(img.pixels, img.width, img.height) : img.asPng();
  fs.writeFileSync(file, buf);
  console.log(`${path.relative(ROOT, file)}  ${img.width}x${img.height}${rgb ? ' (RGB, alfa yok)' : ''}`);
}

// 1) Ana ikon (iOS / App Store 1024, alfa yok)
const iconBody = qMark({ cx: 512, cy: 512, s: 0.92 });
const iconSvg = svg(1024, 1024, iconBody, PAPER);
fs.writeFileSync(path.join(BRAND, 'qorvex-icon.svg'), iconSvg);
writePng(path.join(ASSETS, 'icon.png'), iconSvg, 1024, { rgb: true });

// 2) Android adaptive: ön plan (saydam, güvenli alan ~%66) + arka plan (kağıt) + monokrom
const fgSvg = svg(1024, 1024, qMark({ cx: 512, cy: 512, s: 0.6 }));
writePng(path.join(ASSETS, 'android-icon-foreground.png'), fgSvg, 512);
writePng(path.join(ASSETS, 'android-icon-background.png'), svg(1024, 1024, '', PAPER), 512);
const monoSvg = svg(1024, 1024, qMark({ cx: 512, cy: 512, s: 0.6, ink: '#FFFFFF', mono: true }));
writePng(path.join(ASSETS, 'android-icon-monochrome.png'), monoSvg, 432);

// 3) Splash ikonu (saydam) ve favicon
writePng(path.join(ASSETS, 'splash-icon.png'), svg(1024, 1024, qMark({ cx: 512, cy: 512, s: 0.85 })), 1024);
writePng(path.join(ASSETS, 'favicon.png'), iconSvg, 48);

// 4) Yatay logo (mağaza görselleri, web, sosyal medya)
const word = `
  ${qMark({ cx: 250, cy: 280, s: 0.52 })}
  <text x="496" y="296" textLength="1144" lengthAdjust="spacing" font-family="Old Standard TT" font-weight="700" font-size="220" fill="${INK}">QORVEX</text>
  <rect x="500" y="356" width="1140" height="9" fill="${INK}"/>
  <rect x="500" y="372" width="1140" height="3" fill="${INK}"/>
  <text x="502" y="446" font-family="UnifrakturMaguntia" font-size="56" fill="${INK}">The Daily Arrowword</text>
  <text x="1640" y="442" text-anchor="end" font-family="Libre Franklin" font-weight="700" font-size="27" letter-spacing="4" fill="${INK}">İNGİLİZCE ÇENGEL BULMACA</text>
`;const wordSvg = svg(1720, 560, word, PAPER);
fs.writeFileSync(path.join(BRAND, 'qorvex-logo.svg'), wordSvg);
writePng(path.join(BRAND, 'qorvex-logo.png'), wordSvg, 1720);

// 5) Kontrol sayfası: yuvarlatılmış köşeli ikon farklı boyutlarda (okunabilirlik testi)
const sizes = [512, 180, 120, 60, 40];
let x = 40;
let sheet = '';
for (const sz of sizes) {
  const sc = sz / 1024;
  sheet += `<g transform="translate(${x},${40 + (512 - sz)})"><clipPath id="c${sz}"><rect width="${sz}" height="${sz}" rx="${sz * 0.2237}"/></clipPath><g clip-path="url(#c${sz})"><g transform="scale(${sc})"><rect width="1024" height="1024" fill="${PAPER}"/>${iconBody}</g></g></g>`;
  x += sz + 40;
}
writePng(path.join(BRAND, 'icon-sizes-preview.png'), svg(x, 600, sheet, '#D9D4C7'), x);
