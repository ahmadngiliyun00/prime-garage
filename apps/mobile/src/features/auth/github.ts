import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { API_URL } from '@/lib/config';

/** Path the API sends the browser back to, with `?code=` or `?error=` (route `src/app/auth/github.tsx`). */
const RETURN_PATH = 'auth/github';

function startUrl(returnTo: string): string {
  return `${API_URL}/api/auth/github/start?returnTo=${encodeURIComponent(returnTo)}`;
}

export type GithubResult = { type: 'code'; code: string } | { type: 'error'; message: string } | { type: 'cancelled' };

/** Reads `code` or `error` from the URL the API redirected to. */
export function parseGithubReturn(url: string): GithubResult {
  const { queryParams } = Linking.parse(url);
  const code = queryParams?.['code'];
  const error = queryParams?.['error'];
  if (typeof code === 'string' && code) return { type: 'code', code };
  if (typeof error === 'string' && error) return { type: 'error', message: error };
  return { type: 'cancelled' };
}

/**
 * Starts GitHub login. The API does the OAuth dance (client secret stays on the server) and
 * returns to the app with a one-time code.
 *  - Web: full-page redirect; the result lands on the `/auth/github` route.
 *  - Native (including Expo Go): in-app auth session that closes on the return URL.
 */
export async function startGithubLogin(): Promise<GithubResult | null> {
  if (Platform.OS === 'web') {
    window.location.assign(startUrl(`${window.location.origin}/${RETURN_PATH}`));
    return null;
  }
  const returnTo = Linking.createURL(RETURN_PATH);
  const result = await WebBrowser.openAuthSessionAsync(startUrl(returnTo), returnTo);
  if (result.type !== 'success') return { type: 'cancelled' };
  return parseGithubReturn(result.url);
}
