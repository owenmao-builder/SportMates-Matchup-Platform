import test from 'node:test';
import assert from 'node:assert/strict';
import { nearLocations, validateLocations } from '../lib/locations.ts';

const p = { areas: ['徐家汇'], radius: 1 };
const point = (latitude: number, longitude: number) => [
  { address: '测试场馆', latitude, longitude, accuracy: 20 },
];
test('precise points override shared coarse areas, while nearby points can cross area labels', () => {
  assert.equal(
    nearLocations(
      { ...p, locations: point(31.2, 121.4) },
      { ...p, locations: point(31.3, 121.6) },
    ),
    false,
  );
  assert.equal(
    nearLocations(
      { ...p, locations: point(31.2, 121.4) },
      { ...p, areas: ['五角场'], locations: point(31.201, 121.401) },
    ),
    true,
  );
});
test('one precise profile uses the other profile’s area center and cannot bypass distance', () => {
  assert.equal(
    nearLocations({ ...p, locations: point(31.4, 121.8) }, p),
    false,
  );
  assert.equal(
    nearLocations({ ...p, locations: point(31.1955, 121.4367) }, p),
    true,
  );
  assert.equal(nearLocations(p, p), true);
});
test('multiple precise locations work without coarse areas, and deleting them restores area matching', () => {
  assert.equal(
    nearLocations(
      {
        ...p,
        areas: [],
        locations: [...point(31.4, 121.8), ...point(31.1955, 121.4367)],
      },
      p,
    ),
    true,
  );
  assert.equal(nearLocations({ ...p, locations: [] }, p), true);
});
test('unlocated text never fabricates distances and only agrees exactly without area data', () => {
  const text = (address: string) => ({
    ...p,
    areas: [],
    locations: [{ address }],
  });
  assert.equal(
    nearLocations(text('测试市 测试路１号'), text('测试市测试路1号')),
    true,
  );
  assert.equal(
    nearLocations(text('测试市测试路1号'), text('测试市测试路2号')),
    false,
  );
});
test('clearing a GPS point cannot match another person through the generated current-location label', () => {
  const located = {
    ...p,
    areas: [],
    locations: [{ ...point(31.2, 121.4)[0], address: '我的当前位置' }],
  };
  const cleared = { ...p, areas: [], locations: [{ address: '我的当前位置' }] };
  assert.equal(nearLocations(located, cleared), false);
  assert.equal(nearLocations(cleared, cleared), false);
});
test('location validation rejects incomplete and out-of-range coordinates and strips unknown fields', () => {
  for (const value of [
    null,
    {},
    Array(6).fill({ address: '测试' }),
    [{ address: '' }],
    [{ address: 'a'.repeat(161) }],
    [{ address: '测试', latitude: 31 }],
    [{ address: '测试', longitude: 121 }],
    [{ address: '测试', latitude: '31', longitude: 121 }],
    [{ address: '测试', latitude: null, longitude: 121 }],
    point(NaN, 121),
    point(Infinity, 121),
    point(91, 121),
    point(31, -181),
    [{ ...point(31, 121)[0], accuracy: -1 }],
    [{ address: '测试', accuracy: 1 }],
  ])
    assert.throws(() => validateLocations(value));
  assert.deepEqual(
    validateLocations([
      { address: ' 测试场馆 ', admin: true, secret: 'ignore' },
    ]),
    [{ address: '测试场馆' }],
  );
});
