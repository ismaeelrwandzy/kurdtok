/* KurdTok — screens.tsx */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AUTHORS, isVerifiedUser, CONTACT_NAMES, pick, DEFAULT_PROFILE, DEMO_EMOJI, EMOJIS, Icon, ME, VerifiedBadge, authorByName, extractTags, fmtClock, fmtDay, fmtDuration, formatCount, resizeImage, sameDay, type AiMsg, type AuthorInfo, type Msg, type Post } from './utils';
import { type TFn, useApp } from './state';
import { useNotifs } from './notify';
import { Action, Avatar, PostGrid, RichText, Sheet, TopBar, timeAgo } from './ui';
import { StoryTray } from './story';
import { EmptyNote, NoteSheet, QuickRepliesSheet, StatusSheet, ToolsSheets, useActiveStatus, useInboxL, useInboxNote } from './inbox';
import { chatBus, wallpaperStyle } from './chatinfo';

/* ============================================================================
 * Discover (search, trending, Gemini AI) and Inbox
 * ========================================================================== */

export const AI_SYSTEM =
  'You are a friendly, concise assistant inside KurdTok, a short-video social app from Kurdistan. Reply in the same language the user writes in (Kurdish Sorani, Arabic or English).';

export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      window.clearTimeout(id);
      reject(new Error('aborted'));
    });
  });
}

export async function callGemini(opts: { apiKey: string; model: string; history: AiMsg[]; signal: AbortSignal }): Promise<string> {
  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  for (const m of opts.history.slice(-24)) {
    const role = m.role === 'user' ? 'user' : 'model';
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts[0].text += `\n${m.text}`;
    else contents.push({ role, parts: [{ text: m.text }] });
  }
  while (contents.length > 0 && contents[0].role !== 'user') contents.shift();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(opts.model)}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    signal: opts.signal,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': opts.apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: AI_SYSTEM }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
  });
  const data = (await res.json().catch(() => null)) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    promptFeedback?: { blockReason?: string };
  } | null;
  if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
  const text = (data?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
  if (!text) throw new Error(data?.promptFeedback?.blockReason ? `Blocked: ${data.promptFeedback.blockReason}` : 'Empty response');
  return text;
}

export function AiPane() {
  const app = useApp();
  const { t, settings, aiHistory, setAiHistory } = app;
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const envKey = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_GEMINI_API_KEY ?? '';
  const apiKey = settings.geminiKey.trim() || envKey;

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [aiHistory.length, loading, error]);

  const run = async (history: AiMsg[]) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let timedOut = false;
    const to = window.setTimeout(() => {
      timedOut = true;
      ctrl.abort();
    }, 30000);
    setLoading(true);
    setError(null);
    try {
      let reply: string;
      if (apiKey) {
        reply = await callGemini({ apiKey, model: settings.geminiModel.trim() || 'gemini-2.5-flash', history, signal: ctrl.signal });
      } else {
        await sleep(700, ctrl.signal);
        const q = history[history.length - 1]?.text ?? '';
        reply = /کوردستان|ڕواندز|kurdistan|rawanduz|كردستان|راوندوز/i.test(q) ? t('ai.demoKurdistan') : t('ai.demoGeneric', { q });
      }
      setAiHistory((h) => [...h, { role: 'assistant', text: reply }]);
    } catch (e) {
      if (timedOut) setError(t('discover.aiTimeout'));
      else if (!ctrl.signal.aborted) setError(e instanceof Error && e.message ? e.message : t('discover.aiError'));
    } finally {
      window.clearTimeout(to);
      if (abortRef.current === ctrl) setLoading(false);
    }
  };

  const send = () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: AiMsg[] = [...aiHistory, { role: 'user', text }];
    setAiHistory(next);
    setInput('');
    void run(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="card row" style={{ padding: 14 }}>
        <span style={{ color: 'var(--accent)' }}><Icon name="sparkles" size={26} /></span>
        <div className="grow">
          <b>{t('discover.aiTitle')}</b>
          <div className="small sub">{apiKey ? t('discover.aiSubtitle') : t('discover.aiDemo')}</div>
        </div>
        {aiHistory.length > 0 ? (
          <button type="button" className="iconbtn" aria-label={t('discover.aiClear')} onClick={() => { abortRef.current?.abort(); setLoading(false); setError(null); setAiHistory([]); }}>
            <Icon name="trash" size={18} />
          </button>
        ) : null}
      </div>
      <div className="card aibox" ref={boxRef} aria-live="polite">
        <div className="aimsg bot">{t('discover.aiGreeting')}</div>
        {aiHistory.map((m, i) => (
          <div key={i} className={`aimsg ${m.role === 'user' ? 'user' : 'bot'}`}>
            {m.role === 'user' ? m.text : <RichText text={m.text} />}
          </div>
        ))}
        {loading ? <div className="sub small">{t('discover.aiThinking')}</div> : null}
        {error ? (
          <div className="aimsg err">
            <div>{error}</div>
            <button type="button" className="btn sm" style={{ marginTop: 8 }} onClick={() => void run(aiHistory)}>{t('common.retry')}</button>
          </div>
        ) : null}
      </div>
      <div className="row">
        <input
          className="pill-input"
          value={input}
          maxLength={2000}
          placeholder={t('discover.aiPlaceholder')}
          aria-label={t('discover.aiPlaceholder')}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button type="button" className="sendbtn" onClick={send} disabled={!input.trim() || loading} aria-label={t('common.send')}>
          <Icon name="send" size={18} />
        </button>
      </div>
    </div>
  );
}

