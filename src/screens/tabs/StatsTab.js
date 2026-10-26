// İstatistik sekmesi — "Çözücü Raporu" ("Editorial Intellect" tasarımı)
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import GameGlyph from '../../components/GameGlyph';
import { PageTitle } from '../../components/TabChrome';
import { BookOpenIcon, CheckIcon, ClockIcon, BoltIcon, TrendIcon, ChevronRight } from '../../components/UiIcons';
import { BulbIcon } from '../../components/Icons';
import { getDetailedStats, getStats, getProfile, getLevel, notebookWords } from '../../engine/session';
import { GAMES } from '../../games';
import { ed, efonts, formatTime } from '../../theme';

const DAY = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
// en hızlı süreler listesinde ikon kutusu renkleri (tasarımdaki gibi çeşitli)
const GLYPH_BG = { arrow: ed.primary, picture: ed.accentStrong, ws: '#7FD3E6' };

const fmtLong = (sec) => {
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return m ? `${m}dk ${s}sn` : `${s}sn`;
};

function BigStat({ label, value, sub, icon, iconBg }) {
  return (
    <View style={styles.big}>
      <View style={styles.bigHead}>
        <Text style={styles.bigLabel}>{label}</Text>
        <View style={[styles.bigIcon, { backgroundColor: iconBg || ed.surfaceAlt }]}>{icon}</View>
      </View>
      <Text style={styles.bigValue}>{value}</Text>
      {sub}
    </View>
  );
}

