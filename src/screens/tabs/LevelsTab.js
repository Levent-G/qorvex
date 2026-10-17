// Seviyeler sekmesi — "CEFR Seviyeleri" ("Editorial Intellect" tasarımı)
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { PageTitle } from '../../components/TabChrome';
import { BadgeCheckIcon, FlameIcon, BookOpenIcon, PlayIcon, ChevronRight } from '../../components/UiIcons';
import { LEVELS, getStats, getProfile, setProfileLevel, LEVEL_GOAL, notebookWords } from '../../engine/session';
import { GAMES } from '../../games';
import { ed, efonts } from '../../theme';

const NAME = {
  A1: 'Keşif & Giriş',
  A2: 'Temel Pratik',
  B1: 'Orta Seviye',
  B2: 'Orta Üstü',
  C1: 'İleri Düzey',
  C2: 'Ustalık & Retorik',
  MIX: 'Karışık Seviye',
};
const SHORT = { A1: 'BAŞLANGIÇ', A2: 'TEMEL', B1: 'ORTA', B2: 'ORTA ÜSTÜ', C1: 'İLERİ', C2: 'USTALIK' };
const ABOUT = {
  A1: 'Günlük en temel kelimeler: aile, renkler, sayılar, yiyecekler.',
  A2: 'Temel kavramlar, seyahat, alışveriş ve iş kelimeleri.',
  B1: 'Gündelik diyaloglar, gazete haberleri ve deyimler.',
  B2: 'Karmaşık metinler, soyut düşünceler ve zengin anlatım.',
  C1: 'Edebi ifadeler, akademik ve resmi kelimeler.',
  C2: 'Nadir kullanılan deyimler, klasik edebiyat ve retorik.',
  MIX: 'Tüm seviyelerden rastgele derlenen dinamik bulmacalar ile esnek zihin antrenmanı.',
};

