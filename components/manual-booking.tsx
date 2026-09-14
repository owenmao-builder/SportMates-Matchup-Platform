'use client';
import { useState } from 'react';
import { MessageCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { manualBookingContact } from '@/lib/manual-booking';
import {
  dateLabel,
  timeLabel,
  money,
  feeShare,
  refundDue,
  type State,
  type Match,
} from '@/lib/demo';

export function ManualBooking({
  s,
  m,
  onRegister,
}: {
  s: State;
  m: Match;
  onRegister: (proof: string) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [proof, setProof] = useState('');
  if (!m.booking || !m.members.includes(s.role)) return null;
  const venue = m.booking;
  const payment = m.payments[s.role];
  return (
    <div className="manual-booking">
      <div className="panel">
        <MessageCircle size={30} />
        <h2>场次已选好，人工协助预订</h2>
        <p className="booking-explanation">
          暂时无法集成外部预订平台，可添加好友后人工预订。场地库存与最终费用以人工确认为准。
        </p>
        <div className="booking-order">
          <span>
            活动编号 <strong>{m.id.toUpperCase()}</strong>
          </span>
          <strong>{venue.name}</strong>
          <span>
            {dateLabel(venue.start)} · {timeLabel(venue.start)}–
            {timeLabel(venue.end)}
          </span>
          <span>
            {m.sport} ·{' '}
            {m.members.map((role) => s.profiles[role].name).join('、')}
          </span>
        </div>
        <p className="booking-explanation">
          双方选择一致后仍需确认场地库存。添加好友时请告知活动编号、时间和场地，由管家协助预订。
        </p>
        {!manualBookingContact.qrSrc && (
          <p className="booking-explanation" role="status">
            预订联系方式尚未配置，请联系本平台管理员确认场地与付款方式。
          </p>
        )}
        {manualBookingContact.qrSrc && (
          <div className="booking-contact">
            <h3>添加微信好友</h3>
            {!imageFailed ? (
              <img
                className="wechat-friend-qr"
                src={manualBookingContact.qrSrc}
                alt={`${manualBookingContact.label}的微信好友二维码`}
                onError={() => setImageFailed(true)}
              />
            ) : (
              <p role="alert">二维码暂时无法加载，请重新打开原图。</p>
            )}
            <a
              className="booking-image-link"
              href={manualBookingContact.qrSrc}
              target="_blank"
              rel="noreferrer"
            >
              打开二维码原图
            </a>
            <p>长按图片保存，再打开微信 → 扫一扫 → 相册，识别后添加好友。</p>
            <small>
              这是添加好友的二维码，不是收款码。查看图片不会提交付款。
            </small>
          </div>
        )}
      </div>
      <div className="panel">
        <h3>我的费用与押金</h3>
        <div className="booking-amounts">
          <span>
            场地费 <strong>¥{money(feeShare(m, s.role))}</strong>
          </span>
          <span>
            履约押金 <strong>¥{money(refundDue(m, s.role))}</strong>
          </span>
          <span>
            合计{' '}
            <strong>
              ¥{money(feeShare(m, s.role) + refundDue(m, s.role))}
            </strong>
          </span>
        </div>
        <p className="phone-help">
          {s.live
            ? '请先联系管家确认场地、金额和付款方式，再实际付款并登记转账说明。提交后需管家核实，才会记录实收款。'
            : '当前为演示流程，请勿按演示金额转账。提交登记后仍需管家核实，才会记录实收款。'}
        </p>
        {!payment?.submitted && ['booked', 'refund'].includes(m.stage) ? (
          <>
            {s.live && (
              <label className="booking-proof">
                转账说明
                <Input
                  value={proof}
                  onChange={(e) => setProof(e.target.value)}
                  maxLength={300}
                  placeholder="例如付款人、转账时间或转账单号"
                />
              </label>
            )}
            <Button
              className="wide"
              disabled={!!s.live && proof.trim().length < 4}
              onClick={() => onRegister(proof)}
            >
              {s.live ? '我已付款，提交登记' : '模拟已付款，提交登记'}
            </Button>
          </>
        ) : payment?.submitted ? (
          <div className="payment-status">
            <CheckCircle2 size={18} />
            {payment.verified ? '付款已核实' : '付款已登记，待管家核实'}
          </div>
        ) : (
          <p>本次活动已结束。</p>
        )}
      </div>
    </div>
  );
}
