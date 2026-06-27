import { store } from '../db.js';
import { findVolunteersByNameCentre, getVolunteerById } from './volunteers.js';

const BINGO_LINES = [
  // Rows
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  // Columns
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  // Diagonals
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20]
];

export function checkBingo(completedIndices) {
  const completedSet = new Set(completedIndices);
  completedSet.add(12); // Index 12 is FREE space, always completed
  
  for (const line of BINGO_LINES) {
    if (line.every(idx => completedSet.has(idx))) {
      return true;
    }
  }
  return false;
}

export function validateCellEntry(playerId, cellIndex, { name, centre, code }) {
  const trimmedName = (name || '').trim();
  const trimmedCode = (code || '').trim();

  if (!trimmedName || !centre || !trimmedCode) {
    return { ok: false, message: 'Please fill all fields.' };
  }

  const player = getVolunteerById(playerId);
  if (!player) return { ok: false, message: 'Player not found.' };

  const board = player.board;
  if (!board || cellIndex < 0 || cellIndex >= 25) {
    return { ok: false, message: 'Invalid cell.' };
  }

  if (cellIndex === 12) {
    return { ok: false, message: 'The center space is already completed.' };
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
  const completedIndices = entries.map((e) => e.cell_index);

  if (checkBingo(completedIndices)) {
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
