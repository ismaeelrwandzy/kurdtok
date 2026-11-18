/* KurdTok — account.tsx : account management rows + panels */
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useApp } from './state';
import { Icon, downloadBlob } from './utils';
import type { Lang } from './utils';
import { Sheet, Switch } from './ui';
import { Row, SheetTitle } from './settings';
import { BirthPicker, ageOf } from './auth';

const TX: Record<Lang, Record<string, string>> = {
  en: {
    loc: 'Country / city', locPh: 'e.g. Rawanduz, Erbil', gender: 'Gender', male: 'Male', female: 'Female', none: 'Prefer not to say', accType: 'Account type', personal: 'Personal', creator: 'Creator', business: 'Business', saveBirth: 'Save birth date', under18: 'You must be 18 or older.', notConf: 'Not confirmed', details: 'More details', tapEdit: 'Tap to edit',
    info: 'Account information', infoSub: 'Name, email, phone, birth date', edit: 'Edit profile', sec: 'Password & security', secSub: 'Change password, two-step verification',
    linked: 'Linked accounts', linkedSub: 'Google, Facebook, Apple', devices: 'Login activity & devices', devicesSub: 'Where you are logged in', data: 'Download my data', dataSub: 'Export your account data as a file',
    blocked: 'Blocked users', del: 'Delete account', delSub: 'Permanently remove your account and data', name: 'Name', user: 'Username', email: 'Email', phone: 'Phone number', birth: 'Date of birth', age: 'Age',
    method: 'Sign-in method', created: 'Member since', status: 'Status', verified: 'Confirmed', notSet: 'Not added', add: 'Add', change: 'Change', cancel: 'Cancel', send: 'Send code', confirm: 'Confirm',
    newEmail: 'New email', newPhone: 'New phone number', bad: 'Invalid value.', wrong: 'Wrong code.', demo: 'DEMO code (no SMS/email server yet):', saved: 'Saved',
    link: 'Link', unlink: 'Unlink', on: 'Linked', thisDev: 'This device', now: 'Active now', out: 'Log out', pwd: 'Password', google: 'Google', facebook: 'Facebook', apple: 'Apple ID', phoneM: 'Phone number',
    demoAcc: 'You are using a demo account. Create a real account to manage these details.', exported: 'Your data file was downloaded.',
    delBody: 'This permanently deletes your account, posts, chats and settings from this device. Type your username to confirm.', delGo: 'Delete forever',
    note: 'Linking is stored on this device only until a server is connected.',
  },
  ckb: {
    loc: 'وڵات / شار', locPh: 'نموونە: ڕەواندز، هەولێر', gender: 'ڕەگەز', male: 'نێر', female: 'مێ', none: 'نامەوێت بڵێم', accType: 'جۆری ئەکاونت', personal: 'کەسی', creator: 'دروستکەر', business: 'بازرگانی', saveBirth: 'پاشەکەوتکردنی بەروار', under18: 'دەبێ تەمەنت ١٨ ساڵ یان زیاتر بێت.', notConf: 'پشتڕاست نەکراوەتەوە', details: 'وردەکاری زیاتر', tapEdit: 'بکە بۆ دەستکاری',
    info: 'زانیاری ئەکاونت', infoSub: 'ناو، ئیمەیڵ، مۆبایل، بەرواری لەدایکبوون', edit: 'دەستکاری پڕۆفایل', sec: 'پاسوۆرد و پاراستن', secSub: 'گۆڕینی پاسوۆرد، پشتڕاستکردنەوەی دوو هەنگاوی',
    linked: 'ئەکاونتە بەستراوەکان', linkedSub: 'گۆگڵ، فەیسبووک، ئەپڵ', devices: 'چالاکی چوونەژوورەوە و ئامێرەکان', devicesSub: 'لە کوێ چوویتەتە ژوورەوە', data: 'داگرتنی داتاکانم', dataSub: 'داتای ئەکاونتەکەت وەک فایل دەرباز بکە',
    blocked: 'بەکارهێنەرە بلۆککراوەکان', del: 'سڕینەوەی ئەکاونت', delSub: 'ئەکاونت و داتاکانت بۆ هەمیشە دەسڕدرێنەوە', name: 'ناو', user: 'ناوی بەکارهێنەر', email: 'ئیمەیڵ', phone: 'ژمارەی مۆبایل', birth: 'بەرواری لەدایکبوون', age: 'تەمەن',
    method: 'شێوازی چوونەژوورەوە', created: 'ئەندام لە', status: 'دۆخ', verified: 'پشتڕاستکراوە', notSet: 'زیاد نەکراوە', add: 'زیادکردن', change: 'گۆڕین', cancel: 'پاشگەزبوونەوە', send: 'ناردنی کۆد', confirm: 'پشتڕاستکردنەوە',
    newEmail: 'ئیمەیڵی نوێ', newPhone: 'ژمارەی مۆبایلی نوێ', bad: 'نرخەکە دروست نییە.', wrong: 'کۆدەکە هەڵەیە.', demo: 'کۆدی تاقیکاری (هێشتا سێرڤەری SMS/ئیمەیڵ نییە):', saved: 'پاشەکەوت کرا',
    link: 'بەستنەوە', unlink: 'جیاکردنەوە', on: 'بەستراوە', thisDev: 'ئەم ئامێرە', now: 'ئێستا چالاکە', out: 'چوونەدەرەوە', pwd: 'پاسوۆرد', google: 'گۆگڵ', facebook: 'فەیسبووک', apple: 'ئەپڵ ئایدی', phoneM: 'ژمارەی مۆبایل',
    demoAcc: 'تۆ ئەکاونتی تاقیکاری بەکاردەهێنیت. ئەکاونتێکی ڕاستەقینە دروست بکە بۆ بەڕێوەبردنی ئەم زانیارییانە.', exported: 'فایلی داتاکانت داگیرا.',
    delBody: 'ئەکاونت، پۆست، چات و ڕێکخستنەکانت بۆ هەمیشە لەسەر ئەم ئامێرە دەسڕدرێنەوە. بۆ پشتڕاستکردنەوە ناوی بەکارهێنەرەکەت بنووسە.', delGo: 'سڕینەوە بۆ هەمیشە',
    note: 'بەستنەوەکان تەنها لەسەر ئەم ئامێرە پاشەکەوت دەکرێن تا سێرڤەر بەستەر دەکرێت.',
  },
  ar: {
    loc: 'البلد / المدينة', locPh: 'مثال: رواندز، أربيل', gender: 'الجنس', male: 'ذكر', female: 'أنثى', none: 'أفضل عدم الذكر', accType: 'نوع الحساب', personal: 'شخصي', creator: 'صانع محتوى', business: 'تجاري', saveBirth: 'حفظ تاريخ الميلاد', under18: 'يجب أن يكون عمرك 18 عامًا أو أكثر.', notConf: 'غير مؤكد', details: 'تفاصيل إضافية', tapEdit: 'اضغط للتعديل',
    info: 'معلومات الحساب', infoSub: 'الاسم، البريد، الهاتف، تاريخ الميلاد', edit: 'تعديل الملف الشخصي', sec: 'كلمة المرور والأمان', secSub: 'تغيير كلمة المرور، التحقق بخطوتين',
    linked: 'الحسابات المرتبطة', linkedSub: 'Google وFacebook وApple', devices: 'نشاط الدخول والأجهزة', devicesSub: 'أين سجّلت الدخول', data: 'تنزيل بياناتي', dataSub: 'صدّر بيانات حسابك كملف',
    blocked: 'المستخدمون المحظورون', del: 'حذف الحساب', delSub: 'حذف حسابك وبياناتك نهائيًا', name: 'الاسم', user: 'اسم المستخدم', email: 'البريد الإلكتروني', phone: 'رقم الهاتف', birth: 'تاريخ الميلاد', age: 'العمر',
    method: 'طريقة الدخول', created: 'عضو منذ', status: 'الحالة', verified: 'مؤكد', notSet: 'غير مضاف', add: 'إضافة', change: 'تغيير', cancel: 'إلغاء', send: 'إرسال الرمز', confirm: 'تأكيد',
    newEmail: 'بريد جديد', newPhone: 'رقم هاتف جديد', bad: 'قيمة غير صحيحة.', wrong: 'الرمز غير صحيح.', demo: 'رمز تجريبي (لا يوجد خادم SMS/بريد بعد):', saved: 'تم الحفظ',
    link: 'ربط', unlink: 'إلغاء الربط', on: 'مرتبط', thisDev: 'هذا الجهاز', now: 'نشط الآن', out: 'تسجيل الخروج', pwd: 'كلمة المرور', google: 'Google', facebook: 'Facebook', apple: 'Apple ID', phoneM: 'رقم الهاتف',
    demoAcc: 'أنت تستخدم حسابًا تجريبيًا. أنشئ حسابًا حقيقيًا لإدارة هذه البيانات.', exported: 'تم تنزيل ملف بياناتك.',
    delBody: 'سيتم حذف حسابك ومنشوراتك ومحادثاتك وإعداداتك نهائيًا من هذا الجهاز. اكتب اسم المستخدم للتأكيد.', delGo: 'حذف نهائيًا',
    note: 'الربط محفوظ على هذا الجهاز فقط حتى يتم توصيل خادم.',
  },
};

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const cleanPhone = (v: string) => v.replace(/[\s\-()]/g, '');
const isPhone = (v: string) => /^\+?\d{8,15}$/.test(cleanPhone(v));
const Chev = () => <Icon name="chevron" className="flip-rtl" size={18} />;

