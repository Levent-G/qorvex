import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Modal, AppState, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import LearnModal from '../components/LearnModal';
import BackBar, { BACK_BAR_HEIGHT } from '../components/BackBar';
import { GameHeader, ShareButton } from '../components/GameShell';
import { BulbIcon, BookIcon, ChevronIcon } from '../components/Icons';
import { DIRS, readSelection, snapEnd } from '../engine/wordsearch';
import {
  getLevel, getWordSearchSession, getWordSearchDaily, markWordSearchSolved, markLearned, LEARN_LIMIT, recordHint, recordHard,
} from '../engine/session';
import { persist } from '../storage';
import { colors, fonts, formatTime, ed, efonts } from '../theme';


function Timer({ session, running }) {
  const [sec, setSec] = useState(session.seconds || 0);
  const appActive = useRef(true);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => (appActive.current = st === 'active'));
    const t = setInterval(() => {
      if (!running || !appActive.current) return;
      session.seconds = (session.seconds || 0) + 1;
      setSec(session.seconds);
      if (session.seconds % 5 === 0) persist();
    }, 1000);
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, [running, session]);
  return <Text style={styles.timer}>{formatTime(sec)}</Text>;
}

function endOf(word) {
  const [dr, dc] = DIRS[word.dir];
  const n = word.answer.length - 1;
  return [word.r + dr * n, word.c + dc * n];
}

