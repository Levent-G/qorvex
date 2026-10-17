import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, ed, efonts } from '../theme';

const BORDER = 2;
const STATUS_BG = { ok: colors.okCell, close: colors.closeCell, bad: colors.badCell };

const Cell = memo(function Cell({ size, block, letter, label, status, revealed, given, highlight, same, active, lastCol, lastRow }) {
  if (block) {
    return <View style={{ width: size, height: size, backgroundColor: colors.block }} />;
  }
  let bg = colors.cell;
  if (highlight) bg = colors.wordHighlight;
  // aynı sayılı kareler (Şifreli Bulmaca): açık turuncu; mavi kelime vurgusu ve sarı "yakın" ile karışmasın
  if (same) bg = colors.sameCell;
  if (status) bg = STATUS_BG[status];
  if (active) bg = colors.cellActive;
  return (
    <View
      style={[
        styles.cell,
        { width: size, height: size, backgroundColor: bg, borderRightWidth: lastCol ? 0 : 1, borderBottomWidth: lastRow ? 0 : 1 },
      ]}
    >
      {label != null ? (
        <Text allowFontScaling={false} style={[styles.label, { fontSize: Math.max(7, size * 0.24), lineHeight: Math.max(9, size * 0.3) }]}>
          {label}
        </Text>
      ) : null}
      {letter ? (
        <Text
          allowFontScaling={false}
          style={[
            styles.letter,
            { fontSize: size * 0.56, lineHeight: size * 0.74, marginTop: label != null ? size * 0.08 : 0 },
            revealed && { color: colors.revealed },
            given && { color: colors.inkSoft },
          ]}
        >
          {letter}
        </Text>
      ) : null}
    </View>
  );
});

/**
 * Genel harf ızgarası.
 * rows: ['AB#C', ...] — '#' siyah kare (Sarmal'da hiç yok)
 * letters/labels/status/revealed/given: "r,c" -> değer
 * walls: "r,c" -> { t, r, b, l } kalın çizgiler (Sarmal)
 * onTap(r, c): tek katmandan dokunma
 */
export default function PuzzleGrid({
  w, h, rows, size, letters = {}, labels = {}, status = {}, revealed = {}, given = {},
  activeKeys, sameKeys, selected, walls, onTap,
}) {
  const out = [];
  for (let r = 0; r < h; r++) {
    const cells = [];
    for (let c = 0; c < w; c++) {
      const k = `${r},${c}`;
      cells.push(
        <Cell
          key={k}
          size={size}
          block={rows ? rows[r][c] === '#' : false}
          letter={letters[k]}
          label={labels[k]}
          status={status[k]}
          revealed={!!revealed[k]}
          given={!!given[k]}
          highlight={!!activeKeys && activeKeys.has(k)}
          same={!!sameKeys && sameKeys.has(k)}
          active={!!selected && selected.r === r && selected.c === c}
          lastCol={c === w - 1}
          lastRow={r === h - 1}
        />,
      );
    }
    out.push(
      <View key={r} style={{ flexDirection: 'row' }}>
        {cells}
      </View>,
    );
  }

  // Kalın duvarlar (Sarmal yolunu ayırmak için)
  const bars = [];
  if (walls) {
    const t = 3;
    for (const [k, wl] of Object.entries(walls)) {
      const [r, c] = k.split(',').map(Number);
      const x = c * size, y = r * size;
      if (wl.t) bars.push(<View key={k + 't'} style={[styles.bar, { left: x - 1, top: y - 1, width: size + 2, height: t }]} />);
      if (wl.b) bars.push(<View key={k + 'b'} style={[styles.bar, { left: x - 1, top: y + size - 2, width: size + 2, height: t }]} />);
      if (wl.l) bars.push(<View key={k + 'l'} style={[styles.bar, { left: x - 1, top: y - 1, width: t, height: size + 2 }]} />);
      if (wl.r) bars.push(<View key={k + 'r'} style={[styles.bar, { left: x + size - 2, top: y - 1, width: t, height: size + 2 }]} />);
    }
  }

  return (
    <View style={[styles.frame, { width: w * size + BORDER * 2 }]}>
      {out}
      {bars.length ? <View pointerEvents="none" style={StyleSheet.absoluteFill}>{bars}</View> : null}
      {onTap ? (
        <View
          style={StyleSheet.absoluteFill}
          onStartShouldSetResponder={() => true}
          onResponderGrant={(e) => {
            const { locationX, locationY } = e.nativeEvent;
            const c = Math.floor(locationX / size), r = Math.floor(locationY / size);
            if (r >= 0 && c >= 0 && r < h && c < w) onTap(r, c);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderWidth: BORDER, borderColor: colors.frame, backgroundColor: colors.cell, borderRadius: 4, overflow: 'hidden' },
  cell: { borderColor: colors.gridLine, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  label: { position: 'absolute', top: 1, left: 2, fontFamily: efonts.labelBold, color: ed.textSoft },
  letter: { fontFamily: efonts.labelBold, color: ed.text, textAlign: 'center', includeFontPadding: false },
  bar: { position: 'absolute', backgroundColor: colors.block },
});
