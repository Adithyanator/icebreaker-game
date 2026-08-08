import { NextResponse } from 'next/server';
import { getVolunteerSession } from '@/lib/auth/session';
import { getEventState } from '@/lib/services/volunteers';
import { validateCellEntry, saveCellEntry, CellEntrySchema } from '@/lib/services/validation';
import { EVENT_STATES } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const customId = request.headers.get('x-volunteer-id');
    let volunteerId: number | null = customId ? parseInt(customId, 10) : null;

    const body = await request.json();

    if ((!volunteerId || isNaN(volunteerId)) && body.volunteerId) {
      volunteerId = parseInt(body.volunteerId, 10);
    }

    if (!volunteerId || isNaN(volunteerId)) {
      const session = await getVolunteerSession();
      volunteerId = session?.volunteerId || null;
    }

    if (!volunteerId) {
      return NextResponse.json({ error: 'Unauthorized session. Please log in again.' }, { status: 401 });
    }

    const event = await getEventState();
    if (event.status !== EVENT_STATES.ACTIVE) {
      return NextResponse.json({ error: 'Event is not active right now.' }, { status: 400 });
    }

    const parsed = CellEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Please fill in all fields correctly.' }, { status: 400 });
    }

    const validation = await validateCellEntry(volunteerId, parsed.data.cellIndex, {
      name: parsed.data.name,
      centre: parsed.data.centre,
      code: parsed.data.code,
    });

    if (!validation.ok || !validation.partner) {
      return NextResponse.json({ error: validation.message || 'Validation failed.' }, { status: 400 });
    }

    const saved = await saveCellEntry(volunteerId, parsed.data.cellIndex, validation.partner.id);
    if (!saved.ok) {
      return NextResponse.json({ error: 'Failed to save cell entry.' }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      entry: saved.entry,
      isBingo: saved.isBingo,
      completionPosition: saved.completionPosition,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error submitting entry' }, { status: 400 });
  }
}
