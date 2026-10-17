// Sekmeli kabuk: üst başlık (profil, QORVEX, seviye) ve alt sekme çubuğu — "Editorial Intellect" tasarımı
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { HomeIcon, ChartIcon, BookOpenIcon, GridIcon, PersonIcon, ChevronRight, BadgeCheckIcon } from './UiIcons';
import { ed, efonts } from '../theme';

export const TABS = [
  { id: 'home', label: 'Ana Sayfa', Icon: HomeIcon },
  { id: 'stats', label: 'İstatistik', Icon: ChartIcon },
  { id: 'notebook', label: 'Kelime Defteri', Icon: BookOpenIcon },
  { id: 'levels', label: 'Seviyeler', Icon: GridIcon },
  { id: 'profile', label: 'Profil', Icon: PersonIcon },
];

export function TopHeader({ insetTop, onTab, levelId }) {
  return (
    <View style={[styles.header, { paddingTop: insetTop + 4 }]}>
      <Pressable onPress={() => onTab('profile')} hitSlop={10} style={styles.side}>
        <View style={styles.avatar}>
          <PersonIcon size={20} color={ed.onPrimary} />
        </View>
      </Pressable>
      <View style={styles.logo}>
        <Text style={styles.logoText}>QORVEX</Text>
        <Text style={styles.logoSub}>BUL · ÇÖZ · ÖĞREN</Text>
      </View>
      <Pressable onPress={() => onTab('levels')} hitSlop={10} style={[styles.side, { alignItems: 'flex-end' }]}>
        <View style={styles.levelPill}>
          <BadgeCheckIcon size={14} color={ed.accentInk} />
          <Text style={styles.levelText}>{levelId || 'A1'}</Text>
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
        const color = on ? ed.accent : ed.textMute;
        return (
          <Pressable key={t.id} onPress={() => onTab(t.id)} style={styles.tab} hitSlop={4}>
            <t.Icon size={23} color={color} filled={on && (t.id === 'home' || t.id === 'stats')} />
            <Text style={[styles.tabText, { color }, on && { fontFamily: efonts.labelBold }]} numberOfLines={1}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Sayfa başlığı: küçük etiket (kicker), serif başlık, açıklama
export function PageTitle({ kicker, title, sub, right, style }) {
  return (
    <View style={[{ marginTop: 14, marginBottom: 4 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
          <Text style={styles.pageTitle}>{title}</Text>
        </View>
        {right}
      </View>
      {sub ? <Text style={styles.pageSub}>{sub}</Text> : null}
    </View>
  );
}

// Bölüm başlığı (ör. "9 Gazete Oyunu" + sağda bağlantı)
export function SectionTitle({ title, sub, action, onAction, style }) {
  return (
    <View style={[styles.sectionRow, style]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {sub ? <Text style={styles.sectionSub}>{sub}</Text> : null}
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={styles.sectionAction}>{action}</Text>
          <ChevronRight size={13} color={ed.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, backgroundColor: ed.bg,
    borderBottomWidth: 1, borderColor: ed.border,
  },
  side: { width: 64 },
  avatar: { width: 38, height: 38, borderRadius: 11, backgroundColor: ed.primary, alignItems: 'center', justifyContent: 'center' },
  logo: { flex: 1, alignItems: 'center' },
  logoText: { fontFamily: efonts.labelBold, fontSize: 19, letterSpacing: 2.2, color: ed.text },
  logoSub: { fontFamily: efonts.labelBold, fontSize: 8.5, letterSpacing: 1.8, color: ed.accent, marginTop: -1 },
  levelPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ed.accentSoft, borderRadius: 16, paddingHorizontal: 10, height: 30 },
  levelText: { fontFamily: efonts.labelBold, fontSize: 13, color: ed.accentInk },
  tabBar: { flexDirection: 'row', backgroundColor: ed.surface, borderTopWidth: 1, borderColor: ed.border, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  tabText: { fontFamily: efonts.label, fontSize: 10 },
  kicker: { fontFamily: efonts.labelBold, fontSize: 10.5, letterSpacing: 1.4, color: ed.accent, marginBottom: 2 },
  pageTitle: { fontFamily: efonts.headlineBold, fontSize: 30, lineHeight: 36, color: ed.text },
  pageSub: { fontFamily: efonts.body, fontSize: 14, lineHeight: 20, color: ed.textSoft, marginTop: 4 },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontFamily: efonts.headlineBold, fontSize: 21, lineHeight: 26, color: ed.text },
  sectionSub: { fontFamily: efonts.body, fontSize: 12.5, color: ed.textSoft, marginTop: 1 },
  sectionAction: { fontFamily: efonts.labelBold, fontSize: 11.5, letterSpacing: 1, color: ed.accent },
});
