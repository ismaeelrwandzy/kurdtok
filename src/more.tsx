/* KurdTok — more.tsx : other-user profile extras (options, lists, report) */
import { useState } from 'react';
import { useApp } from './state';
import { AUTHORS, VerifiedBadge, copyText, pick, usePersistentState, type AuthorInfo } from './utils';
import { Action, Avatar, Sheet } from './ui';

export const hashStr = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

/** Demo rule until the server exists: some demo creators keep their lists private. */
export const listsArePublic = (username: string): boolean => hashStr(username) % 4 !== 0;

export interface UserFlags { notify: string[]; fav: string[]; restricted: string[] }
export function useUserFlags(): [UserFlags, (u: string, k: keyof UserFlags) => void] {
  const [f, setF] = usePersistentState<UserFlags>('userFlags', { notify: [], fav: [], restricted: [] });
  const toggle = (u: string, k: keyof UserFlags) => setF({ ...f, [k]: f[k].includes(u) ? f[k].filter((x) => x !== u) : [...f[k], u] });
  return [f, toggle];
}

export function UserListsSheet({ username, initial, onClose }: { username: string; initial: 'following' | 'followers'; onClose: () => void }) {
  const app = useApp();
  const lang = app.settings.language;
  const [tab, setTab] = useState(initial);
  const h = hashStr(username + tab);
  const pool = AUTHORS.filter((a) => a.username !== username && !app.isBlocked(a.username));
  const count = Math.min(pool.length, 3 + (h % Math.max(1, pool.length - 2)));
  const list: AuthorInfo[] = Array.from({ length: count }, (_, i) => pool[(h + i * 5) % pool.length]).filter((a, i, arr) => arr.findIndex((x) => x.username === a.username) === i);
  return (
    <Sheet label={pick(lang, 'Followers and following', 'فۆڵۆوەر و فۆڵۆکراو', 'المتابعون والمتابَعون')} onClose={onClose} tall>
      <div className="seg" role="tablist">
        {(['following', 'followers'] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {k === 'following' ? app.t('profile.following') : app.t('profile.followers')}
          </button>
        ))}
      </div>
      <div className="scroll sc-list">
        {list.map((a) => (
          <button key={a.username} type="button" className="chatrow" onClick={() => { onClose(); app.push({ name: 'user', username: a.username }); }}>
            <Avatar emoji={a.emoji} name={a.name} color={a.color} size={44} />
            <div className="grow" style={{ textAlign: 'start' }}>
              <div className="row" style={{ gap: 5 }}><b className="truncate">{a.name}</b>{a.verified ? <VerifiedBadge size={14} /> : null}</div>
              <div className="small sub">@{a.username}</div>
            </div>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

const REASONS: [string, string, string][] = [
  ['Spam or scam', 'سپام یان فڕوفێڵ', 'بريد مزعج أو احتيال'],
  ['Harassment or bullying', 'ئازاردان یان هەڕەشە', 'مضايقة أو تنمر'],
  ['Inappropriate content', 'ناوەڕۆکی نەشیاو', 'محتوى غير لائق'],
  ['Fake account or impersonation', 'ئەکاونتی ساختە', 'حساب مزيف أو انتحال'],
  ['Under 18', 'تەمەن کەمتر لە ١٨', 'أقل من 18 عامًا'],
  ['Other', 'هۆکاری تر', 'سبب آخر'],
];
export function ReportSheet({ what, onClose }: { what: string; onClose: () => void }) {
  const app = useApp();
  const lang = app.settings.language;
  return (
    <Sheet label={pick(lang, 'Report', 'ڕاپۆرت', 'إبلاغ')} onClose={onClose}>
      <h3 style={{ margin: 0 }}>{pick(lang, 'Report', 'ڕاپۆرت', 'إبلاغ')} {what}</h3>
      <span className="small sub">{pick(lang, 'Why are you reporting this?', 'بۆچی ڕاپۆرتی دەکەیت؟', 'لماذا تبلغ؟')}</span>
      <div className="card cardlist">
        {REASONS.map((r) => (
          <button key={r[0]} type="button" className="ib-faq" onClick={() => { onClose(); app.toast(app.t('post.reported')); }}><b>{pick(lang, r[0], r[1], r[2])}</b></button>
        ))}
      </div>
    </Sheet>
  );
}

export function UserMoreSheet({ username, onClose, onBlocked }: { username: string; onClose: () => void; onBlocked: () => void }) {
  const app = useApp();
  const { t } = app;
  const lang = app.settings.language;
  const [flags, toggle] = useUserFlags();
  const [report, setReport] = useState(false);
  const on = (k: keyof UserFlags) => flags[k].includes(username);
  const link = `${location.origin}/@${username}`;
  if (report) return <ReportSheet what={`@${username}`} onClose={onClose} />;
  return (
    <Sheet label={t('chat.menu')} onClose={onClose}>
      <div className="actions">
        <Action icon="send" label={pick(lang, 'Share profile', 'ناردنی پرۆفایل', 'مشاركة الملف')} onClick={() => { onClose(); if (navigator.share) void navigator.share({ url: link, title: `@${username}` }).catch(() => undefined); else void copyText(link).then((ok) => app.toast(t(ok ? 'toast.linkCopied' : 'toast.error'))); }} />
        <Action icon="link" label={t('pv.copyProfile')} onClick={() => { onClose(); void copyText(link).then((ok) => app.toast(t(ok ? 'toast.linkCopied' : 'toast.error'))); }} />
        <Action icon="bell" label={on('notify') ? pick(lang, 'Posts alerts: on', 'ئاگادارکردنەوە: چالاک', 'التنبيهات: مفعّلة') : pick(lang, 'Turn on post alerts', 'ئاگادارکردنەوەی پۆست', 'تفعيل تنبيهات المنشورات')} onClick={() => { toggle(username, 'notify'); app.toast(on('notify') ? pick(lang, 'Alerts off', 'ئاگادارکردنەوە ناچالاک بوو', 'أُوقفت التنبيهات') : pick(lang, 'Alerts on', 'ئاگادارکردنەوە چالاک بوو', 'فُعّلت التنبيهات')); onClose(); }} />
        <Action icon="sparkles" label={on('fav') ? pick(lang, 'Remove from favorites', 'لابردن لە دڵخوازەکان', 'إزالة من المفضلة') : pick(lang, 'Add to favorites', 'زیادکردن بۆ دڵخوازەکان', 'إضافة للمفضلة')} onClick={() => { toggle(username, 'fav'); onClose(); }} />
        <Action icon="eye" label={app.mutedStories.includes(username) ? pick(lang, 'Unmute stories', 'لابردنی بێدەنگی ستۆری', 'إلغاء كتم القصص') : pick(lang, 'Mute stories', 'بێدەنگکردنی ستۆری', 'كتم القصص')} onClick={() => { app.toggleMuteStory(username); onClose(); }} />
        <Action icon="lock" label={on('restricted') ? pick(lang, 'Unrestrict', 'لابردنی سنووردارکردن', 'إلغاء التقييد') : pick(lang, 'Restrict', 'سنووردارکردن', 'تقييد')} onClick={() => { toggle(username, 'restricted'); app.toast(on('restricted') ? pick(lang, 'Unrestricted', 'سنووردارکردن لابرا', 'أُلغي التقييد') : pick(lang, 'Restricted: their comments need approval', 'سنووردار کرا', 'تم التقييد')); onClose(); }} />
        <Action icon="flag" label={t('chat.report')} onClick={() => setReport(true)} />
        <Action
          icon="x"
          danger
          label={app.isBlocked(username) ? t('block.undo') : t('block.action')}
          onClick={() => {
            onClose();
            if (app.isBlocked(username)) app.toggleBlock(username);
            else app.askConfirm({ title: t('block.title', { user: username }), body: t('block.body'), confirmLabel: t('block.action'), danger: true, onConfirm: () => { app.toggleBlock(username); onBlocked(); } });
          }}
        />
      </div>
    </Sheet>
  );
}
