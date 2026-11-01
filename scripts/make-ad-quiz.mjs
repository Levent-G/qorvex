// Reels serisi "Bu kelimeleri biliyor musun?": Türkçe ipucu → 3 sn geri sayım → İngilizce cevap harf harf.
// Kelimeler sözlükten (ipucu, seviye, örnek cümle). Sesli (sentez: tık, yazma, zil, geçiş, hafif müzik).
// Kullanım: node scripts/make-ad-quiz.mjs BUTTERFLY THUNDER METICULOUS [--stills 3,7] [--only-stills]
//   → store/ads/qorvex-quiz-butterfly-thunder-meticulous.mp4
import fs from 'node:fs';
import path from 'node:path';
import { W, H, C, ROOT, esc, logo, prog, easeOut, easeInOut, easeBack, lerp, clamp, brandDefs, brandBg, makeVideo, makeAudio } from './ad-kit.mjs';

const LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const words = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/words.json'), 'utf8'));
const pick = process.argv.slice(2).filter((x) => /^[A-Za-z]+$/.test(x)).map((x) => x.toUpperCase());
const chosen = (pick.length ? pick : ['BUTTERFLY', 'THUNDER', 'METICULOUS']).slice(0, 3).map((a) => {
  const w = words.find((x) => x.a === a);
  if (!w) throw new Error(`${a} sözlükte yok`);
  return { a, clue: w.c, lv: w.l, ex: (w.ex[0] || [])[0] || '' };
});
const DIFF = (l) => (l <= 1 ? ['KOLAY', '#3FB47A'] : l <= 3 ? ['ORTA', C.ORANGE] : ['ZOR', '#E0413A']);

const T0 = 1.8, PER = 4.4;
const END = T0 + chosen.length * PER;
const DUR = END + 4.2;
// kelime içi zamanlama
const CD0 = 0.55, CD1 = 2.55; // geri sayım
const TYPE0 = 2.65, STEP = 0.09;

function wrap(text, max) {
  const out = [];
  let cur = '';
  for (const w of text.split(' ')) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= max) cur += ' ' + w;
    else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  return out;
}

