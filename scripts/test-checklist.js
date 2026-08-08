const PORT = process.env.PORT || 3000;
const BASE = `http://localhost:${PORT}/api`;
const ADMIN = { 'Content-Type': 'application/json', 'x-admin-password': 'admin123' };

async function req(path, opts = {}) {
  const headers = opts.headers || {};
  if (opts.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...opts,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, status: 500, error: err.message };
  }
}

async function run() {
  let passed = 0;
  let failed = 0;

  function check(name, cond, details = '') {
    if (cond) {
      console.log(`✓ ${name}`);
      passed++;
    } else {
      console.log(`✗ ${name} ${details}`);
      failed++;
    }
  }

  console.log('Running Next.js migration test suite...\n');

  // 1. Spreadsheet Import / Sync Works
  const sync = await req('/spreadsheet/sync', {
    method: 'POST',
    headers: ADMIN,
    body: JSON.stringify({ spreadsheetUrl: `http://localhost:${PORT}/api/mock-sheet` }),
  });
  check('Spreadsheet import/sync works', sync.ok && sync.data.syncedCount >= 1, JSON.stringify(sync));

  // 2. Volunteers Query
  const vols = await req('/admin/volunteers', { headers: ADMIN });
  check('Volunteer registry query works', vols.ok && Array.isArray(vols.data?.volunteers), JSON.stringify(vols));

  // 3. Duplicate code detection works
  const codes = (vols.data?.volunteers || []).map((v) => v.code);
  const uniqueCodes = new Set(codes);
  check('Duplicate code detection works', codes.length === uniqueCodes.size);

  // 4. Public event query works
  const eventRes = await req('/event');
  check('Public event query works', eventRes.ok && eventRes.data?.status !== undefined);

  // 5. Admin health check works
  const health = await req('/health', { headers: ADMIN });
  check('Admin health check works', health.ok && (health.data?.checks?.length || 0) > 0);

  // 6. Export CSV works
  const exportCsv = await req('/export/csv', { headers: ADMIN });
  check('Export CSV works', exportCsv.ok);

  // 7. Export Backup works
  const backup = await req('/backup', { headers: ADMIN });
  check('Export backup works', backup.ok);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(1); });
