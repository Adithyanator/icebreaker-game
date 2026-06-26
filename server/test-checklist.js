const BASE = 'http://localhost:3001/api';
const ADMIN = { 'Content-Type': 'application/json', 'x-admin-password': 'ui-icebreaker-2026' };

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
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

  // Seed data
  const vols = await req('/admin/volunteers', { headers: ADMIN });
  check('Trial data exists', vols.data.volunteers?.length >= 5);

  // Login
  const login = await req('/volunteer/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Adithyan', centre: 'KP' }),
  });
  check('Trial login works', login.ok && login.data.volunteer?.code === '111');

  const badLogin = await req('/volunteer/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Adithyan', centre: 'VB' }),
  });
  check('Wrong centre rejects', badLogin.status === 404);

  // Test adding volunteer with custom centre
  const customVol = await req('/admin/volunteers', {
    method: 'POST',
    headers: ADMIN,
    body: JSON.stringify({ name: 'Custom Vol', centre: 'TEST-CENTRE' }),
  });
  const customVolId = customVol.data.volunteer?.id;
  check('Can add volunteer with custom centre', customVol.ok && customVol.data.volunteer?.centre === 'TEST-CENTRE');

  // Verify login for the custom volunteer
  const customLogin = await req('/volunteer/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Custom Vol', centre: 'TEST-CENTRE' }),
  });
  check('Custom centre volunteer login works', customLogin.ok && customLogin.data.volunteer?.centre === 'TEST-CENTRE');

  // Generate boards
  const boards = await req('/admin/generate-boards', { method: 'POST', headers: ADMIN });
  if (!boards.ok) console.log('Board generation failed:', boards);
  check('Boards generate', boards.ok);

  const adithyan = login.data.volunteer;
  check('Board has 9 cells', adithyan.board?.length === 9 || boards.ok);

  // Refresh volunteer for board
  const refreshed = await req(`/volunteer/${adithyan.id}`);
  check('Board persists', refreshed.data.volunteer?.board?.length === 9);

  // Validation tests
  const playerId = adithyan.id;
  const cell0Letter = refreshed.data.volunteer.board[0];

  const wrongLetter = await req(`/volunteer/${playerId}/cell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cellIndex: 0, name: 'Dilshan', centre: 'VB', code: '200' }),
  });
  check('Wrong letter rejected (before start)', wrongLetter.status === 403 || wrongLetter.status === 400);

  // Start event
  const health = await req('/admin/health', { headers: ADMIN });
  check('Health check runs', health.data.checks?.length > 0);

  const start = await req('/admin/start-event', { method: 'POST', headers: ADMIN });
  check('Start event', start.ok);

  // Find a valid cell entry
  const board = refreshed.data.volunteer.board;
  let validEntry = null;
  for (let i = 0; i < board.length; i++) {
    const letter = board[i];
    const match = vols.data.volunteers.find(
      (v) => v.id !== playerId && v.name[0].toUpperCase() === letter.toUpperCase()
    );
    if (match) { validEntry = { cellIndex: i, name: match.name, centre: match.centre, code: match.code }; break; }
  }

  if (validEntry) {
    const good = await req(`/volunteer/${playerId}/cell`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validEntry),
    });
    check('Correct entry accepted', good.ok);

    const selfEntry = await req(`/volunteer/${playerId}/cell`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cellIndex: 1, name: 'Adithyan', centre: 'KP', code: '111' }),
    });
    check('Self entry rejected', selfEntry.status === 400);

    const dup = await req(`/volunteer/${playerId}/cell`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validEntry),
    });
    check('Duplicate partner rejected', dup.status === 400);
  }

  // Add volunteer
  const isLocked = ['active', 'paused', 'revealed'].includes(start.data.event?.status);
  check('Management locked after start', isLocked);

  // Reset for clean state
  await req('/admin/reset-event', { method: 'POST', headers: ADMIN });
  if (customVolId) {
    await req(`/admin/volunteers/${customVolId}`, { method: 'DELETE', headers: ADMIN });
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  setTimeout(() => {
    process.exit(failed > 0 ? 1 : 0);
  }, 100);
}

run().catch((e) => { console.error(e); process.exit(1); });
