// Profil sekmesi ("Editorial Intellect" tasarımı): kimlik, temel sayılar, haftalık ritim, bulmaca dağılımı, tercihler
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Linking, Switch, Alert, Platform } from 'react-native';
import { FlameIcon, TrophyIcon, BookOpenIcon, ChevronRight, CheckIcon, BadgeCheckIcon, GridIcon, LockIcon, BellIcon, MoonIcon, TextSizeIcon } from '../../components/UiIcons';
import { getSettings, setTheme, setTextScale, setReminder, THEMES, TEXT_SCALES } from '../../settings';
import { requestReminderPermission, rescheduleReminders } from '../../reminders';
import BadgeShelf from '../../components/BadgeShelf';
import { currentVersion } from '../../appVersion';
import { getStats, getProfile, notebookWords, getLevel } from '../../engine/session';
import { GAMES, gameTotals } from '../../games';
import { ed, efonts } from '../../theme';

const DAY = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const DIST_COLORS = [ed.primary, ed.accentStrong, '#2B4A6B', '#7FD3E6', '#B8BEC6', '#9BB3C9', '#5BB8D0', '#D0D5DB', '#E4E7EB'];

function Stat({ label, value, unit, sub, icon, iconBg, labelColor }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statHead}>
        <Text style={[styles.statLabel, labelColor && { color: labelColor }]}>{label}</Text>
        <View style={[styles.statIcon, { backgroundColor: iconBg || ed.surfaceAlt }]}>{icon}</View>
      </View>
      <Text style={styles.statValue}>
        {value}
        {unit ? <Text style={[styles.statUnit, labelColor && { color: labelColor }]}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

// ayar değişince ekran yeniden kurulur; kaydırma konumu korunsun
let lastScrollY = 0;
const HOURS = [9, 13, 18, 20, 22];
const pad = (n) => (n < 10 ? '0' + n : '' + n);

function Segmented({ options, value, onChange }) {
  return (
    <View style={styles.seg}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={String(o.value)} onPress={() => onChange(o.value)} style={[styles.segItem, on && styles.segOn]}>
            <Text style={[styles.segText, on && { color: ed.onPrimary }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SettingsCard() {
  const st = getSettings();
  const [rem, setRem] = useState({ ...st.reminder });
  const toggle = async (on) => {
    if (on) {
      const ok = await requestReminderPermission().catch(() => false);
      if (!ok) {
        Alert.alert('Bildirim izni kapalı', 'Hatırlatma için Ayarlar > QORVEX > Bildirimler bölümünden izin ver.', [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Ayarlar', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
    }
    setRem({ ...setReminder({ on }) });
    rescheduleReminders();
  };
  const pickHour = (hour) => {
    setRem({ ...setReminder({ hour, minute: 0 }) });
    rescheduleReminders();
  };
  return (
    <View style={[styles.card, { marginTop: 8, paddingVertical: 4 }]}>
      <View style={[styles.setRow, rem.on ? { borderBottomWidth: 0, paddingBottom: 6 } : null]}>
        <View style={styles.setIcon}>
          <BellIcon size={17} color={ed.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.setTitle}>Günlük Hatırlatma</Text>
          <Text style={styles.setSub}>{rem.on ? `Her gün ${pad(rem.hour)}:${pad(rem.minute || 0)} · o gün çözdüysen gelmez` : 'Kapalı · serini korumana yardım eder'}</Text>
        </View>
        <Switch value={rem.on} onValueChange={toggle} trackColor={{ true: ed.accent, false: ed.surfaceDim }} thumbColor={Platform.OS === 'android' ? ed.surface : undefined} />
      </View>
      {rem.on ? (
        <View style={[styles.setRow, { paddingTop: 0 }]}>
          <Segmented options={HOURS.map((h) => ({ value: h, label: pad(h) + ':00' }))} value={rem.hour} onChange={pickHour} />
        </View>
      ) : null}
      <View style={[styles.setRow, { flexWrap: 'wrap' }]}>
        <View style={styles.setIcon}>
          <MoonIcon size={17} color={ed.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.setTitle}>Görünüm</Text>
          <Text style={styles.setSub}>Açık ya da koyu tema</Text>
        </View>
        <Segmented options={THEMES.map((t) => ({ value: t.id, label: t.label }))} value={st.theme} onChange={setTheme} />
      </View>
      <View style={[styles.setRow, { borderBottomWidth: 0, flexWrap: 'wrap' }]}>
        <View style={styles.setIcon}>
          <TextSizeIcon size={17} color={ed.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.setTitle}>Yazı Boyutu</Text>
          <Text style={styles.setSub}>İpuçları, kartlar ve menüler</Text>
        </View>
        <Segmented options={TEXT_SCALES.map((t) => ({ value: t.k, label: t.label }))} value={st.textScale} onChange={setTextScale} />
      </View>
    </View>
  );
}

function SetRow({ icon, title, sub, right, onPress, last }) {
  return (
    <Pressable style={[styles.setRow, last && { borderBottomWidth: 0 }]} onPress={onPress} disabled={!onPress}>
      <View style={styles.setIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.setTitle}>{title}</Text>
        <Text style={styles.setSub}>{sub}</Text>
      </View>
      {right}
      {onPress ? <ChevronRight size={15} color={ed.textSoft} /> : null}
    </Pressable>
  );
}

export default function ProfileTab({ onTab }) {
  const stats = getStats();
  const profile = getProfile();
  const lv = getLevel(profile.level);
  const words = notebookWords();
  const maxDay = Math.max(1, ...stats.week.map((d) => d.count));
  const weekTotal = stats.week.reduce((a, d) => a + d.count, 0);
  const dist = GAMES.map((g) => ({ g, n: gameTotals(g).solved }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const distTotal = dist.reduce((a, x) => a + x.n, 0);
  const levelLabel = lv.mixed ? 'Karışık Seviye' : `${lv.id} Seviyesi · ${lv.title}`;

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, paddingTop: 12 }}
      showsVerticalScrollIndicator={false}
      contentOffset={{ x: 0, y: lastScrollY }}
      onScroll={(e) => (lastScrollY = e.nativeEvent.contentOffset.y)}
      scrollEventThrottle={64}
    >
      {/* Kimlik */}
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarQ}>Q</Text>
          <View style={styles.avatarBadge}>
            <TrophyIcon size={10} color={ed.onPrimary} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={styles.name}>Bulmaca Oyuncusu</Text>
            <BadgeCheckIcon size={17} color={ed.accent} />
          </View>
          <Text style={styles.levelLine}>● {levelLabel} · Cihazda saklanıyor</Text>
        </View>
      </View>

      {/* Temel sayılar */}
      <View style={styles.grid2}>
        <Stat label="ÇÖZÜLEN" value={stats.total} sub="Tamamlanan bulmaca" icon={<CheckIcon size={14} color={ed.textSoft} />} />
        <Stat
          label="GÜNLÜK SERİ"
          labelColor={ed.orange}
          value={stats.streak}
          unit="GÜN"
          sub={stats.solvedToday ? 'Bugün tamamlandı' : 'Bugün bir bulmaca çöz'}
          icon={<FlameIcon size={14} color={ed.orange} />}
          iconBg={ed.orangeSoft}
        />
        <Stat label="EN UZUN SERİ" labelColor={ed.accent} value={stats.best} unit="GÜN" sub="Kişisel rekor" icon={<TrophyIcon size={14} color={ed.accentInk} />} iconBg={ed.accentSoft} />
        <Stat label="KELİME DEFTERİ" value={words.length} sub="Kayıtlı kelime" icon={<BookOpenIcon size={14} color={ed.textSoft} />} />
      </View>

      {/* Haftalık ritim */}
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Haftalık Ritim</Text>
            <Text style={styles.cardSub}>Son 7 günde çözülen bulmacalar</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Toplam: {weekTotal}</Text>
          </View>
        </View>
        <View style={styles.chart}>
          {stats.week.map((d, i) => {
            const today = i === 6;
            const best = d.count === maxDay && d.count > 0;
            return (
              <View key={i} style={styles.col}>
                <Text style={styles.colValue}>{d.count}</Text>
                <View style={[styles.colBar, { height: 6 + (d.count / maxDay) * 70, backgroundColor: today ? ed.primary : best ? ed.accentStrong : ed.surfaceDim }]} />
                <Text style={[styles.colDay, today && { color: ed.text, fontFamily: efonts.labelBold }]}>{DAY[d.day]}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Bulmaca dağılımı */}
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Bulmaca Dağılımı</Text>
            <Text style={styles.cardSub}>Türlere göre çözülen bulmacalar</Text>
          </View>
          <GridIcon size={18} color={ed.textMute} />
        </View>
        {dist.length ? (
          dist.map(({ g, n }, i) => {
            const pct = Math.round((n / distTotal) * 100);
            return (
              <View key={g.id} style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.dot, { backgroundColor: DIST_COLORS[i % DIST_COLORS.length] }]} />
                  <Text style={styles.distName}>{g.title}</Text>
                  <Text style={styles.distVal}>
                    {n} <Text style={styles.distPct}>({pct}%)</Text>
                  </Text>
                </View>
                <View style={styles.distBar}>
                  <View style={{ width: `${pct}%`, height: '100%', borderRadius: 3, backgroundColor: DIST_COLORS[i % DIST_COLORS.length] }} />
                </View>
              </View>
            );
          })
        ) : (
          <Text style={[styles.cardSub, { marginTop: 10 }]}>Bulmaca çözdükçe burada görünecek.</Text>
        )}
      </View>

      {/* Rozetler */}
      <Text style={styles.sectionLabel}>BAŞARIMLAR</Text>
      <BadgeShelf />

      {/* Ayarlar */}
      <Text style={styles.sectionLabel}>AYARLAR</Text>
      <SettingsCard />

      {/* Tercihler */}
      <Text style={styles.sectionLabel}>TERCİHLER & YÖNETİM</Text>
      <View style={[styles.card, { marginTop: 8, paddingVertical: 4 }]}>
        <SetRow
          icon={<GridIcon size={17} color={ed.primary} />}
          title="Seviyemi Değiştir"
          sub={`Şu an ${lv.mixed ? 'Karışık' : `${lv.id} (${lv.title})`} seçili`}
          right={<Text style={styles.setRight}>A1–C2</Text>}
          onPress={() => onTab('levels')}
        />
        <SetRow
          icon={<BookOpenIcon size={17} color={ed.primary} />}
          title="Kelime Defteri"
          sub={`${words.length} kelime kayıtlı · ara, dinle, çıkar`}
          onPress={() => onTab('notebook')}
        />
        <SetRow icon={<LockIcon size={17} color={ed.primary} />} title="Cihaz Depolaması" sub="Tüm ilerlemen yalnızca bu cihazda saklanır" />
        <SetRow
          icon={<BadgeCheckIcon size={17} color={ed.primary} />}
          title="Hakkında & Gizlilik"
          sub={`QORVEX v${currentVersion()} · Reklamsız`}
          onPress={() => Linking.openURL('https://qorvex.expo.app/privacy')}
          last
        />
      </View>
      <Text style={styles.footer}>QORVEX · BUL · ÇÖZ · ÖĞREN</Text>
    </ScrollView>
  );
}

const card = { backgroundColor: ed.surface, borderRadius: 14, borderWidth: 1, borderColor: ed.border };
const styles = StyleSheet.create({
  hero: { ...card, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  avatar: { width: 60, height: 60, borderRadius: 14, backgroundColor: ed.primary, alignItems: 'center', justifyContent: 'center' },
  avatarQ: { fontFamily: efonts.headlineBold, fontSize: 32, color: ed.onPrimary },
  avatarBadge: { position: 'absolute', right: -4, bottom: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: ed.accentStrong, borderWidth: 2, borderColor: ed.surface, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: efonts.bodyBold, fontSize: 19, color: ed.text },
  levelLine: { fontFamily: efonts.body, fontSize: 12.5, color: ed.textSoft, marginTop: 3 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  stat: { ...card, width: '48.4%', padding: 14 },
  statHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statLabel: { fontFamily: efonts.labelBold, fontSize: 10, letterSpacing: 1, color: ed.textSoft },
  statIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: efonts.bodyBold, fontSize: 30, color: ed.text, marginTop: 8 },
  statUnit: { fontFamily: efonts.labelBold, fontSize: 12, color: ed.textSoft },
  statSub: { fontFamily: efonts.body, fontSize: 11.5, color: ed.textSoft, marginTop: 2 },
  card: { ...card, padding: 16, marginTop: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start' },
  cardTitle: { fontFamily: efonts.bodyBold, fontSize: 17, color: ed.text },
  cardSub: { fontFamily: efonts.body, fontSize: 12, color: ed.textSoft, marginTop: 1 },
  pill: { backgroundColor: ed.surfaceAlt, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: efonts.labelBold, fontSize: 11, color: ed.text },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, marginTop: 12 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  colValue: { fontFamily: efonts.label, fontSize: 11, color: ed.textSoft },
  colBar: { width: '55%', borderRadius: 3 },
  colDay: { fontFamily: efonts.label, fontSize: 11, color: ed.textSoft },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 7 },
  distName: { flex: 1, fontFamily: efonts.bodyMedium, fontSize: 13.5, color: ed.text },
  distVal: { fontFamily: efonts.labelBold, fontSize: 12.5, color: ed.text },
  distPct: { fontFamily: efonts.label, fontSize: 11, color: ed.textSoft },
  distBar: { height: 6, borderRadius: 3, backgroundColor: ed.surfaceAlt, marginTop: 5, overflow: 'hidden' },
  sectionLabel: { fontFamily: efonts.labelBold, fontSize: 11, letterSpacing: 1.1, color: ed.textSoft, marginTop: 22 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: ed.border },
  setIcon: { width: 36, height: 36, borderRadius: 9, backgroundColor: ed.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  setTitle: { fontFamily: efonts.bodyBold, fontSize: 15, color: ed.text },
  setSub: { fontFamily: efonts.body, fontSize: 12, color: ed.textSoft, marginTop: 1 },
  setRight: { fontFamily: efonts.labelBold, fontSize: 11.5, color: ed.accent },
  seg: { flexDirection: 'row', backgroundColor: ed.surfaceAlt, borderRadius: 10, padding: 3, gap: 3, flexBasis: '100%', marginTop: 2 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8 },
  segOn: { backgroundColor: ed.primary },
  segText: { fontFamily: efonts.labelBold, fontSize: 12, color: ed.textSoft },
  footer: { fontFamily: efonts.labelBold, fontSize: 10.5, letterSpacing: 1.4, color: ed.textMute, textAlign: 'center', marginTop: 18 },
});