export function TrendingPane() {
  const app = useApp();
  const { t, query, setQuery } = app;
  const q = query.trim().toLowerCase();
  const tagMode = q.startsWith('#');
  const needle = q.replace(/^#/, '');

  const allTags = useMemo(() => {
    const m = new Map<string, { count: number; likes: number }>();
    app.visiblePosts.forEach((p) =>
      extractTags(p.caption).forEach((tag) => {
        const e = m.get(tag) ?? { count: 0, likes: 0 };
        e.count += 1;
        e.likes += p.likes;
        m.set(tag, e);
      }),
    );
    return [...m.entries()].map(([tag, v]) => ({ tag, ...v })).sort((a, b) => b.count - a.count || b.likes - a.likes);
  }, [app.visiblePosts]);

  const openPosts = (list: Post[], index: number) => app.push({ name: 'viewer', ids: list.map((p) => p.id), index });

  const userHits = q && !tagMode ? AUTHORS.filter((a) => !app.isBlocked(a.username) && (a.username.includes(needle) || a.name.toLowerCase().includes(needle))) : [];
  const tagHits = q ? allTags.filter((x) => x.tag.includes(needle)) : [];
  const postHits = q
    ? app.visiblePosts.filter((p) => (tagMode ? extractTags(p.caption).includes(`#${needle}`) : p.caption.toLowerCase().includes(needle) || p.author.includes(needle)))
    : [];
  const popular = [...app.visiblePosts].sort((a, b) => b.likes - a.likes).slice(0, 9);
  const suggested = AUTHORS.filter((a) => !app.followed.includes(a.username) && !app.isBlocked(a.username)).slice(0, 4);

  const creatorRow = (a: AuthorInfo) => (
    <button key={a.username} type="button" className="chatrow" onClick={() => app.push({ name: 'user', username: a.username })}>
      <Avatar emoji={a.emoji} name={a.name} color={a.color} size={44} />
      <div className="grow">
        <div className="row" style={{ gap: 4 }}><b className="truncate">{a.name}</b>{a.verified ? <VerifiedBadge size={14} /> : null}</div>
        <div className="small sub">@{a.username} · {formatCount(a.followers)}</div>
      </div>
    </button>
  );

  const tagGrid = (tags: typeof allTags) => (
    <div className="grid3">
      {tags.map((x) => (
        <button key={x.tag} type="button" className="tagcard" onClick={() => setQuery(x.tag)}>
          <b className="truncate">{x.tag}</b>
          <span className="small sub">{t('discover.posts', { n: x.count })}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <div className="row" style={{ position: 'relative', marginBottom: 18 }}>
        <input
          className="pill-input"
          style={{ paddingInlineEnd: 42 }}
          value={query}
          placeholder={t('discover.search')}
          aria-label={t('discover.search')}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') app.addRecent(query); }}
          onBlur={() => app.addRecent(query)}
        />
        {query ? (
          <button type="button" className="iconbtn" style={{ position: 'absolute', insetInlineEnd: 2, width: 36, height: 36 }} onClick={() => setQuery('')} aria-label={t('common.clear')}>
            <Icon name="x" size={18} />
          </button>
        ) : null}
      </div>

      {!query && app.recent.length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          <div className="row between small sub" style={{ marginBottom: 8 }}>
            <b>{pick(app.settings.language, 'Recent searches', 'گەڕانە دواییەکان', 'عمليات البحث الأخيرة')}</b>
            <button type="button" className="small" style={{ color: 'var(--accent)' }} onClick={app.clearRecent}>{pick(app.settings.language, 'Clear', 'سڕینەوە', 'مسح')}</button>
          </div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            {app.recent.map((r) => <button key={r} type="button" className="chip" onClick={() => setQuery(r)}><Icon name="clock" size={13} /> {r}</button>)}
          </div>
        </div>
      ) : null}

      {!q ? (
        <>
          <h3 style={{ fontSize: '1rem', margin: '0 0 10px' }}>🔥 {t('discover.trending')}</h3>
          {tagGrid(allTags.slice(0, 9))}
          {suggested.length > 0 ? (
            <>
              <h3 style={{ fontSize: '1rem', margin: '22px 0 10px' }}>{t('discover.creators')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{suggested.map(creatorRow)}</div>
            </>
          ) : null}
          <h3 style={{ fontSize: '1rem', margin: '22px 0 10px' }}>{t('discover.popular')}</h3>
          <PostGrid posts={popular} onOpen={(i) => openPosts(popular, i)} />
        </>
      ) : userHits.length + tagHits.length + postHits.length === 0 ? (
        <div className="empty sub" style={{ height: 'auto' }}>{t('discover.noResults')}</div>
      ) : (
        <>
          {userHits.length > 0 ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>{userHits.map(creatorRow)}</div> : null}
          {tagHits.length > 0 ? <div style={{ marginBottom: 18 }}>{tagGrid(tagHits.slice(0, 6))}</div> : null}
          {postHits.length > 0 ? <PostGrid posts={postHits} onOpen={(i) => openPosts(postHits, i)} /> : null}
        </>
      )}
    </div>
  );
}

export function DiscoverTab() {
  const app = useApp();
  const { t } = app;
  return (
    <div className="scroll">
      <div className="page">
        <div className="row between" style={{ marginBottom: 14 }}>
          <h1 className="h1" style={{ color: 'var(--accent)' }}>{t('discover.title')}</h1>
          <div className="seg" role="tablist">
            <button type="button" role="tab" aria-selected={app.discoverTab === 'trending'} className={app.discoverTab === 'trending' ? 'on' : ''} onClick={() => app.setDiscoverTab('trending')}>{t('discover.trending')}</button>
            <button type="button" role="tab" aria-selected={app.discoverTab === 'askai'} className={app.discoverTab === 'askai' ? 'on' : ''} onClick={() => app.setDiscoverTab('askai')}>✨ {t('discover.askAi')}</button>
          </div>
        </div>
        {app.discoverTab === 'trending' ? <TrendingPane /> : <AiPane />}
      </div>
    </div>
  );
}

export function lastPreview(m: Msg | undefined, t: TFn): string {
  if (!m) return '';
  if (m.kind === 'system') return sysText(m, t);
  const body = m.kind === 'image' ? `📷 ${t('chat.photo')}` : m.text;
  return m.sender === ME ? `${t('chat.you')}: ${body}` : body;
}

export function sysText(m: Msg, t: TFn): string {
  if (!m.sys) return '';
  if (m.sys.type === 'created') return t('chat.sysCreated');
  const type = t(m.sys.media === 'video' ? 'call.video' : 'call.audio');
  return m.sys.seconds > 0 ? t('chat.sysCall', { type, time: fmtDuration(m.sys.seconds) }) : t('chat.sysCallMissed', { type });
}

export function InboxTab() {
  const app = useApp();
  const notifs = useNotifs();
  const { t } = app;
  const S = useInboxL(app.settings.language);
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [filter, setFilter] = useState<'main' | 'requests' | 'unread' | 'starred'>('main');
  const [status, setStatus] = useActiveStatus();
  const [note, setNote] = useInboxNote();
  const [sheet, setSheet] = useState<'' | 'status' | 'tools' | 'note'>('');
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const all = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return app.chats
      .filter((c) => !(c.peer && app.isBlocked(c.peer)) && (!needle || c.name.toLowerCase().includes(needle)))
      .map((c) => {
        const list = app.messages[c.id] ?? [];
        const last = list[list.length - 1];
        return { chat: c, last, at: last?.createdAt ?? c.createdAt };
      })
      .sort((a, b) => Number(!!b.chat.pinned) - Number(!!a.chat.pinned) || b.at - a.at);
  }, [app.chats, app.messages, q]);
  const unreadN = all.filter((r) => r.chat.unread > 0).length;
  const rows = filter === 'requests' ? [] : all.filter((r) => (filter === 'unread' ? r.chat.unread > 0 : filter === 'starred' ? !!r.chat.starred : true));
  const lastNotif = notifs.items[0];
  const toggleSel = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const stopSel = () => { setSelecting(false); setSel([]); };
  const chips: { id: typeof filter; label: string; n?: number }[] = [
    { id: 'main', label: S.main, n: all.length },
    { id: 'requests', label: S.requests },
    { id: 'unread', label: S.unread, n: unreadN },
    { id: 'starred', label: S.starred },
  ];

  return (
    <div className="scroll">
      <div className="page">
        <div className="ib-top">
          <button type="button" className="iconbtn" aria-label={t('inbox.newGroup')} onClick={() => app.push({ name: 'newGroup' })}><Icon name="users" size={24} /></button>
          <div className="ttl">
            <span>{t('inbox.title')}</span>
            <button type="button" className="ib-pill" aria-label={S.statusTitle} onClick={() => setSheet('status')}><span className={`ib-dot${status === 'none' ? ' off' : ''}`} /><Icon name="chevron" size={12} className="ib-chev" /></button>
          </div>
          <button type="button" className="iconbtn" aria-label={t('inbox.search')} onClick={() => { setSearching((v) => !v); if (searching) setQ(''); }}><Icon name="search" size={24} /></button>
          <button type="button" className="iconbtn" aria-label={S.tools} onClick={() => setSheet('tools')}><Icon name="more" size={24} /></button>
        </div>
        <StoryTray note={note?.text} onNote={() => setSheet('note')} noteHint={S.noteHint} />
        {searching ? <input className="pill-input" style={{ width: '100%', marginBottom: 12 }} value={q} autoFocus placeholder={t('inbox.search')} aria-label={t('inbox.search')} onChange={(e) => setQ(e.target.value)} /> : null}
        <div className="ib-chips" role="tablist">
          {chips.map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={filter === c.id} className={filter === c.id ? 'on' : ''} onClick={() => setFilter(c.id)}>{c.label}{c.n ? ` ${c.n}` : ''}</button>
          ))}
        </div>
        <button type="button" className="ib-act" aria-label="Activity" onClick={() => app.push({ name: 'notifications' })}>
          <span className="ic"><Icon name="zap" size={26} fill="currentColor" />{notifs.unread > 0 ? <i>{notifs.unread > 9 ? '9+' : notifs.unread}</i> : null}</span>
          <div className="grow" style={{ minWidth: 0 }}>
            <b style={{ display: 'block' }}>{S.activity}</b>
            <span className="small sub truncate" style={{ display: 'block' }}>{lastNotif ? lastNotif.text : ''}</span>
          </div>
        </button>
        {filter === 'requests' ? <EmptyNote icon="message" title={S.noReq} sub={S.noReqD} /> : null}
        {filter === 'starred' && rows.length === 0 ? <EmptyNote icon="sparkles" title={S.noStar} /> : null}
        {filter === 'unread' && rows.length === 0 ? <EmptyNote icon="check" title={S.noUnread} /> : null}
        {filter === 'main' && rows.length === 0 ? <div className="empty sub" style={{ height: 'auto' }}>{t('inbox.empty')}</div> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(({ chat, last, at }) => (
            <button key={chat.id} type="button" className="chatrow" onClick={() => (selecting ? toggleSel(chat.id) : app.push({ name: 'chat', chatId: chat.id }))}>
              {selecting ? <span className={`ib-check${sel.includes(chat.id) ? ' on' : ''}`}>{sel.includes(chat.id) ? <Icon name="check" size={14} /> : null}</span> : null}
              <Avatar emoji={chat.emoji} name={chat.name} color={chat.color} size={48} online={!chat.isGroup && status !== 'none'} />
              <div className="grow">
                <div className="row between">
                  <b className="truncate">{chat.name}{chat.starred ? ' ⭐' : ''}</b>{chat.peer && isVerifiedUser(chat.peer) ? <VerifiedBadge size={14} /> : null}
                  <span className="small sub">{timeAgo(at, t)}</span>
                </div>
                <div className="row between">
                  <span className="small sub truncate" style={{ color: app.typing[chat.id] ? 'var(--ok)' : undefined }}>
                    {app.typing[chat.id] ? t('chat.typing') : lastPreview(last, t)}
                  </span>
                  {chat.unread > 0 ? <span className="badge" style={{ position: 'static' }}>{chat.unread}</span> : chat.muted ? <Icon name="bell" size={14} /> : null}
                </div>
              </div>
            </button>
          ))}
        </div>
        {selecting ? (
          <div className="ib-sel">
            <b className="grow">{S.selected.replace('{n}', String(sel.length))}</b>
            <button type="button" className="btn sm" disabled={!sel.length} onClick={() => { sel.forEach((id) => app.markRead(id)); stopSel(); }}>{S.markRead}</button>
            <button type="button" className="btn sm" disabled={!sel.length} onClick={() => { sel.forEach((id) => app.updateChat(id, { starred: true })); stopSel(); }}>{S.star}</button>
            <button type="button" className="btn sm" disabled={!sel.length} onClick={() => { sel.forEach((id) => app.updateChat(id, { muted: true })); stopSel(); }}>{S.mute}</button>
            <button type="button" className="btn sm danger" disabled={!sel.length} onClick={() => { const ids = sel; app.askConfirm({ title: S.delQ, body: '', confirmLabel: S.del, danger: true, onConfirm: () => { ids.forEach((id) => app.deleteChat(id)); stopSel(); } }); }}>{S.del}</button>
            <button type="button" className="iconbtn" aria-label={S.cancel} onClick={stopSel}><Icon name="x" size={20} /></button>
          </div>
        ) : null}
      </div>
      {sheet === 'status' ? <StatusSheet value={status} onChange={setStatus} onClose={() => setSheet('')} /> : null}
      {sheet === 'tools' ? <ToolsSheets onClose={() => setSheet('')} onSelect={() => setSelecting(true)} /> : null}
      {sheet === 'note' ? <NoteSheet note={note} onSave={setNote} onClose={() => setSheet('')} /> : null}
    </div>
  );
}


