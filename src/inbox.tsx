import { useState } from 'react';
import { Avatar, Sheet, Switch } from './ui';
import { useApp } from './state';
import { Icon, pick, usePersistentState, type Lang } from './utils';
import { CSS2 } from './css2';
import { UPLOAD_CSS } from './upload';
import { DESIGN_CSS } from './design';
import { SHARE_CSS } from './share';

export type ActiveStatus = 'public' | 'friends' | 'none';
export interface InboxNote { text: string; at: number }

const L = {
  en: {
    main: 'Main', requests: 'Requests', unread: 'Unread', starred: 'Starred', activity: 'Activity & new followers',
    tools: 'Messaging tools', select: 'Select chats', quick: 'Quick replies', intro: 'Chat intro', faq: 'Frequently asked questions',
    statusTitle: "Choose who can see when you're active", pub: 'Public', pubD: 'Anyone can see your activity status.',
    fri: 'Friends', friD: "Followers you follow back can see your activity status.", none: 'No one', noneD: 'No one can see your activity status.',
    noteHint: 'Whisper, whisper', noteTitle: 'Share a note', noteSub: 'Your note disappears after 24 hours.', share: 'Share', del: 'Delete',
    noReq: 'No message requests', noReqD: "Messages from people you don't follow will show up here.", noStar: 'No starred chats', noUnread: 'All caught up',
    qrEmpty: 'No quick replies yet', qrAdd: 'Add', qrPh: 'Type a reply…', qrHint: 'Tap a reply to use it.',
    introOn: 'Intro for new chats', introPh: 'Hi! Welcome to my chat 🤍', introSave: 'Save', introNote: 'Saved on this device. Auto-sending starts once online messaging is connected.',
    selected: '{n} selected', markRead: 'Mark read', star: 'Star', mute: 'Mute', cancel: 'Cancel', delQ: 'Delete the selected chats?',
    q1: 'How do I delete chats?', a1: 'Open Select chats, pick the chats and tap Delete.',
    q2: 'How do I mute a chat?', a2: 'Select the chat and tap Mute, or use the chat info page.',
    q3: 'What are quick replies?', a3: 'Ready-made messages you can send in one tap from any chat.',
    q4: 'Who can see my activity?', a4: 'Tap the status dot next to Inbox and choose.',
  },
  ckb: {
    main: 'سەرەکی', requests: 'داواکارییەکان', unread: 'نەخوێندراو', starred: 'ئەستێرەدار', activity: 'چالاکی و فۆڵۆوەری نوێ',
    tools: 'ئامرازەکانی نامە', select: 'هەڵبژاردنی چات', quick: 'وەڵامی خێرا', intro: 'پێشەکی چات', faq: 'پرسیارە باوەکان',
    statusTitle: 'دیاری بکە کێ دەتوانێت ببینێت کە چالاکیت', pub: 'گشتی', pubD: 'هەر کەسێک دەتوانێت دۆخی چالاکیت ببینێت.',
    fri: 'هاوڕێکان', friD: 'ئەو فۆڵۆوەرانەی تۆش فۆڵۆیان دەکەیت دەتوانن دۆخی چالاکیت ببینن.', none: 'هیچ کەس', noneD: 'هیچ کەسێک دۆخی چالاکیت نابینێت.',
    noteHint: 'چرپە، چرپە', noteTitle: 'نۆتێک بڵاو بکەرەوە', noteSub: 'نۆتەکەت دوای ٢٤ کاتژمێر دەسڕێتەوە.', share: 'بڵاوکردنەوە', del: 'سڕینەوە',
    noReq: 'داواکاری نامە نییە', noReqD: 'نامەی ئەو کەسانەی فۆڵۆیان ناکەیت لێرە دەردەکەون.', noStar: 'هیچ چاتێکی ئەستێرەدار نییە', noUnread: 'هەموو نامەکان خوێندراونەتەوە',
    qrEmpty: 'هێشتا وەڵامی خێرات نییە', qrAdd: 'زیادکردن', qrPh: 'وەڵامێک بنووسە…', qrHint: 'لەسەر وەڵامێک دابگرە بۆ بەکارهێنان.',
    introOn: 'پێشەکی بۆ چاتی نوێ', introPh: 'سڵاو! بەخێربێیت بۆ چاتەکەم 🤍', introSave: 'پاشەکەوتکردن', introNote: 'لەسەر ئەم ئامێرە پاشەکەوت دەکرێت. ناردنی خۆکار دوای بەستنی سێرڤەر کار دەکات.',
    selected: '{n} هەڵبژێردراو', markRead: 'خوێندرایەوە', star: 'ئەستێرە', mute: 'بێدەنگ', cancel: 'پاشگەزبوونەوە', delQ: 'ئەو چاتە هەڵبژێردراوانە بسڕدرێنەوە؟',
    q1: 'چۆن چات بسڕمەوە؟', a1: 'هەڵبژاردنی چات بکەرەوە، چاتەکان دیاری بکە و سڕینەوە دابگرە.',
    q2: 'چۆن چات بێدەنگ بکەم؟', a2: 'چاتەکە دیاری بکە و بێدەنگ دابگرە، یان لە زانیاری چات.',
    q3: 'وەڵامی خێرا چییە؟', a3: 'نامەی ئامادەکراون کە بە یەک دەست لێدان لە هەر چاتێک دەینێریت.',
    q4: 'کێ دەتوانێت چالاکیم ببینێت؟', a4: 'لەسەر خاڵی دۆخ لە تەنیشت ئینبۆکس دابگرە و هەڵبژێرە.',
  },
  ar: {
    main: 'الرئيسية', requests: 'الطلبات', unread: 'غير مقروءة', starred: 'المميزة', activity: 'النشاط والمتابعون الجدد',
    tools: 'أدوات المراسلة', select: 'تحديد المحادثات', quick: 'ردود سريعة', intro: 'مقدمة المحادثة', faq: 'الأسئلة الشائعة',
    statusTitle: 'اختر من يمكنه رؤية نشاطك', pub: 'عام', pubD: 'يمكن لأي شخص رؤية حالة نشاطك.',
    fri: 'الأصدقاء', friD: 'المتابعون الذين تتابعهم أيضًا يمكنهم رؤية حالة نشاطك.', none: 'لا أحد', noneD: 'لا أحد يمكنه رؤية حالة نشاطك.',
    noteHint: 'همسة، همسة', noteTitle: 'شارك ملاحظة', noteSub: 'تختفي ملاحظتك بعد 24 ساعة.', share: 'مشاركة', del: 'حذف',
    noReq: 'لا توجد طلبات رسائل', noReqD: 'ستظهر هنا رسائل من لا تتابعهم.', noStar: 'لا توجد محادثات مميزة', noUnread: 'لا رسائل جديدة',
    qrEmpty: 'لا توجد ردود سريعة بعد', qrAdd: 'إضافة', qrPh: 'اكتب ردًا…', qrHint: 'اضغط على رد لاستخدامه.',
    introOn: 'مقدمة للمحادثات الجديدة', introPh: 'مرحبًا! أهلاً بك في محادثتي 🤍', introSave: 'حفظ', introNote: 'تُحفظ على هذا الجهاز. الإرسال التلقائي يبدأ عند ربط المراسلة عبر الإنترنت.',
    selected: '{n} محددة', markRead: 'تحديد كمقروء', star: 'تمييز', mute: 'كتم', cancel: 'إلغاء', delQ: 'حذف المحادثات المحددة؟',
    q1: 'كيف أحذف المحادثات؟', a1: 'افتح تحديد المحادثات، اختر المحادثات واضغط حذف.',
    q2: 'كيف أكتم محادثة؟', a2: 'حدد المحادثة واضغط كتم، أو من صفحة معلومات المحادثة.',
    q3: 'ما هي الردود السريعة؟', a3: 'رسائل جاهزة ترسلها بضغطة واحدة من أي محادثة.',
    q4: 'من يمكنه رؤية نشاطي؟', a4: 'اضغط على نقطة الحالة بجانب صندوق الوارد واختر.',
  },
};
export type InboxStr = typeof L.en;
export const useInboxL = (lang: Lang): InboxStr => L[lang] ?? L.en;

