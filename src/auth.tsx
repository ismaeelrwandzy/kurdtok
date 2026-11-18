/* KurdTok — auth.tsx : sign-up / login / confirmation / splash */
import { useEffect, useMemo, useState } from 'react';
import { ContactChip, OTP_CSS, OtpField, detectContact, otpError, useOtp, type ContactKind } from './otp';
import { useApp } from './state';
import { ICON_IMGS, Icon, LANGS, RESERVED_USERNAMES, cleanUsernameInput, isValidUsername, usernameRule } from './utils';
import type { Lang } from './utils';
import { Sheet } from './ui';

type Prov = 'google' | 'facebook' | 'apple' | 'phone';
type Step = 'start' | 'form' | 'verify' | 'login' | 'forgot';

const TX: Record<Lang, Record<string, string>> = {
  en: {
    user: 'Username', eUser: 'Username: 3–20 letters, numbers, . or _', uOk: 'Available', uTaken: 'Already taken — choose another', forgot: 'Forgot password?', fTitle: 'Reset password', fSub: 'Enter your username, email or phone number', fSend: 'Send code', fNew: 'New password', fDone: 'Password changed. You can log in now.', fNone: 'No account found with this detail.', tlink: 'Terms & Privacy', tTitle: 'Terms & Privacy Policy',
    tBody: '1. You must be 18 or older to use KurdTok.\n2. You are responsible for what you post. No hate, violence, harassment, nudity or illegal content.\n3. Your username is unique and belongs only to you.\n4. We keep your data on your device and use it only to run the app. You can download or delete it any time from Settings.\n5. We may remove content or accounts that break these rules.\n6. Verified, ad and plan features may be paid and can change.',
    tag: 'Share your moments with Kurdistan', google: 'Continue with Google', facebook: 'Continue with Facebook', apple: 'Continue with Apple ID', phone: 'Use phone number or email',
    have: 'Already have an account?', login: 'Log in', create: 'Create account', name: 'Name', contact: 'Email or phone number', email: 'Email', phoneL: 'Phone number', birth: 'Date of birth', age: 'Age',
    pw: 'Password', pw2: 'Repeat password', terms: 'I agree to the Terms and Privacy Policy and I am 18 or older', make: 'Create',
    r8: 'At least 8 characters', rl: 'Letters', rn: 'Numbers', rs: 'At least one symbol (! @ # $ …)',
    eName: 'Enter your name.', eContact: 'Enter a valid email or phone number.', eBirth: 'Enter your date of birth.', eAge: 'You must be 18 or older to create an account.',
    ePw: 'Password does not meet the rules.', ePw2: 'Passwords do not match.', eTerms: 'Please accept the terms.', eTaken: 'This account already exists.',
    vTitle: 'Confirm your account', vEmail: 'We sent a 6-digit code to your email', vPhone: 'We sent a 6-digit SMS code to your phone', vCode: 'Code', vOk: 'Confirm', vBad: 'Wrong code.', vResend: 'Send a new code', vBack: 'Back',
    vDemo: 'DEMO: no SMS/email server is connected yet, so your code is', provT: 'Choose an account', provSub: 'Demo: type the email of your account', provGo: 'Continue',
    id: 'Username, email or phone', demo: 'Continue as demo user', demoNote: 'Demo mode: accounts are stored on this device only.', noMatch: 'No account on this device uses this sign-in.',
    err: 'Wrong details.', c2fa: 'Authenticator code', back: 'Back',
  },
  ckb: {
    user: 'ناوی بەکارهێنەر', eUser: 'ناوی بەکارهێنەر: ٣–٢٠ پیت، ژمارە، . یان _', uOk: 'بەردەستە', uTaken: 'پێشتر گیراوە — یەکێکی تر هەڵبژێرە', forgot: 'پاسوۆردت لەبیرچووە؟', fTitle: 'گۆڕینی پاسوۆرد', fSub: 'ناوی بەکارهێنەر، ئیمەیڵ یان ژمارەی مۆبایلەکەت بنووسە', fSend: 'ناردنی کۆد', fNew: 'پاسوۆردی نوێ', fDone: 'پاسوۆرد گۆڕدرا. ئێستا دەتوانیت بچیتە ژوورەوە.', fNone: 'هیچ هەژمارێک بەم زانیارییە نەدۆزرایەوە.', tlink: 'مەرج و تایبەتمەندی', tTitle: 'مەرج و سیاسەتی تایبەتمەندی',
    tBody: '١. دەبێ تەمەنت ١٨ ساڵ یان زیاتر بێت بۆ بەکارهێنانی کورد تۆک.\n٢. تۆ بەرپرسیاری لەوەی بڵاوی دەکەیتەوە. نابێ ڕق، توندوتیژی، گێرەشێوێنی، ڕووتی یان ناوەڕۆکی نایاسایی بێت.\n٣. ناوی بەکارهێنەرەکەت تایبەتە بە خۆتەوە و کەسی تر نایگرێت.\n٤. داتاکانت لەسەر ئامێرەکەت دەمێننەوە و تەنها بۆ کارکردنی ئەپەکە بەکاردێن. دەتوانیت لە ڕێکخستنەکان داگریان بکەیت یان بیانسڕیتەوە.\n٥. دەکرێت ناوەڕۆک یان ئەکاونتێک بسڕینەوە ئەگەر ئەم ڕێسایانە بشکێنێت.\n٦. تایبەتمەندییەکانی ڤێریفای و ڕیکلام و پلانەکان لەوانەیە بە پارە بن و بگۆڕدرێن.',
    tag: 'ساتە جوانەکانت لەگەڵ کوردستان بەش بکە', google: 'بەردەوامبە لەگەڵ گۆگڵ', facebook: 'بەردەوامبە لەگەڵ فەیسبووک', apple: 'بەردەوامبە لەگەڵ ئەپڵ ئایدی', phone: 'ژمارەی مۆبایل یان ئیمەیڵ',
    have: 'هەژمارت هەیە؟', login: 'چوونەژوورەوە', create: 'دروستکردنی هەژمار', name: 'ناو', contact: 'ئیمەیڵ یان ژمارەی مۆبایل', email: 'ئیمەیڵ', phoneL: 'ژمارەی مۆبایل', birth: 'بەرواری لەدایکبوون', age: 'تەمەن',
    pw: 'پاسوۆرد', pw2: 'دووبارە نووسینی پاسوۆرد', terms: 'ڕازیم بە مەرج و تایبەتمەندییەکان و تەمەنم ١٨ ساڵ یان زیاترە', make: 'دروستکردن',
    r8: 'لانیکەم ٨ پیت و ژمارە', rl: 'پیت', rn: 'ژمارە', rs: 'لانیکەم یەک هێما (! @ # $ …)',
    eName: 'ناوەکەت بنووسە.', eContact: 'ئیمەیڵ یان ژمارەی مۆبایلێکی دروست بنووسە.', eBirth: 'بەرواری لەدایکبوون بنووسە.', eAge: 'دەبێ تەمەنت ١٨ ساڵ یان زیاتر بێت بۆ دروستکردنی هەژمار.',
    ePw: 'پاسوۆردەکە مەرجەکان ناپێکێت.', ePw2: 'پاسوۆردەکان وەک یەک نین.', eTerms: 'تکایە مەرجەکان قبوڵ بکە.', eTaken: 'ئەم هەژمارە پێشتر هەیە.',
    vTitle: 'هەژمارەکەت پشتڕاست بکەوە', vEmail: 'کۆدێکی ٦ ژمارەیی بۆ ئیمەیڵەکەت نێردرا', vPhone: 'کۆدێکی ٦ ژمارەیی بە SMS بۆ مۆبایلەکەت نێردرا', vCode: 'کۆد', vOk: 'پشتڕاستکردنەوە', vBad: 'کۆدەکە هەڵەیە.', vResend: 'کۆدێکی نوێ بنێرە', vBack: 'گەڕانەوە',
    vDemo: 'تاقیکاری: هێشتا سێرڤەری SMS/ئیمەیڵ بەستراو نییە، کۆدەکەت ئەمەیە', provT: 'هەژمارێک هەڵبژێرە', provSub: 'تاقیکاری: ئیمەیڵی هەژمارەکەت بنووسە', provGo: 'بەردەوامبە',
    id: 'ناوی بەکارهێنەر، ئیمەیڵ یان مۆبایل', demo: 'بەردەوامبە وەک بەکارهێنەری تاقیکاری', demoNote: 'دۆخی تاقیکاری: هەژمارەکان تەنها لەسەر ئەم ئامێرە پاشەکەوت دەکرێن.', noMatch: 'هیچ هەژمارێک لەسەر ئەم ئامێرە بەم شێوازە نییە.',
    err: 'زانیارییەکان هەڵەن.', c2fa: 'کۆدی ئۆسێنتیکەیتەر', back: 'گەڕانەوە',
  },
  ar: {
    user: 'اسم المستخدم', eUser: 'اسم المستخدم: 3–20 حرفًا أو رقمًا أو . أو _', uOk: 'متاح', uTaken: 'مستخدم مسبقًا — اختر اسمًا آخر', forgot: 'نسيت كلمة المرور؟', fTitle: 'إعادة تعيين كلمة المرور', fSub: 'أدخل اسم المستخدم أو البريد أو رقم الهاتف', fSend: 'إرسال الرمز', fNew: 'كلمة مرور جديدة', fDone: 'تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن.', fNone: 'لا يوجد حساب بهذه البيانات.', tlink: 'الشروط والخصوصية', tTitle: 'الشروط وسياسة الخصوصية',
    tBody: '1. يجب أن يكون عمرك 18 عامًا أو أكثر لاستخدام KurdTok.\n2. أنت مسؤول عما تنشره. يُمنع الكراهية والعنف والتحرش والعري والمحتوى غير القانوني.\n3. اسم المستخدم فريد ويخصك وحدك.\n4. تبقى بياناتك على جهازك وتُستخدم لتشغيل التطبيق فقط. يمكنك تنزيلها أو حذفها من الإعدادات.\n5. قد نزيل المحتوى أو الحسابات التي تخالف القواعد.\n6. ميزات التوثيق والإعلانات والخطط قد تكون مدفوعة وقابلة للتغيير.',
    tag: 'شارك لحظاتك مع كردستان', google: 'المتابعة مع Google', facebook: 'المتابعة مع Facebook', apple: 'المتابعة مع Apple ID', phone: 'رقم الهاتف أو البريد',
    have: 'لديك حساب؟', login: 'تسجيل الدخول', create: 'إنشاء حساب', name: 'الاسم', contact: 'البريد الإلكتروني أو رقم الهاتف', email: 'البريد الإلكتروني', phoneL: 'رقم الهاتف', birth: 'تاريخ الميلاد', age: 'العمر',
    pw: 'كلمة المرور', pw2: 'أعد كتابة كلمة المرور', terms: 'أوافق على الشروط وسياسة الخصوصية وعمري 18 عامًا أو أكثر', make: 'إنشاء',
    r8: '8 أحرف على الأقل', rl: 'أحرف', rn: 'أرقام', rs: 'رمز واحد على الأقل (! @ # $ …)',
    eName: 'أدخل اسمك.', eContact: 'أدخل بريدًا أو رقم هاتف صحيحًا.', eBirth: 'أدخل تاريخ ميلادك.', eAge: 'يجب أن يكون عمرك 18 عامًا أو أكثر.',
    ePw: 'كلمة المرور لا تستوفي الشروط.', ePw2: 'كلمتا المرور غير متطابقتين.', eTerms: 'يرجى قبول الشروط.', eTaken: 'هذا الحساب موجود بالفعل.',
    vTitle: 'أكّد حسابك', vEmail: 'أرسلنا رمزًا من 6 أرقام إلى بريدك', vPhone: 'أرسلنا رمزًا من 6 أرقام عبر SMS إلى هاتفك', vCode: 'الرمز', vOk: 'تأكيد', vBad: 'الرمز غير صحيح.', vResend: 'إرسال رمز جديد', vBack: 'رجوع',
    vDemo: 'تجريبي: لا يوجد خادم SMS/بريد متصل بعد، رمزك هو', provT: 'اختر حسابًا', provSub: 'تجريبي: اكتب بريد حسابك', provGo: 'متابعة',
    id: 'اسم المستخدم أو البريد أو الهاتف', demo: 'المتابعة كمستخدم تجريبي', demoNote: 'الوضع التجريبي: تُحفظ الحسابات على هذا الجهاز فقط.', noMatch: 'لا يوجد حساب على هذا الجهاز بهذه الطريقة.',
    err: 'البيانات غير صحيحة.', c2fa: 'رمز المصادقة', back: 'رجوع',
  },
};

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const cleanPhone = (v: string) => v.replace(/[\s\-()]/g, '');
const isPhone = (v: string) => /^\+?\d{8,15}$/.test(cleanPhone(v));
const pwRules = (p: string) => ({ r8: p.length >= 8, rl: /[A-Za-z؀-ۿ]/.test(p), rn: /\d/.test(p), rs: /[^A-Za-z0-9؀-ۿ\s]/.test(p) });

