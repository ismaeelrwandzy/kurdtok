import { useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { useApp } from './state';
import { AudienceMark, EMOJIS, Icon, STORY_DAY_OPTIONS, VerifiedBadge, audienceLabel, pick, uid } from './utils';
import { Avatar, Sheet } from './ui';
import type { Captured, StoryItem, StoryOverlays, StoryStroke } from './utils';

const COLORS = ['#ffffff', '#000000', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#8b5cf6'];
const MORE_EMOJIS = ['🔥', '❤️', '😍', '😂', '🥳', '😎', '🙏', '👏', '💯', '✨', '🌟', '🎉', '🇰🇺', '🏔️', '🌄', '🎶', '☀️', '🌙', '🌸', '🍀', '💙', '💛', '💚', '🤍'];
const STICKERS = Array.from(new Set([...MORE_EMOJIS, ...EMOJIS]));

export function OverlayView({ overlays }: { overlays?: StoryOverlays }) {
  if (!overlays) return null;
  return (
    <div className="ovview" aria-hidden="true">
      <svg viewBox="0 0 1 1" preserveAspectRatio="none">
        {overlays.strokes.map((s, i) => (
          <polyline key={i} points={s.pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={s.color} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {overlays.items.map((it) => (
        <span key={it.id} className={`ovitem ${it.type}`} style={{ left: `${it.x * 100}%`, top: `${it.y * 100}%`, color: it.color, fontSize: it.size }}>
          {it.text}
        </span>
      ))}
    </div>
  );
}

export function StoryEditor({ captured, busy, onBack, onShare, onPost, onSave, audience, onAudience, days, onDays, onAudienceSet }: { captured: Captured; busy: boolean; onBack: () => void; onShare: (o: StoryOverlays) => void; onPost: () => void; onSave: () => void; audience: 'public' | 'friends' | 'me'; onAudience: () => void; days: number; onDays: (n: number) => void; onAudienceSet: (a: 'public' | 'friends' | 'me') => void }) {
  const app = useApp();
  const { t } = app;
  const stageRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<StoryItem[]>([]);
  const [strokes, setStrokes] = useState<StoryStroke[]>([]);
  const [live, setLive] = useState<StoryStroke | null>(null);
  const [mode, setMode] = useState<'none' | 'draw' | 'text' | 'emoji'>('none');
  const [color, setColor] = useState('#ffffff');
  const [draftText, setDraftText] = useState('');
  const [draftSize, setDraftSize] = useState(32);
  const [editId, setEditId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overTrash, setOverTrash] = useState(false);
  const moved = useRef(false);

  const rel = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return [0.5, 0.5];
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  };

  /* drawing */
  const drawDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (mode !== 'draw') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setLive({ color, width: 5, pts: [rel(e)] });
  };
  const drawMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (mode !== 'draw' || !live) return;
    const p = rel(e);
    setLive((l) => (l ? { ...l, pts: [...l.pts, p] } : l));
  };
  const drawUp = () => {
    if (live && live.pts.length > 0) {
      const done = live.pts.length === 1 ? { ...live, pts: [live.pts[0], [live.pts[0][0] + 0.001, live.pts[0][1]] as [number, number]] } : live;
      setStrokes((s) => [...s, done]);
    }
    setLive(null);
  };

  /* dragging items */
  const itemDown = (e: RPointerEvent<HTMLSpanElement>, id: string) => {
    if (mode !== 'none') return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    moved.current = false;
    setDragId(id);
  };
  const itemMove = (e: RPointerEvent<HTMLSpanElement>, id: string) => {
    if (dragId !== id) return;
    moved.current = true;
    const [x, y] = rel(e);
    setItems((l) => l.map((it) => (it.id === id ? { ...it, x, y } : it)));
    setOverTrash(y > 0.86 && Math.abs(x - 0.5) < 0.18);
  };
  const itemUp = (id: string) => {
    if (dragId !== id) return;
    if (overTrash) setItems((l) => l.filter((it) => it.id !== id));
    else if (!moved.current) {
      const it = items.find((x) => x.id === id);
      if (it && it.type === 'text') {
        setEditId(id);
        setDraftText(it.text);
        setDraftSize(it.size);
        setColor(it.color);
        setMode('text');
      }
    }
    setDragId(null);
    setOverTrash(false);
  };

  const openText = () => {
    setEditId(null);
    setDraftText('');
    setDraftSize(32);
    setMode('text');
  };
  const commitText = () => {
    const text = draftText.trim();
    if (text) {
      if (editId) setItems((l) => l.map((it) => (it.id === editId ? { ...it, text, color, size: draftSize } : it)));
      else setItems((l) => [...l, { id: uid(), type: 'text', x: 0.5, y: 0.45, text, color, size: draftSize }]);
    } else if (editId) setItems((l) => l.filter((it) => it.id !== editId));
    setEditId(null);
    setMode('none');
  };
  const addEmoji = (em: string) => {
    setItems((l) => [...l, { id: uid(), type: 'emoji', x: 0.5, y: 0.5, text: em, color: '#fff', size: 72 }]);
    setMode('none');
  };

  const [opts, setOpts] = useState(false);
  const lang = app.settings.language;
  const share = () => onShare({ items, strokes });
  const tool = (icon: string, label: string, on: boolean, fn: () => void) => (
    <button type="button" className={`iconbtn glass sttool${on ? ' on' : ''}`} aria-label={label} aria-pressed={on} title={label} onClick={fn}>
      <Icon name={icon} size={22} />
    </button>
  );

  return (
    <div className="stedit" role="dialog" aria-label={t('story.editor')}>
      <div className="ststage" ref={stageRef}>
        {captured.kind === 'video' ? <video src={captured.url} autoPlay loop muted playsInline /> : <img src={captured.url} alt="" draggable={false} />}
        <svg className="stdraw" viewBox="0 0 1 1" preserveAspectRatio="none">
          {strokes.map((s, i) => (
            <polyline key={i} points={s.pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={s.color} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ))}
          {live ? <polyline points={live.pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={live.color} strokeWidth={live.width} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /> : null}
        </svg>
        {items.map((it) => (
          <span
            key={it.id}
            className={`ovitem ${it.type} editable${dragId === it.id ? ' dragging' : ''}`}
            style={{ left: `${it.x * 100}%`, top: `${it.y * 100}%`, color: it.color, fontSize: it.size }}
            onPointerDown={(e) => itemDown(e, it.id)}
            onPointerMove={(e) => itemMove(e, it.id)}
            onPointerUp={() => itemUp(it.id)}
            onPointerCancel={() => itemUp(it.id)}
          >
            {it.text}
          </span>
        ))}
        {mode === 'draw' ? <div className="stcatch" onPointerDown={drawDown} onPointerMove={drawMove} onPointerUp={drawUp} onPointerCancel={drawUp} /> : null}
      </div>

      {dragId ? <div className={`sttrash${overTrash ? ' over' : ''}`}><Icon name="trash" size={26} /></div> : null}

      {mode !== 'text' && mode !== 'emoji' ? (
        <div className="sttop">
          <button type="button" className="iconbtn glass" onClick={onBack} aria-label={t('common.back')}><Icon name="x" /></button>
          <div className="seg stseg" role="tablist">
            <button type="button" role="tab" aria-selected="false" onClick={onPost}>{t('camera.toPost')}</button>
            <button type="button" role="tab" aria-selected="true" className="on">{t('camera.toStory')}</button>
          </div>
          <button type="button" className="iconbtn glass" onClick={onAudience} aria-label={audience}><AudienceMark a={audience} size={20} /></button>
        </div>
      ) : null}
      {mode === 'none' || mode === 'draw' ? (
        <div className="sttools">
          {tool('type', t('story.text'), false, openText)}
          {tool('smile', t('story.sticker'), false, () => setMode('emoji'))}
          {tool('pen', t('story.draw'), mode === 'draw', () => setMode(mode === 'draw' ? 'none' : 'draw'))}
          {strokes.length > 0 ? tool('undo', t('story.undo'), false, () => setStrokes((s) => s.slice(0, -1))) : null}
        </div>
      ) : null}

      {mode === 'draw' ? (
        <div className="stbottom">
          <div className="stcolors">
            {COLORS.map((c) => (
              <button key={c} type="button" className={color === c ? 'on' : ''} style={{ background: c }} aria-label={c} onClick={() => setColor(c)} />
            ))}
          </div>
          <button type="button" className="btn primary" onClick={() => setMode('none')}>{t('story.done')}</button>
        </div>
      ) : null}

      {mode === 'none' ? (
        <button type="button" className="stwho" onClick={() => setOpts(true)} aria-label={pick(lang, 'Story options', 'ڕێکخستنی ستۆری', 'خيارات القصة')}>
          <Avatar src={app.profile.avatar} name={app.profile.name} size={30} />
          <b className="truncate">{app.profile.name}</b>{app.isVerified ? <VerifiedBadge size={14} /> : null}
          <AudienceMark a={audience} size={14} />
          <span className="stdays">· {days}{pick(lang, 'd', ' ڕۆژ', ' يوم')}</span>
          <Icon name="chevron" size={14} />
        </button>
      ) : null}
      {opts ? (
        <Sheet label={pick(lang, 'Story options', 'ڕێکخستنی ستۆری', 'خيارات القصة')} onClose={() => setOpts(false)}>
          <div className="row between"><h3 style={{ margin: 0 }}>{pick(lang, 'Story options', 'ڕێکخستنی ستۆری', 'خيارات القصة')}</h3><button type="button" className="iconbtn" onClick={() => setOpts(false)} aria-label={t('common.close')}><Icon name="x" /></button></div>
          <b className="small sub">{pick(lang, 'Who can see it', 'کێ دەیبینێت', 'من يراها')}</b>
          <div className="stopts" role="radiogroup">
            {(['public', 'friends', 'me'] as const).map((x) => (
              <button key={x} type="button" role="radio" aria-checked={audience === x} className={audience === x ? 'on' : ''} onClick={() => onAudienceSet(x)}><AudienceMark a={x} size={18} /><span>{audienceLabel(lang, x)}</span></button>
            ))}
          </div>
          <b className="small sub">{pick(lang, 'Stays up for', 'ماوەی مانەوە', 'مدة البقاء')}</b>
          <div className="stopts" role="radiogroup">
            {STORY_DAY_OPTIONS.map((d) => {
              const locked = d > app.perks.storyDays;
              return (
                <button key={d} type="button" role="radio" aria-checked={days === d} aria-disabled={locked} className={`${days === d ? 'on' : ''}${locked ? ' locked' : ''}`} onClick={() => { if (locked) app.toast(pick(lang, 'Upgrade your plan for longer stories', 'بۆ ستۆری درێژتر پلانەکەت بەرز بکەرەوە', 'قم بترقية خطتك لقصص أطول')); else onDays(d); }}>
                  {locked ? <Icon name="lock" size={16} /> : null}<span>{d} {pick(lang, d === 1 ? 'day' : 'days', 'ڕۆژ', 'يوم')}</span>
                </button>
              );
            })}
          </div>
          <button type="button" className="btn primary block" onClick={() => setOpts(false)}>{pick(lang, 'Done', 'تەواو', 'تم')}</button>
        </Sheet>
      ) : null}
      {mode === 'none' ? (
        <div className="stbottom">
          <button type="button" className="iconbtn glass" onClick={onSave} aria-label={t('share.saveMedia')}><Icon name="download" /></button>
          <button type="button" className="golive stshare" disabled={busy} onClick={share}>
            {busy ? <span className="spinner" /> : <><Icon name="send" size={20} className="flip-rtl" /> {t('story.share')}</>}
          </button>
        </div>
      ) : null}

      {mode === 'text' ? (
        <div className="sttext">
          <div className="row between" style={{ width: '100%' }}>
            <button type="button" className="btn" onClick={() => { setEditId(null); setMode('none'); }}>{t('common.cancel')}</button>
            <button type="button" className="btn primary" onClick={commitText}>{t('story.done')}</button>
          </div>
          <textarea autoFocus value={draftText} maxLength={120} onChange={(e) => setDraftText(e.target.value)} placeholder={t('story.typeHere')} aria-label={t('story.typeHere')} style={{ color, fontSize: draftSize }} />
          <input type="range" min={18} max={64} value={draftSize} onChange={(e) => setDraftSize(Number(e.target.value))} aria-label={t('story.size')} className="stsize" />
          <div className="stcolors">
            {COLORS.map((c) => (
              <button key={c} type="button" className={color === c ? 'on' : ''} style={{ background: c }} aria-label={c} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>
      ) : null}

      {mode === 'emoji' ? (
        <div className="sttext">
          <div className="row between" style={{ width: '100%' }}>
            <b>{t('story.sticker')}</b>
            <button type="button" className="btn" onClick={() => setMode('none')}>{t('common.close')}</button>
          </div>
          <div className="stemojis">
            {STICKERS.map((em) => (
              <button key={em} type="button" onClick={() => addEmoji(em)} aria-label={em}>{em}</button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
