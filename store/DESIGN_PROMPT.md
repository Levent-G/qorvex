Sen deneyimli bir mobil oyun ve ürün tasarımcısısın. Aşağıda anlattığım iOS uygulaması için yüksek kaliteli, tutarlı bir arayüz tasarımı istiyorum. Önce ürünü, kitleyi ve mevcut ekranları anlatıyorum; en sonda senden ne beklediğimi yazdım.

## Ürün

**QORVEX** (slogan: "THINK · SOLVE · LEARN"), Türkçe konuşanların İngilizce kelime öğrenmesi için gazete bulmacası oyunları sunan bir iPhone uygulaması. Temel fikir: ipuçları Türkçe, cevaplar İngilizce. Oyuncu bulmaca çözerken farkında olmadan kelime dağarcığını büyütür.

- App Store'da yayında (sürüm 1.1). Yalnızca iPhone, yalnızca dikey ekran.
- React Native (Expo) ile yazıldı; tasarım standart mobil bileşenlerle uygulanabilir olmalı (özel fontlar, SVG ikonlar, basit animasyonlar uygun; 3D veya ağır efektler değil).
- Hesap yok, internet gerekmez (Resimli Bulmaca hariç); tüm ilerleme cihazda saklanır.
- Ücretsiz, reklamsız.

## Amaç

1. Kelime öğrenmeyi ders gibi değil, gazete bulmacası çözme keyfi gibi hissettirmek.
2. Bilinmeyen kelimeyi yakalayıp akılda tutmak: bulmacadaki her Türkçe ipucuna dokununca bir "kelime kartı" açılır (anlam, örnek cümle, sesli okunuş); kart açılan kelime "Kelime Defteri"ne girer ve aralıklı tekrarla ileriki bulmacalarda geri gelir. Öğrenilmeyen kelimeler tekrar gelmez.
3. Her gün geri gelme alışkanlığı: Günün Bulmacası, günlük seri, seviye ilerlemesi, istatistikler.

## Hedef kitle

- Birincil: 16–40 yaş, Türkçe ana dilli, İngilizcesini geliştirmek isteyen öğrenciler ve genç profesyoneller (A1'den C2'ye CEFR seviyeleri).
- İkincil: gazete bulmacası (çengel bulmaca) seven, telefonda kısa sürede zihin egzersizi yapmak isteyen yetişkinler.
- Kullanım anı: otobüste, kahve molasında, yatmadan önce — 3–10 dakikalık oturumlar, tek elle.
- Beklenti: sakin, şık, "akıllı" hissettiren; çocukça veya oyun-casino havasında olmayan bir arayüz.

## Görsel kimlik (mevcut)

İki katmanlı bir dil var ve bu ayrım korunmalı:

**1) Uygulama kabuğu ("Puzzle Club"):** lacivert zemin, turkuaz vurgu, krem kartlar.
- Zemin `#0B1D33`, derin zemin `#081628`, kart `#112A45`, kart basılı `#16365A`, çizgi `#1F4468`
- Vurgu turkuaz `#19B5C2` (koyu `#0E8E99`, açık `#7FD8E0`)
- Krem kart `#F4EFE2` üzerine lacivert yazı `#152238`
- Metin `#E8F0F7`, ikincil metin `#8FA7BE`, seri/alev turuncu `#FF7A3D`, kupa/altın `#F2C14E`
- Yazı tipi: Libre Franklin (400/500/700/900). Logo yazısı Libre Franklin Black, geniş harf aralığı.

**2) Oyun ekranları ("gazete sayfası"):** kağıt, mürekkep, gri ipucu kareleri — gerçek bir gazete bulmacası hissi.
- Kağıt `#F4F0E6`, koyu kağıt `#E9E3D4`, mürekkep `#141414`
- Harf karesi beyaz; ipucu karesi gazete grisi `#A8A49A`; seçili ipucu `#3D3A35` (beyaz yazı); kullanılmayan kare koyu sıcak gri `#6F6A62` üzerine ince çapraz tarama
- Seçili kelime açık mavi `#D7E5F3`, seçili kare `#8CB8E6`
- Kelime durumu: doğru yeşil `#B9DFAA`, yakın sarı `#F4DE7C`, yanlış kırmızı `#EFAFA8`
- Yazı tipleri: harfler Libre Franklin SemiBold (büyük, kareyi dolduran), ipuçları Archivo Narrow (dar, küçük), başlık/kart metinleri Old Standard TT (klasik gazete serifi)
- Oyun ekranının üst ve alt barları uygulama kabuğunun lacivert-turkuaz renginde; ortası kağıt.

