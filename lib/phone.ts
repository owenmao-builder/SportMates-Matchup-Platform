/** Format validation only. This does not verify ownership or send an SMS. */
export function validatePhone(raw: string): { phone: string; error: string } {
  const phone = raw
    .trim()
    .replace(/[０-９]/g, (digit) =>
      String.fromCharCode(digit.charCodeAt(0) - 0xfee0),
    )
    .replace(/[\s-]/g, '')
    .replace(/^(\+86|0086)/, '');
  if (!phone) return { phone, error: '请填写手机号' };
  if (!/^\d+$/.test(phone))
    return { phone, error: '手机号只能包含数字，请检查是否输入了字母或符号' };
  if (phone.length !== 11)
    return { phone, error: `手机号应为 11 位，你输入了 ${phone.length} 位` };
  if (!phone.startsWith('1'))
    return { phone, error: '中国大陆手机号应以 1 开头' };
  if (!/^1[3-9]\d{9}$/.test(phone))
    return { phone, error: '手机号第二位应为 3–9，请检查号码' };
  return { phone, error: '' };
}