export default function StatsTab() {
  const d = getDetailedStats();
  const s = getStats();
  const lv = getLevel(getProfile().level);
  const tracked = Object.values(d.games).reduce((a, g) => a + (g.solved || 0), 0);
  const cleanPct = tracked ? Math.round((d.clean / tracked) * 100) : null;
  const weekDelta = d.lastWeek ? Math.round(((d.thisWeek - d.lastWeek) / d.lastWeek) * 100) : null;
  const speed = d.avgRecent && d.avgAll ? Math.round(((d.avgAll - d.avgRecent) / d.avgAll) * 100) : null;
  const learnPct = d.notebook ? Math.round((d.learned / d.notebook) * 100) : 0;
  const maxDay = Math.max(1, ...s.week.map((x) => x.count));
  const lastWord = notebookWords()
    .filter((w) => w.seen > 0)
    .sort((a, b) => (b.last || 0) - (a.last || 0))[0];
  const ranked = GAMES.filter((g) => d.games[g.id] && d.games[g.id].fastest);
  const unranked = GAMES.filter((g) => !(d.games[g.id] && d.games[g.id].fastest));

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      <PageTitle title="Çözücü Raporu" sub="Zihinsel egzersiz ritmin ve İngilizce kelime dağarcığının gelişim eğrisi." />

      <View style={styles.grid2}>
        <BigStat
          label="KARŞILAŞILAN"
          value={d.seenWords}
          icon={<BookOpenIcon size={15} color={ed.accentInk} />}
          iconBg={ed.accentSoft}
          sub={<Text style={styles.bigSub}>farklı kelime · {d.encounters} karşılaşma</Text>}
        />
        <BigStat
          label="İPUCUSUZ ÇÖZÜM"
          value={d.clean}
          icon={<CheckIcon size={15} color={ed.accentInk} />}
          iconBg={ed.accentSoft}
          sub={<Text style={styles.bigSub}>{cleanPct != null ? `%${cleanPct} başarı payı` : 'çözdükçe hesaplanır'}</Text>}
        />
        <BigStat label="HARF AÇMA" value={d.hints.letter || 0} icon={<BulbIcon size={15} color={ed.textSoft} />} sub={<Text style={styles.bigSub}>destek müdahalesi</Text>} />
        <BigStat label="KELİME AÇMA" value={d.hints.word || 0} icon={<BulbIcon size={15} color={ed.textSoft} />} sub={<Text style={styles.bigSub}>tam çözüm desteği</Text>} />
      </View>

      {/* Kelime Gelişimi */}
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>KELİME USTALIK SEVİYESİ</Text>
            <Text style={styles.cardTitle}>Kelime Gelişimi</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{lv.mixed ? 'Karışık' : `${lv.id} Seviye`}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 10 }}>
          <Text style={styles.rateText}>%{learnPct} Öğrenilme Oranı</Text>
          <Text style={styles.rateSmall}>
            {d.learned} / {d.notebook} kelime
          </Text>
        </View>
        <View style={styles.dualBar}>
          <View style={{ flex: Math.max(d.learned, 0.001), backgroundColor: ed.primary }} />
          <View style={{ flex: Math.max(d.notebook - d.learned, 0.001), backgroundColor: ed.accentLine }} />
          {d.notebook ? null : <View style={{ flex: 1, backgroundColor: ed.surfaceDim }} />}
        </View>
        <View style={styles.legend}>
          <Text style={styles.legendText}>● Kalıcı (3+ tekrar)</Text>
          <Text style={[styles.legendText, { color: '#5BB8D0' }]}>● Defterde bekleyen</Text>
        </View>
        <View style={styles.mini3}>
          <View style={styles.mini}>
            <Text style={styles.miniLabel}>TOPLAM</Text>
            <Text style={styles.miniValue}>{d.seenWords}</Text>
            <Text style={styles.miniSub}>farklı kelime</Text>
          </View>
          <View style={styles.mini}>
            <Text style={styles.miniLabel}>DEFTERDE</Text>
            <Text style={[styles.miniValue, { color: ed.accent }]}>{d.notebook}</Text>
            <Text style={styles.miniSub}>kayıtlı kelime</Text>
          </View>
          <View style={[styles.mini, { backgroundColor: ed.accentSoft }]}>
            <Text style={[styles.miniLabel, { color: ed.accentInk }]}>ÖĞRENİLEN</Text>
            <Text style={[styles.miniValue, { color: ed.accentInk }]}>{d.learned}</Text>
            <Text style={styles.miniSub}>3+ tekrar</Text>
          </View>
        </View>
        {lastWord ? (
          <View style={styles.lastWord}>
            <View style={styles.qBox}>
              <Text style={styles.qText}>Q</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.lastWordTitle}>{lastWord.answer.charAt(0) + lastWord.answer.slice(1).toLowerCase()}</Text>
              <Text style={styles.lastWordSub}>Son pekiştirilen · {lastWord.seen} kez tekrar</Text>
            </View>
            <ChevronRight size={14} color={ed.accent} />
          </View>
        ) : null}
      </View>

      {/* Haftalık Gelişim */}
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>TEMPO & HIZ</Text>
            <Text style={styles.cardTitle}>Haftalık Gelişim</Text>
          </View>
          {weekDelta != null ? (
            <View style={[styles.pill, weekDelta < 0 && { backgroundColor: ed.orangeSoft }]}>
              <TrendIcon size={12} color={weekDelta < 0 ? ed.orange : ed.accentInk} />
              <Text style={[styles.pillText, weekDelta < 0 && { color: ed.orange }]}>
                {weekDelta >= 0 ? '+' : ''}%{weekDelta} {weekDelta >= 0 ? '▲' : '▼'}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 10 }}>
          <Text style={styles.weekNum}>{d.thisWeek}</Text>
          <Text style={styles.weekLabel}> Bu Hafta Çözüm</Text>
          <View style={{ flex: 1 }} />
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.kickerGrey}>İPUCUSUZ ORAN</Text>
            <Text style={styles.cleanPct}>{cleanPct != null ? `%${cleanPct}` : '—'}</Text>
          </View>
        </View>
        <View style={styles.chart}>
          {s.week.map((x, i) => {
            const isToday = i === 6;
            const isBest = x.count === maxDay && x.count > 0;
            return (
              <View key={i} style={styles.col}>
                {isBest ? <View style={styles.bestDot} /> : null}
                <Text style={styles.colValue}>{x.count}</Text>
                <View
                  style={[
                    styles.colBar,
                    { height: 6 + (x.count / maxDay) * 92 },
                    { backgroundColor: isBest ? ed.accentStrong : isToday ? ed.accentLine : ed.surfaceDim },
                  ]}
                />
                <Text style={[styles.colDay, isToday && { color: ed.text, fontFamily: efonts.labelBold }]}>{DAY[x.day]}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.timeBox}>
          <View style={styles.timeIcon}>
            <ClockIcon size={17} color={ed.onPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.timeTitle}>
              {d.avgRecent ? fmtLong(d.avgRecent) : '—'}
              {speed ? <Text style={[styles.timeDelta, speed < 0 && { color: ed.orange }]}>{`  (%${Math.abs(speed)} daha ${speed > 0 ? 'hızlı' : 'yavaş'})`}</Text> : null}
            </Text>
            <Text style={styles.timeSub}>Son 10 çözüm ortalama tamamlanma süresi</Text>
          </View>
        </View>
      </View>

      {/* En Hızlı Süreler */}
      <View style={[styles.cardHead, { marginTop: 22 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>REKOR TABLOSU</Text>
          <Text style={styles.sectionTitle}>En Hızlı Süreler</Text>
        </View>
        <Text style={styles.kickerGrey}>{ranked.length} KATEGORİ</Text>
      </View>
      {[...ranked, ...unranked].map((g) => {
        const st = d.games[g.id];
        const avg = st && st.timed ? formatTime(Math.round(st.totalSec / st.timed)) : null;
        const bg = GLYPH_BG[g.id];
        return (
          <View key={g.id} style={styles.recRow}>
            <GameGlyph id={g.id} size={38} radius={9} bg={bg || ed.surfaceAlt} color={bg ? ed.onPrimary : ed.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.recName}>{g.title}</Text>
              <Text style={styles.recSub}>{st && st.solved ? `${st.solved} Çözüm${avg ? ` · Ort. ${avg}` : ''}` : 'Henüz çözülmedi'}</Text>
            </View>
            {st && st.fastest ? (
              <View style={{ alignItems: 'flex-end' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <BoltIcon size={12} color={ed.accent} />
                  <Text style={styles.recTime}>{formatTime(st.fastest)}</Text>
                </View>
                <Text style={styles.recBest}>En Hızlı</Text>
              </View>
            ) : (
              <Text style={styles.recNone}>—</Text>
            )}
          </View>
        );
      })}
      <Text style={styles.footer}>Süre ve ipucu kayıtları 1.1, karşılaşılan kelime sayımı 1.3 güncellemesinden itibaren tutuluyor (yalnızca çözülen bulmacalar).</Text>
    </ScrollView>
  );
}

const card = { backgroundColor: ed.surface, borderRadius: 14, borderWidth: 1, borderColor: ed.border };
const styles = StyleSheet.create({
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  big: { ...card, width: '48.4%', padding: 14, minHeight: 118 },
  bigHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bigLabel: { fontFamily: efonts.labelBold, fontSize: 10, letterSpacing: 1.1, color: ed.textSoft },
  bigIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bigValue: { fontFamily: efonts.headlineBold, fontSize: 38, lineHeight: 46, color: ed.text, marginTop: 6 },
  bigSub: { fontFamily: efonts.body, fontSize: 11.5, color: ed.textSoft },
  card: { ...card, padding: 16, marginTop: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start' },
  kicker: { fontFamily: efonts.labelBold, fontSize: 10, letterSpacing: 1.2, color: ed.accent },
  kickerGrey: { fontFamily: efonts.labelBold, fontSize: 10, letterSpacing: 1.1, color: ed.textSoft },
  cardTitle: { fontFamily: efonts.headlineBold, fontSize: 21, lineHeight: 26, color: ed.text },
  sectionTitle: { fontFamily: efonts.headlineBold, fontSize: 22, lineHeight: 27, color: ed.text },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ed.accentSoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: efonts.labelBold, fontSize: 11, color: ed.accentInk },
  rateText: { fontFamily: efonts.bodyBold, fontSize: 15.5, color: ed.text },
  rateSmall: { fontFamily: efonts.label, fontSize: 11.5, color: ed.textSoft },
  dualBar: { flexDirection: 'row', height: 9, borderRadius: 5, overflow: 'hidden', marginTop: 8, backgroundColor: ed.surfaceDim },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  legendText: { fontFamily: efonts.body, fontSize: 11.5, color: ed.textSoft },
  mini3: { flexDirection: 'row', gap: 8, marginTop: 14 },
  mini: { flex: 1, backgroundColor: ed.surfaceAlt, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  miniLabel: { fontFamily: efonts.labelBold, fontSize: 9.5, letterSpacing: 1, color: ed.textSoft },
  miniValue: { fontFamily: efonts.bodyBold, fontSize: 20, color: ed.text, marginTop: 2 },
  miniSub: { fontFamily: efonts.body, fontSize: 10.5, color: ed.textSoft },
  lastWord: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ed.surfaceAlt, borderRadius: 12, padding: 12, marginTop: 12 },
  qBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: ed.primary, alignItems: 'center', justifyContent: 'center' },
  qText: { fontFamily: efonts.headlineBold, fontSize: 18, color: ed.onPrimary },
  lastWordTitle: { fontFamily: efonts.bodyBold, fontSize: 16, color: ed.text },
  lastWordSub: { fontFamily: efonts.body, fontSize: 12, color: ed.textSoft },
  weekNum: { fontFamily: efonts.headlineBold, fontSize: 34, lineHeight: 38, color: ed.text },
  weekLabel: { fontFamily: efonts.body, fontSize: 13.5, color: ed.textSoft, marginBottom: 5 },
  cleanPct: { fontFamily: efonts.bodyBold, fontSize: 17, color: ed.accent },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 150, marginTop: 10 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  bestDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ed.accentStrong },
  colValue: { fontFamily: efonts.label, fontSize: 11, color: ed.textSoft },
  colBar: { width: '62%', borderRadius: 3 },
  colDay: { fontFamily: efonts.label, fontSize: 11, color: ed.textSoft },
  timeBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ed.surfaceAlt, borderRadius: 12, padding: 12, marginTop: 14 },
  timeIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#5BB8D0', alignItems: 'center', justifyContent: 'center' },
  timeTitle: { fontFamily: efonts.bodyBold, fontSize: 16, color: ed.text },
  timeDelta: { fontFamily: efonts.bodySemi, fontSize: 12, color: ed.accent },
  timeSub: { fontFamily: efonts.body, fontSize: 12, color: ed.textSoft, marginTop: 1 },
  recRow: { ...card, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginTop: 10 },
  recName: { fontFamily: efonts.bodyBold, fontSize: 15, color: ed.text },
  recSub: { fontFamily: efonts.body, fontSize: 12, color: ed.textSoft, marginTop: 1 },
  recTime: { fontFamily: efonts.labelBold, fontSize: 15, color: ed.accent, fontVariant: ['tabular-nums'] },
  recBest: { fontFamily: efonts.label, fontSize: 10, color: ed.textSoft },
  recNone: { fontFamily: efonts.labelBold, fontSize: 15, color: ed.textMute },
  footer: { fontFamily: efonts.body, fontSize: 11.5, color: ed.textMute, textAlign: 'center', marginTop: 18 },
});
