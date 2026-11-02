import Constants from 'expo-constants';
import { Platform } from 'react-native';

const LOOPBACK = ['localhost', '127.0.0.1'];

/**
 * Host of the computer running Metro in development (for example `172.20.10.2`), taken from the
 * URL Expo Go or the development build loaded the app from. Undefined in production builds.
 */
function devMachineHost(): string | undefined {
  if (!__DEV__) return undefined;
  const hostUri = Constants.expoConfig?.hostUri; // "172.20.10.2:8081"
  const host = hostUri?.split(':')[0];
  return host && !LOOPBACK.includes(host) ? host : undefined;
}

function defaultApiUrl(): string {
  if (Platform.OS === 'web') {
    // Production web is served from the same origin as the API (ADR-008).
    if (typeof window !== 'undefined' && !LOOPBACK.includes(window.location.hostname)) {
      return window.location.origin;
    }
    return 'http://localhost:3000';
  }
  // Android emulator reaches the host machine through 10.0.2.2
  return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
}

/**
 * On a phone, `localhost` is the phone itself. In development, point a loopback API URL at the
 * computer Metro runs on instead, so EXPO_PUBLIC_API_URL=http://localhost:3000 works on web,
 * simulators and real devices without editing the IP each time the network changes.
 */
function resolveApiUrl(): string {
  const url = new URL(process.env.EXPO_PUBLIC_API_URL || defaultApiUrl());
  // Web served from the real domain with a loopback API URL baked in (a dev .env used for the
  // production build): the API lives on the same origin (ADR-008), never on the visitor's machine.
  if (Platform.OS === 'web' && typeof window !== 'undefined' && LOOPBACK.includes(url.hostname) && !LOOPBACK.includes(window.location.hostname)) {
    return window.location.origin;
  }
  const devHost = devMachineHost();
  if (Platform.OS !== 'web' && devHost && (LOOPBACK.includes(url.hostname) || url.hostname === '10.0.2.2')) {
    url.hostname = devHost;
  }
  return url.toString().replace(/\/$/, '');
}

export const API_URL = resolveApiUrl();
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
export const SHOW_DEV_LOGIN = process.env.EXPO_PUBLIC_DEV_LOGIN === 'true';
