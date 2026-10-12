// Kelime Defteri sekmesi: kartı açılmış kelimeler, arama, tekrar durumu
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, TextInput, StyleSheet } from 'react-native';
import LearnModal from '../../components/LearnModal';
import { SearchIcon, BookOpenIcon, CheckIcon } from '../../components/UiIcons';
import { notebookWords } from '../../engine/session';
import { getWord, LEVEL_NAMES } from '../../engine/words';
import { ui, fonts } from '../../theme';

const FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'new', label: 'Yeni' },
  { id: 'learned', label: 'Öğrenildi' },
];

export default function NotebookTab() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null);
  const all = useMemo(
    () =>
      notebookWords()
        .map((n) => ({ ...n, w: getWord(n.answer) }))
        .filter((n) => n.w),
    [open],
  );
  // 3 kez tekrar karşına çıkan kelime "öğrenildi" sayılır (sonra seyrek gelir)
  const list = all.filter((n) => {
    if (filter === 'new' && n.seen >= 3) return false;
    if (filter === 'learned' && n.seen < 3) return false;
    if (!q) return true;
    const s = q.toLocaleLowerCase('tr-TR');
    return n.answer.toLowerCase().includes(s) || n.w.m.some((m) => m.toLocaleLowerCase('tr-TR').includes(s));
  });
  const learned = all.filter((n) => n.seen >= 3).length;

  return (
    <View style={{ flex: 1, paddingHorizontal: 16 }}>
      <Text style={styles.h1}>Kelime Defterim</Text>
      <Text style={styles.lead}>
        {all.length} kelime · {learned} öğrenildi
      </Text>
      <View style={styles.search}>
        <SearchIcon />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="İngilizce ya da Türkçe ara"
          placeholderTextColor={ui.muted}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable key={f.id} onPress={() => setFilter(f.id)} style={[styles.filter, filter === f.id && styles.filterOn]}>
            <Text style={[styles.filterText, filter === f.id && { color: ui.bg }]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={list}
        keyExtractor={(n) => n.answer}
        contentContainerStyle={{ paddingBottom: 24, gap: 8 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <BookOpenIcon size={40} color={ui.border} />
            <Text style={styles.emptyTitle}>{all.length ? 'Sonuç yok' : 'Defterin henüz boş'}</Text>
            <Text style={styles.emptyText}>
              {all.length
                ? 'Aramayı ya da filtreyi değiştir.'
                : 'Bir bulmacada bilmediğin kelimenin ipucuna iki kez dokun; kelime kartı açılır ve kelime buraya eklenir.'}
            </Text>
          </View>
        }
        renderItem={({ item: n }) => (
          <Pressable onPress={() => setOpen(n.answer)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: ui.cardHi }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.word}>{n.answer.toLowerCase()}</Text>
              <Text style={styles.meaning} numberOfLines={1}>
                {n.w.m.slice(0, 3).join(' · ')}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{LEVEL_NAMES[n.w.l]}</Text>
              </View>
              {n.seen >= 3 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <CheckIcon size={13} />
                  <Text style={styles.seenOk}>öğrenildi</Text>
                </View>
              ) : (
                <Text style={styles.seen}>{n.seen}/3 tekrar</Text>
              )}
            </View>
          </Pressable>
        )}
      />
      {open ? <LearnModal answer={open} clue={getWord(open)?.c} remaining={null} onClose={() => setOpen(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: fonts.sansBlack, fontSize: 28, color: ui.white, marginTop: 6 },
  lead: { fontFamily: fonts.sans, fontSize: 14, color: ui.muted, marginTop: 2 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ui.card, borderRadius: 12,
    paddingHorizontal: 12, marginTop: 14, borderWidth: 1, borderColor: ui.border,
  },
  input: { flex: 1, fontFamily: fonts.sans, fontSize: 15, color: ui.white, paddingVertical: 11 },
  filters: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  filter: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: ui.border },
  filterOn: { backgroundColor: ui.teal, borderColor: ui.teal },
  filterText: { fontFamily: fonts.sansBold, fontSize: 13, color: ui.text },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: ui.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: ui.border },
  word: { fontFamily: fonts.sansBold, fontSize: 18, color: ui.white },
  meaning: { fontFamily: fonts.sans, fontSize: 13.5, color: ui.muted, marginTop: 2 },
  badge: { borderWidth: 1.5, borderColor: ui.teal, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontFamily: fonts.sansBlack, fontSize: 11, color: ui.teal },
  seen: { fontFamily: fonts.sansMedium, fontSize: 11.5, color: ui.muted },
  seenOk: { fontFamily: fonts.sansBold, fontSize: 11.5, color: ui.teal },
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontFamily: fonts.sansBold, fontSize: 17, color: ui.white },
  emptyText: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: ui.muted, textAlign: 'center' },
});
