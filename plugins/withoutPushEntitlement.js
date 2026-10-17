// expo-notifications iOS'ta "aps-environment" (uzaktan push) yetkisini kendiliğinden ekler.
// Uygulama yalnızca yerel bildirim (günlük hatırlatma) kullanır; push yetkisi imza profilinde olmadığı için build kırılıyordu.
// Not: config plugin aksiyonları kayıt sırasının tersine çalışır; bu eklenti app.json'da expo-notifications'tan ÖNCE yazılmalı
// ki onun eklediği yetkiyi en son silsin.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (c) => {
    delete c.modResults['aps-environment'];
    return c;
  });
};
