// Boş kare dolgusu: öğrenilecek kelimeler yerleştikten sonra hâlâ boş kalan köşeler için kısa kelimeler.
// Kaynak: sözlükteki 2–4 harfli kelimeler (tekrar kuralı yüzünden havuz dışında kalsalar da) + aşağıdaki ek liste.
// Dolgu kelimeleri öğrenme istatistiğine / tekrar takibine sayılmaz (clue.filler).

// Sözlükte olmayan kısa kelimeler ve yaygın kısaltmalar (Türkçe ipucuyla)
export const EXTRA_FILLERS = [
  ['AM', 'Sabah (öğleden önce)'],
  ['PM', 'Öğleden sonra'],
  ['AN', 'Bir (sesliden önce)'],
  ['IS', '"Olmak" (o, -dir)'],
  ['ARE', '"Olmak" (biz, siz)'],
  ['WAS', '"Olmak" (geçmiş)'],
  ['HAS', 'Sahip (o)'],
  ['HAD', 'Sahipti'],
  ['DID', 'Yaptı'],
  ['GOT', 'Aldı, edindi'],
  ['SAW', 'Gördü'],
  ['RAN', 'Koştu'],
  ['SAT', 'Oturdu'],
  ['ATE', 'Yedi'],
  ['WON', 'Kazandı'],
  ['MET', 'Tanıştı'],
  ['LED', 'Yönetti'],
  ['FED', 'Besledi'],
  ['OX', 'Öküz'],
  ['PI', 'Pi sayısı'],
  ['HA', 'Gülme sesi'],
  ['AH', 'Ah! (ünlem)'],
  ['UK', 'Birleşik Krallık'],
  ['EU', 'Avrupa Birliği'],
  ['UN', 'Birleşmiş Milletler'],
  ['USA', 'Amerika Birleşik Devletleri'],
  ['CEO', 'Genel müdür'],
  ['DNA', 'Kalıtım molekülü'],
  ['PC', 'Kişisel bilgisayar'],
  ['DJ', 'Disk jokey'],
  ['ID', 'Kimlik'],
  ['IQ', 'Zekâ bölümü'],
  ['VIP', 'Çok önemli kişi'],
  ['ATM', 'Bankamatik'],
  ['GPS', 'Konum sistemi'],
  ['SMS', 'Kısa mesaj'],
  ['PIN', 'Şifre numarası'],
  ['FAQ', 'Sık sorulan sorular'],
  ['ETC', 'Vesaire'],
  ['MR', 'Bay'],
  ['MRS', 'Bayan (evli)'],
  ['MS', 'Bayan'],
  ['DR', 'Doktor (kısaltma)'],
  ['ST', 'Sokak (kısaltma)'],
  ['KM', 'Kilometre'],
  ['KG', 'Kilogram'],
  ['CM', 'Santimetre'],
  ['MM', 'Milimetre'],
  ['AD', 'Milattan sonra'],
  ['BC', 'Milattan önce'],
  ['TEA', 'Çay'],
  ['SEA', 'Deniz'],
  ['SUN', 'Güneş'],
  ['ODD', 'Tuhaf; tek (sayı)'],
  ['OIL', 'Yağ'],
  ['OWL', 'Baykuş'],
  ['ANT', 'Karınca'],
  ['APE', 'Maymun'],
  ['EEL', 'Yılan balığı'],
  ['ELK', 'Geyik'],
  ['EMU', 'Emu kuşu'],
  ['ORE', 'Maden cevheri'],
  ['ART', 'Sanat'],
  ['ERA', 'Çağ, devir'],
  ['ICY', 'Buzlu'],
  ['IDEA', 'Fikir'],
  ['AREA', 'Alan'],
  ['ECHO', 'Yankı'],
  ['OBOE', 'Obua'],
  ['ALOE', 'Sarısabır'],
  ['IRIS', 'Süsen çiçeği'],
  ['OPERA', 'Opera'],
];

const okWord = (a) => /^[A-Z]{2,5}$/.test(a);

// Generator'a verilecek dolgu listesi: kısa sözlük kelimeleri + ek liste (yinelenenler ayıklanır)
export function fillerEntries(words, maxLen = 4) {
  const out = [];
  const seen = new Set();
  for (const w of words) {
    if (w.a.length < 2 || w.a.length > maxLen || !okWord(w.a) || seen.has(w.a)) continue;
    seen.add(w.a);
    out.push({ a: w.a, c: w.c, filler: true });
  }
  for (const [a, c] of EXTRA_FILLERS) {
    if (a.length > maxLen || !okWord(a) || seen.has(a)) continue;
    seen.add(a);
    out.push({ a, c, filler: true });
  }
  return out;
}
