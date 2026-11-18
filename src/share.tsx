/* KurdTok — share.tsx : TikTok-style share sheet (people · apps · actions) */
import { useState, type ReactNode } from 'react';
import { postLink, useApp } from './state';
import { Icon, pick, type Post } from './utils';
import { Avatar, Sheet } from './ui';
import { ReportSheet } from './more';

interface AppItem { id: string; label: string; bg: string; glyph: ReactNode; url?: (text: string, link: string) => string }

const G = (t: string) => <b className="sh-glyph">{t}</b>;
const APPS: AppItem[] = [
  { id: 'wa', label: 'WhatsApp', bg: '#25d366', glyph: <Icon name="phone" size={26} />, url: (t, l) => `https://wa.me/?text=${encodeURIComponent(`${t} ${l}`.trim())}` },
  { id: 'tg', label: 'Telegram', bg: '#2aa3e0', glyph: <Icon name="send" size={26} />, url: (t, l) => `https://t.me/share/url?url=${encodeURIComponent(l)}&text=${encodeURIComponent(t)}` },
  { id: 'ms', label: 'Messenger', bg: 'linear-gradient(135deg,#00b2ff,#006aff 60%,#a033ff)', glyph: <Icon name="message" size={26} />, url: (_t, l) => `fb-messenger://share/?link=${encodeURIComponent(l)}` },
  { id: 'fb', label: 'Facebook', bg: '#1877f2', glyph: G('f'), url: (_t, l) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(l)}` },
  { id: 'ig', label: 'Instagram', bg: 'linear-gradient(45deg,#f9ce34,#ee2a7b 55%,#6228d7)', glyph: <Icon name="camera" size={26} /> },
  { id: 'sc', label: 'Snapchat', bg: '#fffc00', glyph: <span style={{ fontSize: 26 }}>👻</span> },
  { id: 'x', label: 'X', bg: '#000', glyph: G('𝕏'), url: (t, l) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(l)}` },
  { id: 'vb', label: 'Viber', bg: '#7360f2', glyph: <Icon name="phone" size={26} />, url: (t, l) => `viber://forward?text=${encodeURIComponent(`${t} ${l}`.trim())}` },
  { id: 'sms', label: 'SMS', bg: '#34c759', glyph: <Icon name="message" size={26} />, url: (t, l) => `sms:?&body=${encodeURIComponent(`${t} ${l}`.trim())}` },
  { id: 'mail', label: 'Email', bg: '#3b82f6', glyph: <Icon name="mail" size={26} />, url: (t, l) => `mailto:?subject=${encodeURIComponent('KurdTok')}&body=${encodeURIComponent(`${t}\n${l}`)}` },
];

function Circle({ label, bg, children, onClick, on, danger }: { label: string; bg?: string; children: ReactNode; onClick: () => void; on?: boolean; danger?: boolean }) {
  return (
    <button type="button" className={`sh-it${on ? ' on' : ''}${danger ? ' danger' : ''}`} onClick={onClick}>
      <span className="sh-circ" style={bg ? { background: bg } : undefined}>{children}</span>
      <span className="sh-lb">{label}</span>
    </button>
  );
}

