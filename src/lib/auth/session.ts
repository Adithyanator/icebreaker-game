import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { COOKIE_VOLUNTEER_SESSION } from '../constants';

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'super-secret-session-key-32-chars-long!'
);

export async function createVolunteerSession(volunteerId: number) {
  const token = await new SignJWT({ volunteerId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET_KEY);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_VOLUNTEER_SESSION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export async function getVolunteerSession(): Promise<{ volunteerId: number } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_VOLUNTEER_SESSION)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    if (typeof payload.volunteerId === 'number') {
      return { volunteerId: payload.volunteerId };
    }
    return null;
  } catch {
    return null;
  }
}

export async function destroyVolunteerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_VOLUNTEER_SESSION);
}
