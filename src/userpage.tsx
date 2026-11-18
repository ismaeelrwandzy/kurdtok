/* KurdTok — userpage.tsx : own profile, other users' profiles, profile views */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from './state';
import { DEFAULT_PROFILE, DEMO_EMOJI, Icon, pick, VerifiedBadge, authorByName, copyText, formatCount, normalizeUrl, resizeImage, type Post, type Settings } from './utils';
import { Action, Avatar, PostGrid, Sheet, timeAgo } from './ui';
import type { Key } from './dict';
import { UserListsSheet, UserMoreSheet, listsArePublic } from './more';

type Vis = 'all' | 'friends' | 'me';
const VIS_ORDER: Vis[] = ['all', 'friends', 'me'];
const VIS_ICON: Record<Vis, string> = { all: 'globe', friends: 'users', me: 'lock' };
const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

function IconTabs<T extends string>({ tabs, value, onPick }: { tabs: { id: T; icon: string; label: string }[]; value: T; onPick: (v: T) => void }) {
  return (
    <div className="itabs" role="tablist">
      {tabs.map((x) => (
        <button key={x.id} type="button" role="tab" aria-selected={value === x.id} aria-label={x.label} className={value === x.id ? 'on' : ''} onClick={() => onPick(x.id)}>
          <Icon name={x.icon} size={22} />
        </button>
      ))}
    </div>
  );
}

