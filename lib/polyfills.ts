import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  const RN = require('react-native');
  if (!RN.TurboModuleRegistry) {
    RN.TurboModuleRegistry = {
      get: () => null,
      getEnforcing: () => null,
    };
  }

  // Polyfill setImmediate for web compatibility (fixes react-native-swiper error)
  if (typeof globalThis !== "undefined" && typeof (globalThis as any).setImmediate === "undefined") {
    (globalThis as any).setImmediate = function (fn: any) {
      return setTimeout(fn, 0);
    };
  }
}
