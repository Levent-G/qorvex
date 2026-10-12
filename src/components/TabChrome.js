// Sekmeli kabuk: üst başlık (menü, QORVEX, profil) ve alt sekme çubuğu — "Puzzle Club" tasarımı
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Linking } from 'react-native';
import { HomeIcon, GamepadIcon, BookOpenIcon, BarsIcon, PersonIcon, MenuIcon, ChevronRight } from './UiIcons';
import QorvexMark from './QorvexMark';
import { ui, fonts } from '../theme';

export const TABS = [
  { id: 'home', label: 'Ana Sayfa', Icon: HomeIcon },
  { id: 'games', label: 'Oyunlar', Icon: GamepadIcon },
  { id: 'notebook', label: 'Kelime Defteri', Icon: BookOpenIcon },
  { id: 'levels', label: 'Seviyeler', Icon: BarsIcon },
  { id: 'profile', label: 'Profil', Icon: PersonIcon },
];

export function TopHeader({ insetTop, onTab, levelId }) {
  const [menu, setMenu] = useState(false);
  return (
    <View style={[styles.header, { paddingTop: insetTop + 4 }]}>
      <Pressable onPress={() => setMenu(true)} hitSlop={12} style={styles.side}>
        <MenuIcon />
      </Pressable>
      <View style={styles.logo}>
        <Text style={styles.logoText}>QORVEX</Text>
        <Text style={styles.logoSub}>THINK · SOLVE · LEARN</Text>
      </View>
      <Pressable onPress={() => onTab('profile')} hitSlop={12} style={[styles.side, { alignItems: 'flex-end' }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{levelId || 'A1'}</Text>
        </View>
      </Pressable>

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenu(false)}>
          <View style={[styles.drawer, { paddingTop: insetTop + 16 }]}>
            <View style={styles.drawerHead}>
              <QorvexMark height={48} ink={ui.white} clue={ui.teal} cell={ui.bg} />
              <View>
                <Text style={styles.logoText}>QORVEX</Text>
                <Text style={styles.logoSub}>İNGİLİZCE BULMACA</Text>
              </View>
            </View>
            {TABS.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => {
                  setMenu(false);
                  onTab(t.id);
                }}
                style={({ pressed }) => [styles.drawerItem, pressed && { backgroundColor: ui.cardHi }]}
              >
                <t.Icon size={22} color={ui.tealSoft} />
                <Text style={styles.drawerText}>{t.label}</Text>
                <ChevronRight size={16} color={ui.muted} />
              </Pressable>
            ))}
            <Pressable onPress={() => Linking.openURL('https://qorvex.expo.app/privacy')} style={styles.drawerItem}>
              <Text style={[styles.drawerText, { color: ui.muted, marginLeft: 0 }]}>Gizlilik politikası</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
  backdrop: { flex: 1, backgroundColor: 'rgba(4,10,20,0.6)' },
  drawer: { width: '78%', height: '100%', backgroundColor: ui.bg, paddingHorizontal: 18, borderRightWidth: 1, borderColor: ui.border },
  drawerHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderColor: ui.border, gap: 12 },
  drawerText: { flex: 1, fontFamily: fonts.sansBold, fontSize: 16, color: ui.text },
  tabBar: { flexDirection: 'row', backgroundColor: ui.bgDeep, borderTopWidth: 1, borderColor: ui.border, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  tabText: { fontFamily: fonts.sansMedium, fontSize: 10.5 },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 20, color: ui.white },
  sectionAction: { fontFamily: fonts.sansBold, fontSize: 13, color: ui.teal },
});
