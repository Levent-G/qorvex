import React, { memo, useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';
import { colors, fonts } from '../theme';

const BORDER = 2;

const STATUS_BG = { ok: colors.okCell, close: colors.closeCell, bad: colors.badCell };

const LetterCell = memo(function LetterCell({ size, letter, status, revealed, highlight, active, lastCol, lastRow }) {
  let bg = colors.cell;
  if (highlight) bg = colors.wordHighlight;
  if (status) bg = STATUS_BG[status];
  if (active) bg = colors.cellActive;
  return (
    <View
      style={[
        styles.cell,
        { width: size, height: size, backgroundColor: bg, borderRightWidth: lastCol ? 0 : 1, borderBottomWidth: lastRow ? 0 : 1 },
      ]}
    >
      {letter ? (
        <Text
          allowFontScaling={false}
          style={[styles.letter, { fontSize: size * 0.58, lineHeight: size * 0.75, color: revealed ? colors.revealed : colors.ink }]}
        >
          {letter}
        </Text>
      ) : null}
    </View>
  );
});

const ClueCell = memo(function ClueCell({ size, t0, t1, activeSlot, learned0, learned1, lastCol, lastRow, showText }) {
  const texts = t1 != null ? [t0, t1] : [t0];
  const learned = [learned0, learned1];
  const two = texts.length === 2;
  const fs = Math.max(6, size * (two ? 0.2 : 0.22));
  return (
    <View
      style={[
        styles.cell,
        styles.clueCell,
        { width: size, height: size, borderRightWidth: lastCol ? 0 : 1, borderBottomWidth: lastRow ? 0 : 1 },
      ]}
    >
      {texts.map((t, i) => (
        <View
          key={i}
          style={[
            styles.clueSlot,
            two && i === 0 && styles.clueDivider,
            activeSlot === i && { backgroundColor: colors.clueCellActive },
          ]}
        >
          {showText ? (
            <Text
              allowFontScaling={false}
              numberOfLines={two ? 2 : 4}
              adjustsFontSizeToFit
              minimumFontScale={0.55}
              style={[
                styles.clueText,
                { fontSize: fs, lineHeight: fs * 1.3 },
                activeSlot === i && { color: colors.ink, fontFamily: fonts.clueBold },
                learned[i] && styles.learnedText,
              ]}
            >
              {t}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
});

// Kullanılmayan kareler: kağıt tonunda ince çapraz tarama (gazetedeki "boş alan" gibi; koyu delik gibi durmasın)
const DeadHatch = memo(function DeadHatch({ puzzle, size }) {
  const step = Math.max(5, size * 0.16);
  const lines = [];
  for (let r = 0; r < puzzle.h; r++)
    for (let c = 0; c < puzzle.w; c++) {
      if (puzzle.rows[r][c] !== '.') continue;
      const x0 = c * size, y0 = r * size;
      // x + y = k çizgilerinin kare içindeki parçaları (sol alttan sağ üste)
      for (let k = step; k < size * 2; k += step) {
        const a = k <= size ? [x0, y0 + k] : [x0 + k - size, y0 + size];
        const b = k <= size ? [x0 + k, y0] : [x0 + size, y0 + k - size];
        lines.push(`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`);
      }
    }
  if (!lines.length) return null;
  return (
    <Svg pointerEvents="none" width={puzzle.w * size} height={puzzle.h * size} style={StyleSheet.absoluteFill}>
      <Path d={lines.join('')} stroke={colors.deadHatch} strokeWidth={1.2} />
    </Svg>
  );
});

const Arrows = memo(function Arrows({ puzzle, size }) {
  const a = Math.max(2.2, size * 0.1);
  const items = [];
  const bottomCount = {};
  for (const k of puzzle.clues)
    if (k.arrow === 'D' || k.arrow === 'DR') bottomCount[`${k.r},${k.c}`] = (bottomCount[`${k.r},${k.c}`] || 0) + 1;

  puzzle.clues.forEach((k, i) => {
    const slotY = k.of === 1 ? size / 2 : k.slot === 0 ? size / 4 : (size * 3) / 4;
    const twoBottom = bottomCount[`${k.r},${k.c}`] === 2;
    const bottomX = twoBottom ? (k.arrow === 'DR' ? size * 0.3 : size * 0.7) : size / 2;
    if (k.arrow === 'R') {
      const x = (k.c + 1) * size;
      const y = k.r * size + slotY;
      items.push(<Polygon key={i} points={`${x},${y - a} ${x},${y + a} ${x + a * 1.4},${y}`} fill={colors.ink} />);
    } else if (k.arrow === 'D') {
      const x = k.c * size + bottomX;
      const y = (k.r + 1) * size;
      items.push(<Polygon key={i} points={`${x - a},${y} ${x + a},${y} ${x},${y + a * 1.4}`} fill={colors.ink} />);
    } else if (k.arrow === 'RD') {
      const x0 = (k.c + 1) * size;
      const y = k.r * size + slotY;
      const x1 = x0 + size * 0.2;
      const y1 = y + size * 0.1;
      items.push(
        <Path key={`${i}l`} d={`M${x0} ${y} H${x1} V${y1}`} stroke={colors.ink} strokeWidth={1.2} fill="none" />,
        <Polygon key={i} points={`${x1 - a},${y1} ${x1 + a},${y1} ${x1},${y1 + a * 1.4}`} fill={colors.ink} />,
      );
    } else if (k.arrow === 'DR') {
      const x = k.c * size + bottomX;
      const y0 = (k.r + 1) * size;
      const y1 = y0 + size * 0.2;
      const x1 = x + size * 0.1;
      items.push(
        <Path key={`${i}l`} d={`M${x} ${y0} V${y1} H${x1}`} stroke={colors.ink} strokeWidth={1.2} fill="none" />,
        <Polygon key={i} points={`${x1},${y1 - a} ${x1},${y1 + a} ${x1 + a * 1.4},${y1}`} fill={colors.ink} />,
      );
    }
  });
  return (
    <Svg pointerEvents="none" width={puzzle.w * size} height={puzzle.h * size} style={StyleSheet.absoluteFill}>
      {items}
    </Svg>
  );
});

/**
 * Gazete tipi arrowword ızgarası.
 * onTap(r, c, slot) — tüm dokunmalar tek bir katmandan gelir (hızlı ve isabetli).
 */
export default function ArrowGrid({
  puzzle, model, size, entries = {}, revealed = {}, cellStatus = {}, selected, activeWord, learned,
  onTap, showClueText = true, showSolution = false,
}) {
  const textsByCell = useMemo(() => {
    const m = {};
    for (const k of puzzle.clues) {
      const key = `${k.r},${k.c}`;
      m[key] = m[key] || [];
      m[key][k.slot] = k;
    }
    return m;
  }, [puzzle]);

  const activeCells = useMemo(() => {
    const s = new Set();
    if (activeWord != null && model) for (const [r, c] of model.words[activeWord].cells) s.add(`${r},${c}`);
    return s;
  }, [activeWord, model]);
  const aw = activeWord != null && model ? model.words[activeWord] : null;
  const activeClueKey = aw ? `${aw.r},${aw.c}` : null;

  const rows = [];
  for (let r = 0; r < puzzle.h; r++) {
    const cells = [];
    for (let c = 0; c < puzzle.w; c++) {
      const ch = puzzle.rows[r][c];
      const key = `${r},${c}`;
      const lastCol = c === puzzle.w - 1;
      const lastRow = r === puzzle.h - 1;
      if (ch === '#') {
        const ks = textsByCell[key] || [];
        cells.push(
          <ClueCell
            key={key} size={size}
            t0={ks[0]?.text} t1={ks[1]?.text}
            learned0={!!(learned && ks[0] && learned.has(ks[0].answer))}
            learned1={!!(learned && ks[1] && learned.has(ks[1].answer))}
            activeSlot={activeClueKey === key ? aw.slot : null}
            lastCol={lastCol} lastRow={lastRow} showText={showClueText}
          />,
        );
      } else if (ch === '@') {
        // fotoğraf alanı: üstüne tek parça fotoğraf yerleşir
        cells.push(<View key={key} style={{ width: size, height: size }} />);
      } else if (ch === '.') {
        cells.push(
          <View
            key={key}
            style={[styles.cell, styles.deadCell, { width: size, height: size, borderRightWidth: lastCol ? 0 : 1, borderBottomWidth: lastRow ? 0 : 1 }]}
          />,
        );
      } else {
        cells.push(
          <LetterCell
            key={key} size={size}
            letter={showSolution ? ch : entries[key]}
            status={cellStatus[key]}
            revealed={!!revealed[key]}
            highlight={activeCells.has(key)}
            active={!!selected && selected.r === r && selected.c === c}
            lastCol={lastCol} lastRow={lastRow}
          />,
        );
      }
    }
    rows.push(<View key={r} style={styles.row}>{cells}</View>);
  }

  const responder = onTap
    ? {
        onStartShouldSetResponder: () => true,
        onResponderGrant: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          const c = Math.floor(locationX / size);
          const r = Math.floor(locationY / size);
          if (r < 0 || c < 0 || r >= puzzle.h || c >= puzzle.w) return;
          const slot = locationY - r * size > size / 2 ? 1 : 0;
          onTap(r, c, slot);
        },
      }
    : null;

  return (
    <View style={[styles.frame, { width: puzzle.w * size + BORDER * 2 }]}>
      {rows}
      {puzzle.photo ? (
        <View
          pointerEvents="none"
          style={[styles.photo, { left: puzzle.photo.c * size, top: puzzle.photo.r * size, width: puzzle.photo.w * size, height: puzzle.photo.h * size }]}
        >
          <Image source={{ uri: puzzle.photo.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          <View style={styles.photoTag}>
            <Text style={styles.photoTagText}>RESİMDEKİ NESNE</Text>
          </View>
        </View>
      ) : null}
      <DeadHatch puzzle={puzzle} size={size} />
      <Arrows puzzle={puzzle} size={size} />
      {responder ? <View style={StyleSheet.absoluteFill} {...responder} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderWidth: BORDER, borderColor: colors.frame, backgroundColor: colors.cell, borderRadius: 4, overflow: 'hidden' },
  row: { flexDirection: 'row' },
  cardHint: { position: 'absolute', top: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  cardHintSide: { position: 'absolute', top: 0, bottom: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  photo: { position: 'absolute', borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.paperDark, overflow: 'hidden' },
  photoTag: { position: 'absolute', left: 0, bottom: 0, backgroundColor: colors.block, paddingHorizontal: 4, paddingVertical: 1 },
  photoTagText: { fontFamily: fonts.sansBold, fontSize: 8, letterSpacing: 1, color: '#FFFFFF' },
  cell: { borderColor: colors.gridLine, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  clueCell: { backgroundColor: colors.clueCell },
  deadCell: { backgroundColor: colors.deadCell },
  clueSlot: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 1.5 },
  clueDivider: { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: colors.ink },
  clueText: { fontFamily: fonts.clue, color: colors.ink, textAlign: 'center', includeFontPadding: false },
  learnedText: { textDecorationLine: 'underline' },
  letter: { fontFamily: fonts.letter, textAlign: 'center', includeFontPadding: false },
});
