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
  assert(health.stage >= 8, 'health stage >=8 got ' + health.stage);
  console.log('0. health stage', health.stage);

  const email = `late_${Date.now()}@test.local`;
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
      name: 'LateGameTest',
      constants: {
        scienceFocus: 55,
        expansionFocus: 40,
        secrecy: 50,
        aggression: 35,
        diplomacyFocus: 40,
        riskLevel: 40,
      },
    }),
  });

  console.log('3. shop never sells DE/AM/DM');
  const shop = await req('/api/shop/items', { token });
  for (const it of shop.items) {
    assert(
      !it.resourceType || it.resourceType === 'highEnergy' || it.resourceType === 'fermions',
      'shop sold forbidden ' + it.key + ' ' + it.resourceType
    );
  }
  console.log('   shop ok', shop.items.length, 'items');

  console.log('4. level 1 costs — DE=0');
  let st = await req('/api/civilizations/current/state', { token });
  assert(st.state.levelCosts.darkEnergy === 0, 'L1 DE cost 0');
  assert(st.state.civilization.level === 1, 'start L1');
  assert(Array.isArray(st.state.physicsCatalog), 'physics catalog');
  assert(st.state.physicsCatalog.length === 6, '6 laws');
  assert(st.state.galaxyTravel.unlocked === false, 'travel locked L1');

  console.log('5. set level 59 — still no DE for next');
  st = (
    await req('/api/debug/set-level', {
      method: 'POST',
      token,
      body: JSON.stringify({ level: 59 }),
    })
  ).state;
  // cost to go 59->60 is still HE only (threshold 60 means cost DE when current >= 60)
  assert(st.levelCosts.darkEnergy === 0, '59->60 DE=0 got ' + st.levelCosts.darkEnergy);

  console.log('6. set level 60 — DE required for 61');
  st = (
    await req('/api/debug/set-level', {
      method: 'POST',
      token,
      body: JSON.stringify({ level: 60 }),
    })
  ).state;
  assert(st.civilization.level === 60, 'L60');
  assert(st.levelCosts.darkEnergy > 0, '60->61 needs DE');
  console.log('   cost 61 HE', st.levelCosts.highEnergy, 'DE', st.levelCosts.darkEnergy);

  console.log('7. level-up without DE blocked');
  await req('/api/debug/grant-resources', {
    method: 'POST',
    token,
    body: JSON.stringify({ highEnergy: 10_000_000 }),
  });
  st = (await req('/api/civilizations/current/state', { token })).state;
  assert(st.resources.darkEnergy === 0, 'DE still 0 before grant-dark-energy');
  try {
    await req('/api/civilizations/current/actions/level-up', {
      method: 'POST',
      token,
      body: '{}',
    });
    throw new Error('should block without DE');
  } catch (e: any) {
    assert(
      e.body?.error?.code === 'LEVEL_UP_DENIED' || e.body?.error?.code === 'INSUFFICIENT_RESOURCES',
      'DE gate code ' + e.body?.error?.code
    );
    console.log('   blocked', e.body.error.code, e.body.error.message);
  }

  console.log('8. grant DE + siphon building via level 60 + upgrade');
  st = (
    await req('/api/debug/grant-dark-energy', {
      method: 'POST',
      token,
      body: JSON.stringify({ amount: 100_000 }),
    })
  ).state;
  assert(st.resources.darkEnergy >= 100_000, 'DE granted');
  console.log('   DE', st.resources.darkEnergy, 'DE/s', st.production.darkEnergyPerSec);

  // Upgrade dark_energy_siphon if unlocked
  const siphon = st.buildings.find((b: any) => b.type === 'dark_energy_siphon');
  console.log('   siphon building', siphon ? JSON.stringify(siphon) : 'missing');
  // Ensure resources for siphon upgrade (fermions/HE from balance)
  await req('/api/debug/grant-resources', {
    method: 'POST',
    token,
    body: JSON.stringify({ highEnergy: 100_000, fermions: 50_000, antimatter: 10_000, darkMatter: 10_000 }),
  });
  try {
    const up = await req('/api/civilizations/current/actions/upgrade-building', {
      method: 'POST',
      token,
      body: JSON.stringify({ buildingType: 'dark_energy_siphon' }),
    });
    st = up.state;
    const s2 = st.buildings.find((b: any) => b.type === 'dark_energy_siphon');
    console.log('   siphon L', s2?.level, 'DE/s', st.production.darkEnergyPerSec);
    assert((s2?.level ?? 0) >= 1, 'siphon upgraded');
    assert(st.production.darkEnergyPerSec > 0, 'siphon produces DE');
  } catch (e: any) {
    console.log('   siphon upgrade fail', e.body?.error ?? e.message);
    throw e;
  }

  // Wait briefly for production tick if siphon produces
  if (st.production.darkEnergyPerSec > 0) {
    const before = st.resources.darkEnergy;
    await new Promise((r) => setTimeout(r, 1500));
    st = (await req('/api/civilizations/current/state', { token })).state;
    console.log('   DE tick', before, '->', st.resources.darkEnergy);
  }

  console.log('9. level-up 60->61 with DE');
  st = (
    await req('/api/debug/grant-resources', {
      method: 'POST',
      token,
      body: JSON.stringify({ highEnergy: 10_000_000 }),
    })
  ).state;
  await req('/api/debug/grant-dark-energy', {
    method: 'POST',
    token,
    body: JSON.stringify({ amount: 50_000 }),
  });
  const beforeLvl = (await req('/api/civilizations/current/state', { token })).state;
  const deBefore = beforeLvl.resources.darkEnergy;
  const heBefore = beforeLvl.resources.highEnergy;
  const costDe = beforeLvl.levelCosts.darkEnergy;
  const costHe = beforeLvl.levelCosts.highEnergy;
  const leveled = await req('/api/civilizations/current/actions/level-up', {
    method: 'POST',
    token,
    body: '{}',
  });
  st = leveled.state;
  assert(st.civilization.level === 61, 'leveled to 61 got ' + st.civilization.level);
  assert(st.resources.darkEnergy <= deBefore - costDe + 5, 'DE spent'); // +5 tick tolerance
  assert(st.resources.highEnergy <= heBefore - costHe + 50, 'HE spent');
  console.log('   now L', st.civilization.level, leveled.report.message);

  console.log('10. physics lab locked until 90');
  try {
    await req('/api/civilizations/current/physics-laws/enact', {
      method: 'POST',
      token,
      body: JSON.stringify({ lawId: 'LOCAL_LIGHT_SPEED' }),
    });
    throw new Error('should lock physics');
  } catch (e: any) {
    assert(e.body?.error?.code === 'LEVEL_TOO_LOW', 'physics lock ' + e.body?.error?.code);
    console.log('   locked', e.body.error.code);
  }

  console.log('11. set level 90 + grant DE for laws');
  st = (
    await req('/api/debug/set-level', {
      method: 'POST',
      token,
      body: JSON.stringify({ level: 90 }),
    })
  ).state;
  st = (
    await req('/api/debug/grant-dark-energy', {
      method: 'POST',
      token,
      body: JSON.stringify({ amount: 200_000 }),
    })
  ).state;
  assert(st.civilization.level === 90, 'L90');
  const laws = await req('/api/civilizations/current/physics-laws', { token });
  assert(laws.unlocked === true, 'lab unlocked');
  assert(laws.catalog.length === 6, 'catalog 6');
  console.log('   lab unlocked, active', laws.active);

  console.log('12. enact LOCAL_LIGHT_SPEED');
  const enact = await req('/api/civilizations/current/physics-laws/enact', {
    method: 'POST',
    token,
    body: JSON.stringify({ lawId: 'LOCAL_LIGHT_SPEED' }),
  });
  st = enact.state;
  assert(st.civilization.physicsLaws.includes('LOCAL_LIGHT_SPEED'), 'law active');
  console.log('   laws', st.civilization.physicsLaws, enact.report.message);

  console.log('13. enact ENTROPY_REDUCTION + QUANTUM_MASKING (fill 3)');
  for (const id of ['ENTROPY_REDUCTION', 'QUANTUM_MASKING']) {
    const r = await req('/api/civilizations/current/physics-laws/enact', {
      method: 'POST',
      token,
      body: JSON.stringify({ lawId: id }),
    });
    st = r.state;
  }
  assert(st.civilization.physicsLaws.length === 3, '3 laws');
  console.log('   full', st.civilization.physicsLaws);

  console.log('14. 4th law blocked');
  try {
    await req('/api/civilizations/current/physics-laws/enact', {
      method: 'POST',
      token,
      body: JSON.stringify({ lawId: 'GRAVITY_CONTROL' }),
    });
    throw new Error('should block 4th');
  } catch (e: any) {
    assert(e.body?.error?.code === 'LAW_SLOTS_FULL', 'slots ' + e.body?.error?.code);
    console.log('   blocked', e.body.error.code);
  }

  console.log('15. revoke + 10% refund');
  const dePre = st.resources.darkEnergy;
  const rev = await req('/api/civilizations/current/physics-laws/revoke', {
    method: 'POST',
    token,
    body: JSON.stringify({ lawId: 'QUANTUM_MASKING' }),
  });
  st = rev.state;
  assert(!st.civilization.physicsLaws.includes('QUANTUM_MASKING'), 'revoked');
  assert(st.resources.darkEnergy > dePre, 'refund DE ' + dePre + ' -> ' + st.resources.darkEnergy);
  console.log('   refund', rev.report.message, 'DE', st.resources.darkEnergy);

  // Production mul from ENTROPY should bump DE/s if siphon exists
  console.log('   DE/s with entropy', st.production.darkEnergyPerSec);
  console.log('   exposure', st.signalExposure);

  console.log('16. galaxy travel at 90 (unlocked at 80)');
  assert(st.galaxyTravel.unlocked === true, 'travel unlocked');
  // ensure costs
  st = (
    await req('/api/debug/grant-dark-energy', {
      method: 'POST',
      token,
      body: JSON.stringify({ amount: 500_000 }),
    })
  ).state;
  await req('/api/debug/grant-resources', {
    method: 'POST',
    token,
    body: JSON.stringify({ fermions: 1_000_000, highEnergy: 5_000_000 }),
  });

  // seed a contact to verify wipe
  await req('/api/debug/random-contact', { method: 'POST', token, body: '{}' }).catch(() => null);
  st = (await req('/api/civilizations/current/state', { token })).state;
  const contactsBefore = st.contacts?.length ?? 0;
  const seedBefore = st.civilization.seed;
  const galaxyBefore = st.civilization.galaxyName;
  const levelBefore = st.civilization.level;
  console.log('   pre travel contacts', contactsBefore, 'seed', seedBefore, 'galaxy', galaxyBefore);

  const travel = await req('/api/civilizations/current/travel-galaxy', {
    method: 'POST',
    token,
    body: '{}',
  });
  st = travel.state;
  assert(st.galaxyTravel.traveling === true, 'traveling');
  assert(st.civilization.isInterstellarTraveling === true, 'flag');
  console.log('   traveling until', st.galaxyTravel.finishesAt, travel.report.message);

  console.log('17. cannot double-start travel');
  try {
    await req('/api/civilizations/current/travel-galaxy', {
      method: 'POST',
      token,
      body: '{}',
    });
    throw new Error('double travel');
  } catch (e: any) {
    assert(e.status === 400 || e.body?.error, 'double blocked');
    console.log('   blocked', e.body?.error?.code ?? e.status);
  }

  console.log('18. debug complete travel — new world, wipe contacts, keep level');
  const done = await req('/api/debug/complete-galaxy-travel', {
    method: 'POST',
    token,
    body: '{}',
  });
  st = done.state;
  assert(st.galaxyTravel.traveling === false, 'not traveling');
  assert(st.civilization.isInterstellarTraveling === false, 'flag off');
  assert(st.civilization.seed !== seedBefore, 'new seed ' + st.civilization.seed);
  assert(st.civilization.level === levelBefore, 'level kept');
  assert((st.contacts?.length ?? 0) === 0, 'contacts wiped got ' + (st.contacts?.length ?? 0));
  assert(st.signalExposure === 1 || st.signalExposure <= 1.001, 'exposure reset got ' + st.signalExposure);
  // physics laws kept? typically yes — not wiped
  console.log(
    '   new galaxy',
    st.civilization.galaxyName,
    'seed',
    st.civilization.seed,
    'exposure',
    st.signalExposure,
    'laws',
    st.civilization.physicsLaws
  );
  assert(st.civilization.galaxyName !== galaxyBefore || st.civilization.seed !== seedBefore, 'world changed');

  console.log('19. no instant travel without debug (already tested timer start)');

  console.log('\nSMOKE OK Stage 8 late-game (DE, physics, galaxy travel)');
}

main().catch((e) => {
  console.error('SMOKE FAIL', e);
  process.exit(1);
});
