// Kelime Defteri sekmesi — "Kelime Defterim" ("Editorial Intellect" tasarımı)
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, TextInput, StyleSheet, Alert } from 'react-native';
import LearnModal from '../../components/LearnModal';
import { PageTitle } from '../../components/TabChrome';
import { SearchIcon, BookOpenIcon, CloseCircleIcon, BookmarkIcon, BadgeCheckIcon, ClockIcon } from '../../components/UiIcons';
import { SpeakerIcon } from '../../components/Icons';
import { notebookWords, removeFromNotebook, hardWords } from '../../engine/session';
import { getWord, LEVEL_NAMES, posTr } from '../../engine/words';
import { speakWord } from '../../speech';
import { ed, efonts } from '../../theme';

// seviye rozeti renkleri
const LEVEL_TAG = [
  { bg: '#E3F4F9', fg: '#08657D' },
  { bg: '#D3EEF6', fg: '#08657D' },
  { bg: '#BFE6F1', fg: '#08576B' },
  { bg: '#A9DCEB', fg: '#074B5C' },
  { bg: '#FDE7D6', fg: '#B5520D' },
  { bg: '#18324D', fg: '#FFFFFF' },
];

// tekrar durumu: 3 kez karşına çıkınca "öğrenildi"
const statusOf = (n) =>
  n.seen >= 3
    ? { label: 'Öğrenildi', bg: ed.goodSoft, fg: ed.good }
    : n.seen >= 1
      ? { label: 'Pekiştiriliyor', bg: ed.accentSoft, fg: ed.accentInk }
      : { label: 'Yeni', bg: ed.orangeSoft, fg: ed.orange };

// zor kelimenin neden zor sayıldığı (kısa özet)
const hardReason = (h) =>
  [h.hint && `${h.hint} ipucu`, h.miss && `${h.miss} hatalı yazım`, h.quiz && `${h.quiz} tekrarda yanlış`, h.card && `${h.card} kart`]
    .filter(Boolean)
    .join(' · ') || 'Zorlandığın kelime';