function Page({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Sheet label={title} onClose={onClose} tall>
      <SheetTitle title={title} onClose={onClose} />
      <div className="scroll s2page" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </Sheet>
  );
}

function ContactEditor({ kind, T, onDone }: { kind: 'email' | 'phone'; T: Record<string, string>; onDone: () => void }) {
  const app = useApp();
  const [val, setVal] = useState('');
  const [sent, setSent] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const ok = kind === 'email' ? isEmail(val.trim()) : isPhone(val);
  return (
    <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!sent ? (
        <>
          <input className="input" dir="ltr" inputMode={kind === 'email' ? 'email' : 'tel'} autoCapitalize="none" placeholder={kind === 'email' ? T.newEmail : T.newPhone} value={val} onChange={(e) => setVal(e.target.value)} />
          {err ? <p className="errtext">{err}</p> : null}
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn primary grow" onClick={() => { if (!ok) return setErr(T.bad); setErr(''); setSent(String(Math.floor(100000 + Math.random() * 900000))); }}>{T.send}</button>
            <button type="button" className="btn" onClick={onDone}>{T.cancel}</button>
          </div>
        </>
      ) : (
        <>
          <div className="demobox">{T.demo} <b className="democode" dir="ltr">{sent}</b></div>
          <input className="input codein" dir="ltr" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          {err ? <p className="errtext">{err}</p> : null}
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn primary grow" disabled={code.length < 6} onClick={() => {
              if (code !== sent) return setErr(T.wrong);
              app.updateAccount(kind === 'email' ? { email: val.trim().toLowerCase() } : { phone: cleanPhone(val) });
              app.toast(T.saved);
              onDone();
            }}>{T.confirm}</button>
            <button type="button" className="btn" onClick={onDone}>{T.cancel}</button>
          </div>
        </>
      )}
    </div>
  );
}

