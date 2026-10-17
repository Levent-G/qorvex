// Telaffuz için ses tanıma (expo-speech-recognition). Expo Go'da yerel modül yok: yükleme korumalı,
// yoksa available() false döner ve ekran bilgi mesajı gösterir.
import { resetAudio } from './speech';

let M = null;
try {
  M = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
} catch {
  M = null;
}

export function recognitionAvailable() {
  if (!M) return false;
  try {
    return M.isRecognitionAvailable ? !!M.isRecognitionAvailable() : true;
  } catch {
    return false;
  }
}

export async function requestMicPermission() {
  if (!M) return false;
  const res = await M.requestPermissionsAsync();
  return !!res.granted;
}

/**
 * Bir kez dinle. onPartial(metin) ara sonuçlar için. Dönüş: { alternatives: string[], error?: string }
 * Hedef kelime contextualStrings ile tanıyıcıya ipucu olarak verilir.
 */
export function listenOnce(target, { onPartial, timeoutMs = 6000 } = {}) {
  return new Promise((resolve) => {
    if (!M) return resolve({ alternatives: [], error: 'unavailable' });
    let alts = [];
    let error;
    let done = false;
    const subs = [];
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      subs.forEach((s) => s.remove());
      resetAudio(); // tanıma ses oturumunu değiştirdi; okuma sesi yeniden ayarlansın
      resolve({ alternatives: alts, error });
    };
    subs.push(
      M.addListener('result', (e) => {
        const list = (e.results || []).map((r) => r.transcript).filter(Boolean);
        if (list.length) alts = list;
        if (onPartial && list[0]) onPartial(list[0]);
      }),
    );
    subs.push(
      M.addListener('error', (e) => {
        error = e.error || 'error';
        finish();
      }),
    );
    subs.push(M.addListener('end', finish));
    const timer = setTimeout(() => {
      try {
        M.stop();
      } catch {}
      setTimeout(finish, 800);
    }, timeoutMs);
    try {
      M.start({
        lang: 'en-US',
        interimResults: true,
        maxAlternatives: 5,
        continuous: false,
        contextualStrings: [target.toLowerCase()],
      });
    } catch (e) {
      error = String(e?.message || e);
      finish();
    }
  });
}

export function stopListening() {
  try {
    M?.stop();
  } catch {}
}
