// Şifreli Cümle (Cryptogram) tahta mantığı — saf fonksiyonlar, test edilebilir.
// enc: şifreli cümle (BÜYÜK harf), decode: şifreli harf -> gerçek harf
// s = { guess: şifreli harf -> tahmin, revealed: şifreli harf -> true, sel: cümledeki konum }

export function makeCrypto(p) {
  const enc = p.text.replace(/[A-Z]/g, (ch) => p.cipher[ch]);
  const decode = Object.fromEntries(Object.entries(p.cipher).map(([plain, c]) => [c, plain]));
  const given = new Set(p.given.map((l) => p.cipher[l]));
  const positions = enc.split('').map((ch, i) => (/[A-Z]/.test(ch) ? i : -1)).filter((i) => i >= 0);
  const letters = [...new Set(positions.map((i) => enc[i]))];
  return { enc, decode, given, positions, letters };
}

export const isLocked = (c, s) => c.given.has(s) || false;
const locked = (c, st, ch) => c.given.has(ch) || !!st.revealed[ch];

export function initCrypto(c, saved = {}, revealed = {}) {
  const guess = { ...saved };
  for (const ch of c.given) guess[ch] = c.decode[ch];
  const st = { guess, revealed: { ...revealed }, sel: 0 };
  st.sel = firstOpen(c, st, -1) ?? c.positions[0];
  return st;
}

// verilen konumdan sonra (sarmalayarak) boş ve kilitsiz ilk konum
function firstOpen(c, st, from) {
  const n = c.positions.length;
  const start = c.positions.findIndex((i) => i > from);
  for (let k = 0; k < n; k++) {
    const i = c.positions[((start < 0 ? 0 : start) + k) % n];
    const ch = c.enc[i];
    if (!st.guess[ch] && !locked(c, st, ch)) return i;
  }
  return null;
}

export function select(c, st, i) {
  return c.positions.includes(i) ? { ...st, sel: i } : st;
}

// Harf yaz: seçili şifreli harfe tahmin ata (aynı şifreli harfin geçtiği her yer dolar),
// sonra cümlede ileriye doğru sıradaki boş kareye geç.
export function typeLetter(c, st, letter) {
  let sel = st.sel;
  if (locked(c, st, c.enc[sel])) {
    const nx = firstOpen(c, st, sel);
    if (nx == null) return st;
    sel = nx;
  }
  const ch = c.enc[sel];
  const guess = { ...st.guess };
  // bir gerçek harf yalnızca bir şifreli harfe ait olabilir
  for (const [k, v] of Object.entries(guess)) if (v === letter && k !== ch && !locked(c, st, k)) delete guess[k];
  guess[ch] = letter;
  const ns = { ...st, guess };
  const nx = firstOpen(c, ns, sel);
  return { ...ns, sel: nx ?? sel };
}

// Sil: seçili karede tahmin varsa onu sil (aynı şifreli harfin her yerinden);
// yoksa geriye doğru tahmini olan ilk kilitsiz kareye git ve onu sil.
export function deleteLetter(c, st) {
  const ch = c.enc[st.sel];
  if (st.guess[ch] && !locked(c, st, ch)) {
    const guess = { ...st.guess };
    delete guess[ch];
    return { ...st, guess };
  }
  const idx = c.positions.indexOf(st.sel);
  for (let k = idx - 1; k >= 0; k--) {
    const i = c.positions[k];
    const cc = c.enc[i];
    if (locked(c, st, cc)) continue;
    if (st.guess[cc]) {
      const guess = { ...st.guess };
      delete guess[cc];
      return { ...st, guess, sel: i };
    }
    return { ...st, sel: i }; // boş kilitsiz kareye geri git
  }
  return st;
}

export function reveal(c, st) {
  const ch = c.enc[st.sel];
  const letter = c.decode[ch];
  const guess = { ...st.guess };
  for (const [k, v] of Object.entries(guess)) if (v === letter && k !== ch) delete guess[k];
  guess[ch] = letter;
  const ns = { ...st, guess, revealed: { ...st.revealed, [ch]: true } };
  return { ...ns, sel: firstOpen(c, ns, st.sel) ?? st.sel };
}

export const isSolved = (c, st) => c.letters.every((ch) => st.guess[ch] === c.decode[ch]);
export const allFilled = (c, st) => c.letters.every((ch) => st.guess[ch]);

// Okunuş: çözülen harfler gerçek, çözülmeyenler alt çizgi
export function reading(c, st) {
  return c.enc.replace(/[A-Z]/g, (ch) => st.guess[ch] || '_');
}

// Kelimeler: [{ start, end, status }] — tamamen dolu kelimeler için ok / close / bad
export function wordStatuses(c, st) {
  const out = [];
  const re = /[A-Z]+/g;
  let m;
  while ((m = re.exec(c.enc))) {
    const w = m[0];
    let status = null;
    if ([...w].every((ch) => st.guess[ch])) {
      const wrong = [...w].filter((ch) => st.guess[ch] !== c.decode[ch]).length;
      status = !wrong ? 'ok' : wrong <= Math.max(1, Math.floor(w.length / 3)) ? 'close' : 'bad';
    }
    out.push({ start: m.index, end: m.index + w.length, status });
  }
  return out;
}
