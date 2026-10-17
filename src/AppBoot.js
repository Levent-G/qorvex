// Kök bileşen: önce depo + ayarlar yüklenir, sonra uygulama modülleri (stiller doğru temayla oluşsun diye) yüklenir.
import React, { useEffect, useState } from 'react';
import { View, Platform, Appearance } from 'react-native';
import { loadStore } from './storage';
import { getSettings, applySettingsAtBoot } from './settings';
import { applyStaticTheme } from './theme';

export default function Boot() {
  const [App, setApp] = useState(null);
  useEffect(() => {
    loadStore().then(() => {
      applySettingsAtBoot();
      if (Platform.OS !== 'ios') {
        const t = getSettings().theme;
        applyStaticTheme(t === 'dark' || (t === 'system' && Appearance.getColorScheme() === 'dark'));
      }
      setApp(() => require('../App').default);
    });
  }, []);
  // açılış ekranı rengiyle aynı (app.json splash)
  if (!App) return <View style={{ flex: 1, backgroundColor: '#18324D' }} />;
  return <App />;
}
