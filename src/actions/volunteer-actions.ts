'use server';

import { createVolunteerSession, destroyVolunteerSession } from '@/lib/auth/session';
import {
  findVolunteersByNameCentre,
  getVolunteerById,
  setVolunteerJoined,
} from '@/lib/services/volunteers';
import { generateBoardForVolunteer } from '@/lib/services/board';

export async function volunteerLoginAction(name: string, centre: string): Promise<{ ok: boolean; error?: string; multiple?: boolean; volunteers?: any[]; volunteerId?: number }> {
  if (!name.trim() || !centre) {
    return { ok: false, error: 'Please enter your name and select a centre.' };
  }

  const matches = await findVolunteersByNameCentre(name, centre);

  // Only allow registered volunteers who exist in the registry list!
  if (matches.length === 0) {
    return {
      ok: false,
      error: 'Volunteer not found in registry. Please check your name and centre or ask the moderator to add you.',
    };
  }

  if (matches.length > 1) {
    return { ok: true, multiple: true, volunteers: matches };
  }

  const selectedId = matches[0].id;
  await setVolunteerJoined(selectedId, true);
  const volunteer = (await getVolunteerById(selectedId)) || matches[0];

  try {
    await generateBoardForVolunteer(volunteer.id);
  } catch {
    // Board generation requires registered volunteers
  }

  await createVolunteerSession(volunteer.id);
  return { ok: true, volunteerId: volunteer.id };
}

export async function volunteerSelectAction(id: number): Promise<{ ok: boolean; error?: string; volunteerId?: number }> {
  const volunteer = (await getVolunteerById(id)) || { id };
  await setVolunteerJoined(id, true);

  try {
    await generateBoardForVolunteer(id);
  } catch {
    // Board generation
  }

  await createVolunteerSession(id);
  return { ok: true, volunteerId: id };
}

export async function volunteerLogoutAction(id?: number) {
  if (id) {
    await setVolunteerJoined(id, false);
  }
  await destroyVolunteerSession();
  return { ok: true };
}
