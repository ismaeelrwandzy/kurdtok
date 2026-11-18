/* KurdTok — chatinfo.tsx : chat settings page (wallpaper, mute, pin, report, block) */
import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useApp } from './state';
import { Icon, WALLPAPERS, authorByName, resizeImage } from './utils';
import { Avatar, Sheet, Switch, TopBar } from './ui';
import { Row } from './settings';
import type { Key } from './dict';

export const chatBus = { search: '' };

const REASONS = ['spam', 'harass', 'inappropriate', 'fake', 'other'] as const;

export function wallpaperStyle(w?: string): CSSProperties | undefined {
  if (!w) return undefined;
  if (w.startsWith('img:')) return { backgroundImage: `linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.35)),url(${w.slice(4)})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  const css = WALLPAPERS.find((x) => x.id === w)?.css;
  return css ? { background: css } : undefined;
}

export function ChatInfoScreen({ chatId }: { chatId: string }) {
  const app = useApp();
  const { t } = app;
  const chat = app.chats.find((c) => c.id === chatId);
  const [wall, setWall] = useState(false);
  const [report, setReport] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!chat) return null;
  const peer = chat.peer;
  const known = peer ? authorByName(peer) : undefined;
  const set = (p: Parameters<typeof app.updateChat>[1]) => app.updateChat(chatId, p);
  const chip = (icon: string, label: string, onClick: () => void) => (
    <button type="button" className="qa" onClick={onClick}>
      <span><Icon name={icon} size={22} /></span>
      <small>{label}</small>
    </button>
  );
  const onFile = async (f: File | undefined) => {
    if (!f || !f.type.startsWith('image/')) return;
    try {
      const url = await resizeImage(f, 900, 0.78);
      set({ wallpaper: `img:${url}` });
      setWall(false);
    } catch {
      app.toast(t('toast.error'));
    }
  };
  const doBlock = () => {
    if (!peer) return;
    if (app.isBlocked(peer)) {
      app.toggleBlock(peer);
      return;
    }
    app.askConfirm({ title: t('block.title', { user: peer }), body: t('block.body'), confirmLabel: t('block.action'), danger: true, onConfirm: () => { app.toggleBlock(peer); app.pop(); } });
  };
  return (
    <div className="overlay">
      <TopBar title={t('chat.info')} onBack={app.pop} />
      <div className="scroll">
        <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Avatar emoji={chat.emoji} name={chat.name} color={chat.color} size={92} />
            <h2 style={{ margin: 0 }}>{chat.name}</h2>
            {peer ? <div className="sub small">@{peer}</div> : null}
            {chat.bio ? <p className="sub small" style={{ margin: 0 }}>{chat.bio}</p> : null}
          </div>
          <div className="qrow">
            {known ? chip('user', t('chat.viewProfile'), () => app.push({ name: 'user', username: peer as string })) : null}
            {chip('search', t('chat.search'), () => { chatBus.search = chatId; app.pop(); })}
            {chip('image', t('chat.wallpaper'), () => setWall(true))}
            {chip('bell', t(chat.muted ? 'chat.unmute' : 'chat.mute'), () => app.toggleMute(chatId))}
          </div>

          <div className="card cardlist">
            <Row icon="image" label={t('chat.wallpaper')} desc={t('chat.wallpaperDesc')} onClick={() => setWall(true)}><Icon name="chevron" className="flip-rtl" size={18} /></Row>
            <Row icon="bell" label={t('chat.muteMessages')}><Switch checked={chat.muted} label={t('chat.muteMessages')} onChange={() => app.toggleMute(chatId)} /></Row>
            {!chat.isGroup ? <Row icon="phone" label={t('chat.muteCalls')}><Switch checked={!!chat.muteCalls} label={t('chat.muteCalls')} onChange={(v) => set({ muteCalls: v })} /></Row> : null}
            <Row icon="pin" label={t('chat.pin')}><Switch checked={!!chat.pinned} label={t('chat.pin')} onChange={(v) => { set({ pinned: v }); app.toast(t(v ? 'chat.pinned' : 'chat.unpinned')); }} /></Row>
            <Row icon="sparkles" label={t('chat.star')}><Switch checked={!!chat.starred} label={t('chat.star')} onChange={(v) => set({ starred: v })} /></Row>
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
            </div>
          ) : null}

          <div className="card cardlist">
            <Row icon="flag" label={t('chat.report')} onClick={() => setReport(true)}><Icon name="chevron" className="flip-rtl" size={18} /></Row>
            <Row icon="trash" label={t('chat.clear')} onClick={() => app.askConfirm({ title: t('chat.clear'), body: t('chat.clearBody'), confirmLabel: t('chat.clear'), danger: true, onConfirm: () => app.clearChat(chatId) })} />
            <Row icon="x" label={t('chat.delete')} onClick={() => app.askConfirm({ title: t('chat.delete'), body: t('chat.deleteBody'), confirmLabel: t('common.delete'), danger: true, onConfirm: () => { app.deleteChat(chatId); app.pop(); app.pop(); } })} />
          </div>

          {peer ? (
            <button type="button" className="btn danger block" onClick={doBlock}>
              <Icon name="shield" size={18} /> {app.isBlocked(peer) ? t('block.undo') : t('block.action')}
            </button>
          ) : null}
        </div>
      </div>

      {wall ? (
        <Sheet label={t('chat.wallpaper')} onClose={() => setWall(false)} tall>
          <h3 style={{ margin: '0 0 10px' }}>{t('chat.wallpaper')}</h3>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
          <div className="wallgrid">
            {WALLPAPERS.map((w) => (
              <button key={w.id} type="button" aria-label={w.id} className={(chat.wallpaper ?? 'none') === w.id ? 'on' : ''} style={w.css ? { background: w.css } : undefined} onClick={() => { set({ wallpaper: w.id === 'none' ? undefined : w.id }); setWall(false); }}>
                {w.id === 'none' ? <Icon name="x" size={18} /> : null}
              </button>
            ))}
          </div>
          <button type="button" className="btn block" style={{ marginTop: 12 }} onClick={() => app.requirePermission('photos', () => fileRef.current?.click())}><Icon name="image" size={18} /> {t('chat.wallGallery')}</button>
        </Sheet>
      ) : null}

      {report ? (
        <Sheet label={t('chat.report')} onClose={() => setReport(false)}>
          <h3 style={{ margin: '0 0 8px' }}>{t('chat.report')}</h3>
          <div className="card cardlist">
            {REASONS.map((r) => (
              <button key={r} type="button" className="listrow" onClick={() => { setReport(false); app.toast(t('chat.reportSent')); }}>
                <span className="grow" style={{ textAlign: 'start', fontWeight: 600 }}>{t(('rep.' + r) as Key)}</span>
              </button>
            ))}
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}
