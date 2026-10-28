// Instagram Reels/hikâye reklam videosu (1080x1920, 30 fps, 15 sn).
// Gerçek bulmaca ekran görüntüsünün üstünde "Ağaç → TREE" yazılır; ardından özellik kartları ve App Store çağrısı.
// Kareler resvg ile çizilir, ffmpeg (@ffmpeg-installer/ffmpeg) ile MP4'e çevrilir.
// Kullanım: node scripts/make-ad-video.mjs → store/ads/qorvex-ad-video.mp4
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const require = createRequire(import.meta.url);
const FFMPEG = require('@ffmpeg-installer/ffmpeg').path;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'store', 'ads', 'qorvex-ad-video.mp4');
const SHOT = path.join(ROOT, 'store/screenshots/v1.3/raw/01-cengel-bulmaca.png');
const FPS = 30, DUR = 15, W = 1080, H = 1920;

const FONTS = [
  'newsreader/700Bold/Newsreader_700Bold.ttf',
  'newsreader/600SemiBold/Newsreader_600SemiBold.ttf',
  'newsreader/500Medium_Italic/Newsreader_500Medium_Italic.ttf',
  'hanken-grotesk/500Medium/HankenGrotesk_500Medium.ttf',
  'hanken-grotesk/700Bold/HankenGrotesk_700Bold.ttf',
  'libre-franklin/600SemiBold/LibreFranklin_600SemiBold.ttf',
  'archivo-narrow/500Medium/ArchivoNarrow_500Medium.ttf',
  'archivo-narrow/700Bold/ArchivoNarrow_700Bold.ttf',
].map((f) => path.join(ROOT, 'node_modules/@expo-google-fonts', f));
const render = (svg) => new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Hanken Grotesk' } }).render().asPng();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Marka ve uygulama renkleri
const NAVY = '#18324D', NAVY_HI = '#2A5079', NAVY_DEEP = '#0F2238';
const CREAM = '#F4EFE2', TEAL = '#19B5C2', ORANGE = '#F37216', INK = '#141B26';
const APP = { clue: '#E9E4DE', clueActive: '#C6DDEB', hl: '#D7E5F3', sel: '#8CB8E6', ok: '#B9DFAA', accentSoft: '#DDF3F9', accentInk: '#08657D' };
const LOGO_SVG = fs.readFileSync(path.join(ROOT, 'assets/brand/qorvex-logo.svg'), 'utf8').replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<rect width="1720" height="560" fill="[^"]+"\/>/, '');
const shot = `data:image/png;base64,${fs.readFileSync(SHOT).toString('base64')}`;
const SW = 736, SH = 1598; // ekran görüntüsü (çerçevesi kırpılmış)

// Ekran görüntüsündeki ölçüler (piksel): sütun/satır çizgileri ve klavye tuşları
const COLX = [99, 189, 278, 367, 457, 546, 635];
const ROWY = [216, 305, 394, 484, 573];
const KEY = { T: 303, R: 233, E: 164 }; // üst sıra tuşlarının sol kenarı; genişlik 62, y 1198–1279
const WORD = 'TREE';
const WORD_ROW = 3, WORD_COL0 = 2; // "Ağaç" ipucunun sağındaki 4 kare

