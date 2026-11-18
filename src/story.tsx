import { useEffect, useRef, useState, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent } from 'react';
import { Avatar, Sheet, timeAgo, usePostSrc } from './ui';
import { postLink, useApp } from './state';
import { AUTHORS, AudienceMark, DAY_MS, Icon, leftLabel, VerifiedBadge, audienceLabel, copyText, pick, uid, usePersistentState } from './utils';
import { OverlayView } from './storyedit';
import type { Post } from './utils';
import { useInboxL } from './inbox';
import { ReportSheet } from './more';

const IMG_MS = 5000;

function StoryMedia({ post, paused, onProgress, onDone }: { post: Post; paused: boolean; onProgress: (f: number) => void; onDone: () => void }) {
  const src = usePostSrc(post);
  const vref = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const progRef = useRef(onProgress);
  progRef.current = onProgress;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const [wide, setWide] = useState(false);

  useEffect(() => {
    if (post.kind !== 'image') return;
    let elapsed = 0;
    let last = performance.now();
    progRef.current(0);
    const id = window.setInterval(() => {
      const now = performance.now();
      if (!pausedRef.current) elapsed += now - last;
      last = now;
      progRef.current(Math.min(1, elapsed / IMG_MS));
      if (elapsed >= IMG_MS) {
        window.clearInterval(id);
        doneRef.current();
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [post.id, post.kind]);

  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    if (paused) v.pause();
    else void v.play().catch(() => { v.muted = true; void v.play().catch(() => undefined); });
  }, [paused, src]);

  if (!src) return <div className="storyfallback"><Icon name="image" size={56} /></div>;
  if (post.kind === 'video') {
    return (
      <video
        ref={vref}
        className={`storymedia${wide ? ' fit' : ''}`}
        src={src}
        onLoadedMetadata={(e) => setWide(e.currentTarget.videoWidth / Math.max(1, e.currentTarget.videoHeight) > 0.7)}
        playsInline
        autoPlay
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration) progRef.current(v.currentTime / v.duration);
        }}
        onEnded={() => doneRef.current()}
      />
    );
  }
  return (
    <>
      <div className="storyblur" style={{ backgroundImage: `url("${src}")` }} />
      <img className={`storymedia${wide ? ' fit' : ''}`} src={src} alt={post.caption} draggable={false} onLoad={(e) => setWide(e.currentTarget.naturalWidth / Math.max(1, e.currentTarget.naturalHeight) > 0.7)} />
    </>
  );
}

