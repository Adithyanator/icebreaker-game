import { CENTRES, TEAM_COLORS, RESERVED_CODES } from '../constants.js';
import { store } from '../db.js';

export function getAllVolunteers() {
  return store.getVolunteers().map(enrichVolunteer).sort((a, b) => a.name.localeCompare(b.name));
}

export function getVolunteerById(id) {
  const v = store.getVolunteerById(id);
  return v ? enrichVolunteer(v) : null;
}

export function findVolunteersByNameCentre(name, centre) {
  return store.findVolunteersByNameCentre(name, centre).map(enrichVolunteer);
}

function enrichVolunteer(v) {
  const entries = store.getEntries(v.id);
  const board = store.getBoard(v.id);
  const progress = entries.length;
  let status = 'not_joined';
  if (v.joined) {
    status = progress === 0 ? 'waiting' : progress < 9 ? 'playing' : 'completed';
  }
  return {
    ...v,
    is_seed: !!v.is_seed,
    joined: !!v.joined,
    progress,
    status,
    board: board ? board.cells : null,
    entries: entries.map((e) => ({
      cellIndex: e.cell_index,
      partnerId: e.partner_id,
      partnerName: e.partner_name,
      partnerCentre: e.partner_centre,
      partnerCode: e.partner_code,
    })),
  };
}

export function generateUniqueCode() {
  const existing = new Set(store.getVolunteers().map((r) => r.code));
  RESERVED_CODES.forEach((c) => existing.add(c));

  for (let attempt = 0; attempt < 1000; attempt++) {
    const code = String(Math.floor(100 + Math.random() * 900));
    if (!existing.has(code)) return code;
  }
  throw new Error('Unable to generate unique code');
}

export function addVolunteer(name, centre) {
  const cleanName = (name || '').trim();
  if (!cleanName) throw new Error('Name is required');
  const cleanCentre = (centre || '').trim().toUpperCase();
  if (!cleanCentre) throw new Error('Centre is required');
  const code = generateUniqueCode();
  const v = store.addVolunteer(cleanName, cleanCentre, code);
  return enrichVolunteer(v);
}

export function updateVolunteer(id, fields) {
  const allowed = ['name', 'centre', 'code'];
  const updates = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) updates[key] = fields[key];
  }
  if (Object.keys(updates).length === 0) return getVolunteerById(id);

  if (updates.name !== undefined) {
    updates.name = (updates.name || '').trim();
    if (!updates.name) throw new Error('Name is required');
  }
  if (updates.centre !== undefined) {
    updates.centre = (updates.centre || '').trim().toUpperCase();
    if (!updates.centre) throw new Error('Centre is required');
  }
  if (updates.code) {
    if (!/^\d{3}$/.test(updates.code)) throw new Error('Code must be exactly 3 digits');
    const dup = store.getVolunteers().find((v) => v.code === updates.code && v.id !== id);
    if (dup) throw new Error('Code already in use');
  }

  store.updateVolunteer(id, updates);
  return getVolunteerById(id);
}

export function deleteVolunteer(id) {
  store.deleteVolunteer(id);
}

export function setVolunteerJoined(id) {
  store.updateVolunteer(id, { joined: 1 });
  return getVolunteerById(id);
}

export function regenerateCode(id) {
  const code = generateUniqueCode();
  store.updateVolunteer(id, { code });
  return getVolunteerById(id);
}

export function getJoinedCount() {
  return store.getVolunteers().filter((v) => v.joined).length;
}

export function getCentres() {
  const defaults = ['KP', 'VB', 'PB', 'EJ', 'STC'];
  const dbVolunteers = store.getVolunteers();
  const dbCentres = dbVolunteers.map(v => v.centre).filter(Boolean);
  const allCentres = new Set([...defaults, ...dbCentres]);
  return Array.from(allCentres).sort();
}

export function generateBoardForVolunteer(volunteerId) {
  const existing = store.getBoard(volunteerId);
  if (existing) return existing.cells;

  const player = store.getVolunteerById(volunteerId);
  if (!player) throw new Error('Volunteer not found');

  const allVolunteers = store.getVolunteers();
  let otherVolunteers = allVolunteers.filter((v) => v.id !== player.id && v.joined);
  
  // Fallback: if no one has joined yet (e.g. during pre-event setup or test initialization),
  // we use all registered volunteers so that boards can still be generated.
  if (otherVolunteers.length === 0) {
    otherVolunteers = allVolunteers.filter((v) => v.id !== player.id);
  }

  const otherLetters = otherVolunteers
    .map((v) => v.name.trim()[0]?.toUpperCase())
    .filter(Boolean);

  if (otherLetters.length === 0) {
    throw new Error(
      'No other volunteers available for board generation. Add more volunteers first.'
    );
  }

  // Count letter frequencies in the pool of other volunteers
  const freq = {};
  otherLetters.forEach((l) => {
    freq[l] = (freq[l] || 0) + 1;
  });

  const cells = [];
  const availableFreq = { ...freq };

  for (let i = 0; i < 9; i++) {
    const candidateLetters = Object.keys(availableFreq).filter((l) => availableFreq[l] > 0);
    if (candidateLetters.length > 0) {
      // Pick a random letter from candidates that still have capacity
      const letter = candidateLetters[Math.floor(Math.random() * candidateLetters.length)];
      cells.push(letter);
      availableFreq[letter]--;
    } else {
      // Fallback: if we run out of letters because the pool is too small,
      // we allow duplicates by selecting from any of the unique letters in the pool
      const allLetters = Object.keys(freq);
      const letter = allLetters[Math.floor(Math.random() * allLetters.length)];
      cells.push(letter);
    }
  }

  store.setBoard(volunteerId, cells);
  return cells;
}

export function generateAllBoards() {
  store.clearAllBoards();
  const volunteers = store.getVolunteers();
  return volunteers.map((v) => ({
    volunteerId: v.id,
    cells: generateBoardForVolunteer(v.id),
  }));
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function resetVolunteerProgress(id) {
  store.deleteEntries(id);
  store.updateVolunteer(id, { completed_at: null, completion_position: null });
  return getVolunteerById(id);
}

export function resetAllProgress() {
  store.clearAllEntries();
  store.resetVolunteers();
}

export function assignColorsEvenly() {
  const completed = store.getVolunteers().filter((v) => {
    return store.getEntries(v.id).length === 9;
  });

  if (completed.length === 0) return [];

  const shuffled = shuffle([...completed]);
  const assignments = [];

  shuffled.forEach((v, i) => {
    const color = TEAM_COLORS[i % TEAM_COLORS.length];
    store.updateVolunteer(v.id, { assigned_color: color });
    assignments.push({ volunteerId: v.id, color });
  });

  return assignments;
}

export function getVolunteerPublic(id) {
  const v = getVolunteerById(id);
  if (!v) return null;
  return {
    id: v.id,
    name: v.name,
    centre: v.centre,
    code: v.code,
    joined: v.joined,
    progress: v.progress,
    status: v.status,
    board: v.board,
    entries: v.entries,
    assignedColor: v.assigned_color,
    completionPosition: v.completion_position,
  };
}
