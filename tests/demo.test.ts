import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePhone } from '../lib/phone.ts';
import {
  initialState,
  reduce,
  recommendedVenues,
  status,
  refundDue,
  eligible,
  ageBand,
} from '../lib/demo.ts';
const base = Date.parse('2026-09-06T10:00:00+08:00');
test('phone format catches missing, short, long, nonnumeric and invalid-prefix input', () => {
  for (const [value, message] of [
    ['', /请填写/],
    ['1380013800', /11 位.*10 位/],
    ['138001380000', /11 位.*12 位/],
    ['23800138000', /以 1 开头/],
    ['12800138000', /第二位/],
    ['13800138abc', /只能包含数字/],
  ] as const)
    assert.match(validatePhone(value).error, message);
});
test('phone paste accepts country code, formatting and fullwidth digits without truncation', () => {
  for (const raw of [
    '13800138000',
    '+86 138 0013 8000',
    '0086 138-0013-8000',
    '１３８００１３８０００',
  ]) {
    assert.deepEqual(validatePhone(raw), { phone: '13800138000', error: '' });
  }
  assert.notEqual(validatePhone('+86 138001380000').error, '');
});
function pair() {
  let s = initialState(base);
  const m = s.matches[0];
  s = reduce(s, { type: 'accept', id: m.id, slots: m.slots.map((x) => x.id) });
  assert.equal(s.matches[0].deadline, null);
  s = reduce(s, { type: 'role', role: 'xu' });
  s = reduce(s, { type: 'accept', id: m.id, slots: m.slots.map((x) => x.id) });
  return s;
}
function booked() {
  let s = pair();
  s = reduce(s, { type: 'role', role: 'admin' });
  const id = s.matches[0].id;
  const options = recommendedVenues(s.matches[0]);
  s = reduce(s, { type: 'venues', id, venues: options });
  for (const role of ['lin', 'xu']) {
    s = reduce(s, { type: 'role', role });
    s = reduce(s, { type: 'vote', id, options: options.map((v) => v.id) });
  }
  for (const role of ['lin', 'xu']) {
    s = reduce(s, { type: 'role', role });
    s = reduce(s, { type: 'pay', id });
  }
  s = reduce(s, { type: 'role', role: 'admin' });
  for (const user of ['lin', 'xu']) s = reduce(s, { type: 'verify', id, user });
  return s;
}
test('all overlapping days selectable; second acceptance starts fixed three-hour deadline', () => {
  let s = pair();
  assert.equal(s.matches[0].accepted.lin.length, 12);
  assert.equal(s.matches[0].stage, 'arranging');
  const deadline = s.matches[0].deadline;
  assert.equal(deadline, base + 3 * 3600000);
  s = reduce(s, { type: 'role', role: 'admin' });
  s = reduce(s, { type: 'advance', hours: 1 });
  s = reduce(s, {
    type: 'venues',
    id: s.matches[0].id,
    venues: recommendedVenues(s.matches[0]),
  });
  assert.equal(s.matches[0].deadline, deadline);
  assert.match(s.message, /原 3 小时/);
});
test('nonhour venue requires coverage and common choice', () => {
  let s = pair();
  s = reduce(s, { type: 'role', role: 'admin' });
  const options = recommendedVenues(s.matches[0]);
  assert.equal(new Date(options[0].start).getUTCMinutes(), 15);
  s = reduce(s, { type: 'venues', id: 'match-1', venues: options });
  s = reduce(s, { type: 'role', role: 'lin' });
  s = reduce(s, { type: 'vote', id: 'match-1', options: [options[0].id] });
  assert.equal(s.matches[0].stage, 'venue');
  s = reduce(s, { type: 'role', role: 'xu' });
  s = reduce(s, {
    type: 'vote',
    id: 'match-1',
    options: [options[0].id, options[1].id],
  });
  assert.equal(s.matches[0].stage, 'booked');
});
test('same-week acceptance exempts reason and penalty', () => {
  let s = initialState(base);
  s = reduce(s, {
    type: 'accept',
    id: 'match-1',
    slots: s.matches[0].slots.map((x) => x.id),
  });
  assert.equal(eligible(s, s.matches[1]), true);
  s = reduce(s, { type: 'decline', id: 'match-2' });
  assert.equal(s.matches[1].stage, 'declined');
  assert.equal(s.profiles.lin.score, 5);
});
test('full stale invitation fails atomically and refresh hides it', () => {
  let s = reduce(initialState(base), { type: 'scenario', name: 'full' });
  const before = s.matches;
  s = reduce(s, {
    type: 'accept',
    id: 'match-1',
    slots: s.matches[0].slots.map((x) => x.id),
  });
  assert.equal(s.message, '对局已满');
  assert.equal(s.matches, before);
  s = reduce(s, { type: 'refresh' });
  assert.equal(s.matches[0].stale, false);
});
test('confirmation timeout does not deduct reputation', () => {
  let s = pair();
  s = reduce(s, { type: 'advance', hours: 3 });
  assert.equal(s.matches[0].stage, 'expired');
  assert.equal(s.profiles.lin.score, 5);
  assert.equal(s.profiles.xu.score, 5);
});
test('activity end queues refunds automatically; partial refund keeps pending; each user ends independently', () => {
  let s = booked();
  assert.equal(s.matches[0].stage, 'booked');
  assert.equal(s.ledger.length, 2);
  s = reduce(s, { type: 'advance', target: 'end' });
  const m = s.matches[0];
  assert.equal(m.stage, 'refund');
  assert.equal(s.notices.filter((x) => x.title === '押金退款待办').length, 2);
  assert.equal(status(s, m, 'lin'), '押金退款中');
  s = reduce(s, { type: 'check', id: m.id });
  s = reduce(s, { type: 'refund', id: m.id, user: 'lin', amount: 3000 });
  assert.equal(status(s, s.matches[0], 'lin'), '押金退款中');
  s = reduce(s, { type: 'refund', id: m.id, user: 'lin' });
  assert.equal(status(s, s.matches[0], 'lin'), '活动已结束');
  assert.equal(status(s, s.matches[0], 'xu'), '押金退款中');
  s = reduce(s, { type: 'refund', id: m.id, user: 'xu' });
  assert.equal(s.matches[0].stage, 'ended');
  assert.equal(
    s.ledger.reduce((n, x) => n + x.amount, 0),
    12000,
  );
  assert.equal(s.profiles.lin.active, true);
  const count = s.notices.filter((x) => x.title === '押金退款待办').length;
  s = reduce(s, { type: 'refresh' });
  assert.equal(
    s.notices.filter((x) => x.title === '押金退款待办').length,
    count,
  );
});
test('unverified payment still queues task but blocks refund', () => {
  let s = pair();
  s = reduce(s, { type: 'role', role: 'admin' });
  const options = recommendedVenues(s.matches[0]);
  s = reduce(s, { type: 'venues', id: 'match-1', venues: options });
  for (const role of ['lin', 'xu']) {
    s = reduce(s, { type: 'role', role });
    s = reduce(s, {
      type: 'vote',
      id: 'match-1',
      options: options.map((x) => x.id),
    });
  }
  s = reduce(s, { type: 'advance', target: 'end' });
  assert.equal(s.matches[0].refundQueued, true);
  s = reduce(s, { type: 'role', role: 'admin' });
  s = reduce(s, { type: 'refund', id: 'match-1', user: 'lin' });
  assert.equal(s.message, '等待双方付款核实');
  assert.equal(s.ledger.length, 0);
});
test('noncancellable court uses initiator payment, refunds other player, deducts once', () => {
  let s = booked();
  s = reduce(s, { type: 'role', role: 'lin' });
  s = reduce(s, { type: 'cancel', id: 'match-1', reason: '临时有事' });
  s = reduce(s, { type: 'role', role: 'admin' });
  s = reduce(s, { type: 'reviewCancel', id: 'match-1', refundable: false });
  assert.equal(s.profiles.lin.score, 4);
  assert.equal(refundDue(s.matches[0], 'lin'), 0);
  assert.equal(refundDue(s.matches[0], 'xu'), 12000);
  s = reduce(s, { type: 'refund', id: 'match-1', user: 'xu' });
  assert.equal(
    s.ledger.reduce((n, x) => n + x.amount, 0),
    12000,
  );
  s = reduce(s, { type: 'reviewCancel', id: 'match-1' });
  assert.equal(s.profiles.lin.score, 4);
});
test('account isolation and DOB validation', () => {
  let s = initialState(base);
  s = reduce(s, { type: 'role', role: 'new' });
  s = reduce(s, {
    type: 'profile',
    profile: { name: '新球友', birth: '2026-02-31', gender: '女' },
  });
  assert.equal(s.profiles.new.registered, false);
  s = reduce(s, {
    type: 'profile',
    profile: { name: '新球友', birth: '2000-09-09', gender: '女' },
  });
  assert.equal(s.profiles.new.registered, true);
  assert.equal(s.profiles.lin.name, '林小满');
  assert.equal(ageBand('2000-09-09', base), '25–29 岁');
  s = reduce(s, { type: 'verify', id: 'match-1', user: 'lin' });
  assert.equal(s.message, '请切换到同好管家处理');
});
test('nonoverlapping choices keep both accepts and a fixed deadline while rescheduling', () => {
  let s = initialState(base);
  const m = s.matches[0];
  s = reduce(s, {
    type: 'accept',
    id: m.id,
    slots: m.slots.slice(0, 2).map((x) => x.id),
  });
  s = reduce(s, { type: 'role', role: 'xu' });
  s = reduce(s, {
    type: 'accept',
    id: m.id,
    slots: m.slots.slice(6, 8).map((x) => x.id),
  });
  assert.equal(s.matches[0].deadline, base + 3 * 3600000);
  assert.equal(s.matches[0].accepted.xu.length, 2);
  s = reduce(s, { type: 'advance', hours: 1 });
  s = reduce(s, { type: 'accept', id: m.id, slots: m.slots.map((x) => x.id) });
  assert.equal(s.matches[0].deadline, base + 3 * 3600000);
  assert.ok(recommendedVenues(s.matches[0]).length > 0);
});
test('refund stage cannot be cancelled, including after a partial refund', () => {
  let s = booked();
  s = reduce(s, { type: 'advance', target: 'end' });
  s = reduce(s, { type: 'check', id: 'match-1' });
  s = reduce(s, { type: 'refund', id: 'match-1', user: 'lin', amount: 3000 });
  s = reduce(s, { type: 'role', role: 'lin' });
  s = reduce(s, { type: 'cancel', id: 'match-1', reason: '临时取消' });
  assert.equal(s.matches[0].cancel, null);
  assert.match(s.message, /不可申请取消/);
});
test('same activity week survives acceptance calendar boundary and excludes cancelled games', () => {
  let s = initialState(base);
  s = reduce(s, {
    type: 'accept',
    id: 'match-1',
    slots: s.matches[0].slots.map((x) => x.id),
  });
  s = { ...s, now: base + 15 * 3600000 };
  assert.equal(eligible(s, s.matches[1]), true);
  s.matches[0].stage = 'cancelled';
  assert.equal(eligible(s, s.matches[1]), false);
});
test('scheduled matching deduplicates old resources but finds another sport for an active pair', () => {
  let s = initialState(base);
  s.profiles.lin.sports = ['羽毛球', '网球'];
  s.profiles.xu.sports = ['羽毛球', '网球'];
  s = reduce(s, { type: 'run' });
  assert.equal(
    s.matches.filter(
      (m) =>
        m.members.includes('lin') &&
        m.members.includes('xu') &&
        m.sport === '网球',
    ).length,
    1,
  );
  const count = s.matches.length;
  s = reduce(s, { type: 'run' });
  assert.equal(s.matches.length, count);
});
test('odd-cent fees and deposits sum exactly to the court fee', () => {
  const s = booked();
  const m = s.matches[0];
  m.booking!.price = 12001;
  assert.equal(refundDue(m, 'lin') + refundDue(m, 'xu'), 12001);
});
