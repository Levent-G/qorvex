import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PageFlipper from '../components/PageFlipper';
import QorvexMark from '../components/QorvexMark';
import { GamePreview } from '../components/Previews';
import { ChevronIcon } from '../components/Icons';
import { GAMES, BACK_PAGE, gameTotals } from '../games';
import { markedCount } from '../engine/session';
import { colors, fonts, DAYS_EN, MONTHS_EN } from '../theme';

function Rule({ double, style }) {
  return double ? <View style={[styles.doubleRule, style]} /> : <View style={[styles.rule, style]} />;
}

function PageEar({ left, right }) {
  return (
    <>
      <View style={styles.earRow}>
        <Text style={styles.ear}>{left}</Text>
        <Text style={styles.ear}>QORVEX</Text>
        <Text style={styles.ear}>{right}</Text>
      </View>
      <Rule />
    </>
  );
}

const dailyLabel = (g, s) => (!s ? 'Sayfayı açınca basılır' : s.solved ? 'Çözüldü ✓' : g.started(s) ? 'Devam ediyor' : 'Seni bekliyor');

// Bir oyunun bölüm sayfası (sayfa açılınca günün bulmacası basılır)
function GamePage({ g, active, daily, setDaily, pad, width, onOpenDaily, onOpenLevels }) {
  const sess = daily[g.id];
  useEffect(() => {
    if (!active || sess) return;
    let alive = true;
    g.getDaily()
      .then((s) => alive && setDaily((d) => ({ ...d, [g.id]: s })))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [active, sess]);
  const t = gameTotals(g);
  const previewSize = Math.min(220, width - 36 - 24);
  return (
    <ScrollView contentContainerStyle={pad} showsVerticalScrollIndicator={false}>
      <PageEar left={`SAYFA ${g.page}`} right={g.origin === 'tr' ? 'TÜRK BULMACASI' : 'İNGİLİZ / ABD BULMACASI'} />
      <View style={styles.sectionHead}>
        <Text style={styles.sectionNo}>{g.no}.</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionKicker}>{g.kicker}</Text>
          <Text style={styles.sectionTitle}>{g.title}</Text>
        </View>
      </View>
      <Rule double />
      <Text style={styles.sectionDeck}>{g.deck}</Text>

      <View style={styles.dailyBox}>
        <Text style={styles.dailyKicker}>GÜNÜN BULMACASI · {dailyLabel(g, sess).toUpperCase()}</Text>
        <View style={styles.dailyPreview}>
          <GamePreview game={g} session={sess} size={previewSize} />
        </View>
        <Pressable onPress={() => onOpenDaily(g.id)} style={({ pressed }) => [styles.bigBtn, pressed && { opacity: 0.85 }]}>
          <Text style={styles.bigBtnText}>{sess?.solved ? 'BUGÜNKÜNÜ GÖR' : 'GÜNÜN BULMACASINI ÇÖZ'}</Text>
        </Pressable>
      </View>

      <Text style={styles.colHead}>Nasıl Oynanır?</Text>
      {g.howTo.map((line, i) => (
        <View key={i} style={styles.bullet}>
          <Text style={styles.bulletNo}>{i + 1}</Text>
          <Text style={styles.bulletText}>{line}</Text>
        </View>
      ))}

      <Rule style={{ marginTop: 14 }} />
      <Pressable onPress={() => onOpenLevels(g.id)} style={({ pressed }) => [styles.levelsBtn, pressed && { backgroundColor: colors.paperDark }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.levelsTitle}>Seviyeler</Text>
          <Text style={styles.levelsSub}>A1'den C2'ye 7 seviye · {t.solved} bulmaca çözüldü</Text>
        </View>
        <ChevronIcon dir="right" size={22} />
      </Pressable>
      <Rule />
    </ScrollView>
  );
}

export default function HomeScreen({ onOpenLevels, onOpenDaily }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const flipper = useRef(null);
  const [daily, setDaily] = useState(() => Object.fromEntries(GAMES.map((g) => [g.id, g.peekDaily()])));

  // Ön sayfadaki tüm önizlemeler için eksik günlük bulmacaları arka planda sırayla bas
  // (bir kez basılır ve saklanır; aynı gün tekrar açılınca anında gelir)
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      for (const g of GAMES) {
        if (!alive) return;
        if (g.peekDaily()) {
          setDaily((d) => (d[g.id] ? d : { ...d, [g.id]: g.peekDaily() }));
          continue;
        }
        try {
          const s = await g.getDaily();
          if (alive) setDaily((d) => ({ ...d, [g.id]: s }));
        } catch {}
      }
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  const today = new Date();
  const dateLine = `${DAYS_EN[today.getDay()]}, ${today.getDate()} ${MONTHS_EN[today.getMonth()]} ${today.getFullYear()}`;
  const issue = daily.arrow?.puzzle.no ?? '—';
  const pad = { paddingTop: insets.top + 6, paddingHorizontal: 18, paddingBottom: 24 };

  const story = (g, last) => {
    const t = gameTotals(g);
    return (
      <Pressable
        key={g.id}
        onPress={() => onOpenLevels(g.id)}
        style={({ pressed }) => [styles.story, !last && styles.storyRule, pressed && { backgroundColor: colors.paperDark }]}
      >
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.storyKicker}>
            <Text style={{ color: colors.wrong }}>{g.no}. </Text>
            {g.kicker}
          </Text>
          <Text style={styles.storyTitle}>{g.title}</Text>
          <Text style={styles.storyDeck} numberOfLines={3}>
            {g.deck}
          </Text>
          <Text style={styles.storyMeta}>
            Sayfa {g.page} · {t.solved} çözüldü{t.inProgress ? ` · ${t.inProgress} yarım` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <GamePreview game={g} session={daily[g.id]} size={Math.round(Math.min(84, width * 0.22))} />
          <View style={styles.storyCta}>
            <Text style={styles.storyCtaText}>SEÇ</Text>
            <ChevronIcon dir="right" size={12} color={colors.paper} />
          </View>
        </View>
      </Pressable>
    );
  };

  // ---------------- Sayfa 1: Ön sayfa ----------------
  const front = ({ goTo }) => {
    const tr = GAMES.filter((g) => g.origin === 'tr');
    const en = GAMES.filter((g) => g.origin === 'en');
    return (
      <ScrollView contentContainerStyle={pad} showsVerticalScrollIndicator={false}>
        <PageEar left={`VOL. I · No. ${issue}`} right="PRICE: FREE" />
        <View style={styles.mastRow}>
          <QorvexMark height={92} />
          <View style={{ flex: 1 }}>
            <Text style={styles.masthead} adjustsFontSizeToFit numberOfLines={1}>
              QORVEX
            </Text>
            <Text style={styles.mastheadSub}>The Daily Puzzle Page</Text>
          </View>
        </View>
        <Rule double />
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>{dateLine.toUpperCase()}</Text>
          <Text style={styles.dateText}>İNGİLİZCE BULMACA</Text>
        </View>
        <Rule style={{ marginBottom: 16 }} />

        <Text style={styles.kicker}>TODAY'S EDITION · BUGÜNKÜ BASKI</Text>
        <Text style={styles.headline}>Sekiz bulmaca, binlerce kelime</Text>
        <Text style={styles.standfirst}>
          İpuçları Türkçe, cevaplar İngilizce. Türk ve İngiliz gazetelerinin sevilen bulmacalarından birini seç, seviyeni belirle.
        </Text>

        <View style={styles.deskHead}>
          <Text style={styles.deskTitle}>Türk Gazetelerinden</Text>
          <Text style={styles.deskSub}>Çengel, kare, şifreli, sarmal</Text>
        </View>
        <Rule double />
        {tr.map((g, i) => story(g, i === tr.length - 1))}

        <View style={styles.deskHead}>
          <Text style={styles.deskTitle}>İngiliz & Amerikan Gazetelerinden</Text>
          <Text style={styles.deskSub}>Word search, word ladder, jumble, cryptogram</Text>
        </View>
        <Rule double />
        {en.map((g, i) => story(g, i === en.length - 1))}

        <Rule double style={{ marginTop: 6 }} />
        <Pressable onPress={() => goTo(1)} style={styles.turnHint}>
          <Text style={styles.turnHintText}>Sayfayı çevir: her bulmacanın kendi sayfası, günün bulmacası ve kuralları</Text>
          <ChevronIcon dir="right" size={16} />
        </Pressable>
      </ScrollView>
    );
  };

  // ---------------- Arka sayfa ----------------
  const back = () => {
    const rows = GAMES.map((g) => ({ g, ...gameTotals(g), today: dailyLabel(g, daily[g.id]) }));
    const total = rows.reduce((a, r) => a + r.solved, 0);
    return (
      <ScrollView contentContainerStyle={pad} showsVerticalScrollIndicator={false}>
        <PageEar left={`SAYFA ${BACK_PAGE}`} right="ARKA SAYFA" />
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Skor Tablosu</Text>
        <Text style={styles.sectionDeck}>Scoreboard · bugüne kadarki baskıların</Text>
        <Rule double />
        <View style={styles.bigStatRow}>
          <View style={styles.bigStat}>
            <Text style={styles.bigStatNo}>{total}</Text>
            <Text style={styles.bigStatLabel}>bulmaca çözüldü</Text>
          </View>
          <View style={styles.vRule} />
          <View style={styles.bigStat}>
            <Text style={styles.bigStatNo}>{markedCount()}</Text>
            <Text style={styles.bigStatLabel}>kelime defterde</Text>
          </View>
        </View>
        <Rule />
        <View style={styles.tableHead}>
          <Text style={[styles.th, { flex: 1 }]}>BULMACA</Text>
          <Text style={[styles.th, styles.num]}>ÇÖZÜLDÜ</Text>
          <Text style={[styles.th, styles.num]}>YARIM</Text>
        </View>
        {rows.map((r) => (
          <Pressable key={r.g.id} onPress={() => onOpenLevels(r.g.id)} style={styles.tr}>
            <View style={{ flex: 1 }}>
              <Text style={styles.td}>
                <Text style={{ color: colors.wrong }}>{r.g.no}. </Text>
                {r.g.title}
              </Text>
              <Text style={styles.tdSub}>Bugün: {r.today}</Text>
            </View>
            <Text style={[styles.tdNum, styles.num]}>{r.solved}</Text>
            <Text style={[styles.tdNum, styles.num]}>{r.inProgress}</Text>
          </Pressable>
        ))}
        <Rule double style={{ marginTop: 6 }} />
        <Text style={styles.colHead}>Kelime Defteri</Text>
        <Text style={styles.bulletText}>
          Bir kelimenin kartını açtığında kelime defterine eklenir. Defterdeki kelimeler bütün bulmacalarda ara ara karşına çıkar;
          öğrendikçe daha seyrek gelir.
        </Text>
        <Rule style={{ marginTop: 14 }} />
        <Text style={styles.footer}>Printed & published daily · Her gün yeni bulmacalar</Text>
      </ScrollView>
    );
  };

  const pages = [
    front,
    ...GAMES.map((g) => ({ active }) => (
      <GamePage g={g} active={active} daily={daily} setDaily={setDaily} pad={pad} width={width} onOpenDaily={onOpenDaily} onOpenLevels={onOpenLevels} />
    )),
    back,
  ];
  const labels = ['Ön sayfa', ...GAMES.map((g) => g.title), 'Arka sayfa · Skor tablosu'];
  return <PageFlipper ref={flipper} pages={pages} labels={labels} bottomInset={insets.bottom} />;
}

const styles = StyleSheet.create({
  rule: { height: 1, backgroundColor: colors.rule },
  doubleRule: { height: 6, borderTopWidth: 3, borderBottomWidth: 1, borderColor: colors.rule },
  earRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  ear: { fontFamily: fonts.sansMedium, fontSize: 9.5, letterSpacing: 1, color: colors.inkSoft },
  mastRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  masthead: { fontFamily: fonts.serifBold, fontSize: 54, lineHeight: 66, letterSpacing: 8, color: colors.ink },
  mastheadSub: { fontFamily: fonts.masthead, fontSize: 20, lineHeight: 27, color: colors.ink, marginTop: -2 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  dateText: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 1.2, color: colors.ink },
  kicker: { fontFamily: fonts.sansBold, fontSize: 10.5, letterSpacing: 2, color: colors.wrong, marginBottom: 4 },
  headline: { fontFamily: fonts.serifBold, fontSize: 30, lineHeight: 37, color: colors.ink },
  standfirst: { fontFamily: fonts.serifItalic, fontSize: 15.5, lineHeight: 22, color: colors.inkSoft, marginTop: 4 },
  deskHead: { marginTop: 18, marginBottom: 4 },
  deskTitle: { fontFamily: fonts.masthead, fontSize: 26, lineHeight: 34, color: colors.ink },
  deskSub: { fontFamily: fonts.serifItalic, fontSize: 12.5, lineHeight: 17, color: colors.muted },
  story: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  storyRule: { borderBottomWidth: 1, borderColor: colors.ink },
  storyKicker: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 1.6, color: colors.inkSoft },
  storyTitle: { fontFamily: fonts.serifBold, fontSize: 22, lineHeight: 30, color: colors.ink },
  storyDeck: { fontFamily: fonts.serif, fontSize: 13.5, lineHeight: 19, color: colors.ink },
  storyMeta: { fontFamily: fonts.serifItalic, fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 4 },
  storyCta: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.ink, paddingHorizontal: 9, paddingVertical: 5 },
  storyCtaText: { fontFamily: fonts.sansBold, fontSize: 10.5, letterSpacing: 1.4, color: colors.paper },
  turnHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  turnHintText: { fontFamily: fonts.serifItalic, fontSize: 13, lineHeight: 18, color: colors.inkSoft, flexShrink: 1, textAlign: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 10, marginBottom: 6 },
  sectionNo: { fontFamily: fonts.serifBold, fontSize: 46, lineHeight: 58, color: colors.wrong },
  sectionKicker: { fontFamily: fonts.sansBold, fontSize: 10.5, letterSpacing: 2, color: colors.inkSoft },
  sectionTitle: { fontFamily: fonts.serifBold, fontSize: 34, lineHeight: 44, color: colors.ink },
  sectionDeck: { fontFamily: fonts.serifItalic, fontSize: 15, lineHeight: 21, color: colors.inkSoft, marginVertical: 10 },
  dailyBox: { borderWidth: 2, borderColor: colors.ink, padding: 12, alignItems: 'center', marginBottom: 16 },
  dailyKicker: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 1.6, color: colors.wrong, marginBottom: 10 },
  dailyPreview: { alignItems: 'center', justifyContent: 'center', minHeight: 140 },
  bigBtn: { alignSelf: 'stretch', backgroundColor: colors.ink, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  bigBtnText: { fontFamily: fonts.sansBold, fontSize: 13, letterSpacing: 1.6, color: colors.paper },
  colHead: { fontFamily: fonts.serifBold, fontSize: 19, lineHeight: 26, color: colors.ink, marginBottom: 6, marginTop: 4 },
  bullet: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  bulletNo: {
    fontFamily: fonts.sansBold, fontSize: 12, color: colors.paper, backgroundColor: colors.ink,
    width: 20, height: 20, textAlign: 'center', lineHeight: 20, overflow: 'hidden',
  },
  bulletText: { flex: 1, fontFamily: fonts.serif, fontSize: 14.5, lineHeight: 21, color: colors.ink },
  levelsBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  levelsTitle: { fontFamily: fonts.serifBold, fontSize: 24, lineHeight: 32, color: colors.ink },
  levelsSub: { fontFamily: fonts.serifItalic, fontSize: 13, lineHeight: 18, color: colors.muted },
  bigStatRow: { flexDirection: 'row', paddingVertical: 14 },
  bigStat: { flex: 1, alignItems: 'center' },
  bigStatNo: { fontFamily: fonts.serifBold, fontSize: 52, lineHeight: 60, color: colors.ink },
  bigStatLabel: { fontFamily: fonts.serifItalic, fontSize: 13, lineHeight: 18, color: colors.muted },
  vRule: { width: 1, backgroundColor: colors.ink },
  tableHead: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 2, borderColor: colors.ink },
  th: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 1.4, color: colors.inkSoft },
  num: { width: 64, textAlign: 'right' },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.ink },
  td: { fontFamily: fonts.serifBold, fontSize: 16, lineHeight: 22, color: colors.ink },
  tdSub: { fontFamily: fonts.serifItalic, fontSize: 12, lineHeight: 16, color: colors.muted },
  tdNum: { fontFamily: fonts.serifBold, fontSize: 19, color: colors.ink },
  footer: { fontFamily: fonts.serifItalic, fontSize: 12, lineHeight: 17, color: colors.muted, textAlign: 'center', marginTop: 10 },
});
