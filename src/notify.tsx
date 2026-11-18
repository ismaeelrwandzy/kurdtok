/* KurdTok — notify.tsx : activity / notifications */
import { useEffect, useMemo, useState } from 'react';
import { useApp } from './state';
import { Avatar, TopBar, timeAgo } from './ui';
import { Icon, VerifiedBadge, authorByName, pick } from './utils';
import type { Lang } from './utils';

const TX: Record<Lang, Record<string, string>> = {
  en: { title: 'Activity', empty: 'No activity yet. When people like, comment or visit, you will see it here.', likes: '{n} people liked your post', like1: '1 person liked your post', comment: 'commented: ', visit: 'visited your profile', welcome: 'Welcome to KurdTok! Complete your profile and post your first video.', today: 'New' },
  ckb: { title: 'چالاکییەکان', empty: 'هێشتا چالاکی نییە. کاتێ خەڵک لایک و کۆمێنت بکەن یان سەردانت بکەن لێرە دەیبینیت.', likes: '{n} کەس پۆستەکەتیان لایک کرد', like1: 'یەک کەس پۆستەکەتی لایک کرد', comment: 'کۆمێنتی کرد: ', visit: 'سەردانی پڕۆفایلەکەتی کرد', welcome: 'بەخێربێیت بۆ کورد تۆک! پڕۆفایلەکەت تەواو بکە و یەکەم ڤیدیۆت بڵاو بکەرەوە.', today: 'نوێ' },
  ar: { title: 'النشاط', empty: 'لا يوجد نشاط بعد. عندما يعجب الناس أو يعلّقون أو يزورون ستراه هنا.', likes: '{n} أشخاص أعجبوا بمنشورك', like1: 'شخص واحد أعجب بمنشورك', comment: 'علّق: ', visit: 'زار ملفك الشخصي', welcome: 'مرحبًا بك في KurdTok! أكمل ملفك وانشر أول فيديو.', today: 'جديد' },
};

export interface NotifItem {
  id: string;
  at: number;
  kind: 'like' | 'comment' | 'visit' | 'welcome';
  user?: string;
  text: string;
  postId?: string;
}

export function useNotifs(): { items: NotifItem[]; unread: number } {
  const app = useApp();
  const T = TX[app.settings.language] ?? TX.en;
  const items = useMemo(() => {
    const l: NotifItem[] = [];
    const mine = app.posts.filter((p) => p.mine && !p.story);
    const st = app.settings;
    for (const p of mine) {
      if (st.notifyLikes && p.likes > 0) l.push({ id: 'l' + p.id, at: p.createdAt + 60000, kind: 'like', text: p.likes === 1 ? T.like1 : T.likes.replace('{n}', String(p.likes)), postId: p.id });
      if (st.notifyComments) for (const c of app.comments[p.id] ?? []) if (!c.mine) l.push({ id: 'c' + c.id, at: c.createdAt, kind: 'comment', user: c.user, text: T.comment + c.text, postId: p.id });
    }
    if (st.notifyVisits) for (const v of app.visits) l.push({ id: `v${v.user}${v.at}`, at: v.at, kind: 'visit', user: v.user, text: T.visit });
    l.push({ id: 'welcome', at: app.account?.createdAt ?? 0, kind: 'welcome', text: T.welcome });
    return l.sort((a, b) => b.at - a.at).slice(0, 80);
  }, [app.posts, app.comments, app.visits, app.account?.createdAt, app.settings, T]);
  const unread = items.filter((i) => i.at > app.notifSeen).length;
  return { items, unread };
}

