'use client';
import { useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { validatePhone } from '@/lib/phone';

export function PhoneEntry({ onContinue }: { onContinue: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  return (
    <form
      className="phone-entry"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const result = validatePhone(value);
        setTouched(true);
        setError(result.error);
        if (result.error) inputRef.current?.focus();
        if (!result.error) {
          setValue('');
          onContinue();
        }
      }}
    >
      <label htmlFor="entry-phone">手机号</label>
      <div className={`phone-input-wrap ${error ? 'has-error' : ''}`}>
        <span>+86</span>
        <Input
          ref={inputRef}
          aria-required="true"
          id="entry-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="请输入 11 位手机号"
          value={value}
          aria-invalid={!!error}
          aria-describedby="entry-phone-message entry-phone-help"
          onBlur={() => {
            setTouched(true);
            setError(validatePhone(value).error);
          }}
          onChange={(event) => {
            setValue(event.target.value);
            if (touched) setError(validatePhone(event.target.value).error);
          }}
        />
      </div>
      <p id="entry-phone-message" className="phone-error" aria-live="polite">
        {error}
      </p>
      <Button className="wide" type="submit">
        检查并开始体验 <ArrowRight size={18} />
      </Button>
      <p id="entry-phone-help" className="phone-help">
        仅检查号码格式，不发送验证码。演示不会上传或保存你的手机号。
      </p>
    </form>
  );
}
