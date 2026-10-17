// Telaffuz alıştırması: kelimeyi dinle, mikrofona söyle, telefon doğru söyleyip söylemediğini kontrol etsin.
// Ses tanıma Expo Go'da yok (yeni sürümde çalışır); yoksa yalnızca "dinle ve tekrar et" modu gösterilir.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import BackBar from '../components/BackBar';
import { MicIcon, CheckIcon, CloseCircleIcon } from '../components/UiIcons';
import { SpeakerIcon } from '../components/Icons';
import { getStore } from '../storage';
import { WORDS } from '../engine/words';
import { pronounceSet, matchSpoken } from '../engine/practice';
import { getProfile, getLevel, recordPronunciation } from '../engine/session';
import { speakWord, stopSpeaking } from '../speech';
import { recognitionAvailable, requestMicPermission, listenOnce, stopListening } from '../speechRec';
import { ed, efonts } from '../theme';

const cap = (a) => a.charAt(0) + a.slice(1).toLowerCase();
const MAX_TRIES = 3;

export default function PronounceScreen({ onBack }) {
  const insets = useSafeAreaInsets();
  const available = useMemo(() => recognitionAvailable(), []);
  const [seed, setSeed] = useState(() => Date.now());
  const list = useMemo(() => {
    const lv = getLevel(getProfile().level);
    return pronounceSet(WORDS, getStore().learn, lv?.mixed ? 3 : lv?.idx || 0, seed);
  }, [seed]);
  const [idx, setIdx] = useState(0);
  const [state, setState] = useState('idle'); // idle | listening | ok | bad
  const [heard, setHeard] = useState('');
  const [tries, setTries] = useState(0);
  const [results, setResults] = useState([]); // { a, ok }
  const done = idx >= list.length;
  const w = list[idx];

  useEffect(() => {
    if (w) {
      const t = setTimeout(() => speakWord(w.a, 0.8), 400);
      return () => clearTimeout(t);
    }
  }, [idx, seed]);
  useEffect(() => () => {
    stopListening();
    stopSpeaking();
  }, []);

  const finishWord = (ok) => {
    recordPronunciation(w.a, ok);
    setResults((r) => [...r, { a: w.a, ok }]);
  };
  const next = () => {
    setState('idle');
    setHeard('');
    setTries(0);
    setIdx((i) => i + 1);
  };
  const say = async () => {
    if (state === 'listening') return stopListening();
    stopSpeaking();
    const granted = await requestMicPermission().catch(() => false);
    if (!granted) {
      setHeard('Mikrofon izni gerekli · Ayarlar > ÇENGO');
      return;
    }
    setHeard('');
    setState('listening');
    const res = await listenOnce(w.a, { onPartial: setHeard });
    const ok = matchSpoken(w.a, res.alternatives);
    const n = tries + 1;
    setTries(n);
    if (res.alternatives[0]) setHeard(res.alternatives[0]);
    else if (res.error && res.error !== 'aborted') setHeard('Ses algılanamadı, tekrar dene');
    if (ok) {
      setState('ok');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      finishWord(true);
    } else {
      setState('bad');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      if (n >= MAX_TRIES) finishWord(false);
    }
  };

  const wordDone = state === 'ok' || (state === 'bad' && tries >= MAX_TRIES);
  const score = results.filter((r) => r.ok).length;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 6 }]}>
      <View style={styles.head}>
        <Text style={styles.kicker}>DİNLE · SÖYLE · KONTROL ET</Text>
        <Text style={styles.title}>Telaffuz Alıştırması</Text>
        {!done ? (
          <View style={styles.progressRow}>
            {list.map((_, i) => {
              const r = results[i];
              return <View key={i} style={[styles.seg, r ? { backgroundColor: r.ok ? ed.good : ed.danger } : i === idx && { backgroundColor: ed.accent }]} />;
            })}
          </View>
        ) : null}
      </View>

      {done ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.card}>
            <Text style={styles.kickerOrange}>ALIŞTIRMA TAMAM</Text>
            <Text style={styles.final}>
              {score}/{list.length}
            </Text>
            <Text style={styles.sub}>{score === list.length ? 'Kusursuz telaffuz!' : 'Zorlandığın kelimeler zor kelimelerine eklendi.'}</Text>
          </View>
          {results.map((r) => (
            <Pressable key={r.a} style={styles.resRow} onPress={() => speakWord(r.a, 0.8)}>
              {r.ok ? <CheckIcon size={18} color={ed.good} /> : <CloseCircleIcon size={18} color={ed.danger} />}
              <Text style={styles.resWord}>{cap(r.a)}</Text>
              <SpeakerIcon size={16} color={ed.textSoft} />
            </Pressable>
          ))}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={onBack}>
              <Text style={[styles.btnText, { color: ed.text }]}>Bitir</Text>
            </Pressable>
            <Pressable
              style={styles.btn}
              onPress={() => {
                setResults([]);
                setIdx(0);
                setState('idle');
                setTries(0);
                setHeard('');
                setSeed(Date.now());
              }}
            >
              <Text style={styles.btnText}>Yeni set</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          {!available ? (
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Ses kontrolü bu sürümde kapalı</Text>
              <Text style={styles.noticeText}>
                Söylediğini kontrol eden ses tanıma, uygulamanın yeni TestFlight / App Store sürümünde çalışır. Şimdilik kelimeyi dinleyip yüksek sesle tekrar edebilirsin.
              </Text>
            </View>
          ) : null}
          <View style={styles.card}>
            <Text style={styles.qLabel}>
              {idx + 1}. KELİME · {w.l != null ? ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'][w.l] : ''}
            </Text>
            <Text style={styles.word}>{cap(w.a)}</Text>
            {w.ipa ? <Text style={styles.ipa}>/{w.ipa}/ · ABD okunuşu</Text> : null}
            <Text style={styles.tr}>{w.m.slice(0, 3).join(', ')}</Text>
            <Pressable onPress={() => speakWord(w.a, 0.75)} style={({ pressed }) => [styles.listen, pressed && { opacity: 0.8 }]}>
              <SpeakerIcon size={18} color={ed.primary} />
              <Text style={styles.listenText}>Dinle</Text>
            </Pressable>
          </View>

          {available ? (
            <>
              <Pressable
                onPress={wordDone ? undefined : say}
                style={({ pressed }) => [
                  styles.mic,
                  state === 'listening' && { backgroundColor: ed.orange },
                  state === 'ok' && { backgroundColor: ed.good },
                  pressed && { opacity: 0.85 },
                ]}
              >
                {state === 'listening' ? <ActivityIndicator color={ed.onPrimary} /> : state === 'ok' ? <CheckIcon size={40} color={ed.onPrimary} /> : <MicIcon size={40} color={ed.onPrimary} />}
              </Pressable>
              <Text style={styles.micLabel}>
                {state === 'listening'
                  ? 'Dinliyorum… şimdi söyle'
                  : state === 'ok'
                    ? 'Harika, doğru telaffuz!'
                    : state === 'bad'
                      ? tries >= MAX_TRIES
                        ? 'Bu sefer olmadı; dinleyip tekrar çalış'
                        : `Tam anlaşılmadı · ${MAX_TRIES - tries} hakkın kaldı`
                      : 'Mikrofona dokun ve kelimeyi söyle'}
              </Text>
              {heard ? <Text style={styles.heard}>Duyulan: “{heard}”</Text> : null}
            </>
          ) : null}

          {wordDone || !available ? (
            <Pressable
              style={[styles.btn, { flex: 0, marginTop: 18 }]}
              onPress={() => {
                // ses kontrolü yoksa doğrulanmadığı için istatistiğe/rozete sayılmaz
                if (!available && !results[idx]) setResults((r) => [...r, { a: w.a, ok: true }]);
                next();
              }}
            >
              <Text style={styles.btnText}>{idx + 1 < list.length ? 'Sonraki kelime →' : 'Sonuçlar'}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => { finishWord(false); next(); }} hitSlop={8} style={{ alignSelf: 'center', marginTop: 16 }}>
              <Text style={styles.skip}>Bu kelimeyi geç</Text>
            </Pressable>
          )}
          {!available ? null : (
            <Pressable onPress={() => Linking.openSettings()} hitSlop={6} style={{ alignSelf: 'center', marginTop: 10 }}>
              <Text style={styles.settingsLink}>Mikrofon izni ayarları</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
      <BackBar onPress={onBack} bottomInset={insets.bottom} caption={done ? `${score}/${list.length} doğru` : `${idx + 1}/${list.length} · ${score} doğru`} />
    </View>
  );
}

