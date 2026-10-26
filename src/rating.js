// Uygulama içi değerlendirme isteği (Apple'ın kendi penceresi). Seyrek ve iyi bir anda:
// en az 10 bulmaca çözülmüş, az önce bir bulmaca bitmiş, son istekten 120 gün geçmiş, toplam en fazla 3 kez.
// Apple da yılda en fazla 3 kez gösterir; pencere çıkmayabilir, bu normaldir.
import * as StoreReview from 'expo-store-review';
import { Linking } from 'react-native';
import { getStore, persist } from './storage';

const MIN_SOLVED = 10;
const GAP_DAYS = 120;
const MAX_ASKS = 3;
const APP_STORE_ID = '6820914894';

function meta() {
  const s = getStore();
  const m = s.meta || (s.meta = {});
  return m.review || (m.review = { count: 0, at: 0 });
}

// prevTotal: ana sayfadan oyuna girerken çözülmüş bulmaca sayısı (az önce bir bulmaca bitti mi?)
export async function maybeAskReview(prevTotal) {
  try {
    const total = getStore().stats?.total || 0;
    const r = meta();
    if (total < MIN_SOLVED || total <= prevTotal) return false;
    if (r.count >= MAX_ASKS || Date.now() - r.at < GAP_DAYS * 86400000) return false;
    if (!(await StoreReview.isAvailableAsync())) return false;
    r.count++;
    r.at = Date.now();
    persist();
    await StoreReview.requestReview();
    return true;
  } catch {
    return false;
  }
}

// Profil'deki "Uygulamayı değerlendir": doğrudan App Store yorum sayfası
export function openReviewPage() {
  Linking.openURL(`itms-apps://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`).catch(() =>
    Linking.openURL(`https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`),
  );
}
