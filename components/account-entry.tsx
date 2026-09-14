'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { validatePhone } from '@/lib/phone';
import type { State } from '@/lib/demo';

export function AccountEntry({
  onSignedIn,
  onRules,
  admin = false,
}: {
  onSignedIn: (s: State) => void;
  onRules: () => void;
  admin?: boolean;
}) {
  const [register, setRegister] = useState(false),
    [phone, setPhone] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false),
    [error, setError] = useState(''),
    [phoneError, setPhoneError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const checked = validatePhone(phone);
    if (!admin && checked.error) {
      setPhoneError(checked.error);
      document.getElementById('account-phone')?.focus();
      return;
    }
    if (
      register &&
      (password.length < 10 ||
        !/[A-Za-z]/.test(password) ||
        !/[0-9]/.test(password))
    ) {
      setError('密码至少 10 位，需要包含字母和数字');
      return;
    }
    if (register && password !== confirm) {
      setError('两次输入的密码不一致');
      return;
    }
    if (!agreed) {
      setError('请先阅读并同意活动规则与隐私说明');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(
        `/api/club/auth/${register ? 'register' : 'login'}`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: admin ? 'admin' : checked.phone,
            password,
            agreed,
          }),
        },
      );
      const result: any = await response.json();
      if (!response.ok)
        throw new Error(result.error || '暂时无法登录，请稍后重试');
      setPassword('');
      setConfirm('');
      onSignedIn(result.state);
    } catch (error) {
      setError(error instanceof Error ? error.message : '网络异常，请重试');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="phone-entry account-entry" onSubmit={submit} noValidate>
      {!admin && (
        <div className="account-mode">
          <button
            type="button"
            className={!register ? 'selected' : ''}
            onClick={() => {
              setRegister(false);
              setError('');
            }}
          >
            登录
          </button>
          <button
            type="button"
            className={register ? 'selected' : ''}
            onClick={() => {
              setRegister(true);
              setError('');
            }}
          >
            新用户注册
          </button>
        </div>
      )}
      {admin ? (
        <p className="phone-help">管家专用入口 · 请使用管理员密码</p>
      ) : (
        <>
          <label htmlFor="account-phone">手机号</label>
          <div className={`phone-input-wrap ${phoneError ? 'has-error' : ''}`}>
            <span>+86</span>
            <Input
              id="account-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              aria-required="true"
              aria-invalid={!!phoneError}
              aria-describedby="account-phone-error"
              placeholder="请输入 11 位手机号"
              value={phone}
              onBlur={() => setPhoneError(validatePhone(phone).error)}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError)
                  setPhoneError(validatePhone(e.target.value).error);
              }}
            />
          </div>
          <p
            id="account-phone-error"
            className="phone-error"
            aria-live="polite"
          >
            {phoneError}
          </p>
        </>
      )}
      <label htmlFor="account-password">密码</label>
      <Input
        id="account-password"
        type="password"
        autoComplete={register ? 'new-password' : 'current-password'}
        placeholder={register ? '至少 10 位，包含字母和数字' : '请输入登录密码'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        aria-required="true"
      />
      {register && (
        <>
          <label className="spaced-label" htmlFor="account-confirm">
            再次输入密码
          </label>
          <Input
            id="account-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-required="true"
          />
        </>
      )}
      <div className="account-consent">
        <Checkbox
          id="account-agreed"
          checked={agreed}
          onCheckedChange={(v) => setAgreed(!!v)}
        />
        <label htmlFor="account-agreed">我已阅读并同意</label>
        <button type="button" onClick={onRules}>
          活动规则与隐私说明
        </button>
      </div>
      {error && (
        <p className="phone-error" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" className="wide" disabled={busy}>
        {busy
          ? '正在连接…'
          : register
            ? '创建账号，开始自我介绍'
            : '登录同好会'}
      </Button>
      <p className="phone-help">
        无需 ChatGPT
        账号。手机号用作登录账号，目前仅检查格式，未接入短信验证；请妥善保管密码。
      </p>
    </form>
  );
}
