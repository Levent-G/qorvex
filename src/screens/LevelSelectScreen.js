// Bir oyunun seviye seçim ekranı — "Puzzle Club" tasarımı
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GamePreview } from '../components/Previews';
import GameIcon from '../components/GameIcon';
import BackBar from '../components/BackBar';
import { ArrowRight, ChevronRight } from '../components/UiIcons';
import { getGame, LEVELS, gameTotals } from '../games';
import { getProfile } from '../engine/session';
import { ui, fonts } from '../theme';

export default function LevelSelectScreen({ gameId, onBack, onPlay, onDaily }) {
  const game = getGame(gameId);
  const insets = useSafeAreaInsets();
  const [daily] = useState(() => game.peekDaily());
  const t = gameTotals(game);
  const mine = getProfile().level;

  // Oyuncunun seviyesi en üstte
  const ordered = [...LEVELS].sort((a, b) => (a.id === mine ? -1 : b.id === mine ? 1 : 0));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <GameIcon id={game.id} size={64} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>
              {game.no}. {game.kicker}
            </Text>
            <Text style={styles.title}>{game.title}</Text>
            <Text style={styles.meta}>{t.solved} bulmaca çözüldü</Text>
          </View>
        </View>
        <Text style={styles.deck}>{game.deck}</Text>

        {/* Günün bulmacası */}
        <Pressable onPress={onDaily} style={styles.daily}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.dailyTitle}>Günün Bulmacası</Text>
            <Text style={styles.dailyText}>{daily?.solved ? 'Bugünkünü çözdün ✓' : 'Herkes için aynı bulmaca, her gün yeni.'}</Text>
            <View style={styles.cta}>
              <Text style={styles.ctaText}>{daily?.solved ? 'Bak' : 'Hemen Çöz'}</Text>
              <ArrowRight size={15} />
            </View>
          </View>
          <GamePreview game={game} session={daily} size={92} />
        </Pressable>

        <Text style={styles.h2}>Seviyeler</Text>
        <Text style={styles.note}>Her seviye öncekilerin kelimelerini de kapsar. Bir bulmaca bitince yenisi gelir.</Text>

        {ordered.map((lv) => {
          const st = game.levelState(lv.id);
          const cur = st?.current;
          const started = game.started(cur);
          const status = !cur ? 'Yeni bulmaca' : cur.solved ? 'Sıradaki hazır' : started ? `No. ${cur.puzzle.no} · devam et` : `No. ${cur.puzzle.no}`;
          const isMine = lv.id === mine;
          return (
            <Pressable
              key={lv.id}
              onPress={() => onPlay(lv.id)}
              style={({ pressed }) => [styles.level, isMine && styles.levelMine, pressed && { backgroundColor: ui.cardHi }]}
            >
              <View style={[styles.ring, isMine && { backgroundColor: ui.teal }]}>
                <Text style={styles.ringText}>{lv.mixed ? 'MIX' : lv.id}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.levelTitle}>
                  {lv.title} {isMine ? <Text style={styles.mine}> · Senin seviyen</Text> : null}
                </Text>
                <Text style={styles.levelInfo} numberOfLines={2}>
                  {game.levelInfo(lv)}
                </Text>
                <Text style={[styles.status, started && { color: ui.flame }]}>{status}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={styles.solved}>{st?.solvedCount || 0} ✓</Text>
                <ChevronRight size={18} />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <BackBar label="Ana sayfa" onPress={onBack} bottomInset={insets.bottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ui.bg },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 },
  heroIcon: { width: 84, height: 84, borderRadius: 18, backgroundColor: ui.card, borderWidth: 1, borderColor: ui.border, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 1.6, color: ui.tealSoft },
  title: { fontFamily: fonts.sansBlack, fontSize: 26, color: ui.white },
  meta: { fontFamily: fonts.sansMedium, fontSize: 12.5, color: ui.muted, marginTop: 2 },
  deck: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: ui.text, marginTop: 14 },
  daily: { flexDirection: 'row', alignItems: 'center', backgroundColor: ui.cream, borderRadius: 16, padding: 14, marginTop: 16 },
  dailyTitle: { fontFamily: fonts.sansBlack, fontSize: 18, color: ui.creamInk },
  dailyText: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: ui.creamInk, marginTop: 4 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: ui.teal, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginTop: 10 },
  ctaText: { fontFamily: fonts.sansBold, fontSize: 14, color: ui.white },
  h2: { fontFamily: fonts.sansBold, fontSize: 20, color: ui.white, marginTop: 22 },
  note: { fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 17, color: ui.muted, marginTop: 2, marginBottom: 10 },
  level: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ui.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: ui.border, marginBottom: 8 },
  levelMine: { borderColor: ui.teal, borderWidth: 2 },
  ring: { width: 46, height: 46, borderRadius: 23, borderWidth: 3, borderColor: ui.teal, alignItems: 'center', justifyContent: 'center' },
  ringText: { fontFamily: fonts.sansBlack, fontSize: 14, color: ui.white },
  levelTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: ui.white },
  mine: { fontFamily: fonts.sansBold, fontSize: 12, color: ui.teal },
  levelInfo: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16, color: ui.muted, marginTop: 1 },
  status: { fontFamily: fonts.sansMedium, fontSize: 12, color: ui.tealSoft, marginTop: 3 },
  solved: { fontFamily: fonts.sansBold, fontSize: 13, color: ui.teal },
});