function VisitsSheet({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const { t } = app;
  return (
    <Sheet label={t('visits.title')} onClose={onClose} tall>
      <div className="row between" style={{ marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>{t('visits.title')}</h3>
        <button type="button" className="iconbtn" onClick={onClose} aria-label={t('common.close')}><Icon name="x" /></button>
      </div>
      <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Icon name="eye" size={22} />
        <div className="grow"><b style={{ fontSize: '1.3rem' }}>{formatCount(app.viewsTotal)}</b> <span className="sub">{t('visits.total')}</span></div>
      </div>
      <div className="card cardlist" style={{ marginTop: 10 }}>
        <div className="listrow">
          <Icon name="shield" size={18} />
          <div className="grow"><b>{t('priv.viewers')}</b><div className="small sub">{t('visits.note')}</div></div>
          <button type="button" className={`chip${app.settings.showViewers ? ' on' : ''}`} onClick={() => app.setSettings((s) => ({ ...s, showViewers: !s.showViewers }))}>{t(app.settings.showViewers ? 'priv.on' : 'priv.disabled')}</button>
        </div>
      </div>
      <div className="scroll" style={{ marginTop: 10 }}>
        {!app.settings.showViewers ? <p className="sub small">{t('visits.off')}</p> : app.visits.length === 0 ? <p className="sub small">{t('visits.empty')}</p> : (
          <div className="card cardlist">
            {app.visits.map((v, i) => {
              const a = authorByName(v.user);
              return (
                <button key={v.user + i} type="button" className="listrow" onClick={() => { onClose(); app.push({ name: 'user', username: v.user }); }}>
                  <Avatar emoji={a?.emoji} name={a?.name ?? v.user} color={a?.color} size={40} />
                  <div className="grow" style={{ textAlign: 'start' }}><b>{a?.name ?? v.user}</b><div className="small sub">@{v.user}</div></div>
                  <span className="small sub">{timeAgo(v.at, t)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Sheet>
  );
}

function DraftsSheet({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const lang = app.settings.language;
  return (
    <Sheet label="drafts" onClose={onClose} tall>
      <div className="row between" style={{ marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>{pick(lang, 'Drafts', 'ڕەشنووسەکان', 'المسودات')}</h3>
        <button type="button" className="iconbtn" onClick={onClose} aria-label="close"><Icon name="x" /></button>
      </div>
      <div className="scroll">
        <div className="card cardlist">
          {app.drafts.map((d) => (
            <div key={d.id} className="listrow">
              <button type="button" className="row grow" style={{ gap: 12, textAlign: 'start' }} onClick={() => { onClose(); app.push({ name: 'camera', draftId: d.id }); }}>
                <span className="notific" style={{ borderRadius: 12, overflow: 'hidden' }}>{d.src ? <img src={d.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="video" size={20} />}</span>
                <span className="grow" style={{ minWidth: 0 }}>
                  <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.caption || pick(lang, 'No caption', 'بێ کاپشن', 'بدون وصف')}</b>
                  <span className="small sub">{timeAgo(d.at, app.t)}</span>
                </span>
              </button>
              <button type="button" className="iconbtn" aria-label="delete" onClick={() => app.deleteDraft(d.id)}><Icon name="trash" size={18} /></button>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

export function ProfileTab() {
  const app = useApp();
  const { t, profile, settings } = app;
  type TabId = 'posts' | 'locked' | 'reposts' | 'saved' | 'liked';
  const [tab, setTab] = useState<TabId>('posts');
  const [visits, setVisits] = useState(false);
  const [avMenu, setAvMenu] = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const mineAll = useMemo(() => app.posts.filter((p) => p.mine && !p.story).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.createdAt - a.createdAt), [app.posts]);
  const mine = useMemo(() => mineAll.filter((p) => !p.private), [mineAll]);
  const lists: Record<TabId, Post[]> = {
    posts: mine,
    locked: mineAll.filter((p) => p.private),
    reposts: app.visiblePosts.filter((p) => p.reposted),
    saved: app.visiblePosts.filter((p) => p.saved),
    liked: app.visiblePosts.filter((p) => p.liked),
  };
  const shown = lists[tab];
  const visKey: Partial<Record<TabId, keyof Settings>> = { reposts: 'visReposts', saved: 'visSaved', liked: 'showLiked' };
  const curVis = (tab !== 'posts' && tab !== 'locked' ? (settings[visKey[tab] as keyof Settings] as Vis) : null) as Vis | null;
  const cycleVis = () => {
    const k = visKey[tab];
    if (!k || !curVis) return;
    const nx = VIS_ORDER[(VIS_ORDER.indexOf(curVis) + 1) % 3];
    app.setSettings((s) => ({ ...s, [k]: nx }));
  };
  const pickImage = async (file: File | undefined, kind: 'avatar' | 'cover') => {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const url = await resizeImage(file, kind === 'avatar' ? 320 : 1000, 0.82);
      app.updateProfile(kind === 'avatar' ? { avatar: url } : { cover: url });
    } catch {
      app.toast(t('toast.error'));
    }
  };
  const emoji = profile.username === DEFAULT_PROFILE.username ? DEMO_EMOJI : undefined;
  const myStory = app.storyGroups[0]?.items.length > 0;
  const tabs: { id: TabId; icon: string; label: string }[] = [
    { id: 'posts', icon: 'grid', label: t('profile.tabPosts') },
    { id: 'locked', icon: 'lock', label: t('profile.tabLocked') },
    { id: 'reposts', icon: 'repeat', label: t('profile.tabReposts') },
    { id: 'saved', icon: 'bookmark', label: t('profile.tabSaved') },
    { id: 'liked', icon: 'heart', label: t('profile.tabLiked') },
  ];
  return (
    <div className="scroll">
      <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => { void pickImage(e.target.files?.[0], 'cover'); e.target.value = ''; }} />
      <input ref={avatarRef} type="file" accept="image/*" hidden onChange={(e) => { void pickImage(e.target.files?.[0], 'avatar'); e.target.value = ''; }} />
      <div className="cover" style={profile.cover ? { backgroundImage: `url(${profile.cover})` } : undefined}>
        <div style={{ position: 'absolute', top: 10, insetInlineEnd: 10, display: 'flex', gap: 8 }}>
          <button type="button" className="vpill" onClick={() => setVisits(true)} aria-label={pick(app.settings.language, 'Profile visits', 'سەردانی پرۆفایل', 'زيارات الملف')}><Icon name="eye" size={20} /><span>{formatCount(app.viewsTotal)}</span></button>
          <button type="button" className="iconbtn glass" onClick={() => app.push({ name: 'settings' })} aria-label={t('settings.title')}><Icon name="settings" /></button>
        </div>
        <button type="button" className="iconbtn glass" style={{ position: 'absolute', bottom: 10, insetInlineEnd: 10 }} aria-label={t('profile.changeCover')} onClick={() => app.requirePermission('photos', () => coverRef.current?.click())}><Icon name="camera" size={20} /></button>
      </div>
      <div className="page" style={{ paddingTop: 0 }}>
        <div className="row between" style={{ marginTop: -44, alignItems: 'flex-end' }}>
          <div className="avwrap">
            <button type="button" className={`avring${myStory ? ' has' : ''}`} onClick={() => setAvMenu(true)} aria-label={t('edit.changePhoto')}>
              <Avatar src={profile.avatar} emoji={emoji} name={profile.name} size={90} />
            </button>
            <button type="button" className="avcam" onClick={() => setAvMenu(true)} aria-label={t('edit.changePhoto')}><Icon name="camera" size={13} /></button>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn primary sm" onClick={() => app.push({ name: 'editProfile' })}>{t('profile.edit')}</button>
            <button type="button" className="btn sm" aria-label="share profile" onClick={() => { const url = `${location.origin}/@${profile.username}`; if (typeof navigator.share === 'function') void navigator.share({ title: profile.name, url }).catch(() => undefined); else void navigator.clipboard?.writeText(url).then(() => app.toast(t('toast.linkCopied'))); }}><Icon name="share" size={15} /></button>
          </div>
        </div>
        <div className="row" style={{ marginTop: 10, gap: 6 }}><h2 style={{ margin: 0, fontSize: '1.35rem' }}>{profile.name}</h2>{app.isVerified ? <VerifiedBadge size={18} /> : <button type="button" className="chip" onClick={() => app.push({ name: 'settings', panel: 'verify' })}>{t('verify.get')}</button>}</div>
        <div><button type="button" className="sub small" style={{ padding: 0 }} aria-label="Copy username" onClick={async () => { const ok = await copyText('@' + profile.username); app.toast(ok ? pick(app.settings.language, 'Username copied!', 'یوزەرنەیم کۆپی کرا!', 'تم نسخ اسم المستخدم!') : t('toast.error')); }}>@{profile.username}</button></div>
        {profile.bio ? <p style={{ margin: '10px 0' }}>{profile.bio}</p> : null}
        <div className="row small sub" style={{ flexWrap: 'wrap', gap: 14 }}>
          {profile.location ? <span className="row" style={{ gap: 4 }}><Icon name="pin" size={14} />{profile.location}</span> : null}
          {profile.website ? <a href={normalizeUrl(profile.website)} target="_blank" rel="noopener noreferrer" className="row" style={{ gap: 4 }}><Icon name="link" size={14} />{profile.website.replace(/^https?:\/\//i, '')}</a> : null}
        </div>
        <div className="stats">
          <button type="button" onClick={() => app.push({ name: 'follows', tab: 'following' })}><b>{formatCount(profile.following)}</b> <span className="sub">{t('profile.following')}</span></button>
          <button type="button" onClick={() => app.push({ name: 'follows', tab: 'followers' })}><b>{formatCount(profile.followers)}</b> <span className="sub">{t('profile.followers')}</span></button>
          <div><b>{formatCount(app.totalLikes)}</b> <span className="sub">{t('profile.likes')}</span></div>
        </div>
        {app.drafts.length > 0 ? (
          <button type="button" className="visrow" onClick={() => setDraftsOpen(true)}>
            <Icon name="bookmark" size={15} />
            <span>{pick(settings.language, 'Drafts', 'ڕەشنووسەکان', 'المسودات')}: <b>{app.drafts.length}</b></span>
            <Icon name="chevron" size={15} className="flip-rtl" />
          </button>
        ) : null}
        <IconTabs tabs={tabs} value={tab} onPick={(v) => setTab(v)} />
        {tab === 'locked' ? <p className="small sub center" style={{ margin: '4px 0 10px' }}><Icon name="lock" size={13} /> {t('profile.lockedNote')}</p> : null}
        {curVis ? (
          <button type="button" className="visrow" onClick={cycleVis}>
            <Icon name={VIS_ICON[curVis]} size={15} />
            <span>{t('pv.visibleTo')}: <b>{t(('priv.' + curVis) as Key)}</b></span>
            <Icon name="chevron" size={15} className="flip-rtl" />
          </button>
        ) : null}
        {shown.length === 0 ? <div className="empty sub" style={{ height: 'auto' }}>{t('profile.empty')}</div> : <PostGrid posts={shown} onOpen={(i) => app.push({ name: 'viewer', ids: shown.map((p) => p.id), index: i })} />}
      </div>
      {avMenu ? (
        <Sheet label={t('edit.changePhoto')} onClose={() => setAvMenu(false)}>
          <div className="actions">
            <Action icon="plus" label={pick(app.settings.language, 'Add to story', 'زیادکردن بۆ ستۆری', 'إضافة إلى القصة')} onClick={() => { setAvMenu(false); app.requirePermission('camera', () => app.push({ name: 'camera' })); }} />
            <Action icon="camera" label={t('edit.changePhoto')} onClick={() => { setAvMenu(false); app.requirePermission('photos', () => avatarRef.current?.click()); }} />
            {myStory ? <Action icon="eye" label={pick(app.settings.language, 'View my story', 'بینینی ستۆرییەکەم', 'عرض قصتي')} onClick={() => { setAvMenu(false); app.push({ name: 'story', author: profile.username }); }} /> : null}
          </div>
        </Sheet>
      ) : null}
      {visits ? <VisitsSheet onClose={() => setVisits(false)} /> : null}
      {draftsOpen ? <DraftsSheet onClose={() => setDraftsOpen(false)} /> : null}
    </div>
  );
}

export function UserScreen({ username }: { username: string }) {
  const app = useApp();
  const { t } = app;
  const a = authorByName(username);
  type TabId = 'posts' | 'reposts' | 'liked';
  const [tab, setTab] = useState<TabId>('posts');
  const [more, setMore] = useState(false);
  const [lists, setLists] = useState<'following' | 'followers' | null>(null);
  const { pop } = app;
  useEffect(() => {
    if (!a) pop();
  }, [a, pop]);
  const list = useMemo(() => app.visiblePosts.filter((p) => !p.mine && p.author === username).sort((x, y) => y.createdAt - x.createdAt), [app.visiblePosts, username]);
  const pool = useMemo(() => app.visiblePosts.filter((p) => !p.mine && p.author !== username), [app.visiblePosts, username]);
  if (!a) return null;
  const openLists = (k: 'following' | 'followers') => (listsArePublic(username) ? setLists(k) : app.toast(pick(app.settings.language, 'This account keeps its lists private', 'ئەم ئەکاونتە لیستەکانی تایبەتە', 'هذا الحساب يبقي قوائمه خاصة')));
  const isF = app.followed.includes(username);
  const rel = app.relationOf(username);
  const lv = hash(username) % 5;
  const likedVis = (lv === 0 ? 'me' : lv === 1 ? 'friends' : 'all') as Vis;
  const canLiked = likedVis === 'all' || (likedVis === 'friends' && rel === 'friends');
  const reposts = pool.filter((p) => hash(username + p.id) % 4 === 0).slice(0, 6);
  const liked = canLiked ? pool.filter((p) => hash(p.id + username) % 3 === 0).slice(0, 6) : [];
  const shown = tab === 'posts' ? list : tab === 'reposts' ? reposts : liked;
  const likes = list.reduce((n, p) => n + p.likes, 0);
  const hasStory = app.storyGroups.some((g) => g.author === username && g.items.length > 0);
  const tabs: { id: TabId; icon: string; label: string }[] = [
    { id: 'posts', icon: 'grid', label: t('profile.tabPosts') },
    { id: 'reposts', icon: 'repeat', label: t('profile.tabReposts') },
    ...(canLiked ? [{ id: 'liked' as TabId, icon: 'heart', label: t('profile.tabLiked') }] : []),
  ];
  const followLabel = rel === 'friends' ? t('common.friends') : isF ? t('common.followed') : rel === 'followsYou' ? t('common.followBack') : t('common.follow');
  return (
    <div className="overlay">
      <div className="scroll" style={{ paddingTop: 0 }}>
        <div className="cover ucover" style={{ background: `radial-gradient(circle at 80% 20%, ${a.color}aa, transparent 60%), linear-gradient(160deg, ${a.color}66, #05070f 85%)` }}>
          <span className="ucoveremoji" aria-hidden="true">{a.emoji}</span>
          <button type="button" className="iconbtn glass" style={{ position: 'absolute', top: 10, insetInlineStart: 10 }} onClick={app.pop} aria-label={t('common.back')}><Icon name="back" className="flip-rtl" /></button>
          <button type="button" className="iconbtn glass" style={{ position: 'absolute', top: 10, insetInlineEnd: 10 }} onClick={() => setMore(true)} aria-label={t('chat.menu')}><Icon name="more" /></button>
        </div>
        <div className="page" style={{ paddingTop: 0 }}>
          <div className="row between" style={{ marginTop: -44, alignItems: 'flex-end' }}>
            <button type="button" className={`avring${hasStory ? ' has' : ''}`} onClick={() => hasStory && app.push({ name: 'story', author: username })} aria-label={a.name}>
              <Avatar emoji={a.emoji} name={a.name} color={a.color} size={90} />
            </button>
          </div>
          <div className="row" style={{ marginTop: 10, gap: 6 }}><h2 style={{ margin: 0, fontSize: '1.35rem' }}>{a.name}</h2>{a.verified ? <VerifiedBadge size={18} /> : null}</div>
          <div><button type="button" className="sub small" style={{ padding: 0 }} aria-label="Copy username" onClick={async () => { const ok = await copyText('@' + a.username); app.toast(ok ? pick(app.settings.language, 'Username copied!', 'یوزەرنەیم کۆپی کرا!', 'تم نسخ اسم المستخدم!') : t('toast.error')); }}>@{a.username}</button></div>
          <div className="stats">
            <button type="button" onClick={() => openLists('following')}><b>{formatCount(a.following)}</b> <span className="sub">{t('profile.following')}</span></button>
            <button type="button" onClick={() => openLists('followers')}><b>{formatCount(a.followers + (isF ? 1 : 0))}</b> <span className="sub">{t('profile.followers')}</span></button>
            <div><b>{formatCount(likes * 7)}</b> <span className="sub">{t('profile.likes')}</span></div>
          </div>
          <div className="row" style={{ gap: 8, marginBottom: 10 }}>
            <button type="button" className={`btn grow ${isF ? '' : 'primary'}`} onClick={() => app.toggleFollow(username)}>{followLabel}</button>
            <button type="button" className="btn grow" onClick={() => app.openDm(username)}><Icon name="message" size={18} /> {t('profile.message')}</button>
          </div>
          {a.bio ? <p style={{ margin: '4px 0 10px' }}>{a.bio}</p> : null}
          <IconTabs tabs={tabs} value={tab} onPick={(v) => setTab(v)} />
          {tab === 'liked' && !canLiked ? (
            <div className="empty sub" style={{ height: 'auto' }}><Icon name="lock" size={22} /><div>{t('pv.likedPrivate')}</div></div>
          ) : shown.length === 0 ? (
            <div className="empty sub" style={{ height: 'auto' }}>{t('profile.empty')}</div>
          ) : (
            <PostGrid posts={shown} onOpen={(i) => app.push({ name: 'viewer', ids: shown.map((p) => p.id), index: i })} />
          )}
        </div>
      </div>
      {more ? <UserMoreSheet username={username} onClose={() => setMore(false)} onBlocked={app.pop} /> : null}
      {lists ? <UserListsSheet username={username} initial={lists} onClose={() => setLists(null)} /> : null}
    </div>
  );
}
