export interface AuthUser {
  username: string;
  name: string;
  role: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
}

const SESSION_TOKEN_KEY = 'dsi_session_token_v1';
const SESSION_USER_KEY = 'dsi_session_user_v1';

export const authService = {
  getStoredSession(): AuthState {
    try {
      const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
      const rawUser = sessionStorage.getItem(SESSION_USER_KEY);
      if (token && rawUser) {
        const user = JSON.parse(rawUser) as AuthUser;
        return { isAuthenticated: true, user, token };
      }
    } catch (e) {
      console.error('Failed to read session storage', e);
    }
    return { isAuthenticated: false, user: null, token: null };
  },

  async verifyCurrentSession(): Promise<AuthState> {
    const session = this.getStoredSession();
    if (!session.token) {
      return { isAuthenticated: false, user: null, token: null };
    }

    try {
      const res = await fetch('/api/auth/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session.token }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.valid && data.user) {
          sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(data.user));
          return { isAuthenticated: true, user: data.user, token: session.token };
        }
      }
    } catch (e) {
      console.warn('Backend session verification fetch error:', e);
    }

    // Clear expired or invalid session
    this.clearSession();
    return { isAuthenticated: false, user: null, token: null };
  },

  async login(username: string, password: string): Promise<{ success: boolean; error?: string; user?: AuthUser }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        sessionStorage.setItem(SESSION_TOKEN_KEY, data.token);
        sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(data.user));
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'Invalid username or password.' };
      }
    } catch (e) {
      console.error('Login error:', e);
      return { success: false, error: 'Unable to connect to server. Please check your connection.' };
    }
  },

  async verifyDevKey(devKey: string): Promise<{ success: boolean; devSessionToken?: string; error?: string }> {
    try {
      const res = await fetch('/api/auth/verify-dev-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devKey }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, devSessionToken: data.devSessionToken };
      } else {
        return { success: false, error: data.error || 'Invalid Developer Authorization Password.' };
      }
    } catch (e) {
      console.error('Dev key verification error:', e);
      return { success: false, error: 'Failed to verify developer key. Server connection error.' };
    }
  },

  async changePassword(params: {
    devSessionToken: string;
    username: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || 'Failed to change password.' };
      }
    } catch (e) {
      console.error('Change password error:', e);
      return { success: false, error: 'Failed to change password. Server connection error.' };
    }
  },

  async logout(): Promise<void> {
    const session = this.getStoredSession();
    if (session.token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: session.token }),
        });
      } catch (e) {
        console.error('Logout error:', e);
      }
    }
    this.clearSession();
  },

  clearSession(): void {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_USER_KEY);
  },
};
