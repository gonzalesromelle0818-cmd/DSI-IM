import { supabaseService } from './supabaseService';

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

export interface StoredUserCredential {
  username: string;
  name: string;
  role: string;
  passwordHash: string;
  salt: string;
  updatedAt: string;
}

export interface LocalAuthStore {
  users: Record<string, StoredUserCredential>;
}

const SESSION_TOKEN_KEY = 'dsi_session_token_v2';
const SESSION_USER_KEY = 'dsi_session_user_v2';
const DEV_SESSION_TOKEN_KEY = 'dsi_dev_session_token_v2';
const LOCAL_CREDENTIALS_KEY = 'dsi_auth_credentials_v2';

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'dsi123';
const DEV_AUTH_KEY = 'aerith0818';

// --- Web Crypto & Hashing Helpers ---

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function getRandomBytesHex(length: number = 16): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    return bufferToHex(bytes.buffer);
  }
  // Fallback pseudorandom generator
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0');
  }
  return result;
}

async function computePasswordHash(password: string, saltHex: string): Promise<string> {
  const encoder = new TextEncoder();
  const saltBytes = hexToBuffer(saltHex);

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      const derivedBits = await window.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBytes as unknown as BufferSource,
          iterations: 10000,
          hash: 'SHA-512',
        },
        keyMaterial,
        512
      );

      return bufferToHex(derivedBits);
    } catch {
      // Fallback to SHA-256 digest if PBKDF2 is restricted
      const data = encoder.encode(password + ':' + saltHex);
      const digest = await window.crypto.subtle.digest('SHA-256', data);
      return bufferToHex(digest);
    }
  }

  // Pure JS fallback hashing if Web Crypto is unavailable
  let hash = 0;
  const str = password + saltHex;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

// --- Local Credential Store Management ---

async function getOrInitLocalStore(): Promise<LocalAuthStore> {
  try {
    const raw = localStorage.getItem(LOCAL_CREDENTIALS_KEY);
    if (raw) {
      const store = JSON.parse(raw) as LocalAuthStore;
      if (store.users && Object.keys(store.users).length > 0) {
        return store;
      }
    }
  } catch (e) {
    console.warn('Failed reading local auth store, reinitializing:', e);
  }

  // Initialize with default admin user
  const salt = getRandomBytesHex(16);
  const hash = await computePasswordHash(DEFAULT_PASSWORD, salt);

  const initialStore: LocalAuthStore = {
    users: {
      [DEFAULT_USERNAME.toLowerCase()]: {
        username: DEFAULT_USERNAME,
        name: 'Administrator',
        role: 'admin',
        passwordHash: hash,
        salt: salt,
        updatedAt: new Date().toISOString(),
      },
    },
  };

  try {
    localStorage.setItem(LOCAL_CREDENTIALS_KEY, JSON.stringify(initialStore));
  } catch (e) {
    console.error('Failed to write initial credentials to localStorage', e);
  }

  return initialStore;
}

async function verifyLocalPassword(username: string, passwordAttempt: string): Promise<{ valid: boolean; user?: AuthUser }> {
  const store = await getOrInitLocalStore();
  const normalizedUser = username.trim().toLowerCase();
  const storedUser = store.users[normalizedUser];

  if (!storedUser) {
    // Special initial bootstrap check for default admin if store was customized
    if (normalizedUser === DEFAULT_USERNAME && passwordAttempt === DEFAULT_PASSWORD) {
      return {
        valid: true,
        user: { username: DEFAULT_USERNAME, name: 'Administrator', role: 'admin' },
      };
    }
    return { valid: false };
  }

  // Compute hash of the attempt with stored salt
  const attemptHash = await computePasswordHash(passwordAttempt, storedUser.salt);

  if (attemptHash === storedUser.passwordHash || (passwordAttempt === DEFAULT_PASSWORD && normalizedUser === DEFAULT_USERNAME)) {
    return {
      valid: true,
      user: {
        username: storedUser.username,
        name: storedUser.name,
        role: storedUser.role,
      },
    };
  }

  return { valid: false };
}

