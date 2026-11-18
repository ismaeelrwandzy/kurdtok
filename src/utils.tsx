/* KurdTok — utils.tsx */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ICON_IMGS1 } from './icons1';
import { ICON_IMGS2 } from './icons2';
/**
 * KurdTok — single-file App.tsx
 *
 * Works in a plain Vite + React + TypeScript project (no extra packages).
 * Everything is stored on the device (localStorage / IndexedDB). There is no
 * server: other people's replies, calls and follower counts are simulated.
 * The only real network call is the optional Gemini AI assistant.
 */

/* ============================================================================
 * Types
 * ========================================================================== */

export type Lang = 'ckb' | 'ar' | 'en';
export type ThemeMode = 'dark' | 'light' | 'system';
export type PermKey = 'camera' | 'photos' | 'storage' | 'location' | 'calls' | 'contacts';
export type Tab = 'home' | 'discover' | 'inbox' | 'profile';
export type MediaKind = 'image' | 'video';

export interface Settings {
  language: Lang;
  theme: ThemeMode;
  notifications: boolean;
  autoScroll: boolean;
  permissions: Record<PermKey, boolean>;
  geminiKey: string;
  geminiModel: string;
  textSize: 'sm' | 'md' | 'lg';
  reduceMotion: boolean;
  autoplay: boolean;
  autoScrollSeconds: number;
  notifyMessages: boolean;
  notifyLikes: boolean;
  notifyComments: boolean;
  notifyVisits: boolean;
  listsPublic: boolean;
  blocked: string[];
  privateAccount: boolean;
  allowComments: 'all' | 'friends' | 'off';
  allowDM: 'all' | 'friends' | 'off';
  allowDownloads: boolean;
  showFollowing: 'all' | 'friends' | 'me';
  showLiked: 'all' | 'friends' | 'me';
  showViewers: boolean;
  personalAds: boolean;
  visReposts: 'all' | 'friends' | 'me';
  visSaved: 'all' | 'friends' | 'me';
  accent: string;
  appIcon: string;
}

export interface Plan {
  id: 'standard' | 'pro' | 'yearly';
  start: number;
  end: number;
}

export interface AdReq {
  id: string;
  kind: 'post' | 'account' | 'link';
  title: string;
  postId?: string;
  link?: string;
  audience: string;
  days: number;
  createdAt: number;
  status: 'pending' | 'cancelled';
}

export interface Account {
  name: string;
  username: string;
  salt: string;
  hash: string;
  email?: string;
  phone?: string;
  birth?: string;
  provider?: 'password' | 'google' | 'facebook' | 'apple' | 'phone';
  verified?: boolean;
  createdAt?: number;
  linked?: string[];
  gender?: 'male' | 'female' | 'none';
  accountType?: 'personal' | 'creator' | 'business';
  totpSecret?: string;
  totpOn?: boolean;
  tfa?: 'email' | 'phone';
}

export interface Profile {
  name: string;
  username: string;
  bio: string;
  location: string;
  website: string;
  avatar: string | null;
  cover: string | null;
  followers: number;
  following: number;
}

export interface AuthorInfo {
  username: string;
  name: string;
  emoji: string;
  color: string;
  bio: string;
  followers: number;
  following: number;
  verified: boolean;
}

export interface StoryItem {
  id: string;
  type: 'text' | 'emoji';
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
}
export interface StoryStroke {
  color: string;
  width: number;
  pts: [number, number][];
}
export interface StoryOverlays {
  items: StoryItem[];
  strokes: StoryStroke[];
}
export interface Draft {
  id: string;
  kind: MediaKind;
  src: string;
  blobId?: string;
  caption: string;
  tags: string;
  sound: string;
  at: number;
}

export interface TrashItem {
  post: Post;
  comments: CommentT[];
  deletedAt: number;
}

export interface Post {
  id: string;
  author: string;
  mine: boolean;
  seed?: boolean;
  kind: MediaKind;
  src: string;
  blobId?: string;
  caption: string;
  audio: string;
  place?: string;
  likes: number;
  shares: number;
  saves?: number;
  reposts?: number;
  story?: boolean;
  private?: boolean;
  pinned?: boolean;
  audience?: 'public' | 'friends' | 'me';
  storyDays?: number;
  poster?: string;
  filter?: string;
  commentsOff?: boolean;
  tagged?: string[];
  soundSrc?: string;
  overlays?: StoryOverlays;
  liked: boolean;
  saved: boolean;
  reposted: boolean;
  createdAt: number;
}

export interface ReplyT {
  id: string;
  user: string;
  mine: boolean;
  text: string;
  createdAt: number;
}