function InfoPanel({ T, onClose }: { T: Record<string, string>; onClose: () => void }) {
  const app = useApp();
  const acc = app.account;
  const lang = app.settings.language;
  const [edit, setEdit] = useState<'email' | 'phone' | 'birth' | 'loc' | null>(null);
  const [birth, setBirth] = useState(acc?.birth ?? '');
  const [birthErr, setBirthErr] = useState('');
  const [loc, setLoc] = useState(app.profile.location ?? '');
  const fmt = (n?: number) => (n ? new Date(n).toLocaleDateString(lang) : '—');
  const methodName = acc?.provider === 'phone' ? (acc.email ? T.email : T.phoneM) : acc?.provider && acc.provider !== 'password' ? T[acc.provider] : T.pwd;
  const confirmed = !!(acc?.verified || acc?.email || acc?.phone);
  const seg = <V extends string>(value: V | undefined, opts: { v: V; l: string }[], on: (v: V) => void) => (
    <div className="seg" style={{ flexWrap: 'wrap' }}>
      {opts.map((o) => <button key={o.v} type="button" className={value === o.v ? 'on' : ''} aria-pressed={value === o.v} onClick={() => on(o.v)}>{o.l}</button>)}
    </div>
  );
  return (
    <Page title={T.info} onClose={onClose}>
      {!acc ? <p className="small sub">{T.demoAcc}</p> : null}
      <div className="card cardlist">
        <Row icon="user" label={T.name} desc={app.profile.name} onClick={() => { onClose(); app.push({ name: 'editProfile' }); }}><Chev /></Row>
        <Row icon="at" label={T.user} desc={'@' + app.profile.username} onClick={() => { onClose(); app.push({ name: 'editProfile' }); }}><Chev /></Row>
        <Row icon="calendar" label={T.birth} desc={acc?.birth ? `${acc.birth} · ${T.age}: ${ageOf(acc.birth)}` : T.tapEdit} onClick={() => acc && setEdit(edit === 'birth' ? null : 'birth')}>{acc ? <span className="sub small">{acc.birth ? T.change : T.add}</span> : null}</Row>
        {edit === 'birth' ? (
          <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <BirthPicker label={T.birth} ageLabel={T.age} value={birth} onChange={setBirth} lang={lang} />
            {birthErr ? <p className="errtext">{birthErr}</p> : null}
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn primary grow" onClick={() => { if (!birth) return setBirthErr(T.bad); if (ageOf(birth) < 18) return setBirthErr(T.under18); setBirthErr(''); app.updateAccount({ birth }); app.toast(T.saved); setEdit(null); }}>{T.saveBirth}</button>
              <button type="button" className="btn" onClick={() => setEdit(null)}>{T.cancel}</button>
            </div>
          </div>
        ) : null}
        <Row icon="clock" label={T.created} desc={fmt(acc?.createdAt)} />
        <Row icon="key" label={T.method} desc={String(methodName)} />
        <Row icon="check" label={T.status} desc={confirmed ? T.verified : T.notConf} />
      </div>
      {acc ? (
        <div className="card cardlist" style={{ marginTop: 10 }}>
          <Row icon="mail" label={T.email} desc={acc.email ?? T.notSet} onClick={() => setEdit(edit === 'email' ? null : 'email')}><span className="sub small">{acc.email ? T.change : T.add}</span></Row>
          {edit === 'email' ? <ContactEditor kind="email" T={T} onDone={() => setEdit(null)} /> : null}
          <Row icon="phone" label={T.phone} desc={acc.phone ?? T.notSet} onClick={() => setEdit(edit === 'phone' ? null : 'phone')}><span className="sub small">{acc.phone ? T.change : T.add}</span></Row>
          {edit === 'phone' ? <ContactEditor kind="phone" T={T} onDone={() => setEdit(null)} /> : null}
        </div>
      ) : null}
      {acc ? (
        <>
          <div className="sectionhead">{T.details}</div>
          <div className="card cardlist">
            <Row icon="globe" label={T.loc} desc={app.profile.location || T.notSet} onClick={() => setEdit(edit === 'loc' ? null : 'loc')}><span className="sub small">{T.change}</span></Row>
            {edit === 'loc' ? (
              <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input className="input" id="locin" maxLength={60} placeholder={T.locPh} value={loc} onChange={(e) => setLoc(e.target.value)} />
                <div className="row" style={{ gap: 8 }}>
                  <button type="button" className="btn primary grow" onClick={() => { app.updateProfile({ location: loc.trim() }); app.toast(T.saved); setEdit(null); }}>{T.confirm}</button>
                  <button type="button" className="btn" onClick={() => setEdit(null)}>{T.cancel}</button>
                </div>
              </div>
            ) : null}
            <div className="listrow" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 600 }}>{T.gender}</div>
              {seg(acc.gender ?? 'none', [{ v: 'male', l: T.male }, { v: 'female', l: T.female }, { v: 'none', l: T.none }], (v) => app.updateAccount({ gender: v }))}
            </div>
            <div className="listrow" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 600 }}>{T.accType}</div>
              {seg(acc.accountType ?? 'personal', [{ v: 'personal', l: T.personal }, { v: 'creator', l: T.creator }, { v: 'business', l: T.business }], (v) => app.updateAccount({ accountType: v }))}
            </div>
          </div>
        </>
      ) : null}
      <button type="button" className="btn block" style={{ marginTop: 12 }} onClick={() => { onClose(); app.push({ name: 'editProfile' }); }}><Icon name="edit" size={18} /> {T.edit}</button>
    </Page>
  );
}

