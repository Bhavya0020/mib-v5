// Session management for authentication
// Uses Vercel KV (Redis) in production, in-memory store for development
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { kv } from '@vercel/kv';
import type { User, UserSession } from './types';

const SESSION_COOKIE_NAME = 'mib_session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_DURATION_SECONDS = 24 * 60 * 60; // 24 hours in seconds for Redis TTL
const SESSION_PREFIX = 'session:';

// Check if Vercel KV is configured
const isKVConfigured = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// In-memory fallback for local development
const GLOBAL_SESSION_KEY = '__MIB_SESSION_STORE__' as const;

function getInMemoryStore(): Map<string, UserSession> {
  const g = globalThis as typeof globalThis & {
    [GLOBAL_SESSION_KEY]?: Map<string, UserSession>;
  };
  if (!g[GLOBAL_SESSION_KEY]) {
    g[GLOBAL_SESSION_KEY] = new Map<string, UserSession>();
  }
  return g[GLOBAL_SESSION_KEY];
}

// Session store abstraction
const sessionStore = {
  async set(sessionId: string, session: UserSession): Promise<void> {
    if (isKVConfigured) {
      // Store in Vercel KV with TTL
      // Convert dates to ISO strings for JSON serialization
      const serializable = {
        ...session,
        createdAt: session.createdAt.toISOString(),
        lastAccessed: session.lastAccessed.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      };
      await kv.set(`${SESSION_PREFIX}${sessionId}`, JSON.stringify(serializable), {
        ex: SESSION_DURATION_SECONDS,
      });
    } else {
      // Use in-memory store for development
      getInMemoryStore().set(sessionId, session);
    }
  },

  async get(sessionId: string): Promise<UserSession | null> {
    if (isKVConfigured) {
      const data = await kv.get<string>(`${SESSION_PREFIX}${sessionId}`);
      if (!data) return null;

      // Parse and convert date strings back to Date objects
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        lastAccessed: new Date(parsed.lastAccessed),
        expiresAt: new Date(parsed.expiresAt),
      };
    } else {
      return getInMemoryStore().get(sessionId) || null;
    }
  },

  async delete(sessionId: string): Promise<void> {
    if (isKVConfigured) {
      await kv.del(`${SESSION_PREFIX}${sessionId}`);
    } else {
      getInMemoryStore().delete(sessionId);
    }
  },
};

export async function createSession(user: User): Promise<string> {
  // First, clear any existing session cookie to prevent stale data
  const cookieStore = await cookies();
  const existingSessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (existingSessionId) {
    console.log('[Session] Clearing existing session:', existingSessionId);
    await sessionStore.delete(existingSessionId);
  }

  const sessionId = uuidv4();
  const now = new Date();

  const session: UserSession = {
    id: sessionId,
    userEmail: user.email,
    memberstackId: user.memberstackId,
    firstName: user.firstName,
    lastName: user.lastName,
    activePlans: user.activePlans,
    bestPlanId: user.bestPlanId,
    createdAt: now,
    lastAccessed: now,
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
    isActive: true,
  };

  // Store session
  await sessionStore.set(sessionId, session);
  console.log('[Session] Created new session:', sessionId, 'for user:', user.email, '(storage:', isKVConfigured ? 'Vercel KV' : 'in-memory', ')');

  // Set cookie
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS / 1000, // Convert to seconds
    path: '/',
  });

  return sessionId;
}

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    console.log('[Session] No session cookie found');
    return null;
  }

  const session = await sessionStore.get(sessionId);

  if (!session) {
    console.log('[Session] Session not found in store for ID:', sessionId);
    // Clear the invalid cookie
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  // Check if session is valid
  const now = new Date();
  if (!session.isActive || session.expiresAt < now) {
    // Session expired or inactive
    console.log('[Session] Session expired or inactive for user:', session.userEmail);
    await sessionStore.delete(sessionId);
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  // Refresh last accessed time
  session.lastAccessed = now;
  await sessionStore.set(sessionId, session);
  console.log('[Session] Valid session found for user:', session.userEmail);

  return session;
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();

  if (!session) {
    return null;
  }

  return {
    id: session.id,
    email: session.userEmail,
    firstName: session.firstName,
    lastName: session.lastName,
    activePlans: session.activePlans,
    bestPlanId: session.bestPlanId,
    memberstackId: session.memberstackId,
  };
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    // Mark session as inactive and delete
    const session = await sessionStore.get(sessionId);
    if (session) {
      session.isActive = false;
      await sessionStore.set(sessionId, session);
    }
    await sessionStore.delete(sessionId);
  }

  // Clear cookie
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}