/* ============================================================================
 * Chat, call, new group
 * ========================================================================== */

export function ChatScreen({ chatId }: { chatId: string }) {
  const app = useApp();
  const { t } = app;
  const chat = app.chats.find((c) => c.id === chatId);
  const msgs = app.messages[chatId] ?? [];
  const [text, setText] = useState('');
  const [quick, setQuick] = useState(false);
  const [emoji, setEmoji] = useState(false);
  const [menu, setMenu] = useState(false);
  const [info, setInfo] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingName = app.typing[chatId];
  useEffect(() => {
    if (chatBus.search === chatId) {
      chatBus.search = '';
      setSearchOpen(true);
    }
  });
  const { pop, markRead } = app;

  useEffect(() => {
    if (!chat) pop();
  }, [chat, pop]);

  useEffect(() => {
    markRead(chatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, msgs.length]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length, typingName]);

  if (!chat) return null;

  const send = () => {
    if (!text.trim()) return;
    app.sendMessage(chatId, { text });
    setText('');
    setEmoji(false);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      app.toast(t('toast.imageOnly'));
      return;
    }
    try {
      app.sendMessage(chatId, { src: await resizeImage(file, 720, 0.72) });
    } catch {
      app.toast(t('toast.error'));
    }
  };

  const dayLabel = (ts: number) => {
    const now = Date.now();
    if (sameDay(ts, now)) return t('time.today');
    if (sameDay(ts, now - 86400000)) return t('time.yesterday');
    return fmtDay(ts, app.langMeta.locale);
  };

  const peerKnown = chat.peer && authorByName(chat.peer);

  return (
    <div className="overlay">
      <header className="topbar">
        <button type="button" className="iconbtn" onClick={app.pop} aria-label={t('common.back')}><Icon name="back" className="flip-rtl" /></button>
        <button type="button" className="row grow" style={{ textAlign: 'start' }} onClick={() => app.push({ name: 'chatinfo', chatId })}>
          <Avatar emoji={chat.emoji} name={chat.name} color={chat.color} size={38} online={!chat.isGroup} />
          <div className="grow">
            <div className="row" style={{ gap: 4, fontWeight: 800 }}><span className="truncate">{chat.name}</span>{chat.peer && isVerifiedUser(chat.peer) ? <VerifiedBadge size={15} /> : null}</div>
            <div className="small" style={{ color: 'var(--ok)' }}>
              {typingName ? t('chat.typing') : chat.isGroup ? t('chat.members', { n: chat.members.length + 1 }) : t('chat.activeNow')}
            </div>
          </div>
        </button>
        {!chat.isGroup ? (
          <>
            <button type="button" className="iconbtn" onClick={() => app.startCall(chatId, 'audio')} aria-label={t('chat.audioCall')}><Icon name="phone" size={20} /></button>
            <button type="button" className="iconbtn" onClick={() => app.startCall(chatId, 'video')} aria-label={t('chat.videoCall')}><Icon name="video" size={22} /></button>
          </>
        ) : null}
        <button type="button" className="iconbtn" onClick={() => app.push({ name: 'chatinfo', chatId })} aria-label={t('chat.menu')}><Icon name="more" /></button>
      </header>

      {searchOpen ? (
        <div className="chatsearch">
          <Icon name="search" size={18} />
          <input autoFocus value={searchQ} placeholder={t('chat.search')} aria-label={t('chat.search')} onChange={(e) => setSearchQ(e.target.value)} />
          <button type="button" className="iconbtn" onClick={() => { setSearchOpen(false); setSearchQ(''); }} aria-label={t('common.close')}><Icon name="x" size={18} /></button>
        </div>
      ) : null}
      <div className="msgs" ref={listRef} style={wallpaperStyle(chat.wallpaper)}>
        {msgs.map((m, i) => {
          if (searchQ.trim() && !(m.text ?? '').toLowerCase().includes(searchQ.trim().toLowerCase())) return null;
          const prev = msgs[i - 1];
          const newDay = !prev || !sameDay(prev.createdAt, m.createdAt);
          const mine = m.sender === ME;
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {newDay ? <div className="syschip">{dayLabel(m.createdAt)}</div> : null}
              {m.kind === 'system' ? (
                <div className="syschip">{sysText(m, t)}</div>
              ) : (
                <div className={`bubble${mine ? ' me' : ''}`}>
                  {chat.isGroup && !mine && (newDay || prev?.sender !== m.sender) ? <span className="from">{m.sender}</span> : null}
                  {m.kind === 'image' && m.src ? <img src={m.src} alt={t('chat.photo')} /> : null}
                  {m.text}
                  <span className="time">{fmtClock(m.createdAt, app.langMeta.locale)}</span>
                </div>
              )}
            </div>
          );
        })}
        {typingName ? (
          <div className="bubble" aria-label={t('chat.typing')}>
            <span className="typing"><i /><i /><i /></span>
          </div>
        ) : null}
      </div>

      {emoji ? (
        <div className="emojibar">
          {EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => setText((v) => v + e)} aria-label={e}>{e}</button>
          ))}
        </div>
      ) : null}
      <div className="bar">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
        <button type="button" className="iconbtn" onClick={() => app.requirePermission('photos', () => fileRef.current?.click())} aria-label={t('chat.attach')}><Icon name="image" /></button>
        <button type="button" className="iconbtn" onClick={() => setEmoji((v) => !v)} aria-pressed={emoji} aria-label={t('chat.emoji')}><Icon name="smile" /></button>
        <button type="button" className="iconbtn" onClick={() => setQuick(true)} aria-label="Quick replies"><Icon name="zap" /></button>
        <input
          className="pill-input"
          value={text}
          maxLength={2000}
          placeholder={t('chat.placeholder', { name: chat.name })}
          aria-label={t('chat.placeholder', { name: chat.name })}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button type="button" className="sendbtn" onClick={send} disabled={!text.trim()} aria-label={t('common.send')}><Icon name="send" size={18} /></button>
      </div>

      {quick ? <QuickRepliesSheet onClose={() => setQuick(false)} onPick={(v) => setText(v)} /> : null}
      {menu ? (
        <Sheet label={t('chat.menu')} onClose={() => setMenu(false)}>
          <div className="actions">
            <Action icon="info" label={t('chat.info')} onClick={() => { setMenu(false); setInfo(true); }} />
            <Action icon="bell" label={t(chat.muted ? 'chat.unmute' : 'chat.mute')} on={chat.muted} onClick={() => { app.toggleMute(chatId); setMenu(false); }} />
            <Action
              icon="trash"
              label={t('chat.clear')}
              onClick={() => {
                setMenu(false);
                app.askConfirm({ title: t('chat.clear'), body: t('chat.clearBody'), confirmLabel: t('chat.clear'), danger: true, onConfirm: () => app.clearChat(chatId) });
              }}
            />
            <Action
              icon="x"
              danger
              label={t('chat.delete')}
              onClick={() => {
                setMenu(false);
                app.askConfirm({ title: t('chat.delete'), body: t('chat.deleteBody'), confirmLabel: t('common.delete'), danger: true, onConfirm: () => app.deleteChat(chatId) });
              }}
            />
          </div>
        </Sheet>
      ) : null}

      {info ? (
        <Sheet label={t('chat.info')} onClose={() => setInfo(false)}>
          <div className="center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Avatar emoji={chat.emoji} name={chat.name} color={chat.color} size={84} />
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>{chat.name}{chat.peer && isVerifiedUser(chat.peer) ? <VerifiedBadge size={18} /> : null}</h3>
            {chat.bio ? <p className="sub" style={{ margin: 0 }}>{chat.bio}</p> : null}
          </div>
          {chat.isGroup ? (
            <div className="card cardlist">
              {chat.members.map((m) => (
                <div key={m} className="listrow">
                  <Avatar name={m} size={34} />
                  <span className="grow">{m}</span>
                  {m === chat.admin ? <span className="chip on">{t('group.admin')}</span> : null}
                </div>
              ))}
              <div className="listrow">
                <Avatar name={app.profile.name} src={app.profile.avatar} emoji={app.profile.username === DEFAULT_PROFILE.username ? DEMO_EMOJI : undefined} size={34} />
                <span className="grow">{t('chat.you')}</span>
                {chat.admin === ME || chat.admin === app.profile.name ? <span className="chip on">{t('group.admin')}</span> : null}
              </div>
            </div>
          ) : peerKnown ? (
            <button type="button" className="btn block" onClick={() => { setInfo(false); app.push({ name: 'user', username: chat.peer as string }); }}>
              {t('chat.viewProfile')}
            </button>
          ) : null}
        </Sheet>
      ) : null}
    </div>
  );
}

