import { store } from '../db.js';
import { findVolunteersByNameCentre, getVolunteerById } from './volunteers.js';

export function validateCellEntry(playerId, cellIndex, { name, centre, code }) {
  const trimmedName = (name || '').trim();
  const trimmedCode = (code || '').trim();

  if (!trimmedName || !centre || !trimmedCode) {
    return { ok: false, message: 'Please fill all fields.' };
  }

  const player = getVolunteerById(playerId);
  if (!player) return { ok: false, message: 'Player not found.' };

  const board = player.board;
  if (!board || cellIndex < 0 || cellIndex >= 9) {
    return { ok: false, message: 'Invalid cell.' };
  }

  const cellLetter = board[cellIndex].toUpperCase();
  const nameFirstLetter = trimmedName[0]?.toUpperCase();

  if (nameFirstLetter !== cellLetter) {
    return {
      ok: false,
      message: `The name must start with the letter ${cellLetter}.`,
    };
  }

  const matches = findVolunteersByNameCentre(trimmedName, centre);
  const partner = matches.find((v) => v.code === trimmedCode);

  if (!partner) {
    return {
      ok: false,
      message:
        'Volunteer details do not match our records. Please check the name, centre, and code.',
    };
  }

  if (partner.id === playerId) {
    return {
      ok: false,
      message: 'You cannot enter your own details. Please find another volunteer.',
    };
  }

  const entries = store.getEntries(playerId);
  if (entries.some((e) => e.partner_id === partner.id)) {
    return {
      ok: false,
      message: 'This volunteer has already been used in your board.',
    };
  }

  if (entries.some((e) => e.cell_index === cellIndex)) {
    return { ok: false, message: 'This cell is already completed.' };
  }

  return { ok: true, partner };
}

export function saveCellEntry(playerId, cellIndex, partner) {
  store.addEntry({
    volunteer_id: playerId,
    cell_index: cellIndex,
    partner_id: partner.id,
    partner_name: partner.name,
    partner_centre: partner.centre,
    partner_code: partner.code,
  });

  const entries = store.getEntries(playerId);
  if (entries.length === 9) {
    const volunteer = store.getVolunteerById(playerId);
    if (volunteer && !volunteer.completed_at) {
      const completedCount = store.getVolunteers().filter((v) => v.completed_at).length;
      store.updateVolunteer(playerId, {
        completed_at: new Date().toISOString(),
        completion_position: completedCount + 1,
      });
    }
  }

  return getVolunteerById(playerId);
}
