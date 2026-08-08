import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth/admin';
import { getAllVolunteers, getEventState, getJoinedCount } from '@/lib/services/volunteers';

export async function GET() {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const volunteers = await getAllVolunteers();
  const activeVolunteers = volunteers.filter((v) => v.is_active);
  const event = await getEventState();
  const joinedCount = await getJoinedCount();

  // ONLY volunteers who have actively logged in (joined === true) contribute to joinedLetters
  const joinedVolunteers = activeVolunteers.filter((v) => v.joined);

  // Preserve duplicate counts for initials (e.g. 3 'A's for Adithya, Aqssa, Aleena)
  const joinedLetters = joinedVolunteers
    .map((v) => v.name.trim()[0]?.toUpperCase())
    .filter(Boolean)
    .sort();

  return NextResponse.json({
    event,
    joinedCount,
    totalVolunteers: activeVolunteers.length,
    playing: activeVolunteers.filter((v) => v.joined && !v.completed_at).length,
    completed: activeVolunteers.filter((v) => !!v.completed_at).length,
    waiting: activeVolunteers.filter((v) => !v.joined).length,
    joinedLetters,
  });
}
