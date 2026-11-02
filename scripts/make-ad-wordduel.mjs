// Uygulama içi ödüllü reklam: Word Duel tanıtım videosu (15 sn, 720×1280, sesli).
// Kelime kartı hakkı bitince QORVEX içinde oynatılır → assets/ads/wordduel-ad.mp4
// Kaynak: Desktop/WordDuel/store/screenshots (gerçek uygulama ekranları), Word Duel logosu ve yazı tipi.
// Kullanım: node scripts/make-ad-wordduel.mjs [--stills 1,5,9]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { Resvg } from '@resvg/resvg-js';
import { ROOT, FPS, clamp, prog, easeOut, easeInOut, easeBack, lerp, life, esc, makeAudio, SR } from './ad-kit.mjs';

const require = createRequire(import.meta.url);
const FFMPEG = require('@ffmpeg-installer/ffmpeg').path;
const WD = path.resolve(ROOT, '../WordDuel');
const W = 1080, H = 1920, OUT_W = 720, DUR = 15;

const FONT_DIR = path.join(WD, 'node_modules/@expo-google-fonts/plus-jakarta-sans');
const fontFiles = ['500Medium', '700Bold', '800ExtraBold'].map((w) => path.join(FONT_DIR, w, `PlusJakartaSans_${w}.ttf`));
const render = (svg) => new Resvg(svg, { fitTo: { mode: 'width', value: OUT_W }, font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Plus Jakarta Sans' } }).render().asPng();
const F = 'Plus Jakarta Sans';

// Word Duel renkleri (src/theme.js, src/brand/mark.js)
const G = '#36B985', G_DARK = '#2A9D70', G_SOFT = '#EAF7F1', NAVY = '#202B3C', BG = '#F8FAFC', MUTED = '#758195', BOLT = '#FFC94D';

// Word Duel logosu (src/brand/mark.js ile aynı yollar)
const MARK = {
  a: 'M21 6 H55 A13 13 0 0 1 68 19 V42 A13 13 0 0 1 55 55 H30 L16 67 L18 54 A13 13 0 0 1 8 42 V19 A13 13 0 0 1 21 6 Z',
  b: 'M45 45 H79 A13 13 0 0 1 92 58 V81 A13 13 0 0 1 82 93.5 L84 98 L70 94 H45 A13 13 0 0 1 32 81 V58 A13 13 0 0 1 45 45 Z',
  w: 'M19 20 L26 39 L33 26.5 L40 39 L47 20',
  bolt: 'M66 53 L54.5 71 H63 L59.5 85 L73.5 65 H65 L69 53 Z',
};
const mark = (cx, cy, size, tile = true) => {
  const s = size / 100;
  return `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${s})">
    ${tile ? `<rect width="100" height="100" rx="23" fill="${G}"/>` : ''}
    <g transform="translate(15 15) scale(0.7)">
      <path d="${MARK.a}" fill="#FFFFFF"/>
      <path d="${MARK.w}" fill="none" stroke="${G}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${MARK.b}" fill="${NAVY}" stroke="${G}" stroke-width="5" stroke-linejoin="round"/>
      <path d="${MARK.bolt}" fill="${BOLT}"/>
    </g></g>`;
};

// Ekran görüntüleri: bir kez küçültülüp JPEG olarak SVG'ye gömülür (hız için)
const SHOT_DIR = path.join(WD, 'store/screenshots/6.1-inch-1179x2556');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wdad-'));
const SHOT_W = 1179, SHOT_H = 2556;
const shot = {};
for (const n of ['01', '02', '03', '04']) {
  const out = path.join(tmp, `${n}.jpg`);
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', path.join(SHOT_DIR, `${n}.png`), '-vf', 'scale=600:-1', '-q:v', '3', out]);
  shot[n] = `data:image/jpeg;base64,${fs.readFileSync(out).toString('base64')}`;
}

// Telefon çerçevesi içinde ekran görüntüsü. (cx, top) ve genişlik; ekran oranı korunur.
const PH_W = 600, PH_H = Math.round((PH_W * SHOT_H) / SHOT_W), BEZ = 18;
function phone(cx, top, scale, layers, opacity = 1) {
  const w = PH_W + BEZ * 2, h = PH_H + BEZ * 2;
  return `<g opacity="${opacity}" transform="translate(${cx} ${top}) scale(${scale}) translate(${-w / 2} 0)">
    <rect x="6" y="22" width="${w}" height="${h}" rx="78" fill="#0B1320" fill-opacity="0.18"/>
    <rect width="${w}" height="${h}" rx="78" fill="#111827"/>
    <clipPath id="scr"><rect x="${BEZ}" y="${BEZ}" width="${PH_W}" height="${PH_H}" rx="62"/></clipPath>
    <g clip-path="url(#scr)"><rect x="${BEZ}" y="${BEZ}" width="${PH_W}" height="${PH_H}" fill="#FFF"/>${layers}</g>
  </g>`;
}
const img = (n, opacity = 1) => `<image x="${BEZ}" y="${BEZ}" width="${PH_W}" height="${PH_H}" href="${shot[n]}" opacity="${opacity}" preserveAspectRatio="none"/>`;
// ekran görüntüsü koordinatından (1179 genişlik) telefon içi koordinata
const k = PH_W / SHOT_W;
const sx = (x) => BEZ + x * k, sy = (y) => BEZ + y * k;

const headline = (t, a, b, line1, line2, y = 250) => {
  const o = life(t, a, b, 0.4, 0.3);
  if (o <= 0) return '';
  const dy = 30 * (1 - easeOut(prog(t, a, a + 0.5)));
  return `<g opacity="${o}" transform="translate(0 ${dy})">
    <text x="${W / 2}" y="${y}" text-anchor="middle" font-family="${F}" font-weight="800" font-size="76" fill="${NAVY}">${esc(line1)}</text>
    ${line2 ? `<text x="${W / 2}" y="${y + 70}" text-anchor="middle" font-family="${F}" font-weight="500" font-size="40" fill="${MUTED}">${esc(line2)}</text>` : ''}
  </g>`;
};
const finger = (x, y, press) => `<g transform="translate(${x} ${y}) scale(${1 - 0.12 * press})">
    <circle r="46" fill="#FFFFFF" fill-opacity="0.85" stroke="${NAVY}" stroke-opacity="0.25" stroke-width="3"/>
    <circle r="22" fill="${NAVY}" fill-opacity="0.75"/></g>`;
const ripple = (x, y, p) => (p <= 0 || p >= 1 ? '' : `<circle cx="${x}" cy="${y}" r="${30 + 90 * p}" fill="none" stroke="${G}" stroke-width="${8 * (1 - p)}" opacity="${1 - p}"/>`);

// sahneler: 0–2.6 logo · 2.6–6.4 eşleşme · 6.4–10.6 soru · 10.6–12.9 ana sayfa · 12.9–15 kapanış
function frame(t) {
  let g = `<rect width="${W}" height="${H}" fill="${BG}"/>`;
  // yumuşak yeşil daireler (zemin)
  g += `<circle cx="${180 + 30 * Math.sin(t)}" cy="${1650}" r="260" fill="${G_SOFT}"/><circle cx="${930}" cy="${430 + 20 * Math.cos(t * 0.8)}" r="200" fill="${G_SOFT}"/>`;

  // 1) logo açılışı (yeşil zemin)
  const s1 = 1 - prog(t, 2.3, 2.7);
  if (s1 > 0) {
    const pop = easeBack(prog(t, 0.1, 0.7));
    g += `<g opacity="${s1}"><rect width="${W}" height="${H}" fill="${G}"/>
      <circle cx="${W / 2}" cy="${820}" r="${330 + 20 * Math.sin(t * 3)}" fill="#FFFFFF" fill-opacity="0.08"/>
      <g transform="translate(${W / 2} 820) scale(${pop}) translate(${-W / 2} -820)">${mark(W / 2, 820, 300)}
        <rect x="${W / 2 - 150}" y="${670}" width="300" height="300" rx="69" fill="none" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="6"/></g>
      <text x="${W / 2}" y="1120" opacity="${easeOut(prog(t, 0.6, 1.0))}" text-anchor="middle" font-family="${F}" font-weight="800" font-size="104" fill="#FFFFFF">Word Duel</text>
      <text x="${W / 2}" y="1200" opacity="${easeOut(prog(t, 0.9, 1.3))}" text-anchor="middle" font-family="${F}" font-weight="700" font-size="46" fill="#FFFFFF" fill-opacity="0.9">İngilizce kelime düellosu</text>
      <text x="${W / 2}" y="1290" opacity="${easeOut(prog(t, 1.2, 1.6))}" text-anchor="middle" font-family="${F}" font-weight="500" font-size="36" fill="#FFFFFF" fill-opacity="0.75">Bilen kazanır.</text>
    </g>`;
  }

  // 2) eşleşme: rakip aranıyor → rakibin hazır
  const p2 = life(t, 2.5, 6.6, 0.5, 0.4);
  if (p2 > 0) {
    const rise = 120 * (1 - easeOut(prog(t, 2.5, 3.2)));
    const swap = easeInOut(prog(t, 4.2, 4.6));
    g += headline(t, 2.7, 6.5, 'Rakibini bul', 'Online ya da bota karşı');
    g += phone(W / 2, 430 + rise, 1.0, img('02') + img('03', swap), p2);
  }

  // 3) soru: "gentle" → C "nazik" doğru
  const p3 = life(t, 6.3, 10.8, 0.5, 0.4);
  if (p3 > 0) {
    const rise = 120 * (1 - easeOut(prog(t, 6.3, 7.0)));
    const tap = 8.4;
    const ok = easeOut(prog(t, tap + 0.05, tap + 0.3));
    // C seçeneği (ekran görüntüsünde ~ x 58–1124, y 2010–2195)
    const opt = ok > 0 ? `<rect x="${sx(58)}" y="${sy(2010)}" width="${(1124 - 58) * k}" height="${(2195 - 2010) * k}" rx="${30 * k}" fill="${G}" fill-opacity="${0.28 * ok}" stroke="${G}" stroke-width="${8 * ok}"/>
      <g opacity="${ok}" transform="translate(${sx(1040)} ${sy(2102)})"><circle r="${44 * k}" fill="${G}"/><path d="M${-18 * k} 0 L${-5 * k} ${14 * k} L${20 * k} ${-14 * k}" fill="none" stroke="#FFF" stroke-width="${9 * k}" stroke-linecap="round" stroke-linejoin="round"/></g>` : '';
    g += headline(t, 6.5, 10.7, '10 saniyen var', 'En hızlı doğru cevap kazanır');
    const top = 430 + rise;
    g += phone(W / 2, top, 1.0, img('04') + opt, p3);
    // parmak: sağ alttan seçeneğe gelir, dokunur
    const fx = W / 2 - PH_W / 2 - BEZ + sx(800), fy = top + sy(2102);
    const m = easeInOut(prog(t, 7.4, tap));
    const press = prog(t, tap - 0.08, tap) - prog(t, tap + 0.15, tap + 0.3);
    if (t > 7.3 && t < 10.4) g += ripple(fx, fy, prog(t, tap, tap + 0.6)) + finger(lerp(W + 120, fx, m), lerp(1900, fy, m), clamp(press));
    // skor rozeti
    const sc = easeBack(prog(t, tap + 0.3, tap + 0.8));
    if (sc > 0) g += `<g transform="translate(${W / 2 + 200} ${top + sy(880)}) scale(${sc})"><rect x="-110" y="-46" width="220" height="92" rx="46" fill="${G}"/>
      <text y="16" text-anchor="middle" font-family="${F}" font-weight="800" font-size="46" fill="#FFF">+120</text></g>`;
  }

  // 4) ana sayfa: online düello, lig
  const p4 = life(t, 10.6, 13.1, 0.5, 0.35);
  if (p4 > 0) {
    const rise = 120 * (1 - easeOut(prog(t, 10.6, 11.3)));
    g += headline(t, 10.8, 13.0, 'Ligde yüksel', 'Günlük görev · seri · rozetler');
    g += phone(W / 2, 430 + rise, 1.0, img('01'), p4);
  }

  // 5) kapanış
  const p5 = easeOut(prog(t, 12.9, 13.4));
  if (p5 > 0) {
    const pulse = 1 + 0.035 * Math.max(0, Math.sin((t - 13.6) * 5)) * (t > 13.6 ? 1 : 0);
    g += `<g opacity="${p5}"><rect width="${W}" height="${H}" fill="${G}"/>
      <circle cx="${W / 2}" cy="700" r="${300 + 20 * Math.sin(t * 3)}" fill="#FFFFFF" fill-opacity="0.08"/>
      <g transform="translate(${W / 2} 700) scale(${easeBack(prog(t, 12.95, 13.5))}) translate(${-W / 2} -700)">${mark(W / 2, 700, 260)}</g>
      <text x="${W / 2}" y="960" text-anchor="middle" font-family="${F}" font-weight="800" font-size="96" fill="#FFFFFF">Word Duel</text>
      <text x="${W / 2}" y="1040" text-anchor="middle" font-family="${F}" font-weight="600" font-size="40" fill="#FFFFFF" fill-opacity="0.9">Kelimelerle düello et, ligde yüksel</text>
      <g transform="translate(${W / 2} 1250) scale(${pulse}) translate(${-W / 2} -1250)" opacity="${easeOut(prog(t, 13.3, 13.8))}">
        <rect x="${W / 2 - 300}" y="1196" width="600" height="108" rx="54" fill="#FFFFFF"/>
        <text x="${W / 2}" y="1265" text-anchor="middle" font-family="${F}" font-weight="800" font-size="42" fill="${G_DARK}">App Store'da ücretsiz</text></g>
      <text x="${W / 2}" y="1400" opacity="${easeOut(prog(t, 13.6, 14.1))}" text-anchor="middle" font-family="${F}" font-weight="500" font-size="32" fill="#FFFFFF" fill-opacity="0.8">Online düello · Haftalık lig · 6.800+ kelime</text>
    </g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}

// ses: yumuşak altyapı + geçişler + dokunma ve doğru cevap zili
function audio() {
  const a = makeAudio(DUR);
  a.pad(0, DUR, 104, 0.045);
  a.tone(0.15, 659.3, 0.5, 0.22, 0.15); a.tone(0.3, 987.8, 0.6, 0.18, 0.2);
  for (const w of [2.5, 6.3, 10.6, 12.9]) a.whoosh(w, 0.4, 0.1);
  a.tone(4.25, 880, 0.25, 0.16, 0.08);
  for (let i = 0; i < 3; i++) a.tone(6.9 + i * 0.45, 1500, 0.05, 0.08, 0.015); // saat tık tık
  a.click(8.4, 0.25); a.ding(8.45, 0.26);
  a.ding(13.05, 0.2);
  return a;
}

// kareler → MP4 (720×1280, uygulama içinde küçük boyut için crf 27)
const out = path.join(ROOT, 'assets/ads/wordduel-ad.mp4');
fs.mkdirSync(path.dirname(out), { recursive: true });
const stillsArg = process.argv.indexOf('--stills');
if (stillsArg > 0) {
  for (const s of process.argv[stillsArg + 1].split(',').map(Number)) fs.writeFileSync(path.join(ROOT, 'store/ads', `_still-wordduel-${s}.png`), render(frame(s)));
  console.log('kareler store/ads/_still-wordduel-*.png');
  process.exit(0);
}
const N = Math.round(FPS * DUR);
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  fs.writeFileSync(path.join(tmp, `f${String(i).padStart(4, '0')}.png`), render(frame(i / FPS)));
  if (i % 90 === 0) console.log(`kare ${i}/${N} (${((Date.now() - t0) / 1000).toFixed(0)} sn)`);
}
// WAV
const a = audio();
let peak = 0;
for (const v of a.buf) peak = Math.max(peak, Math.abs(v));
const gain = peak > 0.95 ? 0.95 / peak : 1;
const data = Buffer.alloc(a.buf.length * 2);
for (let i = 0; i < a.buf.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, a.buf[i] * gain)) * 32767), i * 2);
const hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write('WAVE', 8); hdr.write('fmt ', 12);
hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22); hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
hdr.write('data', 36); hdr.writeUInt32LE(data.length, 40);
fs.writeFileSync(path.join(tmp, 'a.wav'), Buffer.concat([hdr, data]));
execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.png'), '-i', path.join(tmp, 'a.wav'),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '27', '-preset', 'slow', '-c:a', 'aac', '-b:a', '96k', '-shortest', '-movflags', '+faststart', out]);
console.log(path.relative(ROOT, out), (fs.statSync(out).size / 1e6).toFixed(2), 'MB');
fs.rmSync(tmp, { recursive: true, force: true });
