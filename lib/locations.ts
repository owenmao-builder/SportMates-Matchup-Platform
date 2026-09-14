export type PreferredLocation = {
  address: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
};

export function hasCoordinates(
  location: PreferredLocation,
): location is PreferredLocation & {
  latitude: number;
  longitude: number;
} {
  return (
    typeof location.latitude === 'number' &&
    Number.isFinite(location.latitude) &&
    Math.abs(location.latitude) <= 90 &&
    typeof location.longitude === 'number' &&
    Number.isFinite(location.longitude) &&
    Math.abs(location.longitude) <= 180
  );
}

export function validateLocations(value: unknown): PreferredLocation[] {
  if (!Array.isArray(value) || value.length > 5)
    throw Error('详细地点最多填写 5 个');
  return value.map((item) => {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof item.address !== 'string' ||
      !item.address.trim() ||
      item.address.length > 160
    ) {
      throw Error('请填写详细地址或场馆名称，最多 160 字');
    }
    const location: PreferredLocation = { address: item.address.trim() };
    const hasPoint =
      item.latitude !== undefined || item.longitude !== undefined;
    if (hasPoint) {
      if (!hasCoordinates(item)) throw Error('定位坐标无效，请重新定位');
      location.latitude = item.latitude;
      location.longitude = item.longitude;
    }
    if (item.accuracy !== undefined) {
      if (
        !hasPoint ||
        typeof item.accuracy !== 'number' ||
        !Number.isFinite(item.accuracy) ||
        item.accuracy < 0 ||
        item.accuracy > 100000
      )
        throw Error('定位精度无效，请重新定位');
      location.accuracy = item.accuracy;
    }
    return location;
  });
}

// Approximate WGS84 shopping-area centers, retained for existing preferences.
const centers: Record<string, [number, number]> = {
  徐家汇: [31.1955, 121.4367],
  静安寺: [31.223, 121.4455],
  五角场: [31.2988, 121.5147],
  世纪公园: [31.215, 121.55],
  虹桥: [31.2, 121.41],
};
type LocationProfile = {
  areas: string[];
  radius: number;
  locations?: PreferredLocation[];
};
export function nearLocations(p: LocationProfile, q: LocationProfile): boolean {
  const points = (profile: LocationProfile): [number, number][] => {
    const located = (profile.locations || []).filter(hasCoordinates);
    // A precise preference replaces coarse centers, so a shared area cannot bypass distance.
    return located.length
      ? located.map((x) => [x.latitude, x.longitude])
      : profile.areas.flatMap((area) => (centers[area] ? [centers[area]] : []));
  };
  const left = points(p),
    right = points(q);
  if (left.length && right.length)
    return left.some((a) =>
      right.some((b) => {
        const rad = (n: number) => (n * Math.PI) / 180;
        const h = Math.min(
          1,
          Math.max(
            0,
            Math.sin(rad(b[0] - a[0]) / 2) ** 2 +
              Math.cos(rad(a[0])) *
                Math.cos(rad(b[0])) *
                Math.sin(rad(b[1] - a[1]) / 2) ** 2,
          ),
        );
        const distance = 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
        return distance <= p.radius + q.radius;
      }),
    );
  // Unlocated addresses have no inferred coordinates. Only exact normalized text can agree.
  const normalize = (text: string) =>
    text.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
  return (p.locations || []).some((a) =>
    (q.locations || []).some(
      (b) =>
        normalize(a.address) !== '我的当前位置' &&
        normalize(a.address) === normalize(b.address),
    ),
  );
}