export function useActiveStatus() {
  return usePersistentState<ActiveStatus>('activeStatus', 'public');
}
export function useInboxNote(): [InboxNote | null, (n: InboxNote | null) => void] {
  const [n, setN] = usePersistentState<InboxNote | null>('inboxNote', null);
  const live = n && Date.now() - n.at < 24 * 3600 * 1000 ? n : null;
  return [live, setN];
}
export function useQuickReplies() {
  const app = useApp();
  const lang = app.settings.language;
  return usePersistentState<string[]>('quickReplies', () => [
    pick(lang, 'Hi! 👋', 'سڵاو! 👋', 'مرحبًا! 👋'),
    pick(lang, 'Thanks 🤍', 'سوپاس 🤍', 'شكرًا 🤍'),
    pick(lang, "I'll reply soon", 'زوو وەڵام دەدەمەوە', 'سأرد قريبًا'),
    pick(lang, 'Okay 👍', 'باشە 👍', 'حسنًا 👍'),
  ]);
}

function SheetHead({ title, onClose }: { title: string; onClose: () => void }) {
  const { t } = useApp();
  return (
    <div className="row between ib-head">
      <h3>{title}</h3>
      <button type="button" className="iconbtn" onClick={onClose} aria-label={t('common.close')}><Icon name="x" /></button>
    </div>
  );
}

