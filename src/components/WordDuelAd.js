import React from 'react';
import { View, Text, Image, Animated, StyleSheet, Pressable } from 'react-native';
import Svg, { Path, Rect, G } from 'react-native-svg';
import { efonts } from '../theme';

// Word Duel tanıtımı (15 sn), video yerine canlı çizilir: scripts/make-ad-wordduel.mjs ile aynı sahneler,
// aynı zamanlama ve 1080×1920'lik sahne koordinatları. Tek bir zaman değeriyle (t, saniye) sürülür;
// bütün animasyonlar opaklık/dönüşüm olduğu için yerel animasyon sürücüsünde çalışır.
export const AD_DURATION = 15;
const W = 1080, H = 1920;
const G_ = '#36B985', G_DARK = '#2A9D70', NAVY = '#202B3C', BG = '#F8FAFC', MUTED = '#758195', SOFT = '#EAF7F1', BOLT = '#FFC94D';

const SHOTS = {
  '01': require('../../assets/ads/wd-shot-01.jpg'),
  '02': require('../../assets/ads/wd-shot-02.jpg'),
  '03': require('../../assets/ads/wd-shot-03.jpg'),
  '04': require('../../assets/ads/wd-shot-04.jpg'),
};

// telefon: 600 genişlikte ekran görüntüsü (1179×2556), 18 çerçeve
const PH_W = 600, PH_H = (600 * 2556) / 1179, BEZ = 18, k = PH_W / 1179;
const PH_LEFT = W / 2 - PH_W / 2 - BEZ, PH_TOP = 430;

// --- zaman eğrileri: kolay kısımlar örneklenip interpolate'e verilir (yerel sürücüyle çalışır)
const curve = {
  out: (x) => 1 - Math.pow(1 - x, 3),
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  back: (x) => 1 + 2.6 * Math.pow(x - 1, 3) + 1.6 * Math.pow(x - 1, 2),
};
const seg = (t, a, b, from, to, fn = curve.out, n = 10) => {
  const inputRange = [], outputRange = [];
  for (let i = 0; i <= n; i++) {
    inputRange.push(a + ((b - a) * i) / n);
    outputRange.push(from + (to - from) * fn(i / n));
  }
  return t.interpolate({ inputRange, outputRange, extrapolate: 'clamp' });
};
// a'da belirir, b'de kaybolur
const life = (t, a, b, fin = 0.35, fout = 0.35) =>
  t.interpolate({ inputRange: [a, a + fin, b - fout, b], outputRange: [0, 1, 1, 0], extrapolate: 'clamp' });

function Mark({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect width="100" height="100" rx="23" fill={G_} />
      <G transform="translate(15 15) scale(0.7)">
        <Path d="M21 6 H55 A13 13 0 0 1 68 19 V42 A13 13 0 0 1 55 55 H30 L16 67 L18 54 A13 13 0 0 1 8 42 V19 A13 13 0 0 1 21 6 Z" fill="#FFFFFF" />
        <Path d="M19 20 L26 39 L33 26.5 L40 39 L47 20" fill="none" stroke={G_} strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M45 45 H79 A13 13 0 0 1 92 58 V81 A13 13 0 0 1 82 93.5 L84 98 L70 94 H45 A13 13 0 0 1 32 81 V58 A13 13 0 0 1 45 45 Z" fill={NAVY} stroke={G_} strokeWidth={5} strokeLinejoin="round" />
        <Path d="M66 53 L54.5 71 H63 L59.5 85 L73.5 65 H65 L69 53 Z" fill={BOLT} />
      </G>
    </Svg>
  );
}

// ortalanmış satır: y = SVG'deki taban çizgisi
const Line = ({ y, size, color, weight = 'bold', children, style }) => (
  <Text
    numberOfLines={1}
    style={[{ position: 'absolute', left: 0, width: W, top: y - size * 1.02, fontSize: size, lineHeight: size * 1.25, color, textAlign: 'center', fontFamily: weight === 'bold' ? efonts.bodyBold : efonts.bodyMedium }, style]}
  >
    {children}
  </Text>
);

function Headline({ t, a, b, l1, l2 }) {
  const opacity = life(t, a, b, 0.4, 0.3);
  const translateY = seg(t, a, a + 0.5, 30, 0);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity, transform: [{ translateY }] }]} pointerEvents="none">
      <Line y={250} size={76} color={NAVY}>{l1}</Line>
      <Line y={320} size={40} color={MUTED} weight="medium">{l2}</Line>
    </Animated.View>
  );
}

