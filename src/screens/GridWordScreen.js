// Kare Bulmaca ve Sarmal Bulmaca ekranı (aynı yazma/silme mantığı: board reducer).
import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import PuzzleGrid from '../components/PuzzleGrid';
import Keyboard from '../components/Keyboard';
import BackBar, { BACK_BAR_HEIGHT } from '../components/BackBar';
import { BookIcon, ChevronIcon } from '../components/Icons';
import { useGameSession, LoadingPage, GameHeader, HintMenu, WinModal, useSolvedEffect, useLearnCard, shellStyles } from '../components/GameShell';
import { buildWordModel, cellsOf, cellKey } from '../engine/gridgames';
import { wordStatus } from '../engine/model';
import { reducer, selectWordState } from '../engine/board';
import { crossword, spiral, getLevel } from '../engine/session';
import { persist } from '../storage';
import { colors, fonts, formatTime } from '../theme';

// Sarmal yolunda, ardışık olmayan komşulara kalın duvar
function spiralWalls(path) {
  const idx = new Map(path.map(([r, c], i) => [cellKey(r, c), i]));
  const walls = {};
  path.forEach(([r, c], i) => {
    const linked = (rr, cc) => {
      const j = idx.get(cellKey(rr, cc));
      return j === i - 1 || j === i + 1;
    };
    walls[cellKey(r, c)] = { t: !linked(r - 1, c), b: !linked(r + 1, c), l: !linked(r, c - 1), r: !linked(r, c + 1) };
  });
  return walls;
}

function prepare(variant, p) {
  if (variant === 'crossword') {
    const words = p.words.map((x) => ({ ...x, cells: cellsOf(x) }));
    const labels = {};
    for (const x of p.words) labels[cellKey(x.sr, x.sc)] = x.num;
    return { model: buildWordModel(words), w: p.w, h: p.h, rows: p.rows, labels, walls: null };
  }
  const labels = {};
  for (const x of p.words) labels[cellKey(...x.cells[0])] = x.num;
  return { model: buildWordModel(p.words, p.words.map((_, i) => i)), w: p.n, h: p.n, rows: null, labels, walls: spiralWalls(p.path) };
}

