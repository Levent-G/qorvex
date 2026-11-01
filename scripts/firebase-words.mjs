// Ortak kelime veritabanı (Firebase davinci-d30bc · `words`) ⇄ QORVEX.
//
// Firestore'daki `words` koleksiyonu TÜM projelerin tek kelime kaynağıdır;
// kelimeler davinci admin panelinden düzenlenir. Şema: davinci2/docs/SHARED_WORDS.md
//
//   Ortak alanlar : word, translation, level, example, exampleTr, partOfSpeech,
//                   category, imageUrl, photos, meanings[], examples[{en,tr}], ipa
//   Proje alanları: clue (QORVEX ipucu ≤18), qorvexLevel / qorvexPos (yalnızca
//                   ortak değerden farklıysa), apps.{proje}: false → o projede gizli
//
// Kullanım (servis hesabı anahtarı REPO DIŞINDA tutulur, asla commit edilmez):
//   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\...\davinci-d30bc-firebase-adminsdk-....json"
//   node scripts/firebase-words.mjs pull         # Firestore → src/data/words.json (build öncesi)
//   node scripts/firebase-words.mjs push --dry   # words.json → Firestore (tek seferlik taşıma)
//   node scripts/firebase-words.mjs selftest     # ağsız gidiş-dönüş testi
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORDS = path.join(ROOT, 'src/data/words.json');
const EXCLUDE = path.join(ROOT, 'scripts/word-exclude.json');
const PROJECT = 'davinci-d30bc';
const COL = 'words';
const LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const MAX_CLUE = 18;

const key = (w) => String(w || '').trim().toLowerCase();
const trKey = (s) => String(s || '').trim().toLocaleLowerCase('tr-TR');
const uniq = (arr, k) => {
  const seen = new Set();
  return arr.filter((x) => x && !seen.has(k(x)) && seen.add(k(x)));
};
const splitTr = (t) => String(t || '').split(/[,;]/).map((s) => s.trim()).filter(Boolean);

// QORVEX kaydının ortak belgeye eklenecek alanları. Mevcut davinci alanlarına
// (translation, example, level, imageUrl…) dokunulmaz; farklı olan seviye/tür
// QORVEX'e özel alana yazılır.
function qorvexFields(q, d) {
  const f = {
    clue: q.c,
    meanings: q.m,
    examples: q.ex.map(([en, tr]) => ({ en, tr })), // Firestore iç içe dizi kabul etmez
    apps: { qorvex: true },
  };
  if (q.ipa && !d.ipa) f.ipa = q.ipa;
  if (d.level !== LV[q.l]) f.qorvexLevel = LV[q.l];
  if (d.partOfSpeech !== q.p) f.qorvexPos = q.p;
  return f;
}

// Veritabanında olmayan QORVEX kelimesi: tüm projeler için tam belge
function newDoc(q) {
  const d = {
    word: q.a.toLowerCase(),
    translation: q.m.slice(0, 2).join(', '),
    level: LV[q.l],
    example: q.ex[0]?.[0] || '',
    exampleTr: q.ex[0]?.[1] || '',
    partOfSpeech: q.p,
    category: q.cat === 'extra' ? 'other' : q.cat,
    clue: q.c,
    meanings: q.m,
    examples: q.ex.map(([en, tr]) => ({ en, tr })),
    apps: { qorvex: true },
    source: 'qorvex',
  };
  if (q.ipa) d.ipa = q.ipa;
  return d;
}

