import { gql, useMutation, useQuery } from '@apollo/client';
import { router } from 'expo-router';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { AuthService, AuthUser } from './AuthService';

const ME_QUERY = gql`
  query MeQuery {
    me {
      id
      email
      fullName
      role
      avatarUrl
      preferredLanguage
    }
  }
`;

const LOGOUT_MUTATION = gql`
  mutation LogoutMobile {
    logout
  }
`;

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const { data, loading: queryLoading, error: queryError } = useQuery<{ me: AuthUser }>(ME_QUERY, {
    fetchPolicy: 'network-only',
  });

  const [logoutMutation] = useMutation(LOGOUT_MUTATION);

  useEffect(() => {
    if (!queryLoading) {
      if (data?.me) {
        AuthService.setUser(data.me);
        setUserState(data.me);
      }
      setLoading(false);
    }
  }, [data, queryLoading, queryError]);

  const setUser = useCallback((u: AuthUser | null) => {
    AuthService.setUser(u);
    setUserState(u);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutMutation();
    } catch {
      // Ignore logout mutation errors — clear local state regardless
    }
    await AuthService.clearAuth();
    setUserState(null);
    router.replace('/(auth)/welcome');
  }, [logoutMutation]);

  return (
    <AuthContext.Provider
      value={{ user, loading, isAuthenticated: !!user, logout, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