const card = { backgroundColor: ed.surface, borderRadius: 14, borderWidth: 1, borderColor: ed.border };
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ed.bg },
  head: { paddingHorizontal: 16, paddingBottom: 6 },
  kicker: { fontFamily: efonts.labelBold, fontSize: 10.5, letterSpacing: 1.3, color: ed.accent },
  kickerOrange: { fontFamily: efonts.labelBold, fontSize: 11, letterSpacing: 2, color: ed.orange, textAlign: 'center' },
  title: { fontFamily: efonts.headlineBold, fontSize: 26, lineHeight: 32, color: ed.text },
  progressRow: { flexDirection: 'row', gap: 4, marginTop: 10 },
  seg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: ed.surfaceDim },
  card: { ...card, padding: 20, alignItems: 'center' },
  qLabel: { fontFamily: efonts.labelBold, fontSize: 10, letterSpacing: 1.2, color: ed.accent },
  word: { fontFamily: efonts.headlineBold, fontSize: 40, lineHeight: 48, color: ed.text, marginTop: 6 },
  ipa: { fontSize: 15, color: ed.accentInk, marginTop: 2 },
  tr: { fontFamily: efonts.body, fontSize: 15, color: ed.textSoft, marginTop: 8, textAlign: 'center' },
  listen: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ed.surfaceAlt, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 9, marginTop: 14 },
  listenText: { fontFamily: efonts.bodyBold, fontSize: 15, color: ed.primary },
  mic: { alignSelf: 'center', width: 104, height: 104, borderRadius: 52, backgroundColor: ed.primary, alignItems: 'center', justifyContent: 'center', marginTop: 26 },
  micLabel: { fontFamily: efonts.bodySemi, fontSize: 15, color: ed.text, textAlign: 'center', marginTop: 12 },
  heard: { fontFamily: efonts.body, fontSize: 14, color: ed.textSoft, textAlign: 'center', marginTop: 6 },
  skip: { fontFamily: efonts.labelBold, fontSize: 12.5, color: ed.textSoft },
  settingsLink: { fontFamily: efonts.label, fontSize: 11.5, color: ed.textMute },
  notice: { backgroundColor: ed.orangeSoft, borderRadius: 12, padding: 14, marginBottom: 12 },
  noticeTitle: { fontFamily: efonts.bodyBold, fontSize: 14.5, color: ed.text },
  noticeText: { fontFamily: efonts.body, fontSize: 13, lineHeight: 19, color: ed.textSoft, marginTop: 4 },
  final: { fontFamily: efonts.headlineBold, fontSize: 56, lineHeight: 64, color: ed.text, marginTop: 4 },
  sub: { fontFamily: efonts.body, fontSize: 14, color: ed.textSoft, textAlign: 'center' },
  resRow: { ...card, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginTop: 8 },
  resWord: { flex: 1, fontFamily: efonts.bodyBold, fontSize: 16, color: ed.text },
  btn: { flex: 1, backgroundColor: ed.primary, paddingVertical: 14, alignItems: 'center', borderRadius: 12 },
  btnGhost: { backgroundColor: ed.surfaceAlt },
  btnText: { fontFamily: efonts.bodyBold, fontSize: 15, color: ed.onPrimary },
});
