// Ana sekmeli ekran: üst başlık + seçili sekme + alt sekme çubuğu
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopHeader, TabBar } from '../components/TabChrome';
import HomeTab from './tabs/HomeTab';
import StatsTab from './tabs/StatsTab';
import NotebookTab from './tabs/NotebookTab';
import LevelsTab from './tabs/LevelsTab';
import ProfileTab from './tabs/ProfileTab';
import { getProfile } from '../engine/session';
import { ed } from '../theme';

export default function MainTabs({ tab, onTab, onOpenLevels, onOpenDaily, onOpenReview, onOpenRoute }) {
  const insets = useSafeAreaInsets();
  let body;
  if (tab === 'stats') body = <StatsTab />;
  else if (tab === 'notebook') body = <NotebookTab onOpenReview={onOpenReview} />;
  else if (tab === 'levels') body = <LevelsTab onPlay={() => onOpenLevels('arrow')} />;
  else if (tab === 'profile') body = <ProfileTab onTab={onTab} />;
  else body = <HomeTab onOpenLevels={onOpenLevels} onOpenDaily={onOpenDaily} onTab={onTab} onOpenRoute={onOpenRoute} />;
  return (
    <View style={styles.root}>
      <TopHeader insetTop={insets.top} onTab={onTab} levelId={getProfile().level} />
      <View style={{ flex: 1 }}>{body}</View>
      <TabBar active={tab} onTab={onTab} insetBottom={insets.bottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ed.bg },
});
