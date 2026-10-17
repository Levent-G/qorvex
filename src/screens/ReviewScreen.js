// Kelime tekrar modu ("Kelime Hafıza Kartları"): karışık soru türleri
// TR→EN seç · EN→TR seç · dinle ve seç · yaz · cümlede boşluk doldur
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import BackBar from '../components/BackBar';
import LearnModal from '../components/LearnModal';
import { CheckIcon, CloseCircleIcon, BookOpenIcon } from '../components/UiIcons';
import { SpeakerIcon } from '../components/Icons';
import { getStore } from '../storage';
import { WORDS, getWord, LEVEL_NAMES, posTr } from '../engine/words';
import { buildReview } from '../engine/review';
import { hardWords, recordReview, recordReviewSession } from '../engine/session';
import { speakWord } from '../speech';
import { ed, efonts } from '../theme';

const cap = (a) => a.charAt(0) + a.slice(1).toLowerCase();
const PROMPT = {
  tr2en: { label: 'TÜRKÇESİ', ask: 'İngilizcesi hangisi?' },
  en2tr: { label: 'İNGİLİZCESİ', ask: 'Türkçesi hangisi?' },
  listen: { label: 'DİNLE', ask: 'Duyduğun kelime hangisi?' },
  write: { label: 'TÜRKÇESİ · YAZ', ask: 'İngilizcesini yaz' },
  cloze: { label: 'CÜMLEYİ TAMAMLA', ask: 'Boşluğa hangisi gelir?' },
};