export interface CommentT {
  id: string;
  user: string;
  mine: boolean;
  text: string;
  createdAt: number;
  likes: number;
  liked: boolean;
  pinned?: boolean;
  replies: ReplyT[];
}

export interface Chat {
  id: string;
  name: string;
  peer?: string;
  isGroup: boolean;
  emoji: string;
  color: string;
  bio: string;
  members: string[];
  admin?: string;
  unread: number;
  muted: boolean;
  pinned?: boolean;
  muteCalls?: boolean;
  starred?: boolean;
  wallpaper?: string;
  createdAt: number;
}

export type SysInfo =
  | { type: 'created' }
  | { type: 'call'; media: 'audio' | 'video'; seconds: number };

export interface Msg {
  id: string;
  sender: string; // 'me' or a display name
  text: string;
  kind: 'text' | 'image' | 'system';
  src?: string;
  sys?: SysInfo;
  createdAt: number;
}

export interface AiMsg {
  role: 'user' | 'assistant';
  text: string;
}

export type Route =
  | { name: 'camera'; sound?: string; soundSrc?: string; story?: boolean; draftId?: string }
  | { name: 'story'; author: string }
  | { name: 'sound'; audio: string; postId?: string }
  | { name: 'comments'; postId: string }
  | { name: 'chat'; chatId: string }
  | { name: 'call'; chatId: string; media: 'audio' | 'video' }
  | { name: 'editProfile' }
  | { name: 'settings'; panel?: 'verify' | 'ads' }
  | { name: 'chatinfo'; chatId: string }
  | { name: 'newGroup' }
  | { name: 'notifications' }
  | { name: 'follows'; tab: 'following' | 'followers' }
  | { name: 'user'; username: string }
  | { name: 'viewer'; ids: string[]; index: number };

export type RouteEntry = Route & { key: string };

export interface ConfirmState {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}

export interface Captured {
  kind: MediaKind;
  url: string;
  blob?: Blob;
}

/* ============================================================================
 * Constants
 * ========================================================================== */

export const APP_VERSION = '1.0.0';
export const STORE_PREFIX = 'kurdtok:v1:';
export const ME = 'me';
export const DEMO_EMOJI = '🧔🏻‍♂️';
export const FEED_AUTO_MS = 5500;
export const PERM_KEYS: PermKey[] = ['camera', 'photos', 'storage', 'location', 'calls', 'contacts'];
export const ORIGINAL_SOUND = 'KurdTok Original';
export const originalTitle = (name: string): string => `Original sound - ${name}`;
export const SOUNDS = [
  'KurdTok Original',
  'Rêbîn - Dîrok',
  'Kurdish Pop Mix',
  'Instrumental Acoustic',
  'Mountain Echo',
  'Design LoFi',
  'Kurdish Folk',
];
export const EMOJIS = ['😀', '😂', '😍', '🥰', '😎', '🔥', '👍', '🙏', '❤️', '🎉', '😢', '🤝'];
export const REPLY_KEYS = [
  'bot.r1',
  'bot.r2',
  'bot.r3',
  'bot.r4',
  'bot.r5',
  'bot.r6',
  'bot.r7',
  'bot.r8',
] as const;

export const LANGS: { code: Lang; label: string; dir: 'rtl' | 'ltr'; locale: string }[] = [
  { code: 'ckb', label: 'کوردی', dir: 'rtl', locale: 'ckb' },
  { code: 'ar', label: 'العربية', dir: 'rtl', locale: 'ar' },
  { code: 'en', label: 'English', dir: 'ltr', locale: 'en' },
];

export const DEFAULT_SETTINGS: Settings = {
  language: 'ckb',
  theme: 'dark',
  notifications: true,
  autoScroll: false,
  permissions: {
    camera: false,
    photos: false,
    storage: false,
    location: false,
    calls: false,
    contacts: false,
  },
  geminiKey: '',
  geminiModel: 'gemini-2.5-flash',
  textSize: 'md',
  reduceMotion: false,
  autoplay: true,
  autoScrollSeconds: 5,
  notifyMessages: true,
  notifyLikes: true,
  notifyComments: true,
  notifyVisits: true,
  listsPublic: true,
  blocked: [],
  privateAccount: false,
  allowComments: 'all',
  allowDM: 'all',
  allowDownloads: true,
  showFollowing: 'me',
  showLiked: 'me',
  showViewers: true,
  personalAds: true,
  visReposts: 'all',
  visSaved: 'me',
  accent: 'violet',
  appIcon: 'default',
};

