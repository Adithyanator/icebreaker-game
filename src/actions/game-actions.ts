'use server';

import { getVolunteerSession } from '@/lib/auth/session';
import { getEventState } from '@/lib/services/volunteers';
import { validateCellEntry, saveCellEntry, CellEntrySchema } from '@/lib/services/validation';
import { EVENT_STATES } from '@/lib/constants';

export async function submitCellEntryAction(formData: {
  cellIndex: number;
  name: string;
  centre: string;
  code: string;
}) {
  const session = await getVolunteerSession();
  if (!session) {
    return { ok: false, error: 'Unauthorized session. Please log in again.' };
  }

  const event = await getEventState();
  if (event.status !== EVENT_STATES.ACTIVE) {
    return { ok: false, error: 'Event is not active right now.' };
  }

  const parsed = CellEntrySchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, error: 'Please fill in all fields correctly.' };
  }

  const validation = await validateCellEntry(session.volunteerId, parsed.data.cellIndex, {
    name: parsed.data.name,
    centre: parsed.data.centre,
    code: parsed.data.code,
  });

  if (!validation.ok || !validation.partner) {
    return { ok: false, error: validation.message || 'Validation failed.' };
  }

  const saved = await saveCellEntry(session.volunteerId, parsed.data.cellIndex, validation.partner.id);
  if (!saved.ok) {
    return { ok: false, error: 'Failed to save cell entry.' };
  }

  return {
    ok: true,
    entry: saved.entry,
    isBingo: saved.isBingo,
    completionPosition: saved.completionPosition,
  };
}
