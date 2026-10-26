// Instagram reklam serisi (1080x1350): her gönderi farklı bir özelliği anlatır.
// Bulmaca ve kelime kartı ekranları uygulamanın kendi üreticisiyle üretilip uygulama stilinde çizilir;
// diğerleri gerçek ekran görüntüsü kullanır. Kullanım: node scripts/make-ads.mjs → store/ads/qorvex-ad-0X.png
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'store', 'ads');
fs.mkdirSync(OUT_DIR, { recursive: true });

const FONTS = [
  'newsreader/700Bold/Newsreader_700Bold.ttf',
  'newsreader/500Medium_Italic/Newsreader_500Medium_Italic.ttf',
  'newsreader/600SemiBold/Newsreader_600SemiBold.ttf',
  'hanken-grotesk/400Regular/HankenGrotesk_400Regular.ttf',
  'hanken-grotesk/500Medium/HankenGrotesk_500Medium.ttf',
  'hanken-grotesk/700Bold/HankenGrotesk_700Bold.ttf',
  'space-grotesk/700Bold/SpaceGrotesk_700Bold.ttf',
  'libre-franklin/700Bold/LibreFranklin_700Bold.ttf',
  'libre-franklin/900Black/LibreFranklin_900Black.ttf',
  'archivo-narrow/500Medium/ArchivoNarrow_500Medium.ttf',
  'archivo-narrow/700Bold/ArchivoNarrow_700Bold.ttf',
].map((f) => path.join(ROOT, 'node_modules/@expo-google-fonts', f));
// okunuş (IPA) harfleri için: ɪ ə ʊ ˈ gibi işaretleri içeren sistem fontu (varsa)
if (fs.existsSync('C:/Windows/Fonts/segoeui.ttf')) FONTS.push('C:/Windows/Fonts/segoeui.ttf');
const render = (svg, width) => new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Hanken Grotesk' } }).render().asPng();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const b64 = (buf, mime) => `data:${mime};base64,${buf.toString('base64')}`;

// Marka
const NAVY = '#18324D', NAVY_HI = '#26496E', NAVY_DEEP = '#0F2238';
const CREAM = '#F4EFE2', TEAL = '#19B5C2', TEAL_D = '#0B7C99', ORANGE = '#F37216', INK = '#141B26';
// Uygulama içi renkler (theme.js)
const APP = { bg: '#FAF8F5', surface: '#FFFFFF', surfaceAlt: '#F2EFEA', surfaceDim: '#ECE9E3', border: '#E8E4DD', text: '#141B26', soft: '#5F6672', mute: '#9AA0A8',
  clue: '#E9E5DD', clueActive: '#C6DCEC', dead: '#F1EEE9', hatch: '#D5CFC5', line: '#CFCAC0', hl: '#D7E5F3', sel: '#8CB8E6', ok: '#B9DFAA', frame: '#A9A296', accentSoft: '#DDF3F9', accentInk: '#08657D' };
const LOGO_SVG = fs.readFileSync(path.join(ROOT, 'assets/brand/qorvex-logo.svg'), 'utf8').replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<rect width="1720" height="560" fill="[^"]+"\/>/, '');
const W = 1080, H = 1350;

