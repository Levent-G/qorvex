import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { UnifrakturMaguntia_400Regular } from '@expo-google-fonts/unifrakturmaguntia';
import {
  LibreFranklin_400Regular,
  LibreFranklin_500Medium,
  LibreFranklin_600SemiBold,
  LibreFranklin_700Bold,
  LibreFranklin_900Black,
} from '@expo-google-fonts/libre-franklin';
import {
  OldStandardTT_400Regular,
  OldStandardTT_400Regular_Italic,
  OldStandardTT_700Bold,
} from '@expo-google-fonts/old-standard-tt';
import { ArchivoNarrow_500Medium, ArchivoNarrow_700Bold } from '@expo-google-fonts/archivo-narrow';

import HomeScreen from './src/screens/HomeScreen';
import PuzzleScreen from './src/screens/PuzzleScreen';
import { loadStore } from './src/storage';
import { colors } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    UnifrakturMaguntia_400Regular,
    LibreFranklin_400Regular,
    LibreFranklin_500Medium,
    LibreFranklin_600SemiBold,
    LibreFranklin_700Bold,
    LibreFranklin_900Black,
    OldStandardTT_400Regular,
    OldStandardTT_400Regular_Italic,
    OldStandardTT_700Bold,
    ArchivoNarrow_500Medium,
    ArchivoNarrow_700Bold,
  });
  const [ready, setReady] = useState(false);
  // Basit yığın tabanlı gezinme
  const [stack, setStack] = useState([{ name: 'home' }]);

  useEffect(() => {
    loadStore().then(() => setReady(true));
  }, []);

  const push = useCallback((route) => setStack((s) => [...s, route]), []);
  const pop = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) {
        pop();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack, pop]);

  const route = stack[stack.length - 1];
  let screen = null;
  if (!fontsLoaded || !ready) {
    screen = (
      <View style={{ flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  } else if (route.name === 'home') {
    screen = (
      <HomeScreen
        onOpenDaily={() => push({ name: 'puzzle', kind: 'daily' })}
        onOpenLevel={(id) => push({ name: 'puzzle', kind: 'level', levelId: id })}
      />
    );
  } else if (route.name === 'puzzle') {
    screen = <PuzzleScreen key={route.kind + (route.levelId || '')} kind={route.kind} levelId={route.levelId} onBack={pop} />;
  }
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {screen}
    </SafeAreaProvider>
  );
}
