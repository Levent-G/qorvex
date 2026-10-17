// "Yenilikler" ekranı (güncelleyen kullanıcıya sürüm başına bir kez) ve "Yeni sürüm var" uyarısı
import React from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { openStorePage } from '../appVersion';
import { ed, efonts } from '../theme';

// Sürüm notları (yeni sürümde en üste ekle)
export const WHATS_NEW = {
  '1.2.0': [
    ['🎨', 'Yepyeni tasarım', 'Daha ferah, okunaklı bir görünüm. Kelime kartı artık alttan açılıyor ve kelimeyi sesli okuyor.'],
    ['🃏', 'Kelime tekrar modu', 'Defterini 10 soruda tekrar et: Türkçe→İngilizce, İngilizce→Türkçe, dinle-seç, yaz ve cümlede boşluk doldur.'],
    ['🔥', 'Zor kelimeler', 'İpucu aldığın ya da yanlış yazdığın kelimeler ayrı bir listede birikir, onları özel olarak çalışırsın.'],
    ['☀️', 'Günün kelimesi', 'Her gün ana sayfada okunuşu ve örnek cümlesiyle yeni bir kelime.'],
    ['🏆', 'Haftalık meydan okuma', 'Her hafta bir üst seviyeden büyük bir bulmaca. Bitirene özel rozet!'],
    ['⏱️', 'Zamana karşı', '60 saniyede kaç kelime bilebilirsin? Rekorunu kır.'],
    ['🎤', 'Telaffuz alıştırması', 'Kelimeyi söyle, telefon doğru söyleyip söylemediğini kontrol etsin.'],
    ['🎖️', 'Rozetler', '23 rozet seni bekliyor: seriler, ipucusuz çözümler, öğrenilen kelimeler ve daha fazlası.'],
    ['🔔', 'Günlük hatırlatma', 'Seçtiğin saatte hatırlatma; o gün zaten çözdüysen rahatsız etmez.'],
    ['📤', 'Sonuç paylaşma', 'Bulmacayı bitirince sonucunu arkadaşlarınla paylaş.'],
    ['🌙', 'Koyu mod ve büyük yazı', 'Profil > Ayarlar bölümünden görünümü ve yazı boyutunu seç.'],
  ],
};

export function WhatsNewModal({ version, onClose }) {
  const insets = useSafeAreaInsets();
  const items = WHATS_NEW[version] || [];
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.page, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.kicker}>SÜRÜM {version} · YENİLİKLER</Text>
        <Text style={styles.title}>QORVEX'te neler yeni?</Text>
        <Text style={styles.sub}>Güncellediğin için teşekkürler! İşte bu sürümde seni bekleyenler:</Text>
        <ScrollView style={{ flex: 1, marginTop: 14 }} contentContainerStyle={{ gap: 10, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
          {items.map(([emoji, head, body]) => (
            <View key={head} style={styles.item}>
              <View style={styles.emojiBox}>
                <Text style={styles.emoji}>{emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemHead}>{head}</Text>
                <Text style={styles.itemBody}>{body}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        <Pressable style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]} onPress={onClose}>
          <Text style={styles.btnText}>Hadi başlayalım</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

export function UpdateModal({ info, onLater }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onLater}>
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <Text style={styles.boxEmoji}>🚀</Text>
          <Text style={styles.kickerC}>YENİ SÜRÜM {info.version}</Text>
          <Text style={styles.boxTitle}>Güncelleme hazır</Text>
          <Text style={styles.boxBody} numberOfLines={6}>
            {info.notes ? info.notes.trim() : 'QORVEX’in yeni sürümü App Store’da. Yeni özellikler ve iyileştirmeler için güncelle.'}
          </Text>
          <Pressable
            style={styles.btn}
            onPress={() => {
              openStorePage();
              onLater();
            }}
          >
            <Text style={styles.btnText}>Şimdi güncelle</Text>
          </Pressable>
          <Pressable onPress={onLater} hitSlop={8} style={{ marginTop: 12 }}>
            <Text style={styles.later}>Sonra hatırlat</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: ed.bg, paddingHorizontal: 20 },
  kicker: { fontFamily: efonts.labelBold, fontSize: 11, letterSpacing: 1.6, color: ed.orange },
  kickerC: { fontFamily: efonts.labelBold, fontSize: 11, letterSpacing: 1.6, color: ed.orange, textAlign: 'center', marginTop: 6 },
  title: { fontFamily: efonts.headlineBold, fontSize: 32, lineHeight: 38, color: ed.text, marginTop: 6 },
  sub: { fontFamily: efonts.body, fontSize: 14.5, lineHeight: 21, color: ed.textSoft, marginTop: 6 },
  item: { flexDirection: 'row', gap: 12, backgroundColor: ed.surface, borderRadius: 14, borderWidth: 1, borderColor: ed.border, padding: 13 },
  emojiBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: ed.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 22 },
  itemHead: { fontFamily: efonts.bodyBold, fontSize: 15.5, color: ed.text },
  itemBody: { fontFamily: efonts.body, fontSize: 13, lineHeight: 18.5, color: ed.textSoft, marginTop: 2 },
  btn: { alignSelf: 'stretch', backgroundColor: ed.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  btnText: { fontFamily: efonts.bodyBold, fontSize: 15.5, color: ed.onPrimary },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,27,38,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: { width: '100%', maxWidth: 360, backgroundColor: ed.surface, borderRadius: 20, padding: 22, alignItems: 'center' },
  boxEmoji: { fontSize: 44 },
  boxTitle: { fontFamily: efonts.headlineBold, fontSize: 26, lineHeight: 32, color: ed.text, marginTop: 2 },
  boxBody: { fontFamily: efonts.body, fontSize: 14, lineHeight: 20, color: ed.textSoft, textAlign: 'center', marginTop: 8 },
  later: { fontFamily: efonts.labelBold, fontSize: 12.5, color: ed.textSoft },
});
