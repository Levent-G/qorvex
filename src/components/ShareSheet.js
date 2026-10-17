// Sonuç paylaşma: önce sonuç kartının görseli gösterilir, "Paylaş" ile bu görsel (PNG) paylaşılır.
// Kart renkleri sabit (marka laciverti): koyu/açık temadan bağımsız aynı görünür.
import React, { useRef, useState } from 'react';
import { View, Text, Pressable, Modal, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { getStore } from '../storage';
import { formatTime, efonts } from '../theme';
import { shareResult } from '../share';

const NAVY = '#18324D';
const CREAM = '#F5EFE3';
const TEAL = '#19B5C2';
const ORANGE = '#F37216';
const LOGO = require('../../assets/brand/qorvex-logo.png');

function Stat({ icon, value, label }) {
  return (
    <View style={card.stat}>
      <Text style={card.statIcon}>{icon}</Text>
      <Text style={card.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={card.statLabel}>{label}</Text>
    </View>
  );
}

// Paylaşılan görselin kendisi
export function ResultCard({ info }) {
  const streak = getStore().stats?.streak || 0;
  const stats = [];
  if (info.seconds > 0) stats.push(['⏱', formatTime(info.seconds), 'SÜRE']);
  if (info.words) stats.push(['📝', String(info.words), 'KELİME']);
  if (info.hints != null && info.seconds > 0) stats.push(info.hints ? ['💡', typeof info.hints === 'number' ? String(info.hints) : '✓', 'İPUCU'] : ['✨', '0', 'İPUCU']);
  if (streak > 1) stats.push(['🔥', String(streak), 'GÜN SERİ']);
  return (
    <View style={card.root} collapsable={false}>
      <Image source={LOGO} style={card.logo} resizeMode="contain" />
      <View style={card.rule} />
      <Text style={card.kicker}>{info.kicker || 'BULMACA ÇÖZÜLDÜ'}</Text>
      <Text style={card.title}>{info.title}</Text>
      {stats.length ? (
        <View style={card.stats}>
          {stats.slice(0, 4).map(([i, v, l]) => (
            <Stat key={l} icon={i} value={v} label={l} />
          ))}
        </View>
      ) : null}
      {info.line ? <Text style={card.line}>{info.line}</Text> : null}
      <Text style={card.foot}>İngilizce kelimeleri bulmacayla öğren · #QORVEX</Text>
    </View>
  );
}

export default function ShareSheet({ info, onClose }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const share = async () => {
    setBusy(true);
    try {
      const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Sonucunu paylaş' });
      } else {
        await shareResult(info); // görsel paylaşım yoksa metne düş
      }
    } catch {
      await shareResult(info);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={sheet.backdrop}>
        <View ref={ref} collapsable={false} style={sheet.shot}>
          <ResultCard info={info} />
        </View>
        <View style={sheet.actions}>
          <Pressable style={[sheet.btn, sheet.btnGhost]} onPress={onClose}>
            <Text style={[sheet.btnText, { color: '#FFFFFF' }]}>Kapat</Text>
          </Pressable>
          <Pressable style={[sheet.btn, busy && { opacity: 0.7 }]} onPress={share} disabled={busy}>
            {busy ? <ActivityIndicator color={NAVY} /> : <Text style={sheet.btnText}>Paylaş</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// düz nesne (StyleSheet.create değil): yazı boyutu ayarı paylaşılan görseli etkilemesin
const card = {
  root: { width: 320, backgroundColor: NAVY, borderRadius: 22, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 18, alignItems: 'center' },
  logo: { width: 200, height: 65 },
  rule: { width: 46, height: 3, borderRadius: 2, backgroundColor: ORANGE, marginTop: 12 },
  kicker: { fontFamily: efonts.labelBold, fontSize: 11, letterSpacing: 2, color: ORANGE, marginTop: 14 },
  title: { fontFamily: efonts.headlineBold, fontSize: 24, lineHeight: 30, color: CREAM, textAlign: 'center', marginTop: 4 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 16, alignSelf: 'stretch' },
  stat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  statIcon: { fontSize: 18 },
  statValue: { fontFamily: efonts.headlineBold, fontSize: 22, lineHeight: 27, color: '#FFFFFF', marginTop: 2 },
  statLabel: { fontFamily: efonts.labelBold, fontSize: 8.5, letterSpacing: 1, color: TEAL, marginTop: 1 },
  line: { fontFamily: efonts.bodySemi, fontSize: 14, lineHeight: 20, color: CREAM, textAlign: 'center', marginTop: 14 },
  foot: { fontFamily: efonts.label, fontSize: 10.5, color: 'rgba(245,239,227,0.6)', marginTop: 16 },
};

const sheet = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(8,14,22,0.82)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  shot: { borderRadius: 22, overflow: 'hidden', backgroundColor: NAVY },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18, width: 320 },
  btn: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnGhost: { backgroundColor: 'rgba(255,255,255,0.14)' },
  btnText: { fontFamily: efonts.bodyBold, fontSize: 15, color: NAVY },
});