export function CallScreen({ chatId, media }: { chatId: string; media: 'audio' | 'video' }) {
  const app = useApp();
  const { t } = app;
  const chat = app.chats.find((c) => c.id === chatId);
  const [connected, setConnected] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [speaker, setSpeaker] = useState(media === 'video');
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [mediaErr, setMediaErr] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const alive = useRef(false);
  const info = useRef({ connected: false, seconds: 0 });
  info.current = { connected, seconds };
  const { logCall } = app;

  // Log the call when the screen really goes away (also on Back), ignoring StrictMode's fake unmount.
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      window.setTimeout(() => {
        if (!alive.current) logCall(chatId, media, info.current.connected ? info.current.seconds : 0);
      }, 0);
    };
  }, [chatId, media, logCall]);

  useEffect(() => {
    const id = window.setTimeout(() => setConnected(true), 2200);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!connected) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [connected]);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaErr(true);
      return;
    }
    let cancelled = false;
    let current: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: media === 'video' ? { facingMode: facing } : false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((tr) => tr.stop());
          return;
        }
        current = s;
        setStream(s);
        setMediaErr(false);
      })
      .catch(() => !cancelled && setMediaErr(true));
    return () => {
      cancelled = true;
      current?.getTracks().forEach((tr) => tr.stop());
      setStream(null);
    };
  }, [media, facing]);

  useEffect(() => {
    const v = videoRef.current;
    if (v && stream) {
      v.srcObject = stream;
      void v.play().catch(() => undefined);
    }
  }, [stream, media, connected]);
  useEffect(() => {
    stream?.getAudioTracks().forEach((tr) => (tr.enabled = !muted));
  }, [stream, muted]);
  useEffect(() => {
    stream?.getVideoTracks().forEach((tr) => (tr.enabled = !camOff));
  }, [stream, camOff]);

  if (!chat) return null;

  return (
    <div className="call" role="dialog" aria-label={t(media === 'video' ? 'call.video' : 'call.audio')}>
      {media === 'video' && stream && !camOff ? (
        <video ref={videoRef} className={`local${facing === 'user' ? ' mirror' : ''}`} autoPlay playsInline muted />
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
        <div className="pulse"><Avatar emoji={chat.emoji} name={chat.name} color={chat.color} size={120} /></div>
        <h2 style={{ margin: '18px 0 0', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>{chat.name}{chat.peer && isVerifiedUser(chat.peer) ? <VerifiedBadge size={20} /> : null}</h2>
        <p style={{ margin: 0, color: 'var(--ok)' }}>
          {connected ? fmtDuration(seconds) : t('call.connecting')}
        </p>
        {mediaErr ? <p style={{ margin: 0, color: '#fbbf24', fontSize: '.82rem' }}>{t('call.mediaError')}</p> : null}
      </div>
      <div className="small" style={{ opacity: 0.6, textAlign: 'center' }}>{t('call.demo')}</div>
      <div className="ctrls">
        <button type="button" className={`cbtn${muted ? ' on' : ''}`} onClick={() => { setMuted((m) => !m); app.toast(t(muted ? 'toast.unmuted' : 'toast.muted')); }} aria-pressed={muted} aria-label={t(muted ? 'call.unmute' : 'call.mute')}>
          <Icon name={muted ? 'micOff' : 'mic'} />
        </button>
        {media === 'video' ? (
          <>
            <button type="button" className={`cbtn${camOff ? ' on' : ''}`} onClick={() => setCamOff((c) => !c)} aria-pressed={camOff} aria-label={t('call.camera')}>
              <Icon name={camOff ? 'videoOff' : 'video'} />
            </button>
            <button type="button" className="cbtn" onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))} aria-label={t('call.flip')}>
              <Icon name="refresh" />
            </button>
          </>
        ) : null}
        <button type="button" className={`cbtn${speaker ? ' on' : ''}`} onClick={() => { setSpeaker((s) => !s); app.toast(t('toast.speaker')); }} aria-pressed={speaker} aria-label={t('call.speaker')}>
          <Icon name={speaker ? 'volume' : 'volumeOff'} />
        </button>
        <button type="button" className="cbtn end" onClick={app.pop} aria-label={t('call.end')}>
          <Icon name="phone" />
        </button>
      </div>
    </div>
  );
}

