/* KurdTok — state.tsx */
import { DAY_MS, verifyTotp } from './utils';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { DICT, EN, type Key } from './dict';
import { ACCENTS, PLAN_DEFS, makeAppIcon, type AdReq, type Plan, DEFAULT_PROFILE, type StoryOverlays, type TrashItem, DEFAULT_SETTINGS, DEMO_EMOJI, LANGS, ME, REPLY_KEYS, RESERVED_USERNAMES, pick, type Draft, STORE_PREFIX, authorByName, copyText, downloadBlob, extFromType, hashColor, idbClear, idbDelete, idbGet, idbPut, makeSeedChats, makeSeedComments, makeSeedMessages, makeSeedPosts, reviveSettings, sha256Hex, type Account, type AiMsg, type Chat, type CommentT, type Visit, type ConfirmState, type MediaKind, type Msg, type PermKey, type Post, type Profile, type ReplyT, type Route, type RouteEntry, type Settings, type Tab, uid, usePersistentState } from './utils';

/* ============================================================================
 * App state (single provider, no external libraries)
 * ========================================================================== */

export type TFn = (key: Key, params?: Record<string, string | number>) => string;

export interface AuthorView {
  username: string;
  name: string;
  avatar: string | null;
  emoji?: string;
  color: string;
  verified: boolean;
  isMe: boolean;
}

export const postLink = (id: string): string =>
  `${window.location.origin}${window.location.pathname}#post-${id}`;

export interface RegisterInfo {
  name: string;
  username: string;
  email?: string;
  phone?: string;
  birth: string;
  password?: string;
  provider: 'password' | 'google' | 'facebook' | 'apple' | 'phone';
}

