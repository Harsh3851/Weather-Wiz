import { useQueryClient } from '@tanstack/react-query';
import type { LoginInput, PublicUser, RegisterInput } from '@weatherwiz/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { refreshSession, request, tokenStore, type SessionResponse } from '@/lib/api/http';
import { IS_DEMO } from '@/lib/config';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: Status;
  user: PublicUser | null;
  /** False in demo mode: accounts need the backend. */
  accountsEnabled: boolean;
  login(input: LoginInput): Promise<PublicUser>;
  register(input: RegisterInput): Promise<PublicUser>;
  loginDemo(): Promise<PublicUser>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>(IS_DEMO ? 'anonymous' : 'loading');
  const [user, setUser] = useState<PublicUser | null>(null);

  const applySession = useCallback((session: SessionResponse | null) => {
    tokenStore.set(session?.accessToken ?? null);
    setUser(session?.user ?? null);
    setStatus(session ? 'authenticated' : 'anonymous');
  }, []);

  useEffect(() => {
    if (IS_DEMO) return;
    let active = true;
    // Restore the session from the httpOnly refresh cookie, if any.
    void refreshSession().then((session) => {
      if (active) applySession(session);
    });
    const unsubscribe = tokenStore.subscribe((session) => {
      if (!session) applySession(null);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [applySession]);

  const start = useCallback(
    async (path: string, body?: unknown) => {
      const session = await request<SessionResponse>(path, { method: 'POST', body });
      applySession(session);
      // User-scoped queries are keyed by user id; drop anything anonymous.
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] === 'user' });
      return session.user;
    },
    [applySession, queryClient],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      accountsEnabled: !IS_DEMO,
      login: (input) => start('/auth/login', input),
      register: (input) => start('/auth/register', input),
      loginDemo: () => start('/auth/demo'),
      async logout() {
        try {
          await request<void>('/auth/logout', { method: 'POST' });
        } finally {
          applySession(null);
          queryClient.removeQueries({ predicate: (q) => q.queryKey[0] === 'user' });
        }
      },
    }),
    [status, user, start, applySession, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
