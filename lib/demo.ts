import {
  nearLocations,
  validateLocations,
  type PreferredLocation,
} from './locations.ts';
export const ROLES: readonly string[] = [
  'lin',
  'xu',
  'zhou',
  'chen',
  'admin',
  'new',
];
export type Role = string;
export const SPORTS = ['羽毛球', '网球', '匹克球', '乒乓球', '篮球', '排球'];
export const LEVELS = ['刚刚入门', '轻松参与', '认真进阶'];
export type Profile = {
  id: Role;
  name: string;
  gender: string;
  birth: string;
  ageRange?: string;
  intro: string;
  score: number;
  avatar: string;
  registered: boolean;
  sports: string[];
  level: number;
  gap: number;
  sportPrefs?: Record<string, { level: number; gap: number }>;
  areas: string[];
  locations?: PreferredLocation[];
  radius: number;
  active: boolean;
  days: number[];
  specific: string;
  excluded: string;
  start: string;
  end: string;
};
export type Slot = { id: string; start: number; end: number };
export type Venue = {
  id: string;
  name: string;
  start: number;
  end: number;
  price: number;
};
export type Payment = {
  proof?: string;
  submittedAt?: number;
  verifiedAt?: number;
  verifiedBy?: string;
  reference?: string;
  submitted: boolean;
  verified: boolean;
  paid: number;
  refunded: number;
};
export type Match = {
  id: string;
  members: Role[];
  sport: string;
  slots: Slot[];
  accepted: Record<string, string[]>;
  acceptedAt: Record<string, number>;
  created: number;
  deadline: number | null;
  stage:
    | 'invite'
    | 'arranging'
    | 'venue'
    | 'booked'
    | 'refund'
    | 'ended'
    | 'declined'
    | 'expired'
    | 'cancelled'
    | 'full';
  options: Venue[];
  votes: Record<string, string[]>;
  booking: Venue | null;
  payments: Record<string, Payment>;
  checked: boolean;
  refundQueued: boolean;
  cancel: {
    by: Role;
    reason: string;
    reviewed: boolean;
    refundable: boolean;
  } | null;
  decline: { by: Role; reason: string; reviewed: boolean } | null;
  stale: boolean;
};
export type Notice = {
  id: string;
  to: Role;
  title: string;
  text: string;
  at: number;
  read: boolean;
};
export type Entry = {
  actor?: string;
  reference?: string;
  requestKey?: string;
  requestHash?: string;
  id: string;
  match: string;
  user: Role;
  kind: string;
  amount: number;
  at: number;
};
export type State = {
  live?: boolean;
  serverRevision?: number;
  lastScheduledAt?: number;
  version: 3;
  now: number;
  role: Role;
  profiles: Record<Role, Profile>;
  matches: Match[];
  notices: Notice[];
  ledger: Entry[];
  runs: { at: number; count: number }[];
  interval: number;
  nextRun: number;
  serial: number;
  message: string;
};
export type Action = { type: string; [key: string]: any };
const HOUR = 3600000,
  DAY = 24 * HOUR;
export const dateLabel = (n: number) =>
  new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(n);
export const timeLabel = (n: number) =>
  new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(n);
