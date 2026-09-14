import {
  initialState,
  ageBand,
  reduce,
  SPORTS,
  type State,
  type Profile,
  type Action,
} from './demo.ts';
import { validateLocations } from './locations.ts';

export type Community = State & {
  operations: string[];
  lastScheduledAt: number;
};
export function newProfile(id: string): Profile {
  return {
    ...initialState().profiles.new,
    id,
    name: id === 'admin' ? '同好管家' : '新同好',
    birth: '',
    gender: '',
    intro: '',
    registered: id === 'admin',
    active: false,
    sports: [],
    sportPrefs: {},
    areas: [],
    locations: [],
    days: [],
    specific: '',
    excluded: '',
  };
}
export function newCommunity(now = Date.now()): Community {
  return {
    ...initialState(now),
    role: 'admin',
    profiles: { admin: newProfile('admin') },
    matches: [],
    notices: [],
    ledger: [],
    runs: [],
    serial: 1,
    message: '',
    operations: [],
    lastScheduledAt: 0,
    live: true,
  };
}
export class ClubError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ClubError(message);
}
function strings(value: unknown, max: number, itemMax = 80): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= max &&
    value.every((x) => typeof x === 'string' && x.length <= itemMax)
  );
}
const memberActions = new Set([
  'profile',
  'preferences',
  'toggle',
  'refresh',
  'accept',
  'decline',
  'vote',
  'pay',
  'cancel',
  'read',
]);
const adminActions = new Set([
  'interval',
  'run',
  'venues',
  'verify',
  'check',
  'refund',
  'supplement',
  'reviewCancel',
  'reviewDecline',
  'refresh',
  'read',
]);

