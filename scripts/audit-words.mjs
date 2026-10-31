// Sözlük kalite raporu: node scripts/audit-words.mjs [--json çıktı.json]
// İpucu çakışması, seviye uyumsuzluğu (CEFR-J/Octanove varsa), ipucu sorunları, örnek cümle sorunları, hassas kelimeler.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const words = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/words.json'), 'utf8'));
const LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const trLow = (s) => String(s || '').toLocaleLowerCase('tr');
const norm = (s) => trLow(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
const report = {};
const add = (k, item) => (report[k] = report[k] || []).push(item);

// 1) İpucu çakışması: aynı ipucu (parantez dahil) birden çok cevapta; aynı uzunluktaysa çengelde gerçek belirsizlik
const byClue = new Map();
for (const w of words) { const k = trLow(w.c).trim(); (byClue.get(k) || byClue.set(k, []).get(k)).push(w); }
for (const [c, ws] of byClue) {
  if (ws.length < 2) continue;
  const lens = {};
  for (const w of ws) (lens[w.a.length] = lens[w.a.length] || []).push(w.a);
  const sameLen = Object.values(lens).filter((x) => x.length > 1);
  add(sameLen.length ? 'cakisma_ayni_uzunluk' : 'cakisma', { c, answers: ws.map((w) => `${w.a}(${LV[w.l]})`) });
}

// 2) Seviye uyumsuzluğu: CEFR-J / Octanove seviyesiyle 2+ fark
const OLP = path.join(process.env.TEMP || '', 'claude/C--Users-28648806822/f9c7f3d2-ee8f-43cc-b5dc-067882daf449/scratchpad/dl-olp');
const cefr = new Map();
for (const f of ['cefrj-vocabulary-profile-1.5.csv', 'octanove-vocabulary-profile-c1c2-1.0.csv']) {
  const p = path.join(OLP, f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/).slice(1)) {
    const [h, , lv] = line.split(',');
    if (!h) continue;
    for (const form of h.split('/')) { const a = form.trim().toUpperCase(); if (/^[A-Z]+$/.test(a) && !cefr.has(a)) cefr.set(a, LV.indexOf(lv)); }
  }
}
for (const w of words) {
  if (!cefr.has(w.a)) continue;
  const d = w.l - cefr.get(w.a);
  if (Math.abs(d) >= 2) add(d > 0 ? 'seviye_fazla_yuksek' : 'seviye_fazla_dusuk', { a: w.a, biz: LV[w.l], cefr: LV[cefr.get(w.a)], c: w.c });
}

// 3) İpucu sorunları
const GENERIC = new Set(['bir şey', 'şey', 'hayvan', 'bitki', 'renk', 'yer', 'kişi', 'nesne', 'eşya', 'araç', 'yiyecek', 'içecek', 'meyve', 'sebze', 'kuş', 'balık', 'çiçek', 'ağaç türü', 'bir tür']);
for (const w of words) {
  const c = String(w.c || '');
  const base = trLow(c.replace(/\(.*?\)/g, '').trim());
  if (!c) add('ipucu_yok', { a: w.a });
  if (GENERIC.has(base)) add('ipucu_genel', { a: w.a, c });
  const a = norm(base).replace(/\s+/g, ''), b = norm(w.a);
  if (b.length >= 4 && (a.includes(b) || lev(a, b) <= Math.max(1, Math.floor(b.length / 4)))) add('ipucu_cevabi_ele_veriyor', { a: w.a, c });
}

// 4) Örnek cümle sorunları
const formsOf = (a) => { const x = a.toLowerCase(); return [x, x + 's', x + 'es', x + 'ed', x + 'd', x + 'ing', x.replace(/e$/, '') + 'ing', x.replace(/y$/, 'i') + 'es', x.replace(/y$/, 'i') + 'ed']; };
for (const w of words) {
  const ex = (w.ex || [])[0];
  if (!ex) { add('ornek_yok', { a: w.a, l: LV[w.l] }); continue; }
  const [en, tr] = ex;
  if (!tr) add('ornek_turkcesi_yok', { a: w.a, en });
  const toks = new Set((en || '').toLowerCase().match(/[a-z]+/g) || []);
  if (!formsOf(w.a).some((f) => toks.has(f)) && !w.irr) add('ornek_kelimeyi_icermiyor', { a: w.a, en });
  if ((tr || '').length > 90) add('ornek_cok_uzun', { a: w.a, tr });
}

// 5) Hassas kelimeler (argo, hakaret, cinsellik, şiddet) — gözden geçirilmeli, otomatik silinmez
const SENSITIVE = ['DAMN', 'HELL', 'SEX', 'SEXY', 'SEXUAL', 'RAPE', 'KILL', 'KILLER', 'MURDER', 'SUICIDE', 'DRUG', 'DRUGS', 'COCAINE', 'HEROIN', 'NAKED', 'NUDE', 'BREAST', 'PENIS', 'VAGINA', 'BITCH', 'BASTARD', 'CRAP', 'PISS', 'PEE', 'POO', 'FART', 'GAY', 'LESBIAN', 'GYPSY', 'DWARF', 'CRIPPLE', 'MIDGET', 'RETARD', 'STUPID', 'IDIOT', 'MORON', 'SLAVE', 'NAZI', 'TERROR', 'TERRORIST', 'BOMB', 'GUN', 'RIFLE', 'CORPSE', 'TORTURE', 'WHORE', 'PRISON'];
for (const a of SENSITIVE) { const w = words.find((x) => x.a === a); if (w) add('hassas', { a, l: LV[w.l], c: w.c }); }

// özet
const ORDER = ['cakisma_ayni_uzunluk', 'cakisma', 'seviye_fazla_yuksek', 'seviye_fazla_dusuk', 'ipucu_cevabi_ele_veriyor', 'ipucu_genel', 'ipucu_yok', 'ornek_yok', 'ornek_turkcesi_yok', 'ornek_kelimeyi_icermiyor', 'ornek_cok_uzun', 'hassas'];
console.log(`Sözlük: ${words.length} kelime · CEFR karşılaştırması: ${cefr.size ? [...words].filter((w) => cefr.has(w.a)).length + ' kelimede' : 'CEFR listesi bulunamadı'}`);
for (const k of ORDER) {
  const xs = report[k] || [];
  const show = xs.slice(0, 6).map((x) => (x.answers ? `"${x.c}" → ${x.answers.join(', ')}` : x.biz ? `${x.a} (biz ${x.biz}, CEFR ${x.cefr})` : x.en ? `${x.a}: ${String(x.en).slice(0, 50)}` : `${x.a}${x.c ? ' → ' + x.c : ''}`));
  console.log(`\n${k}: ${xs.length}${show.length ? '\n  ' + show.join('\n  ') : ''}`);
}
const jo = process.argv.indexOf('--json');
if (jo > 0) fs.writeFileSync(process.argv[jo + 1], JSON.stringify(report, null, 1));
