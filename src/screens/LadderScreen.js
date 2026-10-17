import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Modal, AppState, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Keyboard from '../components/Keyboard';
import LearnModal from '../components/LearnModal';
import BackBar, { BACK_BAR_HEIGHT } from '../components/BackBar';
import { GameHeader, ShareButton } from '../components/GameShell';
import { BulbIcon, BookIcon, ChevronIcon } from '../components/Icons';
import { reducer, initState, rowStatus, fillableRows, key } from '../engine/ladderBoard';
import { getLevel, getLadderSession, getLadderDaily, markLadderSolved, markLearned, LEARN_LIMIT, recordHint, recordHard } from '../engine/session';
import { persist } from '../storage';
import { colors, fonts, formatTime, ed, efonts } from '../theme';

const STATUS_BG = { ok: colors.okCell, close: colors.closeCell, bad: colors.badCell };

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

function Board({ session, kind, levelId, onBack, onNext }) {
  const p = session.puzzle;
  const level = getLevel(levelId);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [s, dispatch] = useReducer(reducer, null, () => initState(p, session.entries || {}, session.revealed || {}));
  const [menu, setMenu] = useState(false);
  const [learn, setLearn] = useState(null);
  const [toast, setToast] = useState(null);
  const [showWin, setShowWin] = useState(false);
  const opened = session.opened || (session.opened = []);
  const left = LEARN_LIMIT - opened.length;
  const last = p.rungs.length - 1;

  useEffect(() => {
    session.entries = s.entries;
    session.revealed = s.revealed;
    persist();
  }, [s.entries, s.revealed, session]);

  const wasSolved = useRef(!!session.solved);
  useEffect(() => {
    if (s.solved && !wasSolved.current) {
      wasSolved.current = true;
      session.solved = true;
      markLadderSolved(kind, levelId);
      setShowWin(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [s.solved, session, kind, levelId]);

  // Basamak tamamlanınca titreşim
  const prevStatus = useRef({});
  useEffect(() => {
    for (const r of fillableRows(p)) {
      const v = rowStatus(p, s.entries, r);
      if (v && v !== prevStatus.current[r]) {
        Haptics.notificationAsync(
          v === 'ok' ? Haptics.NotificationFeedbackType.Success : v === 'close' ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Error,
        ).catch(() => {});
      }
      prevStatus.current[r] = v;
    }
  }, [s.entries, p]);

  const toastTimer = useRef(null);
  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  const openLearn = (row) => {
    const r = p.rungs[row];
    if (!opened.includes(r.answer)) {
      if (opened.length >= LEARN_LIMIT) {
        showToast(`Bu bulmacada ${LEARN_LIMIT} kelime kartı hakkını kullandın`);
        return;
      }
      opened.push(r.answer);
      markLearned(r.answer);
    }
    setLearn({ answer: r.answer, clue: r.clue });
  };

  // İpucu kutusuna dokunma: ilk dokunuş basamağı seçer, seçiliyse kelime kartını açar
  const onClue = (row) => {
    if (row === 0 || row === last || row === s.sel.row) openLearn(row);
    else dispatch({ type: 'selectRow', row });
  };

  const onKey = useCallback((ch) => {
    dispatch({ type: 'type', ch });
    Haptics.selectionAsync().catch(() => {});
  }, []);
  const onDelete = useCallback(() => dispatch({ type: 'del' }), []);

  // ---- Boyutlar ----
  const keyH = Math.min(48, Math.max(40, height * 0.056));
  const clueW = Math.floor(width * 0.34);
  const avail = height - insets.top - insets.bottom - 50 - 6 - 40 - keyH * 3 - 12 - 60 - BACK_BAR_HEIGHT;
  const rowGap = 8;
  const cell = Math.floor(
    Math.min(58, (width - 32 - clueW - 16 - (p.len - 1) * 4) / p.len, (avail - (p.rungs.length - 1) * rowGap) / p.rungs.length),
  );

  const act = (type) => () => {
    dispatch({ type });
    setMenu(false);
  };
  const solvedRows = fillableRows(p).filter((r) => rowStatus(p, s.entries, r) === 'ok').length;

  const renderRow = (row) => {
    const rung = p.rungs[row];
    const fixed = row === 0 || row === last;
    const status = fixed ? null : rowStatus(p, s.entries, row);
    const selectedRow = !fixed && s.sel.row === row;
    return (
      <View key={row} style={[styles.rowWrap, { height: cell, marginBottom: row === last ? 0 : rowGap }]}>
        <Pressable
          onPress={() => onClue(row)}
          style={[
            styles.clueBox,
            { width: clueW, height: cell },
            fixed && styles.clueFixed,
            selectedRow && { backgroundColor: colors.clueCellActive },
          ]}
        >
          {fixed ? (
            <Text style={styles.fixedLabel}>{row === 0 ? 'BAŞLANGIÇ' : 'HEDEF'}</Text>
          ) : (
            <Text
              allowFontScaling={false}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={[styles.clueText, selectedRow && { color: colors.ink }]}
            >
              {rung.clue}
            </Text>
          )}
        </Pressable>
        <View style={styles.cellsRow}>
          {Array.from({ length: p.len }, (_, c) => {
            const k = key(row, c);
            const v = fixed ? rung.answer[c] : s.entries[k];
            // Boş karede bir üst basamağın harfi soluk görünür
            const above = row - 1 === 0 ? p.rungs[0].answer[c] : s.entries[key(row - 1, c)];
            const ghost = !fixed && !v && above ? above : null;
            const active = selectedRow && s.sel.col === c;
            // kilitli (otomatik dolan) harf: değişmeyen harf, kullanıcı yazmaz
            const locked = !fixed && s.fixed && s.fixed[k];
            let bg = fixed ? colors.paperDark : colors.cell;
            if (selectedRow) bg = colors.wordHighlight;
            if (locked) bg = colors.paperDark;
            if (status) bg = STATUS_BG[status];
            if (active) bg = colors.cellActive;
            return (
              <Pressable
                key={c}
                onPressIn={() => !fixed && dispatch({ type: 'tap', row, col: c })}
                style={[styles.cell, { width: cell, height: cell, backgroundColor: bg }]}
              >
                {p.hint && !fixed && rung.change === c ? <View style={styles.hintArrow} /> : null}
                {p.hint && row === last && rung.change === c ? <View style={styles.hintArrow} /> : null}
                <Text
                  allowFontScaling={false}
                  style={[
                    styles.letter,
                    { fontSize: cell * 0.55, lineHeight: cell * 0.75 },
                    ghost && styles.ghost,
                    s.revealed[k] && { color: colors.revealed },
                  ]}
                >
                  {v || ghost || ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <GameHeader
        insetTop={insets.top}
        session={session}
        running={!s.solved}
        subtitle={`${kind === 'daily' ? 'Günün Merdiveni' : `Kelime Merdiveni · ${level.id === 'MIX' ? 'Karışık' : level.id}`} · No. ${p.no}`}
        badge={`${left}/${LEARN_LIMIT}`}
        onMenu={() => setMenu(true)}
      />

      <View style={styles.kickerRow}>
        <Text style={[styles.kicker, toast && { color: colors.ink }]} numberOfLines={1}>
          {toast || `WORD LADDER · HER ADIMDA TEK HARF DEĞİŞTİR: ${p.rungs[0].answer} → ${p.rungs[last].answer}`}
        </Text>
      </View>

      <View style={styles.ladderWrap}>
        <View>
          {p.rungs.map((_, row) => renderRow(row))}
          {/* Merdiven rayları */}
          {/* kareler clueW + 16 noktasından başlar; raylar 4px boşlukla iki yanda */}
          <View pointerEvents="none" style={[styles.rail, { left: clueW + 16 - 9 }]} />
          <View pointerEvents="none" style={[styles.rail, { left: clueW + 16 + p.len * cell + (p.len - 1) * 4 + 4 }]} />
        </View>
      </View>

      <View style={styles.infoRow}>
        <Pressable onPress={() => dispatch({ type: 'step', delta: -1 })} hitSlop={10} style={styles.navBtn}>
          <ChevronIcon dir="left" size={20} />
        </Pressable>
        <Text style={styles.info}>
          {solvedRows}/{fillableRows(p).length} basamak · ipucuna iki kez dokun: kelime kartı
        </Text>
        <View style={styles.learnTag}>
          <BookIcon size={13} />
          <Text style={styles.learnTagText}>
            {left}/{LEARN_LIMIT}
          </Text>
        </View>
        <Pressable onPress={() => dispatch({ type: 'step', delta: 1 })} hitSlop={10} style={styles.navBtn}>
          <ChevronIcon dir="right" size={20} />
        </Pressable>
      </View>

      <Keyboard onKey={onKey} onDelete={onDelete} keyHeight={keyH} />
      <BackBar onPress={onBack} bottomInset={insets.bottom} />

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenu(false)}>
          <View style={styles.menu}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <BulbIcon size={18} color={ed.accent} />
              <Text style={styles.menuTitle}>İPUCU YARDIMI</Text>
            </View>
            <View style={styles.thinRule} />
            {[
              ['Harf aç', 'Seçili kareyi göster', () => {
                recordHint('letter', session);
                recordHard(p.rungs[s.sel.row]?.answer, 'hint');
                act('revealLetter')();
              }],
              ['Basamağı aç', 'Seçili basamaktaki kelimeyi göster', () => {
                recordHint('word', session);
                recordHard(p.rungs[s.sel.row]?.answer, 'hint');
                act('revealRow')();
              }],
              ['Basamağı temizle', 'Seçili basamaktaki harfleri sil', act('clearRow')],
              ['Kelime kartı', `Seçili basamağı öğren (kalan hak ${left}/${LEARN_LIMIT})`, () => { setMenu(false); openLearn(s.sel.row); }],
              ['Baştan başla', 'Tüm basamakları temizle', act('reset')],
            ].map(([t, d, fn]) => (
              <Pressable key={t} onPress={fn} style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: ed.accentSoft }]}>
                <Text style={styles.menuItemTitle}>{t}</Text>
                <Text style={styles.menuItemDesc}>{d}</Text>
              </Pressable>
            ))}
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
            <Text style={styles.winHead}>Merdiven Tamam</Text>
            <View style={styles.doubleRule} />
            <Text style={styles.winBody}>
              Tebrikler! {p.rungs[0].answer.toLowerCase()} kelimesinden {p.rungs[last].answer.toLowerCase()} kelimesine {p.steps} adımda, {formatTime(session.seconds || 0)} sürede çıktın.
            </Text>
            <ShareButton info={{ title: `Kelime Merdiveni · ${kind === 'daily' ? 'Günün Bulmacası' : level.id === 'MIX' ? 'Karışık' : level.id} · No. ${p.no}`, seconds: session.seconds, hints: session.hinted, line: `🪜 ${p.rungs[0].answer} → ${p.rungs[last].answer} · ${p.steps} adım` }} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setShowWin(false)}>
                <Text style={[styles.btnText, { color: ed.text }]}>Merdiveni gör</Text>
              </Pressable>
              <Pressable style={styles.btn} onPress={kind === 'daily' ? onBack : onNext}>
                <Text style={styles.btnText}>{kind === 'daily' ? 'Ana sayfa' : 'Sonraki →'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {s.solved && !showWin && kind !== 'daily' ? (
        <Pressable style={[styles.nextFab, { bottom: insets.bottom + BACK_BAR_HEIGHT + 16 }]} onPress={onNext}>
          <Text style={styles.btnText}>Sonraki merdiven →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function LadderScreen({ kind, levelId, onBack }) {
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets();
  const load = useCallback(
    async (forceNew) => {
      setSession(null);
      setError(null);
      try {
        setSession(kind === 'daily' ? await getLadderDaily() : await getLadderSession(levelId, forceNew));
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
      levelId={kind === 'daily' ? 'B1' : levelId}
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
  kicker: { fontFamily: efonts.labelBold, fontSize: 10, letterSpacing: 1.1, color: ed.accent, textAlign: 'center' },
  ladderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  rowWrap: { flexDirection: 'row', alignItems: 'center' },
  clueBox: {
    backgroundColor: colors.clueCell, borderWidth: 1, borderColor: ed.border, marginRight: 16,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  clueFixed: { backgroundColor: ed.primary },
  fixedLabel: { fontFamily: efonts.labelBold, fontSize: 11, letterSpacing: 1.5, color: ed.bg },
  clueText: { fontFamily: efonts.bodySemi, fontSize: 15, lineHeight: 19, color: ed.text, textAlign: 'center' },
  cellsRow: { flexDirection: 'row', gap: 4 },
  cell: { borderWidth: 1, borderColor: ed.border, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  letter: { fontFamily: efonts.labelBold, color: ed.text, textAlign: 'center', includeFontPadding: false },
  ghost: { color: ed.textMute },
  hintArrow: {
    position: 'absolute', top: 0, width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: ed.accent,
  },
  rail: { position: 'absolute', top: -6, bottom: -6, width: 4, borderRadius: 2, backgroundColor: ed.primary },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginBottom: 8, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: ed.border, backgroundColor: ed.surface, gap: 6 },
  navBtn: { width: 34, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  info: { flex: 1, fontFamily: efonts.headlineItalic, fontSize: 12.5, lineHeight: 17, color: ed.textSoft },
  learnTag: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 10, backgroundColor: ed.accentSoft, paddingHorizontal: 7, paddingVertical: 3 },
  learnTagText: { fontFamily: efonts.labelBold, fontSize: 11, color: ed.accentInk },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,27,38,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  menu: { width: '100%', maxWidth: 360, backgroundColor: ed.surface, borderRadius: 16, padding: 16 },
  menuTitle: { fontFamily: efonts.labelBold, fontSize: 12, letterSpacing: 1.2, color: ed.accent },
  menuItem: { paddingVertical: 10, paddingHorizontal: 6, borderRadius: 10 },
  menuItemTitle: { fontFamily: efonts.bodyBold, fontSize: 15.5, color: ed.text },
  menuItemDesc: { fontFamily: efonts.body, fontSize: 12.5, lineHeight: 17, color: ed.textSoft },
  win: { width: '100%', maxWidth: 360, backgroundColor: ed.surface, borderRadius: 18, padding: 22 },
  winKicker: { fontFamily: efonts.labelBold, fontSize: 11, letterSpacing: 2, color: ed.orange, textAlign: 'center' },
  winHead: { fontFamily: efonts.headlineBold, fontSize: 30, lineHeight: 36, color: ed.text, textAlign: 'center', marginTop: 4 },
  winBody: { fontFamily: efonts.body, fontSize: 15, lineHeight: 22, color: ed.textSoft, marginTop: 10, textAlign: 'center' },
  btn: { flex: 1, backgroundColor: ed.primary, paddingVertical: 13, alignItems: 'center', borderRadius: 12 },
  btnGhost: { backgroundColor: ed.surfaceAlt },
  btnText: { fontFamily: efonts.bodyBold, fontSize: 15, color: ed.onPrimary },
  nextFab: { position: 'absolute', left: 20, right: 20, backgroundColor: ed.primary, paddingVertical: 15, alignItems: 'center', borderRadius: 12 },
});
