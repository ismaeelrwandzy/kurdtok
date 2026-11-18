/* KurdTok — settings.tsx */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useApp } from './state';
import { APP_VERSION, Icon, STORE_PREFIX, authorByName, copyText, formatBytes, randomSecret, totpUri } from './utils';
import { TrashPanel } from './trash';
import { AccountRows } from './account';
import { TfaCard } from './otp';
import { AdsPanel, PrefsPanel, PrivacyPanel, SupportPanel, VerifyPanel } from './settings2';
import { Avatar, Sheet, TopBar } from './ui';

type Panel = 'security' | 'blocked' | 'about' | 'trash' | 'privacy' | 'prefs' | 'support' | 'verify' | 'ads' | null;
type Msg = { ok: boolean; text: string } | null;

export function Row({ icon, label, desc, children, onClick }: { icon: string; label: string; desc?: string; children?: ReactNode; onClick?: () => void }) {
  const inner = (
    <>
      <span style={{ color: 'var(--accent)' }}><Icon name={icon} size={20} /></span>
      <div className="grow">
        <div style={{ fontWeight: 600 }}>{label}</div>
        {desc ? <div className="small sub">{desc}</div> : null}
      </div>
      {children}
    </>
  );
  return onClick ? (
    <button type="button" className="listrow" onClick={onClick}>{inner}</button>
  ) : (
    <div className="listrow">{inner}</div>
  );
}

