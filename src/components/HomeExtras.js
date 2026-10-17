// Ana sayfa kartları: Günün Kelimesi, Haftalık Meydan Okuma, Alıştırmalar
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import LearnModal from './LearnModal';
import { SpeakerIcon } from './Icons';
import { SunIcon, TrophyIcon, BoltIcon, MicIcon, BookOpenIcon, CheckIcon, ArrowRight } from './UiIcons';
import { getStore } from '../storage';
import { LEVEL_NAMES, posTr } from '../engine/words';
import { getWordOfDay, markWordOfDaySeen, addToNotebook, weekly, getLevel, getExtra } from '../engine/session';
import { speakWord } from '../speech';
import { ed, efonts } from '../theme';

const cap = (a) => a.charAt(0) + a.slice(1).toLowerCase();

export function WordOfDayCard() {
  const w = getWordOfDay();
  const [inBook, setInBook] = useState(!!getStore().learn.marked[w.a]);
  const [open, setOpen] = useState(false);
  useEffect(() => markWordOfDaySeen(), []);
  const ex = w.ex && w.ex[0];
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <SunIcon size={15} color={ed.orange} />
        <Text style={styles.kicker}>GÜNÜN KELİMESİ</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.tag}>
          {LEVEL_NAMES[w.l]} · {posTr(w.p)}
        </Text>
      </View>
      <View style={[styles.row, { marginTop: 8, alignItems: 'flex-end' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.word}>{cap(w.a)}</Text>
          {w.ipa ? <Text style={styles.ipa}>/{w.ipa}/</Text> : null}
        </View>
        <Pressable onPress={() => speakWord(w.a, 0.8)} hitSlop={8} style={styles.speak}>
          <SpeakerIcon size={20} color={ed.primary} />
        </Pressable>
      </View>
      <Text style={styles.meaning}>{w.m.slice(0, 3).join(', ')}</Text>
      {ex ? (
        <Pressable style={styles.exBox} onPress={() => speakWord(ex[0], 0.85)}>
          <Text style={styles.exEn}>“{ex[0]}”</Text>
          <Text style={styles.exTr}>{ex[1]}</Text>
        </Pressable>
      ) : null}
      <View style={[styles.row, { marginTop: 12, gap: 8 }]}>
        <Pressable
          style={[styles.btn, inBook && styles.btnDone]}
          disabled={inBook}
          onPress={() => {
            addToNotebook(w.a);
            setInBook(true);
          }}
        >
          {inBook ? <CheckIcon size={14} color={ed.good} /> : <BookOpenIcon size={15} color={ed.onPrimary} />}
          <Text style={[styles.btnText, inBook && { color: ed.good }]}>{inBook ? 'Defterinde' : 'Deftere ekle'}</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setOpen(true)}>
          <Text style={[styles.btnText, { color: ed.primary }]}>Kelime kartı</Text>
        </Pressable>
      </View>
      {open ? <LearnModal answer={w.a} clue={w.c} remaining={null} onClose={() => setOpen(false)} /> : null}
    </View>
  );
}

export function WeeklyCard({ onOpen }) {
  const cur = weekly.peekDaily();
  const solved = !!cur?.solved;
  const started = cur && Object.keys(cur.entries || {}).length > 0;
  const lv = getLevel(cur?.levelId || weekly.level());
  const dow = new Date().getDay(); // 0 pazar
  const left = dow === 0 ? 0 : 7 - dow;
  const champs = Object.keys(getExtra().weekly.done).length;
  return (
    <Pressable style={({ pressed }) => [styles.weekly, pressed && { opacity: 0.92 }]} onPress={onOpen}>
      <View style={styles.row}>
        <TrophyIcon size={15} color={ed.gold} />
        <Text style={[styles.kicker, { color: ed.gold }]}>HAFTALIK MEYDAN OKUMA</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.weeklyTag}>{lv.mixed ? 'KARIŞIK' : lv.id} · ZOR</Text>
      </View>
      <Text style={styles.weeklyTitle}>{solved ? 'Bu haftanın şampiyonu sensin!' : 'Bir üst seviyeden büyük bulmaca'}</Text>
      <Text style={styles.weeklyText}>
        {solved
          ? `Yeni meydan okuma pazartesi geliyor. Toplam ${champs} haftayı tamamladın.`
          : left === 0
            ? 'Bugün son gün! Bitir, “Haftanın Şampiyonu” rozetini kap.'
            : `Bitirmek için ${left} gün daha var. Bitirene özel rozet!`}
      </Text>
      <View style={[styles.row, { marginTop: 12 }]}>
        <View style={{ flex: 1 }} />
        <View style={styles.weeklyCta}>
          <Text style={styles.weeklyCtaText}>{solved ? 'Tekrar bak' : started ? 'Devam et' : 'Meydan okumaya başla'}</Text>
          <ArrowRight size={14} color={ed.primary} />
        </View>
      </View>
    </Pressable>
  );
}

