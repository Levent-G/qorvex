// Yeni oyunların ortak arayüz parçaları: yükleme, üst bar, ampul menüsü, tebrikler, kelime kartı.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, AppState, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import LearnModal from './LearnModal';
import { BulbIcon } from './Icons';
import { markLearned, LEARN_LIMIT } from '../engine/session';
import { persist } from '../storage';
import { colors, fonts, formatTime, ui } from '../theme';

// Oturumu yükle / üret
export function useGameSession(store, kind, levelId) {
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(
    async (forceNew) => {
      setSession(null);
      setError(null);
      try {
        setSession(kind === 'daily' ? await store.getDaily() : await store.getSession(levelId, forceNew));
      } catch (e) {
        setError(String(e?.message || e));
      }
    },
    [store, kind, levelId],
  );
  useEffect(() => {
    load(false);
  }, [load]);
  return { session, error, reload: () => load(true) };
}

export function LoadingPage({ error, onRetry }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, styles.loading, { paddingTop: insets.top }]}>
      <Text style={styles.kickerRed}>STOP THE PRESSES</Text>
      <Text style={styles.loadingHead}>Yeni baskı hazırlanıyor…</Text>
      {error ? (
        <>
          <Text style={styles.body}>{error}</Text>
          <Pressable style={[styles.btn, { flex: 0, paddingHorizontal: 20, marginTop: 12 }]} onPress={onRetry}>
            <Text style={styles.btnText}>Tekrar dene</Text>
          </Pressable>
        </>
      ) : (
        <ActivityIndicator color={colors.ink} />
      )}
    </View>
  );
}

function Timer({ session, running }) {
  const [sec, setSec] = useState(session.seconds || 0);
  const active = useRef(true);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => (active.current = st === 'active'));
    const t = setInterval(() => {
      if (!running || !active.current) return;
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

export function GameHeader({ session, running, subtitle, onMenu, insetTop = 0 }) {
  return (
    <>
      <View style={[styles.header, { paddingTop: insetTop, height: 54 + insetTop }]}>
        <View style={styles.side}>
          <Timer session={session} running={running} />
        </View>
        <View style={styles.mid}>
          <Text style={styles.title}>QORVEX</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <View style={[styles.side, { alignItems: 'flex-end' }]}>
          <Pressable onPress={onMenu} hitSlop={14} style={styles.bulb}>
            <BulbIcon size={24} color={ui.bg} />
          </Pressable>
        </View>
      </View>
      <View style={styles.headerLine} />
    </>
  );
}

export function HintMenu({ visible, onClose, items, note }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.menu}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BulbIcon size={26} />
            <Text style={styles.menuTitle}>İpuçları</Text>
          </View>
          <View style={styles.thinRule} />
          {items.map(([t, d, fn]) => (
            <Pressable
              key={t}
              onPress={() => {
                onClose();
                fn();
              }}
              style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: colors.paperDark }]}
            >
              <Text style={styles.menuItemTitle}>{t}</Text>
              <Text style={styles.menuItemDesc}>{d}</Text>
            </Pressable>
          ))}
          {note ? <Text style={styles.menuNote}>{note}</Text> : null}
        </View>
      </Pressable>
    </Modal>
  );
}

