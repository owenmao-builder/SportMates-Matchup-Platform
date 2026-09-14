'use client';
import { useEffect, useState } from 'react';
import { Camera, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export function AvatarGenerator({
  onGenerated,
}: {
  onGenerated: (avatar: string) => void;
}) {
  const [photo, setPhoto] = useState(''),
    [style, setStyle] = useState('clay'),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [result, setResult] = useState(''),
    [requestId, setRequestId] = useState('');
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    fetch('/api/club/avatar/current', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data: any) => {
        setEnabled(data.enabled === true);
        if (data.job?.status === 'processing') {
          setError('上一张形象仍在生成，请稍后重新打开本页查看。');
        }
        if (data.job?.avatar) {
          setResult(data.job.avatar);
          onGenerated(data.job.avatar);
        }
      })
      .catch(() => setError('暂时无法读取生成服务，请稍后重试'));
  }, []);
  async function choose(file?: File) {
    if (!file) return;
    setError('');
    if (file.size > 10 * 1024 * 1024) {
      setError('请选择 10 MB 以内的照片');
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (image.width < 128 || image.height < 128)
        throw new Error('请选择清晰、尺寸至少 128 像素的自拍');
      const scale = Math.min(1, 1536 / Math.max(image.width, image.height)),
        canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas
        .getContext('2d')!
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      setPhoto(canvas.toDataURL('image/jpeg', 0.88));
      setRequestId(crypto.randomUUID());
      setResult('');
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : '照片无法读取，请换一张 JPG 或 PNG 自拍',
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  async function generate() {
    if (!consent) {
      setError('请先同意使用自拍生成形象');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/club/avatar', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo, style, consent, requestId }),
      });
      const data: any = await response.json();
      if (!response.ok) throw new Error(data.error || '生成暂不可用');
      setResult(data.avatar);
      setPhoto('');
      onGenerated(data.avatar);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : '连接中断。请稍后重新打开本页查看结果，勿重复提交。',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="avatar-editor live-avatar">
      <h3>用自拍生成虚拟形象</h3>
      <p className="phone-help">保留你的五官与气质，生成专属人物头像。</p>
      <label className="upload-box">
        {photo ? (
          <img src={photo} alt="待生成的自拍" />
        ) : result ? (
          <img src={result} alt="已生成的虚拟形象" />
        ) : (
          <>
            <Camera />
            <span>选择一张自拍</span>
          </>
        )}
        <input
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(e) => void choose(e.target.files?.[0])}
        />
      </label>
      <div className="row wrap">
        {[
          ['clay', '半写实 3D'],
          ['ink', '清爽插画'],
        ].map(([value, label]) => (
          <Button
            key={value}
            variant={style === value ? 'secondary' : 'outline'}
            disabled={busy}
            aria-pressed={style === value}
            onClick={() => {
              setStyle(value);
              setRequestId(crypto.randomUUID());
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      <label className="avatar-consent">
        <Checkbox
          checked={consent}
          onCheckedChange={(v) => setConsent(!!v)}
          disabled={busy}
        />
        <span>
          我同意将本人自拍提交给火山方舟生成虚拟形象。原始自拍不在本网站保存，生成的头像用于我的资料展示。
        </span>
      </label>
      {enabled === false && (
        <p className="phone-help">生成服务暂未开启，可以先保存其他资料。</p>
      )}
      {error && (
        <p className="phone-error" role="alert">
          {error}
        </p>
      )}
      <Button
        disabled={!photo || !consent || busy || enabled !== true}
        onClick={() => void generate()}
      >
        <Sparkles />
        {busy ? '正在生成，请稍候…' : '生成我的虚拟形象'}
      </Button>
      {result && <p className="phone-help">虚拟形象已保存到你的账号。</p>}
      <p className="phone-help">
        每天最多生成 3 次。生成可能需要几分钟，请保留页面。
      </p>
    </div>
  );
}
