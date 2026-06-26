export const CENTRES = ['KP', 'VB', 'PB', 'EJ', 'STC'];

export const TEAM_COLORS = [
  'Red',
  'Blue',
  'Green',
  'Yellow',
  'Purple',
  'Orange',
  'Pink',
  'White',
];

export const ADMIN_PASSWORD = 'ui-icebreaker-2026';

export const SEED_VOLUNTEERS = [
  { name: 'Adithyan', centre: 'KP', code: '111', is_seed: 1 },
  { name: 'Dilshan', centre: 'VB', code: '200', is_seed: 1 },
  { name: 'Kalyani', centre: 'PB', code: '400', is_seed: 1 },
  { name: 'Sreyaa', centre: 'STC', code: '100', is_seed: 1 },
  { name: 'Aqsa', centre: 'EJ', code: '300', is_seed: 1 },
];

export const RESERVED_CODES = SEED_VOLUNTEERS.map((v) => v.code);

export const EVENT_STATES = {
  SETUP: 'setup',
  ACTIVE: 'active',
  PAUSED: 'paused',
  REVEALED: 'revealed',
};
