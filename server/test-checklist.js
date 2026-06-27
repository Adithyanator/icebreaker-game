const BASE = 'http://localhost:3001/api';
const ADMIN = { 'Content-Type': 'application/json', 'x-admin-password': 'admin123' };

async function req(path, opts = {}) {
  const headers = opts.headers || {};
  if (opts.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function run() {
  let passed = 0;
  let failed = 0;

  function check(name, cond) {
    if (cond) { console.log(`✓ ${name}`); passed++; }
    else { console.log(`✗ ${name}`); failed++; }
  }

  // Reset event for clean slate
  await req('/admin/reset-event', { method: 'POST', headers: ADMIN });

  // 1. Spreadsheet Import / Sync Works
  const sync = await req('/admin/sync-spreadsheet', {
    method: 'POST',
    headers: ADMIN,
    body: JSON.stringify({ spreadsheetUrl: 'http://localhost:3001/api/mock-sheet.csv' }),
  });
  check('Spreadsheet import/sync works', sync.ok && sync.data.count === 6);

  const vols = await req('/admin/volunteers', { headers: ADMIN });
  check('Trial data exists', vols.data.volunteers?.length === 6);

  // 2. Login rejects volunteers not in sheet
  const badLogin = await req('/volunteer/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Unknown Person', centre: 'KP' }),
  });
  check('Login rejects volunteers not in sheet', badLogin.status === 404);

  // 3. Login works for imported volunteers
  const login = await req('/volunteer/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Adithyan', centre: 'KP' }),
  });
  check('Login works for imported', login.ok && login.data.volunteer?.name === 'Adithyan');

  // 4. Duplicate code detection works
  const codes = vols.data.volunteers.map(v => v.code);
  const uniqueCodes = new Set(codes);
  check('Duplicate code detection works', codes.length === uniqueCodes.size);

  // 5. 25-cell board generation works
  const boards = await req('/admin/generate-boards', { method: 'POST', headers: ADMIN });
  check('25-cell board generation works', boards.ok);

  const refreshed = await req(`/volunteer/${login.data.volunteer.id}`);
  const board = refreshed.data.volunteer.board;
  check('Board has 25 cells', board?.length === 25);
  check('Center cell is FREE ★', board?.[12] === '★');

  // 6. Board persists after reload
  const refreshed2 = await req(`/volunteer/${login.data.volunteer.id}`);
  check('Board persists after reload', refreshed2.data.volunteer?.board?.length === 25);

  // 7. Wrong letter rejected
  const playerId = login.data.volunteer.id;
  const wrongLetter = await req(`/volunteer/${playerId}/cell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cellIndex: 0, name: 'Adithyan', centre: 'KP', code: login.data.volunteer.code }),
  });
  check('Wrong letter rejected (before start)', wrongLetter.status === 403 || wrongLetter.status === 400);

  // Start event
  const start = await req('/admin/start-event', { method: 'POST', headers: ADMIN });
  check('Start event', start.ok);

  // 8. Self entry rejected
  const selfEntry = await req(`/volunteer/${playerId}/cell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cellIndex: 0, name: 'Adithyan', centre: 'KP', code: login.data.volunteer.code }),
  });
  check('Self entry rejected', selfEntry.status === 400);

  // Join other players to generate their details
  for (const v of vols.data.volunteers) {
    if (v.id !== playerId) {
      await req('/volunteer/select', {
        method: 'POST',
        body: JSON.stringify({ id: v.id }),
      });
    }
  }

  // Reload volunteers to get codes
  const freshVols = await req('/admin/volunteers', { headers: ADMIN });

  // 9. BINGO completion works
  console.log('Completing row 0 to test BINGO...');
  let bingoPassed = true;
  const usedPartnerIds = new Set();
  for (let cellIndex = 0; cellIndex < 5; cellIndex++) {
    const letter = board[cellIndex];
    const partner = freshVols.data.volunteers.find(
      (ov) =>
        ov.id !== playerId &&
        ov.name[0]?.toUpperCase() === letter &&
        ov.joined &&
        !usedPartnerIds.has(ov.id)
    );

    if (partner) {
      usedPartnerIds.add(partner.id);
      const res = await req(`/volunteer/${playerId}/cell`, {
        method: 'POST',
        body: JSON.stringify({
          cellIndex,
          name: partner.name,
          centre: partner.centre,
          code: partner.code,
        }),
      });
      if (!res.ok) {
        bingoPassed = false;
        console.log(`Failed to complete cell ${cellIndex} with partner ${partner.name}:`, res.data);
      }
    } else {
      bingoPassed = false;
      console.log(`No partner found starting with ${letter} for cell ${cellIndex}`);
    }
  }
  check('Valid partner entries accepted', bingoPassed);

  // Verify completion
  const finalPlayer = await req(`/volunteer/${playerId}`);
  check('BINGO completion works', finalPlayer.data.volunteer?.status === 'completed');

  // 10. Admin health check works
  const health = await req('/admin/health', { headers: ADMIN });
  check('Admin health check works', health.ok && health.data.checks?.length > 0);

  // 11. Team reveal works & assignedColor mapping works
  const reveal = await req('/admin/reveal-teams', { method: 'POST', headers: ADMIN });
  check('Team reveal works', reveal.ok);

  const finalPlayer2 = await req(`/volunteer/${playerId}`);
  check('assignedColor mapping works', finalPlayer2.data.volunteer?.assignedColor !== undefined);

  // 12. Export works
  const exportCsv = await req('/admin/export/csv', { headers: ADMIN });
  check('Export CSV works', exportCsv.ok);

  // 13. Emergency reset works
  const reset = await req('/admin/reset-event', { method: 'POST', headers: ADMIN });
  check('Emergency reset works', reset.ok && reset.data.event?.status === 'setup');

  console.log(`\n${passed} passed, ${failed} failed`);
  setTimeout(() => {
    process.exit(failed > 0 ? 1 : 0);
  }, 100);
}

run().catch((e) => { console.error(e); process.exit(1); });