export function NewGroupScreen() {
  const app = useApp();
  const { t } = app;
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [admin, setAdmin] = useState<string>(ME);
  const [extra, setExtra] = useState<string[]>([]);
  const [err, setErr] = useState('');
  const allowed = app.settings.permissions.contacts;
  const contacts = [...CONTACT_NAMES, ...extra.filter((n) => !CONTACT_NAMES.includes(n))];
  const nav = navigator as unknown as { contacts?: { select: (props: string[], opts: { multiple: boolean }) => Promise<{ name?: string[] }[]> } };
  const canImport = !!nav.contacts?.select;

  const importContacts = async () => {
    try {
      const res = await nav.contacts?.select(['name'], { multiple: true });
      const names = (res ?? []).map((c) => c.name?.[0]).filter((n): n is string => !!n);
      setExtra((e) => [...new Set([...e, ...names])]);
    } catch {
      /* user cancelled */
    }
  };

  const toggle = (n: string) => {
    setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));
    if (admin === n) setAdmin(ME);
  };

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return setErr(t('group.errName'));
    if (picked.length === 0) return setErr(t('group.errMembers'));
    const id = app.createGroup(trimmed, picked, admin === ME ? ME : admin);
    app.toast(t('group.created'));
    app.replace({ name: 'chat', chatId: id });
  };

  return (
    <div className="overlay">
      <TopBar title={t('group.title')} onBack={app.pop} />
      <div className="scroll">
        <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field">
            <label htmlFor="gname">{t('group.name')}</label>
            <input id="gname" className={`input${err && !name.trim() ? ' err' : ''}`} value={name} maxLength={40} placeholder={t('group.namePlaceholder')} onChange={(e) => { setName(e.target.value); setErr(''); }} />
          </div>
          <div className="field">
            <label>{t('group.members')} ({picked.length})</label>
            {!allowed ? (
              <div className="card center" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                <Icon name="users" size={34} />
                <span className="sub small">{t('perm.contactsDesc')}</span>
                <button type="button" className="btn primary sm" onClick={() => app.requirePermission('contacts', () => undefined)}>{t('common.allow')}</button>
              </div>
            ) : (
              <div className="card cardlist">
                {contacts.map((n) => (
                  <button key={n} type="button" className="listrow" onClick={() => { toggle(n); setErr(''); }} aria-pressed={picked.includes(n)}>
                    <Avatar name={n} size={36} />
                    <span className="grow">{n}</span>
                    {picked.includes(n) ? <span style={{ color: 'var(--accent)' }}><Icon name="check" /></span> : null}
                  </button>
                ))}
                {canImport ? (
                  <button type="button" className="listrow" onClick={() => void importContacts()} style={{ color: 'var(--accent)', fontWeight: 700 }}>
                    <Icon name="plus" /> {t('group.import')}
                  </button>
                ) : null}
              </div>
            )}
          </div>
          <div className="field">
            <label htmlFor="gadmin">{t('group.admin')}</label>
            <select id="gadmin" className="input" value={admin} onChange={(e) => setAdmin(e.target.value)}>
              <option value={ME}>{t('chat.you')}</option>
              {picked.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          {err ? <p className="errtext" role="alert">{err}</p> : null}
          <button type="button" className="btn primary block" onClick={create}>{t('group.create')}</button>
        </div>
      </div>
    </div>
  );
}
