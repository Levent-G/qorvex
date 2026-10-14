// Kelimeyi sesli okut. iPhone sessiz moddayken de duyulsun diye ses oturumu "oynatma" moduna alınır
// (yoksa iOS konuşma sesini yan taraftaki sessiz anahtarıyla susturur).
import * as Speech from 'expo-speech';
import { setAudioModeAsync } from 'expo-audio';

let audioReady = null;
function ensureAudio() {
  if (!audioReady) {
    audioReady = setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => {
      audioReady = null; // bir dahaki sefere yeniden dene
    });
  }
  return audioReady;
}

export async function speakWord(text, rate = 0.9) {
  if (!text) return;
  await ensureAudio();
  Speech.stop(); // önceki okuma sürüyorsa kes, yenisini sıraya sokma
  Speech.speak(text.toLowerCase(), { language: 'en-US', rate });
}

export function stopSpeaking() {
  Speech.stop();
}
