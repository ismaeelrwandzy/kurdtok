/* KurdTok — settings2.tsx : privacy, preferences, support, verification, ads panels */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useApp } from './state';
import { ACCENTS, APP_ICON_PICKS, Icon, LANGS, PERM_KEYS, PLAN_DEFS, VerifiedBadge, makeAppIcon, pick } from './utils';
import type { Plan, ThemeMode } from './utils';
import { PERM_DESC, PERM_ICON, PERM_LABEL, Sheet, Switch } from './ui';
import { Row, SheetTitle } from './settings';
import type { Key } from './dict';
import { TermsSheet, termsLabel } from './auth';

const Chev = () => <Icon name="chevron" className="flip-rtl" size={18} />;

function Page({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Sheet label={title} onClose={onClose} tall>
      <SheetTitle title={title} onClose={onClose} />
      <div className="scroll s2page" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </Sheet>
  );
}

export function PrivacyPanel({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const { t, settings } = app;
  const set = (p: Partial<typeof settings>) => app.setSettings((s) => ({ ...s, ...p }));
  const lvl = (v: string): string => t(('priv.' + v) as Key);
  const cycle = <T extends string>(cur: T, opts: T[], f: (v: T) => void) => f(opts[(opts.indexOf(cur) + 1) % opts.length]);
  const A: ('all' | 'friends' | 'off')[] = ['all', 'friends', 'off'];
  const B: ('all' | 'friends' | 'me')[] = ['me', 'friends', 'all'];
  const val = (s: string) => <span className="sub">{lvl(s)}</span>;
  return (
    <Page title={t('settings.permissions')} onClose={onClose}>
      <div className="sectionhead">{t('priv.account')}</div>
      <div className="card cardlist">
        <Row icon="lock" label={t('priv.private')} desc={t('priv.privateDesc')}>
          <Switch checked={settings.privateAccount} label={t('priv.private')} onChange={(v) => set({ privateAccount: v })} />
        </Row>
        <Row icon="lock" label={t('priv.locked')} desc={t('priv.lockedDesc')} />
      </div>
      <div className="sectionhead">{t('priv.interactions')}</div>
      <div className="card cardlist">
        <Row icon="message" label={t('priv.comments')} onClick={() => cycle(settings.allowComments, A, (v) => set({ allowComments: v }))}>{val(settings.allowComments)}<Chev /></Row>
        <Row icon="send" label={t('priv.dm')} onClick={() => cycle(settings.allowDM, A, (v) => set({ allowDM: v }))}>{val(settings.allowDM)}<Chev /></Row>
        <Row icon="download" label={t('priv.downloads')}>
          <Switch checked={settings.allowDownloads} label={t('priv.downloads')} onChange={(v) => set({ allowDownloads: v })} />
        </Row>
        <Row icon="users" label={pick(settings.language, 'Public followers & following lists', 'لیستی فۆڵۆوەر و فۆڵۆکراو گشتی بێت', 'قوائم المتابعين والمتابَعين عامة')} desc={settings.listsPublic ? pick(settings.language, 'Anyone can open your lists', 'هەر کەسێک دەتوانێت لیستەکانت بکاتەوە', 'يمكن لأي شخص فتح قوائمك') : pick(settings.language, 'Only you can see your lists', 'تەنها تۆ لیستەکانت دەبینیت', 'أنت فقط ترى قوائمك')}>
          <Switch checked={settings.listsPublic} label="lists" onChange={(v) => set({ listsPublic: v })} />
        </Row>
        <Row icon="users" label={t('priv.following')} onClick={() => cycle(settings.showFollowing, B, (v) => set({ showFollowing: v }))}>{val(settings.showFollowing)}<Chev /></Row>
        <Row icon="heart" label={t('priv.liked')} onClick={() => cycle(settings.showLiked, B, (v) => set({ showLiked: v }))}>{val(settings.showLiked)}<Chev /></Row>
        <Row icon="eye" label={t('priv.viewers')}>
          <Switch checked={settings.showViewers} label={t('priv.viewers')} onChange={(v) => set({ showViewers: v })} />
        </Row>
      </div>
      <div className="sectionhead">{t('priv.devicePerms')}</div>
      <div className="card cardlist">
        {PERM_KEYS.map((k) => (
          <Row key={k} icon={PERM_ICON[k]} label={t(PERM_LABEL[k])} desc={t(PERM_DESC[k])}>
            <Switch checked={settings.permissions[k]} label={t(PERM_LABEL[k])} onChange={(v) => { app.setPermission(k, v); if (v) app.toast(t('toast.permissionGranted')); }} />
          </Row>
        ))}
      </div>
    </Page>
  );
}

export function PrefsPanel({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const { t, settings } = app;
  const [showKey, setShowKey] = useState(false);
  const set = (p: Partial<typeof settings>) => app.setSettings((s) => ({ ...s, ...p }));
  const seg = <T extends string | number>(value: T, options: { v: T; label: string }[], onPick: (v: T) => void) => (
    <div className="seg">
      {options.map((o) => (
        <button key={String(o.v)} type="button" className={value === o.v ? 'on' : ''} aria-pressed={value === o.v} onClick={() => onPick(o.v)}>{o.label}</button>
      ))}
    </div>
  );
  return (
    <Page title={t('settings.preferences')} onClose={onClose}>
      <div className="sectionhead">{t('pref.display')}</div>
      <div className="card cardlist">
        <Row icon="globe" label={t('settings.language')}>{seg(settings.language, LANGS.map((l) => ({ v: l.code, label: l.label })), (v) => set({ language: v }))}</Row>
        <Row icon="moon" label={t('settings.theme')}>
          {seg<ThemeMode>(settings.theme, [{ v: 'dark', label: t('settings.themeDark') }, { v: 'light', label: t('settings.themeLight') }, { v: 'system', label: t('settings.themeSystem') }], (v) => set({ theme: v }))}
        </Row>
        <Row icon="edit" label={t('settings.textSize')}>
          {seg(settings.textSize, [{ v: 'sm', label: t('settings.sizeSm') }, { v: 'md', label: t('settings.sizeMd') }, { v: 'lg', label: t('settings.sizeLg') }], (v) => set({ textSize: v }))}
        </Row>
      </div>
      <div className="sectionhead">{t('pref.playback')}</div>
      <div className="card cardlist">
        <Row icon="play" label={t('settings.autoplay')} desc={t('settings.autoplayDesc')}><Switch checked={settings.autoplay} label={t('settings.autoplay')} onChange={(v) => set({ autoplay: v })} /></Row>
        <Row icon="refresh" label={t('share.autoScroll')} desc={t('settings.autoScrollDesc')}><Switch checked={settings.autoScroll} label={t('share.autoScroll')} onChange={(v) => set({ autoScroll: v })} /></Row>
        {settings.autoScroll ? <Row icon="info" label={t('settings.autoScrollSeconds')}>{seg(settings.autoScrollSeconds, [3, 5, 10].map((n) => ({ v: n, label: `${n}s` })), (v) => set({ autoScrollSeconds: v }))}</Row> : null}
      </div>
      <div className="sectionhead">{t('pref.accessibility')}</div>
      <div className="card cardlist">
        <Row icon="sparkles" label={t('settings.reduceMotion')} desc={t('settings.reduceMotionDesc')}><Switch checked={settings.reduceMotion} label={t('settings.reduceMotion')} onChange={(v) => set({ reduceMotion: v })} /></Row>
      </div>
      <div className="sectionhead">{t('settings.notifications')}</div>
      <div className="card cardlist">
        <Row icon="bell" label={t('settings.notifications')} desc={t('settings.notificationsDesc')}><Switch checked={settings.notifications} label={t('settings.notifications')} onChange={(v) => void app.setNotifications(v)} /></Row>
        <Row icon="message" label={t('settings.notifyMessages')} desc={t('settings.notifyMessagesDesc')}><Switch checked={settings.notifyMessages} label={t('settings.notifyMessages')} onChange={(v) => set({ notifyMessages: v })} /></Row>
      </div>
      <div className="sectionhead">{pick(settings.language, 'Activity feed', 'لیستی چالاکییەکان', 'سجل النشاط')}</div>
      <div className="card cardlist">
        <Row icon="heart" label={pick(settings.language, 'Likes', 'لایکەکان', 'الإعجابات')}><Switch checked={settings.notifyLikes} label="likes" onChange={(v) => set({ notifyLikes: v })} /></Row>
        <Row icon="message" label={pick(settings.language, 'Comments', 'کۆمێنتەکان', 'التعليقات')}><Switch checked={settings.notifyComments} label="comments" onChange={(v) => set({ notifyComments: v })} /></Row>
        <Row icon="eye" label={pick(settings.language, 'Profile visits', 'سەردانی پڕۆفایل', 'زيارات الملف')}><Switch checked={settings.notifyVisits} label="visits" onChange={(v) => set({ notifyVisits: v })} /></Row>
      </div>
      <div className="sectionhead">{t('settings.ai')}</div>
      <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="field">
          <label htmlFor="gk">{t('settings.geminiKey')}</label>
          <div className="row">
            <input id="gk" className="input" dir="ltr" type={showKey ? 'text' : 'password'} autoComplete="off" value={settings.geminiKey} placeholder="AIza…" onChange={(e) => set({ geminiKey: e.target.value })} />
            <button type="button" className="iconbtn" onClick={() => setShowKey((v) => !v)} aria-label={t('settings.showKey')}><Icon name={showKey ? 'eyeOff' : 'eye'} /></button>
          </div>
          <span className="small sub">{t('settings.geminiNote')}</span>
        </div>
        <div className="field">
          <label htmlFor="gm">{t('settings.geminiModel')}</label>
          <input id="gm" className="input" dir="ltr" value={settings.geminiModel} onChange={(e) => set({ geminiModel: e.target.value })} />
        </div>
      </div>
    </Page>
  );
}

export function SupportPanel({ onClose, onAbout }: { onClose: () => void; onAbout: () => void }) {
  const app = useApp();
  const { t, settings } = app;
  const [open, setOpen] = useState(0);
  const [form, setForm] = useState<'report' | 'feedback' | null>(null);
  const [terms, setTerms] = useState(false);
  const [text, setText] = useState('');
  const faq = [1, 2, 3, 4, 5] as const;
  const send = () => {
    try {
      const k = 'kurdtok:v1:reports';
      const l = JSON.parse(window.localStorage.getItem(k) ?? '[]') as unknown[];
      l.push({ kind: form, text, at: Date.now() });
      window.localStorage.setItem(k, JSON.stringify(l));
    } catch { /* ignore */ }
    app.toast(t('sup.sent'));
    setText('');
    setForm(null);
  };
  const openAi = () => {
    if (!app.perks.ai) { onClose(); app.push({ name: 'settings', panel: 'verify' }); return; }
    onClose();
    app.resetNav();
    app.setTab('inbox');
  };
  return (
    <Page title={t('sup.title')} onClose={onClose}>
      <div className="card cardlist">
        <Row icon="sparkles" label={t('sup.ai')} desc={app.perks.ai ? t('sup.aiDesc') : t('sup.aiLocked')} onClick={openAi}><Chev /></Row>
        <Row icon="flag" label={t('sup.report')} onClick={() => setForm('report')}><Chev /></Row>
        <Row icon="message" label={t('sup.feedback')} onClick={() => setForm('feedback')}><Chev /></Row>
        <Row icon="shield" label={termsLabel(settings.language)} onClick={() => setTerms(true)}><Chev /></Row>
        <Row icon="info" label={t('settings.about')} onClick={onAbout}><Chev /></Row>
      </div>
      {terms ? <TermsSheet onClose={() => setTerms(false)} /> : null}
      {form ? (
        <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <b>{t(form === 'report' ? 'sup.report' : 'sup.feedback')}</b>
          <textarea className="input" rows={4} placeholder={t('sup.reportPh')} value={text} onChange={(e) => setText(e.target.value)} />
          <button type="button" className="btn primary sm" disabled={text.trim().length < 3} onClick={send}>{t('sup.send')}</button>
        </div>
      ) : null}
      <div className="sectionhead">{t('sup.help')}</div>
      <div className="card cardlist">
        {faq.map((n, i) => (
          <div key={n}>
            <button type="button" className="listrow" onClick={() => setOpen(open === i + 1 ? 0 : i + 1)}>
              <span className="grow" style={{ fontWeight: 600 }}>{t(('sup.q' + n) as Key)}</span>
            </button>
            {open === i + 1 ? <p className="small sub" style={{ margin: 0, padding: '0 16px 12px' }}>{t(('sup.a' + n) as Key)}</p> : null}
          </div>
        ))}
      </div>
      <div className="sectionhead">{t('sup.guidelines')}</div>
      <p className="small sub" style={{ margin: 0 }}>{t('sup.guidelinesBody')}</p>
    </Page>
  );
}

const PLAN_FEATS: Record<Plan['id'], Key[]> = {
  standard: ['verify.f.badge1m', 'verify.f.ai1m'],
  pro: ['verify.f.badge1m', 'verify.f.aiPro', 'verify.f.theme', 'verify.f.story2', 'verify.f.icon'],
  yearly: ['verify.f.badge1y', 'verify.f.aiUnl', 'verify.f.theme', 'verify.f.story7', 'verify.f.icon', 'verify.f.yearEdit'],
};

export function VerifyPanel({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const { t, settings } = app;
  const ids: Plan['id'][] = ['standard', 'pro', 'yearly'];
  const ask = (id: Plan['id']) =>
    app.askConfirm({
      title: t('verify.confirmTitle', { plan: t(('verify.p.' + id) as Key) }),
      body: t('verify.confirmBody'),
      confirmLabel: t('verify.request'),
      onConfirm: () => { app.subscribe(id); app.toast(t('verify.activated')); },
    });
  const set = (p: Partial<typeof settings>) => app.setSettings((s) => ({ ...s, ...p }));
  return (
    <Page title={t('verify.title')} onClose={onClose}>
      <p className="sub small" style={{ margin: 0 }}>{t('verify.subtitle')}</p>
      <div className="card" style={{ padding: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
        {app.planActive ? <VerifiedBadge size={22} /> : <Icon name="shield" size={22} />}
        <div className="grow">
          <b>{t('verify.current')}: {app.isOwner ? t('verify.owner') : app.plan && app.planActive ? t(('verify.p.' + app.plan.id) as Key) : t('verify.none')}</b>
          {app.plan && app.planActive && !app.isOwner ? <div className="small sub">{t('verify.until', { date: new Date(app.plan.end).toLocaleDateString() })}</div> : null}
        </div>
        {app.planActive && !app.isOwner ? <button type="button" className="btn sm danger" onClick={() => app.cancelPlan()}>{t('verify.cancel')}</button> : null}
      </div>
      {ids.map((id) => (
        <div key={id} className={`plancard${id === 'pro' ? ' hot' : ''}`} data-plan={id}>
          {id !== 'standard' ? <span className="planflag">{t(id === 'pro' ? 'verify.popular' : 'verify.best')}</span> : null}
          <div className="row between"><h3 style={{ margin: 0 }}>{t(('verify.p.' + id) as Key)}</h3>
            <div><b style={{ fontSize: '1.3rem' }}>{PLAN_DEFS[id].price.toLocaleString('en-US')}</b> <span className="sub small">{t('verify.iqd')} {t(id === 'yearly' ? 'verify.perYear' : 'verify.perMonth')}</span></div>
          </div>
          {id !== 'standard' ? <div className="iconstrip">{APP_ICON_PICKS.slice(0, id === 'pro' ? 6 : 12).map((i) => <img key={i.id} src={makeAppIcon(i.id)} alt="" width={36} height={36} />)}</div> : null}
          <ul className="planlist">{PLAN_FEATS[id].map((k) => <li key={k}><Icon name="check" size={15} /> {t(k)}</li>)}</ul>
          <button type="button" className="btn primary block" disabled={app.plan?.id === id && app.planActive} onClick={() => ask(id)}>
            {app.plan?.id === id && app.planActive ? t('verify.current') : t('verify.request')}
          </button>
        </div>
      ))}
      <div className="sectionhead">{t('verify.customize')}</div>
      <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, opacity: app.perks.theme ? 1 : 0.55 }}>
        <b>{t('verify.theme')}</b>
        <div className="swatches">
          {ACCENTS.map((a) => (
            <button key={a.id} type="button" disabled={!app.perks.theme} aria-label={a.id} className={settings.accent === a.id ? 'on' : ''} style={{ background: `linear-gradient(135deg,${a.bg} 0 40%,${a.a} 40% 70%,${a.b} 70%)`, borderColor: settings.accent === a.id ? '#fff' : 'rgba(255,255,255,.25)' }} onClick={() => set({ accent: a.id })} />
          ))}
        </div>
        <b>{t('verify.icon')}</b>
        <div className="swatches icons">
          {APP_ICON_PICKS.map((i) => (
            <button key={i.id} type="button" disabled={!app.perks.icon} aria-label={i.id} className={settings.appIcon === i.id || (i.id === 'k1' && !/^k\d+$/.test(settings.appIcon)) ? 'on' : ''} onClick={() => set({ appIcon: i.id })}>
              <img src={makeAppIcon(i.id, 96)} alt="" width={54} height={54} />
            </button>
          ))}
        </div>
        <span className="small sub">{t('verify.iconNote')}</span>
        {!app.perks.theme ? <span className="small" style={{ color: 'var(--accent)' }}>{t('verify.locked')}</span> : null}
        <span className="small sub">{t('verify.storyLen', { n: String(app.perks.storyDays) })}</span>
      </div>
    </Page>
  );
}

export function AdsPanel({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const { t, settings } = app;
  const mine = app.posts.filter((p) => p.mine && !p.story);
  const [kind, setKind] = useState<'post' | 'account' | 'link'>('post');
  const [title, setTitle] = useState('');
  const [postId, setPostId] = useState('');
  const [link, setLink] = useState('');
  const [aud, setAud] = useState('all');
  const [days, setDays] = useState(7);
  const ok = title.trim().length > 1 && (kind !== 'post' || postId) && (kind !== 'link' || link.trim());
  const submit = () => {
    app.addAd({ kind, title: title.trim(), postId: kind === 'post' ? postId : undefined, link: kind === 'link' ? link.trim() : undefined, audience: aud, days });
    app.toast(t('ads.sent'));
    setTitle(''); setLink(''); setPostId('');
  };
  return (
    <Page title={t('ads.title')} onClose={onClose}>
      <div className="card" style={{ padding: 12 }}><p className="small sub" style={{ margin: 0 }}>{t('ads.pricing')}</p></div>
      <div className="sectionhead">{t('ads.new')}</div>
      <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="seg">
          {(['post', 'account', 'link'] as const).map((k) => <button key={k} type="button" className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{t(('ads.k.' + k) as Key)}</button>)}
        </div>
        <input className="input" placeholder={t('ads.titleField')} aria-label={t('ads.titleField')} value={title} onChange={(e) => setTitle(e.target.value)} />
        {kind === 'post' ? (mine.length === 0 ? <span className="small sub">{t('ads.noPosts')}</span> : (
          <select className="input" aria-label={t('ads.pickPost')} value={postId} onChange={(e) => setPostId(e.target.value)}>
            <option value="">{t('ads.pickPost')}</option>
            {mine.map((p) => <option key={p.id} value={p.id}>{p.caption.slice(0, 40) || p.id}</option>)}
          </select>
        )) : null}
        {kind === 'link' ? <input className="input" dir="ltr" placeholder={t('ads.link')} aria-label={t('ads.link')} value={link} onChange={(e) => setLink(e.target.value)} /> : null}
        <select className="input" aria-label={t('ads.audience')} value={aud} onChange={(e) => setAud(e.target.value)}>
          {(['all', 'followers', 'local'] as const).map((a) => <option key={a} value={a}>{t(('ads.aud.' + a) as Key)}</option>)}
        </select>
        <div className="row between"><span>{t('ads.days')}</span><div className="seg">{[3, 7, 14, 30].map((d) => <button key={d} type="button" className={days === d ? 'on' : ''} onClick={() => setDays(d)}>{d}</button>)}</div></div>
        <button type="button" className="btn primary" disabled={!ok} onClick={submit}>{t('ads.submit')}</button>
      </div>
      <div className="sectionhead">{t('ads.list')}</div>
      {app.ads.length === 0 ? <div className="small sub">{t('ads.empty')}</div> : (
        <div className="card cardlist">
          {app.ads.map((a) => (
            <div key={a.id} className="listrow">
              <Icon name="sparkles" size={18} />
              <div className="grow"><b>{a.title}</b><div className="small sub">{t(('ads.k.' + a.kind) as Key)} · {a.days}d · {t(a.status === 'pending' ? 'ads.pending' : 'ads.cancelled')}</div></div>
              {a.status === 'pending' ? <button type="button" className="btn sm" onClick={() => app.cancelAd(a.id)}>{t('ads.cancel')}</button> : null}
            </div>
          ))}
        </div>
      )}
      <div className="sectionhead">{t('ads.personal')}</div>
      <div className="card cardlist">
        <Row icon="eye" label={t('ads.personal')} desc={t('ads.personalDesc')}>
          <Switch checked={settings.personalAds} label={t('ads.personal')} onChange={(v) => app.setSettings((s) => ({ ...s, personalAds: v }))} />
        </Row>
      </div>
      <p className="small sub" style={{ margin: 0 }}>{t('ads.note')}</p>
    </Page>
  );
}

export const S2_CSS = `
.s2page>*{flex:none !important}
.plancard{position:relative;border:1px solid var(--line,rgba(255,255,255,.12));background:var(--card,rgba(255,255,255,.05));border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:12px}
.plancard.hot{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset}
.planflag{position:absolute;top:-10px;inset-inline-end:14px;background:linear-gradient(90deg,var(--accent),var(--accent2));color:#fff;font-size:.7rem;font-weight:800;padding:3px 10px;border-radius:99px}
.planlist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
.planlist li{display:flex;gap:8px;align-items:center;color:var(--accent)}
.planlist li{color:inherit}.planlist li svg{color:var(--ok);flex:none}
.swatches{display:flex;gap:10px;flex-wrap:wrap}
.swatches button{width:40px;height:40px;border-radius:50%;border:3px solid transparent;padding:0;overflow:hidden}
.swatches.icons button{border-radius:14px;width:60px;height:60px;background:none}
.iconstrip{display:flex;gap:6px;flex-wrap:wrap}.iconstrip img{border-radius:9px}
.swatches button.on{border-color:#fff;box-shadow:0 0 0 2px var(--accent)}
.swatches button:disabled{opacity:.6}
`;
