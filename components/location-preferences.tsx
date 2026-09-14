'use client';
import { useEffect, useRef, useState } from 'react';
import { MapPin, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { hasCoordinates, type PreferredLocation } from '@/lib/locations';

export function LocationPreferences({
  value,
  onChange,
  onBusyChange,
}: {
  value: PreferredLocation[];
  onChange: (value: PreferredLocation[]) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const rows = value.length ? value : [{ address: '' }];
  const [locating, setLocating] = useState<number | null>(null);
  const [error, setError] = useState('');
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  const update = (index: number, location: PreferredLocation) => {
    onChange(rows.map((item, i) => (i === index ? location : item)));
  };
  const locate = (index: number) => {
    setError('');
    if (!navigator.geolocation) {
      setError('当前浏览器不支持定位，可以先手动填写地址。');
      return;
    }
    const id = ++request.current;
    setLocating(index);
    onBusyChange(true);
    const finish = () => {
      setLocating(null);
      onBusyChange(false);
    };
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (request.current !== id) return;
        finish();
        if (!Number.isFinite(coords.accuracy) || coords.accuracy > 3000) {
          setError(
            '本次定位误差较大，请开启手机精确定位后重试；已填写的地址会保留。',
          );
          return;
        }
        update(index, {
          address: rows[index].address.trim() || '我的当前位置',
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: Math.round(coords.accuracy),
        });
      },
      (reason) => {
        if (request.current !== id) return;
        finish();
        setError(
          reason.code === 1
            ? '未获得定位权限。可在浏览器设置中允许定位，或继续手动填写地址。'
            : reason.code === 3
              ? '定位超时，请稍后重试；已填写的地址会保留。'
              : '暂时无法获取位置，请检查手机定位服务，或手动填写地址。',
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };
  return (
    <section className="location-preferences" aria-label="详细地点与定位">
      <div>
        <h3>详细地点 · 可填写多个</h3>
        <p className="muted">
          填写场馆、小区或完整地址。详细地址和定位仅本人及管家可见。
        </p>
      </div>
      {rows.map((location, index) => (
        <div className="location-card" key={index}>
          <div className="row between">
            <label htmlFor={`preferred-location-${index}`}>
              地点 {index + 1}
            </label>
            {(location.address || rows.length > 1) && (
              <Button
                variant="ghost"
                size="sm"
                disabled={locating !== null}
                aria-label={`删除地点 ${index + 1}`}
                onClick={() => {
                  setError('');
                  onChange(rows.filter((_, i) => i !== index));
                }}
              >
                <X size={16} />
              </Button>
            )}
          </div>
          <Input
            id={`preferred-location-${index}`}
            placeholder="如：上海市徐汇区漕溪北路某某球馆"
            maxLength={160}
            value={location.address}
            disabled={locating !== null}
            onChange={(event) => {
              setError('');
              update(index, { address: event.target.value });
            }}
          />
          <div className="location-actions">
            <Button
              variant="outline"
              size="sm"
              disabled={locating !== null}
              onClick={() => locate(index)}
            >
              <MapPin size={15} />
              {locating === index
                ? '正在定位…'
                : hasCoordinates(location)
                  ? '重新获取当前位置'
                  : '使用当前位置'}
            </Button>
            {hasCoordinates(location) && (
              <Button
                variant="ghost"
                size="sm"
                disabled={locating !== null}
                onClick={() => update(index, { address: location.address })}
              >
                清除定位
              </Button>
            )}
          </div>
          {hasCoordinates(location) && (
            <p className="location-status" role="status">
              已定位 · 误差约 {Math.round(location.accuracy || 0)} 米<br />
              <span>
                纬度 {location.latitude.toFixed(6)} · 经度{' '}
                {location.longitude.toFixed(6)}
              </span>
            </p>
          )}
        </div>
      ))}
      {rows.length < 5 && (
        <Button
          variant="outline"
          disabled={locating !== null || !rows[rows.length - 1].address.trim()}
          onClick={() => onChange([...rows, { address: '' }])}
        >
          <Plus size={15} />
          再添加一个地点
        </Button>
      )}
      <p className="muted">
        “使用当前位置”会读取你此刻的位置，请在目标地点使用。修改地址后需重新定位。
      </p>
      <p className="muted">
        定位后优先按地点与可接受距离匹配。只填地址时，请同时选择大致区域；未选择区域的地址仅能匹配相同地址。
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