export function ageOf(birth: string, now = new Date()): number {
  const d = new Date(birth + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return -1;
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

function makeUsername(name: string, contact: string): string {
  const base = (contact.includes('@') ? contact.split('@')[0] : name).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'user';
  for (let i = 0; i < 20; i++) {
    const u = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    if (isValidUsername(u) && !RESERVED_USERNAMES.has(u)) return u;
  }
  return `user${Date.now() % 1e8}`;
}


const MONTHS: Record<Lang, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ckb: ['کانوونی دووەم', 'شوبات', 'ئازار', 'نیسان', 'ئایار', 'حوزەیران', 'تەمموز', 'ئاب', 'ئەیلوول', 'تشرینی یەکەم', 'تشرینی دووەم', 'کانوونی یەکەم'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

export function BirthPicker({ label, ageLabel, value, onChange, lang }: { label: string; ageLabel: string; value: string; onChange: (v: string) => void; lang: Lang }) {
  const [y0, m0, d0] = value ? value.split('-') : ['', '', ''];
  const [d, setD] = useState(d0 ?? '');
  const [m, setM] = useState(m0 ?? '');
  const [y, setY] = useState(y0 ?? '');
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => thisYear - i);
  const dim = y && m ? new Date(Number(y), Number(m), 0).getDate() : 31;
  const upd = (nd: string, nm: string, ny: string) => {
    setD(nd); setM(nm); setY(ny);
    const maxD = ny && nm ? new Date(Number(ny), Number(nm), 0).getDate() : 31;
    const dd = nd && Number(nd) > maxD ? String(maxD) : nd;
    if (dd !== nd) setD(dd);
    onChange(dd && nm && ny ? `${ny}-${nm.padStart(2, '0')}-${dd.padStart(2, '0')}` : '');
  };
  const age = value ? ageOf(value) : -1;
  return (
    <div className="field">
      <label>{label}</label>
      <div className="birthrow" dir="ltr">
        <select id="sbd" className="input" aria-label="day" value={d} onChange={(e) => upd(e.target.value, m, y)}>
          <option value="">{lang === 'en' ? 'Day' : lang === 'ar' ? 'يوم' : 'ڕۆژ'}</option>
          {Array.from({ length: dim }, (_, i) => <option key={i} value={String(i + 1)}>{i + 1}</option>)}
        </select>
        <select id="sbm" className="input" aria-label="month" value={m} onChange={(e) => upd(d, e.target.value, y)}>
          <option value="">{lang === 'en' ? 'Month' : lang === 'ar' ? 'شهر' : 'مانگ'}</option>
          {MONTHS[lang].map((n, i) => <option key={i} value={String(i + 1)}>{i + 1} · {n}</option>)}
        </select>
        <select id="sby" className="input" aria-label="year" value={y} onChange={(e) => upd(d, m, e.target.value)}>
          <option value="">{lang === 'en' ? 'Year' : lang === 'ar' ? 'سنة' : 'ساڵ'}</option>
          {years.map((yy) => <option key={yy} value={String(yy)}>{yy}</option>)}
        </select>
      </div>
      {age >= 0 ? <div className={`agechip${age >= 18 ? ' ok' : ' bad'}`}>{ageLabel}: {age}</div> : null}
    </div>
  );
}

function Brand({ size = 84 }: { size?: number }) {
  return <img className="brandicon" src={ICON_IMGS.k1} alt="" width={size} height={size} />;
}

function ProvIcon({ p }: { p: Prov }) {
  const bg = p === 'google' ? '#fff' : p === 'facebook' ? '#1877f2' : p === 'apple' ? '#000' : 'var(--accent)';
  const fg = p === 'google' ? '#ea4335' : '#fff';
  const ch = p === 'google' ? 'G' : p === 'facebook' ? 'f' : p === 'apple' ? '' : '☎';
  return <span className="provic" style={{ background: bg, color: fg }}>{ch}</span>;
}

export function TermsSheet({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const T = TX[app.settings.language] ?? TX.en;
  return (
    <Sheet label={T.tTitle} onClose={onClose}>
      <h3 style={{ margin: 0 }}>{T.tTitle}</h3>
      <div className="scroll" style={{ whiteSpace: 'pre-line', lineHeight: 1.7, fontSize: '.88rem' }}>{T.tBody}</div>
    </Sheet>
  );
}

export function termsLabel(lang: Lang): string {
  return (TX[lang] ?? TX.en).tTitle;
}

export function Splash() {
  return (
    <div className="splash" aria-hidden="true">
      <Brand size={132} />
      <div className="splashname">KurdTok</div>
    </div>
  );
}

export function AuthScreen() {
  const app = useApp();
  const lang = app.settings.language;
  const T = TX[lang] ?? TX.en;
  const hasAccount = !!app.account;
  const isIOS = useMemo(() => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), []);
  const [step, setStep] = useState<Step>(hasAccount ? 'login' : 'start');
  const [prov, setProv] = useState<Prov | null>(null);
  const [provSheet, setProvSheet] = useState<Prov | null>(null);
  const [provEmail, setProvEmail] = useState('');
  const [name, setName] = useState('');
  const [uname, setUname] = useState('');
  const [unameTouched, setUnameTouched] = useState(false);
  const [uWarn, setUWarn] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [fp, setFp] = useState<'id' | 'code' | 'new' | 'done'>('id');
  const [fpId, setFpId] = useState('');
  const [fpCode, setFpCode] = useState('');
  const [fpTarget, setFpTarget] = useState<{ kind: ContactKind; to: string }>({ kind: 'email', to: '' });
  const fpOtp = useOtp();
  const vOtp = useOtp();
  const lOtp = useOtp();
  const [lPending, setLPending] = useState<{ kind: ContactKind; to: string } | null>(null);
  const [fpPw, setFpPw] = useState('');
  const [fpPw2, setFpPw2] = useState('');
  const [contact, setContact] = useState('');
  const [birth, setBirth] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  // login
  const [lid, setLid] = useState('');
  const [lpw, setLpw] = useState('');
  const [needCode, setNeedCode] = useState(false);
  const [tcode, setTcode] = useState('');

  const social = prov !== null && prov !== 'phone';
  const rules = pwRules(pw);
  const c = contact.trim();
  const viaEmail = isEmail(c);
  const uClean = uname.trim().toLowerCase();
  const uState: 'empty' | 'bad' | 'taken' | 'ok' = !uClean ? 'empty' : !isValidUsername(uClean) ? 'bad' : RESERVED_USERNAMES.has(uClean) ? 'taken' : 'ok';

  const startForm = (p: Prov, prefill?: string) => {
    setProv(p);
    setErr('');
    if (prefill) setContact(prefill);
    setStep('form');
  };

  const chooseProvider = (p: Prov) => {
    if (hasAccount && app.socialLogin(p)) return;
    if (p === 'phone') return startForm('phone');
    setProvEmail('');
    setProvSheet(p);
  };

  const submitForm = async () => {
    setErr('');
    if (!name.trim()) return setErr(T.eName);
    if (uState === 'bad' || uState === 'empty') return setErr(T.eUser);
    if (uState === 'taken') return setErr(T.uTaken);
    if (!(isEmail(c) || isPhone(c))) return setErr(T.eContact);
    if (!birth) return setErr(T.eBirth);
    if (ageOf(birth) < 18) return setErr(T.eAge);
    if (!social) {
      if (!(rules.r8 && rules.rl && rules.rn && rules.rs)) return setErr(T.ePw);
      if (pw !== pw2) return setErr(T.ePw2);
    }
    if (!agree) return setErr(T.eTerms);
    if (social) return void finish();
    vOtp.issue(viaEmail ? 'email' : 'phone', viaEmail ? c.toLowerCase() : cleanPhone(c));
    setCode('');
    setStep('verify');
  };

  const finish = async () => {
    setBusy(true);
    try {
      const email = isEmail(c) ? c.toLowerCase() : undefined;
      const phone = !email ? cleanPhone(c) : undefined;
      const key = await app.register({ name: name.trim(), username: uClean || makeUsername(name, c), email, phone, birth, password: social ? undefined : pw, provider: prov ?? 'password' });
      if (key) {
        setStep('form');
        setErr(T.eTaken);
      }
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    const r = vOtp.verify(code);
    if (r !== 'ok') return setErr(otpError(lang, r));
    setErr('');
    void finish();
  };

  const doLogin = async () => {
    setBusy(true);
    setErr('');
    try {
      const id = lid.trim().toLowerCase();
      if (lPending) {
        const r = lOtp.verify(tcode);
        if (r !== 'ok') return setErr(otpError(lang, r));
        const k = await app.login(id, lpw, undefined, true);
        if (k) setErr(T.err);
        return;
      }
      const chk = await app.checkPassword(id, lpw);
      if (!chk.ok) return setErr(T.err);
      if ((chk.tfa === 'email' || chk.tfa === 'phone') && chk.contact) {
        lOtp.issue(chk.tfa, chk.contact);
        setTcode('');
        setLPending({ kind: chk.tfa, to: chk.contact });
        return;
      }
      const key = await app.login(id, lpw, needCode ? tcode.trim() : undefined);
      if (key === 'auth.need2fa') setNeedCode(true);
      if (key) setErr(key === 'auth.need2fa' ? T.c2fa : T.err);
    } finally {
      setBusy(false);
    }
  };

  const langBar = (
    <div className="seg" style={{ alignSelf: 'center' }}>
      {LANGS.map((l) => <button key={l.code} type="button" className={lang === l.code ? 'on' : ''} onClick={() => app.setSettings((s) => ({ ...s, language: l.code }))}>{l.label}</button>)}
    </div>
  );

  const provs: Prov[] = ['google', 'facebook', ...(isIOS ? (['apple'] as Prov[]) : [])];

  if (step === 'start')
    return (
      <div className="auth">
        <Brand />
        <div className="center">
          <h1 className="h1">{app.t('app.name')}</h1>
          <p className="sub" style={{ margin: '6px 0 0' }}>{T.tag}</p>
        </div>
        {langBar}
        <div className="provlist">
          {provs.map((p) => <button key={p} type="button" className="btn block provbtn" data-prov={p} onClick={() => chooseProvider(p)}><ProvIcon p={p} />{T[p]}</button>)}
          <button type="button" className="btn primary block provbtn" data-prov="phone" onClick={() => chooseProvider('phone')}><ProvIcon p="phone" />{T.phone}</button>
        </div>
        <button type="button" className="center small" style={{ color: 'var(--accent)', fontWeight: 700 }} onClick={() => { setStep('login'); setErr(''); }}>{T.have} <u>{T.login}</u></button>
        {!hasAccount ? (
          <>
            <button type="button" className="btn block" onClick={app.demoLogin}>{T.demo}</button>
            <p className="center small sub" style={{ margin: 0 }}>{T.demoNote}</p>
          </>
        ) : null}
        {provSheet ? (
          <div className="provsheet" role="dialog" onClick={() => setProvSheet(null)}>
            <form className="provcard" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); const v = provEmail.trim().toLowerCase(); if (!isEmail(v)) return; const p = provSheet; setProvSheet(null); startForm(p, v); }}>
              <ProvIcon p={provSheet} />
              <b>{T.provT}</b>
              <span className="small sub">{T.provSub}</span>
              <input className="input" dir="ltr" type="email" autoFocus value={provEmail} placeholder="name@example.com" onChange={(e) => setProvEmail(e.target.value)} />
              <button type="submit" className="btn primary block" disabled={!isEmail(provEmail.trim())}>{T.provGo}</button>
            </form>
          </div>
        ) : null}
      </div>
    );

  if (step === 'forgot') {
    const fr = pwRules(fpPw);
    return (
      <form className="auth" noValidate onSubmit={(e) => {
        e.preventDefault();
        setErr('');
        if (fp === 'id') {
          if (!app.findAccount(fpId)) return setErr(T.fNone);
          const det = detectContact(fpId);
          const acc = app.account;
          const kind: ContactKind = det.kind ?? (acc?.email ? 'email' : 'phone');
          const to = det.kind ? det.value : (acc?.email ?? acc?.phone ?? '');
          if (!to) return setErr(T.fNone);
          setFpTarget({ kind, to });
          if (!fpOtp.issue(kind, to)) return setErr(otpError(lang, 'locked'));
          setFpCode(''); setFp('code');
        } else if (fp === 'code') {
          const r = fpOtp.verify(fpCode);
          if (r !== 'ok') return setErr(otpError(lang, r));
          setFp('new');
        } else if (fp === 'new') {
          if (!(fr.r8 && fr.rl && fr.rn && fr.rs)) return setErr(T.ePw);
          if (fpPw !== fpPw2) return setErr(T.ePw2);
          void app.resetPassword(fpId, fpPw).then((k) => { if (k) setErr(T.fNone); else setFp('done'); });
        } else {
          setStep('login');
        }
      }}>
        <Brand size={64} />
        <div className="center"><h1 className="h1">{T.fTitle}</h1>{fp === 'id' ? <p className="sub" style={{ margin: '6px 0 0' }}>{T.fSub}</p> : null}</div>
        {fp === 'id' ? <div className="field"><label htmlFor="fi">{T.id}</label><input id="fi" className="input" dir="ltr" autoCapitalize="none" autoCorrect="off" inputMode="email" placeholder="name@mail.com / +964…" value={fpId} onChange={(e) => setFpId(e.target.value)} /><ContactChip kind={detectContact(fpId).kind} /></div> : null}
        {fp === 'code' ? <OtpField otp={fpOtp} kind={fpTarget.kind} to={fpTarget.to} value={fpCode} onChange={setFpCode} onResend={() => { fpOtp.issue(fpTarget.kind, fpTarget.to); setFpCode(''); setErr(''); }} /> : null}
        {fp === 'new' ? (
          <>
            <div className="field"><label htmlFor="fn">{T.fNew}</label><input id="fn" className="input" dir="ltr" type="password" autoComplete="new-password" value={fpPw} onChange={(e) => setFpPw(e.target.value)} />
              <div className="pwrules">{(['r8', 'rl', 'rn', 'rs'] as const).map((k) => <span key={k} className={fr[k] ? 'ok' : ''}>{fr[k] ? '✓' : '•'} {T[k]}</span>)}</div></div>
            <div className="field"><label htmlFor="fn2">{T.pw2}</label><input id="fn2" className="input" dir="ltr" type="password" autoComplete="new-password" value={fpPw2} onChange={(e) => setFpPw2(e.target.value)} /></div>
          </>
        ) : null}
        {fp === 'done' ? <p className="center" style={{ color: '#22c55e', fontWeight: 700 }}>{T.fDone}</p> : null}
        {err ? <p className="errtext" role="alert">{err}</p> : null}
        <button type="submit" className="btn primary block">{fp === 'id' ? T.fSend : fp === 'code' ? T.vOk : fp === 'new' ? T.fTitle : T.login}</button>
        {fp !== 'done' ? <button type="button" className="center small sub" onClick={() => { setStep('login'); setErr(''); }}>{T.vBack}</button> : null}
      </form>
    );
  }

  if (step === 'verify')
    return (
      <form className="auth" onSubmit={(e) => { e.preventDefault(); confirm(); }} noValidate>
        <Brand size={64} />
        <div className="center">
          <h1 className="h1">{T.vTitle}</h1>
          <p className="sub" style={{ margin: '6px 0 0' }}>{viaEmail ? T.vEmail : T.vPhone}</p>
          <p dir="ltr" style={{ margin: '4px 0 0', fontWeight: 700 }}>{c}</p>
        </div>
        <OtpField otp={vOtp} kind={viaEmail ? 'email' : 'phone'} to={viaEmail ? c.toLowerCase() : cleanPhone(c)} value={code} onChange={setCode} onResend={() => { vOtp.issue(viaEmail ? 'email' : 'phone', viaEmail ? c.toLowerCase() : cleanPhone(c)); setCode(''); setErr(''); }} />
        {err ? <p className="errtext" role="alert">{err}</p> : null}
        <button type="submit" className="btn primary block" disabled={busy || code.length < 6}>{busy ? <span className="spinner" /> : T.vOk}</button>
        <button type="button" className="center small sub" onClick={() => { setStep('form'); setErr(''); }}>{T.vBack}</button>
      </form>
    );

  if (step === 'form')
    return (
      <form className="auth top" onSubmit={(e) => { e.preventDefault(); void submitForm(); }} noValidate>
        <button type="button" className="iconbtn" style={{ alignSelf: 'flex-start' }} aria-label={T.back} onClick={() => { setStep('start'); setErr(''); }}><Icon name="back" /></button>
        <div className="center"><Brand size={56} /><h1 className="h1" style={{ marginTop: 10 }}>{T.create}</h1></div>
        <div className="field"><label htmlFor="sn">{T.name}</label><input id="sn" className="input" value={name} maxLength={40} autoComplete="name" onChange={(e) => { setName(e.target.value); if (!unameTouched) setUname(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14)); }} /></div>
        <div className="field"><label htmlFor="su">{T.user}</label><input id="su" className="input" dir="ltr" value={uname} maxLength={20} autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(e) => { setUnameTouched(true); const r = cleanUsernameInput(e.target.value); setUWarn(r.changed); setUname(r.value); }} />
          <div className="small sub" style={{ marginTop: 4, color: uWarn ? 'var(--danger)' : undefined }}>{usernameRule(lang)}</div>
          {uState !== 'empty' ? <div className={`agechip${uState === 'ok' ? ' ok' : ' bad'}`}>{uState === 'ok' ? `@${uClean} · ${T.uOk}` : uState === 'taken' ? T.uTaken : T.eUser}</div> : null}</div>
        <div className="field"><label htmlFor="sc">{T.contact}</label><input id="sc" className="input" dir="ltr" value={contact} readOnly={social} inputMode={prov === 'phone' ? 'tel' : 'email'} autoCapitalize="none" autoComplete="username" onChange={(e) => setContact(e.target.value)} /></div>
        <BirthPicker label={T.birth} ageLabel={T.age} value={birth} onChange={setBirth} lang={lang} />
        {!social ? (
          <>
            <div className="field">
              <label htmlFor="sp">{T.pw}</label>
              <div className="row"><input id="sp" className="input" dir="ltr" type={show ? 'text' : 'password'} value={pw} autoComplete="new-password" onChange={(e) => setPw(e.target.value)} />
                <button type="button" className="iconbtn" onClick={() => setShow((v) => !v)}><Icon name={show ? 'eyeOff' : 'eye'} /></button></div>
              <div className="pwrules">
                {(['r8', 'rl', 'rn', 'rs'] as const).map((k) => <span key={k} className={rules[k] ? 'ok' : ''}>{rules[k] ? '✓' : '•'} {T[k]}</span>)}
              </div>
            </div>
            <div className="field"><label htmlFor="sp2">{T.pw2}</label><input id="sp2" className="input" dir="ltr" type={show ? 'text' : 'password'} value={pw2} autoComplete="new-password" onChange={(e) => setPw2(e.target.value)} /></div>
          </>
        ) : null}
        <label className="agree"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>{T.terms} <button type="button" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'underline' }} onClick={(e) => { e.preventDefault(); setTermsOpen(true); }}>{T.tlink}</button></span></label>
        {err ? <p className="errtext" role="alert">{err}</p> : null}
        <button type="submit" className="btn primary block" disabled={busy}>{busy ? <span className="spinner" /> : T.make}</button>
        {termsOpen ? (
          <Sheet label={T.tTitle} onClose={() => setTermsOpen(false)}>
            <h3 style={{ margin: 0 }}>{T.tTitle}</h3>
            <div className="scroll" style={{ whiteSpace: 'pre-line', lineHeight: 1.7, fontSize: '.88rem' }}>{T.tBody}</div>
          </Sheet>
        ) : null}
      </form>
    );

  return (
    <form className="auth" onSubmit={(e) => { e.preventDefault(); void doLogin(); }} noValidate>
      <Brand />
      <div className="center"><h1 className="h1">{app.t('app.name')}</h1></div>
      {langBar}
      <div className="field"><label htmlFor="li">{T.id}</label><input id="li" className="input" dir="ltr" value={lid} autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" onChange={(e) => setLid(e.target.value)} /></div>
      <div className="field">
        <label htmlFor="lp">{T.pw}</label>
        <div className="row"><input id="lp" className="input" dir="ltr" type={show ? 'text' : 'password'} value={lpw} autoComplete="current-password" onChange={(e) => setLpw(e.target.value)} />
          <button type="button" className="iconbtn" onClick={() => setShow((v) => !v)}><Icon name={show ? 'eyeOff' : 'eye'} /></button></div>
      </div>
      {lPending ? <OtpField otp={lOtp} kind={lPending.kind} to={lPending.to} value={tcode} onChange={setTcode} onResend={() => { lOtp.issue(lPending.kind, lPending.to); setTcode(''); setErr(''); }} /> : null}
      {needCode && !lPending ? <div className="field"><label htmlFor="lc">{T.c2fa}</label><input id="lc" className="input" dir="ltr" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={tcode} onChange={(e) => setTcode(e.target.value)} /></div> : null}
      {err ? <p className="errtext" role="alert">{err}</p> : null}
      <button type="submit" className="btn primary block" disabled={busy}>{busy ? <span className="spinner" /> : lPending ? T.vOk : T.login}</button>
      {lPending ? <button type="button" className="center small sub" onClick={() => { setLPending(null); lOtp.reset(); setTcode(''); setErr(''); }}>{T.vBack}</button> : null}
      {hasAccount && app.account?.provider && app.account.provider !== 'password' ? (
        <button type="button" className="btn block provbtn" onClick={() => { if (!app.socialLogin(app.account!.provider as string)) setErr(T.noMatch); }}><ProvIcon p={app.account.provider as Prov} />{T[app.account.provider === 'phone' ? 'phone' : app.account.provider] }</button>
      ) : null}
      <button type="button" className="center small sub" onClick={() => { setStep('forgot'); setFp('id'); setErr(''); }}>{T.forgot}</button>
      <button type="button" className="center small" style={{ color: 'var(--accent)', fontWeight: 700 }} onClick={() => { setStep('start'); setErr(''); }}>{T.create}</button>
      {!hasAccount ? <button type="button" className="btn block" onClick={app.demoLogin}>{T.demo}</button> : null}
    </form>
  );
}

