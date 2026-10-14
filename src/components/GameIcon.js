// Her oyun için küçük karo ikon (tasarımdaki "A B C", "_ A T" gibi harf karoları)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ui, fonts } from '../theme';

function Tile({ ch, s, kind = 'light', style }) {
  const bg = kind === 'teal' ? ui.teal : kind === 'dark' ? ui.creamInk : kind === 'empty' ? 'transparent' : ui.white;
  const color = kind === 'light' ? ui.creamInk : ui.white;
  return (
    <View style={[styles.tile, { width: s, height: s, backgroundColor: bg, borderColor: kind === 'empty' ? ui.tealSoft : 'transparent' }, style]}>
      {ch ? <Text allowFontScaling={false} style={[styles.ch, { fontSize: s * 0.58, color }]}>{ch}</Text> : null}
    </View>
  );
}

// Küçük kare ızgara (siyah/beyaz kareler)
function Grid({ s, pattern }) {
  return (
    <View style={{ gap: 2 }}>
      {pattern.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 2 }}>
          {row.split('').map((c, i) => (
            <View key={i} style={{ width: s, height: s, borderRadius: 2, backgroundColor: c === '#' ? ui.creamInk : c === 't' ? ui.teal : ui.white }} />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function GameIcon({ id, size = 56 }) {
  const t = Math.round(size * 0.34);
  let body;
  switch (id) {
    case 'arrow':
      body = <Grid s={Math.round(size * 0.2)} pattern={['t..', '.#.', '..#']} />;
      break;
    case 'crossword':
      body = <Grid s={Math.round(size * 0.2)} pattern={['.#.', '...', '#.#']} />;
      break;
    case 'codeword':
      body = (
        <View style={{ flexDirection: 'row', gap: 3 }}>
          <Tile ch="1" s={t} kind="dark" />
          <Tile ch="A" s={t} kind="teal" />
        </View>
      );
      break;
    case 'spiral':
      body = (
        <View style={[styles.spiral, { width: size * 0.62, height: size * 0.62 }]}>
          <View style={[styles.spiral, { width: size * 0.38, height: size * 0.38, borderColor: ui.teal }]}>
            <View style={{ width: size * 0.12, height: size * 0.12, borderRadius: 2, backgroundColor: ui.white }} />
          </View>
        </View>
      );
      break;
    case 'ws':
      body = (
        <View style={{ gap: 3 }}>
          <View style={{ flexDirection: 'row', gap: 3 }}>
            <Tile ch="A" s={t} />
            <Tile ch="B" s={t} kind="teal" />
          </View>
          <View style={{ flexDirection: 'row', gap: 3, marginLeft: t * 0.5 }}>
            <Tile ch="C" s={t} kind="teal" />
            <Tile ch="C" s={t} />
          </View>
        </View>
      );
      break;
    case 'ladder':
      body = (
        <View style={{ gap: 3, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            <Tile ch="C" s={t * 0.8} />
            <Tile ch="A" s={t * 0.8} />
            <Tile ch="T" s={t * 0.8} />
          </View>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            <Tile ch="C" s={t * 0.8} />
            <Tile ch="O" s={t * 0.8} kind="teal" />
            <Tile ch="T" s={t * 0.8} />
          </View>
        </View>
      );
      break;
    case 'jumble':
      body = (
        <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
          <Tile s={t} kind="empty" />
          <Tile ch="A" s={t} />
          <Tile ch="T" s={t} />
        </View>
      );
      break;
    case 'cryptogram':
      body = (
        <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
          <Tile ch="Q" s={t} kind="dark" />
          <Text style={[styles.eq, { fontSize: t * 0.6 }]}>=</Text>
          <Tile ch="E" s={t} kind="teal" />
        </View>
      );
      break;
    case 'picture':
      // küçük fotoğraf karesi: güneş + dağ
      body = (
        <View style={[styles.photo, { width: size * 0.66, height: size * 0.54 }]}>
          <View style={{ position: 'absolute', top: size * 0.07, right: size * 0.08, width: size * 0.13, height: size * 0.13, borderRadius: size, backgroundColor: ui.gold }} />
          <View style={{ position: 'absolute', bottom: -size * 0.2, left: size * 0.04, width: size * 0.36, height: size * 0.36, backgroundColor: ui.teal, transform: [{ rotate: '45deg' }] }} />
          <View style={{ position: 'absolute', bottom: -size * 0.16, left: size * 0.26, width: size * 0.28, height: size * 0.28, backgroundColor: ui.tealSoft, transform: [{ rotate: '45deg' }] }} />
        </View>
      );
      break;
    default:
      body = <Tile ch="?" s={t} />;
  }
  return <View style={[styles.wrap, { width: size, height: size }]}>{body}</View>;
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  tile: { borderRadius: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  ch: { fontFamily: fonts.sansBlack, includeFontPadding: false },
  eq: { fontFamily: fonts.sansBlack, color: ui.tealSoft },
  photo: { backgroundColor: ui.white, borderRadius: 5, overflow: 'hidden', borderWidth: 2, borderColor: ui.white },
  spiral: { borderWidth: 3, borderColor: ui.white, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
});
