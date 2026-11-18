/* KurdTok — otp.tsx : one-time codes (forgot password, sign-up confirm, 2FA).
 * The `otpService` object is the single place to swap for a real server (Supabase/Twilio/email) later. */
 import { useEffect, useState } from 'react';
 import { useApp } from './state';
 import { Icon, pick } from './utils';
 
 export type ContactKind = 'email' | 'phone';
 const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
 export const cleanPhoneNum = (v: string): string => v.replace(/[\s\-()]/g, '');
 
 /** Works out whether the user typed an email address or a phone number. */
 export function detectContact(raw: string): { kind: ContactKind | null; value: string } {
   const v = raw.trim();
   if (EMAIL_RE.test(v)) return { kind: 'email', value: v.toLowerCase() };
   const p = cleanPhoneNum(v);
   if (/^\+?\d{8,15}$/.test(p)) return { kind: 'phone', value: p };
   return { kind: null, value: v };
 }
 
 export function maskContact(kind: ContactKind, value: string): string {
   if (kind === 'email') {
     const [u, d] = value.split('@');
     return `${u.slice(0, 2)}${'*'.repeat(Math.max(2, u.length - 2))}@${d ?? ''}`;
   }
   return `${value.slice(0, 4)}${'*'.repeat(Math.max(3, value.length - 6))}${value.slice(-2)}`;
 }
 
 /** Local stand-in for the server. Replace `send` with a real request when the backend exists. */
 export const otpService = {
   send(_kind: ContactKind, _to: string): string {
     const buf = new Uint32Array(1);
     crypto.getRandomValues(buf);
     return String(100000 + (buf[0] % 900000));
   },
 };
 
 export type OtpResult = 'ok' | 'bad' | 'expired' | 'locked' | 'empty';
 interface Issued { code: string; exp: number; next: number; tries: number; sends: number }
 const TTL = 300;
 const COOLDOWN = 30;
 const MAX_TRIES = 5;
 const MAX_SENDS = 5;
 
 export function useOtp() {
   const [st, setSt] = useState<Issued | null>(null);
   const [now, setNow] = useState(Date.now());
   useEffect(() => {
     if (!st) return undefined;
     const id = setInterval(() => setNow(Date.now()), 1000);
     return () => clearInterval(id);
   }, [st]);
   const issue = (kind: ContactKind, to: string): boolean => {
     if (st && st.sends >= MAX_SENDS) return false;
     const code = otpService.send(kind, to);
     const t = Date.now();
     setNow(t);
     setSt({ code, exp: t + TTL * 1000, next: t + COOLDOWN * 1000, tries: 0, sends: (st?.sends ?? 0) + 1 });
     return true;
   };
   const verify = (input: string): OtpResult => {
     if (!st) return 'empty';
     if (Date.now() > st.exp) return 'expired';
     if (st.tries >= MAX_TRIES) return 'locked';
     if (input.trim() !== st.code) {
       setSt({ ...st, tries: st.tries + 1 });
       return st.tries + 1 >= MAX_TRIES ? 'locked' : 'bad';
     }
     return 'ok';
   };
   return {
     active: !!st,
     code: st?.code ?? '',
     left: st ? Math.max(0, Math.ceil((st.exp - now) / 1000)) : 0,
     wait: st ? Math.max(0, Math.ceil((st.next - now) / 1000)) : 0,
     triesLeft: st ? Math.max(0, MAX_TRIES - st.tries) : MAX_TRIES,
     sendsLeft: st ? MAX_SENDS - st.sends : MAX_SENDS,
     issue,
     verify,
     reset: () => setSt(null),
   };
 }
 export type Otp = ReturnType<typeof useOtp>;
 
 export function otpError(lang: Parameters<typeof pick>[0], r: OtpResult): string {
   if (r === 'expired') return pick(lang, 'This code has expired. Request a new one.', 'کۆدەکە بەسەرچووە. کۆدێکی نوێ داوا بکە.', 'انتهت صلاحية الرمز. اطلب رمزًا جديدًا.');
   if (r === 'locked') return pick(lang, 'Too many wrong attempts. Request a new code.', 'هەوڵی هەڵەی زۆر. کۆدێکی نوێ داوا بکە.', 'محاولات خاطئة كثيرة. اطلب رمزًا جديدًا.');
   if (r === 'empty') return pick(lang, 'Request a code first.', 'سەرەتا کۆد داوا بکە.', 'اطلب رمزًا أولاً.');
   return pick(lang, 'Wrong code. Try again.', 'کۆدەکە هەڵەیە. دووبارە هەوڵ بدەرەوە.', 'رمز خاطئ. حاول مرة أخرى.');
 }
 
 const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
 
 export function ContactChip({ kind }: { kind: ContactKind | null }) {
   const lang = useApp().settings.language;
   if (!kind) return null;
   return (
     <span className="otp-chip" role="status">
       <Icon name={kind === 'email' ? 'mail' : 'phone'} size={13} />
       {kind === 'email' ? pick(lang, 'Email detected', 'ئیمەیڵ دۆزرایەوە', 'تم اكتشاف بريد') : pick(lang, 'Phone detected', 'ژمارەی مۆبایل دۆزرایەوە', 'تم اكتشاف هاتف')}
     </span>
   );
 }
 
 /** Code entry with expiry timer, resend cooldown and attempt counter. */
 export function OtpField({ otp, kind, to, value, onChange, onResend }: { otp: Otp; kind: ContactKind; to: string; value: string; onChange: (v: string) => void; onResend: () => void }) {
   const lang = useApp().settings.language;
   return (
     <div className="otp">
       <p className="small sub" style={{ margin: 0 }}>
         {kind === 'email' ? pick(lang, 'We sent a 6-digit code to', 'کۆدێکی ٦ ژمارەیی نێردرا بۆ', 'أرسلنا رمزًا من 6 أرقام إلى') : pick(lang, 'We sent a 6-digit SMS to', 'SMSـێکی ٦ ژمارەیی نێردرا بۆ', 'أرسلنا رسالة من 6 أرقام إلى')} <b dir="ltr">{maskContact(kind, to)}</b>
       </p>
       <div className="demobox">{pick(lang, 'DEMO: no SMS/email server is connected yet, so your code is', 'DEMO: هێشتا سێرڤەری SMS/ئیمەیڵ نییە، کۆدەکەت', 'تجريبي: لا يوجد خادم رسائل بعد، رمزك')} <b className="democode" dir="ltr">{otp.code}</b></div>
       <input className="input codein" dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={value} aria-label={pick(lang, 'Code', 'کۆد', 'الرمز')} onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} />
       <div className="otp-meta">
         <span className={otp.left === 0 ? 'bad' : ''}>{otp.left === 0 ? pick(lang, 'Code expired', 'کۆدەکە بەسەرچوو', 'انتهى الرمز') : `${pick(lang, 'Expires in', 'بەسەردەچێت لە', 'ينتهي خلال')} ${mmss(otp.left)}`}</span>
         <button type="button" disabled={otp.wait > 0 || otp.sendsLeft <= 0} onClick={onResend}>
           {otp.sendsLeft <= 0 ? pick(lang, 'Limit reached', 'سنوور تەواو بوو', 'تم بلوغ الحد') : `${pick(lang, 'Resend code', 'ناردنەوەی کۆد', 'إعادة الإرسال')}${otp.wait > 0 ? ` (${otp.wait}s)` : ''}`}
         </button>
       </div>
       {otp.triesLeft < 5 && otp.triesLeft > 0 ? <span className="small sub">{pick(lang, `${otp.triesLeft} attempts left`, `${otp.triesLeft} هەوڵ ماوە`, `${otp.triesLeft} محاولات متبقية`)}</span> : null}
     </div>
   );
 }
 
 export const OTP_CSS = `
 .otp{display:flex;flex-direction:column;gap:10px}
 .otp-meta{display:flex;align-items:center;justify-content:space-between;font-size:.82rem;color:var(--sub)}
 .otp-meta .bad{color:var(--danger);font-weight:800}
 .otp-meta button{color:var(--accent);font-weight:800}.otp-meta button:disabled{color:var(--sub);opacity:.7}
 .otp-chip{display:inline-flex;align-items:center;gap:5px;font-size:.76rem;font-weight:800;color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,transparent);border-radius:999px;padding:3px 10px;width:fit-content}
 `;
 
 /** Settings card: turn on two-step login with a code sent by email or SMS. */
 export function TfaCard() {
   const app = useApp();
   const lang = app.settings.language;
   const acc = app.account;
   const [target, setTarget] = useState<{ kind: ContactKind; to: string } | null>(null);
   const [code, setCode] = useState('');
   const [err, setErr] = useState('');
   const otp = useOtp();
   if (!acc) return null;
   const opts: { kind: ContactKind; to?: string }[] = [{ kind: 'email', to: acc.email }, { kind: 'phone', to: acc.phone }];
   const start = (kind: ContactKind, to: string) => { otp.issue(kind, to); setCode(''); setErr(''); setTarget({ kind, to }); };
   const confirm = () => {
     const r = otp.verify(code);
     if (r !== 'ok') return setErr(otpError(lang, r));
     if (target) app.setTfa(target.kind);
     app.toast(pick(lang, 'Two-step login is on', '2FA چالاک کرا', 'تم تفعيل التحقق بخطوتين'));
     setTarget(null);
   };
   return (
     <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
       <div className="row between">
         <b>{pick(lang, 'Code by email or SMS', 'کۆد بە ئیمەیڵ یان SMS', 'رمز عبر البريد أو الرسائل')}</b>
         <span className={`chip${acc.tfa ? ' on' : ''}`}>{acc.tfa ? pick(lang, 'On', 'چالاک', 'مفعّل') : pick(lang, 'Off', 'ناچالاک', 'متوقف')}</span>
       </div>
       <p className="small sub" style={{ margin: 0 }}>{pick(lang, 'Every sign-in asks for a 6-digit code sent to your email or phone.', 'هەر چوونەژوورەوەیەک کۆدێکی ٦ ژمارەیی دەخوازێت کە بۆ ئیمەیڵ یان مۆبایلەکەت دەنێردرێت.', 'كل تسجيل دخول يطلب رمزًا من 6 أرقام يُرسل إلى بريدك أو هاتفك.')}</p>
       {opts.map((o) => (
         <div className="row between" key={o.kind}>
           <span className="row" style={{ gap: 8, minWidth: 0 }}><Icon name={o.kind === 'email' ? 'mail' : 'phone'} size={18} /><span className="truncate" dir="ltr">{o.to ? maskContact(o.kind, o.to) : pick(lang, 'Not added', 'زیاد نەکراوە', 'غير مضاف')}</span></span>
           {o.to ? (
             acc.tfa === o.kind
               ? <button type="button" className="btn sm danger" onClick={() => { app.setTfa(null); app.toast(pick(lang, 'Two-step login is off', '2FA ناچالاک کرا', 'تم إيقاف التحقق بخطوتين')); }}>{pick(lang, 'Turn off', 'ناچالاککردن', 'إيقاف')}</button>
               : <button type="button" className="btn sm primary" onClick={() => start(o.kind, o.to as string)}>{pick(lang, 'Turn on', 'چالاککردن', 'تفعيل')}</button>
           ) : null}
         </div>
       ))}
       {!acc.email || !acc.phone ? <span className="small sub">{pick(lang, 'Add an email or phone in Account info to use it here.', 'ئیمەیڵ یان مۆبایل لە زانیاری هەژمار زیاد بکە.', 'أضف بريدًا أو هاتفًا في معلومات الحساب.')}</span> : null}
       {target ? (
         <div className="otp-box">
           <OtpField otp={otp} kind={target.kind} to={target.to} value={code} onChange={setCode} onResend={() => { otp.issue(target.kind, target.to); setCode(''); setErr(''); }} />
           {err ? <p className="errtext" role="alert">{err}</p> : null}
           <div className="row" style={{ gap: 8 }}>
             <button type="button" className="btn grow" onClick={() => setTarget(null)}>{pick(lang, 'Cancel', 'پاشگەزبوونەوە', 'إلغاء')}</button>
             <button type="button" className="btn primary grow" disabled={code.length < 6} onClick={confirm}>{pick(lang, 'Confirm', 'پشتڕاستکردنەوە', 'تأكيد')}</button>
           </div>
         </div>
       ) : null}
     </div>
   );
 }
 