function LinkedPanel({ T, onClose }: { T: Record<string, string>; onClose: () => void }) {
  const app = useApp();
  const acc = app.account;
  const isIOS = useMemo(() => /iPad|iPhone|iPod/.test(navigator.userAgent), []);
  const list = ['google', 'facebook', ...(isIOS ? ['apple'] : [])];
  const linked = acc?.linked ?? [];
  const toggle = (p: string) => app.updateAccount({ linked: linked.includes(p) ? linked.filter((x) => x !== p) : [...linked, p] });
  return (
    <Page title={T.linked} onClose={onClose}>
      {!acc ? <p className="small sub">{T.demoAcc}</p> : null}
      <div className="card cardlist">
        {list.map((p) => {
          const on = linked.includes(p) || acc?.provider === p;
          return (
            <Row key={p} icon="link" label={T[p]} desc={on ? T.on : undefined}>
              {acc?.provider === p ? <span className="sub small">{T.on}</span> : <Switch checked={on} label={T[p]} onChange={() => { if (acc) toggle(p); }} />}
            </Row>
          );
        })}
      </div>
      <p className="small sub">{T.note}</p>
    </Page>
  );
}

function DevicesPanel({ T, onClose }: { T: Record<string, string>; onClose: () => void }) {
  const app = useApp();
  const ua = navigator.userAgent;
  const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '—';
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '—';
  return (
    <Page title={T.devices} onClose={onClose}>
      <div className="card cardlist">
        <Row icon="phone" label={`${os} · ${br}`} desc={`${T.thisDev} — ${T.now}`}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} /></Row>
      </div>
      <button type="button" className="btn danger block" style={{ marginTop: 12 }} onClick={() => { onClose(); app.logout(); }}><Icon name="logout" size={18} /> {T.out}</button>
    </Page>
  );
}

