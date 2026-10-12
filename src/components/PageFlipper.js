import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Animated, View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { ChevronIcon } from './Icons';
import { colors, fonts } from '../theme';

/**
 * Gazete sayfası çevirme efekti.
 * Her sayfa ekranda sabit durur; kaydırdıkça mevcut sayfa sol kenarı (cilt) etrafında
 * 3B döner ve altındaki sayfa ortaya çıkar. Animasyon yerel sürücüde çalışır.
 */
const PageFlipper = forwardRef(function PageFlipper({ pages, labels = [], bottomInset = 0 }, ref) {
  const { width } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const scroller = useRef(null);
  const [index, setIndex] = useState(0);
  const n = pages.length;

  const goTo = (i) => {
    const t = Math.max(0, Math.min(n - 1, i));
    scroller.current?.scrollTo({ x: t * width, animated: true });
  };
  useImperativeHandle(ref, () => ({ goTo }));

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={styles.root}
      >
        {pages.map((render, i) => {
          // p: bu sayfanın çevrilme ilerlemesi (-1 sağda bekliyor, 0 açık, 1 çevrildi)
          const p = scrollX.interpolate({
            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
            outputRange: [-1, 0, 1],
            extrapolate: 'clamp',
          });
          const pin = Animated.multiply(p, width); // sayfayı ekranda sabitle
          const rotate = p.interpolate({ inputRange: [-1, 0, 1], outputRange: ['0deg', '0deg', '-180deg'] });
          // Sabitleme (pin) yalnızca komşu sayfalar için doğru; iki sayfa öteki sayfalar
          // aksi halde ekranın içine kayıp bir an görünüyordu. Onları tamamen gizle.
          const visible = scrollX.interpolate({
            inputRange: [(i - 1) * width - 1, (i - 1) * width, (i + 1) * width, (i + 1) * width + 1],
            outputRange: [0, 1, 1, 0],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={i}
              style={[
                { width, zIndex: n - i, elevation: n - i, backfaceVisibility: 'hidden' },
                {
                  opacity: visible,
                  transform: [
                    { perspective: 1600 },
                    { translateX: pin },
                    { translateX: -width / 2 },
                    { rotateY: rotate },
                    { translateX: width / 2 },
                  ],
                },
              ]}
            >
              <View style={styles.page}>
                {render({ active: index === i, goTo })}
              </View>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>

      {/* Alt bar: sayfa numarası ve çevirme düğmeleri */}
      <View style={[styles.footer, { paddingBottom: bottomInset + 6 }]}>
        <Pressable onPress={() => goTo(index - 1)} hitSlop={12} style={[styles.navBtn, index === 0 && { opacity: 0.25 }]}>
          <ChevronIcon dir="left" size={18} />
        </Pressable>
        <View style={styles.footerMid}>
          <Text style={styles.pageNo}>
            SAYFA {index + 1} / {n}
          </Text>
          <Text style={styles.pageLabel} numberOfLines={1}>
            {labels[index] || ''}
          </Text>
        </View>
        <Pressable onPress={() => goTo(index + 1)} hitSlop={12} style={[styles.navBtn, index === n - 1 && { opacity: 0.25 }]}>
          <ChevronIcon dir="right" size={18} />
        </Pressable>
      </View>
    </View>
  );
});

export default PageFlipper;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  page: { flex: 1, backgroundColor: colors.paper, overflow: 'hidden', backfaceVisibility: 'hidden' },
  footer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.paper,
    borderTopWidth: 2, borderColor: colors.ink, paddingTop: 6, paddingHorizontal: 12,
  },
  navBtn: { width: 40, height: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.ink },
  footerMid: { flex: 1, alignItems: 'center' },
  pageNo: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 2, color: colors.ink },
  pageLabel: { fontFamily: fonts.serifItalic, fontSize: 12, lineHeight: 16, color: colors.muted },
});
