// Resim Bulmaca: fotoğraftaki nesnenin İngilizcesini harf taşlarıyla yaz (fotoğraflar Pexels'ten).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Image, ScrollView, StyleSheet, ActivityIndicator, Linking, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import BackBar, { BACK_BAR_HEIGHT } from '../components/BackBar';
import { BookIcon } from '../components/Icons';
import { useGameSession, LoadingPage, GameHeader, HintMenu, useSolvedEffect, useLearnCard, shellStyles } from '../components/GameShell';
import { initSlots, placeTile, removeAt, slotsFull, slotsOk, revealOne } from '../engine/picture';
import { picture, getLevel } from '../engine/session';
import { persist } from '../storage';
import { colors, fonts } from '../theme';

function Board({ session, kind, levelId, onBack, onNext }) {
  const p = session.puzzle;
  const level = getLevel(levelId);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const learn = useLearnCard(session);
  const [menu, setMenu] = useState(false);
  const n = p.rounds.length;

  // Kayıt: idx = gösterilen tur, slots[i] = taş dizisi, done[i] = 'ok' | 'skip', tr[i] = Türkçesi açıldı
  const saved = session.entries && session.entries.slots ? session.entries : null;
  const [idx, setIdx] = useState(saved ? saved.idx || 0 : 0);
  const [slots, setSlots] = useState(() => p.rounds.map((r, i) => (saved && saved.slots[i]) || initSlots(r, p.firstGiven)));
  const [done, setDone] = useState(saved ? saved.done || {} : {});
  const [tr, setTr] = useState(saved ? saved.tr || {} : {});
  const [imgLoading, setImgLoading] = useState(true);
  useEffect(() => {
    session.entries = { idx, slots, done, tr };
    persist();
  }, [idx, slots, done, tr, session]);

  const solved = Object.keys(done).length === n;
  useSolvedEffect(solved, session, () => picture.markSolved(kind, levelId));

  const r = p.rounds[idx];
  const cur = slots[idx];
  const roundDone = done[idx];
  const full = slotsFull(cur);
  const bad = full && !slotsOk(r, cur);

  // Sıradaki fotoğrafı önceden indir
  useEffect(() => {
    setImgLoading(true);
    const nx = p.rounds[idx + 1];
    if (nx) Image.prefetch(nx.photo.url).catch(() => {});
  }, [idx]);

  const nextOpen = (from) => {
    for (let k = 1; k <= n; k++) {
      const j = (from + k) % n;
      if (!done[j]) return j;
    }
    return from;
  };
  const advance = useRef(null);
  useEffect(() => () => clearTimeout(advance.current), []);
  const finishRound = (status) => {
    const nd = { ...done, [idx]: status };
    setDone(nd);
    if (Object.keys(nd).length < n) {
      clearTimeout(advance.current);
      advance.current = setTimeout(() => {
        for (let k = 1; k <= n; k++) {
          const j = (idx + k) % n;
          if (!nd[j]) return setIdx(j);
        }
      }, status === 'ok' ? 1300 : 2000);
    }
  };

  const setCur = (next) => setSlots(slots.map((s, i) => (i === idx ? next : s)));
  const tapTile = (t) => {
    if (roundDone) return;
    const next = placeTile(cur, t);
    if (next === cur) return;
    setCur(next);
    Haptics.selectionAsync().catch(() => {});
    if (slotsFull(next)) {
      if (slotsOk(r, next)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        learn.showToast(`✓ ${r.answer.toLowerCase()} — ${r.clue}`);
        finishRound('ok');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
    }
  };
  const tapSlot = (j) => {
    if (roundDone) return;
    setCur(removeAt(cur, j, p.firstGiven));
  };
  const reveal = () => {
    if (roundDone) return;
    const next = revealOne(r, cur);
    setCur(next);
    if (slotsOk(r, next)) finishRound('ok');
  };
  const skip = () => {
    if (roundDone) return;
    // cevabı göster: her harfi (henüz kullanılmamış) kendi taşına eşle
    const usedT = new Set();
    setCur(
      [...r.answer].map((ch) => {
        const t = [...r.tiles].findIndex((x, i) => x === ch && !usedT.has(i));
        usedT.add(t);
        return t;
      }),
    );
    learn.showToast(`Cevap: ${r.answer.toLowerCase()} — ${r.clue}`);
    finishRound('skip');
  };

  // Ölçüler: fotoğraf kare-ye yakın, taşlar en fazla 8'li satır
  const photoW = width - 32;
  const photoH = Math.min(photoW * 0.78, height * 0.34);
  const perRow = Math.min(8, Math.max(r.tiles.length, r.answer.length));
  const tile = Math.min(44, Math.floor((width - 32 - (perRow - 1) * 6) / perRow));
  const okCount = Object.values(done).filter((x) => x === 'ok').length;

  return (
    <View style={shellStyles.root}>
      <GameHeader
        insetTop={insets.top}
        session={session}
        running={!solved}
        subtitle={`${kind === 'daily' ? 'Günün Resim Bulmacası' : `Resim Bulmaca · ${level.id === 'MIX' ? 'Karışık' : level.id}`} · No. ${p.no}`}
        onMenu={() => setMenu(true)}
      />
      <View style={shellStyles.kickerRow}>
        <Text style={[shellStyles.kicker, learn.toast && { color: colors.ink }]} numberOfLines={1}>
          {learn.toast || 'PICTURE QUIZ · RESİMDEKİ NESNENİN İNGİLİZCESİNİ YAZ'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 90 }}>
        {/* tur noktaları */}
        <View style={styles.dots}>
          {p.rounds.map((_, i) => (
            <Pressable
              key={i}
              hitSlop={6}
              onPress={() => setIdx(i)}
              style={[
                styles.dot,
                done[i] === 'ok' && { backgroundColor: colors.good, borderColor: colors.good },
                done[i] === 'skip' && { backgroundColor: colors.wrong, borderColor: colors.wrong },
                i === idx && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* fotoğraf */}
        <View style={[styles.photo, { width: photoW, height: photoH }]}>
          <Image
            key={r.photo.url}
            source={{ uri: r.photo.url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            onLoadEnd={() => setImgLoading(false)}
          />
          {imgLoading ? (
            <View style={styles.photoLoading}>
              <ActivityIndicator color={colors.ink} />
            </View>
          ) : null}
          <Pressable style={styles.credit} onPress={() => r.photo.link && Linking.openURL(r.photo.link).catch(() => {})}>
            <Text style={styles.creditText} numberOfLines={1}>
              Fotoğraf: {r.photo.by} · Pexels
            </Text>
          </Pressable>
        </View>

        {/* ipucu satırı */}
        <View style={styles.infoRow}>
          <Text style={styles.info} numberOfLines={2}>
            {roundDone || tr[idx] ? (
              <>
                <Text style={styles.infoLabel}>TÜRKÇESİ </Text>
                {r.clue}
              </>
            ) : (
              <Text style={styles.infoMuted}>
                {r.answer.length} harf{p.firstGiven ? ' · ilk harf verildi' : ''} · Türkçesi için ampule dokun
              </Text>
            )}
          </Text>
          <Pressable hitSlop={8} onPress={() => learn.openLearn(r.answer, r.clue)} style={styles.bookBtn}>
            <BookIcon size={15} />
          </Pressable>
        </View>

        {/* cevap kutuları */}
        <View style={styles.row}>
          {cur.map((t, j) => (
            <Pressable
              key={j}
              onPress={() => tapSlot(j)}
              style={[
                styles.slot,
                { width: tile, height: tile },
                roundDone === 'ok' && { backgroundColor: colors.okCell },
                roundDone === 'skip' && { backgroundColor: colors.badCell },
                bad && { backgroundColor: colors.badCell },
                p.firstGiven && j === 0 && !roundDone && { backgroundColor: colors.paperDark },
              ]}
            >
              <Text allowFontScaling={false} numberOfLines={1} style={[styles.letter, { fontSize: tile * 0.5, lineHeight: tile * 0.66, width: tile - 3 }]}>
                {roundDone === 'skip' ? r.answer[j] : t == null ? '' : r.tiles[t]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* harf taşları */}
        {!roundDone ? (
          <View style={[styles.row, { flexWrap: 'wrap', marginTop: 14 }]}>
            {[...r.tiles].map((ch, t) => {
              const used = cur.includes(t);
              return (
                <Pressable key={t} onPress={() => tapTile(t)} style={[styles.tile, { width: tile, height: tile }, used && styles.tileUsed]}>
                  <Text allowFontScaling={false} numberOfLines={1} style={[styles.letter, { fontSize: tile * 0.5, lineHeight: tile * 0.66, width: tile - 3 }]}>
                    {ch}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {bad ? <Text style={styles.badNote}>Bu kelime değil: kırmızı kutulara dokunup harfleri geri al</Text> : null}

        {/* bitiş özeti */}
        {solved ? (
          <View style={styles.summary}>
            <Text style={styles.summaryHead}>
              {okCount}/{n} resmi bildin
            </Text>
            {p.rounds.map((x, i) => (
              <Pressable key={i} onPress={() => learn.openLearn(x.answer, x.clue)} style={styles.summaryRow}>
                <Text style={[styles.summaryWord, done[i] === 'skip' && { color: colors.wrong }]}>{x.answer.toLowerCase()}</Text>
                <Text style={styles.summaryTr} numberOfLines={1}>
                  {x.clue}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <BackBar onPress={onBack} bottomInset={insets.bottom} caption={`${Object.keys(done).length}/${n} resim · ${okCount} doğru`} />

      <HintMenu
        visible={menu}
        onClose={() => setMenu(false)}
        items={[
          ['Türkçesini göster', 'Resimdeki nesnenin Türkçesi', () => setTr({ ...tr, [idx]: true })],
          ['Harf aç', 'Bir doğru harfi yerine koy', reveal],
          ['Bu resmi geç', 'Cevabı göster ve sıradakine geç', skip],
          ['Kelime kartı', `Bu kelimeyi öğren (kalan hak ${learn.left}/${learn.limit})`, () => learn.openLearn(r.answer, r.clue)],
        ]}
        note="Taşlara dokunarak kelimeyi sırayla diz; kutuya dokunursan harf geri gelir. Fazladan harfler yanıltmak için var."
      />
      {learn.modal}
      {solved ? (
        <Pressable style={[shellStyles.nextFab, { bottom: insets.bottom + BACK_BAR_HEIGHT + 16 }]} onPress={kind === 'daily' ? onBack : onNext}>
          <Text style={shellStyles.nextFabText}>{kind === 'daily' ? 'Günün bulmacası tamam · Geri dön' : 'Sonraki bulmaca →'}</Text>
        </Pressable>
      ) : roundDone && Object.keys(done).length < n ? (
        <Pressable style={[shellStyles.nextFab, { bottom: insets.bottom + BACK_BAR_HEIGHT + 16 }]} onPress={() => setIdx(nextOpen(idx))}>
          <Text style={shellStyles.nextFabText}>Sonraki resim →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function PictureScreen({ kind, levelId, onBack }) {
  const { session, error, reload } = useGameSession(picture, kind, levelId);
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
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 10 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: colors.ink, backgroundColor: 'transparent' },
  dotActive: { transform: [{ scale: 1.35 }], borderWidth: 2 },
  photo: { alignSelf: 'center', borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.paperDark, overflow: 'hidden' },
  photoLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  credit: { position: 'absolute', right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 6, paddingVertical: 2, maxWidth: '80%' },
  creditText: { fontFamily: fonts.sans, fontSize: 10, lineHeight: 13, color: '#FFFFFF' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 12 },
  info: { flex: 1, fontFamily: fonts.serifBold, fontSize: 17, lineHeight: 23, color: colors.ink },
  infoLabel: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 1.4, color: colors.wrong },
  infoMuted: { fontFamily: fonts.serifItalic, fontSize: 14, color: colors.muted },
  bookBtn: { borderWidth: 1, borderColor: colors.ink, padding: 4, backgroundColor: '#FBF9F3' },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  slot: { borderWidth: 1.5, borderColor: colors.ink, backgroundColor: colors.cell, alignItems: 'center', justifyContent: 'center' },
  tile: { borderWidth: 1.5, borderColor: colors.ink, backgroundColor: '#FBF9F3', alignItems: 'center', justifyContent: 'center' },
  tileUsed: { opacity: 0.25 },
  letter: { fontFamily: fonts.letter, color: colors.ink, textAlign: 'center', includeFontPadding: false },
  badNote: { fontFamily: fonts.serifItalic, fontSize: 13, color: colors.wrong, textAlign: 'center', marginTop: 10 },
  summary: { marginTop: 18, borderTopWidth: 2, borderColor: colors.ink, paddingTop: 8 },
  summaryHead: { fontFamily: fonts.serifBold, fontSize: 20, lineHeight: 26, color: colors.ink, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingVertical: 4, borderBottomWidth: 1, borderColor: colors.rule || '#D8D2C4' },
  summaryWord: { fontFamily: fonts.serifBold, fontSize: 17, color: colors.good, minWidth: 90 },
  summaryTr: { flex: 1, fontFamily: fonts.serifItalic, fontSize: 14, color: colors.inkSoft },
});
