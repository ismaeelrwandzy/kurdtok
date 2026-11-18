/* KurdTok — ui.tsx */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, KeyboardEvent as RKeyboardEvent, MouseEvent as RMouseEvent, PointerEvent as RPointerEvent } from 'react';
import { type TFn, postLink, useApp } from './state';
import { DEFAULT_PROFILE, DEMO_EMOJI, copyText, pick, Icon, ORIGINAL_SOUND, VerifiedBadge, formatCount, hashColor, idbGet, initials, isVerifiedUser, originalTitle, type PermKey, type Post, type RouteEntry, type Tab } from './utils';
import { type Key } from './dict';
import { HeartBursts } from './fx';
import { ShareView } from './share';
import { EditCaptionSheet } from './follows';

/* ============================================================================
 * Shared UI pieces
 * ========================================================================== */

export function timeAgo(ts: number, t: TFn): string {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return t('time.now');
  const m = Math.floor(s / 60);
  if (m < 60) return t('time.minutes', { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('time.hours', { n: h });
  return t('time.days', { n: Math.floor(h / 24) });
}

export function Avatar({ src, emoji, name, color, size = 44, online }: { src?: string | null; emoji?: string; name?: string; color?: string; size?: number; online?: boolean }) {
  const label = name ?? '?';
  const style: CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.38),
    background: src ? undefined : (color ?? hashColor(label)),
  };
  return (
    <span className="avatar" style={style} aria-hidden="true">
      {src ? <img src={src} alt="" /> : emoji ? <span style={{ fontSize: Math.round(size * 0.5) }}>{emoji}</span> : initials(label)}
      {online ? <i className="dot-online" /> : null}
    </span>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)}>
      <i />
    </button>
  );
}

export function TopBar({ title, onBack, right, backIcon = 'back' }: { title: string; onBack: () => void; right?: ReactNode; backIcon?: string }) {
  const { t } = useApp();
  return (
    <header className="topbar">
      <button type="button" className="iconbtn" onClick={onBack} aria-label={t('common.back')}>
        <Icon name={backIcon} className="flip-rtl" />
      </button>
      <h2 className="truncate">{title}</h2>
      {right}
    </header>
  );
}

export function Sheet({ children, onClose, tall, label }: { children: ReactNode; onClose: () => void; tall?: boolean; label: string }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.sheets = String(Number(root.dataset.sheets ?? 0) + 1);
    root.classList.add('lockfeed');
    return () => {
      const n = Math.max(0, Number(root.dataset.sheets ?? 1) - 1);
      root.dataset.sheets = String(n);
      if (n === 0) root.classList.remove('lockfeed');
    };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      closeRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
  return (
    <div
      className="backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`sheet${tall ? ' tall' : ''}`} role="dialog" aria-modal="true" aria-label={label}>
        <div className="grab" />
        {children}
      </div>
    </div>
  );
}

export function Action({ icon, label, onClick, on, danger }: { icon: string; label: string; onClick: () => void; on?: boolean; danger?: boolean }) {
  return (
    <button type="button" className={`action${on ? ' on' : ''}${danger ? ' danger' : ''}`} onClick={onClick}>
      <span className="ico">
        <Icon name={icon} size={22} />
      </span>
      <span>{label}</span>
    </button>
  );
}

export const PERM_LABEL: Record<PermKey, Key> = {
  camera: 'settings.permCamera',
  photos: 'settings.permPhotos',
  storage: 'settings.permStorage',
  location: 'settings.permLocation',
  calls: 'settings.permCalls',
  contacts: 'settings.permContacts',
};
export const PERM_DESC: Record<PermKey, Key> = {
  camera: 'perm.cameraDesc',
  photos: 'perm.photosDesc',
  storage: 'perm.storageDesc',
  location: 'perm.locationDesc',
  calls: 'perm.callsDesc',
  contacts: 'perm.contactsDesc',
};
export const PERM_ICON: Record<PermKey, string> = {
  camera: 'camera',
  photos: 'image',
  storage: 'download',
  location: 'pin',
  calls: 'phone',
  contacts: 'users',
};

