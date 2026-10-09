// Bulmaca tahtası durum makinesi (saf fonksiyonlar, test edilebilir)
import { wordStatus } from './model';

// ---------------- Durum makinesi ----------------
function perpOk(s, key, dir) {
  const other = (s.model.at[key] || {})[dir === 'A' ? 'D' : 'A'];
  if (other == null) return false;
  return wordStatus(s.model.words[other], s.entries, s.model.solution) === 'ok';
}
// Kilitli kare: açılmış harf ya da çapraz kelimesi doğru (yeşil) olan kare
const locked = (s, key, dir) => !!s.revealed[key] || perpOk(s, key, dir);

function checkSolved(s) {
  const { solution } = s.model;
  for (const k in solution) if (s.entries[k] !== solution[k]) return s;
  return { ...s, solved: true };
}

function firstEmpty(w, entries) {
  const j = w.keys.findIndex((k) => !entries[k]);
  return j < 0 ? 0 : j;
}

export function selectWordState(s, idx) {
  const w = s.model.words[idx];
  const j = firstEmpty(w, s.entries);
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
      else idx = at[cur.dir] ?? at.A ?? at.D;
      return { ...s, active: idx, sel: { r: a.r, c: a.c } };
    }
    case 'selectWord':
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
      } else if (i < w.keys.length - 1) {
        ns.sel = { r: w.cells[i + 1][0], c: w.cells[i + 1][1] };
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

