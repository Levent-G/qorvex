import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ArrowGrid from '../components/ArrowGrid';
import QorvexMark from '../components/QorvexMark';
import { ChevronIcon } from '../components/Icons';
import { LEVELS, getDailySession, peekDaily, markedCount } from '../engine/session';
import { getStore } from '../storage';
import { colors, fonts, DAYS_EN, MONTHS_EN } from '../theme';

function Rule({ double, style }) {
  return double ? <View style={[styles.doubleRule, style]} /> : <View style={[styles.rule, style]} />;
}

const started = (sess) => sess && !sess.solved && sess.entries && Object.values(sess.entries).some(Boolean);

export default function HomeScreen({ onOpenDaily, onOpenLevel }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [daily, setDaily] = useState(peekDaily());
  const today = new Date();
  const dateLine = `${DAYS_EN[today.getDay()]}, ${today.getDate()} ${MONTHS_EN[today.getMonth()]} ${today.getFullYear()}`;
  const store = getStore();

  // Günün bulmacasını arka planda hazırla (önizleme için)
  useEffect(() => {
    if (!daily) getDailySession().then(setDaily).catch(() => {});
  }, [daily]);

  const totalSolved = LEVELS.reduce((a, lv) => a + (store.levels[lv.id]?.solvedCount || 0), 0);
  const marked = markedCount();
  const previewSize = daily ? Math.floor(Math.min(150, width * 0.38) / daily.puzzle.w) : 0;
  const issue = daily?.puzzle.no ?? '—';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + 6, paddingBottom: insets.bottom + 28, paddingHorizontal: 16 }}
    >
      <View style={styles.earRow}>
        <Text style={styles.ear}>VOL. I · No. {issue}</Text>
        <Text style={styles.ear}>ENGLISH · TÜRKÇE</Text>
        <Text style={styles.ear}>PRICE: FREE</Text>
      </View>
      <Rule />
      {/* Gazete başlığı: logo + QORVEX */}
      <View style={styles.mastRow}>
        <QorvexMark height={86} />
        <View style={styles.mastText}>
          <Text style={styles.masthead} adjustsFontSizeToFit numberOfLines={1}>
            QORVEX
          </Text>
          <Text style={styles.mastheadSub}>The Daily Arrowword</Text>
        </View>
      </View>
      <Rule double />
      <View style={styles.dateRow}>
        <Text style={styles.dateText}>{dateLine.toUpperCase()}</Text>
        <Text style={styles.dateText}>ÇENGEL BULMACA</Text>
      </View>
      <Rule style={{ marginBottom: 14 }} />

      <Text style={styles.kicker}>TODAY'S PUZZLE · GÜNÜN BULMACASI</Text>
      <Text style={styles.headline}>İpuçları Türkçe, Cevaplar İngilizce</Text>
      <View style={styles.leadRow}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.body}>
            <Text style={styles.dropCap}>K</Text>
            oyu karelerdeki Türkçe ipuçlarını oku, okun gösterdiği yöne İngilizce karşılığını yaz. Bilmediğin kelimenin
            ipucuna dokun, kelime kartı açılsın.
          </Text>
          <Pressable onPress={onOpenDaily} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.8 }]}>
            <Text style={styles.ctaText}>
              {daily?.solved ? 'ÇÖZÜLDÜ ✓  BAK' : started(daily) ? 'DEVAM ET →' : 'HEMEN ÇÖZ →'}
            </Text>
          </Pressable>
        </View>
        <View style={styles.previewBox}>
          {daily ? (
            <ArrowGrid puzzle={daily.puzzle} size={previewSize} showClueText={false} />
          ) : (
            <View style={[styles.previewPlaceholder, { width: Math.min(150, width * 0.38) }]}>
              <Text style={styles.caption}>Matbaada…</Text>
            </View>
          )}
          <Text style={styles.caption}>Bugünkü ızgara</Text>
        </View>
      </View>

      <Rule double style={{ marginTop: 18 }} />
      <Text style={styles.section}>Seviyeler</Text>
      <Text style={styles.sectionSub}>Her seviye öncekileri de kapsar · bir bulmaca bitince yenisi gelir</Text>
      <Rule style={{ marginBottom: 4 }} />

      {LEVELS.map((lv) => {
        const st = store.levels[lv.id];
        const solved = st?.solvedCount || 0;
        const cur = st?.current;
        const status = !cur ? 'Yeni bulmaca' : cur.solved ? 'Sıradaki hazır' : started(cur) ? `No. ${cur.puzzle.no} · devam et` : `No. ${cur.puzzle.no}`;
        const range = lv.mixed ? 'A1–C2 karışık' : lv.idx === 0 ? 'A1 kelimeleri' : `A1–${lv.id} kelimeleri`;
        return (
          <Pressable
            key={lv.id}
            onPress={() => onOpenLevel(lv.id)}
            style={({ pressed }) => [styles.levelRow, pressed && { backgroundColor: colors.paperDark }]}
          >
            <View style={[styles.levelBadge, lv.mixed && { backgroundColor: colors.ink }]}>
              <Text style={[styles.levelBadgeText, lv.mixed && { color: colors.paper, fontSize: 12 }]}>{lv.mixed ? 'MIX' : lv.id}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.levelTitle}>{lv.title}</Text>
              <Text style={styles.levelSub}>
                {lv.subtitle} · {range}
              </Text>
              <Text style={[styles.levelStatus, started(cur) && { color: colors.wrong }]}>{status}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
              <Text style={styles.levelCount}>{solved} ✓</Text>
              <View style={styles.levelArrow}><ChevronIcon dir="right" size={18} /></View>
            </View>
          </Pressable>
        );
      })}

      <Rule double style={{ marginTop: 18 }} />
      <View style={styles.columns}>
        <View style={[styles.col, styles.colBorder]}>
          <Text style={styles.colHead}>Nasıl Oynanır?</Text>
          <Text style={styles.small}>
            Kareye dokun ve yaz, aynı kareye tekrar dokununca yön değişir. Kelime bitince yeşil doğru, sarı yakın,
            kırmızı yanlış demek. Silme tuşunu basılı tutarsan seri siler.
          </Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.colHead}>Skor Tablosu</Text>
          <Text style={styles.stat}>{totalSolved}</Text>
          <Text style={styles.small}>bulmaca çözüldü</Text>
          <Text style={[styles.small, { marginTop: 6 }]}>★ {marked} kelime defterde</Text>
        </View>
      </View>
      <Rule />
      <Text style={styles.footer}>Printed & published daily · Her gün yeni bir bulmaca</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  rule: { height: 1, backgroundColor: colors.rule },
  doubleRule: { height: 6, borderTopWidth: 3, borderBottomWidth: 1, borderColor: colors.rule },
  earRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  ear: { fontFamily: fonts.sansMedium, fontSize: 9.5, letterSpacing: 1, color: colors.inkSoft },
  mastRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  mastText: { flex: 1 },
  masthead: {
    fontFamily: fonts.serifBold,
    fontSize: 52,
    letterSpacing: 8,
    color: colors.ink,
  },
  mastheadSub: { fontFamily: fonts.masthead, fontSize: 19, color: colors.ink, marginTop: -2 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  dateText: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 1.2, color: colors.ink },
  kicker: { fontFamily: fonts.sansBold, fontSize: 10.5, letterSpacing: 2, color: colors.wrong, marginBottom: 4 },
  headline: { fontFamily: fonts.serifBold, fontSize: 25, lineHeight: 29, color: colors.ink, marginBottom: 10 },
  leadRow: { flexDirection: 'row', alignItems: 'flex-start' },
  body: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 21, color: colors.ink, textAlign: 'justify' },
  dropCap: { fontFamily: fonts.serifBold, fontSize: 30, lineHeight: 30 },
  cta: { marginTop: 12, backgroundColor: colors.ink, paddingVertical: 11, alignItems: 'center' },
  ctaText: { fontFamily: fonts.sansBold, color: colors.paper, fontSize: 13, letterSpacing: 1.5 },
  previewBox: { alignItems: 'center' },
  previewPlaceholder: { aspectRatio: 0.82, borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.clueCell, alignItems: 'center', justifyContent: 'center' },
  caption: { fontFamily: fonts.serifItalic, fontSize: 11, color: colors.muted, marginTop: 4 },
  section: { fontFamily: fonts.serifBold, fontSize: 28, lineHeight: 38, color: colors.ink, marginTop: 8 },
  sectionSub: { fontFamily: fonts.serifItalic, fontSize: 14, lineHeight: 19, color: colors.muted, marginBottom: 8 },
  levelRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.ink },
  levelBadge: { width: 46, height: 46, borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.clueCell, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  levelBadgeText: { fontFamily: fonts.sansBlack, fontSize: 17, color: colors.ink },
  levelTitle: { fontFamily: fonts.serifBold, fontSize: 19, lineHeight: 26, color: colors.ink },
  levelSub: { fontFamily: fonts.serifItalic, fontSize: 13, lineHeight: 18, color: colors.muted },
  levelStatus: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  levelCount: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.good },
  levelArrow: { marginTop: 4 },
  columns: { flexDirection: 'row', paddingVertical: 10 },
  col: { flex: 1, paddingHorizontal: 8 },
  colBorder: { borderRightWidth: 1, borderColor: colors.ink, paddingLeft: 0 },
  colHead: { fontFamily: fonts.serifBold, fontSize: 17, lineHeight: 24, color: colors.ink, marginBottom: 4 },
  small: { fontFamily: fonts.serif, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  stat: { fontFamily: fonts.serifBold, fontSize: 40, color: colors.ink, lineHeight: 44 },
  footer: { fontFamily: fonts.serifItalic, fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 8 },
});
