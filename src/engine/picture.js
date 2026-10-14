// Resimli Bulmaca: gazetedeki gibi ortasında fotoğraf olan çengel bulmaca ("Resimdeki nesne ne?").
// Pexels sonuçlarından nesnenin ana konu olduğu fotoğrafı seçer. Saf fonksiyonlar (test edilebilir).

/** Izgaranın ortasındaki fotoğraf alanı (yaklaşık yarı genişlik, 3 satır). */
export function photoBlock(w, h) {
  const bw = w >= 9 ? 5 : 4;
  const bh = 3;
  return { r: Math.floor((h - bh) / 2), c: Math.floor((w - bw) / 2), w: bw, h: bh };
}

/**
 * Fotoğrafı anlatan metinde kelime ana konu mu? İlk `within` kelimede (çoğul eki dahil) geçmeli.
 * Dönüş: konumu (0 = ilk kelime) ya da -1.
 */
export function altPosition(alt, word, within = 6) {
  const w = word.toLowerCase();
  const toks = String(alt || '').toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean);
  for (let i = 0; i < Math.min(within, toks.length); i++) {
    const t = toks[i];
    if (t === w || t === w + 's' || t === w + 'es' || (w.endsWith('y') && t === w.slice(0, -1) + 'ies')) return i;
  }
  return -1;
}

/** Pexels sonuçlarından nesnenin ana konu olduğu en iyi fotoğrafı seç (yoksa null). */
export function pickPhoto(photos, word) {
  let best = null, bestPos = 99;
  for (const p of photos || []) {
    const pos = altPosition(p.alt, word);
    if (pos >= 0 && pos < bestPos) {
      bestPos = pos;
      best = p;
    }
  }
  if (!best) return null;
  return {
    url: best.src?.large || best.src?.medium,
    by: best.photographer || '',
    link: best.url || '',
    alt: best.alt || '',
  };
}