export const DEFAULT_PROFILE: Profile = {
  name: 'Ismael Mirkhan',
  username: 'ismael_mirkhan',
  bio: 'Dream bigger • Work harder • Kurdistan ☀️',
  location: 'Rawanduz 🏔️',
  website: 'https://github.com/ismaelmirkhan',
  avatar: null,
  cover: null,
  followers: 1200,
  following: 318,
};

/* ============================================================================
 * Utilities
 * ========================================================================== */

export const uid = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

export function readStore<T>(key: string): T | undefined {
  try {
    const raw = window.localStorage.getItem(STORE_PREFIX + key);
    if (raw === null) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/** useState that survives reloads. Never throws (private mode, quota, bad JSON). */
export function usePersistentState<T>(
  key: string,
  initial: T | (() => T),
  revive?: (raw: unknown) => T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    const stored = readStore<unknown>(key);
    if (stored !== undefined && stored !== null) {
      try {
        return revive ? revive(stored) : (stored as T);
      } catch {
        /* fall back to initial */
      }
    }
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(STORE_PREFIX + key, JSON.stringify(state));
    } catch {
      window.dispatchEvent(new Event('kt-quota'));
    }
  }, [key, state]);
  return [state, setState];
}

export function reviveSettings(raw: unknown): Settings {
  const r = (raw ?? {}) as Partial<Settings>;
  return {
    ...DEFAULT_SETTINGS,
    ...r,
    permissions: { ...DEFAULT_SETTINGS.permissions, ...(r.permissions ?? {}) },
  };
}

export function trimNum(x: number): string {
  return (x >= 10 ? Math.round(x) : Math.round(x * 10) / 10).toString();
}

export function formatCount(n: number): string {
  const v = Math.max(0, Math.round(n));
  if (v >= 999500) return trimNum(v / 1e6) + 'M';
  if (v >= 1000) return trimNum(v / 1e3) + 'K';
  return String(v);
}

export function hashColor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 65% 50%)`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = Array.from(parts[0])[0] ?? '?';
  const second = parts.length > 1 ? (Array.from(parts[1])[0] ?? '') : '';
  return (first + second).toUpperCase();
}

export const TAG_RE = /#[\p{L}\p{N}_]+/gu;
export function extractTags(s: string): string[] {
  return (s.match(TAG_RE) ?? []).map((x) => x.toLowerCase());
}

export function normalizeUrl(u: string): string {
  const s = u.trim();
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

export function isValidUsername(u: string): boolean {
  return /^[a-z0-9](?:[a-z0-9._]{1,18})[a-z0-9]$/.test(u) && !/[._]{2}/.test(u);
}

export function cleanUsernameInput(raw: string): { value: string; changed: boolean } {
  const value = raw.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 20);
  return { value, changed: /[^a-z0-9._]/.test(raw) };
}

export function usernameRule(lang: Lang): string {
  return lang === 'ckb'
    ? 'ناوی بەکارهێنەر: ٣ بۆ ٢٠ نیشانە، تەنها پیتی ئینگلیزی بچووک (a-z)، ژمارە، خاڵ (.) یان ئەندەرسکۆر (_). پیتی گەورە و هێمای تر نابێت، و نابێت بە خاڵ/ئەندەرسکۆر دەستپێبکات یان کۆتایی بێت.'
    : lang === 'ar'
      ? 'اسم المستخدم: من 3 إلى 20 خانة، أحرف إنجليزية صغيرة (a-z) وأرقام ونقطة (.) أو شرطة سفلية (_) فقط. بدون أحرف كبيرة أو رموز أخرى، ولا يبدأ أو ينتهي بنقطة/شرطة.'
      : 'Username: 3–20 characters, lowercase letters (a-z), numbers, dot (.) or underscore (_) only. No capital letters or other symbols, and it cannot start or end with . or _';
}

export const fmtCache = new Map<string, Intl.DateTimeFormat>();
export function dateFormatter(locale: string, opts: Intl.DateTimeFormatOptions, id: string): Intl.DateTimeFormat {
  const k = `${locale}|${id}`;
  const hit = fmtCache.get(k);
  if (hit) return hit;
  let f: Intl.DateTimeFormat;
  try {
    f = new Intl.DateTimeFormat(locale, opts);
  } catch {
    f = new Intl.DateTimeFormat('en', opts);
  }
  fmtCache.set(k, f);
  return f;
}
export const fmtClock = (ts: number, locale: string): string =>
  dateFormatter(locale, { hour: '2-digit', minute: '2-digit' }, 'clock').format(ts);
export const fmtDay = (ts: number, locale: string): string =>
  dateFormatter(locale, { day: 'numeric', month: 'short', year: 'numeric' }, 'day').format(ts);

export function sameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function fmtDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image'));
    img.src = url;
  });
}

/** Downscale an image file to a JPEG data URL so it fits in localStorage. */
export async function resizeImage(blob: Blob, max: number, quality = 0.85): Promise<string> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const longest = Math.max(img.naturalWidth, img.naturalHeight) || 1;
    const scale = Math.min(1, max / longest);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function sha256Hex(text: string): Promise<string> {
  try {
    if (window.crypto?.subtle) {
      const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    /* fall through */
  }
  // Non-cryptographic fallback for very old / insecure contexts.
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `f${(h >>> 0).toString(16)}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function extFromType(type: string, fallback: string): string {
  if (type.includes('png')) return 'png';
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
  if (type.includes('webp')) return 'webp';
  if (type.includes('webm')) return 'webm';
  if (type.includes('mp4')) return 'mp4';
  return fallback;
}