function Notice({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return <p className={msg.ok ? 'small' : 'errtext'} style={msg.ok ? { color: 'var(--ok)', margin: 0 } : undefined} role="status">{msg.text}</p>;
}

export function SheetTitle({ title, onClose }: { title: string; onClose: () => void }) {
  const { t } = useApp();
  return (
    <div className="row between">
      <h3 style={{ margin: 0 }}>{title}</h3>
      <button type="button" className="iconbtn" onClick={onClose} aria-label={t('common.close')}><Icon name="x" /></button>
    </div>
  );
}

function SecurityPanel({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const { t } = app;
  const acc = app.account;
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [pwMsg, setPwMsg] = useState<Msg>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [offPw, setOffPw] = useState('');
  const [twoMsg, setTwoMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  const changePw = async () => {
    if (newPw.length < 6) return setPwMsg({ ok: false, text: t('auth.errPassword') });
    if (newPw !== newPw2) return setPwMsg({ ok: false, text: t('security.mismatch') });
    setBusy(true);
    const err = await app.changePassword(oldPw, newPw);
    setBusy(false);
    if (err) return setPwMsg({ ok: false, text: t(err) });
    setPwMsg({ ok: true, text: t('security.pwChanged') });
    setOldPw('');
    setNewPw('');
    setNewPw2('');
  };

  const enable = async () => {
    if (!secret) return;
    setBusy(true);
    const err = await app.confirmTotp(secret, code);
    setBusy(false);
    if (err) return setTwoMsg({ ok: false, text: t(err) });
    setSecret(null);
    setCode('');
    setTwoMsg({ ok: true, text: t('security.twoOn') });
  };

  const disable = async () => {
    setBusy(true);
    const err = await app.disableTotp(offPw);
    setBusy(false);
    if (err) return setTwoMsg({ ok: false, text: t(err) });
    setOffPw('');
    setTwoMsg({ ok: true, text: t('security.twoOff') });
  };

  return (
    <Sheet label={t('security.title')} onClose={onClose} tall>
      <SheetTitle title={t('security.title')} onClose={onClose} />
      <div className="scroll" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!acc ? (
          <div className="card center" style={{ padding: 18 }}>
            <Icon name="lock" size={30} />
            <p className="sub" style={{ margin: '8px 0 12px' }}>{t('security.needAccount')}</p>
            <button type="button" className="btn primary sm" onClick={() => { onClose(); app.logout(); }}>{t('auth.register')}</button>
          </div>
        ) : (
          <>
            <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <b>{t('security.changePassword')}</b>
              <input className="input" type="password" dir="ltr" autoComplete="current-password" placeholder={t('security.current')} aria-label={t('security.current')} value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
              <input className="input" type="password" dir="ltr" autoComplete="new-password" placeholder={t('security.new')} aria-label={t('security.new')} value={newPw} onChange={(e) => setNewPw(e.target.value)} />
              <input className="input" type="password" dir="ltr" autoComplete="new-password" placeholder={t('security.confirm')} aria-label={t('security.confirm')} value={newPw2} onChange={(e) => setNewPw2(e.target.value)} />
              <Notice msg={pwMsg} />
              <button type="button" className="btn primary sm" disabled={busy || !oldPw || !newPw} onClick={() => void changePw()}>{t('common.save')}</button>
            </div>

            <TfaCard />

            <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="row between">
                <b>{t('security.twoFactor')}</b>
                <span className={`chip${acc.totpOn ? ' on' : ''}`}>{acc.totpOn ? t('security.statusOn') : t('security.statusOff')}</span>
              </div>
              <p className="small sub" style={{ margin: 0 }}>{t('security.twoDesc')}</p>
              {acc.totpOn ? (
                <>
                  <input className="input" type="password" dir="ltr" placeholder={t('security.current')} aria-label={t('security.current')} value={offPw} onChange={(e) => setOffPw(e.target.value)} />
                  <button type="button" className="btn danger sm" disabled={busy || !offPw} onClick={() => void disable()}>{t('security.disable')}</button>
                </>
              ) : secret ? (
                <>
                  <span className="small sub">{t('security.secretLabel')}</span>
                  <div className="row">
                    <code dir="ltr" style={{ flex: 1, padding: '10px 12px', background: 'var(--bg)', borderRadius: 10, wordBreak: 'break-all', userSelect: 'all' }}>{secret}</code>
                    <button type="button" className="iconbtn" aria-label={t('share.copyLink')} onClick={() => void copyText(secret).then((ok) => app.toast(t(ok ? 'toast.copied' : 'toast.error')))}><Icon name="link" size={18} /></button>
                  </div>
                  <a className="small" href={totpUri(secret, acc.username)}>{t('security.openApp')}</a>
                  <input className="input" dir="ltr" inputMode="numeric" maxLength={6} placeholder="123456" aria-label={t('security.codeLabel')} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
                  <button type="button" className="btn primary sm" disabled={busy || code.length !== 6} onClick={() => void enable()}>{t('security.enable')}</button>
                </>
              ) : (
                <button type="button" className="btn primary sm" onClick={() => { setSecret(randomSecret()); setTwoMsg(null); }}>{t('security.setup')}</button>
              )}
              <Notice msg={twoMsg} />
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

function BlockedPanel({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const { t } = app;
  return (
    <Sheet label={t('settings.blocked')} onClose={onClose}>
      <SheetTitle title={t('settings.blocked')} onClose={onClose} />
      <div className="scroll">
        {app.blocked.length === 0 ? <div className="empty sub" style={{ height: 'auto' }}>{t('settings.blockedEmpty')}</div> : null}
        <div className="card cardlist">
          {app.blocked.map((u) => {
            const a = authorByName(u);
            return (
              <div key={u} className="listrow">
                <Avatar emoji={a?.emoji} name={a?.name ?? u} color={a?.color} size={38} />
                <span className="grow">@{u}</span>
                <button type="button" className="btn sm" onClick={() => app.toggleBlock(u)}>{t('block.undo')}</button>
              </div>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}

function AboutPanel({ onClose }: { onClose: () => void }) {
  const { t } = useApp();
  return (
    <Sheet label={t('settings.about')} onClose={onClose} tall>
      <SheetTitle title={t('settings.about')} onClose={onClose} />
      <div className="scroll" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="center">
          <div className="logo" style={{ width: 60, height: 60, borderRadius: 18 }}><Icon name="play" size={26} fill="currentColor" /></div>
          <h3 style={{ margin: '10px 0 0' }}>{t('app.name')}</h3>
          <div className="small sub">{t('settings.version', { v: APP_VERSION })}</div>
        </div>
        <p style={{ margin: 0 }}>{t('about.body')}</p>
        <b>{t('about.privacyTitle')}</b>
        <p className="sub" style={{ margin: 0 }}>{t('about.privacyBody')}</p>
        <b>{t('about.termsTitle')}</b>
        <p className="sub" style={{ margin: 0 }}>{t('about.termsBody')}</p>
      </div>
    </Sheet>
  );
}

export function SettingsScreen({ initialPanel }: { initialPanel?: 'verify' | 'ads' }) {
  const app = useApp();
  const { t } = app;
  const [panel, setPanel] = useState<Panel>(initialPanel ?? null);
  const [usage, setUsage] = useState('');

  useEffect(() => {
    let cancelled = false;
    let n = 0;
    try {
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(STORE_PREFIX)) n += (k.length + (window.localStorage.getItem(k)?.length ?? 0)) * 2;
      }
    } catch {
      /* ignore */
    }
    setUsage(formatBytes(n));
    const est = navigator.storage?.estimate?.();
    if (est) {
      void est.then((e) => {
        if (!cancelled && typeof e.usage === 'number') setUsage(formatBytes(e.usage));
      }).catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [app.messages, app.aiHistory, app.posts]);

  return (
    <div className="overlay">
      <TopBar title={t('settings.title')} onBack={app.pop} />
      <div className="scroll">
        <div className="page">
          <div className="sectionhead">{t('settings.account')}</div>
          <AccountRows onSecurity={() => setPanel('security')} onBlocked={() => setPanel('blocked')} />

          <div className="sectionhead">{t('settings.preferences')}</div>
          <div className="card cardlist">
            <Row icon="shield" label={t('settings.permissions')} desc={t('sp.privacySub')} onClick={() => setPanel('privacy')}><Icon name="chevron" className="flip-rtl" size={18} /></Row>
            <Row icon="settings" label={t('settings.preferences')} desc={t('sp.prefSub')} onClick={() => setPanel('prefs')}><Icon name="chevron" className="flip-rtl" size={18} /></Row>
          </div>

          <div className="sectionhead">{t('verify.title')}</div>
          <div className="card cardlist">
            <Row icon="check" label={t('verify.title')} desc={app.isOwner ? t('verify.owner') : app.planActive ? t('verify.current') + ': ' + t(('verify.p.' + (app.plan?.id ?? 'standard')) as never) : t('sp.verifySub')} onClick={() => setPanel('verify')}><Icon name="chevron" className="flip-rtl" size={18} /></Row>
            <Row icon="sparkles" label={t('ads.title')} desc={t('sp.adsSub')} onClick={() => setPanel('ads')}><Icon name="chevron" className="flip-rtl" size={18} /></Row>
          </div>

          <div className="sectionhead">{t('settings.data')}</div>
          <div className="card cardlist">
            <Row icon="download" label={t('settings.storageUsed')}><b>{usage || '…'}</b></Row>
            <Row icon="trash" label={t('trash.title')} desc={t('trash.count', { n: String(app.trash.length) })} onClick={() => setPanel('trash')}><Icon name="chevron" className="flip-rtl" size={18} /></Row>
            <Row icon="message" label={t('settings.clearChats')} onClick={() => app.askConfirm({ title: t('settings.clearChats'), body: t('settings.clearChatsBody'), confirmLabel: t('chat.clear'), danger: true, onConfirm: app.clearAllChats })} />
            <Row icon="sparkles" label={t('settings.clearAi')} onClick={() => app.askConfirm({ title: t('settings.clearAi'), body: t('settings.clearAiBody'), confirmLabel: t('chat.clear'), danger: true, onConfirm: app.clearAi })} />
          </div>

          <div className="sectionhead">{t('sup.title')}</div>
          <div className="card cardlist">
            <Row icon="info" label={t('sup.title')} desc={t('sp.supportSub')} onClick={() => setPanel('support')}><Icon name="chevron" className="flip-rtl" size={18} /></Row>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22 }}>
            <button type="button" className="btn danger block" onClick={() => app.askConfirm({ title: t('settings.resetTitle'), body: t('settings.resetBody'), confirmLabel: t('settings.reset'), danger: true, onConfirm: () => void app.resetAll() })}>
              <Icon name="trash" size={18} /> {t('settings.reset')}
            </button>
            <button type="button" className="btn danger block" onClick={() => app.askConfirm({ title: t('common.logout'), body: t('settings.logoutBody'), confirmLabel: t('common.logout'), danger: true, onConfirm: app.logout })}>
              <Icon name="logout" size={18} /> {t('common.logout')}
            </button>
          </div>
          <p className="center small sub" style={{ marginTop: 18 }}>{t('app.name')} · {t('settings.version', { v: APP_VERSION })}</p>
        </div>
      </div>

      {panel === 'security' ? <SecurityPanel onClose={() => setPanel(null)} /> : null}
      {panel === 'blocked' ? <BlockedPanel onClose={() => setPanel(null)} /> : null}
      {panel === 'trash' ? <TrashPanel onClose={() => setPanel(null)} /> : null}
      {panel === 'privacy' ? <PrivacyPanel onClose={() => setPanel(null)} /> : null}
      {panel === 'prefs' ? <PrefsPanel onClose={() => setPanel(null)} /> : null}
      {panel === 'support' ? <SupportPanel onClose={() => setPanel(null)} onAbout={() => setPanel('about')} /> : null}
      {panel === 'verify' ? <VerifyPanel onClose={() => setPanel(null)} /> : null}
      {panel === 'ads' ? <AdsPanel onClose={() => setPanel(null)} /> : null}
      {panel === 'about' ? <AboutPanel onClose={() => setPanel(null)} /> : null}
    </div>
  );
}

