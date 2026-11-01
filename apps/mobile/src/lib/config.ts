import { Platform } from 'react-native';

function defaultApiUrl(): string {
  if (Platform.OS === 'web') {
    // Production web is served from the same origin as the API (ADR-008).
    if (typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      return window.location.origin;
    }
    return 'http://localhost:3000';
  }
  // Android emulator reaches the host machine through 10.0.2.2
  return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
}

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || defaultApiUrl()).replace(/\/$/, '');
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
export const SHOW_DEV_LOGIN = process.env.EXPO_PUBLIC_DEV_LOGIN === 'true';