export function WinModal({ visible, head, body, daily, onClose, onNext, onHome }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.win}>
          <Text style={styles.kickerRed}>EXTRA! EXTRA!</Text>
          <Text style={styles.winHead}>{head}</Text>
          <View style={styles.doubleRule} />
          <Text style={styles.body}>{body}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClose}>
              <Text style={[styles.btnText, { color: colors.ink }]}>Bulmacayı gör</Text>
            </Pressable>
            <Pressable style={styles.btn} onPress={daily ? onHome : onNext}>
              <Text style={styles.btnText}>{daily ? 'Ana sayfa' : 'Sonraki →'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Çözülünce bir kez tetiklenir (tebrikler + skor)
export function useSolvedEffect(solved, session, onSolved) {
  const was = useRef(!!session.solved);
  const [showWin, setShowWin] = useState(false);
  useEffect(() => {
    if (solved && !was.current) {
      was.current = true;
      session.solved = true;
      onSolved();
      setShowWin(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [solved]);
  return [showWin, setShowWin];
}

// Kelime kartı (bulmaca başına 5 hak) + kısa bildirim
export function useLearnCard(session) {
  const [learn, setLearn] = useState(null);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const opened = session.opened || (session.opened = []);
  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);
  const openLearn = (answer, clue) => {
    if (!opened.includes(answer)) {
      if (opened.length >= LEARN_LIMIT) {
        showToast(`Bu bulmacada ${LEARN_LIMIT} kelime kartı hakkını kullandın`);
        return;
      }
      opened.push(answer);
      markLearned(answer);
    }
    setLearn({ answer, clue });
  };
  const left = LEARN_LIMIT - opened.length;
  const modal = learn ? (
    <LearnModal answer={learn.answer} clue={learn.clue} remaining={left} limit={LEARN_LIMIT} onClose={() => setLearn(null)} />
  ) : null;
  return { openLearn, modal, toast, showToast, left, limit: LEARN_LIMIT };
}

export const shellStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  nextFab: { position: 'absolute', left: 24, right: 24, backgroundColor: ui.teal, paddingVertical: 15, alignItems: 'center', borderRadius: 26 },
  nextFabText: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.paper, letterSpacing: 0.5 },
  kickerRow: { paddingHorizontal: 12, paddingVertical: 6 },
  kicker: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 1.1, color: colors.wrong, textAlign: 'center' },
  clueBar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 6, marginBottom: 8, minHeight: 56,
    borderTopWidth: 2, borderBottomWidth: 2, borderColor: colors.ink, backgroundColor: colors.paperDark,
  },
  clueNav: { width: 36, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  clueMeta: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 1.1, color: colors.inkSoft },
  clueText: { flex: 1, fontFamily: fonts.serifBold, fontSize: 20, lineHeight: 27, color: colors.ink },
  learnTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: colors.ink,
    paddingHorizontal: 5, paddingVertical: 2, marginLeft: 6, backgroundColor: '#FBF9F3',
  },
  learnTagText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.ink },
  progress: { fontFamily: fonts.serifItalic, fontSize: 12, lineHeight: 16, color: colors.muted, marginTop: 3, textAlign: 'center' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  loading: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 10, backgroundColor: ui.bg },
  loadingHead: { fontFamily: fonts.sansBlack, fontSize: 24, lineHeight: 32, color: ui.white, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, backgroundColor: ui.bg },
  headerLine: { height: 3, backgroundColor: ui.teal },
  side: { width: 96 },
  mid: { flex: 1, alignItems: 'center' },
  title: { fontFamily: fonts.sansBlack, fontSize: 19, letterSpacing: 3.5, color: ui.white },
  sub: { fontFamily: fonts.sansMedium, fontSize: 11.5, lineHeight: 15, color: ui.tealSoft },
  timer: { fontFamily: fonts.sansBold, fontSize: 15, color: ui.white, fontVariant: ['tabular-nums'] },
  bulb: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: ui.teal },
  doubleRule: { height: 5, borderTopWidth: 2, borderBottomWidth: 1, borderColor: colors.rule, marginHorizontal: 8 },
  thinRule: { height: 1, backgroundColor: colors.rule, marginVertical: 6 },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,20,20,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  menu: { width: '100%', maxWidth: 360, backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.ink, padding: 16 },
  menuTitle: { fontFamily: fonts.serifBold, fontSize: 22, lineHeight: 30, color: colors.ink },
  menuItem: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.ink },
  menuItemTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.ink },
  menuItemDesc: { fontFamily: fonts.serifItalic, fontSize: 13, lineHeight: 18, color: colors.muted },
  menuNote: { fontFamily: fonts.serifItalic, fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 10 },
  win: { width: '100%', maxWidth: 360, backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.ink, padding: 20 },
  kickerRed: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 3, color: colors.wrong, textAlign: 'center' },
  winHead: { fontFamily: fonts.masthead, fontSize: 38, lineHeight: 50, color: colors.ink, textAlign: 'center', marginBottom: 6 },
  body: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 23, color: colors.ink, marginTop: 12, textAlign: 'center' },
  btn: { flex: 1, backgroundColor: ui.teal, paddingVertical: 12, alignItems: 'center', borderRadius: 22 },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: ui.creamInk },
  btnText: { fontFamily: fonts.sansBold, fontSize: 15, color: ui.white, letterSpacing: 0.3 },
});
