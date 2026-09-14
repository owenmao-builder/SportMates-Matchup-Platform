'use client';
import { useEffect, useReducer, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PhoneEntry } from '@/components/phone-entry';
import { AccountEntry } from '@/components/account-entry';
import { AvatarGenerator } from '@/components/avatar-generator';
import { ManualBooking } from '@/components/manual-booking';
import { LocationPreferences } from '@/components/location-preferences';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  ArrowUpRight,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MapPin,
  Clock3,
  Check,
  CheckCheck,
  CalendarDays,
  Bell,
  ShieldCheck,
  UserRound,
  Plus,
  Play,
  FastForward,
  Camera,
  Sparkles,
  Wallet,
  CircleHelp,
  X,
  CheckCircle2,
  Compass,
  SlidersHorizontal,
  Settings2,
  Heart,
  Users,
  MoreHorizontal,
  CircleDot,
} from 'lucide-react';
import {
  initialState,
  reduce,
  ROLES,
  SPORTS,
  LEVELS,
  ageBand,
  dateLabel,
  timeLabel,
  money,
  eligible,
  commonSlots,
  recommendedVenues,
  status,
  refundDue,
  refundBlock,
  feeShare,
  continuous,
  type State,
  type Role,
  type Match,
  type Profile,
  type Action,
} from '@/lib/demo';
const STORAGE = 'tonghao-showcase-v3';
const PHONE_CHECK = 'tonghao-phone-format-checked-v1';
const emptyInitial = initialState(1788746400000);
const sportEmoji = (sport: string) =>
  ({
    羽毛球: '🏸',
    网球: '🎾',
    匹克球: '🏓',
    乒乓球: '🏓',
    篮球: '🏀',
    排球: '🏐',
  })[sport] || '🏸';
