// Gazete teması: kağıt rengi, mürekkep siyahı, gri ipucu kareleri.
export const colors = {
  paper: '#F4F0E6', // gazete kağıdı
  paperDark: '#E9E3D4',
  ink: '#141414',
  inkSoft: '#3A3A3A',
  muted: '#6E6A60',
  rule: '#141414',
  clueCell: '#A8A49A', // koyu ipucu karesi
  clueCellActive: '#3D3A35',
  blankCell: '#A8A49A',
  cell: '#FFFFFF',
  wordHighlight: '#D7E5F3', // seçili kelime (açık mavi)
  cellActive: '#8CB8E6', // seçili kare
  okCell: '#B9DFAA', // doğru kelime (yeşil)
  closeCell: '#F4DE7C', // yakın (sarı)
  badCell: '#EFAFA8', // yanlış (kırmızı)
  wrong: '#B3261E',
  revealed: '#1F4E8C',
  good: '#2E6B34',
};

export const fonts = {
  masthead: 'UnifrakturMaguntia_400Regular',
  serif: 'OldStandardTT_400Regular',
  serifItalic: 'OldStandardTT_400Regular_Italic',
  serifBold: 'OldStandardTT_700Bold',
  sans: 'LibreFranklin_400Regular',
  sansMedium: 'LibreFranklin_500Medium',
  sansBold: 'LibreFranklin_700Bold',
  sansBlack: 'LibreFranklin_900Black',
  letter: 'LibreFranklin_600SemiBold',
  clue: 'ArchivoNarrow_500Medium',
  clueBold: 'ArchivoNarrow_700Bold',
};

export const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