function Board({ variant, store, session, kind, levelId, onBack, onNext }) {
  const p = session.puzzle;
  const level = getLevel(levelId);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const prep = useMemo(() => prepare(variant, p), [variant, p]);
  const { model } = prep;
  const [s, dispatch] = useReducer(reducer, null, () =>
    selectWordState(
      { model, entries: session.entries || {}, revealed: session.revealed || {}, solved: !!session.solved, active: model.order[0], sel: null },
      model.order[0],
    ),
  );
  const [menu, setMenu] = useState(false);
  const [list, setList] = useState(false);
  const learn = useLearnCard(session);
  const [showWin, setShowWin] = useSolvedEffect(s.solved, session, () => store.markSolved(kind, levelId));

  useEffect(() => {
    session.entries = s.entries;
    session.revealed = s.revealed;
    persist();
  }, [s.entries, s.revealed, session]);

  const { status, statuses } = useMemo(() => {
    const rank = { ok: 3, close: 2, bad: 1 };
    const st = model.words.map((w) => wordStatus(w, s.entries, model.solution));
    const cs = {};
    model.words.forEach((w, i) => {
      if (!st[i]) return;
      for (const k of w.keys) if (!cs[k] || rank[st[i]] > rank[cs[k]]) cs[k] = st[i];
    });
    return { status: cs, statuses: st };
  }, [s.entries, model]);

  const activeKeys = useMemo(() => new Set(model.words[s.active].keys), [s.active, model]);
  const onTap = useCallback((r, c) => dispatch({ type: 'tapCell', r, c }), []);
  const onKey = useCallback((ch) => {
    dispatch({ type: 'type', ch });
    Haptics.selectionAsync().catch(() => {});
  }, []);
  const onDelete = useCallback(() => dispatch({ type: 'del' }), []);

  const keyH = Math.min(48, Math.max(40, height * 0.056));
  const reserved = insets.top + insets.bottom + 50 + 6 + 66 + keyH * 3 + 12 + 26 + BACK_BAR_HEIGHT;
  const size = Math.floor(Math.min((width - 16) / prep.w, (height - reserved) / prep.h));

  const w = model.words[s.active];
  const dirLabel = variant === 'spiral' ? `${w.num}. KELİME · SARMAL` : `${w.num} ${w.dir === 'A' ? 'SOLDAN SAĞA' : 'YUKARIDAN AŞAĞI'}`;
  const isCross = variant === 'crossword';
  const title = isCross ? 'Kare Bulmaca' : 'Sarmal Bulmaca';
  const okCount = statuses.filter((x) => x === 'ok').length;

  const groups = isCross
    ? [
        ['Soldan Sağa', model.words.filter((x) => x.dir === 'A').sort((a, b) => a.num - b.num)],
        ['Yukarıdan Aşağı', model.words.filter((x) => x.dir === 'D').sort((a, b) => a.num - b.num)],
      ]
    : [['Sarmal sırasıyla', model.words]];

  return (
    <View style={shellStyles.root}>
      <GameHeader
        insetTop={insets.top}
        session={session}
        running={!s.solved}
        subtitle={`${kind === 'daily' ? 'Günün ' + title + 'sı' : `${title} · ${level.id === 'MIX' ? 'Karışık' : level.id}`} · No. ${p.no}`}
        onMenu={() => setMenu(true)}
      />
      <View style={styles.gridWrap}>
        <PuzzleGrid
          w={prep.w}
          h={prep.h}
          rows={prep.rows}
          size={size}
          letters={s.entries}
          labels={prep.labels}
          status={status}
          revealed={s.revealed}
          activeKeys={activeKeys}
          selected={s.sel}
          walls={prep.walls}
          onTap={onTap}
        />
        <Text style={shellStyles.progress}>
          {okCount}/{model.words.length} kelime doğru · ipucu listesi için ampule dokun
        </Text>
      </View>

      <View style={shellStyles.clueBar}>
        <Pressable onPress={() => dispatch({ type: 'step', delta: -1 })} hitSlop={8} style={shellStyles.clueNav}>
          <ChevronIcon dir="left" size={22} />
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => learn.openLearn(w.answer, w.text)}>
          <Text style={[shellStyles.clueMeta, learn.toast && { color: colors.wrong }]} numberOfLines={1}>
            {learn.toast || `${dirLabel} (${w.answer.length})`}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={shellStyles.clueText} numberOfLines={1} adjustsFontSizeToFit>
              {w.text}
            </Text>
            <View style={shellStyles.learnTag}>
              <BookIcon size={14} />
              <Text style={shellStyles.learnTagText}>
                {learn.left}/{learn.limit}
              </Text>
            </View>
          </View>
        </Pressable>
        <Pressable onPress={() => dispatch({ type: 'step', delta: 1 })} hitSlop={8} style={shellStyles.clueNav}>
          <ChevronIcon dir="right" size={22} />
        </Pressable>
      </View>

      <Keyboard onKey={onKey} onDelete={onDelete} keyHeight={keyH} />
      <BackBar onPress={onBack} bottomInset={insets.bottom} />

      <HintMenu
        visible={menu}
        onClose={() => setMenu(false)}
        items={[
          ['İpucu listesi', 'Tüm ipuçlarını numaralarıyla gör', () => setList(true)],
          ['Harf aç', 'Seçili kareyi göster', () => dispatch({ type: 'revealLetter' })],
          ['Kelime aç', 'Seçili kelimeyi göster', () => dispatch({ type: 'revealWord' })],
          ['Kelimeyi temizle', 'Seçili kelimedeki harfleri sil', () => dispatch({ type: 'clearWord' })],
          ['Kelime kartı', `Seçili kelimeyi öğren (kalan hak ${learn.left}/${learn.limit})`, () => learn.openLearn(w.answer, w.text)],
          ['Baştan başla', 'Tüm kareleri temizle', () => dispatch({ type: 'reset' })],
        ]}
      />

      {/* İpucu listesi (gazetedeki gibi numaralı) */}
      <Modal visible={list} transparent animationType="fade" onRequestClose={() => setList(false)}>
        <Pressable style={styles.backdrop} onPress={() => setList(false)}>
          <Pressable style={styles.listCard} onPress={() => {}}>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {groups.map(([head, items]) => (
                <View key={head} style={{ marginBottom: 12 }}>
                  <Text style={styles.listHead}>{head}</Text>
                  <View style={styles.listRule} />
                  {items.map((x) => (
                    <Pressable
                      key={x.index}
                      onPress={() => {
                        dispatch({ type: 'selectWord', idx: x.index });
                        setList(false);
                      }}
                      style={styles.listItem}
                    >
                      <Text style={[styles.listText, statuses[x.index] === 'ok' && styles.listDone]}>
                        <Text style={styles.listNum}>{x.num}. </Text>
                        {x.text} <Text style={styles.listLen}>({x.answer.length})</Text>
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {learn.modal}
      <WinModal
        visible={showWin}
        head="Puzzle Solved"
        body={`Tebrikler! ${model.words.length} kelimeyi ${formatTime(session.seconds || 0)} sürede çözdün.`}
        daily={kind === 'daily'}
        onClose={() => setShowWin(false)}
        onNext={onNext}
        onHome={onBack}
      />
      {s.solved && !showWin && kind !== 'daily' ? (
        <Pressable style={[shellStyles.nextFab, { bottom: insets.bottom + BACK_BAR_HEIGHT + 16 }]} onPress={onNext}>
          <Text style={shellStyles.nextFabText}>Sonraki bulmaca →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function GridWordScreen({ variant, kind, levelId, onBack }) {
  const store = variant === 'crossword' ? crossword : spiral;
  const { session, error, reload } = useGameSession(store, kind, levelId);
  if (!session) return <LoadingPage error={error} onRetry={reload} />;
  return (
    <Board
      key={`${session.puzzle.no}-${session.date || levelId}`}
      variant={variant}
      store={store}
      session={session}
      kind={kind}
      levelId={kind === 'daily' ? 'MIX' : levelId}
      onBack={onBack}
      onNext={reload}
    />
  );
}

const styles = StyleSheet.create({
  gridWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 6 },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,20,20,0.45)', justifyContent: 'center', padding: 20 },
  listCard: { maxHeight: '85%', backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.ink },
  listHead: { fontFamily: fonts.serifBold, fontSize: 20, lineHeight: 28, color: colors.ink },
  listRule: { height: 2, backgroundColor: colors.ink, marginBottom: 6 },
  listItem: { paddingVertical: 5 },
  listText: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 21, color: colors.ink },
  listNum: { fontFamily: fonts.sansBold, fontSize: 13 },
  listLen: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted },
  listDone: { textDecorationLine: 'line-through', color: colors.muted },
});
