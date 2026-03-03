import type { ApolloClient, ApolloError, NormalizedCacheObject } from '@apollo/client';
import {
  ME,
  SIGN_IN_WITH_GOOGLE,
  LOGOUT,
  REFRESH_TOKEN,
  REQUEST_EMAIL_OTP,
  VERIFY_EMAIL_OTP,
} from '@/graphql/operations';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  phone?: string;
  phoneVerified?: boolean;
  avatarUrl?: string;
  preferredLanguage?: string;
  createdAt?: string;
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

type StateListener = (state: AuthState) => void;

// ─── Token key ────────────────────────────────────────────────────────────────
// Must match the key used by apollo/client.ts so the Authorization header fallback
// is always in sync with what this service stores.

const TOKEN_KEY = 'token';

// ─── AuthService ─────────────────────────────────────────────────────────────

/**
 * Singleton service that owns all authentication state and logic.
 *
 * Responsibilities:
 *  - localStorage token storage (single source of truth)
 *  - Apollo mutations: loginWithGoogle, logout, refreshToken
 *  - Apollo query: fetchCurrentUser (with one-retry on transient errors)
 *  - Pub-sub state broadcast to React subscribers (via AuthContext)
 *
 * No React dependencies — can be used and tested independently of the component tree.
 */
class AuthService {
  private static instance: AuthService;

  private client: ApolloClient<NormalizedCacheObject> | null = null;
  private state: AuthState = { user: null, loading: true };
  private listeners = new Set<StateListener>();
  private retried = false;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // ── Token storage (single source of truth) ──────────────────────────────────

  getToken(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  }

  private setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  private clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  // ── Pub-sub state management ─────────────────────────────────────────────────

  getState(): AuthState {
    return this.state;
  }