export function StoryScreen({ author }: { author: string }) {
  const app = useApp();
  const { t } = app;
  const groups = app.storyGroups.filter((g) => g.items.length > 0);
  const gi = groups.findIndex((g) => g.author === author);
  const group = groups[gi];
  const [idx, setIdx] = useState(() => {
    const g = groups[gi];
    if (!g) return 0;
    const firstNew = g.items.findIndex((i) => !app.viewedStories.includes(i.id));
    return g.mine || firstNew < 0 ? 0 : firstNew;
  });
  const [progress, setProgress] = useState(0);
  const [held, setHeld] = useState(false);
  const [typing, setTyping] = useState(false);
  const [reply, setReply] = useState('');
  const [liked, setLiked] = useState(false);
  const [menu, setMenu] = useState(false);
  const [floats, setFloats] = useState<{ id: number; e: string; x: number }[]>([]);
  const holdTimer = useRef<number | undefined>(undefined);
  const heldRef = useRef(false);
  const item = group?.items[Math.min(idx, (group?.items.length ?? 1) - 1)];
  const a = group ? app.authorOf(group.author, group.mine) : null;

  useEffect(() => {
    if (item) app.markStoryViewed(item.id);
    setLiked(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);
  useEffect(() => () => window.clearTimeout(holdTimer.current), []);
  useEffect(() => {
    if (!group) app.pop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!group]);

  const [cmtOpen, setCmtOpen] = useState(false);
  const [vOpen, setVOpen] = useState(false);
  const [rep, setRep] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const swipedRef = useRef(false);
  const [allCmts] = useStoryCmts();
  const IS = useInboxL(app.settings.language);
  if (!group || !item || !a) return null;

  const next = () => {
    if (idx < group.items.length - 1) {
      setIdx(idx + 1);
      setProgress(0);
      return;
    }
    const ng = groups[gi + 1];
    if (ng) app.replace({ name: 'story', author: ng.author });
    else app.pop();
  };
  const prev = () => {
    if (idx > 0) {
      setIdx(idx - 1);
      setProgress(0);
      return;
    }
    const pg = groups[gi - 1];
    if (pg) app.replace({ name: 'story', author: pg.author });
    else setProgress(0);
  };

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, form, .sheet, .backdrop')) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    swipedRef.current = false;
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      heldRef.current = true;
      setHeld(true);
    }, 220);
  };
  const onSwipeEnd = (e: RPointerEvent<HTMLDivElement>) => {
    const s = startRef.current;
    startRef.current = null;
    if (!s) return;
    const dy = s.y - e.clientY;
    const dx = Math.abs(s.x - e.clientX);
    if (Math.abs(dy) < 70 || dx > Math.abs(dy) * 0.7) return;
    swipedRef.current = true;
    window.setTimeout(() => {
      swipedRef.current = false;
    }, 120);
    if (dy > 0) {
      if (group?.mine) setVOpen(true);
    } else app.pop();
  };
  const onUp = () => {
    window.clearTimeout(holdTimer.current);
    if (heldRef.current) {
      setHeld(false);
      window.setTimeout(() => {
        heldRef.current = false;
      }, 60);
    }
  };
  const onTap = (e: RMouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, form, .sheet, .backdrop')) return;
    if (heldRef.current || swipedRef.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const leftZone = x < 0.3;
    if (rtl ? !leftZone && x > 0.7 : leftZone) prev();
    else next();
  };

  const sendReply = () => {
    const text = reply.trim();
    if (!text) return;
    const chat = app.chats.find((c) => c.peer === group.author);
    if (chat) app.sendMessage(chat.id, { text });
    app.toast(t('story.sent'));
    setReply('');
    setTyping(false);
  };

  const del = () =>
    app.askConfirm({
      title: t('story.deleteTitle'),
      body: t('story.deleteBody'),
      confirmLabel: t('common.delete'),
      danger: true,
      onConfirm: () => {
        app.deletePost(item.id);
        if (group.items.length <= 1) app.pop();
        else setIdx(Math.max(0, idx - 1));
      },
    });

  const cmtN = (allCmts[item.id] ?? []).length;
  const paused = held || typing || menu || cmtOpen || vOpen;
  const realId = item.id.replace(/^story:/, '');
  const link = postLink(realId);
  const REACTS = ['❤️', '🔥', '😂', '😮', '😢', '👏'];
  const sendLabel = pick(app.settings.language, 'Send message', 'نامە بنێرە', 'إرسال رسالة');
  const react = (e: string) => {
    const f = { id: Date.now() + Math.random(), e, x: 20 + Math.random() * 60 };
    setFloats((l) => [...l.slice(-8), f]);
    window.setTimeout(() => setFloats((l) => l.filter((y) => y.id !== f.id)), 1500);
    const chat = app.chats.find((c) => c.peer === group.author);
    if (chat) app.sendMessage(chat.id, { text: `${e} ${t('story.reacted')}` });
    try {
      navigator.vibrate?.(12);
    } catch {
      /* ignore */
    }
  };
  const friendsChats = app.chats.filter((c) => !c.isGroup && c.peer && !app.isBlocked(c.peer)).slice(0, 8);
  const sendTo = (chatId: string) => {
    app.sendMessage(chatId, { text: link });
    app.toast(t('story.sent'));
    setMenu(false);
  };
  const copy = async () => {
    const ok = await copyText(link);
    app.toast(t(ok ? 'toast.linkCopied' : 'toast.error'));
    setMenu(false);
  };

  return (
    <div className="overlay dark storyview" role="dialog" aria-label={t('story.title')} onPointerDown={onDown} onPointerUp={(e) => { onSwipeEnd(e); onUp(); }} onPointerCancel={onUp} onPointerLeave={onUp} onClick={onTap} onContextMenu={(e) => e.preventDefault()}>
      <StoryMedia key={item.id} post={item} paused={paused} onProgress={setProgress} onDone={next} />
      <OverlayView overlays={item.overlays} />
      <div className="storyshade" />
      <div className="storybars" dir="ltr">
        {group.items.map((it, i) => (
          <span key={it.id}>
            <i style={{ width: `${i < idx ? 100 : i === idx ? progress * 100 : 0}%` }} />
          </span>
        ))}
      </div>
      <div className="storyhead">
        <Avatar src={a.avatar} emoji={a.emoji} name={a.name} color={a.color} size={38} />
        <div className="grow" style={{ minWidth: 0 }}>
          <span className="row" style={{ gap: 5, minWidth: 0 }}><b className="truncate">{a.name}</b>{group.mine ? (app.isVerified ? <VerifiedBadge size={15} /> : null) : a.verified ? <VerifiedBadge size={15} /> : null}{group.mine ? <AudienceMark a={item.audience} size={14} /> : null}</span>
          <span className="small" style={{ opacity: 0.8 }}>{timeAgo(item.createdAt, t)}{group.mine ? ` · ${leftLabel(app.settings.language, item.createdAt + (item.storyDays ?? 1) * DAY_MS - Date.now())}` : ''}</span>
          {item.audio ? <span className="small truncate sc-audio"><Icon name="music" size={12} /> {item.audio}</span> : null}
        </div>
        <button type="button" className="iconbtn" onClick={() => setMenu(true)} aria-label={t('chat.menu')}><Icon name="more" size={22} /></button>
        <button type="button" className="iconbtn" onClick={app.pop} aria-label={t('common.close')}><Icon name="x" size={22} /></button>
      </div>
      {floats.map((f) => (
        <span key={f.id} className="sfloat" style={{ left: `${f.x}%` }}>{f.e}</span>
      ))}
      <div className="storybottom">
      {item.caption ? <p className="storycap">{item.caption}</p> : null}
      {!group.mine && typing ? (
        <div className="storyreacts" role="group" aria-label={t('story.react')}>
          {REACTS.map((e) => (
            <button key={e} type="button" onMouseDown={(ev) => ev.preventDefault()} onClick={() => react(e)} aria-label={e}>{e}</button>
          ))}
        </div>
      ) : null}
      {group.mine ? (
        <div className="storyown">
          <button type="button" className="sb-views" onClick={() => setVOpen(true)} aria-label={pick(app.settings.language, 'Story viewers', 'بینەرانی ستۆری', 'مشاهدو القصة')}><Icon name="eye" size={20} /> {storyViewers(item, app.isBlocked).length}</button>
          <span className="grow" />
          <button type="button" className="iconbtn sb-btn" onClick={() => setCmtOpen(true)} aria-label={pick(app.settings.language, 'Comments', 'کۆمێنتەکان', 'التعليقات')}><Icon name="message" size={24} />{cmtN ? <i>{cmtN}</i> : null}</button>
          <button type="button" className="iconbtn sb-btn" onClick={() => setMenu(true)} aria-label={IS.share}><Icon name="send" size={24} className="flip-rtl" /></button>
        </div>
      ) : (
        <form className="storyreply" onSubmit={(e) => { e.preventDefault(); sendReply(); }}>
          <input
            value={reply}
            placeholder={sendLabel}
            aria-label={t('story.reply', { name: a.name })}
            onFocus={() => setTyping(true)}
            onBlur={() => setTyping(false)}
            onChange={(e) => setReply(e.target.value)}
          />
          {reply.trim() ? (
            <button type="submit" className="iconbtn" aria-label={t('common.send')}><Icon name="send" size={22} className="flip-rtl" /></button>
          ) : (
            <>
              <button type="button" className={`iconbtn${liked ? ' liked' : ''}`} aria-pressed={liked} aria-label={t('post.like')} onClick={() => { setLiked((v) => !v); if (!liked) app.toast(t('story.liked')); }}>
                <Icon name="heart" size={24} fill={liked ? 'currentColor' : 'none'} />
              </button>
              <button type="button" className="iconbtn sb-btn" onClick={() => setCmtOpen(true)} aria-label={pick(app.settings.language, 'Comments', 'کۆمێنتەکان', 'التعليقات')}><Icon name="message" size={24} />{cmtN ? <i>{cmtN}</i> : null}</button>
              <button type="button" className="iconbtn" onClick={() => setMenu(true)} aria-label={t('common.send')}><Icon name="send" size={24} className="flip-rtl" /></button>
            </>
          )}
        </form>
      )}
      </div>
      {vOpen ? <ViewersSheet item={item} onClose={() => setVOpen(false)} /> : null}
      {cmtOpen ? <StoryComments itemId={item.id} onClose={() => setCmtOpen(false)} /> : null}
      {rep ? <ReportSheet what={a.name} onClose={() => setRep(false)} /> : null}
      {menu ? (
        <Sheet label={t('chat.menu')} onClose={() => setMenu(false)}>
          <div className="so-head">
            <Avatar src={a.avatar} emoji={a.emoji} name={a.name} color={a.color} size={44} />
            <div className="grow" style={{ minWidth: 0 }}>
              <b className="truncate" style={{ display: 'block' }}>{a.name}</b>
              <span className="small sub">{group.mine ? pick(app.settings.language, 'Your story', 'ستۆری تۆ', 'قصتك') : pick(app.settings.language, 'Story', 'ستۆری', 'قصة')} · {timeAgo(item.createdAt, t)}</span>
            </div>
            <button type="button" className="iconbtn" onClick={() => setMenu(false)} aria-label={t('common.close')}><Icon name="x" size={20} /></button>
          </div>
          {friendsChats.length ? (
            <div>
              <div className="so-label">{t('story.sendTo')}</div>
              <div className="frow">
                {friendsChats.map((c) => (
                  <button key={c.id} type="button" onClick={() => sendTo(c.id)}>
                    <Avatar emoji={c.emoji} name={c.name} color={c.color} size={48} />
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="so-list">
            <SoRow icon="send" label={t('common.send')} onClick={() => { setMenu(false); if (navigator.share) void navigator.share({ url: link }).catch(() => undefined); else void copy(); }} />
            <SoRow icon="link" label={t('story.copyLink')} onClick={() => { void copy(); }} />
            {!group.mine ? <SoRow icon="bell" label={app.mutedStories.includes(group.author) ? pick(app.settings.language, 'Unmute stories', 'ستۆری دەنگ بکەوە', 'إلغاء كتم القصص') : pick(app.settings.language, 'Mute stories', 'ستۆری بێدەنگ بکە', 'كتم القصص')} onClick={() => { app.toggleMuteStory(group.author); setMenu(false); app.pop(); }} /> : null}
            {!group.mine ? <SoRow icon="flag" danger label={pick(app.settings.language, 'Report', 'ڕاپۆرت', 'إبلاغ')} onClick={() => { setMenu(false); setRep(true); }} /> : null}
          </div>
          {group.mine ? (
            <div>
              <div className="so-label">{pick(app.settings.language, 'Who can see this', 'کێ دەتوانێت ببینێت', 'من يمكنه المشاهدة')}</div>
              <div className="so-list">
                {(['public', 'friends', 'me'] as const).map((x) => (
                  <SoRow key={x} icon={x === 'me' ? 'lock' : x === 'friends' ? 'users' : 'globe'} label={audienceLabel(app.settings.language, x)} on={(item.audience ?? 'public') === x} onClick={() => { app.setStoryAudience(item.id, x); setMenu(false); }} />
                ))}
              </div>
            </div>
          ) : null}
          {group.mine ? (
            <div className="so-list">
              <SoRow icon="trash" danger label={t('common.delete')} onClick={() => { setMenu(false); del(); }} />
            </div>
          ) : null}
        </Sheet>
      ) : null}
    </div>
  );
}

function SoRow({ icon, label, onClick, on, danger }: { icon: string; label: string; onClick: () => void; on?: boolean; danger?: boolean }) {
  return (
    <button type="button" className={`so-row${danger ? ' danger' : ''}${on ? ' on' : ''}`} onClick={onClick} role={on !== undefined ? 'radio' : undefined} aria-checked={on}>
      <span className="so-ic"><Icon name={icon} size={19} /></span>
      <span className="grow" style={{ textAlign: 'start' }}>{label}</span>
      {on ? <Icon name="check" size={18} /> : null}
    </button>
  );
}

interface StoryCmt { id: string; user: string; mine: boolean; text: string; at: number }
const CMT_EMOJIS = ['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'];

function useStoryCmts(): [Record<string, StoryCmt[]>, (v: Record<string, StoryCmt[]>) => void] {
  return usePersistentState<Record<string, StoryCmt[]>>('storyCmts', {});
}

function StoryComments({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const app = useApp();
  const lang = app.settings.language;
  const [all, setAll] = useStoryCmts();
  const [v, setV] = useState('');
  const list = all[itemId] ?? [];
  const send = () => {
    const x = v.trim();
    if (!x) return;
    setAll({ ...all, [itemId]: [...list, { id: uid(), user: app.profile.name, mine: true, text: x.slice(0, 300), at: Date.now() }] });
    setV('');
  };
  return (
    <Sheet label={pick(lang, 'Comments', 'کۆمێنتەکان', 'التعليقات')} onClose={onClose} tall>
      <div className="scroll sc-list">
        {list.length === 0 ? (
          <div className="sc-empty"><b>{pick(lang, 'No comments yet', 'هێشتا کۆمێنت نییە', 'لا توجد تعليقات بعد')}</b><span>{pick(lang, 'Start the conversation.', 'گفتوگۆکە دەست پێ بکە.', 'ابدأ المحادثة.')}</span></div>
        ) : list.map((c) => (
          <div className="sc-row" key={c.id}>
            <Avatar src={c.mine ? app.profile.avatar : undefined} name={c.user} size={34} />
            <div className="grow"><b className="small">{c.user}</b>{c.mine && app.isVerified ? <VerifiedBadge size={12} /> : null}<div>{c.text}</div></div>
            {c.mine ? <button type="button" className="iconbtn" aria-label={app.t('common.delete')} onClick={() => setAll({ ...all, [itemId]: list.filter((y) => y.id !== c.id) })}><Icon name="trash" size={16} /></button> : null}
          </div>
        ))}
      </div>
      <div className="sc-emojis" role="group">
        {CMT_EMOJIS.map((e) => <button key={e} type="button" onClick={() => setV((x) => x + e)} aria-label={e}>{e}</button>)}
      </div>
      <form className="sc-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <Avatar src={app.profile.avatar} name={app.profile.name} size={40} />
        <input value={v} maxLength={300} placeholder={pick(lang, 'Add a comment…', 'کۆمێنتێک زیاد بکە…', 'أضف تعليقًا…')} aria-label={pick(lang, 'Add a comment…', 'کۆمێنتێک زیاد بکە…', 'أضف تعليقًا…')} onChange={(e) => setV(e.target.value)} />
        {v.trim() ? <button type="submit" className="iconbtn" aria-label={app.t('common.send')}><Icon name="send" size={22} className="flip-rtl" /></button> : null}
      </form>
    </Sheet>
  );
}


function storyViewers(item: Post, blocked: (u: string) => boolean) {
  const age = Math.max(0, Date.now() - item.createdAt);
  if (item.audience === 'me') return [];
  let h = 0;
  for (const ch of item.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pool = AUTHORS.filter((a) => !blocked(a.username));
  const cap = item.audience === 'friends' ? Math.ceil(pool.length / 2) : pool.length;
  const n = Math.min(cap, Math.floor(age / 600000) + (age > 60000 ? 1 : 0));
  return Array.from({ length: n }, (_, i) => {
    const a = pool[(h + i * 3) % pool.length];
    return { a, at: item.createdAt + (i + 1) * 540000 + ((h >> i) % 200000), liked: (h >> (i + 2)) % 3 === 0 };
  }).filter((v, i, arr) => arr.findIndex((x) => x.a.username === v.a.username) === i);
}

function ViewersSheet({ item, onClose }: { item: Post; onClose: () => void }) {
  const app = useApp();
  const lang = app.settings.language;
  const list = storyViewers(item, app.isBlocked);
  const title = pick(lang, 'Story viewers', 'بینەرانی ستۆری', 'مشاهدو القصة');
  return (
    <Sheet label={title} onClose={onClose} tall>
      <div className="row between"><h3 style={{ margin: 0 }}>{title} · {list.length}</h3><button type="button" className="iconbtn" onClick={onClose} aria-label={app.t('common.close')}><Icon name="x" /></button></div>
      <div className="scroll sc-list">
        {list.length === 0 ? <div className="sc-empty"><b>{pick(lang, 'No views yet', 'هێشتا بینەر نییە', 'لا مشاهدات بعد')}</b><span>{item.audience === 'me' ? pick(lang, 'This story is only for you.', 'ئەم ستۆرییە تەنها بۆ تۆیە.', 'هذه القصة لك فقط.') : ''}</span></div> : null}
        {list.map(({ a, at, liked }) => (
          <div className="sc-row" key={a.username} style={{ alignItems: 'center' }}>
            <Avatar emoji={a.emoji} name={a.name} color={a.color} size={42} />
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="row" style={{ gap: 5 }}><b className="truncate">{a.name}</b>{a.verified ? <VerifiedBadge size={13} /> : null}</div>
              <span className="small sub">@{a.username} · {timeAgo(at, app.t)}</span>
            </div>
            {liked ? <span style={{ color: '#ff4d6d' }}><Icon name="heart" size={18} fill="currentColor" /></span> : null}
          </div>
        ))}
      </div>
      <span className="small sub">{pick(lang, 'Viewer list is simulated on this device.', 'لیستی بینەران لەسەر ئەم ئامێرە نموونەییە.', 'قائمة المشاهدين تجريبية على هذا الجهاز.')}</span>
    </Sheet>
  );
}


export function StoryTray({ note, onNote, noteHint }: { note?: string; onNote?: () => void; noteHint?: string } = {}) {
  const app = useApp();
  const { t } = app;
  const own = app.storyGroups[0];
  const others = app.storyGroups.slice(1);
  return (
    <div className={`storytray${onNote ? ' hasnote' : ''}`} role="list" aria-label={t('story.title')}>
      <div className="storyitem" role="listitem">
        {onNote ? <button type="button" className={`ib-bubble${note ? ' has' : ''}`} onClick={onNote} aria-label={noteHint}>{note || noteHint}</button> : null}
        <button type="button" className={`storyring${own.items.length ? ' has' : ' none'}`} onClick={() => (own.items.length ? app.push({ name: 'story', author: own.author }) : app.push({ name: 'camera', story: true }))} aria-label={t('story.yours')}>
          <Avatar src={app.profile.avatar} emoji={undefined} name={app.profile.name} color="#8b5cf6" size={58} />
        </button>
        <button type="button" className="storyplus" onClick={() => app.push({ name: 'camera', story: true })} aria-label={t('story.add')}>
          <Icon name="plus" size={14} />
        </button>
        <span className="truncate">{t('story.yours')}</span>
      </div>
      {others.map((g) => {
        const a = app.authorOf(g.author, false);
        return (
          <div className="storyitem" role="listitem" key={g.author}>
            <button type="button" className={`storyring ${g.hasNew ? 'has' : 'seen'}`} onClick={() => app.push({ name: 'story', author: g.author })} aria-label={a.name}>
              <Avatar src={a.avatar} emoji={a.emoji} name={a.name} color={a.color} size={58} />
            </button>
            <span className="truncate">{a.name}</span>
          </div>
        );
      })}
    </div>
  );
}
