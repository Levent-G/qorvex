// Ana Sayfa sekmesi — "Puzzle Club" tasarımı
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { GamePreview } from '../../components/Previews';
import GameIcon from '../../components/GameIcon';
import { SectionTitle } from '../../components/TabChrome';
import { FlameIcon, ArrowRight, ChevronRight, BookOpenIcon, TrophyIcon } from '../../components/UiIcons';
import { GAMES, getGame } from '../../games';
import { getStats, getProfile, LEVEL_GOAL, notebookWords, getLevel, getPromotion, clearPromotion } from '../../engine/session';
import { ui, fonts } from '../../theme';

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export default function HomeTab({ onOpenLevels, onOpenDaily, onTab }) {
  const featured = getGame('arrow');
  const [daily, setDaily] = useState(featured.peekDaily());
  useEffect(() => {
    if (!daily) featured.getDaily().then(setDaily).catch(() => {});
  }, []);
  const stats = getStats();
  const profile = getProfile();
  const lv = getLevel(profile.level);
  const levelDone = Math.min(LEVEL_GOAL, stats.levelSolved[profile.level] || 0);
  const words = notebookWords();
  const [promo, setPromo] = useState(getPromotion());
  const closePromo = () => {
    clearPromotion();
    setPromo(null);
  };
  const today = new Date();

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Seviye atlama tebriği */}
      {promo ? (
        <View style={styles.promo}>
          <View style={styles.promoIcon}>
            <TrophyIcon size={26} color={ui.creamInk} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.promoTitle}>{promo.to ? `Tebrikler! ${promo.to} seviyesine geçtin` : `Tebrikler! ${promo.from} seviyesini bitirdin`}</Text>
            <Text style={styles.promoText}>
              {promo.to
                ? `${promo.from} seviyesinde ${LEVEL_GOAL} bulmaca çözdün. Artık ${getLevel(promo.to).title} seviyesinin kelimeleri de gelecek.`
                : 'En üst seviyedesin. İstersen Karışık seviyede devam edebilirsin.'}
            </Text>
            <View style={styles.promoBtns}>
              {promo.to ? (
                <Pressable style={styles.promoBtn} onPress={() => { closePromo(); onTab('levels'); }}>
                  <Text style={styles.promoBtnText}>Seviyelere bak</Text>
                </Pressable>
              ) : null}
              <Pressable style={[styles.promoBtn, styles.promoGhost]} onPress={closePromo}>
                <Text style={[styles.promoBtnText, { color: ui.creamInk }]}>Tamam</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {/* Durum kutucukları */}
      <View style={styles.chips}>
        <Pressable style={[styles.chip, { flex: 0.9 }]} onPress={() => onTab('profile')}>
          <FlameIcon size={22} />
          <Text style={styles.chipLabel}>Günlük Seri</Text>
          <Text style={styles.chipValue}>{stats.streak}</Text>
        </Pressable>
        <Pressable style={[styles.chip, { flex: 1.25 }]} onPress={() => onTab('levels')}>
          <View style={styles.levelRing}>
            <Text style={styles.levelRingText}>{lv.mixed ? 'MIX' : lv.id}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.chipLabel}>Seviye</Text>
              <Text style={styles.chipSmall}>
                {levelDone} / {LEVEL_GOAL}
              </Text>
            </View>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${(levelDone / LEVEL_GOAL) * 100}%` }]} />
            </View>
          </View>
        </Pressable>
      </View>

      {/* Günün Bulmacası */}
      <Pressable style={styles.dailyCard} onPress={() => onOpenDaily('arrow')}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.dailyTitle}>Günün Bulmacası</Text>
          <Text style={styles.dailyDate}>
            {today.getDate()} {MONTHS_TR[today.getMonth()]} {today.getFullYear()} · {featured.title}
          </Text>
          <Text style={styles.dailyText}>
            {daily?.solved ? 'Bugünkü bulmacayı çözdün. Yarın yenisi gelecek!' : 'Yeni kelimeler keşfet, kelime dağarcığını geliştir.'}
          </Text>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{daily?.solved ? 'Tekrar Bak' : featured.started(daily) ? 'Devam Et' : 'Hemen Çöz'}</Text>
            <ArrowRight size={16} />
          </View>
        </View>
        <View style={styles.dailyPreview}>
          <GamePreview game={featured} session={daily} size={118} />
        </View>
      </Pressable>

      {/* Oyunlar */}
      <SectionTitle title="Oyunlar" action="Tümünü Gör" onAction={() => onTab('games')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 16 }} style={{ marginRight: -16 }}>
        {GAMES.map((g) => (
          <Pressable key={g.id} onPress={() => onOpenLevels(g.id)} style={({ pressed }) => [styles.gameTile, pressed && { backgroundColor: ui.cardHi }]}>
            <GameIcon id={g.id} size={60} />
            <Text style={styles.gameTitle} numberOfLines={1}>
              {g.title}
            </Text>
            <Text style={styles.gameTag} numberOfLines={2}>
              {g.tagline}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Kelime Defterim */}
      <Pressable style={styles.noteCard} onPress={() => onTab('notebook')}>
        <View style={styles.noteIcon}>
          <BookOpenIcon size={26} color={ui.teal} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.noteTitle}>Kelime Defterim</Text>
          <Text style={styles.noteText}>
            {words.length ? `Öğrendiğin ${words.length} kelimeyi tekrar et.` : 'Bilmediğin kelimenin kartını aç, burada biriksin.'}
          </Text>
        </View>
        <ChevronRight size={20} color={ui.white} />
      </Pressable>

      {stats.solvedToday ? (
        <Text style={styles.todayNote}>Bugün {stats.solvedToday} bulmaca çözdün · harika gidiyorsun!</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  chips: { flexDirection: 'row', gap: 10, marginTop: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ui.card, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: ui.border,
  },
  chipLabel: { fontFamily: fonts.sansBold, fontSize: 13, color: ui.text, flexShrink: 1 },
  chipValue: { fontFamily: fonts.sansBlack, fontSize: 18, color: ui.white, marginLeft: 'auto' },
  chipSmall: { fontFamily: fonts.sansBold, fontSize: 12, color: ui.muted },
  levelRing: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: ui.teal, alignItems: 'center', justifyContent: 'center' },
  levelRingText: { fontFamily: fonts.sansBlack, fontSize: 12, color: ui.white },
  bar: { height: 5, borderRadius: 3, backgroundColor: ui.border, marginTop: 6, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: ui.teal, borderRadius: 3 },
  dailyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: ui.cream, borderRadius: 18, padding: 16, marginTop: 16 },
  dailyTitle: { fontFamily: fonts.sansBlack, fontSize: 22, color: ui.creamInk },
  dailyDate: { fontFamily: fonts.sansMedium, fontSize: 12.5, color: '#4B5A70', marginTop: 2 },
  dailyText: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: ui.creamInk, marginTop: 12 },
  dailyPreview: { transform: [{ rotate: '4deg' }] },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: ui.teal,
    borderRadius: 24, paddingHorizontal: 18, paddingVertical: 11, marginTop: 14,
  },
  ctaText: { fontFamily: fonts.sansBold, fontSize: 15, color: ui.white },
  gameTile: { width: 128, backgroundColor: ui.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: ui.border, gap: 6 },
  gameTitle: { fontFamily: fonts.sansBold, fontSize: 14, color: ui.white },
  gameTag: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16, color: ui.muted },
  noteCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ui.card, borderRadius: 16,
    padding: 16, marginTop: 20, borderWidth: 1.5, borderColor: ui.teal,
  },
  noteIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: ui.cream, alignItems: 'center', justifyContent: 'center' },
  noteTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: ui.white },
  noteText: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: ui.muted, marginTop: 2 },
  promo: { flexDirection: 'row', gap: 12, backgroundColor: ui.cream, borderRadius: 16, padding: 14, marginTop: 6, marginBottom: 6, borderWidth: 2, borderColor: ui.teal },
  promoIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: ui.gold || '#F2C14E', alignItems: 'center', justifyContent: 'center' },
  promoTitle: { fontFamily: fonts.sansBlack, fontSize: 16, lineHeight: 21, color: ui.creamInk },
  promoText: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: '#3B4A60', marginTop: 3 },
  promoBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  promoBtn: { backgroundColor: ui.teal, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  promoGhost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: ui.creamInk },
  promoBtnText: { fontFamily: fonts.sansBold, fontSize: 13, color: ui.white },
  todayNote: { fontFamily: fonts.sansMedium, fontSize: 12.5, color: ui.tealSoft, textAlign: 'center', marginTop: 16 },
});
