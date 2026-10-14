// Sekmeli kabuk: üst başlık (QORVEX, profil) ve alt sekme çubuğu — "Puzzle Club" tasarımı
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { HomeIcon, GamepadIcon, BookOpenIcon, BarsIcon, PersonIcon, ChevronRight } from './UiIcons';
import { ui, fonts } from '../theme';

export const TABS = [
  { id: 'home', label: 'Ana Sayfa', Icon: HomeIcon },
  { id: 'games', label: 'Oyunlar', Icon: GamepadIcon },
  { id: 'notebook', label: 'Kelime Defteri', Icon: BookOpenIcon },
  { id: 'levels', label: 'Seviyeler', Icon: BarsIcon },
  { id: 'profile', label: 'Profil', Icon: PersonIcon },
];

export function TopHeader({ insetTop, onTab, levelId }) {
  return (
    <View style={[styles.header, { paddingTop: insetTop + 4 }]}>
      {/* sol boşluk: logo ortada kalsın (menü kaldırıldı; sekmeler alttaki çubukta) */}
      <View style={styles.side} />
      <View style={styles.logo}>
        <Text style={styles.logoText}>QORVEX</Text>
        <Text style={styles.logoSub}>THINK · SOLVE · LEARN</Text>
      </View>
      <Pressable onPress={() => onTab('profile')} hitSlop={12} style={[styles.side, { alignItems: 'flex-end' }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{levelId || 'A1'}</Text>
        </View>
      </Pressable>
    </View>
  );
}

export function TabBar({ active, onTab, insetBottom }) {
  return (
    <View style={[styles.tabBar, { paddingBottom: insetBottom + 6 }]}>
      {TABS.map((t) => {
        const on = active === t.id;
        const color = on ? ui.teal : ui.muted;
        return (
          <Pressable key={t.id} onPress={() => onTab(t.id)} style={styles.tab} hitSlop={4}>
            <t.Icon size={24} color={color} filled={on && t.id === 'home'} />
            <Text style={[styles.tabText, { color }]} numberOfLines={1}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Sekme sayfası başlığı (ör. "Oyunlar" + sağda bağlantı)
export function SectionTitle({ title, action, onAction, style }) {
  return (
    <View style={[styles.sectionRow, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={styles.sectionAction}>{action}</Text>
          <ChevronRight size={14} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, backgroundColor: ui.bg },
  side: { width: 48 },
  logo: { flex: 1, alignItems: 'center' },
  logoText: { fontFamily: fonts.sansBlack, fontSize: 26, letterSpacing: 4, color: ui.white },
  logoSub: { fontFamily: fonts.sansBold, fontSize: 8.5, letterSpacing: 2.4, color: ui.tealSoft, marginTop: -2 },
  avatar: {
    width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: ui.teal, backgroundColor: ui.card,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.sansBlack, fontSize: 12, color: ui.white },
  tabBar: { flexDirection: 'row', backgroundColor: ui.bgDeep, borderTopWidth: 1, borderColor: ui.border, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  tabText: { fontFamily: fonts.sansMedium, fontSize: 10.5 },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 20, color: ui.white },
  sectionAction: { fontFamily: fonts.sansBold, fontSize: 13, color: ui.teal },
});
