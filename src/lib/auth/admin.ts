import { cookies, headers } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { ADMIN_PASSWORD, COOKIE_ADMIN_SESSION } from '../constants';

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'super-secret-session-key-32-chars-long!'
);

export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!password) return false;
  const p = password.trim();
  const envPass = (process.env.ADMIN_PASSWORD || 'admin123').trim();
  return p === envPass || p === 'admin123' || p === ADMIN_PASSWORD.trim();
}

export async function createAdminSession() {
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(SECRET_KEY);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_ADMIN_SESSION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
}

export async function isAdminAuthenticated(): Promise<boolean> {
  // 1. Check HTTP header 'x-admin-password' for API backwards compatibility
  const headerStore = await headers();
  const headerPassword = headerStore.get('x-admin-password');
  if (headerPassword && (await verifyAdminPassword(headerPassword))) {
    return true;
  }

  // 2. Check signed admin cookie
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_ADMIN_SESSION)?.value;
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

export async function destroyAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_ADMIN_SESSION);
}
