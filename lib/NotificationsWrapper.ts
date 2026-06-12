import { Platform } from "react-native";
import Constants from "expo-constants";

const isExpoGo = Constants.executionEnvironment === "storeClient";
const isWeb = Platform.OS === "web";

let Notifications: any = null;

if (!isExpoGo && !isWeb) {
  try {
    Notifications = require("expo-notifications");
  } catch (e) {
    console.warn("Could not load expo-notifications", e);
  }
}

/**
 * A wrapper for expo-notifications that prevents crashes in Expo Go (SDK 53+)
 * and provides a safe fallback for the web.
 */
export const NotificationsWrapper = {
  setNotificationHandler: (handler: any) => {
    if (Notifications?.setNotificationHandler) {
      try {
        Notifications.setNotificationHandler(handler);
      } catch (e) {
        console.warn("Notifications.setNotificationHandler failed", e);
      }
    }
  },

  scheduleNotificationAsync: async (request: any) => {
    if (isWeb || isExpoGo) {
      console.log(`Notification Mock (${isWeb ? "Web" : "Expo Go"}):`, request?.content?.title, request?.content?.body);
      if (isExpoGo) {
        const { Alert } = require("react-native");
        Alert.alert(request?.content?.title || "Notification", request?.content?.body || "");
      }
      return;
    }
    if (Notifications?.scheduleNotificationAsync) {
      try {
        return await Notifications.scheduleNotificationAsync(request);
      } catch (e) {
        console.warn("Notifications.scheduleNotificationAsync failed", e);
      }
    }
  },

  getPermissionsAsync: async () => {
    if (isWeb || isExpoGo) return { status: "granted" };
    if (Notifications?.getPermissionsAsync) {
      try {
        return await Notifications.getPermissionsAsync();
      } catch (e) {
        console.warn("Notifications.getPermissionsAsync failed", e);
      }
    }
    return { status: "undetermined" };
  },

  requestPermissionsAsync: async () => {
    if (isWeb || isExpoGo) return { status: "granted" };
    if (Notifications?.requestPermissionsAsync) {
      try {
        return await Notifications.requestPermissionsAsync();
      } catch (e) {
        console.warn("Notifications.requestPermissionsAsync failed", e);
      }
    }
    return { status: "undetermined" };
  },

  getExpoPushTokenAsync: async (options?: any) => {
    if (isWeb || isExpoGo) return { data: "mock-token-expo-go" };
    if (Notifications?.getExpoPushTokenAsync) {
      try {
        return await Notifications.getExpoPushTokenAsync(options);
      } catch (e) {
        console.warn("Notifications.getExpoPushTokenAsync failed", e);
      }
    }
    return null;
  },

  // Add other methods as needed, following the same pattern
};
