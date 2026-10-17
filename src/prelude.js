// Ekran modüllerinden ÖNCE yüklenir (index.js'te ilk import): tema renkleri + yazı boyutu altyapısı.
// - iOS: renk token'ları DynamicColorIOS olur; tema değişimi Appearance.setColorScheme ile anında uygulanır.
// - Yazı boyutu: StyleSheet.create'teki fontSize/lineHeight değerleri ölçek çarpanını okuyan getter'a çevrilir;
//   ayar değişince ekran yeniden kurulur (remount) ve yeni boyut anında görünür.
import { StyleSheet, Platform } from 'react-native';
import { installDynamicTheme } from './theme';

export const textScale = { k: 1 };

const SCALED = ['fontSize', 'lineHeight'];
const create = StyleSheet.create;
StyleSheet.create = (obj) => {
  for (const key in obj) {
    const st = obj[key];
    if (!st || typeof st !== 'object' || Object.isFrozen(st) || typeof st.fontSize !== 'number') continue;
    for (const p of SCALED) {
      const d = Object.getOwnPropertyDescriptor(st, p);
      if (!d || d.get || typeof d.value !== 'number') continue;
      const base = d.value;
      Object.defineProperty(st, p, { get: () => (textScale.k === 1 ? base : Math.round(base * textScale.k * 2) / 2), enumerable: true, configurable: true });
    }
  }
  return create.call(StyleSheet, obj);
};

if (Platform.OS === 'ios') installDynamicTheme();