export function StatusSheet({ value, onChange, onClose }: { value: ActiveStatus; onChange: (v: ActiveStatus) => void; onClose: () => void }) {
  const app = useApp();
  const S = useInboxL(app.settings.language);
  const opts: { id: ActiveStatus; a: string; b: string }[] = [
    { id: 'public', a: S.pub, b: S.pubD },
    { id: 'friends', a: S.fri, b: S.friD },
    { id: 'none', a: S.none, b: S.noneD },
  ];
  return (
    <Sheet label={S.statusTitle} onClose={onClose} tall>
      <button type="button" className="iconbtn ib-x" onClick={onClose} aria-label={app.t('common.close')}><Icon name="x" /></button>
      <div className="ib-statusav"><Avatar src={app.profile.avatar} name={app.profile.name} size={92} /></div>
      <h2 className="ib-statust">{S.statusTitle}</h2>
      <div className="card cardlist">
        {opts.map((o) => (
          <button key={o.id} type="button" className="ib-opt" role="radio" aria-checked={value === o.id} onClick={() => { onChange(o.id); onClose(); }}>
            <div className="grow"><b>{o.a}</b><div className="small sub">{o.b}</div></div>
            <span className={`ib-radio${value === o.id ? ' on' : ''}`} />
          </button>
        ))}
      </div>
    </Sheet>
  );
}

export function QuickRepliesSheet({ onClose, onPick }: { onClose: () => void; onPick?: (s: string) => void }) {
  const app = useApp();
  const S = useInboxL(app.settings.language);
  const [list, setList] = useQuickReplies();
  const [v, setV] = useState('');
  const add = () => {
    const x = v.trim();
    if (!x || list.length >= 20) return;
    setList([...list, x.slice(0, 160)]);
    setV('');
  };
  return (
    <Sheet label={S.quick} onClose={onClose} tall>
      <SheetHead title={S.quick} onClose={onClose} />
      {onPick ? <p className="small sub" style={{ margin: 0 }}>{S.qrHint}</p> : null}
      <div className="scroll ib-list">
        {list.length === 0 ? <p className="sub small">{S.qrEmpty}</p> : null}
        {list.map((q, i) => (
          <div className="ib-qr" key={q + i}>
            <button type="button" className="grow ib-qrt" onClick={() => { if (onPick) { onPick(q); onClose(); } }}>{q}</button>
            <button type="button" className="iconbtn" aria-label={S.del} onClick={() => setList(list.filter((_, j) => j !== i))}><Icon name="trash" size={18} /></button>
          </div>
        ))}
      </div>
      <form className="row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input className="pill-input grow" value={v} maxLength={160} placeholder={S.qrPh} aria-label={S.qrPh} onChange={(e) => setV(e.target.value)} />
        <button type="submit" className="btn primary sm" disabled={!v.trim()}>{S.qrAdd}</button>
      </form>
    </Sheet>
  );
}

