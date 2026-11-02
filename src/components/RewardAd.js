import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Linking, Alert } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ed, efonts } from '../theme';
import { grantLearnBonus } from '../engine/session';

// Ödüllü video: kelime kartı hakkı bitince Word Duel tanıtımı (scripts/make-ad-wordduel.mjs) oynatılır.
// En az REWARD_AT saniye izlenirse bu bulmacada +1 kart hakkı kazanılır.
const AD = require('../../assets/ads/wordduel-ad.mp4');
export const REWARD_AT = 10;
const STORE_URL = 'https://apps.apple.com/app/id6828526837';

/** Soru → video. onReward: ödül kazanılıp kapatıldığında; onClose: vazgeçildiğinde. */
function RewardFlow({ onReward, onClose }) {
  const [stage, setStage] = useState('ask');
  return stage === 'ask' ? (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Kart hakkın bitti</Text>
          <Text style={styles.body}>Kısa bir video izle, bu bulmacada 1 kelime kartı hakkı daha kazan.</Text>
          <Pressable style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]} onPress={() => setStage('play')}>
            <Text style={styles.primaryText}>Video izle · +1 hak</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={onClose} hitSlop={8}>
            <Text style={styles.secondaryText}>Vazgeç</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  ) : (
    <AdPlayer onDone={(earned) => (earned ? onReward() : onClose())} />
  );
}

function AdPlayer({ onDone }) {
  const insets = useSafeAreaInsets();
  const [time, setTime] = useState(0);
  const [ended, setEnded] = useState(false);
  const earned = time >= REWARD_AT;
  const player = useVideoPlayer(AD, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.25;
    p.play();
  });
  const earnedRef = useRef(false);
  earnedRef.current = earned;
  useEffect(() => {
    const a = player.addListener('timeUpdate', (e) => setTime(e.currentTime));
    const b = player.addListener('playToEnd', () => {
      setTime((t) => Math.max(t, REWARD_AT));
      setEnded(true);
    });
    return () => {
      a.remove();
      b.remove();
    };
  }, [player]);

  const close = () => {
    if (earnedRef.current) return onDone(true);
    player.pause();
    Alert.alert('Videoyu kapat', 'Şimdi kapatırsan kart hakkı kazanamazsın.', [
      { text: 'İzlemeye devam', onPress: () => player.play() },
      { text: 'Kapat', style: 'destructive', onPress: () => onDone(false) },
    ]);
  };
  const openStore = () => {
    player.pause();
    Linking.openURL(STORE_URL).catch(() => {});
  };
  const left = Math.max(0, Math.ceil(REWARD_AT - time));

  return (
    <Modal animationType="fade" onRequestClose={close} supportedOrientations={['portrait']}>
      <View style={styles.player}>
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>REKLAM · WORD DUEL</Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={[styles.pill, earned && styles.pillDone]}>
            <Text style={[styles.pillText, earned && styles.pillTextDone]}>{earned ? '+1 hak kazandın' : `Ödüle ${left} sn`}</Text>
          </View>
          <Pressable onPress={close} hitSlop={12} style={styles.close} accessibilityLabel="Kapat">
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
        {/* ödüle kalan süre çubuğu */}
        <View style={[styles.track, { top: insets.top + 60 }]}>
          <View style={[styles.fill, { width: `${Math.min(100, (time / REWARD_AT) * 100)}%` }]} />
        </View>
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable style={({ pressed }) => [styles.store, pressed && { opacity: 0.85 }]} onPress={openStore}>
            <Text style={styles.storeText}>Word Duel'i indir</Text>
          </Pressable>
          {ended || earned ? (
            <Pressable style={({ pressed }) => [styles.cont, pressed && { opacity: 0.85 }]} onPress={() => onDone(true)}>
              <Text style={styles.contText}>Karta dön</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

/**
 * Kart hakkı bitince video teklif eder. ask(then): ödül kazanılınca hak eklenir ve then() çağrılır
 * (genelde aynı kartı yeniden açmak). node ekranda bir yere yerleştirilir.
 */
export function useLearnReward(session) {
  const [pending, setPending] = useState(null);
  const ask = (then) => setPending({ then });
  const node = pending ? (
    <RewardFlow
      onClose={() => setPending(null)}
      onReward={() => {
        grantLearnBonus(session);
        const then = pending.then;
        setPending(null);
        then && setTimeout(then, 250); // video modalı kapandıktan sonra kart açılsın
      }}
    />
  ) : null;
  return { ask, node };
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,16,24,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { width: '100%', maxWidth: 380, backgroundColor: ed.surface, borderRadius: 22, padding: 22, alignItems: 'stretch' },
  title: { fontFamily: efonts.headlineBold, fontSize: 24, color: ed.text, textAlign: 'center' },
  body: { fontFamily: efonts.body, fontSize: 15, lineHeight: 21, color: ed.textSoft, textAlign: 'center', marginTop: 8, marginBottom: 18 },
  primary: { backgroundColor: ed.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryText: { fontFamily: efonts.bodyBold, fontSize: 16, color: ed.onPrimary },
  secondary: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  secondaryText: { fontFamily: efonts.bodySemi, fontSize: 15, color: ed.textSoft },
  player: { flex: 1, backgroundColor: '#000' },
  top: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 },
  tag: { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { fontFamily: efonts.labelBold, fontSize: 11, letterSpacing: 0.8, color: '#FFFFFF' },
  pill: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  pillDone: { backgroundColor: '#36B985' },
  pillText: { fontFamily: efonts.bodyBold, fontSize: 13, color: '#FFFFFF' },
  pillTextDone: { color: '#FFFFFF' },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#FFFFFF', fontSize: 16, fontFamily: efonts.bodyBold },
  track: { position: 'absolute', left: 14, right: 14, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  fill: { height: 4, backgroundColor: '#36B985' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, gap: 10 },
  store: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  storeText: { fontFamily: efonts.bodyBold, fontSize: 16, color: '#2A9D70' },
  cont: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  contText: { fontFamily: efonts.bodyBold, fontSize: 15, color: '#FFFFFF' },
});