**Logo:** Krem renkli büyük bir "Q" halkası; halkanın içinde 2×2 küçük bulmaca ızgarası (bir kare turkuaz ipucu karesi, oklu); Q'nun kuyruğu sağa kıvrılan turkuaz bir çengel bulmaca oku. Lacivert zemin.

## Bilgi mimarisi

Alt sekme çubuğu (5 sekme): **Ana Sayfa · İstatistik · Kelime Defteri · Seviyeler · Profil**. Üst başlıkta ortada QORVEX logosu, sağda kullanıcının seviye rozeti (ör. "B1", dokununca Profil). Hamburger menü yok.

Bir oyuna dokununca seviye sorulmadan, kullanıcının profil seviyesindeki bulmaca açılır (seviye Seviyeler sekmesinden değiştirilir).

## Ekranlar

**Ana Sayfa**
- Üstte iki durum kutucuğu: "Günlük Seri" (alev ikonu + gün sayısı) ve "Seviye" (seviye halkası + "15 / 50" ilerleme çubuğu).
- Seviye atlayınca beliren tebrik kartı ("Tebrikler! A2 seviyesine geçtin").
- Krem renkli büyük "Günün Bulmacası" kartı: başlık, tarih, kısa metin, turkuaz "Hemen Çöz" düğmesi, sağda hafif eğik minik ızgara önizlemesi.
- "Oyunlar" bölümü: 9 oyunun hepsi 3×3 ızgarada kutucuk olarak (ikon + ad); kaydırma yok.
- "Kelime Defterim" kartı (defterdeki kelime sayısı, Kelime Defteri'ne gider).

**İstatistik**
- Dört üst kutucuk: karşılaşılan kelime, harf açma, kelime açma, ipucusuz çözüm.
- "Kelime Gelişimi": farklı kelime sayısı, toplam karşılaşma, defterdeki kelime, öğrenilen kelime (3+ tekrar) ve öğrenilme yüzdesi çubuğu.
- "Gelişim": bu hafta çözülen (geçen haftaya göre ▲/▼ %), son 10 çözümün ortalama süresi (genel ortalamaya göre hızlanma %), ipucusuz çözüm oranı, aktif gün, seviye ilerlemesi.
- "En Hızlı Süreler": her oyun için ikon, ad, çözüm sayısı ve ortalama süre, sağda en hızlı süre (dk:sn).

**Kelime Defteri**
- Arama kutusu ("İngilizce ya da Türkçe ara"), filtreler: Tümü / Yeni / Öğrenildi.
- Kelime listesi (İngilizce kelime, Türkçe anlam, kaç kez tekrar edildiği). Dokununca kelime kartı açılır; kelime defterden çıkarılabilir.

**Seviyeler**
- A1, A2, B1, B2, C1, C2 ve Karışık: her biri kart; açıklama (ör. "Günlük temel kelimeler"), ilerleme çubuğu (X/50). Seçili seviye vurgulu. 50 bulmaca çözülünce otomatik üst seviyeye geçilir.

**Profil**
- Avatar (Q logosu), "Bulmaca Oyuncusu", seviye.
- Dört kutucuk: çözülen, günlük seri, en uzun seri, kelime.
- "Bu Hafta" çubuk grafiği (7 gün).
- Oyun başına çözülen sayıları.
- Ayarlar: seviyemi değiştir, kelime defteri, gizlilik politikası.

**Ortak oyun ekranı düzeni** (tüm oyunlar)
- Üst bar (lacivert): solda süre sayacı, ortada "QORVEX" + alt başlık (ör. "Resimli Bulmaca · B1 · No. 3"), sağda turkuaz daire içinde ampul (ipuçları menüsü: Harf aç, Kelime aç, Kelimeyi temizle, Kelime kartı, Baştan başla).
- Orta (kağıt): bulmaca alanı.
- İpucu çubuğu: sol/sağ oklar (önceki/sonraki kelime), üstte küçük harfle yön ve uzunluk ("ACROSS · YATAY → (7)"), altta büyük serif Türkçe ipucu; sağda küçük ampul etiketi ve kalan kelime kartı hakkı ("4/5"). Defterden tekrar için gelen kelimede "DEFTERDEN TEKRAR" etiketi.
- Özel QWERTY klavye (3 satır, büyük beyaz tuşlar, silme tuşu).
- Alt bar (lacivert): turkuaz çerçeveli "‹ Geri" düğmesi, sağda küçük durum yazısı.
- Bulmaca bitince: "Sonraki bulmaca →" turkuaz yüzen düğme; bazı oyunlarda "Puzzle Solved" tebrik penceresi.

**Kelime kartı** (açılır pencere, kağıt renginde)
- "KELİME KARTI · VOCABULARY" başlığı, çift çizgi; büyük serif İngilizce kelime ve sağda hoparlör düğmesi (sesli okunuş); tür ve seviye ("verb · fiil · A1").
- Türkçe anlamlar, örnek cümle (İngilizcesi ve Türkçesi), aynı anlama gelen kelimeler, aynı aileden kelimeler (küçük kutucuklar).
- Kesik çizgili not: "Bu kelime defterine eklendi…" ve kalan kart hakkı; siyah "ANLADIM" düğmesi.

## Oyunlar (9)

1. **Çengel Bulmaca** (amiral gemisi): Türk gazetelerindeki ok'lu bulmaca. Gri ipucu karelerinde Türkçe ipucu, ok yönüne İngilizcesi yazılır. Bir karede iki ipucu olabilir (yatay çizgiyle bölünmüş). Seçili ipucunun köşesinde küçük ampul: bir daha dokununca kelime kartı açılır.
2. **Resimli Bulmaca**: çengel bulmacanın ortasında büyük bir fotoğraf; bir ipucu "Resimdeki nesne" der, cevabı fotoğraftaki nesnenin İngilizcesidir (gazetelerdeki "Bu oyuncu kim?" gibi).
3. **Kare Bulmaca**: siyah kareli klasik numaralı bulmaca, Türkçe ipucu listesi.
4. **Şifreli Bulmaca** (codeword): her harfin yerinde 1–26 arası sayı; altta bulmaca bitince okunan gizli bir İngilizce cümle şeridi ve Türkçesi.
5. **Sarmal Bulmaca**: kelimeler kare bir sarmal boyunca, her biri öncekinin son harfiyle başlar.
6. **Kelime Avı** (word search): harf ızgarasında gizli kelimeleri parmakla çizerek bulma.
7. **Kelime Merdiveni** (word ladder): her basamakta tek harf değiştirerek hedef kelimeye ulaşma; her basamakta Türkçe ipucu.
8. **Karışık Harfler** (jumble): harfleri karışık kelimeleri taşlarla düzeltme; daire içindeki harfler bonus kelimeyi verir.
9. **Şifreli Cümle** (cryptogram): harf değiştirme şifresiyle yazılmış İngilizce örnek cümle; Türkçesi ipucu.

Her oyunun küçük bir ikonu var (harf karoları, minik ızgara, fotoğraf karesi vb.); ikon seti tutarlı olmalı.

## Tasarım ilkeleri

- İki katman net: uygulama kabuğu modern ve koyu (lacivert/turkuaz), oyun alanı sıcak ve klasik (gazete kağıdı). Geçiş zarif olmalı.
- Okunabilirlik önce: bulmaca harfleri büyük; ipuçları küçük ama net. En dar iPhone'da (375 pt) 8×10 ve 9×11 ızgaralar ile klavye birlikte sığmalı.
- Tek elle kullanım: önemli eylemler ekranın alt yarısında; dokunma alanları en az 44 pt.
- Renk tek başına bilgi taşımamalı (doğru/yanlış için renk + ikon/desen düşün); kontrast WCAG AA.
- Arayüz metni Türkçe; kelimeler/cevaplar İngilizce. Türkçe karakterlerin (İ, ı, ş, ğ, ü, ö, ç) üst/alt kısımları kırpılmamalı.
- Sakin, rafine, yetişkin. Neon, aşırı gradyan, çizgi film maskotları, konfeti yağmuru istemiyorum.

## Senden istediklerim

1. Yukarıdaki tüm ana ekranlar (5 sekme) ve ortak oyun ekranı düzeni için yüksek çözünürlüklü iPhone mockup'ları (iPhone 15/16, 393×852 pt).
2. En az şu oyun ekranlarının ayrıntılı tasarımı: Çengel Bulmaca (seçili kelime ve doğru/yanlış durumlarıyla), Resimli Bulmaca, Şifreli Bulmaca (bitmiş hâli ve gizli cümle), Kelime Avı.
3. Kelime kartı penceresi, ipuçları (ampul) menüsü, bulmaca bitti durumu ve Günün Bulmacası kartı.
4. Bileşen sayfası: renk paleti (gerekirse iyileştirilmiş tonlarla ve gerekçesiyle), tipografi ölçeği, düğmeler, kartlar, sekme çubuğu, ızgara hücre durumları (boş, harf, ipucu, çift ipucu, seçili, doğru, yakın, yanlış, kullanılmayan), klavye, 9 oyun ikonu.
5. Mevcut kimliği koruyarak önerdiğin iyileştirmeler: neyi neden değiştirdiğini kısa notlarla açıkla.
6. Bonus: App Store ekran görüntüleri için 6 adet tanıtım karesi (telefon mockup'ı + kısa Türkçe başlık, ör. "İpucu Türkçe, cevap İngilizce").
