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
    throw new Error(`${opts.method ?? 'GET'} ${path} -> ${res.status} ${JSON.stringify(body)}`);
  }
  return body as any;
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error('ASSERT: ' + msg);
}

async function main() {
  const email = `combat_${Date.now()}@test.local`;
  const password = 'password12345';
  console.log('1. register', email);
  const reg = await req('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const token = reg.token as string;

  console.log('2. create civ');
  await req('/api/civilizations', {
    method: 'POST',
    token,
    body: JSON.stringify({
      name: 'CombatTest',
      constants: {
        scienceFocus: 50,
        expansionFocus: 40,
        secrecy: 40,
        aggression: 70,
        diplomacyFocus: 30,
        riskLevel: 60,
      },
    }),
  });

  console.log('3. combat resources + contact');
  await req('/api/debug/combat-resources', { method: 'POST', token, body: '{}' });
  await req('/api/debug/random-contact', { method: 'POST', token, body: '{}' });
  let st = await req('/api/civilizations/current/state', { token });
  assert(st.state.civilization.level >= 20, 'level>=20');
  assert(Array.isArray(st.state.combatCatalog), 'combatCatalog');
  assert(Array.isArray(st.state.combatActions), 'combatActions');
  const contact = st.state.contacts[0];
  assert(contact, 'contact');
  console.log('   contact', contact.displayName, contact.distance, 'coords', contact.coordinates);

  console.log('4. RECON_SCAN');
  const recon = await req('/api/civilizations/current/combat/start', {
    method: 'POST',
    token,
    body: JSON.stringify({
      attackType: 'RECON_SCAN',
      contactId: contact.id,
      targetCoordinates: contact.coordinates,
    }),
  });
  assert(recon.state.combatActions.some((a: any) => a.status === 'PREPARING' || a.status === 'IN_TRANSIT' || a.status === 'RESOLVED'), 'action created');
  const heAfterReconStart = recon.state.resources.highEnergy;

  console.log('5. force resolve all');
  st = (await req('/api/debug/combat-resolve-all', { method: 'POST', token, body: '{}' })).state;
  const reconReport = st.combatReports.find((r: any) => r.attackType === 'RECON_SCAN');
  assert(reconReport, 'recon report');
  console.log('   recon outcome', reconReport.outcome, reconReport.flavorText.slice(0, 80));
  const c2 = st.contacts.find((c: any) => c.id === contact.id);
  console.log('   conf', contact.confidence, '->', c2.confidence, 'reconLevel', c2.reconLevel);

  console.log('6. LIMITED_STRIKE');
  await req('/api/debug/combat-resources', { method: 'POST', token, body: '{}' });
  await req('/api/civilizations/current/combat/start', {
    method: 'POST',
    token,
    body: JSON.stringify({
      attackType: 'LIMITED_STRIKE',
      contactId: contact.id,
      targetCoordinates: {
        x: c2.coordinates.x,
        y: c2.coordinates.y,
        z: c2.coordinates.z,
      },
    }),
  });
  st = (await req('/api/debug/combat-resolve-all', { method: 'POST', token, body: '{}' })).state;
  const lim = st.combatReports.find((r: any) => r.attackType === 'LIMITED_STRIKE');
  assert(lim, 'limited report');
  console.log('   limited', lim.outcome, 'dmg', lim.damageDealt, 'taken', lim.damageTaken, 'P', lim.hitChance);
  const c3 = st.contacts.find((c: any) => c.id === contact.id);
  console.log('   defenseStatus', c3.defenseStatus, 'hostile?', c3.status);

  console.log('7. insufficient resources');
  // new civ path - try DARK without resources after draining via many starts is hard; use fresh low HE
  // Just verify start DARK requires level - already have level. Drain HE by setting via many cancels...
  // Call start with no resources: grant 0 by creating second user
  const email2 = `poor_${Date.now()}@test.local`;
  const reg2 = await req('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: email2, password }),
  });
  const t2 = reg2.token;
  await req('/api/civilizations', {
    method: 'POST',
    token: t2,
    body: JSON.stringify({
      name: 'PoorCiv',
      constants: {
        scienceFocus: 50,
        expansionFocus: 40,
        secrecy: 50,
        aggression: 50,
        diplomacyFocus: 40,
        riskLevel: 40,
      },
    }),
  });
  await req('/api/debug/random-contact', { method: 'POST', token: t2, body: '{}' });
  const stP = await req('/api/civilizations/current/state', { token: t2 });
  const cp = stP.state.contacts[0];
  try {
    await req('/api/civilizations/current/combat/start', {
      method: 'POST',
      token: t2,
      body: JSON.stringify({
        attackType: 'LIMITED_STRIKE',
        contactId: cp.id,
        targetCoordinates: cp.coordinates,
      }),
    });
    throw new Error('should fail');
  } catch (e: any) {
    assert(String(e).includes('INSUFFICIENT') || String(e).includes('LEVEL'), 'blocked poor: ' + e);
    console.log('   blocked OK', String(e).slice(0, 120));
  }

  console.log('8. DARK_STRIKE toward destroy');
  await req('/api/debug/combat-resources', { method: 'POST', token, body: '{}' });
  // Aim at reported coords after recon (better accuracy)
  for (let i = 0; i < 3; i++) {
    const cur = (await req('/api/civilizations/current/state', { token })).state;
    const ct = cur.contacts.find((c: any) => c.id === contact.id);
    if (ct?.isDestroyed) break;
    await req('/api/debug/combat-resources', { method: 'POST', token, body: '{}' });
    await req('/api/civilizations/current/combat/start', {
      method: 'POST',
      token,
      body: JSON.stringify({
        attackType: 'DARK_STRIKE',
        contactId: contact.id,
        targetCoordinates: ct.coordinates,
      }),
    });
    await req('/api/debug/combat-resolve-all', { method: 'POST', token, body: '{}' });
  }
  st = (await req('/api/civilizations/current/state', { token })).state;
  const cFinal = st.contacts.find((c: any) => c.id === contact.id);
  const darkReports = st.combatReports.filter((r: any) => r.attackType === 'DARK_STRIKE');
  console.log(
    '   destroyed?',
    cFinal.isDestroyed,
    'status',
    cFinal.status,
    'dark outcomes',
    darkReports.map((r: any) => r.outcome).join(',')
  );

  console.log('9. EVACUATION self');
  await req('/api/debug/combat-resources', { method: 'POST', token, body: '{}' });
  await req('/api/civilizations/current/combat/start', {
    method: 'POST',
    token,
    body: JSON.stringify({ attackType: 'EVACUATION' }),
  });
  st = (await req('/api/debug/combat-resolve-all', { method: 'POST', token, body: '{}' })).state;
  assert(st.evacuationActive === true, 'evac active');
  console.log('   evacuationActive', st.evacuationActive);

  console.log('10. cancel during prep');
  await req('/api/debug/combat-resources', { method: 'POST', token, body: '{}' });
  await req('/api/debug/random-contact', { method: 'POST', token, body: '{}' });
  st = (await req('/api/civilizations/current/state', { token })).state;
  const cNew = st.contacts.find((c: any) => !c.isDestroyed && c.id !== contact.id) ?? st.contacts[0];
  const started = await req('/api/civilizations/current/combat/start', {
    method: 'POST',
    token,
    body: JSON.stringify({
      attackType: 'RECON_SCAN',
      contactId: cNew.id,
      targetCoordinates: cNew.coordinates,
    }),
  });
  const prep = started.state.combatActions.find((a: any) => a.status === 'PREPARING');
  if (prep) {
    const heBefore = started.state.resources.highEnergy;
    const cancelled = await req(`/api/civilizations/current/combat/${prep.id}/cancel`, {
      method: 'POST',
      token,
      body: '{}',
    });
    assert(
      cancelled.state.combatActions.find((a: any) => a.id === prep.id)?.status === 'CANCELLED',
      'cancelled'
    );
    console.log('   cancel OK, HE', heBefore, '->', cancelled.state.resources.highEnergy);
  } else {
    console.log('   prep already advanced — skip cancel');
  }

  void heAfterReconStart;
  console.log('\nSMOKE OK Stage 6 combat');
}

main().catch((e) => {
  console.error('SMOKE FAIL', e);
  process.exit(1);
});