function DeleteSheet({ T, onClose }: { T: Record<string, string>; onClose: () => void }) {
  const app = useApp();
  const [v, setV] = useState('');
  const u = app.profile.username;
  return (
    <Sheet label={T.del} onClose={onClose}>
      <SheetTitle title={T.del} onClose={onClose} />
      <p className="small sub" style={{ margin: 0 }}>{T.delBody}</p>
      <input className="input" dir="ltr" autoCapitalize="none" placeholder={u} value={v} onChange={(e) => setV(e.target.value)} />
      <button type="button" className="btn danger block" disabled={v.trim().toLowerCase() !== u.toLowerCase()} onClick={() => void app.resetAll()}><Icon name="trash" size={18} /> {T.delGo}</button>
    </Sheet>
  );
}

export function AccountRows({ onSecurity, onBlocked }: { onSecurity: () => void; onBlocked: () => void }) {
  const app = useApp();
  const T = TX[app.settings.language] ?? TX.en;
  const [p, setP] = useState<'info' | 'linked' | 'devices' | 'del' | null>(null);
  const acc = app.account;
  const exportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      account: acc ? { name: acc.name, username: acc.username, email: acc.email, phone: acc.phone, birth: acc.birth, provider: acc.provider, createdAt: acc.createdAt, linked: acc.linked } : null,
      profile: app.profile,
      settings: app.settings,
      following: app.followed,
      blocked: app.blocked,
      posts: app.posts.filter((x) => x.mine).map((x) => ({ id: x.id, caption: x.caption, kind: x.kind, likes: x.likes, createdAt: x.createdAt })),
    };
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'kurdtok-data.json');
    app.toast(T.exported);
  };
  return (
    <>
      <div className="card cardlist">
        <Row icon="user" label={T.info} desc={acc?.email ?? acc?.phone ?? T.infoSub} onClick={() => setP('info')}><Chev /></Row>
        <Row icon="edit" label={T.edit} onClick={() => app.push({ name: 'editProfile' })}><Chev /></Row>
        <Row icon="lock" label={T.sec} desc={acc?.totpOn ? undefined : T.secSub} onClick={onSecurity}><Chev /></Row>
        <Row icon="link" label={T.linked} desc={T.linkedSub} onClick={() => setP('linked')}><Chev /></Row>
        <Row icon="phone" label={T.devices} desc={T.devicesSub} onClick={() => setP('devices')}><Chev /></Row>
        <Row icon="users" label={T.blocked} desc={String(app.blocked.length)} onClick={onBlocked}><Chev /></Row>
        <Row icon="download" label={T.data} desc={T.dataSub} onClick={exportData}><Chev /></Row>
        <Row icon="trash" label={T.del} desc={T.delSub} onClick={() => setP('del')}><Chev /></Row>
      </div>
      {p === 'info' ? <InfoPanel T={T} onClose={() => setP(null)} /> : null}
      {p === 'linked' ? <LinkedPanel T={T} onClose={() => setP(null)} /> : null}
      {p === 'devices' ? <DevicesPanel T={T} onClose={() => setP(null)} /> : null}
      {p === 'del' ? <DeleteSheet T={T} onClose={() => setP(null)} /> : null}
    </>
  );
}