export function safeAction(input: unknown, uid: string): Action {
  check(
    input && typeof input === 'object' && !Array.isArray(input),
    '操作内容无效',
  );
  const a = input as Action;
  check(
    (uid === 'admin' ? adminActions : memberActions).has(a.type),
    '此操作不可用',
  );
  const out: Action = { type: a.type };
  if (a.id !== undefined) {
    check(typeof a.id === 'string' && a.id.length < 100, '活动编号无效');
    out.id = a.id;
  }
  if (a.type === 'profile') {
    const p = a.profile;
    check(p && typeof p === 'object', '请填写个人资料');
    check(
      typeof p.name === 'string' &&
        p.name.trim().length > 0 &&
        p.name.length <= 18,
      '昵称为 1–18 个字',
    );
    check(
      typeof p.intro === 'string' && p.intro.length <= 160,
      '自我介绍最多 160 字',
    );
    check(
      typeof p.birth === 'string' && /^(19|20)\d{2}-\d{2}-\d{2}$/.test(p.birth),
      '请填写真实出生日期',
    );
    check(['男', '女'].includes(p.gender), '请选择性别');
    out.profile = {
      name: p.name.trim(),
      intro: p.intro,
      birth: p.birth,
      gender: p.gender,
    };
  }
  if (a.type === 'preferences') {
    const p = a.preferences;
    check(p && typeof p === 'object', '匹配偏好无效');
    let locations: ReturnType<typeof validateLocations> | undefined = undefined;
    try {
      locations =
        p.locations === undefined ? undefined : validateLocations(p.locations);
    } catch (error) {
      throw new ClubError(
        error instanceof Error ? error.message : '详细地点无效',
      );
    }
    check(
      strings(p.sports, 6) &&
        p.sports.length > 0 &&
        p.sports.every((x: string) => SPORTS.includes(x)),
      '请选择有效运动',
    );
    check(
      strings(p.areas, 5) &&
        (p.areas.length > 0 || !!locations?.length) &&
        p.areas.every((x: string) =>
          ['徐家汇', '静安寺', '五角场', '世纪公园', '虹桥'].includes(x),
        ),
      '请选择有效区域',
    );
    check(
      Array.isArray(p.days) &&
        p.days.length <= 7 &&
        p.days.every(
          (x: unknown) =>
            Number.isInteger(x) && Number(x) >= 0 && Number(x) <= 6,
        ),
      '每周空闲无效',
    );
    check(
      typeof p.active === 'boolean' &&
        Number.isInteger(p.radius) &&
        p.radius >= 1 &&
        p.radius <= 50,
      '活动半径无效',
    );
    for (const key of ['start', 'end'])
      check(
        typeof p[key] === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(p[key]),
        '空闲时间无效',
      );
    for (const key of ['specific', 'excluded'])
      check(
        typeof p[key] === 'string' &&
          p[key].length <= 220 &&
          (!p[key] ||
            p[key]
              .split(',')
              .every(
                (x: string) =>
                  /^\d{4}-\d{2}-\d{2}$/.test(x) &&
                  !Number.isNaN(Date.parse(x)) &&
                  new Date(x).toISOString().slice(0, 10) === x,
              )),
        '空闲日期无效',
      );
    const sportPrefs: Record<string, { level: number; gap: number }> = {};
    for (const sport of p.sports) {
      const choice = p.sportPrefs?.[sport] || p;
      check(
        [0, 1, 2].includes(choice.level) && [0, 1, 2].includes(choice.gap),
        '运动水平或接受差距无效',
      );
      sportPrefs[sport] = { level: choice.level, gap: choice.gap };
    }
    out.preferences = {
      sports: [...new Set(p.sports)],
      areas: [...new Set(p.areas)],
      ...(locations === undefined ? {} : { locations }),
      days: [...new Set(p.days)],
      radius: p.radius,
      active: p.active,
      start: p.start,
      end: p.end,
      specific: p.specific,
      excluded: p.excluded,
      sportPrefs,
      level: sportPrefs[p.sports[0]].level,
      gap: sportPrefs[p.sports[0]].gap,
    };
  }
  if (a.type === 'accept') {
    check(strings(a.slots, 1500, 40) && a.slots.length > 0, '请选择空闲时间');
    out.slots = a.slots;
  }
  if (a.type === 'vote') {
    check(strings(a.options, 30, 100) && a.options.length > 0, '请选择场次');
    out.options = a.options;
  }
  if (['decline', 'cancel'].includes(a.type)) {
    check(
      typeof a.reason === 'string' && a.reason.length <= 500,
      '原因最多 500 字',
    );
    out.reason = a.reason.trim();
  }
  if (a.type === 'pay') {
    check(
      typeof a.proof === 'string' &&
        a.proof.trim().length >= 4 &&
        a.proof.length <= 300,
      '请填写转账时间、付款人或转账单号等说明（4–300 字）',
    );
    out.proof = a.proof.trim();
  }
  if (['verify', 'refund', 'supplement'].includes(a.type)) {
    check(
      typeof a.reference === 'string' &&
        a.reference.trim().length >= 4 &&
        a.reference.length <= 300,
      '请填写实际收款或退款凭据（4–300 字）',
    );
    out.reference = a.reference.trim();
  }
  if (a.type === 'interval') out.minutes = a.minutes;
  if (a.type === 'venues') {
    check(
      Array.isArray(a.venues) && a.venues.length > 0 && a.venues.length <= 20,
      '请提供 1–20 个场次',
    );
    out.venues = a.venues.map((v: any) => {
      check(
        typeof v.name === 'string' && v.name.trim() && v.name.length <= 100,
        '场地名称无效',
      );
      check(
        Number.isInteger(v.start) && Number.isInteger(v.end) && v.end > v.start,
        '场次时间无效',
      );
      check(
        Number.isSafeInteger(v.price) && v.price >= 0 && v.price <= 1000000,
        '场地总费用无效',
      );
      return {
        id: crypto.randomUUID(),
        name: v.name.trim(),
        start: v.start,
        end: v.end,
        price: v.price,
      };
    });
  }
  if (['verify', 'refund', 'supplement'].includes(a.type)) {
    check(typeof a.user === 'string' && a.user.length <= 100, '用户编号无效');
    out.user = a.user;
  }
  if (['refund', 'supplement'].includes(a.type)) {
    check(
      Number.isSafeInteger(a.amount) && a.amount > 0 && a.amount <= 1000000,
      '结算金额无效',
    );
    out.amount = a.amount;
  }
  if (a.type === 'reviewCancel') {
    check(typeof a.refundable === 'boolean', '请确认场地能否取消');
    out.refundable = a.refundable;
  }
  if (a.type === 'reviewDecline') {
    check(typeof a.penalty === 'boolean', '审核选项无效');
    out.penalty = a.penalty;
  }
  return out;
}

