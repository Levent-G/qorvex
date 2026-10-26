// Kare Bulmaca, Resimli Bulmaca ve Sarmal Bulmaca ekranı (aynı yazma/silme mantığı: board reducer).
// Resimli Bulmaca: kare bulmaca + fotoğraf ipuçları (fotoğrafı olmayan kelimenin ipucu Türkçe yazı).
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal, Image, Linking, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import PuzzleGrid from '../components/PuzzleGrid';
import Keyboard from '../components/Keyboard';
import BackBar, { BACK_BAR_HEIGHT } from '../components/BackBar';
import { BookIcon, ChevronIcon } from '../components/Icons';
import { useGameSession, LoadingPage, GameHeader, HintMenu, WinModal, useSolvedEffect, useLearnCard, shellStyles, CardHintPill, ClueContext } from '../components/GameShell';
import { buildWordModel, cellsOf, cellKey } from '../engine/gridgames';
import { wordStatus } from '../engine/model';
import { reducer, selectWordState } from '../engine/board';
import { crossword, spiral, picture, getLevel, recordHint, recordHard } from '../engine/session';
import { persist } from '../storage';
import { colors, fonts, formatTime, ed, efonts } from '../theme';

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
  if (variant === 'crossword' || variant === 'picture') {
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
  // resimli türde fotoğraflı ilk kelime; diğerlerinde sıradaki ilk kelime
  // (dikkat: `false ?? x` false döner — bu yüzden koşul ayrı)
  const photoFirst = variant === 'picture' ? model.order.find((i) => p.words[i] && p.words[i].photo) : undefined;
  const firstWord = photoFirst ?? model.order[0];
  const [s, dispatch] = useReducer(reducer, null, () =>
    selectWordState(
      { model, entries: session.entries || {}, revealed: session.revealed || {}, solved: !!session.solved, active: firstWord, sel: null },
      firstWord,
    ),
  );
  const [menu, setMenu] = useState(false);
  const [list, setList] = useState(false);
  const [zoom, setZoom] = useState(null); // büyütülen fotoğraflı kelime
  const [showTr, setShowTr] = useState({}); // resimli kelimelerde Türkçesi açılanlar
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
  // yanlış/eksik tamamlanan kelime: bulmaca başına bir kez zor sayılır
  const missed = useRef(new Set());
  useEffect(() => {
    const v = statuses[s.active];
    if ((v === 'bad' || v === 'close') && !missed.current.has(s.active)) {
      missed.current.add(s.active);
      recordHard(model.words[s.active].answer, 'miss');
    }
  }, [statuses, s.active]);
  const onTap = useCallback((r, c) => dispatch({ type: 'tapCell', r, c }), []);
  const onKey = useCallback((ch) => {
    dispatch({ type: 'type', ch });
    Haptics.selectionAsync().catch(() => {});
  }, []);
  const onDelete = useCallback(() => dispatch({ type: 'del' }), []);

  const keyH = Math.min(48, Math.max(40, height * 0.056));
  const isPic = variant === 'picture';
  const thumb = 70;
  const STRIP = 66; // resim şeridi
  const reserved = insets.top + insets.bottom + 50 + 6 + (isPic ? thumb + 16 + STRIP : 84) + keyH * 3 + 12 + 26 + BACK_BAR_HEIGHT;
  const size = Math.floor(Math.min((width - 16) / prep.w, (height - reserved) / prep.h));

  const w = model.words[s.active];
  const dirLabel = variant === 'spiral' ? `${w.num}. KELİME · SARMAL` : `${w.num} ${w.dir === 'A' ? 'SOLDAN SAĞA' : 'YUKARIDAN AŞAĞI'}`;
  const isCross = variant !== 'spiral';
  const title = isPic ? 'Resimli Bulmaca' : isCross ? 'Kare Bulmaca' : 'Sarmal Bulmaca';
  // seçili kelimenin ipucu: fotoğraf (varsa) ya da Türkçe yazı
  const photoOf = (x) => (isPic && p.words[x.index] ? p.words[x.index].photo : null);
  const wPhoto = photoOf(w);
  const wTrOpen = !wPhoto || showTr[w.index];
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
        badge={`${learn.left}/${learn.limit}`}
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

      {isPic ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, height: STRIP }}
          contentContainerStyle={styles.strip}
        >
          {model.words
            .filter((x) => photoOf(x))
            .sort((a, b) => a.num - b.num || (a.dir === 'A' ? -1 : 1))
            .map((x) => (
              <Pressable
                key={x.index}
                onPress={() => dispatch({ type: 'selectWord', idx: x.index })}
                onLongPress={() => setZoom(x)}
                style={[styles.stripItem, x.index === s.active && styles.stripActive]}
              >
                <Image source={{ uri: photoOf(x).url }} style={[styles.stripImg, statuses[x.index] === 'ok' && { opacity: 0.35 }]} resizeMode="cover" />
                <View style={[styles.stripTag, statuses[x.index] === 'ok' && { backgroundColor: colors.good }]}>
                  <Text style={styles.stripTagText}>
                    {x.num}
                    {x.dir === 'A' ? '→' : '↓'}
                  </Text>
                </View>
              </Pressable>
            ))}
        </ScrollView>
      ) : null}

      <View style={shellStyles.clueBar}>
        <Pressable onPress={() => dispatch({ type: 'step', delta: -1 })} hitSlop={8} style={shellStyles.clueNav}>
          <ChevronIcon dir="left" size={22} />
        </Pressable>
        {wPhoto ? (
          <Pressable onPress={() => setZoom(w)} style={[styles.thumb, { width: thumb, height: thumb }]}>
            <Image source={{ uri: wPhoto.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </Pressable>
        ) : null}
        <Pressable style={{ flex: 1 }} disabled={!(wPhoto && !wTrOpen)} onPress={() => setZoom(w)}>
          <Text style={[shellStyles.clueMeta, learn.toast && { color: ed.orange }]} numberOfLines={1}>
            {learn.toast || `${dirLabel} (${w.answer.length})`}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[shellStyles.clueText, { flex: 0, flexShrink: 1 }, !wTrOpen && styles.picHint]} numberOfLines={wPhoto ? 2 : 1} adjustsFontSizeToFit>
              {wTrOpen ? w.text : 'Resimdeki nesne · büyütmek için dokun'}
            </Text>
            {wTrOpen ? <CardHintPill onPress={() => learn.openLearn(w.answer, w.text)} /> : null}
          </View>
          {wTrOpen && !wPhoto ? <ClueContext answer={w.answer} /> : null}
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
          ['İpucu listesi', isPic ? 'Tüm resimleri numaralarıyla gör' : 'Tüm ipuçlarını numaralarıyla gör', () => setList(true)],
          ...(wPhoto ? [['Türkçesini göster', 'Seçili resmin Türkçe karşılığı', () => setShowTr({ ...showTr, [w.index]: true })]] : []),
          ['Harf aç', 'Seçili kareyi göster', () => {
            recordHint('letter', session);
            recordHard(w.answer, 'hint');
            dispatch({ type: 'revealLetter' });
          }],
          ['Kelime aç', 'Seçili kelimeyi göster', () => {
            recordHint('word', session);
            recordHard(w.answer, 'hint');
            dispatch({ type: 'revealWord' });
          }],
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
                      {photoOf(x) ? (
                        <View style={styles.listPicRow}>
                          <Text style={styles.listNum}>{x.num}.</Text>
                          <Image source={{ uri: photoOf(x).url }} style={[styles.listPic, statuses[x.index] === 'ok' && { opacity: 0.4 }]} resizeMode="cover" />
                          <Text style={[styles.listText, statuses[x.index] === 'ok' && styles.listDone]}>
                            {statuses[x.index] === 'ok' || showTr[x.index] ? x.text + ' ' : ''}
                            <Text style={styles.listLen}>({x.answer.length})</Text>
                          </Text>
                        </View>
                      ) : (
                        <Text style={[styles.listText, statuses[x.index] === 'ok' && styles.listDone]}>
                          <Text style={styles.listNum}>{x.num}. </Text>
                          {x.text} <Text style={styles.listLen}>({x.answer.length})</Text>
                        </Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!zoom} transparent animationType="fade" onRequestClose={() => setZoom(null)}>
        <Pressable style={styles.backdrop} onPress={() => setZoom(null)}>
          {zoom && photoOf(zoom) ? (
            <View style={styles.zoomCard}>
              <Image source={{ uri: photoOf(zoom).url }} style={{ width: '100%', aspectRatio: 1 }} resizeMode="cover" />
              <View style={{ padding: 10 }}>
                <Text style={styles.zoomMeta}>
                  {zoom.num} {zoom.dir === 'A' ? 'SOLDAN SAĞA' : 'YUKARIDAN AŞAĞI'} · {zoom.answer.length} harf
                </Text>
                {showTr[zoom.index] || statuses[zoom.index] === 'ok' ? <Text style={styles.zoomTr}>{zoom.text}</Text> : null}
                <Text style={styles.zoomCredit} onPress={() => photoOf(zoom).link && Linking.openURL(photoOf(zoom).link).catch(() => {})}>
                  Fotoğraf: {photoOf(zoom).by} · Pexels
                </Text>
              </View>
            </View>
          ) : null}
        </Pressable>
      </Modal>

      {learn.modal}
      <WinModal
        visible={showWin}
        head="Bulmaca Çözüldü"
        body={`Tebrikler! ${model.words.length} kelimeyi ${formatTime(session.seconds || 0)} sürede çözdün.`}
        daily={kind === 'daily'}
        onClose={() => setShowWin(false)}
        onNext={onNext}
        onHome={onBack}
        share={{ title: `${title} · ${kind === 'daily' ? 'Günün Bulmacası' : level.id === 'MIX' ? 'Karışık' : level.id} · No. ${p.no}`, seconds: session.seconds, words: model.words.length, hints: session.hinted }}
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
  const store = variant === 'crossword' ? crossword : variant === 'picture' ? picture : spiral;
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
  backdrop: { flex: 1, backgroundColor: 'rgba(20,27,38,0.45)', justifyContent: 'center', padding: 20 },
  listCard: { maxHeight: '85%', backgroundColor: ed.surface, borderRadius: 16, overflow: 'hidden' },
  listHead: { fontFamily: efonts.headlineBold, fontSize: 20, lineHeight: 28, color: ed.text },
  listRule: { height: 1, backgroundColor: ed.border, marginBottom: 6 },
  listItem: { paddingVertical: 5 },
  listText: { fontFamily: efonts.body, fontSize: 15, lineHeight: 21, color: ed.text },
  listNum: { fontFamily: efonts.labelBold, fontSize: 13 },
  listLen: { fontFamily: efonts.body, fontSize: 12, color: ed.textSoft },
  listDone: { textDecorationLine: 'line-through', color: ed.textSoft },
  listPicRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  strip: { paddingHorizontal: 8, gap: 6, alignItems: 'center' },
  stripItem: { width: 56, height: 56, borderWidth: 1, borderColor: ed.border, backgroundColor: ed.surfaceAlt, borderRadius: 8 },
  stripActive: { borderWidth: 2.5, borderColor: ed.accent },
  stripImg: { width: '100%', height: '100%' },
  stripTag: { position: 'absolute', left: 0, top: 0, backgroundColor: ed.primary, paddingHorizontal: 4, borderBottomRightRadius: 6 },
  stripTagText: { fontFamily: efonts.labelBold, fontSize: 10, lineHeight: 13, color: '#FFFFFF' },
  listPic: { width: 54, height: 54, borderWidth: 1, borderColor: ed.border, borderRadius: 8 },
  thumb: { borderWidth: 1, borderColor: ed.border, marginRight: 8, overflow: 'hidden', backgroundColor: ed.surfaceAlt, borderRadius: 8 },
  picHint: { fontFamily: efonts.headlineItalic, fontSize: 15, color: ed.textSoft },
  zoomCard: { backgroundColor: ed.surface, borderRadius: 16, overflow: 'hidden' },
  zoomMeta: { fontFamily: efonts.labelBold, fontSize: 11, letterSpacing: 1.2, color: ed.accent },
  zoomTr: { fontFamily: efonts.headlineBold, fontSize: 18, lineHeight: 24, color: ed.text, marginTop: 4 },
  zoomCredit: { fontFamily: efonts.body, fontSize: 11, color: ed.textSoft, marginTop: 6 },
});
