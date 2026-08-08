'use server';

import {
  verifyAdminPassword,
  createAdminSession,
  destroyAdminSession,
  isAdminAuthenticated,
} from '@/lib/auth/admin';
import {
  updateEventState,
  resetAllProgress,
  splitTeams,
  updateVolunteer,
  deleteVolunteer,
  regenerateCode,
  resetVolunteerProgress,
} from '@/lib/services/volunteers';
import { generateAllBoards, generateBoardForVolunteer } from '@/lib/services/board';
import { EVENT_STATES } from '@/lib/constants';

export async function adminLoginAction(password: string) {
  const isValid = await verifyAdminPassword(password);
  if (!isValid) {
    return { ok: false, error: 'Incorrect password' };
  }

  await createAdminSession();
  return { ok: true };
}

export async function adminLogoutAction() {
  await destroyAdminSession();
  return { ok: true };
}

async function requireAdminAuth() {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    throw new Error('Unauthorized');
  }
}

export async function generateAllBoardsAction() {
  await requireAdminAuth();
  const boards = await generateAllBoards();
  return { ok: true, count: boards.length };
}

export async function startEventAction() {
  await requireAdminAuth();
  const event = await updateEventState({
    status: EVENT_STATES.ACTIVE,
    started_at: new Date().toISOString(),
  });
  return { ok: true, event };
}

export async function pauseEventAction() {
  await requireAdminAuth();
  const event = await updateEventState({ status: EVENT_STATES.PAUSED });
  return { ok: true, event };
}

export async function resumeEventAction() {
  await requireAdminAuth();
  const event = await updateEventState({ status: EVENT_STATES.ACTIVE });
  return { ok: true, event };
}

export async function revealTeamsAction() {
  await requireAdminAuth();
  const assignments = await splitTeams();
  const event = await updateEventState({
    status: EVENT_STATES.REVEALED,
    revealed_at: new Date().toISOString(),
  });
  return { ok: true, event, assignments };
}

export async function resetEventAction() {
  await requireAdminAuth();
  await resetAllProgress();
  const event = await updateEventState({
    status: EVENT_STATES.SETUP,
    started_at: null,
    revealed_at: null,
  });
  return { ok: true, event };
}

export async function updateVolunteerAction(id: number, updates: { name?: string; centre?: string }) {
  await requireAdminAuth();
  const volunteer = await updateVolunteer(id, updates);
  return { ok: true, volunteer };
}

export async function deleteVolunteerAction(id: number) {
  await requireAdminAuth();
  await deleteVolunteer(id);
  return { ok: true };
}

export async function regenerateCodeAction(id: number) {
  await requireAdminAuth();
  const result = await regenerateCode(id);
  return { ok: true, ...result };
}

export async function generateBoardAction(id: number) {
  await requireAdminAuth();
  const cells = await generateBoardForVolunteer(id);
  return { ok: true, cells };
}

export async function resetVolunteerProgressAction(id: number) {
  await requireAdminAuth();
  const volunteer = await resetVolunteerProgress(id);
  return { ok: true, volunteer };
}
