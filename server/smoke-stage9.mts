const BASE = process.env.API_BASE ?? 'http://127.0.0.1:4000';

async function req(path: string, opts: RequestInit & { token?: string } = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(
      new Error(`${opts.method ?? 'GET'} ${path} -> ${res.status} ${JSON.stringify(body)}`),
      { status: res.status, body }
    );
  }
  return body as any;
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error('ASSERT: ' + msg);
}

async function main() {
  const health = await req('/api/health');
  assert(health.stage === 9, 'stage 9');
  console.log('0. health', health.stage);

  const email = `adm_${Date.now()}@test.local`;
  const reg = await req('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'password12345' }),
  });
  const token = reg.token as string;
  assert(reg.user.isAdmin !== true, 'not admin by default');

  console.log('1. admin blocked');
  try {
    await req('/api/admin/stats', { token });
    throw new Error('should 403');
  } catch (e: any) {
    assert(e.status === 403 || e.body?.error?.code === 'FORBIDDEN', 'forbidden');
    console.log('   ', e.body?.error?.code);
  }

  console.log('2. grant-admin');
  await req('/api/debug/grant-admin', { method: 'POST', token, body: '{}' });
  const me = await req('/api/auth/me', { token });
  assert(me.user.isAdmin === true, 'isAdmin');

  console.log('3. stats');
  const st = await req('/api/admin/stats', { token });
  assert(typeof st.users === 'number', 'users');
  console.log('   users', st.users, 'civs', st.civilizations);

  console.log('4. create civ + list');
  await req('/api/civilizations', {
    method: 'POST',
    token,
    body: JSON.stringify({
      name: 'AdminCiv',
      constants: {
        scienceFocus: 50,
        expansionFocus: 40,
        secrecy: 50,
        aggression: 40,
        diplomacyFocus: 40,
        riskLevel: 40,
      },
    }),
  });
  const civs = await req('/api/admin/civilizations', { token });
  assert(civs.total >= 1, 'civs');
  const id = civs.civilizations.find((c: any) => c.name === 'AdminCiv')?.id;
  assert(id, 'id');

  console.log('5. modify level');
  await req(`/api/admin/civilizations/${id}/modify`, {
    method: 'POST',
    token,
    body: JSON.stringify({ level: 12, highEnergy: 999 }),
  });
  const det = await req(`/api/admin/civilizations/${id}`, { token });
  assert((det.meta as any).level === 12, 'level 12');
  console.log('   level', (det.meta as any).level, 'journal', det.journal.length);

  console.log('\nSMOKE OK Stage 9 admin + health');
}

main().catch((e) => {
  console.error('SMOKE FAIL', e);
  process.exit(1);
});
