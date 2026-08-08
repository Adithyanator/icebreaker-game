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
    if (v.completed_at) {
      status = 'completed';
    } else {
      status = progress === 0 ? 'waiting' : 'playing';
    }
  }
  return {
    ...v,
    is_seed: !!v.is_seed,
    joined: !!v.joined,
    progress,
    status,
    board: board ? board.cells : null,
    completionPosition: v.completion_position,
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
  if (existing && existing.cells?.length === 25) return existing.cells;

  const player = store.getVolunteerById(volunteerId);
  if (!player) throw new Error('Volunteer not found');

  const allVolunteers = store.getVolunteers();
  let otherVolunteers = allVolunteers.filter((v) => v.id !== player.id && v.joined);
  
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

  // Calculate volunteer frequency per initial letter
  const freq = {};
  otherLetters.forEach((l) => {
    freq[l] = (freq[l] || 0) + 1;
  });

  const uniqueLetters = Object.keys(freq);
  const totalPlayable = 25; // All 25 cells are playable letter cells

  // 1. Build balanced letter pool for 25 cells
  const pool = [];
  if (uniqueLetters.length > 0) {
    const baseQuota = Math.floor(totalPlayable / uniqueLetters.length);
    const remainder = totalPlayable % uniqueLetters.length;

    uniqueLetters.forEach((letter) => {
      for (let i = 0; i < baseQuota; i++) {
        pool.push(letter);
      }
    });

    if (remainder > 0) {
      const sortedByFreq = [...uniqueLetters].sort((a, b) => freq[b] - freq[a]);
      for (let i = 0; i < remainder; i++) {
        pool.push(sortedByFreq[i % sortedByFreq.length]);
      }
    }
  }

  shuffle(pool);

  // 2. Place letters into 5x5 grid (all 25 cells)
  const cells = new Array(25).fill(null);

  const remainingPool = [...pool];

  const getRowCounts = (rowIndex) => {
    const counts = {};
    for (let c = 0; c < 5; c++) {
      const idx = rowIndex * 5 + c;
      if (cells[idx]) {
        counts[cells[idx]] = (counts[cells[idx]] || 0) + 1;
      }
    }
    return counts;
  };

  for (let i = 0; i < 25; i++) {
    const rowIndex = Math.floor(i / 5);
    const rowCounts = getRowCounts(rowIndex);

    const topIdx = i >= 5 ? i - 5 : -1;
    const leftIdx = i % 5 !== 0 ? i - 1 : -1;

    const topVal = topIdx >= 0 ? cells[topIdx] : null;
    const leftVal = leftIdx >= 0 ? cells[leftIdx] : null;

    // Prefer candidates that are non-adjacent and stay under the row cap (freq[letter])
    let validCandidates = remainingPool.filter((letter) => {
      const notAdjacent = letter !== topVal && letter !== leftVal;
      const rowCount = rowCounts[letter] || 0;
      const underRowCap = rowCount < (freq[letter] || 1);
      return notAdjacent && underRowCap;
    });

    // Relax adjacency if needed while preserving row cap
    if (validCandidates.length === 0) {
      validCandidates = remainingPool.filter((letter) => {
        const rowCount = rowCounts[letter] || 0;
        return rowCount < (freq[letter] || 1);
      });
    }

    // Relax row cap if needed while avoiding adjacency
    if (validCandidates.length === 0) {
      validCandidates = remainingPool.filter(
        (letter) => letter !== topVal && letter !== leftVal
      );
    }

    // Ultimate fallback
    if (validCandidates.length === 0) {
      validCandidates = [...remainingPool];
    }

    const chosenLetter = validCandidates[Math.floor(Math.random() * validCandidates.length)];
    cells[i] = chosenLetter;

    const removeIdx = remainingPool.indexOf(chosenLetter);
    if (removeIdx !== -1) {
      remainingPool.splice(removeIdx, 1);
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
  const participants = store.getVolunteers().filter((v) => v.joined);

  if (participants.length === 0) return [];

  const shuffled = shuffle([...participants]);
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

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(s => s.replace(/^"|"$/g, '').trim());
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return [];
  
  const headers = parseCSVLine(lines[0]);
  const nameIdx = headers.findIndex(h => h.toLowerCase().includes('name'));
  const centreIdx = headers.findIndex(h => h.toLowerCase().includes('centre') || h.toLowerCase().includes('center') || h.toLowerCase().includes('branch'));
  
  if (nameIdx === -1) {
    throw new Error('Spreadsheet must contain a "Name" column.');
  }
  if (centreIdx === -1) {
    throw new Error('Spreadsheet must contain a "Centre" or "Center" column.');
  }
  
  const volunteers = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCSVLine(line);
    if (cols.length <= Math.max(nameIdx, centreIdx)) continue;
    
    const name = cols[nameIdx]?.trim();
    const centre = cols[centreIdx]?.trim().toUpperCase();
    if (name && centre) {
      volunteers.push({ name, centre });
    }
  }
  return volunteers;
}

export async function syncVolunteersFromSpreadsheet(rawUrl) {
  if (!rawUrl) throw new Error('Spreadsheet URL is required');

  let csvUrl = rawUrl.trim();
  if (csvUrl.includes('docs.google.com/spreadsheets')) {
    const match = csvUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      const spreadsheetId = match[1];
      csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
    }
  }

  const res = await fetch(csvUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch spreadsheet: ${res.statusText}`);
  }
  const text = await res.text();

  const parsed = parseCSV(text);
  if (parsed.length === 0) {
    throw new Error('No valid volunteer records found in the spreadsheet.');
  }

  const existingVols = store.getVolunteers();
  const keepVols = [];

  for (const item of parsed) {
    const cleanName = item.name.trim();
    const cleanCentre = item.centre.trim().toUpperCase();

    if (keepVols.some(kv => kv.name.toLowerCase() === cleanName.toLowerCase() && kv.centre === cleanCentre)) {
      continue;
    }

    const existing = existingVols.find(
      (v) => v.name.toLowerCase() === cleanName.toLowerCase() && v.centre === cleanCentre
    );

    if (existing) {
      keepVols.push(existing);
    } else {
      const code = generateUniqueCode();
      const newVol = {
        id: store.getNextVolunteerId(),
        name: cleanName,
        centre: cleanCentre,
        code,
        is_seed: 0,
        joined: 0,
        assigned_color: null,
        created_at: new Date().toISOString(),
      };
      keepVols.push(newVol);
    }
  }

  store.syncVolunteers(keepVols);
  return keepVols.length;
}
