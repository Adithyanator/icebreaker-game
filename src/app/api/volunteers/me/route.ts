import { NextResponse } from 'next/server';
import { getVolunteerSession } from '@/lib/auth/session';
import { getVolunteerPublic } from '@/lib/services/volunteers';

export async function GET(request: Request) {
  const customId = request.headers.get('x-volunteer-id');
  let volunteerId: number | null = customId ? parseInt(customId, 10) : null;

  if (!volunteerId || isNaN(volunteerId)) {
    const session = await getVolunteerSession();
    volunteerId = session?.volunteerId || null;
  }

  if (!volunteerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const volunteer = await getVolunteerPublic(volunteerId);
  if (!volunteer) {
    return NextResponse.json({ error: 'Volunteer not found' }, { status: 404 });
  }

  return NextResponse.json({ volunteer });
}
