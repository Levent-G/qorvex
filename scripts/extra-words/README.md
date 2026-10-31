# Ek kelimeler (`scripts/extra-words/*.json`)

`scripts/build-words.mjs` bu dosyaları ana listeye ekler. Her kayıt: `{ a, l, p, c, m: [...], ex: [[en, tr]] }`.
İpucu (`c`) en fazla 18 karakter; Türkçe anlamlar, ipuçları ve örnek cümleler elle yazıldı.

| Dosya | Kaynak |
|---|---|
| 01–03 | [Openjam](https://github.com/amirj4m/openjam) aday listesi (MIT) |
| 04-duzensiz-fiiller | Düzensiz fiillerin 2./3. halleri (genel dilbilgisi bilgisi) |
| 05-duzensiz-cogullar | Düzensiz çoğullar ve karşılaştırmalar |
| 10-cefr | Kelime ve seviye: **CEFR-J Wordlist 1.5** ve **Octanove Vocabulary Profile C1/C2**; Türkçe ipucu: **Vikisözlük** çeviri tabloları; örnek cümle: **Tatoeba** |
| 06–09 (ngsl-*) | Kelime seçimi ve sıklık sırası: **New General Service List 1.2 / NGSL sıklık listesi (31K)** |

## Atıf (CC BY-SA 4.0)

06–09 numaralı dosyalardaki kelimeler, Browne, C., Culligan, B. ve Phillips, J. tarafından hazırlanan
[New General Service List](https://www.newgeneralservicelist.com/) sıklık verilerinden seçilmiştir.
NGSL, [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/)
lisansıyla yayımlanmaktadır. Seviye bandı (B2/C1/C2) NGSL sıklık sırasına göre verilmiş, günlük somut kelimeler B1'e alınmıştır.
Bu klasördeki seçim ve eklenen Türkçe içerik de aynı lisansla (CC BY-SA 4.0) paylaşılır.

## 10-cefr.json — kaynaklar ve atıf

- **CEFR-J Wordlist Version 1.5.** Compiled by Yukio Tono, Tokyo University of Foreign Studies (http://www.cefr-j.org/).
  Atıfla araştırma ve ticari kullanım ücretsizdir. Veri: [olp-en-cefrj](https://github.com/openlanguageprofiles/olp-en-cefrj).
- **Octanove Vocabulary Profile C1/C2 (ver 1.0)**, Octanove Labs — [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- Türkçe karşılıklar: **İngilizce Vikisözlük** (Wiktionary) çeviri tabloları, [kaikki.org](https://kaikki.org/) dökümü üzerinden — CC BY-SA.
- Örnek cümleler ve Türkçeleri: **[Tatoeba](https://tatoeba.org/)** — CC BY 2.0 FR.

Seçim kuralı: kelimenin Vikisözlük'teki ilk anlamının Türkçe çevirisi, aynı kelimeyi içeren kısa bir Tatoeba cümlesinin
Türkçesinde de geçiyorsa (doğrulanmış) alındı; argo, hakaret ve hassas kelimeler elle çıkarıldı.
Bu dosyadaki derleme de CC BY-SA 4.0 ile paylaşılır.
