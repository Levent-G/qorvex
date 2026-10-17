// Kullanıcı ayarları: tema, yazı boyutu, günlük hatırlatma (cihaz deposunda)
import { Appearance, Platform, Alert } from 'react-native';
import { getStore, persist } from './storage';
import { textScale } from './prelude';

export const TEXT_SCALES = [
  { k: 1, label: 'Normal' },
  { k: 1.15, label: 'Büyük' },
  { k: 1.3, label: 'Çok büyük' },
];
export const THEMES = [
  { id: 'system', label: 'Sistem' },
  { id: 'light', label: 'Açık' },
  { id: 'dark', label: 'Koyu' },
];

export function getSettings() {
  const s = getStore();
  const st = s.settings || (s.settings = {});
  // varsayılan açık tema; kullanıcı kendisi seçmediyse (eski kayıtta 'system' olsa da) açık kalsın
  if (!st.theme || (st.theme === 'system' && !st.themePicked)) st.theme = 'light';
  if (!st.textScale) st.textScale = 1;
  if (!st.reminder) st.reminder = { on: false, hour: 20, minute: 0 };
  return st;
}

// ayar değişince arayüz yeniden kurulsun diye
const listeners = new Set();
export function onSettingsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const emit = () => listeners.forEach((f) => f());

// açılışta çağrılır (depo yüklendikten sonra)
export function applySettingsAtBoot() {
  const st = getSettings();
  textScale.k = st.textScale;
  if (Platform.OS === 'ios') Appearance.setColorScheme(st.theme === 'system' ? 'unspecified' : st.theme);
}

export function setTheme(mode) {
  const st = getSettings();
  st.theme = mode;
  st.themePicked = true;
  persist();
  if (Platform.OS === 'ios') {
    Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
    emit();
  } else {
    Alert.alert('Tema kaydedildi', 'Yeni tema, uygulamayı kapatıp yeniden açtığında uygulanır.');
  }
}

export function setTextScale(k) {
  getSettings().textScale = k;
  textScale.k = k;
  persist();
  emit();
}

export function setReminder(patch) {
  const r = getSettings().reminder;
  Object.assign(r, patch);
  persist(); // görünümü değiştirmez; yeniden kurulum gerekmez
  return r;
}
