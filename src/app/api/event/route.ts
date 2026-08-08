import { NextResponse } from 'next/server';
import { getEventState, getJoinedCount, getCentres } from '@/lib/services/volunteers';

export async function GET() {
  const event = await getEventState();
  const joinedCount = await getJoinedCount();
  const centres = await getCentres();

  return NextResponse.json({
    status: event.status,
    timerEnabled: !!event.timer_enabled,
    timerSeconds: event.timer_seconds,
    joinedCount,
    centres,
  });
}