// ---------- Ortak reklam düzeni ----------
function adLayout({ title1, title2, sub, phoneImg, feats, cta = "App Store'da ücretsiz", extra = '', phoneTop = 545 }) {
  let grid = '';
  for (let y = 0; y < H; y += 54) for (let x = 0; x < W; x += 54) grid += `<rect x="${x + 1}" y="${y + 1}" width="52" height="52" rx="3" fill="none" stroke="#FFFFFF" stroke-opacity="0.035" stroke-width="1.5"/>`;
  const pw = 410, ph = Math.round(pw * (1600 / 738)), px = 608, py = phoneTop;
  const phone = `<g transform="rotate(6 ${px + pw / 2} ${py + ph / 2})">
    <rect x="${px - 16}" y="${py - 16}" width="${pw + 32}" height="${ph + 32}" rx="58" fill="${NAVY_DEEP}" stroke="#3A5677" stroke-width="3"/>
    <clipPath id="scr"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="44"/></clipPath>
    <image href="${phoneImg}" x="${px}" y="${py}" width="${pw}" height="${ph}" clip-path="url(#scr)" preserveAspectRatio="xMidYMid slice"/></g>`;
  let left = '';
  feats.forEach(([big, small], i) => {
    const y = phoneTop + 175 + i * 128;
    left += `<text x="80" y="${y}" font-family="Newsreader" font-weight="700" font-size="${big.length > 3 ? 54 : 62}" fill="${CREAM}">${esc(big)}</text>
      <text x="80" y="${y + 38}" font-family="Hanken Grotesk" font-weight="500" font-size="28" fill="${CREAM}" fill-opacity="0.82">${esc(small)}</text>`;
  });
  left += `<rect x="80" y="1190" width="440" height="96" rx="48" fill="${ORANGE}"/>
    <text x="300" y="1250" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="36" fill="#FFFFFF">${esc(cta)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs><radialGradient id="glow" cx="50%" cy="28%" r="75%"><stop offset="0" stop-color="${NAVY_HI}"/><stop offset="1" stop-color="${NAVY}"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>${grid}
    <g transform="translate(${(W - 380) / 2} 44) scale(${380 / 1720})">${LOGO_SVG}</g>
    <text x="${W / 2}" y="300" text-anchor="middle" font-family="Newsreader" font-weight="700" font-size="84" fill="${CREAM}">${esc(title1)}</text>
    <text x="${W / 2}" y="396" text-anchor="middle" font-family="Newsreader" font-style="italic" font-weight="500" font-size="90" fill="${TEAL}">${esc(title2)}</text>
    <text x="${W / 2}" y="462" text-anchor="middle" font-family="Hanken Grotesk" font-weight="500" font-size="31" fill="${CREAM}" fill-opacity="0.85">${esc(sub)}</text>
    ${extra}${phone}${left}</svg>`;
}

// ---------- Uygulama ekranı parçaları (738x1600, telefon ekranı) ----------
const SW = 738, SH = 1600;
// ampul ikonu (yazı tipinde emoji yok): (x,y) sol üst, s boyut
const bulb = (x, y, s, color) => `<g transform="translate(${x} ${y}) scale(${s / 24})"><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round"/><path d="M9 20h6M10 23h4" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/></g>`;
const statusBar = `<text x="64" y="62" font-family="Hanken Grotesk" font-weight="700" font-size="30" fill="${APP.text}">9:41</text>
  <g transform="translate(560 40)" fill="${APP.text}"><rect x="0" y="12" width="6" height="10" rx="1"/><rect x="9" y="8" width="6" height="14" rx="1"/><rect x="18" y="4" width="6" height="18" rx="1"/><rect x="27" y="0" width="6" height="22" rx="1"/>
  <rect x="78" y="1" width="44" height="22" rx="6" fill="none" stroke="${APP.text}" stroke-width="2.5"/><rect x="82" y="5" width="32" height="14" rx="3"/></g>`;
function wrap(text, max) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= max) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
function clueText(x, y, w, h, text, size, active) {
  const max = Math.max(5, Math.floor(w / (size * 0.52)));
  let lines = wrap(text, max).slice(0, Math.max(1, Math.floor(h / (size * 1.15))));
  const lh = size * 1.12;
  const y0 = y + h / 2 - ((lines.length - 1) * lh) / 2 + size * 0.35;
  return lines.map((l, i) => `<text x="${x + w / 2}" y="${y0 + i * lh}" text-anchor="middle" font-family="Archivo Narrow" font-weight="${active ? 700 : 500}" font-size="${size}" fill="${APP.text}">${esc(l)}</text>`).join('');
}

