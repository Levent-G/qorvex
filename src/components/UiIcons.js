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
// --- "Editorial" tasarım ikonları ---
export function GridIcon({ size = 24, color = ui.muted }) {
  return (
    <Svg {...base(size)}>
      <Rect x="4" y="4" width="6.5" height="6.5" rx="1.5" fill="none" stroke={color} strokeWidth={1.8} />
      <Rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" fill="none" stroke={color} strokeWidth={1.8} />
      <Rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" fill="none" stroke={color} strokeWidth={1.8} />
      <Rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" fill="none" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}
export function ChartIcon({ size = 24, color = ui.muted, filled }) {
  return (
    <Svg {...base(size)}>
      <Rect x="4" y="12" width="3.6" height="8" rx="1" fill={filled ? color : 'none'} stroke={color} strokeWidth={1.8} />
      <Rect x="10.2" y="6" width="3.6" height="14" rx="1" fill={filled ? color : 'none'} stroke={color} strokeWidth={1.8} />
      <Rect x="16.4" y="9" width="3.6" height="11" rx="1" fill={filled ? color : 'none'} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}
export function ClockIcon({ size = 18, color = ui.muted }) {
  return (
    <Svg {...base(size)}>
      <Circle cx="12" cy="13" r="7.5" fill="none" stroke={color} strokeWidth={1.9} />
      <Path d="M12 9v4.3l2.8 1.8M9.5 3h5" stroke={color} strokeWidth={1.9} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
export function BoltIcon({ size = 14, color = ui.teal }) {
  return (
    <Svg {...base(size)}>
      <Path d="M13.5 2.5 5 13.5h6l-1.5 8 8.5-11h-6z" fill={color} />
    </Svg>
  );
}
export function BadgeCheckIcon({ size = 18, color = ui.teal }) {
  return (
    <Svg {...base(size)}>
      <Circle cx="12" cy="12" r="8.5" fill="none" stroke={color} strokeWidth={1.9} />
      <Path d="M8.3 12.3l2.5 2.5 5-5.3" stroke={color} strokeWidth={2.1} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
export function BookmarkIcon({ size = 18, color = ui.muted, filled }) {
  return (
    <Svg {...base(size)}>
      <Path d="M7 3.5h10a1 1 0 0 1 1 1v16l-6-4-6 4v-16a1 1 0 0 1 1-1z" fill={filled ? color : 'none'} stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}
export function LockIcon({ size = 16, color = ui.muted }) {
  return (
    <Svg {...base(size)}>
      <Rect x="5" y="10.5" width="14" height="10" rx="2" fill="none" stroke={color} strokeWidth={1.8} />
      <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke={color} strokeWidth={1.8} fill="none" />
    </Svg>
  );
}
export function PlayIcon({ size = 14, color = '#FFFFFF' }) {
  return (
    <Svg {...base(size)}>
      <Path d="M8 5.5v13l10-6.5z" fill={color} />
    </Svg>
  );
}
export function CloseCircleIcon({ size = 18, color = ui.muted }) {
  return (
    <Svg {...base(size)}>
      <Circle cx="12" cy="12" r="8.5" fill="none" stroke={color} strokeWidth={1.8} />
      <Path d="M9 9l6 6M15 9l-6 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
export function TrendIcon({ size = 14, color = ui.teal }) {
  return (
    <Svg {...base(size)}>
      <Path d="M3 17l6-6 4 4 7-7M15 8h5v5" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
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
export function ShareIcon({ size = 18, color = ui.muted }) {
  return (
    <Svg {...base(size)}>
      <Path d="M12 3.5v11M7.5 8 12 3.5 16.5 8" stroke={color} strokeWidth={1.9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 12.5v6a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-6" stroke={color} strokeWidth={1.9} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
export function BellIcon({ size = 18, color = ui.muted }) {
  return (
    <Svg {...base(size)}>
      <Path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
      <Path d="M10 20.5a2.2 2.2 0 0 0 4 0" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
export function MoonIcon({ size = 18, color = ui.muted }) {
  return (
    <Svg {...base(size)}>
      <Path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
    </Svg>
  );
}
export function TextSizeIcon({ size = 18, color = ui.muted }) {
  return (
    <Svg {...base(size)}>
      <Path d="M3 19 8 6l5 13M4.8 14.5h6.4M14 19l3.5-8.5L21 19M15.1 16.3h4.8" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}export function MicIcon({ size = 18, color = ui.muted }) {
  return (
    <Svg {...base(size)}>
      <Rect x="9" y="3" width="6" height="11" rx="3" stroke={color} strokeWidth={1.9} fill="none" />
      <Path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" stroke={color} strokeWidth={1.9} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
export function SunIcon({ size = 18, color = ui.muted }) {
  return (
    <Svg {...base(size)}>
      <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={1.9} fill="none" />
      <Path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}