// iPhone ekran görüntülerini App Store 6.9" boyutuna (1290x2796, alfa yok) çevirir.
// Kullanım: görüntüleri store/screenshots/raw klasörüne koy, sonra: npm run screenshots
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// İsteğe bağlı sürüm klasörü: node scripts/resize-screenshots.mjs v1.1  →  store/screenshots/v1.1/raw → store/screenshots/v1.1/<boyut>
const SET = process.argv[2] || '';
const BASE = path.resolve(__dirname, '../store/screenshots', SET);
const RAW = path.join(BASE, 'raw');
// Apple'ın kabul ettiği iPhone ekran görüntüsü boyutları (dikey)
const SIZES = [
  { dir: '6.1-inch-1179x2556', W: 1179, H: 2556 },
  { dir: '6.3-inch-1206x2622', W: 1206, H: 2622 },
  { dir: '6.9-inch-1320x2868', W: 1320, H: 2868 },
  { dir: '6.9-inch-1290x2796', W: 1290, H: 2796 },
  { dir: '6.5-inch-1284x2778', W: 1284, H: 2778 },
  { dir: '6.5-inch-1242x2688', W: 1242, H: 2688 },
];
fs.mkdirSync(RAW, { recursive: true });

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b) => {
  let c = 0xffffffff;
  for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (t, d) => {
  const l = Buffer.alloc(4);
  l.writeUInt32BE(d.length);
  const td = Buffer.concat([Buffer.from(t), d]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc32(td));
  return Buffer.concat([l, td, c]);
};
function rgbPng(px, w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = px[i]; raw[o + 1] = px[i + 1]; raw[o + 2] = px[i + 2];
    }
  const ih = Buffer.alloc(13);
  ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const files = fs.readdirSync(RAW).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
if (!files.length) console.log(`Görüntü bulunamadı. Ekran görüntülerini şuraya koy: ${RAW}`);
for (const { dir, W, H } of SIZES) {
  const OUT = path.join(BASE, dir);
  fs.mkdirSync(OUT, { recursive: true });
  files.forEach((f, n) => {
    const buf = fs.readFileSync(path.join(RAW, f));
    const mime = /\.png$/i.test(f) ? 'image/png' : 'image/jpeg';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#F4F0E6"/><image width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" xlink:href="data:${mime};base64,${buf.toString('base64')}"/></svg>`;
    const img = new Resvg(svg, { fitTo: { mode: 'original' } }).render();
    const out = path.join(OUT, `${String(n + 1).padStart(2, '0')}.png`);
    fs.writeFileSync(out, rgbPng(img.pixels, img.width, img.height));
  });
  console.log(`${dir}: ${files.length} görüntü (${W}x${H})`);
}