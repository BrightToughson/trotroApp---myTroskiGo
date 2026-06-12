import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { Platform } from "react-native";

/**
 * useWarmUpBrowser: Optimizes OAuth performance by warming up the system browser.
 * This reduces latency when the user triggers the Google Sign-In flow on Android/iOS.
 */
export const useWarmUpBrowser = () => {
  useEffect(() => {
    if (Platform.OS !== "web") {
      try {
        void WebBrowser.warmUpAsync().catch(() => {});
      } catch (e) {
        console.log("Failed to warm up browser:", e);
      }
      return () => {
        try {
          void WebBrowser.coolDownAsync().catch(() => {});
        } catch (e) {
          console.log("Failed to cool down browser:", e);
        }
      };
    }
  }, []);
};