export default function ReviewScreen({ source = 'notebook', mode = 'mix', onBack }) {
  const insets = useSafeAreaInsets();
  const [seed, setSeed] = useState(() => Date.now());
  const questions = useMemo(
    () => buildReview({ words: WORDS, learn: getStore().learn, hard: hardWords(), source, mode, count: 10, seed }),
    [seed, source, mode],
  );
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null); // seçilen şık ya da yazılan metin
  const [typed, setTyped] = useState('');
  const [results, setResults] = useState([]); // { answer, ok }
  const [card, setCard] = useState(null);
  const timer = useRef(null);
  const recorded = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);

  const done = idx >= questions.length;
  const q = questions[idx];
  const score = results.filter((r) => r.ok).length;
  const title = source === 'hard' ? 'Zor Kelimeler' : 'Kelime Hafıza Kartları';

  // dinleme sorusunda kelime soru açılınca okunur
  useEffect(() => {
    if (q && q.type === 'listen') {
      const t = setTimeout(() => speakWord(q.answer, 0.85), 350);
      return () => clearTimeout(t);
    }
  }, [idx, seed]);

  useEffect(() => {
    if (done && questions.length && !recorded.current) {
      recorded.current = true;
      recordReviewSession(score, questions.length);
    }
  }, [done]);

  const next = () => {
    clearTimeout(timer.current);
    setPicked(null);
    setTyped('');
    setIdx((i) => i + 1);
  };
  const answer = (value, ok) => {
    if (picked != null) return;
    setPicked(value);
    recordReview(q.answer, ok);
    setResults((r) => [...r, { answer: q.answer, ok }]);
    Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
    if (q.type !== 'listen' || !ok) speakWord(q.answer, 0.9);
    // doğruysa kendiliğinden geç; yanlışsa doğrusunu görsün diye "Devam" beklesin
    if (ok) timer.current = setTimeout(next, 1200);
  };
  const choose = (opt) => answer(opt, opt === q.answer);
  const submitWrite = () => {
    const t = typed.trim().toUpperCase();
    if (!t) return;
    answer(t, t === q.answer);
  };
  const restart = () => {
    recorded.current = false;
    setResults([]);
    setIdx(0);
    setPicked(null);
    setTyped('');
    setSeed(Date.now());
  };

  if (!questions.length) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 10 }]}>
        <View style={styles.empty}>
          <BookOpenIcon size={44} color={ed.textMute} />
          <Text style={styles.emptyTitle}>{source === 'hard' ? 'Zor kelimen yok' : 'Defterin henüz boş'}</Text>
          <Text style={styles.emptyText}>
            {source === 'hard'
              ? 'İpucu aldığın ya da yanlış yazdığın kelimeler burada birikir. Şimdilik harika gidiyorsun!'
              : 'Bulmacalarda bilmediğin kelimenin kartını aç; kelime defterine eklenir ve burada tekrar edersin.'}
          </Text>
        </View>
        <BackBar onPress={onBack} bottomInset={insets.bottom} />
      </View>
    );
  }

  const optLabel = (opt) => (q.type === 'en2tr' ? getWord(opt)?.m.slice(0, 2).join(', ') || opt : cap(opt));

  const renderPrompt = () => {
    const w = q.word;
    if (q.type === 'en2tr') {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <Text style={[styles.qText, { marginTop: 0, flexShrink: 1 }]}>{cap(q.answer)}</Text>
          <Pressable onPress={() => speakWord(q.answer, 0.85)} hitSlop={8} style={styles.speakSm}>
            <SpeakerIcon size={18} color={ed.primary} />
          </Pressable>
        </View>
      );
    }
    if (q.type === 'listen') {
      return (
        <Pressable onPress={() => speakWord(q.answer, 0.8)} style={({ pressed }) => [styles.speakBig, pressed && { opacity: 0.8 }]}>
          <SpeakerIcon size={34} color={ed.onPrimary} />
          <Text style={styles.speakBigText}>Tekrar dinle</Text>
        </Pressable>
      );
    }
    if (q.type === 'cloze') {
      return (
        <>
          <Text style={styles.cloze}>{q.cloze.text}</Text>
          <Text style={styles.clozeTr}>{q.cloze.tr}</Text>
        </>
      );
    }
    return <Text style={styles.qText}>{w.m.slice(0, 2).join(', ')}</Text>;
  };

  const writeOk = picked != null && picked === q?.answer;

  return (
    <KeyboardAvoidingView style={[styles.root, { paddingTop: insets.top + 6 }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.head}>
        <Text style={styles.kicker}>{source === 'hard' ? 'ZORLANDIĞIN KELİMELER' : 'KARIŞIK TEKRAR · 5 SORU TÜRÜ'}</Text>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.progressRow}>
          {questions.map((_, i) => {
            const r = results[i];
            return <View key={i} style={[styles.seg, r ? { backgroundColor: r.ok ? ed.good : ed.danger } : i === idx && { backgroundColor: ed.accent }]} />;
          })}
        </View>
      </View>

      {done ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          <View style={styles.summary}>
            <Text style={styles.kickerOrange}>TEKRAR TAMAM</Text>
            <Text style={styles.score}>
              {score}/{questions.length}
            </Text>
            <Text style={styles.scoreSub}>
              {score === questions.length
                ? 'Hepsini bildin, harika!'
                : score >= questions.length / 2
                  ? 'İyi gidiyorsun. Yanlışlar zor kelimelerine eklendi.'
                  : 'Bu kelimeler zor kelimelerine eklendi; tekrar etmeye devam!'}
            </Text>
          </View>
          {questions.map((x, i) => (
            <Pressable key={x.answer} style={styles.resRow} onPress={() => setCard(x.answer)}>
              {results[i]?.ok ? <CheckIcon size={18} color={ed.good} /> : <CloseCircleIcon size={18} color={ed.danger} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.resWord}>{cap(x.answer)}</Text>
                <Text style={styles.resTr} numberOfLines={1}>
                  {x.word.m.slice(0, 3).join(', ')}
                </Text>
              </View>
              <Text style={styles.resLink}>Kart</Text>
            </Pressable>
          ))}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={onBack}>
              <Text style={[styles.btnText, { color: ed.text }]}>Bitir</Text>
            </Pressable>
            <Pressable style={styles.btn} onPress={restart}>
              <Text style={styles.btnText}>Yeniden başla</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <View style={styles.qCard}>
            <Text style={styles.qLabel}>
              {idx + 1}. SORU · {PROMPT[q.type].label}
            </Text>
            {renderPrompt()}
            <View style={styles.tags}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{posTr(q.word.p)}</Text>
              </View>
              <View style={[styles.tag, { backgroundColor: ed.accentSoft }]}>
                <Text style={[styles.tagText, { color: ed.accentInk }]}>{LEVEL_NAMES[q.word.l]}</Text>
              </View>
              {q.type === 'write' || q.type === 'tr2en' ? (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{q.answer.length} harf</Text>
                </View>
              ) : null}
            </View>
          </View>
          <Text style={styles.ask}>{PROMPT[q.type].ask}</Text>

          {q.type === 'write' ? (
            <>
              <View style={[styles.writeBox, picked != null && (writeOk ? styles.optOk : styles.optBad)]}>
                <TextInput
                  value={typed}
                  onChangeText={(t) => picked == null && setTyped(t.replace(/[^a-zA-Z' -]/g, ''))}
                  placeholder={'_ '.repeat(q.answer.length).trim()}
                  placeholderTextColor={ed.textMute}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  autoFocus
                  editable={picked == null}
                  onSubmitEditing={submitWrite}
                  returnKeyType="done"
                  style={styles.writeInput}
                />
                {picked != null ? writeOk ? <CheckIcon size={20} color={ed.good} /> : <CloseCircleIcon size={20} color={ed.danger} /> : null}
              </View>
              {picked != null && !writeOk ? (
                <Text style={styles.correction}>
                  Doğrusu: <Text style={{ fontFamily: efonts.bodyBold, color: ed.good }}>{cap(q.answer)}</Text>
                </Text>
              ) : null}
              {picked == null ? (
                <Pressable style={[styles.btn, { flex: 0, marginTop: 4 }, !typed.trim() && { opacity: 0.5 }]} onPress={submitWrite}>
                  <Text style={styles.btnText}>Kontrol et</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            q.options.map((opt) => {
              const isAns = opt === q.answer;
              const chosen = picked === opt;
              const show = picked != null;
              return (
                <Pressable
                  key={opt}
                  onPress={() => choose(opt)}
                  style={({ pressed }) => [
                    styles.opt,
                    pressed && !show && { backgroundColor: ed.surfaceAlt },
                    show && isAns && styles.optOk,
                    show && chosen && !isAns && styles.optBad,
                  ]}
                >
                  <Text
                    style={[styles.optText, q.type === 'en2tr' && styles.optTextTr, show && isAns && { color: ed.good }, show && chosen && !isAns && { color: ed.danger }]}
                    numberOfLines={2}
                  >
                    {optLabel(opt)}
                  </Text>
                  {show && isAns ? <CheckIcon size={18} color={ed.good} /> : null}
                  {show && chosen && !isAns ? <CloseCircleIcon size={18} color={ed.danger} /> : null}
                </Pressable>
              );
            })
          )}

          {picked != null ? (
            <>
              {q.type !== 'tr2en' && q.type !== 'write' ? (
                <Text style={styles.meaning}>
                  {cap(q.answer)} = {q.word.m.slice(0, 3).join(', ')}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setCard(q.answer)}>
                  <Text style={[styles.btnText, { color: ed.text }]}>Kartı aç</Text>
                </Pressable>
                <Pressable style={styles.btn} onPress={next}>
                  <Text style={styles.btnText}>{idx + 1 < questions.length ? 'Devam →' : 'Sonuçlar'}</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </ScrollView>
      )}

      <BackBar onPress={onBack} bottomInset={insets.bottom} caption={done ? `${score}/${questions.length} doğru` : `${idx + 1}/${questions.length} · ${score} doğru`} />
      {card ? <LearnModal answer={card} clue={null} remaining={null} onClose={() => setCard(null)} /> : null}
    </KeyboardAvoidingView>
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
  qCard: { ...card, padding: 18 },
  qLabel: { fontFamily: efonts.labelBold, fontSize: 10, letterSpacing: 1.2, color: ed.accent },
  qText: { fontFamily: efonts.headlineBold, fontSize: 28, lineHeight: 34, color: ed.text, marginTop: 6 },
  cloze: { fontFamily: efonts.headline, fontSize: 21, lineHeight: 29, color: ed.text, marginTop: 8 },
  clozeTr: { fontFamily: efonts.body, fontSize: 13.5, lineHeight: 19, color: ed.textSoft, marginTop: 6 },
  speakSm: { width: 36, height: 36, borderRadius: 18, backgroundColor: ed.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  speakBig: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', width: 120, height: 120, borderRadius: 60, backgroundColor: ed.primary, marginTop: 12, gap: 4 },
  speakBigText: { fontFamily: efonts.labelBold, fontSize: 10.5, color: ed.onPrimary, letterSpacing: 0.6 },
  tags: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  tag: { backgroundColor: ed.surfaceAlt, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  tagText: { fontFamily: efonts.labelBold, fontSize: 11, color: ed.textSoft },
  ask: { fontFamily: efonts.labelBold, fontSize: 11, letterSpacing: 1.1, color: ed.textSoft, marginTop: 18, marginBottom: 8 },
  opt: { ...card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 16, paddingVertical: 15, marginBottom: 8 },
  optOk: { backgroundColor: ed.goodSoft, borderColor: ed.goodLine },
  optBad: { backgroundColor: ed.dangerSoft, borderColor: ed.dangerLine },
  optText: { flexShrink: 1, fontFamily: efonts.bodyBold, fontSize: 18, color: ed.text },
  optTextTr: { fontFamily: efonts.bodySemi, fontSize: 16 },
  writeBox: { ...card, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  writeInput: { flex: 1, fontFamily: efonts.bodyBold, fontSize: 22, letterSpacing: 1, color: ed.text, paddingVertical: 14 },
  correction: { fontFamily: efonts.body, fontSize: 15, color: ed.textSoft, marginBottom: 6 },
  meaning: { fontFamily: efonts.bodySemi, fontSize: 14, color: ed.textSoft, marginTop: 4 },
  btn: { flex: 1, backgroundColor: ed.primary, paddingVertical: 14, alignItems: 'center', borderRadius: 12 },
  btnGhost: { backgroundColor: ed.surfaceAlt },
  btnText: { fontFamily: efonts.bodyBold, fontSize: 15, color: ed.onPrimary },
  summary: { ...card, padding: 20, alignItems: 'center', marginBottom: 10 },
  score: { fontFamily: efonts.headlineBold, fontSize: 52, lineHeight: 60, color: ed.text, marginTop: 4 },
  scoreSub: { fontFamily: efonts.body, fontSize: 14, lineHeight: 20, color: ed.textSoft, textAlign: 'center', marginTop: 4 },
  resRow: { ...card, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginTop: 8 },
  resWord: { fontFamily: efonts.bodyBold, fontSize: 16, color: ed.text },
  resTr: { fontFamily: efonts.body, fontSize: 12.5, color: ed.textSoft },
  resLink: { fontFamily: efonts.labelBold, fontSize: 12, color: ed.accent },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontFamily: efonts.headlineBold, fontSize: 22, color: ed.text },
  emptyText: { fontFamily: efonts.body, fontSize: 14.5, lineHeight: 21, color: ed.textSoft, textAlign: 'center' },
});
