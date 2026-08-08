export const CENTRES = ['KP English', 'KP Tution', 'PB', 'VB', 'EJ'] as const;

export const TEAM_COLORS = [
  'Red',
  'Blue',
  'Green',
  'Purple',
  'Pink',
  'Grey',
  'Yellow',
] as const;

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

export const DEFAULT_SPREADSHEET_URL =
  'https://docs.google.com/spreadsheets/d/12dZRMvQzgJjGn2iTGWx6Nc5i1EZavEVdOEy2wy923cs/edit?usp=sharing';

export const SEED_VOLUNTEERS: Array<{ name: string; centre: string; code: string; is_seed: boolean }> = [];

export const RESERVED_CODES: string[] = [];

export const EVENT_STATES = {
  SETUP: 'setup',
  ACTIVE: 'active',
  PAUSED: 'paused',
  REVEALED: 'revealed',
} as const;

export const COOKIE_VOLUNTEER_SESSION = 'ui_volunteer_session';
export const COOKIE_ADMIN_SESSION = 'ui_admin_auth';
