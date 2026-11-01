import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { GOOGLE_WEB_CLIENT_ID } from '@/lib/config';

/**
 * Android: native Google Sign-In. The ID token audience is the WEB client ID
 * (required by Google for server verification); the Android client ID must exist in the
 * same Google Cloud project with the app's SHA-1 fingerprints.
 */
export function GoogleSignInButton({ onIdToken, onError }: { onIdToken: (idToken: string) => Promise<void>; onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (GOOGLE_WEB_CLIENT_ID) GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  }, []);

  if (!GOOGLE_WEB_CLIENT_ID) return null;

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
