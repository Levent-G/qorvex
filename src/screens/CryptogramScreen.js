// Şifreli Cümle (Cryptogram): örnek cümle harf değiştirme şifresiyle verilir; Türkçesi ipucudur.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Keyboard from '../components/Keyboard';
import BackBar, { BACK_BAR_HEIGHT } from '../components/BackBar';
import { useGameSession, LoadingPage, GameHeader, HintMenu, useSolvedEffect, useLearnCard, shellStyles } from '../components/GameShell';
import {
  makeCrypto, initCrypto, select, typeLetter, deleteLetter, reveal, isSolved, allFilled, reading, wordStatuses,
} from '../engine/cryptoBoard';
import { cryptogram, getLevel } from '../engine/session';
import { persist } from '../storage';
import { colors, fonts } from '../theme';

const STATUS_BG = { ok: colors.okCell, close: colors.closeCell, bad: colors.badCell };

function Board({ session, kind, levelId, onBack, onNext }) {
  const p = session.puzzle;
  const level = getLevel(levelId);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const learn = useLearnCard(session);
  const [menu, setMenu] = useState(false);
  const c = useMemo(() => makeCrypto(p), [p]);
  const [st, setSt] = useState(() => initCrypto(c, session.entries || {}, session.revealed || {}));

  useEffect(() => {
    session.entries = st.guess;
    session.revealed = st.revealed;
    persist();
  }, [st.guess, st.revealed, session]);

  const solved = isSolved(c, st);
  const filled = allFilled(c, st);
  // bitince modal yok: çözülen cümle altta okunur, oyuncu "Sonraki cümle" ile kendisi geçer
  useSolvedEffect(solved, session, () => cryptogram.markSolved(kind, levelId));
  const plain = p.orig || p.text.charAt(0) + p.text.slice(1).toLowerCase();
  const words = useMemo(() => wordStatuses(c, st), [c, st]);
  const wrongWords = words.filter((w) => w.status && w.status !== 'ok').length;
  const selC = c.enc[st.sel];

  // Hepsi dolu ama çözülmediyse uyar
  const warned = useRef(false);
  useEffect(() => {
    if (filled && !solved && !warned.current) {
      warned.current = true;
      learn.showToast(`Tüm harfler dolu ama ${wrongWords} kelime yanlış: kırmızı ve sarı kelimelere bak`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
    if (!filled) warned.current = false;
  }, [filled, solved, wrongWords]);

  const onKey = useCallback(
    (ch) => {
      if (solved) return;
      setSt((s) => typeLetter(c, s, ch));
      Haptics.selectionAsync().catch(() => {});
    },
    [solved, c],
  );
  const onDelete = useCallback(() => setSt((s) => deleteLetter(c, s)), [c]);

  // Kelimelere böl (satır kaydırma kelime bütünlüğünü korusun); her kelimenin durumu
  const tokens = useMemo(() => {
    const out = [];
    let cur = [];
    c.enc.split('').forEach((ch, i) => {
      if (ch === ' ') {
        if (cur.length) out.push(cur);
        cur = [];
      } else cur.push(i);
    });
    if (cur.length) out.push(cur);
    return out;
  }, [c]);
  const statusAt = (i) => (words.find((w) => i >= w.start && i < w.end) || {}).status;

  const maxWord = Math.max(...tokens.map((t) => t.length));
  const cell = Math.max(24, Math.min(40, Math.floor((width - 32 - (maxWord - 1) * 3) / maxWord)));
  const keyH = Math.min(46, Math.max(38, height * 0.052));

  return (
    <View style={shellStyles.root}>
      <GameHeader
        insetTop={insets.top}
        session={session}
        running={!solved}
        subtitle={`${kind === 'daily' ? 'Günün Şifreli Cümlesi' : `Şifreli Cümle · ${level.id === 'MIX' ? 'Karışık' : level.id}`} · No. ${p.no}`}
        onMenu={() => setMenu(true)}
      />
      <View style={shellStyles.kickerRow}>
        <Text style={[shellStyles.kicker, learn.toast && { color: colors.ink }]} numberOfLines={1}>
          {learn.toast || 'KAREYE DOKUN, GERÇEK HARFİ YAZ · ALTTAKİ GRİ HARF ŞİFREDİR'}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <View style={styles.clueBox}>
          <Text style={styles.label}>TÜRKÇESİ · İPUCU</Text>
          <Text style={styles.clueText}>“{p.tr}”</Text>
        </View>

        {/* Şifreli cümle: üstte senin harfin, altta şifreli harf */}
        <View style={styles.sentence}>
          {tokens.map((tok, ti) => (
            <View key={ti} style={styles.word}>
              {tok.map((i) => {
                const ch = c.enc[i];
                if (!/[A-Z]/.test(ch)) {
                  return (
                    <Text key={i} style={[styles.punct, { fontSize: cell * 0.6, lineHeight: cell * 0.9, width: cell * 0.35 }]}>
                      {ch}
                    </Text>
                  );
                }
                const g = st.guess[ch];
                const status = statusAt(i);
                let bg = '#FFFFFF';
                if (status) bg = STATUS_BG[status];
                if (ch === selC) bg = colors.wordHighlight;
                if (i === st.sel) bg = colors.cellActive;
                const fixed = c.given.has(ch) || st.revealed[ch];
                return (
                  <Pressable key={i} onPress={() => setSt((s) => select(c, s, i))} style={[styles.tile, { width: cell }]}>
                    <View style={[styles.top, { height: cell, backgroundColor: bg }]}>
                      <Text
                        allowFontScaling={false}
                        numberOfLines={1}
                        style={[styles.guess, { fontSize: cell * 0.6, lineHeight: cell * 0.8, width: cell - 3, textAlign: 'center' }, fixed && { color: st.revealed[ch] ? colors.revealed : colors.inkSoft }]}
                      >
                        {g || ''}
                      </Text>
                    </View>
                    <View style={styles.bottom}>
                      <Text allowFontScaling={false} style={styles.cipher}>
                        {ch}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Okunuş: çözdüğün kadarıyla cümle düz metin */}
        <View style={[styles.readBox, solved && { borderColor: colors.good, backgroundColor: colors.okCell }]}>
          <Text style={[styles.label, solved && { color: colors.good }]}>{solved ? 'ÇÖZÜLEN CÜMLE ✓' : 'OKUNUŞ · ŞİMDİYE KADAR'}</Text>
          <Text style={styles.readText}>{solved ? plain : reading(c, st)}</Text>
          {solved ? (
            <Pressable onPress={() => learn.openLearn(p.word, p.wordClue)}>
              <Text style={styles.keyWord}>
                Anahtar kelime: <Text style={{ fontFamily: fonts.serifBold }}>{p.word.toLowerCase()}</Text> — {p.wordClue} · kartını aç ›
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <Keyboard onKey={onKey} onDelete={onDelete} keyHeight={keyH} />
      <BackBar
        onPress={onBack}
        bottomInset={insets.bottom}
        caption={`${c.letters.filter((x) => st.guess[x]).length}/${c.letters.length} harf${wrongWords ? ` · ${wrongWords} kelime yanlış` : ''}`}
      />

      <HintMenu
        visible={menu}
        onClose={() => setMenu(false)}
        items={[
          ['Harf aç', 'Seçili şifreli harfin gerçek karşılığını göster', () => setSt((s) => reveal(c, s))],
          ['Kelime kartı', `Cümlenin anahtar kelimesini öğren (kalan hak ${learn.left}/${learn.limit})`, () => learn.openLearn(p.word, p.wordClue)],
          ['Baştan başla', 'Verilenler hariç tüm harfleri sil', () => setSt(initCrypto(c, {}, {}))],
        ]}
        note="Aynı gri harf cümlenin her yerinde aynı gerçek harftir. Kelime dolunca rengi söyler: yeşil doğru, sarı yakın, kırmızı yanlış."
      />
      {learn.modal}
      {solved ? (
        <Pressable style={[shellStyles.nextFab, { bottom: insets.bottom + BACK_BAR_HEIGHT + 16 }]} onPress={kind === 'daily' ? onBack : onNext}>
          <Text style={shellStyles.nextFabText}>{kind === 'daily' ? 'Günün cümlesi tamam · Geri dön' : 'Sonraki cümle →'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function CryptogramScreen({ kind, levelId, onBack }) {
  const { session, error, reload } = useGameSession(cryptogram, kind, levelId);
  if (!session) return <LoadingPage error={error} onRetry={reload} />;
  return (
    <Board
      key={`${session.puzzle.no}-${session.date || levelId}`}
      session={session}
      kind={kind}
      levelId={kind === 'daily' ? 'MIX' : levelId}
      onBack={onBack}
      onNext={reload}
    />
  );
}

const styles = StyleSheet.create({
  clueBox: { borderWidth: 1.5, borderColor: colors.ink, padding: 10, marginVertical: 8, backgroundColor: colors.paperDark },
  label: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 1.6, color: colors.wrong },
  clueText: { fontFamily: fonts.serifItalic, fontSize: 17, lineHeight: 24, color: colors.ink, marginTop: 2 },
  sentence: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, columnGap: 14, marginTop: 10 },
  word: { flexDirection: 'row', gap: 3 },
  tile: { borderWidth: 1.5, borderColor: colors.ink },
  top: { alignItems: 'center', justifyContent: 'center' },
  bottom: { borderTopWidth: 1, borderColor: colors.ink, backgroundColor: colors.paperDark, alignItems: 'center', paddingVertical: 1 },
  guess: { fontFamily: fonts.letter, color: colors.ink, includeFontPadding: false },
  cipher: { fontFamily: fonts.sansBold, fontSize: 11, lineHeight: 14, color: colors.inkSoft },
  punct: { fontFamily: fonts.letter, color: colors.ink, alignSelf: 'flex-start', textAlign: 'center' },
  readBox: { borderWidth: 1.5, borderColor: colors.ink, padding: 10, marginTop: 18 },
  readText: { fontFamily: fonts.serifBold, fontSize: 20, lineHeight: 28, letterSpacing: 1, color: colors.ink, marginTop: 4 },
  keyWord: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 21, color: colors.ink, marginTop: 8 },
});
