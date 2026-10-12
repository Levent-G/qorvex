// Profil sekmesi: istatistikler, haftalık grafik, oyun başına çözülenler, ayarlar
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Linking } from 'react-native';
import QorvexMark from '../../components/QorvexMark';
import GameIcon from '../../components/GameIcon';
import { FlameIcon, TrophyIcon, BookOpenIcon, ChevronRight, CheckIcon } from '../../components/UiIcons';
import { getStats, getProfile, notebookWords, getLevel } from '../../engine/session';
import { GAMES, gameTotals } from '../../games';
import { ui, fonts } from '../../theme';

const DAYS = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

function Stat({ icon, value, label }) {
  return (
    <View style={styles.stat}>
      {icon}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ProfileTab({ onTab }) {
  const stats = getStats();
  const profile = getProfile();
  const lv = getLevel(profile.level);
  const words = notebookWords();
  const maxDay = Math.max(1, ...stats.week.map((d) => d.count));

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <QorvexMark height={56} ink={ui.white} clue={ui.teal} cell={ui.card} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>Bulmaca Oyuncusu</Text>
          <Text style={styles.level}>
            Seviye {lv.mixed ? 'Karışık' : lv.id} · {lv.title}
          </Text>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat icon={<CheckIcon size={20} />} value={stats.total} label="çözülen" />
        <Stat icon={<FlameIcon size={20} />} value={stats.streak} label="günlük seri" />
        <Stat icon={<TrophyIcon size={20} />} value={stats.best} label="en uzun seri" />
        <Stat icon={<BookOpenIcon size={20} color={ui.tealSoft} />} value={words.length} label="kelime" />
      </View>

      {/* Haftalık grafik */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bu Hafta</Text>
        <View style={styles.chart}>
          {stats.week.map((d, i) => (
            <View key={i} style={styles.col}>
              <Text style={styles.colValue}>{d.count || ''}</Text>
              <View style={[styles.colBar, { height: 6 + (d.count / maxDay) * 70, backgroundColor: d.count ? ui.teal : ui.border }]} />
              <Text style={[styles.colDay, i === 6 && { color: ui.white }]}>{DAYS[d.day]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Oyun başına */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Oyunlar</Text>
        {GAMES.map((g) => {
          const t = gameTotals(g);
          return (
            <View key={g.id} style={styles.gameRow}>
              <GameIcon id={g.id} size={34} />
              <Text style={styles.gameName}>{g.title}</Text>
              <Text style={styles.gameCount}>{t.solved}</Text>
            </View>
          );
        })}
      </View>

      {/* Ayarlar */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ayarlar</Text>
        <Pressable style={styles.setRow} onPress={() => onTab('levels')}>
          <Text style={styles.setText}>Seviyemi değiştir</Text>
          <Text style={styles.setValue}>{lv.mixed ? 'MIX' : lv.id}</Text>
          <ChevronRight size={16} />
        </Pressable>
        <Pressable style={styles.setRow} onPress={() => onTab('notebook')}>
          <Text style={styles.setText}>Kelime defteri</Text>
          <Text style={styles.setValue}>{words.length}</Text>
          <ChevronRight size={16} />
        </Pressable>
        <Pressable style={[styles.setRow, { borderBottomWidth: 0 }]} onPress={() => Linking.openURL('https://qorvex.expo.app/privacy')}>
          <Text style={styles.setText}>Gizlilik politikası</Text>
          <ChevronRight size={16} />
        </Pressable>
      </View>
      <Text style={styles.footer}>QORVEX · Think · Solve · Learn · İlerlemen yalnızca bu cihazda saklanır</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  avatar: {
    width: 76, height: 76, borderRadius: 38, borderWidth: 2.5, borderColor: ui.teal, backgroundColor: ui.card,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontFamily: fonts.sansBlack, fontSize: 22, color: ui.white },
  level: { fontFamily: fonts.sansMedium, fontSize: 13.5, color: ui.tealSoft, marginTop: 2 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 18 },
  stat: { flex: 1, backgroundColor: ui.card, borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: ui.border, gap: 2 },
  statValue: { fontFamily: fonts.sansBlack, fontSize: 20, color: ui.white },
  statLabel: { fontFamily: fonts.sans, fontSize: 10.5, color: ui.muted, textAlign: 'center' },
  card: { backgroundColor: ui.card, borderRadius: 16, padding: 14, marginTop: 14, borderWidth: 1, borderColor: ui.border },
  cardTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: ui.white, marginBottom: 10 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 110 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  colValue: { fontFamily: fonts.sansBold, fontSize: 11, color: ui.tealSoft },
  colBar: { width: 18, borderRadius: 6 },
  colDay: { fontFamily: fonts.sansBold, fontSize: 11, color: ui.muted },
  gameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderColor: ui.border },
  gameName: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 14, color: ui.text },
  gameCount: { fontFamily: fonts.sansBlack, fontSize: 16, color: ui.white },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderColor: ui.border },
  setText: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 15, color: ui.text },
  setValue: { fontFamily: fonts.sansBold, fontSize: 14, color: ui.teal },
  footer: { fontFamily: fonts.sans, fontSize: 11.5, color: ui.muted, textAlign: 'center', marginTop: 18 },
});
