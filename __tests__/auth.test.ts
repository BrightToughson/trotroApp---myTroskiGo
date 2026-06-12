import * as SecureStore from 'expo-secure-store';
import { tokenCache } from '../lib/auth';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('tokenCache', () => {
  const mockKey = 'test-token-key';
  const mockValue = 'test-token-value';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getToken', () => {
    it('should return the item when SecureStore returns a value', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockValue);
      const result = await tokenCache.getToken(mockKey);
      expect(result).toBe(mockValue);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(mockKey);
    });

    it('should return null when SecureStore returns nothing', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const result = await tokenCache.getToken(mockKey);
      expect(result).toBeNull();
    });

    it('should handle errors by deleting the item and returning null', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('Storage error'));
      const result = await tokenCache.getToken(mockKey);
      expect(result).toBeNull();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(mockKey);
    });
  });

  describe('saveToken', () => {
    it('should call SecureStore.setItemAsync', async () => {
      await tokenCache.saveToken(mockKey, mockValue);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(mockKey, mockValue);
    });

    it('should handle errors gracefully', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(new Error('Save error'));
      await tokenCache.saveToken(mockKey, mockValue);
      // It should just return and not throw
    });
  });
});