export function PermissionModal() {
  const app = useApp();
  const { t } = app;
  const m = app.permModal;
  if (!m) return null;
  const close = () => app.setPermModal(null);
  const allow = () => {
    app.setPermission(m.key, true);
    app.setPermModal(null);
    app.toast(t('toast.permissionGranted'));
    if (m.then) void m.then();
  };
  return (
    <div className="backdrop mid" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-label={t('perm.title')}>
        <div style={{ color: 'var(--accent)' }}>
          <Icon name={PERM_ICON[m.key]} size={42} />
        </div>
        <h3>{t('perm.title')}</h3>
        <p>{t('perm.body', { what: t(PERM_LABEL[m.key]) })}</p>
        <p>{t(PERM_DESC[m.key])}</p>
        <div className="row" style={{ marginTop: 6 }}>
          <button type="button" className="btn grow" onClick={close}>{t('common.cancel')}</button>
          <button type="button" className="btn primary grow" onClick={allow} autoFocus>{t('common.allow')}</button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmModal() {
  const app = useApp();
  const c = app.confirmState;
  if (!c) return null;
  const close = () => app.setConfirmState(null);
  return (
    <div className="backdrop mid" style={{ zIndex: 90 }} onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-label={c.title}>
        <h3>{c.title}</h3>
        <p>{c.body}</p>
        <div className="row" style={{ marginTop: 6 }}>
          <button type="button" className="btn grow" onClick={close} autoFocus>{app.t('common.cancel')}</button>
          <button
            type="button"
            className={`btn grow ${c.danger ? 'danger' : 'primary'}`}
            onClick={() => {
              close();
              c.onConfirm();
            }}
          >
            {c.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ToastView() {
  const { toastMsg } = useApp();
  if (!toastMsg) return null;
  return (
    <div className="toast" role="status" aria-live="polite" key={toastMsg.id}>
      {toastMsg.text}
    </div>
  );
}

export function BottomNav() {
  const app = useApp();
  const { t, tab } = app;
  const item = (id: Tab, icon: string, label: string, badge?: number) => (
    <button type="button" className={tab === id ? 'on' : ''} onClick={() => { if (id === tab && id === 'discover') app.setQuery(''); app.setTab(id); }} aria-label={label} aria-current={tab === id ? 'page' : undefined}>
      <Icon name={icon} fill={tab === id && (id === 'home' || id === 'inbox' || id === 'profile') ? 'currentColor' : 'none'} />
      <span>{label}</span>
      {badge ? <span className="badge" aria-label={String(badge)}>{badge > 99 ? '99+' : badge}</span> : null}
    </button>
  );
  return (
    <nav className="nav" aria-label="Main">
      {item('home', 'home', t('nav.home'))}
      {item('discover', 'search', t('nav.discover'))}
      <button type="button" className="create" onClick={() => app.push({ name: 'camera' })} aria-label={t('nav.create')}>
        <Icon name="plus" size={26} strokeWidth={2.6} />
      </button>
      {item('inbox', 'message', t('nav.inbox'), app.unreadTotal)}
      {item('profile', 'user', t('nav.profile'))}
    </nav>
  );
}

export function PostGrid({ posts, onOpen }: { posts: Post[]; onOpen: (index: number) => void }) {
  return (
    <div className="grid3">
      {posts.map((p, i) => (
        <PostThumb key={p.id} post={p} onClick={() => onOpen(i)} />
      ))}
    </div>
  );
}

export function PostThumb({ post, onClick }: { post: Post; onClick: () => void }) {
  const app = useApp();
  const src = usePostSrc(post);
  return (
    <button type="button" className="thumb" onClick={onClick} aria-label={post.caption}>
      {src ? (
        post.kind === 'video' ? (post.poster ? <img src={post.poster} alt="" loading="lazy" style={{ filter: post.filter }} /> : <video src={src} muted playsInline preload="metadata" style={{ filter: post.filter }} />) : <img src={src} alt="" loading="lazy" style={{ filter: post.filter }} />
      ) : (
        <span className="media-fallback"><Icon name={post.kind === 'video' ? 'video' : 'image'} /></span>
      )}
      {post.kind === 'video' ? <span className="vid"><Icon name="play" size={16} fill="currentColor" /></span> : null}
      {post.private ? <span className="lockbadge"><Icon name="lock" size={14} /></span> : null}
      {post.pinned ? <span className="pinbadge"><Icon name="pin" size={13} /></span> : null}
      <span className="cnt"><Icon name="eye" size={12} />{formatCount(app.postViews(post))}</span>
    </button>
  );
}

/** Resolves a playable URL for a post (remote/data URL, or a Blob stored in IndexedDB). */
export function useBlobUrl(blobId?: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blobId) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    let created: string | null = null;
    void idbGet(blobId).then((b) => {
      if (cancelled || !b) return;
      created = URL.createObjectURL(b);
      setUrl(created);
    });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [blobId]);
  return url;
}

export function usePostSrc(post: Post): string | null {
  const blobUrl = useBlobUrl(post.blobId);
  return post.blobId ? blobUrl : post.src || null;
}

export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => {
        if (line.trim() === '') return <br key={i} />;
        const bullet = /^\s*[-*•]\s+/.test(line);
        const body = line.replace(/^\s*[-*•]\s+/, '');
        const parts = body.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
        return (
          <div key={i}>
            {bullet ? '• ' : ''}
            {parts.map((p, j) => {
              if (p.length > 4 && p.startsWith('**') && p.endsWith('**')) return <strong key={j}>{p.slice(2, -2)}</strong>;
              if (p.length > 2 && p.startsWith('`') && p.endsWith('`')) return <code key={j}>{p.slice(1, -1)}</code>;
              return <span key={j}>{p}</span>;
            })}
          </div>
        );
      })}
    </>
  );
}


