import { Icon } from './utils';
import type { TrashItem } from './utils';
import { Sheet, usePostSrc } from './ui';
import { useApp } from './state';

const DAY = 24 * 60 * 60 * 1000;

function TrashThumb({ item }: { item: TrashItem }) {
  const src = usePostSrc(item.post);
  return (
    <span className="trashthumb">
      {src ? item.post.kind === 'video' ? <video src={src} muted playsInline preload="metadata" /> : <img src={src} alt="" /> : <Icon name="image" />}
    </span>
  );
}

export function TrashPanel({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const { t } = app;
  const list = [...app.trash].sort((a, b) => b.deletedAt - a.deletedAt);
  return (
    <Sheet label={t('trash.title')} onClose={onClose} tall>
      <div className="row between">
        <h3 style={{ margin: 0 }}>{t('trash.title')}</h3>
        <button type="button" className="iconbtn" onClick={onClose} aria-label={t('common.close')}><Icon name="x" /></button>
      </div>
      <p className="small sub" style={{ margin: 0 }}>{t('trash.note')}</p>
      <div className="scroll" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.length === 0 ? <div className="empty sub" style={{ height: 'auto' }}>{t('trash.empty')}</div> : null}
        {list.map((it) => {
          const left = Math.max(0, Math.ceil(30 - (Date.now() - it.deletedAt) / DAY));
          return (
            <div key={it.post.id} className="trashrow card">
              <TrashThumb item={it} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="truncate" style={{ fontWeight: 700 }}>{it.post.caption || t('camera.defaultCaption')}</div>
                <div className="small sub">{t('trash.daysLeft', { n: String(left) })}</div>
                <div className="row" style={{ gap: 8, marginTop: 8 }}>
                  <button type="button" className="btn primary sm" onClick={() => app.restorePost(it.post.id)}>{t('trash.restore')}</button>
                  <button type="button" className="btn danger sm" onClick={() => app.askConfirm({ title: t('trash.deleteForever'), body: t('trash.deleteForeverBody'), confirmLabel: t('common.delete'), danger: true, onConfirm: () => app.purgeTrash(it.post.id) })}>{t('trash.deleteForever')}</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {list.length > 0 ? (
        <button type="button" className="btn danger block" onClick={() => app.askConfirm({ title: t('trash.emptyAll'), body: t('trash.deleteForeverBody'), confirmLabel: t('common.delete'), danger: true, onConfirm: () => app.purgeTrash() })}>
          <Icon name="trash" size={18} /> {t('trash.emptyAll')}
        </button>
      ) : null}
    </Sheet>
  );
}