export function useAppState() {
  const [settings, setSettings] = usePersistentState<Settings>('settings', DEFAULT_SETTINGS, reviveSettings);
  const [account, setAccount] = usePersistentState<Account | null>('account', null);
  const [loggedIn, setLoggedIn] = usePersistentState<boolean>('session', false);
  const [profile, setProfile] = usePersistentState<Profile>('profile', DEFAULT_PROFILE);
  const [posts, setPosts] = usePersistentState<Post[]>('posts', makeSeedPosts);
  const isOwner = ['ismael_mirkhan', 'ismael.mirkhan'].includes(profile.username);
  const [plan, setPlan] = usePersistentState<Plan | null>('plan', null);
  const [visits, setVisits] = usePersistentState<Visit[]>('visits', []);
  const [notifSeen, setNotifSeen] = usePersistentState<number>('notifSeen', 0);
  const simDone = useRef(false);
  const [viewsTotal, setViewsTotal] = usePersistentState<number>('viewsTotal', 0);
  const [mutedStories, setMutedStories] = usePersistentState<string[]>('mutedStories', []);
  const toggleMuteStory = (u: string) => setMutedStories((m) => (m.includes(u) ? m.filter((x) => x !== u) : [...m, u]));
  const [viewMap, setViewMap] = usePersistentState<Record<string, number>>('viewMap', {});
  const viewSeen = useRef<Set<string>>(new Set());
  const postViews = (p: Post) => (viewMap[p.id] ?? 0) + p.likes * 7 + p.shares * 3 + (p.saves ?? 0) * 2;
  const bumpView = (id: string) => {
    if (viewSeen.current.has(id)) return;
    viewSeen.current.add(id);
    setViewMap((m) => ({ ...m, [id]: (m[id] ?? 0) + 1 }));
  };
  const [purgedLikes, setPurgedLikes] = usePersistentState<number>('purgedLikes', 0);
  const [ads, setAds] = usePersistentState<AdReq[]>('ads', []);
  const [trash, setTrash] = usePersistentState<TrashItem[]>('trash', []);
  const [comments, setComments] = usePersistentState<Record<string, CommentT[]>>('comments', makeSeedComments);
  const [savedSounds, setSavedSounds] = usePersistentState<string[]>('savedSounds', []);
  const [followersOf, setFollowersOf] = usePersistentState<string[]>('followersOf', ['shingelbana_resort']);
  const [viewedStories, setViewedStories] = usePersistentState<string[]>('viewedStories', []);
  const [hidden, setHidden] = usePersistentState<string[]>('hidden', []);
  const [followed, setFollowed] = usePersistentState<string[]>('followed', ['shingelbana_resort', 'rawanduz_view']);
  const [chats, setChats] = usePersistentState<Chat[]>('chats', makeSeedChats);
  const [messages, setMessages] = usePersistentState<Record<string, Msg[]>>('messages', makeSeedMessages);
  const [aiHistory, setAiHistory] = usePersistentState<AiMsg[]>('ai', []);

  const [tab, setTab] = useState<Tab>('home');
  const [feedTab, setFeedTab] = useState<'foryou' | 'following'>('foryou');
  const [discoverTab, setDiscoverTab] = useState<'trending' | 'askai'>('trending');
  const [query, setQuery] = useState('');
  const [feedMuted, setFeedMutedRaw] = useState(true);
  const mutePref = useRef(false);
  const setFeedMuted = (v: boolean, auto?: boolean) => {
    if (!auto) mutePref.current = true;
    setFeedMutedRaw(v);
  };
  useEffect(() => {
    // Sound comes back on the first touch, or when a hardware volume key is reported (unless the user muted on purpose).
    const unmute = () => {
      if (!mutePref.current) setFeedMutedRaw(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (/^(AudioVolume(Up|Down)|Volume(Up|Down))$/.test(e.key)) {
        mutePref.current = false;
        setFeedMutedRaw(false);
      }
    };
    window.addEventListener('pointerdown', unmute, { once: true, capture: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', unmute, true);
      window.removeEventListener('keydown', onKey);
    };
  }, []);
  const [shareFor, setShareFor] = useState<string | null>(null);
  const [clearDisplay, setClearDisplay] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [permModal, setPermModal] = useState<{ key: PermKey; then?: () => void | Promise<void> } | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [toastMsg, setToastMsg] = useState<{ id: number; text: string } | null>(null);
  const [typing, setTyping] = useState<Record<string, string | null>>({});
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return true;
    }
  });

  const langMeta = LANGS.find((l) => l.code === settings.language) ?? LANGS[0];
  const theme: 'dark' | 'light' = settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme;

  const t = useCallback<TFn>(
    (key, params) => {
      let s: string = DICT[settings.language][key] ?? EN[key] ?? key;
      if (params) {
        s = s.replace(/\{(\w+)\}/g, (_m, n: string) => (params[n] !== undefined ? String(params[n]) : `{${n}}`));
      }
      return s;
    },
    [settings.language],
  );

  /* ---- navigation stack synced with browser history (Back button works) ---- */
  const [stack, setStack] = useState<RouteEntry[]>([]);
  const stackRef = useRef<RouteEntry[]>([]);
  const historyOk = useRef(true);
  const popPending = useRef(false);

  const commit = useCallback((next: RouteEntry[]) => {
    stackRef.current = next;
    setStack(next);
  }, []);

  const push = useCallback(
    (r: Route) => {
      const entry = { ...r, key: uid() } as RouteEntry;
      const next = [...stackRef.current, entry];
      try {
        window.history.pushState({ kt: next.length }, '');
      } catch {
        historyOk.current = false;
      }
      commit(next);
    },
    [commit],
  );

  const pop = useCallback(() => {
    if (stackRef.current.length === 0 || popPending.current) return;
    if (historyOk.current) {
      try {
        popPending.current = true;
        window.setTimeout(() => {
          popPending.current = false;
        }, 700);
        window.history.back();
        return;
      } catch {
        popPending.current = false;
      }
    }
    commit(stackRef.current.slice(0, -1));
  }, [commit]);

  const replace = useCallback(
    (r: Route) => {
      if (stackRef.current.length === 0) {
        push(r);
        return;
      }
      const entry = { ...r, key: uid() } as RouteEntry;
      const next = [...stackRef.current.slice(0, -1), entry];
      try {
        window.history.replaceState({ kt: next.length }, '');
      } catch {
        /* ignore */
      }
      commit(next);
    },
    [commit, push],
  );

  const resetNav = useCallback(() => {
    const n = stackRef.current.length;
    commit([]);
    if (n > 0 && historyOk.current) {
      try {
        window.history.go(-n);
      } catch {
        /* ignore */
      }
    }
  }, [commit]);

  useEffect(() => {
    try {
      window.history.replaceState({ kt: 0 }, '');
    } catch {
      historyOk.current = false;
    }
    const onPop = (e: PopStateEvent) => {
      popPending.current = false;
      const st = e.state as { kt?: number } | null;
      const depth = st && typeof st.kt === 'number' ? st.kt : 0;
      if (depth < stackRef.current.length) commit(stackRef.current.slice(0, depth));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [commit]);

  /* ---- latest values for timers / async callbacks ---- */
  const latest = useRef({ t, settings, profile, chats, stack, confirmState, permModal, shareFor });
  latest.current = { t, settings, profile, chats, stack, confirmState, permModal, shareFor };

  /* ---- toast ---- */
  const toastTimer = useRef<number | undefined>(undefined);
  const toast = useCallback((text: string) => {
    setToastMsg({ id: Date.now(), text });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2400);
  }, []);

  /* ---- document-level effects ---- */
  useEffect(() => {
    document.documentElement.lang = langMeta.code === 'ckb' ? 'ckb' : langMeta.code;
    document.documentElement.dir = langMeta.dir;
    document.documentElement.setAttribute('data-theme', theme);
    document.title = DICT[settings.language]['app.name'];
  }, [langMeta.code, langMeta.dir, theme, settings.language]);

  useEffect(() => {
    const px = settings.textSize === 'sm' ? '14px' : settings.textSize === 'lg' ? '18px' : '16px';
    document.documentElement.style.fontSize = px;
  }, [settings.textSize]);

  useEffect(() => {
    if (document.getElementById('kt-font')) return;
    const link = document.createElement('link');
    link.id = 'kt-font';
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Arabic:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia('(prefers-color-scheme: dark)');
    } catch {
      return;
    }
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq?.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const onQuota = () => toast(latest.current.t('toast.storageFull'));
    window.addEventListener('kt-quota', onQuota);
    return () => window.removeEventListener('kt-quota', onQuota);
  }, [toast]);

  const clearRef = useRef(false);
  clearRef.current = clearDisplay;
  useEffect(() => {
    setClearDisplay(false);
  }, [tab, stack.length]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const L = latest.current;
      if (clearRef.current) setClearDisplay(false);
      else if (L.confirmState) setConfirmState(null);
      else if (L.permModal) setPermModal(null);
      else if (L.shareFor) setShareFor(null);
      else if (stackRef.current.length > 0) pop();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pop]);

  const replyTimers = useRef<Record<string, number[]>>({});
  useEffect(() => {
    const timers = replyTimers.current;
    return () => {
      Object.values(timers).forEach((ids) => ids.forEach((id) => window.clearTimeout(id)));
      window.clearTimeout(toastTimer.current);
    };
  }, []);

  /* ---- deep link: #post-<id> ---- */
  const deepLinked = useRef(false);
  useEffect(() => {
    if (!loggedIn || deepLinked.current) return;
    deepLinked.current = true;
    const m = /^#post-(.+)$/.exec(window.location.hash);
    if (m && posts.some((p) => p.id === m[1])) push({ name: 'viewer', ids: [m[1]], index: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  /* ---- permissions ---- */
  const requirePermission = useCallback(
    (key: PermKey, then: () => void | Promise<void>): boolean => {
      if (latest.current.settings.permissions[key]) {
        void then();
        return true;
      }
      setPermModal({ key, then });
      return false;
    },
    [],
  );

  const setPermission = useCallback(
    (key: PermKey, value: boolean) => {
      setSettings((s) => ({ ...s, permissions: { ...s.permissions, [key]: value } }));
    },
    [setSettings],
  );

  const askConfirm = useCallback((c: ConfirmState) => setConfirmState(c), []);

  /* ---- auth ---- */
  const register = useCallback(
    async (info: RegisterInfo): Promise<Key | null> => {
      const { name, username, password } = info;
      if (RESERVED_USERNAMES.has(username)) return 'auth.errTaken';
      const salt = uid();
      const hash = password ? await sha256Hex(salt + password) : '';
      setAccount({ name, username, salt, hash, email: info.email, phone: info.phone, birth: info.birth, provider: info.provider, verified: true, createdAt: Date.now(), linked: [] });
      setProfile({ ...DEFAULT_PROFILE, name, username, bio: '', location: '', website: '', avatar: null, cover: null, followers: 0, following: followed.length });
      const removed = new Set(posts.filter((p) => p.mine && p.seed).map((p) => p.id));
      setPosts((ps) => ps.filter((p) => !removed.has(p.id)));
      setComments((c) => Object.fromEntries(Object.entries(c).filter(([k]) => !removed.has(k))));
      setLoggedIn(true);
      return null;
    },
    [followed.length, posts, setAccount, setComments, setLoggedIn, setPosts, setProfile],
  );

  const socialLogin = useCallback(
    (provider: string): boolean => {
      if (account && account.provider === provider) {
        setLoggedIn(true);
        return true;
      }
      return false;
    },
    [account, setLoggedIn],
  );

  const updateAccount = useCallback((patch: Partial<Account>) => setAccount((a) => (a ? { ...a, ...patch } : a)), [setAccount]);

  const demoLogin = useCallback(() => setLoggedIn(true), [setLoggedIn]);

  const findAccount = useCallback(
    (idRaw: string): boolean => {
      if (!account) return false;
      const id = idRaw.trim().toLowerCase();
      const digits = id.replace(/[^\d+]/g, '');
      return account.username === id || (!!account.email && account.email === id) || (!!account.phone && digits.length > 6 && account.phone === digits);
    },
    [account],
  );

  const resetPassword = useCallback(
    async (idRaw: string, newPw: string): Promise<Key | null> => {
      if (!account || !findAccount(idRaw)) return 'auth.errNoAccount';
      const salt = uid();
      setAccount({ ...account, salt, hash: await sha256Hex(salt + newPw), totpOn: account.totpOn });
      return null;
    },
    [account, findAccount, setAccount],
  );

  const checkPassword = useCallback(
    async (idRaw: string, password: string): Promise<{ ok: boolean; tfa?: 'email' | 'phone' | 'app'; contact?: string }> => {
      if (!account || !account.hash || !findAccount(idRaw)) return { ok: false };
      if ((await sha256Hex(account.salt + password)) !== account.hash) return { ok: false };
      if (account.tfa === 'email' && account.email) return { ok: true, tfa: 'email', contact: account.email };
      if (account.tfa === 'phone' && account.phone) return { ok: true, tfa: 'phone', contact: account.phone };
      return { ok: true, tfa: account.totpOn ? 'app' : undefined };
    },
    [account, findAccount],
  );

  const setTfa = useCallback((m: 'email' | 'phone' | null) => {
    setAccount((a) => (a ? { ...a, tfa: m ?? undefined, totpOn: m ? false : a.totpOn, totpSecret: m ? undefined : a.totpSecret } : a));
  }, [setAccount]);

  const login = useCallback(
    async (username: string, password: string, code?: string, otpOk?: boolean): Promise<Key | null> => {
      if (!account) return 'auth.errNoAccount';
      const id = username.trim().toLowerCase();
      const digits = id.replace(/[^\d+]/g, '');
      const match = account.username === id || (!!account.email && account.email === id) || (!!account.phone && digits.length > 6 && account.phone === digits);
      if (!match || !account.hash) return 'auth.errCreds';
      const hash = await sha256Hex(account.salt + password);
      if (hash !== account.hash) return 'auth.errCreds';
      if (account.tfa && !otpOk) return 'auth.need2fa';
      if (account.totpOn && account.totpSecret) {
        if (!code) return 'auth.need2fa';
        if (!(await verifyTotp(account.totpSecret, code))) return 'auth.err2fa';
      }
      setLoggedIn(true);
      return null;
    },
    [account, setLoggedIn],
  );

  const changePassword = useCallback(
    async (oldPw: string, newPw: string): Promise<Key | null> => {
      if (!account) return 'auth.errNoAccount';
      if ((await sha256Hex(account.salt + oldPw)) !== account.hash) return 'auth.errCreds';
      const salt = uid();
      setAccount({ ...account, salt, hash: await sha256Hex(salt + newPw) });
      return null;
    },
    [account, setAccount],
  );

  const confirmTotp = useCallback(
    async (secret: string, code: string): Promise<Key | null> => {
      if (!account) return 'auth.errNoAccount';
      if (!(await verifyTotp(secret, code))) return 'auth.err2fa';
      setAccount({ ...account, totpSecret: secret, totpOn: true });
      return null;
    },
    [account, setAccount],
  );

  const disableTotp = useCallback(
    async (password: string): Promise<Key | null> => {
      if (!account) return 'auth.errNoAccount';
      if ((await sha256Hex(account.salt + password)) !== account.hash) return 'auth.errCreds';
      setAccount({ ...account, totpOn: false, totpSecret: undefined });
      return null;
    },
    [account, setAccount],
  );

  const logout = useCallback(() => {
    resetNav();
    setShareFor(null);
    setLoggedIn(false);
    setTab('home');
  }, [resetNav, setLoggedIn]);

  const resetAll = useCallback(async () => {
    try {
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith(STORE_PREFIX))
        .forEach((k) => window.localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    await idbClear();
    window.location.replace(window.location.pathname);
  }, []);

  /* ---- profile ---- */
  const updateProfile = useCallback(
    (patch: Partial<Profile>) => {
      setProfile((p) => ({ ...p, ...patch }));
      if (account && (patch.username || patch.name)) {
        setAccount({ ...account, name: patch.name ?? account.name, username: patch.username ?? account.username });
      }
    },
    [account, setAccount, setProfile],
  );

  const authorOf = useCallback(
    (username: string, mine: boolean): AuthorView => {
      if (mine) {
        return {
          username: profile.username,
          name: profile.name,
          avatar: profile.avatar,
          emoji: profile.username === DEFAULT_PROFILE.username ? DEMO_EMOJI : undefined,
          color: '#8b5cf6',
          verified: isOwner || (!!plan && plan.end > Date.now()),
          isMe: true,
        };
      }
      const a = authorByName(username);
      if (a) return { username: a.username, name: a.name, avatar: null, emoji: a.emoji, color: a.color, verified: a.verified, isMe: false };
      return { username, name: username, avatar: null, color: hashColor(username), verified: false, isMe: false };
    },
    [profile, plan, isOwner],
  );

  /* ---- verification plan perks ---- */
  const planActive = isOwner || (!!plan && plan.end > Date.now());
  const planId = planActive && plan ? plan.id : null;
  const def = planId ? PLAN_DEFS[planId] : null;
  const perks = isOwner
    ? { verified: true, ai: true, theme: true, icon: true, storyDays: 7, aiUnlimited: true }
    : { verified: planActive, ai: planActive, theme: !!def?.theme, icon: !!def?.icon, storyDays: def?.storyDays ?? 1, aiUnlimited: !!def?.aiUnlimited };
  const isVerified = planActive;
  const subscribe = (id: Plan['id']) => {
    const now = Date.now();
    setPlan({ id, start: now, end: now + PLAN_DEFS[id].days * 24 * 60 * 60 * 1000 });
  };
  const cancelPlan = () => {
    setPlan(null);
    setSettings((s) => ({ ...s, accent: 'violet', appIcon: 'default' }));
  };
  const addAd = (a: Omit<AdReq, 'id' | 'createdAt' | 'status'>) => setAds((l) => [{ ...a, id: `ad${Date.now()}`, createdAt: Date.now(), status: 'pending' }, ...l]);
  const cancelAd = (id: string) => setAds((l) => l.map((x) => (x.id === id ? { ...x, status: 'cancelled' } : x)));

  useEffect(() => {
    const th = ACCENTS.find((x) => x.id === settings.accent);
    const st = document.documentElement.style;
    const keys = ['--bg', '--card', '--card2', '--border', '--sub', '--text', '--accent', '--accent2', '--focus', '--bubble-in', '--grad', '--nav'];
    if (perks.theme && th && th.id !== 'violet') for (const k of keys) st.setProperty(k, th.vars[k]);
    else for (const k of keys) st.removeProperty(k);
    const root = document.documentElement;
    const m = /^#?([0-9a-f]{6})$/i.exec(getComputedStyle(root).getPropertyValue('--bg').trim());
    const lum = m ? (parseInt(m[1].slice(0, 2), 16) * 0.299 + parseInt(m[1].slice(2, 4), 16) * 0.587 + parseInt(m[1].slice(4, 6), 16) * 0.114) / 255 : 0;
    if (lum > 0.6) root.dataset.paper = '1';
    else delete root.dataset.paper;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.accent, perks.theme, theme]);

  useEffect(() => {
    if (account && (!account.createdAt || account.verified === undefined)) {
      setAccount({ ...account, createdAt: account.createdAt ?? Date.now(), verified: account.verified ?? !!(account.email || account.phone) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.createdAt, account?.verified]);

  useEffect(() => {
    const id = perks.icon ? settings.appIcon : 'default';
    try {
      const url = makeAppIcon(id);
      if (!url) return;
      for (const rel of ['icon', 'apple-touch-icon']) {
        let l = document.querySelector<HTMLLinkElement>(`link[data-kt-icon="${rel}"]`);
        if (!l) {
          l = document.createElement('link');
          l.rel = rel;
          l.setAttribute('data-kt-icon', rel);
          document.head.appendChild(l);
        }
        l.href = url;
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.appIcon, perks.icon]);

  /* ---- posts ---- */
  const likePost = (id: string) =>
    setPosts((ps) => ps.map((p) => (p.id === id && !p.liked ? { ...p, liked: true, likes: p.likes + 1 } : p)));
  const toggleLike = (id: string) =>
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, liked: !p.liked, likes: Math.max(0, p.likes + (p.liked ? -1 : 1)) } : p)));
  const toggleSave = (id: string) => {
    const was = posts.find((p) => p.id === id)?.saved ?? false;
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)));
    toast(t(was ? 'toast.unsaved' : 'toast.saved'));
  };
  const toggleRepost = (id: string) => {
    const was = posts.find((p) => p.id === id)?.reposted ?? false;
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, reposted: !p.reposted } : p)));
    toast(t(was ? 'toast.unreposted' : 'toast.reposted'));
  };
  const bumpShare = (id: string) => setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, shares: p.shares + 1 } : p)));

  const toggleFollow = (username: string) => {
    const was = followed.includes(username);
    setFollowed((f) => (was ? f.filter((u) => u !== username) : [...f, username]));
    setProfile((p) => ({ ...p, following: Math.max(0, p.following + (was ? -1 : 1)) }));
    if (!was) {
      toast(t('toast.followed', { user: username }));
      let h = 0;
      for (const ch of username) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      if (h % 3 !== 0 && !followersOf.includes(username)) {
        window.setTimeout(() => {
          setFollowersOf((l) => (l.includes(username) ? l : [...l, username]));
          setProfile((p) => ({ ...p, followers: p.followers + 1 }));
          toast(t('toast.followedBack', { user: username }));
        }, 3500);
      }
    }
  };
  const relationOf = (username: string): 'friends' | 'following' | 'followsYou' | 'none' => {
    const f = followed.includes(username);
    const b = followersOf.includes(username);
    return f && b ? 'friends' : f ? 'following' : b ? 'followsYou' : 'none';
  };

  const publishPost = async (input: { kind: MediaKind; src: string; blob?: Blob; caption: string; audio: string; place?: string; story?: boolean; overlays?: StoryOverlays; soundSrc?: string; poster?: string; filter?: string; commentsOff?: boolean; isPrivate?: boolean; storyDays?: number; audience?: 'public' | 'friends' | 'me' }) => {
    const id = uid();
    let blobId: string | undefined;
    if (input.kind === 'video' && input.blob) {
      blobId = `blob-${id}`;
      try {
        await idbPut(blobId, input.blob);
      } catch {
        toast(t('toast.notPersisted'));
      }
    }
    const post: Post = {
      id,
      author: profile.username,
      mine: true,
      kind: input.kind,
      src: input.kind === 'image' ? input.src : '',
      blobId,
      caption: input.caption,
      audio: input.audio,
      place: input.place,
      likes: 0,
      shares: 0,
      liked: false,
      saved: false,
      reposted: false,
      story: input.story || undefined,
      audience: input.story ? input.audience ?? 'public' : undefined,
      storyDays: input.story ? Math.max(1, Math.min(input.storyDays ?? 1, perks.storyDays)) : undefined,
      overlays: input.overlays,
      soundSrc: input.soundSrc,
      poster: input.poster,
      filter: input.filter,
      commentsOff: input.commentsOff || undefined,
      private: input.isPrivate || undefined,
      createdAt: Date.now(),
    };
    setPosts((ps) => [post, ...ps]);
    return id;
  };

  const TRASH_MS = 30 * 24 * 60 * 60 * 1000;
  const deletePost = (id: string) => {
    const p = posts.find((x) => x.id === id);
    setPosts((ps) => ps.filter((x) => x.id !== id));
    const list = comments[id] ?? [];
    setComments((c) => {
      const { [id]: _removed, ...rest } = c;
      return rest;
    });
    if (p && !p.story) {
      setTrash((tr) => [{ post: p, comments: list, deletedAt: Date.now() }, ...tr.filter((x) => x.post.id !== id)]);
      toast(t('toast.postDeleted'));
    } else {
      if (p?.blobId) void idbDelete(p.blobId);
      toast(t('toast.postDeleted'));
    }
  };
  const restorePost = (id: string) => {
    const item = trash.find((x) => x.post.id === id);
    if (!item) return;
    setTrash((tr) => tr.filter((x) => x.post.id !== id));
    setPosts((ps) => [item.post, ...ps.filter((p) => p.id !== id)].sort((a, b) => b.createdAt - a.createdAt));
    setComments((c) => ({ ...c, [id]: item.comments }));
    toast(t('trash.restored'));
  };
  const purgeTrash = (id?: string) => {
    setPurgedLikes((n) => n + trash.filter((x) => (id ? x.post.id === id : true)).reduce((a, x) => a + x.post.likes, 0));
    setTrash((tr) => {
      tr.filter((x) => (id ? x.post.id === id : true)).forEach((x) => x.post.blobId && void idbDelete(x.post.blobId));
      return id ? tr.filter((x) => x.post.id !== id) : [];
    });
  };
  const setStoryAudience = (id: string, audience: 'public' | 'friends' | 'me') => {
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, audience } : p)));
    toast(audience === 'me' ? pick(settings.language, 'Only you can see this story', 'تەنها تۆ ئەم ستۆرییە دەبینیت', 'أنت فقط ترى هذه القصة') : t(audience === 'friends' ? 'story.nowFriends' : 'story.nowPublic'));
  };
  const togglePin = (id: string) => {
    const cur = posts.find((p) => p.id === id);
    if (!cur) return;
    if (!cur.pinned && posts.filter((p) => p.mine && p.pinned).length >= 3) {
      toast(pick(settings.language, 'You can pin up to 3 posts', 'دەتوانیت تا ٣ پۆست بچەسپێنیت', 'يمكنك تثبيت 3 منشورات كحد أقصى'));
      return;
    }
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, pinned: !cur.pinned } : p)));
    toast(cur.pinned ? pick(settings.language, 'Unpinned', 'چەسپاندن لابرا', 'تم إلغاء التثبيت') : pick(settings.language, 'Pinned to your profile', 'بۆ پڕۆفایلەکەت چەسپا', 'تم التثبيت في ملفك'));
  };
  const editCaption = (id: string, caption: string) => {
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, caption } : p)));
    toast(pick(settings.language, 'Caption updated', 'کاپشن نوێکرایەوە', 'تم تحديث الوصف'));
  };
  const [drafts, setDrafts] = usePersistentState<Draft[]>('drafts', []);
  const saveDraft = async (d: { id?: string; kind: MediaKind; src: string; blob?: Blob; caption: string; tags: string; sound: string }): Promise<void> => {
    const id = d.id ?? uid();
    const prev = drafts.find((x) => x.id === id);
    let blobId = prev?.blobId;
    if (d.kind === 'video' && d.blob) {
      blobId = `draft-${id}`;
      try {
        await idbPut(blobId, d.blob);
      } catch {
        toast(t('toast.notPersisted'));
      }
    }
    const item: Draft = { id, kind: d.kind, src: d.kind === 'image' ? d.src : '', blobId, caption: d.caption, tags: d.tags, sound: d.sound, at: Date.now() };
    setDrafts((l) => [item, ...l.filter((x) => x.id !== id)].slice(0, 20));
  };
  const deleteDraft = (id: string) => {
    const d = drafts.find((x) => x.id === id);
    if (d?.blobId) void idbDelete(d.blobId);
    setDrafts((l) => l.filter((x) => x.id !== id));
  };
  const loadDraft = async (id: string): Promise<{ draft: Draft; blob?: Blob } | null> => {
    const draft = drafts.find((x) => x.id === id);
    if (!draft) return null;
    const blob = draft.blobId ? await idbGet(draft.blobId) : undefined;
    return { draft, blob };
  };
  const togglePinComment = (postId: string, commentId: string) =>
    setComments((m) => ({ ...m, [postId]: (m[postId] ?? []).map((c) => (c.id === commentId ? { ...c, pinned: !c.pinned } : { ...c, pinned: false })) }));
  const [recent, setRecent] = usePersistentState<string[]>('recentSearches', []);
  const addRecent = (q: string) => {
    const v = q.trim();
    if (v.length < 2) return;
    setRecent((r) => [v, ...r.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, 8));
  };
  const clearRecent = () => setRecent([]);
  const togglePrivate = (id: string) => {
    const was = posts.find((p) => p.id === id)?.private ?? false;
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, private: !was } : p)));
    toast(t(was ? 'toast.madePublic' : 'toast.madePrivate'));
  };
  useEffect(() => {
    const expired = trash.filter((x) => Date.now() - x.deletedAt > TRASH_MS);
    if (expired.length === 0) return;
    setPurgedLikes((n) => n + expired.reduce((a, x) => a + x.post.likes, 0));
    expired.forEach((x) => x.post.blobId && void idbDelete(x.post.blobId));
    setTrash((tr) => tr.filter((x) => Date.now() - x.deletedAt <= TRASH_MS));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPostBlob = async (post: Post): Promise<Blob> => {
    if (post.blobId) {
      const b = await idbGet(post.blobId);
      if (b) return b;
      throw new Error('missing blob');
    }
    const res = await fetch(post.src);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
  };

  const saveMedia = (post: Post) =>
    requirePermission('storage', async () => {
      try {
        const blob = await getPostBlob(post);
        downloadBlob(blob, `kurdtok-${post.id.slice(0, 8)}.${extFromType(blob.type, post.kind === 'video' ? 'webm' : 'jpg')}`);
        toast(t('toast.mediaSaved'));
      } catch {
        if (/^https?:/.test(post.src)) window.open(post.src, '_blank', 'noopener');
        toast(t('toast.saveFailed'));
      }
    });

  const copyLink = async (post: Post) => {
    const ok = await copyText(postLink(post.id));
    toast(t(ok ? 'toast.linkCopied' : 'toast.error'));
    if (ok) bumpShare(post.id);
  };

  const nativeShare = async (post: Post) => {
    try {
      if (navigator.share) {
        await navigator.share({ title: DICT[settings.language]['app.name'], text: post.caption, url: postLink(post.id) });
        bumpShare(post.id);
      }
    } catch {
      /* user cancelled */
    }
  };

  /* ---- comments ---- */
  const commentCount = (postId: string): number =>
    (comments[postId] ?? []).reduce((n, c) => n + 1 + c.replies.length, 0);

  const addComment = (postId: string, text: string, parentId?: string) => {
    const body = text.trim();
    if (!body) return;
    if (!parentId) {
      const c: CommentT = { id: uid(), user: profile.username, mine: true, text: body, createdAt: Date.now(), likes: 0, liked: false, replies: [] };
      setComments((m) => ({ ...m, [postId]: [c, ...(m[postId] ?? [])] }));
    } else {
      const r: ReplyT = { id: uid(), user: profile.username, mine: true, text: body, createdAt: Date.now() };
      setComments((m) => ({
        ...m,
        [postId]: (m[postId] ?? []).map((c) => (c.id === parentId ? { ...c, replies: [...c.replies, r] } : c)),
      }));
    }
  };

  const toggleCommentLike = (postId: string, commentId: string) =>
    setComments((m) => ({
      ...m,
      [postId]: (m[postId] ?? []).map((c) =>
        c.id === commentId ? { ...c, liked: !c.liked, likes: Math.max(0, c.likes + (c.liked ? -1 : 1)) } : c,
      ),
    }));

  const deleteComment = (postId: string, commentId: string, replyId?: string) =>
    setComments((m) => ({
      ...m,
      [postId]: (m[postId] ?? [])
        .filter((c) => replyId || c.id !== commentId)
        .map((c) => (replyId && c.id === commentId ? { ...c, replies: c.replies.filter((r) => r.id !== replyId) } : c)),
    }));

  /* ---- chat ---- */
  const notifyIncoming = (chat: Chat, sender: string, text: string) => {
    const L = latest.current;
    if (!L.settings.notifications || !L.settings.notifyMessages || chat.muted) return;
    if (document.hidden) {
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(chat.isGroup ? `${chat.name} · ${sender}` : sender, { body: text });
        }
      } catch {
        /* ignore */
      }
    } else {
      toast(`${sender}: ${text}`);
    }
  };

  const scheduleReply = (chatId: string) => {
    const chat = latest.current.chats.find((c) => c.id === chatId);
    if (!chat) return;
    (replyTimers.current[chatId] ?? []).forEach((id) => window.clearTimeout(id));
    const sender = chat.isGroup && chat.members.length > 0 ? chat.members[Math.floor(Math.random() * chat.members.length)] : chat.name;
    const t1 = window.setTimeout(() => setTyping((s) => ({ ...s, [chatId]: sender })), 600 + Math.random() * 500);
    const t2 = window.setTimeout(() => {
      setTyping((s) => ({ ...s, [chatId]: null }));
      const L = latest.current;
      const current = L.chats.find((c) => c.id === chatId);
      if (!current) return;
      const key = REPLY_KEYS[Math.floor(Math.random() * REPLY_KEYS.length)];
      const text = L.t(key);
      const reply: Msg = { id: uid(), sender, text, kind: 'text', createdAt: Date.now() };
      setMessages((m) => ({ ...m, [chatId]: [...(m[chatId] ?? []), reply] }));
      const top = L.stack[L.stack.length - 1];
      const viewing = !!top && top.name === 'chat' && top.chatId === chatId && !document.hidden;
      if (!viewing) {
        setChats((cs) => cs.map((c) => (c.id === chatId ? { ...c, unread: c.unread + 1 } : c)));
        notifyIncoming(current, sender, text);
      }
    }, 1900 + Math.random() * 1500);
    replyTimers.current[chatId] = [t1, t2];
  };

  const sendMessage = (chatId: string, payload: { text?: string; src?: string }) => {
    const text = (payload.text ?? '').trim();
    if (!text && !payload.src) return;
    const msg: Msg = { id: uid(), sender: ME, text, kind: payload.src ? 'image' : 'text', src: payload.src, createdAt: Date.now() };
    setMessages((m) => ({ ...m, [chatId]: [...(m[chatId] ?? []), msg] }));
    scheduleReply(chatId);
  };

  const markRead = (chatId: string) =>
    setChats((cs) => (cs.some((c) => c.id === chatId && c.unread > 0) ? cs.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c)) : cs));

  const openDm = (username: string) => {
    const existing = chats.find((c) => c.peer === username);
    if (existing) {
      push({ name: 'chat', chatId: existing.id });
      return;
    }
    const a = authorByName(username);
    const chat: Chat = {
      id: `dm-${username}`,
      name: a?.name ?? username,
      peer: username,
      isGroup: false,
      emoji: a?.emoji ?? '👤',
      color: a?.color ?? hashColor(username),
      bio: a?.bio ?? '',
      members: [],
      unread: 0,
      muted: false,
      createdAt: Date.now(),
    };
    setChats((cs) => [chat, ...cs]);
    setMessages((m) => ({ ...m, [chat.id]: m[chat.id] ?? [] }));
    push({ name: 'chat', chatId: chat.id });
  };

  const createGroup = (name: string, members: string[], admin: string): string => {
    const id = `grp-${uid()}`;
    const chat: Chat = { id, name, isGroup: true, emoji: '👥', color: hashColor(name), bio: '', members, admin, unread: 0, muted: false, createdAt: Date.now() };
    setChats((cs) => [chat, ...cs]);
    setMessages((m) => ({ ...m, [id]: [{ id: uid(), sender: 'system', text: '', kind: 'system', sys: { type: 'created' }, createdAt: Date.now() }] }));
    return id;
  };

  const deleteChat = (chatId: string) => {
    (replyTimers.current[chatId] ?? []).forEach((id) => window.clearTimeout(id));
    setChats((cs) => cs.filter((c) => c.id !== chatId));
    setMessages((m) => {
      const { [chatId]: _gone, ...rest } = m;
      return rest;
    });
  };

  const clearChat = (chatId: string) => {
    (replyTimers.current[chatId] ?? []).forEach((id) => window.clearTimeout(id));
    setTyping((s) => ({ ...s, [chatId]: null }));
    setMessages((m) => ({ ...m, [chatId]: [] }));
  };

  const updateChat = (chatId: string, patch: Partial<Chat>) => setChats((cs) => cs.map((c) => (c.id === chatId ? { ...c, ...patch } : c)));
  const toggleMute = (chatId: string) =>
    setChats((cs) => cs.map((c) => (c.id === chatId ? { ...c, muted: !c.muted } : c)));

  const logCall = (chatId: string, media: 'audio' | 'video', seconds: number) => {
    if (!latest.current.chats.some((c) => c.id === chatId)) return;
    const msg: Msg = { id: uid(), sender: 'system', text: '', kind: 'system', sys: { type: 'call', media, seconds }, createdAt: Date.now() };
    setMessages((m) => ({ ...m, [chatId]: [...(m[chatId] ?? []), msg] }));
  };

  const startCall = (chatId: string, media: 'audio' | 'video') => {
    requirePermission('calls', () => {
      if (media === 'video') requirePermission('camera', () => push({ name: 'call', chatId, media }));
      else push({ name: 'call', chatId, media });
    });
  };

  const setNotifications = async (on: boolean) => {
    if (on && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        const r = await Notification.requestPermission();
        if (r === 'denied') toast(t('toast.notifDenied'));
      } catch {
        /* ignore */
      }
    } else if (on && typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      toast(t('toast.notifDenied'));
    }
    setSettings((s) => ({ ...s, notifications: on }));
  };

  /* ---- navigation helpers ---- */
  const openAuthor = (username: string, mine: boolean) => {
    if (mine) {
      resetNav();
      setTab('profile');
    } else {
      push({ name: 'user', username });
    }
  };

  const searchTag = (tag: string) => {
    resetNav();
    setShareFor(null);
    setQuery(tag);
    setDiscoverTab('trending');
    setTab('discover');
  };

  const blocked = settings.blocked;
  const isBlocked = (username: string): boolean => blocked.includes(username);
  const visiblePosts = posts.filter((p) => !p.story && (p.mine || !p.private) && !hidden.includes(p.id) && (p.mine || !blocked.includes(p.author)));
  const myStories = posts.filter((p) => p.mine && p.story && Date.now() - p.createdAt < DAY_MS * Math.min(p.storyDays ?? 1, perks.storyDays)).sort((a, b) => a.createdAt - b.createdAt);
  const otherStories = followed
    .filter((u) => u !== profile.username && !blocked.includes(u) && !mutedStories.includes(u))
    .map((u) => ({
      author: u,
      mine: false,
      items: posts
        .filter((p) => !p.mine && !p.story && p.author === u)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 2)
        .map((p) => ({ ...p, id: `story:${p.id}`, createdAt: Date.now() - 3 * 60 * 60 * 1000 })),
    }))
    .filter((g) => g.items.length > 0)
    .map((g) => ({ ...g, hasNew: g.items.some((i) => !viewedStories.includes(i.id)) }))
    .sort((a, b) => Number(b.hasNew) - Number(a.hasNew));
  const storyGroups = [
    { author: profile.username, mine: true, items: myStories, hasNew: false },
    ...otherStories,
  ];
  const totalLikes =
    posts.filter((p) => p.mine && !p.story).reduce((a, p) => a + p.likes, 0) + trash.reduce((a, x) => a + x.post.likes, 0) + purgedLikes;
  useEffect(() => {
    // demo: a few simulated visitors drop by once in a while (local only, no server yet)
    if (simDone.current) return;
    simDone.current = true;
    const last = visits[0]?.at ?? 0;
    if (Date.now() - last < 6 * 60 * 60 * 1000) return;
    const names = ['rawanduz_view', 'kurdish_girl', 'zheen.12', 'shingelbana_resort'];
    const list = names.map((u, i) => ({ user: u, at: Date.now() - (i * 37 + 4) * 60 * 1000 }));
    if (list.length) {
      setVisits((v) => [...list, ...v].slice(0, 60));
      setViewsTotal((n) => n + list.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const markStoryViewed = (id: string) => setViewedStories((l) => (l.includes(id) ? l : [...l, id]));

  const toggleSoundSave = (name: string) => {
    const was = savedSounds.includes(name);
    setSavedSounds((l) => (was ? l.filter((x) => x !== name) : [...l, name]));
    toast(t(was ? 'toast.soundRemoved' : 'toast.soundSaved'));
  };
  const hidePost = (id: string) => {
    setHidden((h) => (h.includes(id) ? h : [...h, id]));
    toast(t('post.notInterestedDone'));
  };
  const reportPost = (id: string) => {
    setHidden((h) => (h.includes(id) ? h : [...h, id]));
    toast(t('post.reported'));
  };

  const toggleBlock = (username: string) => {
    const was = blocked.includes(username);
    setSettings((s) => ({ ...s, blocked: was ? s.blocked.filter((u) => u !== username) : [...s.blocked, username] }));
    if (!was && followed.includes(username)) {
      setFollowed((f) => f.filter((u) => u !== username));
      setProfile((p) => ({ ...p, following: Math.max(0, p.following - 1) }));
    }
    toast(t(was ? 'toast.unblocked' : 'toast.blocked', { user: username }));
  };

  const clearAllChats = () => {
    Object.values(replyTimers.current).forEach((ids) => ids.forEach((id) => window.clearTimeout(id)));
    setTyping({});
    setMessages((m) => Object.fromEntries(Object.keys(m).map((k) => [k, [] as Msg[]])));
    setChats((cs) => cs.map((c) => ({ ...c, unread: 0 })));
    toast(t('toast.chatsCleared'));
  };

  const clearAi = () => {
    setAiHistory([]);
    toast(t('toast.aiCleared'));
  };

  const unreadTotal = chats.reduce((n, c) => n + (c.muted ? 0 : c.unread), 0);

  return {
    t, settings, setSettings, langMeta, theme,
    account, loggedIn, register, socialLogin, findAccount, resetPassword, updateAccount, login, demoLogin, logout, resetAll,
    profile, updateProfile, authorOf,
    updateChat, setStoryAudience, totalLikes, visits, viewsTotal, postViews, bumpView, checkPassword, setTfa, mutedStories, toggleMuteStory, notifSeen, setNotifSeen,
    plan, isOwner, planActive, perks, isVerified, subscribe, cancelPlan, ads, addAd, cancelAd,
    posts, setPosts, comments, followed, chats, messages, aiHistory, setAiHistory,
    tab, setTab, feedTab, setFeedTab, discoverTab, setDiscoverTab, query, setQuery,
    feedMuted, setFeedMuted, shareFor, setShareFor, clearDisplay, setClearDisplay, speed, setSpeed,
    permModal, setPermModal, requirePermission, setPermission,
    confirmState, setConfirmState, askConfirm,
    toastMsg, toast, typing, unreadTotal,
    stack, push, pop, replace, resetNav,
    likePost, toggleLike, toggleSave, toggleRepost, bumpShare, toggleFollow, togglePin, editCaption, recent, addRecent, clearRecent, drafts, saveDraft, deleteDraft, loadDraft, togglePinComment,
    publishPost, deletePost, saveMedia, copyLink, nativeShare,
    commentCount, addComment, toggleCommentLike, deleteComment,
    sendMessage, markRead, openDm, createGroup, deleteChat, clearChat, toggleMute, logCall, startCall,
    setNotifications, openAuthor, searchTag,
    changePassword, confirmTotp, disableTotp, blocked, isBlocked, visiblePosts, hidePost, reportPost, savedSounds, toggleSoundSave, trash, restorePost, purgeTrash, togglePrivate, followersOf, relationOf, storyGroups, markStoryViewed, viewedStories, toggleBlock, clearAllChats, clearAi,
  };
}

export type AppCtx = ReturnType<typeof useAppState>;
export const AppContext = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
