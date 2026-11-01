import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthResponse, UserDto } from '@prime-garage/shared';
import { applySession, http, onSessionChange, refreshSession } from './api';
import { queryClient } from './query-client';

type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'signedOut'; user: null }
  | { status: 'signedIn'; user: UserDto };

type AuthContextValue = AuthState & {
  signInWithPassword: (username: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  exchangeGithubCode: (code: string) => Promise<void>;
  devLogin: (email: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: UserDto) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  useEffect(() => {
    const off = onSessionChange((session) => {
      setState(session ? { status: 'signedIn', user: session.user } : { status: 'signedOut', user: null });
      if (!session) queryClient.clear();
    });
    void refreshSession().then((session) => {
      if (!session) setState({ status: 'signedOut', user: null });
    });
    return off;
  }, []);

  const signInWithPassword = useCallback(async (username: string, password: string) => {
    await applySession(await http.post<AuthResponse>('/auth/login', { username, password }));
  }, []);

  const signInWithGoogle = useCallback(async (idToken: string) => {
    await applySession(await http.post<AuthResponse>('/auth/google', { idToken }));
  }, []);

  const exchangeGithubCode = useCallback(async (code: string) => {
    await applySession(await http.post<AuthResponse>('/auth/github/exchange', { code }));
  }, []);

  const devLogin = useCallback(async (email: string, name: string) => {
    await applySession(await http.post<AuthResponse>('/auth/dev-login', { email, name }));
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { tokenStorage } = await import('./token-storage');
      const refreshToken = await tokenStorage.get();
      await http.post('/auth/logout', refreshToken ? { refreshToken } : {});
    } catch {
      // Logging out locally is enough when the server is unreachable.
    }
    await applySession(null);
  }, []);

  const setUser = useCallback((user: UserDto) => setState({ status: 'signedIn', user }), []);

  const value = useMemo(
    () => ({ ...state, signInWithPassword, signInWithGoogle, exchangeGithubCode, devLogin, signOut, setUser }),
    [state, signInWithPassword, signInWithGoogle, exchangeGithubCode, devLogin, signOut, setUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
