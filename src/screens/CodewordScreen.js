// Şifreli Bulmaca (Codeword): her harfin yerinde bir sayı; sayının harfini bul.
// Doğru kelimenin harfleri aynı sayılı her kareye işlenir; yanlışsa işlenmez. Kesinleşen kareler silinmez.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import PuzzleGrid from '../components/PuzzleGrid';
import Keyboard from '../components/Keyboard';
import BackBar, { BACK_BAR_HEIGHT } from '../components/BackBar';
import { useGameSession, LoadingPage, GameHeader, HintMenu, useSolvedEffect, useLearnCard, shellStyles } from '../components/GameShell';
import { buildWordModel, cellsOf, cellKey } from '../engine/gridgames';
import { wordStatus } from '../engine/model';
import {
  initCodeword, displayLetter, isLockedCell, isSolved, typeLetter, deleteLetter, nextOpenInWord, revealNumber,
} from '../engine/codewordBoard';
import { codeword, getLevel } from '../engine/session';
import { persist } from '../storage';
import { colors, fonts } from '../theme';

function Board({ session, kind, levelId, onBack, onNext }) {
  const p = session.puzzle;
  const level = getLevel(levelId);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const model = useMemo(() => buildWordModel(p.words.map((x) => ({ ...x, cells: cellsOf(x) }))), [p]);
  const givenNums = useMemo(() => new Set(p.given.map((l) => p.code[l])), [p]);
  const present = useMemo(() => new Set(Object.values(model.solution).map((l) => p.code[l])), [p, model]);

  const [s, setS] = useState(() => initCodeword(p, model, session.entries || {}));
  const firstKey = useMemo(() => Object.keys(model.solution).find((k) => !isLockedCell(p, s, k)) || Object.keys(model.solution)[0], []);
  const [selKey, setSelKey] = useState(firstKey);
  const [dir, setDir] = useState(() => (model.at[firstKey]?.A != null ? 'A' : 'D'));
  const [menu, setMenu] = useState(false);
  const learn = useLearnCard(session);

  useEffect(() => {
    session.entries = { committed: s.committed, cells: s.cells };
    persist();
  }, [s, session]);

  const [sr, sc] = selKey.split(',').map(Number);
  const selNum = p.code[model.solution[selKey]];
  const activeWord = useMemo(() => {
    const at = model.at[selKey] || {};
    const idx = at[dir] ?? at.A ?? at.D;
    return idx == null ? null : model.words[idx];
  }, [model, selKey, dir]);
  const activeKeys = useMemo(() => new Set(activeWord ? activeWord.keys : []), [activeWord]);

  // görünüm: harfler, sayı etiketleri, aynı sayılı kareler, kesinleşenler
  const view = useMemo(() => {
    const letters = {}, labels = {}, same = new Set(), given = {};
    for (const k of Object.keys(model.solution)) {
      const n = p.code[model.solution[k]];
      labels[k] = n;
      const l = displayLetter(p, s, k);
      if (l) letters[k] = l;
      if (n === selNum) same.add(k);
      if (givenNums.has(n)) given[k] = true;
    }
    return { letters, labels, same, given };
  }, [p, model, s, selNum, givenNums]);

  // Henüz kesinleşmemiş ama yazılmış harfler (sayı -> harf); seçili karedeki harf önceliklidir.
  // Alttaki şerit/tabloda gösterilir; doğru olup olmadığını ele vermemek için yeşil yapılmaz.
  const typed = useMemo(() => {
    const t = {};
    const put = (k) => {
      const n = p.code[model.solution[k]];
      if (s.cells[k] && !s.committed[n] && !t[n]) t[n] = s.cells[k];
    };
    if (s.cells[selKey]) put(selKey);
    for (const k of Object.keys(s.cells)) put(k);
    return t;
  }, [p, model, s, selKey]);

  const statuses = useMemo(() => model.words.map((w) => wordStatus(w, view.letters, model.solution)), [model, view]);
  const status = useMemo(() => {
    const rank = { ok: 3, close: 2, bad: 1 };
    const cs = {};
    model.words.forEach((w, i) => {
      if (!statuses[i]) return;
      for (const k of w.keys) if (!cs[k] || rank[statuses[i]] > rank[cs[k]]) cs[k] = statuses[i];
    });
    return cs;
  }, [model, statuses]);

  // Yeni doğrulanan kelimenin Türkçesi (öğrenme)
  const prevOk = useRef(new Set(statuses.map((v, i) => (v === 'ok' ? i : -1)).filter((i) => i >= 0)));
  useEffect(() => {
    statuses.forEach((v, i) => {
      if (v === 'ok' && !prevOk.current.has(i)) {
        prevOk.current.add(i);
        const w = model.words[i];
        learn.showToast(`✓ ${w.answer.toLowerCase()} — ${w.text}`);
      }
    });
  }, [statuses]);

  const solved = isSolved(p, s);
  // bitince modal yok: gizli cümle okunur, oyuncu "Sonraki" ile kendisi geçer
  useSolvedEffect(solved, session, () => codeword.markSolved(kind, levelId));

  const onKey = useCallback(
    (ch) => {
      if (solved || !activeWord) return;
      const r = typeLetter(p, model, s, activeWord, selKey, ch);
      const ns = r.s;
      setS(ns);
      const wordDone = activeWord.keys.every((k) => displayLetter(p, ns, k));
      const wordOk = activeWord.keys.every((k) => isLockedCell(p, ns, k));
      if (wordDone) {
        Haptics.notificationAsync(wordOk ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
      } else Haptics.selectionAsync().catch(() => {});
      if (wordOk) {
        // kelime doğru: kesinleşmemiş karesi olan sıradaki kelimeye geç
        const pos = model.order.indexOf(activeWord.index);
        for (let k = 1; k <= model.order.length; k++) {
          const w = model.words[model.order[(pos + k) % model.order.length]];
          const free = w.keys.find((kk) => !isLockedCell(p, ns, kk));
          if (free) {
            setSelKey(free);
            setDir(w.dir);
            return;
          }
        }
        return;
      }
      setSelKey(nextOpenInWord(p, ns, activeWord, r.key));
    },
    [solved, activeWord, p, model, s, selKey],
  );

  const onDelete = useCallback(() => {
    if (!activeWord) return;
    const r = deleteLetter(p, s, activeWord, selKey);
    setS(r.s);
    setSelKey(r.key);
  }, [activeWord, p, s, selKey]);

  const onTap = (r, c) => {
    const k = cellKey(r, c);
    if (!model.solution[k]) return;
    const at = model.at[k] || {};
    if (k === selKey) {
      if (at.A != null && at.D != null) setDir(dir === 'A' ? 'D' : 'A');
    } else {
      setSelKey(k);
      if (at[dir] == null) setDir(at.A != null ? 'A' : 'D');
    }
  };
  const pickNum = (n) => {
    const k = Object.keys(model.solution).find((kk) => p.code[model.solution[kk]] === n);
    if (k) onTap(...k.split(',').map(Number));
  };

  const keyH = Math.min(46, Math.max(38, height * 0.052));

  // Gizli cümle şeridi: kutu boyutu cümle en fazla 2 satıra sığacak şekilde
  const hidden = p.hidden;
  const hTokens = useMemo(() => (hidden ? hidden.text.toUpperCase().split(' ').filter(Boolean) : []), [hidden]);
  const hBox = useMemo(() => {
    if (!hidden) return 0;
    const avail = width - 24;
    for (let b = 28; b >= 15; b--) {
      let rows = 1, x = 0;
      for (const t of hTokens) {
        const tw = [...t].reduce((a, ch) => a + (/[A-Z]/.test(ch) ? b + 2 : b * 0.4), 0);
        if (x && x + 8 + tw > avail) { rows++; x = tw; } else x += (x ? 8 : 0) + tw;
      }
      if (rows <= 2) return b;
    }
    return 15;
  }, [hidden, hTokens, width]);
  const hiddenH = hidden ? 22 + 2 * (hBox + 10) : 72;
  const reserved = insets.top + insets.bottom + 56 + 26 + hiddenH + keyH * 3 + 12 + BACK_BAR_HEIGHT + 8;
  const size = Math.floor(Math.min((width - 16) / p.w, (height - reserved) / p.h));
  const boxW = Math.floor((width - 16 - 12 * 2) / 13);
  const solvedNums = [...present].filter((n) => s.committed[n]).length;

  return (
    <View style={shellStyles.root}>
      <GameHeader
        insetTop={insets.top}
        session={session}
        running={!solved}
        subtitle={`${kind === 'daily' ? 'Günün Şifreli Bulmacası' : `Şifreli Bulmaca · ${level.id === 'MIX' ? 'Karışık' : level.id}`} · No. ${p.no}`}
        onMenu={() => setMenu(true)}
      />
      <View style={shellStyles.kickerRow}>
        <Text style={[shellStyles.kicker, learn.toast && { color: colors.ink }]} numberOfLines={1}>
          {learn.toast || 'CODEWORD · DOĞRU KELİMENİN HARFLERİ AYNI SAYILI HER KAREYE İŞLENİR'}
        </Text>
      </View>
      <View style={styles.gridWrap}>
        <PuzzleGrid
          w={p.w}
          h={p.h}
          rows={p.rows}
          size={size}
          letters={view.letters}
          labels={view.labels}
          status={status}
          given={view.given}
          sameKeys={view.same}
          activeKeys={activeKeys}
          selected={{ r: sr, c: sc }}
          onTap={onTap}
        />
      </View>

      {hidden ? (
        // Gizli cümle: her harfin sayısı altta; sayılar çözüldükçe cümle ortaya çıkar
        <View style={[styles.hidden, solved && styles.hiddenDone]}>
          <Text style={[styles.hiddenLabel, solved && { color: colors.good }]} numberOfLines={2}>
            {solved
              ? `${hidden.single ? 'GİZLİ KELİME' : 'GİZLİ CÜMLE'} ÇÖZÜLDÜ ✓`
              : `${hidden.single ? 'GİZLİ KELİME' : 'GİZLİ CÜMLE'} · SAYILARI ÇÖZDÜKÇE ORTAYA ÇIKAR`}
          </Text>
          <View style={styles.hiddenRow}>
            {hTokens.map((t, ti) => (
              <View key={ti} style={styles.hiddenWord}>
                {[...t].map((ch, ci) => {
                  if (!/[A-Z]/.test(ch)) {
                    return (
                      <Text key={ci} style={[styles.hiddenPunct, { fontSize: hBox * 0.7, width: hBox * 0.4 }]}>
                        {ch}
                      </Text>
                    );
                  }
                  const n = p.code[ch];
                  // bulmaca bitince cümle mutlaka tam okunsun: harfi doğrudan cümleden yaz
                  const l = solved ? ch : s.committed[n] || typed[n];
                  return (
                    <Pressable
                      key={ci}
                      onPress={() => pickNum(n)}
                      style={[
                        styles.hiddenBox,
                        { width: hBox, height: hBox + 8 },
                        (solved || s.committed[n]) && { backgroundColor: colors.okCell },
                        !s.committed[n] && typed[n] && { backgroundColor: '#FFFFFF' },
                        n === selNum && { backgroundColor: colors.cellActive },
                      ]}
                    >
                      <Text style={styles.keyNum}>{n}</Text>
                      {/* sabit genişlik + tek satır: iOS'ta ince harfler (I) alt satıra kayıp kaybolmasın */}
                      <Text allowFontScaling={false} numberOfLines={1} style={[styles.keyLetter, { fontSize: hBox * 0.55, lineHeight: hBox * 0.72, width: hBox - 2, textAlign: 'center' }]}>
                        {l || ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      ) : (
      /* Anahtar tablosu (eski kayıtlı bulmacalar): 1–26 (yalnızca kesinleşen harfler) */
      <View style={styles.keyTable}>
        {[0, 1].map((row) => (
          <View key={row} style={styles.keyRow}>
            {Array.from({ length: 13 }, (_, i) => row * 13 + i + 1).map((n) => (
              <Pressable
                key={n}
                onPress={() => present.has(n) && pickNum(n)}
                style={[
                  styles.keyBox,
                  { width: boxW },
                  s.committed[n] && { backgroundColor: colors.okCell },
                  n === selNum && { backgroundColor: colors.cellActive },
                  !present.has(n) && { opacity: 0.3 },
                ]}
              >
                <Text style={styles.keyNum}>{n}</Text>
                <Text allowFontScaling={false} numberOfLines={1} style={[styles.keyLetter, { width: boxW - 2, textAlign: 'center', lineHeight: 19 }, givenNums.has(n) && { color: colors.inkSoft }]}>{s.committed[n] || typed[n] || ''}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
      )}

      {solved && hidden ? (
        // Bulmaca bitti: klavye yerine gizli cümle büyük ve okunaklı
        <View style={[styles.doneCard, { height: keyH * 3 + 12 }]}>
          <Text style={styles.doneLabel}>{hidden.single ? 'GİZLİ KELİME' : 'GİZLİ CÜMLE'}</Text>
          <Text style={styles.doneText} numberOfLines={2} adjustsFontSizeToFit>
            {hidden.text}
          </Text>
          <Text style={styles.doneTr} numberOfLines={2}>
            {hidden.tr}
          </Text>
        </View>
      ) : (
        <Keyboard onKey={onKey} onDelete={onDelete} keyHeight={keyH} />
      )}
      <BackBar onPress={onBack} bottomInset={insets.bottom} caption={`${solvedNums}/${present.size} sayı çözüldü`} />

      <HintMenu
        visible={menu}
        onClose={() => setMenu(false)}
        items={[
          ['Harf aç', 'Seçili sayının harfini göster', () => selNum && setS(revealNumber(p, model, s, selNum))],
          ['Kelimeyi temizle', 'Seçili kelimedeki doğrulanmamış harfleri sil', () => {
            if (!activeWord) return;
            const cells = { ...s.cells };
            for (const k of activeWord.keys) delete cells[k];
            setS({ ...s, cells });
          }],
          ['Kelime kartı', `Seçili kelimeyi öğren (kalan hak ${learn.left}/${learn.limit})`, () => activeWord && learn.openLearn(activeWord.answer, activeWord.text)],
          ['Baştan başla', 'Verilenler hariç tüm harfleri sil', () => setS(initCodeword(p, model, {}))],
        ]}
        note="Yazdığın harfler kelime doğru çıkana kadar sadece o kelimede durur. Kelime doğruysa harfleri aynı sayılı her kareye işlenir ve kilitlenir."
      />
      {learn.modal}
      {solved ? (
        <Pressable style={[shellStyles.nextFab, { bottom: insets.bottom + BACK_BAR_HEIGHT + 16 }]} onPress={kind === 'daily' ? onBack : onNext}>
          <Text style={shellStyles.nextFabText}>{kind === 'daily' ? 'Günün bulmacası tamam · Geri dön' : 'Sonraki bulmaca →'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function CodewordScreen({ kind, levelId, onBack }) {
  const { session, error, reload } = useGameSession(codeword, kind, levelId);
  if (!session) return <LoadingPage error={error} onRetry={reload} />;
  return (
    <Board
      key={`${session.puzzle.no}-${session.date || levelId}`}
      session={session}
      kind={kind}
      levelId={kind === 'daily' ? 'MIX' : levelId}
      onBack={onBack}
      onNext={reload}
    />
  );
}

const styles = StyleSheet.create({
  gridWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  keyTable: { paddingHorizontal: 8, marginBottom: 8, gap: 4 },
  keyRow: { flexDirection: 'row', justifyContent: 'center', gap: 2 },
  keyBox: { height: 32, borderWidth: 1, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF9F3' },
  keyNum: { position: 'absolute', top: 1, left: 2, fontFamily: fonts.sansBold, fontSize: 7, color: colors.inkSoft },
  keyLetter: { fontFamily: fonts.letter, fontSize: 15, color: colors.ink, marginTop: 6 },
  hidden: { marginHorizontal: 8, marginBottom: 8, paddingHorizontal: 4, paddingVertical: 4, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: colors.ink },
  hiddenDone: { backgroundColor: '#EEF6EA' },
  hiddenLabel: { fontFamily: fonts.sansBold, fontSize: 10, lineHeight: 14, letterSpacing: 1, color: colors.wrong, marginBottom: 4 },
  hiddenRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 8, rowGap: 4 },
  hiddenWord: { flexDirection: 'row', gap: 2, alignItems: 'flex-end' },
  hiddenBox: { borderWidth: 1, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF9F3' },
  doneCard: { marginHorizontal: 10, paddingHorizontal: 14, paddingTop: 10, alignItems: 'center', borderWidth: 2, borderColor: colors.ink, backgroundColor: '#FBF9F3' },
  doneLabel: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 1.6, color: colors.good },
  doneText: { fontFamily: fonts.serifBold, fontSize: 22, lineHeight: 28, color: colors.ink, textAlign: 'center', marginTop: 4 },
  doneTr: { fontFamily: fonts.serifItalic, fontSize: 15, lineHeight: 20, color: colors.inkSoft, textAlign: 'center', marginTop: 4 },
  hiddenPunct: { fontFamily: fonts.letter, color: colors.ink, textAlign: 'center' },
});
