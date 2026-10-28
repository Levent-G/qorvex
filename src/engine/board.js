// Bulmaca tahtası durum makinesi (saf fonksiyonlar, test edilebilir)
import { wordStatus } from './model';

// ---------------- Durum makinesi ----------------
// Kilitli kare: açılmış harf ya da içinden geçen kelimelerden biri (kendisi ya da çaprazı) doğru (yeşil) olan kare.
// Doğru bilinen kelime bir daha silinmez / üzerine yazılmaz.
const wordOk = (s, idx) => idx != null && wordStatus(s.model.words[idx], s.entries, s.model.solution) === 'ok';
const locked = (s, key) => {
  if (s.revealed[key]) return true;
  const at = s.model.at[key] || {};
  return wordOk(s, at.A) || wordOk(s, at.D);
};

function checkSolved(s) {
  const { solution } = s.model;
  for (const k in solution) if (s.entries[k] !== solution[k]) return s;
  return { ...s, solved: true };
}

// kelimenin ilk yazılabilir karesi: önce boş ve kilitsiz, yoksa ilk kilitsiz (doğru kelimelerin harflerine imleç gelmez)
function firstOpen(s, w) {
  let j = w.keys.findIndex((k) => !s.entries[k] && !locked(s, k));
  if (j < 0) j = w.keys.findIndex((k) => !locked(s, k));
  return j < 0 ? 0 : j;
}

// kelimede verilen kareye en yakın yazılabilir (kilitsiz) kare
function nearestOpen(s, w, key) {
  const i = Math.max(0, w.keys.indexOf(key));
  let best = -1;
  for (let j = 0; j < w.keys.length; j++) if (!locked(s, w.keys[j]) && (best < 0 || Math.abs(j - i) < Math.abs(best - i))) best = j;
  return best < 0 ? firstOpen(s, w) : best;
}

export function selectWordState(s, idx) {
  const w = s.model.words[idx];
  const j = firstOpen(s, w);
  return { ...s, active: idx, sel: { r: w.cells[j][0], c: w.cells[j][1] } };
}

function nextOpenWord(s, fromIdx) {
  const { order, words } = s.model;
  const pos = order.indexOf(fromIdx);
  // 1) boş karesi olan sıradaki kelime
  for (let step = 1; step < order.length; step++) {
    const idx = order[(pos + step) % order.length];
    if (words[idx].keys.some((k) => !s.entries[k])) return idx;
  }
  // 2) hepsi doluysa: henüz doğru olmayan (kırmızı/sarı) sıradaki kelime
  for (let step = 1; step < order.length; step++) {
    const idx = order[(pos + step) % order.length];
    if (wordStatus(words[idx], s.entries, s.model.solution) !== 'ok') return idx;
  }
  return null;
}

