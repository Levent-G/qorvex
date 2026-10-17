// Zamana Karşı: 60 saniyede olabildiğince çok kelime. Doğru +1, yanlış −3 saniye.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import BackBar from '../components/BackBar';
import LearnModal from '../components/LearnModal';
import { ShareButton } from '../components/GameShell';
import { BoltIcon, CloseCircleIcon, TrophyIcon } from '../components/UiIcons';
import { WORDS, getWord } from '../engine/words';
import { buildTimeAttack } from '../engine/practice';
import { getExtra, getProfile, getLevel, recordTimeAttack, recordHard } from '../engine/session';
import { ed, efonts } from '../theme';

const DURATION = 60;
const PENALTY = 3;
const cap = (a) => a.charAt(0) + a.slice(1).toLowerCase();

export default function TimeAttackScreen({ onBack }) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState('intro'); // intro | play | done
  const [seed, setSeed] = useState(() => Date.now());
  const levelIdx = (() => {
    const lv = getLevel(getProfile().level);
    return lv?.mixed ? 3 : lv?.idx || 0;
  })();
  const questions = useMemo(() => buildTimeAttack(WORDS, levelIdx, seed), [seed]);
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(DURATION);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null); // { opt, ok }
  const [missed, setMissed] = useState([]);
  const [result, setResult] = useState(null);
  const [card, setCard] = useState(null);
  const endAt = useRef(0);
  const lock = useRef(false);

  // geri sayım (ceza endAt'i öne çeker)
  useEffect(() => {
    if (phase !== 'play') return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0) setPhase('done');
    }, 200);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === 'done' && !result) setResult(recordTimeAttack(score));
  }, [phase]);

  const start = () => {
    setSeed(Date.now());
    setIdx(0);
    setScore(0);
    setMissed([]);
    setResult(null);
    setFlash(null);
    lock.current = false;
    endAt.current = Date.now() + DURATION * 1000;
    setLeft(DURATION);
    setPhase('play');
  };

  const q = questions[idx % questions.length];
  const choose = (opt) => {
    if (lock.current || phase !== 'play') return;
    lock.current = true;
    const ok = opt === q.answer;
    setFlash({ opt, ok });
    if (ok) {
      setScore((s) => s + 1);
      Haptics.selectionAsync().catch(() => {});
    } else {
      endAt.current -= PENALTY * 1000;
      setMissed((m) => (m.includes(q.answer) ? m : [...m, q.answer]));
      recordHard(q.answer, 'quiz');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
    setTimeout(
      () => {
        setFlash(null);
        setIdx((i) => i + 1);
        lock.current = false;
      },
      ok ? 220 : 700,
    );
  };

  const best = getExtra().ta.best;
  const optLabel = (opt) => (q.type === 'en2tr' ? getWord(opt)?.m.slice(0, 2).join(', ') || opt : cap(opt));

  return (
    <View style={[styles.root, { paddingTop: insets.top + 6 }]}>
      <View style={styles.head}>
        <Text style={styles.kicker}>60 SANİYE · DOĞRU +1 · YANLIŞ −3 SN</Text>
        <Text style={styles.title}>Zamana Karşı</Text>
      </View>

      {phase === 'intro' ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.hero}>
            <BoltIcon size={40} color={ed.orange} />
            <Text style={styles.heroTitle}>Ne kadar hızlısın?</Text>
            <Text style={styles.heroText}>
              Kelimeler art arda gelir: Türkçesini görüp İngilizcesini ya da İngilizcesini görüp Türkçesini seç. Yanlış cevap 3 saniye götürür.
            </Text>
            <View style={styles.bestRow}>
              <TrophyIcon size={16} color={ed.accentInk} />
              <Text style={styles.bestText}>Rekorun: {best} doğru</Text>
            </View>
          </View>
          <Pressable style={styles.btn} onPress={start}>
            <Text style={styles.btnText}>Başla</Text>
          </Pressable>
        </ScrollView>
      ) : phase === 'play' ? (
        <View style={{ flex: 1, padding: 16 }}>
          <View style={styles.hud}>
            <View style={[styles.clock, left <= 10 && { backgroundColor: ed.dangerSoft, borderColor: ed.dangerLine }]}>
              <Text style={[styles.clockText, left <= 10 && { color: ed.danger }]}>{left}</Text>
              <Text style={styles.clockUnit}>sn</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.timeBar}>
                <View style={[styles.timeFill, { width: `${(left / DURATION) * 100}%` }, left <= 10 && { backgroundColor: ed.danger }]} />
              </View>
            </View>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreBig}>{score}</Text>
              <Text style={styles.clockUnit}>doğru</Text>
            </View>
          </View>
          <View style={styles.qCard}>
            <Text style={styles.qLabel}>{q.type === 'en2tr' ? 'İNGİLİZCESİ → TÜRKÇESİ?' : 'TÜRKÇESİ → İNGİLİZCESİ?'}</Text>
            <Text style={styles.qText} numberOfLines={2} adjustsFontSizeToFit>
              {q.type === 'en2tr' ? cap(q.answer) : q.word.m.slice(0, 2).join(', ')}
            </Text>
          </View>
          {q.options.map((opt) => {
            const f = flash;
            const isAns = opt === q.answer;
            return (
              <Pressable
                key={opt + idx}
                onPress={() => choose(opt)}
                style={({ pressed }) => [
                  styles.opt,
                  pressed && !f && { backgroundColor: ed.surfaceAlt },
                  f && isAns && styles.optOk,
                  f && !f.ok && f.opt === opt && styles.optBad,
                ]}
              >
                <Text style={[styles.optText, q.type === 'en2tr' && { fontFamily: efonts.bodySemi, fontSize: 16 }]} numberOfLines={2}>
                  {optLabel(opt)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          <View style={styles.hero}>
            <Text style={styles.kickerOrange}>{result?.isRecord ? 'YENİ REKOR!' : 'SÜRE DOLDU'}</Text>
            <Text style={styles.final}>{score}</Text>
            <Text style={styles.heroText}>doğru cevap · rekorun {result?.best ?? best}</Text>
            <ShareButton info={{ title: 'Zamana Karşı', seconds: 0, hints: false, line: `⚡ 60 saniyede ${score} doğru${result?.isRecord ? ' · yeni rekor!' : ''}` }} />
          </View>
          {missed.length ? (
            <>
              <Text style={styles.ask}>KAÇIRDIKLARIN</Text>
              {missed.map((a) => (
                <Pressable key={a} style={styles.missRow} onPress={() => setCard(a)}>
                  <CloseCircleIcon size={16} color={ed.danger} />
                  <Text style={styles.missWord}>{cap(a)}</Text>
                  <Text style={styles.missTr} numberOfLines={1}>
                    {getWord(a)?.m.slice(0, 2).join(', ')}
                  </Text>
                </Pressable>
              ))}
            </>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Pressable style={[styles.btn, styles.btnGhost, { flex: 1 }]} onPress={onBack}>
              <Text style={[styles.btnText, { color: ed.text }]}>Bitir</Text>
            </Pressable>
            <Pressable style={[styles.btn, { flex: 1 }]} onPress={start}>
              <Text style={styles.btnText}>Tekrar oyna</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      <BackBar onPress={onBack} bottomInset={insets.bottom} caption={phase === 'play' ? `${score} doğru` : `Rekor: ${result?.best ?? best}`} />
      {card ? <LearnModal answer={card} clue={null} remaining={null} onClose={() => setCard(null)} /> : null}
    </View>
  );
}

const card = { backgroundColor: ed.surface, borderRadius: 14, borderWidth: 1, borderColor: ed.border };
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ed.bg },
  head: { paddingHorizontal: 16, paddingBottom: 4 },
  kicker: { fontFamily: efonts.labelBold, fontSize: 10.5, letterSpacing: 1.3, color: ed.orange },
  kickerOrange: { fontFamily: efonts.labelBold, fontSize: 11, letterSpacing: 2, color: ed.orange, textAlign: 'center' },
  title: { fontFamily: efonts.headlineBold, fontSize: 26, lineHeight: 32, color: ed.text },
  hero: { ...card, padding: 22, alignItems: 'center', gap: 8, marginBottom: 14 },
  heroTitle: { fontFamily: efonts.headlineBold, fontSize: 24, color: ed.text },
  heroText: { fontFamily: efonts.body, fontSize: 14.5, lineHeight: 21, color: ed.textSoft, textAlign: 'center' },
  bestRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ed.accentSoft, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, marginTop: 4 },
  bestText: { fontFamily: efonts.labelBold, fontSize: 12.5, color: ed.accentInk },
  hud: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  clock: { ...card, width: 64, height: 56, alignItems: 'center', justifyContent: 'center' },
  clockText: { fontFamily: efonts.headlineBold, fontSize: 26, lineHeight: 30, color: ed.text },
  clockUnit: { fontFamily: efonts.label, fontSize: 10, color: ed.textSoft },
  timeBar: { height: 8, borderRadius: 4, backgroundColor: ed.surfaceDim, overflow: 'hidden' },
  timeFill: { height: '100%', backgroundColor: ed.accent, borderRadius: 4 },
  scoreBox: { ...card, width: 64, height: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: ed.accentSoft, borderColor: ed.accentLine },
  scoreBig: { fontFamily: efonts.headlineBold, fontSize: 26, lineHeight: 30, color: ed.accentInk },
  qCard: { ...card, padding: 18, minHeight: 110, justifyContent: 'center', marginBottom: 12 },
  qLabel: { fontFamily: efonts.labelBold, fontSize: 10, letterSpacing: 1.2, color: ed.accent },
  qText: { fontFamily: efonts.headlineBold, fontSize: 28, lineHeight: 34, color: ed.text, marginTop: 6 },
  opt: { ...card, paddingHorizontal: 16, paddingVertical: 15, marginBottom: 8 },
  optOk: { backgroundColor: ed.goodSoft, borderColor: ed.goodLine },
  optBad: { backgroundColor: ed.dangerSoft, borderColor: ed.dangerLine },
  optText: { fontFamily: efonts.bodyBold, fontSize: 18, color: ed.text },
  final: { fontFamily: efonts.headlineBold, fontSize: 64, lineHeight: 72, color: ed.text },
  ask: { fontFamily: efonts.labelBold, fontSize: 11, letterSpacing: 1.1, color: ed.textSoft, marginTop: 4, marginBottom: 8 },
  missRow: { ...card, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 8 },
  missWord: { fontFamily: efonts.bodyBold, fontSize: 15, color: ed.text },
  missTr: { flex: 1, fontFamily: efonts.body, fontSize: 13, color: ed.textSoft, textAlign: 'right' },
  btn: { backgroundColor: ed.primary, paddingVertical: 14, alignItems: 'center', borderRadius: 12 },
  btnGhost: { backgroundColor: ed.surfaceAlt },
  btnText: { fontFamily: efonts.bodyBold, fontSize: 15, color: ed.onPrimary },
});
