// Oyun ikonları ("Editorial" tasarım): açık gri yuvarlak kare içinde lacivert çizgi ikon
import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';
import { ed } from '../theme';

function Glyph({ id, size, color }) {
  const p = { stroke: color, strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  let body;
  switch (id) {
    case 'arrow': // ok'lu ipucu ızgarası
      body = (
        <>
          <Rect x="3.5" y="3.5" width="17" height="17" rx="2" {...p} />
          <Path d="M3.5 9.5h17M9.5 3.5v17" {...p} />
          <Path d="M12.5 6.5h4M15 5l1.5 1.5L15 8" {...p} />
        </>
      );
      break;
    case 'picture': // kamera
      body = (
        <>
          <Path d="M4 8h3l1.6-2.5h6.8L17 8h3v11H4z" {...p} />
          <Circle cx="12" cy="13" r="3.4" {...p} />
        </>
      );
      break;
    case 'crossword': // # ızgara
      body = <Path d="M9 4v16M15 4v16M4 9h16M4 15h16" {...p} />;
      break;
    case 'codeword': // sayılı kart
      body = (
        <>
          <Rect x="3.5" y="5.5" width="17" height="13" rx="2" {...p} />
          <Path d="M7 10v4M10 10h2.2v2H10v2h2.2M15 10h2v4h-2M15 12h2" {...p} />
        </>
      );
      break;
    case 'spiral': // sonsuzluk / iç içe yol
      body = <Path d="M7.5 15.5c-2 0-3.5-1.6-3.5-3.5s1.5-3.5 3.5-3.5c3.5 0 5.5 7 9 7 2 0 3.5-1.6 3.5-3.5s-1.5-3.5-3.5-3.5c-3.5 0-5.5 7-9 7z" {...p} />;
      break;
    case 'ws': // büyüteç + harf
      body = (
        <>
          <Circle cx="10.5" cy="10.5" r="6" {...p} />
          <Line x1="15" y1="15" x2="20" y2="20" {...p} />
          <Path d="M8.5 12.5l2-5 2 5M9.2 11h2.6" {...p} />
        </>
      );
      break;
    case 'ladder': // merdiven / tek harf değişimi
      body = (
        <>
          <Rect x="4" y="4" width="16" height="16" rx="2" {...p} />
          <Path d="M8 17L16 7" {...p} />
        </>
      );
      break;
    case 'jumble': // yapboz parçası
      body = <Path d="M5 9h3a2 2 0 1 1 4 0h3v3a2 2 0 1 0 0 4v3h-3a2 2 0 1 1-4 0H5v-3a2 2 0 1 0 0-4z" {...p} />;
      break;
    case 'cryptogram': // tırnak (aforizma)
      body = (
        <>
          <Path d="M5 15.5c0-3.5 1.5-6 4-7.5M5 15.5a2 2 0 1 0 4 0 2 2 0 1 0-4 0" {...p} />
          <Path d="M13 15.5c0-3.5 1.5-6 4-7.5M13 15.5a2 2 0 1 0 4 0 2 2 0 1 0-4 0" {...p} />
        </>
      );
      break;
    default:
      body = <Rect x="5" y="5" width="14" height="14" rx="2" {...p} />;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {body}
    </Svg>
  );
}

export default function GameGlyph({ id, size = 44, color = ed.primary, bg = ed.surfaceAlt, radius = 12 }) {
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Glyph id={id} size={size * 0.52} color={color} />
    </View>
  );
}
