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

import MainTabs from './src/screens/MainTabs';
import PuzzleScreen from './src/screens/PuzzleScreen';
import WordSearchScreen from './src/screens/WordSearchScreen';
import LadderScreen from './src/screens/LadderScreen';
import LevelSelectScreen from './src/screens/LevelSelectScreen';
import GridWordScreen from './src/screens/GridWordScreen';
import CodewordScreen from './src/screens/CodewordScreen';
import JumbleScreen from './src/screens/JumbleScreen';
import CryptogramScreen from './src/screens/CryptogramScreen';
import PictureScreen from './src/screens/PictureScreen';
import { getGame } from './src/games';
import { loadStore } from './src/storage';
import { refreshStoredClues, getProfile } from './src/engine/session';
import { ui } from './src/theme';

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
  const [tab, setTab] = useState('home');

  useEffect(() => {
    loadStore().then(() => {
      refreshStoredClues(); // düzeltilmiş Türkçe ipuçları yarım bulmacalara da yansısın
      setReady(true);
    });
  }, []);

  const push = useCallback((route) => setStack((s) => [...s, route]), []);
  const pop = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) {
        pop();
        return true;
      }
      if (tab !== 'home') {
        setTab('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack, pop, tab]);

  const route = stack[stack.length - 1];
  let screen = null;
  if (!fontsLoaded || !ready) {
    screen = (
      <View style={{ flex: 1, backgroundColor: ui.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={ui.teal} />
      </View>
    );
  } else if (route.name === 'home') {
    screen = (
      <MainTabs
        tab={tab}
        onTab={setTab}
        // Oyun doğrudan profil seviyesinde açılır (seviye Profil/Seviyeler sekmesinden değiştirilir)
        onOpenLevels={(gameId) => push({ name: getGame(gameId).route, kind: 'level', levelId: getProfile().level })}
        onOpenDaily={(gameId) => push({ name: getGame(gameId).route, kind: 'daily' })}
      />
    );
  } else if (route.name === 'levels') {
    const game = getGame(route.gameId);
    screen = (
      <LevelSelectScreen
        gameId={route.gameId}
        onBack={pop}
        onPlay={(levelId) => push({ name: game.route, kind: 'level', levelId })}
        onDaily={() => push({ name: game.route, kind: 'daily' })}
      />
    );
  } else if (route.name === 'puzzle') {
    screen = <PuzzleScreen key={route.kind + (route.levelId || '')} kind={route.kind} levelId={route.levelId} onBack={pop} />;
  } else if (route.name === 'wordsearch') {
    screen = <WordSearchScreen key={'ws' + route.kind + (route.levelId || '')} kind={route.kind} levelId={route.levelId} onBack={pop} />;
  } else if (route.name === 'ladder') {
    screen = <LadderScreen key={'ld' + route.kind + (route.levelId || '')} kind={route.kind} levelId={route.levelId} onBack={pop} />;
  } else {
    // Yeni oyunlar: rota adı -> ekran
    const k = route.name + route.kind + (route.levelId || '');
    const props = { kind: route.kind, levelId: route.levelId, onBack: pop };
    if (route.name === 'crossword') screen = <GridWordScreen key={k} variant="crossword" {...props} />;
    else if (route.name === 'spiral') screen = <GridWordScreen key={k} variant="spiral" {...props} />;
    else if (route.name === 'codeword') screen = <CodewordScreen key={k} {...props} />;
    else if (route.name === 'jumble') screen = <JumbleScreen key={k} {...props} />;
    else if (route.name === 'cryptogram') screen = <CryptogramScreen key={k} {...props} />;
    else if (route.name === 'picture') screen = <PictureScreen key={k} {...props} />;
  }
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {screen}
    </SafeAreaProvider>
  );
}