export default function LevelsTab({ onPlay }) {
  const [, force] = useState(0);
  const stats = getStats();
  const profile = getProfile();
  const words = notebookWords().length;
  // seviye başına tüm oyunlarda çözülen bulmaca
  const solvedAt = (id) => Math.max(stats.levelSolved[id] || 0, GAMES.reduce((a, g) => a + (g.levelState(id)?.solvedCount || 0), 0));
  const choose = (id) => {
    setProfileLevel(id);
    force((x) => x + 1);
  };
  const cur = LEVELS.find((l) => l.id === profile.level) || LEVELS[0];
  const curDone = Math.min(LEVEL_GOAL, solvedAt(cur.id));
  const curPct = Math.round((curDone / LEVEL_GOAL) * 100);
  const cefr = LEVELS.filter((l) => !l.mixed);
  const completed = (id) => (profile.completed && profile.completed[id]) || solvedAt(id) >= LEVEL_GOAL;
  const doneCount = cefr.filter((l) => completed(l.id)).length;
  const mix = LEVELS.find((l) => l.mixed);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
      <PageTitle
        kicker="✓ STANDARDİZE DİL ATLASI"
        title="CEFR Seviyeleri"
        sub={`Kelime dağarcığına uygun zorluk seviyesini seç. Her seviyede ${LEVEL_GOAL} bulmaca tamamlandığında otomatik olarak üst seviyeye geçersin.`}
      />

      {/* Mevcut seviye */}
      <View style={styles.hero}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>● MEVCUT TEMPO</Text>
            </View>
            <Text style={styles.heroTitle}>
              {cur.mixed ? 'Karışık' : cur.id} · {NAME[cur.id]}
            </Text>
          </View>
          <View style={styles.heroPct}>
            <Text style={styles.heroPctText}>%{curPct}</Text>
          </View>
        </View>
        <View style={styles.heroBar}>
          <View style={[styles.heroBarFill, { width: `${curPct}%` }]} />
        </View>
        <Text style={styles.heroLine}>
          {curDone} / {LEVEL_GOAL} bulmaca tamamlandı · Hedefe {LEVEL_GOAL - curDone} bulmaca kaldı
        </Text>
        <View style={styles.heroFoot}>
          <View style={styles.heroStat}>
            <BookOpenIcon size={15} color="#7FD3E6" />
            <Text style={styles.heroStatText}>{words} defter kelimesi</Text>
          </View>
          <View style={styles.heroStat}>
            <FlameIcon size={15} color={ed.orange} />
            <Text style={styles.heroStatText}>{stats.streak} günlük seri</Text>
          </View>
        </View>
      </View>

      <View style={styles.listHead}>
        <Text style={styles.listHeadText}>KADEMELER & KATMANLAR</Text>
        <Text style={styles.listHeadRight}>
          {doneCount} / {cefr.length} Tamamlandı
        </Text>
      </View>

      {cefr.map((lv) => {
        const done = Math.min(LEVEL_GOAL, solvedAt(lv.id));
        const isCur = lv.id === profile.level;
        const isDone = completed(lv.id);
        if (isCur) {
          return (
            <View key={lv.id} style={styles.curCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={styles.curPill}>
                  <Text style={styles.curPillText}>⚑ ŞU ANKİ SEVİYE</Text>
                </View>
                <Text style={styles.curCount}>
                  {done} / {LEVEL_GOAL} Bulmaca
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <View style={styles.curBadge}>
                  <Text style={styles.curBadgeText}>{lv.id}</Text>
                  <Text style={styles.curBadgeSub}>AKTİF</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.curTitle}>
                    {lv.id} · {NAME[lv.id]}
                  </Text>
                  <Text style={styles.curAbout}>{ABOUT[lv.id]}</Text>
                </View>
              </View>
              <View style={styles.curBar}>
                <View style={[styles.curBarFill, { width: `${(done / LEVEL_GOAL) * 100}%` }]} />
              </View>
              <Pressable style={styles.playBtn} onPress={onPlay}>
                <Text style={styles.playText}>Oynamaya Devam Et</Text>
                <PlayIcon size={14} />
              </Pressable>
            </View>
          );
        }
        return (
          <View key={lv.id} style={styles.card}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{lv.id}</Text>
                <Text style={styles.badgeSub} numberOfLines={1}>
                  {SHORT[lv.id]}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={styles.title}>
                    {lv.id} · {NAME[lv.id]}
                  </Text>
                  {isDone ? (
                    <View style={styles.doneTag}>
                      <BadgeCheckIcon size={11} color={ed.accentInk} />
                      <Text style={styles.doneTagText}>Tamamlandı</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.about} numberOfLines={1}>
                  {ABOUT[lv.id]}
                </Text>
              </View>
            </View>
            <View style={styles.cardFoot}>
              <Text style={styles.footText}>
                {isDone ? '● ' : ''}
                {done}/{LEVEL_GOAL} bulmaca çözüldü
              </Text>
              <Pressable onPress={() => choose(lv.id)} hitSlop={6} style={isDone ? null : styles.switchBtn}>
                <Text style={isDone ? styles.replay : styles.switchText}>{isDone ? 'Tekrar Oyna' : 'Geçiş Yap'}</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      {/* Karışık seviye */}
      {mix ? (
        <Pressable style={[styles.mixCard, profile.level === mix.id && { borderColor: ed.accent, borderWidth: 2 }]} onPress={() => choose(mix.id)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.mixKicker}>⤨ ÖZEL KULÜP MODU</Text>
            <Text style={styles.mixTitle}>Karışık Seviye (Dinamik)</Text>
            <Text style={styles.mixAbout}>{ABOUT.MIX}</Text>
          </View>
          <View style={styles.mixIcon}>{profile.level === mix.id ? <BadgeCheckIcon size={22} color={ed.accentInk} /> : <ChevronRight size={20} color={ed.accentInk} />}</View>
        </Pressable>
      ) : null}
      <Text style={styles.footer}>CEFR ölçeği, Avrupa Ortak Dil Kriterleri referans alınarak uyarlanmıştır.</Text>
    </ScrollView>
  );
}

const card = { backgroundColor: ed.surface, borderRadius: 14, borderWidth: 1, borderColor: ed.border };
const styles = StyleSheet.create({
  hero: { backgroundColor: ed.primary, borderRadius: 16, padding: 16, marginTop: 14 },
  heroPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(127,211,230,0.18)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  heroPillText: { fontFamily: efonts.labelBold, fontSize: 9.5, letterSpacing: 1, color: '#7FD3E6' },
  heroTitle: { fontFamily: efonts.bodyBold, fontSize: 20, color: ed.onPrimary, marginTop: 8 },
  heroPct: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  heroPctText: { fontFamily: efonts.bodyBold, fontSize: 16, color: '#7FD3E6' },
  heroBar: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 14, overflow: 'hidden' },
  heroBarFill: { height: '100%', backgroundColor: '#7FD3E6' },
  heroLine: { fontFamily: efonts.label, fontSize: 11.5, color: '#C9D6E3', marginTop: 8 },
  heroFoot: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginTop: 12, paddingTop: 10 },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroStatText: { fontFamily: efonts.bodySemi, fontSize: 12.5, color: ed.onPrimary },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 8 },
  listHeadText: { fontFamily: efonts.labelBold, fontSize: 11, letterSpacing: 1.1, color: ed.textSoft },
  listHeadRight: { fontFamily: efonts.labelBold, fontSize: 11, color: ed.textSoft },
  card: { ...card, padding: 14, marginBottom: 10 },
  badge: { width: 48, height: 48, borderRadius: 10, backgroundColor: ed.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: efonts.bodyBold, fontSize: 16, color: ed.text },
  badgeSub: { fontFamily: efonts.labelBold, fontSize: 6.5, color: ed.textSoft },
  title: { fontFamily: efonts.bodyBold, fontSize: 15.5, color: ed.text },
  doneTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: ed.accentSoft, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 2 },
  doneTagText: { fontFamily: efonts.labelBold, fontSize: 10, color: ed.accentInk },
  about: { fontFamily: efonts.body, fontSize: 12.5, color: ed.textSoft, marginTop: 3 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  footText: { fontFamily: efonts.label, fontSize: 11.5, color: ed.textSoft },
  replay: { fontFamily: efonts.labelBold, fontSize: 12, color: ed.accent },
  switchBtn: { backgroundColor: ed.surfaceAlt, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 },
  switchText: { fontFamily: efonts.labelBold, fontSize: 11.5, color: ed.text },
  curCard: { backgroundColor: ed.accentSoft, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: ed.accentLine },
  curPill: { backgroundColor: ed.accentStrong, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  curPillText: { fontFamily: efonts.labelBold, fontSize: 10, letterSpacing: 0.8, color: ed.onPrimary },
  curCount: { fontFamily: efonts.labelBold, fontSize: 11.5, color: ed.accentInk },
  curBadge: { width: 56, height: 56, borderRadius: 10, backgroundColor: ed.accentStrong, alignItems: 'center', justifyContent: 'center' },
  curBadgeText: { fontFamily: efonts.bodyBold, fontSize: 20, color: ed.onPrimary },
  curBadgeSub: { fontFamily: efonts.labelBold, fontSize: 8, color: ed.accentLine },
  curTitle: { fontFamily: efonts.bodyBold, fontSize: 18, color: ed.text },
  curAbout: { fontFamily: efonts.body, fontSize: 13, lineHeight: 18, color: ed.textSoft, marginTop: 3 },
  curBar: { height: 6, borderRadius: 3, backgroundColor: ed.accentLine, marginTop: 14, overflow: 'hidden' },
  curBarFill: { height: '100%', backgroundColor: ed.accentStrong },
  playBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ed.primary, borderRadius: 10, paddingVertical: 14, marginTop: 14 },
  playText: { fontFamily: efonts.bodyBold, fontSize: 15, color: ed.onPrimary },
  mixCard: { ...card, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, marginTop: 6 },
  mixKicker: { fontFamily: efonts.labelBold, fontSize: 10, letterSpacing: 1, color: ed.accent },
  mixTitle: { fontFamily: efonts.bodyBold, fontSize: 17, color: ed.text, marginTop: 4 },
  mixAbout: { fontFamily: efonts.body, fontSize: 12.5, lineHeight: 17, color: ed.textSoft, marginTop: 3 },
  mixIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: ed.accentSoft, alignItems: 'center', justifyContent: 'center' },
  footer: { fontFamily: efonts.body, fontSize: 11.5, color: ed.textMute, textAlign: 'center', marginTop: 18 },
});
