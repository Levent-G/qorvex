// Kelime Merdiveni tahtası durum makinesi (saf fonksiyonlar, test edilebilir)
// Satırlar: 0 = başlangıç (verilir), son = hedef (verilir), aradakiler doldurulur.

export const key = (row, col) => `${row},${col}`;
export const fillableRows = (p) => p.rungs.map((_, i) => i).slice(1, -1);

export function rowStatus(p, entries, row) {
  const ans = p.rungs[row].answer;
  let wrong = 0;
  for (let c = 0; c < p.len; c++) {
    const v = entries[key(row, c)];
    if (!v) return null;
    if (v !== ans[c]) wrong++;
  }
  if (!wrong) return 'ok';
  return wrong <= Math.max(1, Math.floor(p.len / 3)) ? 'close' : 'bad';
}

// İpuçlu seviyelerde (p.hint) değişmeyen harfler otomatik dolar ve kilitlenir;
// kullanıcı yalnızca oklu kareye (değişen harf) yazar.
export function fixedCells(p) {
  const fixed = {};
  if (!p.hint) return fixed;
  for (const row of fillableRows(p)) {
    const { answer, change } = p.rungs[row];
    for (let c = 0; c < p.len; c++) if (c !== change) fixed[key(row, c)] = answer[c];
  }
  return fixed;
}

// Kilitli: açılmış / sabit harf ya da basamağı doğru bilinmiş kare (doğru kelime bir daha silinmez)
const isLocked = (s, k) => !!s.revealed[k] || !!s.fixed[k] || rowStatus(s.p, s.entries, Number(k.split(',')[0])) === 'ok';

function firstEmptyCol(p, entries, row, fixed = {}) {
  for (let c = 0; c < p.len; c++) if (!entries[key(row, c)] && !fixed[key(row, c)]) return c;
  for (let c = 0; c < p.len; c++) if (!fixed[key(row, c)]) return c;
  return 0;
}

export function initState(p, entries = {}, revealed = {}) {
  const fixed = fixedCells(p);
  entries = { ...entries, ...fixed };
  const rows = fillableRows(p);
  const row = rows.find((r) => rowStatus(p, entries, r) !== 'ok') ?? rows[0];
  return checkSolved({ p, entries, revealed, fixed, solved: false, sel: { row, col: firstEmptyCol(p, entries, row, fixed) } });
}

function checkSolved(s) {
  const solved = fillableRows(s.p).every((r) => rowStatus(s.p, s.entries, r) === 'ok');
  return solved === s.solved ? s : { ...s, solved };
}

function nextOpenRow(s, from) {
  const rows = fillableRows(s.p);
  const after = rows.filter((r) => r > from).concat(rows.filter((r) => r < from));
  return (
    after.find((r) => Array.from({ length: s.p.len }, (_, c) => !s.entries[key(r, c)]).some(Boolean)) ??
    after.find((r) => rowStatus(s.p, s.entries, r) !== 'ok') ??
    null
  );
}

export function reducer(s, a) {
  const { p } = s;
  switch (a.type) {
    case 'tap': {
      if (!fillableRows(p).includes(a.row)) return s;
      if (rowStatus(p, s.entries, a.row) === 'ok') return s; // doğru basamak: yazılamaz, seçime gerek yok
      // kilitli kareye dokunulursa basamağın yazılabilir karesine git
      const col = s.fixed[key(a.row, a.col)] ? firstEmptyCol(p, s.entries, a.row, s.fixed) : a.col;
      return { ...s, sel: { row: a.row, col } };
    }
    case 'selectRow': {
      if (!fillableRows(p).includes(a.row)) return s;
      if (rowStatus(p, s.entries, a.row) === 'ok') return s;
      return { ...s, sel: { row: a.row, col: firstEmptyCol(p, s.entries, a.row, s.fixed) } };
    }
    case 'step': {
      const rows = fillableRows(p);
      const i = rows.indexOf(s.sel.row);
      for (let k = 1; k <= rows.length; k++) {
        const r = rows[(((i + a.delta * k) % rows.length) + rows.length) % rows.length];
        if (rowStatus(p, s.entries, r) !== 'ok') return { ...s, sel: { row: r, col: firstEmptyCol(p, s.entries, r, s.fixed) } };
      }
      return s;
    }
    case 'type': {
      if (s.solved) return s;
      const { row } = s.sel;
      // kilitli karedeysek yazılabilir kareye kay
      const col = s.fixed[key(row, s.sel.col)] ? firstEmptyCol(p, s.entries, row, s.fixed) : s.sel.col;
      const k = key(row, col);
      const entries = isLocked(s, k) ? s.entries : { ...s.entries, [k]: a.ch };
      let ns = { ...s, entries, sel: { row, col } };
      let next = -1;
      for (let c = col + 1; c < p.len; c++) if (!entries[key(row, c)]) { next = c; break; }
      if (next < 0) for (let c = 0; c < col; c++) if (!entries[key(row, c)]) { next = c; break; }
      if (next >= 0) ns.sel = { row, col: next };
      else if (rowStatus(p, entries, row) === 'ok') {
        const r = nextOpenRow(ns, row);
        if (r != null) ns.sel = { row: r, col: firstEmptyCol(p, entries, r, s.fixed) };
      } else {
        let c2 = col + 1;
        while (c2 < p.len && s.fixed[key(row, c2)]) c2++;
        if (c2 < p.len) ns.sel = { row, col: c2 };
      }
      return checkSolved(ns);
    }
    case 'del': {
      if (s.solved) return s;
      const { row, col } = s.sel;
      const k = key(row, col);
      if (s.entries[k] && !isLocked(s, k)) return { ...s, entries: { ...s.entries, [k]: undefined } };
      for (let c = col - 1; c >= 0; c--) {
        const pk = key(row, c);
        if (isLocked(s, pk)) continue;
        return { ...s, sel: { row, col: c }, entries: s.entries[pk] ? { ...s.entries, [pk]: undefined } : s.entries };
      }
      return s;
    }
    case 'clearRow': {
      const entries = { ...s.entries };
      for (let c = 0; c < p.len; c++) if (!isLocked(s, key(s.sel.row, c))) entries[key(s.sel.row, c)] = undefined;
      return { ...s, entries, sel: { row: s.sel.row, col: firstEmptyCol(p, entries, s.sel.row, s.fixed) } };
    }
    case 'revealLetter': {
      const k = key(s.sel.row, s.sel.col);
      const ch = p.rungs[s.sel.row].answer[s.sel.col];
      return checkSolved({ ...s, entries: { ...s.entries, [k]: ch }, revealed: { ...s.revealed, [k]: true } });
    }
    case 'revealRow': {
      const entries = { ...s.entries };
      const revealed = { ...s.revealed };
      const ans = p.rungs[s.sel.row].answer;
      for (let c = 0; c < p.len; c++) {
        const k = key(s.sel.row, c);
        if (entries[k] !== ans[c] && !s.fixed[k]) revealed[k] = true;
        entries[k] = ans[c];
      }
      return checkSolved({ ...s, entries, revealed });
    }
    case 'reset':
      return initState(p, {}, {});
    default:
      return s;
  }
}
