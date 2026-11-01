// Reklam videoları için ortak araçlar: yazı tipleri, marka renkleri, logo, zamanlama, kare çizimi ve MP4.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const W = 1080, H = 1920, FPS = 30;

const FONTS = [
  'newsreader/700Bold/Newsreader_700Bold.ttf',
  'newsreader/600SemiBold/Newsreader_600SemiBold.ttf',
  'newsreader/500Medium_Italic/Newsreader_500Medium_Italic.ttf',
  'hanken-grotesk/500Medium/HankenGrotesk_500Medium.ttf',
  'hanken-grotesk/700Bold/HankenGrotesk_700Bold.ttf',
  'libre-franklin/600SemiBold/LibreFranklin_600SemiBold.ttf',
  'archivo-narrow/500Medium/ArchivoNarrow_500Medium.ttf',
  'archivo-narrow/700Bold/ArchivoNarrow_700Bold.ttf',
  'space-grotesk/700Bold/SpaceGrotesk_700Bold.ttf',
].map((f) => path.join(ROOT, 'node_modules/@expo-google-fonts', f));
export const render = (svg) => new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Hanken Grotesk' } }).render().asPng();
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Marka ve uygulama renkleri
export const C = {
  NAVY: '#18324D', NAVY_HI: '#2A5079', NAVY_DEEP: '#0F2238', CREAM: '#F4EFE2', TEAL: '#19B5C2', ORANGE: '#F37216', INK: '#141B26',
  CLUE: '#E9E4DE', HL: '#D7E5F3', SEL: '#8CB8E6', OK: '#B9DFAA', LINE: '#CFCAC0', SOFT: '#5F6672',
};
export const LOGO_SVG = fs.readFileSync(path.join(ROOT, 'assets/brand/qorvex-logo.svg'), 'utf8').replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<rect width="1720" height="560" fill="[^"]+"\/>/, '');
export const logo = (x, y, w, opacity = 1) => `<g opacity="${opacity}" transform="translate(${x} ${y}) scale(${w / 1720})">${LOGO_SVG}</g>`;

