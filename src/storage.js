import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'cengel:v2';
let cache = null;
let timer = null;

const empty = () => ({
  levels: {}, // { A1: { no, solvedCount, current: Session } }
  daily: null, // Session + date
  learn: { counter: 0, marked: {}, recent: {} },
});

export async function loadStore() {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    cache = empty();
  }
  return cache;
}

export function getStore() {
  return cache || (cache = empty());
}

export function persist() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(cache)).catch(() => {});
  }, 400);
}
