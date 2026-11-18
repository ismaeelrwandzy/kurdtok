/* KurdTok — design.tsx : Kurdish identity design layer (flag red · sun gold · mountain green).
   Loaded LAST so it refines every screen without touching logic. */

// 21-ray Kurdish sun, used as a soft decorative watermark.
const SUN = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='-100 -100 200 200'><g fill='none' stroke='#F7A81B' stroke-width='3' stroke-linecap='round'>${Array.from({ length: 21 }, (_, i) => {
    const a = (i * 360) / 21;
    return `<line x1='0' y1='-46' x2='0' y2='-${i % 2 ? 78 : 90}' transform='rotate(${a.toFixed(2)})'/>`;
  }).join('')}<circle r='34' stroke-width='4'/><circle r='24' stroke-width='2' opacity='.6'/></g></svg>`,
);

export const DESIGN_CSS = `
:root{
  --bg:#0a0c0b; --card:#131715; --card2:#1b211e; --border:#262e2a; --sub:#9aa79f;
  --accent:#e63b2e; --accent2:#f7a81b; --focus:#ff7a59; --bubble-in:#1b211e;
  --nav:rgba(19,23,21,.82); --grad:linear-gradient(135deg,#e63b2e 0%,#f26b1d 60%,#f7a81b 100%);
  --kgreen:#278e43; --kgold:#f7a81b; --kred:#e63b2e;
  --shadow:0 14px 36px rgba(0,0,0,.55);
}
:root[data-theme="light"]{
  --bg:#faf6ee; --card:#ffffff; --card2:#f3ede1; --border:#e7dfcf; --sub:#6f6a5e;
  --accent:#d92d20; --accent2:#e69500; --focus:#d92d20; --bubble-in:#f1eadb;
  --nav:rgba(255,255,255,.86); --shadow:0 12px 30px rgba(90,60,20,.14);
}
.kt{font-feature-settings:'liga','kern'}
.kt a,.link{color:var(--kgold)}
.kt ::selection{background:color-mix(in srgb,var(--accent2) 45%,transparent)}

/* ---------- floating nav ---------- */
.nav{margin:0 12px calc(10px + env(safe-area-inset-bottom));padding:8px 8px;border:1px solid color-mix(in srgb,var(--border) 80%,transparent);border-radius:28px;background:var(--nav);backdrop-filter:blur(22px) saturate(1.4);-webkit-backdrop-filter:blur(22px) saturate(1.4);box-shadow:0 10px 34px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.06)}
.nav button{border-radius:18px;transition:transform .15s,color .15s}
.nav button:active{transform:scale(.92)}
.nav button.on{color:var(--text)}
.nav button.on::after{content:'';position:absolute;bottom:-3px;width:5px;height:5px;border-radius:50%;background:var(--kgold);box-shadow:0 0 10px var(--kgold)}
.nav button.on svg{color:var(--kgold);filter:drop-shadow(0 0 8px rgba(247,168,27,.55))}
.nav .create{background:var(--grad);box-shadow:0 6px 20px rgba(230,59,46,.5),inset 0 1px 0 rgba(255,255,255,.35)}
.nav .create::after{display:none}
.nav .create svg{color:#fff;filter:none}

/* ---------- surfaces ---------- */
.card{border-radius:20px;border-color:color-mix(in srgb,var(--border) 85%,transparent);box-shadow:0 1px 0 rgba(255,255,255,.03) inset,0 6px 18px rgba(0,0,0,.18)}
.cardlist .listrow{padding-block:14px}
.sheet{border-top-left-radius:32px;border-top-right-radius:32px;box-shadow:0 -18px 50px rgba(0,0,0,.5)}
.sheet .grab{width:40px;height:4px;background:var(--sub);opacity:.35}
.sectionhead{color:var(--kgold);letter-spacing:.1em}
.input,.pill-input{border-radius:16px;background:var(--card2);border:1px solid var(--border);transition:border-color .15s,box-shadow .15s}
.input:focus,.pill-input:focus{outline:none;border-color:var(--accent2);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent2) 22%,transparent)}

