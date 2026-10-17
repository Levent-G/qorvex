// Yeni oyunların ortak arayüz parçaları: yükleme, üst bar, ampul menüsü, tebrikler, kelime kartı.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, AppState, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import LearnModal from './LearnModal';
import { BulbIcon } from './Icons';
import { ClockIcon, ShareIcon } from './UiIcons';
import ShareSheet from './ShareSheet';
import { markLearned, LEARN_LIMIT } from '../engine/session';
import { persist } from '../storage';
import { colors, fonts, formatTime, ed, efonts } from '../theme';

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
      <Text style={styles.kicker}>YENİ BASKI</Text>
      <Text style={styles.loadingHead}>Bulmaca hazırlanıyor…</Text>
      {error ? (
        <>
          <Text style={styles.body}>{error}</Text>
          <Pressable style={[styles.btn, { flex: 0, paddingHorizontal: 22, marginTop: 12 }]} onPress={onRetry}>
            <Text style={styles.btnText}>Tekrar dene</Text>
          </Pressable>
        </>
      ) : (
        <ActivityIndicator color={ed.accent} />
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

// Üst bar: süre hapı · oyun adı (serif italik) + seviye/no · ampul hapı (ipuçları menüsü)
export function GameHeader({ session, running, subtitle, onMenu, insetTop = 0, badge }) {
  const parts = typeof subtitle === 'string' ? subtitle.split(' · ') : null;
  const title = parts ? parts[0] : 'QORVEX';
  const rest = parts ? parts.slice(1).join(' · ') : subtitle;
  return (
    <View style={[styles.header, { paddingTop: insetTop + 6 }]}>
      <View style={styles.side}>
        <View style={styles.timerPill}>
          <ClockIcon size={14} color={ed.text} />
          <Timer session={session} running={running} />
        </View>
      </View>
      <View style={styles.mid}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {rest}
        </Text>
      </View>
      <View style={[styles.side, { alignItems: 'flex-end' }]}>
        <Pressable onPress={onMenu} hitSlop={10} style={styles.bulbPill}>
          <BulbIcon size={17} color="#FFFFFF" />
          {badge ? <Text style={styles.bulbText}>{badge}</Text> : null}
          <Text style={styles.bulbChev}>▾</Text>
        </Pressable>
      </View>
    </View>
  );
}

// İpuçları menüsü: sağ üstten açılan kart (son öğe "Baştan başla" kırmızı)
export function HintMenu({ visible, onClose, items, note }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.menuBackdrop} onPress={onClose}>
        <View style={[styles.menu, { marginTop: insets.top + 54 }]}>
          <View style={styles.menuHead}>
            <BulbIcon size={16} color={ed.accent} />
            <Text style={styles.menuTitle}>İPUCU YARDIMI</Text>
          </View>
          {items.map(([t, d, fn], i) => {
            const danger = /Baştan/.test(t);
            return (
              <Pressable
                key={t}
                onPress={() => {
                  onClose();
                  fn();
                }}
                style={({ pressed }) => [styles.menuItem, danger && i > 0 && styles.menuDivider, pressed && { backgroundColor: ed.accentSoft }]}
              >
                <Text style={[styles.menuItemTitle, danger && { color: ed.danger }]}>{t}</Text>
                <Text style={styles.menuItemDesc}>{d}</Text>
              </Pressable>
            );
          })}
          {note ? <Text style={styles.menuNote}>{note}</Text> : null}
        </View>
      </Pressable>
    </Modal>
  );
}

export function WinModal({ visible, head, body, daily, onClose, onNext, onHome, share }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.win}>
          <Text style={styles.kickerOrange}>TEBRİKLER</Text>
          <Text style={styles.winHead}>{head}</Text>
          <Text style={styles.body}>{body}</Text>
          {share ? <ShareButton info={share} /> : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClose}>
              <Text style={[styles.btnText, { color: ed.text }]}>Bulmacayı gör</Text>
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

