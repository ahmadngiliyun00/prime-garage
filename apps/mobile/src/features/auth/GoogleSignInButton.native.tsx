import { useEffect, useState } from 'react';
import { TurboModuleRegistry } from 'react-native';
import { Button, Muted } from '@/components/ui';
import { GOOGLE_WEB_CLIENT_ID } from '@/lib/config';

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

/**
 * The native module only exists in a development or production build. Expo Go does not ship it,
 * and importing the package there throws at module load time and takes the whole login route down.
 * So the package is required lazily, only after checking that the native side is registered.
 */
function loadGoogleSignin(): GoogleSigninModule | null {
  if (TurboModuleRegistry.get('RNGoogleSignin') == null) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy load, see comment above
  return require('@react-native-google-signin/google-signin') as GoogleSigninModule;
}

const google = loadGoogleSignin();

/**
 * Android: native Google Sign-In. The ID token audience is the WEB client ID
 * (required by Google for server verification); the Android client ID must exist in the
 * same Google Cloud project with the app's SHA-1 fingerprints.
 */
export function GoogleSignInButton({ onIdToken, onError }: { onIdToken: (idToken: string) => Promise<void>; onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (google && GOOGLE_WEB_CLIENT_ID) google.GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  }, []);

  if (!GOOGLE_WEB_CLIENT_ID) return null;
  if (!google) {
    return (
      <Muted className="text-center">
        Login Google tidak tersedia di Expo Go. Gunakan development build, atau login pengembang di bawah.
      </Muted>
    );
  }
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = google;

  const signIn = async () => {
    setBusy(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const res = await GoogleSignin.signIn();
      if (!isSuccessResponse(res)) return;
      if (!res.data.idToken) throw new Error('Google tidak mengirim ID token');
      await onIdToken(res.data.idToken);
    } catch (e) {
      if (isErrorWithCode(e) && e.code === statusCodes.IN_PROGRESS) return;
      onError(e instanceof Error ? e.message : 'Login Google gagal');
    } finally {
      setBusy(false);
    }
  };

  return <Button title="Masuk dengan Google" icon="logo-google" onPress={signIn} loading={busy} testID="google-login" />;
}
