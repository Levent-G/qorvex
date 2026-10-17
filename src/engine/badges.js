// Rozetler: her biri bir sayaç ve hedef. ctx = session.badgeContext() (saf, test edilebilir)
export const PUZZLE_GAMES = ['arrow', 'crossword', 'codeword', 'spiral', 'ws', 'ladder', 'jumble', 'cryptogram', 'picture'];

export const BADGES = [
  { id: 'first', emoji: '🧩', title: 'İlk Adım', desc: 'İlk bulmacanı çöz', goal: 1, value: (c) => c.total },
  { id: 'solve10', emoji: '🔟', title: 'Isınma Turu', desc: '10 bulmaca çöz', goal: 10, value: (c) => c.total },
  { id: 'solve50', emoji: '📰', title: 'Bulmaca Kurdu', desc: '50 bulmaca çöz', goal: 50, value: (c) => c.total },
  { id: 'solve200', emoji: '🏛️', title: 'Bulmaca Ustası', desc: '200 bulmaca çöz', goal: 200, value: (c) => c.total },
  { id: 'streak3', emoji: '🔥', title: 'Üç Gün Üst Üste', desc: '3 günlük seri yap', goal: 3, value: (c) => c.best },
  { id: 'streak7', emoji: '📅', title: 'Bir Hafta', desc: '7 günlük seri yap', goal: 7, value: (c) => c.best },
  { id: 'streak30', emoji: '🌙', title: 'Bir Ay Kesintisiz', desc: '30 günlük seri yap', goal: 30, value: (c) => c.best },
  { id: 'clean1', emoji: '✨', title: 'Yardımsız', desc: 'Bir bulmacayı ipucusuz çöz', goal: 1, value: (c) => c.clean },
  { id: 'clean10', emoji: '💎', title: 'Saf Zekâ', desc: '10 bulmacayı ipucusuz çöz', goal: 10, value: (c) => c.clean },
  { id: 'explorer', emoji: '🧭', title: 'Kaşif', desc: '5 farklı oyun türü çöz', goal: 5, value: (c) => c.gameKinds },
  { id: 'allgames', emoji: '🎯', title: 'Hepsini Denedim', desc: '9 oyunun hepsini çöz', goal: 9, value: (c) => c.gameKinds },
  { id: 'fast', emoji: '⚡', title: 'Hız Rekortmeni', desc: 'Bir Çengel Bulmacayı 3 dakikadan kısa sürede çöz', goal: 1, value: (c) => (c.arrowFastest != null && c.arrowFastest <= 180 ? 1 : 0) },
  { id: 'book10', emoji: '📖', title: 'Defter Açıldı', desc: 'Defterine 10 kelime ekle', goal: 10, value: (c) => c.notebook },
  { id: 'learn25', emoji: '🎓', title: 'Kelime Avcısı', desc: '25 kelimeyi öğren', goal: 25, value: (c) => c.learned },
  { id: 'learn100', emoji: '📚', title: 'Sözlük Gibi', desc: '100 kelimeyi öğren', goal: 100, value: (c) => c.learned },
  { id: 'review1', emoji: '🃏', title: 'İlk Tekrar', desc: 'Bir tekrar turu bitir', goal: 1, value: (c) => c.reviewSessions },
  { id: 'perfect', emoji: '💯', title: 'Kusursuz Tekrar', desc: 'Tekrar turunda hepsini bil', goal: 1, value: (c) => c.reviewPerfect },
  { id: 'ta10', emoji: '⏱️', title: 'Hızlı Düşünür', desc: 'Zamana karşı modda 10 doğru yap', goal: 10, value: (c) => c.taBest },
  { id: 'ta20', emoji: '🌩️', title: 'Şimşek', desc: 'Zamana karşı modda 20 doğru yap', goal: 20, value: (c) => c.taBest },
  { id: 'pron10', emoji: '🎤', title: 'Dili Dönüyor', desc: '10 kelimeyi doğru telaffuz et', goal: 10, value: (c) => c.pronOk },
  { id: 'wotd7', emoji: '☀️', title: 'Günün Kelimesi Tutkunu', desc: '7 farklı günde günün kelimesine bak', goal: 7, value: (c) => c.wotdDays },
  { id: 'weekly1', emoji: '🏆', title: 'Haftanın Şampiyonu', desc: 'Bir haftalık meydan okumayı bitir', goal: 1, value: (c) => c.weeklyDone },
  { id: 'levelup', emoji: '🚀', title: 'Seviye Atladım', desc: 'Bir seviyeyi tamamla', goal: 1, value: (c) => c.levelsDone },
];

// Henüz kazanılmamış ama hedefe ulaşmış rozetler
export function newlyEarned(ctx, earned) {
  return BADGES.filter((b) => !earned[b.id] && b.value(ctx) >= b.goal);
}

// Vitrin listesi: kazanılanlar önce (en yeni), sonra ilerlemesi en yüksek olanlar
export function badgeList(ctx, earned) {
  return BADGES.map((b) => {
    const v = b.value(ctx) || 0;
    return { ...b, at: earned[b.id] || null, progress: Math.min(1, v / b.goal), cur: Math.min(v, b.goal) };
  }).sort((a, b) => (b.at ? 1 : 0) - (a.at ? 1 : 0) || (b.at || 0) - (a.at || 0) || b.progress - a.progress);
}
