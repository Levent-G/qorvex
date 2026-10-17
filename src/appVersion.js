// Sürüm takibi: App Store'da yeni sürüm var mı + güncelleyen kullanıcıya bir kez "Yenilikler" ekranı
import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import { getStore, persist } from './storage';

const BUNDLE_ID = 'com.qorvex.app';
const APP_STORE_ID = '6820914894';
const SNOOZE_DAYS = 3;

export const currentVersion = () => Constants.expoConfig?.version || '0.0.0';

// "1.10.0" > "1.9.2" → 1
export function compareVersions(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

function meta() {
  const s = getStore();
  return s.meta || (s.meta = {});
}

// Açılışta bir kez: gösterilecek yenilikler sürümü (yoksa null).
// Yeni kurulumda gösterilmez; yalnızca önceki bir sürümü kullanmış (ilerlemesi olan) kullanıcıya, sürüm başına bir kez.
export function whatsNewToShow(notesVersions) {
  const m = meta();
  const cur = currentVersion();
  const s = getStore();
  if (!m.lastVersion) {
    const used = (s.stats?.total || 0) > 0 || Object.keys(s.learn?.marked || {}).length > 0 || Object.keys(s.levels || {}).length > 0;
    m.lastVersion = used ? '1.1.0' : cur; // eski sürümlerde sürüm kaydı yoktu
    if (!used) m.whatsNewSeen = cur;
    persist();
  }
  if (compareVersions(cur, m.lastVersion) > 0) {
    m.lastVersion = cur;
    persist();
  }
  if (m.whatsNewSeen === cur || !notesVersions.includes(cur)) return null;
  return cur;
}
export function markWhatsNewSeen() {
  meta().whatsNewSeen = currentVersion();
  persist();
}

// App Store'daki son sürüm (yalnızca iOS). Yeni sürüm varsa ve kullanıcı "Sonra" demediyse { version, notes }.
export async function checkStoreUpdate() {
  if (Platform.OS !== 'ios') return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`https://itunes.apple.com/lookup?bundleId=${BUNDLE_ID}&country=tr&t=${Date.now()}`, { signal: ctrl.signal });
    clearTimeout(t);
    const json = await res.json();
    const info = json?.results?.[0];
    if (!info?.version || compareVersions(info.version, currentVersion()) <= 0) return null;
    const sn = meta().updateSnooze;
    if (sn && sn.version === info.version && Date.now() < sn.until) return null;
    return { version: info.version, notes: info.releaseNotes || '' };
  } catch {
    return null; // çevrimdışı vb.: sessizce geç
  }
}
export function snoozeUpdate(version) {
  meta().updateSnooze = { version, until: Date.now() + SNOOZE_DAYS * 86400000 };
  persist();
}
export function openStorePage() {
  Linking.openURL(`itms-apps://apps.apple.com/app/id${APP_STORE_ID}`).catch(() => Linking.openURL(`https://apps.apple.com/app/id${APP_STORE_ID}`));
}