export function NotificationsScreen() {
  const app = useApp();
  const T = TX[app.settings.language] ?? TX.en;
  const { items } = useNotifs();
  const { notifSeen, setNotifSeen } = app;
  useEffect(() => () => setNotifSeen(Date.now()), [setNotifSeen]);
  const open = (i: NotifItem) => {
    if (i.kind === 'like' && i.postId) app.push({ name: 'viewer', ids: [i.postId], index: 0 });
    else if (i.kind === 'comment' && i.postId) app.push({ name: 'comments', postId: i.postId });
    else if (i.user && authorByName(i.user)) app.push({ name: 'user', username: i.user });
  };
  const lang = app.settings.language;
  const [f, setF] = useState<'all' | 'like' | 'comment' | 'visit'>('all');
  const chips: { id: typeof f; label: string }[] = [
    { id: 'all', label: pick(lang, 'All', 'هەموو', 'الكل') },
    { id: 'like', label: pick(lang, 'Likes', 'لایکەکان', 'الإعجابات') },
    { id: 'comment', label: pick(lang, 'Comments', 'کۆمێنتەکان', 'التعليقات') },
    { id: 'visit', label: pick(lang, 'Visits', 'سەردانەکان', 'الزيارات') },
  ];
  const shown = items.filter((i) => f === 'all' || i.kind === f);
  const startToday = new Date().setHours(0, 0, 0, 0);
  const groups = [
    { id: 'new', label: pick(lang, 'New', 'نوێ', 'جديد'), list: shown.filter((i) => i.at > notifSeen) },
    { id: 'today', label: pick(lang, 'Today', 'ئەمڕۆ', 'اليوم'), list: shown.filter((i) => i.at <= notifSeen && i.at >= startToday) },
    { id: 'earlier', label: pick(lang, 'Earlier', 'پێشتر', 'سابقًا'), list: shown.filter((i) => i.at <= notifSeen && i.at < startToday) },
  ].filter((g) => g.list.length > 0);
  const KIND: Record<string, { icon: string; cls: string }> = { like: { icon: 'heart', cls: 'k-like' }, comment: { icon: 'message', cls: 'k-comment' }, visit: { icon: 'eye', cls: 'k-visit' } };
  return (
    <div className="overlay">
      <TopBar title={T.title} onBack={app.pop} />
      <div className="scroll">
        <div className="page">
          <div className="ib-chips" role="tablist">
            {chips.map((c) => <button key={c.id} type="button" role="tab" aria-selected={f === c.id} className={f === c.id ? 'on' : ''} onClick={() => setF(c.id)}>{c.label}</button>)}
          </div>
          {shown.length === 0 ? <div className="ib-empty"><Icon name="bell" size={34} /><b>{T.empty}</b></div> : null}
          {groups.map((g) => (
            <section key={g.id} className="nt-group">
              <h4 className="nt-h">{g.label}</h4>
              {g.list.map((i) => {
                const a = i.user ? authorByName(i.user) : undefined;
                const k = KIND[i.kind] ?? { icon: 'sparkles', cls: 'k-other' };
                return (
                  <button key={i.id} type="button" className={`nt-row${i.at > notifSeen ? ' new' : ''}`} onClick={() => open(i)}>
                    <span className="nt-av">
                      {a ? <Avatar emoji={a.emoji} name={a.name} color={a.color} size={48} /> : <span className="notific"><Icon name="sparkles" size={20} /></span>}
                      <i className={`nt-badge ${k.cls}`}><Icon name={k.icon} size={11} fill={i.kind === 'like' ? 'currentColor' : 'none'} /></i>
                    </span>
                    <div className="grow" style={{ textAlign: 'start', minWidth: 0 }}>
                      <div className="nt-text"><b>{i.user ? '@' + i.user : 'KurdTok'}</b>{a?.verified ? <VerifiedBadge size={13} /> : null} <span className="sub">{i.text}</span></div>
                      <span className="small sub">{i.at ? timeAgo(i.at, app.t) : ''}</span>
                    </div>
                    {i.at > notifSeen ? <span className="nt-dot" /> : null}
                  </button>
                );
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export const NOTIFY_CSS = `
.notific{width:44px;height:44px;border-radius:50%;background:var(--grad);color:#fff;display:flex;align-items:center;justify-content:center;flex:none}
.bellbtn{position:relative}
.belldot{position:absolute;top:-4px;inset-inline-end:-4px;min-width:18px;height:18px;border-radius:9px;background:var(--accent2);color:#fff;font-size:.65rem;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 4px}
`;
