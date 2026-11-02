import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Linking, Alert, Animated, Easing, AppState, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudioPlayer } from 'expo-audio';
import { ed, efonts } from '../theme';
import { grantLearnBonus } from '../engine/session';
import WordDuelAd, { AD_DURATION } from './WordDuelAd';

// Ödüllü reklam: kelime kartı hakkı bitince Word Duel tanıtımı (WordDuelAd, canlı animasyon + ses) gösterilir.
// Yeni yerel modül gerektirmez: animasyon React Native'in kendi sürücüsüyle, ses uygulamadaki expo-audio ile.
// En az REWARD_AT saniye izlenirse bu bulmacada +1 kart hakkı kazanılır.
const AUDIO = require('../../assets/ads/wd-audio.m4a');
export const REWARD_AT = 10;
const STORE_URL = 'https://apps.apple.com/app/id6828526837';

/** Soru → reklam. onReward: ödül kazanılıp kapatıldığında; onClose: vazgeçildiğinde. */
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
  const { width, height } = useWindowDimensions();
  const [time, setTime] = useState(0);
  const earned = time >= REWARD_AT;
  const ended = time >= AD_DURATION;
  const earnedRef = useRef(false);
  earnedRef.current = earned;
  const audio = useAudioPlayer(AUDIO);

  // tek zaman değeri (saniye) bütün sahneleri sürer; durdurulup kaldığı yerden devam edebilir
  const t = useRef(new Animated.Value(0)).current;
  const paused = useRef(false);
  const started = useRef(Date.now());
  const pausedFor = useRef(0);
  const pauseAt = useRef(0);
  const run = (from) => {
    Animated.timing(t, { toValue: AD_DURATION, duration: Math.max(0, AD_DURATION - from) * 1000, easing: Easing.linear, useNativeDriver: true }).start();
  };
  useEffect(() => {
    run(0);
    try {
      audio.play();
    } catch {}
    const id = setInterval(() => {
      if (!paused.current) setTime((Date.now() - started.current - pausedFor.current) / 1000);
    }, 250);
    return () => {
      clearInterval(id);
      t.stopAnimation();
      try {
        audio.pause();
      } catch {}
    };
  }, []);
  const pause = () => {
    if (paused.current) return;
    paused.current = true;
    pauseAt.current = Date.now();
    t.stopAnimation();
    try {
      audio.pause();
    } catch {}
  };
  const resume = () => {
    if (!paused.current) return;
    paused.current = false;
    pausedFor.current += Date.now() - pauseAt.current;
    t.stopAnimation((v) => {
      run(v);
      if (v < AD_DURATION) {
        try {
          audio.play();
        } catch {}
      }
    });
  };
  // App Store'a gidip dönünce kaldığı yerden devam eder
  const toStore = useRef(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && toStore.current) {
        toStore.current = false;
        resume();
      }
    });
    return () => sub.remove();
  }, []);

  const close = () => {
    if (earnedRef.current) return onDone(true);
    pause();
    Alert.alert('Reklamı kapat', 'Şimdi kapatırsan kart hakkı kazanamazsın.', [
      { text: 'İzlemeye devam', onPress: resume },
      { text: 'Kapat', style: 'destructive', onPress: () => onDone(false) },
    ]);
  };
  const openStore = () => {
    toStore.current = true;
    pause();
    Linking.openURL(STORE_URL).catch(() => resume());
  };
  const left = Math.max(0, Math.ceil(REWARD_AT - time));

  // sahne (1080×1920) üst ve alt şeritlerin arasına sığar; arka plan ekranın tamamını boyar
  const TOP = insets.top + 70;
  const BOTTOM = insets.bottom + 82;
  const scale = Math.min(width / 1080, (height - TOP - BOTTOM) / 1920);

  return (
    <Modal animationType="fade" onRequestClose={close} supportedOrientations={['portrait']}>
      <View style={styles.player}>
        <WordDuelAd t={t} scale={scale} top={TOP} bottom={BOTTOM} onStore={openStore} />
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>REKLAM · WORD DUEL</Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={[styles.pill, earned && styles.pillDone]}>
            <Text style={styles.pillText}>{earned ? '+1 hak kazandın' : `Ödüle ${left} sn`}</Text>
          </View>
          <Pressable onPress={close} hitSlop={12} style={styles.close} accessibilityLabel="Kapat">
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
        {/* ödüle kalan süre çubuğu */}
        <View style={[styles.track, { top: insets.top + 52 }]}>
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
  player: { flex: 1, backgroundColor: '#F8FAFC' },
  top: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 },
  tag: { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { fontFamily: efonts.labelBold, fontSize: 11, letterSpacing: 0.8, color: '#FFFFFF' },
  pill: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  pillDone: { backgroundColor: '#36B985' },
  pillText: { fontFamily: efonts.bodyBold, fontSize: 13, color: '#FFFFFF' },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#FFFFFF', fontSize: 16, fontFamily: efonts.bodyBold },
  track: { position: 'absolute', left: 14, right: 14, height: 4, borderRadius: 2, backgroundColor: 'rgba(32,43,60,0.15)', overflow: 'hidden' },
  fill: { height: 4, backgroundColor: '#36B985' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, flexDirection: 'row', gap: 10 },
  store: { flex: 1, backgroundColor: '#36B985', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  storeText: { fontFamily: efonts.bodyBold, fontSize: 16, color: '#FFFFFF' },
  cont: { flex: 1, backgroundColor: '#202B3C', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  contText: { fontFamily: efonts.bodyBold, fontSize: 15, color: '#FFFFFF' },
});
