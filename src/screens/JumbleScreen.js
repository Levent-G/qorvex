// Jumble (Karışık Harfler): harfleri karışık kelimeleri düzelt; daire içindeki harfler bonus kelimeyi oluşturur.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import BackBar, { BACK_BAR_HEIGHT } from '../components/BackBar';
import { BookIcon } from '../components/Icons';
import { useGameSession, LoadingPage, GameHeader, HintMenu, WinModal, useSolvedEffect, useLearnCard, shellStyles } from '../components/GameShell';
import { jumble, getLevel, recordHint, recordHard } from '../engine/session';
import { persist } from '../storage';
import { colors, fonts, formatTime, ed, efonts } from '../theme';

function Board({ session, kind, levelId, onBack, onNext }) {
  const p = session.puzzle;
  const level = getLevel(levelId);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const learn = useLearnCard(session);
  const [menu, setMenu] = useState(false);
  const [focus, setFocus] = useState(0); // son dokunulan kelime ('b' = bonus)

  // Bonus taşları: kelimelerin daire içindeki harfleri (kelime sırasıyla, sabit)
  const bonusTiles = useMemo(() => p.words.flatMap((w, i) => w.circles.map((c) => ({ ch: w.answer[c], from: i }))), [p]);
  const items = useMemo(
    () => [
      ...p.words.map((w, i) => ({ id: String(i), answer: w.answer, clue: w.clue, tiles: w.scrambled.split(''), circles: w.circles })),
      { id: 'b', answer: p.bonus.answer, clue: p.bonus.clue, tiles: bonusTiles.map((t) => t.ch), circles: [], bonus: true },
    ],
    [p, bonusTiles],
  );

  // slots[id] = [taş indeksi | null, ...]
  const [slots, setSlots] = useState(() => {
    const s = session.entries && session.entries.slots ? session.entries.slots : {};
    const out = {};
    for (const it of items) out[it.id] = s[it.id] || Array(it.answer.length).fill(null);
    return out;
  });
  useEffect(() => {
    session.entries = { slots };
    persist();
  }, [slots, session]);

  const wordOf = (it) => slots[it.id].map((t) => (t == null ? '' : it.tiles[t])).join('');
  const isFull = (it) => slots[it.id].every((t) => t != null);
  const isOk = (it) => isFull(it) && wordOf(it) === it.answer;
  const okWords = p.words.map((_, i) => isOk(items[i]));
  // Bonus harfleri baştan açık: kilitli gri "?" kutular kafa karıştırıyordu
  const bonusTileEnabled = () => true;
  const solved = items.every(isOk);
  const [showWin, setShowWin] = useSolvedEffect(solved, session, () => jumble.markSolved(kind, levelId));

  const tapTile = (it, t) => {
    setFocus(it.id);
    if (isOk(it)) return;
    if (it.bonus && !bonusTileEnabled(t)) {
      learn.showToast('Bu harf, ait olduğu kelimeyi çözünce açılır');
      return;
    }
    const cur = slots[it.id];
    if (cur.includes(t)) return;
    const j = cur.indexOf(null);
    if (j < 0) return;
    const next = cur.slice();
    next[j] = t;
    setSlots({ ...slots, [it.id]: next });
    Haptics.selectionAsync().catch(() => {});
    if (next.every((x) => x != null)) {
      const word = next.map((x) => it.tiles[x]).join('');
      if (word === it.answer) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        if (!it.bonus) learn.showToast(`✓ ${it.answer.toLowerCase()} — ${it.clue}`);
      } else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };
  const tapSlot = (it, j) => {
    setFocus(it.id);
    if (isOk(it) || slots[it.id][j] == null) return;
    const next = slots[it.id].slice();
    next[j] = null;
    setSlots({ ...slots, [it.id]: next });
  };

  const focusItem = items.find((x) => x.id === focus) || items[0];
  const revealLetter = () => {
    const it = focusItem;
    if (isOk(it)) return;
    recordHard(it.answer, 'hint');
    const cur = slots[it.id].slice();
    // ilk yanlış/boş kutuya doğru harfi koy
    const j = cur.findIndex((t, k) => t == null || it.tiles[t] !== it.answer[k]);
    if (j < 0) return;
    const want = it.answer[j];
    const free = it.tiles.findIndex((ch, t) => ch === want && (!cur.includes(t) || cur[j] === t) && (!it.bonus || bonusTileEnabled(t)));
    if (free < 0) {
      learn.showToast('Önce bu harfin geldiği kelimeyi çöz');
      return;
    }
    const k = cur.indexOf(free);
    if (k >= 0) cur[k] = null;
    cur[j] = free;
    setSlots({ ...slots, [it.id]: cur });
  };

  // Taş boyutu: en uzun kelime (bonus kutusunun iç boşluğu dahil) tek satıra tam sığsın
  const maxLen = Math.max(...items.map((it) => it.answer.length));
  const GAP = 6;
  const avail = width - 24 - 24; // kaydırma alanı + bonus kutusu kenar/iç boşluğu
  const tile = Math.min(44, Math.floor((avail - GAP * (maxLen - 1)) / maxLen));

  const renderItem = (it, idx) => {
    const ok = isOk(it);
    const full = isFull(it);
    const bad = full && !ok;
    return (
      <View key={it.id} style={[styles.card, it.bonus && styles.bonusCard, focus === it.id && styles.cardFocus]}>
        <View style={styles.cardHead}>
          <Text style={styles.cardNo}>{it.bonus ? 'BONUS' : `${idx + 1}.`}</Text>
          <Text style={styles.clue} numberOfLines={2}>
            {it.clue} <Text style={styles.len}>({it.answer.length})</Text>
          </Text>
          <Pressable hitSlop={8} onPress={() => learn.openLearn(it.answer, it.clue)} style={styles.bookBtn}>
            <BookIcon size={15} />
          </Pressable>
        </View>
        {it.bonus ? (
          <Text style={styles.bonusNote}>Harfleri, yukarıdaki kelimelerin daire içindeki harfleridir</Text>
        ) : null}
        {/* karışık taşlar */}
        <View style={styles.tiles}>
          {it.tiles.map((ch, t) => {
            const used = slots[it.id].includes(t);
            const locked = it.bonus && !bonusTileEnabled(t);
            return (
              <Pressable
                key={t}
                onPress={() => tapTile(it, t)}
                style={[styles.tile, { width: tile, height: tile }, (used || ok) && styles.tileUsed, locked && styles.tileLocked]}
              >
                <Text allowFontScaling={false} numberOfLines={1} style={[styles.tileText, { fontSize: tile * 0.5, lineHeight: tile * 0.66, width: tile - 3, textAlign: 'center' }]}>
                  {locked ? '?' : ch}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {/* cevap kutuları */}
        <View style={styles.tiles}>
          {slots[it.id].map((t, j) => {
            const circled = it.circles.includes(j);
            return (
              <Pressable
                key={j}
                onPress={() => tapSlot(it, j)}
                style={[
                  styles.slot,
                  { width: tile, height: tile },
                  circled && { borderRadius: tile / 2, borderWidth: 2 },
                  ok && { backgroundColor: colors.okCell },
                  bad && { backgroundColor: colors.badCell },
                ]}
              >
                <Text allowFontScaling={false} numberOfLines={1} style={[styles.tileText, { fontSize: tile * 0.5, lineHeight: tile * 0.66, width: tile - 3, textAlign: 'center' }]}>
                  {t == null ? '' : it.tiles[t]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={shellStyles.root}>
      <GameHeader
        insetTop={insets.top}
        session={session}
        running={!solved}
        subtitle={`${kind === 'daily' ? 'Günün Karışık Harfleri' : `Karışık Harfler · ${level.id === 'MIX' ? 'Karışık' : level.id}`} · No. ${p.no}`}
        badge={`${learn.left}/${learn.limit}`}
        onMenu={() => setMenu(true)}
      />
      <View style={shellStyles.kickerRow}>
        <Text style={[shellStyles.kicker, learn.toast && { color: colors.ink }]} numberOfLines={1}>
          {learn.toast || 'JUMBLE · HARFLERE DOKUNARAK KELİMEYİ DİZ · KUTUYA DOKUN: GERİ AL'}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}>
        {items.map((it, i) => renderItem(it, i))}
      </ScrollView>
      <BackBar onPress={onBack} bottomInset={insets.bottom} caption={`${okWords.filter(Boolean).length}/${p.words.length} kelime · kelime kartı ${learn.left}/${learn.limit}`} />

      <HintMenu
        visible={menu}
        onClose={() => setMenu(false)}
        items={[
          ['Harf aç', 'Son dokunduğun kelimeye bir doğru harf koy', () => {
            recordHint('letter', session);
            revealLetter();
          }],
          ['Kelimeyi temizle', 'Son dokunduğun kelimenin harflerini geri al', () => {
            if (!isOk(focusItem)) setSlots({ ...slots, [focusItem.id]: Array(focusItem.answer.length).fill(null) });
          }],
          ['Kelime kartı', `Son dokunduğun kelimeyi öğren (kalan hak ${learn.left}/${learn.limit})`, () => learn.openLearn(focusItem.answer, focusItem.clue)],
          ['Baştan başla', 'Tüm kelimeleri temizle', () => {
            const out = {};
            for (const it of items) out[it.id] = Array(it.answer.length).fill(null);
            setSlots(out);
          }],
        ]}
      />
      {learn.modal}
      <WinModal
        visible={showWin}
        head="Harfler Düzeldi"
        body={`Tebrikler! Bonus kelime: ${p.bonus.answer.toLowerCase()} (${p.bonus.clue}). Süre: ${formatTime(session.seconds || 0)}.`}
        daily={kind === 'daily'}
        onClose={() => setShowWin(false)}
        onNext={onNext}
        onHome={onBack}
        share={{ title: `Karışık Harfler · ${kind === 'daily' ? 'Günün Bulmacası' : level.id === 'MIX' ? 'Karışık' : level.id} · No. ${p.no}`, seconds: session.seconds, words: p.words.length + 1, hints: session.hinted, line: `🎁 Bonus: ${p.bonus.answer.toLowerCase()}` }}
      />
      {solved && !showWin && kind !== 'daily' ? (
        <Pressable style={[shellStyles.nextFab, { bottom: insets.bottom + BACK_BAR_HEIGHT + 16 }]} onPress={onNext}>
          <Text style={shellStyles.nextFabText}>Sonraki bulmaca →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function JumbleScreen({ kind, levelId, onBack }) {
  const { session, error, reload } = useGameSession(jumble, kind, levelId);
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
  card: { backgroundColor: ed.surface, borderRadius: 14, borderWidth: 1, borderColor: ed.border, padding: 12, marginTop: 10, gap: 8 },
  cardFocus: { borderColor: ed.accent, borderWidth: 1.5 },
  bonusCard: { backgroundColor: ed.accentSoft, borderColor: ed.accentLine, marginTop: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardNo: { fontFamily: efonts.labelBold, fontSize: 12, letterSpacing: 1, color: ed.accent, minWidth: 22 },
  clue: { flex: 1, fontFamily: efonts.headlineBold, fontSize: 18, lineHeight: 24, color: ed.text },
  len: { fontFamily: efonts.body, fontSize: 12, color: ed.textSoft },
  bookBtn: { borderWidth: 1, borderColor: ed.border, padding: 4, backgroundColor: ed.surface, borderRadius: 8 },
  bonusNote: { fontFamily: efonts.headlineItalic, fontSize: 12, lineHeight: 16, color: ed.textSoft },
  tiles: { flexDirection: 'row', gap: 6, flexWrap: 'nowrap' },
  tile: { borderWidth: 1, borderColor: ed.border, backgroundColor: ed.surface, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  tileUsed: { opacity: 0.25 },
  tileLocked: { backgroundColor: colors.clueCell },
  tileText: { fontFamily: efonts.labelBold, color: ed.text, includeFontPadding: false },
  slot: { borderWidth: 1, borderColor: ed.border, backgroundColor: colors.cell, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
});
