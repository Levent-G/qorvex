import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import ArrowGrid from './ArrowGrid';
import { DIRS } from '../engine/wordsearch';
import { colors, fonts } from '../theme';

// Tüm önizlemeler aynı ölçüde: size×size kare çerçeve (2px kenar), içerik içini tam doldurur.
// Izgaralar gazete kupürü gibi sol üst köşeden kare olarak kırpılır.
const FRAME = 2;

function Frame({ size, children, bg = '#FFFFFF' }) {
  return <View style={[styles.frame, { width: size, height: size, backgroundColor: bg }]}>{children}</View>;
}

// Kelime Avı: sol üst köşedeki n×n harf + içine sığan bir kelimenin işareti
function WordSearchInner({ puzzle, s }) {
  const n = Math.min(7, puzzle.w, puzzle.h);
  const cell = s / n;
  const fits = puzzle.words.find((w) => {
    const [dr, dc] = DIRS[w.dir];
    const r1 = w.r + dr * (w.answer.length - 1), c1 = w.c + dc * (w.answer.length - 1);
    return [w.r, r1].every((r) => r >= 0 && r < n) && [w.c, c1].every((c) => c >= 0 && c < n);
  });
  let mark = null;
  if (fits) {
    const [dr, dc] = DIRS[fits.dir];
    const k = fits.answer.length - 1;
    const p = (r, c) => [c * cell + cell / 2, r * cell + cell / 2];
    const [x0, y0] = p(fits.r, fits.c);
    const [x1, y1] = p(fits.r + dr * k, fits.c + dc * k);
    mark = (
      <>
        <Line x1={x0} y1={y0} x2={x1} y2={y1} stroke={colors.ink} strokeWidth={cell * 0.8} strokeLinecap="round" />
        <Line x1={x0} y1={y0} x2={x1} y2={y1} stroke={colors.okCell} strokeWidth={cell * 0.8 - 2} strokeLinecap="round" />
      </>
    );
  }
  return (
    <View style={{ width: s, height: s, backgroundColor: '#FBF9F3' }}>
      <Svg width={s} height={s} style={StyleSheet.absoluteFill}>
        {mark}
      </Svg>
      {puzzle.rows.slice(0, n).map((row, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {row
            .slice(0, n)
            .split('')
            .map((ch, c) => (
              <Text key={c} allowFontScaling={false} style={[styles.letter, { width: cell, height: cell, fontSize: cell * 0.55, lineHeight: cell }]}>
                {ch}
              </Text>
            ))}
        </View>
      ))}
    </View>
  );
}

// Siyah kareli ızgara: sol üst köşeden kare kırpım
function BlockInner({ rows, s }) {
  const n = Math.min(rows.length, rows[0].length);
  const cell = s / n;
  return (
    <View>
      {rows.slice(0, n).map((row, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {row
            .slice(0, n)
            .split('')
            .map((ch, c) => (
              <View
                key={c}
                style={{
                  width: cell, height: cell, backgroundColor: ch === '#' ? colors.ink : '#FFFFFF',
                  borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.ink,
                }}
              />
            ))}
        </View>
      ))}
    </View>
  );
}

// Çengel bulmaca: ArrowGrid'i kare alana sığacak hücre boyuyla çiz, kırp; kendi çerçevesini dışarı it
function ArrowInner({ puzzle, s }) {
  const n = Math.min(puzzle.w, puzzle.h);
  const cell = s / n;
  return (
    <View style={{ marginLeft: -FRAME, marginTop: -FRAME }}>
      <ArrowGrid puzzle={puzzle} size={cell} showClueText={false} />
    </View>
  );
}

// Sarmal: iç içe halkalar
function SpiralInner({ n, s }) {
  const cell = s / n;
  const rings = [];
  for (let i = 1; i < Math.ceil(n / 2); i++) {
    const w = (n - 2 * i) * cell;
    rings.push(<View key={i} style={{ position: 'absolute', left: i * cell, top: i * cell, width: w, height: w, borderWidth: 1.5, borderColor: colors.ink }} />);
  }
  // açık uç: sarmalın girişi sol üstte
  return (
    <View style={{ width: s, height: s }}>
      {rings}
      <View style={{ position: 'absolute', left: 0, top: cell - 1, width: cell, height: 2, backgroundColor: colors.ink }} />
    </View>
  );
}

