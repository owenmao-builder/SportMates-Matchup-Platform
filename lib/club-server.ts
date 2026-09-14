import { hash, compare } from 'bcryptjs';
import { validatePhone } from './phone.ts';
import { reduce } from './demo.ts';
import {
  applyLive,
  publicState,
  newCommunity,
  newProfile,
  ClubError,
  type Community,
} from './live-model.ts';

type Bindings = {
  DB: D1Database;
  BUCKET?: R2Bucket;
  ARK_API_KEY?: string;
  AVATAR_IMAGE_MODEL?: string;
  ADMIN_PASSWORD_HASH?: string;
  JOB_SECRET?: string;
  APP_ORIGIN?: string;
};
const COOKIE = 'tonghao_session';
const DAY = 86400000;
const encoder = new TextEncoder();
export async function digest(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', encoder.encode(value)),
    ),
    (x) => x.toString(16).padStart(2, '0'),
  ).join('');
}
function token() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');
}
function json(value: unknown, status = 200, cookie?: string) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  if (cookie) headers.set('Set-Cookie', cookie);
  return new Response(JSON.stringify(value), { status, headers });
}
function cookieFor(value: string, req: Request) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${value ? 7 * 86400 : 0}${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;
}
async function dbReady(env: Bindings) {
  if (!env.DB) throw new ClubError('服务正在准备，请稍后重试', 503);
  return env.DB.withSession('first-primary');
}
async function load(db: D1DatabaseSession) {
  const row = await db
    .prepare("SELECT revision,state FROM club_community WHERE id='main'")
    .first<{ revision: number; state: string }>();
  if (row)
    return {
      revision: row.revision,
      state: JSON.parse(row.state) as Community,
    };
  await db
    .prepare(
      "INSERT OR IGNORE INTO club_community(id,revision,state) VALUES('main',0,?)",
    )
    .bind(JSON.stringify(newCommunity()))
    .run();
  return load(db);
}
export async function mutate(
  env: Bindings,
  change: (s: Community, now: number) => Community,
) {
  const db = await dbReady(env);
  for (let attempt = 0; attempt < 8; attempt++) {
    const { revision, state } = await load(db);
    const next = change(state, Date.now());
    if (next === state) return state;
    next.serverRevision = revision + 1;
    const result = await db
      .prepare(
        "UPDATE club_community SET state=?,revision=revision+1 WHERE id='main' AND revision=?",
      )
      .bind(JSON.stringify(next), revision)
      .run();
    if (result.meta.changes === 1) return next;
  }
  throw new ClubError('其他球友刚刚更新了活动，请刷新后重试', 409);
}
export async function sweep(env: Bindings, scheduled = false) {
  return mutate(env, (s, now) => {
    const next = reduce(
      { ...s, now, role: 'admin' },
      { type: 'refresh' },
    ) as Community;
    next.message = '';
    if (scheduled) next.lastScheduledAt = now;
    return next;
  });
}
async function stateFor(env: Bindings, uid: string) {
  const state = await mutate(env, (s, now) => {
    if (!s.profiles[uid])
      s = { ...s, profiles: { ...s.profiles, [uid]: newProfile(uid) } };
    const next = reduce(
      { ...s, role: uid, now },
      { type: 'refresh' },
    ) as Community;
    next.message = '';
    return next;
  });
  return publicState(state, uid);
}
async function rate(
  env: Bindings,
  key: string,
  maximum: number,
  milliseconds: number,
) {
  const db = await dbReady(env);
  const window = Math.floor(Date.now() / milliseconds);
  const row = await db
    .prepare(
      'INSERT INTO club_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count',
    )
    .bind(`${await digest(key)}:${window}`, (window + 1) * milliseconds)
    .first<{ count: number }>();
  if (!row || row.count > maximum)
    throw new ClubError('尝试过于频繁，请稍后重试', 429);
}
async function readBody(req: Request, limit = 65536) {
  if (!(req.headers.get('content-type') || '').startsWith('application/json'))
    throw new ClubError('请提交 JSON 内容', 415);
  if (Number(req.headers.get('content-length') || 0) > limit)
    throw new ClubError('内容过大', 413);
  const reader = req.body?.getReader();
  if (!reader) throw new ClubError('提交内容为空');
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > limit) {
      await reader.cancel();
      throw new ClubError('内容过大', 413);
    }
    chunks.push(value);
  }
  const all = new Uint8Array(bytes);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.byteLength;
  }
  try {
    const body = JSON.parse(new TextDecoder().decode(all));
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new Error();
    return body;
  } catch {
    throw new ClubError('提交内容格式无效');
  }
}
function csrf(req: Request, env: Bindings) {
  const origin = req.headers.get('origin');
  const allowed = env.APP_ORIGIN || new URL(req.url).origin;
  if (origin !== allowed || req.headers.get('sec-fetch-site') === 'cross-site')
    throw new ClubError('请求来源无效，请从同好会页面操作', 403);
}
async function session(req: Request, env: Bindings) {
  const value = (req.headers.get('cookie') || '')
    .split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith(COOKIE + '='))
    ?.slice(COOKIE.length + 1);
  if (!value || !/^[a-f0-9]{64}$/.test(value))
    throw new ClubError('请先登录', 401);
  const hashed = await digest(value),
    db = await dbReady(env);
  const row = await db
    .prepare('SELECT user_id FROM club_sessions WHERE hash=? AND expires>?')
    .bind(hashed, Date.now())
    .first<{ user_id: string }>();
  if (!row) throw new ClubError('登录已过期，请重新登录', 401);
  return { uid: row.user_id, hashed };
}
function passwordValid(password: unknown) {
  if (
    typeof password !== 'string' ||
    password.length < 10 ||
    encoder.encode(password).length > 72 ||
    !/[A-Za-z]/.test(password) ||
    !/[0-9]/.test(password)
  )
    throw new ClubError('密码至少 10 位，包含字母和数字，且不超过 72 字节');
}
async function newSession(env: Bindings, uid: string) {
  const raw = token(),
    db = await dbReady(env);
  await db
    .prepare('INSERT INTO club_sessions(hash,user_id,expires) VALUES(?,?,?)')
    .bind(await digest(raw), uid, Date.now() + 7 * DAY)
    .run();
  return raw;
}

