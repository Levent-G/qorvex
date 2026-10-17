// Ana Sayfa sekmesi — "Editorial Intellect" tasarımı
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { GamePreview } from '../../components/Previews';
import GameGlyph from '../../components/GameGlyph';
import { SectionTitle } from '../../components/TabChrome';
import { WordOfDayCard, WeeklyCard, PracticeTiles } from '../../components/HomeExtras';
import { FlameIcon, ArrowRight, ChevronRight, BookOpenIcon, TrophyIcon, BadgeCheckIcon } from '../../components/UiIcons';
import { getGame } from '../../games';
import { getStats, getProfile, LEVEL_GOAL, notebookWords, getLevel, getPromotion, clearPromotion } from '../../engine/session';
import { ed, efonts } from '../../theme';

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// Ana sayfadaki oyun ızgarası: tasarımdaki sıra, kısa ad ve alt etiket
const HOME_GAMES = [
  ['arrow', 'Çengel', 'Klasik'],
  ['picture', 'Resimli', 'Görsel İpucu'],
  ['crossword', 'Kare Bulmaca', 'Klasik Izgara'],
  ['codeword', 'Şifreli', 'Sayı Eşleme'],
  ['spiral', 'Sarmal', 'İç İçe Yol'],
  ['ws', 'Kelime Avı', 'Gizli Kelimeler'],
  ['ladder', 'Merdiven', 'Tek Harf Değişimi'],
  ['jumble', 'Karışık', 'Anagram Çöz'],
  ['cryptogram', 'Şifreli Söz', 'Şifreli Cümle'],
];

// Küçük ilerleme halkası
function Ring({ value, size = 18 }) {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={ed.border} strokeWidth={3} fill="none" />
      <Circle
        cx={size / 2} cy={size / 2} r={r} stroke={ed.accent} strokeWidth={3} fill="none"
        strokeDasharray={`${c * value} ${c}`} strokeLinecap="round" rotation={-90} origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

export default function HomeTab({ onOpenLevels, onOpenDaily, onTab, onOpenRoute }) {
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
  const learned = words.filter((w) => w.seen >= 3).length;
  const [promo, setPromo] = useState(getPromotion());
  const closePromo = () => {
    clearPromotion();
    setPromo(null);
  };
  const today = new Date();
  const { width } = useWindowDimensions();
  const tileW = Math.floor((width - 32 - 2 * 10) / 3);
  const levelName = lv.mixed ? 'Karışık' : `${lv.id} · ${lv.title}`;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Günün Gazete Bulmacası */}
      <Pressable style={[styles.daily, { marginTop: 0 }]} onPress={() => onOpenDaily('arrow')}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.dailyKicker}>
              {today.getDate()} {MONTHS_TR[today.getMonth()].toLocaleUpperCase('tr-TR')} {today.getFullYear()} · ÇENGEL
            </Text>
            <Text style={styles.dailyTitle}>Günün Gazete Bulmacası</Text>
            <Text style={styles.dailyText}>
              {daily?.solved ? 'Bugünkü bulmacayı çözdün. Yarın yenisi gelecek!' : 'İpuçları Türkçe, cevaplar İngilizce. Yeni kelimeler keşfet.'}
            </Text>
          </View>
          <View style={styles.dailyPreview}>
            <GamePreview game={featured} session={daily} size={86} />
          </View>
        </View>
        <View style={styles.dailyFoot}>
          <View style={styles.levelTag}>
            <BadgeCheckIcon size={12} color={ed.accentInk} />
            <Text style={styles.levelTagText}>KARIŞIK</Text>
          </View>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{daily?.solved ? 'Tekrar Bak' : featured.started(daily) ? 'Devam Et' : 'Hemen Çöz'}</Text>
            <ArrowRight size={15} color={ed.onPrimary} />
          </View>
        </View>
      </Pressable>

      {/* Seviye bandı: atlama tebriği ya da mevcut durum */}
      {promo ? (
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <TrophyIcon size={18} color={ed.onPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{promo.to ? `Tebrikler! ${promo.to} seviyesine geçtin.` : `Tebrikler! ${promo.from} seviyesini bitirdin.`}</Text>
            <Text style={styles.bannerSub}>{promo.to ? `Artık ${getLevel(promo.to).title} kelimeleri de gelecek.` : 'Karışık seviyede devam edebilirsin.'}</Text>
          </View>
          <Pressable onPress={closePromo} hitSlop={8} style={styles.bannerPill}>
            <Text style={styles.bannerPillText}>TAMAM</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.banner} onPress={() => onTab('levels')}>
          <View style={styles.bannerIcon}>
            <BadgeCheckIcon size={18} color={ed.onPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{levelName} seviyesindesin.</Text>
            <Text style={styles.bannerSub}>
              {lv.mixed ? 'Tüm seviyelerden karışık bulmacalar' : `Üst seviyeye ${LEVEL_GOAL - levelDone} bulmaca kaldı`}
            </Text>
          </View>
          <View style={styles.bannerPill}>
            <Text style={styles.bannerPillText}>AKTİF</Text>
          </View>
        </Pressable>
      )}

      {/* Oyunlar: hepsi ekranda */}
      <SectionTitle title="Oyunlar" sub="9 bulmaca · hepsi İngilizce kelime öğretir" style={{ marginTop: 14 }} />
      <View style={styles.grid}>
        {HOME_GAMES.map(([id, name, sub]) => (
          <Pressable key={id} onPress={() => onOpenLevels(id)} style={({ pressed }) => [styles.tile, { width: tileW }, pressed && { backgroundColor: ed.surfaceAlt }]}>
            {id === 'arrow' ? (
              <View style={styles.popular}>
                <Text style={styles.popularText}>Popüler</Text>
              </View>
            ) : null}
            <GameGlyph id={id} size={40} />
            <Text style={styles.tileName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.tileSub} numberOfLines={1}>
              {sub}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Durum kutucukları */}
      <View style={styles.chips}>
        <Pressable style={styles.chip} onPress={() => onTab('stats')}>
          <FlameIcon size={18} color={ed.orange} />
          <Text style={styles.chipLabel}>Günlük Seri</Text>
          <Text style={styles.chipValue}>{stats.streak} Gün</Text>
        </Pressable>
        <Pressable style={styles.chip} onPress={() => onTab('levels')}>
          <Ring value={levelDone / LEVEL_GOAL} />
          <Text style={styles.chipLabel}>Bulmaca</Text>
          <Text style={styles.chipValue}>
            {levelDone}/{LEVEL_GOAL}
          </Text>
        </Pressable>
      </View>

      {/* Haftalık meydan okuma */}
      <WeeklyCard onOpen={() => onOpenRoute({ name: 'weekly' })} />

      {/* Günün kelimesi */}
      <WordOfDayCard />

      {/* Alıştırmalar */}
      <SectionTitle title="Alıştırmalar" sub="Kısa turlarla kelimeleri pekiştir" />
      <PracticeTiles width={tileW} onOpen={onOpenRoute} />

      {/* Kelime Defterim */}
      <Pressable style={styles.note} onPress={() => onTab('notebook')}>
        <View style={styles.noteIcon}>
          <BookOpenIcon size={24} color={ed.accentInk} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.noteTitle}>Kelime Defterim</Text>
          <Text style={styles.noteText}>
            {words.length ? `${words.length} kayıtlı · ${learned} kelime öğrenildi` : 'Bilmediğin kelimenin kartını aç, burada biriksin'}
          </Text>
        </View>
        <Text style={styles.noteLink}>Defteri Aç</Text>
        <ChevronRight size={14} color={ed.accent} />
      </Pressable>
    </ScrollView>
  );
}

