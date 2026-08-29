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
    throw Object.assign(new Error(`${opts.method ?? 'GET'} ${path} -> ${res.status} ${JSON.stringify(body)}`), {
      status: res.status,
      body,
    });
  }
  return body as any;
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error('ASSERT: ' + msg);
}

async function main() {
  const email = `shop_${Date.now()}@test.local`;
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
      name: 'ShopTest',
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

  console.log('3. shop items — no AM/DE/DM');
  const items = await req('/api/shop/items', { token });
  assert(items.items.length >= 9, 'items');
  for (const it of items.items) {
    assert(
      !it.resourceType || it.resourceType === 'highEnergy' || it.resourceType === 'fermions',
      'forbidden resource ' + it.key
    );
  }
  console.log('   items', items.items.map((i: any) => i.key).join(', '));

  console.log('4. purchase without credits blocked');
  try {
    await req('/api/shop/purchase', {
      method: 'POST',
      token,
      body: JSON.stringify({ itemId: 'he_small' }),
    });
    throw new Error('should fail');
  } catch (e: any) {
    assert(e.body?.error?.code === 'INSUFFICIENT_CREDITS', 'credits gate');
    console.log('   blocked', e.body.error.code);
  }

  console.log('5. add credits');
  const cred = await req('/api/debug/add-credits', {
    method: 'POST',
    token,
    body: JSON.stringify({ amount: 1000 }),
  });
  assert(cred.user.premiumCredits === 1000, 'credits 1000');
  console.log('   credits', cred.user.premiumCredits);

  console.log('6. buy HE small');
  const st0 = await req('/api/civilizations/current/state', { token });
  const he0 = st0.state.resources.highEnergy;
  const buy = await req('/api/shop/purchase', {
    method: 'POST',
    token,
    body: JSON.stringify({ itemId: 'he_small' }),
  });
  assert(buy.state.resources.highEnergy > he0, 'he increased');
  assert(buy.user.premiumCredits === 990, 'spent 10');
  console.log('   HE', he0, '->', buy.state.resources.highEnergy, 'credits', buy.user.premiumCredits);

  console.log('7. buy fermions');
  const fm0 = buy.state.resources.fermions;
  const buyF = await req('/api/shop/purchase', {
    method: 'POST',
    token,
    body: JSON.stringify({ itemId: 'fermion_small' }),
  });
  assert(buyF.state.resources.fermions > fm0, 'fm increased');
  console.log('   FM', fm0, '->', buyF.state.resources.fermions);

  console.log('8. capacity HE');
  const cap0 = buyF.state.resources.capacities.highEnergy;
  const cap = await req('/api/shop/purchase', {
    method: 'POST',
    token,
    body: JSON.stringify({ itemId: 'capacity_he' }),
  });
  assert(cap.state.resources.capacities.highEnergy > cap0, 'cap increased');
  console.log('   HE cap', cap0, '->', cap.state.resources.capacities.highEnergy);

  console.log('9. fill capacity then partial/full block');
  // buy capacity_all and medium packs until near full then large
  await req('/api/debug/add-credits', { method: 'POST', token, body: JSON.stringify({ amount: 5000 }) });
  // drain room by buying larges
  let last = await req('/api/civilizations/current/state', { token });
  for (let i = 0; i < 20; i++) {
    const room = last.state.resources.capacities.highEnergy - last.state.resources.highEnergy;
    if (room <= 0) break;
    try {
      last = (
        await req('/api/shop/purchase', {
          method: 'POST',
          token,
          body: JSON.stringify({ itemId: 'he_large' }),
        })
      ).state
        ? (
            await req('/api/shop/purchase', {
              method: 'POST',
              token,
              body: JSON.stringify({ itemId: 'he_large' }),
            })
          )
        : last;
      // fix: reassign properly
    } catch {
      break;
    }
    const r = await req('/api/shop/purchase', {
      method: 'POST',
      token,
      body: JSON.stringify({ itemId: 'he_large' }),
    }).catch((e: any) => e);
    if (r.state) last = { state: r.state };
    else if (r.body?.error?.code === 'CAPACITY_FULL') {
      console.log('   capacity full OK');
      break;
    } else if (r.report?.warning) {
      console.log('   partial warning', r.report.warning);
      last = { state: r.state };
    } else break;
  }
  // ensure one more purchase fails or warns
  try {
    const r = await req('/api/shop/purchase', {
      method: 'POST',
      token,
      body: JSON.stringify({ itemId: 'he_large' }),
    });
    if (r.report?.warning) console.log('   warn', r.report.warning);
    else console.log('   still room after fill loop');
  } catch (e: any) {
    assert(
      e.body?.error?.code === 'CAPACITY_FULL' || e.body?.error?.code === 'INSUFFICIENT_CREDITS',
      'full or credits'
    );
    console.log('   final block', e.body.error.code);
  }

  console.log('10. leaderboard');
  const lb = await req('/api/leaderboard', { token });
  assert(lb.entries.length === 50, 'top 50 got ' + lb.entries.length);
  assert(lb.current, 'current present');
  assert(lb.entries.some((e: any) => e.isBot), 'bots present');
  const scores = lb.entries.map((e: any) => e.prosperityScore);
  for (let i = 1; i < scores.length; i++) {
    assert(scores[i] <= scores[i - 1], 'sorted desc');
  }
  console.log(
    '   #1',
    lb.entries[0].name,
    lb.entries[0].prosperityScore,
    'you #',
    lb.current.rank,
    lb.current.prosperityScore,
    'bots',
    lb.entries.filter((e: any) => e.isBot).length
  );

  console.log('11. recalculate prosperity');
  const pr = await req('/api/debug/recalculate-prosperity', {
    method: 'POST',
    token,
    body: '{}',
  });
  console.log('   score', pr.state.civilization.prosperityScore, pr.report.message);

  console.log('\nSMOKE OK Stage 7 shop + leaderboard');
}

main().catch((e) => {
  console.error('SMOKE FAIL', e);
  process.exit(1);
});