// "Sonucu paylaş" (kazanma kartlarında ortak)
export function ShareButton({ info, style }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.8 }, style]} onPress={() => setOpen(true)}>
        <ShareIcon size={16} color={ed.accentInk} />
        <Text style={styles.shareText}>Sonucu paylaş</Text>
      </Pressable>
      {open ? <ShareSheet info={info} onClose={() => setOpen(false)} /> : null}
    </>
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
  root: { flex: 1, backgroundColor: ed.bg },
  nextFab: { position: 'absolute', left: 20, right: 20, backgroundColor: ed.primary, paddingVertical: 15, alignItems: 'center', borderRadius: 12 },
  nextFabText: { fontFamily: efonts.bodyBold, fontSize: 15, color: ed.onPrimary, letterSpacing: 0.2 },
  kickerRow: { paddingHorizontal: 12, paddingVertical: 6 },
  kicker: { fontFamily: efonts.labelBold, fontSize: 10, letterSpacing: 1.1, color: ed.accent, textAlign: 'center' },
  clueBar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginBottom: 8, minHeight: 56,
    borderRadius: 12, borderWidth: 1, borderColor: ed.border, backgroundColor: ed.surface,
  },
  clueNav: { width: 36, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  clueMeta: { fontFamily: efonts.labelBold, fontSize: 10, letterSpacing: 1.1, color: ed.accent },
  clueText: { flex: 1, fontFamily: efonts.headlineBold, fontSize: 21, lineHeight: 27, color: ed.text },
  learnTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 10, backgroundColor: ed.accentSoft,
    paddingHorizontal: 7, paddingVertical: 3, marginLeft: 6,
  },
  learnTagText: { fontFamily: efonts.labelBold, fontSize: 11, color: ed.accentInk },
  progress: { fontFamily: efonts.body, fontSize: 12, lineHeight: 16, color: ed.textSoft, marginTop: 4, textAlign: 'center' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ed.bg },
  loading: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 10 },
  loadingHead: { fontFamily: efonts.headlineBold, fontSize: 26, lineHeight: 32, color: ed.text, textAlign: 'center' },
  kicker: { fontFamily: efonts.labelBold, fontSize: 11, letterSpacing: 2, color: ed.accent, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 8, backgroundColor: ed.bg, borderBottomWidth: 1, borderColor: ed.border },
  side: { width: 92 },
  mid: { flex: 1, alignItems: 'center' },
  title: { fontFamily: efonts.headlineItalic, fontSize: 20, lineHeight: 25, color: ed.text },
  sub: { fontFamily: efonts.label, fontSize: 11, lineHeight: 14, color: ed.textSoft },
  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: ed.surfaceAlt, borderRadius: 16, paddingHorizontal: 10, height: 32 },
  timer: { fontFamily: efonts.labelBold, fontSize: 14, color: ed.text, fontVariant: ['tabular-nums'] },
  bulbPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ed.accentStrong, borderRadius: 16, paddingHorizontal: 11, height: 32 },
  bulbText: { fontFamily: efonts.labelBold, fontSize: 13, color: ed.onPrimary },
  bulbChev: { fontFamily: efonts.labelBold, fontSize: 10, color: ed.accentLine },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,27,38,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(20,27,38,0.18)', alignItems: 'flex-end', paddingHorizontal: 12 },
  menu: {
    width: 290, backgroundColor: ed.surface, borderRadius: 14, paddingVertical: 8, borderWidth: 1, borderColor: ed.border,
    shadowColor: '#18324D', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  menuHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderColor: ed.border },
  menuTitle: { fontFamily: efonts.labelBold, fontSize: 11, letterSpacing: 1.2, color: ed.accent },
  menuItem: { paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 6, borderRadius: 10 },
  menuDivider: { borderTopWidth: 1, borderColor: ed.border, borderRadius: 0, marginTop: 4 },
  menuItemTitle: { fontFamily: efonts.bodyBold, fontSize: 15, color: ed.text },
  menuItemDesc: { fontFamily: efonts.body, fontSize: 12, lineHeight: 16, color: ed.textSoft, marginTop: 1 },
  menuNote: { fontFamily: efonts.body, fontSize: 11.5, lineHeight: 16, color: ed.textSoft, paddingHorizontal: 14, paddingTop: 8 },
  win: { width: '100%', maxWidth: 360, backgroundColor: ed.surface, borderRadius: 18, padding: 22 },
  kickerOrange: { fontFamily: efonts.labelBold, fontSize: 11, letterSpacing: 2, color: ed.orange, textAlign: 'center' },
  winHead: { fontFamily: efonts.headlineBold, fontSize: 30, lineHeight: 36, color: ed.text, textAlign: 'center', marginTop: 4 },
  body: { fontFamily: efonts.body, fontSize: 15, lineHeight: 22, color: ed.textSoft, marginTop: 10, textAlign: 'center' },
  btn: { flex: 1, backgroundColor: ed.primary, paddingVertical: 13, alignItems: 'center', borderRadius: 12 },
  btnGhost: { backgroundColor: ed.surfaceAlt },
  btnText: { fontFamily: efonts.bodyBold, fontSize: 15, color: ed.onPrimary },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, alignSelf: 'center', marginTop: 14, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: ed.accentSoft },
  shareText: { fontFamily: efonts.bodyBold, fontSize: 14, color: ed.accentInk },

});
