// Profil: rozet vitrini (kazanılanlar renkli, kilitliler gri + ilerleme)
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { getBadges } from '../engine/session';
import { ed, efonts } from '../theme';

export default function BadgeShelf() {
  const list = getBadges();
  const [all, setAll] = useState(false);
  const earned = list.filter((b) => b.at).length;
  const shown = all ? list : list.slice(0, 9);
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Rozetler</Text>
          <Text style={styles.sub}>
            {earned}/{list.length} rozet kazanıldı
          </Text>
        </View>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${(earned / list.length) * 100}%` }]} />
        </View>
      </View>
      <View style={styles.grid}>
        {shown.map((b) => (
          <Pressable
            key={b.id}
            style={styles.cell}
            onPress={() =>
              Alert.alert(`${b.emoji} ${b.title}`, b.at ? `${b.desc}\n\nKazanıldı: ${new Date(b.at).toLocaleDateString('tr-TR')}` : `${b.desc}\n\nİlerleme: ${b.cur}/${b.goal}`)
            }
          >
            <View style={[styles.medal, b.at ? styles.medalOn : styles.medalOff]}>
              <Text style={[styles.emoji, !b.at && { opacity: 0.35 }]}>{b.emoji}</Text>
            </View>
            <Text style={[styles.name, !b.at && { color: ed.textMute }]} numberOfLines={2}>
              {b.title}
            </Text>
            {!b.at ? (
              <View style={styles.prog}>
                <View style={[styles.progFill, { width: `${b.progress * 100}%` }]} />
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
      {list.length > 9 ? (
        <Pressable onPress={() => setAll(!all)} hitSlop={6} style={{ alignSelf: 'center', marginTop: 10 }}>
          <Text style={styles.more}>{all ? 'Daha az göster' : `Tümünü gör (${list.length})`}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: ed.surface, borderRadius: 14, borderWidth: 1, borderColor: ed.border, padding: 16, marginTop: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontFamily: efonts.bodyBold, fontSize: 17, color: ed.text },
  sub: { fontFamily: efonts.body, fontSize: 12, color: ed.textSoft, marginTop: 1 },
  bar: { width: 90, height: 6, borderRadius: 3, backgroundColor: ed.surfaceAlt, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: ed.gold, borderRadius: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, rowGap: 14 },
  cell: { width: '33.33%', alignItems: 'center', paddingHorizontal: 4 },
  medal: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  medalOn: { backgroundColor: ed.orangeSoft, borderColor: ed.gold },
  medalOff: { backgroundColor: ed.surfaceAlt, borderColor: ed.border },
  emoji: { fontSize: 26 },
  name: { fontFamily: efonts.labelBold, fontSize: 11, lineHeight: 14, color: ed.text, textAlign: 'center', marginTop: 6 },
  prog: { width: 44, height: 3, borderRadius: 2, backgroundColor: ed.surfaceDim, marginTop: 4, overflow: 'hidden' },
  progFill: { height: '100%', backgroundColor: ed.accent },
  more: { fontFamily: efonts.labelBold, fontSize: 12, color: ed.accent },
});