const card = { backgroundColor: ed.surface, borderRadius: 14, borderWidth: 1, borderColor: ed.border };
const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 12 },
  chips: { flexDirection: 'row', gap: 10, marginTop: 14 },
  chip: { ...card, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 11 },
  chipLabel: { flex: 1, fontFamily: efonts.bodyMedium, fontSize: 13, color: ed.textSoft },
  chipValue: { fontFamily: efonts.bodyBold, fontSize: 15, color: ed.text },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: ed.accentSoft, borderRadius: 14, padding: 12, marginTop: 12 },
  bannerIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: ed.accentStrong, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontFamily: efonts.bodyBold, fontSize: 14.5, color: ed.text },
  bannerSub: { fontFamily: efonts.body, fontSize: 12.5, color: ed.accentInk, marginTop: 1 },
  bannerPill: { backgroundColor: ed.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  bannerPillText: { fontFamily: efonts.labelBold, fontSize: 10.5, letterSpacing: 0.8, color: ed.onPrimary },
  daily: { ...card, padding: 16, marginTop: 12, shadowColor: '#18324D', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  dailyKicker: { fontFamily: efonts.labelBold, fontSize: 10.5, letterSpacing: 1.2, color: ed.textSoft },
  dailyTitle: { fontFamily: efonts.headlineBold, fontSize: 25, lineHeight: 30, color: ed.text, marginTop: 6 },
  dailyText: { fontFamily: efonts.body, fontSize: 13.5, lineHeight: 19, color: ed.textSoft, marginTop: 6 },
  dailyPreview: { transform: [{ rotate: '3deg' }], marginTop: 4 },
  dailyFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  levelTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ed.accentSoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  levelTagText: { fontFamily: efonts.labelBold, fontSize: 10.5, letterSpacing: 0.8, color: ed.accentInk },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ed.accentStrong, borderRadius: 22, paddingHorizontal: 20, paddingVertical: 11 },
  ctaText: { fontFamily: efonts.bodyBold, fontSize: 15, color: ed.onPrimary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { ...card, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6, gap: 4 },
  popular: { position: 'absolute', top: -7, right: 10, backgroundColor: ed.orange, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, zIndex: 2 },
  popularText: { fontFamily: efonts.labelBold, fontSize: 9.5, color: ed.onPrimary },
  tileName: { fontFamily: efonts.bodyBold, fontSize: 13.5, color: ed.text, marginTop: 4 },
  tileSub: { fontFamily: efonts.body, fontSize: 11, lineHeight: 14, color: ed.textSoft, textAlign: 'center' },
  note: { ...card, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 16 },
  noteIcon: { width: 46, height: 46, borderRadius: 10, backgroundColor: ed.accentSoft, alignItems: 'center', justifyContent: 'center' },
  noteTitle: { fontFamily: efonts.bodyBold, fontSize: 16, color: ed.text },
  noteText: { fontFamily: efonts.body, fontSize: 12.5, color: ed.textSoft, marginTop: 2 },
  noteLink: { fontFamily: efonts.bodyBold, fontSize: 13, color: ed.accent },
});