export function useSplash(ms = 1500): boolean {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const id = window.setTimeout(() => setOn(false), ms);
    return () => window.clearTimeout(id);
  }, [ms]);
  return on;
}

export const AUTH_CSS = OTP_CSS + `
.birthrow{display:grid;grid-template-columns:.8fr 1.5fr 1fr;gap:8px}
.birthrow select{padding:13px 8px;appearance:none;-webkit-appearance:none;text-overflow:ellipsis;background-image:linear-gradient(45deg,transparent 50%,var(--sub) 50%),linear-gradient(135deg,var(--sub) 50%,transparent 50%);background-position:calc(100% - 14px) 52%,calc(100% - 9px) 52%;background-size:5px 5px;background-repeat:no-repeat;color:var(--text)}
.agechip{align-self:flex-start;padding:4px 12px;border-radius:999px;font-size:.78rem;font-weight:700}
.agechip.ok{background:rgba(34,197,94,.15);color:#22c55e}
.agechip.bad{background:rgba(239,68,68,.15);color:var(--danger)}
.auth.top{justify-content:flex-start}
.brandicon{display:block;margin:0 auto;border-radius:22%;box-shadow:0 10px 40px rgba(0,0,0,.45),0 0 36px rgba(139,92,246,.35);object-fit:cover}
.provlist{display:flex;flex-direction:column;gap:10px}
.provbtn{justify-content:flex-start;gap:12px;padding:12px 16px}
.provic{width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:.9rem;flex:none}
.provsheet{position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center}
.provcard{width:100%;max-width:420px;background:var(--card);border-radius:22px 22px 0 0;padding:22px;display:flex;flex-direction:column;gap:12px;align-items:stretch;text-align:center}
.provcard .provic{align-self:center;width:44px;height:44px;font-size:1.3rem}
.pwrules{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:.72rem;color:var(--sub);margin-top:4px}
.pwrules .ok{color:#22c55e;font-weight:700}
.agree{display:flex;gap:10px;align-items:flex-start;font-size:.78rem;color:var(--sub);line-height:1.5}
.agree input{width:18px;height:18px;margin-top:2px;flex:none;accent-color:var(--accent)}
.demobox{background:rgba(250,204,21,.12);border:1px dashed #facc15;border-radius:12px;padding:10px 12px;font-size:.78rem;text-align:center}
.democode{font-size:1.1rem;letter-spacing:.2em;margin-inline-start:6px}
.codein{text-align:center;font-size:1.4rem;letter-spacing:.4em}
.splash{position:fixed;inset:0;z-index:999;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;animation:splashOut .45s ease 1.05s forwards}
.splash .brandicon{animation:splashPop .8s cubic-bezier(.2,.9,.25,1.2) both}
.splashname{font-size:1.5rem;font-weight:800;letter-spacing:.04em;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
@keyframes splashPop{0%{transform:scale(.4);opacity:0}100%{transform:scale(1);opacity:1}}
@keyframes splashOut{to{opacity:0;visibility:hidden}}
`;