function IntroSheet({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const S = useInboxL(app.settings.language);
  const [intro, setIntro] = usePersistentState<{ on: boolean; text: string }>('chatIntro', { on: false, text: '' });
  const [text, setText] = useState(intro.text);
  const [on, setOn] = useState(intro.on);
  return (
    <Sheet label={S.intro} onClose={onClose}>
      <SheetHead title={S.intro} onClose={onClose} />
      <div className="row between"><b>{S.introOn}</b><Switch checked={on} label={S.introOn} onChange={setOn} /></div>
      <textarea className="input" value={text} maxLength={200} placeholder={S.introPh} aria-label={S.intro} onChange={(e) => setText(e.target.value)} />
      <span className="small sub">{S.introNote}</span>
      <button type="button" className="btn primary block" onClick={() => { setIntro({ on, text: text.trim() }); app.toast(app.t('edit.saved')); onClose(); }}>{S.introSave}</button>
    </Sheet>
  );
}

function FaqSheet({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const S = useInboxL(app.settings.language);
  const [open, setOpen] = useState(0);
  const items = [[S.q1, S.a1], [S.q2, S.a2], [S.q3, S.a3], [S.q4, S.a4]];
  return (
    <Sheet label={S.faq} onClose={onClose} tall>
      <SheetHead title={S.faq} onClose={onClose} />
      <div className="card cardlist scroll">
        {items.map(([q, a], i) => (
          <button key={q} type="button" className="ib-faq" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
            <b>{q}</b>
            {open === i ? <span className="small sub">{a}</span> : null}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

export function ToolsSheets({ onClose, onSelect }: { onClose: () => void; onSelect: () => void }) {
  const app = useApp();
  const S = useInboxL(app.settings.language);
  const [page, setPage] = useState<'menu' | 'quick' | 'intro' | 'faq'>('menu');
  if (page === 'quick') return <QuickRepliesSheet onClose={onClose} />;
  if (page === 'intro') return <IntroSheet onClose={onClose} />;
  if (page === 'faq') return <FaqSheet onClose={onClose} />;
  const rows: { icon: string; label: string; go: () => void }[] = [
    { icon: 'check', label: S.select, go: () => { onClose(); onSelect(); } },
    { icon: 'zap', label: S.quick, go: () => setPage('quick') },
    { icon: 'message', label: S.intro, go: () => setPage('intro') },
    { icon: 'info', label: S.faq, go: () => setPage('faq') },
  ];
  return (
    <Sheet label={S.tools} onClose={onClose}>
      <SheetHead title={S.tools} onClose={onClose} />
      <div className="ib-tools">
        {rows.map((r) => (
          <button key={r.icon} type="button" onClick={r.go}><Icon name={r.icon} size={24} /><span>{r.label}</span></button>
        ))}
      </div>
    </Sheet>
  );
}

export function NoteSheet({ note, onSave, onClose }: { note: InboxNote | null; onSave: (n: InboxNote | null) => void; onClose: () => void }) {
  const app = useApp();
  const S = useInboxL(app.settings.language);
  const [text, setText] = useState(note?.text ?? '');
  return (
    <Sheet label={S.noteTitle} onClose={onClose}>
      <SheetHead title={S.noteTitle} onClose={onClose} />
      <div className="ib-notedemo"><Avatar src={app.profile.avatar} name={app.profile.name} size={84} /><span className="ib-bubble big">{text.trim() || S.noteHint}</span></div>
      <input className="input" value={text} maxLength={60} placeholder={S.noteHint} aria-label={S.noteTitle} onChange={(e) => setText(e.target.value)} />
      <span className="small sub">{S.noteSub} ({text.length}/60)</span>
      <div className="row" style={{ gap: 8 }}>
        {note ? <button type="button" className="btn grow" onClick={() => { onSave(null); onClose(); }}>{S.del}</button> : null}
        <button type="button" className="btn primary grow" disabled={!text.trim()} onClick={() => { onSave({ text: text.trim(), at: Date.now() }); onClose(); }}>{S.share}</button>
      </div>
    </Sheet>
  );
}

export function EmptyNote({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="ib-empty"><Icon name={icon} size={34} /><b>{title}</b>{sub ? <span className="small sub">{sub}</span> : null}</div>
  );
}

const BASE_INBOX_CSS = CSS2 + UPLOAD_CSS + `
.sheet{color:var(--text)}
.ib-head{align-items:center}.ib-head h3{margin:0}
.ib-top{display:flex;align-items:center;gap:6px;margin:2px 0 10px}
.ib-top .ttl{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;font-size:1.25rem;font-weight:800}
.ib-pill{display:flex;align-items:center;gap:4px;padding:5px 8px;border-radius:9px;background:var(--card2);border:1px solid var(--border);color:var(--sub)}
.ib-dot{width:9px;height:9px;border-radius:50%;background:#22c55e}.ib-dot.off{background:#8b8b8b}
.ib-chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0 12px}
.ib-chips button{flex:none;padding:9px 15px;border-radius:12px;background:var(--card2);border:1px solid var(--border);font-weight:700;font-size:.85rem}
.ib-chips button.on{background:color-mix(in srgb,var(--accent) 20%,transparent);color:var(--accent);border-color:color-mix(in srgb,var(--accent) 45%,transparent)}
.ib-act{display:flex;align-items:center;gap:14px;width:100%;text-align:start;padding:6px 0 12px}
.ib-act .ic{width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#f43f5e,#be185d);color:#fff;display:flex;align-items:center;justify-content:center;flex:none;position:relative}
.ib-act .ic i{position:absolute;top:-3px;inset-inline-end:-3px;min-width:19px;height:19px;border-radius:10px;background:var(--accent);color:#fff;font-size:.68rem;font-style:normal;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 4px;border:2px solid var(--bg)}
.ib-sel{position:sticky;bottom:0;display:flex;align-items:center;gap:8px;padding:10px;margin-top:10px;border-radius:18px;background:var(--card);border:1px solid var(--border);box-shadow:0 6px 24px rgba(0,0,0,.25)}
.ib-sel .btn{padding:8px 10px}
.ib-check{width:22px;height:22px;border-radius:50%;border:2px solid var(--sub);flex:none;display:flex;align-items:center;justify-content:center;color:#fff}
.ib-check.on{background:var(--accent);border-color:var(--accent)}
.ib-opt{display:flex;align-items:center;gap:12px;width:100%;text-align:start;padding:14px 16px}
.ib-radio{width:26px;height:26px;border-radius:50%;border:2px solid var(--sub);flex:none;position:relative}
.ib-radio.on{border-color:var(--accent)}.ib-radio.on::after{content:"";position:absolute;inset:4px;border-radius:50%;background:var(--accent)}
.ib-statusav{display:flex;justify-content:center;margin-top:6px}.ib-statust{text-align:center;font-size:1.35rem;margin:6px 0}
.ib-x{align-self:flex-end}.ib-chev{transform:rotate(90deg)}
.ib-tools{display:flex;flex-direction:column}
.ib-tools button{display:flex;align-items:center;gap:16px;padding:16px 4px;font-size:1.05rem;font-weight:700;text-align:start}
.ib-list{display:flex;flex-direction:column;gap:8px;max-height:46vh}
.ib-qr{display:flex;align-items:center;gap:6px;background:var(--card2);border:1px solid var(--border);border-radius:16px;padding:4px 6px 4px 14px}
.ib-qrt{text-align:start;padding:10px 0;font-weight:600}
.ib-faq{display:flex;flex-direction:column;gap:6px;align-items:flex-start;text-align:start;padding:14px 16px;width:100%}
.ib-empty{display:flex;flex-direction:column;align-items:center;gap:6px;padding:34px 10px;text-align:center;color:var(--sub)}.ib-empty b{color:var(--text)}
.ib-bubble{position:absolute;top:-26px;inset-inline-start:2px;max-width:92px;padding:5px 9px;border-radius:14px;background:var(--card2);border:1px solid var(--border);color:var(--sub);font-size:.68rem;line-height:1.25;text-align:center;z-index:2;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word}
.ib-bubble.has{color:var(--text)}
.ib-bubble.big{position:static;max-width:200px;font-size:.9rem;padding:8px 12px}
.ib-notedemo{display:flex;flex-direction:column;align-items:center;gap:8px;padding-top:4px}
.storytray.hasnote{padding-top:30px}
.sb-views{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);color:#fff;font-weight:800;backdrop-filter:blur(10px)}
.stwho{position:absolute;inset-inline:16px;bottom:calc(92px + env(safe-area-inset-bottom));z-index:6;display:flex;align-items:center;gap:8px;max-width:max-content;padding:6px 12px 6px 6px;border-radius:999px;background:rgba(20,20,20,.55);border:1px solid rgba(255,255,255,.25);color:#fff;backdrop-filter:blur(12px)}
.stdays{opacity:.85;font-size:.85rem}
.stopts{display:flex;gap:8px;flex-wrap:wrap}
.stopts button{display:flex;align-items:center;gap:6px;padding:10px 14px;border-radius:14px;background:var(--card2);border:1.5px solid var(--border);font-weight:700}
.stopts button.on{border-color:var(--accent);color:var(--accent)}.stopts button.locked{opacity:.55}
.audmark{display:inline-flex;align-items:center;line-height:1;opacity:.95}
.ep-avatar{display:flex;flex-direction:column;align-items:center;gap:8px;padding-top:6px}
.ep-photo{position:relative;border-radius:50%;display:block}
.ep-cam{position:absolute;inset:0;border-radius:50%;background:rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;color:#fff}
.ep-card{padding:4px 0}
.ep-row{display:flex;align-items:center;gap:12px;width:100%;text-align:start;padding:16px 16px;min-height:56px}
.ep-k{width:34%;flex:none;font-weight:700}.ep-v{flex:1;min-width:0;color:var(--text)}
.ep-link .ep-v{color:var(--sub);font-weight:600}.ep-ch{color:var(--sub);flex:none}
html[dir="rtl"] .ep-ch{transform:scaleX(-1)}
.sc-list{display:flex;flex-direction:column;gap:12px;min-height:30vh;max-height:46vh}
.sc-empty{display:flex;flex-direction:column;align-items:center;gap:6px;padding:60px 0;text-align:center}.sc-empty b{font-size:1.3rem}.sc-empty span{color:var(--sub)}
.sc-row{display:flex;gap:10px;align-items:flex-start}
.sc-emojis{display:flex;justify-content:space-between;gap:2px}
.sc-emojis button{font-size:1.7rem;width:42px;height:42px;display:flex;align-items:center;justify-content:center}
.sc-input{display:flex;align-items:center;gap:10px}
.sc-input input{flex:1;min-width:0;height:44px;background:none;border:0;outline:0;font-size:1rem;color:var(--text)}
.sc-audio{display:flex;align-items:center;gap:4px;opacity:.85;max-width:60vw}
.sb-btn{position:relative}
.sb-btn i{position:absolute;top:2px;inset-inline-end:0;min-width:16px;height:16px;border-radius:8px;background:var(--accent);color:#fff;font-size:.62rem;font-style:normal;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 3px}
.storycap{flex:none;max-height:none!important;overflow:visible!important;color:#fff}
.storyown{align-items:center;gap:4px;color:#fff}
.storyown .chip,.storybottom .chip{background:rgba(255,255,255,.18);color:#fff;border:1px solid rgba(255,255,255,.3);backdrop-filter:blur(10px)}
.storyown .iconbtn{color:#fff}
.storyown{justify-content:flex-start!important}
.thumb .cnt{gap:3px}
`;

export const INBOX_CSS = BASE_INBOX_CSS + SHARE_CSS + DESIGN_CSS;