function wordScene(t, i) {
  const s = T0 + i * PER, wd = chosen[i];
  const inQ = easeOut(prog(t, s - 0.25, s + 0.15));
  const outQ = easeInOut(prog(t, s + PER - 0.3, s + PER));
  if (inQ <= 0 || outQ >= 1) return '';
  const dx = (1 - inQ) * 900 - outQ * 1000;
  const [dname, dcol] = DIFF(wd.lv);
  let g = `<g transform="translate(${dx} 0)" opacity="${1 - outQ * 0.4}">`;
  // üst: sıra + seviye
  g += `<text x="${W / 2}" y="440" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="34" letter-spacing="6" fill="${C.CREAM}" fill-opacity="0.75">KELİME ${i + 1}/3</text>
    <rect x="${W / 2 - 120}" y="470" width="240" height="62" rx="31" fill="${dcol}"/>
    <text x="${W / 2}" y="512" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="30" fill="#FFFFFF">${dname} · ${LV[wd.lv]}</text>`;
  // ipucu kartı
  const lines = wrap(wd.clue, 14);
  const fs1 = lines.length > 1 ? 84 : 104;
  g += `<rect x="90" y="575" width="900" height="380" rx="44" fill="#000" fill-opacity="0.25" transform="translate(0 12)"/>
    <rect x="90" y="575" width="900" height="380" rx="44" fill="${C.CREAM}"/>
    <text x="${W / 2}" y="655" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="28" letter-spacing="5" fill="${C.TEAL}">TÜRKÇE İPUCU</text>`;
  lines.forEach((l, k) => {
    g += `<text x="${W / 2}" y="${(lines.length > 1 ? 790 : 830) + k * (fs1 + 8)}" text-anchor="middle" font-family="Newsreader" font-weight="700" font-size="${fs1}" fill="${C.INK}">${esc(l)}</text>`;
  });
  g += `<text x="${W / 2}" y="925" text-anchor="middle" font-family="Hanken Grotesk" font-weight="500" font-size="28" fill="${C.SOFT}">İngilizcesi ne? · ${wd.a.length} harf</text>`;
  // geri sayım halkası
  const cd = prog(t, s + CD0, s + CD1);
  const typing = t >= s + TYPE0;
  if (t < s + CD1 + 0.05) {
    const n = Math.max(1, 3 - Math.floor(cd * 3));
    const r = 92, circ = 2 * Math.PI * r;
    const pulse = 1 + 0.08 * Math.max(0, 1 - ((cd * 3) % 1) * 4);
    g += `<g transform="translate(${W / 2} 1135) scale(${pulse})">
        <circle r="${r}" fill="${C.NAVY_DEEP}" fill-opacity="0.6" stroke="#FFFFFF" stroke-opacity="0.15" stroke-width="14"/>
        <circle r="${r}" fill="none" stroke="${C.TEAL}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ * cd}" transform="rotate(-90)"/>
        <text y="38" text-anchor="middle" font-family="Newsreader" font-weight="700" font-size="112" fill="${C.CREAM}">${t >= s + CD0 ? n : 3}</text>
      </g>`;
  }
  // harf kareleri
  const n = wd.a.length;
  const ts = Math.min(100, Math.floor((900 - (n - 1) * 10) / n));
  const total = n * ts + (n - 1) * 10, x0 = (W - total) / 2, y0 = lerp(1300, 1080, easeInOut(prog(t, s + CD1 - 0.05, s + TYPE0 + 0.05)));
  const done = t >= s + TYPE0 + n * STEP + 0.1;
  for (let k = 0; k < n; k++) {
    const x = x0 + k * (ts + 10);
    const shown = typing && t >= s + TYPE0 + k * STEP;
    const pop = shown ? easeBack(prog(t, s + TYPE0 + k * STEP, s + TYPE0 + k * STEP + 0.15)) : 0;
    const fill = done ? '#B9DFAA' : shown ? '#FFFFFF' : '#FFFFFF';
    g += `<rect x="${x}" y="${y0 + 6}" width="${ts}" height="${ts}" rx="12" fill="#000" fill-opacity="0.2"/>
      <rect x="${x}" y="${y0}" width="${ts}" height="${ts}" rx="12" fill="${fill}" fill-opacity="${shown || done ? 1 : 0.14}" stroke="#FFFFFF" stroke-opacity="${shown ? 0 : 0.35}" stroke-width="3"/>`;
    if (shown) g += `<text x="${x + ts / 2}" y="${y0 + ts * 0.5 + ts * 0.2}" text-anchor="middle" font-family="Libre Franklin" font-weight="600" font-size="${ts * 0.6 * (0.6 + 0.4 * pop)}" fill="${C.INK}">${wd.a[k]}</text>`;
  }
  // doğru: onay + örnek cümle
  if (done) {
    const q = easeOut(prog(t, s + TYPE0 + n * STEP + 0.1, s + TYPE0 + n * STEP + 0.5));
    g += `<g opacity="${q}" transform="translate(0 ${20 * (1 - q)})">
        <circle cx="${W / 2}" cy="${y0 + ts + 90}" r="38" fill="#3FB47A"/>
        <path d="M${W / 2 - 17} ${y0 + ts + 91}l12 12 23-25" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
    wrap(`“${wd.ex}”`, 40).slice(0, 2).forEach((l, k) => {
      g += `<text x="${W / 2}" y="${y0 + ts + 190 + k * 46}" text-anchor="middle" font-family="Newsreader" font-style="italic" font-weight="500" font-size="38" fill="${C.CREAM}" fill-opacity="0.9">${esc(l)}</text>`;
    });
    g += '</g>';
  }
  return g + '</g>';
}

function frame(t) {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${brandDefs}</defs>${brandBg(t)}`;
  // logo + seri etiketi her zaman üstte
  const lg = easeOut(prog(t, 0.05, 0.6));
  s += logo((W - 300) / 2, 90 + 14 * (1 - lg), 300, lg);
  s += `<g opacity="${lg}"><rect x="${W / 2 - 205}" y="268" width="410" height="58" rx="29" fill="${C.TEAL}" fill-opacity="0.18" stroke="${C.TEAL}" stroke-width="2"/>
    <text x="${W / 2}" y="307" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="27" letter-spacing="5" fill="${C.TEAL}">GÜNÜN 3 KELİMESİ</text></g>`;

  // giriş: soru
  const hookOut = 1 - prog(t, T0 - 0.35, T0 - 0.05);
  if (hookOut > 0) {
    const a = easeOut(prog(t, 0.25, 0.75)), b = easeOut(prog(t, 0.55, 1.05)), c = easeOut(prog(t, 0.95, 1.4));
    s += `<g opacity="${hookOut}">
      <text x="${W / 2}" y="${860 + 30 * (1 - a)}" opacity="${a}" text-anchor="middle" font-family="Newsreader" font-weight="700" font-size="116" fill="${C.CREAM}">Bu kelimeleri</text>
      <text x="${W / 2}" y="${990 + 30 * (1 - b)}" opacity="${b}" text-anchor="middle" font-family="Newsreader" font-style="italic" font-weight="500" font-size="120" fill="${C.TEAL}">biliyor musun?</text>`;
    chosen.forEach((w, k) => {
      const [dn, dc] = DIFF(w.lv);
      const q = easeBack(prog(t, 1.0 + k * 0.12, 1.35 + k * 0.12));
      if (q > 0) s += `<g transform="translate(${W / 2 + (k - 1) * 260} 1130) scale(${q})"><rect x="-115" y="-34" width="230" height="68" rx="34" fill="${dc}"/><text y="12" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="30" fill="#FFFFFF">${dn} ${LV[w.lv]}</text></g>`;
    });
    s += `<text x="${W / 2}" y="1260" opacity="${c}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="500" font-size="36" fill="${C.CREAM}" fill-opacity="0.85">İpucu Türkçe · cevap İngilizce · 3 saniyen var</text></g>`;
  }

  for (let i = 0; i < chosen.length; i++) s += wordScene(t, i);

  // kapanış: kaç tanesini bildin + çağrı
  if (t >= END - 0.1) {
    const a = easeBack(prog(t, END, END + 0.45)), b = easeOut(prog(t, END + 0.4, END + 0.9));
    s += `<g transform="translate(${W / 2} 760) scale(${Math.max(0.01, a)}) translate(${-W / 2} -760)">
        <text x="${W / 2}" y="720" text-anchor="middle" font-family="Newsreader" font-weight="700" font-size="108" fill="${C.CREAM}">Kaç tanesini</text>
        <text x="${W / 2}" y="840" text-anchor="middle" font-family="Newsreader" font-style="italic" font-weight="500" font-size="116" fill="${C.TEAL}">bildin?</text>
      </g>`;
    // 0/3 … 3/3 rozetleri
    for (let k = 0; k <= 3; k++) {
      const q = easeBack(prog(t, END + 0.5 + k * 0.1, END + 0.85 + k * 0.1));
      if (q > 0) s += `<g transform="translate(${W / 2 + (k - 1.5) * 200} 1000) scale(${q})"><circle r="70" fill="${k === 3 ? '#3FB47A' : C.CREAM}" fill-opacity="${k === 3 ? 1 : 0.14}" stroke="${C.CREAM}" stroke-opacity="0.4" stroke-width="3"/><text y="18" text-anchor="middle" font-family="Newsreader" font-weight="700" font-size="54" fill="${C.CREAM}">${k}/3</text></g>`;
    }
    // yorumlara yaz + aşağı ok
    const bob = 8 * Math.sin((t - END) * 6);
    s += `<g opacity="${b}"><text x="${W / 2}" y="1190" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="44" fill="${C.CREAM}">Yorumlara yaz!</text>
      <path d="M${W / 2} ${1225 + bob}v60m-26-26l26 26 26-26" fill="none" stroke="${C.TEAL}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    const c2 = easeOut(prog(t, END + 1.4, END + 2.0));
    if (c2 > 0) {
      const pulse = 1 + 0.03 * Math.max(0, Math.sin((t - END - 2) * 5));
      s += `<g opacity="${c2}" transform="translate(${W / 2} 1500) scale(${pulse}) translate(${-W / 2} -1500)">
          <rect x="${W / 2 - 330}" y="1452" width="660" height="96" rx="48" fill="${C.ORANGE}"/>
          <text x="${W / 2}" y="1513" text-anchor="middle" font-family="Hanken Grotesk" font-weight="700" font-size="37" fill="#FFFFFF">QORVEX · App Store'da ücretsiz</text>
        </g>
        <text x="${W / 2}" y="1640" opacity="${c2}" text-anchor="middle" font-family="Hanken Grotesk" font-weight="500" font-size="30" fill="${C.CREAM}" fill-opacity="0.75">Bulmaca çöz, İngilizce öğren · 6.200+ kelime</text>`;
    }
  }
  return s + '</svg>';
}

// ses
const au = makeAudio(DUR);
au.pad(0, DUR, 100, 0.045);
au.whoosh(0.1, 0.4, 0.1);
chosen.forEach((wd, i) => {
  const s = T0 + i * PER;
  au.whoosh(s - 0.25, 0.35);
  for (let k = 0; k < 3; k++) au.tone(s + CD0 + k * ((CD1 - CD0) / 3), 880 + k * 110, 0.08, 0.32, 0.035);
  for (let k = 0; k < wd.a.length; k++) au.click(s + TYPE0 + k * STEP);
  au.ding(s + TYPE0 + wd.a.length * STEP + 0.1);
});
au.whoosh(END - 0.1, 0.45, 0.12);
au.ding(END + 1.4, 0.22);

const slug = chosen.map((w) => w.a.toLowerCase()).join('-');
makeVideo({ name: `qorvex-quiz-${slug}`, dur: DUR, frame, audio: au });
