// Yeni rozet kutlaması (ana sayfaya dönünce gösterilir)
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ShareButton } from './GameShell';
import { ed, efonts } from '../theme';

export default function BadgeModal({ badges, onClose }) {
  const scale = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
  }, []);
  const one = badges.length === 1;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <Text style={styles.kicker}>{one ? 'YENİ ROZET' : `${badges.length} YENİ ROZET`}</Text>
          <Animated.View style={[styles.medals, { transform: [{ scale }] }]}>
            {badges.slice(0, 6).map((b) => (
              <View key={b.id} style={[styles.medal, one && styles.medalBig]}>
                <Text style={[styles.emoji, one && { fontSize: 46 }]}>{b.emoji}</Text>
              </View>
            ))}
          </Animated.View>
          {one ? (
            <>
              <Text style={styles.title}>{badges[0].title}</Text>
              <Text style={styles.desc}>{badges[0].desc}</Text>
            </>
          ) : (
            <View style={{ alignSelf: 'stretch', marginTop: 10, gap: 6 }}>
              {badges.slice(0, 6).map((b) => (
                <Text key={b.id} style={styles.line}>
                  {b.emoji} <Text style={{ fontFamily: efonts.bodyBold, color: ed.text }}>{b.title}</Text> · {b.desc}
                </Text>
              ))}
            </View>
          )}
          <ShareButton info={{ title: 'Yeni rozet', seconds: 0, hints: false, line: badges.map((b) => `${b.emoji} ${b.title}`).join('\n') }} />
          <Pressable style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>Harika!</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,27,38,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: { width: '100%', maxWidth: 360, backgroundColor: ed.surface, borderRadius: 20, padding: 22, alignItems: 'center' },
  kicker: { fontFamily: efonts.labelBold, fontSize: 11, letterSpacing: 2, color: ed.orange },
  medals: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 },
  medal: { width: 52, height: 52, borderRadius: 26, backgroundColor: ed.orangeSoft, borderWidth: 2, borderColor: ed.gold, alignItems: 'center', justifyContent: 'center' },
  medalBig: { width: 96, height: 96, borderRadius: 48, borderWidth: 3 },
  emoji: { fontSize: 26 },
  title: { fontFamily: efonts.headlineBold, fontSize: 26, lineHeight: 32, color: ed.text, marginTop: 12, textAlign: 'center' },
  desc: { fontFamily: efonts.body, fontSize: 14.5, color: ed.textSoft, marginTop: 4, textAlign: 'center' },
  line: { fontFamily: efonts.body, fontSize: 13.5, lineHeight: 19, color: ed.textSoft },
  btn: { alignSelf: 'stretch', backgroundColor: ed.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  btnText: { fontFamily: efonts.bodyBold, fontSize: 15, color: ed.onPrimary },
});