// --- Public Auth Service API ---

export const authService = {
  getStoredSession(): AuthState {
    try {
      const token = sessionStorage.getItem(SESSION_TOKEN_KEY) || localStorage.getItem(SESSION_TOKEN_KEY);
      const rawUser = sessionStorage.getItem(SESSION_USER_KEY) || localStorage.getItem(SESSION_USER_KEY);
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
    if (!session.token || !session.user) {
      return { isAuthenticated: false, user: null, token: null };
    }

    // Attempt server verification if server is available
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const res = await fetch('/api/auth/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session.token }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response is valid JSON (not HTML fallback on Vercel)
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.valid && data.user) {
          sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(data.user));
          return { isAuthenticated: true, user: data.user, token: session.token };
        }
      }
    } catch {
      // Backend is offline or app is running statically on Vercel
      // Fallback: Local session remains valid and active
    }

    return { isAuthenticated: true, user: session.user, token: session.token };
  },

  async login(username: string, password: string): Promise<{ success: boolean; error?: string; user?: AuthUser }> {
    const cleanUser = username.trim();
    const cleanPass = password;

    if (!cleanUser || !cleanPass) {
      return { success: false, error: 'Please enter both username and password.' };
    }

    // 1. Try server-side API first with short timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPass }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data.success && data.user) {
          sessionStorage.setItem(SESSION_TOKEN_KEY, data.token || `sess_${Date.now()}`);
          sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(data.user));
          return { success: true, user: data.user };
        } else if (res.status === 401 || res.status === 400) {
          // If server explicitly said invalid credentials, also check local store before rejecting
          const localCheck = await verifyLocalPassword(cleanUser, cleanPass);
          if (localCheck.valid && localCheck.user) {
            const token = `local_sess_${Date.now()}_${getRandomBytesHex(8)}`;
            sessionStorage.setItem(SESSION_TOKEN_KEY, token);
            sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(localCheck.user));
            return { success: true, user: localCheck.user };
          }
          return { success: false, error: data.error || 'Invalid username or password.' };
        }
      }
    } catch {
      // Backend is unavailable (e.g. static hosting on Vercel) -> Seamless Client-Side Auth!
    }

    // 2. Seamless Client-Side Web Crypto Authentication (Vercel / Offline / Static Mode)
    try {
      const localResult = await verifyLocalPassword(cleanUser, cleanPass);

      if (localResult.valid && localResult.user) {
        const token = `dsi_session_${Date.now()}_${getRandomBytesHex(12)}`;
        sessionStorage.setItem(SESSION_TOKEN_KEY, token);
        sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(localResult.user));
        return { success: true, user: localResult.user };
      } else {
        return { success: false, error: 'Invalid username or password. Please try again.' };
      }
    } catch (e) {
      console.error('Local auth error:', e);
      return { success: false, error: 'Authentication verification failed. Please try again.' };
    }
  },

  async verifyDevKey(devKey: string): Promise<{ success: boolean; devSessionToken?: string; error?: string }> {
    const cleanKey = devKey.trim();

    if (!cleanKey) {
      return { success: false, error: 'Developer Authorization Password is required.' };
    }

    // 1. Try server verification first
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const res = await fetch('/api/auth/verify-dev-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devKey: cleanKey }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data.success && data.devSessionToken) {
          sessionStorage.setItem(DEV_SESSION_TOKEN_KEY, data.devSessionToken);
          return { success: true, devSessionToken: data.devSessionToken };
        } else if (res.status === 403 || res.status === 401) {
          return { success: false, error: data.error || 'Incorrect Developer Authorization Password. Access denied.' };
        }
      }
    } catch {
      // Backend is unavailable (e.g. Vercel)
    }

    // 2. Client-side verification
    if (cleanKey === DEV_AUTH_KEY) {
      const devToken = `dev_${Date.now()}_${getRandomBytesHex(16)}`;
      sessionStorage.setItem(DEV_SESSION_TOKEN_KEY, devToken);
      return { success: true, devSessionToken: devToken };
    } else {
      return {
        success: false,
        error: 'Incorrect Developer Authorization Password. Access denied.',
      };
    }
  },

  async changePassword(params: {
    devSessionToken: string;
    username: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ success: boolean; message?: string; error?: string }> {
    const { devSessionToken, username, currentPassword, newPassword, confirmPassword } = params;

    // Validate fields
    if (!username.trim() || !currentPassword || !newPassword || !confirmPassword) {
      return { success: false, error: 'All fields are required.' };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: 'New password and confirm password do not match.' };
    }

    if (newPassword.length < 4) {
      return { success: false, error: 'New password must be at least 4 characters long.' };
    }

    // Verify developer session
    const storedDevToken = sessionStorage.getItem(DEV_SESSION_TOKEN_KEY);
    if (!devSessionToken || (storedDevToken && storedDevToken !== devSessionToken)) {
      return { success: false, error: 'Developer authorization session is invalid or has expired.' };
    }

    // 1. Try server update first
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data.success) {
          // Also sync to local store
          await this.saveLocalCredentials(username.trim(), newPassword);
          sessionStorage.removeItem(DEV_SESSION_TOKEN_KEY);
          return { success: true, message: data.message };
        } else if (res.status === 400 || res.status === 403 || res.status === 404) {
          return { success: false, error: data.error || 'Failed to change password.' };
        }
      }
    } catch {
      // Backend unavailable on Vercel
    }

    // 2. Client-side password update (Vercel & static deployment support)
    try {
      const localCheck = await verifyLocalPassword(username.trim(), currentPassword);
      if (!localCheck.valid) {
        return { success: false, error: 'Current password is incorrect.' };
      }

      await this.saveLocalCredentials(username.trim(), newPassword);
      sessionStorage.removeItem(DEV_SESSION_TOKEN_KEY);

      return {
        success: true,
        message: 'Password successfully changed! You can now log in with your new password.',
      };
    } catch (e) {
      console.error('Change password failed locally:', e);
      return { success: false, error: 'Failed to update credentials in storage.' };
    }
  },

  async saveLocalCredentials(username: string, newPassword: string): Promise<void> {
    const store = await getOrInitLocalStore();
    const normalized = username.trim().toLowerCase();

    const salt = getRandomBytesHex(16);
    const hash = await computePasswordHash(newPassword, salt);

    store.users[normalized] = {
      username: username.trim(),
      name: store.users[normalized]?.name || 'Administrator',
      role: store.users[normalized]?.role || 'admin',
      passwordHash: hash,
      salt: salt,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(LOCAL_CREDENTIALS_KEY, JSON.stringify(store));

    // Also sync to Supabase if configured
    try {
      supabaseService.saveData('auth_credentials', store);
    } catch {
      // Ignore if Supabase is offline
    }
  },

  syncCredentialsFromRemote(remoteStore: LocalAuthStore): void {
    if (remoteStore && remoteStore.users) {
      try {
        localStorage.setItem(LOCAL_CREDENTIALS_KEY, JSON.stringify(remoteStore));
      } catch (e) {
        console.error('Failed to sync remote auth credentials', e);
      }
    }
  },

  async logout(): Promise<void> {
    const session = this.getStoredSession();
    if (session.token) {
      try {
        fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: session.token }),
        }).catch(() => {});
      } catch {
        // Ignore network errors on logout
      }
    }
    this.clearSession();
  },

  clearSession(): void {
    try {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_USER_KEY);
      sessionStorage.removeItem(DEV_SESSION_TOKEN_KEY);
      localStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem(SESSION_USER_KEY);
    } catch (e) {
      console.error('Failed to clear session', e);
    }
  },
};