export function PracticeTiles({ onOpen, width }) {
  const ta = getExtra().ta.best;
  const tiles = [
    { id: 'review', title: 'Kelime Tekrarı', sub: '5 soru türü', icon: <BookOpenIcon size={22} color={ed.accentInk} />, bg: ed.accentSoft, route: { name: 'review', source: 'notebook', mode: 'mix' } },
    { id: 'ta', title: 'Zamana Karşı', sub: ta ? `Rekor ${ta}` : '60 saniye', icon: <BoltIcon size={22} color={ed.orange} />, bg: ed.orangeSoft, route: { name: 'timeattack' } },
    { id: 'pron', title: 'Telaffuz', sub: 'Söyle, kontrol et', icon: <MicIcon size={22} color={ed.primary} />, bg: ed.surfaceAlt, route: { name: 'pronounce' } },
  ];
  return (
    <View style={styles.tiles}>
      {tiles.map((t) => (
        <Pressable key={t.id} style={({ pressed }) => [styles.tile, { width }, pressed && { backgroundColor: ed.surfaceAlt }]} onPress={() => onOpen(t.route)}>
          <View style={[styles.tileIcon, { backgroundColor: t.bg }]}>{t.icon}</View>
          <Text style={styles.tileName} numberOfLines={1}>
            {t.title}
          </Text>
          <Text style={styles.tileSub} numberOfLines={1}>
            {t.sub}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const base = { backgroundColor: ed.surface, borderRadius: 14, borderWidth: 1, borderColor: ed.border };
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  card: { ...base, padding: 16, marginTop: 12 },
  kicker: { fontFamily: efonts.labelBold, fontSize: 10.5, letterSpacing: 1.2, color: ed.orange },
  tag: { fontFamily: efonts.labelBold, fontSize: 10.5, color: ed.textSoft },
  word: { fontFamily: efonts.headlineBold, fontSize: 32, lineHeight: 38, color: ed.text },
  ipa: { fontSize: 14, color: ed.accentInk },
  speak: { width: 40, height: 40, borderRadius: 20, backgroundColor: ed.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  meaning: { fontFamily: efonts.bodySemi, fontSize: 15, color: ed.text, marginTop: 8 },
  exBox: { backgroundColor: ed.surfaceAlt, borderRadius: 10, padding: 11, marginTop: 10 },
  exEn: { fontFamily: efonts.headlineItalic, fontSize: 15, lineHeight: 21, color: ed.text },
  exTr: { fontFamily: efonts.body, fontSize: 12.5, lineHeight: 17, color: ed.textSoft, marginTop: 3 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: ed.primary, borderRadius: 10, paddingVertical: 10 },
  btnDone: { backgroundColor: ed.goodSoft },
  btnGhost: { backgroundColor: ed.surfaceAlt },
  btnText: { fontFamily: efonts.bodyBold, fontSize: 13.5, color: ed.onPrimary },
  weekly: { backgroundColor: ed.primary, borderRadius: 16, padding: 16, marginTop: 12 },
  weeklyTag: { fontFamily: efonts.labelBold, fontSize: 10, letterSpacing: 0.8, color: '#C9D6E3' },
  weeklyTitle: { fontFamily: efonts.headlineBold, fontSize: 22, lineHeight: 28, color: '#FFFFFF', marginTop: 6 },
  weeklyText: { fontFamily: efonts.body, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.78)', marginTop: 4 },
  weeklyCta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 },
  weeklyCtaText: { fontFamily: efonts.bodyBold, fontSize: 13.5, color: ed.primary },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { ...base, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6, gap: 4 },
  tileIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tileName: { fontFamily: efonts.bodyBold, fontSize: 13.5, color: ed.text, marginTop: 4 },
  tileSub: { fontFamily: efonts.body, fontSize: 11, color: ed.textSoft },
});
