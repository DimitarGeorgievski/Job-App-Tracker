import { createContext, useContext, useState, useEffect } from 'react';
import { apiMe, type AuthResult } from '../lib/api';

type AuthState =
  | { kind: 'loading' }
  | { kind: 'authenticated'; user: { id: string; email: string } }
  | { kind: 'unauthenticated'; reason: string }
  | { kind: 'error'; reason: string };

type AuthContextValue = {
  state: AuthState;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    const initializeSession = async () => {
      try {
        const result: AuthResult = await apiMe();
        if (cancelled) return;

        switch (result.kind) {
          case 'authenticated': {
            setState({ kind: 'authenticated', user: result.user });
            break;
          }
          case 'unauthenticated': {
            setState({ kind: 'unauthenticated', reason: result.reason });
            break;
          }
          case 'api-unavailable': {
            setState({ kind: 'error', reason: `api-unavailable: ${result.reason}` });
            break;
          }
          case 'coordination-error': {
            setState({ kind: 'error', reason: `coordination-error: ${result.reason}` });
            break;
          }
        }
      } catch (e) {
        if (cancelled) return;
        setState({ kind: 'error', reason: `unexpected-error: ${String(e)}` });
      }
    };
    void initializeSession();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ state }}>
      {children}
    </AuthContext.Provider>
  );
};

export type { AuthState, AuthContextValue };