export default function NotebookTab({ onOpenReview }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [open, setOpen] = useState(null);
  const [rev, setRev] = useState(0);
  const all = useMemo(
    () =>
      notebookWords()
        .map((n) => ({ ...n, w: getWord(n.answer) }))
        .filter((n) => n.w),
    [open, rev],
  );
  // zor kelimeler: ipucu alınan / yanlış yazılan / testte bilinemeyen (defterde olmasa da)
  const hard = useMemo(() => {
    const inBook = new Map(all.map((n) => [n.answer, n]));
    return hardWords()
      .map((h) => ({ ...(inBook.get(h.answer) || { answer: h.answer, seen: 0, at: h.at }), w: getWord(h.answer), hard: h, inBook: inBook.has(h.answer) }))
      .filter((n) => n.w);
  }, [all]);
  const counts = { all: all.length, new: all.filter((n) => n.seen < 3).length, learned: all.filter((n) => n.seen >= 3).length, hard: hard.length };
  const FILTERS = [
    { id: 'all', label: 'Tümü' },
    { id: 'new', label: 'Yeni' },
    { id: 'learned', label: 'Öğrenildi' },
    { id: 'hard', label: 'Zor' },
  ];
  const list = (filter === 'hard' ? hard : all)
    .filter((n) => {
      if (filter === 'new' && n.seen >= 3) return false;
      if (filter === 'learned' && n.seen < 3) return false;
      if (!q) return true;
      const s = q.toLocaleLowerCase('tr-TR');
      return n.answer.toLowerCase().includes(s) || n.w.m.some((m) => m.toLocaleLowerCase('tr-TR').includes(s));
    })
    .sort((a, b) => (sort === 'alpha' ? a.answer.localeCompare(b.answer) : filter === 'hard' ? 0 : b.at - a.at));

  const askRemove = (n) =>
    Alert.alert('Defterden çıkarılsın mı?', `"${n.answer.toLowerCase()}" artık tekrar için gelmeyecek.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkar',
        style: 'destructive',
        onPress: () => {
          removeFromNotebook(n.answer);
          setRev((x) => x + 1);
        },
      },
    ]);

  const header = (
    <View>
      <PageTitle
        kicker="KİŞİSEL SÖZLÜK ARŞİVİ"
        title="Kelime Defterim"
        sub="Bulmacalarda karşılaştığın ve pekiştirdiğin İngilizce kelimeler."
        right={
          <View style={styles.headIcon}>
            <BookOpenIcon size={20} color={ed.primary} />
          </View>
        }
      />
      {/* tekrar modu girişi */}
      <View style={styles.practice}>
        <Text style={styles.practiceKicker}>KELİME HAFIZA KARTLARI</Text>
        <Text style={styles.practiceTitle}>Defterini 10 soruda tekrar et</Text>
        <Text style={styles.practiceSub}>Türkçesini gör, İngilizcesini seç. Bildiklerin "öğrenildi"ye ilerler, bilemediklerin zor kelimelerine düşer.</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Pressable style={({ pressed }) => [styles.practiceBtn, pressed && { opacity: 0.85 }]} onPress={() => onOpenReview?.('notebook')}>
            <Text style={styles.practiceBtnText}>Pratik Yap</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.practiceBtn, styles.practiceBtnAlt, pressed && { opacity: 0.85 }]} onPress={() => onOpenReview?.('hard')}>
            <Text style={[styles.practiceBtnText, { color: ed.primary }]}>Zor kelimeler ({hard.length})</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.search}>
        <SearchIcon size={18} color={ed.textSoft} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="İngilizce ya da Türkçe ara..."
          placeholderTextColor={ed.textMute}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {q ? (
          <Pressable onPress={() => setQ('')} hitSlop={8}>
            <CloseCircleIcon size={18} color={ed.textSoft} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const on = filter === f.id;
          return (
            <Pressable key={f.id} onPress={() => setFilter(f.id)} style={[styles.filter, on && styles.filterOn]}>
              <Text style={[styles.filterText, on && { color: ed.onPrimary }]}>{f.label}</Text>
              <View style={[styles.count, on && { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <Text style={[styles.countText, on && { color: ed.onPrimary }]}>{counts[f.id]}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.listHead}>
        <BookOpenIcon size={15} color={ed.accent} />
        <Text style={styles.listHeadText}>Toplam {list.length} Kelime</Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => setSort(sort === 'alpha' ? 'recent' : 'alpha')} style={styles.sortBtn} hitSlop={6}>
          <Text style={styles.sortText}>Sırala: {sort === 'alpha' ? 'Alfabetik' : 'Son eklenen'} ▾</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={list}
        keyExtractor={(n) => n.answer}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, gap: 10 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.empty}>
            <BookOpenIcon size={40} color={ed.textMute} />
            <Text style={styles.emptyTitle}>{filter === 'hard' && !hard.length ? 'Zor kelimen yok' : all.length ? 'Sonuç yok' : 'Defterin henüz boş'}</Text>
            <Text style={styles.emptyText}>
              {filter === 'hard' && !hard.length ? 'İpucu aldığın, yanlış yazdığın ya da tekrarda bilemediğin kelimeler burada birikir.' : all.length ? 'Aramayı ya da filtreyi değiştir.' :'Bir bulmacada bilmediğin kelimenin ipucuna iki kez dokun; kelime kartı açılır ve kelime buraya eklenir.'}
            </Text>
          </View>
        }
        renderItem={({ item: n }) => {
          const tag = LEVEL_TAG[n.w.l] || LEVEL_TAG[0];
          const st = statusOf(n);
          const word = n.answer.charAt(0) + n.answer.slice(1).toLowerCase();
          return (
            <Pressable onPress={() => setOpen(n.answer)} style={({ pressed }) => [styles.card, pressed && { backgroundColor: ed.surfaceAlt }]}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.word}>{word}</Text>
                    <View style={[styles.lvl, { backgroundColor: tag.bg }]}>
                      <Text style={[styles.lvlText, { color: tag.fg }]}>{LEVEL_NAMES[n.w.l]}</Text>
                    </View>
                  </View>
                  <Text style={styles.pos}>
                    {n.w.ipa ? <Text style={styles.ipa}>/{n.w.ipa}/  ·  </Text> : null}
                    {posTr(n.w.p)} ({n.w.p})
                  </Text>
                </View>
                <Pressable onPress={() => speakWord(n.answer, 0.85)} hitSlop={6} style={styles.iconBtn}>
                  <SpeakerIcon size={18} color={ed.primary} />
                </Pressable>
                {n.inBook === false ? null : (
                  <Pressable onPress={() => askRemove(n)} hitSlop={6} style={styles.iconBtnPlain}>
                    <BookmarkIcon size={18} color={ed.primary} filled />
                  </Pressable>
                )}
              </View>
              <View style={styles.meaningBox}>
                <Text style={styles.meaning}>{n.w.m.slice(0, 4).join(', ')}</Text>
              </View>
              {n.hard ? (
                <View style={styles.cardFoot}>
                  <Text style={styles.footText}>{hardReason(n.hard)}</Text>
                  <View style={{ flex: 1 }} />
                  <View style={[styles.status, { backgroundColor: ed.dangerSoft }]}>
                    <Text style={[styles.statusText, { color: ed.danger }]}>Zor</Text>
                  </View>
                </View>
              ) : (
              <View style={styles.cardFoot}>
                {n.seen >= 3 ? <BadgeCheckIcon size={14} color={ed.textSoft} /> : <ClockIcon size={14} color={ed.textSoft} />}
                <Text style={styles.footText}>{n.seen ? `${n.seen} kez tekrar edildi` : 'Henüz tekrar edilmedi'}</Text>
                <View style={{ flex: 1 }} />
                <View style={[styles.status, { backgroundColor: st.bg }]}>
                  <Text style={[styles.statusText, { color: st.fg }]}>{st.label}</Text>
                </View>
              </View>
              )}
            </Pressable>
          );
        }}
      />
      {open ? <LearnModal answer={open} clue={getWord(open)?.c} remaining={null} onClose={() => setOpen(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: ed.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  practice: { backgroundColor: ed.primary, borderRadius: 16, padding: 16, marginTop: 14 },
  practiceKicker: { fontFamily: efonts.labelBold, fontSize: 10.5, letterSpacing: 1.4, color: '#8FD3E6' },
  practiceTitle: { fontFamily: efonts.headlineBold, fontSize: 21, lineHeight: 27, color: '#FFFFFF', marginTop: 4 },
  practiceSub: { fontFamily: efonts.body, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.78)', marginTop: 4 },
  practiceBtn: { flex: 1, backgroundColor: ed.orange, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  practiceBtnAlt: { backgroundColor: '#FFFFFF' },
  practiceBtnText: { fontFamily: efonts.bodyBold, fontSize: 14, color: '#FFFFFF' },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ed.surface, borderRadius: 12,
    paddingHorizontal: 12, marginTop: 14, borderWidth: 1, borderColor: ed.border,
  },
  input: { flex: 1, fontFamily: efonts.body, fontSize: 15, color: ed.text, paddingVertical: 12 },
  filters: { flexDirection: 'row', gap: 8, marginTop: 12 },
  filter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 6, paddingVertical: 6, borderRadius: 18, backgroundColor: ed.surfaceAlt },
  filterOn: { backgroundColor: ed.primary },
  filterText: { fontFamily: efonts.labelBold, fontSize: 12, color: ed.textSoft },
  count: { backgroundColor: ed.surfaceDim, borderRadius: 9, paddingHorizontal: 6, paddingVertical: 1 },
  countText: { fontFamily: efonts.labelBold, fontSize: 10.5, color: ed.textSoft },
  listHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, marginBottom: 2 },
  listHeadText: { fontFamily: efonts.labelBold, fontSize: 12.5, color: ed.text },
  sortBtn: { backgroundColor: ed.surface, borderWidth: 1, borderColor: ed.border, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  sortText: { fontFamily: efonts.labelBold, fontSize: 11, color: ed.text },
  card: { backgroundColor: ed.surface, borderRadius: 14, borderWidth: 1, borderColor: ed.border, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  word: { fontFamily: efonts.bodyBold, fontSize: 19, color: ed.primary },
  lvl: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1 },
  lvlText: { fontFamily: efonts.labelBold, fontSize: 10.5 },
  pos: { fontFamily: efonts.label, fontSize: 11.5, color: ed.textSoft, marginTop: 2 },
  ipa: { fontFamily: undefined, fontSize: 12.5, color: ed.accentInk },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: ed.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  iconBtnPlain: { width: 30, height: 36, alignItems: 'center', justifyContent: 'center' },
  meaningBox: { backgroundColor: ed.surfaceAlt, borderRadius: 8, padding: 10, marginTop: 10 },
  meaning: { fontFamily: efonts.body, fontSize: 14, lineHeight: 20, color: ed.text },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  footText: { fontFamily: efonts.label, fontSize: 11.5, color: ed.textSoft },
  status: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  statusText: { fontFamily: efonts.labelBold, fontSize: 11 },
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontFamily: efonts.headlineBold, fontSize: 19, color: ed.text },
  emptyText: { fontFamily: efonts.body, fontSize: 14, lineHeight: 20, color: ed.textSoft, textAlign: 'center' },
});
