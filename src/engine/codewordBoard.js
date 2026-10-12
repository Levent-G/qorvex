// Şifreli Bulmaca (Codeword) tahta mantığı — saf fonksiyonlar, test edilebilir.
// committed: sayı -> harf (yalnızca DOĞRU olduğu kesinleşenler; verilenler, açılanlar, doğru kelimelerden gelenler)
// cells:     "r,c" -> harf (henüz kesinleşmemiş, sadece o karede duran geçici harfler)
// Kural: Bir kelime tamamlanıp doğruysa harfleri kesinleşir ve aynı sayılı her kareye işlenir;
//        yanlışsa hiçbir yere işlenmez. Kesinleşmiş kareler silinmez.

export const cellKey = (r, c) => `${r},${c}`;

export function displayLetter(p, s, key) {
  const n = p.code[s.solution[key]];
  return s.committed[n] || s.cells[key] || '';
}

// Tamamlanmış ve doğru olan her kelimenin harflerini kesinleştir (zincirleme, sabitlenene kadar)
export function settle(p, model, committed, cells) {
  let com = committed, cl = cells, changed = true;
  while (changed) {
    changed = false;
    for (const w of model.words) {
      const ok = w.keys.every((k) => {
        const n = p.code[model.solution[k]];
        return (com[n] || cl[k]) === model.solution[k];
      });
      if (!ok) continue;
      for (const k of w.keys) {
        const n = p.code[model.solution[k]];
        if (!com[n]) {
          com = { ...com, [n]: model.solution[k] };
          changed = true;
        }
      }
    }
  }
  // kesinleşen sayılardaki geçici harfler artık gereksiz
  if (com !== committed) {
    cl = { ...cl };
    for (const k of Object.keys(cl)) if (com[p.code[model.solution[k]]]) delete cl[k];
  }
  return { committed: com, cells: cl };
}

export function initCodeword(p, model, saved = {}) {
  const numToLetter = Object.fromEntries(Object.entries(p.code).map(([l, n]) => [n, l]));
  let committed = {};
  for (const l of p.given) committed[p.code[l]] = l;
  let cells = {};
  if (saved.committed) {
    committed = { ...committed, ...saved.committed };
    cells = { ...(saved.cells || {}) };
  } else if (saved && typeof saved === 'object') {
    // eski kayıt biçimi (sayı -> harf): yalnızca doğru olanları koru
    for (const [n, l] of Object.entries(saved)) if (numToLetter[n] === l) committed[n] = l;
  }
  return { ...settle(p, model, committed, cells), solution: model.solution };
}

export function isLockedCell(p, s, key) {
  return !!s.committed[p.code[s.solution[key]]];
}

export function isSolved(p, s) {
  const present = new Set(Object.keys(s.solution).map((k) => p.code[s.solution[k]]));
  return [...present].every((n) => s.committed[n]);
}

// Harf yaz (seçili kare kesinleşmişse, kelimede sıradaki açık kareye yaz)
export function typeLetter(p, model, s, word, key, ch) {
  let k = key;
  if (isLockedCell(p, s, k)) {
    const free = word.keys.find((kk) => !isLockedCell(p, s, kk));
    if (!free) return { s, key };
    k = free;
  }
  const cells = { ...s.cells, [k]: ch };
  const st = settle(p, model, s.committed, cells);
  return { s: { ...s, ...st }, key: k };
}

// Sil: bu karede geçici harf varsa onu; yoksa kelimede geri gidip kesinleşmemiş ilk kareyi
export function deleteLetter(p, s, word, key) {
  if (!isLockedCell(p, s, key) && s.cells[key]) {
    const cells = { ...s.cells };
    delete cells[key];
    return { s: { ...s, cells }, key };
  }
  const i = word.keys.indexOf(key);
  for (let j = i - 1; j >= 0; j--) {
    const kk = word.keys[j];
    if (isLockedCell(p, s, kk)) continue; // doğru olduğu kesin kareler silinmez
    const cells = { ...s.cells };
    delete cells[kk];
    return { s: { ...s, cells }, key: kk };
  }
  return { s, key };
}

// Yazdıktan sonra kelimede sıradaki boş ve açık kare (yoksa aynı yerde kal)
export function nextOpenInWord(p, s, word, key) {
  const i = word.keys.indexOf(key);
  for (let j = i + 1; j < word.keys.length; j++) {
    const kk = word.keys[j];
    if (!isLockedCell(p, s, kk) && !s.cells[kk]) return kk;
  }
  for (let j = 0; j < word.keys.length; j++) {
    const kk = word.keys[j];
    if (!isLockedCell(p, s, kk) && !s.cells[kk]) return kk;
  }
  return key;
}

// Bir sayıyı aç (ipucu): doğru harf kesinleşir
export function revealNumber(p, model, s, n) {
  const numToLetter = Object.fromEntries(Object.entries(p.code).map(([l, nn]) => [nn, l]));
  return { ...s, ...settle(p, model, { ...s.committed, [n]: numToLetter[n] }, s.cells) };
}