export async function handleClub(req: Request, env: Bindings) {
  try {
    const url = new URL(req.url),
      route = url.pathname.replace(/^\/api\/club\/?/, '');
    if (route === 'jobs' && req.method === 'POST') {
      if (
        !env.JOB_SECRET ||
        !(await secretMatches(req.headers.get('authorization'), env.JOB_SECRET))
      )
        throw new ClubError('未授权', 401);
      const state = await sweep(env, true);
      const db = await dbReady(env);
      await db.batch([
        db
          .prepare('DELETE FROM club_sessions WHERE expires<?')
          .bind(Date.now()),
        db
          .prepare('DELETE FROM club_limits WHERE expires<?')
          .bind(Date.now() - DAY),
      ]);
      return json({
        ok: true,
        lastScheduledAt: state.lastScheduledAt,
        nextRun: state.nextRun,
      });
    }
    if (!['GET', 'POST'].includes(req.method))
      throw new ClubError('方法不支持', 405);
    const body =
      req.method === 'POST'
        ? (csrf(req, env),
          await readBody(req, route === 'avatar' ? 5 * 1024 * 1024 : 65536))
        : null;
    const ip = req.headers.get('cf-connecting-ip') || 'unknown';
    if (route === 'auth/register' || route === 'auth/login') {
      if (req.method !== 'POST') throw new ClubError('方法不支持', 405);
      const administrator = route === 'auth/login' && body.phone === 'admin';
      const checked = validatePhone(
        typeof body.phone === 'string' ? body.phone : '',
      );
      if (!administrator && checked.error) throw new ClubError(checked.error);
      const phone = administrator ? 'admin' : checked.phone;
      await rate(env, `auth-ip:${ip}`, 30, 15 * 60000);
      await rate(env, `auth-account:${phone}`, 15, 15 * 60000);
      const db = await dbReady(env);
      let uid = '';
      if (route === 'auth/register') {
        passwordValid(body.password);
        if (body.agreed !== true)
          throw new ClubError('请先同意活动规则与隐私说明');
        const exists = await db
          .prepare('SELECT id FROM club_accounts WHERE phone=?')
          .bind(phone)
          .first();
        if (exists)
          throw new ClubError('该手机号已有账号，请登录；忘记密码请联系管家');
        uid = crypto.randomUUID();
        const password = await hash(body.password, 12);
        try {
          await db
            .prepare(
              'INSERT INTO club_accounts(id,phone,password,created) VALUES(?,?,?,?)',
            )
            .bind(uid, phone, password, Date.now())
            .run();
        } catch (error) {
          if (String(error).includes('UNIQUE'))
            throw new ClubError('该手机号已有账号，请登录');
          throw error;
        }
      } else {
        if (
          typeof body.password !== 'string' ||
          encoder.encode(body.password).length > 72
        )
          throw new ClubError('手机号或密码不正确', 401);
        const account = administrator
          ? { id: 'admin', password: env.ADMIN_PASSWORD_HASH }
          : await db
              .prepare('SELECT id,password FROM club_accounts WHERE phone=?')
              .bind(phone)
              .first<{ id: string; password: string }>();
        // Compare against a valid dummy hash too, so absent accounts do not skip the expensive verification.
        const dummy =
          '$2b$12$5IFjQaOwgEZl1nkE70xwo.zsjAxEb.Ia0YEVDTXCP.wzGgWe26QCW';
        const valid = await compare(body.password, account?.password || dummy);
        if (!account?.password || !valid)
          throw new ClubError('手机号或密码不正确', 401);
        uid = account.id;
      }
      const state = await stateFor(env, uid);
      const raw = await newSession(env, uid);
      return json({ state }, 200, cookieFor(raw, req));
    }
    const { uid, hashed } = await session(req, env);
    await rate(env, `user:${uid}`, 180, 60000);
    if (route === 'avatar' && req.method === 'POST') {
      const { generateAvatar } = await import('./avatar-server.ts');
      return json(
        await generateAvatar(env, uid, body, (key, n, ms) =>
          rate(env, key, n, ms),
        ),
      );
    }
    if (route === 'avatar/current' && req.method === 'GET') {
      const { currentAvatar } = await import('./avatar-server.ts');
      return json(await currentAvatar(env, uid));
    }
    if (route.startsWith('avatar/image/') && req.method === 'GET') {
      const { avatarImage } = await import('./avatar-server.ts');
      return avatarImage(env, uid, route.slice('avatar/image/'.length));
    }
    if (route === 'auth/logout' && req.method === 'POST') {
      const db = await dbReady(env);
      await db
        .prepare('DELETE FROM club_sessions WHERE hash=?')
        .bind(hashed)
        .run();
      return json({ ok: true }, 200, cookieFor('', req));
    }
    if (route === 'state' && req.method === 'GET')
      return json({ state: await stateFor(env, uid) });
    if (route === 'action' && req.method === 'POST') {
      if (
        typeof body.requestId !== 'string' ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
          body.requestId,
        )
      )
        throw new ClubError('请求编号无效');
      const actionHash = await digest(JSON.stringify(body.action)),
        key = `${uid}:${body.requestId}`;
      const result = await mutate(env, (s, now) => {
        const receipt = s.ledger.find((e) => e.requestKey === key);
        if (receipt) {
          if (receipt.requestHash !== actionHash)
            throw new ClubError('请求编号已用于其他操作', 409);
          return s;
        }
        const previous = s.operations.find((x) => x.startsWith(key + ':'));
        if (previous) {
          if (previous !== `${key}:${actionHash}`)
            throw new ClubError('请求编号已用于其他操作', 409);
          return s;
        }
        const next = applyLive(s, uid, body.action, now);
        const existing = new Set(s.ledger.map((e) => e.id));
        next.ledger = next.ledger.map((e) =>
          existing.has(e.id)
            ? e
            : {
                ...e,
                actor: uid,
                reference: body.action.reference,
                requestKey: key,
                requestHash: actionHash,
              },
        );
        next.operations = [...next.operations, `${key}:${actionHash}`].slice(
          -5000,
        );
        return next;
      });
      return json({ state: publicState(result, uid) });
    }
    throw new ClubError('接口不存在', 404);
  } catch (error) {
    if (error instanceof ClubError)
      return json({ error: error.message }, error.status);
    console.error(
      '[club-api]',
      error instanceof Error ? error.message : 'unknown',
    );
    return json({ error: '服务暂时不可用，请稍后重试；已填写内容会保留' }, 503);
  }
}
async function secretMatches(header: string | null, secret: string) {
  if (!header?.startsWith('Bearer ')) return false;
  const [a, b] = await Promise.all([digest(header.slice(7)), digest(secret)]);
  let different = 0;
  for (let i = 0; i < a.length; i++)
    different |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return different === 0;
}
