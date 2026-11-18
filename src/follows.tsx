/* KurdTok — follows.tsx : following / followers lists + caption editor */
import { useState } from 'react';
import { useApp } from './state';
import { Avatar, Sheet, TopBar } from './ui';
import { AUTHORS, VerifiedBadge, formatCount, pick } from './utils';
import type { AuthorInfo, Post } from './utils';

export function FollowsScreen({ initial }: { initial: 'following' | 'followers' }) {
  const app = useApp();
  const lang = app.settings.language;
  const [tab, setTab] = useState(initial);
  const [q, setQ] = useState('');
  const find = (u: string): AuthorInfo | undefined => AUTHORS.find((a) => a.username === u);
  const ids = tab === 'following' ? app.followed : app.followersOf;
  const rows = ids.map(find).filter((a): a is AuthorInfo => !!a).filter((a) => !q.trim() || (a.name + a.username).toLowerCase().includes(q.trim().toLowerCase()));
  const L = {
    following: pick(lang, 'Following', 'فۆڵۆوینگ', 'أتابعهم'),
    followers: pick(lang, 'Followers', 'فۆڵۆوەرس', 'المتابعون'),
    search: pick(lang, 'Search', 'گەڕان', 'بحث'),
    empty: tab === 'following'
      ? pick(lang, 'You are not following anyone yet.', 'هێشتا کەست فۆڵۆ نەکردووە.', 'لا تتابع أحدًا بعد.')
      : pick(lang, 'No followers yet. Post videos and follow people to grow.', 'هێشتا فۆڵۆوەرت نییە. ڤیدیۆ بڵاو بکەرەوە و خەڵک فۆڵۆ بکە.', 'لا يوجد متابعون بعد. انشر فيديوهات وتابع الناس.'),
    unfollow: pick(lang, 'Following', 'فۆڵۆ کراوە', 'تتابعه'),
    follow: pick(lang, 'Follow', 'فۆڵۆ', 'متابعة'),
    back: pick(lang, 'Follow back', 'فۆڵۆ بکەرەوە', 'رد المتابعة'),
  };
  return (
    <div className="overlay">
      <TopBar title={app.profile.name} onBack={app.pop} />
      <div className="seg" style={{ margin: '8px 14px' }}>
        <button type="button" className={tab === 'following' ? 'on' : ''} onClick={() => setTab('following')}>{L.following} · {formatCount(app.followed.length)}</button>
        <button type="button" className={tab === 'followers' ? 'on' : ''} onClick={() => setTab('followers')}>{L.followers} · {formatCount(app.followersOf.length)}</button>
      </div>
      <div style={{ padding: '0 14px 8px' }}><input className="pill-input" style={{ width: "100%" }} value={q} placeholder={L.search} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="scroll">
        <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.length === 0 ? <div className="empty sub" style={{ height: 'auto' }}>{L.empty}</div> : null}
          {rows.map((a) => {
            const isF = app.followed.includes(a.username);
            return (
              <div key={a.username} className="chatrow" role="button" tabIndex={0} onClick={() => app.push({ name: 'user', username: a.username })}>
                <Avatar emoji={a.emoji} name={a.name} color={a.color} size={46} />
                <div className="grow" style={{ textAlign: 'start', minWidth: 0 }}>
                  <div className="row" style={{ gap: 5, fontWeight: 700 }}>{a.name}{a.verified ? <VerifiedBadge size={14} /> : null}</div>
                  <div className="small sub">@{a.username}</div>
                </div>
                <button type="button" className={`btn sm${isF ? '' : ' primary'}`} onClick={(e) => { e.stopPropagation(); app.toggleFollow(a.username); }}>
                  {isF ? L.unfollow : tab === 'followers' ? L.back : L.follow}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function EditCaptionSheet({ post, onClose }: { post: Post; onClose: () => void }) {
  const app = useApp();
  const lang = app.settings.language;
  const [text, setText] = useState(post.caption);
  return (
    <Sheet label="caption" onClose={onClose}>
      <h3 style={{ margin: 0 }}>{pick(lang, 'Edit caption', 'دەستکاری کاپشن', 'تعديل الوصف')}</h3>
      <textarea className="input" rows={4} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} style={{ resize: 'none' }} autoFocus />
      <div className="small sub" style={{ textAlign: 'end' }}>{text.length}/300</div>
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn primary grow" onClick={() => { app.editCaption(post.id, text.trim()); onClose(); }}>{pick(lang, 'Save', 'پاشەکەوت', 'حفظ')}</button>
        <button type="button" className="btn" onClick={onClose}>{pick(lang, 'Cancel', 'پاشگەزبوونەوە', 'إلغاء')}</button>
      </div>
    </Sheet>
  );
}
