const API = process.env.API_URL ?? 'http://localhost:3001';
const vkId = `smoke_verify_${Date.now()}`;
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
  if (!res.ok) throw new Error(`${path} ${res.status}: ${typeof data === 'object' ? JSON.stringify(data) : data}`);
  return data;
}

const tests = [];
function test(name, fn) {
  tests.push(async () => {
    const result = await fn();
    console.log(`OK  ${name}${result != null ? ` → ${result}` : ''}`);
  });
}

test('health', async () => (await req('/api/health')).status);
test('register', async () => {
  await req('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      vk_id: vkId,
      first_name: 'Smoke',
      last_name: 'Test',
      track: 'НФО и образование',
    }),
  });
  return vkId;
});
test('home', async () => (await req('/api/home')).user?.firstName);
test('tasks', async () => String((await req('/api/tasks')).tasks?.length ?? 0));
test('questions', async () => String((await req('/api/reflection/questions')).questions?.length ?? 0));
test('insights-config', async () => (await req('/api/reflection/insights/config')).prompt?.slice(0, 40));
test('exchange', async () => String((await req('/api/exchange/feed')).feed?.length ?? 0));
test('rating', async () => String((await req('/api/rating')).users?.length ?? 0));
test('checkin', async () => {
  const status = (await req('/api/state/checkin-status')).status;
  const emotion = status?.emotions?.[0] ?? 'спокойствие';
  if (!status?.canSubmit) return `skipped (${status?.activeSlot ?? 'closed'})`;
  const r = await req('/api/state/checkin', {
    method: 'POST',
    body: JSON.stringify({ emotion, energy_level: 5 }),
  });
  if (!r.checkin) throw new Error('no checkin');
  return `saved (${emotion})`;
});
test('insight-submit', async () => {
  const r = await req('/api/reflection/insights', {
    method: 'POST',
    body: JSON.stringify({ text: 'smoke test insight' }),
  });
  return `points=${r.pointsAwarded}`;
});
test('insight-questions-allowed', async () => {
  const qs = (await req('/api/reflection/questions')).questions ?? [];
  return `questions=${qs.length}`;
});

let failed = 0;
for (const t of tests) {
  try {
    await t();
  } catch (e) {
    failed++;
    console.error(`FAIL ${e.message}`);
  }
}

if (failed > 0) {
  console.error(`\n=== ${failed} test(s) failed ===`);
  process.exit(1);
}
console.log('\n=== ALL LOCAL TESTS PASSED ===');
