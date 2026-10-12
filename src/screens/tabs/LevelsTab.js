// Seviyeler sekmesi: her seviyenin ilerlemesi ve oyuncunun seviyesini seçme
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { CheckIcon } from '../../components/UiIcons';
import { LEVELS, getStats, getProfile, setProfileLevel, LEVEL_GOAL } from '../../engine/session';
import { GAMES } from '../../games';
import { ui, fonts } from '../../theme';

const ABOUT = {
  A1: 'Temel günlük kelimeler: aile, renkler, sayılar, yiyecekler.',
  A2: 'Gündelik hayat, alışveriş, seyahat ve iş kelimeleri.',
  B1: 'Duygular, fikirler ve olayları anlatmak için kelimeler.',
  B2: 'Haber, iş ve akademik metinlerde sık geçen kelimeler.',
  C1: 'İleri düzey, soyut ve resmi kelimeler.',
  C2: 'Nadir, edebi ve uzmanlık gerektiren kelimeler.',
  MIX: 'Tüm seviyelerden karışık kelimeler.',
};

export default function LevelsTab() {
  const [, force] = useState(0);
  const stats = getStats();
  const profile = getProfile();
  // Seviye başına tüm oyunlarda çözülen bulmaca
  const solvedAt = (id) => GAMES.reduce((a, g) => a + (g.levelState(id)?.solvedCount || 0), 0);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>Seviyeler</Text>
      <Text style={styles.lead}>
        Kendi seviyeni seç: bütün oyunlar doğrudan bu seviyede açılır. Her seviye öncekilerin kelimelerini de kapsar. Kendi seviyende {LEVEL_GOAL} bulmaca çözünce otomatik olarak bir üst seviyeye geçersin.
      </Text>
      {LEVELS.map((lv) => {
        const done = Math.max(stats.levelSolved[lv.id] || 0, solvedAt(lv.id));
        const pct = Math.min(1, done / LEVEL_GOAL);
        const on = profile.level === lv.id;
        return (
          <Pressable
            key={lv.id}
            onPress={() => {
              setProfileLevel(lv.id);
              force((x) => x + 1);
            }}
            style={({ pressed }) => [styles.card, on && styles.cardOn, pressed && { backgroundColor: ui.cardHi }]}
          >
            <View style={[styles.ring, on && { backgroundColor: ui.teal }]}>
              <Text style={styles.ringText}>{lv.mixed ? 'MIX' : lv.id}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{lv.title}</Text>
                <Text style={styles.en}>{lv.subtitle}</Text>
              </View>
              <Text style={styles.about}>{ABOUT[lv.id]}</Text>
              <View style={styles.barRow}>
                <View style={styles.bar}>
                  <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
                </View>
                <Text style={styles.count}>
                  {Math.min(done, LEVEL_GOAL)}/{LEVEL_GOAL}
                </Text>
              </View>
            </View>
            {on ? (
              <View style={styles.selected}>
                <CheckIcon size={14} color={ui.bg} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: fonts.sansBlack, fontSize: 28, color: ui.white, marginTop: 6 },
  lead: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: ui.muted, marginTop: 4, marginBottom: 14 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ui.card, borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: ui.border, marginBottom: 10,
  },
  cardOn: { borderColor: ui.teal, borderWidth: 2 },
  ring: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: ui.teal, alignItems: 'center', justifyContent: 'center' },
  ringText: { fontFamily: fonts.sansBlack, fontSize: 15, color: ui.white },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  title: { fontFamily: fonts.sansBold, fontSize: 17, color: ui.white },
  en: { fontFamily: fonts.sans, fontSize: 12.5, color: ui.tealSoft },
  about: { fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 17, color: ui.muted, marginTop: 2 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  bar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: ui.border, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: ui.teal },
  count: { fontFamily: fonts.sansBold, fontSize: 12, color: ui.text },
  selected: { position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: ui.teal, alignItems: 'center', justifyContent: 'center' },
});