// zaman yardımcıları
const clamp = (x) => Math.max(0, Math.min(1, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeBack = (x) => { const c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const lerp = (a, b, x) => a + (b - a) * x;

let GRID = '';
for (let y = 0; y < H; y += 60) for (let x = 0; x < W; x += 60) GRID += `<rect x="${x + 2}" y="${y + 2}" width="56" height="56" rx="4" fill="none" stroke="#FFFFFF" stroke-opacity="0.035" stroke-width="1.5"/>`;

const ICON = {
  grid: (c) => `<rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="${c}" stroke-width="2.2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="${c}" stroke-width="2"/>`,
  swap: (c) => `<path d="M4 8h13l-3-3M20 16H7l3 3" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  sound: (c) => `<path d="M4 9h4l5-4v14l-5-4H4z" fill="${c}"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`,
  steps: (c) => `<path d="M3 20h5v-5h5v-5h5V5h3" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
};
const bulb = (x, y, s, color) => `<g transform="translate(${x} ${y}) scale(${s / 24})"><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round"/><path d="M9 20h6M10 23h4" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/></g>`;

function card(x, y, w, icon, head, body) {
  return `<rect x="${x}" y="${y + 8}" width="${w}" height="112" rx="26" fill="#000" fill-opacity="0.22"/>
    <rect x="${x}" y="${y}" width="${w}" height="112" rx="26" fill="${CREAM}"/>
    <circle cx="${x + 56}" cy="${y + 56}" r="32" fill="${NAVY}"/>
    <g transform="translate(${x + 39} ${y + 39}) scale(${34 / 24})">${ICON[icon](TEAL)}</g>
    <text x="${x + 104}" y="${y + 50}" font-family="Hanken Grotesk" font-weight="700" font-size="29" fill="${INK}">${esc(head)}</text>
    <text x="${x + 104}" y="${y + 84}" font-family="Hanken Grotesk" font-weight="500" font-size="22" fill="#5F6672">${esc(body)}</text>`;
}

// Ekranın üstüne çizilenler (ekran görüntüsü koordinatlarında)
function screenOverlay(t) {
  let o = '';
  const cell = (r, c) => [COLX[c], ROWY[r], COLX[c + 1] - COLX[c] - 1, ROWY[r + 1] - ROWY[r] - 1];
  const tap = 2.7;
  if (t >= tap + 0.15) {
    // eski seçimi (üst satır, "Gerçek") kaldır
    for (let c = 2; c <= 5; c++) { const [x, y, w, h] = cell(0, c); o += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#FFFFFF"/>`; }
    o += `<rect x="190" y="216" width="87" height="44" fill="${APP.clue}"/>
      <text x="233.5" y="244" text-anchor="middle" font-family="Archivo Narrow" font-weight="500" font-size="17" fill="${INK}">Gerçek</text>`;
    // yeni seçim: "Ağaç"
    const [cx, cy, cw, ch] = cell(WORD_ROW, 1);
    o += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="${APP.clueActive}"/>
      <text x="${cx + cw / 2}" y="${cy + ch / 2 + 6}" text-anchor="middle" font-family="Archivo Narrow" font-weight="700" font-size="18" fill="${INK}">Ağaç</text>`;
    const typed = WORD.split('').filter((_, i) => t >= 3.3 + i * 0.42).length;
    const done = t >= 3.3 + 3 * 0.42 + 0.35;
    for (let i = 0; i < WORD.length; i++) {
      const [x, y, w, h] = cell(WORD_ROW, WORD_COL0 + i);
      const fill = done ? APP.ok : i === Math.min(typed, WORD.length - 1) ? APP.sel : APP.hl;
      o += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
      if (i < typed) {
        const pop = easeBack(prog(t, 3.3 + i * 0.42, 3.3 + i * 0.42 + 0.18));
        const s = 0.6 + 0.4 * pop;
        o += `<text x="${x + w / 2}" y="${y + h / 2 + 18}" text-anchor="middle" font-family="Libre Franklin" font-weight="600" font-size="${52 * s}" fill="${INK}">${WORD[i]}</text>`;
      }
    }
    // ızgara altındaki ilerleme satırı: kelime bitince güncellenir
    if (done)
      o += `<rect x="224" y="1031" width="288" height="30" fill="#F9F8F4"/>
        <text x="367" y="1050.5" text-anchor="middle" font-family="Hanken Grotesk" font-weight="500" font-size="19.5" fill="#5F6672">4/37 harf · 1/20 kelime doğru</text>`;
    // ipucu çubuğu: Ağaç
    o += `<rect x="78" y="1097" width="500" height="74" fill="#FFFFFF"/>
      <text x="81" y="1133" font-family="Newsreader" font-weight="600" font-size="37" fill="${INK}">Ağaç</text>
      <rect x="172" y="1101" width="192" height="33" rx="16.5" fill="${APP.accentSoft}"/>
      ${bulb(181, 1106, 22, APP.accentInk)}
      <text x="209" y="1123.5" font-family="Hanken Grotesk" font-weight="700" font-size="15.5" fill="${APP.accentInk}">Kelime kartını gör</text>
      <text x="81" y="1163" font-family="Newsreader" font-style="italic" font-weight="500" font-size="19.5" fill="#5F6672">“Bahçede büyük bir ağaç var.”</text>`;
    // klavyede basılan tuş
    WORD.split('').forEach((chr, i) => {
      const a = 3.3 + i * 0.42;
      const k = prog(t, a - 0.02, a + 0.22);
      if (k > 0 && k < 1) o += `<rect x="${KEY[chr]}" y="1198" width="62" height="81" rx="9" fill="${TEAL}" fill-opacity="${0.45 * (1 - k)}"/>`;
    });
  }
  // dokunma halkası
  const r = prog(t, tap, tap + 0.45);
  if (r > 0 && r < 1) {
    const [cx, cy, cw, ch] = cell(WORD_ROW, 1);
    o += `<circle cx="${cx + cw / 2}" cy="${cy + ch / 2}" r="${20 + 50 * easeOut(r)}" fill="${TEAL}" fill-opacity="${0.35 * (1 - r)}"/>`;
  }
  return o;
}

function frame(t) {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <radialGradient id="glow" cx="30%" cy="22%" r="85%"><stop offset="0" stop-color="${NAVY_HI}"/><stop offset="0.6" stop-color="${NAVY}"/><stop offset="1" stop-color="${NAVY_DEEP}"/></radialGradient>
      <radialGradient id="tealGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${TEAL}" stop-opacity="0.35"/><stop offset="1" stop-color="${TEAL}" stop-opacity="0"/></radialGradient>
      <clipPath id="scr"><rect x="0" y="0" width="${SW}" height="${SH}" rx="80"/></clipPath>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>${GRID}`;
  // arka ışık yavaşça nefes alır
  s += `<circle cx="${W / 2}" cy="1100" r="${520 + 30 * Math.sin(t * 1.4)}" fill="url(#tealGlow)"/>`;

  // logo + başlık
  const lg = easeOut(prog(t, 0.15, 0.8));
  s += `<g opacity="${lg}" transform="translate(${(W - 340) / 2} ${110 + 20 * (1 - lg)}) scale(${340 / 1720})">${LOGO_SVG}</g>`;
  const h1 = easeOut(prog(t, 0.5, 1.1)), h2 = easeOut(prog(t, 0.9, 1.5)), h3 = easeOut(prog(t, 1.3, 1.9));
  s += `<text x="${W / 2}" y="${370 + 30 * (1 - h1)}" opacity="${h1}" text-anchor="middle" font-family="Newsreader" font-weight="700" font-size="96" fill="${CREAM}">Bulmaca çöz,</text>
    <text x="${W / 2}" y="${472 + 30 * (1 - h2)}" opacity="${h2}" text-anchor="middle" font-family="Newsreader" font-style="italic" font-weight="500" font-size="100" fill="${TEAL}">İngilizce öğren.</text>
    <text x="${W / 2}" y="${538 + 20 * (1 - h3)}" opacity="${h3}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="500" font-size="32" fill="${CREAM}" fill-opacity="0.85">Türkçe ipucu · İngilizce cevap</text>`;

  // telefon: alttan kayarak gelir
  const pw = 470, k = pw / SW, ph = SH * k;
  const px = (W - pw) / 2;
  const ph1 = easeOut(prog(t, 1.5, 2.5));
  const py = lerp(H + 60, 610, ph1);
  const rot = lerp(-10, -3, ph1);
  s += `<g transform="rotate(${rot} ${px + pw / 2} ${py + ph / 2})">
      <rect x="${px - 14}" y="${py + 10}" width="${pw + 28}" height="${ph + 28}" rx="66" fill="#000" fill-opacity="0.3" transform="translate(16 22)"/>
      <rect x="${px - 14}" y="${py - 14}" width="${pw + 28}" height="${ph + 28}" rx="66" fill="${NAVY_DEEP}" stroke="#46658A" stroke-width="3"/>
      <g transform="translate(${px} ${py}) scale(${k})" clip-path="url(#scr)">
        <image href="${shot}" x="0" y="0" width="${SW}" height="${SH}"/>
        ${screenOverlay(t)}
      </g>
    </g>`;

  // "TREE = ağaç" çipi
  const chipIn = easeBack(prog(t, 5.0, 5.35)), chipOut = prog(t, 6.2, 6.5);
  if (chipIn > 0 && chipOut < 1) {
    const cy = 610 + (ROWY[WORD_ROW] - 70) * k;
    s += `<g opacity="${1 - chipOut}" transform="translate(${W - 330} ${cy}) scale(${chipIn})">
        <rect x="0" y="0" width="290" height="96" rx="48" fill="${CREAM}"/>
        <circle cx="48" cy="48" r="30" fill="${NAVY}"/>
        <g transform="translate(32 32) scale(${32 / 24})">${ICON.sound(TEAL)}</g>
        <text x="94" y="47" font-family="Hanken Grotesk" font-weight="700" font-size="34" fill="${INK}">TREE</text>
        <text x="94" y="77" font-family="Hanken Grotesk" font-weight="500" font-size="23" fill="#5F6672">ağaç · doğru!</text>
      </g>`;
  }

  // özellik kartları sırayla
  const cards = [
    [6.5, 50, 760, 'grid', 'Sınırsız bulmaca', 'Her seferinde yepyeni ızgara'],
    [7.4, 560, 980, 'swap', 'Türkçe ipucu', 'İngilizce cevap, kelime öğren'],
    [8.3, 50, 1200, 'steps', '5.500+ kelime', 'A1 → C2, seviyene göre'],
    [9.2, 560, 1420, 'sound', 'Sesli telaffuz', 'Kelime kartı ve örnek cümle'],
  ];
  for (const [a, x, y, ic, hd, bd] of cards) {
    const p = easeOut(prog(t, a, a + 0.5));
    if (p <= 0) continue;
    const dx = (x < W / 2 ? -1 : 1) * 260 * (1 - p);
    s += `<g opacity="${p}" transform="translate(${dx} 0)">${card(x, y, 470, ic, hd, bd)}</g>`;
  }

  // App Store çağrısı (nabız)
  const c = easeOut(prog(t, 10.6, 11.2));
  if (c > 0) {
    const pulse = 1 + 0.035 * Math.max(0, Math.sin((t - 11.2) * 5)) * (t > 11.2 ? 1 : 0);
    const bw = 600, bx = (W - bw) / 2, by = 1660 + 60 * (1 - c);
    s += `<g opacity="${c}" transform="translate(${W / 2} ${by + 48}) scale(${pulse}) translate(${-W / 2} ${-(by + 48)})">
        <rect x="${bx}" y="${by + 6}" width="${bw}" height="96" rx="48" fill="#000" fill-opacity="0.25"/>
        <rect x="${bx}" y="${by}" width="${bw}" height="96" rx="48" fill="${ORANGE}"/>
        <text x="${W / 2}" y="${by + 61}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="38" fill="#FFFFFF">App Store'da ücretsiz</text>
      </g>
      <text x="${W / 2}" y="1840" opacity="${easeOut(prog(t, 11.3, 11.9))}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="500" font-size="28" fill="${CREAM}" fill-opacity="0.75">9 bulmaca oyunu · reklamsız · her gün yeni bulmaca</text>`;
  }
  return s + '</svg>';
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qvid-'));
const N = FPS * DUR;
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  fs.writeFileSync(path.join(dir, `f${String(i).padStart(4, '0')}.png`), render(frame(i / FPS)));
  if (i % 60 === 0) console.log(`kare ${i}/${N} (${((Date.now() - t0) / 1000).toFixed(0)} sn)`);
}
// tek kare önizlemeleri (kontrol için)
if (process.argv.includes('--stills')) for (const s of [1, 2.6, 4.2, 5.6, 9.8, 13]) fs.copyFileSync(path.join(dir, `f${String(Math.round(s * FPS)).padStart(4, '0')}.png`), path.join(ROOT, 'store', 'ads', `_video-still-${s}.png`));
execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', OUT]);
fs.rmSync(dir, { recursive: true, force: true });
console.log(path.relative(ROOT, OUT), (fs.statSync(OUT).size / 1e6).toFixed(1), 'MB');
