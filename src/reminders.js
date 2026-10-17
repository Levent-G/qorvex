// Günlük hatırlatma: önümüzdeki 7 günün her biri için tek seferlik yerel bildirim.
// Bugün zaten bulmaca çözüldüyse bugünkü atlanır; uygulama açılınca ve her çözümde yeniden kurulur.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getSettings } from './settings';
import { getStats } from './engine/session';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

const CHANNEL = 'daily';
const MESSAGES = [
  ['Günün bulmacası hazır 🧩', 'Birkaç dakikanı ayır, yeni kelimeler seni bekliyor.'],
  ['Serini koru 🔥', 'Bugün bir bulmaca çöz, günlük serin devam etsin.'],
  ['Kelime defterin seni bekliyor 📖', 'Kısa bir tekrar, kelimeleri kalıcı yapar.'],
  ['Bugün hangi kelimeyi öğreneceksin? ✨', 'Yeni bir çengel bulmaca hazır.'],
  ['5 dakikalık beyin jimnastiği 🧠', 'Bir bulmaca çöz, İngilizceni tazele.'],
];

async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Günlük hatırlatma', importance: Notifications.AndroidImportance.DEFAULT });
  }
}

// İzin iste; verildiyse true
export async function requestReminderPermission() {
  await ensureChannel();
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  const res = await Notifications.requestPermissionsAsync();
  return !!res.granted;
}

let chain = Promise.resolve();
// art arda çağrılar sıraya girer (çift bildirim kurulmasın)
export function rescheduleReminders() {
  chain = chain.then(doReschedule).catch(() => {});
  return chain;
}

async function doReschedule() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const r = getSettings().reminder;
  if (!r.on) return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  await ensureChannel();
  const stats = getStats();
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, r.hour, r.minute || 0, 0);
    if (date <= now) continue;
    if (i === 0 && stats.solvedToday) continue;
    let [title, body] = MESSAGES[(date.getDate() + i) % MESSAGES.length];
    // seri varsa yarın için seriyi hatırlat
    if (stats.streak > 1 && i <= 1) [title, body] = [`🔥 ${stats.streak} günlük serin var`, 'Bugün bir bulmaca çözerek serini koru.'];
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
    });
  }
}
