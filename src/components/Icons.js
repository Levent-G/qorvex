import React from 'react';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { colors } from '../theme';

// Gazete gravürü tarzı ampul ikonu
export function BulbIcon({ size = 26, color = colors.ink }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2.5a6.5 6.5 0 0 0-3.9 11.7c.7.6 1.1 1.3 1.2 2.1l.1.7h5.2l.1-.7c.1-.8.5-1.5 1.2-2.1A6.5 6.5 0 0 0 12 2.5z"
        fill="#FFF4C2"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path d="M9.6 19h4.8M10.2 21.3h3.6" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M10.3 12.5l1.7-2.3 1.7 2.3" stroke={color} strokeWidth={1.2} fill="none" strokeLinecap="round" />
      <Line x1="12" y1="12.5" x2="12" y2="17" stroke={color} strokeWidth={1.2} />
    </Svg>
  );
}

export function SpeakerIcon({ size = 22, color = colors.ink }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill={color} />
      <Path d="M15 9c1.2 1.6 1.2 4.4 0 6M17.6 6.6c2.6 3 2.6 7.8 0 10.8" stroke={color} strokeWidth={1.7} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

// Fonttan bağımsız ok (‹ ›): gazete fontunda bu karakterler parantez gibi görünüyordu
export function ChevronIcon({ dir = 'right', size = 18, color = colors.ink }) {
  const d = dir === 'left' ? 'M15 4.5 7.5 12 15 19.5' : 'M9 4.5 16.5 12 9 19.5';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={d} stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="square" strokeLinejoin="miter" />
    </Svg>
  );
}

export function BookIcon({ size = 16, color = colors.ink }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 5.5c3-1 6-1 9 1v13c-3-2-6-2-9-1z M21 5.5c-3-1-6-1-9 1v13c3-2 6-2 9-1z" fill="none" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
      <Circle cx="12" cy="6.5" r="0.01" />
    </Svg>
  );
}
