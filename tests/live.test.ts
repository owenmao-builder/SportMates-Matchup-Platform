import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { hash } from 'bcryptjs';
import { handleClub, digest } from '../lib/club-server.ts';
import {
  recommendedVenues,
  refundDue,
  type Match,
  type State,
} from '../lib/demo.ts';
import type { Community } from '../lib/live-model.ts';

// Local SQLite only: never connects to Cloudflare or a real account.
const ORIGIN = 'https://club.test.invalid';
const BASE = Date.parse('2026-09-10T10:00:00+08:00');
const HOUR = 3_600_000;
const PASSWORD = 'FictionalTestPass123';
const ADMIN_PASSWORD = 'FictionalAdminPass456';
const PHONES = ['19900000001', '19900000002', '19900000003'];
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

type BoundValue = string | number | null;
class LocalStatement {
  values: BoundValue[] = [];
  db: DatabaseSync;
  sql: string;
  owner?: LocalD1;
  constructor(db: DatabaseSync, sql: string, owner?: LocalD1) {
    this.db = db;
    this.sql = sql;
    this.owner = owner;
  }
  bind(...values: BoundValue[]) {
    const statement = new LocalStatement(this.db, this.sql, this.owner);
    statement.values = values;
    return statement;
  }
  async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...this.values);
    await this.owner?.afterRead(this.sql);
    return (row ? (column ? row[column] : row) : null) as T | null;
  }
  async run() {
    const result = this.db.prepare(this.sql).run(...this.values);
    if (
      /^UPDATE\s+club_community/i.test(this.sql) &&
      Number(result.changes) === 0 &&
      this.owner
    )
      this.owner.casConflicts++;
    return {
      success: true,
      results: [],
      meta: {
        changes: Number(result.changes),
        last_row_id: Number(result.lastInsertRowid),
      },
    };
  }
}
class LocalD1 {
  sqlite = new DatabaseSync(':memory:');
  casConflicts = 0;
  readBarrier: {
    remaining: number;
    ready: Promise<void>;
    release: () => void;
  } | null = null;
  synchronizeNextCommunityReads(count = 2) {
    assert.equal(this.readBarrier, null);
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.readBarrier = { remaining: count, ready, release };
  }
  async afterRead(sql: string) {
    const barrier = this.readBarrier;
    if (
      !barrier ||
      !/^SELECT\s+revision\s*,\s*state\s+FROM\s+club_community/i.test(sql)
    )
      return;
    barrier.remaining--;
    if (barrier.remaining === 0) {
      this.readBarrier = null;
      barrier.release();
    }
    await barrier.ready;
  }
  constructor() {
    this.sqlite.exec(
      readFileSync(
        new URL('../drizzle/0000_chief_swordsman.sql', import.meta.url),
        'utf8',
      ),
    );
  }
  withSession(_constraint?: string) {
    return this;
  }
  prepare(sql: string) {
    return new LocalStatement(this.sqlite, sql, this);
  }
  async batch(statements: LocalStatement[]) {
    this.sqlite.exec('BEGIN');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.sqlite.exec('COMMIT');
      return results;
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      throw error;
    }
  }
  community(): Community {
    const row = this.sqlite
      .prepare("SELECT state FROM club_community WHERE id='main'")
      .get();
    assert.ok(row);
    return JSON.parse(String(row.state));
  }
}
type ApiResult = {
  response: Response;
  body: {
    state: State;
    error?: string;
    ok?: boolean;
    lastScheduledAt?: number;
  };
  cookie: string;
};
type Actor = { uid: string; cookie: string; phone: string };
async function fixture(t: TestContext) {
  t.mock.timers.enable({ apis: ['Date'], now: BASE });
  const db = new LocalD1();
  t.after(() => db.sqlite.close());
  const env = {
    DB: db as unknown as D1Database,
    APP_ORIGIN: ORIGIN,
    ADMIN_PASSWORD_HASH: await hash(ADMIN_PASSWORD, 4),
    JOB_SECRET: 'fictional-job-secret-for-local-test',
  };
  async function request(
    route: string,
    body?: unknown,
    cookie = '',
    headers: Record<string, string> = {},
  ): Promise<ApiResult> {
    const req = new Request(`${ORIGIN}/api/club/${route}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        origin: ORIGIN,
        'content-type': 'application/json',
        'cf-connecting-ip': '192.0.2.10',
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const response = await handleClub(req, env);
    const result = {
      response,
      body: await response.json(),
      cookie: (response.headers.get('set-cookie') || '').split(';')[0],
    } as ApiResult;
    return result;
  }
  function ok(result: ApiResult) {
    assert.equal(result.response.status, 200, JSON.stringify(result.body));
    assert.ok(result.body.state);
    return result.body.state;
  }
  async function action(
    actor: Actor,
    value: unknown,
    requestId: string = crypto.randomUUID(),
    extra: Record<string, unknown> = {},
  ) {
    return request(
      'action',
      { action: value, requestId, ...extra },
      actor.cookie,
    );
  }
  async function state(actor: Actor) {
    return ok(await request('state', undefined, actor.cookie));
  }
  async function register(index: number): Promise<Actor> {
    const registered = await request('auth/register', {
      phone: PHONES[index],
      password: PASSWORD,
      agreed: true,
    });
    const s = ok(registered);
    assert.match(
      s.role,
      UUID,
      'registered members receive server generated UUIDs',
    );
    assert.ok(registered.cookie);
    return { uid: s.role, cookie: registered.cookie, phone: PHONES[index] };
  }
  async function publish(actor: Actor, index: number) {
    ok(
      await action(actor, {
        type: 'profile',
        profile: {
          name: `测试球友${index}`,
          birth: index === 1 ? '1997-03-14' : '1995-08-22',
          gender: index === 1 ? '男' : '女',
          intro: '仅本地自动测试的虚构用户。',
        },
      }),
    );
    return ok(
      await action(actor, { type: 'preferences', preferences: preferences() }),
    );
  }
  async function admin(): Promise<Actor> {
    const result = await request('auth/login', {
      phone: 'admin',
      password: ADMIN_PASSWORD,
    });
    assert.equal(ok(result).role, 'admin');
    return { uid: 'admin', cookie: result.cookie, phone: 'admin' };
  }
  return { db, env, request, action, ok, state, register, publish, admin };
}
function preferences() {
  return {
    sports: ['羽毛球'],
    sportPrefs: { 羽毛球: { level: 1, gap: 1 } },
    areas: ['徐家汇'],
    radius: 5,
    days: [0, 1, 2, 3, 4, 5, 6],
    start: '14:00',
    end: '18:00',
    specific: '',
    excluded: '',
    active: true,
  };
}
function matchAt(state: State, id: string): Match {
  const match = state.matches.find((m) => m.id === id);
  assert.ok(match, `missing match ${id}`);
  return match;
}

test('live location preferences persist privately, validate before writes, and can be removed', async (t) => {
  const f = await fixture(t);
  const a = await f.register(0),
    b = await f.register(1),
    admin = await f.admin();
  await f.publish(a, 0);
  await f.publish(b, 1);
  const locations = [
    {
      address: '虚构私密门牌测试路987号',
      latitude: 31.19551,
      longitude: 121.43671,
      accuracy: 12,
    },
  ];
  f.ok(
    await f.action(a, {
      type: 'preferences',
      preferences: { ...preferences(), locations },
    }),
  );
  const own = f.ok(await f.request('state', undefined, a.cookie));
  assert.deepEqual(own.profiles[a.uid].locations, locations);
  const peer = f.ok(await f.request('state', undefined, b.cookie));
  assert.ok(peer.profiles[a.uid]);
  assert.deepEqual(peer.profiles[a.uid].locations, []);
  assert.equal(JSON.stringify(peer).includes(locations[0].address), false);
  assert.equal(JSON.stringify(peer).includes('121.43671'), false);
  const managed = f.ok(await f.request('state', undefined, admin.cookie));
  assert.deepEqual(managed.profiles[a.uid].locations, locations);
  const invalid = await f.action(a, {
    type: 'preferences',
    preferences: {
      ...preferences(),
      locations: [{ address: '无效坐标', latitude: 91, longitude: 121 }],
    },
  });
  assert.equal(invalid.response.status, 400);
  assert.deepEqual(
    f.ok(await f.request('state', undefined, a.cookie)).profiles[a.uid]
      .locations,
    locations,
  );
  // Older clients omit the optional field; that must not silently erase a saved point.
  const legacy = f.ok(
    await f.action(a, { type: 'preferences', preferences: preferences() }),
  );
  assert.deepEqual(legacy.profiles[a.uid].locations, locations);
  const cleared = f.ok(
    await f.action(a, {
      type: 'preferences',
      preferences: { ...preferences(), locations: [] },
    }),
  );
  assert.deepEqual(cleared.profiles[a.uid].locations, []);
});

test('live HTTP API authenticates UUID members, isolates data, books and settles verified payments', async (t) => {
  const f = await fixture(t);
  let a: Actor, b: Actor, outsider: Actor, admin: Actor, id: string;
  let paidPrice = 0;
  const privateProof = '测试甲转账凭据 20260910-A';

  await t.test(
    'registration validates phone, consent and password without creating accounts',
    async () => {
      for (const body of [
        { phone: '1990000000', password: PASSWORD, agreed: true },
        { phone: PHONES[0], password: '1234567890', agreed: true },
        { phone: PHONES[0], password: 'abcdefghij', agreed: true },
        { phone: PHONES[0], password: PASSWORD, agreed: false },
      ])
        assert.equal(
          (await f.request('auth/register', body)).response.status,
          400,
        );
      assert.equal(
        f.db.sqlite.prepare('SELECT COUNT(*) AS n FROM club_accounts').get()?.n,
        0,
      );
    },
  );

  await t.test(
    'two separate phone/password registrations and logins retain distinct UUID sessions',
    async () => {
      a = await f.register(0);
      b = await f.register(1);
      outsider = await f.register(2);
      admin = await f.admin();
      assert.notEqual(a.uid, b.uid);
      assert.notEqual(a.cookie, b.cookie);
      for (const actor of [a, b]) {
        assert.equal(
          (
            await f.request('auth/login', {
              phone: actor.phone,
              password: 'WrongPass12345',
            })
          ).response.status,
          401,
        );
        const loggedIn = await f.request('auth/login', {
          phone: actor.phone,
          password: PASSWORD,
        });
        assert.equal(f.ok(loggedIn).role, actor.uid);
        assert.notEqual(loggedIn.cookie, actor.cookie);
        actor.cookie = loggedIn.cookie;
        const account = f.db.sqlite
          .prepare('SELECT password FROM club_accounts WHERE id=?')
          .get(actor.uid);
        assert.match(String(account?.password), /^\$2[aby]\$/);
        assert.notEqual(account?.password, PASSWORD);
        const sessionHash = await digest(actor.cookie.split('=')[1]);
        assert.equal(
          f.db.sqlite
            .prepare('SELECT user_id FROM club_sessions WHERE hash=?')
            .get(sessionHash)?.user_id,
          actor.uid,
        );
        assert.equal(
          loggedIn.response.headers.get('cache-control'),
          'private, no-store',
        );
        assert.match(
          loggedIn.response.headers.get('set-cookie') || '',
          /HttpOnly; SameSite=Lax;.*Secure/,
        );
      }
      assert.equal(
        (
          await f.request('auth/register', {
            phone: PHONES[0],
            password: PASSWORD,
            agreed: true,
          })
        ).response.status,
        400,
      );
      assert.equal((await f.request('state')).response.status, 401);
      assert.equal(
        (
          await f.request(
            'state',
            undefined,
            'tonghao_session=' + '0'.repeat(64),
          )
        ).response.status,
        401,
      );
    },
  );

  await t.test(
    'profile and preference publication finds matching UUID users without seeded demo profiles',
    async () => {
      assert.equal((await f.state(a)).matches.length, 0);
      await f.publish(a, 0);
      const state = await f.publish(b, 1);
      assert.ok(state.matches.length > 0);
      id = state.matches[0].id;
      assert.deepEqual(
        new Set(state.matches[0].members),
        new Set([a.uid, b.uid]),
      );
      for (const match of state.matches)
        assert.ok(match.members.every((uid) => UUID.test(uid)));
      assert.equal(state.live, true);
      assert.equal(f.db.community().profiles.lin, undefined);
      assert.equal(f.db.community().profiles.new, undefined);
      assert.equal((await f.state(a)).profiles[a.uid].registered, true);
    },
  );

  await t.test(
    'birthdays, phones, other members payment fields, notices and account credentials are isolated',
    async () => {
      const sa = await f.state(a),
        sb = await f.state(b),
        sc = await f.state(outsider),
        sm = await f.state(admin);
      assert.equal(sa.profiles[a.uid].birth, '1995-08-22');
      assert.equal(sa.profiles[b.uid].birth, '');
      assert.ok(sa.profiles[b.uid].ageRange);
      assert.equal(sb.profiles[a.uid].birth, '');
      assert.equal(sm.profiles[a.uid].birth, '');
      assert.equal(sa.profiles[outsider.uid], undefined);
      assert.equal(sc.profiles[a.uid], undefined);
      assert.deepEqual(sc.matches, []);
      assert.deepEqual(sc.ledger, []);
      assert.deepEqual(Object.keys(matchAt(sa, id).payments), [a.uid]);
      assert.deepEqual(Object.keys(matchAt(sb, id).payments), [b.uid]);
      assert.ok(sa.notices.every((n) => n.to === a.uid));
      assert.deepEqual(sa.runs, []);
      for (const visible of [sa, sb, sc, sm]) {
        const serialized = JSON.stringify(visible);
        for (const phone of PHONES)
          assert.equal(serialized.includes(phone), false);
        assert.equal(serialized.includes(PASSWORD), false);
        assert.equal(serialized.includes('$2b$'), false);
        assert.equal('operations' in visible, false);
      }
    },
  );

  await t.test(
    'third parties cannot accept or modify a known match and members cannot invoke administrative or demo actions',
    async () => {
      const slots = matchAt(await f.state(a), id).slots.map((s) => s.id);
      const before = f.db.community();
      assert.equal(
        (await f.action(outsider, { type: 'accept', id, slots })).response
          .status,
        403,
      );
      assert.equal(
        (
          await f.action(outsider, {
            type: 'cancel',
            id,
            reason: '测试越权取消',
          })
        ).response.status,
        403,
      );
      for (const action of [
        { type: 'role', role: 'admin' },
        { type: 'scenario', name: 'paid' },
        { type: 'advance', hours: 100 },
        { type: 'run' },
        { type: 'verify', id, user: a.uid, reference: '测试伪造凭据' },
        { type: 'interval', minutes: 60 },
      ])
        assert.equal((await f.action(a, action)).response.status, 400);
      assert.equal(
        (await f.action(admin, { type: 'scenario', name: 'paid' })).response
          .status,
        400,
      );
      assert.equal(
        (await f.action(admin, { type: 'role', role: a.uid })).response.status,
        400,
      );
      assert.equal(
        f.db.community().matches.find((m) => m.id === id)?.stage,
        before.matches.find((m) => m.id === id)?.stage,
      );
      const forged = await f.action(
        a,
        {
          type: 'profile',
          profile: {
            name: '测试球友0',
            birth: '1995-08-22',
            gender: '女',
            intro: '本地测试',
            score: 999,
            id: b.uid,
            active: false,
            phone: PHONES[2],
            role: 'admin',
          },
        },
        crypto.randomUUID(),
        { role: 'admin', now: BASE + 99 * HOUR },
      );
      const visible = f.ok(forged);
      assert.equal(visible.role, a.uid);
      assert.equal(visible.now, BASE);
      assert.equal(visible.profiles[a.uid].score, 5);
      assert.equal(visible.profiles[a.uid].id, a.uid);
      assert.equal(visible.profiles[a.uid].active, true);
      assert.equal('phone' in visible.profiles[a.uid], false);
      const forgedPrefs = f.ok(
        await f.action(a, {
          type: 'preferences',
          preferences: {
            ...preferences(),
            score: 0,
            id: b.uid,
            birth: '1900-01-01',
          },
        }),
      );
      assert.equal(forgedPrefs.profiles[a.uid].score, 5);
      assert.equal(forgedPrefs.profiles[a.uid].birth, '1995-08-22');
    },
  );

  await t.test('CSRF rejects external origins before mutation', async () => {
    const result = await f.request(
      'action',
      { action: { type: 'toggle' }, requestId: crypto.randomUUID() },
      a.cookie,
      { origin: 'https://attacker.invalid' },
    );
    assert.equal(result.response.status, 403);
    assert.equal((await f.state(a)).profiles[a.uid].active, true);
  });

  await t.test(
    'idempotency preserves a previous nonfinancial action and rejects UUID reuse with different parameters',
    async () => {
      const requestId = crypto.randomUUID();
      const value = { type: 'toggle' };
      const first = f.ok(await f.action(a, value, requestId));
      assert.equal(first.profiles[a.uid].active, false);
      const revision = first.serverRevision;
      const repeated = f.ok(await f.action(a, value, requestId));
      assert.equal(repeated.profiles[a.uid].active, false);
      assert.equal(repeated.serverRevision, revision);
      const conflict = await f.action(a, { type: 'read' }, requestId);
      assert.equal(conflict.response.status, 409);
      f.ok(await f.action(a, value));
    },
  );

  await t.test(
    'both acceptances start a fixed three-hour server deadline, then matching venue votes book the match',
    async () => {
      const match = matchAt(await f.state(a), id),
        slots = match.slots.map((s) => s.id);
      const first = matchAt(
        f.ok(await f.action(a, { type: 'accept', id, slots })),
        id,
      );
      assert.equal(first.deadline, null);
      const second = matchAt(
        f.ok(await f.action(b, { type: 'accept', id, slots })),
        id,
      );
      assert.equal(second.stage, 'arranging');
      assert.equal(second.deadline, BASE + 3 * HOUR);
      const options = recommendedVenues(second);
      assert.ok(options.length);
      const venues = matchAt(
        f.ok(await f.action(admin, { type: 'venues', id, venues: options })),
        id,
      );
      assert.equal(venues.deadline, second.deadline);
      assert.ok(
        venues.options.every((v) => UUID.test(v.id)),
        'venue IDs are generated by the server',
      );
      const choice = venues.options[0].id;
      f.ok(await f.action(a, { type: 'vote', id, options: [choice] }));
      const booked = matchAt(
        f.ok(await f.action(b, { type: 'vote', id, options: [choice] })),
        id,
      );
      assert.equal(booked.stage, 'booked');
      assert.ok(booked.booking);
      paidPrice = booked.booking.price;
    },
  );

  await t.test(
    'payment registration requires proof and cannot create money or verify itself',
    async () => {
      assert.equal(
        (await f.action(a, { type: 'pay', id })).response.status,
        400,
      );
      assert.equal(
        (await f.action(a, { type: 'pay', id, proof: '   ' })).response.status,
        400,
      );
      assert.equal(
        (await f.action(outsider, { type: 'pay', id, proof: '越权付款测试' }))
          .response.status,
        403,
      );
      const paid = f.ok(
        await f.action(a, {
          type: 'pay',
          id,
          proof: privateProof,
          amount: 999999,
          verified: true,
          paid: 999999,
          user: b.uid,
        }),
      );
      const payment = matchAt(paid, id).payments[a.uid];
      assert.equal(payment.submitted, true);
      assert.equal(payment.proof, privateProof);
      assert.equal(payment.submittedAt, BASE);
      assert.equal(payment.verified, false);
      assert.equal(payment.paid, 0);
      assert.deepEqual(paid.ledger, []);
      assert.equal(f.db.community().ledger.length, 0);
      const bState = await f.state(b);
      assert.equal(JSON.stringify(bState).includes(privateProof), false);
      assert.equal(matchAt(bState, id).payments[a.uid], undefined);
      assert.equal(
        (await f.action(a, { type: 'pay', id, proof: privateProof })).response
          .status,
        400,
      );
      f.ok(
        await f.action(b, {
          type: 'pay',
          id,
          proof: '测试乙转账凭据 20260910-B',
        }),
      );
    },
  );

  await t.test(
    'administrator verification requires a reference and writes one auditable receipt per request UUID',
    async () => {
      assert.equal(
        (await f.action(admin, { type: 'verify', id, user: a.uid })).response
          .status,
        400,
      );
      assert.equal(
        (
          await f.action(admin, {
            type: 'verify',
            id,
            user: a.uid,
            reference: '  ',
          })
        ).response.status,
        400,
      );
      const requestId = crypto.randomUUID();
      const value = {
        type: 'verify',
        id,
        user: a.uid,
        reference: '测试银行入账编号-A-0001',
      };
      const first = f.ok(await f.action(admin, value, requestId));
      const receipt = first.ledger.find(
        (e) => e.match === id && e.user === a.uid,
      );
      assert.ok(receipt);
      assert.equal(receipt.kind, '收款');
      assert.equal(receipt.amount, paidPrice);
      assert.equal(receipt.actor, 'admin');
      assert.equal(receipt.reference, value.reference);
      assert.equal(receipt.requestKey, `admin:${requestId}`);
      assert.equal(receipt.requestHash, await digest(JSON.stringify(value)));
      const payment = matchAt(first, id).payments[a.uid];
      assert.equal(payment.paid, paidPrice);
      assert.equal(payment.verified, true);
      assert.equal(payment.verifiedAt, BASE);
      assert.equal(payment.verifiedBy, 'admin');
      const second = f.ok(await f.action(admin, value, requestId));
      assert.equal(second.ledger.length, first.ledger.length);
      assert.equal(second.serverRevision, first.serverRevision);
      assert.equal(
        (
          await f.action(
            admin,
            { ...value, reference: '测试银行不同入账编号' },
            requestId,
          )
        ).response.status,
        409,
      );
      assert.equal((await f.action(admin, value)).response.status, 400);
      f.ok(
        await f.action(admin, {
          type: 'verify',
          id,
          user: b.uid,
          reference: '测试银行入账编号-B-0001',
        }),
      );
      const sa = await f.state(a),
        sb = await f.state(b),
        sc = await f.state(outsider);
      assert.equal(sa.ledger.length, 1);
      assert.ok(sa.ledger.every((e) => e.user === a.uid));
      assert.equal(sb.ledger.length, 1);
      assert.ok(sb.ledger.every((e) => e.user === b.uid));
      assert.deepEqual(sc.ledger, []);
    },
  );

  await t.test(
    'server time ends the booking and refunds require checked activity and positive integral bounded amounts',
    async () => {
      const booked = matchAt(await f.state(admin), id);
      assert.ok(booked.booking);
      t.mock.timers.setTime(booked.booking.end + 1);
      const ended = matchAt(await f.state(admin), id);
      assert.equal(ended.stage, 'refund');
      assert.equal(ended.refundQueued, true);
      const reference = '测试退款转账编号-0001';
      assert.equal(
        (
          await f.action(admin, {
            type: 'refund',
            id,
            user: a.uid,
            amount: 1,
            reference,
          })
        ).response.status,
        400,
      );
      f.ok(await f.action(admin, { type: 'check', id }));
      const due = refundDue(matchAt(await f.state(admin), id), a.uid);
      assert.ok(due > 0);
      const before = f.db.community().ledger.length;
      for (const amount of [
        -1,
        0,
        0.5,
        '100',
        'half',
        null,
        1_000_001,
        Number.MAX_SAFE_INTEGER,
        due + 1,
      ]) {
        const result = await f.action(admin, {
          type: 'refund',
          id,
          user: a.uid,
          amount,
          reference,
        });
        assert.equal(
          result.response.status,
          400,
          `invalid refund amount ${String(amount)}: ${JSON.stringify(result.body)}`,
        );
      }
      assert.equal(
        (await f.action(admin, { type: 'refund', id, user: a.uid, amount: 1 }))
          .response.status,
        400,
      );
      assert.equal(
        (
          await f.action(a, {
            type: 'refund',
            id,
            user: a.uid,
            amount: 1,
            reference,
          })
        ).response.status,
        400,
      );
      assert.equal(f.db.community().ledger.length, before);
      assert.equal(
        matchAt(await f.state(admin), id).payments[a.uid].refunded,
        0,
      );
      const requestId = crypto.randomUUID();
      const action = {
        type: 'refund',
        id,
        user: a.uid,
        amount: due,
        reference,
      };
      const refunded = f.ok(await f.action(admin, action, requestId));
      assert.equal(matchAt(refunded, id).payments[a.uid].refunded, due);
      assert.equal(refunded.ledger.length, before + 1);
      assert.equal(refunded.ledger[0].amount, -due);
      assert.equal(refunded.ledger[0].reference, reference);
      assert.equal(
        f.ok(await f.action(admin, action, requestId)).ledger.length,
        before + 1,
      );
      assert.equal(
        (await f.action(admin, { ...action, amount: due - 1 }, requestId))
          .response.status,
        409,
      );
      assert.equal((await f.action(admin, action)).response.status, 400);
      const bDue = refundDue(matchAt(await f.state(admin), id), b.uid);
      const complete = f.ok(
        await f.action(admin, {
          type: 'refund',
          id,
          user: b.uid,
          amount: bDue,
          reference: '测试退款转账编号-0002',
        }),
      );
      assert.equal(matchAt(complete, id).stage, 'ended');
      assert.equal(
        complete.ledger
          .filter((e) => e.match === id)
          .reduce((sum, e) => sum + e.amount, 0),
        paidPrice,
      );
      assert.ok((await f.state(a)).ledger.every((e) => e.user === a.uid));
      assert.deepEqual((await f.state(outsider)).ledger, []);
    },
  );

  await t.test(
    'authenticated scheduled sweep runs and logout revokes the current session',
    async () => {
      assert.equal((await f.request('jobs', {})).response.status, 401);
      const job = await f.request('jobs', {}, '', {
        authorization: `Bearer ${f.env.JOB_SECRET}`,
      });
      assert.equal(job.response.status, 200);
      assert.equal(job.body.lastScheduledAt, Date.now());
      const loggedOut = await f.request('auth/logout', {}, a.cookie);
      assert.equal(loggedOut.response.status, 200);
      assert.match(
        loggedOut.response.headers.get('set-cookie') || '',
        /Max-Age=0/,
      );
      assert.equal(
        (await f.request('state', undefined, a.cookie)).response.status,
        401,
      );
      assert.equal((await f.state(b)).role, b.uid);
    },
  );
});

test('three-hour confirmation expires exactly against server time and never resets on repeated acceptance or venue changes', async (t) => {
  const f = await fixture(t),
    a = await f.register(0),
    b = await f.register(1),
    admin = await f.admin();
  await f.publish(a, 0);
  const initial = await f.publish(b, 1);
  const id = initial.matches[0].id;
  const slots = initial.matches[0].slots.map((s) => s.id);
  f.ok(
    await f.action(a, { type: 'accept', id, slots }, crypto.randomUUID(), {
      now: BASE + 100 * HOUR,
    }),
  );
  t.mock.timers.setTime(BASE + 15 * 60_000);
  const second = matchAt(
    f.ok(await f.action(b, { type: 'accept', id, slots, now: 0 })),
    id,
  );
  const deadline = BASE + 15 * 60_000 + 3 * HOUR;
  assert.equal(second.deadline, deadline);
  assert.equal(second.acceptedAt[b.uid], Date.now());
  const scores = [
    second.members.map((uid) => f.db.community().profiles[uid].score),
  ];
  t.mock.timers.setTime(BASE + HOUR);
  const repeated = matchAt(
    f.ok(await f.action(a, { type: 'accept', id, slots })),
    id,
  );
  assert.equal(repeated.deadline, deadline);
  const options = recommendedVenues(repeated);
  const venue = matchAt(
    f.ok(await f.action(admin, { type: 'venues', id, venues: options })),
    id,
  );
  assert.equal(venue.deadline, deadline);
  t.mock.timers.setTime(deadline - 1);
  assert.equal(matchAt(await f.state(a), id).stage, 'venue');
  t.mock.timers.setTime(deadline);
  const expired = matchAt(await f.state(b), id);
  assert.equal(expired.stage, 'expired');
  assert.equal(expired.deadline, deadline);
  assert.deepEqual(
    [expired.members.map((uid) => f.db.community().profiles[uid].score)],
    scores,
  );
  assert.equal(
    (await f.action(a, { type: 'vote', id, options: [venue.options[0].id] }))
      .response.status,
    400,
  );
  assert.equal(
    (await f.action(b, { type: 'accept', id, slots })).response.status,
    400,
  );
  assert.equal(matchAt(await f.state(a), id).stage, 'expired');
});

test('malformed preference dates and malformed UUID requests are client errors, without mutations', async (t) => {
  const f = await fixture(t),
    a = await f.register(0);
  await f.publish(a, 0);
  await t.test(
    'invalid calendar dates return 400 instead of a service error',
    async () => {
      for (const date of ['2026-99-99', '2026-02-31']) {
        for (const field of ['specific', 'excluded']) {
          const result = await f.action(a, {
            type: 'preferences',
            preferences: { ...preferences(), [field]: date },
          });
          assert.equal(
            result.response.status,
            400,
            `${field}=${date}: ${JSON.stringify(result.body)}`,
          );
        }
      }
    },
  );
  await t.test(
    '36 hyphens are not a request UUID and cannot execute a toggle',
    async () => {
      const before = (await f.state(a)).profiles[a.uid].active;
      const result = await f.action(a, { type: 'toggle' }, '-'.repeat(36));
      assert.equal(result.response.status, 400);
      assert.equal((await f.state(a)).profiles[a.uid].active, before);
    },
  );
});

test(
  'concurrent final votes sharing a participant collide on CAS and cannot double-book the same time',
  { timeout: 15_000 },
  async (t) => {
    const f = await fixture(t),
      a = await f.register(0),
      b = await f.register(1),
      c = await f.register(2),
      admin = await f.admin();
    for (const [index, actor] of [a, b, c].entries())
      await f.publish(actor, index);
    const initial = await f.state(admin);
    const ab = initial.matches.find(
      (m) => m.members.includes(a.uid) && m.members.includes(b.uid),
    );
    const ac = initial.matches.find(
      (m) => m.members.includes(a.uid) && m.members.includes(c.uid),
    );
    assert.ok(ab);
    assert.ok(ac);
    assert.notEqual(ab.id, ac.id);
    const slots = ab.slots
      .filter((slot) => ac.slots.some((other) => other.id === slot.id))
      .map((slot) => slot.id);
    assert.ok(slots.length >= 2);
    for (const [match, other] of [
      [ab, b],
      [ac, c],
    ] as const) {
      f.ok(await f.action(a, { type: 'accept', id: match.id, slots }));
      f.ok(await f.action(other, { type: 'accept', id: match.id, slots }));
    }
    const arranging = await f.state(admin);
    const proposed = recommendedVenues(matchAt(arranging, ab.id))[0];
    assert.ok(proposed);
    const choices: Record<string, string> = {};
    for (const match of [ab, ac]) {
      const updated = matchAt(
        f.ok(
          await f.action(admin, {
            type: 'venues',
            id: match.id,
            venues: [proposed],
          }),
        ),
        match.id,
      );
      choices[match.id] = updated.options[0].id;
      assert.equal(updated.options[0].start, proposed.start);
      assert.equal(updated.options[0].end, proposed.end);
      f.ok(
        await f.action(a, {
          type: 'vote',
          id: match.id,
          options: [choices[match.id]],
        }),
      );
    }
    const before = f.db.community();
    assert.equal(matchAt(before, ab.id).stage, 'venue');
    assert.equal(matchAt(before, ac.id).stage, 'venue');
    assert.equal(f.db.casConflicts, 0);
    // Both requests pause after reading the same revision. Actual UPDATE ... WHERE
    // revision statements then compete, forcing one request through the CAS retry.
    f.db.synchronizeNextCommunityReads();
    const results = await Promise.all([
      f.action(b, { type: 'vote', id: ab.id, options: [choices[ab.id]] }),
      f.action(c, { type: 'vote', id: ac.id, options: [choices[ac.id]] }),
    ]);
    assert.deepEqual(
      results.map((result) => result.response.status).sort(),
      [200, 400],
    );
    assert.ok(
      f.db.casConflicts >= 1,
      'the stale snapshot must lose an actual compare-and-swap update',
    );
    const rejected = results.find((result) => result.response.status === 400);
    assert.ok(rejected);
    assert.match(rejected.body.error || '', /对局已满/);
    const final = await f.state(admin);
    const pair = [matchAt(final, ab.id), matchAt(final, ac.id)];
    assert.equal(pair.filter((match) => match.stage === 'booked').length, 1);
    assert.equal(pair.filter((match) => match.booking !== null).length, 1);
    const winner = pair.find((match) => match.stage === 'booked')!;
    const loser = pair.find((match) => match.id !== winner.id)!;
    assert.equal(loser.booking, null);
    const losingActor = loser.members.includes(b.uid) ? b : c;
    assert.equal(
      loser.votes[losingActor.uid],
      undefined,
      'failed final vote is not partially committed',
    );
    const retry = await f.action(losingActor, {
      type: 'vote',
      id: loser.id,
      options: [choices[loser.id]],
    });
    assert.equal(retry.response.status, 400);
    assert.match(retry.body.error || '', /对局已满/);
    assert.equal(
      f.db
        .community()
        .matches.filter(
          (m) =>
            m.members.includes(a.uid) && m.booking?.start === proposed.start,
        ).length,
      1,
    );
    assert.deepEqual(f.db.community().ledger, []);

    await t.test(
      'pending cancellation blocks either participant from submitting payment without changing payments or ledger',
      async () => {
        const cancelled = matchAt(
          f.ok(
            await f.action(a, {
              type: 'cancel',
              id: winner.id,
              reason: '本地测试临时有事，请管家审核',
            }),
          ),
          winner.id,
        );
        assert.equal(cancelled.cancel?.reviewed, false);
        const persisted = matchAt(f.db.community(), winner.id);
        const beforePayments = structuredClone(persisted.payments);
        const beforeLedger = structuredClone(f.db.community().ledger);
        const partner = winner.members.includes(b.uid) ? b : c;
        for (const member of [a, partner]) {
          const result = await f.action(member, {
            type: 'pay',
            id: winner.id,
            proof: '本地取消待审核付款测试凭据',
          });
          assert.equal(result.response.status, 400);
          assert.match(result.body.error || '', /取消申请处理中/);
        }
        const after = f.db.community();
        assert.deepEqual(matchAt(after, winner.id).payments, beforePayments);
        assert.deepEqual(after.ledger, beforeLedger);
        assert.equal(matchAt(after, winner.id).cancel?.reviewed, false);
      },
    );
  },
);
