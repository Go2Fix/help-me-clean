import { deleteToken, getToken, saveToken } from '../apollo/client';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'CLIENT' | 'WORKER' | 'COMPANY_ADMIN' | 'GLOBAL_ADMIN';
  avatarUrl?: string | null;
  preferredLanguage?: string | null;
}

class AuthServiceClass {
  private _user: AuthUser | null = null;

  get user(): AuthUser | null {
    return this._user;
  }

  setUser(user: AuthUser | null): void {
    this._user = user;
  }

  async saveAuthToken(token: string): Promise<void> {
    await saveToken(token);
  }

  async getAuthToken(): Promise<string | null> {
    return getToken();
  }

  async clearAuth(): Promise<void> {
    await deleteToken();
    this._user = null;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await getToken();
    return !!token;
  }
}

export const AuthService = new AuthServiceClass();
