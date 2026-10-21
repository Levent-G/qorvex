import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { View, Text, Pressable, Image, Linking, StyleSheet, useWindowDimensions, Modal, AppState, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import ArrowGrid from '../components/ArrowGrid';
import Keyboard from '../components/Keyboard';
import LearnModal from '../components/LearnModal';
import BackBar, { BACK_BAR_HEIGHT } from '../components/BackBar';
import { GameHeader, HintMenu, WinModal, LoadingPage, shellStyles, CardHintPill } from '../components/GameShell';
import { BulbIcon, BookIcon, ChevronIcon } from '../components/Icons';
import { buildModel, wordStatus } from '../engine/model';
import { reducer, selectWordState } from '../engine/board';
import { getLevel, getLevelSession, getDailySession, markSolved, markLearned, LEARN_LIMIT, recordHint, recordHard } from '../engine/session';
import { getStore, persist } from '../storage';
import { colors, fonts, formatTime, ed, efonts } from '../theme';

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
function Board({ session, kind, levelId, onBack, onNext, store }) {
  const puzzle = session.puzzle;
  const photo = puzzle.photo || null; // resimli çengel: ortadaki fotoğraf ve cevabı
  const [zoom, setZoom] = useState(false);
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
      if (store) store.markSolved(kind, levelId);
      else markSolved(kind, levelId);
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
  const missed = useRef(new Set()); // yanlış/eksik tamamlanan kelimeler (bulmaca başına bir kez zor sayılır)
  useEffect(() => {
    const v = statuses[s.active];
    if ((v === 'bad' || v === 'close') && !missed.current.has(s.active)) {
      missed.current.add(s.active);
      recordHard(model.words[s.active].answer, 'miss');
    }
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
      // resimdeki kelimenin kartında gerçek Türkçesi görünsün
      setLearn({ answer: w.answer, clue: photo && w.answer === photo.answer ? photo.tr : w.text });
    },
    [model, opened, photo],
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
        // ipucu karesi kelimeyi seçer (kelime kartı yalnızca çubuktaki "Kelime kartını gör" düğmesiyle açılır)
        if (idx !== activeRef.current) dispatch({ type: 'selectWord', idx });
      } else if (ch === '@') {
        setZoom(true);
      } else if (ch !== '.') {
        dispatch({ type: 'tapCell', r, c });
      }
    },
    [puzzle, model],
  );

  const onKey = useCallback((ch) => {
    dispatch({ type: 'type', ch });
    Haptics.selectionAsync().catch(() => {});
  }, []);
  const onDelete = useCallback(() => dispatch({ type: 'del' }), []);

  // Boyutlandırma
  const keyH = Math.min(48, Math.max(40, height * 0.056));
  const reserved = insets.top + insets.bottom + 50 + 6 + 66 + keyH * 3 + 12 + 26 + BACK_BAR_HEIGHT;
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
    <View style={styles.root}>
      <GameHeader
        insetTop={insets.top}
        session={session}
        running={!s.solved}
        subtitle={`${photo ? 'Resimli Bulmaca' : 'Çengel Bulmaca'} · ${kind === 'daily' ? store?.label || 'Günün Bulmacası' : level.id === 'MIX' ? 'Karışık' : `${level.id} · ${level.title}`} · No. ${puzzle.no}`}
        badge={`${left}/${LEARN_LIMIT}`}
        onMenu={() => setMenu(true)}
      />

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

      {/* İpucu çubuğu: kelime kartı "Kelime kartını gör" düğmesiyle açılır */}
      <View style={styles.clueBar}>
        <Pressable onPress={() => dispatch({ type: 'step', delta: -1 })} hitSlop={8} style={styles.clueNav}>
          <ChevronIcon dir="left" size={20} color={ed.textSoft} />
        </Pressable>
        {photo && w.answer === photo.answer ? (
          <Pressable onPress={() => setZoom(true)} style={styles.clueThumb}>
            <Image source={{ uri: photo.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={[styles.clueMeta, toast && { color: colors.wrong }]} numberOfLines={1}>
            {toast ||
              `${w.dir === 'A' ? 'ACROSS · YATAY' : 'DOWN · DİKEY'} ${ARROW_LABEL[w.arrow]} (${w.answer.length})${
                // defterdeki kelime bu bulmacaya tekrar için geldiyse belli olsun
                learned.has(w.answer) && !opened.includes(w.answer) ? ' · DEFTERDEN TEKRAR' : ''
              }`}
          </Text>
          <View style={styles.clueRow}>
            <Text style={styles.clueText} numberOfLines={1} adjustsFontSizeToFit>
              {photo && w.answer === photo.answer ? 'Resimdeki nesne ne?' : w.text}
            </Text>
            <CardHintPill onPress={() => openLearn(s.active)} />
          </View>
        </View>
        <Pressable onPress={() => dispatch({ type: 'step', delta: 1 })} hitSlop={8} style={styles.clueNav}>
          <ChevronIcon dir="right" size={20} color={ed.textSoft} />
        </Pressable>
      </View>

      <Keyboard onKey={onKey} onDelete={onDelete} keyHeight={keyH} />
      <BackBar onPress={onBack} bottomInset={insets.bottom} />

      {/* Ampul menüsü */}
      <HintMenu
        visible={menu}
        onClose={() => setMenu(false)}
        items={[
          ['Harf aç', 'Seçili kareyi göster', () => {
            recordHint('letter', session);
            recordHard(w.answer, 'hint');
            dispatch({ type: 'revealLetter' });
          }],
          ['Kelime aç', 'Seçili kelimeyi tamamla', () => {
            recordHint('word', session);
            recordHard(w.answer, 'hint');
            dispatch({ type: 'revealWord' });
          }],
          ['Kelime kartı', `Anlam ve telaffuz kartı (kalan hak ${left}/${LEARN_LIMIT})`, () => openLearn(s.active)],
          ['Kelimeyi temizle', 'Seçili kelimedeki harfleri sil', () => dispatch({ type: 'clearWord' })],
          ['Baştan başla', 'Bulmacayı sıfırla', () => dispatch({ type: 'reset' })],
        ]}
      />

      {/* Büyütülmüş fotoğraf */}
      <Modal visible={zoom && !!photo} transparent animationType="fade" onRequestClose={() => setZoom(false)}>
        <Pressable style={styles.backdrop} onPress={() => setZoom(false)}>
          {photo ? (
            <View style={styles.zoomCard}>
              <Image source={{ uri: photo.url }} style={{ width: '100%', aspectRatio: 1 }} resizeMode="cover" />
              <View style={{ padding: 10 }}>
                <Text style={styles.zoomMeta}>RESİMDEKİ NESNE · {photo.answer.length} HARF</Text>
                <Text style={styles.zoomCredit} onPress={() => photo.link && Linking.openURL(photo.link).catch(() => {})}>
                  Fotoğraf: {photo.by} · Pexels
                </Text>
              </View>
            </View>
          ) : null}
        </Pressable>
      </Modal>

      {learn ? (
        <LearnModal answer={learn.answer} clue={learn.clue} remaining={left} limit={LEARN_LIMIT} onClose={() => setLearn(null)} />
      ) : null}

      {/* Tebrikler */}
      <WinModal
        visible={showWin}
        head="Bulmaca Çözüldü"
        body={`${model.words.length} kelimeyi ${formatTime(session.seconds || 0)} sürede çözdün.${Object.keys(s.revealed).length ? ` (${Object.keys(s.revealed).length} harf açıldı)` : ''}`}
        daily={kind === 'daily'}
        onClose={() => setShowWin(false)}
        onNext={onNext}
        onHome={onBack}
        share={{ title: `${photo ? 'Resimli Bulmaca' : 'Çengel Bulmaca'} · ${kind === 'daily' ? store?.label || 'Günün Bulmacası' : level.id === 'MIX' ? 'Karışık' : level.id} · No. ${puzzle.no}`, seconds: session.seconds, words: model.words.length, hints: Object.keys(s.revealed).length || session.hinted }}
      />

      {s.solved && !showWin && kind !== 'daily' ? (
        <Pressable style={[styles.nextFab, { bottom: insets.bottom + BACK_BAR_HEIGHT + 16 }]} onPress={onNext}>
          <Text style={shellStyles.nextFabText}>Sonraki bulmaca →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ---------------- Ekran: oturumu yükler / üretir ----------------
export default function PuzzleScreen({ kind, levelId, onBack, store }) {
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets();

  const load = useCallback(
    async (forceNew) => {
      setSession(null);
      setError(null);
      try {
        const sess = store
          ? kind === 'daily'
            ? await store.getDaily()
            : await store.getSession(levelId, forceNew)
          : kind === 'daily'
            ? await getDailySession()
            : await getLevelSession(levelId, forceNew);
        setSession(sess);
      } catch (e) {
        setError(String(e?.message || e));
      }
    },
    [kind, levelId, store],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  if (!session) return <LoadingPage error={error} onRetry={() => load(true)} />;
  return (
    <Board
      key={`${session.puzzle.no}-${session.date || levelId}`}
      session={session}
      kind={kind}
      levelId={kind === 'daily' ? 'MIX' : levelId}
      onBack={onBack}
      onNext={() => load(true)}
      store={store}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ed.bg },
  clueThumb: { width: 48, height: 48, borderRadius: 8, marginRight: 8, overflow: 'hidden', backgroundColor: ed.surfaceAlt },
  zoomCard: { backgroundColor: ed.surface, borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 380 },
  zoomMeta: { fontFamily: efonts.labelBold, fontSize: 11, letterSpacing: 1.2, color: ed.accent },
  zoomCredit: { fontFamily: efonts.body, fontSize: 11.5, color: ed.textSoft, marginTop: 6 },
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
    alignItems: 'center', justifyContent: 'center', backgroundColor: ed.surfaceAlt,
  },
  doubleRule: { height: 5, borderTopWidth: 2, borderBottomWidth: 1, borderColor: colors.rule, marginHorizontal: 8 },
  thinRule: { height: 1, backgroundColor: colors.rule, marginVertical: 6 },
  gridWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  progress: { fontFamily: efonts.label, fontSize: 11.5, color: ed.textSoft, marginTop: 5 },
  clueBar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginBottom: 8, minHeight: 56,
    borderRadius: 12, borderWidth: 1, borderColor: ed.border, backgroundColor: ed.surface,
  },
  clueNav: { width: 36, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  clueNavText: { fontFamily: fonts.serifBold, fontSize: 30, color: colors.ink, marginTop: -4 },
  clueMeta: { fontFamily: efonts.labelBold, fontSize: 10, letterSpacing: 1.1, color: ed.accent },
  clueRow: { flexDirection: 'row', alignItems: 'center' },
  clueText: { flexShrink: 1, fontFamily: efonts.headlineBold, fontSize: 21, lineHeight: 27, color: ed.text },
  learnTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 10, backgroundColor: ed.accentSoft,
    paddingHorizontal: 7, paddingVertical: 3, marginLeft: 6,
  },
  learnTagText: { fontFamily: efonts.labelBold, fontSize: 11, color: ed.accentInk },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,27,38,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  menu: { width: '100%', maxWidth: 360, backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.ink, padding: 16 },
  menuTitle: { fontFamily: fonts.serifBold, fontSize: 22, lineHeight: 30, color: colors.ink },
  menuItem: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.ink },
  menuItemTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.ink },
  menuItemDesc: { fontFamily: fonts.serifItalic, fontSize: 13, lineHeight: 18, color: colors.muted },
  win: { width: '100%', maxWidth: 360, backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.ink, padding: 20 },
  winKicker: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 3, color: colors.wrong, textAlign: 'center' },
  winHead: { fontFamily: fonts.masthead, fontSize: 40, color: colors.ink, textAlign: 'center', marginBottom: 6 },
  winBody: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 23, color: colors.ink, marginTop: 12, textAlign: 'center' },
  btn: { flex: 1, backgroundColor: ed.accent, paddingVertical: 12, alignItems: 'center', borderRadius: 22 },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.ink },
  btnText: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.paper, letterSpacing: 0.5 },
  nextFab: { position: 'absolute', left: 20, right: 20, backgroundColor: ed.primary, paddingVertical: 15, alignItems: 'center', borderRadius: 12 },
});