// Belge → QORVEX kaydı. Ortak alanlar (çeviri, örnek, fotoğraf) önce gelir,
// böylece admin panelinde yapılan düzeltmeler QORVEX'e de yansır.
function toQorvex(d) {
  const a = key(d.word).toUpperCase();
  if (!/^[A-Z]{2,10}$/.test(a) || !d.clue || d.clue.length > MAX_CLUE) return null;
  const l = LV.indexOf(d.qorvexLevel || d.level);
  if (l < 0) return null;
  const m = uniq([...splitTr(d.translation), ...(d.meanings || [])], trKey);
  if (!m.length) return null;
  const ex = uniq([d.example ? { en: d.example, tr: d.exampleTr || '' } : null, ...(d.examples || [])], (e) => e.en.trim().toLowerCase()).map((e) => [e.en, e.tr]);
  const o = { a, l, m, ex, p: d.qorvexPos || d.partOfSpeech || '', cat: d.category || '', c: d.clue };
  if (d.ipa) o.ipa = d.ipa;
  if (d.imageUrl) o.img = d.imageUrl;
  return o;
}

// Push planı: mevcut belgeler + words.json → yazma listesi [{id, data}]
export function planPush(docs, qWords, excluded) {
  const byWord = new Map();
  for (const d of [...docs].sort((x, y) => x.id.localeCompare(y.id))) {
    const k = key(d.word);
    if (!byWord.has(k)) byWord.set(k, d); // tekrarlı kelimede ilk belge
  }
  const writes = [];
  let updated = 0, created = 0, off = 0;
  for (const q of qWords) {
    const d = byWord.get(key(q.a));
    if (d) { writes.push({ id: d.id, data: qorvexFields(q, d) }); updated++; }
    else { writes.push({ id: `q_${key(q.a)}`, data: newDoc(q) }); created++; }
  }
  const done = new Set(writes.map((w) => w.id));
  for (const w of excluded) {
    const d = byWord.get(key(w));
    if (d && !done.has(d.id) && d.apps?.qorvex !== false) { writes.push({ id: d.id, data: { apps: { qorvex: false } } }); off++; }
  }
  return { writes, updated, created, off };
}

export function buildWordsJson(docs) {
  const out = new Map();
  for (const d of [...docs].sort((x, y) => x.id.localeCompare(y.id))) {
    if (d.apps?.qorvex === false) continue;
    const o = toQorvex(d);
    if (o && !out.has(o.a)) out.set(o.a, o);
  }
  return [...out.values()].sort((x, y) => x.l - y.l || x.a.localeCompare(y.a));
}

// Firestore merge:true davranışının (iç içe map'ler birleşir) bellekte taklidi
function mergeDeep(a, b) {
  const o = { ...a };
  for (const [k, v] of Object.entries(b)) o[k] = v && typeof v === 'object' && !Array.isArray(v) && o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]) ? mergeDeep(o[k], v) : v;
  return o;
}

async function loadDavinciLocal() {
  const os = await import('node:os');
  const { pathToFileURL } = await import('node:url');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-'));
  fs.copyFileSync(path.join(ROOT, '../davinci2/src/data/wordDatabase.js'), path.join(tmp, 'db.mjs'));
  return (await import(pathToFileURL(path.join(tmp, 'db.mjs')).href)).ALL_WORDS;
}

async function db() {
  const cred = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!cred || !fs.existsSync(cred)) throw new Error('GOOGLE_APPLICATION_CREDENTIALS repo dışındaki servis hesabı JSON dosyasını göstermeli');
  if (path.resolve(cred).startsWith(path.resolve(ROOT))) throw new Error('Servis hesabı anahtarı repo içinde olamaz');
  const sa = JSON.parse(fs.readFileSync(cred, 'utf8'));
  if (sa.project_id !== PROJECT) throw new Error(`Anahtar ${sa.project_id} projesine ait, beklenen ${PROJECT}`);
  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
  initializeApp({ credential: cert(sa), projectId: PROJECT });
  return { fs: getFirestore(), FieldValue };
}

