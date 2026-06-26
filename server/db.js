import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SEED_VOLUNTEERS } from './constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

const DEFAULT_STATE = {
  volunteers: [],
  boards: [],
  cellEntries: [],
  eventState: {
    id: 1,
    status: 'setup',
    timer_enabled: 0,
    timer_seconds: 0,
    started_at: null,
    revealed_at: null,
    updated_at: new Date().toISOString(),
  },
  nextVolunteerId: 1,
  nextBoardId: 1,
  nextEntryId: 1,
};

let state = null;
let saveTimer = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadState() {
  ensureDir();
  if (fs.existsSync(DB_FILE)) {
    state = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } else {
    state = structuredClone(DEFAULT_STATE);
    seedIfEmpty();
    persistNow();
  }
}

function persistNow() {
  ensureDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(persistNow, 50);
}

function seedIfEmpty() {
  if (state.volunteers.length === 0) {
    for (const v of SEED_VOLUNTEERS) {
      state.volunteers.push({
        id: state.nextVolunteerId++,
        name: v.name,
        centre: v.centre,
        code: v.code,
        is_seed: v.is_seed,
        joined: 0,
        assigned_color: null,
        created_at: new Date().toISOString(),
      });
    }
    console.log('Seeded trial volunteer data');
  }
}

export function getDb() {
  if (!state) loadState();
  return createStore();
}

function createStore() {
  return {
    getState: () => state,
    save: scheduleSave,
    saveNow: persistNow,
  };
}

export function getEventState() {
  getDb();
  return { ...state.eventState };
}

export function updateEventState(fields) {
  getDb();
  Object.assign(state.eventState, fields, {
    updated_at: new Date().toISOString(),
  });
  scheduleSave();
  return getEventState();
}

// Query helpers
export const store = {
  getVolunteers: () => {
    getDb();
    return [...state.volunteers];
  },

  getVolunteerById: (id) => {
    getDb();
    return state.volunteers.find((v) => v.id === id) || null;
  },

  findVolunteersByNameCentre: (name, centre) => {
    getDb();
    const n = name.trim().toLowerCase();
    const c = (centre || '').trim().toLowerCase();
    return state.volunteers.filter(
      (v) => v.name.trim().toLowerCase() === n && (v.centre || '').trim().toLowerCase() === c
    );
  },

  addVolunteer: (name, centre, code) => {
    getDb();
    const v = {
      id: state.nextVolunteerId++,
      name: name.trim(),
      centre,
      code,
      is_seed: 0,
      joined: 0,
      assigned_color: null,
      created_at: new Date().toISOString(),
    };
    state.volunteers.push(v);
    scheduleSave();
    return v;
  },

  updateVolunteer: (id, updates) => {
    getDb();
    const idx = state.volunteers.findIndex((v) => v.id === id);
    if (idx === -1) return null;
    state.volunteers[idx] = { ...state.volunteers[idx], ...updates };
    scheduleSave();
    return state.volunteers[idx];
  },

  deleteVolunteer: (id) => {
    getDb();
    state.volunteers = state.volunteers.filter((v) => v.id !== id);
    state.boards = state.boards.filter((b) => b.volunteer_id !== id);
    state.cellEntries = state.cellEntries.filter(
      (e) => e.volunteer_id !== id && e.partner_id !== id
    );
    scheduleSave();
  },

  getBoard: (volunteerId) => {
    getDb();
    return state.boards.find((b) => b.volunteer_id === volunteerId) || null;
  },

  setBoard: (volunteerId, cells) => {
    getDb();
    const existing = state.boards.find((b) => b.volunteer_id === volunteerId);
    if (existing) return existing;
    const board = {
      id: state.nextBoardId++,
      volunteer_id: volunteerId,
      cells,
      created_at: new Date().toISOString(),
    };
    state.boards.push(board);
    scheduleSave();
    return board;
  },

  getEntries: (volunteerId) => {
    getDb();
    return state.cellEntries
      .filter((e) => e.volunteer_id === volunteerId)
      .sort((a, b) => a.cell_index - b.cell_index);
  },

  addEntry: (entry) => {
    getDb();
    const e = { id: state.nextEntryId++, ...entry, created_at: new Date().toISOString() };
    state.cellEntries.push(e);
    scheduleSave();
    return e;
  },

  deleteEntries: (volunteerId) => {
    getDb();
    state.cellEntries = state.cellEntries.filter((e) => e.volunteer_id !== volunteerId);
    scheduleSave();
  },

  clearAllEntries: () => {
    getDb();
    state.cellEntries = [];
    scheduleSave();
  },

  clearAllBoards: () => {
    getDb();
    state.boards = [];
    scheduleSave();
  },

  resetVolunteers: () => {
    getDb();
    state.volunteers.forEach((v) => {
      v.joined = 0;
      v.assigned_color = null;
    });
    scheduleSave();
  },

  getAllBoards: () => {
    getDb();
    return [...state.boards];
  },

  getAllEntries: () => {
    getDb();
    return [...state.cellEntries];
  },
};