export const money = (n: number) => (n / 100).toFixed(2);
export const ageBand = (birth: string, now: number) => {
  const b = new Date(birth),
    d = new Date(now);
  let age = d.getFullYear() - b.getFullYear();
  if (
    d.getMonth() < b.getMonth() ||
    (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())
  )
    age--;
  return age < 18
    ? '18 岁以下'
    : age < 25
      ? '18–24 岁'
      : age < 30
        ? '25–29 岁'
        : age < 35
          ? '30–34 岁'
          : age < 40
            ? '35–39 岁'
            : age < 50
              ? '40–49 岁'
              : '50 岁及以上';
};
function week(n: number) {
  const d = new Date(n + 8 * HOUR);
  const day = d.getUTCDay() || 7;
  return Math.floor(
    (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) -
      (day - 1) * DAY) /
      DAY,
  );
}
function nextTuesday(now: number) {
  const d = new Date(now + 8 * HOUR);
  const day = d.getUTCDay() || 7;
  return Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + 9 - day,
    6,
  );
}
function slotsAt(now: number) {
  const base = nextTuesday(now);
  return [0, 2].flatMap((day) =>
    Array.from({ length: 6 }, (_, i) => {
      const start = base + day * DAY + (i * HOUR) / 2;
      return { id: String(start), start, end: start + HOUR / 2 };
    }),
  );
}
const payment = (): Payment => ({
  submitted: false,
  verified: false,
  paid: 0,
  refunded: 0,
});
function makeMatch(
  id: string,
  a: Role,
  b: Role,
  slots: Slot[],
  now: number,
  sport = '羽毛球',
): Match {
  return {
    id,
    members: [a, b],
    sport,
    slots,
    accepted: {},
    acceptedAt: {},
    created: now,
    deadline: null,
    stage: 'invite',
    options: [],
    votes: {},
    booking: null,
    payments: { [a]: payment(), [b]: payment() },
    checked: false,
    refundQueued: false,
    cancel: null,
    decline: null,
    stale: false,
  };
}
export function initialState(now = Date.now()): State {
  const names = ['林小满', '许同学', '周子安', '陈一', '同好管家', '全新用户'];
  const profiles = Object.fromEntries(
    ROLES.map((id, i) => [
      id,
      {
        id,
        name: names[i],
        gender: i % 2 === 0 ? '女' : '男',
        birth: i === 5 ? '' : '1998-06-12',
        intro: i === 5 ? '' : '喜欢轻松的球局，也期待认识步调相近的球友。',
        score: 5,
        avatar: i % 2 ? 'ink' : 'clay',
        registered: id !== 'new',
        sports: ['羽毛球'],
        level: 1,
        gap: 1,
        areas: ['徐家汇', '静安寺'],
        radius: 5,
        active: id !== 'new' && id !== 'admin',
        days: [2, 4],
        specific: '',
        excluded: '',
        start: '14:00',
        end: '17:00',
      },
    ]),
  ) as Record<Role, Profile>;
  return {
    version: 3,
    now,
    role: 'lin',
    profiles,
    matches: ['xu', 'zhou', 'chen'].map((r, i) =>
      makeMatch('match-' + (i + 1), 'lin', r as Role, slotsAt(now), now),
    ),
    notices: [
      {
        id: 'welcome',
        to: 'lin',
        title: '有 3 位球友与你时间相合',
        text: '左右切换邀约，把方便的时间都选上吧。',
        at: now,
        read: false,
      },
    ],
    ledger: [],
    runs: [{ at: now, count: 3 }],
    interval: 120,
    nextRun: now + 2 * HOUR,
    serial: 10,
    message: '',
  };
}
function notify(s: State, to: Role, title: string, text: string) {
  s.notices.unshift({
    id: 'notice-' + s.serial++,
    to,
    title,
    text,
    at: s.now,
    read: false,
  });
}
function entry(s: State, m: Match, user: Role, kind: string, amount: number) {
  s.ledger.unshift({
    id: 'entry-' + s.serial++,
    match: m.id,
    user,
    kind,
    amount,
    at: s.now,
  });
}
function requireAdmin(s: State) {
  if (s.role !== 'admin') throw Error('请切换到同好管家处理');
}
function participant(s: State, m: Match) {
  if (!m.members.includes(s.role)) throw Error('请切换到这场活动的球友账号');
}
export function eligible(s: State, m: Match, role = s.role) {
  return s.matches.some(
    (x) =>
      x.id !== m.id &&
      x.acceptedAt[role] &&
      week(x.slots[0]?.start || x.created) ===
        week(m.slots[0]?.start || m.created) &&
      !['declined', 'expired', 'full', 'cancelled'].includes(x.stage) &&
      (!x.deadline ||
        !['arranging', 'venue'].includes(x.stage) ||
        x.deadline > s.now),
  );
}
export function commonSlots(m: Match) {
  return m.slots.filter((x) =>
    m.members.every((u) => m.accepted[u]?.includes(x.id)),
  );
}
export function continuous(slots: Slot[]) {
  return slots.some((a) => slots.some((b) => b.start === a.end));
}
function covers(m: Match, start: number, end: number) {
  const slots = commonSlots(m);
  let cursor = start;
  for (const t of slots.sort((a, b) => a.start - b.start)) {
    if (t.start <= cursor && t.end > cursor) cursor = t.end;
  }
  return cursor >= end;
}
export function recommendedVenues(m: Match): Venue[] {
  const c = commonSlots(m);
  const result: Venue[] = [];
  for (const t of c) {
    for (const offset of [15, 0]) {
      const start = t.start + offset * 60000,
        end = start + HOUR;
      if (covers(m, start, end))
        result.push({
          id: `venue-${start}`,
          name: '徐家汇运动中心 · 3 号场',
          start,
          end,
          price: 12000,
        });
    }
    if (result.length >= 4) break;
  }
  return result.slice(0, 4);
}
function occupied(s: State, slot: Slot, users: Role[], except = '') {
  return s.matches.some(
    (m) =>
      m.id !== except &&
      m.booking &&
      !['cancelled', 'full', 'declined', 'expired'].includes(m.stage) &&
      m.members.some((x) => users.includes(x)) &&
      slot.start < m.booking.end &&
      slot.end > m.booking.start,
  );
}
function available(s: State, m: Match) {
  return m.slots.filter(
    (t) => t.start > s.now && !occupied(s, t, m.members, m.id),
  );
}
export function status(s: State, m: Match, role = s.role) {
  if (m.cancel && !m.cancel.reviewed) return '取消审核中';
  if (m.stage === 'refund' || m.stage === 'ended') {
    const p = m.payments[role];
    return p && p.refunded >= refundDue(m, role) && m.checked
      ? '活动已结束'
      : '押金退款中';
  }
  return {
    invite: m.accepted[role] ? '等待其他球友同意' : '待回应邀约',
    arranging: '管家安排场地中',
    venue: '待最后确认',
    booked: '已约好',
    declined: '邀约已婉拒',
    expired: '确认已超时',
    cancelled: '活动已取消',
    full: '对局已满',
  }[m.stage];
}
export function feeShare(m: Match, user: Role) {
  return m.members[0] === user
    ? Math.ceil((m.booking?.price || 0) / 2)
    : Math.floor((m.booking?.price || 0) / 2);
}
export function refundDue(m: Match, user: Role) {
  const p = m.payments[user];
  if (!p) return 0;
  if (m.stage === 'cancelled') {
    if (!m.cancel?.refundable)
      return user === m.cancel?.by
        ? Math.max(0, p.paid - (m.booking?.price || 0))
        : p.paid;
    return p.paid;
  }
  return (m.booking?.price || 0) - feeShare(m, user);
}
export function refundBlock(m: Match) {
  if (m.cancel && !m.cancel.reviewed) return '取消申请待审核';
  if (
    !m.members.every(
      (u) =>
        m.payments[u]?.verified ||
        (m.stage === 'cancelled' && !m.payments[u]?.submitted),
    )
  )
    return '等待双方付款核实';
  if (!m.checked) return '等待管家核实活动完成';
  return '';
}
function run(s: State) {
  let count = 0;
  const users = Object.keys(s.profiles).filter(
    (u) => s.profiles[u].registered && s.profiles[u].active && u !== 'admin',
  );
  for (let i = 0; i < users.length; i++)
    for (let j = i + 1; j < users.length; j++) {
      const a = users[i],
        b = users[j],
        p = s.profiles[a],
        q = s.profiles[b];
      if (
        !(s.live || p.locations?.length || q.locations?.length
          ? nearLocations(p, q)
          : p.areas.some((x) => q.areas.includes(x)))
      )
        continue;
      for (const sport of p.sports.filter((x) => q.sports.includes(x))) {
        const pa = p.sportPrefs?.[sport] || p,
          qa = q.sportPrefs?.[sport] || q;
        if (Math.abs(pa.level - qa.level) > Math.min(pa.gap, qa.gap)) continue;
        const base = s.live
          ? Math.floor((s.now + 8 * HOUR) / DAY) * DAY - 8 * HOUR
          : slotsAt(s.now)[0].start;
        let slots: Slot[] = [];
        for (let day = 0; day < (s.live ? 14 : 7); day++) {
          const local = new Date(base + day * DAY + 8 * HOUR);
          const weekday = local.getUTCDay();
          const date = local.toISOString().slice(0, 10);
          if (
            [p, q].some(
              (x) =>
                (!x.days.includes(weekday) &&
                  !x.specific.split(',').includes(date)) ||
                x.excluded.split(',').includes(date),
            )
          )
            continue;
          const minutes = (v: string) =>
            Number(v.split(':')[0]) * 60 + Number(v.split(':')[1]);
          const from = Math.max(minutes(p.start), minutes(q.start)),
            to = Math.min(minutes(p.end), minutes(q.end));
          const midnight =
            Date.UTC(
              local.getUTCFullYear(),
              local.getUTCMonth(),
              local.getUTCDate(),
            ) -
            8 * HOUR;
          for (let t = from; t + 30 <= to; t += 30) {
            const n = midnight + t * 60000;
            slots.push({ id: String(n), start: n, end: n + HOUR / 2 });
          }
        }
        const previous = s.matches.filter(
          (m) =>
            m.sport === sport && m.members.includes(a) && m.members.includes(b),
        );
        const seen = new Set(previous.flatMap((m) => m.slots.map((t) => t.id)));
        slots = slots.filter(
          (t) =>
            t.start > s.now + (s.live ? 72 * HOUR : 0) &&
            !seen.has(t.id) &&
            !occupied(s, t, [a, b]),
        );
        if (!continuous(slots)) continue;
        const groups = s.live
          ? [...new Set(slots.map((t) => week(t.start)))].map((w) =>
              slots.filter((t) => week(t.start) === w),
            )
          : [slots];
        for (const group of groups) {
          if (!continuous(group)) continue;
          const m = makeMatch('match-' + s.serial++, a, b, group, s.now, sport);
          s.matches.push(m);
          count++;
          for (const u of m.members)
            notify(
              s,
              u,
              '发现新的运动邀约',
              `${s.profiles[u === a ? b : a].name}与你的时间和偏好相合。`,
            );
        }
      }
    }
  s.runs.unshift({ at: s.now, count });
  s.nextRun = s.now + s.interval * 60000;
  return count;
}
function tick(s: State) {
  for (const m of s.matches) {
    if (
      ['arranging', 'venue'].includes(m.stage) &&
      m.deadline !== null &&
      s.now >= m.deadline
    ) {
      m.stage = 'expired';
      for (const u of m.members)
        notify(
          s,
          u,
          '最后确认已超时',
          '本次邀约结束，不自动扣分；持续匹配继续。',
        );
    }
    if (s.live && m.stage === 'invite' && !continuous(available(s, m)))
      m.stage = 'full';
    if (m.stage === 'invite' && s.now >= m.created + DAY) {
      m.stage = 'expired';
      for (const u of m.members.filter((u) => !m.accepted[u]))
        s.profiles[u].score = Math.max(0, s.profiles[u].score - 1);
    }
    if (m.stage === 'booked' && m.booking && s.now >= m.booking.end) {
      m.stage = 'refund';
      if (!m.refundQueued) {
        m.refundQueued = true;
        for (const u of m.members) {
          notify(
            s,
            u,
            '押金退款中',
            '活动时间已结束，系统已创建退款待办，无需申请。',
          );
          notify(
            s,
            'admin',
            '押金退款待办',
            `${s.profiles[u].name} · ${m.sport} · 待核实活动与付款`,
          );
        }
      }
    }
  }
  if (s.now >= s.nextRun) run(s);
}
export function reduce(state: State, action: Action): State {
  const s = structuredClone(state);
  s.message = '';
  try {
    const a = action;
    const m = s.matches.find((x) => x.id === a.id);
    switch (a.type) {
      case 'role':
        if (!ROLES.includes(a.role)) throw Error('账号不存在');
        s.role = a.role;
        break;
      case 'profile': {
        const p = { ...s.profiles[s.role], ...a.profile, id: s.role };
        if (s.role === 'admin') throw Error('管家没有球友资料');
        if (
          !p.name.trim() ||
          !['男', '女'].includes(p.gender) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(p.birth) ||
          Number.isNaN(Date.parse(p.birth)) ||
          Date.parse(p.birth) > s.now
        )
          throw Error('请填写昵称、性别和真实出生日期');
        if (new Date(p.birth).toISOString().slice(0, 10) !== p.birth)
          throw Error('出生日期无效');
        p.registered = true;
        s.profiles[s.role] = p;
        s.message = '资料已保存，生日仅本人可见';
        break;
      }
      case 'preferences': {
        const p = { ...s.profiles[s.role], ...a.preferences };
        p.locations = validateLocations(p.locations || []);
        if (!p.registered) throw Error('请先完成自我介绍和基本资料');
        if (
          !p.sports.length ||
          (!p.areas.length && !p.locations.length) ||
          (!p.days.length && !p.specific) ||
          p.start >= p.end
        )
          throw Error('请至少选择一项运动、一个区域和有效空闲时间');
        s.profiles[s.role] = p;
        run(s);
        s.message = p.active
          ? '兴趣与空闲已发布，持续匹配已开启'
          : '偏好已保存，匹配已暂停';
        break;
      }
      case 'toggle':
        s.profiles[s.role].active = !s.profiles[s.role].active;
        s.message = s.profiles[s.role].active
          ? '持续匹配已恢复'
          : '持续匹配已暂停';
        break;
      case 'interval':
        requireAdmin(s);
        if (![60, 120].includes(a.minutes))
          throw Error('匹配间隔只能为一或两小时');
        s.interval = a.minutes;
        s.nextRun = s.now + a.minutes * 60000;
        s.message = '后台匹配频率已更新';
        break;
      case 'run': {
        const count = run(s);
        s.message = `本轮匹配完成，新增 ${count} 个邀约；已有活动不影响持续匹配`;
        break;
      }
      case 'refresh':
        tick(s);
        for (const x of s.matches) {
          x.stale = false;
          if (x.stage === 'invite' && !continuous(available(s, x)))
            x.stage = 'full';
        }
        s.message = '预约列表已刷新，已约满的邀约已移除';
        break;
      case 'accept': {
        if (!m) throw Error('邀约不存在');
        participant(s, m);
        if (m.stage === 'full') throw Error('对局已满');
        if (!['invite', 'arranging', 'venue'].includes(m.stage))
          throw Error('邀约状态已变更，请刷新');
        if (m.deadline && s.now >= m.deadline) throw Error('最后确认已超时');
        const avail = available(s, m);
        if (!continuous(avail)) throw Error('对局已满');
        const ids = [...new Set<string>(a.slots || [])];
        if (ids.some((id) => !avail.some((t) => t.id === id)))
          throw Error('部分时间已被约走，请刷新后重选');
        if (!continuous(avail.filter((t) => ids.includes(t.id))))
          throw Error('请至少选择连续 1 小时，可以多选不同日期');
        m.accepted[s.role] = ids;
        m.acceptedAt[s.role] ??= s.now;
        if (m.members.every((u) => m.accepted[u])) {
          m.deadline ??= s.now + 3 * HOUR;
          m.stage = 'arranging';
          m.options = [];
          m.votes = {};
          for (const u of m.members)
            notify(
              s,
              u,
              '双方已同意，最后确认开始',
              '请在 3 小时内完成场地最后确认。',
            );
          notify(
            s,
            'admin',
            '新订场待办',
            '双方已同意，请在共同时间内提供场地方案。',
          );
        }
        s.message =
          m.stage === 'arranging'
            ? continuous(commonSlots(m))
              ? '双方已同意，请在固定 3 小时内完成最后确认'
              : '双方已同意，3 小时已开始；请增加重合时间，倒计时不重置'
            : '已同意，等待其他球友回应';
        break;
      }
      case 'decline': {
        if (!m) throw Error('邀约不存在');
        participant(s, m);
        if (m.stage !== 'invite') throw Error('邀约已进入后续流程');
        const exempt = eligible(s, m);
        if (!exempt && (!a.reason || a.reason.trim().length < 2))
          throw Error('本周尚未同意其他邀约，请填写婉拒原因');
        m.stage = 'declined';
        m.decline = {
          by: s.role,
          reason: exempt ? '本周已同意其他邀约，免填原因' : a.reason,
          reviewed: exempt,
        };
        if (!exempt) notify(s, 'admin', '婉拒理由待审核', a.reason);
        s.message = exempt
          ? '已婉拒，本周无需填写原因，不扣信誉分'
          : '婉拒原因已提交管家';
        break;
      }
      case 'venues': {
        requireAdmin(s);
        if (!m || !['arranging', 'venue'].includes(m.stage))
          throw Error('当前无法安排场地');
        if (!a.venues?.length) throw Error('请至少提供一个场地方案');
        for (const v of a.venues) {
          if (
            !v.name.trim() ||
            v.end - v.start < HOUR ||
            v.price <= 0 ||
            !Number.isInteger(v.price) ||
            !covers(m, v.start, v.end)
          )
            throw Error(
              '场地须至少 1 小时，完整处于双方共同空闲内，费用需有效',
            );
        }
        m.options = a.venues;
        m.votes = {};
        m.stage = 'venue';
        s.message = '场地方案已发布，原 3 小时截止时间保持不变';
        for (const u of m.members)
          notify(
            s,
            u,
            '请最后确认场地',
            '可以多选方案；双方选择相同场次后自动约好。',
          );
        break;
      }
      case 'vote': {
        if (!m) throw Error('活动不存在');
        participant(s, m);
        if (m.stage !== 'venue') throw Error('当前无法确认场地');
        if (
          !a.options?.length ||
          a.options.some((id: string) => !m.options.some((o) => o.id === id))
        )
          throw Error('请选择有效场地方案');
        m.votes[s.role] = a.options;
        const v = m.options.find((o) =>
          m.members.every((u) => m.votes[u]?.includes(o.id)),
        );
        if (v) {
          if (occupied(s, v, m.members, m.id)) throw Error('对局已满');
          m.booking = v;
          m.stage = 'booked';
          for (const u of m.members)
            notify(
              s,
              u,
              '场地已确认',
              `${dateLabel(v.start)} ${timeLabel(v.start)}–${timeLabel(v.end)}，请完成费用登记。`,
            );
          s.message = '双方选中了同一场地，已经约好';
        } else s.message = '已提交场地选择，等待其他球友';
        break;
      }
      case 'pay': {
        if (!m || !m.booking) throw Error('还未确认场地');
        participant(s, m);
        if (!['booked', 'refund'].includes(m.stage))
          throw Error('当前不可登记缴费');
        const p = m.payments[s.role];
        if (p.submitted) throw Error('付款已登记，请勿重复操作');
        p.submitted = true;
        s.message = '模拟付款已登记，等待管家核实';
        notify(
          s,
          'admin',
          '付款核实待办',
          `${s.profiles[s.role].name} 已登记 ¥${money(m.booking.price)}`,
        );
        break;
      }
      case 'verify': {
        requireAdmin(s);
        if (!m || !m.booking || !m.members.includes(a.user))
          throw Error('付款不存在');
        const p = m.payments[a.user];
        if (!p.submitted) throw Error('球友尚未登记付款');
        if (p.verified) throw Error('已核实，无需重复');
        p.verified = true;
        p.paid = m.booking.price;
        entry(s, m, a.user, '收款', p.paid);
        s.message = '模拟收款已核实并记入流水';
        break;
      }
      case 'advance': {
        if (a.target === 'end') {
          const end = s.matches
            .filter((x) => x.stage === 'booked' && x.booking)
            .sort((a, b) => a.booking!.end - b.booking!.end)[0]?.booking?.end;
          if (!end) throw Error('请先确认一场场地，或载入退款场景');
          s.now = Math.max(s.now, end + 1000);
        } else s.now += Number(a.hours || 2) * HOUR;
        tick(s);
        s.message = a.silent
          ? ''
          : a.target === 'end'
            ? '活动到点：系统自动更新退款中，并给管家创建待办'
            : '演示时间已快进，系统状态已同步';
        break;
      }
      case 'check': {
        requireAdmin(s);
        if (!m || !['refund', 'ended'].includes(m.stage))
          throw Error('活动尚未结束');
        if (!m.members.every((u) => m.payments[u].verified))
          throw Error('请先核实双方付款');
        if (m.checked) throw Error('已核实');
        m.checked = true;
        for (const u of m.members) {
          const completed = s.matches.filter(
            (x) =>
              x.checked && x.members.includes(u) && x.stage !== 'cancelled',
          ).length;
          if (completed % 2 === 0)
            s.profiles[u].score = Math.min(5, s.profiles[u].score + 1);
        }
        s.message = '活动完成已核实，现在可以登记押金退款';
        break;
      }
      case 'refund': {
        requireAdmin(s);
        if (
          !m ||
          !['refund', 'ended', 'cancelled'].includes(m.stage) ||
          !m.members.includes(a.user)
        )
          throw Error('退款待办不存在');
        const blocked = refundBlock(m);
        if (blocked) throw Error(blocked);
        const p = m.payments[a.user];
        const remain = refundDue(m, a.user) - p.refunded;
        const amount =
          a.amount === 'half'
            ? Math.ceil(remain / 2)
            : Number(a.amount || remain);
        if (!Number.isInteger(amount) || amount <= 0 || amount > remain)
          throw Error('退款金额须大于零且不超过待退金额');
        p.refunded += amount;
        entry(s, m, a.user, '退款', -amount);
        if (
          m.stage !== 'cancelled' &&
          m.members.every((u) => m.payments[u].refunded >= refundDue(m, u))
        )
          m.stage = 'ended';
        notify(
          s,
          a.user,
          p.refunded >= refundDue(m, a.user) ? '活动已结束' : '押金部分退款',
          `管家已登记模拟退款 ¥${money(amount)}`,
        );
        s.message = '退款已登记，球友的活动状态已同步';
        break;
      }
      case 'cancel': {
        if (!m || m.stage !== 'booked' || !m.booking || s.now >= m.booking.end)
          throw Error('活动结束或退款开始后不可申请取消');
        participant(s, m);
        if (m.cancel) throw Error('取消申请已提交');
        if (!a.reason || a.reason.trim().length < 2)
          throw Error('请说明临时取消原因');
        m.cancel = {
          by: s.role,
          reason: a.reason,
          reviewed: false,
          refundable: false,
        };
        notify(s, 'admin', '活动取消待审核', a.reason);
        s.message = '取消申请已提交，请尽快与管家沟通';
        break;
      }
      case 'reviewCancel': {
        requireAdmin(s);
        if (!m?.cancel || m.cancel.reviewed) throw Error('没有待审核取消');
        if (m.members.some((u) => m.payments[u].refunded > 0))
          throw Error('已退款的活动不可更改取消结算');
        if (
          !(s.live
            ? m.members.every(
                (u) => !m.payments[u].submitted || m.payments[u].verified,
              )
            : m.members.every((u) => m.payments[u].verified))
        )
          throw Error('请先核实双方付款，再按实收结算');
        m.cancel.reviewed = true;
        m.cancel.refundable = !!a.refundable;
        m.checked = true;
        m.stage = 'cancelled';
        s.profiles[m.cancel.by].score = Math.max(
          0,
          s.profiles[m.cancel.by].score - 1,
        );
        for (const u of m.members)
          notify(
            s,
            u,
            '活动取消已处理',
            a.refundable
              ? '场地可取消，本演示场景全额退回实收款；取消方信誉减 1。'
              : '场地无法取消，发起取消方承担全部场地费，信誉减 1；按实收金额结算。',
          );
        s.message = '已审核取消，信誉和费用责任已更新';
        break;
      }
      case 'supplement': {
        requireAdmin(s);
        if (
          !m?.booking ||
          m.stage !== 'cancelled' ||
          m.cancel?.refundable ||
          m.cancel?.by !== a.user
        )
          throw Error('没有待补缴费用');
        const p = m.payments[a.user],
          remaining = Math.max(0, m.booking.price - p.paid);
        if (
          !Number.isSafeInteger(a.amount) ||
          a.amount <= 0 ||
          a.amount > remaining
        )
          throw Error('补缴金额超过应承担费用');
        p.paid += a.amount;
        p.submitted = true;
        p.verified = true;
        entry(s, m, a.user, '补缴', a.amount);
        s.message = '补缴实收已登记';
        break;
      }
      case 'reviewDecline': {
        requireAdmin(s);
        if (!m?.decline || m.decline.reviewed) throw Error('没有待审核理由');
        m.decline.reviewed = true;
        if (a.penalty)
          s.profiles[m.decline.by].score = Math.max(
            0,
            s.profiles[m.decline.by].score - 1,
          );
        s.message = a.penalty
          ? '已审核，理由不成立扣 1 分'
          : '理由成立，不扣分';
        break;
      }
      case 'read':
        for (const n of s.notices) if (n.to === s.role) n.read = true;
        break;
      case 'scenario': {
        const fresh = initialState(state.now);
        fresh.role = state.role === 'admin' ? 'admin' : 'lin';
        const x = fresh.matches[0];
        if (a.name === 'full') {
          x.stage = 'full';
          x.stale = true;
          fresh.role = 'lin';
          fresh.message =
            '保留了一张旧邀约：点击同意可查看“对局已满”，刷新后将移除。';
        } else {
          x.accepted = {
            lin: x.slots.map((t) => t.id),
            xu: x.slots.map((t) => t.id),
          };
          x.acceptedAt = { lin: fresh.now, xu: fresh.now };
          x.deadline = fresh.now + 3 * HOUR;
          x.stage = 'arranging';
          if (a.name !== 'timeout') {
            x.options = recommendedVenues(x);
            x.booking = x.options[0];
            x.stage = 'booked';
            for (const u of x.members) {
              x.payments[u] = {
                submitted: true,
                verified: true,
                paid: 12000,
                refunded: 0,
              };
              entry(fresh, x, u, '收款', 12000);
            }
            fresh.message = '已载入双方已付款场景，可快进到结束或申请取消。';
          } else fresh.message = '双方刚刚同意，可快进 3 小时查看超时规则。';
        }
        return fresh;
      }
      default:
        throw Error('未知操作');
    }
    return s;
  } catch (error) {
    return {
      ...state,
      message: error instanceof Error ? error.message : '操作未完成',
    };
  }
}
