import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Modal, AppState, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import ArrowGrid from '../components/ArrowGrid';
import Keyboard from '../components/Keyboard';
import LearnModal from '../components/LearnModal';
import { BulbIcon, BookIcon, ChevronIcon } from '../components/Icons';
import { buildModel, wordStatus } from '../engine/model';
import { reducer, selectWordState } from '../engine/board';
import { getLevel, getLevelSession, getDailySession, markSolved, markLearned, LEARN_LIMIT } from '../engine/session';
import { getStore, persist } from '../storage';
import { colors, fonts, formatTime } from '../theme';

const ARROW_LABEL = { R: '→', D: '↓', RD: '↴', DR: '↳' };


// ---------------- Zamanlayıcı (ayrı bileşen: ızgarayı her saniye yeniden çizmesin) ----------------
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

// ---------------- Bulmaca tahtası ----------------
function Board({ session, kind, levelId, onBack, onNext }) {
  const puzzle = session.puzzle;
  const model = useMemo(() => buildModel(puzzle), [puzzle]);
  const [s, dispatch] = useReducer(reducer, null, () => {
    const init = {
      model,
      entries: session.entries || {},
      revealed: session.revealed || {},
      solved: !!session.solved,
      active: model.order[0],
      sel: null,
    };
    return selectWordState(init, model.order[0]);
  });
  const [menu, setMenu] = useState(false);
  const [learn, setLearn] = useState(null); // { answer, clue }
  const [toast, setToast] = useState(null);
  const [showWin, setShowWin] = useState(false);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // Kaydet
  useEffect(() => {
    session.entries = s.entries;
    session.revealed = s.revealed;
    persist();
  }, [s.entries, s.revealed, session]);

  // Çözüldü
  const wasSolved = useRef(!!session.solved);
  useEffect(() => {
    if (s.solved && !wasSolved.current) {
      wasSolved.current = true;
      session.solved = true;
      markSolved(kind, levelId);
      setShowWin(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [s.solved, session, kind, levelId]);

  // Kelime durumları -> hücre renkleri (yeşil > sarı > kırmızı)
  const { cellStatus, statuses } = useMemo(() => {
    const rank = { ok: 3, close: 2, bad: 1 };
    const cs = {};
    const st = model.words.map((w) => wordStatus(w, s.entries, model.solution));
    model.words.forEach((w, i) => {
      const v = st[i];
      if (!v) return;
      for (const k of w.keys) if (!cs[k] || rank[v] > rank[cs[k]]) cs[k] = v;
    });
    return { cellStatus: cs, statuses: st };
  }, [s.entries, model]);

  // Kelime tamamlandığında titreşim
  const prevStatus = useRef(statuses[s.active]);
  useEffect(() => {
    const v = statuses[s.active];
    if (v && v !== prevStatus.current) {
      Haptics.notificationAsync(
        v === 'ok'
          ? Haptics.NotificationFeedbackType.Success
          : v === 'close'
            ? Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Error,
      ).catch(() => {});
    }
    prevStatus.current = v;
  }, [statuses, s.active]);

  const learned = useMemo(() => new Set(Object.keys(getStore().learn.marked)), [learn]);
  const opened = session.opened || (session.opened = []);

  const toastTimer = useRef(null);
  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  const openLearn = useCallback(
    (idx) => {
      const w = model.words[idx];
      if (!opened.includes(w.answer)) {
        if (opened.length >= LEARN_LIMIT) {
          showToast(`Bu bulmacada ${LEARN_LIMIT} kelime kartı hakkını kullandın`);
          return;
        }
        opened.push(w.answer);
        markLearned(w.answer);
      }
      setLearn({ answer: w.answer, clue: w.text });
    },
    [model, opened],
  );

  // Seçili kelime (dokunma işleyicisini her harfte yeniden oluşturmamak için ref)
  const activeRef = useRef(s.active);
  activeRef.current = s.active;

  const onTap = useCallback(
    (r, c, slot) => {
      const ch = puzzle.rows[r][c];
      if (ch === '#') {
        const list = model.clueCells[`${r},${c}`] || [];
        const idx = list[slot] ?? list[0] ?? list[1];
        if (idx == null) return;
        // İlk dokunuş kelimeyi seçer; zaten seçiliyse kelime kartını açar
        if (idx === activeRef.current) openLearn(idx);
        else dispatch({ type: 'selectWord', idx });
      } else if (ch !== '.') {
        dispatch({ type: 'tapCell', r, c });
      }
    },
    [puzzle, model, openLearn],
  );

  const onKey = useCallback((ch) => {
    dispatch({ type: 'type', ch });
    Haptics.selectionAsync().catch(() => {});
  }, []);
  const onDelete = useCallback(() => dispatch({ type: 'del' }), []);

  // Boyutlandırma
  const keyH = Math.min(48, Math.max(40, height * 0.056));
  const reserved = insets.top + insets.bottom + 50 + 6 + 66 + keyH * 3 + 12 + 26;
  const size = Math.floor(Math.min((width - 8 - 4) / puzzle.w, (height - reserved) / puzzle.h));

  const w = model.words[s.active];
  const filled = Object.keys(model.solution).filter((k) => s.entries[k]).length;
  const level = getLevel(levelId);
  const left = LEARN_LIMIT - opened.length;
  const act = (type) => () => {
    dispatch({ type });
    setMenu(false);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 6 }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={14} style={styles.headerSide}>
          <View style={styles.backRow}>
            <ChevronIcon dir="left" size={15} />
            <Text style={styles.back}>Geri</Text>
          </View>
        </Pressable>
        <View style={styles.headerMid}>
          <Text style={styles.title}>QORVEX</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {kind === 'daily' ? 'Günün Bulmacası' : `${level.title} · ${level.id === 'MIX' ? 'Karışık' : level.id}`} · No. {puzzle.no}
          </Text>
        </View>
        <View style={[styles.headerSide, styles.headerRight]}>
          <Timer session={session} running={!s.solved} />
          <Pressable onPress={() => setMenu(true)} hitSlop={14} style={styles.bulb}>
            <BulbIcon size={26} />
          </Pressable>
        </View>
      </View>
      <View style={styles.doubleRule} />

      <View style={styles.gridWrap}>
        <ArrowGrid
          puzzle={puzzle}
          model={model}
          size={size}
          entries={s.entries}
          revealed={s.revealed}
          cellStatus={cellStatus}
          selected={s.sel}
          activeWord={s.active}
          learned={learned}
          onTap={onTap}
        />
        <Text style={styles.progress}>
          {filled}/{model.total} harf · {statuses.filter((x) => x === 'ok').length}/{model.words.length} kelime doğru
        </Text>
      </View>

      {/* İpucu çubuğu: Türkçe kelimeye basınca kelime kartı açılır */}
      <View style={styles.clueBar}>
        <Pressable onPress={() => dispatch({ type: 'step', delta: -1 })} hitSlop={8} style={styles.clueNav}>
          <ChevronIcon dir="left" size={22} />
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => openLearn(s.active)}>
          <Text style={[styles.clueMeta, toast && { color: colors.wrong }]} numberOfLines={1}>
            {toast || `${w.dir === 'A' ? 'ACROSS · YATAY' : 'DOWN · DİKEY'} ${ARROW_LABEL[w.arrow]} (${w.answer.length})`}
          </Text>
          <View style={styles.clueRow}>
            <Text style={styles.clueText} numberOfLines={1} adjustsFontSizeToFit>
              {w.text}
            </Text>
            <View style={styles.learnTag}>
              <BookIcon size={14} />
              <Text style={styles.learnTagText}>
                {left}/{LEARN_LIMIT}
              </Text>
            </View>
          </View>
        </Pressable>
        <Pressable onPress={() => dispatch({ type: 'step', delta: 1 })} hitSlop={8} style={styles.clueNav}>
          <ChevronIcon dir="right" size={22} />
        </Pressable>
      </View>

      <Keyboard onKey={onKey} onDelete={onDelete} keyHeight={keyH} />

      {/* Ampul menüsü */}
      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenu(false)}>
          <View style={styles.menu}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <BulbIcon size={26} />
              <Text style={styles.menuTitle}>İpuçları</Text>
            </View>
            <View style={styles.thinRule} />
            {[
              ['Harf aç', 'Seçili kareyi göster', act('revealLetter')],
              ['Kelime aç', 'Seçili kelimeyi göster', act('revealWord')],
              ['Kelimeyi temizle', 'Seçili kelimedeki harfleri sil', act('clearWord')],
              [
                'Kelime kartı',
                `Seçili kelimeyi öğren (kalan hak ${left}/${LEARN_LIMIT})`,
                () => {
                  setMenu(false);
                  openLearn(s.active);
                },
              ],
              ['Baştan başla', 'Tüm kareleri temizle', act('reset')],
            ].map(([t, d, fn]) => (
              <Pressable key={t} onPress={fn} style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: colors.paperDark }]}>
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

      {/* Tebrikler */}
      <Modal visible={showWin} transparent animationType="fade" onRequestClose={() => setShowWin(false)}>
        <View style={styles.backdrop}>
          <View style={styles.win}>
            <Text style={styles.winKicker}>EXTRA! EXTRA!</Text>
            <Text style={styles.winHead}>Puzzle Solved</Text>
            <View style={styles.doubleRule} />
            <Text style={styles.winBody}>
              Tebrikler! {model.words.length} kelimeyi {formatTime(session.seconds || 0)} sürede çözdün.
              {Object.keys(s.revealed).length ? ` (${Object.keys(s.revealed).length} harf açıldı)` : ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setShowWin(false)}>
                <Text style={[styles.btnText, { color: colors.ink }]}>Izgarayı gör</Text>
              </Pressable>
              <Pressable style={styles.btn} onPress={kind === 'daily' ? onBack : onNext}>
                <Text style={styles.btnText}>{kind === 'daily' ? 'Ana sayfa' : 'Sonraki →'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {s.solved && !showWin && kind !== 'daily' ? (
        <Pressable style={[styles.nextFab, { bottom: insets.bottom + 16 }]} onPress={onNext}>
          <Text style={styles.btnText}>Sonraki bulmaca →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ---------------- Ekran: oturumu yükler / üretir ----------------
export default function PuzzleScreen({ kind, levelId, onBack }) {
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets();

  const load = useCallback(
    async (forceNew) => {
      setSession(null);
      setError(null);
      try {
        const sess = kind === 'daily' ? await getDailySession() : await getLevelSession(levelId, forceNew);
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
        <Text style={styles.loadingKicker}>STOP THE PRESSES</Text>
        <Text style={styles.loadingHead}>Yeni baskı hazırlanıyor…</Text>
        <View style={[styles.doubleRule, { alignSelf: 'stretch', marginVertical: 10 }]} />
        {error ? (
          <>
            <Text style={styles.winBody}>{error}</Text>
            <Pressable style={[styles.btn, { marginTop: 12, flex: 0, paddingHorizontal: 20 }]} onPress={() => load(true)}>
              <Text style={styles.btnText}>Tekrar dene</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={colors.ink} />
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
  root: { flex: 1, backgroundColor: colors.paper },
  loading: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  loadingKicker: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 3, color: colors.wrong },
  loadingHead: { fontFamily: fonts.masthead, fontSize: 34, color: colors.ink, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 50 },
  headerSide: { width: 96 },
  headerRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  headerMid: { flex: 1, alignItems: 'center' },
  back: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 22, color: colors.ink },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  title: { fontFamily: fonts.sansBlack, fontSize: 18, letterSpacing: 3, color: colors.ink },
  sub: { fontFamily: fonts.serifItalic, fontSize: 12, lineHeight: 16, color: colors.inkSoft },
  timer: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.ink, fontVariant: ['tabular-nums'] },
  bulb: {
    width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: colors.ink,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF9F3',
  },
  doubleRule: { height: 5, borderTopWidth: 2, borderBottomWidth: 1, borderColor: colors.rule, marginHorizontal: 8 },
  thinRule: { height: 1, backgroundColor: colors.rule, marginVertical: 6 },
  gridWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  progress: { fontFamily: fonts.serifItalic, fontSize: 12, color: colors.muted, marginTop: 3 },
  clueBar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 6, marginBottom: 8, minHeight: 56,
    borderTopWidth: 2, borderBottomWidth: 2, borderColor: colors.ink, backgroundColor: colors.paperDark,
  },
  clueNav: { width: 36, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  clueNavText: { fontFamily: fonts.serifBold, fontSize: 30, color: colors.ink, marginTop: -4 },
  clueMeta: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 1.1, color: colors.inkSoft },
  clueRow: { flexDirection: 'row', alignItems: 'center' },
  clueText: { flex: 1, fontFamily: fonts.serifBold, fontSize: 20, lineHeight: 27, color: colors.ink },
  learnTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: colors.ink,
    paddingHorizontal: 5, paddingVertical: 2, marginLeft: 6, backgroundColor: '#FBF9F3',
  },
  learnTagText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.ink },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,20,20,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  menu: { width: '100%', maxWidth: 360, backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.ink, padding: 16 },
  menuTitle: { fontFamily: fonts.serifBold, fontSize: 22, lineHeight: 30, color: colors.ink },
  menuItem: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.ink },
  menuItemTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.ink },
  menuItemDesc: { fontFamily: fonts.serifItalic, fontSize: 13, lineHeight: 18, color: colors.muted },
  win: { width: '100%', maxWidth: 360, backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.ink, padding: 20 },
  winKicker: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 3, color: colors.wrong, textAlign: 'center' },
  winHead: { fontFamily: fonts.masthead, fontSize: 40, color: colors.ink, textAlign: 'center', marginBottom: 6 },
  winBody: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 23, color: colors.ink, marginTop: 12, textAlign: 'center' },
  btn: { flex: 1, backgroundColor: colors.ink, paddingVertical: 12, alignItems: 'center' },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.ink },
  btnText: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.paper, letterSpacing: 0.5 },
  nextFab: {
    position: 'absolute', left: 24, right: 24, backgroundColor: colors.ink, paddingVertical: 14,
    alignItems: 'center', borderWidth: 2, borderColor: colors.paper,
  },
});