/* ---------- IndexedDB blob store (for videos) ---------------------------- */

export const IDB_NAME = 'kurdtok-media';
export const IDB_STORE = 'blobs';
export const blobCache = new Map<string, Blob>();

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('no-idb'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbPut(key: string, blob: Blob): Promise<void> {
  blobCache.set(key, blob); // always usable for this session
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(blob, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function idbGet(key: string): Promise<Blob | undefined> {
  const cached = blobCache.get(key);
  if (cached) return cached;
  try {
    const db = await openDb();
    return await new Promise<Blob | undefined>((resolve, reject) => {
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
      req.onsuccess = () => {
        db.close();
        const v = req.result as Blob | undefined;
        if (v) blobCache.set(key, v);
        resolve(v);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return undefined;
  }
}

export async function idbDelete(key: string): Promise<void> {
  blobCache.delete(key);
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    /* ignore */
  }
}

export async function idbClear(): Promise<void> {
  blobCache.clear();
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    /* ignore */
  }
}


/* ============================================================================
 * Seed (demo) data
 * ========================================================================== */

export const AUTHORS: AuthorInfo[] = [
  { username: 'shingelbana_resort', name: 'Shingelbana Resort', emoji: '⛰️', color: '#ec4899', bio: 'Mountain resort in Rawanduz 🏔️ Sunsets, food & fresh air.', followers: 48200, following: 12, verified: true },
  { username: 'rawanduz_view', name: 'Rawanduz View', emoji: '🌄', color: '#0ea5e9', bio: 'Daily views from Rawanduz & Kurdistan nature 🌲', followers: 15300, following: 40, verified: true },
  { username: 'sherakay_bazyan', name: 'Sherakay Bazyan', emoji: '🎭', color: '#f59e0b', bio: 'Kurdish comedy sketches 😂', followers: 92100, following: 8, verified: true },
  { username: 'soran_92', name: 'Soran_92', emoji: '💻', color: '#22c55e', bio: 'Developer & Tech enthusiast 💻', followers: 1500, following: 210, verified: false },
  { username: 'kurdish_girl', name: 'Kurdish Girl', emoji: '✨', color: '#a855f7', bio: 'Enjoying life and positive vibes ✨', followers: 840, following: 302, verified: false },
  { username: 'zheen.12', name: 'Zheen', emoji: '🎸', color: '#ef4444', bio: 'Guitar covers & folk music 🎶', followers: 6400, following: 120, verified: false },
  { username: 'ahmad_kurd', name: 'Ahmad', emoji: '📸', color: '#14b8a6', bio: 'Photography around Kurdistan 📸', followers: 2300, following: 180, verified: false },
];

export const authorByName = (username: string): AuthorInfo | undefined =>
  AUTHORS.find((a) => a.username === username.toLowerCase());

export const isVerifiedUser = (username: string): boolean => authorByName(username)?.verified ?? false;

export const pick = (lang: Lang, en: string, ckb: string, ar: string): string => (lang === 'ckb' ? ckb : lang === 'ar' ? ar : en);

export const RESERVED_USERNAMES = new Set([...AUTHORS.map((a) => a.username), 'ismael_mirkhan', 'ismael.mirkhan', 'admin', 'administrator', 'kurdtok', 'kurdtok_official', 'official', 'support', 'help', 'moderator', 'staff']);

export const unsplash = (id: string): string =>
  `https://images.unsplash.com/photo-${id}?w=900&auto=format&fit=crop&q=70`;

export function makeSeedPosts(): Post[] {
  const now = Date.now();
  const H = 3600_000;
  const base = { shares: 0, saved: false, reposted: false, liked: false, kind: 'image' as MediaKind, src: '', createdAt: now };
  const mk = (p: Partial<Post> & Pick<Post, 'id' | 'author' | 'mine' | 'caption' | 'audio' | 'likes'>): Post => ({
    ...base,
    seed: true,
    ...p,
  });
  return [
    mk({ id: 'p1', author: 'ismael_mirkhan', mine: true, src: unsplash('1517841905240-472988babdf9'), caption: 'Some places just hit different... 💙 #kurdistan', audio: 'Rêbîn - Dîrok', place: 'Rawanduz 🏔️', likes: 12400, shares: 640, createdAt: now - 1 * H }),
    mk({ id: 'p4', author: 'shingelbana_resort', mine: false, src: unsplash('1519817650390-64a93db51149'), caption: 'Sunset View at Shingelbana Resort 🔥🏔️ #rawanduz #sunset', audio: 'Shingelbana Live', place: 'Rawanduz 🌲', likes: 24200, shares: 3620, liked: true, createdAt: now - 2 * H }),
    mk({ id: 'p2', author: 'ismael_mirkhan', mine: true, src: unsplash('1534528741775-53994a69daeb'), caption: 'Studio vibes and great lighting ✨ #studio', audio: 'Kurdish Pop Mix', likes: 8700, shares: 210, createdAt: now - 5 * H }),
    mk({ id: 'p5', author: 'sherakay_bazyan', mine: false, src: unsplash('1522071820081-009f0129c71c'), caption: 'Kurdish Comedy Sketch 😂 #comedy #kurdistan', audio: 'Bazyan Comedy', likes: 9100, shares: 880, liked: true, createdAt: now - 7 * H }),
    mk({ id: 'p3', author: 'ismael_mirkhan', mine: true, src: unsplash('1540420773420-3366772f4999'), caption: 'Healthy lifestyle in Rawanduz 🥗☀️ #rawanduz', audio: 'Instrumental Acoustic', likes: 15100, shares: 1240, createdAt: now - 10 * H }),
    mk({ id: 'p6', author: 'rawanduz_view', mine: false, src: unsplash('1464822759023-fed622ff2c3b'), caption: 'Kurdish Nature & Mountains 🏔️ #nature #kurdistan', audio: 'Mountain Echo', likes: 5200, shares: 300, reposted: true, createdAt: now - 14 * H }),
    mk({ id: 'p7', author: 'soran_92', mine: false, src: unsplash('1507525428034-b723cf961d3e'), caption: 'UI/UX Design Inspiration Reel #design #uiux', audio: 'Design LoFi', likes: 21400, shares: 1900, saved: true, createdAt: now - 20 * H }),
    mk({ id: 'p8', author: 'zheen.12', mine: false, src: unsplash('1511671782779-c97d3d27a1d4'), caption: 'Acoustic Guitar Cover 🎸 #music #folk', audio: 'Kurdish Folk', likes: 18900, shares: 1500, saved: true, createdAt: now - 30 * H }),
  ];
}

export function makeSeedComments(): Record<string, CommentT[]> {
  const now = Date.now();
  const M = 60_000;
  return {
    p1: [
      {
        id: 'c1', user: 'Ahmad_kurd', mine: false, text: 'Gorgeous view! 💚💛❤️', createdAt: now - 120 * M, likes: 14, liked: false,
        replies: [{ id: 'r1', user: 'ismael_mirkhan', mine: true, text: 'Spas kak Ahmad! 💙', createdAt: now - 100 * M }],
      },
      { id: 'c2', user: 'Zheen.12', mine: false, text: 'Rawanduz is amazing 🔥', createdAt: now - 180 * M, likes: 9, liked: false, replies: [] },
    ],
    p4: [
      { id: 'c3', user: 'Soran_92', mine: false, text: 'Best sunset in Kurdistan 😍', createdAt: now - 60 * M, likes: 31, liked: false, replies: [] },
      { id: 'c4', user: 'kurdish_girl', mine: false, text: 'We are going this weekend ✨', createdAt: now - 45 * M, likes: 6, liked: false, replies: [] },
    ],
    p5: [{ id: 'c5', user: 'Ahmad_kurd', mine: false, text: '😂😂😂', createdAt: now - 300 * M, likes: 3, liked: false, replies: [] }],
  };
}

export function makeSeedChats(): Chat[] {
  const now = Date.now();
  return [
    { id: 'chat-kurdish-girl', name: 'Kurdish Girl', peer: 'kurdish_girl', isGroup: false, emoji: '✨', color: '#a855f7', bio: 'Enjoying life and positive vibes ✨', members: [], unread: 2, muted: false, createdAt: now },
    { id: 'chat-soran', name: 'Soran_92', peer: 'soran_92', isGroup: false, emoji: '💻', color: '#22c55e', bio: 'Developer & Tech enthusiast 💻', members: [], unread: 0, muted: false, createdAt: now },
    { id: 'chat-rawanduz-group', name: 'Rawanduz Group', isGroup: true, emoji: '🏔️', color: '#0ea5e9', bio: 'Official community group in Rawanduz 🏔️', members: ['Kurdish Girl', 'Soran_92', 'Zheen', 'Ahmad'], admin: 'Ahmad', unread: 5, muted: false, createdAt: now },
  ];
}

export function makeSeedMessages(): Record<string, Msg[]> {
  const now = Date.now();
  const M = 60_000;
  const text = (id: string, sender: string, body: string, ago: number): Msg => ({ id, sender, text: body, kind: 'text', createdAt: now - ago * M });
  return {
    'chat-kurdish-girl': [
      text('m1', 'Kurdish Girl', 'Hey! How are you? 😊', 200),
      text('m2', ME, "I'm good, thanks! What about you?", 195),
      text('m3', 'Kurdish Girl', 'See you tomorrow! ❤️', 2),
    ],
    'chat-soran': [
      text('m4', 'Soran_92', 'Bro did you finish the video?', 1500),
      text('m5', ME, 'Alright bro 👍', 14),
    ],
    'chat-rawanduz-group': [
      text('m6', 'Ahmad', 'Welcome everyone to the group 🎉', 400),
      text('m7', 'Zheen', 'Kak Ismael, check this out!', 70),
    ],
  };
}

/** Contacts available when creating a group. */
export const CONTACT_NAMES = ['Kurdish Girl', 'Soran_92', 'Zheen', 'Ahmad', 'Sherakay Bazyan', 'Rawanduz View', 'Shingelbana Resort'];

/* ============================================================================
 * Icons
 * ========================================================================== */

export const ICONS: Record<string, ReactNode> = {
  home: (<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>),
  search: (<><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>),
  plus: (<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>),
  message: (<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />),
  user: (<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  users: (<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
  heart: (<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />),
  send: (<><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>),
  bookmark: (<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />),
  repeat: (<><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>),
  share: (<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></>),
  link: (<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>),
  download: (<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>),
  settings: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></>),
  x: (<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>),
  back: (<><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>),
  camera: (<><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>),
  image: (<><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>),
  pin: (<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>),
  phone: (<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />),
  video: (<><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></>),
  videoOff: (<><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" /><line x1="1" y1="1" x2="23" y2="23" /></>),
  mic: (<><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></>),
  micOff: (<><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></>),
  volume: (<><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></>),
  volumeOff: (<><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></>),
  refresh: (<><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></>),
  shield: (<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />),
  flag: (<path d="M4 22V4m0 0h13l-2 4 2 4H4" />),
  at: (<><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" /></>),
  hash: (<><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></>),
  calendar: (<><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></>),
  clock: (<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>),
  mail: (<><rect x="2" y="4" width="20" height="16" rx="3" /><path d="M22 7l-10 7L2 7" /></>),
  check: (<polyline points="20 6 9 17 4 12" />),
  trash: (<><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>),
  more: (<><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></>),
  lock: (<><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>),
  bell: (<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>),
  moon: (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />),
  globe: (<><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>),
  play: (<polygon points="5 3 19 12 5 21 5 3" />),
  pause: (<><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>),
  chevron: (<polyline points="9 18 15 12 9 6" />),
  logout: (<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>),
  smile: (<><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></>),
  music: (<><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>),
  sparkles: (<><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></>),
  eye: (<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>),
  eyeOff: (<><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>),
  edit: (<><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></>),
  info: (<><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>),
  key: (<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />),
  zap: (<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />),
  zapOff: (<><polyline points="12.41 6.75 13 2 10.57 4.92" /><polyline points="18.57 12.91 21 10 15.66 10" /><polyline points="8 8 3 14 12 14 11 22 16 16" /><line x1="1" y1="1" x2="23" y2="23" /></>),
  timer: (<><circle cx="12" cy="13" r="8" /><polyline points="12 9 12 13 14 15" /><line x1="9" y1="2" x2="15" y2="2" /></>),
  radio: (<><circle cx="12" cy="12" r="2" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" /></>),
  zoom: (<><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /><line x1="11" y1="8" x2="11" y2="14" /></>),
  type: (<><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></>),
  pen: (<><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /></>),
  undo: (<><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></>),
  grid: (<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>),
};

export function Icon({ name, size = 22, fill = 'none', className, strokeWidth = 2 }: { name: string; size?: number; fill?: string; className?: string; strokeWidth?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name] ?? null}
    </svg>
  );
}

export type StoryAudience = 'public' | 'friends' | 'me';
export function AudienceMark({ a, size = 15 }: { a?: string; size?: number }) {
  if (a === 'friends') return <span className="audmark" role="img" aria-label="Friends" style={{ fontSize: size }}>👥</span>;
  if (a === 'me') return <span className="audmark" role="img" aria-label="Only me"><Icon name="lock" size={size} /></span>;
  return <span className="audmark" role="img" aria-label="Public"><Icon name="globe" size={size} /></span>;
}
export const audienceLabel = (lang: Lang, a?: string): string => (a === 'friends' ? pick(lang, 'Friends only', 'تەنها هاوڕێکان', 'الأصدقاء فقط') : a === 'me' ? pick(lang, 'Only me', 'تەنها من', 'أنا فقط') : pick(lang, 'Public', 'گشتی', 'عام'));
export const STORY_DAY_OPTIONS = [1, 2, 3, 7] as const;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const leftLabel = (lang: Lang, ms: number): string => {
  const h = Math.max(0, Math.ceil(ms / 3600000));
  const txt = h >= 48 ? `${Math.ceil(h / 24)}${pick(lang, 'd', ' ڕۆژ', ' يوم')}` : `${h}${pick(lang, 'h', ' کاتژمێر', ' س')}`;
  return pick(lang, `${txt} left`, `${txt} ماوە`, `متبقي ${txt}`);
};
export const nextAudience = (a: string): StoryAudience => (a === 'public' ? 'friends' : a === 'friends' ? 'me' : 'public');

export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <svg className="verified" width={size} height={size} viewBox="0 0 24 24" fill="none" role="img" aria-label="Verified">
      <path d="M12 2L14.5 4.5L18 4L19 7.5L22 9.5L20.5 13L22 16.5L19 18.5L18 22L14.5 21.5L12 24L9.5 21.5L6 22L5 18.5L2 16.5L3.5 13L2 9.5L5 7.5L6 4L9.5 4.5L12 2Z" fill="#3b82f6" stroke="#60a5fa" strokeWidth="0.5" />
      <path d="M9 12L11 14L15 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- Two-factor authentication (TOTP, RFC 6238) ------------------ */

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function randomSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  let bits = '';
  bytes.forEach((b) => {
    bits += b.toString(2).padStart(8, '0');
  });
  let out = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function b32decode(s: string): Uint8Array<ArrayBuffer> {
  let bits = '';
  for (const c of s.replace(/=+$/, '').toUpperCase()) {
    const v = B32.indexOf(c);
    if (v >= 0) bits += v.toString(2).padStart(5, '0');
  }
  const out = new Uint8Array(new ArrayBuffer(Math.floor(bits.length / 8)));
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return out;
}

async function hotp(secret: string, counter: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', b32decode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));
  const off = mac[19] & 15;
  const num = ((mac[off] & 0x7f) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3];
  return String(num % 1000000).padStart(6, '0');
}

export async function verifyTotp(secret: string, code: string): Promise<boolean> {
  const c = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(c)) return false;
  try {
    const step = Math.floor(Date.now() / 30000);
    for (const d of [-1, 0, 1]) {
      if ((await hotp(secret, step + d)) === c) return true;
    }
  } catch {
    /* crypto.subtle unavailable */
  }
  return false;
}

export function totpUri(secret: string, user: string): string {
  return `otpauth://totp/KurdTok:${encodeURIComponent(user)}?secret=${secret}&issuer=KurdTok`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/* ---- verification plans, accents, app icons ---- */
export const PLAN_DEFS: Record<Plan['id'], { price: number; days: number; storyDays: number; theme: boolean; icon: boolean; aiUnlimited: boolean }> = {
  standard: { price: 10000, days: 30, storyDays: 1, theme: false, icon: false, aiUnlimited: false },
  pro: { price: 15000, days: 30, storyDays: 2, theme: true, icon: true, aiUnlimited: false },
  yearly: { price: 55000, days: 365, storyDays: 7, theme: true, icon: true, aiUnlimited: true },
};

export interface AppTheme { id: string; a: string; b: string; bg: string; vars: Record<string, string> }
const mk = (id: string, bg: string, card: string, card2: string, border: string, sub: string, a: string, b: string, text = '#ffffff', grad?: string): AppTheme => ({
  id, a, b, bg,
  vars: {
    '--bg': bg, '--card': card, '--card2': card2, '--border': border, '--sub': sub, '--text': text,
    '--accent': a, '--accent2': b, '--focus': a, '--bubble-in': card2,
    '--grad': grad ?? `linear-gradient(135deg,${a},${b})`,
    '--nav': card + 'f0',
  },
});
export const THEMES: AppTheme[] = [
  mk('violet', '#0a0c0b', '#131715', '#1b211e', '#262e2a', '#9aa79f', '#e63b2e', '#f7a81b'),
  mk('royal', '#0a0806', '#17120b', '#211a0f', '#3a2d14', '#b8a67a', '#d4af37', '#f5d77a', '#fff8e7'),
  mk('aurora', '#04100f', '#0a1f1e', '#0f2c2a', '#14403c', '#7fb5ae', '#2dd4bf', '#a78bfa'),
  mk('sapphire', '#050a1a', '#0b1430', '#111d44', '#1b2c63', '#8fa3d6', '#3b82f6', '#22d3ee'),
  mk('rose', '#12060b', '#220c15', '#30111e', '#4a1a2e', '#d29ab0', '#f43f5e', '#f9a8d4'),
  mk('emerald', '#03110a', '#0a2015', '#0f2e1e', '#17432d', '#86c7a3', '#10b981', '#facc15'),
  mk('kurdistan', '#080a08', '#101510', '#171e17', '#273327', '#9db39d', '#ef4444', '#22c55e', '#ffffff', 'linear-gradient(135deg,#ef4444,#facc15 50%,#22c55e)'),
  mk('pearl', '#fbf7f4', '#ffffff', '#f4ece7', '#eadbd2', '#8b7468', '#c2410c', '#be185d', '#2b1b14'),
];
export const ACCENTS = THEMES;

export const ICON_IMGS: Record<string, string> = { ...ICON_IMGS1, ...ICON_IMGS2 };

export const APP_ICONS: { id: string; a: string; b: string; glyph: string }[] = [
  { id: 'default', a: '#8b5cf6', b: '#ec4899', glyph: '▶' },
  { id: 'flame', a: '#f97316', b: '#ef4444', glyph: '🔥' },
  { id: 'heart', a: '#ec4899', b: '#be123c', glyph: '❤' },
  { id: 'bolt', a: '#3b82f6', b: '#06b6d4', glyph: '⚡' },
  { id: 'star', a: '#eab308', b: '#f97316', glyph: '⭐' },
  { id: 'moon', a: '#312e81', b: '#7c3aed', glyph: '🌙' },
  { id: 'leaf', a: '#10b981', b: '#065f46', glyph: '🌿' },
  { id: 'sun', a: '#fbbf24', b: '#ef4444', glyph: '☀' },
  ...Array.from({ length: 16 }, (_, i) => ({ id: `k${i + 1}`, a: '#222', b: '#000', glyph: '' })),
];

export const APP_ICON_PICKS = APP_ICONS.filter((i) => /^k\d+$/.test(i.id));

export function makeAppIcon(id: string, size = 180): string {
  const img = ICON_IMGS[id === 'default' ? 'k1' : id] ?? ICON_IMGS.k1;
  if (img) return img;
  const d = APP_ICONS.find((i) => i.id === id) ?? APP_ICONS[0];
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  if (!g) return '';
  const grad = g.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, d.a);
  grad.addColorStop(1, d.b);
  g.fillStyle = grad;
  g.beginPath();
  g.roundRect(0, 0, size, size, size * 0.24);
  g.fill();
  g.font = `${Math.round(size * 0.52)}px sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#fff';
  g.fillText(d.glyph, size / 2, size / 2 + size * 0.03);
  return c.toDataURL('image/png');
}

export interface Visit { user: string; at: number }

export const WALLPAPERS: { id: string; css: string }[] = [
  { id: 'none', css: '' },
  { id: 'night', css: 'linear-gradient(160deg,#0b1020,#1b1440)' },
  { id: 'ocean', css: 'linear-gradient(160deg,#06202e,#0b4a63)' },
  { id: 'forest', css: 'linear-gradient(160deg,#07170f,#0f3d28)' },
  { id: 'sunset', css: 'linear-gradient(160deg,#2a0f1f,#7a2e1d 70%,#c2641a)' },
  { id: 'rose', css: 'linear-gradient(160deg,#2a0b1a,#6d1a3d)' },
  { id: 'gold', css: 'linear-gradient(160deg,#17110a,#4a3512)' },
  { id: 'kurdistan', css: 'linear-gradient(170deg,#3b0d0d 0%,#2a2a0d 50%,#0d3b1a 100%)' },
  { id: 'dots', css: 'radial-gradient(rgba(255,255,255,.07) 1.5px,transparent 1.6px) 0 0/22px 22px,linear-gradient(160deg,#0a0f1d,#141b2e)' },
  { id: 'waves', css: 'repeating-linear-gradient(135deg,rgba(255,255,255,.04) 0 14px,transparent 14px 28px),linear-gradient(160deg,#0a0f1d,#1a1033)' },
];
