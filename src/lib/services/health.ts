import { createAdminClient } from '../supabase/admin';
import { getAllVolunteers, getEventState } from './volunteers';

export async function runPreEventValidation() {
  const volunteers = await getAllVolunteers();
  const activeVolunteers = volunteers.filter((v) => v.is_active);

  const supabase = createAdminClient();
  const { data: boards } = await supabase.from('game_boards').select('*');
  const boardList = (boards || []) as any[];

  const checks: { name: string; pass: boolean; message: string }[] = [];

  checks.push({
    name: 'Imported volunteer count',
    pass: activeVolunteers.length >= 1,
    message: `${activeVolunteers.length} active volunteers in registry`,
  });

  const duplicateCodes = activeVolunteers.length - new Set(activeVolunteers.map((v) => v.code)).size;
  checks.push({
    name: 'Unique 3-digit verification codes',
    pass: duplicateCodes === 0,
    message: duplicateCodes > 0 ? `${duplicateCodes} duplicate codes found` : 'All codes are unique',
  });

  const volunteersWithBoards = boardList.length;
  checks.push({
    name: 'Boards generated for all volunteers',
    pass: volunteersWithBoards === activeVolunteers.length && activeVolunteers.length > 0,
    message: `${volunteersWithBoards} / ${activeVolunteers.length} volunteers have boards`,
  });

  let duplicateCellsCount = 0;
  for (const b of boardList) {
    const letters = (b.cells as string[]) || [];
    const uniqueLetters = new Set(letters);
    if (letters.length !== uniqueLetters.size) {
      duplicateCellsCount++;
    }
  }
  checks.push({
    name: 'No duplicate board letters',
    pass: duplicateCellsCount === 0 || activeVolunteers.length < 25,
    message:
      duplicateCellsCount > 0
        ? `${duplicateCellsCount} boards have duplicate letters`
        : 'All boards have unique letters',
  });

  let impossibleLetters: string[] = [];
  for (const v of activeVolunteers) {
    const b = boardList.find((board) => board.volunteer_id === v.id);
    if (!b || !b.cells) continue;

    for (const letter of b.cells as string[]) {
      const others = activeVolunteers.filter(
        (ov) => ov.id !== v.id && ov.name.trim()[0]?.toUpperCase() === letter.toUpperCase()
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
      impossibleLetters.length > 0
        ? `${impossibleLetters.length} board cells cannot be matched: ${impossibleLetters.slice(0, 3).join(', ')}`
        : 'All board letters have matching volunteers',
  });

  const allReady = checks.every((c) => c.pass);

  return {
    ready: allReady,
    status: allReady ? 'PASS' : 'FAIL',
    checks,
  };
}

export async function exportResults(format: 'csv' | 'json') {
  const volunteers = await getAllVolunteers();
  const event = await getEventState();

  const supabase = createAdminClient();
  const { data: entries } = await supabase.from('cell_entries').select('*');
  const allEntries = (entries || []) as any[];

  if (format === 'csv') {
    const header = [
      'ID',
      'Name',
      'Centre',
      'Verification Code',
      'Joined',
      'Team Color',
      'Completed At',
      'Completion Position',
      'Cell Entries Count',
    ];

    const rows = volunteers.map((v) => {
      const vEntries = allEntries.filter((e) => e.volunteer_id === v.id);
      return [
        v.id,
        `"${v.name}"`,
        `"${v.centre}"`,
        v.code,
        v.joined ? 'Yes' : 'No',
        v.assigned_color || 'Unassigned',
        v.completed_at || '',
        v.completion_position || '',
        vEntries.length,
      ].join(',');
    });

    const csvContent = [header.join(','), ...rows].join('\n');
    return {
      contentType: 'text/csv',
      filename: `icebreaker-results-${new Date().toISOString().slice(0, 10)}.csv`,
      content: csvContent,
    };
  }

  const jsonContent = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      event,
      volunteers,
      cellEntriesCount: allEntries.length,
    },
    null,
    2
  );

  return {
    contentType: 'application/json',
    filename: `icebreaker-results-${new Date().toISOString().slice(0, 10)}.json`,
    content: jsonContent,
  };
}

export async function exportBackup() {
  const supabase = createAdminClient();
  const event = await getEventState();
  const volunteers = await getAllVolunteers();

  const { data: boards } = await supabase.from('game_boards').select('*');
  const { data: entries } = await supabase.from('cell_entries').select('*');

  const backupData = {
    exportedAt: new Date().toISOString(),
    eventState: event,
    volunteers,
    gameBoards: boards || [],
    cellEntries: entries || [],
  };

  return {
    contentType: 'application/json',
    filename: `icebreaker-backup-${new Date().toISOString().slice(0, 10)}.json`,
    content: JSON.stringify(backupData, null, 2),
  };
}
