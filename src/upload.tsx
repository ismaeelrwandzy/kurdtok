/* KurdTok — upload.tsx : premium post composer + media editor (crop / rotate / filters / cover) */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useApp } from './state';
import { AUTHORS, Icon, VerifiedBadge, pick, type Captured } from './utils';
import { Avatar, Sheet, Switch, TopBar } from './ui';

export type Vis = 'public' | 'friends' | 'me';
export interface ComposeOut {
  caption: string;
  tags: string;
  sound: string;
  place?: string;
  commentsOff: boolean;
  vis: Vis;
  tagged: string[];
  poster?: string;
  filter?: string;
  media?: Captured;
}

const FILTERS: { id: string; css: string; en: string; ckb: string; ar: string }[] = [
  { id: 'none', css: '', en: 'Original', ckb: 'ئەسڵی', ar: 'الأصلي' },
  { id: 'vivid', css: 'saturate(1.55) contrast(1.1)', en: 'Vivid', ckb: 'زیندوو', ar: 'حيوي' },
  { id: 'warm', css: 'sepia(.35) saturate(1.3) hue-rotate(-10deg)', en: 'Warm', ckb: 'گەرم', ar: 'دافئ' },
  { id: 'cool', css: 'saturate(1.1) hue-rotate(15deg) brightness(1.05)', en: 'Cool', ckb: 'سارد', ar: 'بارد' },
  { id: 'bw', css: 'grayscale(1) contrast(1.1)', en: 'B&W', ckb: 'ڕەش و سپی', ar: 'أبيض وأسود' },
  { id: 'fade', css: 'contrast(.85) brightness(1.1) saturate(.8)', en: 'Fade', ckb: 'کاڵ', ar: 'باهت' },
  { id: 'drama', css: 'contrast(1.35) saturate(1.2) brightness(.92)', en: 'Drama', ckb: 'دراما', ar: 'درامي' },
  { id: 'vintage', css: 'sepia(.55) contrast(.95) brightness(1.05)', en: 'Vintage', ckb: 'کۆن', ar: 'عتيق' },
];
const RATIOS: { id: string; r: number | null; label: string }[] = [
  { id: 'free', r: null, label: 'Original' },
  { id: '1', r: 1, label: '1:1' },
  { id: '45', r: 4 / 5, label: '4:5' },
  { id: '916', r: 9 / 16, label: '9:16' },
  { id: '169', r: 16 / 9, label: '16:9' },
];
const HASHTAGS = ['#kurdtok', '#kurdistan', '#rawanduz', '#erbil', '#duhok', '#sulaymaniyah', '#newroz', '#music', '#fyp', '#dance', '#funny', '#nature'];

const buildFilter = (preset: string, b: number, c: number, s: number): string | undefined => {
  const adj = b !== 1 || c !== 1 || s !== 1 ? `brightness(${b}) contrast(${c}) saturate(${s})` : '';
  const f = `${preset} ${adj}`.trim();
  return f || undefined;
};

const loadImg = (src: string): Promise<HTMLImageElement> =>
  new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('img'));
    i.src = src;
  });

/** Grabs evenly spaced frames from a video to choose a cover from. */
async function grabFrames(url: string, n = 6): Promise<string[]> {
  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.src = url;
  await new Promise<void>((res, rej) => {
    v.onloadedmetadata = () => res();
    v.onerror = () => rej(new Error('video'));
  });
  const dur = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 1;
  const out: string[] = [];
  const scale = Math.min(1, 480 / Math.max(v.videoWidth || 480, v.videoHeight || 480));
  const w = Math.max(2, Math.round((v.videoWidth || 480) * scale));
  const h = Math.max(2, Math.round((v.videoHeight || 480) * scale));
  for (let i = 0; i < n; i++) {
    await new Promise<void>((res) => {
      v.onseeked = () => res();
      v.currentTime = Math.min(dur - 0.05, (dur * (i + 0.5)) / n);
    });
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d')?.drawImage(v, 0, 0, w, h);
    out.push(c.toDataURL('image/jpeg', 0.8));
  }
  return out;
}

