import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronIcon } from './Icons';
import { ui, fonts } from '../theme';

export const BACK_BAR_HEIGHT = 46; // üst boşluk (10) + ince bar

// Alt geri barı — "Puzzle Club" lacivert-turkuaz
export default function BackBar({ label = 'Geri', onPress, bottomInset = 0, caption }) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(4, bottomInset - 8) }]}>
      <Pressable onPress={onPress} hitSlop={10} style={({ pressed }) => [styles.btn, pressed && { backgroundColor: ui.cardHi }]}>
        <ChevronIcon dir="left" size={13} color={ui.teal} />
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
    flexDirection: 'row', alignItems: 'center', backgroundColor: ui.bgDeep,
    borderTopWidth: 1, borderColor: ui.border, paddingTop: 5, paddingHorizontal: 12, gap: 12, marginTop: 10,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: ui.teal,
    borderRadius: 15, paddingHorizontal: 11, height: 30,
  },
  label: { fontFamily: fonts.sansBold, fontSize: 12.5, letterSpacing: 0.3, color: ui.white },
  caption: { flex: 1, textAlign: 'right', fontFamily: fonts.sansMedium, fontSize: 12, lineHeight: 16, color: ui.muted },
});
