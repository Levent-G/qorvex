// ÇENGO marka varlıklarını üretir: uygulama ikonu, Android adaptive ikon, splash, favicon, yatay logo.
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

// "Editorial" teması: lacivert zemin (uygulamanın ana rengi), krem Ç, turkuaz çengel ok ve ipucu karesi
const NAVY = '#18324D';
const NAVY_HI = '#26496E';
const CREAM = '#F4EFE2';
const TEAL = '#19B5C2';
const INK = '#18324D';
const PAPER = NAVY; // ikon zemini

/**
 * Ç işareti: sağa açık kalın "C" halkası; içinde ipucu kareli 2x2 bulmaca ızgarası;
 * Ç'nin çengeli, aşağı inip sağa kıvrılan çengel bulmaca oku (↳).
 * (cx, cy) işaretin görsel merkezi, s ölçek (1 = 1024'lük ikonda tam boy)
 */
function qMark({ cx = 512, cy = 512, s = 1, ring: ringC = CREAM, tailC = TEAL, ink = INK, clue = TEAL, cell = CREAM, mono = false }) {
  // çengel dahil tüm işaret ortalansın
  const ox = cx - 6 * s, oy = cy - 78 * s;
  const X = (v) => ox + v * s, Y = (v) => oy + v * s;
  // C halkası: dış ve iç elips yayı, sağda açıklık
  const Ro = { x: 300, y: 312 }, Ri = { x: 192, y: 228 };
  const th = (40 * Math.PI) / 180, ti = (46 * Math.PI) / 180;
  const p = (r, t, sign) => [X(r.x * Math.cos(t)), Y(sign * r.y * Math.sin(t))];
  const [o1x, o1y] = p(Ro, th, -1), [o2x, o2y] = p(Ro, th, 1);
  const [i1x, i1y] = p(Ri, ti, -1), [i2x, i2y] = p(Ri, ti, 1);
  const ring = `<path fill="${ringC}" d="M${o1x} ${o1y} A${Ro.x * s} ${Ro.y * s} 0 1 0 ${o2x} ${o2y} L${i2x} ${i2y} A${Ri.x * s} ${Ri.y * s} 0 1 1 ${i1x} ${i1y} Z"/>`;

  // Çengel: halkanın altından inip sağa kırılan kalın ok
  const sw = 58;
  const tail = `
    <path d="M${X(10)} ${Y(Ro.y - 30)} V${Y(Ro.y + 128)} H${X(196)}" fill="none" stroke="${tailC}" stroke-width="${sw * s}" stroke-linejoin="miter"/>
    <polygon points="${X(186)},${Y(Ro.y + 52)} ${X(186)},${Y(Ro.y + 204)} ${X(314)},${Y(Ro.y + 128)}" fill="${tailC}"/>`;

  // Izgara: halkanın iç boşluğunda, ipucu karesi + oklar
  const g = 92, half = g;
  const gx = -g - 14, gy = -g;
  const inner = 7, outer = 13, ar = 17;
  const grid = `
    <rect x="${X(gx)}" y="${Y(gy)}" width="${2 * g * s}" height="${2 * g * s}" fill="${mono ? 'none' : cell}"/>
    <rect x="${X(gx)}" y="${Y(gy)}" width="${g * s}" height="${g * s}" fill="${mono ? ink : clue}"/>
    <path d="M${X(gx + g)} ${Y(gy)} V${Y(gy + 2 * g)} M${X(gx)} ${Y(gy + g)} H${X(gx + 2 * g)}" stroke="${ink}" stroke-width="${inner * s}"/>
    <rect x="${X(gx)}" y="${Y(gy)}" width="${2 * g * s}" height="${2 * g * s}" fill="none" stroke="${ink}" stroke-width="${outer * s}"/>
    <polygon points="${X(gx + g)},${Y(gy + half / 2 - ar)} ${X(gx + g)},${Y(gy + half / 2 + ar)} ${X(gx + g + ar * 1.5)},${Y(gy + half / 2)}" fill="${ink}"/>
    <polygon points="${X(gx + half / 2 - ar)},${Y(gy + g)} ${X(gx + half / 2 + ar)},${Y(gy + g)} ${X(gx + half / 2)},${Y(gy + g + ar * 1.5)}" fill="${ink}"/>`;
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
function encodeRGB(rgba, w, h, bg = [11, 29, 51]) {
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
const glow = `<defs><radialGradient id="g" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="${NAVY_HI}"/><stop offset="1" stop-color="${NAVY}"/></radialGradient></defs><rect width="1024" height="1024" fill="url(#g)"/>`;
const iconSvg = svg(1024, 1024, glow + iconBody);
fs.writeFileSync(path.join(BRAND, 'cengo-icon.svg'), iconSvg);
writePng(path.join(ASSETS, 'icon.png'), iconSvg, 1024, { rgb: true });

// 2) Android adaptive: ön plan (saydam, güvenli alan ~%66) + arka plan (kağıt) + monokrom
const fgSvg = svg(1024, 1024, qMark({ cx: 512, cy: 512, s: 0.6 }));
writePng(path.join(ASSETS, 'android-icon-foreground.png'), fgSvg, 512);
writePng(path.join(ASSETS, 'android-icon-background.png'), svg(1024, 1024, '', PAPER), 512);
const monoSvg = svg(1024, 1024, qMark({ cx: 512, cy: 512, s: 0.6, ring: '#FFFFFF', tailC: '#FFFFFF', ink: '#FFFFFF', mono: true }));
writePng(path.join(ASSETS, 'android-icon-monochrome.png'), monoSvg, 432);

// 3) Splash ikonu (saydam) ve favicon
writePng(path.join(ASSETS, 'splash-icon.png'), svg(1024, 1024, qMark({ cx: 512, cy: 512, s: 0.85 })), 1024);
writePng(path.join(ASSETS, 'favicon.png'), iconSvg, 48);

// 4) Yatay logo (mağaza görselleri, web, sosyal medya)
const word = `
  ${qMark({ cx: 250, cy: 280, s: 0.52 })}
  <text x="496" y="300" textLength="1144" lengthAdjust="spacing" font-family="Libre Franklin" font-weight="900" font-size="230" fill="${CREAM}">ÇENGO</text>
  <rect x="500" y="388" width="1140" height="8" rx="4" fill="${TEAL}"/>
  <text x="502" y="470" font-family="Libre Franklin" font-weight="700" font-size="44" letter-spacing="14" fill="${TEAL}">BUL · ÇÖZ · ÖĞREN</text>
`;const wordSvg = svg(1720, 560, word, NAVY);
fs.writeFileSync(path.join(BRAND, 'cengo-logo.svg'), wordSvg);
writePng(path.join(BRAND, 'cengo-logo.png'), wordSvg, 1720);

// 5) Kontrol sayfası: yuvarlatılmış köşeli ikon farklı boyutlarda (okunabilirlik testi)
const sizes = [512, 180, 120, 60, 40];
let x = 40;
let sheet = '';
for (const sz of sizes) {
  const sc = sz / 1024;
  sheet += `<g transform="translate(${x},${40 + (512 - sz)})"><clipPath id="c${sz}"><rect width="${sz}" height="${sz}" rx="${sz * 0.2237}"/></clipPath><g clip-path="url(#c${sz})"><g transform="scale(${sc})">${glow.replace('id="g"', `id="g${sz}"`).replace('url(#g)', `url(#g${sz})`)}${iconBody}</g></g></g>`;
  x += sz + 40;
}
writePng(path.join(BRAND, 'icon-sizes-preview.png'), svg(x, 600, sheet, '#E8ECF1'), x);
