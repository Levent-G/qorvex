// Pexels fotoğraf servisi (Resim Bulmaca). Anahtar .env.local'den gelir: EXPO_PUBLIC_PEXELS_KEY
// Her kelime için sonuç cihazda saklanır (store.photos): aynı kelime için Pexels'e bir daha sorulmaz.
// null = o kelimenin ana konu olduğu fotoğraf bulunamadı (soyut kelimeler), tekrar denenmez.
import { getStore, persist } from '../storage';
import { pickPhoto } from '../engine/picture';
import { getWord } from '../engine/words';

const KEY = process.env.EXPO_PUBLIC_PEXELS_KEY;

export const hasPhotoKey = () => !!KEY;
export const photoCache = () => {
  const store = getStore();
  return store.photos || (store.photos = {});
};

// Ortak kelime veritabanında (davinci admin paneli) seçilmiş fotoğraf varsa önce o kullanılır.
export const adminPhoto = (word) => {
  const img = getWord(word)?.img;
  return img ? { url: img, by: '', link: '', alt: '' } : null;
};

export async function findPhoto(word) {
  const own = adminPhoto(word);
  if (own) return own;
  const cache = photoCache();
  if (word in cache) return cache[word];
  if (!KEY) throw new Error('Fotoğraf servisi ayarlı değil (Pexels anahtarı eksik).');
  let res;
  try {
    res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(word.toLowerCase())}&per_page=15`, {
      headers: { Authorization: KEY },
    });
  } catch {
    throw new Error('Fotoğraflar indirilemedi. İnternet bağlantını kontrol et.');
  }
  if (res.status === 429) throw new Error('Fotoğraf servisi şu an yoğun. Biraz sonra tekrar dene.');
  if (!res.ok) throw new Error('Fotoğraflar alınamadı (' + res.status + ').');
  const data = await res.json();
  const photo = pickPhoto(data.photos, word);
  cache[word] = photo;
  persist();
  return photo;
}