export function ShareView({ post, close, onEdit }: { post: Post; close: () => void; onEdit: () => void }) {
  const app = useApp();
  const { t } = app;
  const lang = app.settings.language;
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [rep, setRep] = useState(false);
  const link = postLink(post.id);
  const people = app.chats.filter((c) => !(c.peer && app.isBlocked(c.peer)) && c.name.toLowerCase().includes(q.trim().toLowerCase()));
  const sendTo = (id: string, name: string) => {
    app.sendMessage(id, { text: link });
    app.toast(`${t('story.sent')} · ${name}`);
    close();
  };
  const goApp = (a: AppItem) => {
    if (a.url) {
      window.open(a.url(post.caption.slice(0, 120), link), '_blank', 'noopener');
      close();
    } else if (typeof navigator.share === 'function') {
      void app.nativeShare(post);
      close();
    } else {
      void app.copyLink(post);
      close();
    }
  };
  if (rep) return <ReportSheet what={post.author} onClose={() => { setRep(false); close(); }} />;
  return (
    <Sheet label={t('share.title')} onClose={close}>
      <div className="sh-head">
        <button type="button" className="iconbtn" aria-label={pick(lang, 'Search', 'گەڕان', 'بحث')} aria-pressed={searching} onClick={() => { setSearching((s) => !s); setQ(''); }}><Icon name="search" size={22} /></button>
        <h3>{post.mine ? pick(lang, 'Post options', 'ئۆپشنەکانی پۆست', 'خيارات المنشور') : pick(lang, 'Send to', 'ناردن بۆ', 'إرسال إلى')}</h3>
        <button type="button" className="iconbtn" onClick={close} aria-label={t('common.close')}><Icon name="x" size={22} /></button>
      </div>
      {searching ? <input className="pill-input" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={pick(lang, 'Search people…', 'گەڕان لە خەڵک…', 'ابحث…')} aria-label="search" /> : null}
      <div className="sh-row" aria-label="people">
        {people.length === 0 ? <span className="sub small" style={{ padding: '14px 4px' }}>{pick(lang, 'No one found', 'کەس نەدۆزرایەوە', 'لا يوجد')}</span> : null}
        {people.map((c) => (
          <button key={c.id} type="button" className="sh-it sh-person" onClick={() => sendTo(c.id, c.name)}>
            <Avatar emoji={c.emoji} name={c.name} color={c.color} size={58} />
            <span className="sh-lb">{c.name}</span>
          </button>
        ))}
      </div>
      <div className="sh-row" aria-label="apps">
        <Circle label={t('share.repost')} bg="linear-gradient(135deg,#ffd23f,#ff9f1c)" on={post.reposted} onClick={() => { app.toggleRepost(post.id); close(); }}><Icon name="repeat" size={26} /></Circle>
        <Circle label={t('share.copyLink')} bg="#3b6cf6" onClick={() => { void app.copyLink(post); close(); }}><Icon name="link" size={26} /></Circle>
        {APPS.map((a) => (
          <Circle key={a.id} label={a.label} bg={a.bg} onClick={() => goApp(a)}><span style={{ color: a.id === 'sc' ? '#000' : '#fff', display: 'flex' }}>{a.glyph}</span></Circle>
        ))}
        {typeof navigator.share === 'function' ? <Circle label={t('share.more')} bg="#4b8bf5" onClick={() => { void app.nativeShare(post); close(); }}><Icon name="more" size={26} /></Circle> : null}
      </div>
      <div className="sh-row sh-actions" aria-label="actions">
        {!post.mine ? <Circle label={pick(lang, 'Report', 'ڕاپۆرت', 'إبلاغ')} onClick={() => setRep(true)}><Icon name="flag" size={24} /></Circle> : null}
        {!post.mine ? <Circle label={pick(lang, 'Not interested', 'خۆشم ناوێت', 'غير مهتم')} onClick={() => { app.hidePost(post.id); close(); }}><Icon name="eyeOff" size={24} /></Circle> : null}
        <Circle label={t('share.saveMedia')} onClick={() => { app.saveMedia(post); close(); }}><Icon name="download" size={24} /></Circle>
        <Circle label={t('share.save')} on={post.saved} onClick={() => { app.toggleSave(post.id); close(); }}><Icon name="bookmark" size={24} /></Circle>
        <Circle label={t('share.autoScroll')} on={app.settings.autoScroll} onClick={() => { const next = !app.settings.autoScroll; app.setSettings((s) => ({ ...s, autoScroll: next })); app.toast(t(next ? 'feed.autoScrollOn' : 'feed.autoScrollOff')); close(); }}><Icon name="play" size={24} /></Circle>
        {post.mine ? <Circle label={pick(lang, post.pinned ? 'Unpin' : 'Pin', post.pinned ? 'لابردنی چەسپاندن' : 'چەسپاندن', post.pinned ? 'إلغاء التثبيت' : 'تثبيت')} on={post.pinned} onClick={() => { app.togglePin(post.id); close(); }}><Icon name="pin" size={24} /></Circle> : null}
        {post.mine ? <Circle label={pick(lang, 'Edit caption', 'دەستکاری کاپشن', 'تعديل الوصف')} onClick={onEdit}><Icon name="edit" size={24} /></Circle> : null}
        {post.mine ? <Circle label={t(post.private ? 'post.makePublic' : 'post.makePrivate')} on={post.private} onClick={() => { app.togglePrivate(post.id); close(); }}><Icon name="lock" size={24} /></Circle> : null}
        {post.mine ? (
          <Circle label={t('common.delete')} danger onClick={() => { close(); app.askConfirm({ title: t('post.deleteTitle'), body: t('post.deleteBody'), confirmLabel: t('common.delete'), danger: true, onConfirm: () => app.deletePost(post.id) }); }}><Icon name="trash" size={24} /></Circle>
        ) : null}
      </div>
    </Sheet>
  );
}

export const SHARE_CSS = `
.sh-head{display:flex;align-items:center;justify-content:space-between}
.sh-head h3{margin:0;font-size:1.05rem;font-weight:800}
.sh-row{display:flex;gap:14px;overflow-x:auto;padding:4px 2px 6px;margin-inline:-6px;padding-inline:6px;scrollbar-width:none;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity}
.sh-row::-webkit-scrollbar{display:none}
.sh-it{flex:none;width:68px;display:flex;flex-direction:column;align-items:center;gap:7px;scroll-snap-align:start;transition:transform .12s}
.sh-it:active{transform:scale(.92)}
.sh-circ{width:58px;height:58px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 4px 12px rgba(0,0,0,.25)}
.sh-glyph{font-size:1.6rem;font-weight:900;line-height:1;color:#fff}
.sh-lb{font-size:.72rem;font-weight:600;color:var(--sub);text-align:center;line-height:1.2;max-width:68px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.sh-person .sh-lb{color:var(--text)}
.sh-actions .sh-circ{background:var(--card2);color:var(--text);box-shadow:inset 0 0 0 1px var(--border)}
.sh-actions .sh-it.on .sh-circ{background:var(--grad);color:#fff;box-shadow:none}
.sh-actions .sh-it.danger .sh-circ{background:rgba(239,68,68,.14);color:var(--danger);box-shadow:none}
.sh-actions .sh-it.danger .sh-lb{color:var(--danger)}
.sh-row+.sh-row{border-top:1px solid color-mix(in srgb,var(--border) 70%,transparent);padding-top:14px}
`;
