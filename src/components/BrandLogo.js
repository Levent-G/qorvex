// QORVEX logosu (üst başlık için): Q işareti + QORVEX + turkuaz çizgi + BUL · ÇÖZ · ÖĞREN.
// İşaretin geometrisi assets/brand/qorvex-logo.svg ile aynı; açık zeminde Q halkası koyu, kuyruk ve ipucu karesi turkuaz.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Polygon, Rect } from 'react-native-svg';
import { ed, fonts } from '../theme';

const TEAL = '#19B5C2';

export function QMark({ height = 40, ink = ed.text, cell = ed.surface }) {
  // işaretin kapladığı alan (logo dosyasındaki koordinatlar)
  const vb = { x: 72, y: 60, w: 360, h: 448 };
  return (
    <Svg width={(height * vb.w) / vb.h} height={height} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}>
      <Path
        fillRule="evenodd"
        fill={ink}
        d="M82.56 234.24 A156 165.36 0 1 0 394.56 234.24 A156 165.36 0 1 0 82.56 234.24 Z M137.68 234.24 A100.88 136.24 0 1 0 339.44 234.24 A100.88 136.24 0 1 0 137.68 234.24 Z"
      />
      <Path d="M256.24 378.8 V457.84 H359.2" fill="none" stroke={TEAL} strokeWidth={31.2} strokeLinejoin="miter" />
      <Polygon points="354,417.28 354,498.4 421.6,457.84" fill={TEAL} />
      <Rect x={182.4} y={176} width={112.32} height={112.32} fill={cell} />
      <Rect x={182.4} y={176} width={56.16} height={56.16} fill={TEAL} />
      <Path d="M238.56 176 V288.32 M182.4 232.16 H294.72" stroke={ink} strokeWidth={3.64} />
      <Rect x={182.4} y={176} width={112.32} height={112.32} fill="none" stroke={ink} strokeWidth={7.28} />
      <Polygon points="238.56,194.2 238.56,213.96 253.38,204.08" fill={ink} />
      <Polygon points="200.6,232.16 220.36,232.16 210.48,246.98" fill={ink} />
    </Svg>
  );
}

export default function BrandLogo({ height = 40 }) {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="QORVEX">
      <QMark height={height} />
      <View style={styles.words}>
        <Text allowFontScaling={false} style={[styles.name, { fontSize: height * 0.52, lineHeight: height * 0.6 }]}>QORVEX</Text>
        <View style={styles.bar} />
        <Text allowFontScaling={false} style={[styles.tag, { fontSize: height * 0.2 }]}>BUL · ÇÖZ · ÖĞREN</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  words: { alignItems: 'flex-start' },
  name: { fontFamily: fonts.sansBlack, letterSpacing: 3.2, color: ed.text, includeFontPadding: false },
  bar: { alignSelf: 'stretch', height: 2.5, borderRadius: 2, backgroundColor: TEAL, marginTop: 1, marginBottom: 2, marginRight: 3 },
  tag: { fontFamily: fonts.sansBold, letterSpacing: 2.2, color: TEAL },
});