// Çengel bulmaca ekranı: gerçek üretilmiş bulmaca; birkaç kelime doğru (yeşil), biri yazılıyor (mavi)
function puzzleScreen(p, { title, subtitle, activeIdx, solvedIdx, typed, exampleTr }) {
  const pad = 22, cs = Math.floor((SW - pad * 2) / p.w), gx = (SW - cs * p.w) / 2, gy = 236;
  let g = '';
  // kelime hücreleri
  const cellsOf = (k) => Array.from({ length: k.answer.length }, (_, j) => (k.dir === 'A' ? [k.sr, k.sc + j] : [k.sr + j, k.sc]));
  const solved = new Map(), active = new Set();
  for (const i of solvedIdx) for (const [r, c] of cellsOf(p.clues[i])) solved.set(`${r},${c}`, p.rows[r][c]);
  const act = p.clues[activeIdx];
  const actCells = cellsOf(act);
  actCells.forEach(([r, c]) => active.add(`${r},${c}`));
  const typedMap = new Map(actCells.slice(0, typed).map(([r, c]) => [`${r},${c}`, p.rows[r][c]]));
  const selCell = actCells[Math.min(typed, actCells.length - 1)];
  const byCell = {};
  for (const k of p.clues) (byCell[`${k.r},${k.c}`] = byCell[`${k.r},${k.c}`] || [])[k.slot] = k;
  for (let r = 0; r < p.h; r++)
    for (let c = 0; c < p.w; c++) {
      const x = gx + c * cs, y = gy + r * cs, ch = p.rows[r][c], key = `${r},${c}`;
      if (ch === '#') {
        const ks = (byCell[key] || []).filter(Boolean);
        const two = ks.length === 2;
        ks.forEach((k, i) => {
          const sy = two ? y + (i * cs) / 2 : y, sh = two ? cs / 2 : cs;
          const isAct = k === act;
          g += `<rect x="${x}" y="${sy}" width="${cs}" height="${sh}" fill="${isAct ? APP.clueActive : APP.clue}"/>`;
          g += clueText(x + 2, sy, cs - 4, sh, k.text, two ? 12.5 : 14, isAct);
          if (two && i === 0) g += `<line x1="${x}" y1="${y + cs / 2}" x2="${x + cs}" y2="${y + cs / 2}" stroke="${APP.line}" stroke-width="1.5"/>`;
        });
        if (!ks.length) g += `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" fill="${APP.clue}"/>`;
      } else if (ch === '.') {
        g += `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" fill="${APP.dead}"/>`;
        for (let k = 14; k < cs * 2; k += 14) {
          const a = k <= cs ? [x, y + k] : [x + k - cs, y + cs], b = k <= cs ? [x + k, y] : [x + cs, y + k - cs];
          g += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${APP.hatch}" stroke-width="1.2"/>`;
        }
      } else {
        const isSel = selCell[0] === r && selCell[1] === c;
        const bg = isSel ? APP.sel : active.has(key) ? APP.hl : solved.has(key) ? APP.ok : '#FFFFFF';
        g += `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" fill="${bg}"/>`;
        const letter = typedMap.get(key) || solved.get(key);
        if (letter) g += `<text x="${x + cs / 2}" y="${y + cs * 0.7}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="${cs * 0.56}" fill="${APP.text}">${letter}</text>`;
      }
    }
  // ızgara çizgileri + oklar
  for (let i = 1; i < p.w; i++) g += `<line x1="${gx + i * cs}" y1="${gy}" x2="${gx + i * cs}" y2="${gy + p.h * cs}" stroke="${APP.line}" stroke-width="1.5"/>`;
  for (let i = 1; i < p.h; i++) g += `<line x1="${gx}" y1="${gy + i * cs}" x2="${gx + p.w * cs}" y2="${gy + i * cs}" stroke="${APP.line}" stroke-width="1.5"/>`;
  const a = cs * 0.1;
  for (const k of p.clues) {
    const slotY = k.of === 1 ? cs / 2 : k.slot === 0 ? cs / 4 : (cs * 3) / 4;
    if (k.arrow === 'R' || k.arrow === 'RD') {
      const x = gx + (k.c + 1) * cs, y = gy + k.r * cs + slotY;
      g += `<polygon points="${x},${y - a} ${x},${y + a} ${x + a * 1.4},${y}" fill="${APP.text}"/>`;
    } else {
      const x = gx + k.c * cs + cs / 2, y = gy + (k.r + 1) * cs;
      g += `<polygon points="${x - a},${y} ${x + a},${y} ${x},${y + a * 1.4}" fill="${APP.text}"/>`;
    }
  }
  g += `<rect x="${gx}" y="${gy}" width="${cs * p.w}" height="${cs * p.h}" fill="none" stroke="${APP.frame}" stroke-width="3" rx="5"/>`;
  const gb = gy + p.h * cs;
  // başlık
  const head = `<rect x="22" y="118" width="120" height="58" rx="29" fill="${APP.surfaceAlt}"/>
    <text x="82" y="156" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="26" fill="${APP.text}">2:14</text>
    <text x="${SW / 2}" y="150" text-anchor="middle" font-family="Newsreader" font-style="italic" font-weight="500" font-size="38" fill="${APP.text}">${esc(title)}</text>
    <text x="${SW / 2}" y="186" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="18" letter-spacing="2" fill="${APP.soft}">${esc(subtitle)}</text>
    <rect x="586" y="118" width="130" height="58" rx="29" fill="${NAVY}"/>
    ${bulb(612, 131, 30, '#FFFFFF')}<text x="676" y="157" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="24" fill="#FFFFFF">5/5</text>`;
  // ipucu çubuğu
  const by = gb + 30;
  const bar = `<rect x="18" y="${by}" width="${SW - 36}" height="150" rx="22" fill="${APP.surface}" stroke="${APP.border}" stroke-width="2"/>
    <text x="70" y="${by + 40}" font-family="Space Grotesk" font-weight="700" font-size="19" letter-spacing="2" fill="${TEAL_D}">${act.dir === 'A' ? 'ACROSS · YATAY' : 'DOWN · DİKEY'} (${act.answer.length})</text>
    <text x="70" y="${by + 86}" font-family="Newsreader" font-weight="700" font-size="40" fill="${APP.text}">${esc(act.text)}</text>
    <rect x="${70 + act.text.length * 19 + 14}" y="${by + 56}" width="248" height="40" rx="20" fill="${APP.accentSoft}"/>
    ${bulb(70 + act.text.length * 19 + 28, by + 63, 24, APP.accentInk)}<text x="${70 + act.text.length * 19 + 150}" y="${by + 83}" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="19" fill="${APP.accentInk}">Kelime kartını gör</text>
    <text x="70" y="${by + 126}" font-family="Newsreader" font-style="italic" font-weight="500" font-size="25" fill="${APP.soft}">“${esc(exampleTr.length > 46 ? exampleTr.slice(0, 44) + '…' : exampleTr)}”</text>
    <text x="40" y="${by + 88}" font-family="Hanken Grotesk" font-size="40" fill="${APP.soft}">‹</text>
    <text x="${SW - 50}" y="${by + 88}" font-family="Hanken Grotesk" font-size="40" fill="${APP.soft}">›</text>`;
  // klavye
  const ky = by + 172;
  let kb = `<rect x="0" y="${ky}" width="${SW}" height="${SH - ky}" fill="${APP.surfaceDim}"/>`;
  const rowsK = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  rowsK.forEach((row, ri) => {
    const kw = 64, gap = 8, tot = row.length * kw + (row.length - 1) * gap, x0 = (SW - tot) / 2 - (ri === 2 ? 40 : 0);
    row.split('').forEach((ch, i) => {
      const x = x0 + i * (kw + gap), y = ky + 18 + ri * 92;
      kb += `<rect x="${x}" y="${y}" width="${kw}" height="80" rx="12" fill="#FFFFFF"/><text x="${x + kw / 2}" y="${y + 52}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="32" fill="${APP.text}">${ch}</text>`;
    });
    if (ri === 2) kb += `<rect x="${x0 + row.length * (kw + gap)}" y="${ky + 18 + 184}" width="120" height="80" rx="12" fill="#F6DCD8"/><text x="${x0 + row.length * (kw + gap) + 60}" y="${ky + 18 + 236}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="30" fill="${APP.text}"></text><path d="M${x0 + row.length * (kw + gap) + 40} ${ky + 18 + 224}l12-16h30v32h-30z" fill="none" stroke="${APP.text}" stroke-width="3" stroke-linejoin="round"/><path d="M${x0 + row.length * (kw + gap) + 62} ${ky + 18 + 216}l12 16M${x0 + row.length * (kw + gap) + 74} ${ky + 18 + 216}l-12 16" stroke="${APP.text}" stroke-width="3" stroke-linecap="round"/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}"><rect width="${SW}" height="${SH}" fill="${APP.bg}"/>${statusBar}${head}${g}${bar}${kb}</svg>`;
}

// Kelime kartı ekranı (alttan açılan sayfa)
function wordCardScreen(w, bgImg) {
  const cap = w.a[0] + w.a.slice(1).toLowerCase();
  const ex = w.ex[0];
  const tr = w.m.slice(0, 3).join(', ');
  const exLines = wrap(ex[0], 34), exTrLines = wrap(ex[1], 38);
  let s = `<rect width="${SW}" height="${SH}" fill="${APP.bg}"/>${bgImg ? `<image href="${bgImg}" x="0" y="0" width="${SW}" height="${SH}"/>` : statusBar}
    <rect width="${SW}" height="${SH}" fill="#141B26" fill-opacity="0.45"/>
    <rect x="0" y="360" width="${SW}" height="${SH - 360}" rx="44" fill="${APP.surface}"/>
    <rect x="${SW / 2 - 40}" y="380" width="80" height="10" rx="5" fill="${APP.surfaceDim}"/>
    <text x="56" y="460" font-family="Space Grotesk" font-weight="700" font-size="20" letter-spacing="3" fill="${TEAL_D}">KELİME KARTI</text>
    <text x="56" y="548" font-family="Newsreader" font-weight="700" font-size="84" fill="${APP.text}">${esc(cap)}</text>
    <circle cx="640" cy="520" r="46" fill="${APP.surfaceAlt}"/>
    <path d="M618 506h14l18-15v58l-18-15h-14z" fill="${NAVY}"/><path d="M660 506c6 6 6 22 0 28M668 498c11 11 11 33 0 44" stroke="${NAVY}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <text x="56" y="604" font-family="Segoe UI, Hanken Grotesk" font-size="30" fill="${APP.accentInk}">/${esc(w.ipa || '')}/ · ABD okunuşu</text>
    <rect x="56" y="636" width="150" height="46" rx="23" fill="${APP.surfaceAlt}"/><text x="131" y="667" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="20" fill="${APP.soft}">isim</text>
    <rect x="220" y="636" width="96" height="46" rx="23" fill="${APP.accentSoft}"/><text x="268" y="667" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="20" fill="${APP.accentInk}">${['A1', 'A2', 'B1', 'B2', 'C1', 'C2'][w.l]}</text>
    <rect x="56" y="716" width="${SW - 112}" height="132" rx="22" fill="${APP.accentSoft}"/>
    <text x="86" y="764" font-family="Space Grotesk" font-weight="700" font-size="18" letter-spacing="2" fill="${APP.accentInk}">TÜRKÇESİ</text>
    <text x="86" y="816" font-family="Newsreader" font-weight="700" font-size="40" fill="${APP.text}">${esc(tr)}</text>
    <rect x="56" y="878" width="${SW - 112}" height="${70 + exLines.length * 40 + exTrLines.length * 34}" rx="22" fill="${APP.surfaceAlt}"/>
    <text x="86" y="926" font-family="Space Grotesk" font-weight="700" font-size="18" letter-spacing="2" fill="${APP.soft}">ÖRNEK CÜMLE</text>`;
  exLines.forEach((l, i) => (s += `<text x="86" y="${972 + i * 40}" font-family="Newsreader" font-style="italic" font-weight="500" font-size="32" fill="${APP.text}">${esc(l)}</text>`));
  exTrLines.forEach((l, i) => (s += `<text x="86" y="${982 + exLines.length * 40 + i * 34}" font-family="Hanken Grotesk" font-size="26" fill="${APP.soft}">${esc(l)}</text>`));
  s += `<rect x="56" y="${SH - 200}" width="${SW - 112}" height="96" rx="22" fill="${NAVY}"/>
    <text x="${SW / 2}" y="${SH - 140}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="34" fill="#FFFFFF">ANLADIM ✓</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}">${s}</svg>`;
}

// ---------- Bulmaca üret (uygulamanın üreticisi) ----------
async function makePuzzle() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ad-'));
  fs.mkdirSync(path.join(tmp, 'engine')); fs.mkdirSync(path.join(tmp, 'data'));
  const fix = (s) => s.replace(/from '(\.{1,2}\/[^']+?)'/g, (m, p) => (p.endsWith('.json') ? `from '${p}' with { type: 'json' }` : `from '${p}.mjs'`));
  for (const f of fs.readdirSync(path.join(ROOT, 'src/engine')).filter((x) => x.endsWith('.js'))) fs.writeFileSync(path.join(tmp, 'engine', f.replace('.js', '.mjs')), fix(fs.readFileSync(path.join(ROOT, 'src/engine', f), 'utf8')));
  fs.copyFileSync(path.join(ROOT, 'src/data/words.json'), path.join(tmp, 'data', 'words.json'));
  const G = await import(pathToFileURL(path.join(tmp, 'engine', 'generator.mjs')).href);
  const P = await import(pathToFileURL(path.join(tmp, 'engine', 'pool.mjs')).href);
  const { WORDS } = await import(pathToFileURL(path.join(tmp, 'engine', 'words.mjs')).href);
  const F = await import(pathToFileURL(path.join(tmp, 'engine', 'fillers.mjs')).href);
  const level = { id: 'A1', idx: 0, w: 8, h: 10 };
  let best = null;
  for (let i = 0; i < 60 && !(best && best.blanks <= 2); i++) {
    const { entries, dict, prio } = P.buildInputs(WORDS, level, { marked: {}, recent: {}, counter: 0, times: {} }, false, true);
    const p = await G.generatePuzzle({ w: 8, h: 10, entries, dict, prio, seed: 4200 + i * 97, budgetMs: 1600, restarts: 5, fillers: F.fillerEntries(WORDS) });
    const blanks = p.rows.join('').split('').filter((ch) => ch === '.').length;
    if (!best || blanks < best.blanks) best = { p, blanks };
  }
  return { puzzle: best.p, WORDS, blanks: best.blanks };
}