// Merdiven: başlangıç ve hedef kelime, boş basamaklar, iki ray
function LadderInner({ puzzle, s }) {
  const rows = puzzle.rungs.length;
  const pad = s * 0.12;
  const cell = Math.min((s - 2 * pad - (puzzle.len - 1) * 2) / puzzle.len, (s - 2 * pad - (rows - 1) * 3) / rows);
  const blockW = puzzle.len * cell + (puzzle.len - 1) * 2;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
      <View>
        {puzzle.rungs.map((r, i) => {
          const fixed = i === 0 || i === rows - 1;
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 2, marginBottom: i === rows - 1 ? 0 : 3 }}>
              {r.answer.split('').map((ch, c) => (
                <View key={c} style={[styles.lpCell, { width: cell, height: cell, backgroundColor: fixed ? colors.paperDark : '#FFFFFF' }]}>
                  {fixed ? (
                    <Text allowFontScaling={false} style={[styles.letter, { fontSize: cell * 0.55, lineHeight: cell * 0.8 }]}>
                      {ch}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          );
        })}
        <View style={[styles.lpRail, { left: -5 }]} />
        <View style={[styles.lpRail, { left: blockW + 2 }]} />
      </View>
    </View>
  );
}

// Harf taşları (Jumble ve Cryptogram): satırlar kare alana ortalanır
function TilesInner({ lines, s }) {
  const maxLen = Math.max(...lines.map((l) => l.length));
  const pad = s * 0.1;
  const cell = Math.min((s - 2 * pad - (maxLen - 1) * 2) / maxLen, (s - 2 * pad - (lines.length - 1) * 4) / lines.length);
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.paper }}>
      {lines.map((l, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 2 }}>
          {l.split('').map((ch, j) => (
            <View key={j} style={[styles.lpCell, { width: cell, height: cell, backgroundColor: '#FBF9F3' }]}>
              <Text allowFontScaling={false} style={[styles.letter, { fontSize: cell * 0.55, lineHeight: cell * 0.8 }]}>
                {ch}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// Bulmaca henüz basılmadıysa: oyunun numarası ve adıyla gazete amblemi
export function Emblem({ game, size }) {
  return (
    <Frame size={size} bg={colors.paperDark}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 4 }}>
        <Text style={[styles.emblemNo, { fontSize: size * 0.34, lineHeight: size * 0.44 }]}>{game.no}</Text>
        <View style={styles.emblemRule} />
        <Text style={[styles.emblemKicker, { fontSize: Math.max(7, size * 0.085) }]} numberOfLines={2}>
          {game.kicker}
        </Text>
      </View>
    </Frame>
  );
}

// Oyuna göre önizleme — hepsi aynı ölçüde kare çerçevede
export function GamePreview({ game, session, size }) {
  if (!session) return <Emblem game={game} size={size} />;
  const p = session.puzzle;
  const s = size - FRAME * 2;
  let inner;
  switch (game.id) {
    case 'arrow':
      inner = <ArrowInner puzzle={p} s={s} />;
      break;
    case 'ws':
      inner = <WordSearchInner puzzle={p} s={s} />;
      break;
    case 'ladder':
      inner = <LadderInner puzzle={p} s={s} />;
      break;
    case 'crossword':
    case 'codeword':
      inner = <BlockInner rows={p.rows} s={s} />;
      break;
    case 'spiral':
      inner = <SpiralInner n={p.n} s={s} />;
      break;
    case 'jumble':
      inner = <TilesInner lines={p.words.slice(0, 3).map((w) => w.scrambled)} s={s} />;
      break;
    case 'cryptogram': {
      const enc = p.text.replace(/[A-Z]/g, (ch) => p.cipher[ch]).split(' ').map((x) => x.replace(/[^A-Z]/g, '')).filter(Boolean);
      inner = <TilesInner lines={enc.slice(0, 3).map((x) => x.slice(0, 6))} s={s} />;
      break;
    }
    default:
      return <Emblem game={game} size={size} />;
  }
  return <Frame size={size}>{inner}</Frame>;
}

const styles = StyleSheet.create({
  frame: { borderWidth: FRAME, borderColor: colors.ink, overflow: 'hidden' },
  letter: { fontFamily: fonts.letter, color: colors.ink, textAlign: 'center', includeFontPadding: false },
  lpCell: { borderWidth: 1, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  lpRail: { position: 'absolute', top: -3, bottom: -3, width: 3, backgroundColor: colors.ink },
  emblemNo: { fontFamily: fonts.serifBold, color: colors.wrong },
  emblemRule: { width: '60%', height: 2, backgroundColor: colors.ink, marginVertical: 3 },
  emblemKicker: { fontFamily: fonts.sansBold, letterSpacing: 1, color: colors.ink, textAlign: 'center' },
});