  /**
   * Subscribe to auth state changes.
   * @returns unsubscribe function — call it in useEffect cleanup.
   */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(state: AuthState): void {
    this.state = state;
    this.listeners.forEach((l) => l(state));
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  /**
   * Decode the JWT payload locally (no signature verification) to extract
   * basic user info for optimistic auth state on page load.
   * Returns null if no token, token is malformed, or token is expired.
   */
  private parseTokenUser(): AuthUser | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      // base64url → base64 → JSON
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
        this.clearToken();
        return null; // Expired — treat as unauthenticated immediately
      }
      if (!payload.user_id || !payload.email || !payload.role) return null;
      // JWT stores role as DB enum (lowercase snake_case: "global_admin"),
      // but GraphQL returns the GQL enum (SCREAMING_SNAKE_CASE: "GLOBAL_ADMIN").
      // Uppercase here so role comparisons work consistently across both paths.
      return {
        id: payload.user_id,
        email: payload.email,
        fullName: payload.email, // Placeholder until ME returns the real name
        role: (payload.role as string).toUpperCase(),
        status: 'ACTIVE',
      };
    } catch {
      return null;
    }
  }

  /**
   * Provide the Apollo client and kick off the initial session check.
   * Idempotent — safe to call multiple times (e.g. React StrictMode double-effect).
   */
  initialize(client: ApolloClient<NormalizedCacheObject>): void {
    if (this.client) return; // already initialized
    this.client = client;
    // Pre-populate state from token so ProtectedRoute shows a spinner instead of
    // redirecting to login when the backend is slow to respond (dev cold start, etc.).
    // loading:true signals that ME query is still in flight — Header shows skeleton.
    const tokenUser = this.parseTokenUser();
    if (tokenUser) {
      this.state = { user: tokenUser, loading: true };
    }
    this.fetchCurrentUser();
  }

  // ── Public auth operations ───────────────────────────────────────────────────

  async loginWithGoogle(idToken: string, role: string = 'CLIENT'): Promise<AuthUser> {
    if (!this.client) throw new Error('AuthService not initialized');

    const { data } = await this.client.mutate({
      mutation: SIGN_IN_WITH_GOOGLE,
      variables: { idToken, role },
    });

    const { token, user } = data.signInWithGoogle as { token: string; user: AuthUser };
    if (token) this.setToken(token);
    this.emit({ user, loading: false });
    await this.client.resetStore();
    return user;
  }

  async requestEmailOtp(email: string, role: string = 'CLIENT'): Promise<{ success: boolean; devCode?: string }> {
    if (!this.client) throw new Error('AuthService not initialized');
    const { data } = await this.client.mutate({
      mutation: REQUEST_EMAIL_OTP,
      variables: { email, role },
    });
    return data.requestEmailOtp as { success: boolean; devCode?: string };
  }

  async loginWithEmailOtp(email: string, code: string, role: string = 'CLIENT'): Promise<AuthUser> {
    if (!this.client) throw new Error('AuthService not initialized');
    const { data } = await this.client.mutate({
      mutation: VERIFY_EMAIL_OTP,
      variables: { email, code, role },
    });
    const { token, user } = data.verifyEmailOtp as { token: string; user: AuthUser };
    if (token) this.setToken(token);
    this.emit({ user, loading: false });
    await this.client.resetStore();
    return user;
  }

  async logout(): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.mutate({ mutation: LOGOUT });
    } catch {
      // Server-side logout failure is non-fatal — always clean up client state.
    }

    this.clearToken();
    this.emit({ user: null, loading: false });
    await this.client.clearStore();
  }

  async refreshToken(): Promise<void> {
    if (!this.client) return;

    try {
      const { data } = await this.client.mutate({ mutation: REFRESH_TOKEN });
      if (data?.refreshToken) {
        if (data.refreshToken.token) this.setToken(data.refreshToken.token);
        if (data.refreshToken.user) {
          this.emit({ user: data.refreshToken.user as AuthUser, loading: false });
        }
      }
    } catch (error) {
      console.error('[AuthService] refreshToken failed:', error);
    }
  }

  async refetchUser(): Promise<void> {
    await this.fetchCurrentUser();
  }

  // ── Session fetch (internal) ─────────────────────────────────────────────────

  private async fetchCurrentUser(): Promise<void> {
    if (!this.client) return;

    // Keep existing user visible while refetching; show loading.
    this.emit({ user: this.state.user, loading: true });

    try {
      const { data } = await this.client.query({
        query: ME,
        fetchPolicy: 'network-only',
      });

      const fetchedUser = (data?.me as AuthUser | null) ?? null;

      if (fetchedUser) {
        // Authenticated — reset retry state and resolve.
        this.retried = false;
        if (this.retryTimeout !== null) {
          clearTimeout(this.retryTimeout);
          this.retryTimeout = null;
        }
        this.emit({ user: fetchedUser, loading: false });
      } else if (this.getToken() && !this.retried) {
        // Token present but server returned null — possible timing issue (SameSite
        // cookie race, connection warmup, etc.). Retry once after 1 s before
        // accepting unauthenticated state.
        this.retried = true;
        this.retryTimeout = setTimeout(() => this.fetchCurrentUser(), 1000);
        // State stays: { user: null, loading: true } from the initial emit above.
      } else {
        // No token, or second null response — fall back to token user if token is
        // still valid (e.g. backend returned null due to timing/connectivity issue).
        // If no valid token exists, this emits null → redirects to login (correct).
        this.retried = false;
        const tokenUser = this.parseTokenUser();
        this.emit({ user: tokenUser, loading: false });
      }
    } catch (err) {
      this.handleFetchError(err as ApolloError);
    }
  }

  private handleFetchError(error: ApolloError): void {
    const isAuthError =
      error.graphQLErrors?.some((e) => e.message === 'not authenticated') ||
      (error.networkError as { statusCode?: number } | null)?.statusCode === 401;

    if (isAuthError) {
      // Genuine auth failure: clear credentials and resolve loading.
      this.clearToken();
      this.emit({ user: null, loading: false });
    } else if (!this.retried) {
      // Transient error (network blip, backend restart): retry once after 2 s.
      // Do NOT re-emit here — fetchCurrentUser() already emitted
      // { user: existingUser, loading: true }, preserving the logged-in user
      // so the header keeps showing the user skeleton rather than going blank.
      this.retried = true;
      this.retryTimeout = setTimeout(() => this.fetchCurrentUser(), 2000);
    } else {
      // Second consecutive failure — fall back to token user if token is still valid
      // (keeps user on page rather than forcing logout due to network issues).
      // If no valid token exists, emits null → redirects to login (correct).
      this.retried = false;
      this.retryTimeout = null;
      const tokenUser = this.parseTokenUser();
      this.emit({ user: tokenUser, loading: false });
    }
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const authService = AuthService.getInstance();