/* ------------------------------------------------------------------ editor */
function MediaEditor({ media, initial, onApply, onClose }: { media: Captured; initial?: string; onApply: (r: { media?: Captured; filter?: string }) => void; onClose: () => void }) {
  const app = useApp();
  const lang = app.settings.language;
  const isImg = media.kind === 'image';
  const [tab, setTab] = useState<'filters' | 'adjust' | 'crop'>('filters');
  const [fid, setFid] = useState('none');
  const [b, setB] = useState(1);
  const [c, setC] = useState(1);
  const [s, setS] = useState(1);
  const [rot, setRot] = useState(0);
  const [flip, setFlip] = useState(false);
  const [ratio, setRatio] = useState('free');
  const preset = FILTERS.find((f) => f.id === fid)?.css ?? '';
  const css = buildFilter(preset, b, c, s);
  const tabs: { id: typeof tab; label: string; icon: string }[] = [
    { id: 'filters', label: pick(lang, 'Filters', 'فلتەر', 'فلاتر'), icon: 'sparkles' },
    { id: 'adjust', label: pick(lang, 'Adjust', 'ڕێکخستن', 'ضبط'), icon: 'settings' },
    ...(isImg ? [{ id: 'crop' as const, label: pick(lang, 'Crop & rotate', 'بڕین و سووڕاندن', 'قص وتدوير'), icon: 'grid' }] : []),
  ];
  void initial;

  const apply = async () => {
    if (!isImg) return onApply({ filter: css });
    try {
      const img = await loadImg(media.url);
      const swap = rot % 2 === 1;
      let sw = swap ? img.height : img.width;
      let sh = swap ? img.width : img.height;
      const r = RATIOS.find((x) => x.id === ratio)?.r ?? null;
      let cw = sw;
      let ch = sh;
      if (r) {
        if (sw / sh > r) cw = Math.round(sh * r);
        else ch = Math.round(sw / r);
      }
      const scale = Math.min(1, 1440 / Math.max(cw, ch));
      const cv = document.createElement('canvas');
      cv.width = Math.round(cw * scale);
      cv.height = Math.round(ch * scale);
      const ctx = cv.getContext('2d');
      if (!ctx) throw new Error('ctx');
      const canFilter = 'filter' in ctx;
      if (canFilter && css) (ctx as CanvasRenderingContext2D).filter = css;
      ctx.translate(cv.width / 2, cv.height / 2);
      ctx.rotate((rot * Math.PI) / 2);
      if (flip) ctx.scale(-1, 1);
      ctx.scale(scale, scale);
      sw = img.width;
      sh = img.height;
      ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
      const url = cv.toDataURL('image/jpeg', 0.9);
      onApply({ media: { kind: 'image', url }, filter: canFilter ? undefined : css });
    } catch {
      app.toast(app.t('toast.error'));
    }
  };

  const transform = `rotate(${rot * 90}deg) scaleX(${flip ? -1 : 1})`;
  const aspect = RATIOS.find((x) => x.id === ratio)?.r;
  return (
    <div className="overlay ed-wrap">
      <TopBar
        title={pick(lang, 'Edit', 'دەستکاری', 'تحرير')}
        onBack={onClose}
        right={<button type="button" className="link topbar-link" style={{ color: 'var(--accent)', fontWeight: 800, padding: 8 }} onClick={() => void apply()}>{pick(lang, 'Apply', 'جێبەجێکردن', 'تطبيق')}</button>}
      />
      <div className="ed-stage">
        <div className="ed-frame" style={aspect ? { aspectRatio: String(aspect) } : undefined}>
          {isImg ? <img src={media.url} alt="" style={{ filter: css, transform }} /> : <video src={media.url} muted loop autoPlay playsInline style={{ filter: css }} />}
        </div>
      </div>
      <div className="ed-panel">
        <div className="ed-tabs" role="tablist">
          {tabs.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} className={tab === x.id ? 'on' : ''} onClick={() => setTab(x.id)}><Icon name={x.icon} size={16} /> {x.label}</button>
          ))}
        </div>
        {tab === 'filters' ? (
          <div className="ed-filters">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" aria-pressed={fid === f.id} className={fid === f.id ? 'on' : ''} onClick={() => setFid(f.id)}>
                {isImg ? <img src={media.url} alt="" style={{ filter: f.css }} /> : <span className="ed-swatch" style={{ filter: f.css }} />}
                <span>{pick(lang, f.en, f.ckb, f.ar)}</span>
              </button>
            ))}
          </div>
        ) : null}
        {tab === 'adjust' ? (
          <div className="ed-sliders">
            {([['Brightness', 'ڕووناکی', 'السطوع', b, setB, 0.6, 1.6], ['Contrast', 'کۆنتراست', 'التباين', c, setC, 0.6, 1.6], ['Saturation', 'ڕەنگ', 'التشبع', s, setS, 0, 2]] as const).map(([en, ckb, ar, val, set, min, max]) => (
              <label key={en}>
                <span>{pick(lang, en, ckb, ar)}</span>
                <input type="range" min={min} max={max} step={0.05} value={val} onChange={(e) => set(Number(e.target.value))} aria-label={en} />
                <b>{Math.round(val * 100)}</b>
              </label>
            ))}
            <button type="button" className="btn sm" onClick={() => { setB(1); setC(1); setS(1); setFid('none'); }}>{pick(lang, 'Reset', 'ڕێکخستنەوە', 'إعادة ضبط')}</button>
          </div>
        ) : null}
        {tab === 'crop' ? (
          <div className="ed-crop">
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn grow" onClick={() => setRot((x) => (x + 1) % 4)}><Icon name="refresh" size={18} /> {pick(lang, 'Rotate', 'سووڕاندن', 'تدوير')}</button>
              <button type="button" className="btn grow" onClick={() => setFlip((x) => !x)}><Icon name="refresh" size={18} /> {pick(lang, 'Flip', 'هەڵگەڕاندنەوە', 'قلب')}</button>
            </div>
            <div className="ed-ratios" role="radiogroup">
              {RATIOS.map((x) => <button key={x.id} type="button" role="radio" aria-checked={ratio === x.id} className={ratio === x.id ? 'on' : ''} onClick={() => setRatio(x.id)}>{x.id === 'free' ? pick(lang, 'Original', 'ئەسڵی', 'الأصلي') : x.label}</button>)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- composer */
function Row({ icon, label, value, onClick, children }: { icon: string; label: string; value?: string; onClick?: () => void; children?: ReactNode }) {
  const inner = (
    <>
      <span className="cp-ic"><Icon name={icon} size={19} /></span>
      <span className="cp-k">{label}</span>
      <span className="cp-v truncate">{value}</span>
      {children ?? (onClick ? <Icon name="chevron" size={16} className="cp-ch" /> : null)}
    </>
  );
  return onClick ? <button type="button" className="cp-row" onClick={onClick}>{inner}</button> : <div className="cp-row">{inner}</div>;
}

export function ComposeScreen({ captured, target, onTarget, init, sounds, busy, onBack, onPublish, onDraft, onSave, onReplace }: {
  captured: Captured;
  target: 'post' | 'story';
  onTarget: (t: 'post' | 'story') => void;
  init: { caption: string; tags: string; sound: string };
  sounds: string[];
  busy: boolean;
  onBack: () => void;
  onPublish: (o: ComposeOut) => void;
  onDraft: (o: ComposeOut) => void;
  onSave: () => void;
  onReplace: () => void;
}) {
  const app = useApp();
  const lang = app.settings.language;
  const [caption, setCaption] = useState(init.caption);
  const [tags, setTags] = useState(init.tags);
  const [sound, setSound] = useState(init.sound);
  const [place, setPlace] = useState('');
  const [commentsOff, setCommentsOff] = useState(false);
  const [vis, setVis] = useState<Vis>('public');
  const [tagged, setTagged] = useState<string[]>([]);
  const [poster, setPoster] = useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [media, setMedia] = useState<Captured>(captured);
  const [sheet, setSheet] = useState<'' | 'sound' | 'tag' | 'place' | 'vis' | 'cover' | 'tags'>('');
  const [editing, setEditing] = useState(false);
  const [frames, setFrames] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const coverRef = useRef<HTMLInputElement>(null);
  const tagList = tags.split(/[\s,]+/).filter(Boolean).map((x) => (x.startsWith('#') ? x : `#${x}`));
  const setTagList = (l: string[]) => setTags(l.join(' '));

  useEffect(() => setMedia(captured), [captured]);
  useEffect(() => {
    if (sheet !== 'cover' || media.kind !== 'video' || frames.length) return;
    let alive = true;
    void grabFrames(media.url).then((f) => alive && setFrames(f)).catch(() => alive && app.toast(app.t('toast.error')));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet]);

  const out = (): ComposeOut => ({ caption, tags, sound, place: place || undefined, commentsOff, vis, tagged, poster, filter, media: media !== captured ? media : undefined });
  const visLabel = (v: Vis) => (v === 'public' ? pick(lang, 'Everyone', 'هەمووان', 'الجميع') : v === 'friends' ? pick(lang, 'Friends', 'هاوڕێکان', 'الأصدقاء') : pick(lang, 'Only me', 'تەنها من', 'أنا فقط'));
  const isStory = target === 'story';
  const toggleTag = (u: string) => setTagged((l) => (l.includes(u) ? l.filter((x) => x !== u) : [...l, u]));
  const pickCover = async (f: File | undefined) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { setPoster(String(r.result)); setSheet(''); };
    r.readAsDataURL(f);
  };

  if (editing) {
    return <MediaEditor media={media} onClose={() => setEditing(false)} onApply={(r) => { if (r.media) setMedia(r.media); setFilter(r.filter); setEditing(false); }} />;
  }

  return (
    <div className="review cp" role="dialog" aria-label={app.t('camera.review')}>
      <TopBar title={pick(lang, 'New post', 'پۆستی نوێ', 'منشور جديد')} onBack={onBack} />
      <div className="scroll">
        <div className="page cp-page">
          <div className="seg" role="tablist" style={{ alignSelf: 'stretch' }}>
            {(['post', 'story'] as const).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={target === k} className={target === k ? 'on' : ''} style={{ flex: 1 }} onClick={() => onTarget(k)}>{app.t(k === 'post' ? 'camera.toPost' : 'camera.toStory')}</button>
            ))}
          </div>
          <div className="cp-top">
            <div className="cp-preview">
              {media.kind === 'video' ? <video src={media.url} poster={poster} controls playsInline style={{ filter }} /> : <img src={media.url} alt="" style={{ filter }} />}
              <div className="cp-pvbtns">
                <button type="button" className="iconbtn glass" aria-label={pick(lang, 'Edit', 'دەستکاری', 'تحرير')} onClick={() => setEditing(true)}><Icon name="sparkles" size={18} /></button>
                <button type="button" className="iconbtn glass" aria-label={pick(lang, 'Replace media', 'گۆڕینی میدیا', 'استبدال الوسائط')} onClick={onReplace}><Icon name="refresh" size={18} /></button>
              </div>
            </div>
            <div className="cp-cap">
              <textarea className="input" value={caption} maxLength={300} placeholder={app.t('camera.captionPlaceholder')} aria-label={app.t('camera.captionPlaceholder')} onChange={(e) => setCaption(e.target.value)} />
              <span className="small sub cp-count">{caption.length}/300</span>
            </div>
          </div>
          <div className="cp-actions">
            <button type="button" onClick={() => setEditing(true)}><Icon name="sparkles" size={20} /><span>{pick(lang, 'Edit', 'دەستکاری', 'تحرير')}</span></button>
            {media.kind === 'video' ? <button type="button" onClick={() => setSheet('cover')}><Icon name="image" size={20} /><span>{pick(lang, 'Cover', 'بەرگ', 'الغلاف')}</span></button> : null}
            <button type="button" onClick={onReplace}><Icon name="video" size={20} /><span>{pick(lang, 'Replace', 'گۆڕین', 'استبدال')}</span></button>
            <button type="button" onClick={onSave}><Icon name="download" size={20} /><span>{app.t('share.saveMedia')}</span></button>
          </div>
          {!isStory ? (
            <div className="card cardlist cp-card">
              <Row icon="hash" label={pick(lang, 'Hashtags', 'هاشتاگ', 'الوسوم')} value={tagList.slice(0, 3).join(' ')} onClick={() => setSheet('tags')} />
              <Row icon="users" label={pick(lang, 'Tag people', 'تاگکردنی خەڵک', 'وسم الأشخاص')} value={tagged.map((u) => '@' + u).join(' ')} onClick={() => setSheet('tag')} />
              <Row icon="pin" label={pick(lang, 'Location', 'شوێن', 'الموقع')} value={place || pick(lang, 'Add', 'زیاد بکە', 'إضافة')} onClick={() => setSheet('place')} />
              <Row icon="music" label={pick(lang, 'Sound', 'دەنگ', 'الصوت')} value={sound} onClick={() => setSheet('sound')} />
            </div>
          ) : null}
          {!isStory ? (
            <div className="card cardlist cp-card">
              <Row icon={vis === 'me' ? 'lock' : vis === 'friends' ? 'users' : 'globe'} label={pick(lang, 'Who can watch', 'کێ دەتوانێت ببینێت', 'من يشاهد')} value={visLabel(vis)} onClick={() => setSheet('vis')} />
              <Row icon="message" label={pick(lang, 'Allow comments', 'ڕێگەدان بە کۆمێنت', 'السماح بالتعليقات')}>
                <Switch checked={!commentsOff} label={pick(lang, 'Allow comments', 'ڕێگەدان بە کۆمێنت', 'السماح بالتعليقات')} onChange={(v) => setCommentsOff(!v)} />
              </Row>
            </div>
          ) : null}
          <div className="cp-bottom">
            {!isStory ? <button type="button" className="btn cp-draft" onClick={() => onDraft(out())}><Icon name="bookmark" size={18} /> {pick(lang, 'Drafts', 'ڕەشنووس', 'مسودة')}</button> : null}
            <button type="button" className="btn primary cp-publish" disabled={busy} onClick={() => onPublish(out())}>{busy ? <span className="spinner" /> : <><Icon name="send" size={18} className="flip-rtl" /> {isStory ? app.t('camera.toStory') : app.t('camera.publish')}</>}</button>
          </div>
        </div>
      </div>

      {sheet === 'sound' ? (
        <Sheet label={app.t('camera.addSound')} onClose={() => setSheet('')}>
          <h3 style={{ margin: 0 }}>{app.t('camera.addSound')}</h3>
          <div className="card cardlist scroll" style={{ maxHeight: '46vh' }}>
            {sounds.map((x) => (
              <button key={x} type="button" className="listrow" onClick={() => { setSound(x); setSheet(''); }}><Icon name="music" size={18} /><span className="grow">{x}</span>{x === sound ? <Icon name="check" /> : null}</button>
            ))}
          </div>
        </Sheet>
      ) : null}
      {sheet === 'tags' ? (
        <Sheet label={pick(lang, 'Hashtags', 'هاشتاگ', 'الوسوم')} onClose={() => setSheet('')} tall>
          <h3 style={{ margin: 0 }}>{pick(lang, 'Hashtags', 'هاشتاگ', 'الوسوم')}</h3>
          <form className="row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); const v = custom.trim(); if (!v) return; const t = v.startsWith('#') ? v : `#${v}`; if (!tagList.includes(t)) setTagList([...tagList, t]); setCustom(''); }}>
            <input className="pill-input grow" value={custom} placeholder="#" aria-label="hashtag" onChange={(e) => setCustom(e.target.value.replace(/\s/g, ''))} />
            <button type="submit" className="btn primary sm" disabled={!custom.trim()}>{pick(lang, 'Add', 'زیادکردن', 'إضافة')}</button>
          </form>
          <div className="cp-chips">{tagList.map((x) => <button key={x} type="button" className="on" onClick={() => setTagList(tagList.filter((y) => y !== x))}>{x} ✕</button>)}</div>
          <b className="small sub">{pick(lang, 'Suggested', 'پێشنیارکراو', 'مقترحة')}</b>
          <div className="cp-chips">{HASHTAGS.filter((x) => !tagList.includes(x)).map((x) => <button key={x} type="button" onClick={() => setTagList([...tagList, x])}>{x}</button>)}</div>
          <button type="button" className="btn primary block" onClick={() => setSheet('')}>{pick(lang, 'Done', 'تەواو', 'تم')}</button>
        </Sheet>
      ) : null}
      {sheet === 'tag' ? (
        <Sheet label={pick(lang, 'Tag people', 'تاگکردنی خەڵک', 'وسم الأشخاص')} onClose={() => setSheet('')} tall>
          <h3 style={{ margin: 0 }}>{pick(lang, 'Tag people', 'تاگکردنی خەڵک', 'وسم الأشخاص')}</h3>
          <div className="scroll ib-list">
            {AUTHORS.filter((a) => !app.isBlocked(a.username)).map((a) => (
              <button key={a.username} type="button" className="chatrow" role="checkbox" aria-checked={tagged.includes(a.username)} onClick={() => toggleTag(a.username)}>
                <Avatar emoji={a.emoji} name={a.name} color={a.color} size={42} />
                <div className="grow" style={{ textAlign: 'start' }}><div className="row" style={{ gap: 5 }}><b className="truncate">{a.name}</b>{a.verified ? <VerifiedBadge size={13} /> : null}</div><span className="small sub">@{a.username}</span></div>
                <span className={`ib-check${tagged.includes(a.username) ? ' on' : ''}`}>{tagged.includes(a.username) ? <Icon name="check" size={14} /> : null}</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn primary block" onClick={() => setSheet('')}>{pick(lang, 'Done', 'تەواو', 'تم')}</button>
        </Sheet>
      ) : null}
      {sheet === 'place' ? (
        <Sheet label={pick(lang, 'Location', 'شوێن', 'الموقع')} onClose={() => setSheet('')}>
          <h3 style={{ margin: 0 }}>{pick(lang, 'Location', 'شوێن', 'الموقع')}</h3>
          <div className="card cardlist">
            <button type="button" className="listrow" onClick={() => { setPlace(''); setSheet(''); }}><Icon name="x" size={18} /><span className="grow">{pick(lang, 'No location', 'بێ شوێن', 'بدون موقع')}</span>{!place ? <Icon name="check" /> : null}</button>
            {app.profile.location ? <button type="button" className="listrow" onClick={() => { setPlace(app.profile.location); setSheet(''); }}><Icon name="pin" size={18} /><span className="grow">{app.profile.location}</span>{place === app.profile.location ? <Icon name="check" /> : null}</button> : null}
          </div>
          <form className="row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); const v = custom.trim(); if (v) { setPlace(v); setCustom(''); setSheet(''); } }}>
            <input className="pill-input grow" value={custom} maxLength={60} placeholder={pick(lang, 'Type a place…', 'شوێنێک بنووسە…', 'اكتب مكانًا…')} aria-label="place" onChange={(e) => setCustom(e.target.value)} />
            <button type="submit" className="btn primary sm" disabled={!custom.trim()}>{pick(lang, 'Set', 'دانان', 'تعيين')}</button>
          </form>
        </Sheet>
      ) : null}
      {sheet === 'vis' ? (
        <Sheet label={pick(lang, 'Who can watch', 'کێ دەتوانێت ببینێت', 'من يشاهد')} onClose={() => setSheet('')}>
          <h3 style={{ margin: 0 }}>{pick(lang, 'Who can watch', 'کێ دەتوانێت ببینێت', 'من يشاهد')}</h3>
          <div className="card cardlist">
            {(['public', 'friends', 'me'] as const).map((v) => (
              <button key={v} type="button" className="ib-opt" role="radio" aria-checked={vis === v} onClick={() => { setVis(v); setSheet(''); }}>
                <Icon name={v === 'me' ? 'lock' : v === 'friends' ? 'users' : 'globe'} size={20} />
                <div className="grow"><b>{visLabel(v)}</b></div>
                <span className={`ib-radio${vis === v ? ' on' : ''}`} />
              </button>
            ))}
          </div>
        </Sheet>
      ) : null}
      {sheet === 'cover' ? (
        <Sheet label={pick(lang, 'Choose cover', 'هەڵبژاردنی بەرگ', 'اختر الغلاف')} onClose={() => setSheet('')} tall>
          <h3 style={{ margin: 0 }}>{pick(lang, 'Choose cover', 'هەڵبژاردنی بەرگ', 'اختر الغلاف')}</h3>
          <div className="cp-frames">
            {frames.length === 0 ? <span className="spinner" /> : frames.map((f) => (
              <button key={f.slice(-24) + f.length} type="button" className={poster === f ? 'on' : ''} onClick={() => { setPoster(f); setSheet(''); }}><img src={f} alt="" /></button>
            ))}
          </div>
          <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => { void pickCover(e.target.files?.[0]); e.target.value = ''; }} />
          <button type="button" className="btn block" onClick={() => coverRef.current?.click()}><Icon name="image" size={18} /> {pick(lang, 'Upload from gallery', 'لە گاڵەری هەڵبژێرە', 'رفع من المعرض')}</button>
          {poster ? <button type="button" className="btn block" onClick={() => { setPoster(undefined); setSheet(''); }}>{pick(lang, 'Remove cover', 'لابردنی بەرگ', 'إزالة الغلاف')}</button> : null}
        </Sheet>
      ) : null}
    </div>
  );
}

export const UPLOAD_CSS = `
.cp-page{display:flex;flex-direction:column;gap:14px;padding-bottom:24px}
.cp-top{display:flex;gap:12px;align-items:stretch}
.cp-preview{position:relative;flex:none;width:42%;aspect-ratio:9/14;border-radius:20px;overflow:hidden;background:#000;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.cp-preview img,.cp-preview video{width:100%;height:100%;object-fit:cover;display:block}
.cp-pvbtns{position:absolute;top:8px;inset-inline-end:8px;display:flex;flex-direction:column;gap:8px}
.cp-cap{flex:1;display:flex;flex-direction:column;gap:4px;min-width:0}
.cp-cap textarea{flex:1;min-height:120px;resize:none}
.cp-count{align-self:flex-end}
.cp-actions{display:flex;gap:8px}
.cp-actions button{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px;border-radius:16px;background:var(--card2);border:1px solid var(--border);font-size:.78rem;font-weight:700;transition:transform .12s}
.cp-actions button:active{transform:scale(.95)}
.cp-card{padding:4px 0}
.cp-row{display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;text-align:start}
.cp-ic{width:34px;height:34px;border-radius:11px;background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent);display:flex;align-items:center;justify-content:center;flex:none}
.cp-k{font-weight:700;flex:none}.cp-v{flex:1;min-width:0;text-align:end;color:var(--sub);font-size:.88rem}
.cp-ch{color:var(--sub);flex:none}[dir="rtl"] .cp-ch{transform:scaleX(-1)}
.cp-bottom{display:flex;gap:10px;position:sticky;bottom:0;padding:10px 0 calc(6px + env(safe-area-inset-bottom));background:linear-gradient(transparent,var(--bg) 35%)}
.cp-publish{flex:1;height:52px;font-size:1.05rem;border-radius:18px}.cp-draft{height:52px;border-radius:18px}
.cp-chips{display:flex;flex-wrap:wrap;gap:8px}
.cp-chips button{padding:8px 13px;border-radius:999px;background:var(--card2);border:1px solid var(--border);font-weight:700;font-size:.85rem}
.cp-chips button.on{background:color-mix(in srgb,var(--accent) 18%,transparent);color:var(--accent);border-color:var(--accent)}
.cp-frames{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;min-height:120px;align-items:center;justify-items:center}
.cp-frames button{border-radius:12px;overflow:hidden;border:2px solid transparent;aspect-ratio:9/14;width:100%}
.cp-frames button.on{border-color:var(--accent)}.cp-frames img{width:100%;height:100%;object-fit:cover}
.ed-wrap{background:#0a0a0f;color:#fff;display:flex;flex-direction:column}
.ed-stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:10px}
.ed-frame{max-height:100%;max-width:100%;overflow:hidden;border-radius:16px;display:flex;align-items:center;justify-content:center;background:#000;height:100%}
.ed-frame img,.ed-frame video{max-width:100%;max-height:100%;object-fit:contain;transition:transform .25s,filter .2s}
.ed-panel{background:#14141c;border-radius:24px 24px 0 0;padding:12px 14px calc(14px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:12px}
.ed-tabs{display:flex;gap:6px}
.ed-tabs button{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 4px;border-radius:14px;font-weight:800;font-size:.8rem;color:#b9b9c6}
.ed-tabs button.on{background:rgba(255,255,255,.1);color:#fff}
.ed-filters{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px}
.ed-filters button{flex:none;width:68px;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:.72rem;font-weight:700;color:#b9b9c6}
.ed-filters button.on{color:#fff}.ed-filters button.on img,.ed-filters button.on .ed-swatch{outline:2px solid var(--accent);outline-offset:2px}
.ed-filters img,.ed-swatch{width:64px;height:64px;border-radius:14px;object-fit:cover;background:linear-gradient(135deg,#f97316,#8b5cf6)}
.ed-sliders{display:flex;flex-direction:column;gap:10px}
.ed-sliders label{display:flex;align-items:center;gap:10px;font-size:.82rem;font-weight:700}
.ed-sliders label span{width:86px;color:#b9b9c6}.ed-sliders input{flex:1}.ed-sliders b{width:34px;text-align:end}
.ed-crop{display:flex;flex-direction:column;gap:12px}
.ed-ratios{display:flex;gap:8px;flex-wrap:wrap}
.ed-ratios button{padding:9px 14px;border-radius:12px;background:rgba(255,255,255,.08);font-weight:800;font-size:.82rem}
.ed-ratios button.on{background:var(--accent);color:#fff}
`;