/* ============================================================================
 * Feed, post card, share sheet, comments, viewer
 * ========================================================================== */

export function PostMedia({ post, live, muted, loop, rate, onEnded }: { post: Post; live: boolean; muted: boolean; loop: boolean; rate: number; onEnded: () => void }) {
  const app = useApp();
  const src = usePostSrc(post);
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [wide, setWide] = useState(false);
  const [progress, setProgress] = useState(0);
  const [buffering, setBuffering] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (live) {
      const p = v.play();
      if (p) {
        p.catch(() => {
          if (!v.muted) {
            v.muted = true;
            app.setFeedMuted(true, true);
            v.play().catch(() => undefined);
          }
        });
      }
    } else {
      v.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, src]);

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = rate;
  }, [rate, src]);

  const seek = (e: RMouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const v = ref.current;
    if (!v || !v.duration || !Number.isFinite(v.duration)) return;
    const r = e.currentTarget.getBoundingClientRect();
    let f = (e.clientX - r.left) / r.width;
    if (getComputedStyle(e.currentTarget).direction === 'rtl') f = 1 - f;
    v.currentTime = Math.max(0, Math.min(1, f)) * v.duration;
  };

  if (!src || failed) {
    return (
      <div className="media-fallback">
        <Icon name={post.kind === 'video' ? 'video' : 'image'} size={56} />
      </div>
    );
  }
  if (post.kind === 'video') {
    return (
      <>
        <video
          ref={ref}
          className={`media${wide ? ' wide' : ''}`}
          src={src}
          poster={post.poster}
          style={{ filter: post.filter }}
          playsInline
          loop={loop}
          muted={muted}
          preload={live ? 'auto' : 'metadata'}
          onLoadedMetadata={(e) => setWide(e.currentTarget.videoWidth > e.currentTarget.videoHeight * 1.15)}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v.duration) setProgress(v.currentTime / v.duration);
          }}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          onCanPlay={() => setBuffering(false)}
          onEnded={onEnded}
          onError={() => setFailed(true)}
        />
        {buffering && live ? <div className="buffer"><span className="spinner" /></div> : null}
        <div className="seekbar" data-seek="1" role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} onClick={seek}>
          <i style={{ width: `${progress * 100}%` }} />
        </div>
      </>
    );
  }
  return <img className="media" src={src} alt={post.caption} style={{ filter: post.filter }} draggable={false} onError={() => setFailed(true)} />;
}

const SPEEDS = [0.5, 1, 1.5, 2];

function PostMenu({ post, onClose }: { post: Post; onClose: () => void }) {
  const app = useApp();
  const { t } = app;
  const friends = app.chats
    .filter((c) => !c.isGroup)
    .sort((a, b) => Number(app.followed.includes(b.peer ?? '')) - Number(app.followed.includes(a.peer ?? '')));
  const send = (chatId: string, name: string) => {
    app.sendMessage(chatId, { text: postLink(post.id) });
    app.bumpShare(post.id);
    app.toast(t('post.sentTo', { name }));
    onClose();
  };
  const isVideo = post.kind === 'video';
  const row = (icon: string, label: string, onClick: () => void, danger?: boolean) => (
    <button type="button" className={`menurow${danger ? ' danger' : ''}`} onClick={onClick}>
      <Icon name={icon} size={22} />
      <span>{label}</span>
    </button>
  );
  return (
    <Sheet label={t('post.menu')} onClose={onClose} tall>
      <div className="scroll" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="friendrow">
          {friends.length === 0 ? <span className="sub small">{t('post.noFriends')}</span> : null}
          {friends.map((c) => {
            const a = c.peer ? app.authorOf(c.peer, false) : null;
            return (
              <button key={c.id} type="button" onClick={() => send(c.id, c.name)} aria-label={`${t('post.sendTo')} ${c.name}`}>
                <Avatar src={a?.avatar} emoji={a?.emoji ?? c.emoji} name={c.name} color={a?.color ?? c.color} size={54} />
                <span className="truncate">{c.name}</span>
              </button>
            );
          })}
        </div>
        <div className="menucard">
          {row('repeat', t(post.reposted ? 'toast.unreposted' : 'share.repost'), () => { app.toggleRepost(post.id); onClose(); })}
          {post.mine ? row('lock', t(post.private ? 'post.makePublic' : 'post.makePrivate'), () => { app.togglePrivate(post.id); onClose(); }) : null}
          {row('smile', t('post.notInterested'), () => { app.hidePost(post.id); onClose(); })}
          {row('info', t('post.report'), () => { onClose(); app.askConfirm({ title: t('post.reportTitle'), body: t('post.reportBody'), confirmLabel: t('post.report'), danger: true, onConfirm: () => app.reportPost(post.id) }); })}
        </div>
        <div className="menucard">
          {isVideo ? (
            <div className="menurow">
              <Icon name="play" size={22} />
              <span className="grow">{t('post.speed')}</span>
              <div className="speeds big small">
                {SPEEDS.map((s) => (
                  <button key={s} type="button" className={app.speed === s ? 'on' : ''} onClick={() => app.setSpeed(s)}>{s}×</button>
                ))}
              </div>
            </div>
          ) : null}
          {isVideo ? row('eye', t('post.clearDisplay'), () => { onClose(); app.setClearDisplay(true); }) : null}
          <div className="menurow">
            <Icon name="refresh" size={22} />
            <span className="grow">{t('share.autoScroll')}</span>
            <Switch checked={app.settings.autoScroll} label={t('share.autoScroll')} onChange={(v) => app.setSettings((s) => ({ ...s, autoScroll: v }))} />
          </div>
          {row('link', t('share.copyLink'), () => { void app.copyLink(post); onClose(); })}
        </div>
      </div>
    </Sheet>
  );
}


