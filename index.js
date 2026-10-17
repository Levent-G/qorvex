// Önce tema + yazı ölçeği altyapısı (stiller oluşmadan), sonra uygulama
import './src/prelude';
import { registerRootComponent } from 'expo';

import AppBoot from './src/AppBoot';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(AppBoot);