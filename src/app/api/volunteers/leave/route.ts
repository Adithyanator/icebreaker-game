import { NextResponse } from 'next/server';
import { getVolunteerSession, destroyVolunteerSession } from '@/lib/auth/session';
import { setVolunteerJoined } from '@/lib/services/volunteers';

export async function POST() {
  const session = await getVolunteerSession();
  if (session?.volunteerId) {
    await setVolunteerJoined(session.volunteerId, false);
    await destroyVolunteerSession();
  }
  return NextResponse.json({ ok: true });
}