function Avatar({ p, small = false }: { p: Profile; small?: boolean }) {
  return (
    <div
      className={`avatar ${p.avatar === 'ink' ? 'ink' : ''} ${small ? 'small' : ''}`}
      aria-label={`${p.name}的演示头像`}
    >
      {p.id === 'admin' ? (
        <ShieldCheck size={small ? 19 : 28} />
      ) : p.id === 'new' && !p.registered ? (
        <Plus />
      ) : (
        <img
          src={
            p.avatar.startsWith('/api/club/avatar/')
              ? p.avatar
              : '/miniapp/avatar-default.svg'
          }
          alt="人物虚拟形象"
        />
      )}
    </div>
  );
}
function Pill({
  children,
  warm = false,
}: {
  children: React.ReactNode;
  warm?: boolean;
}) {
  return <span className={`pill ${warm ? 'warm' : ''}`}>{children}</span>;
}
function Blank({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="blank">
      <CalendarDays size={28} />
      <h3>{title}</h3>
      <p className="muted">{children}</p>
    </div>
  );
}
function Countdown({ s, m }: { s: State; m: Match }) {
  if (!m.deadline || !['arranging', 'venue'].includes(m.stage)) return null;
  const mins = Math.max(0, Math.ceil((m.deadline - s.now) / 60000));
  return (
    <div className="countdown">
      <Clock3 size={15} />
      <strong>
        {Math.floor(mins / 60)} 小时 {mins % 60} 分
      </strong>
      <span>内完成最后确认</span>
    </div>
  );
}
function Field({
  label,
  children,
  note,
}: {
  label: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {note && <small>{note}</small>}
    </label>
  );
}
function TimeChoices({
  m,
  value,
  onChange,
}: {
  m: Match;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const dates = [...new Set(m.slots.map((t) => dateLabel(t.start)))];
  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const activeDate = dates.includes(selectedDate) ? selectedDate : dates[0];
  const other = m.members.find((u) => u !== m.members[0]);
  return (
    <div className="time-choices native-time-choices">
      <div className="row between">
        <h3>选择你可以参加的时间</h3>
        <Button
          variant="link"
          size="sm"
          onClick={() =>
            onChange(
              value.length === m.slots.length ? [] : m.slots.map((t) => t.id),
            )
          }
        >
          {value.length === m.slots.length ? '清空全部' : '全部都可以'}
        </Button>
      </div>
      <p className="muted">
        以下是双方的全部共同空闲。多选一些，更容易订到合适的场地。
      </p>
      <div className="native-date-list">
        {dates.map((date) => {
          const cells = m.slots.filter((t) => dateLabel(t.start) === date);
          const all = cells.every((t) => value.includes(t.id));
          return (
            <div
              key={date}
              className={`native-date-row ${activeDate === date ? 'current' : ''}`}
            >
              <button
                className="date-select"
                onClick={() => setSelectedDate(date)}
                aria-expanded={activeDate === date}
              >
                <strong>{date}</strong>
                <small>
                  {timeLabel(cells[0].start)}–
                  {timeLabel(cells[cells.length - 1].end)}
                </small>
              </button>
              <button
                className="date-all"
                onClick={() => {
                  setSelectedDate(date);
                  onChange(
                    all
                      ? value.filter((id) => !cells.some((t) => t.id === id))
                      : [...new Set([...value, ...cells.map((t) => t.id)])],
                  );
                }}
              >
                {all ? '✓ 全天可选时段' : '选择这一天'}
              </button>
            </div>
          );
        })}
      </div>
      <p className="native-hint">{activeDate} · 点选以调整，每格至多 30 分钟</p>
      <div className="slots native-slot-grid">
        {m.slots
          .filter((t) => dateLabel(t.start) === activeDate)
          .map((t) => (
            <Button
              key={t.id}
              variant={value.includes(t.id) ? 'secondary' : 'outline'}
              className={value.includes(t.id) ? 'selected' : ''}
              aria-pressed={value.includes(t.id)}
              onClick={() =>
                onChange(
                  value.includes(t.id)
                    ? value.filter((x) => x !== t.id)
                    : [...value, t.id],
                )
              }
            >
              {value.includes(t.id) && <Check size={12} />} {timeLabel(t.start)}
              –{timeLabel(t.end)}
            </Button>
          ))}
      </div>
      <div className="native-selected-note">
        <strong>
          已选 {value.length} / {m.slots.length} 个时段
        </strong>
        <p>相邻时段会连成完整空闲区间，实际场次可以错开整点。</p>
      </div>
    </div>
  );
}
function ProfileEditor({
  s,
  act,
  onDone,
}: {
  s: State;
  act: (a: Action) => Promise<State | undefined>;
  onDone: () => void;
}) {
  const original = s.profiles[s.role];
  const [p, setP] = useState<Profile>({
    ...original,
    gender: original.registered ? original.gender : '',
  });
  const [photo, setPhoto] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const change = (key: string, value: any) =>
    setP((x) => ({ ...x, [key]: value }));
  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo);
    },
    [photo],
  );
  async function save() {
    const result = await act({ type: 'profile', profile: p });
    if (!result) return;
    if (
      result.profiles[s.role].registered &&
      result.message.startsWith('资料已保存')
    ) {
      onDone();
    } else setError(result.message);
  }
  return (
    <div className="panel">
      <div className="row between">
        <div>
          <p className="eyebrow">
            {original.registered ? 'MY PROFILE' : 'NICE TO MEET YOU'}
          </p>
          <h2>{original.registered ? '我想这样介绍自己' : '先认识一下你'}</h2>
        </div>
        <Avatar p={p} />
      </div>
      {true && (
        <Field label="关于我" note="聊聊你喜欢的运动和理想中的球局。">
          <Textarea
            value={p.intro}
            maxLength={160}
            placeholder="你好，我平时下班后喜欢打羽毛球，想找水平相近、轻松运动的球友……"
            onChange={(e) => change('intro', e.target.value)}
          />
        </Field>
      )}
      {true && (
        <>
          <Field label="怎么称呼你">
            <Input
              value={p.name}
              maxLength={18}
              onChange={(e) => change('name', e.target.value)}
              placeholder="填写昵称"
            />
          </Field>
          <div className="form-grid">
            <Field label="性别 · 必选">
              <NativeSelect
                value={p.gender}
                onChange={(e) => change('gender', e.target.value)}
              >
                <NativeSelectOption value="">请选择</NativeSelectOption>
                <NativeSelectOption value="女">女</NativeSelectOption>
                <NativeSelectOption value="男">男</NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field
              label="真实出生日期 · 必填"
              note="其他球友只能看到年龄范围。"
            >
              <Input
                type="date"
                value={p.birth}
                max={new Date(s.now).toISOString().slice(0, 10)}
                onChange={(e) => change('birth', e.target.value)}
              />
            </Field>
          </div>
          <div className="privacy-note">
            <ShieldCheck size={15} />
            其他球友可见：{p.birth ? ageBand(p.birth, s.now) : '年龄范围'} ·
            不公开具体生日
          </div>
        </>
      )}
      {s.live && (
        <AvatarGenerator onGenerated={(avatar) => change('avatar', avatar)} />
      )}
      {!s.live && (
        <div className="avatar-editor">
          <h3>用自拍，认识另一个自己</h3>
          <p className="muted">人物虚拟形象 · 自拍生成流程演示</p>
          <div className="upload-row">
            <label className="upload-box">
              {photo ? (
                <img src={photo} alt="仅在本页预览的自拍" />
              ) : (
                <>
                  <Camera size={25} />
                  <span>选择一张自拍</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 10 * 1024 * 1024) {
                      setError('请选择 10 MB 以内的图片');
                      return;
                    }
                    setPhoto(URL.createObjectURL(file));
                    setPreview(false);
                  }
                }}
              />
            </label>
            <div className="style-options">
              {[
                ['clay', '半写实 3D', '柔和立体，更有亲切感'],
                ['ink', '清爽插画', '简洁线条，保留个人气质'],
              ].map(([id, title, desc]) => (
                <button
                  key={id}
                  type="button"
                  className={`style-option ${p.avatar === id ? 'chosen' : ''}`}
                  onClick={() => {
                    change('avatar', id);
                    setPreview(false);
                  }}
                >
                  <Sparkles size={15} />
                  <span>
                    <strong>{title}</strong>
                    <small>{desc}</small>
                  </span>
                  {p.avatar === id && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>
          <Button
            variant="secondary"
            disabled={!photo || busy}
            onClick={() => {
              setBusy(true);
              setTimeout(() => {
                setBusy(false);
                setPreview(true);
              }, 900);
            }}
          >
            <Sparkles />
            {busy ? '正在模拟生成…' : '预览生成流程'}
          </Button>
          {preview && (
            <div className="notice">
              生成流程演示完成，已选择
              {p.avatar === 'clay' ? '半写实 3D' : '清爽插画'}风格。实际 AI
              成片需在小程序中调用已配置的服务；此页没有生成或上传照片。
            </div>
          )}
          <p className="footnote">
            自拍仅在本页临时预览，不保存到演示数据，不调用付费 AI
            接口。保存的是风格选项。
          </p>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="row form-actions">
        <Button className="wide" onClick={save}>
          {original.registered ? '保存资料' : '保存，去选择兴趣与空闲'}
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
function Preferences({
  s,
  act,
  onDone,
}: {
  s: State;
  act: (a: Action) => Promise<State | undefined>;
  onDone: () => void;
}) {
  const [p, setP] = useState(s.profiles[s.role]);
  const [locating, setLocating] = useState(false);
  const set = (k: string, v: any) => setP((x) => ({ ...x, [k]: v }));
  const sportSet = (sport: string, key: string, value: number) =>
    setP((x) => ({
      ...x,
      sportPrefs: {
        ...x.sportPrefs,
        [sport]: {
          level: x.level,
          gap: x.gap,
          ...x.sportPrefs?.[sport],
          [key]: value,
        },
      },
    }));
  const toggle = (k: 'sports' | 'areas' | 'days', v: any) =>
    set(
      k,
      (p[k] as any[]).includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v],
    );
  return (
    <div className="panel preferences">
      <div className="row between">
        <h2>把喜欢和空闲告诉我们</h2>
        <SlidersHorizontal size={19} />
      </div>
      <p className="muted">
        发布后持续匹配，已在进行和已结束的活动都不会关闭它。
      </p>
      <Field label="喜欢的运动 · 可多选">
        <div className="chips">
          {SPORTS.map((x) => (
            <Button
              key={x}
              variant={p.sports.includes(x) ? 'default' : 'outline'}
              aria-pressed={p.sports.includes(x)}
              onClick={() => toggle('sports', x)}
            >
              {x}
            </Button>
          ))}
        </div>
      </Field>
      <div className="form-grid">
        <Field label="运动水平">
          <NativeSelect
            value={p.level}
            onChange={(e) => set('level', Number(e.target.value))}
          >
            {LEVELS.map((x, i) => (
              <NativeSelectOption key={x} value={i}>
                {x}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field label="可接受的水平差">
          <NativeSelect
            value={p.gap}
            onChange={(e) => set('gap', Number(e.target.value))}
          >
            <NativeSelectOption value={0}>只匹配同级</NativeSelectOption>
            <NativeSelectOption value={1}>相差最多一级</NativeSelectOption>
            <NativeSelectOption value={2}>都可以</NativeSelectOption>
          </NativeSelect>
        </Field>
      </div>
      {p.sports.map((sport) => (
        <div className="sport-settings" key={sport}>
          <strong>{sport}</strong>
          <NativeSelect
            aria-label={`${sport}水平`}
            value={p.sportPrefs?.[sport]?.level ?? p.level}
            onChange={(e) => sportSet(sport, 'level', Number(e.target.value))}
          >
            {LEVELS.map((x, i) => (
              <NativeSelectOption key={x} value={i}>
                {x}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label={`${sport}水平差`}
            value={p.sportPrefs?.[sport]?.gap ?? p.gap}
            onChange={(e) => sportSet(sport, 'gap', Number(e.target.value))}
          >
            <NativeSelectOption value={0}>同级</NativeSelectOption>
            <NativeSelectOption value={1}>相差一级</NativeSelectOption>
            <NativeSelectOption value={2}>都可以</NativeSelectOption>
          </NativeSelect>
        </div>
      ))}
      <Field label="大致偏好区域 · 上海">
        <div className="chips">
          {['徐家汇', '静安寺', '五角场', '世纪公园', '虹桥'].map((x) => (
            <Button
              key={x}
              variant={p.areas.includes(x) ? 'secondary' : 'outline'}
              onClick={() => toggle('areas', x)}
            >
              {p.areas.includes(x) && <Check size={13} />} {x}
            </Button>
          ))}
        </div>
      </Field>
      <LocationPreferences
        value={p.locations || []}
        onChange={(locations) => set('locations', locations)}
        onBusyChange={setLocating}
      />
      <Field label={`可接受距离 · ${p.radius} 公里`}>
        <NativeSelect
          value={p.radius}
          onChange={(e) => set('radius', Number(e.target.value))}
        >
          {[3, 5, 10, 15].map((n) => (
            <NativeSelectOption key={n} value={n}>
              {n} 公里
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field label="每周空闲 · 可多选">
        <div className="weekdays">
          {['日', '一', '二', '三', '四', '五', '六'].map((x, i) => (
            <Button
              key={x}
              variant={p.days.includes(i) ? 'default' : 'outline'}
              aria-pressed={p.days.includes(i)}
              onClick={() => toggle('days', i)}
            >
              周{x}
            </Button>
          ))}
        </div>
      </Field>
      <div className="form-grid">
        <Field label="开始时间">
          <Input
            type="time"
            step={1800}
            value={p.start}
            onChange={(e) => set('start', e.target.value)}
          />
        </Field>
        <Field label="结束时间">
          <Input
            type="time"
            step={1800}
            value={p.end}
            onChange={(e) => set('end', e.target.value)}
          />
        </Field>
        <Field label="额外空闲日期">
          <Input
            type="date"
            value={p.specific}
            onChange={(e) => set('specific', e.target.value)}
          />
        </Field>
        <Field label="临时排除日期">
          <Input
            type="date"
            value={p.excluded}
            onChange={(e) => set('excluded', e.target.value)}
          />
        </Field>
      </div>
      <label className="switch-row">
        <span>
          <strong>持续为我匹配</strong>
          <small>系统每 {s.interval / 60} 小时检查一次资源</small>
        </span>
        <Switch checked={p.active} onCheckedChange={(v) => set('active', v)} />
      </label>
      <Button
        className="wide"
        disabled={locating}
        onClick={async () => {
          const a = {
            type: 'preferences',
            preferences: {
              ...p,
              locations: (p.locations || []).filter((x) => x.address.trim()),
            },
          };
          const result = await act(a);
          if (!result) return;
          if (
            result.message.startsWith('兴趣与空闲已发布') ||
            result.message.startsWith('偏好已保存')
          )
            onDone();
        }}
      >
        发布兴趣与空闲 <ArrowRight />
      </Button>
    </div>
  );
}
function AdminVenue({
  s,
  m,
  act,
}: {
  s: State;
  m: Match;
  act: (a: Action) => Promise<State | undefined>;
}) {
  const suggested = recommendedVenues(m);
  const [name, setName] = useState('徐家汇运动中心 · 3 号场');
  const [start, setStart] = useState(
    suggested[0] ? timeLabel(suggested[0].start) : '14:15',
  );
  const [date, setDate] = useState(
    suggested[0]
      ? new Date(suggested[0].start + 28800000).toISOString().slice(0, 10)
      : '',
  );
  const [price, setPrice] = useState('120');
  return (
    <div className="admin-venue">
      <div className="notice">
        可安排时间：
        {[...new Set(commonSlots(m).map((t) => dateLabel(t.start)))].join('、')}
        。提供的场次须完整落在双方多选时间内。
      </div>
      {s.role === 'admin' &&
        m.members.some((id) => s.profiles[id].locations?.length) && (
          <div className="location-card">
            <strong>球友详细地点 · 仅管家可见</strong>
            {m.members.map((id) => (
              <div key={id}>
                <p>
                  {s.profiles[id].name} · 可接受距离 {s.profiles[id].radius}{' '}
                  公里
                </p>
                {(s.profiles[id].locations || []).map((location, index) => (
                  <p className="muted" key={index}>
                    {location.address}
                    {location.latitude !== undefined &&
                      location.longitude !== undefined && (
                        <span>
                          {' '}
                          · 纬度 {location.latitude.toFixed(6)} / 经度{' '}
                          {location.longitude.toFixed(6)}
                        </span>
                      )}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}
      <div className="form-grid">
        <Field label="场地名称">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="场地总费用（元）">
          <Input
            type="number"
            min={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
        <Field label="实际日期">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="开始时间 · 场次 1 小时">
          <Input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
      </div>
      <div className="row wrap">
        <Button
          onClick={() =>
            act({
              type: 'venues',
              id: m.id,
              venues: suggested.map((x) => ({
                ...x,
                name,
                price: Math.round(Number(price) * 100),
              })),
            })
          }
        >
          发布 {suggested.length} 个推荐场次
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const n = Date.parse(`${date}T${start}:00+08:00`);
            act({
              type: 'venues',
              id: m.id,
              venues: [
                {
                  id: `custom-${n}`,
                  name,
                  start: n,
                  end: n + 3600000,
                  price: Math.round(Number(price) * 100),
                },
              ],
            });
          }}
        >
          发布自定义场次
        </Button>
      </div>
      <p className="footnote">
        推荐包含 14:15 等非整点方案。发布或修改方案不延长最后确认时限。
      </p>
    </div>
  );
}
function ActivityCard({
  s,
  m,
  act,
  onCancel,
  onPayment,
}: {
  s: State;
  m: Match;
  act: (a: Action) => Promise<State | undefined>;
  onCancel: (m: Match) => void;
  onPayment: () => void;
}) {
  const [votes, setVotes] = useState<string[]>(m.votes[s.role] || []);
  const [timeDraft, setTimeDraft] = useState<string[]>(
    m.accepted[s.role] || [],
  );
  return (
    <article className="panel activity">
      <div className="row between">
        <div>
          <p className="eyebrow">{m.id.toUpperCase()}</p>
          <h2>
            {m.sport} · {m.members.map((u) => s.profiles[u].name).join(' / ')}
          </h2>
        </div>
        <Pill warm={['refund', 'arranging', 'venue'].includes(m.stage)}>
          {status(s, m)}
        </Pill>
      </div>
      <Countdown s={s} m={m} />
      <div className="progress-track">
        {['双方同意', '场地确认', '相约运动', '押金退还'].map((x, i) => (
          <span
            key={x}
            className={
              (m.stage === 'arranging'
                ? 0
                : m.stage === 'venue'
                  ? 1
                  : m.stage === 'booked'
                    ? 2
                    : 3) >= i
                ? 'done'
                : ''
            }
          >
            <i>{i + 1}</i>
            {x}
          </span>
        ))}
      </div>
      {m.booking && (
        <div className="booking">
          <CalendarDays size={20} />
          <div>
            <strong>
              {dateLabel(m.booking.start)}　{timeLabel(m.booking.start)}–
              {timeLabel(m.booking.end)}
            </strong>
            <p className="muted">{m.booking.name}</p>
          </div>
        </div>
      )}
      {m.stage === 'arranging' && (
        <>
          <div className="notice">
            {continuous(commonSlots(m))
              ? '双方已同意，管家正在共同空闲中安排场地。切换“同好管家”可发布场次。'
              : '双方已同意，但所选时间暂不重合。请增加可选时间，3 小时倒计时不重置。'}
          </div>
          <details className="reschedule" open={!continuous(commonSlots(m))}>
            <summary>修改我的可选时间</summary>
            <TimeChoices m={m} value={timeDraft} onChange={setTimeDraft} />
            <Button
              className="wide"
              onClick={() =>
                act({ type: 'accept', id: m.id, slots: timeDraft })
              }
            >
              更新多选时间
            </Button>
          </details>
        </>
      )}
      {m.stage === 'venue' && (
        <>
          <h3>场地方案可以多选</h3>
          <div className="venue-options">
            {m.options.map((v) => (
              <label
                key={v.id}
                className={`venue-option ${votes.includes(v.id) ? 'selected' : ''}`}
              >
                <Checkbox
                  checked={votes.includes(v.id)}
                  onCheckedChange={(on) =>
                    setVotes((x) =>
                      on ? [...x, v.id] : x.filter((t) => t !== v.id),
                    )
                  }
                />
                <span>
                  <strong>
                    {dateLabel(v.start)}　{timeLabel(v.start)}–
                    {timeLabel(v.end)}
                  </strong>
                  <small>
                    {v.name} · 场地总费用 ¥{money(v.price)}
                  </small>
                </span>
              </label>
            ))}
          </div>
          <Button
            className="wide"
            onClick={() => act({ type: 'vote', id: m.id, options: votes })}
          >
            确认这些场次
          </Button>
          {Object.keys(m.votes).length > 0 && (
            <p className="footnote">
              {Object.keys(m.votes)
                .map((u) => s.profiles[u as Role].name)
                .join('、')}
              已提交场地选择。
            </p>
          )}
        </>
      )}
      {m.booking && ['booked', 'refund', 'ended'].includes(m.stage) && (
        <>
          <div className="fee-row">
            <span>
              我的场地费 <strong>¥{money(feeShare(m, s.role))}</strong>
            </span>
            <span>
              履约押金 <strong>¥{money(refundDue(m, s.role))}</strong>
            </span>
          </div>
          {!m.payments[s.role]?.submitted ? (
            <Button className="wide" onClick={onPayment}>
              人工预订与缴费
            </Button>
          ) : (
            <div className="payment-status">
              <CheckCircle2 size={16} />
              {m.payments[s.role]?.verified
                ? '付款已核实'
                : '付款已登记，待管家核实'}
            </div>
          )}
          {m.payments[s.role]?.submitted && (
            <Button className="wide" variant="outline" onClick={onPayment}>
              查看人工预订与费用
            </Button>
          )}
          <p className="phone-help">
            暂时无法集成外部预订平台，可添加好友后人工预订。
          </p>
          {['refund', 'ended'].includes(m.stage) && (
            <div className="notice">
              {status(s, m) === '活动已结束'
                ? '押金已退清，本次活动已结束。继续匹配，期待下一次见面。'
                : '活动时间已结束，系统已自动发起押金退款，并给管家创建待办。无需申请。'}
              <br />
              已退 ¥{money(m.payments[s.role]?.refunded || 0)} · 待退 ¥
              {money(
                Math.max(
                  0,
                  refundDue(m, s.role) - (m.payments[s.role]?.refunded || 0),
                ),
              )}
            </div>
          )}
          {m.stage === 'booked' && !m.cancel && (
            <Button variant="link" onClick={() => onCancel(m)}>
              临时有事，申请活动取消
            </Button>
          )}
        </>
      )}
      {m.cancel && (
        <div className="notice">
          {m.cancel.reviewed ? '取消已审核' : '取消申请待审核'} ·{' '}
          {m.cancel.reason}
          {m.cancel.reviewed && (
            <>
              <br />
              {s.profiles[m.cancel.by].name}信誉减 1。
              {m.cancel.refundable
                ? '场地可取消，按实收办理退款。'
                : '场地无法取消，由发起取消方全额承担场地费，已付款抵扣，不重复收取。'}
            </>
          )}
        </div>
      )}
    </article>
  );
}
const RULES = [
  [
    '持续匹配，不错过下一场',
    '发布时间、地点、兴趣和水平后，系统每 1–2 小时匹配资源。已有进行中或已结束的活动不关闭匹配，只排除实际已预订的冲突时间。',
  ],
  [
    '多选时间，让订场更容易',
    '所有重合的日期与时间都展示出来，可以跨天多选。实际场地可能不是整点，例如 14:15–15:15；请尽量多选，并至少保留连续一小时。',
  ],
  [
    '双方同意后，最后确认 3 小时',
    '从双方都同意邀约的那一刻立即起算。更换场地或重新选择不会重置倒计时。超时未完成最后确认，本次邀约结束，不自动扣分。初次邀约 24 小时未回应扣 1 分。',
  ],
  [
    '本周已经同意过，可以直接婉拒',
    '上海时区同一个活动周内，已同意另一场有效邀约，拒绝其他邀约无需填写原因，也不扣信誉分。未满足条件须说明原因，由管家审核。',
  ],
  [
    '进入时刷新，约满及时提示',
    '进入或返回页面自动刷新预约列表，已被约走的资源不再展示。如果在看到旧邀约后资源被占满，同意时提示“对局已满”。',
  ],
  [
    '多人分摊场地费，履约押金单列',
    '场地费按参与人数分摊，押金与费用分别记录。本演示为两位球友，每人场地费 ¥60、押金 ¥60。支付、核实和退款均为模拟，不发生真实交易。',
  ],
  [
    '活动到点，系统自动安排押金退款',
    '活动时间结束后，系统将状态更新为“押金退款中”，并给后台创建待办。管家核实完成与付款后办理退款；本人押金全部退清，状态变为“活动已结束”。部分退款仍显示退款中。',
  ],
  [
    '临时有事，请尽快申请取消',
    '申请提交后若场地无法取消，场地费由发起取消方全额承担，已付款可以抵扣。临时取消扣 1 分信誉分。其他球友按实收款及费用责任结算。',
  ],
  [
    '信誉与个人信息',
    '信誉满分 5 分，完成每两场活动可恢复 1 分，上限 5 分。注册须选择性别并填写真实出生日期；其他球友只能看年龄范围、信誉、兴趣、水平和偏好区域。',
  ],
  [
    '自拍生成的是人物虚拟形象',
    '小程序通过已配置的 Seedream 服务生成自拍虚拟形象，可在注册和修改资料时使用。网页只展示选图、风格和预览流程，不调用付费模型，也不上传或保存自拍。',
  ],
];

export default function Home({
  mode = 'live',
  adminLogin = false,
}: {
  mode?: 'live' | 'demo';
  adminLogin?: boolean;
}) {
  const live = mode === 'live';
  const [s, dispatch] = useReducer(
    (state: State, a: Action) =>
      a.type === 'restore'
        ? a.state.live &&
          a.state.role === state.role &&
          (a.state.serverRevision || 0) < (state.serverRevision || 0)
          ? state
          : a.state
        : reduce(state, a),
    emptyInitial,
  );
  const [ready, setReady] = useState(false);
  const [entered, setEntered] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [phoneChecked, setPhoneChecked] = useState(false);
  const phoneRef = useRef(false);
  phoneRef.current = phoneChecked;
  const consentRef = useRef(false);
  consentRef.current = agreed;
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [detailOrigin, setDetailOrigin] = useState('activities');
  const [ruleOrigin, setRuleOrigin] = useState('profile');
  const [requestedTab, setTab] = useState('discover');
  const tab =
    live && ['accounts', 'demo'].includes(requestedTab)
      ? entered
        ? 'profile'
        : 'discover'
      : !entered && !['discover', 'accounts', 'rules'].includes(requestedTab)
        ? 'accounts'
        : requestedTab;
  const [index, setIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [friend, setFriend] = useState<Role | null>(null);
  const [modal, setModal] = useState<{
    type: string;
    match?: Match;
    name?: string;
  } | null>(null);
  const [reason, setReason] = useState('');
  const [toast, setToast] = useState('');
  const [activityTab, setActivityTab] = useState('current');
  const [adminTab, setAdminTab] = useState('todo');
  const stateRef = useRef(s);
  stateRef.current = s;
  const touch = useRef(0);
  const savingRef = useRef(false);
  const requestIds = useRef(new Map<string, string>());
  const [saving, setSaving] = useState(false);
  async function refreshLive() {
    if (savingRef.current) return;
    try {
      const response = await fetch('/api/club/state', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (response.status === 401) {
        setEntered(false);
        return;
      }
      const data: any = await response.json();
      if (!response.ok) throw new Error(data.error || '状态更新失败，请重试');
      dispatch({ type: 'restore', state: data.state });
    } catch (error) {
      setToast(error instanceof Error ? error.message : '网络异常，请重试');
    }
  }
  function signedIn(state: State) {
    dispatch({ type: 'restore', state });
    setEntered(true);
    setAgreed(true);
    setPhoneChecked(true);
    setSelectedActivity(null);
    setIndex(0);
    setTab(
      state.role === 'admin'
        ? 'profile'
        : state.profiles[state.role].registered
          ? 'discover'
          : 'edit',
    );
  }
  async function logout() {
    if (live) {
      try {
        const response = await fetch('/api/club/auth/logout', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        if (!response.ok && response.status !== 401) throw new Error();
      } catch {
        setToast('退出失败，请检查网络后重试');
        return;
      }
    }
    setEntered(false);
    setAgreed(false);
    setPhoneChecked(false);
    setTab('discover');
    try {
      sessionStorage.removeItem(PHONE_CHECK);
    } catch {}
  }
  const act = async (a: Action): Promise<State | undefined> => {
    if (!live) {
      const result = reduce(stateRef.current, a);
      dispatch(a);
      return result;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const key = JSON.stringify(a),
      requestId = requestIds.current.get(key) || crypto.randomUUID();
    requestIds.current.set(key, requestId);
    try {
      const response = await fetch('/api/club/action', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: a, requestId }),
      });
      const data: any = await response.json();
      if (!response.ok) {
        if (response.status < 500) requestIds.current.delete(key);
        if (response.status === 401) setEntered(false);
        throw new Error(data.error || '操作失败，请重试');
      }
      dispatch({ type: 'restore', state: data.state });
      requestIds.current.delete(key);
      return data.state;
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : '网络异常，重试不会重复记账',
      );
      return undefined;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  useEffect(() => {
    if (live) {
      fetch('/api/club/state', {
        credentials: 'same-origin',
        cache: 'no-store',
      })
        .then(async (response) => {
          if (response.status === 401) return;
          const data: any = await response.json();
          if (!response.ok) throw new Error(data.error || '服务暂时不可用');
          signedIn(data.state);
        })
        .catch((error) => setToast(error.message))
        .finally(() => setReady(true));
      return;
    }
    let initial = initialState();
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.version === 3 && saved.profiles && saved.matches)
          initial = reduce(saved, { type: 'refresh' });
      }
    } catch {}
    dispatch({ type: 'restore', state: initial });
    let selected = false;
    try {
      const checked = sessionStorage.getItem(PHONE_CHECK) === '1';
      setPhoneChecked(checked);
      selected =
        checked && localStorage.getItem('tonghao-miniapp-entered') === '1';
    } catch {}
    setEntered(selected);
    setAgreed(selected);
    setTab(
      selected
        ? initial.role === 'admin'
          ? 'profile'
          : initial.role === 'new' && !initial.profiles.new.registered
            ? 'edit'
            : 'discover'
        : 'discover',
    );
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready && !live) {
      try {
        localStorage.setItem(STORAGE, JSON.stringify(s));
        localStorage.setItem('tonghao-miniapp-entered', entered ? '1' : '0');
      } catch {}
    }
  }, [s, ready, entered]);
  useEffect(() => {
    document.getElementById('mini-scroll')?.scrollTo({ top: 0 });
  }, [tab]);
  useEffect(() => {
    if (s.message) {
      setToast(s.message);
      const timer = setTimeout(() => setToast(''), 6500);
      return () => clearTimeout(timer);
    }
  }, [s]);
  useEffect(() => {
    if (!ready) return;
    const refresh = () =>
      live ? void refreshLive() : dispatch({ type: 'refresh' });
    const visible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', visible);
    const timer = setInterval(
      () => {
        if (live) void refreshLive();
        else dispatch({ type: 'advance', hours: 1 / 60, silent: true });
      },
      live ? 30000 : 60000,
    );
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', visible);
      clearInterval(timer);
    };
  }, [ready]);
  useEffect(() => {
    if (!ready) return;
    if (live) return;
    const ctx = (document as any).modelContext;
    if (!ctx?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: any) => {
      try {
        Promise.resolve(
          ctx.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {}
    };
    register({
      name: 'read_demo_summary',
      title: '查看同好会演示状态',
      description:
        '只读当前虚构账号、活动状态与匹配状态；不返回出生日期或自拍。',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () => {
        const v = stateRef.current;
        return {
          role: v.role,
          name: v.profiles[v.role].name,
          matching: v.profiles[v.role].active,
          matches: v.matches
            .filter((m) => m.members.includes(v.role))
            .map((m) => ({ id: m.id, status: status(v, m), slots: m.slots })),
        };
      },
    });
    register({
      name: 'switch_demo_account',
      title: '切换演示账号',
      description: '切换当前页面的虚构球友或管家身份，并打开对应工作界面。',
      inputSchema: {
        type: 'object',
        properties: { role: { type: 'string', enum: ROLES } },
        required: ['role'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input: any) => {
        if (
          !input ||
          !ROLES.includes(input.role) ||
          Object.keys(input).some((k) => k !== 'role')
        )
          throw Error('有效 role 为 lin/xu/zhou/chen/admin/new');
        if (!phoneRef.current) throw Error('请先在首页完成手机号格式检查');
        if (!consentRef.current)
          throw Error('请先阅读并同意活动规则与隐私说明');
        flushSync(() => {
          dispatch({ type: 'role', role: input.role });
          setEntered(true);
          setTab(
            input.role === 'admin'
              ? 'profile'
              : input.role === 'new' &&
                  !stateRef.current.profiles.new.registered
                ? 'edit'
                : 'discover',
          );
          setIndex(0);
        });
        return {
          role: stateRef.current.role,
          name: stateRef.current.profiles[input.role as Role].name,
        };
      },
    });
    register({
      name: 'accept_demo_invitation',
      title: '同意演示邀约',
      description:
        '以当前球友身份同意指定虚构邀约并提交多个时间段；第二位球友同意后启动三小时确认。',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          slots: { type: 'array', items: { type: 'string' }, minItems: 2 },
        },
        required: ['id', 'slots'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input: any) => {
        if (
          typeof input?.id !== 'string' ||
          !Array.isArray(input.slots) ||
          !input.slots.every((x: any) => typeof x === 'string') ||
          Object.keys(input).some((k) => !['id', 'slots'].includes(k))
        )
          throw Error('必须提供邀约 id 和时间段 slots');
        if (!phoneRef.current || !consentRef.current)
          throw Error('请先完成手机号格式检查并同意活动规则');
        const result = reduce(stateRef.current, { type: 'accept', ...input });
        if (result.matches === stateRef.current.matches)
          throw Error(result.message);
        flushSync(() => dispatch({ type: 'restore', state: result }));
        return {
          id: input.id,
          message: result.message,
          status: result.matches.find((m) => m.id === input.id)?.stage,
        };
      },
    });
    return () => lifecycle.abort();
  }, [ready]);
  const me = s.profiles[s.role];
  const isAdmin = s.role === 'admin';
  const mine = s.matches.filter((m) => m.members.includes(s.role));
  const invites = mine.filter(
    (m) => m.stage === 'invite' || (m.stage === 'full' && m.stale),
  );
  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, invites.length - 1)));
  }, [invites.length, s.role]);
  const current = invites[Math.min(index, Math.max(0, invites.length - 1))];
  const currentDraft = current
    ? drafts[`${s.role}-${current.id}`] || current.accepted[s.role] || []
    : [];
  const unread = entered
    ? s.notices.filter((n) => n.to === s.role && !n.read).length
    : 0;
  const active = mine.filter(
    (m) =>
      !['invite', 'declined', 'expired', 'full'].includes(m.stage) &&
      status(s, m) !== '活动已结束' &&
      m.stage !== 'cancelled',
  );
  const history = mine.filter(
    (m) =>
      status(s, m) === '活动已结束' ||
      ['cancelled', 'expired', 'declined'].includes(m.stage),
  );
  const bills = mine.filter((m) => m.booking);
  const next = mine.find((m) =>
    ['arranging', 'venue', 'booked', 'refund'].includes(m.stage),
  );
  function finishPhoneCheck() {
    setPhoneChecked(true);
    try {
      sessionStorage.setItem(PHONE_CHECK, '1');
    } catch {}
    setTab('accounts');
  }
  function switchRole(role: Role) {
    if (live) return;
    if (!phoneRef.current) {
      setToast('请先完成手机号格式检查');
      setTab('discover');
      return;
    }
    if (!consentRef.current) {
      setToast('请先阅读并同意活动规则与隐私说明');
      return;
    }
    act({ type: 'role', role });
    setEntered(true);
    setIndex(0);
    setTab(
      role === 'new' && !s.profiles.new.registered
        ? 'edit'
        : role === 'admin'
          ? 'profile'
          : 'discover',
    );
  }
  function openActivity(m: Match, origin = 'activities') {
    setSelectedActivity(m.id);
    setDetailOrigin(origin);
    setTab('detail');
  }
  function chooseModal(type: string, match?: Match, name?: string) {
    setReason('');
    setModal({ type, match, name });
  }
  async function closeAction(a: Action) {
    const result = await act(a);
    if (!result) return;
    if (result.matches !== s.matches || result.profiles !== s.profiles)
      setModal(null);
  }
  const tabs = ['discover', 'activities', 'notices', 'profile'];
  const labels: Record<string, string> = {
    discover: '发现',
    activities: '我的活动',
    notices: '消息',
    profile: '我的',
    funds: '费用与押金',
    rules: '活动规则',
    admin: '管家工作台',
    demo: '演示工具',
    accounts: entered ? '切换演示账号' : '选择演示账号',
    edit: me.registered ? '编辑资料' : '先认识一下你',
    preferences: '匹配偏好',
    partner: '同好资料',
    detail: '活动详情',
    payment: '人工预订与缴费',
  };
  const eyebrows: Record<string, string> = {
    discover: 'TONGHAO CLUB',
    activities: 'MAKE TIME FOR JOY',
    notices: 'STAY IN THE LOOP',
    profile: 'YOUR KIND OF PEOPLE',
    funds: 'EVERY PAYMENT, ACCOUNTED FOR',
    demo: 'DEMO TOOLS',
    accounts: 'TONGHAO CLUB',
    admin: 'TONGHAO CONCIERGE',
  };
  const mainPage = tabs.includes(tab);
  function back() {
    setTab(
      tab === 'rules'
        ? ruleOrigin
        : !entered
          ? 'discover'
          : tab === 'partner'
            ? 'discover'
            : tab === 'payment'
              ? 'detail'
              : tab === 'detail'
                ? detailOrigin
                : 'profile',
    );
  }
  return (
    <main className="workspace miniapp-workspace" aria-busy={saving}>
      {saving && (
        <div className="saving-indicator" role="status">
          正在保存…
        </div>
      )}
      <header className="mini-navbar">
        {!mainPage ? (
          <Button
            variant="ghost"
            size="icon"
            className="mini-back"
            aria-label="返回"
            onClick={back}
          >
            <ChevronLeft />
          </Button>
        ) : (
          <span />
        )}
        <strong>{mainPage ? '同好会' : labels[tab] || '同好会'}</strong>
        <div className="mini-capsule">
          <button
            onClick={() => {
              setRuleOrigin(tab);
              setTab(live ? 'rules' : 'demo');
            }}
            aria-label={live ? '查看活动规则' : '打开演示工具'}
          >
            <MoreHorizontal size={20} />
          </button>
          <span />
          <button onClick={() => setTab('discover')} aria-label="返回发现">
            <CircleDot size={17} />
          </button>
        </div>
      </header>
      <div className="page-grid" id="mini-scroll">
        <section className="main-surface">
          <div className="page-intro mini-heading">
            <div>
              <p className="eyebrow">{eyebrows[tab] || 'TONGHAO CLUB'}</p>
              <h1>{labels[tab] || '同好会'}</h1>
            </div>
            {tab === 'discover' ? (
              <button
                onClick={() => setTab(entered ? 'profile' : 'accounts')}
                aria-label="打开我的资料"
              >
                {entered ? (
                  <Avatar p={me} />
                ) : (
                  <div className="avatar">
                    <UserRound size={21} />
                  </div>
                )}
              </button>
            ) : tab === 'activities' ? (
              <CalendarDays size={27} />
            ) : tab === 'notices' ? (
              <Bell size={25} />
            ) : null}
          </div>
          {tab === 'discover' && !entered && (
            <div className="panel native-welcome">
              <Sparkles size={36} />
              <h2>让空闲，遇见同好</h2>
              <p className="muted">
                告诉我们你的爱好、地点和空闲时间，
                <br />
                接下来的相遇交给同好会。
              </p>
              {live ? (
                <AccountEntry
                  admin={adminLogin}
                  onSignedIn={signedIn}
                  onRules={() => {
                    setRuleOrigin('discover');
                    setTab('rules');
                  }}
                />
              ) : phoneChecked ? (
                <Button className="wide" onClick={() => setTab('accounts')}>
                  继续体验
                </Button>
              ) : (
                <PhoneEntry onContinue={finishPhoneCheck} />
              )}
              <p className="native-hint">
                小程序同款网页体验 · 无需 ChatGPT 账号
              </p>
            </div>
          )}
          {tab === 'discover' && entered && (
            <>
              <div className="native-banner">
                <div className="native-small-icon">
                  <Sparkles size={23} />
                </div>
                <div className="grow">
                  <strong>
                    {me.active ? '智能匹配运行中' : '智能匹配已暂停'}
                  </strong>
                  <p>
                    每 {s.interval / 60} 小时寻找新同好 · 下次{' '}
                    {timeLabel(s.nextRun)}
                  </p>
                </div>
                <button
                  aria-label="刷新邀约"
                  onClick={() => act({ type: 'refresh' })}
                >
                  <RefreshCw size={15} />
                </button>
              </div>
              {current ? (
                <>
                  <div className="invitation-navigation">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="上一个邀约"
                      disabled={index === 0}
                      onClick={() => setIndex((v) => Math.max(0, v - 1))}
                    >
                      <ChevronLeft />
                    </Button>
                    <div>
                      <strong>
                        第 {(index % invites.length) + 1} / {invites.length}{' '}
                        个邀约
                      </strong>
                      <p>左右滑动，看看不同的同好</p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="下一个邀约"
                      disabled={index >= invites.length - 1}
                      onClick={() =>
                        setIndex((v) => Math.min(invites.length - 1, v + 1))
                      }
                    >
                      <ChevronRight />
                    </Button>
                  </div>
                  <article
                    className="invite native-invite"
                    onTouchStart={(e) => {
                      touch.current = e.touches[0].clientX;
                    }}
                    onTouchEnd={(e) => {
                      const dx = e.changedTouches[0].clientX - touch.current;
                      if (Math.abs(dx) > 55)
                        setIndex((v) =>
                          Math.max(
                            0,
                            Math.min(invites.length - 1, v + (dx < 0 ? 1 : -1)),
                          ),
                        );
                    }}
                  >
                    <div className="native-invite-head">
                      <div className="row between">
                        <div>
                          <span className="native-invite-tag">
                            {status(s, current)}
                          </span>
                          <h2>
                            {current.sport} · {me.areas[0] || '徐家汇'}
                          </h2>
                        </div>
                        <span className="native-sport" aria-hidden="true">
                          {sportEmoji(current.sport)}
                        </span>
                      </div>
                      <p>
                        <Clock3 size={12} />
                        邀约回应剩余{' '}
                        {Math.max(
                          0,
                          Math.ceil(
                            (current.created + 86400000 - s.now) / 3600000,
                          ),
                        )}{' '}
                        小时
                      </p>
                    </div>
                    <div className="native-invite-body">
                      <div className="confirmation-rule">
                        <strong>双方同意后，3 小时内完成最后确认</strong>
                        <p>
                          从双方都同意邀约时立即起算，包含场地和场次的安排与确认。超时本次邀约结束；重新选时或更换场地不重新计时。
                        </p>
                      </div>
                      {(() => {
                        const other = current.members.find(
                          (u) => u !== s.role,
                        )!;
                        const p = s.profiles[other];
                        return (
                          <button
                            className="person person-button"
                            onClick={() => {
                              setFriend(other);
                              setTab('partner');
                            }}
                          >
                            <Avatar p={p} />
                            <div>
                              <h2>{p.name}</h2>
                              <p className="muted">
                                {p.ageRange || ageBand(p.birth, s.now)} · 信誉{' '}
                                {p.score} 分
                              </p>
                            </div>
                            <ChevronRight size={23} className="ml-auto" />
                          </button>
                        );
                      })()}
                      <div className="divider" />
                      <TimeChoices
                        key={`${s.role}-${current.id}`}
                        m={current}
                        value={currentDraft}
                        onChange={(v) =>
                          setDrafts((x) => ({
                            ...x,
                            [`${s.role}-${current.id}`]: v,
                          }))
                        }
                      />
                      {eligible(s, current) && (
                        <p className="native-hint">
                          同一周已有同意的活动，拒绝本邀约无需填写原因。
                        </p>
                      )}
                      <div className="row native-invite-actions">
                        <Button
                          variant="destructive"
                          onClick={() =>
                            eligible(s, current)
                              ? act({ type: 'decline', id: current.id })
                              : chooseModal('decline', current)
                          }
                        >
                          拒绝
                        </Button>
                        <Button
                          disabled={!currentDraft.length}
                          className="wide"
                          onClick={() =>
                            act({
                              type: 'accept',
                              id: current.id,
                              slots: currentDraft,
                            })
                          }
                        >
                          {current.accepted[s.role]
                            ? '更新可参加时间'
                            : '同意并提交时间'}
                        </Button>
                      </div>
                      <p className="native-hint centered">
                        至少连续 1 小时，可跨天多选 · 截止前可修改
                      </p>
                    </div>
                  </article>
                </>
              ) : (
                <div className="panel">
                  <Blank
                    title={
                      me.active ? '正在寻找同频的人' : '给自己留一点自由时间'
                    }
                  >
                    暂时没有待确认的新邀约。扩大空闲时间或活动范围，可能遇见更多同好。
                    <Button
                      className="wide"
                      variant="secondary"
                      onClick={() => setTab('preferences')}
                    >
                      调整匹配偏好
                    </Button>
                  </Blank>
                </div>
              )}
              {active.length > 0 && (
                <button
                  className="native-note native-activity-link"
                  onClick={() => setTab('activities')}
                >
                  <span>
                    <strong>{active.length} 场活动正在推进</strong>
                    <small>去查看场地安排与活动详情</small>
                  </span>
                  <ChevronRight size={20} />
                </button>
              )}
              <div className="native-note">
                <h3>相遇，一直在路上</h3>
                <p>
                  处理邀约、确认场地或完成活动期间，我们仍会继续为你匹配。你可以在「我的」中随时暂停。
                </p>
              </div>
            </>
          )}
          {tab === 'profile' && (
            <>
              <div className="native-profile-card">
                <div className="row">
                  <button
                    className="native-profile-avatar"
                    onClick={() => setTab(isAdmin ? 'accounts' : 'edit')}
                    aria-label="修改虚拟形象"
                  >
                    <Avatar p={me} />
                  </button>
                  <div className="grow">
                    <h2>{me.name}</h2>
                    <p>
                      {isAdmin
                        ? '同好会 · 活动管家'
                        : me.registered
                          ? `${ageBand(me.birth, s.now)} · ${me.gender}`
                          : '资料待完善'}
                    </p>
                  </div>
                  {!isAdmin && (
                    <button
                      className="native-edit"
                      onClick={() => setTab('edit')}
                    >
                      编辑
                    </button>
                  )}
                </div>
                <div className="native-score-row">
                  <div>
                    <span>◇ 信誉分</span>
                    <strong>
                      {me.score}
                      <small> / 5</small>
                    </strong>
                  </div>
                  <div>
                    <span>完成活动</span>
                    <strong>
                      {mine.filter((m) => status(s, m) === '活动已结束').length}
                      <small> 场</small>
                    </strong>
                  </div>
                </div>
              </div>
              {!live && (
                <button
                  className="native-banner native-switch"
                  onClick={() => setTab('accounts')}
                >
                  <div className="grow">
                    <strong>切换演示账号</strong>
                    <p>球友 · 管家 · 注册演示，无需退出</p>
                  </div>
                  <ChevronRight size={21} />
                </button>
              )}
              {!isAdmin && (
                <div className="panel native-menu">
                  <label className="native-menu-row">
                    <span>
                      <strong>持续为我寻找同好</strong>
                      <small>已有活动不影响新的匹配</small>
                    </span>
                    <Switch
                      checked={me.active}
                      onCheckedChange={() => act({ type: 'toggle' })}
                    />
                  </label>
                  <button
                    className="native-menu-row"
                    onClick={() => setTab('preferences')}
                  >
                    <span>兴趣与水平</span>
                    <small>
                      {me.sports.join('、')} <ChevronRight size={13} />
                    </small>
                  </button>
                  <button
                    className="native-menu-row"
                    onClick={() => setTab('preferences')}
                  >
                    <span>常用地点</span>
                    <small className="location-summary">
                      {me.locations?.length
                        ? me.locations.map((x) => x.address).join('、')
                        : me.areas.join('、')}{' '}
                      <ChevronRight size={13} />
                    </small>
                  </button>
                  <button
                    className="native-menu-row"
                    onClick={() => setTab('preferences')}
                  >
                    <span>我的空闲</span>
                    <small>
                      每周 {me.days.length} 天 <ChevronRight size={13} />
                    </small>
                  </button>
                </div>
              )}
              <div className="native-note">
                <h3>认真回应，每次相遇</h3>
                <p>
                  初始信誉 5 分。邀约超时未回应扣 1
                  分；拒绝理由经审核后决定是否扣分。每完成两场活动恢复 1
                  分，最高 5 分。
                </p>
              </div>
              <div className="panel native-menu">
                {isAdmin && (
                  <button
                    className="native-menu-row"
                    onClick={() => setTab('admin')}
                  >
                    <span>管家工作台</span>
                    <small>
                      场地 · 缴费 · 审核 <ChevronRight size={13} />
                    </small>
                  </button>
                )}
                <button
                  className="native-menu-row"
                  onClick={() => {
                    if (isAdmin) {
                      setAdminTab('money');
                      setTab('admin');
                    } else setTab('funds');
                  }}
                >
                  <span>费用与押金</span>
                  <small>
                    退款进度 · 资金明细 <ChevronRight size={13} />
                  </small>
                </button>
                <button
                  className="native-menu-row"
                  onClick={() => {
                    setRuleOrigin('profile');
                    setTab('rules');
                  }}
                >
                  <span>活动规则与隐私说明</span>
                  <ChevronRight size={15} />
                </button>
                {!live && (
                  <button
                    className="native-menu-row"
                    onClick={() => setTab('demo')}
                  >
                    <span>演示工具</span>
                    <small>
                      快进时间 · 场景演示 <ChevronRight size={13} />
                    </small>
                  </button>
                )}
                <button
                  className="native-menu-row"
                  onClick={() => void logout()}
                >
                  <span>{live ? '退出账号' : '退出演示账号'}</span>
                  <ChevronRight size={15} />
                </button>
              </div>
              <p className="native-hint centered">
                {live
                  ? '账号与活动已连接共享后台'
                  : '小程序同款网页体验 · 资金与头像生成均为模拟'}
              </p>
            </>
          )}
          {tab === 'edit' && (
            <ProfileEditor
              key={s.role}
              s={s}
              act={act}
              onDone={() => setTab(me.registered ? 'profile' : 'preferences')}
            />
          )}
          {tab === 'preferences' && (
            <Preferences
              key={`pref-${s.role}`}
              s={s}
              act={act}
              onDone={() => setTab('discover')}
            />
          )}
          {tab === 'accounts' && !phoneChecked && (
            <div className="panel">
              <h2>先检查一下手机号</h2>
              <PhoneEntry onContinue={finishPhoneCheck} />
            </div>
          )}
          {tab === 'accounts' && phoneChecked && (
            <>
              <p className="muted">
                手机号格式检查通过。选择一个演示身份，体验完整流程。
              </p>
              <p className="phone-help">
                账号与活动仅保存在当前浏览器，不同手机之间暂不互通。
              </p>
              {entered && (
                <div className="current-account">
                  <span>当前账号</span>
                  <strong>{me.name}</strong>
                </div>
              )}
              {!entered && (
                <div className="account-consent">
                  <Checkbox
                    id="entry-consent"
                    checked={agreed}
                    onCheckedChange={(v) => setAgreed(!!v)}
                  />
                  <label htmlFor="entry-consent">我已阅读并同意</label>
                  <button
                    onClick={() => {
                      setRuleOrigin('accounts');
                      setTab('rules');
                    }}
                  >
                    活动规则与隐私说明
                  </button>
                </div>
              )}
              <div className="panel native-account-panel">
                <h3>演示账号 · 点击直接进入</h3>
                <div className="account-grid">
                  {ROLES.map((role) => (
                    <button
                      disabled={!agreed}
                      className={`account-button ${entered && s.role === role ? 'active' : ''}`}
                      key={role}
                      onClick={() => switchRole(role)}
                    >
                      <strong>{s.profiles[role].name}</strong>
                      <small>
                        {role === 'admin'
                          ? '场地、缴费与退款'
                          : role === 'new'
                            ? '从新用户注册开始'
                            : '体验邀约与活动'}
                      </small>
                    </button>
                  ))}
                </div>
                <p className="native-hint">
                  各账号的资料与操作独立保存，可在“我的”中随时切换。全新用户用于注册演示，已有资料会保留。
                </p>
                {entered && (
                  <p className="native-hint">已沿用当前登录的规则同意记录。</p>
                )}
              </div>
              <div className="native-note">
                <p>
                  无需 ChatGPT
                  或微信账号。此入口用于展示小程序流程，不接入真实微信身份。
                </p>
              </div>
            </>
          )}
          {tab === 'partner' && friend && (
            <>
              <div className="native-partner-hero">
                <p className="eyebrow">MEET YOUR KIND OF PEOPLE</p>
                <Avatar p={s.profiles[friend]} />
                <h1>{s.profiles[friend].name}</h1>
                <p className="muted">
                  {s.profiles[friend].ageRange ||
                    ageBand(s.profiles[friend].birth, s.now)}{' '}
                  · {s.profiles[friend].gender}
                </p>
                <div className="native-partner-score">
                  <span>◇ 信誉分</span>
                  <strong>
                    {s.profiles[friend].score}
                    <small> / 5</small>
                  </strong>
                </div>
              </div>
              <div className="panel native-menu">
                <h3>TA 的兴趣与水平</h3>
                {s.profiles[friend].sports.map((sport) => (
                  <div className="native-menu-row" key={sport}>
                    <span>
                      {sportEmoji(sport)}　{sport}
                    </span>
                    <Pill>
                      {
                        LEVELS[
                          s.profiles[friend].sportPrefs?.[sport]?.level ??
                            s.profiles[friend].level
                        ]
                      }
                    </Pill>
                  </div>
                ))}
              </div>
              <div className="panel">
                <h3>偏好活动区域</h3>
                <div className="chips">
                  {s.profiles[friend].areas.map((area) => (
                    <div className="area-chip" key={area}>
                      <strong>⌖ {area}</strong>
                      <small>上海</small>
                    </div>
                  ))}
                  {!s.profiles[friend].areas.length && (
                    <p className="muted">已设置私密地点，具体场地由管家协调</p>
                  )}
                </div>
              </div>
              <div className="native-note">
                <p>
                  先了解一点点，再在爱好里慢慢熟悉。这里只展示年龄区间与大致活动区域。
                </p>
              </div>
            </>
          )}
          {tab === 'detail' &&
            (() => {
              const m = mine.find((m) => m.id === selectedActivity);
              return m ? (
                <ActivityCard
                  key={`${s.role}-${m.id}`}
                  s={s}
                  m={m}
                  act={act}
                  onCancel={(x) => chooseModal('cancel', x)}
                  onPayment={() => setTab('payment')}
                />
              ) : (
                <Blank title="活动已更新">请返回活动列表重新查看。</Blank>
              );
            })()}
          {tab === 'payment' &&
            (() => {
              const m = mine.find((item) => item.id === selectedActivity);
              return m?.booking &&
                ['booked', 'refund', 'ended'].includes(m.stage) ? (
                <ManualBooking
                  key={`${s.role}-${m.id}`}
                  s={s}
                  m={m}
                  onRegister={(proof) => act({ type: 'pay', id: m.id, proof })}
                />
              ) : (
                <Blank title="活动已更新">请返回活动列表重新查看。</Blank>
              );
            })()}
          {tab === 'activities' && (
            <>
              <Tabs
                value={activityTab}
                onValueChange={(v) => setActivityTab(v as string)}
              >
                <TabsList className="sub-tabs">
                  <TabsTrigger value="current">进行中</TabsTrigger>
                  <TabsTrigger value="todo">待处理</TabsTrigger>
                  <TabsTrigger value="history">已结束</TabsTrigger>
                </TabsList>
              </Tabs>
              {(() => {
                const list =
                  activityTab === 'history'
                    ? history
                    : activityTab === 'todo'
                      ? active.filter(
                          (m) =>
                            ['arranging', 'venue', 'refund'].includes(
                              m.stage,
                            ) ||
                            (m.cancel && !m.cancel.reviewed) ||
                            (m.stage === 'booked' &&
                              !m.payments[s.role]?.verified),
                        )
                      : active;
                return list.length ? (
                  list.map((m) => (
                    <button
                      className="panel native-activity-summary"
                      key={m.id}
                      onClick={() => openActivity(m)}
                    >
                      <div className="row between">
                        <div className="grow">
                          <Pill warm>{status(s, m)}</Pill>
                          <h3>
                            {m.sport} · {m.booking?.name || '徐家汇'}
                          </h3>
                          <p className="muted">
                            和{' '}
                            {
                              s.profiles[m.members.find((u) => u !== s.role)!]
                                .name
                            }{' '}
                            的两人局
                          </p>
                        </div>
                        <span className="native-sport">
                          {sportEmoji(m.sport)}
                        </span>
                      </div>
                      <div className="divider" />
                      <Countdown s={s} m={m} />
                      <p className="muted">
                        ◷{' '}
                        {m.booking
                          ? `${dateLabel(m.booking.start)} ${timeLabel(m.booking.start)}–${timeLabel(m.booking.end)}`
                          : '等待双方确认具体场次'}
                      </p>
                      <div className="row between native-summary-footer">
                        <span>
                          {m.booking
                            ? '查看费用与活动进展'
                            : `共有 ${m.slots.length} 个时间可多选`}
                        </span>
                        <strong>进入活动 ›</strong>
                      </div>
                    </button>
                  ))
                ) : (
                  <Blank title="这里还没有活动">
                    新的相遇，会慢慢填满你的日历。
                  </Blank>
                );
              })()}
            </>
          )}
          {tab === 'funds' && (
            <>
              <div className="section-heading">
                <span className="muted">每场活动的费用，都清清楚楚</span>
                <Pill warm>
                  {live ? '人工收款与退款记录' : '模拟资金 · 无真实交易'}
                </Pill>
              </div>
              <div className="fund-summary">
                <div>
                  <span>已核实缴费</span>
                  <strong>
                    ¥
                    {money(
                      bills.reduce(
                        (n, m) => n + (m.payments[s.role]?.paid || 0),
                        0,
                      ),
                    )}
                  </strong>
                </div>
                <div>
                  <span>押金与费用已退</span>
                  <strong>
                    ¥
                    {money(
                      bills.reduce(
                        (n, m) => n + (m.payments[s.role]?.refunded || 0),
                        0,
                      ),
                    )}
                  </strong>
                </div>
              </div>
              {bills.length ? (
                bills.map((m) => (
                  <button
                    className="panel native-activity-summary"
                    key={m.id}
                    onClick={() => openActivity(m, 'funds')}
                  >
                    <div className="row between">
                      <h3>
                        {sportEmoji(m.sport)} {m.sport}
                      </h3>
                      <ChevronRight size={16} />
                    </div>
                    <p className="muted">
                      {dateLabel(m.booking!.start)}{' '}
                      {timeLabel(m.booking!.start)}–{timeLabel(m.booking!.end)}
                    </p>
                    <div className="divider" />
                    <div className="row between">
                      <Pill warm>{status(s, m)}</Pill>
                      <span className="muted">
                        押金 ¥{money(refundDue(m, s.role))}
                      </span>
                    </div>
                    <p className="native-hint">
                      已收 ¥{money(m.payments[s.role].paid)}　已退 ¥
                      {money(m.payments[s.role].refunded)}
                    </p>
                  </button>
                ))
              ) : (
                <Blank title="这里还没有资金记录">
                  确认场地后，每场活动的费用会显示在这里。
                </Blank>
              )}
              <Ledger s={s} all={false} />
            </>
          )}
          {tab === 'notices' && (
            <>
              <div className="section-heading">
                <span className="muted">邀约与活动进展</span>
                <Button variant="ghost" onClick={() => act({ type: 'read' })}>
                  <CheckCheck />
                  全部已读
                </Button>
              </div>
              <div className="panel notice-list">
                {s.notices.filter((n) => n.to === s.role).length ? (
                  s.notices
                    .filter((n) => n.to === s.role)
                    .map((n) => (
                      <button
                        className="notice-item"
                        key={n.id}
                        onClick={() => {
                          act({ type: 'read' });
                          setTab(isAdmin ? 'admin' : 'activities');
                        }}
                      >
                        <span
                          className={`notice-dot ${n.read ? 'read' : ''}`}
                        />
                        <div>
                          <strong>{n.title}</strong>
                          <p>{n.text}</p>
                          <small>
                            {dateLabel(n.at)} {timeLabel(n.at)}
                          </small>
                        </div>
                        <ChevronRight size={15} />
                      </button>
                    ))
                ) : (
                  <Blank title="还没有新消息">
                    邀约、场地与退款有进展时，会在这里通知你。
                  </Blank>
                )}
              </div>
            </>
          )}
          {tab === 'rules' && (
            <>
              <div className="section-heading">
                <h2>相约之前，说清楚</h2>
                <ShieldCheck size={20} />
              </div>
              <div className="panel rules">
                {RULES.map(([title, text], i) => (
                  <section key={title}>
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>
                        {live && i === 5
                          ? '场地费按参与人数分摊，履约押金单独记录。场地方案中的金额为总场地费，每人另付一份与分摊费用相近的押金。请添加管家微信人工预订；实际转账后提交登记，收款、退款都由管家核实凭据。'
                          : live && i === 9
                            ? '人物虚拟形象由自拍生成，可在注册和编辑资料时设置。只有你明确同意并提交后，才会调用生成服务；其他球友不会看到原始自拍。'
                            : text}
                      </p>
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
          {tab === 'admin' && (
            <>
              <div className="section-heading">
                <span className="muted">安排场地 · 核实缴费 · 处理退款</span>
                <Pill>{live ? '同好管家' : '演示管理员'}</Pill>
              </div>
              <Tabs
                value={adminTab}
                onValueChange={(v) => setAdminTab(v as string)}
              >
                <TabsList className="sub-tabs">
                  <TabsTrigger value="todo">活动待办</TabsTrigger>
                  <TabsTrigger value="money">资金与退款</TabsTrigger>
                  <TabsTrigger value="matching">匹配运行</TabsTrigger>
                </TabsList>
              </Tabs>
              {adminTab === 'matching' ? (
                <div className="panel">
                  <h2>让资源持续相遇</h2>
                  <div className="form-grid">
                    <Field label="后台匹配频率">
                      <NativeSelect
                        value={s.interval}
                        onChange={(e) =>
                          act({
                            type: 'interval',
                            minutes: Number(e.target.value),
                          })
                        }
                      >
                        <NativeSelectOption value={60}>
                          每 1 小时
                        </NativeSelectOption>
                        <NativeSelectOption value={120}>
                          每 2 小时
                        </NativeSelectOption>
                      </NativeSelect>
                    </Field>
                    <div className="next-run">
                      <span>下一轮匹配</span>
                      <strong>
                        {dateLabel(s.nextRun)} {timeLabel(s.nextRun)}
                      </strong>
                    </div>
                  </div>
                  <Button onClick={() => act({ type: 'run' })}>
                    <RefreshCw />
                    运行本轮匹配
                  </Button>
                  <p className="footnote">
                    {live
                      ? s.lastScheduledAt
                        ? `最近后台检查：${dateLabel(s.lastScheduledAt)} ${timeLabel(s.lastScheduledAt)}。匹配按所设频率运行，活动结束自动创建退款待办。`
                        : '后台定时触发尚待验证。你也可以运行本轮匹配，页面进入时会同步状态。'
                      : '网页以演示时钟运行；关闭网页后不执行任务。正式小程序由后台定时任务读取数据库。'}
                  </p>
                  <div className="run-log">
                    {s.runs.slice(0, 10).map((r, i) => (
                      <div key={i}>
                        <span>
                          {dateLabel(r.at)} {timeLabel(r.at)}
                        </span>
                        <strong>新增 {r.count} 个邀约</strong>
                        <Pill>已完成</Pill>
                      </div>
                    ))}
                  </div>
                </div>
              ) : adminTab === 'money' ? (
                <>
                  <div className="fund-summary">
                    <div>
                      <span>{live ? '累计实收' : '模拟累计实收'}</span>
                      <strong>
                        ¥
                        {money(
                          s.ledger
                            .filter((x) => x.amount > 0)
                            .reduce((n, x) => n + x.amount, 0),
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>{live ? '累计退款' : '模拟累计退款'}</span>
                      <strong>
                        ¥
                        {money(
                          -s.ledger
                            .filter((x) => x.amount < 0)
                            .reduce((n, x) => n + x.amount, 0),
                        )}
                      </strong>
                    </div>
                  </div>
                  {s.matches
                    .filter((m) => m.booking)
                    .map((m) => (
                      <AdminFunds key={m.id} s={s} m={m} act={act} />
                    ))}
                  <Ledger s={s} all />
                </>
              ) : (
                <>
                  {s.matches
                    .filter((m) => ['arranging', 'venue'].includes(m.stage))
                    .map((m) => (
                      <div className="panel" key={m.id}>
                        <div className="row between">
                          <h2>
                            待安排 ·{' '}
                            {m.members
                              .map((u) => s.profiles[u].name)
                              .join(' / ')}
                          </h2>
                          <Pill>{m.sport}</Pill>
                        </div>
                        <Countdown s={s} m={m} />
                        <AdminVenue key={m.id} s={s} m={m} act={act} />
                      </div>
                    ))}
                  {s.matches
                    .filter(
                      (m) =>
                        m.booking &&
                        ['booked', 'refund', 'ended', 'cancelled'].includes(
                          m.stage,
                        ),
                    )
                    .map((m) => (
                      <AdminFunds key={m.id} s={s} m={m} act={act} />
                    ))}
                  {s.matches
                    .filter((m) => m.decline && !m.decline.reviewed)
                    .map((m) => (
                      <div className="panel" key={m.id}>
                        <h3>
                          婉拒原因待审核 · {s.profiles[m.decline!.by].name}
                        </h3>
                        <p className="muted">{m.decline!.reason}</p>
                        <div className="row form-actions">
                          <Button
                            onClick={() =>
                              act({
                                type: 'reviewDecline',
                                id: m.id,
                                penalty: false,
                              })
                            }
                          >
                            理由成立，不扣分
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              act({
                                type: 'reviewDecline',
                                id: m.id,
                                penalty: true,
                              })
                            }
                          >
                            理由不成立，扣 1 分
                          </Button>
                        </div>
                      </div>
                    ))}
                  {!s.matches.some(
                    (m) =>
                      [
                        'arranging',
                        'venue',
                        'booked',
                        'refund',
                        'ended',
                        'cancelled',
                      ].includes(m.stage) ||
                      (m.decline && !m.decline.reviewed),
                  ) && (
                    <Blank title="这一刻，暂无待办">
                      球友双方同意后，订场任务会自动出现在这里。
                    </Blank>
                  )}
                </>
              )}
            </>
          )}
        </section>
        {tab === 'demo' && (
          <section className="control-panel" id="demo-controls">
            <div className="native-note">
              <p>
                演示工具只改变本浏览器中的虚构数据，可用来验证双方确认、自动退款与异常场景。
              </p>
            </div>
            <Button
              className="wide"
              variant="secondary"
              onClick={() => setTab('accounts')}
            >
              切换演示账号
            </Button>
            <div className="divider" />
            <div className="row between">
              <h3>一场相约，完整走一遍</h3>
              <span className="tiny-label">4 STEPS</span>
            </div>
            <ol className="journey">
              <li>
                <span>01</span>
                <button
                  onClick={() => {
                    switchRole('new');
                  }}
                >
                  <strong>从自我介绍开始</strong>
                  <small>真实资料、自拍形象、兴趣与空闲</small>
                </button>
              </li>
              <li>
                <span>02</span>
                <button
                  onClick={() => {
                    switchRole('lin');
                    setTab('discover');
                  }}
                >
                  <strong>找到球友，选上空闲</strong>
                  <small>双方多选时间，同意邀约</small>
                </button>
              </li>
              <li>
                <span>03</span>
                <button onClick={() => switchRole('admin')}>
                  <strong>管家订场，双方确认</strong>
                  <small>3 小时确认时限，费用分别登记</small>
                </button>
              </li>
              <li>
                <span>04</span>
                <button
                  onClick={() => {
                    setTab(isAdmin ? 'admin' : 'activities');
                    if (isAdmin) setAdminTab('money');
                  }}
                >
                  <strong>到点退款，再次相约</strong>
                  <small>自动进入退款中，管家处理待办</small>
                </button>
              </li>
            </ol>
            {next && (
              <button
                className="next-action"
                onClick={() => {
                  setTab(isAdmin ? 'admin' : 'activities');
                }}
              >
                继续当前活动 <ArrowRight size={15} />
              </button>
            )}
            <div className="divider" />
            <div className="row between">
              <h3>演示时钟</h3>
              <Clock3 size={15} />
            </div>
            <p className="demo-clock">
              {dateLabel(s.now)} <strong>{timeLabel(s.now)}</strong>
            </p>
            <div className="control-actions">
              <Button variant="outline" onClick={() => act({ type: 'run' })}>
                <RefreshCw />
                立即匹配
              </Button>
              <Button
                variant="outline"
                onClick={() => act({ type: 'advance', hours: 2 })}
              >
                <FastForward />
                快进 2 小时
              </Button>
              <Button
                variant="secondary"
                className="wide"
                onClick={() => act({ type: 'advance', target: 'end' })}
              >
                <FastForward />
                快进到活动结束
              </Button>
            </div>
            <details className="scenarios">
              <summary>
                快速载入演示场景 <Plus size={14} />
              </summary>
              <button
                onClick={() => chooseModal('scenario', undefined, 'refund')}
              >
                活动与退款 <ArrowUpRight size={14} />
              </button>
              <button
                onClick={() => chooseModal('scenario', undefined, 'timeout')}
              >
                最后确认超时 <ArrowUpRight size={14} />
              </button>
              <button
                onClick={() => chooseModal('scenario', undefined, 'full')}
              >
                旧邀约被约满 <ArrowUpRight size={14} />
              </button>
              <button
                onClick={() => chooseModal('scenario', undefined, 'cancel')}
              >
                临时取消与费用责任 <ArrowUpRight size={14} />
              </button>
            </details>
            <p className="footnote">
              独立演示数据保存在当前浏览器；不接入真实账户。付款、退款、订场与头像均为流程模拟。
            </p>
            <Button
              variant="ghost"
              className="reset"
              onClick={() => chooseModal('reset')}
            >
              <RefreshCw size={13} />
              重置本页演示
            </Button>
          </section>
        )}
      </div>
      {mainPage && (
        <nav className="mini-tabbar" aria-label="小程序主导航">
          <Tabs
            value={tab}
            onValueChange={(v) =>
              setTab(entered || v === 'discover' ? (v as string) : 'accounts')
            }
          >
            <TabsList className="mini-tabs">
              {tabs.map((t, i) => (
                <TabsTrigger value={t} key={t}>
                  <img
                    alt=""
                    src={`/miniapp/${['compass', 'calendar', 'message', 'user'][i]}${tab === t ? '-active' : ''}.svg`}
                  />
                  <span>{labels[t]}</span>
                  {t === 'notices' && unread > 0 && (
                    <b className="mini-unread">{unread}</b>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </nav>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
          <button aria-label="关闭提示" onClick={() => setToast('')}>
            <X size={15} />
          </button>
        </div>
      )}
      <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="app-dialog">
          <DialogTitle>
            {modal?.type === 'decline'
              ? '这次先不了，告诉我们原因'
              : modal?.type === 'cancel'
                ? '临时有事，申请取消'
                : modal?.type === 'reset'
                  ? '重新开始这次体验？'
                  : '载入一个完整演示场景'}
          </DialogTitle>
          <DialogDescription>
            {modal?.type === 'decline'
              ? '本周尚未同意其他邀约，需要填写原因，由管家审核。'
              : modal?.type === 'cancel'
                ? '请尽快提交。若场地无法取消，由发起取消方承担全额场地费；临时取消扣 1 分信誉分。活动结束后不可申请取消。'
                : '将替换当前浏览器里的模拟进度，不影响小程序和真实数据。'}
          </DialogDescription>
          {['decline', 'cancel'].includes(modal?.type || '') && (
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请填写原因（2–160 字）"
              maxLength={160}
            />
          )}
          <div className="row">
            <Button variant="outline" onClick={() => setModal(null)}>
              返回
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                if (modal?.type === 'reset') {
                  dispatch({ type: 'restore', state: initialState() });
                  setDrafts({});
                  setTab('discover');
                  setIndex(0);
                  setModal(null);
                } else if (modal?.type === 'scenario') {
                  act({ type: 'scenario', name: modal.name });
                  setDrafts({});
                  setIndex(0);
                  setTab(
                    modal.name === 'full'
                      ? 'discover'
                      : isAdmin
                        ? 'admin'
                        : 'activities',
                  );
                  setModal(null);
                } else if (modal)
                  closeAction({
                    type: modal.type,
                    id: modal.match?.id,
                    reason,
                  });
              }}
            >
              {modal?.type === 'reset'
                ? '重置演示'
                : modal?.type === 'scenario'
                  ? '载入场景'
                  : '提交申请'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
function Ledger({ s, all }: { s: State; all: boolean }) {
  const list = s.ledger.filter((e) => all || e.user === s.role);
  return (
    <div className="panel ledger">
      <div className="row between">
        <h3>资金流水</h3>
        <span className="muted">{list.length} 笔记录</span>
      </div>
      {!list.length ? (
        <p className="footnote">核实收款或登记退款后，记录将在这里出现。</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>类型 / 球友</th>
                <th>时间</th>
                <th>金额</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.kind}</strong>
                    <small>
                      {s.profiles[e.user].name} · {e.match}
                    </small>
                  </td>
                  <td>
                    {dateLabel(e.at)} {timeLabel(e.at)}
                  </td>
                  <td className={e.amount < 0 ? 'refund-amount' : ''}>
                    {e.amount > 0 ? '+' : '−'}¥{money(Math.abs(e.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
function AdminFunds({
  s,
  m,
  act,
}: {
  s: State;
  m: Match;
  act: (a: Action) => Promise<State | undefined>;
}) {
  const [references, setReferences] = useState<Record<string, string>>({});
  return (
    <div className="panel admin-funds">
      <div className="row between">
        <h2>{m.members.map((u) => s.profiles[u].name).join(' / ')}</h2>
        <Pill warm>
          {m.stage === 'booked'
            ? '已订场'
            : m.stage === 'cancelled'
              ? '取消结算'
              : m.stage === 'ended'
                ? '押金已全部退清'
                : m.checked
                  ? '待退清押金'
                  : '押金退款待办'}
        </Pill>
      </div>
      <p className="muted">
        {m.sport} ·{' '}
        {m.booking &&
          `${dateLabel(m.booking.start)} ${timeLabel(m.booking.start)}–${timeLabel(m.booking.end)}`}
      </p>
      {m.members.map((u) => {
        const p = m.payments[u];
        const remain = Math.max(0, refundDue(m, u) - p.refunded);
        return (
          <div className="admin-user-row" key={u}>
            <Avatar p={s.profiles[u]} small />
            <div className="flex-1">
              <strong>{s.profiles[u].name}</strong>
              <small>
                {p.verified
                  ? `实收 ¥${money(p.paid)}`
                  : p.submitted
                    ? '付款已登记，待核实'
                    : '尚未登记付款'}
                {['refund', 'ended', 'cancelled'].includes(m.stage) &&
                  ` · 已退 ¥${money(p.refunded)} / 待退 ¥${money(remain)}`}
              </small>
              {s.live && (
                <>
                  {p.proof && <p className="phone-help">付款说明：{p.proof}</p>}
                  <Input
                    aria-label={`${s.profiles[u].name}的收退款凭据`}
                    placeholder="实际转账单号或核实说明"
                    maxLength={300}
                    value={references[u] || ''}
                    onChange={(e) =>
                      setReferences({ ...references, [u]: e.target.value })
                    }
                  />
                </>
              )}
            </div>
            {!p.verified ? (
              <Button
                size="sm"
                disabled={
                  !p.submitted ||
                  (!!s.live && (references[u] || '').trim().length < 4)
                }
                onClick={() =>
                  act({
                    type: 'verify',
                    id: m.id,
                    user: u,
                    reference: references[u],
                  })
                }
              >
                核实收款
              </Button>
            ) : ['refund', 'ended', 'cancelled'].includes(m.stage) &&
              remain > 0 ? (
              <div className="row">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    !!refundBlock(m) ||
                    (!!s.live && (references[u] || '').trim().length < 4)
                  }
                  onClick={() =>
                    act({
                      type: 'refund',
                      id: m.id,
                      user: u,
                      amount: Math.ceil(remain / 2),
                      reference: references[u],
                    })
                  }
                >
                  退一半
                </Button>
                <Button
                  size="sm"
                  disabled={
                    !!refundBlock(m) ||
                    (!!s.live && (references[u] || '').trim().length < 4)
                  }
                  onClick={() =>
                    act({
                      type: 'refund',
                      id: m.id,
                      user: u,
                      amount: remain,
                      reference: references[u],
                    })
                  }
                >
                  退清
                </Button>
              </div>
            ) : (
              <CheckCircle2 size={18} />
            )}
            {s.live &&
              m.stage === 'cancelled' &&
              !m.cancel?.refundable &&
              m.cancel?.by === u &&
              p.paid < (m.booking?.price || 0) && (
                <Button
                  disabled={(references[u] || '').trim().length < 4}
                  onClick={() =>
                    act({
                      type: 'supplement',
                      id: m.id,
                      user: u,
                      amount: m.booking!.price - p.paid,
                      reference: references[u],
                    })
                  }
                >
                  登记补缴 ¥{money(m.booking!.price - p.paid)}
                </Button>
              )}
          </div>
        );
      })}
      {['refund', 'ended'].includes(m.stage) && !m.checked && (
        <>
          <div className="notice">
            {refundBlock(m)}。系统已创建每位球友的退款待办。
          </div>
          <Button
            disabled={!m.members.every((u) => m.payments[u].verified)}
            onClick={() => act({ type: 'check', id: m.id })}
          >
            核实活动已完成，允许退款
          </Button>
        </>
      )}
      {m.cancel && !m.cancel.reviewed && (
        <div className="cancel-review">
          <h3>临时取消待审核</h3>
          <p>
            {s.profiles[m.cancel.by].name}：{m.cancel.reason}
          </p>
          <div className="row wrap">
            <Button
              onClick={() =>
                act({ type: 'reviewCancel', id: m.id, refundable: false })
              }
            >
              场地无法取消 · 取消方承担全额
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                act({ type: 'reviewCancel', id: m.id, refundable: true })
              }
            >
              场地可取消 · 按实收退回
            </Button>
          </div>
          <p className="footnote">
            审核后取消方扣 1 分。需先核实已收款，再办理结算。
          </p>
        </div>
      )}
      {m.cancel?.reviewed && (
        <div className="notice">
          {s.profiles[m.cancel.by].name}信誉减 1。
          {m.cancel.refundable
            ? '场地可取消，本场景实收全额退回。'
            : `场地不可取消，发起方承担 ¥${money(m.booking?.price || 0)}；已付费用抵扣，其他球友退回实收金额。`}
        </div>
      )}
    </div>
  );
}
