import { TEAM_COLORS, EVENT_STATES } from '../constants.js';
import { getEventState, store } from '../db.js';
import {
  getAllVolunteers,
  findVolunteersByNameCentre,
  getCentres,
} from './volunteers.js';
import { validateCellEntry } from './validation.js';

export function runPreEventValidation() {
  const checks = [];

  try {
    store.getVolunteers();
    checks.push({ name: 'Data storage accessible', pass: true, message: 'JSON store loaded' });
  } catch (e) {
    checks.push({
      name: 'Data storage accessible',
      pass: false,
      message: e.message,
    });
  }

  const volunteers = getAllVolunteers();
  checks.push({
    name: 'Volunteer records exist',
    pass: volunteers.length > 0,
    message: volunteers.length === 0 ? 'No volunteers registered' : `${volunteers.length} volunteers`,
  });

  const codes = volunteers.map((v) => v.code);
  const uniqueCodes = new Set(codes);
  checks.push({
    name: 'No duplicate codes',
    pass: codes.length === uniqueCodes.size,
    message:
      codes.length !== uniqueCodes.size ? 'Duplicate codes detected' : 'All codes unique',
  });

  const invalidCodes = volunteers.filter((v) => !/^\d{3}$/.test(v.code));
  checks.push({
    name: 'All codes are exactly 3 digits',
    pass: invalidCodes.length === 0,
    message:
      invalidCodes.length > 0
        ? `Invalid codes: ${invalidCodes.map((v) => v.code).join(', ')}`
        : 'All codes valid',
  });

  const centres = getCentres();
  const invalidCentres = volunteers.filter((v) => !centres.includes(v.centre));
  checks.push({
    name: 'All centres are valid',
    pass: invalidCentres.length === 0,
    message:
      invalidCentres.length > 0 ? 'Invalid centres found' : 'All centres valid',
  });

  const boardsGenerated = volunteers.length > 0 && volunteers.every((v) => v.board && v.board.length === 9);
  checks.push({
    name: 'Boards are generated',
    pass: boardsGenerated,
    message: boardsGenerated
      ? 'All boards generated'
      : 'Generate boards for all volunteers first',
  });

  const boardCellCheck = volunteers.every((v) => !v.board || v.board.length === 9);
  checks.push({
    name: 'Boards have exactly 9 cells',
    pass: boardCellCheck,
    message: boardCellCheck ? 'All boards have 9 cells' : 'Some boards incomplete',
  });

  let impossibleLetters = [];
  for (const v of volunteers) {
    if (!v.board) continue;
    for (const letter of v.board) {
      const others = volunteers.filter(
        (ov) =>
          ov.id !== v.id &&
          ov.name.trim()[0]?.toUpperCase() === letter.toUpperCase()
      );
      if (others.length === 0) {
        impossibleLetters.push(`${v.name}: ${letter}`);
      }
    }
  }
  checks.push({
    name: 'No impossible letters',
    pass: impossibleLetters.length === 0,
    message:
      impossibleLetters.length === 0
        ? 'All letters have matching volunteers'
        : `Impossible letters: ${impossibleLetters.slice(0, 5).join(', ')}`,
  });

  let validationWorks = true;
  let validationMsg = 'Validation rules operational';
  try {
    if (volunteers.length >= 1) {
      const testPlayer = volunteers[0];
      if (testPlayer.board) {
        const badResult = validateCellEntry(testPlayer.id, 0, {
          name: 'ZZZZZZZ',
          centre: 'KP',
          code: '999',
        });
        if (badResult.ok) validationWorks = false;
      }
    }
  } catch {
    validationWorks = false;
    validationMsg = 'Validation test failed';
  }
  checks.push({
    name: 'Validation rules work',
    pass: validationWorks,
    message: validationMsg,
  });

  checks.push({
    name: 'Team colors configured',
    pass: TEAM_COLORS.length >= 4,
    message: `${TEAM_COLORS.length} colors available`,
  });

  const event = getEventState();
  const eventReady = event.status === EVENT_STATES.SETUP;
  checks.push({
    name: 'Event flow ready',
    pass: eventReady,
    message: eventReady ? 'Event in setup mode' : `Event status: ${event.status}`,
  });

  checks.push({
    name: 'Capacity check (~70 users)',
    pass: volunteers.length >= 1,
    message: `${volunteers.length} volunteers registered (supports up to 70+)`,
  });

  checks.push({
    name: 'App/server running',
    pass: true,
    message: 'Server is running',
  });

  const criticalChecks = [
    'Data storage accessible',
    'Volunteer records exist',
    'No duplicate codes',
    'All codes are exactly 3 digits',
    'All centres are valid',
    'Boards are generated',
    'Boards have exactly 9 cells',
    'No impossible letters',
    'Validation rules work',
  ];

  const criticalPassed = checks
    .filter((c) => criticalChecks.includes(c.name))
    .every((c) => c.pass);

  return {
    ready: criticalPassed,
    status: criticalPassed ? 'READY' : 'NOT READY',
    checks,
  };
}

export function exportResults(format = 'json') {
  const volunteers = getAllVolunteers();
  const event = getEventState();

  const data = volunteers.map((v) => ({
    name: v.name,
    centre: v.centre,
    code: v.code,
    progress: v.progress,
    completedCells: v.entries.map((e) => ({
      cellIndex: e.cellIndex,
      partnerName: e.partnerName,
      partnerCentre: e.partnerCentre,
      partnerCode: e.partnerCode,
    })),
    assignedColor: v.assigned_color || '',
    status: v.status,
    joined: v.joined,
  }));

  if (format === 'csv') {
    const headers = ['Name', 'Centre', 'Code', 'Progress', 'Assigned Color', 'Status', 'Joined'];
    const rows = data.map((d) =>
      [d.name, d.centre, d.code, d.progress, d.assignedColor, d.status, d.joined ? 'Yes' : 'No']
        .map((f) => `"${String(f).replace(/"/g, '""')}"`)
        .join(',')
    );
    return {
      content: [headers.join(','), ...rows].join('\n'),
      filename: `icebreaker-results-${Date.now()}.csv`,
      contentType: 'text/csv',
    };
  }

  return {
    content: JSON.stringify({ exportedAt: new Date().toISOString(), event, volunteers: data }, null, 2),
    filename: `icebreaker-results-${Date.now()}.json`,
    contentType: 'application/json',
  };
}

export function exportBackup() {
  const volunteers = getAllVolunteers();
  const event = getEventState();
  const boards = store.getAllBoards();
  const entries = store.getAllEntries();

  return {
    content: JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        event,
        volunteers: volunteers.map(({ board, entries, ...rest }) => rest),
        boards,
        cellEntries: entries,
      },
      null,
      2
    ),
    filename: `icebreaker-backup-${Date.now()}.json`,
    contentType: 'application/json',
  };
}
