// Bulmaca arşivi: son 30 günün "Günün Gazete Bulmacası" (kaçırdığın günleri sonradan çöz)
import React, { useMemo } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackBar from '../components/BackBar';
import { CheckIcon, ChevronRight, ClockIcon } from '../components/UiIcons';
import { archiveDays, ARCHIVE_DAYS } from '../engine/session';
import { ed, efonts, formatTime } from '../theme';

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export default function ArchiveScreen({ onOpen, onBack }) {
  const insets = useSafeAreaInsets();
  const days = useMemo(() => archiveDays(), []);
  const solved = days.filter((d) => d.state === 'solved').length;
  return (
    <View style={[styles.root, { paddingTop: insets.top + 6 }]}>
      <FlatList
        data={days}
        keyExtractor={(d) => d.key}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 8 }}
        ListHeaderComponent={
          <View style={styles.head}>
            <Text style={styles.kicker}>GEÇMİŞ GÜNLER</Text>
            <Text style={styles.title}>Bulmaca Arşivi</Text>
            <Text style={styles.sub}>
              Son {ARCHIVE_DAYS} günün gazete bulmacaları. Kaçırdığın günleri şimdi çöz · {solved}/{days.length} çözüldü
            </Text>
          </View>
        }
        renderItem={({ item: d }) => {
          const done = d.state === 'solved';
          const started = d.state === 'started';
          return (
            <Pressable style={({ pressed }) => [styles.row, done && styles.rowDone, pressed && { opacity: 0.85 }]} onPress={() => onOpen(d.key)}>
              <View style={[styles.dateBox, done && { backgroundColor: ed.goodSoft }]}>
                <Text style={[styles.dateNum, done && { color: ed.good }]}>{d.date.getDate()}</Text>
                <Text style={[styles.dateMon, done && { color: ed.good }]}>{MONTHS[d.date.getMonth()].slice(0, 3).toLocaleUpperCase('tr-TR')}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{DAYS[d.date.getDay()]}</Text>
                <Text style={styles.rowSub}>Gazete Bulmacası · No. {d.no}</Text>
              </View>
              {done ? (
                <View style={styles.pillDone}>
                  <CheckIcon size={13} color={ed.good} />
                  <Text style={styles.pillDoneText}>{d.seconds ? formatTime(d.seconds) : 'Çözüldü'}</Text>
                </View>
              ) : started ? (
                <View style={styles.pill}>
                  <ClockIcon size={13} color={ed.accentInk} />
                  <Text style={styles.pillText}>Devam et</Text>
                </View>
              ) : (
                <Text style={styles.solve}>Çöz</Text>
              )}
              <ChevronRight size={14} color={ed.textMute} />
            </Pressable>
          );
        }}
      />
      <BackBar onPress={onBack} bottomInset={insets.bottom} caption={`${solved}/${days.length} çözüldü`} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ed.bg },
  head: { paddingBottom: 8 },
  kicker: { fontFamily: efonts.labelBold, fontSize: 10.5, letterSpacing: 1.3, color: ed.accent },
  title: { fontFamily: efonts.headlineBold, fontSize: 28, lineHeight: 34, color: ed.text },
  sub: { fontFamily: efonts.body, fontSize: 13.5, lineHeight: 19, color: ed.textSoft, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ed.surface, borderRadius: 14, borderWidth: 1, borderColor: ed.border, padding: 12 },
  rowDone: { borderColor: ed.goodLine },
  dateBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: ed.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  dateNum: { fontFamily: efonts.headlineBold, fontSize: 20, lineHeight: 22, color: ed.text },
  dateMon: { fontFamily: efonts.labelBold, fontSize: 9.5, letterSpacing: 0.8, color: ed.textSoft },
  rowTitle: { fontFamily: efonts.bodyBold, fontSize: 15.5, color: ed.text },
  rowSub: { fontFamily: efonts.body, fontSize: 12.5, color: ed.textSoft, marginTop: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ed.accentSoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  pillText: { fontFamily: efonts.labelBold, fontSize: 11, color: ed.accentInk },
  pillDone: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ed.goodSoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  pillDoneText: { fontFamily: efonts.labelBold, fontSize: 11, color: ed.good },
  solve: { fontFamily: efonts.labelBold, fontSize: 12.5, color: ed.accent },
});