// ---------- Gönderiler ----------
const { puzzle, WORDS, blanks } = await makePuzzle();
console.log('bulmaca boş kare:', blanks);
const byA = new Map(WORDS.map((w) => [w.a, w]));
// aktif kelime: ortalarda, 5-7 harfli, sözlükte örneği olan yatay kelime
const order = puzzle.clues.map((k, i) => ({ k, i })).filter(({ k }) => !k.filler && byA.get(k.answer));
const act = order.find(({ k }) => k.dir === 'A' && k.answer.length >= 5 && k.answer.length <= 7) || order.find(({ k }) => k.dir === 'A' && k.answer.length >= 4) || order[0];
const solvedIdx = order.filter(({ i }) => i !== act.i).filter((_, j) => j % 2 === 0).map(({ i }) => i);
const pzPng = render(puzzleScreen(puzzle, { title: 'Çengel Bulmaca', subtitle: 'A1 · BAŞLANGIÇ · NO. 12', activeIdx: act.i, solvedIdx, typed: 2, exampleTr: byA.get(act.k.answer).ex[0][1] }), SW);
fs.writeFileSync(path.join(OUT_DIR, 'screen-puzzle.png'), pzPng);

const cardWord = byA.get('LIBRARY') || byA.get(act.k.answer);
const cardPng = render(wordCardScreen(cardWord, b64(pzPng, 'image/png')), SW);
fs.writeFileSync(path.join(OUT_DIR, 'screen-wordcard.png'), cardPng);
const shot = (name) => b64(fs.readFileSync(path.join(ROOT, 'store/screenshots/v1.2/raw', name)), 'image/jpeg');

