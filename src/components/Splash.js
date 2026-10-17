// Uygulama açılış ekranı: lacivert zemin üstünde QORVEX logosu (iOS açılış ekranıyla aynı renk, kesintisiz geçiş).
// Logo görsel olduğu için yazı tipleri yüklenmeden de görünür.
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, useWindowDimensions } from 'react-native';

const NAVY = '#18324D'; // app.json splash backgroundColor ile aynı
const LOGO = require('../../assets/brand/qorvex-logo.png'); // 1720 x 560

export default function Splash() {
  const { width } = useWindowDimensions();
  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(lift, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);
  const w = Math.min(width * 0.82, 420);
  return (
    <View style={styles.root}>
      <Animated.Image
        source={LOGO}
        style={{ width: w, height: (w * 560) / 1720, opacity: fade, transform: [{ translateY: lift }] }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
});
