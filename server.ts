import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// --- Security & Hashing Helpers ---
const AUTH_FILE = path.join(process.cwd(), 'data', 'auth-credentials.json');
const DEV_AUTH_KEY = process.env.DEV_AUTH_KEY || 'aerith0818';
const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || 'dsi123';

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, s, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: s };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const computed = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    const bufComputed = Buffer.from(computed, 'hex');
    const bufHash = Buffer.from(hash, 'hex');
    if (bufComputed.length !== bufHash.length) return false;
    return crypto.timingSafeEqual(bufComputed, bufHash);
  } catch {
    return false;
  }
}

interface UserCredential {
  username: string;
  name: string;
  role: string;
  passwordHash: string;
  salt: string;
  updatedAt: string;
}

interface AuthStore {
  users: Record<string, UserCredential>;
}

// In-memory sessions
interface SessionInfo {
  token: string;
  username: string;
  name: string;
  role: string;
  createdAt: number;
  expiresAt: number;
}

interface DevSessionInfo {
  devToken: string;
  grantedAt: number;
  expiresAt: number;
}

let authStore: AuthStore = { users: {} };
const activeSessions = new Map<string, SessionInfo>();
const devSessions = new Map<string, DevSessionInfo>();

function loadCredentials() {
  try {
    const dir = path.dirname(AUTH_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(AUTH_FILE)) {
      const raw = fs.readFileSync(AUTH_FILE, 'utf-8');
      authStore = JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading auth credentials file, using defaults:', err);
  }

  // Ensure default admin user exists
  if (!authStore.users || !authStore.users[DEFAULT_USERNAME.toLowerCase()]) {
    const { hash, salt } = hashPassword(DEFAULT_PASSWORD);
    authStore.users = authStore.users || {};
    authStore.users[DEFAULT_USERNAME.toLowerCase()] = {
      username: DEFAULT_USERNAME,
      name: 'Administrator',
      role: 'admin',
      passwordHash: hash,
      salt: salt,
      updatedAt: new Date().toISOString(),
    };
    saveCredentials();
  }
}

function saveCredentials() {
  try {
    const dir = path.dirname(AUTH_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(AUTH_FILE, JSON.stringify(authStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save auth credentials to file:', err);
  }
}

// Initialize credentials on boot
loadCredentials();

// --- Authentication API Endpoints ---

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// 2. Login Endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required.',
    });
  }

  const normalizedUser = String(username).trim().toLowerCase();
  const user = authStore.users[normalizedUser];

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid username or password.',
    });
  }

  const isValid = verifyPassword(String(password), user.passwordHash, user.salt);
  if (!isValid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid username or password.',
    });
  }

  // Generate session token (valid for 24 hours)
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const session: SessionInfo = {
    token,
    username: user.username,
    name: user.name,
    role: user.role,
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000,
  };

  activeSessions.set(token, session);

  return res.json({
    success: true,
    message: 'Authentication successful',
    token,
    user: {
      username: user.username,
      name: user.name,
      role: user.role,
    },
  });
});

// 3. Verify Session
app.post('/api/auth/verify-session', (req, res) => {
  const token = req.body?.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ valid: false, error: 'No token provided' });
  }

  const session = activeSessions.get(token);
  if (!session) {
    return res.status(401).json({ valid: false, error: 'Session expired or invalid' });
  }

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return res.status(401).json({ valid: false, error: 'Session expired' });
  }

  return res.json({
    valid: true,
    user: {
      username: session.username,
      name: session.name,
      role: session.role,
    },
  });
});

// 4. Verify Developer Authorization Key
app.post('/api/auth/verify-dev-key', (req, res) => {
  const { devKey } = req.body || {};

  if (!devKey) {
    return res.status(400).json({
      success: false,
      error: 'Developer authorization password is required.',
    });
  }

  // Constant-time compare or trimmed string check
  if (String(devKey).trim() !== DEV_AUTH_KEY) {
    return res.status(403).json({
      success: false,
      error: 'Incorrect Developer Authorization Password. Access denied.',
    });
  }

  // Grant 15-minute developer session token
  const devToken = 'dev_' + crypto.randomBytes(24).toString('hex');
  const now = Date.now();
  devSessions.set(devToken, {
    devToken,
    grantedAt: now,
    expiresAt: now + 15 * 60 * 1000, // 15 mins
  });

  return res.json({
    success: true,
    authorized: true,
    devSessionToken: devToken,
    message: 'Developer authorization verified. You may proceed with password change.',
  });
});

// 5. Change Password
app.post('/api/auth/change-password', (req, res) => {
  const { devSessionToken, username, currentPassword, newPassword, confirmPassword } = req.body || {};

  // Verify developer session
  if (!devSessionToken || !devSessions.has(devSessionToken)) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized. Valid Developer Authorization is required to change passwords.',
    });
  }

  const devSession = devSessions.get(devSessionToken)!;
  if (Date.now() > devSession.expiresAt) {
    devSessions.delete(devSessionToken);
    return res.status(403).json({
      success: false,
      error: 'Developer authorization session has expired. Please re-enter developer key.',
    });
  }

  // Validate inputs
  if (!username || !currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({
      success: false,
      error: 'All fields are required (Username, Current Password, New Password, Confirm Password).',
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      error: 'New password and confirm password do not match.',
    });
  }

  if (String(newPassword).length < 4) {
    return res.status(400).json({
      success: false,
      error: 'New password must be at least 4 characters long.',
    });
  }

  const normalizedUser = String(username).trim().toLowerCase();
  const user = authStore.users[normalizedUser];

  if (!user) {
    return res.status(404).json({
      success: false,
      error: `User "${username}" does not exist.`,
    });
  }

  // Verify current password
  const isCurrentValid = verifyPassword(String(currentPassword), user.passwordHash, user.salt);
  if (!isCurrentValid) {
    return res.status(400).json({
      success: false,
      error: 'Current password is incorrect.',
    });
  }

  // Hash and save new password
  const { hash, salt } = hashPassword(String(newPassword));
  user.passwordHash = hash;
  user.salt = salt;
  user.updatedAt = new Date().toISOString();

  authStore.users[normalizedUser] = user;
  saveCredentials();

  // Clear developer session after successful use
  devSessions.delete(devSessionToken);

  // Invalidate any active sessions for this user so they must log in with new password
  for (const [token, session] of activeSessions.entries()) {
    if (session.username.toLowerCase() === normalizedUser) {
      activeSessions.delete(token);
    }
  }

  return res.json({
    success: true,
    message: 'Password successfully changed! Please log in with your new password.',
  });
});

// 6. Logout
app.post('/api/auth/logout', (req, res) => {
  const token = req.body?.token || req.headers.authorization?.replace('Bearer ', '');
  if (token && activeSessions.has(token)) {
    activeSessions.delete(token);
  }
  return res.json({ success: true, message: 'Logged out successfully' });
});

// --- Server & Vite Startup ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DSI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