// zaman
export const clamp = (x) => Math.max(0, Math.min(1, x));
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const easeOut = (x) => 1 - Math.pow(1 - x, 3);
export const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeBack = (x) => { const c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
export const lerp = (a, b, x) => a + (b - a) * x;
// bir aralıkta görünür: giriş ve çıkış süreleriyle 0..1 opaklık
export const life = (t, a, b, fin = 0.35, fout = 0.35) => Math.min(easeOut(prog(t, a, a + fin)), 1 - prog(t, b - fout, b));

// lacivert marka zemini (ızgara desenli)
let GRID = '';
for (let y = 0; y < H; y += 60) for (let x = 0; x < W; x += 60) GRID += `<rect x="${x + 2}" y="${y + 2}" width="56" height="56" rx="4" fill="none" stroke="#FFFFFF" stroke-opacity="0.035" stroke-width="1.5"/>`;
export const brandDefs = `<radialGradient id="glow" cx="30%" cy="22%" r="85%"><stop offset="0" stop-color="${C.NAVY_HI}"/><stop offset="0.6" stop-color="${C.NAVY}"/><stop offset="1" stop-color="${C.NAVY_DEEP}"/></radialGradient>
  <radialGradient id="tealGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${C.TEAL}" stop-opacity="0.35"/><stop offset="1" stop-color="${C.TEAL}" stop-opacity="0"/></radialGradient>`;
export const brandBg = (t) => `<rect width="${W}" height="${H}" fill="url(#glow)"/>${GRID}<circle cx="${W / 2}" cy="1050" r="${520 + 30 * Math.sin(t * 1.4)}" fill="url(#tealGlow)"/>`;

// App Store çağrısı + alt yazı (nabız atar)
export function cta(t, a, y = 1660, label = "App Store'da ücretsiz", foot = '9 bulmaca oyunu · reklamsız · her gün yeni bulmaca') {
  const c = easeOut(prog(t, a, a + 0.6));
  if (c <= 0) return '';
  const pulse = 1 + 0.035 * Math.max(0, Math.sin((t - a - 0.6) * 5)) * (t > a + 0.6 ? 1 : 0);
  const bw = 600, bx = (W - bw) / 2, by = y + 60 * (1 - c);
  return `<g opacity="${c}" transform="translate(${W / 2} ${by + 48}) scale(${pulse}) translate(${-W / 2} ${-(by + 48)})">
      <rect x="${bx}" y="${by + 6}" width="${bw}" height="96" rx="48" fill="#000" fill-opacity="0.25"/>
      <rect x="${bx}" y="${by}" width="${bw}" height="96" rx="48" fill="${C.ORANGE}"/>
      <text x="${W / 2}" y="${by + 61}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="38" fill="#FFFFFF">${esc(label)}</text>
    </g>
    <text x="${W / 2}" y="${y + 180}" opacity="${easeOut(prog(t, a + 0.3, a + 0.9))}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="500" font-size="28" fill="${C.CREAM}" fill-opacity="0.75">${esc(foot)}</text>`;
}

// ---------- Ses (sentez, telifsiz) ----------
export const SR = 44100;
export function makeAudio(dur) {
  const buf = new Float32Array(Math.ceil(dur * SR));
  const at = (t) => Math.floor(t * SR);
  const env = (x, a, d) => (x < a ? x / a : Math.exp(-(x - a) / d));
  const a = {
    buf,
    // sinüs tonu (tık, zil)
    tone(t, freq, len = 0.06, vol = 0.3, decay = 0.03) {
      for (let i = 0; i < len * SR; i++) { const k = at(t) + i; if (k >= buf.length) break; const x = i / SR; buf[k] += Math.sin(2 * Math.PI * freq * x) * env(x, 0.002, decay) * vol; }
    },
    // harf yazma tıkı: kısa gürültü
    click(t, vol = 0.18) {
      let s = 12345 + at(t);
      for (let i = 0; i < 0.025 * SR; i++) { const k = at(t) + i; if (k >= buf.length) break; s = (s * 1103515245 + 12345) & 0x7fffffff; buf[k] += ((s / 0x7fffffff) * 2 - 1) * Math.exp(-i / (0.004 * SR)) * vol; }
    },
    // doğru cevap: iki notalı parlak zil
    ding(t, vol = 0.28) { a.tone(t, 1318.5, 0.9, vol, 0.25); a.tone(t + 0.09, 1975.5, 0.9, vol * 0.8, 0.3); a.tone(t, 2637, 0.5, vol * 0.25, 0.12); },
    // geçiş: yükselen gürültü süpürmesi
    whoosh(t, len = 0.35, vol = 0.12) {
      let s = 777, lp = 0;
      for (let i = 0; i < len * SR; i++) { const k = at(t) + i; if (k >= buf.length) break; s = (s * 1103515245 + 12345) & 0x7fffffff; const n = (s / 0x7fffffff) * 2 - 1; const x = i / (len * SR); const c = 0.02 + 0.25 * x; lp += c * (n - lp); buf[k] += lp * Math.sin(Math.PI * x) * vol * 3; }
    },
    // arka plan: yumuşak akorlar + bas (C–G–Am–F), düşük ses
    pad(t0, t1, bpm = 100, vol = 0.05) {
      const chords = [[261.6, 329.6, 392.0], [196.0, 246.9, 293.7], [220.0, 261.6, 329.6], [174.6, 220.0, 261.6]];
      const bar = (60 / bpm) * 4;
      for (let k = at(t0); k < Math.min(buf.length, at(t1)); k++) {
        const t = k / SR, rel = t - t0, ci = Math.floor(rel / bar) % 4, inBar = rel % bar;
        const fade = Math.min(1, rel / 1.5, (t1 - t) / 1.2);
        let v = 0;
        for (const f of chords[ci]) v += Math.sin(2 * Math.PI * f * t) * 0.33 + Math.sin(2 * Math.PI * f * 2 * t) * 0.06;
        v += Math.sin(2 * Math.PI * (chords[ci][0] / 2) * t) * 0.5 * Math.exp(-((inBar % (bar / 2)) / 0.5));
        buf[k] += v * vol * fade;
      }
    },
  };
  return a;
}
function writeWav(file, buf) {
  let peak = 0;
  for (const v of buf) peak = Math.max(peak, Math.abs(v));
  const g = peak > 0.95 ? 0.95 / peak : 1;
  const data = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i] * g)) * 32767), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

// Kareleri çizip MP4'e çevir. frame(t) → svg. audio: makeAudio ile üretilmiş ses (isteğe bağlı).
// --stills a,b,c → store/ads/_still-<ad>-<t>.png
export function makeVideo({ name, dur, frame, audio }) {
  const FFMPEG = require('@ffmpeg-installer/ffmpeg').path;
  const out = path.join(ROOT, 'store', 'ads', `${name}.mp4`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qad-'));
  const N = Math.round(FPS * dur);
  const sArg = process.argv.indexOf('--stills');
  const stills = sArg > 0 ? process.argv[sArg + 1].split(',').map(Number) : [];
  const only = process.argv.includes('--only-stills');
  const t0 = Date.now();
  const frames = only ? stills.map((s) => Math.round(s * FPS)) : Array.from({ length: N }, (_, i) => i);
  for (const i of frames) {
    const png = render(frame(i / FPS));
    fs.writeFileSync(path.join(dir, `f${String(i).padStart(4, '0')}.png`), png);
    if (!only && i % 90 === 0) console.log(`${name}: kare ${i}/${N} (${((Date.now() - t0) / 1000).toFixed(0)} sn)`);
  }
  for (const s of stills) {
    const f = path.join(dir, `f${String(Math.round(s * FPS)).padStart(4, '0')}.png`);
    if (fs.existsSync(f)) fs.copyFileSync(f, path.join(ROOT, 'store', 'ads', `_still-${name}-${s}.png`));
  }
  if (!only) {
    const args = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.png')];
    if (audio) { const wav = path.join(dir, 'audio.wav'); writeWav(wav, audio.buf); args.push('-i', wav, '-c:a', 'aac', '-b:a', '160k', '-shortest'); }
    args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', out);
    execFileSync(FFMPEG, args);
    console.log(path.relative(ROOT, out), (fs.statSync(out).size / 1e6).toFixed(1), 'MB');
  }
  fs.rmSync(dir, { recursive: true, force: true });
}
