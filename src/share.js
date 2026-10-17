// Sonuç paylaşma: Wordle tarzı kısa metin (sistem paylaşım menüsü)
import { Share } from 'react-native';
import { getStore } from './storage';
import { formatTime } from './theme';

/**
 * title: "Çengel Bulmaca · A1 · No. 12" gibi; seconds: çözüm süresi;
 * words: kelime sayısı (yoksa yazılmaz); hints: açılan harf sayısı ya da true/false; line: oyuna özel ek satır
 */
export function resultText({ title, seconds, words, hints, line }) {
  const streak = getStore().stats?.streak || 0;
  const clean = !hints;
  const rows = [
    `QORVEX 🧩 ${title}`,
    [seconds > 0 && `⏱ ${formatTime(seconds)}`, words && `📝 ${words} kelime`, clean ? '✨ ipucusuz' : `💡 ${typeof hints === 'number' ? hints + ' ipucu' : 'ipuculu'}`]
      .filter(Boolean)
      .join('  '),
    line,
    streak > 1 ? `🔥 ${streak} günlük seri` : null,
    '',
    'Sen de İngilizce kelimeleri bulmacayla öğren #QORVEX',
  ];
  return rows.filter((r) => r != null).join('\n');
}

export function shareResult(info) {
  return Share.share({ message: resultText(info) }).catch(() => {});
}
