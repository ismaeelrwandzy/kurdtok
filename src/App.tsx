/* KurdTok — App.tsx (entry, styles, auth, router) */
import { Component, useEffect } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AppContext, useApp, useAppState } from './state';
import type { RouteEntry } from './utils';
import { CameraScreen, EditProfileScreen } from './profile';
import { ProfileTab, UserScreen } from './userpage';
import { ChatInfoScreen } from './chatinfo';
import { SettingsScreen } from './settings';
import { FX_CSS } from './fx';
import { AUTH_CSS, AuthScreen, Splash, useSplash } from './auth';
import { S2_CSS } from './settings2';
import { NOTIFY_CSS, NotificationsScreen } from './notify';
import { INBOX_CSS } from './inbox';
import { FollowsScreen } from './follows';
import { SoundScreen } from './sound';
import { StoryScreen } from './story';
import { BottomNav, CommentsSheet, ConfirmModal, HomeTab, PermissionModal, ShareSheet, ToastView, ViewerScreen } from './ui';
import { CallScreen, ChatScreen, DiscoverTab, InboxTab, NewGroupScreen } from './screens';

/* ============================================================================
 * Styles (one stylesheet, theme tokens, RTL-aware via logical properties)
 * ========================================================================== */

export const CSS = `
:root{
  --bg:#05070f; --card:#0d111c; --card2:#141b2b; --text:#ffffff; --sub:#8a99ad; --border:#182236;
  --accent:#8b5cf6; --accent2:#ec4899; --danger:#ef4444; --ok:#10b981; --overlay:rgba(0,0,0,.62);
  --nav:rgba(13,17,28,.94); --grad:linear-gradient(135deg,#8b5cf6,#ec4899); --shadow:0 10px 30px rgba(0,0,0,.55);
  --bubble-in:#141b2b; --focus:#a78bfa;
}
:root[data-theme="light"]{
  --bg:#f8fafc; --card:#ffffff; --card2:#f1f5f9; --text:#0f172a; --sub:#64748b; --border:#e2e8f0;
  --overlay:rgba(15,23,42,.45); --nav:rgba(255,255,255,.94); --shadow:0 10px 30px rgba(15,23,42,.14);
  --bubble-in:#eef2f7; --focus:#7c3aed;
}
:root[data-theme="light"],:root[data-paper="1"]{--shadow:0 12px 34px rgba(90,60,30,.14)}
:root[data-paper="1"] body,:root[data-paper="1"] .kt{background-color:var(--bg);background-image:radial-gradient(circle at 12% 0%,rgba(255,255,255,.9),transparent 45%),radial-gradient(circle at 100% 100%,rgba(0,0,0,.035),transparent 50%)}
:root[data-paper="1"] .card{box-shadow:0 1px 2px rgba(60,40,20,.06),0 8px 22px rgba(60,40,20,.07);border-color:color-mix(in srgb,var(--border) 70%,transparent)}
:root[data-paper="1"] .cardlist .listrow{border-bottom-color:color-mix(in srgb,var(--border) 60%,transparent)}
:root[data-paper="1"] .sheet{background:linear-gradient(180deg,#fffdfb,var(--bg));box-shadow:0 -14px 44px rgba(60,40,20,.2);border-color:transparent}
:root[data-paper="1"] .sheet .card{background:#fff}
:root[data-paper="1"] .action{background:#fff;box-shadow:0 1px 2px rgba(60,40,20,.06),0 4px 14px rgba(60,40,20,.06);border-color:transparent}
:root[data-paper="1"] .sectionhead{color:var(--accent);opacity:.9}
:root[data-paper="1"] .input,:root[data-paper="1"] .birthrow select{background:#fff;border-color:var(--border);box-shadow:inset 0 1px 2px rgba(60,40,20,.05)}
:root[data-paper="1"] .backdrop{background:rgba(40,25,15,.38)}
:root[data-paper="1"] .listrow .sub,:root[data-paper="1"] .small.sub{color:var(--sub)}
.pinbadge{position:absolute;top:6px;inset-inline-start:6px;background:rgba(0,0,0,.6);color:#fff;border-radius:8px;padding:3px 5px;display:flex}
.stats button{background:none;color:inherit;font:inherit;padding:0}
html,body,#root{height:100%;margin:0 !important;padding:0 !important;display:block !important;max-width:none !important;min-width:0 !important;text-align:start !important;place-items:initial !important}
body{background:var(--bg);color:var(--text);overscroll-behavior:none;-webkit-text-size-adjust:100%}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.kt.reduce *{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important;scroll-behavior:auto !important}
.kt{height:100vh;height:100dvh;width:100%;max-width:520px;margin:0 auto;position:relative;overflow:hidden;background:var(--bg);color:var(--text);display:flex;flex-direction:column;font-family:'Noto Sans Arabic','Inter',system-ui,-apple-system,'Segoe UI',Roboto,Tahoma,sans-serif;font-size:.9375rem;line-height:1.45}
@media (min-width:560px){.kt{border-inline:1px solid var(--border);box-shadow:0 0 60px rgba(0,0,0,.35)}}
:where(.kt) button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
:where(.kt) button:disabled{cursor:not-allowed;opacity:.5}
:where(.kt) :is(input,textarea,select){font:inherit;color:var(--text)}
.kt :focus-visible{outline:2px solid var(--focus);outline-offset:2px;border-radius:8px}
.kt a{color:var(--accent)}
.screen{flex:1;min-height:0;position:relative;overflow:hidden;display:flex;flex-direction:column}
.scroll{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch}
.page{padding:18px 16px 28px;max-width:600px;margin:0 auto;width:100%}
.row{display:flex;align-items:center;gap:10px}
.between{justify-content:space-between}
.grow{flex:1;min-width:0}
.sub{color:var(--sub)}
.small{font-size:.8rem}
.center{text-align:center}
.truncate{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.h1{margin:0;font-size:1.4rem;font-weight:800}
.flip-rtl{display:inline-flex}
[dir="rtl"] .flip-rtl{transform:scaleX(-1)}
.verified{display:inline-block;vertical-align:middle;flex:none;filter:drop-shadow(0 2px 4px rgba(59,130,246,.5))}

/* buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 20px;border-radius:14px;font-weight:700;border:1px solid var(--border) !important;background:var(--card) !important;color:var(--text) !important;transition:transform .12s,opacity .12s}
.btn:active{transform:scale(.97)}
.btn.primary{background:var(--grad) !important;border-color:transparent !important;color:#fff !important}
.btn.danger{border-color:var(--danger) !important;color:var(--danger) !important}
.btn.block{width:100%}
.btn.sm{padding:7px 14px;font-size:.82rem;border-radius:12px}
.iconbtn{width:40px;height:40px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex:none;transition:background .15s}
.iconbtn:hover{background:rgba(127,127,127,.15)}
.iconbtn.glass{background:rgba(0,0,0,.42) !important;color:#fff;backdrop-filter:blur(8px)}
.chip{padding:6px 14px;border-radius:999px;font-size:.8rem;font-weight:700;border:1px solid var(--border) !important;background:var(--card) !important;color:var(--sub) !important}
.chip.on{background:var(--accent) !important;border-color:var(--accent) !important;color:#fff !important}
.seg{display:flex;background:var(--card);border:1px solid var(--border);border-radius:999px;padding:3px;gap:2px}
.seg button{padding:6px 14px;border-radius:999px;font-size:.8rem;font-weight:700;color:var(--sub)}
.seg button.on{background:var(--accent);color:#fff}

/* inputs */
.field{display:flex;flex-direction:column;gap:6px}
.field label{font-size:.72rem;font-weight:700;color:var(--sub);letter-spacing:.04em;text-transform:uppercase}
.input{width:100%;padding:13px 14px;background:var(--card);border:1px solid var(--border);border-radius:12px;outline:none;transition:border-color .15s}
.input:focus{border-color:var(--accent)}
.input.err{border-color:var(--danger)}
textarea.input{resize:none;min-height:88px}
.errtext{color:var(--danger);font-size:.8rem;margin:0}
.pill-input{flex:1;min-width:0;padding:11px 16px;border-radius:999px;background:var(--bg);border:1px solid var(--border);outline:none}
.pill-input:focus{border-color:var(--accent)}
.bar{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--card);border-top:1px solid var(--border)}
.sendbtn{width:40px;height:40px;border-radius:50%;background:var(--grad) !important;color:#fff !important;display:inline-flex;align-items:center;justify-content:center;flex:none}
.sendbtn .flip-rtl{transform:none}
[dir="rtl"] .sendbtn svg{transform:scaleX(-1)}

/* top bars */
.topbar{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--border);background:var(--card);flex:none}
.topbar h2{margin:0;font-size:1.05rem;font-weight:800;flex:1;min-width:0}
.topbar .link{color:var(--accent);font-weight:800;padding:8px 10px}

/* avatar */
.avatar{border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex:none;overflow:hidden;color:#fff;font-weight:800;background:#374151;position:relative;user-select:none}
.avatar img{width:100%;height:100%;object-fit:cover;display:block}
.dot-online{position:absolute;inset-inline-end:0;bottom:0;width:12px;height:12px;border-radius:50%;background:var(--ok);border:2px solid var(--card)}

/* bottom nav */
.nav{flex:none;display:flex;align-items:center;justify-content:space-around;padding:8px 10px calc(8px + env(safe-area-inset-bottom));background:var(--nav);backdrop-filter:blur(14px);border-top:1px solid var(--border);z-index:20}
.nav button{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:54px;padding:4px 6px;color:var(--sub);font-size:.66rem;font-weight:700}
.nav button.on{color:var(--accent)}
.nav .create{background:var(--grad);color:#fff !important;width:48px;height:38px;min-width:48px;border-radius:14px;justify-content:center;box-shadow:0 0 20px rgba(139,92,246,.45)}
.badge{position:absolute;top:-2px;inset-inline-end:6px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:var(--danger);color:#fff;font-size:.65rem;font-weight:800;display:inline-flex;align-items:center;justify-content:center}

/* feed */
.feed{position:absolute;inset:0;overflow-y:scroll;scroll-snap-type:y mandatory;overscroll-behavior:contain;background:#000}
.feed::-webkit-scrollbar{display:none}
.post{position:relative;height:100%;width:100%;scroll-snap-align:start;scroll-snap-stop:always;overflow:hidden;background:#000;color:#fff;user-select:none;-webkit-user-select:none}
.media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#111}
.media-fallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1e1b4b,#312e81,#0f172a);color:rgba(255,255,255,.6)}
.shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,.5) 0%,rgba(0,0,0,0) 28%,rgba(0,0,0,0) 52%,rgba(0,0,0,.82) 100%)}
.post-info{position:absolute;inset-inline-start:14px;inset-inline-end:76px;bottom:18px;display:flex;flex-direction:column;gap:8px;text-shadow:0 1px 3px rgba(0,0,0,.8)}
.post-info .who{display:flex;align-items:center;gap:10px}
.post-info .uname{font-weight:800;font-size:1rem;background:none;color:#fff;text-align:start}
.post-info .caption{margin:0;font-size:.92rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
.post-info .caption.open{-webkit-line-clamp:unset;max-height:34vh;overflow-y:auto}
.post-info .tag{color:#c4b5fd;font-weight:700;background:none;padding:0}
.post-info .meta{font-size:.8rem;color:#e2e8f0;display:flex;gap:6px;align-items:center}
.followbtn{padding:4px 12px;border-radius:999px;border:1px solid #fff !important;color:#fff !important;font-size:.72rem;font-weight:800;background:rgba(255,255,255,.1) !important}
.followbtn.on{opacity:.75}
.rail{position:absolute;inset-inline-end:10px;bottom:22px;display:flex;flex-direction:column;align-items:center;gap:16px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.8)}
.rail button{display:flex;flex-direction:column;align-items:center;gap:2px;color:#fff;font-size:.72rem;font-weight:800;min-width:44px;min-height:44px;justify-content:center}
.rail button.on svg{color:var(--danger)}
.rail button.on.save svg{color:#fbbf24}
.rail button.on.rep svg{color:#34d399}
.feed-top{position:absolute;top:0;inset-inline:0;z-index:5;display:flex;align-items:center;justify-content:center;gap:26px;padding:12px 16px;pointer-events:none}
.feed-top > *{pointer-events:auto}
.feed-top .tabbtn{font-size:1.05rem;font-weight:500;color:#cbd5e1;padding:6px 2px;border-bottom:2px solid transparent !important;text-shadow:0 2px 4px rgba(0,0,0,.6)}
.feed-top .tabbtn.on{color:#fff;font-weight:800;border-bottom-color:var(--accent) !important}
.autopill{position:absolute;top:56px;inset-inline-start:50%;transform:translateX(-50%);background:rgba(0,0,0,.6);backdrop-filter:blur(8px);color:#fff;font-size:.74rem;font-weight:700;padding:4px 12px;border-radius:999px;z-index:5}
[dir="rtl"] .autopill{transform:translateX(50%)}
.mutebtn{position:absolute;top:58px;inset-inline-end:12px;z-index:5;width:30px !important;height:30px !important;min-width:30px !important;min-height:30px !important;padding:0 !important;opacity:.85}
.pauseicon{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;color:#fff;z-index:4}
.pausestack{display:flex;flex-direction:column;align-items:center;gap:16px}
.pauseicon .bigplay{position:relative;width:84px;height:84px;border-radius:50%;background:rgba(0,0,0,.45);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;animation:pop .18s ease-out}
.pauseicon.flash{animation:fade .65s ease-out reverse forwards}
.media.wide{object-fit:contain;background:#000}
.buffer{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;color:#fff;z-index:3}
.buffer .spinner{width:34px;height:34px;border-width:3px}
.seekbar{position:absolute;inset-inline:0;bottom:0;height:20px;z-index:6;cursor:pointer;display:flex;align-items:flex-end}
.seekbar i{display:block;height:3px;background:#fff;border-radius:0 2px 2px 0;transition:width .2s linear;box-shadow:0 0 6px rgba(0,0,0,.6)}
.seekbar:active i{height:6px}
.post-info .soundline{font-size:.7rem;opacity:.85}
.post-info{bottom:16px}
.heart-pop{position:absolute;pointer-events:none;z-index:8;animation:heartPop .9s cubic-bezier(.175,.885,.32,1.275) forwards;color:var(--accent2)}
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--sub);text-align:center;padding:40px 24px;height:100%}

/* sheets & modals */
.backdrop{position:absolute;inset:0;background:var(--overlay);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);z-index:60;display:flex;align-items:flex-end;justify-content:center;animation:fade .18s ease}
.backdrop.mid{align-items:center;padding:20px}
.sheet{width:100%;background:linear-gradient(180deg,var(--card),var(--bg));border-top-left-radius:30px;border-top-right-radius:30px;border:1px solid var(--border);border-bottom:0;padding:12px 18px calc(22px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:16px;animation:slideUp .26s cubic-bezier(.2,.9,.25,1);max-height:86%;box-shadow:0 -18px 50px rgba(0,0,0,.55)}
.sheet.tall{height:78%}
.sheet .grab{width:46px;height:5px;border-radius:5px;background:var(--sub);opacity:.45;align-self:center;flex:none}
.modal{width:100%;max-width:340px;background:var(--card);border:1px solid var(--border);border-radius:24px;padding:24px;text-align:center;display:flex;flex-direction:column;gap:12px;animation:pop .2s ease;box-shadow:var(--shadow)}
.modal h3{margin:0;font-size:1.15rem}
.modal p{margin:0;color:var(--sub);font-size:.88rem}
.actions{display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:10px}
.action{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:8px;font-size:.74rem;font-weight:700;text-align:center;padding:14px 6px 12px;border-radius:20px;background:var(--card2);border:1px solid var(--border);line-height:1.3;transition:transform .12s,background .15s}
.action:active{transform:scale(.95)}
.action .ico{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 28%,transparent),color-mix(in srgb,var(--accent2) 22%,transparent));border:1px solid color-mix(in srgb,var(--accent) 40%,transparent);display:flex;align-items:center;justify-content:center;color:var(--text)}
.action.on .ico{background:var(--accent);border-color:var(--accent);color:#fff}
.action.danger{color:var(--danger)}
.action.danger .ico{background:rgba(239,68,68,.14);border-color:rgba(239,68,68,.4);color:var(--danger)}
.action.on .ico{color:#fff}
.sheet .frow button{padding:8px 4px;border-radius:16px;background:var(--card2);border:1px solid var(--border);width:74px}

/* lists/cards */
.card{background:var(--card);border:1px solid var(--border);border-radius:16px}
.cardlist{overflow:hidden}
.listrow{display:flex;align-items:center;gap:12px;padding:13px 14px;border-bottom:1px solid var(--border);width:100%;text-align:start}
.listrow:last-child{border-bottom:0}
.sectionhead{font-size:.72rem;font-weight:800;letter-spacing:.08em;color:var(--accent);margin:18px 4px 8px;text-transform:uppercase}
.switch{width:46px;height:26px;border-radius:999px;background:#334155 !important;padding:2px;display:flex;align-items:center;transition:background .2s;flex:none}
.switch[aria-checked="true"]{background:var(--accent) !important}
.switch i{width:22px;height:22px;border-radius:50%;background:#fff;transition:transform .2s;display:block}
.switch[aria-checked="true"] i{transform:translateX(20px)}
[dir="rtl"] .switch[aria-checked="true"] i{transform:translateX(-20px)}
.chatrow{display:flex;align-items:center;gap:12px;padding:12px 14px;width:100%;text-align:start;border-radius:16px;background:var(--card);border:1px solid var(--border)}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.thumb{position:relative;aspect-ratio:3/4;border-radius:10px;overflow:hidden;background:var(--card2);display:block;width:100%}
.thumb img,.thumb video{width:100%;height:100%;object-fit:cover;display:block}
.thumb .cnt{position:absolute;bottom:6px;inset-inline-start:6px;font-size:.7rem;color:#fff;background:rgba(0,0,0,.6);padding:2px 6px;border-radius:6px;display:flex;gap:4px;align-items:center}
.thumb .vid{position:absolute;top:6px;inset-inline-end:6px;color:#fff;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}
.tabs{display:flex;justify-content:space-around;border-bottom:1px solid var(--border);margin-bottom:12px}
.tabs button{flex:1;padding:10px 4px;font-size:.82rem;font-weight:800;color:var(--sub);border-bottom:2px solid transparent;display:flex;align-items:center;justify-content:center;gap:6px}
.tabs button.on{color:var(--text);border-bottom-color:var(--accent)}
.tagcard{background:var(--card);padding:12px;border-radius:14px;border:1px solid var(--border);text-align:start;width:100%}
.tagcard b{color:var(--accent);display:block;font-size:.88rem}
.stats{display:flex;gap:28px;margin:12px 0}
.stats b{font-size:1.05rem}
.cover{height:150px;background:linear-gradient(135deg,#1e1b4b,#312e81,#0f172a) center/cover no-repeat;position:relative}
.cover .btn{position:absolute;bottom:10px;inset-inline-end:10px;background:rgba(0,0,0,.6) !important;color:#fff !important;border:0 !important}

/* chat */
.msgs{flex:1;min-height:0;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:6px}
.bubble{max-width:78%;padding:9px 14px;border-radius:18px;font-size:.92rem;word-break:break-word;white-space:pre-wrap;background:var(--bubble-in);align-self:flex-start;border-end-start-radius:6px}
.bubble.me{align-self:flex-end;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;border-end-start-radius:18px;border-end-end-radius:6px}
.bubble img{max-width:100%;border-radius:12px;display:block;margin-bottom:2px}
.bubble .time{display:block;font-size:.66rem;opacity:.65;margin-top:2px;text-align:end}
.bubble .from{display:block;font-size:.72rem;font-weight:800;color:var(--accent2);margin-bottom:2px}
.syschip{align-self:center;font-size:.74rem;color:var(--sub);background:var(--card);border:1px solid var(--border);padding:4px 12px;border-radius:999px;margin:6px 0}
.typing{display:inline-flex;gap:4px;align-items:center;padding:12px 14px}
.typing i{width:6px;height:6px;border-radius:50%;background:var(--sub);animation:bounce 1.2s infinite}
.typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}
.emojibar{display:flex;gap:4px;padding:8px 10px;overflow-x:auto;background:var(--card);border-top:1px solid var(--border)}
.emojibar button{font-size:1.4rem;padding:2px 6px;border-radius:8px}

/* call */
.call{position:absolute;inset:0;z-index:50;background:radial-gradient(circle at 50% 28%,#2a1f5c,#05070f 70%);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:56px 20px 36px;overflow:hidden}
.call .pulse{position:relative;width:120px;height:120px}
.call .pulse::before,.call .pulse::after{content:"";position:absolute;inset:-14px;border-radius:50%;border:2px solid rgba(139,92,246,.55);animation:ring 2s infinite}
.call .pulse::after{animation-delay:1s}
.call .local{position:absolute;top:70px;inset-inline-end:16px;width:104px;height:150px;border-radius:16px;object-fit:cover;background:#111;border:2px solid rgba(255,255,255,.7);z-index:3}
.call .ctrls{display:flex;gap:16px;flex-wrap:wrap;justify-content:center;z-index:3}
.call .cbtn{width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.14) !important;color:#fff !important;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)}
.call .cbtn.on{background:#fff !important;color:#111 !important}
.call .cbtn.end{background:var(--danger) !important;box-shadow:0 0 20px rgba(239,68,68,.6)}
.call .cbtn.end svg{transform:rotate(135deg)}
.mirror{transform:scaleX(-1)}

/* camera */
.cam{position:absolute;inset:0;z-index:50;background:#000;color:#fff;display:flex;flex-direction:column;overflow:hidden}
.cam video,.cam .preview{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cam .top,.cam .bottom{position:relative;z-index:3;padding:14px 16px}
.cam .top{display:flex;justify-content:space-between;align-items:center;background:linear-gradient(180deg,rgba(0,0,0,.6),transparent)}
.cam .bottom{margin-top:auto;display:flex;flex-direction:column;gap:14px;align-items:center;background:linear-gradient(0deg,rgba(0,0,0,.8),transparent);padding-bottom:calc(22px + env(safe-area-inset-bottom))}
.shutter{width:78px;height:78px;border-radius:50%;border:4px solid #fff !important;display:flex;align-items:center;justify-content:center}
.shutter i{width:60px;height:60px;border-radius:50%;background:var(--danger);display:block;transition:all .15s}
.shutter.rec i{width:30px;height:30px;border-radius:8px}
.shutter.photo i{background:#fff}
.camtools{position:absolute;inset-inline-end:12px;top:72px;z-index:4;display:flex;flex-direction:column;gap:10px;align-items:center}
.camtool.on{background:var(--accent) !important}
.camtag{font-size:.7rem;font-weight:800;color:#fff;background:rgba(0,0,0,.5);border-radius:8px;padding:1px 6px}
.camgrid{position:absolute;inset:0;pointer-events:none;z-index:2;background:linear-gradient(to right,transparent calc(33.33% - .5px),rgba(255,255,255,.35) calc(33.33% - .5px),rgba(255,255,255,.35) calc(33.33% + .5px),transparent calc(33.33% + .5px),transparent calc(66.66% - .5px),rgba(255,255,255,.35) calc(66.66% - .5px),rgba(255,255,255,.35) calc(66.66% + .5px),transparent calc(66.66% + .5px)),linear-gradient(to bottom,transparent calc(33.33% - .5px),rgba(255,255,255,.35) calc(33.33% - .5px),rgba(255,255,255,.35) calc(33.33% + .5px),transparent calc(33.33% + .5px),transparent calc(66.66% - .5px),rgba(255,255,255,.35) calc(66.66% - .5px),rgba(255,255,255,.35) calc(66.66% + .5px),transparent calc(66.66% + .5px))}
.screenflash{position:absolute;inset:0;background:#fff;z-index:9;pointer-events:none}
.countdown{position:absolute;inset:0;z-index:8;display:flex;align-items:center;justify-content:center;font-size:7rem;font-weight:900;color:#fff;background:rgba(0,0,0,.25);text-shadow:0 4px 20px rgba(0,0,0,.6)}
.modes{display:flex;gap:22px;font-weight:800;font-size:.95rem}
.modes button{color:#fff;opacity:.6;padding:4px 2px;border-bottom:2px solid transparent}
.modes button.on{opacity:1;border-bottom-color:#fff}
.zoomrow{gap:10px;width:80%;max-width:320px;background:rgba(0,0,0,.4);padding:6px 12px;border-radius:999px}
.zoomrow input{flex:1;accent-color:#fff}
.livebadge{background:linear-gradient(135deg,#ef4444,#ec4899);color:#fff;font-weight:900;font-size:.78rem;padding:4px 10px;border-radius:8px;letter-spacing:.06em}
.golive{display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#ef4444,#ec4899);color:#fff;font-weight:800;border-radius:999px;padding:14px 28px;font-size:1rem;box-shadow:0 6px 24px rgba(236,72,153,.45)}
.golive:disabled{opacity:.5}
.livetitle{background:rgba(0,0,0,.45) !important;color:#fff;border-color:rgba(255,255,255,.3) !important;width:100%}
.livechat{position:relative;z-index:3;padding:0 16px 8px;max-width:78%;display:flex;flex-direction:column;gap:4px;font-size:.88rem;text-shadow:0 1px 3px rgba(0,0,0,.9)}
.livechat div{background:rgba(0,0,0,.35);border-radius:12px;padding:4px 10px;width:fit-content;animation:pop .2s ease-out}
.livehearts{position:absolute;inset-inline-end:0;bottom:90px;width:100%;height:50%;pointer-events:none;z-index:3;overflow:hidden}
.livehearts span{position:absolute;bottom:0;font-size:1.6rem;color:#ff4d6d;animation:floatUp 2.2s ease-out forwards}
@keyframes floatUp{0%{transform:translateY(0) scale(.6);opacity:0}15%{opacity:1}100%{transform:translateY(-260px) scale(1.2);opacity:0}}
.minimute{width:44px;height:44px;border-radius:50%;background:rgba(0,0,0,.55);backdrop-filter:blur(8px);color:#fff;display:flex;align-items:center;justify-content:center;pointer-events:auto;border:1px solid rgba(255,255,255,.25);box-shadow:0 2px 10px rgba(0,0,0,.4);animation:pop .18s ease-out}
.fastbadge{position:absolute;top:92px;inset-inline:0;margin:0 auto;width:fit-content;z-index:6;display:flex;align-items:center;gap:10px;padding:8px 18px 8px 16px;border-radius:999px;color:#fff;pointer-events:none;background:linear-gradient(135deg,rgba(139,92,246,.85),rgba(236,72,153,.85));box-shadow:0 6px 22px rgba(139,92,246,.45);backdrop-filter:blur(8px);animation:pop .15s ease-out}
.fastbadge b{font-size:1.15rem;font-weight:900;letter-spacing:.02em}
.fastbadge .chev{display:flex}
.fastbadge .chev i{width:9px;height:9px;border-top:3px solid #fff;border-right:3px solid #fff;transform:rotate(45deg);margin-inline-start:-2px;opacity:.25;animation:chev .9s ease-in-out infinite}
.fastbadge .chev i:nth-child(2){animation-delay:.15s}.fastbadge .chev i:nth-child(3){animation-delay:.3s}
@keyframes chev{0%,100%{opacity:.25}40%{opacity:1}}
html.lockfeed .feed{overflow:hidden !important}
.sheet .scroll,.sheet{overscroll-behavior:contain}
.cd{width:50px !important;height:50px !important;margin-top:4px}
.cd-disc{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle,#000 0 30%,#2b2b2b 31% 34%,#0a0a0a 35% 62%,#2b2b2b 63% 66%,#0a0a0a 67%);border:2px solid #3a3a3a;box-shadow:0 2px 8px rgba(0,0,0,.6);animation:spin 4.5s linear infinite}
.clearbar{position:absolute;inset-inline:12px;bottom:22px;z-index:7;display:flex;align-items:center;justify-content:space-between;gap:10px}
.speeds{display:flex;gap:4px;background:rgba(0,0,0,.5);backdrop-filter:blur(8px);padding:4px;border-radius:999px}
.speeds button{color:#fff;font-weight:800;font-size:.85rem;padding:8px 12px;border-radius:999px}
.speeds button.on{background:#fff;color:#111}
.speeds.big{background:var(--card2,rgba(127,127,127,.15));justify-content:space-between}
.speeds.big button{flex:1;color:var(--text);font-size:1rem}
.speeds.big button.on{background:var(--accent);color:#fff}
.mutebtn{display:none}
.kt.cleardisp .nav,.kt.cleardisp .feed-top,.kt.cleardisp .rail,.kt.cleardisp .post-info,.kt.cleardisp .shade{display:none}
.kt.cleardisp .feed{overflow:hidden}
.likebtn{position:relative}
.holdring{position:absolute;top:-4px;inset-inline-start:50%;margin-inline-start:-24px;width:48px;height:48px;transform:rotate(-90deg);pointer-events:none}
.holdring circle{fill:none;stroke:#34d399;stroke-width:3;stroke-linecap:round;stroke-dasharray:100;stroke-dashoffset:100;animation:ringFill 5s linear forwards}
@keyframes ringFill{to{stroke-dashoffset:0}}
.friendrow{display:flex;gap:14px;overflow-x:auto;padding:4px 2px 10px;-webkit-overflow-scrolling:touch}
.friendrow button{display:flex;flex-direction:column;align-items:center;gap:6px;width:68px;flex:none;font-size:.72rem;color:var(--text)}
.friendrow .truncate{max-width:68px}
.menucard{background:var(--card2,rgba(127,127,127,.12));border-radius:16px;padding:4px 14px;display:flex;flex-direction:column}
.menurow{display:flex;align-items:center;gap:14px;padding:14px 0;font-size:1rem;color:var(--text);text-align:start;width:100%;min-height:52px}
.menurow.danger{color:var(--danger)}
.menurow .grow{flex:1}
.speeds.small button{padding:6px 8px;font-size:.78rem}
.speeds.big.small{padding:3px;flex:none}
.soundline{display:flex;align-items:center;gap:4px;color:#fff;text-align:start;max-width:75%}
.soundsearch{flex:1;display:flex;align-items:center;gap:8px;border:1px solid var(--border,rgba(127,127,127,.4));border-radius:12px;padding:0 12px;height:44px;min-width:0}
.soundsearch input{flex:1;min-width:0;background:none;border:0;outline:0;color:var(--text);font-size:1rem}
.soundhead{display:flex;align-items:center;gap:16px;padding:12px 16px 16px}
.cdbig{width:96px;height:96px;border-radius:50%;flex:none;padding:3px;background:linear-gradient(135deg,#8b5cf6,#ec4899);display:block}
.cdbig>*{border-radius:50%}
.soundtitle{margin:0;font-size:1.35rem;line-height:1.25;overflow-wrap:anywhere}
.soundmeta{display:flex;align-items:center;gap:12px;padding:10px 16px 14px;font-size:.92rem}
.soundgrid[data-badge] .thumb:first-child::before{content:var(--badge);position:absolute;top:8px;inset-inline-start:8px;z-index:2;background:#ef2b5b;color:#fff;font-weight:800;font-size:.72rem;padding:3px 8px;border-radius:6px}
.soundbar{position:absolute;inset-inline:0;bottom:0;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:linear-gradient(to top,var(--bg) 60%,transparent)}
.storytray{display:flex;gap:14px;overflow-x:auto;padding:2px 2px 14px;margin-bottom:6px;-webkit-overflow-scrolling:touch}
.storyitem{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;width:70px;flex:none;font-size:.72rem}
.storyitem .truncate{max-width:70px}
.storyring{padding:3px;border-radius:50%;display:block;background:var(--border)}
.storyring>*{border-radius:50%;border:2px solid var(--bg)}
.storyring.has{background:linear-gradient(135deg,#f59e0b,#ec4899,#8b5cf6)}
.storyring.seen{background:rgba(127,127,127,.45)}
.storyring.none{background:transparent;padding:3px}
.storyplus{position:absolute;top:42px;inset-inline-end:4px;width:22px;height:22px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;border:2px solid var(--bg)}
.storyview{color:#fff;z-index:90}
.storymedia{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}
.storyfallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#555}
.storyshade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(to bottom,rgba(0,0,0,.55),transparent 22%,transparent 70%,rgba(0,0,0,.6))}
.storybars{position:absolute;top:calc(8px + env(safe-area-inset-top));inset-inline:10px;display:flex;gap:4px;z-index:3}
.storybars span{flex:1;height:3px;background:rgba(255,255,255,.35);border-radius:2px;overflow:hidden}
.storybars i{display:block;height:100%;background:#fff}
.storyhead{position:absolute;top:calc(18px + env(safe-area-inset-top));inset-inline:10px;display:flex;align-items:center;gap:10px;z-index:3}
.storyhead .iconbtn{color:#fff}
.storybottom{position:absolute;inset-inline:0;bottom:0;z-index:4;display:flex;flex-direction:column;gap:12px;padding:56px 14px calc(14px + env(safe-area-inset-bottom));background:linear-gradient(to top,rgba(0,0,0,.78),rgba(0,0,0,.35) 60%,transparent)}
.storycap{position:static;text-align:center;font-size:1.1rem;font-weight:700;line-height:1.45;text-shadow:0 2px 8px rgba(0,0,0,.8);margin:0;max-height:5.5em;overflow:hidden}
.storyreply{position:static;display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.14);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.28);border-radius:999px;padding:4px 8px 4px 18px}
.storyreply input{flex:1;background:none;border:0;outline:0;color:#fff;font-size:1rem;min-width:0;height:40px}
.storyreply input::placeholder{color:rgba(255,255,255,.75)}
.storyreply .iconbtn{color:#fff}.storyreply .liked{color:#ff4d6d}
.friendtag{font-size:.72rem;font-weight:800;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.2);backdrop-filter:blur(6px);color:#fff}
.lockbadge{position:absolute;top:6px;inset-inline-start:6px;color:#fff;background:rgba(0,0,0,.6);border-radius:8px;padding:3px 5px;display:flex}
.trashthumb{width:64px;height:84px;border-radius:10px;overflow:hidden;background:var(--card2);flex:none;display:flex;align-items:center;justify-content:center}
.trashthumb img,.trashthumb video{width:100%;height:100%;object-fit:cover}
.trashrow{display:flex;gap:12px;padding:10px;align-items:flex-start}
.stedit{position:absolute;inset:0;z-index:60;background:#000;color:#fff;overflow:hidden;touch-action:none}
.ststage{position:absolute;inset:0}
.ststage>img,.ststage>video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;user-select:none}
.stdraw,.ovview svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.stcatch{position:absolute;inset:0;z-index:5;cursor:crosshair}
.ovview{position:absolute;inset:0;pointer-events:none;z-index:2;overflow:hidden}
.ovitem{position:absolute;transform:translate(-50%,-50%);font-weight:800;line-height:1.15;text-align:center;max-width:86%;white-space:pre-wrap;overflow-wrap:anywhere;text-shadow:0 2px 8px rgba(0,0,0,.65);z-index:3}
.ovitem.editable{pointer-events:auto;cursor:grab;touch-action:none;user-select:none}
.ovitem.dragging{opacity:.85;cursor:grabbing}
.sttop{position:absolute;top:calc(10px + env(safe-area-inset-top));inset-inline:12px;display:flex;align-items:center;justify-content:space-between;z-index:8}
.stseg{background:rgba(0,0,0,.5) !important}
.stseg button{color:#fff}
.sttools{position:absolute;top:calc(74px + env(safe-area-inset-top));inset-inline-end:12px;display:flex;flex-direction:column;gap:10px;z-index:8}
.sttool.on{background:var(--accent) !important}
.stbottom{position:absolute;inset-inline:0;bottom:0;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px calc(18px + env(safe-area-inset-bottom));z-index:8;background:linear-gradient(0deg,rgba(0,0,0,.75),transparent)}
.stshare{flex:1;justify-content:center}
.sttrash{position:absolute;bottom:calc(24px + env(safe-area-inset-bottom));left:50%;margin-left:-30px;width:60px;height:60px;border-radius:50%;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:9;transition:transform .15s}
.sttrash.over{background:#ef4444;transform:scale(1.25)}
.stcolors{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.stcolors button{width:30px;height:30px;border-radius:50%;border:2px solid rgba(255,255,255,.5)}
.stcolors button.on{border-color:#fff;transform:scale(1.2)}
.sttext{position:absolute;inset:0;z-index:20;background:rgba(0,0,0,.82);display:flex;flex-direction:column;align-items:center;gap:16px;padding:calc(16px + env(safe-area-inset-top)) 16px 20px}
.sttext textarea{flex:1;width:100%;background:none;border:0;outline:0;resize:none;text-align:center;font-weight:800;text-shadow:0 2px 8px rgba(0,0,0,.6)}
.stsize{width:70%;accent-color:#fff}
.stemojis{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;width:100%;overflow-y:auto}
.stemojis button{font-size:2rem;padding:8px;border-radius:12px}
.stemojis button:active{background:rgba(255,255,255,.15)}
.recbadge{background:var(--danger);padding:3px 12px;border-radius:999px;font-weight:800;font-size:.82rem}
.review{position:absolute;inset:0;background:var(--bg);color:var(--text);display:flex;flex-direction:column;z-index:60}
.review .pv{height:36%;background:#000;position:relative;flex:none}
.review .pv img,.review .pv video{width:100%;height:100%;object-fit:contain}

/* ai */
.aibox{height:340px;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
.aimsg{max-width:84%;padding:10px 14px;border-radius:16px;font-size:.9rem;line-height:1.5;word-break:break-word}
.aimsg.user{align-self:flex-end;background:var(--accent);color:#fff}
.aimsg.bot{align-self:flex-start;background:var(--card2)}
.aimsg.err{align-self:flex-start;background:rgba(239,68,68,.12);border:1px solid var(--danger);color:var(--danger)}

/* toast */
.toast{position:absolute;bottom:calc(96px + env(safe-area-inset-bottom));inset-inline:16px;margin:0 auto;width:fit-content;max-width:calc(100% - 48px);background:rgba(30,30,32,.94);color:#fff;padding:12px 20px;border-radius:12px;z-index:200;font-size:.92rem;font-weight:600;box-shadow:0 6px 24px rgba(0,0,0,.45);animation:toastIn .22s ease;text-align:center;backdrop-filter:blur(8px)}

/* overlay screens */
.overlay{position:absolute;inset:0;z-index:40;background:var(--bg);display:flex;flex-direction:column;animation:fade .15s ease}
.overlay.dark{background:#000}

/* auth */
.auth{flex:1;overflow-y:auto;display:flex;flex-direction:column;justify-content:center;gap:18px;padding:28px 22px;max-width:420px;width:100%;margin:0 auto}
.logo{width:76px;height:76px;border-radius:24px;background:var(--grad);display:flex;align-items:center;justify-content:center;margin:0 auto;box-shadow:0 0 36px rgba(139,92,246,.5);color:#fff}
.spinner{width:18px;height:18px;border-radius:50%;border:2px solid rgba(127,127,127,.4);border-top-color:currentColor;animation:spin .7s linear infinite;display:inline-block}

@keyframes heartPop{0%{transform:scale(0) rotate(-20deg);opacity:0}15%{transform:scale(1.25) rotate(10deg);opacity:1}30%{transform:scale(.95) rotate(-5deg);opacity:1}50%{transform:scale(1.1) rotate(0);opacity:1}80%{transform:scale(1);opacity:1}100%{transform:scale(1.3);opacity:0}}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}
@keyframes pop{from{transform:scale(.92);opacity:0}to{transform:none;opacity:1}}
@keyframes toastIn{from{transform:translateY(-14px);opacity:0}to{transform:none;opacity:1}}
@keyframes bounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}
@keyframes ring{0%{transform:scale(.8);opacity:.9}100%{transform:scale(1.5);opacity:0}}
@keyframes spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.kt *{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important;scroll-behavior:auto !important}}
` + FX_CSS + S2_CSS + AUTH_CSS + NOTIFY_CSS + INBOX_CSS + `
.kt{height:var(--vvh,100dvh)}
html,body{overflow:hidden}
.bubble.me{background:var(--grad)}
.bubble img{max-height:300px;width:100%;object-fit:cover}
.bubble:has(img){padding:4px 4px 7px;max-width:72%}
.bubble:has(img) .time{padding:0 8px}
.pill-input:focus,.pill-input:focus-visible{outline:none !important;border-color:var(--accent)}
.itabs{display:flex;border-bottom:1px solid var(--border);margin:6px 0 10px}
.itabs button{flex:1;padding:12px 0;color:var(--sub);border-bottom:2px solid transparent;display:flex;justify-content:center}
.itabs button.on{color:var(--text);border-bottom-color:var(--text)}
.visrow{display:flex;align-items:center;gap:8px;width:100%;padding:9px 12px;margin:0 0 10px;border-radius:12px;background:var(--card);border:1px solid var(--border);font-size:.85rem}
.visrow span{flex:1;text-align:start}
.avwrap{position:relative}
.avring{display:block;border-radius:50%;border:4px solid var(--bg);padding:0}
.avring.has{padding:3px;border:0;background:linear-gradient(135deg,#f59e0b,#ec4899,#8b5cf6)}
.avring.has>*{border:3px solid var(--bg);border-radius:50%}
.avcam{position:absolute;bottom:2px;inset-inline-end:2px;width:26px;height:26px;border-radius:50%;background:var(--grad);color:#fff;display:flex;align-items:center;justify-content:center;border:2px solid var(--bg)}
.ucover{height:170px;overflow:hidden}
.ucoveremoji{position:absolute;inset-inline-end:12px;bottom:-20px;font-size:7rem;opacity:.16;pointer-events:none}
.qrow{display:flex;justify-content:center;gap:16px;flex-wrap:wrap}
.qa{display:flex;flex-direction:column;align-items:center;gap:6px;width:76px}
.qa span{width:52px;height:52px;border-radius:50%;background:var(--card2);display:flex;align-items:center;justify-content:center}
.qa small{font-size:.74rem;text-align:center}
.wallgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.wallgrid button{aspect-ratio:3/4;border-radius:14px;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;background:var(--card2)}
.wallgrid button.on{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent)}
.chatsearch{display:flex;align-items:center;gap:8px;padding:6px 12px;border-bottom:1px solid var(--border);background:var(--card)}
.chatsearch input{flex:1;background:transparent;border:0;outline:0;color:var(--text);font:inherit;padding:8px 0}
.storyreacts{position:static;display:flex;justify-content:space-between;align-items:center;gap:4px;padding:6px 10px;background:rgba(0,0,0,.38);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.16);border-radius:999px;align-self:center;width:100%;max-width:360px}
.storyreacts button{font-size:1.65rem;width:46px;height:46px;border-radius:50%;background:transparent;display:flex;align-items:center;justify-content:center;transition:transform .12s;flex:none}
.storyreacts button:active{transform:scale(1.35)}
.sfloat{position:absolute;bottom:170px;font-size:2.4rem;z-index:6;pointer-events:none;animation:sFloat 1.4s ease-out forwards}
@keyframes sFloat{0%{transform:translateY(0) scale(.5);opacity:0}15%{opacity:1;transform:translateY(-20px) scale(1.2)}100%{transform:translateY(-230px) scale(1);opacity:0}}
.storyown{display:flex;justify-content:center}
.frow{display:flex;gap:12px;overflow-x:auto;padding:4px 2px 12px}
.frow button{display:flex;flex-direction:column;align-items:center;gap:4px;width:62px;flex:none;font-size:.7rem}
.kt .sfloat{animation-duration:1.4s !important}
.camtap{position:absolute;inset:0;z-index:2}
.cam video.flipanim{animation:camFlip .42s ease}
@keyframes camFlip{0%{filter:blur(0);transform:scale(1)}50%{filter:blur(14px) brightness(.6);transform:scale(1.06)}100%{filter:blur(0);transform:scale(1)}}
.cam video.mirror.flipanim{animation:none}
.focusring{position:absolute;z-index:5;width:0;height:0;pointer-events:none}
.focusring i{position:absolute;left:-34px;top:-34px;width:68px;height:68px;border:2px solid #facc15;border-radius:14px;box-shadow:0 0 8px rgba(0,0,0,.5);animation:focusIn .35s ease-out}
.focusring .expo{position:absolute;left:46px;top:-48px;width:96px;transform:rotate(-90deg);transform-origin:0 50%;margin-top:96px;pointer-events:auto;accent-color:#facc15}
@keyframes focusIn{0%{transform:scale(1.6);opacity:0}100%{transform:scale(1);opacity:1}}
.camhint{position:absolute;z-index:3;left:50%;transform:translateX(-50%);top:46%;background:rgba(0,0,0,.5);color:#fff;padding:6px 12px;border-radius:99px;font-size:.78rem;pointer-events:none;animation:hintFade 5s forwards;white-space:nowrap}
@keyframes hintFade{0%,70%{opacity:1}100%{opacity:0}}
.sttext textarea{border:0 !important;box-shadow:none !important;background:transparent !important;padding-top:22vh !important;font-size:2rem}
.sttext textarea::placeholder{color:rgba(255,255,255,.55)}
`;