export function applyLive(
  state: Community,
  uid: string,
  input: unknown,
  now: number,
): Community {
  check(!!state.profiles[uid], '账号不存在');
  const a = safeAction(input, uid);
  const current = reduce(
    { ...state, role: uid, now },
    { type: 'refresh' },
  ) as Community;
  const match = current.matches.find((m) => m.id === a.id);
  if (match && uid !== 'admin' && !match.members.includes(uid))
    throw new ClubError('无权操作此活动', 403);
  if (a.type === 'pay' && match?.cancel)
    throw new ClubError('取消申请处理中，请先与管家确认结算');
  if (
    a.type === 'refund' &&
    match &&
    a.amount >
      match.members.reduce(
        (n, u) => n + match.payments[u].paid - match.payments[u].refunded,
        0,
      )
  )
    throw new ClubError('退款超过本场实际剩余收款');
  if (
    ['verify', 'refund', 'supplement'].includes(a.type) &&
    current.ledger.some((e) => e.reference === a.reference && e.actor === uid)
  )
    throw new ClubError('这份转账凭据已登记，请核对资金流水');
  const result = reduce(current, a) as Community;
  if (result.profiles === current.profiles) throw new ClubError(result.message);
  const updated = result.matches.find((m) => m.id === a.id);
  if (a.type === 'pay' && updated) {
    Object.assign(updated.payments[uid], { proof: a.proof, submittedAt: now });
    result.message = '付款已登记，等待管家核实';
  }
  if (a.type === 'verify' && updated) {
    Object.assign(updated.payments[a.user], {
      verifiedAt: now,
      verifiedBy: uid,
      reference: a.reference,
    });
    result.message = '实际收款已核实并记入流水';
  }
  if (a.type === 'refund') {
    result.message = '已登记实际退款，球友活动状态已同步';
  }
  result.notices = result.notices.map((n) => ({
    ...n,
    text: n.text.replaceAll('模拟', '').replace('本演示场景', ''),
  }));
  return result;
}

export function publicState(
  state: Community,
  uid: string,
): State & { lastScheduledAt: number } {
  const admin = uid === 'admin';
  const matches = state.matches.filter((m) => admin || m.members.includes(uid));
  const visible = new Set([uid, 'admin', ...matches.flatMap((m) => m.members)]);
  const profiles: Record<string, Profile> = {};
  for (const id of visible) {
    const p = state.profiles[id];
    if (!p) continue;
    profiles[id] =
      id === uid
        ? { ...p }
        : {
            ...newProfile(id),
            name: p.name,
            ageRange: ageBand(p.birth, state.now),
            gender: '',
            birth: '',
            score: p.score,
            avatar: p.avatar,
            registered: true,
            sports: p.sports,
            level: p.level,
            gap: p.gap,
            sportPrefs: p.sportPrefs,
            areas: p.areas,
            ...(admin ? { locations: p.locations || [] } : {}),
            radius: p.radius,
          };
  }
  return {
    version: 3,
    role: uid,
    now: state.now,
    profiles,
    matches: matches.map((m) => ({
      ...m,
      payments: admin ? m.payments : { [uid]: m.payments[uid] },
      cancel:
        m.cancel && !admin && m.cancel.by !== uid
          ? { ...m.cancel, reason: '其他球友已申请取消，请与管家确认' }
          : m.cancel,
      decline:
        m.decline && (admin || m.decline.by === uid)
          ? m.decline
          : m.decline
            ? { ...m.decline, reason: '' }
            : null,
    })),
    notices: state.notices.filter((n) => n.to === uid),
    ledger: state.ledger.filter((e) => admin || e.user === uid),
    runs: admin ? state.runs : [],
    interval: state.interval,
    nextRun: state.nextRun,
    serial: 0,
    message: state.message,
    lastScheduledAt: state.lastScheduledAt,
    serverRevision: state.serverRevision,
    live: true,
  };
}
