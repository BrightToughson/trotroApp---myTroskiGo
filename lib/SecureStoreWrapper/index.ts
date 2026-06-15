import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * A wrapper for Expo SecureStore that falls back to localStorage on Web.
 * This prevents the "getValueWithKeyAsync is not a function" error on web.
 */
export const SecureStoreWrapper = {
  setItemAsync: async (key: string, value: string) => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return; // Safety guard for SSR/Static Export
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.error("localStorage setItem error:", e);
      }
    } else {
      return SecureStore.setItemAsync(key, value);
    }
  },

  getItemAsync: async (key: string) => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return null; // Safety guard for SSR/Static Export
      try {
        const value = localStorage.getItem(key);
        if (__DEV__) console.log(`[Storage] GET ${key}:`, value);
        return value;
      } catch (e) {
        console.error("localStorage getItem error:", e);
        return null;
      }
    } else {
      return SecureStore.getItemAsync(key);
    }
  },

  deleteItemAsync: async (key: string) => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return; // Safety guard for SSR/Static Export
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error("localStorage removeItem error:", e);
      }
    } else {
      return SecureStore.deleteItemAsync(key);
    }
  },
};
