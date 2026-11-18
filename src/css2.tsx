/* KurdTok — css2.tsx : modern styling layer (comments, like button, notifications, chat, upload, live, wallet) */
export const CSS2 = `
/* ---------- comments ---------- */
.cm-head{display:flex;align-items:center;justify-content:space-between;padding-bottom:4px}
.cm-title{display:flex;align-items:center;gap:8px;font-size:1.1rem}
.cm-count{background:var(--card2);border:1px solid var(--border);border-radius:999px;padding:1px 10px;font-size:.8rem;font-weight:800;color:var(--sub)}
.cm-list{display:flex;flex-direction:column;gap:14px;padding:6px 0}
.cm-empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:48px 0;color:var(--sub)}
.cm-item{display:flex;flex-direction:column;gap:8px}
.cm-row{display:flex;gap:10px;align-items:flex-start}
.cm-reply{margin-inline-start:48px}
.cm-body{flex:1;min-width:0}
.cm-bubble{background:var(--card2);border:1px solid var(--border);border-radius:6px 18px 18px 18px;padding:8px 13px;width:fit-content;max-width:100%}
[dir="rtl"] .cm-bubble{border-radius:18px 6px 18px 18px}
.cm-meta{display:flex;align-items:center;gap:5px;font-size:.78rem;color:var(--sub)}.cm-meta b{color:var(--text)}
.cm-handle{padding:0;color:var(--text)}
.cm-pin{display:inline-flex;align-items:center;gap:3px;color:var(--accent);font-weight:800}
.cm-text{word-break:break-word;margin-top:2px;line-height:1.35}
.cm-foot{display:flex;align-items:center;gap:16px;padding:4px 6px 0;font-size:.74rem;color:var(--sub);font-weight:700}
.cm-like{display:flex;flex-direction:column;align-items:center;gap:1px;min-width:34px;padding-top:6px;font-size:.68rem;font-weight:800;color:var(--sub);transition:transform .15s}
.cm-like.on{color:#ff3b5c;animation:likepop .35s ease}
.cm-replying{display:flex;align-items:center;justify-content:space-between;padding:6px 12px;border-radius:12px;background:var(--card2);font-size:.8rem;color:var(--sub)}
.cm-emojis{display:flex;justify-content:space-between;padding:2px 2px}
.cm-emojis button{font-size:1.45rem;width:40px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:12px;transition:transform .12s}
.cm-emojis button:active{transform:scale(1.25)}
.cm-compose{display:flex;align-items:center;gap:8px;padding:6px 6px 6px 10px;border-radius:999px;background:var(--card2);border:1px solid var(--border)}
.cm-input{flex:1;min-width:0;background:none;border:0;outline:0;height:38px;font-size:.98rem;color:var(--text)}
.cm-off{display:flex;align-items:center;gap:8px;justify-content:center;padding:12px;border-radius:14px;background:var(--card2);color:var(--sub);font-size:.85rem;font-weight:700}
/* ---------- like button ---------- */
.rail button{min-height:46px}
.rail .likebtn,.rail .save,.rail .rep{position:relative}
.rail .likebtn svg,.rail > button > svg{filter:drop-shadow(0 2px 6px rgba(0,0,0,.55))}
.rail .likebtn{transition:transform .15s}
.rail .likebtn:active{transform:scale(.88)}
.rail .likebtn.on svg{color:#ff2d55;filter:drop-shadow(0 0 10px rgba(255,45,85,.75));animation:likepop .45s cubic-bezier(.2,1.6,.4,1)}
.rail .likebtn.on span{color:#ffb3c1}
@keyframes likepop{0%{transform:scale(.6)}55%{transform:scale(1.35)}100%{transform:scale(1)}}
/* ---------- notifications ---------- */
.nt-group{display:flex;flex-direction:column;gap:2px;margin-bottom:10px}
.nt-h{margin:10px 4px 6px;font-size:.82rem;letter-spacing:.04em;text-transform:uppercase;color:var(--sub)}
.nt-row{display:flex;align-items:center;gap:12px;width:100%;padding:10px 10px;border-radius:18px;text-align:start;transition:background .15s}
.nt-row:active{background:var(--card2)}
.nt-row.new{background:color-mix(in srgb,var(--accent) 9%,transparent)}
.nt-av{position:relative;flex:none}
.nt-badge{position:absolute;bottom:-2px;inset-inline-end:-3px;width:21px;height:21px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;border:2px solid var(--bg)}
.nt-badge.k-like{background:#ff2d55}.nt-badge.k-comment{background:#3b82f6}.nt-badge.k-visit{background:#8b5cf6}.nt-badge.k-other{background:#f59e0b}
.nt-text{line-height:1.3;word-break:break-word}
.nt-dot{width:9px;height:9px;border-radius:50%;background:var(--accent);flex:none}
/* ---------- inbox / chat rows ---------- */
.chatrow{background:transparent;border:0;border-radius:20px;padding:10px 10px;transition:background .15s}
.chatrow:active{background:var(--card2)}
.chatrow .badge{background:var(--grad);min-width:22px;height:22px;border-radius:11px;font-weight:800}
.msgs{padding:16px 14px;gap:4px}
.bubble{border-radius:20px;padding:10px 15px;box-shadow:0 1px 2px rgba(0,0,0,.12);border-end-start-radius:6px}
.bubble.me{box-shadow:0 4px 14px rgba(124,58,237,.28);border-end-start-radius:20px;border-end-end-radius:6px}
.bar{padding:10px 12px calc(10px + env(safe-area-inset-bottom));border-top:0;box-shadow:0 -6px 24px rgba(0,0,0,.12)}
.bar .pill-input{background:var(--card2);border:1px solid var(--border);border-radius:999px}
/* ---------- profile ---------- */
.vpill{display:flex;flex-direction:row;align-items:center;gap:6px;padding:6px 4px;font-weight:800;font-size:.95rem;color:#fff;background:none;border:0;text-shadow:0 1px 4px rgba(0,0,0,.7)}.vpill svg{filter:drop-shadow(0 1px 3px rgba(0,0,0,.7))}.storyview{touch-action:none}.storyview .sheet,.storyview .scroll{touch-action:pan-y}
.stats button{text-align:start}
`;