export function reducer(s, a) {
  const { model } = s;
  switch (a.type) {
    case 'tapCell': {
      const key = `${a.r},${a.c}`;
      const at = model.at[key];
      if (!at) return s;
      const cur = model.words[s.active];
      let idx;
      if (s.sel && s.sel.r === a.r && s.sel.c === a.c) idx = cur.dir === 'A' ? at.D ?? at.A : at.A ?? at.D;
      else if (at.A != null && at.D != null) {
        // kare iki kelimede: başı (ipucu) dokunulan kareye daha yakın olan kelime; eşitse mevcut yön
        const da = model.words[at.A].keys.indexOf(key), dd = model.words[at.D].keys.indexOf(key);
        idx = da < dd ? at.A : dd < da ? at.D : at[cur.dir];
      } else idx = at.A ?? at.D;
      // doğru bilinen kelimeye gerek yok: karedeki diğer (bitmemiş) kelimeyi seç, ikisi de doğruysa dokunuşu yok say
      if (wordOk(s, idx)) {
        const other = idx === at.A ? at.D : at.A;
        if (other == null || wordOk(s, other)) return s;
        idx = other;
      }
      // kilitli kareye (yazılamaz) imleç koyma: kelimede dokunulan kareye en yakın yazılabilir kareye git
      if (locked(s, key)) {
        const w = model.words[idx];
        const j = nearestOpen(s, w, key);
        return { ...s, active: idx, sel: { r: w.cells[j][0], c: w.cells[j][1] } };
      }
      return { ...s, active: idx, sel: { r: a.r, c: a.c } };
    }
    case 'selectWord':
      if (wordOk(s, a.idx)) return s; // doğru kelimenin ipucu: seçime gerek yok
      return selectWordState(s, a.idx);
    case 'step': {
      const pos = model.order.indexOf(s.active);
      const n = model.order.length;
      // Sadece henüz bilinmemiş (yeşil olmayan) kelimeler arasında gez
      for (let step = 1; step <= n; step++) {
        const idx = model.order[(((pos + a.delta * step) % n) + n) % n];
        if (wordStatus(model.words[idx], s.entries, model.solution) !== 'ok') return selectWordState(s, idx);
      }
      return s;
    }
    case 'type': {
      if (s.solved || !s.sel) return s;
      const w = model.words[s.active];
      const key = `${s.sel.r},${s.sel.c}`;
      let entries = s.entries;
      if (!locked(s, key, w.dir)) entries = { ...entries, [key]: a.ch };
      let ns = { ...s, entries };
      const i = w.keys.indexOf(key);
      // sıradaki boş kare (ileri, sonra kelimenin başı)
      let j = w.keys.findIndex((k, idx) => idx > i && !entries[k]);
      if (j < 0) j = w.keys.findIndex((k, idx) => idx < i && !entries[k]);
      if (j >= 0) {
        ns.sel = { r: w.cells[j][0], c: w.cells[j][1] };
      } else if (wordStatus(w, entries, model.solution) === 'ok') {
        // kelime doğru: boş karesi olan sıradaki kelimeye geç
        const nx = nextOpenWord(ns, s.active);
        if (nx != null) ns = selectWordState(ns, nx);
      } else {
        let k2 = i + 1;
        while (k2 < w.keys.length && locked(ns, w.keys[k2])) k2++;
        if (k2 < w.keys.length) ns.sel = { r: w.cells[k2][0], c: w.cells[k2][1] };
      }
      return checkSolved(ns);
    }
    case 'del': {
      if (s.solved || !s.sel) return s;
      const w = model.words[s.active];
      const key = `${s.sel.r},${s.sel.c}`;
      if (s.entries[key] && !locked(s, key, w.dir)) {
        return { ...s, entries: { ...s.entries, [key]: undefined } };
      }
      const i = w.keys.indexOf(key);
      for (let j = i - 1; j >= 0; j--) {
        const pk = w.keys[j];
        if (locked(s, pk, w.dir)) continue;
        return {
          ...s,
          sel: { r: w.cells[j][0], c: w.cells[j][1] },
          entries: s.entries[pk] ? { ...s.entries, [pk]: undefined } : s.entries,
        };
      }
      return s;
    }
    case 'clearWord': {
      const w = model.words[s.active];
      const entries = { ...s.entries };
      for (const k of w.keys) if (!locked(s, k, w.dir)) entries[k] = undefined;
      return { ...s, entries, sel: { r: w.cells[0][0], c: w.cells[0][1] } };
    }
    case 'revealLetter': {
      if (!s.sel) return s;
      const key = `${s.sel.r},${s.sel.c}`;
      return checkSolved({
        ...s,
        entries: { ...s.entries, [key]: model.solution[key] },
        revealed: { ...s.revealed, [key]: true },
      });
    }
    case 'revealWord': {
      const w = model.words[s.active];
      const entries = { ...s.entries };
      const revealed = { ...s.revealed };
      for (const k of w.keys) {
        if (entries[k] !== model.solution[k]) revealed[k] = true;
        entries[k] = model.solution[k];
      }
      return checkSolved({ ...s, entries, revealed });
    }
    case 'reset':
      return { ...s, entries: {}, revealed: {}, solved: false };
    default:
      return s;
  }
}

