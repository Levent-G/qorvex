import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronIcon } from './Icons';
import { ed, efonts } from '../theme';

export const BACK_BAR_HEIGHT = 46; // üst boşluk (10) + ince bar

// Alt geri barı — "Editorial" açık tema
export default function BackBar({ label = 'Geri', onPress, bottomInset = 0, caption }) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(4, bottomInset - 8) }]}>
      <Pressable onPress={onPress} hitSlop={10} style={({ pressed }) => [styles.btn, pressed && { backgroundColor: ed.surfaceDim }]}>
        <ChevronIcon dir="left" size={13} color={ed.text} />
        <Text style={styles.label}>{label}</Text>
      </Pressable>
      {caption ? (
        <Text style={styles.caption} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: ed.bg,
    paddingTop: 6, paddingHorizontal: 12, gap: 12, marginTop: 8,
  },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ed.surfaceAlt, borderRadius: 10, paddingHorizontal: 12, height: 32 },
  label: { fontFamily: efonts.bodyBold, fontSize: 13, color: ed.text },
  caption: { flex: 1, textAlign: 'right', fontFamily: efonts.labelBold, fontSize: 11, letterSpacing: 0.4, lineHeight: 15, color: ed.textSoft },
});