export function PostCard({ post, live, onEnded }: { post: Post; live: boolean; onEnded: () => void }) {
  const app = useApp();
  const { t } = app;
  const author = app.authorOf(post.author, post.mine);
  const isFollowed = app.followed.includes(post.author);
  const rel = app.relationOf(post.author);
  const isVideo = post.kind === 'video';
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [paused, setPaused] = useState(() => isVideo && !app.settings.autoplay);
  const [open, setOpen] = useState(false);
  const [fast, setFast] = useState(false);
  const [menu, setMenu] = useState(false);
  const lastTap = useRef(0);
  const comboUntil = useRef(0);
  const tapTimer = useRef<number | undefined>(undefined);
  const holdTimer = useRef<number | undefined>(undefined);
  const heldRef = useRef(false);

  useEffect(
    () => () => {
      window.clearTimeout(tapTimer.current);
      window.clearTimeout(holdTimer.current);
    },
    [],
  );

  const clear = app.clearDisplay && live;
  const IGNORE = 'button, a, input, textarea, [data-seek], .backdrop';

  const onDown = (e: RPointerEvent<HTMLElement>) => {
    if (!isVideo || (e.target as HTMLElement).closest(IGNORE)) return;
    window.clearTimeout(holdTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const side = x < 0.28 || x > 0.72;
    holdTimer.current = window.setTimeout(
      () => {
        heldRef.current = true;
        if (side) setFast(true);
        else setMenu(true);
      },
      side ? 280 : 480,
    );
  };
  const onUp = () => {
    window.clearTimeout(holdTimer.current);
    if (heldRef.current) {
      setFast(false);
      window.setTimeout(() => {
        heldRef.current = false;
      }, 80);
    }
  };

  const onSurfaceClick = (e: RMouseEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest(IGNORE)) return;
    if (heldRef.current) return;
    const now = Date.now();
    const burst = () => {
      const rect = e.currentTarget.getBoundingClientRect();
      const b = { id: now + Math.random(), x: e.clientX - rect.left, y: e.clientY - rect.top };
      setHearts((h) => [...h.slice(-5), b]);
      window.setTimeout(() => setHearts((h) => h.filter((x) => x.id !== b.id)), 1100);
      try {
        navigator.vibrate?.(18);
      } catch {
        /* ignore */
      }
    };
    if (now - lastTap.current < 420 || now < comboUntil.current) {
      window.clearTimeout(tapTimer.current);
      lastTap.current = 0;
      comboUntil.current = now + 650;
      app.likePost(post.id);
      burst();
      return;
    }
    lastTap.current = now;
    if (isVideo) {
      window.clearTimeout(tapTimer.current);
      tapTimer.current = window.setTimeout(() => setPaused((p) => !p), 430);
    }
  };

  const parts = post.caption.split(/(#[\p{L}\p{N}_]+)/u);
  const comments = app.commentCount(post.id);
  const saves = (post.saves ?? 0) + (post.saved ? 1 : 0);
  const spinning = live && !paused;
  const openSound = () => {
    if (post.audio === ORIGINAL_SOUND) app.push({ name: 'sound', audio: originalTitle(author.name), postId: post.id });
    else app.push({ name: 'sound', audio: post.audio, postId: post.soundSrc });
  };
  const reposts = (post.reposts ?? 0) + (post.reposted ? 1 : 0);
  const [holdLike, setHoldLike] = useState(false);
  const likeTimer = useRef<number | undefined>(undefined);
  const likeFired = useRef(false);
  useEffect(() => () => window.clearTimeout(likeTimer.current), []);
  const likeDown = () => {
    likeFired.current = false;
    setHoldLike(true);
    window.clearTimeout(likeTimer.current);
    likeTimer.current = window.setTimeout(() => {
      likeFired.current = true;
      setHoldLike(false);
      if (!post.reposted) app.toggleRepost(post.id);
      else app.toast(t('toast.reposted'));
      try {
        navigator.vibrate?.(40);
      } catch {
        /* ignore */
      }
    }, 5000);
  };
  const likeUp = () => {
    window.clearTimeout(likeTimer.current);
    setHoldLike(false);
  };

  return (
    <article className="post" onClick={onSurfaceClick} onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onUp} onContextMenu={(e) => e.preventDefault()} data-post-id={post.id}>
      <PostMedia post={post} live={live && !paused} muted={app.feedMuted} loop={!app.settings.autoScroll} rate={fast ? 2 : app.speed} onEnded={onEnded} />
      <div className="shade" />
      {paused && isVideo ? (
        <div className="pauseicon">
          <div className="pausestack">
            <button type="button" className="minimute" onClick={(e) => { e.stopPropagation(); app.setFeedMuted(!app.feedMuted); }} aria-label={t(app.feedMuted ? 'post.unmute' : 'post.mute')}>
              <Icon name={app.feedMuted ? 'volumeOff' : 'volume'} size={20} />
            </button>
            <span className="bigplay">
              <Icon name="play" size={40} fill="currentColor" />
            </span>
          </div>
        </div>
      ) : null}
      {fast ? (
        <div className="fastbadge" aria-live="polite">
          <b>2×</b>
          <span className="chev"><i /><i /><i /></span>
        </div>
      ) : null}
      <HeartBursts list={hearts} />

      {clear ? (
        <div className="clearbar">
          <button type="button" className="iconbtn glass" onClick={() => app.setClearDisplay(false)} aria-label={t('post.exitClear')} title={t('post.exitClear')}>
            <Icon name="x" size={20} />
          </button>
          <div className="speeds" role="group" aria-label={t('post.speed')}>
            {SPEEDS.map((s) => (
              <button key={s} type="button" className={app.speed === s ? 'on' : ''} onClick={() => app.setSpeed(s)}>
                {s}×
              </button>
            ))}
          </div>
          <button type="button" className="iconbtn glass" onClick={() => setPaused((p) => !p)} aria-label={t(paused ? 'post.play' : 'post.pause')}>
            <Icon name={paused ? 'play' : 'pause'} size={20} fill="currentColor" />
          </button>
        </div>
      ) : null}

      <div className="post-info">
        <div className="who">
          <button type="button" onClick={() => app.openAuthor(post.author, post.mine)} aria-label={`@${author.username}`}>
            <Avatar src={author.avatar} emoji={author.emoji} name={author.name} color={author.color} size={42} />
          </button>
          <button type="button" className="uname" onClick={() => app.openAuthor(post.author, post.mine)}>
            {author.name}
          </button>
          {author.verified ? <VerifiedBadge size={16} /> : null}
          {!author.isMe && rel === 'friends' ? <span className="friendtag">{t('common.friends')}</span> : null}
          {!author.isMe && !isFollowed ? (
            <button type="button" className="followbtn" onClick={() => app.toggleFollow(post.author)}>
              {t(rel === 'followsYou' ? 'common.followBack' : 'common.follow')}
            </button>
          ) : null}
        </div>
        {post.place ? (
          <div className="meta">
            <Icon name="pin" size={14} /> {post.place}
          </div>
        ) : null}
        <p className={`caption${open ? ' open' : ''}`} onClick={() => setOpen((o) => !o)}>
          {parts.map((part, i) =>
            i % 2 === 1 ? (
              <button
                key={i}
                type="button"
                className="tag"
                onClick={(e) => {
                  e.stopPropagation();
                  app.searchTag(part);
                }}
              >
                {part}
              </button>
            ) : (
              <span key={i}>{part}</span>
            ),
          )}
        </p>
        <button type="button" className="meta soundline" onClick={openSound}>
          <Icon name="music" size={11} /> <span className="truncate">{post.audio} · @{author.username}</span>
        </button>
      </div>

      <div className="rail">
        <button
          type="button"
          className={`likebtn${post.liked ? ' on' : ''}`}
          aria-pressed={post.liked}
          aria-label={t('post.like')}
          onPointerDown={likeDown}
          onPointerUp={likeUp}
          onPointerLeave={likeUp}
          onPointerCancel={likeUp}
          onContextMenu={(e) => e.preventDefault()}
          onClick={() => {
            if (likeFired.current) {
              likeFired.current = false;
              return;
            }
            app.toggleLike(post.id);
          }}
        >
          {holdLike ? (
            <svg className="holdring" viewBox="0 0 44 44" aria-hidden="true">
              <circle cx="22" cy="22" r="20" pathLength="100" />
            </svg>
          ) : null}
          <Icon name="heart" size={32} fill={post.liked ? 'currentColor' : 'none'} />
          <span>{formatCount(post.likes)}</span>
        </button>
        <button type="button" aria-label={t('comments.title')} onClick={() => app.push({ name: 'comments', postId: post.id })}>
          <Icon name="message" size={30} />
          <span>{formatCount(comments)}</span>
        </button>
        <button type="button" className={`save${post.saved ? ' on' : ''}`} aria-pressed={post.saved} aria-label={t('share.save')} onClick={() => app.toggleSave(post.id)}>
          <Icon name="bookmark" size={28} fill={post.saved ? 'currentColor' : 'none'} />
          <span>{formatCount(saves)}</span>
        </button>
        <button type="button" className={`rep${post.reposted ? ' on' : ''}`} aria-pressed={post.reposted} aria-label={t('share.repost')} onClick={() => app.toggleRepost(post.id)}>
          <Icon name="repeat" size={27} />
          <span>{formatCount(reposts)}</span>
        </button>
        <button type="button" aria-label={t('share.title')} onClick={() => app.setShareFor(post.id)}>
          <Icon name="send" size={26} className="flip-rtl" />
          <span>{formatCount(post.shares)}</span>
        </button>
        <button type="button" className="cd" onClick={openSound} aria-label={post.audio}>
          <span className="cd-disc" style={{ animationPlayState: spinning ? 'running' : 'paused' }}>
            <Avatar src={author.avatar} emoji={author.emoji} name={author.name} color={author.color} size={26} />
          </span>
        </button>
      </div>

      {menu ? <PostMenu post={post} onClose={() => setMenu(false)} /> : null}
    </article>
  );
}

/** Vertical, snap-scrolling list of full-screen posts. Supports auto scroll. */
export function PostList({ posts, startIndex = 0, live, empty }: { posts: Post[]; startIndex?: number; live: boolean; empty?: ReactNode }) {
  const app = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(startIndex);

  useEffect(() => {
    const el = ref.current;
    if (el && startIndex > 0) el.scrollTop = startIndex * el.clientHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            const idx = Number((e.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) setActive(idx);
          }
        }
      },
      { root: el, threshold: [0.6] },
    );
    el.querySelectorAll('[data-index]').forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [posts.length]);

  const auto = app.settings.autoScroll && live;
  const goNext = useCallback(() => {
    const el = ref.current;
    if (!el || posts.length === 0) return;
    const next = (active + 1) % posts.length;
    el.scrollTo({ top: next * el.clientHeight, behavior: next === 0 ? 'auto' : 'smooth' });
  }, [active, posts.length]);

  const activePost = posts[active];
  const activeId = activePost?.id;
  const activeKind = activePost?.kind;
  useEffect(() => {
    if (activeId) app.bumpView(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);
  useEffect(() => {
    if (!auto || !activeId || activeKind === 'video') return;
    const id = window.setTimeout(goNext, Math.max(2, app.settings.autoScrollSeconds) * 1000);
    return () => window.clearTimeout(id);
  }, [auto, activeId, activeKind, goNext, app.settings.autoScrollSeconds]);

  if (posts.length === 0) return <div className="empty">{empty}</div>;

  return (
    <div className="feed" ref={ref}>
      {posts.map((p, i) => (
        <div key={p.id} data-index={i} style={{ height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always' }}>
          <PostCard post={p} live={live && active === i} onEnded={() => auto && goNext()} />
        </div>
      ))}
    </div>
  );
}

export function HomeTab() {
  const app = useApp();
  const { t } = app;
  const sorted = useMemo(() => [...app.visiblePosts].sort((a, b) => b.createdAt - a.createdAt), [app.visiblePosts]);
  const list = useMemo(
    () => (app.feedTab === 'foryou' ? sorted : sorted.filter((p) => !p.mine && app.followed.includes(p.author))),
    [sorted, app.feedTab, app.followed],
  );
  const live = app.tab === 'home' && app.stack.length === 0 && !app.shareFor && !app.permModal;
  return (
    <div className="screen">
      <PostList
        key={app.feedTab}
        posts={list}
        live={live}
        empty={
          <>
            <Icon name="users" size={46} />
            <span>{t('feed.emptyFollowing')}</span>
          </>
        }
      />
      <div className="feed-top">
        <button type="button" className={`tabbtn${app.feedTab === 'foryou' ? ' on' : ''}`} onClick={() => app.setFeedTab('foryou')}>
          {t('feed.forYou')}
        </button>
        <button type="button" className={`tabbtn${app.feedTab === 'following' ? ' on' : ''}`} onClick={() => app.setFeedTab('following')}>
          {t('feed.following')}
        </button>
      </div>
      {app.settings.autoScroll ? (
        <button
          type="button"
          className="autopill"
          onClick={() => {
            app.setSettings((s) => ({ ...s, autoScroll: false }));
            app.toast(t('feed.autoScrollOff'));
          }}
        >
          ▶ {t('share.autoScroll')} · {t('common.off')}
        </button>
      ) : null}
    </div>
  );
}

export function ShareSheet() {
  const app = useApp();
  const post = app.posts.find((p) => p.id === app.shareFor);
  const [editing, setEditing] = useState(false);
  if (!post) return null;
  const close = () => { setEditing(false); app.setShareFor(null); };
  if (editing) return <EditCaptionSheet post={post} onClose={close} />;
  return <ShareView post={post} close={close} onEdit={() => setEditing(true)} />;
}

export function CommentsSheet({ postId }: { postId: string }) {
  const app = useApp();
  const { t } = app;
  const list = [...(app.comments[postId] ?? [])].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  const ownerPost = app.posts.find((p) => p.id === postId)?.mine ?? false;
  const commentsOff = app.posts.find((p) => p.id === postId)?.commentsOff ?? false;
  const lang = app.settings.language;
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; user: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [cmenu, setCmenu] = useState<string | null>(null);
  const total = app.commentCount(postId);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, [replyTo]);

  const submit = () => {
    if (!text.trim()) return;
    app.addComment(postId, replyTo ? `@${replyTo.user} ${text}` : text, replyTo?.id);
    setText('');
    setReplyTo(null);
  };

  const nameOf = (user: string, mine: boolean) => (mine ? app.profile.username : user);

  return (
    <Sheet label={t('comments.title')} onClose={app.pop} tall>
      <div className="cm-head">
        <div className="cm-title"><b>{t('comments.title')}</b><span className="cm-count">{total}</span></div>
        <button type="button" className="iconbtn" onClick={app.pop} aria-label={t('common.close')}>
          <Icon name="x" />
        </button>
      </div>
      <div className="scroll cm-list">
        {list.length === 0 ? <div className="cm-empty"><span className="cm-empty-ic"><Icon name="message" size={30} /></span><b>{t('comments.empty')}</b><span className="small">{pick(lang, 'Start the conversation', 'گفتوگۆکە دەست پێ بکە', 'ابدأ المحادثة')}</span></div> : null}
        {list.map((c) => {
          const uname = nameOf(c.user, c.mine);
          return (
            <div key={c.id} className="cm-item">
              <div className="cm-row">
                <Avatar name={uname} size={38} emoji={c.mine && uname === DEFAULT_PROFILE.username ? DEMO_EMOJI : undefined} src={c.mine ? app.profile.avatar : null} />
                <div className="cm-body">
                  <div className="cm-bubble">
                    <div className="cm-meta">
                      <button type="button" className="cm-handle" onClick={() => { void copyText('@' + uname).then((ok) => app.toast(ok ? pick(lang, 'Username copied!', 'یوزەرنەیم کۆپی کرا!', 'تم نسخ اسم المستخدم!') : t('toast.error'))); }}><b>@{uname}</b></button>
                      {(c.mine ? app.isVerified : isVerifiedUser(c.user)) ? <VerifiedBadge size={13} /> : null}
                      {c.pinned ? <span className="cm-pin"><Icon name="pin" size={11} /> {pick(lang, 'Pinned', 'چەسپاو', 'مثبّت')}</span> : null}
                    </div>
                    <div className="cm-text">{c.text}</div>
                  </div>
                  <div className="cm-foot">
                    <span>{timeAgo(c.createdAt, t)}</span>
                    <button type="button" onClick={() => setReplyTo({ id: c.id, user: uname })}>{t('common.reply')}</button>
                    <button type="button" aria-label={t('chat.menu')} onClick={() => setCmenu(c.id)}><Icon name="more" size={16} /></button>
                  </div>
                </div>
                <button type="button" className={`cm-like${c.liked ? ' on' : ''}`} aria-pressed={c.liked} aria-label={t('post.like')} onClick={() => app.toggleCommentLike(postId, c.id)}>
                  <Icon name="heart" size={18} fill={c.liked ? 'currentColor' : 'none'} />
                  {c.likes > 0 ? <span>{formatCount(c.likes)}</span> : null}
                </button>
              </div>
              {c.replies.map((r) => {
                const ru = nameOf(r.user, r.mine);
                return (
                  <div key={r.id} className="cm-row cm-reply">
                    <Avatar name={ru} size={28} emoji={r.mine && ru === DEFAULT_PROFILE.username ? DEMO_EMOJI : undefined} src={r.mine ? app.profile.avatar : null} />
                    <div className="cm-body">
                      <div className="cm-bubble">
                        <div className="cm-meta"><b>@{ru}</b>{(r.mine ? app.isVerified : isVerifiedUser(r.user)) ? <VerifiedBadge size={12} /> : null}</div>
                        <div className="cm-text">{r.text}</div>
                      </div>
                      <div className="cm-foot">
                        <span>{timeAgo(r.createdAt, t)}</span>
                        <button type="button" onClick={() => setReplyTo({ id: c.id, user: ru })}>{t('common.reply')}</button>
                        {r.mine ? <button type="button" onClick={() => app.deleteComment(postId, c.id, r.id)}>{t('common.delete')}</button> : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {replyTo ? (
        <div className="cm-replying">
          <span>{t('comments.replyingTo', { user: replyTo.user })}</span>
          <button type="button" className="iconbtn" style={{ width: 28, height: 28 }} onClick={() => setReplyTo(null)} aria-label={t('common.cancel')}>
            <Icon name="x" size={16} />
          </button>
        </div>
      ) : null}
      {commentsOff ? <div className="cm-off"><Icon name="lock" size={16} /> {pick(lang, 'Comments are turned off for this post', 'کۆمێنت بۆ ئەم پۆستە داخراوە', 'التعليقات متوقفة لهذا المنشور')}</div> : null}
      <div className="cm-emojis" role="group" hidden={commentsOff}>
        {['❤️', '🔥', '😂', '😍', '👏', '😮', '😢', '🙌'].map((e) => <button key={e} type="button" aria-label={e} onClick={() => { setText((x) => x + e); inputRef.current?.focus({ preventScroll: true }); }}>{e}</button>)}
      </div>
      <div className="cm-compose" hidden={commentsOff}>
        <Avatar name={app.profile.username} size={34} emoji={app.profile.username === DEFAULT_PROFILE.username ? DEMO_EMOJI : undefined} src={app.profile.avatar} />
        <input
          ref={inputRef}
          className="cm-input"
          value={text}
          maxLength={500}
          placeholder={t('comments.placeholder')}
          aria-label={t('comments.placeholder')}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e: RKeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button type="button" className="sendbtn" onClick={submit} disabled={!text.trim()} aria-label={t('common.send')}>
          <Icon name="send" size={18} />
        </button>
      </div>
      {cmenu ? (() => {
        const c = list.find((x) => x.id === cmenu);
        if (!c) return null;
        return (
          <Sheet label={t('chat.menu')} onClose={() => setCmenu(null)}>
            <div className="actions">
              <Action icon="link" label={pick(lang, 'Copy', 'کۆپی', 'نسخ')} onClick={() => { setCmenu(null); void copyText(c.text).then((ok) => app.toast(t(ok ? 'toast.linkCopied' : 'toast.error'))); }} />
              {ownerPost ? <Action icon="pin" label={c.pinned ? pick(lang, 'Unpin', 'لابردنی چەسپاندن', 'إلغاء التثبيت') : pick(lang, 'Pin', 'چەسپاندن', 'تثبيت')} onClick={() => { setCmenu(null); app.togglePinComment(postId, c.id); }} /> : null}
              {!c.mine ? <Action icon="flag" label={pick(lang, 'Report', 'ڕاپۆرت', 'إبلاغ')} onClick={() => { setCmenu(null); app.toast(t('post.reported')); }} /> : null}
              {c.mine ? <Action icon="trash" danger label={t('common.delete')} onClick={() => { setCmenu(null); app.deleteComment(postId, c.id); }} /> : null}
            </div>
          </Sheet>
        );
      })() : null}
    </Sheet>
  );
}

export function ViewerScreen({ entry }: { entry: Extract<RouteEntry, { name: 'viewer' }> }) {
  const app = useApp();
  const { t } = app;
  const list = useMemo(
    () => entry.ids.map((id) => app.posts.find((p) => p.id === id)).filter((p): p is Post => !!p),
    [entry.ids, app.posts],
  );
  const top = app.stack[app.stack.length - 1];
  const live = top?.key === entry.key && !app.shareFor && !app.permModal;
  const empty = list.length === 0;
  const { pop } = app;
  useEffect(() => {
    if (empty) pop();
  }, [empty, pop]);
  return (
    <div className="overlay dark">
      <PostList posts={list} startIndex={Math.min(entry.index, Math.max(0, list.length - 1))} live={live} />
      <button type="button" className="iconbtn glass" style={{ position: 'absolute', top: 12, insetInlineStart: 12, zIndex: 6 }} onClick={app.pop} aria-label={t('common.back')}>
        <Icon name="back" className="flip-rtl" />
      </button>
    </div>
  );
}