function Board({ session, kind, levelId, onBack, onNext }) {
  const puzzle = session.puzzle;
  const level = getLevel(levelId);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [found, setFound] = useState(session.found || {}); // answer -> { color, revealed? }
  const [hinted, setHinted] = useState(session.hinted || {}); // answer -> true (ilk harf gösterildi)
  const [drag, setDrag] = useState(null); // { r0, c0, r1, c1 }
  const [menu, setMenu] = useState(false);
  const [learn, setLearn] = useState(null);
  const [toast, setToast] = useState(null);
  const [showWin, setShowWin] = useState(false);
  const solved = puzzle.words.every((w) => found[w.answer]);
  const opened = session.opened || (session.opened = []);
  const left = LEARN_LIMIT - opened.length;

  useEffect(() => {
    session.found = found;
    session.hinted = hinted;
    persist();
  }, [found, hinted, session]);

  const wasSolved = useRef(!!session.solved);
  useEffect(() => {
    if (solved && !wasSolved.current) {
      wasSolved.current = true;
      session.solved = true;
      markWordSearchSolved(kind, levelId);
      setShowWin(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [solved, session, kind, levelId]);

  const toastTimer = useRef(null);
  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  // ---- Boyutlar ----
  const listRows = Math.ceil(puzzle.words.length / 3);
  const reserved = insets.top + insets.bottom + 50 + 6 + 52 + listRows * 25 + 44 + BACK_BAR_HEIGHT;
  const size = Math.floor(Math.min((width - 24) / puzzle.w, (height - reserved) / puzzle.h));
  const gw = size * puzzle.w, gh = size * puzzle.h;

  // ---- Sürükleyerek seçme ----
  const dragRef = useRef(null);
  const cellAt = (x, y) => [
    Math.max(0, Math.min(puzzle.h - 1, Math.floor(y / size))),
    Math.max(0, Math.min(puzzle.w - 1, Math.floor(x / size))),
  ];
  const finish = useCallback(
    (d) => {
      if (!d) return;
      const sel = readSelection(puzzle.rows, puzzle.w, puzzle.h, d.r0, d.c0, d.r1, d.c1);
      if (!sel || sel.text.length < 2) return;
      const rev = [...sel.text].reverse().join('');
      const hit = puzzle.words.find((w) => !found[w.answer] && (w.answer === sel.text || w.answer === rev));
      if (hit) {
        // Bulunan kelime yeşil (diğer oyunlardaki 'doğru' rengiyle aynı)
        setFound((f) => ({ ...f, [hit.answer]: { color: colors.okCell } }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        showToast(`✓ ${hit.answer.toLowerCase()} — ${hit.clue}`);
      } else if (sel.text.length >= 3) {
        Haptics.selectionAsync().catch(() => {});
      }
    },
    [puzzle, found],
  );

  const responder = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e) => {
      const [r, c] = cellAt(e.nativeEvent.locationX, e.nativeEvent.locationY);
      dragRef.current = { r0: r, c0: c, r1: r, c1: c };
      setDrag(dragRef.current);
      Haptics.selectionAsync().catch(() => {});
    },
    onResponderMove: (e) => {
      const d = dragRef.current;
      if (!d) return;
      const [r, c] = cellAt(e.nativeEvent.locationX, e.nativeEvent.locationY);
      let [r1, c1] = snapEnd(d.r0, d.c0, r, c);
      r1 = Math.max(0, Math.min(puzzle.h - 1, r1));
      c1 = Math.max(0, Math.min(puzzle.w - 1, c1));
      if (r1 !== d.r1 || c1 !== d.c1) {
        dragRef.current = { ...d, r1, c1 };
        setDrag(dragRef.current);
      }
    },
    onResponderRelease: () => {
      finish(dragRef.current);
      dragRef.current = null;
      setDrag(null);
    },
    onResponderTerminate: () => {
      dragRef.current = null;
      setDrag(null);
    },
  };

  // ---- Kelime kartı ----
  const openLearn = (w) => {
    if (!opened.includes(w.answer)) {
      if (opened.length >= LEARN_LIMIT) {
        showToast(`Bu bulmacada ${LEARN_LIMIT} kelime kartı hakkını kullandın`);
        return;
      }
      opened.push(w.answer);
      markLearned(w.answer);
    }
    setLearn({ answer: w.answer, clue: w.clue });
  };

  // ---- İpuçları ----
  const unfound = puzzle.words.filter((w) => !found[w.answer]);
  const hintFirst = () => {
    setMenu(false);
    recordHint('letter', session);
    const w = unfound.find((x) => !hinted[x.answer]) || unfound[0];
    if (!w) return;
    recordHard(w.answer, 'hint');
    setHinted((h) => ({ ...h, [w.answer]: true }));
    showToast(`İlk harf işaretlendi: ${puzzle.list === 'en' ? w.answer.toLowerCase() : w.clue}`);
  };
  const revealOne = () => {
    setMenu(false);
    recordHint('word', session);
    const w = unfound[0];
    if (!w) return;
    recordHard(w.answer, 'hint');
    setFound((f) => ({ ...f, [w.answer]: { revealed: true } }));
  };
  const reset = () => {
    setMenu(false);
    setFound({});
    setHinted({});
    session.seconds = 0;
  };

  const center = (r, c) => [c * size + size / 2, r * size + size / 2];
  const capsule = (key, r0, c0, r1, c1, fill, dashed) => {
    const [x0, y0] = center(r0, c0);
    const [x1, y1] = center(r1, c1);
    const sw = size * 0.8;
    return (
      <React.Fragment key={key}>
        <Line x1={x0} y1={y0} x2={x1} y2={y1} stroke={ed.accent} strokeWidth={sw} strokeLinecap="round" />
        <Line x1={x0} y1={y0} x2={x1} y2={y1} stroke={fill} strokeWidth={sw - 3} strokeLinecap="round" strokeDasharray={dashed ? '1' : undefined} />
      </React.Fragment>
    );
  };

  const marks = [];
  for (const w of puzzle.words) {
    const f = found[w.answer];
    if (!f) continue;
    const [r1, c1] = endOf(w);
    // kendi bulduğun yeşil, ampulle açılan gri
    marks.push(capsule(w.answer, w.r, w.c, r1, c1, f.revealed ? ed.revealHi : colors.okCell));
  }
  const hintMarks = puzzle.words
    .filter((w) => hinted[w.answer] && !found[w.answer])
    .map((w) => {
      const [x, y] = center(w.r, w.c);
      return <Circle key={`h${w.answer}`} cx={x} cy={y} r={size * 0.42} stroke={ed.orange} strokeWidth={2.5} fill="none" />;
    });

  const doneCount = puzzle.words.length - unfound.length;

  return (
    <View style={styles.root}>
      <GameHeader
        insetTop={insets.top}
        session={session}
        running={!solved}
        subtitle={`${kind === 'daily' ? 'Günün Kelime Avı' : `Kelime Avı · ${level.id === 'MIX' ? 'Karışık' : level.id}`} · No. ${puzzle.no}`}
        badge={`${left}/${LEARN_LIMIT}`}
        onMenu={() => setMenu(true)}
      />

      <View style={styles.kickerRow}>
        <Text style={[styles.kicker, toast && { color: colors.ink }]} numberOfLines={1}>
          {toast || (puzzle.list === 'en' ? 'WORD SEARCH · KELİMELERİ BUL VE ÇİZ' : 'WORD SEARCH · TÜRKÇESİ VERİLEN KELİMENİN İNGİLİZCESİNİ BUL')}
        </Text>
      </View>

      {/* Izgara */}
      <View style={styles.gridWrap}>
        <View style={[styles.frame, { width: gw + 4, height: gh + 4 }]}>
          <Svg width={gw} height={gh} style={StyleSheet.absoluteFill}>
            {marks}
            {drag ? capsule('drag', drag.r0, drag.c0, drag.r1, drag.c1, colors.cellActive) : null}
            {hintMarks}
          </Svg>
          {puzzle.rows.map((row, r) => (
            <View key={r} style={styles.row} pointerEvents="none">
              {row.split('').map((ch, c) => (
                <View key={c} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                  <Text allowFontScaling={false} style={[styles.letter, { fontSize: size * 0.56, lineHeight: size * 0.8 }]}>
                    {ch}
                  </Text>
                </View>
              ))}
            </View>
          ))}
          <View style={StyleSheet.absoluteFill} {...responder} />
        </View>
      </View>

      {/* Kelime listesi */}
      <View style={styles.listHead}>
        <Text style={styles.listTitle}>{puzzle.list === 'en' ? 'Words · Kelimeler' : 'İpuçları · Clues'}</Text>
        <Text style={styles.listCount}>
          {doneCount}/{puzzle.words.length}
        </Text>
        <View style={styles.learnTag}>
          <BookIcon size={13} />
          <Text style={styles.learnTagText}>
            {left}/{LEARN_LIMIT}
          </Text>
        </View>
      </View>
      <View style={styles.list}>
        {puzzle.words.map((w) => {
          const f = found[w.answer];
          const label = puzzle.list === 'en' ? w.answer.toLowerCase() : w.clue;
          return (
            <Pressable key={w.answer} style={styles.item} onPress={() => openLearn(w)} hitSlop={4}>
              <View style={[styles.dot, f && { backgroundColor: f.revealed ? ed.revealHi : colors.okCell }]} />
              <Text style={[styles.itemText, f && styles.itemDone]} numberOfLines={1}>
                {label}
                {puzzle.list === 'tr' && !f ? <Text style={styles.itemLen}> ({w.answer.length})</Text> : null}
                {puzzle.list === 'tr' && f ? <Text style={styles.itemEn}> {w.answer.toLowerCase()}</Text> : null}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <BackBar onPress={onBack} bottomInset={insets.bottom} />

      {/* Ampul menüsü */}
      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenu(false)}>
          <View style={styles.menu}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <BulbIcon size={18} color={ed.accent} />
              <Text style={styles.menuTitle}>İPUCU YARDIMI</Text>
            </View>
            <View style={styles.thinRule} />
            {[
              ['İlk harfi göster', 'Bir kelimenin ilk harfini daire içine al', hintFirst],
              ['Kelime aç', 'Bulunamayan bir kelimeyi göster', revealOne],
              ['Baştan başla', 'Tüm işaretleri temizle', reset],
            ].map(([t, d, fn]) => (
              <Pressable key={t} onPress={fn} style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: ed.accentSoft }]}>
                <Text style={styles.menuItemTitle}>{t}</Text>
                <Text style={styles.menuItemDesc}>{d}</Text>
              </Pressable>
            ))}
            <Text style={styles.menuNote}>Listedeki bir kelimeye dokunursan kelime kartı açılır.</Text>
          </View>
        </Pressable>
      </Modal>

      {learn ? (
        <LearnModal answer={learn.answer} clue={learn.clue} remaining={left} limit={LEARN_LIMIT} onClose={() => setLearn(null)} />
      ) : null}

      <Modal visible={showWin} transparent animationType="fade" onRequestClose={() => setShowWin(false)}>
        <View style={styles.backdrop}>
          <View style={styles.win}>
            <Text style={styles.winKicker}>TEBRİKLER</Text>
            <Text style={styles.winHead}>Hepsini Buldun</Text>
            <View style={styles.doubleRule} />
            <Text style={styles.winBody}>
              Tebrikler! {puzzle.words.length} kelimeyi {formatTime(session.seconds || 0)} sürede buldun.
            </Text>
            <ShareButton info={{ title: `Kelime Avı · ${kind === 'daily' ? 'Günün Bulmacası' : level.id === 'MIX' ? 'Karışık' : level.id} · No. ${puzzle.no}`, seconds: session.seconds, words: puzzle.words.length, hints: session.hinted }} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setShowWin(false)}>
                <Text style={[styles.btnText, { color: ed.text }]}>Izgarayı gör</Text>
              </Pressable>
              <Pressable style={styles.btn} onPress={kind === 'daily' ? onBack : onNext}>
                <Text style={styles.btnText}>{kind === 'daily' ? 'Ana sayfa' : 'Sonraki →'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {solved && !showWin && kind !== 'daily' ? (
        <Pressable style={[styles.nextFab, { bottom: insets.bottom + BACK_BAR_HEIGHT + 16 }]} onPress={onNext}>
          <Text style={styles.btnText}>Sonraki bulmaca →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function WordSearchScreen({ kind, levelId, onBack }) {
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets();

  const load = useCallback(
    async (forceNew) => {
      setSession(null);
      setError(null);
      try {
        const sess = kind === 'daily' ? await getWordSearchDaily() : await getWordSearchSession(levelId, forceNew);
        setSession(sess);
      } catch (e) {
        setError(String(e?.message || e));
      }
    },
    [kind, levelId],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  if (!session) {
    return (
      <View style={[styles.root, styles.loading, { paddingTop: insets.top }]}>
        <Text style={styles.winKicker}>YENİ BASKI</Text>
        <Text style={styles.loadingHead}>Bulmaca hazırlanıyor…</Text>
        {error ? (
          <Pressable style={[styles.btn, { marginTop: 12, flex: 0, paddingHorizontal: 20 }]} onPress={() => load(true)}>
            <Text style={styles.btnText}>Tekrar dene</Text>
          </Pressable>
        ) : (
          <ActivityIndicator color={ed.accent} />
        )}
      </View>
    );
  }
  return (
    <Board
      key={`${session.puzzle.no}-${session.date || levelId}`}
      session={session}
      kind={kind}
      levelId={kind === 'daily' ? 'MIX' : levelId}
      onBack={onBack}
      onNext={() => load(true)}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ed.bg },
  loading: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 10 },
  loadingHead: { fontFamily: efonts.headlineBold, fontSize: 26, lineHeight: 32, color: ed.text, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 50 },
  headerSide: { width: 96 },
  headerRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  headerMid: { flex: 1, alignItems: 'center' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  back: { fontFamily: efonts.body, fontSize: 17, lineHeight: 22, color: ed.text },
  title: { fontFamily: efonts.labelBold, fontSize: 18, letterSpacing: 3, color: ed.text },
  sub: { fontFamily: efonts.headlineItalic, fontSize: 12, lineHeight: 16, color: ed.textSoft },
  timer: { fontFamily: efonts.labelBold, fontSize: 15, color: ed.text, fontVariant: ['tabular-nums'] },
  bulb: {
    width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: ed.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: ed.surface,
  },
  doubleRule: { height: 1, backgroundColor: ed.border, marginVertical: 8, marginHorizontal: 8 },
  thinRule: { height: 1, backgroundColor: ed.border, marginVertical: 8 },
  kickerRow: { paddingHorizontal: 12, paddingVertical: 6 },
  kicker: { fontFamily: efonts.labelBold, fontSize: 10, letterSpacing: 1.2, color: ed.accent, textAlign: 'center' },
  gridWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { borderWidth: 1.5, borderColor: ed.frame, backgroundColor: ed.surface, borderRadius: 6, overflow: 'hidden' },
  row: { flexDirection: 'row' },
  letter: { fontFamily: efonts.labelBold, color: ed.text, textAlign: 'center', includeFontPadding: false },
  listHead: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: ed.border, gap: 8 },
  listTitle: { flex: 1, fontFamily: efonts.headlineBold, fontSize: 17, lineHeight: 23, color: ed.text },
  listCount: { fontFamily: efonts.labelBold, fontSize: 13, color: ed.text },
  learnTag: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 10, backgroundColor: ed.accentSoft, paddingHorizontal: 7, paddingVertical: 3 },
  learnTagText: { fontFamily: efonts.labelBold, fontSize: 11, color: ed.accentInk },
  list: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 4, paddingBottom: 4 },
  item: { width: '33.33%', flexDirection: 'row', alignItems: 'center', paddingVertical: 2, paddingRight: 6, gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1, borderColor: ed.textMute },
  itemText: { flex: 1, fontFamily: efonts.body, fontSize: 14, lineHeight: 19, color: ed.text },
  itemDone: { textDecorationLine: 'line-through', color: ed.textSoft },
  itemLen: { fontFamily: efonts.body, fontSize: 11, color: ed.textSoft },
  itemEn: { fontFamily: efonts.headlineItalic, fontSize: 13, color: ed.text, textDecorationLine: 'none' },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,27,38,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  menu: { width: '100%', maxWidth: 360, backgroundColor: ed.surface, borderRadius: 16, padding: 16 },
  menuTitle: { fontFamily: efonts.labelBold, fontSize: 12, letterSpacing: 1.2, color: ed.accent },
  menuItem: { paddingVertical: 10, paddingHorizontal: 6, borderRadius: 10 },
  menuItemTitle: { fontFamily: efonts.bodyBold, fontSize: 15.5, color: ed.text },
  menuItemDesc: { fontFamily: efonts.body, fontSize: 12.5, lineHeight: 17, color: ed.textSoft },
  menuNote: { fontFamily: efonts.headlineItalic, fontSize: 12, lineHeight: 17, color: ed.textSoft, marginTop: 10 },
  win: { width: '100%', maxWidth: 360, backgroundColor: ed.surface, borderRadius: 18, padding: 22 },
  winKicker: { fontFamily: efonts.labelBold, fontSize: 11, letterSpacing: 2, color: ed.orange, textAlign: 'center' },
  winHead: { fontFamily: efonts.headlineBold, fontSize: 30, lineHeight: 36, color: ed.text, textAlign: 'center', marginTop: 4 },
  winBody: { fontFamily: efonts.body, fontSize: 15, lineHeight: 22, color: ed.textSoft, marginTop: 10, textAlign: 'center' },
  btn: { flex: 1, backgroundColor: ed.primary, paddingVertical: 13, alignItems: 'center', borderRadius: 12 },
  btnGhost: { backgroundColor: ed.surfaceAlt },
  btnText: { fontFamily: efonts.bodyBold, fontSize: 15, color: ed.onPrimary },
  nextFab: { position: 'absolute', left: 20, right: 20, backgroundColor: ed.primary, paddingVertical: 15, alignItems: 'center', borderRadius: 12 },
});
