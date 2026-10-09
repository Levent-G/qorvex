import React, { useEffect } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';
import { getWord, posTr, similarWords, familyWords, LEVEL_NAMES } from '../engine/words';
import { SpeakerIcon } from './Icons';
import { colors, fonts } from '../theme';

// Kelime kartı: Türkçe ipucuna basınca kelimeyi öğretir.
export default function LearnModal({ answer, clue, remaining, limit, onClose }) {
  const word = answer ? getWord(answer) : null;
  useEffect(() => {
    if (answer) Speech.speak(answer.toLowerCase(), { language: 'en-US', rate: 0.9 });
    return () => {
      Speech.stop();
    };
  }, [answer]);
  if (!answer) return null;
  const meanings = word ? word.m : [clue];
  const examples = word ? word.ex : [];
  const similar = word ? similarWords(word) : [];
  const family = word ? familyWords(word) : [];
  const lower = answer.toLowerCase();

  const highlight = (sentence) => {
    // örnek cümlede kelimeyi kalın göster
    const re = new RegExp(`(\\b${lower}\\w*)`, 'i');
    const parts = sentence.split(re);
    return parts.map((p, i) =>
      re.test(p) && i % 2 === 1 ? (
        <Text key={i} style={{ fontFamily: fonts.serifBold, fontStyle: 'normal' }}>
          {p}
        </Text>
      ) : (
        p
      ),
    );
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <ScrollView bounces={false} contentContainerStyle={{ padding: 18 }}>
            <Text style={styles.kicker}>KELİME KARTI · VOCABULARY</Text>
            <View style={styles.doubleRule} />
            <View style={styles.headRow}>
              <Text style={styles.word} adjustsFontSizeToFit numberOfLines={1}>
                {lower}
              </Text>
              <Pressable
                hitSlop={10}
                onPress={() => Speech.speak(lower, { language: 'en-US', rate: 0.85 })}
                style={({ pressed }) => [styles.speak, pressed && { backgroundColor: colors.paperDark }]}
              >
                <SpeakerIcon />
              </Pressable>
            </View>
            <Text style={styles.meta}>
              {word ? `${word.p} · ${posTr(word.p)} · ${LEVEL_NAMES[word.l]}` : ''}
            </Text>
            <View style={styles.rule} />

            <Text style={styles.label}>Türkçe anlamları</Text>
            <Text style={styles.meanings}>{meanings.join(' · ')}</Text>

            {examples.length ? (
              <>
                <Text style={styles.label}>Örnek cümleler</Text>
                {examples.map(([en, tr], i) => (
                  <View key={i} style={styles.example}>
                    <Text style={styles.exEn}>“{highlight(en)}”</Text>
                    <Text style={styles.exTr}>{tr}</Text>
                  </View>
                ))}
              </>
            ) : null}

            {similar.length ? (
              <>
                <Text style={styles.label}>Aynı anlama gelen kelimeler</Text>
                <View style={styles.chips}>
                  {similar.map((s) => (
                    <View key={s.a} style={styles.chip}>
                      <Text style={styles.chipEn}>{s.a.toLowerCase()}</Text>
                      <Text style={styles.chipTr}>{s.m}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {family.length ? (
              <>
                <Text style={styles.label}>Aynı aileden</Text>
                <View style={styles.chips}>
                  {family.map((s) => (
                    <View key={s.a} style={styles.chip}>
                      <Text style={styles.chipEn}>{s.a.toLowerCase()}</Text>
                      <Text style={styles.chipTr}>{s.m}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            <View style={styles.note}>
              <Text style={styles.noteText}>
                ★ Bu kelime defterine eklendi. Sonraki bulmacalarda ara ara tekrar karşına çıkacak.
              </Text>
              <Text style={styles.noteSub}>
                Bu bulmacada kalan kelime kartı hakkı: {remaining}/{limit}
              </Text>
            </View>

            <Pressable onPress={onClose} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}>
              <Text style={styles.btnText}>ANLADIM</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,20,20,0.5)', justifyContent: 'center', padding: 18 },
  card: { maxHeight: '88%', backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.ink },
  kicker: { fontFamily: fonts.sansBold, fontSize: 10.5, letterSpacing: 2, color: colors.wrong, marginBottom: 6 },
  doubleRule: { height: 6, borderTopWidth: 3, borderBottomWidth: 1, borderColor: colors.ink },
  rule: { height: 1, backgroundColor: colors.ink, marginVertical: 10 },
  headRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  word: { flex: 1, fontFamily: fonts.serifBold, fontSize: 40, lineHeight: 52, color: colors.ink },
  speak: { borderWidth: 1.5, borderColor: colors.ink, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  meta: { fontFamily: fonts.serifItalic, fontSize: 14, color: colors.muted },
  label: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 1.5, color: colors.inkSoft, marginTop: 12, marginBottom: 4, textTransform: 'uppercase' },
  meanings: { fontFamily: fonts.serifBold, fontSize: 19, color: colors.ink, lineHeight: 25 },
  example: { borderLeftWidth: 2, borderColor: colors.ink, paddingLeft: 10, marginBottom: 8 },
  exEn: { fontFamily: fonts.serifItalic, fontSize: 16, lineHeight: 22, color: colors.ink },
  exTr: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 19, color: colors.muted, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: colors.ink, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#FBF9F3' },
  chipEn: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.ink },
  chipTr: { fontFamily: fonts.serifItalic, fontSize: 12, lineHeight: 16, color: colors.muted },
  note: { marginTop: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.ink, padding: 10 },
  noteText: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 19, color: colors.ink },
  noteSub: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.inkSoft, marginTop: 4 },
  btn: { marginTop: 14, backgroundColor: colors.ink, paddingVertical: 13, alignItems: 'center' },
  btnText: { fontFamily: fonts.sansBold, fontSize: 14, letterSpacing: 2, color: colors.paper },
});
