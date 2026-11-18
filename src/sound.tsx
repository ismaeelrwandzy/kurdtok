import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Avatar, PostGrid, usePostSrc } from './ui';
import { useApp } from './state';
import { Icon, copyText } from './utils';

export function SoundScreen({ audio, postId }: { audio: string; postId?: string }) {
  const app = useApp();
  const { t } = app;
  const [q, setQ] = useState('');
  const [playing, setPlaying] = useState(false);
  const [dur, setDur] = useState(0);
  const vref = useRef<HTMLVideoElement>(null);

  const all = useMemo(
    () => app.visiblePosts.filter((p) => p.audio === audio || (!!postId && (p.id === postId || p.soundSrc === postId))).sort((a, b) => a.createdAt - b.createdAt),
    [app.visiblePosts, audio, postId],
  );
  const original = all[0];
  const owner = original ? app.authorOf(original.author, original.mine) : null;
  const src = usePostSrc(original ?? ({ id: '', kind: 'image', src: '', author: '', caption: '', audio: '' } as never));
  const canPlay = !!original && original.kind === 'video' && !!src;
  const needle = q.trim().toLowerCase();
  const list = needle ? all.filter((p) => p.caption.toLowerCase().includes(needle) || p.author.toLowerCase().includes(needle)) : all;
  const saved = app.savedSounds.includes(audio);
  const showBadge = !needle && !!original;

  useEffect(() => {
    const v = vref.current;
    return () => {
      if (v) v.pause();
    };
  }, []);

  const toggle = () => {
    const v = vref.current;
    if (!v) return;
    if (v.paused) {
      v.muted = false;
      void v.play().then(() => setPlaying(true)).catch(() => app.toast(t('toast.error')));
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}?sound=${encodeURIComponent(audio)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: audio, url });
        return;
      }
    } catch {
      return;
    }
    const ok = await copyText(url);
    app.toast(t(ok ? 'toast.linkCopied' : 'toast.error'));
  };

  return (
    <div className="overlay sound" role="dialog" aria-label={t('sound.title')}>
      <header className="topbar">
        <button type="button" className="iconbtn" onClick={app.pop} aria-label={t('common.back')}>
          <Icon name="back" className="flip-rtl" />
        </button>
        <div className="soundsearch">
          <Icon name="search" size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={audio} aria-label={t('sound.search')} />
        </div>
        <button type="button" className="iconbtn" onClick={() => void share()} aria-label={t('share.title')}>
          <Icon name="share" />
        </button>
      </header>
      <div className="scroll" style={{ paddingBottom: 96 }}>
        <div className="soundhead">
          <button type="button" className="cdbig" onClick={() => owner && original && app.openAuthor(original.author, original.mine)} aria-label={owner?.name}>
            <Avatar src={owner?.avatar} emoji={owner?.emoji} name={owner?.name} color={owner?.color} size={96} />
          </button>
          <div className="grow" style={{ minWidth: 0 }}>
            <h2 className="soundtitle">{audio}</h2>
            <p className="sub" style={{ margin: '4px 0 0' }}>{owner ? `@${owner.username}` : ''}</p>
          </div>
        </div>
        <div className="soundmeta">
          {canPlay ? (
            <button type="button" className="row" style={{ gap: 6, fontWeight: 700 }} onClick={toggle} aria-label={t('sound.preview')}>
              <Icon name={playing ? 'pause' : 'play'} size={18} fill="currentColor" />
              {dur ? `${Math.round(dur)}s` : ''}
            </button>
          ) : (
            <Icon name="music" size={18} />
          )}
          <span className="truncate grow">{t('sound.by', { name: owner?.name ?? '' })}</span>
          <span className="sub">{t('sound.posts', { n: String(all.length) })}</span>
        </div>
        <div style={{ padding: '0 16px 14px' }}>
          <button
            type="button"
            className={`btn block${saved ? ' primary' : ''}`}
            aria-pressed={saved}
            onClick={() => app.toggleSoundSave(audio)}
          >
            <Icon name="bookmark" size={18} fill={saved ? 'currentColor' : 'none'} /> {t(saved ? 'sound.saved' : 'sound.save')}
          </button>
        </div>
        {canPlay ? (
          <video ref={vref} src={src ?? undefined} playsInline preload="metadata" style={{ display: 'none' }} onLoadedMetadata={(e) => setDur(e.currentTarget.duration)} onEnded={() => setPlaying(false)} />
        ) : null}
        <div className="soundgrid" style={showBadge ? ({ '--badge': `"${t('sound.original')}"` } as CSSProperties) : undefined} data-badge={showBadge ? '1' : undefined}>
          {list.length === 0 ? (
            <div className="empty sub" style={{ height: 'auto' }}>{t('sound.empty')}</div>
          ) : (
            <PostGrid posts={list} onOpen={(i) => app.push({ name: 'viewer', ids: list.map((p) => p.id), index: i })} />
          )}
        </div>
      </div>
      <div className="soundbar">
        <button type="button" className="btn primary block" onClick={() => app.replace({ name: 'camera', sound: audio, soundSrc: postId ?? original?.id })}>
          <Icon name="video" size={20} /> {t('sound.use')}
        </button>
      </div>
    </div>
  );
}
