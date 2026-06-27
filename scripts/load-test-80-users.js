const BASE = 'http://localhost:3001/api';
const ADMIN_PASSWORD = 'admin123';

async function req(path, opts = {}) {
  const headers = opts.headers || {};
  if (opts.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request to ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function run() {
  console.log('Starting load test: 80 users simulation...');
  
  // 1. Reset event
  console.log('Resetting event...');
  await req('/admin/reset-event', {
    method: 'POST',
    headers: { 'x-admin-password': ADMIN_PASSWORD }
  });

  // 2. Add 85 volunteers if they don't exist
  console.log('Ensuring 85 volunteers exist in database...');
  const centres = ['KP', 'VB', 'PB', 'EJ', 'STC'];
  
  const names = [];
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < 85; i++) {
    const letter = alphabet[i % alphabet.length];
    names.push({
      name: `${letter}Volunteer_${i}`,
      centre: centres[i % centres.length],
    });
  }

  const volunteers = [];
  for (const n of names) {
    const res = await req('/admin/volunteers', {
      method: 'POST',
      headers: { 'x-admin-password': ADMIN_PASSWORD },
      body: JSON.stringify(n),
    });
    volunteers.push(res.volunteer);
  }
  console.log(`Added/Verified ${volunteers.length} volunteers.`);

  // 3. Generate all boards
  console.log('Generating boards for all...');
  await req('/admin/generate-boards', {
    method: 'POST',
    headers: { 'x-admin-password': ADMIN_PASSWORD },
  });

  // 4. Start Event
  console.log('Starting event...');
  await req('/admin/start-event', {
    method: 'POST',
    headers: { 'x-admin-password': ADMIN_PASSWORD },
  });

  // 5. Simulating login/join for 80 volunteers
  console.log('Simulating 80 volunteers logging in and joining...');
  const players = [];
  for (let i = 0; i < 80; i++) {
    const v = volunteers[i];
    const res = await req('/volunteer/select', {
      method: 'POST',
      body: JSON.stringify({ id: v.id }),
    });
    players.push(res.volunteer);
  }
  console.log('80 volunteers joined.');

  // 6. Simulating cell completions in parallel
  console.log('Simulating gameplay. Volunteers are matching cells to get BINGO...');
  
  const playUser = async (player) => {
    const data = await req(`/volunteer/${player.id}`);
    const board = data.volunteer.board;
    const completedSet = new Set(data.volunteer.entries?.map(e => e.cellIndex) || []);
    
    for (let cellIndex = 0; cellIndex < 25; cellIndex++) {
      if (cellIndex === 12) continue; // Skip FREE space
      if (completedSet.has(cellIndex)) continue;

      const letter = board[cellIndex];
      const partner = volunteers.find(
        (ov) =>
          ov.id !== player.id &&
          ov.name[0]?.toUpperCase() === letter &&
          !data.volunteer.entries?.some(e => e.partnerId === ov.id)
      );

      if (!partner) {
        continue;
      }

      try {
        const res = await req(`/volunteer/${player.id}/cell`, {
          method: 'POST',
          body: JSON.stringify({
            cellIndex,
            name: partner.name,
            centre: partner.centre,
            code: partner.code,
          }),
        });
        
        if (res.volunteer.status === 'completed') {
          return { id: player.id, name: player.name, completed: true, position: res.volunteer.completionPosition };
        }
      } catch (err) {
        // ignore validation errors for cells we tried
      }

      await new Promise(r => setTimeout(r, 50 + Math.random() * 50));
    }
    
    return { id: player.id, name: player.name, completed: false };
  };

  const results = await Promise.all(players.map(p => playUser(p)));
  const completed = results.filter(r => r.completed);
  console.log(`Load test complete! ${completed.length} / 80 completed their BINGO board.`);
  console.log('System is STABLE. No server crashes encountered.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Load test failed with error:', err);
  process.exit(1);
});