function Phone({ t, a, b, children }) {
  const opacity = life(t, a, b, 0.5, 0.4);
  const translateY = seg(t, a, a + 0.7, 120, 0);
  return (
    <Animated.View style={[styles.phone, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.screen}>{children}</View>
    </Animated.View>
  );
}
const Shot = ({ n, opacity }) => <Animated.Image source={SHOTS[n]} style={[StyleSheet.absoluteFill, { width: PH_W, height: PH_H }, opacity != null && { opacity }]} />;

/** Sahne (1080×1920) — ekrana `scale` ile sığdırılır. Arka plan rengini ekranın tamamına çizer. */
export default function WordDuelAd({ t, scale, top = 0, bottom = 0, onStore }) {
  // ---- 3. sahne: "gentle" sorusu, C "nazik" doğru
  const tap = 8.4;
  const fx = PH_LEFT + BEZ + 800 * k, fy = PH_TOP + BEZ + 2102 * k;
  const ok = seg(t, tap + 0.05, tap + 0.3, 0, 1);
  const fingerX = seg(t, 7.4, tap, W + 120 - fx, 0, curve.inOut);
  const fingerY = seg(t, 7.4, tap, 1900 - fy, 0, curve.inOut);
  const press = t.interpolate({ inputRange: [tap - 0.08, tap, tap + 0.15, tap + 0.3], outputRange: [1, 0.88, 0.88, 1], extrapolate: 'clamp' });
  const ripple = seg(t, tap, tap + 0.6, 0.25, 1);
  const rippleO = t.interpolate({ inputRange: [tap - 0.01, tap, tap + 0.6], outputRange: [0, 1, 0], extrapolate: 'clamp' });
  const badge = seg(t, tap + 0.3, tap + 0.8, 0, 1, curve.back);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* açık zemin + açılış/kapanış yeşil zemini (ekranın tamamı) */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: BG }]} />
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: G_, opacity: t.interpolate({ inputRange: [0, 2.3, 2.7, 12.9, 13.4], outputRange: [1, 1, 0, 0, 1], extrapolate: 'clamp' }) }]}
      />
      <View style={[styles.center, { top, bottom }]} pointerEvents="box-none">
        <View style={[styles.stage, { transform: [{ scale }] }]} pointerEvents="box-none">
          {/* yumuşak daireler */}
          <Animated.View style={[styles.blob, { left: 180 - 260, top: 1650 - 260, width: 520, height: 520, borderRadius: 260, opacity: life(t, 2.5, 13.1, 0.5, 0.4) }]} />
          <Animated.View style={[styles.blob, { left: 930 - 200, top: 430 - 200, width: 400, height: 400, borderRadius: 200, opacity: life(t, 2.5, 13.1, 0.5, 0.4) }]} />

          {/* 1) açılış */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: t.interpolate({ inputRange: [2.3, 2.7], outputRange: [1, 0], extrapolate: 'clamp' }) }]} pointerEvents="none">
            <View style={[styles.glow, { left: 540 - 330, top: 820 - 330, width: 660, height: 660, borderRadius: 330 }]} />
            <Animated.View style={{ position: 'absolute', left: 540 - 150, top: 820 - 150, transform: [{ scale: seg(t, 0.1, 0.7, 0, 1, curve.back) }] }}>
              <Mark size={300} />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: seg(t, 0.6, 1.0, 0, 1) }]}>
              <Line y={1120} size={104} color="#FFFFFF">Word Duel</Line>
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: seg(t, 0.9, 1.3, 0, 1) }]}>
              <Line y={1200} size={46} color="rgba(255,255,255,0.92)">İngilizce kelime düellosu</Line>
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: seg(t, 1.2, 1.6, 0, 1) }]}>
              <Line y={1290} size={36} color="rgba(255,255,255,0.78)" weight="medium">Bilen kazanır.</Line>
            </Animated.View>
          </Animated.View>

          {/* 2) eşleşme: rakip aranıyor → rakibin hazır */}
          <Headline t={t} a={2.7} b={6.5} l1="Rakibini bul" l2="Online ya da bota karşı" />
          <Phone t={t} a={2.5} b={6.6}>
            <Shot n="02" />
            <Shot n="03" opacity={seg(t, 4.2, 4.6, 0, 1, curve.inOut)} />
          </Phone>

          {/* 3) soru */}
          <Headline t={t} a={6.5} b={10.7} l1="10 saniyen var" l2="En hızlı doğru cevap kazanır" />
          <Phone t={t} a={6.3} b={10.8}>
            <Shot n="04" />
            <Animated.View style={[styles.option, { opacity: ok }]} />
            <Animated.View style={[styles.check, { opacity: ok }]}>
              <Svg width={88 * k} height={88 * k} viewBox="-44 -44 88 88">
                <Path d="M-18 0 L-5 14 L20 -14" fill="none" stroke="#FFFFFF" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Animated.View>
          </Phone>
          <Animated.View style={[styles.badge, { opacity: life(t, tap + 0.3, 10.7, 0.05, 0.3), transform: [{ scale: badge }] }]}>
            <Text style={styles.badgeText}>+120</Text>
          </Animated.View>
          <Animated.View pointerEvents="none" style={{ position: 'absolute', left: fx - 120, top: fy - 120, width: 240, height: 240, borderRadius: 120, borderWidth: 8, borderColor: G_, opacity: rippleO, transform: [{ scale: ripple }] }} />
          <Animated.View
            pointerEvents="none"
            style={[styles.finger, { left: fx - 46, top: fy - 46, opacity: life(t, 7.3, 10.4, 0.1, 0.3), transform: [{ translateX: fingerX }, { translateY: fingerY }, { scale: press }] }]}
          >
            <View style={styles.fingerDot} />
          </Animated.View>

          {/* 4) ana sayfa */}
          <Headline t={t} a={10.8} b={13.0} l1="Ligde yüksel" l2="Günlük görev · seri · rozetler" />
          <Phone t={t} a={10.6} b={13.1}>
            <Shot n="01" />
          </Phone>

          {/* 5) kapanış */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: seg(t, 12.9, 13.4, 0, 1) }]} pointerEvents="box-none">
            <View style={[styles.glow, { left: 540 - 300, top: 700 - 300, width: 600, height: 600, borderRadius: 300 }]} />
            <Animated.View style={{ position: 'absolute', left: 540 - 130, top: 700 - 130, transform: [{ scale: seg(t, 12.95, 13.5, 0, 1, curve.back) }] }}>
              <Mark size={260} />
            </Animated.View>
            <Line y={960} size={96} color="#FFFFFF">Word Duel</Line>
            <Line y={1040} size={40} color="rgba(255,255,255,0.92)">Kelimelerle düello et, ligde yüksel</Line>
            <Animated.View style={{ position: 'absolute', left: 240, top: 1196, opacity: seg(t, 13.3, 13.8, 0, 1) }}>
              <Pressable onPress={onStore} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}>
                <Text style={styles.ctaText}>App Store'da ücretsiz</Text>
              </Pressable>
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: seg(t, 13.6, 14.1, 0, 1) }]} pointerEvents="none">
              <Line y={1400} size={32} color="rgba(255,255,255,0.82)" weight="medium">Online düello · Haftalık lig · 8.900+ kelime</Line>
            </Animated.View>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  stage: { width: W, height: H },
  blob: { position: 'absolute', backgroundColor: SOFT },
  glow: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.08)' },
  phone: { position: 'absolute', left: PH_LEFT, top: PH_TOP, width: PH_W + BEZ * 2, height: PH_H + BEZ * 2, borderRadius: 78, backgroundColor: '#111827', padding: BEZ },
  screen: { width: PH_W, height: PH_H, borderRadius: 62, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  option: { position: 'absolute', left: 58 * k, top: 2010 * k, width: 1066 * k, height: 185 * k, borderRadius: 30 * k, backgroundColor: 'rgba(54,185,133,0.28)', borderWidth: 4, borderColor: G_ },
  check: { position: 'absolute', left: (1040 - 44) * k, top: (2102 - 44) * k, width: 88 * k, height: 88 * k, borderRadius: 44 * k, backgroundColor: G_, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', left: W / 2 + 200 - 110, top: PH_TOP + BEZ + 880 * k - 46, width: 220, height: 92, borderRadius: 46, backgroundColor: G_, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: efonts.bodyBold, fontSize: 46, color: '#FFFFFF' },
  finger: { position: 'absolute', width: 92, height: 92, borderRadius: 46, backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 3, borderColor: 'rgba(32,43,60,0.25)', alignItems: 'center', justifyContent: 'center' },
  fingerDot: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(32,43,60,0.75)' },
  cta: { width: 600, height: 108, borderRadius: 54, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: efonts.bodyBold, fontSize: 42, color: G_DARK },
});