/* ---------- buttons ---------- */
.btn{border-radius:16px;transition:transform .12s,box-shadow .2s,filter .2s}
.btn:active{transform:scale(.97)}
.btn.primary{box-shadow:0 8px 22px rgba(230,59,46,.38),inset 0 1px 0 rgba(255,255,255,.3);letter-spacing:.01em}
.btn.primary:hover{filter:brightness(1.06)}
.chip{border-radius:999px}
.chip.on,.seg button.on{background:var(--grad) !important;border-color:transparent !important;color:#fff !important;box-shadow:0 4px 14px rgba(230,59,46,.35)}
.seg{background:var(--card2);padding:4px}
.tabs button.on{border-bottom-color:var(--kgold);border-bottom-width:3px}
.tabs button.on svg{color:var(--kgold)}

/* ---------- stories & avatars ---------- */
.storyring.has{background:conic-gradient(from 210deg,#e63b2e,#f7a81b,#278e43,#e63b2e)}

/* ---------- profile ---------- */
.cover{background:radial-gradient(120% 90% at 85% 0%,rgba(247,168,27,.32),transparent 55%),radial-gradient(90% 90% at 0% 100%,rgba(39,142,67,.32),transparent 60%),linear-gradient(135deg,#2a0f0d,#14100a 60%,#0a0c0b) center/cover no-repeat}
.cover::before{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,${SUN}") 90% 15%/120px no-repeat;opacity:.12;pointer-events:none}
.cover[style*="url"]::before{display:none}

/* ---------- inbox / chat ---------- */
.ib-chip.on,.ibchip.on{background:color-mix(in srgb,var(--accent) 18%,transparent);border-color:var(--accent);color:var(--accent2)}
.chatrow{transition:background .15s}
.chatrow:active{background:var(--card2)}
.badge,.unread{background:var(--grad);color:#fff;box-shadow:0 2px 8px rgba(230,59,46,.4)}

/* ---------- auth: Kurdish welcome ---------- */
.auth{position:relative;overflow:hidden}
.auth::before{content:'';position:absolute;top:-70px;left:50%;width:340px;height:340px;margin-left:-170px;background:url("data:image/svg+xml,${SUN}") center/contain no-repeat;opacity:.1;pointer-events:none;animation:sunspin 120s linear infinite}
.auth::after{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#e63b2e 0 33.3%,#fff 33.3% 66.6%,#278e43 66.6%);opacity:.9}
@keyframes sunspin{to{transform:rotate(360deg)}}
.auth>*{position:relative;z-index:1}

/* ---------- toasts, switches ---------- */
.toast{border-radius:16px;backdrop-filter:blur(16px);box-shadow:0 10px 30px rgba(0,0,0,.45)}
.switch[aria-checked="true"]{background:var(--kgreen) !important}

/* ---------- story viewer ---------- */
.storymedia{object-fit:cover;background:transparent}
.storymedia.fit{object-fit:contain}
.storyview{background:#000}
.storyblur{position:absolute;inset:-30px;background-size:cover;background-position:center;filter:blur(30px) brightness(.5) saturate(1.2)}
.storyshade{background:linear-gradient(180deg,rgba(0,0,0,.6) 0%,transparent 22%,transparent 58%,rgba(0,0,0,.72) 100%)!important}
.storybars span{height:3px;background:rgba(255,255,255,.28);backdrop-filter:blur(4px)}
.storybars i{background:#fff;box-shadow:0 0 6px rgba(255,255,255,.6);transition:width .06s linear}
.storyhead{text-shadow:0 1px 6px rgba(0,0,0,.6)}
.storyhead .iconbtn{width:38px;height:38px;border-radius:50%;background:rgba(0,0,0,.28);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center}
.storycap{margin:0 0 12px;padding:10px 14px;border-radius:18px;background:rgba(0,0,0,.38);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);font-weight:600;line-height:1.5;text-align:start!important;align-self:flex-start;max-width:100%;border:1px solid rgba(255,255,255,.12)}
.storyreply{background:rgba(0,0,0,.35)!important;backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.28)!important;border-radius:999px!important}
.storyown .sb-btn{width:44px;height:44px;border-radius:50%;background:rgba(0,0,0,.32);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;margin-inline-start:8px}
.sb-views{background:rgba(0,0,0,.4)!important;border-color:rgba(255,255,255,.22)!important;box-shadow:0 4px 16px rgba(0,0,0,.35)}
.sb-views svg{color:var(--kgold)}
.storyreacts button{background:rgba(0,0,0,.35);backdrop-filter:blur(10px);border-radius:50%}

/* ---------- sheets & option menus (everywhere) ---------- */
.backdrop{backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);background:rgba(4,6,5,.55)}
.sheet{animation:sheetspring .34s cubic-bezier(.2,1.05,.3,1)}
@keyframes sheetspring{from{transform:translateY(60%);opacity:.4}to{transform:none;opacity:1}}
.sheet h3{font-size:1.05rem;font-weight:800}
.sheet .actions{grid-template-columns:repeat(4,1fr);gap:8px}
.action{background:transparent!important;border:0!important;padding:10px 2px 8px;gap:7px;box-shadow:none!important;font-size:.72rem;color:var(--text)}
.action .ico{width:54px;height:54px;border-radius:19px;background:var(--card2)!important;border:1px solid var(--border)!important;color:var(--text);transition:transform .15s,background .15s}
.action:active .ico{transform:scale(.9)}
.action.on .ico{background:var(--grad)!important;border-color:transparent!important;color:#fff}
.action.danger{color:var(--danger)}
.action.danger .ico{background:rgba(239,68,68,.12)!important;border-color:rgba(239,68,68,.35)!important;color:var(--danger)}
.sheet .frow{gap:10px;padding-bottom:4px}
.sheet .frow button{background:transparent;border:0;width:68px;padding:4px 2px;font-weight:700;color:var(--sub)}
.sheet .listrow{border-radius:14px}
.so-head{display:flex;align-items:center;gap:12px;padding-bottom:4px}
.so-label{font-size:.72rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--kgold);margin:0 4px 8px}
.so-list{display:flex;flex-direction:column;background:var(--card2);border:1px solid var(--border);border-radius:20px;overflow:hidden}
.so-row{display:flex;align-items:center;gap:12px;padding:13px 14px;font-weight:700;border-bottom:1px solid color-mix(in srgb,var(--border) 70%,transparent);transition:background .12s}
.so-row:last-child{border-bottom:0}
.so-row:active{background:color-mix(in srgb,var(--text) 7%,transparent)}
.so-ic{width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--text) 8%,transparent);flex:none}
.so-row.on{color:var(--kgold)}.so-row.on .so-ic{background:color-mix(in srgb,var(--kgold) 18%,transparent)}
.so-row.danger{color:var(--danger)}.so-row.danger .so-ic{background:rgba(239,68,68,.14)}
.sheet.tall .sc-list{max-height:none;flex:1;min-height:0}
.sc-list{padding-inline:2px}

/* ---------- fixes: sheets never clip, always scroll ---------- */
.sheet{overflow-y:auto;overscroll-behavior:contain}
.sheet>*{flex:none}
.sheet>.scroll,.sheet>.sc-list{flex:1 1 auto;min-height:0}
.so-list{flex:none}

/* ---------- LIGHT mode: clean, airy, modern ---------- */
:root[data-theme="light"],:root[data-paper="1"]{
  --bg:#f4f1ea; --card:#ffffff; --card2:#f6f3ec; --border:rgba(40,28,8,.09); --sub:#7a7468;
  --nav:rgba(255,255,255,.88); --kgold:#b86e00; --accent:#d92d20; --accent2:#e69500;
}
:root[data-theme="light"] body,:root[data-paper="1"] body,:root[data-paper="1"] .kt{background-image:none;background-color:var(--bg)}
:root[data-paper="1"] .sheet,:root[data-theme="light"] .sheet{background:#ffffff;border:0;border-top-left-radius:34px;border-top-right-radius:34px;box-shadow:0 -20px 60px rgba(40,25,5,.22)}
:root[data-paper="1"] .backdrop,:root[data-theme="light"] .backdrop{background:rgba(30,20,8,.38)}
:root[data-paper="1"] .sheet .grab{background:#d6cfc2;opacity:1}
:root[data-paper="1"] .so-list,:root[data-theme="light"] .so-list,
:root[data-paper="1"] .sheet .card,:root[data-theme="light"] .sheet .card{background:#fff;border:1px solid rgba(40,28,8,.07);box-shadow:0 1px 2px rgba(40,25,5,.04),0 8px 24px rgba(40,25,5,.07)}
:root[data-paper="1"] .so-row,:root[data-theme="light"] .so-row{border-bottom-color:rgba(40,28,8,.06);font-weight:700}
:root[data-paper="1"] .so-ic,:root[data-theme="light"] .so-ic{background:#f4f0e7}
:root[data-paper="1"] .so-row.on .so-ic{background:#fdf0d6}
:root[data-paper="1"] .so-row.danger .so-ic{background:#fde8e6}
:root[data-paper="1"] .so-label{color:#9a6208}
:root[data-paper="1"] .action .ico{background:#f6f2e9!important;border:0!important;box-shadow:inset 0 0 0 1px rgba(40,28,8,.06)}
:root[data-paper="1"] .action.danger .ico{background:#fde8e6!important;box-shadow:none}
:root[data-paper="1"] .action.on .ico{background:var(--grad)!important}
:root[data-paper="1"] .sheet .frow button{color:var(--text)}
:root[data-paper="1"] .nav{background:rgba(255,255,255,.9);border:1px solid rgba(40,28,8,.06);box-shadow:0 10px 30px rgba(40,25,5,.14)}
:root[data-paper="1"] .nav button{color:#8d8678}
:root[data-paper="1"] .nav button.on{color:#1d1708}
:root[data-paper="1"] .nav button.on svg{color:#e69500;filter:none}
:root[data-paper="1"] .nav button.on::after{background:#e69500;box-shadow:none}
:root[data-paper="1"] .chip,:root[data-paper="1"] .ib-chip,:root[data-paper="1"] .ibchip{background:#fff!important;border:1px solid rgba(40,28,8,.08)!important;box-shadow:0 1px 2px rgba(40,25,5,.04);color:#4b453a!important}
:root[data-paper="1"] .chip.on{background:var(--grad)!important;color:#fff!important;border-color:transparent!important}
:root[data-paper="1"] .card{background:#fff;border:1px solid rgba(40,28,8,.06);box-shadow:0 1px 2px rgba(40,25,5,.04),0 8px 24px rgba(40,25,5,.06)}
:root[data-paper="1"] .input,:root[data-paper="1"] .pill-input{background:#fff;border-color:rgba(40,28,8,.1)}
:root[data-paper="1"] .seg{background:#ece7db}
:root[data-paper="1"] .seg button{color:#6b6558}
:root[data-paper="1"] .storyring.seen{background:#d9d3c6}
:root[data-paper="1"] .sectionhead{color:#9a6208}
:root[data-paper="1"] .tabs button.on{border-bottom-color:#e69500}
:root[data-paper="1"] .tabs button.on svg{color:#e69500}
:root[data-paper="1"] .cover:not([style*="url"]){background:radial-gradient(120% 90% at 85% 0%,rgba(247,168,27,.45),transparent 55%),radial-gradient(90% 90% at 0% 100%,rgba(39,142,67,.3),transparent 60%),linear-gradient(135deg,#ffe0c2,#fff1dc 60%,#e3f2e5)}
:root[data-paper="1"] .cover::before{opacity:.28}

/* ---------- comments: modern, borderless ---------- */
.cm-input:focus-visible,.sc-input input:focus-visible,.storyreply input:focus-visible,.pill-input:focus-visible{outline:none!important}
.cm-compose{padding:5px 5px 5px 10px;background:var(--card2);border:1px solid var(--border);transition:border-color .15s,box-shadow .15s}
.cm-compose:focus-within{border-color:var(--accent2);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent2) 20%,transparent)}
.cm-compose .sendbtn{width:38px;height:38px;border-radius:50%;background:var(--grad);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(230,59,46,.35);transition:transform .12s,opacity .2s}
.cm-compose .sendbtn:active{transform:scale(.9)}
.cm-compose .sendbtn:disabled{background:var(--border);box-shadow:none;opacity:.7;color:var(--sub)}
.cm-emojis{gap:2px;padding:4px 6px;border-radius:999px;background:var(--card2);margin-bottom:2px}
.cm-emojis button{font-size:1.25rem;width:34px;height:34px}
.cm-empty{padding:56px 0 40px;gap:6px}
.cm-empty b{color:var(--text);font-size:1.02rem}
.cm-empty-ic{width:68px;height:68px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--accent2) 16%,transparent);color:var(--accent2);margin-bottom:6px}
.cm-bubble{background:none;border:0;padding:0;border-radius:0}
.cm-meta{font-size:.8rem}
.cm-text{font-size:.95rem;margin-top:3px}
.cm-count{background:color-mix(in srgb,var(--accent2) 18%,transparent);color:var(--kgold);border:0}
.cm-like.on{color:#ff2d55}
`;