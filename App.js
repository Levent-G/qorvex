import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';
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
import { Newsreader_600SemiBold, Newsreader_700Bold, Newsreader_500Medium_Italic } from '@expo-google-fonts/newsreader';
import { HankenGrotesk_400Regular, HankenGrotesk_500Medium, HankenGrotesk_600SemiBold, HankenGrotesk_700Bold } from '@expo-google-fonts/hanken-grotesk';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';

import MainTabs from './src/screens/MainTabs';
import Splash from './src/components/Splash';
import PuzzleScreen from './src/screens/PuzzleScreen';
import WordSearchScreen from './src/screens/WordSearchScreen';
import LadderScreen from './src/screens/LadderScreen';
import LevelSelectScreen from './src/screens/LevelSelectScreen';
import GridWordScreen from './src/screens/GridWordScreen';
import CodewordScreen from './src/screens/CodewordScreen';
import JumbleScreen from './src/screens/JumbleScreen';
import CryptogramScreen from './src/screens/CryptogramScreen';
import ReviewScreen from './src/screens/ReviewScreen';
import TimeAttackScreen from './src/screens/TimeAttackScreen';
import PronounceScreen from './src/screens/PronounceScreen';
import BadgeModal from './src/components/BadgeModal';
import { WhatsNewModal, UpdateModal, WHATS_NEW } from './src/components/VersionModals';
import { whatsNewToShow, markWhatsNewSeen, checkStoreUpdate, snoozeUpdate } from './src/appVersion';
import { getGame } from './src/games';
import { loadStore } from './src/storage';
import { refreshStoredClues, getProfile, picture, weekly, checkBadges } from './src/engine/session';
import { ed } from './src/theme';
import { onSettingsChange } from './src/settings';
import { rescheduleReminders } from './src/reminders';

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
    Newsreader_600SemiBold,
    Newsreader_700Bold,
    Newsreader_500Medium_Italic,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  const [ready, setReady] = useState(false);
  // açılış logosu en az bu kadar görünsün (yükleme çok hızlı bitse bile)
  const [splashTime, setSplashTime] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSplashTime(true), 1100);
    return () => clearTimeout(t);
  }, []);
  // Basit yığın tabanlı gezinme
  const [stack, setStack] = useState([{ name: 'home' }]);
  const [tab, setTab] = useState('home');
  // tema / yazı boyutu değişince ekran yeniden kurulsun
  const [ver, setVer] = useState(0);
  useEffect(() => onSettingsChange(() => setVer((v) => v + 1)), []);

  useEffect(() => {
    loadStore().then(() => {
      refreshStoredClues(); // düzeltilmiş Türkçe ipuçları yarım bulmacalara da yansısın
      setReady(true);
    });
  }, []);

  const [newBadges, setNewBadges] = useState(null);
  // sürüm: güncelleyene bir kez 'Yenilikler', App Store'da yeni sürüm varsa uyarı
  const [whatsNew, setWhatsNew] = useState(null);
  const [update, setUpdate] = useState(null);
  useEffect(() => {
    if (!ready) return;
    setWhatsNew(whatsNewToShow(Object.keys(WHATS_NEW)));
    checkStoreUpdate().then(setUpdate);
  }, [ready]);
  // oyundan ana sayfaya dönünce: bugün çözüldüyse bugünkü hatırlatma düşsün
  useEffect(() => {
    if (ready && stack.length === 1) {
      rescheduleReminders();
      const fresh = checkBadges(); // oyundan/alıştırmadan dönünce yeni rozet var mı?
      if (fresh.length) setNewBadges(fresh);
    }
  }, [ready, stack.length]);

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
  const booting = !fontsLoaded || !ready || !splashTime;
  if (booting) {
    screen = <Splash />;
  } else if (route.name === 'home') {
    screen = (
      <MainTabs
        tab={tab}
        onTab={setTab}
        // Oyun doğrudan profil seviyesinde açılır (seviye Profil/Seviyeler sekmesinden değiştirilir)
        onOpenLevels={(gameId) => push({ name: getGame(gameId).route, kind: 'level', levelId: getProfile().level })}
        onOpenDaily={(gameId) => push({ name: getGame(gameId).route, kind: 'daily' })}
        onOpenReview={(source) => push({ name: 'review', source })}
        onOpenRoute={push}
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
  } else if (route.name === 'review') {
    screen = <ReviewScreen source={route.source} mode={route.mode || 'mix'} onBack={pop} />;
  } else if (route.name === 'timeattack') {
    screen = <TimeAttackScreen onBack={pop} />;
  } else if (route.name === 'pronounce') {
    screen = <PronounceScreen onBack={pop} />;
  } else if (route.name === 'weekly') {
    screen = <PuzzleScreen key="weekly" kind="daily" store={weekly} onBack={pop} />;
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
    else if (route.name === 'picture') screen = <PuzzleScreen key={k} store={picture} {...props} />;
  }
  return (
    <SafeAreaProvider>
      <StatusBar style={booting ? 'light' : 'auto'} />
      <View key={ver} style={{ flex: 1, backgroundColor: ed.bg }}>
        {screen}
      </View>
      {booting ? null : whatsNew ? (
        <WhatsNewModal
          version={whatsNew}
          onClose={() => {
            markWhatsNewSeen();
            setWhatsNew(null);
          }}
        />
      ) : newBadges ? (
        <BadgeModal badges={newBadges} onClose={() => setNewBadges(null)} />
      ) : update ? (
        <UpdateModal
          info={update}
          onLater={() => {
            snoozeUpdate(update.version);
            setUpdate(null);
          }}
        />
      ) : null}
    </SafeAreaProvider>
  );
}
