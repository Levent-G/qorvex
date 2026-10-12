// Arayüz ikonları (sekme çubuğu, başlık, kartlar) — react-native-svg ile çizilir.
import React from 'react';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { ui } from '../theme';

const base = (size) => ({ width: size, height: size, viewBox: '0 0 24 24' });

export function HomeIcon({ size = 24, color = ui.muted, filled }) {
  return (
    <Svg {...base(size)}>
      <Path d="M3.5 11 12 4l8.5 7v8.5a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z" fill={filled ? color : 'none'} stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}
export function GamepadIcon({ size = 24, color = ui.muted }) {
  return (
    <Svg {...base(size)}>
      <Path d="M7 8h10a4.5 4.5 0 0 1 4.3 5.8l-1 3.3a2.4 2.4 0 0 1-4 .9L14.5 16h-5L7.7 18a2.4 2.4 0 0 1-4-.9l-1-3.3A4.5 4.5 0 0 1 7 8z" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M7.5 11v4M5.5 13h4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx="15.5" cy="12" r="1.1" fill={color} />
      <Circle cx="17.8" cy="14.2" r="1.1" fill={color} />
    </Svg>
  );
}
export function BookOpenIcon({ size = 24, color = ui.muted }) {
  return (
    <Svg {...base(size)}>
      <Path d="M3 5.5c3-1 6-1 9 1v13c-3-2-6-2-9-1zM21 5.5c-3-1-6-1-9 1v13c3-2 6-2 9-1z" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}
export function BarsIcon({ size = 24, color = ui.muted }) {
  return (
    <Svg {...base(size)}>
      <Rect x="4" y="12" width="3.5" height="8" rx="1" fill="none" stroke={color} strokeWidth={1.8} />
      <Rect x="10.25" y="7" width="3.5" height="13" rx="1" fill="none" stroke={color} strokeWidth={1.8} />
      <Rect x="16.5" y="3.5" width="3.5" height="16.5" rx="1" fill="none" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}
export function PersonIcon({ size = 24, color = ui.muted }) {
  return (
    <Svg {...base(size)}>
      <Circle cx="12" cy="8.5" r="4" fill="none" stroke={color} strokeWidth={1.8} />
      <Path d="M4.5 20.5c1.2-3.8 4.2-5.6 7.5-5.6s6.3 1.8 7.5 5.6" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
export function MenuIcon({ size = 24, color = ui.teal }) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 7h16M4 12h16M4 17h16" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}
export function FlameIcon({ size = 20, color = ui.flame }) {
  return (
    <Svg {...base(size)}>
      <Path d="M12 2.5c.5 3.2 4.5 5.4 4.5 10a4.5 4.5 0 0 1-9 0c0-2.4 1.3-3.9 2.4-5 .2 1.5 1 2.4 1.9 2.8-.4-2.7.2-5.4.2-7.8z" fill={color} />
      <Path d="M12 21a3.6 3.6 0 0 1-3.6-3.6c0-1.6.9-2.6 1.7-3.4.2 1 .8 1.6 1.4 1.9-.2-1.3.1-2.6.5-3.6 1.2 1.3 3.6 2.7 3.6 5.1A3.6 3.6 0 0 1 12 21z" fill="#FFD27A" />
    </Svg>
  );
}
export function ChevronRight({ size = 18, color = ui.teal }) {
  return (
    <Svg {...base(size)}>
      <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
export function ArrowRight({ size = 18, color = ui.white }) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 12h15M13 6l6 6-6 6" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
export function SearchIcon({ size = 18, color = ui.muted }) {
  return (
    <Svg {...base(size)}>
      <Circle cx="10.5" cy="10.5" r="6" fill="none" stroke={color} strokeWidth={2} />
      <Line x1="15" y1="15" x2="20" y2="20" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}
export function TrophyIcon({ size = 20, color = ui.gold }) {
  return (
    <Svg {...base(size)}>
      <Path d="M7 4h10v4a5 5 0 0 1-10 0z" fill={color} />
      <Path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 3.4M17 6h2.5a2.5 2.5 0 0 1-2.6 3.4" stroke={color} strokeWidth={1.8} fill="none" />
      <Path d="M10.5 13h3v3.5h2.5V19h-8v-2.5h2.5z" fill={color} />
    </Svg>
  );
}
export function CheckIcon({ size = 16, color = ui.teal }) {
  return (
    <Svg {...base(size)}>
      <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
