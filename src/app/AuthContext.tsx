import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { tokenStore } from '../api/token';
import type { LoginInput, RegisterInput, User } from '../api/types';
import { api, onSessionExpired } from './composition';

type AuthStatus = 'checking' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** A one-off message for the login page (e.g. "session expired"). */
  notice: string | null;
  clearNotice: () => void;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  /** Sign out, optionally leaving a message for the login page. */
  logout: (notice?: string) => void;
  setUser: (user: User) => void;
  /** Re-validates the session (used after demo reset, which may remove the account). */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() =>
    tokenStore.get() ? 'checking' : 'signedOut',
  );
  const [user, setUserState] = useState<User | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const signOut = useCallback((message: string | null) => {
    tokenStore.clear();
    setUserState(null);
    setStatus('signedOut');
    setNotice(message);
  }, []);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      setStatus('signedOut');
      return;
    }
    try {
      const me = await api.auth.me();
      setUserState(me);
      setStatus('signedIn');
    } catch {
      // A 401 already triggered the session-expired listener; any other error
      // still leaves us without a verified session.
      if (tokenStore.get()) signOut('We could not verify your session. Please sign in again.');
    }
  }, [signOut]);

  useEffect(() => {
    const off = onSessionExpired(() => signOut('Your session has ended. Please sign in again.'));
    // Initial session check (only when there is a token to check; the initial
    // state already says "signed out" otherwise).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tokenStore.get()) void refresh();
    return off;
  }, [refresh, signOut]);

  // Another tab signing in or out changes the token; follow it.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'crewboard:token') return;
      if (!e.newValue) signOut(null);
      else void refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh, signOut]);

  const login = useCallback(async (input: LoginInput) => {
    const res = await api.auth.login(input);
    tokenStore.set(res.token);
    setUserState(res.user);
    setNotice(null);
    setStatus('signedIn');
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await api.auth.register(input);
    tokenStore.set(res.token);
    setUserState(res.user);
    setNotice(null);
    setStatus('signedIn');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      notice,
      clearNotice: () => setNotice(null),
      login,
      register,
      logout: (message?: string) => signOut(message ?? null),
      setUser: setUserState,
      refresh,
    }),
    [status, user, notice, login, register, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
