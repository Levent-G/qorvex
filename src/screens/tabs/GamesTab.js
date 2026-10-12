// Oyunlar sekmesi: tüm bulmacalar kart ızgarasında
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import GameIcon from '../../components/GameIcon';
import { SectionTitle } from '../../components/TabChrome';
import { GAMES, gameTotals } from '../../games';
import { ui, fonts } from '../../theme';

export default function GamesTab({ onOpenLevels }) {
  const { width } = useWindowDimensions();
  const cardW = (width - 32 - 12) / 2;
  const section = (title, sub, list) => (
    <>
      <SectionTitle title={title} />
      <Text style={styles.sub}>{sub}</Text>
      <View style={styles.grid}>
        {list.map((g) => {
          const t = gameTotals(g);
          return (
            <Pressable key={g.id} onPress={() => onOpenLevels(g.id)} style={({ pressed }) => [styles.card, { width: cardW }, pressed && { backgroundColor: ui.cardHi }]}>
              <View style={styles.cardTop}>
                <GameIcon id={g.id} size={56} />
                {t.inProgress ? <View style={styles.dot} /> : null}
              </View>
              <Text style={styles.title}>{g.title}</Text>
              <Text style={styles.tag} numberOfLines={2}>
                {g.tagline}
              </Text>
              <Text style={styles.meta}>{t.solved} çözüldü{t.inProgress ? ` · ${t.inProgress} yarım` : ''}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>Oyunlar</Text>
      <Text style={styles.lead}>İpuçları Türkçe, cevaplar İngilizce. Bir oyun seç, seviyeni belirle.</Text>
      {section('Türk Gazetelerinden', 'Çengel, kare, şifreli ve sarmal bulmacalar', GAMES.filter((g) => g.origin === 'tr'))}
      {section('İngiliz & Amerikan', 'Word search, word ladder, jumble, cryptogram', GAMES.filter((g) => g.origin === 'en'))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: fonts.sansBlack, fontSize: 28, color: ui.white, marginTop: 6 },
  lead: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: ui.muted, marginTop: 4 },
  sub: { fontFamily: fonts.sans, fontSize: 12.5, color: ui.muted, marginTop: -6, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { backgroundColor: ui.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: ui.border, gap: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: ui.flame },
  title: { fontFamily: fonts.sansBold, fontSize: 15.5, color: ui.white },
  tag: { fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 17, color: ui.muted },
  meta: { fontFamily: fonts.sansBold, fontSize: 11.5, color: ui.tealSoft, marginTop: 6 },
});
