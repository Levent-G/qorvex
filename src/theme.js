import { DynamicColorIOS } from 'react-native';

// Gazete teması: kağıt rengi, mürekkep siyahı, gri ipucu kareleri.
export const colors = {
  paper: '#FAF8F5', // zemin (Editorial)
  paperDark: '#F2EFEA',
  ink: '#141414',
  inkSoft: '#3A3A3A',
  muted: '#6E6A60',
  rule: '#141414',
  clueCell: '#E9E5DD', // ipucu karesi: açık gri
  clueCellActive: '#C6DCEC', // seçili ipucu: açık mavi-gri (yazı koyu kalır)
  deadCell: '#F1EEE9', // kullanılmayan kare: açık zemin + ince tarama
  deadHatch: '#D5CFC5',
  gridLine: '#CFCAC0', // ızgara çizgileri
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
  block: '#18324D', // kare bulmaca siyah kareleri
  frame: '#A9A296', // ızgara dış çerçevesi
  bulb: '#18324D', // seçili ipucundaki ampul
  sameCell: '#FCE3CF', // aynı numaralı kareler
  photoClue: '#F37216', // resimli bulmacada "Resimdeki nesne" ipucu karesi (hemen göze çarpsın)
  photoClueText: '#FFFFFF',
};

// "Puzzle Club" arayüz paleti: lacivert zemin, turkuaz vurgu, krem kartlar (uygulama kabuğu)
export const ui = {
  bg: '#0B1D33', // ana lacivert
  bgDeep: '#081628',
  card: '#112A45', // koyu kart
  cardHi: '#16365A',
  border: '#1F4468',
  teal: '#19B5C2',
  tealDeep: '#0E8E99',
  tealSoft: '#7FD8E0',
  cream: '#F4EFE2',
  creamInk: '#152238',
  white: '#FFFFFF',
  text: '#E8F0F7',
  muted: '#8FA7BE',
  flame: '#FF7A3D',
  gold: '#F2C14E',
};

// "Editorial Intellect" tasarımı: açık zemin, lacivert ana renk, turkuaz ikincil, turuncu vurgu
export const ed = {
  bg: '#FAF8F5', // nötr zemin (sıcak beyaz)
  surface: '#FFFFFF', // kart
  surfaceAlt: '#F2EFEA', // kart içi kutu / basılı / gri hap
  surfaceDim: '#ECE9E3', // klavye paneli, pasif
  border: '#E8E4DD',
  text: '#141B26', // ana metin
  textSoft: '#5F6672', // ikincil metin
  textMute: '#9AA0A8',
  primary: '#18324D', // lacivert: ana düğme, koyu kart
  primaryDeep: '#0F2238',
  onPrimary: '#FFFFFF',
  accent: '#0B7C99', // turkuaz (ikincil): bağlantı, vurgulu sayı, düğme
  accentStrong: '#0E6680', // "Hemen Çöz" düğmesi
  accentSoft: '#DDF3F9', // açık turkuaz zemin (rozet, banner)
  accentInk: '#08657D',
  orange: '#F37216', // üçüncül: "Popüler", seri, uyarı rozeti
  orangeSoft: '#FDE7D6',
  gold: '#F2B33D',
  danger: '#C2362C',
  good: '#2E7D4F',
  goodSoft: '#E1F2E7',
  goodLine: '#BFE0CB',
  accentLine: '#BFE6F1', // açık turkuaz kenar / dolgu
  dangerSoft: '#FBE3E0',
  dangerLine: '#F2C2BC',
  frame: '#A9A296',
  noteBg: '#EEF4FB',
  revealHi: '#D3CFC5', // ipucuyla açılan kelimenin işareti
};

// Koyu tema: açılışta (ekran modülleri yüklenmeden) applyTheme ile token nesnelerinin üstüne yazılır
const DARK_COLORS = {
  paper: '#0F1720', paperDark: '#17212C', ink: '#ECEFF3', inkSoft: '#C9CED6', muted: '#97A0AB', rule: '#ECEFF3',
  clueCell: '#243140', clueCellActive: '#2F5274', deadCell: '#121A23', deadHatch: '#253140', gridLine: '#3A4654',
  blankCell: '#4A5563', cell: '#1A2430', wordHighlight: '#213A52', cellActive: '#2F6496', okCell: '#24512F',
  closeCell: '#5E4C12', badCell: '#5E2723', wrong: '#FF8A80', revealed: '#8DBBF2', good: '#7DD08A',
  block: '#060A0F', frame: '#3E4A58', bulb: '#F2B33D', sameCell: '#4A2F18', photoClue: '#FF8A3D', photoClueText: '#FFFFFF',
};
const DARK_ED = {
  bg: '#0F1720', surface: '#17212C', surfaceAlt: '#202B38', surfaceDim: '#141D27', border: '#2A3644',
  text: '#E9EEF3', textSoft: '#A5AFBB', textMute: '#6E7987', primary: '#356A9C', primaryDeep: '#244D74', onPrimary: '#FFFFFF',
  accent: '#3CB4D2', accentStrong: '#1E8FAD', accentSoft: '#12333F', accentInk: '#7FD3E8', orange: '#FF8A3D', orangeSoft: '#3A2414',
  gold: '#F2B33D', danger: '#F0645A', good: '#5CC48A', goodSoft: '#16301F', goodLine: '#2B5A3A', accentLine: '#1F5466',
  dangerSoft: '#3A1D1B', dangerLine: '#6B302B', frame: '#3E4A58', noteBg: '#1B2A3A', revealHi: '#3A4654',
};
const LIGHT_COLORS = { ...colors };
const LIGHT_ED = { ...ed };
export const themeState = { dynamic: false, dark: false };
// iOS: her token açık/koyu çifti olan dinamik renk (sistem ya da Appearance.setColorScheme seçer)
export function installDynamicTheme() {
  for (const k in DARK_COLORS) colors[k] = DynamicColorIOS({ light: LIGHT_COLORS[k], dark: DARK_COLORS[k] });
  for (const k in DARK_ED) ed[k] = DynamicColorIOS({ light: LIGHT_ED[k], dark: DARK_ED[k] });
  themeState.dynamic = true;
}
// Android: açılışta (ekranlar yüklenmeden) sabit palet seçilir
export function applyStaticTheme(dark) {
  themeState.dark = !!dark;
  Object.assign(colors, dark ? DARK_COLORS : LIGHT_COLORS);
  Object.assign(ed, dark ? DARK_ED : LIGHT_ED);
}

export const efonts = {
  headline: 'Newsreader_600SemiBold', // serif başlıklar
  headlineBold: 'Newsreader_700Bold',
  headlineItalic: 'Newsreader_500Medium_Italic',
  body: 'HankenGrotesk_400Regular',
  bodyMedium: 'HankenGrotesk_500Medium',
  bodySemi: 'HankenGrotesk_600SemiBold',
  bodyBold: 'HankenGrotesk_700Bold',
  label: 'SpaceGrotesk_500Medium', // büyük harfli küçük etiketler
  labelBold: 'SpaceGrotesk_700Bold',
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