async function readAll(fsdb) {
  const snap = await fsdb.collection(COL).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Eski words.json ile yeni çıktının özeti
function diffReport(before, after) {
  const b = new Map(before.map((w) => [w.a, w]));
  const a = new Map(after.map((w) => [w.a, w]));
  const cnt = { eklenen: 0, çıkan: 0, anlam: 0, örnek: 0, seviye: 0, ipucu: 0, foto: 0 };
  for (const [k, w] of a) {
    const o = b.get(k);
    if (!o) { cnt.eklenen++; continue; }
    if (JSON.stringify(o.m) !== JSON.stringify(w.m)) cnt.anlam++;
    if (JSON.stringify(o.ex) !== JSON.stringify(w.ex)) cnt.örnek++;
    if (o.l !== w.l) cnt.seviye++;
    if (o.c !== w.c) cnt.ipucu++;
    if (w.img) cnt.foto++;
  }
  for (const k of b.keys()) if (!a.has(k)) cnt.çıkan++;
  return cnt;
}

const cmd = process.argv[2];
const dry = process.argv.includes('--dry');
const qWords = JSON.parse(fs.readFileSync(WORDS, 'utf8'));
const excluded = JSON.parse(fs.readFileSync(EXCLUDE, 'utf8')).words || [];

if (cmd === 'selftest') {
  // davinci'nin paketli listesini "Firestore" sayıp push → pull
  const docs = await loadDavinciLocal();
  const plan = planPush(docs, qWords, excluded);
  const store = new Map(docs.map((d) => [d.id, d]));
  for (const w of plan.writes) store.set(w.id, mergeDeep(store.get(w.id) || { id: w.id }, w.data));
  const back = buildWordsJson([...store.values()]);
  console.log(`güncellenen ${plan.updated} · yeni ${plan.created} · qorvex=false ${plan.off}`);
  console.log(`pull: ${back.length} kelime (şu an ${qWords.length})`, diffReport(qWords, back));
  const missing = qWords.filter((q) => !back.some((x) => x.a === q.a)).map((q) => q.a);
  const bad = back.filter((x) => { const q = qWords.find((y) => y.a === x.a); return q && (q.c !== x.c || q.l !== x.l || q.p !== x.p); });
  console.log(`kayıp kelime: ${missing.length} · ipucu/seviye/tür bozulan: ${bad.length}`);
  if (missing.length || bad.length) process.exit(1);
} else if (cmd === 'push') {
  const { fs: fsdb, FieldValue } = await db();
  const docs = await readAll(fsdb);
  const plan = planPush(docs, qWords, excluded);
  console.log(`Firestore'da ${docs.length} belge · güncellenecek ${plan.updated} · yeni ${plan.created} · qorvex=false ${plan.off}`);
  if (dry) { console.log('--dry: hiçbir şey yazılmadı'); process.exit(0); }
  const existing = new Set(docs.map((d) => d.id));
  for (let i = 0; i < plan.writes.length; i += 400) {
    const batch = fsdb.batch();
    for (const w of plan.writes.slice(i, i + 400)) {
      const stamp = existing.has(w.id) ? { updatedAt: FieldValue.serverTimestamp() } : { createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };
      batch.set(fsdb.collection(COL).doc(w.id), { ...w.data, ...stamp }, { merge: true });
    }
    await batch.commit();
    process.stdout.write(`\r${Math.min(i + 400, plan.writes.length)}/${plan.writes.length}`);
  }
  console.log('\npush tamam');
} else if (cmd === 'pull') {
  const { fs: fsdb } = await db();
  const out = buildWordsJson(await readAll(fsdb));
  if (out.length < 1000) throw new Error(`Yalnızca ${out.length} kelime geldi; words.json'a yazılmadı`);
  console.log(`${out.length} kelime (şu an ${qWords.length})`, diffReport(qWords, out));
  if (dry) { console.log('--dry: words.json değişmedi'); process.exit(0); }
  fs.writeFileSync(WORDS, JSON.stringify(out));
  console.log('words.json güncellendi');
} else {
  console.log('kullanım: node scripts/firebase-words.mjs pull|push|selftest [--dry]');
}
