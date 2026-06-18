/**
 * Smoke tests for forum UX plan (8 items) — API-level checks.
 * Usage: node scripts/plan-smoke.mjs
 *        API_URL=https://zuevpu-nfo-forum-d400.twc1.net node scripts/plan-smoke.mjs
 */
const API = process.env.API_URL ?? 'http://localhost:3001';
const vkId = process.env.VK_ID ?? `plan_smoke_${Date.now()}`;
const headers = { 'Content-Type': 'application/json', 'X-Vk-Id': vkId };

async function req(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers ?? {}) },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

const tests = [];
function test(name, fn) {
  tests.push(async () => {
    const result = await fn();
    console.log(`OK  ${name}${result != null ? ` → ${result}` : ''}`);
  });
}

async function ensureUser() {
  const reg = await req('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      vk_id: vkId,
      first_name: 'Plan',
      last_name: 'Smoke',
      track: 'НФО и образование',
    }),
  });
  if (!reg.ok) {
    const login = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ vk_id: vkId }),
    });
    if (!login.ok) throw new Error(`auth failed: ${login.status}`);
  }
}

test('health', async () => {
  const r = await req('/api/health');
  if (!r.ok || r.data?.status !== 'ok') throw new Error(`health ${r.status}`);
  return r.data.status;
});

test('auth', async () => {
  await ensureUser();
  return vkId;
});

// Phase 1 — check-in 2h window fields
test('checkin-status-window', async () => {
  const r = await req('/api/state/checkin-status');
  if (!r.ok) throw new Error(r.status);
  const s = r.data?.status;
  if (!s || typeof s.canSubmit !== 'boolean') throw new Error('missing canSubmit');
  if (s.canSubmit && s.windowEndsAt == null && s.activeSlot) {
    throw new Error('canSubmit but no windowEndsAt (expected for slot mode)');
  }
  return s.canSubmit
    ? `open until ${s.windowEndsAt ?? '?'}`
    : `closed (next ${s.nextSlotAt ?? '—'})`;
});

// Phase 2 — NFO config + close
test('nfo-day-config', async () => {
  const r = await req('/api/reflection/nfo-day/config');
  if (!r.ok) throw new Error(r.status);
  const c = r.data;
  if (c.publishHour == null) throw new Error('missing publishHour');
  if (typeof c.isOpen !== 'boolean') throw new Error('missing isOpen');
  const close = c.closeHour != null ? `${c.closeHour}:${String(c.closeMinute ?? 0).padStart(2, '0')}` : 'end of day';
  return `publish ${c.publishHour}:${String(c.publishMinute ?? 0).padStart(2, '0')}, close ${close}, open=${c.isOpen}`;
});

// Phase 3 — no insight/evening duplicates in questions API
test('no-insight-evening-duplicates', async () => {
  const r = await req('/api/reflection/questions');
  if (!r.ok) throw new Error(r.status);
  const qs = r.data?.questions ?? [];
  const bad = qs.filter(
    (q) =>
      q.groupId === 'program-insights' ||
      q.type === 'insight' ||
      q.type === 'evening',
  );
  if (bad.length > 0) throw new Error(`visible: ${bad.map((q) => q.id).join(', ')}`);
  return `${qs.length} questions, 0 duplicates`;
});

test('insights-section-works', async () => {
  const r = await req('/api/reflection/insights/config');
  if (!r.ok || !r.data?.prompt) throw new Error('insights config missing');
  return 'config ok';
});

// Phase 4 — media URL normalization (admin needs auth; check public health only)
test('media-endpoint-exists', async () => {
  const r = await fetch(`${API}/api/media/00000000-0000-0000-0000-000000000000`);
  if (r.status !== 404 && r.status !== 400) {
    throw new Error(`unexpected media status ${r.status}`);
  }
  return `route ok (${r.status} for missing id)`;
});

// Phase 5 — admin submissions route exists (401 without admin = expected)
test('admin-submissions-route', async () => {
  const r = await req('/api/admin/tasks/submissions?limit=1');
  if (r.status === 403 || r.status === 401) return 'protected (needs admin)';
  if (r.ok && Array.isArray(r.data?.submissions)) return `${r.data.submissions.length} row(s)`;
  throw new Error(`status ${r.status}`);
});

// Phase 6 — tasks list API
test('tasks-list', async () => {
  const r = await req('/api/tasks');
  if (!r.ok) throw new Error(r.status);
  const n = r.data?.tasks?.length ?? 0;
  return `${n} tasks`;
});

// Home badge excludes insight duplicates
test('home-stats', async () => {
  const r = await req('/api/home');
  if (!r.ok) throw new Error(r.status);
  return `activeQuestions=${r.data?.stats?.activeQuestions ?? 0}`;
});

console.log(`=== Plan smoke: ${API} ===\n`);

let failed = 0;
for (const t of tests) {
  try {
    await t();
  } catch (e) {
    failed++;
    console.error(`FAIL ${e.message}`);
  }
}

console.log(failed === 0 ? '\n=== ALL PLAN SMOKE TESTS PASSED ===' : `\n=== ${failed} test(s) failed ===`);
process.exit(failed > 0 ? 1 : 0);