const ads = [
  {
    file: 'qorvex-ad-02.png',
    title1: 'Her ipucu,', title2: 'yeni bir kelime.', sub: 'Türkçe ipucunu oku, İngilizcesini kareye yaz.',
    phoneImg: b64(pzPng, 'image/png'),
    feats: [['9', 'farklı bulmaca oyunu'], ['Her gün', 'yeni Günün Bulmacası'], ['30 gün', 'bulmaca arşivi']],
  },
  {
    file: 'qorvex-ad-03.png',
    title1: 'Bilmediğin kelime', title2: 'tek dokunuşta.', sub: 'Okunuş, sesli dinleme, anlam ve örnek cümle.',
    phoneImg: b64(cardPng, 'image/png'),
    feats: [['Sesli', 'Amerikan / İngiliz aksanı'], ['IPA', 'okunuş her kelimede'], ['Defter', 'bilmediklerin otomatik birikir']],
  },
  {
    file: 'qorvex-ad-04.png',
    title1: 'Kelimeler', title2: 'kalıcı olsun.', sub: 'Günün kelimesi, tekrar ve haftalık meydan okuma.',
    phoneImg: shot('02-alistirmalar.jpg'),
    feats: [['60 sn', 'zamana karşı yarış'], ['5', 'soru türüyle kelime tekrarı'], ['Telaffuz', 'söyle, telefon kontrol etsin']],
  },
  {
    file: 'qorvex-ad-05.png',
    title1: "A1'den C2'ye,", title2: 'adım adım.', sub: 'Seviyene uygun bulmacalar, otomatik seviye atlama.',
    phoneImg: shot('05-seviyeler.jpg'),
    feats: [['6', 'CEFR seviyesi + karışık'], ['50', 'bulmacada bir üst seviye'], ['23', 'rozet ve günlük seri']],
  },
];
for (const ad of ads) {
  const png = render(adLayout(ad), W);
  fs.writeFileSync(path.join(OUT_DIR, ad.file), png);
  console.log(ad.file, Math.round(png.length / 1024) + ' KB');
}
