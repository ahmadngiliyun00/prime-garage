import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Muted } from '@/components/ui';
import { GOOGLE_WEB_CLIENT_ID } from '@/lib/config';

type GoogleId = {
  accounts: {
    id: {
      initialize: (opts: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }) => void;
      renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleId;
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function loadScript(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const s = existing ?? document.createElement('script');
    s.addEventListener('load', () => resolve());
    s.addEventListener('error', () => reject(new Error('Gagal memuat Google Sign-In')));
    if (!existing) {
      s.src = SCRIPT_SRC;
      s.async = true;
      document.head.appendChild(s);
    }
  });
}

/** Web: Google Identity Services button; returns an ID token for the web client ID. */
export function GoogleSignInButton({ onIdToken, onError }: { onIdToken: (idToken: string) => Promise<void>; onError: (message: string) => void }) {
  const ref = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!GOOGLE_WEB_CLIENT_ID) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        const el = ref.current;
        if (cancelled || !el || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_WEB_CLIENT_ID,
          callback: (r) => {
            onIdToken(r.credential).catch((e: unknown) => onError(e instanceof Error ? e.message : 'Login Google gagal'));
          },
        });
        window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', width: 300, locale: 'id' });
        setReady(true);
      })
      .catch((e: unknown) => onError(e instanceof Error ? e.message : 'Google Sign-In tidak tersedia'));
    return () => {
      cancelled = true;
    };
  }, [onIdToken, onError]);

  if (!GOOGLE_WEB_CLIENT_ID) return null;
  return (
    <View className="items-center">
      <View ref={ref as never} />
      {!ready ? <Muted>Memuat tombol Google...</Muted> : null}
    </View>
  );
}
