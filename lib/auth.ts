import { SecureStoreWrapper as SecureStorage } from './SecureStoreWrapper';


export const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStorage.getItemAsync(key);
      if (item) {
        if (__DEV__) console.log("Token retrieved from SecureStorage");
      } else {
        if (__DEV__) console.log("Token not found in SecureStorage");
      }
      return item;
    } catch (error) {
      if (__DEV__) console.error("Error getting token:", error);
      await SecureStorage.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStorage.setItemAsync(key, value);
    } catch (err) {
      if (__DEV__) console.error("Error saving token:", err);
      return;
    }
  },
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
if (!publishableKey) {
  throw new Error('Clerk publishable key is not set in environment variables');
}