/* ============================================================================
 * Auth screen, router, error boundary, root
 * ========================================================================== */

export function OverlayRoute({ entry }: { entry: RouteEntry }) {
  switch (entry.name) {
    case 'camera': return <CameraScreen sound={entry.sound} soundSrc={entry.soundSrc} story={entry.story} draftId={entry.draftId} />;
    case 'story': return <StoryScreen author={entry.author} />;
    case 'sound': return <SoundScreen audio={entry.audio} postId={entry.postId} />;
    case 'comments': return <CommentsSheet postId={entry.postId} />;
    case 'chat': return <ChatScreen chatId={entry.chatId} />;
    case 'chatinfo': return <ChatInfoScreen chatId={entry.chatId} />;
    case 'call': return <CallScreen chatId={entry.chatId} media={entry.media} />;
    case 'editProfile': return <EditProfileScreen />;
    case 'settings': return <SettingsScreen initialPanel={entry.panel} />;
    case 'newGroup': return <NewGroupScreen />;
    case 'notifications': return <NotificationsScreen />;
    case 'follows': return <FollowsScreen initial={entry.tab} />;
    case 'user': return <UserScreen username={entry.username} />;
    case 'viewer': return <ViewerScreen entry={entry} />;
    default: return null;
  }
}

export function Shell() {
  const app = useApp();
  const { t } = app;
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const fit = () => {
      document.documentElement.style.setProperty('--vvh', `${Math.round(vv.height)}px`);
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    fit();
    vv.addEventListener('resize', fit);
    vv.addEventListener('scroll', fit);
    return () => {
      vv.removeEventListener('resize', fit);
      vv.removeEventListener('scroll', fit);
      document.documentElement.style.removeProperty('--vvh');
    };
  }, []);
  const splash = useSplash();
  if (splash) return <Splash />;
  if (!app.loggedIn) return <AuthScreen />;
  return (
    <>
      <main className="screen" aria-label={t('app.name')}>
        {app.tab === 'home' ? <HomeTab /> : null}
        {app.tab === 'discover' ? <DiscoverTab /> : null}
        {app.tab === 'inbox' ? <InboxTab /> : null}
        {app.tab === 'profile' ? <ProfileTab /> : null}
      </main>
      <BottomNav />
      {app.stack.map((entry) => (
        <OverlayRoute key={entry.key} entry={entry} />
      ))}
      <ShareSheet />
      <PermissionModal />
    </>
  );
}

export function AppProvider({ children }: { children: ReactNode }) {
  const value = useAppState();
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function Root() {
  const app = useApp();
  return (
    <div className={`kt${app.settings.reduceMotion ? ' reduce' : ''}${app.clearDisplay ? ' cleardisp' : ''}`} dir={app.langMeta.dir} lang={app.langMeta.code}>
      <style>{CSS}</style>
      <Shell />
      <ConfirmModal />
      <ToastView />
    </div>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('KurdTok crashed:', error, info.componentStack);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center', background: '#05070f', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <h2 style={{ margin: 0 }}>Something went wrong · هەڵەیەک ڕوویدا</h2>
        <button type="button" onClick={() => window.location.reload()} style={{ padding: '10px 22px', borderRadius: 14, border: 0, background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          Reload
        </button>
      </div>
    );
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Root />
      </AppProvider>
    </ErrorBoundary>
  );
}
