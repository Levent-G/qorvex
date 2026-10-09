import React from 'react';
import Svg, { Path, Polygon, Rect } from 'react-native-svg';
import { colors } from '../theme';

// QORVEX işareti: gazete serifi "Q" halkası, çengel bulmaca oku kuyruk, içinde ipucu kareli ızgara.
// Geometri scripts/build-brand.mjs içindeki qMark ile birebir aynıdır (merkez 0,0, ölçek 1).
const VB = { x: -330, y: -410, w: 664, h: 834 };

export default function QorvexMark({ height = 80, ink = colors.ink, clue = colors.clueCell, cell = '#FFFFFF' }) {
  const width = (height * VB.w) / VB.h;
  const ox = -22, oy = -88;
  const X = (v) => ox + v, Y = (v) => oy + v;
  const o = { rx: 300, ry: 318 }, i = { rx: 194, ry: 262 };
  const ring =
    `M${X(-o.rx)} ${Y(0)} A${o.rx} ${o.ry} 0 1 0 ${X(o.rx)} ${Y(0)} A${o.rx} ${o.ry} 0 1 0 ${X(-o.rx)} ${Y(0)} Z ` +
    `M${X(-i.rx)} ${Y(0)} A${i.rx} ${i.ry} 0 1 0 ${X(i.rx)} ${Y(0)} A${i.rx} ${i.ry} 0 1 0 ${X(-i.rx)} ${Y(0)} Z`;
  const g = 108, gx = -g, gy = -g - 4, a = 19;
  return (
    <Svg width={width} height={height} viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}>
      <Path d={ring} fill={ink} fillRule="evenodd" />
      <Path d={`M${X(34)} ${Y(278)} V${Y(430)} H${X(232)}`} stroke={ink} strokeWidth={60} fill="none" strokeLinejoin="miter" />
      <Polygon points={`${X(222)},${Y(352)} ${X(222)},${Y(508)} ${X(352)},${Y(430)}`} fill={ink} />
      <Rect x={X(gx)} y={Y(gy)} width={2 * g} height={2 * g} fill={cell} />
      <Rect x={X(gx)} y={Y(gy)} width={g} height={g} fill={clue} />
      <Path d={`M${X(gx + g)} ${Y(gy)} V${Y(gy + 2 * g)} M${X(gx)} ${Y(gy + g)} H${X(gx + 2 * g)}`} stroke={ink} strokeWidth={7} />
      <Rect x={X(gx)} y={Y(gy)} width={2 * g} height={2 * g} fill="none" stroke={ink} strokeWidth={14} />
      <Polygon points={`${X(gx + g)},${Y(gy + g / 2 - a)} ${X(gx + g)},${Y(gy + g / 2 + a)} ${X(gx + g + a * 1.5)},${Y(gy + g / 2)}`} fill={ink} />
      <Polygon points={`${X(gx + g / 2 - a)},${Y(gy + g)} ${X(gx + g / 2 + a)},${Y(gy + g)} ${X(gx + g / 2)},${Y(gy + g + a * 1.5)}`} fill={ink} />
    </Svg>
  );
}
