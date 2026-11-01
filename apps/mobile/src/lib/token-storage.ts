import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'pg_refresh_token';

/**
 * Native: refresh token in the OS keystore (expo-secure-store).
 * Web: the API keeps it in an httpOnly cookie, nothing is stored in JS.
 */
export const tokenStorage = {
  async get(): Promise<string | null> {
    if (Platform.OS === 'web') return null;
    return SecureStore.getItemAsync(KEY);
  },
  async set(token: string | undefined): Promise<void> {
    if (Platform.OS === 'web' || !token) return;
    await SecureStore.setItemAsync(KEY, token);
  },
  async clear(): Promise<void> {
    if (Platform.OS === 'web') return;
    await SecureStore.deleteItemAsync(KEY);
  },
};
