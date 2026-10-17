import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { speakWord, stopSpeaking } from '../speech';
import { getWord, posTr, similarWords, familyWords, LEVEL_NAMES } from '../engine/words';
import { SpeakerIcon } from './Icons';
import { colors, fonts, ed, efonts } from '../theme';

// Kelime kartı: Türkçe ipucuna basınca kelimeyi öğretir.
export default function LearnModal({ answer, clue, remaining, limit, onClose }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // alttan yukarı açılan sayfa: açılışta yaylanarak çıkar, kapanırken aşağı kayar
  const slide = useRef(new Animated.Value(height)).current;
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!answer) return;
    slide.setValue(height);
    fade.setValue(0);
    Animated.parallel([
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220, mass: 0.9 }),
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    // kart yerine oturduktan sonra kelimeyi sesli oku; kart kapanırsa okuma kesilir
    const t = setTimeout(() => speakWord(answer, 0.9), 400);
    return () => {
      clearTimeout(t);
      stopSpeaking();
    };
  }, [answer]);
  const close = () => {
    Animated.parallel([
      Animated.timing(slide, { toValue: height, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  };
  const word = answer ? getWord(answer) : null;
  if (!answer) return null;
  const meanings = word ? word.m : [clue];
  const examples = word ? word.ex : [];
  const similar = word ? similarWords(word) : [];
  const family = word ? familyWords(word) : [];
  const lower = answer.toLowerCase();
  // Kelime boyutu: uzunluğa ve kart genişliğine göre hesaplanır (otomatik küçültme bazı kelimeleri çok küçültüyordu).
  // Kullanılabilir genişlik ≈ ekran − kenar boşlukları − hoparlör düğmesi; serif kalın harf ≈ 0.56 em.
  const avail = Math.min(width, 520) - 36 - 36 - 44 - 10;
  const wordSize = Math.max(26, Math.min(40, Math.floor(avail / (lower.length * 0.56))));

  const highlight = (sentence) => {
    // örnek cümlede kelimeyi kalın göster
    const re = new RegExp(`(\\b${lower}\\w*)`, 'i');
    const parts = sentence.split(re);
    return parts.map((p, i) =>
      re.test(p) && i % 2 === 1 ? (
        <Text key={i} style={{ fontFamily: efonts.headlineBold, fontStyle: 'normal' }}>
          {p}
        </Text>
      ) : (
        p
      ),
    );
  };

  const display = lower.charAt(0).toUpperCase() + lower.slice(1);
  const posEn = { noun: 'Noun', verb: 'Verb', adjective: 'Adjective', adverb: 'Adverb', preposition: 'Preposition', pronoun: 'Pronoun', conjunction: 'Conjunction', interjection: 'Interjection', determiner: 'Determiner' };
  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>
        <Animated.View style={[styles.card, { transform: [{ translateY: slide }] }]}>
          <View style={styles.grabber} />
          <ScrollView bounces={false} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: 18 + insets.bottom }}>
            <Text style={styles.kicker}>KELİME KARTI · VOCABULARY</Text>
            <View style={styles.headRow}>
              <Text allowFontScaling={false} style={[styles.word, { fontSize: wordSize, lineHeight: Math.round(wordSize * 1.2) }]} numberOfLines={2}>
                {display}
              </Text>
              <Pressable hitSlop={10} onPress={() => speakWord(lower, 0.85)} style={({ pressed }) => [styles.speak, pressed && { backgroundColor: ed.accentLine }]}>
                <SpeakerIcon color={ed.accentInk} />
              </Pressable>
            </View>
            {word && word.ipa ? (
              <Text style={styles.ipa}>
                /{word.ipa}/ <Text style={styles.ipaNote}>· ABD okunuşu</Text>
              </Text>
            ) : null}
            {word ? (
              <View style={styles.tags}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{posTr(word.p)}</Text>
                </View>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{posEn[word.p] || word.p}</Text>
                </View>
                <View style={[styles.tag, styles.tagLevel]}>
                  <Text style={[styles.tagText, { color: ed.onPrimary }]}>{LEVEL_NAMES[word.l]} Seviyesi</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.meanBox}>
              <Text style={styles.label}>TÜRKÇE ANLAMI</Text>
              <Text style={styles.meanings}>{meanings.join(', ')}</Text>
            </View>

            {examples.length ? (
              <View style={styles.exBox}>
                <Text style={styles.labelDark}>❞ ÖRNEK KULLANIM</Text>
                {examples.map(([en, tr], i) => (
                  <View key={i} style={i > 0 && { marginTop: 8 }}>
                    <Text style={styles.exEn}>“{highlight(en)}”</Text>
                    <Text style={styles.exTr}>{tr}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {similar.length ? (
              <>
                <Text style={styles.sectionLabel}>EŞ ANLAMLILAR (SYNONYMS)</Text>
                <View style={styles.chips}>
                  {similar.map((x) => (
                    <View key={x.a} style={styles.chip}>
                      <Text style={styles.chipEn}>{x.a.charAt(0) + x.a.slice(1).toLowerCase()}</Text>
                      <Text style={styles.chipTr}>{x.m}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {family.length ? (
              <>
                <Text style={styles.sectionLabel}>AYNI AİLEDEN</Text>
                <View style={styles.chips}>
                  {family.map((x) => (
                    <View key={x.a} style={styles.chip}>
                      <Text style={styles.chipEn}>{x.a.charAt(0) + x.a.slice(1).toLowerCase()}</Text>
                      <Text style={styles.chipTr}>{x.m}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            <View style={styles.note}>
              <Text style={styles.noteText}>
                {remaining == null ? (
                  'Bu kelime defterinde. Aralıklı tekrar algoritmasıyla bulmacalarda ara ara karşına çıkar; öğrendikçe daha seyrek gelir.'
                ) : (
                  <>
                    Bu kelime otomatik olarak <Text style={{ fontFamily: efonts.bodyBold }}>Kelime Defteri</Text>'ne eklendi ve aralıklı tekrar algoritmasıyla ileriki bulmacalarda pekiştirme için karşına çıkacak.
                  </>
                )}
              </Text>
            </View>

            {remaining == null ? null : (
              <View style={styles.quotaRow}>
                <Text style={styles.quotaLabel}>KELİME KARTI HAKKI</Text>
                <View style={styles.quotaPill}>
                  <Text style={styles.quotaText}>
                    Kalan Kart Hakkı: {remaining}/{limit}
                  </Text>
                </View>
              </View>
            )}

            <Pressable onPress={close} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.88 }]}>
              <Text style={styles.btnText}>ANLADIM ✓</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(20,27,38,0.5)' },
  card: { maxHeight: '90%', backgroundColor: ed.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden' },
  grabber: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: ed.surfaceDim, marginTop: 8, marginBottom: 6 },
  kicker: { fontFamily: efonts.labelBold, fontSize: 10.5, letterSpacing: 1.8, color: ed.accent },
  headRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  word: { flex: 1, fontFamily: efonts.headlineBold, fontSize: 40, color: ed.text },
  speak: { width: 44, height: 44, borderRadius: 22, backgroundColor: ed.accentSoft, alignItems: 'center', justifyContent: 'center' },
  ipa: { fontSize: 16, color: ed.accentInk, marginTop: 2 },
  ipaNote: { fontFamily: efonts.label, fontSize: 11, color: ed.textMute },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { backgroundColor: ed.surfaceAlt, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tagLevel: { backgroundColor: ed.accentStrong },
  tagText: { fontFamily: efonts.labelBold, fontSize: 11, color: ed.textSoft },
  meanBox: { backgroundColor: ed.surfaceAlt, borderRadius: 12, padding: 12, marginTop: 14 },
  label: { fontFamily: efonts.labelBold, fontSize: 10, letterSpacing: 1.2, color: ed.accent },
  labelDark: { fontFamily: efonts.labelBold, fontSize: 10, letterSpacing: 1.2, color: ed.text },
  meanings: { fontFamily: efonts.bodyBold, fontSize: 18, lineHeight: 24, color: ed.text, marginTop: 4 },
  exBox: { borderWidth: 1, borderColor: ed.border, borderRadius: 12, padding: 12, marginTop: 10 },
  exEn: { fontFamily: efonts.headlineItalic, fontSize: 16, lineHeight: 22, color: ed.text, marginTop: 6 },
  exTr: { fontFamily: efonts.body, fontSize: 13, lineHeight: 18, color: ed.textSoft, marginTop: 2 },
  sectionLabel: { fontFamily: efonts.labelBold, fontSize: 10, letterSpacing: 1.2, color: ed.textSoft, marginTop: 14, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: ed.surfaceAlt, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 5 },
  chipEn: { fontFamily: efonts.bodyBold, fontSize: 13.5, color: ed.text },
  chipTr: { fontFamily: efonts.body, fontSize: 11.5, color: ed.textSoft },
  note: { backgroundColor: ed.noteBg, borderRadius: 12, padding: 12, marginTop: 16 },
  noteText: { fontFamily: efonts.body, fontSize: 13, lineHeight: 19, color: ed.text },
  quotaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  quotaLabel: { fontFamily: efonts.labelBold, fontSize: 10, letterSpacing: 1.2, color: ed.textSoft },
  quotaPill: { backgroundColor: ed.accentSoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  quotaText: { fontFamily: efonts.labelBold, fontSize: 11, color: ed.accentInk },
  btn: { marginTop: 14, backgroundColor: ed.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnText: { fontFamily: efonts.labelBold, fontSize: 14, letterSpacing: 1.5, color: ed.onPrimary },
});
