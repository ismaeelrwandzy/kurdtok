/* KurdTok — profile.tsx */
import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as RMouseEvent } from 'react';
import { useApp } from './state';
import { type StoryOverlays, audienceLabel, nextAudience, copyText, DEFAULT_PROFILE, DEMO_EMOJI, Icon, RESERVED_USERNAMES, pick, SOUNDS, downloadBlob, extFromType, fmtDuration, cleanUsernameInput, isValidUsername, resizeImage, usernameRule, type Captured } from './utils';
import { ComposeScreen, type ComposeOut } from './upload';
import { Avatar, Sheet, TopBar } from './ui';
import { StoryEditor } from './storyedit';

/* ============================================================================
 * Camera, profile, edit profile, settings
 * ========================================================================== */

export function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const c = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  return c.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
}

type CamCaps = { torch?: boolean; zoom?: { min: number; max: number; step: number }; focusMode?: string[]; exposureCompensation?: { min: number; max: number; step: number } };
type LiveMsg = { id: number; user: string; text: string };
const LIVE_USERS = ['zhyar', 'shno', 'bahar', 'dilan', 'rzgar', 'awaz', 'hana', 'sirwan', 'lana', 'aram'];
const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

export function CameraScreen({ sound: initialSound, soundSrc, story: initialStory, draftId: initialDraft }: { sound?: string; soundSrc?: string; story?: boolean; draftId?: string }) {
  const app = useApp();
  const { t } = app;
  const allowed = app.settings.permissions.camera;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | undefined>(undefined);
  const cdRef = useRef<number | undefined>(undefined);
  const simRef = useRef<number | undefined>(undefined);
  const capturedRef = useRef<Captured | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [mode, setMode] = useState<'photo' | 'video' | 'live'>('photo');
  const [duration, setDuration] = useState(15);
  const [err, setErr] = useState('');
  const [retry, setRetry] = useState(0);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [captured, setCaptured] = useState<Captured | null>(null);
  const [caption, setCaption] = useState('');
  const draftRef = useRef<string | undefined>(initialDraft);
  const [target, setTarget] = useState<'post' | 'story'>(initialStory ? 'story' : 'post');
  const [tags, setTags] = useState('');
  const [sound, setSound] = useState(initialSound ?? SOUNDS[0]);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);
  const [caps, setCaps] = useState<CamCaps>({});
  const [zoom, setZoom] = useState(1);
  const [streamVer, setStreamVer] = useState(0);
  const [focusPt, setFocusPt] = useState<{ id: number; x: number; y: number } | null>(null);
  const [expo, setExpo] = useState(0);
  const [flipAnim, setFlipAnim] = useState(false);
  const [hint, setHint] = useState(true);
  const torchOnRef = useRef(false);
  const camTapRef = useRef(0);
  const camTapTimer = useRef<number | undefined>(undefined);
  const focusTimer = useRef<number | undefined>(undefined);
  const [timerSec, setTimerSec] = useState<0 | 3 | 10>(0);
  const [count, setCount] = useState(0);
  const [grid, setGrid] = useState(false);
  const [liveOn, setLiveOn] = useState(false);
  const [liveTitle, setLiveTitle] = useState('');
  const [viewers, setViewers] = useState(0);
  const [msgs, setMsgs] = useState<LiveMsg[]>([]);
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([]);
  const [liveInput, setLiveInput] = useState('');
  capturedRef.current = captured;

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  };

  const applyTorch = async (on: boolean) => {
    const tr = streamRef.current?.getVideoTracks()[0];
    if (!tr) return false;
    try {
      await tr.applyConstraints({ advanced: [{ torch: on }] } as unknown as MediaTrackConstraints);
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!allowed || captured) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setErr(t('camera.unsupported'));
      return;
    }
    let cancelled = false;
    setErr('');
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: mode !== 'photo' })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = s;
        const v = videoRef.current;
        if (v) {
          v.muted = true;
          v.srcObject = s;
          void v.play().catch(() => undefined);
        }
        const tr = s.getVideoTracks()[0];
        const c = ((tr && typeof tr.getCapabilities === 'function' ? tr.getCapabilities() : {}) as unknown) as CamCaps;
        setCaps({ torch: !!c.torch, zoom: c.zoom && c.zoom.max > c.zoom.min ? c.zoom : undefined, focusMode: c.focusMode, exposureCompensation: c.exposureCompensation && c.exposureCompensation.max > c.exposureCompensation.min ? c.exposureCompensation : undefined });
        setExpo(0);
        setZoom(c.zoom ? c.zoom.min : 1);
        setStreamVer((n) => n + 1);
      })
      .catch(() => !cancelled && setErr(t('camera.error')));
    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, facing, mode, captured, retry]);

  // Torch stays on while filming / live; for photos it only fires at capture.
  useEffect(() => {
    if (!caps.torch) return;
    const want = flash && mode !== 'photo';
    if (!want && !torchOnRef.current) return;
    torchOnRef.current = want;
    void applyTorch(want);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash, mode, caps.torch, streamVer]);

  useEffect(() => {
    if (!caps.zoom || zoom <= caps.zoom.min) return;
    const tr = streamRef.current?.getVideoTracks()[0];
    if (!tr) return;
    void tr.applyConstraints({ advanced: [{ zoom }] } as unknown as MediaTrackConstraints).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, caps.zoom, streamVer]);

  useEffect(
    () => () => {
      window.clearTimeout(camTapTimer.current);
      window.clearTimeout(focusTimer.current);
      window.clearInterval(timerRef.current);
      window.clearInterval(cdRef.current);
      window.clearInterval(simRef.current);
      if (recRef.current) {
        recRef.current.onstop = null;
        if (recRef.current.state !== 'inactive') recRef.current.stop();
      }
      const c = capturedRef.current;
      if (c && c.url.startsWith('blob:')) URL.revokeObjectURL(c.url);
    },
    [],
  );

  const stopRecording = () => {
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
  };

  const startRecording = (limit: number) => {
    const stream = streamRef.current;
    if (!stream) return false;
    if (typeof MediaRecorder === 'undefined') {
      app.toast(t('camera.noRecorder'));
      return false;
    }
    const mime = pickMime();
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      window.clearInterval(timerRef.current);
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || mime || 'video/webm' });
      setRecording(false);
      setCaptured({ kind: 'video', blob, url: URL.createObjectURL(blob) });
    };
    rec.start(250);
    recRef.current = rec;
    setRecording(true);
    setElapsed(0);
    const started = Date.now();
    timerRef.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - started) / 1000);
      setElapsed(s);
      if (s >= limit) stopRecording();
    }, 250);
    return true;
  };

  const capture = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    if (flash) {
      if (caps.torch) {
        await applyTorch(true);
        await sleep(380);
      } else if (facing === 'user') {
        setScreenFlash(true);
        await sleep(320);
      }
    }
    const scale = Math.min(1, 1080 / Math.max(v.videoWidth, v.videoHeight));
    const w = Math.round(v.videoWidth * scale);
    const h = Math.round(v.videoHeight * scale);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (ctx) {
      if (facing === 'user') {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(v, 0, 0, w, h);
      setCaptured({ kind: 'image', url: c.toDataURL('image/jpeg', 0.88) });
    }
    setScreenFlash(false);
    if (flash && caps.torch) void applyTorch(false);
  };

  const withTimer = (fn: () => void) => {
    if (!timerSec) {
      fn();
      return;
    }
    let n = timerSec;
    setCount(n);
    window.clearInterval(cdRef.current);
    cdRef.current = window.setInterval(() => {
      n -= 1;
      if (n <= 0) {
        window.clearInterval(cdRef.current);
        setCount(0);
        fn();
      } else setCount(n);
    }, 1000);
  };
  const cancelCount = () => {
    window.clearInterval(cdRef.current);
    setCount(0);
  };

  const onShutter = () => {
    if (count > 0) return cancelCount();
    if (mode === 'photo') return withTimer(() => void capture());
    if (recording) return stopRecording();
    withTimer(() => startRecording(duration));
  };

  const toggleFlash = () => {
    if (!caps.torch && facing === 'environment') app.toast(t('camera.flashNo'));
    else if (!caps.torch && mode !== 'photo') app.toast(t('camera.flashNo'));
    setFlash((f) => !f);
  };

  const flipCamera = () => {
    if (recording) return;
    setFlipAnim(true);
    window.setTimeout(() => setFlipAnim(false), 420);
    setFacing((f) => (f === 'user' ? 'environment' : 'user'));
    try {
      navigator.vibrate?.(15);
    } catch {
      /* ignore */
    }
  };

  const focusAt = (clientX: number, clientY: number, rect: DOMRect) => {
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    setFocusPt({ id: Date.now(), x, y });
    window.clearTimeout(focusTimer.current);
    focusTimer.current = window.setTimeout(() => setFocusPt(null), 2600);
    const tr = streamRef.current?.getVideoTracks()[0];
    if (!tr) return;
    let px = x / rect.width;
    const py = y / rect.height;
    if (facing === 'user') px = 1 - px;
    const modes = caps.focusMode ?? [];
    const adv: Record<string, unknown> = {};
    if (modes.includes('single-shot')) adv.focusMode = 'single-shot';
    else if (modes.includes('continuous')) adv.focusMode = 'continuous';
    if (Object.keys(adv).length || caps.focusMode) {
      adv.pointsOfInterest = [{ x: Math.min(1, Math.max(0, px)), y: Math.min(1, Math.max(0, py)) }];
      void tr.applyConstraints({ advanced: [adv] } as unknown as MediaTrackConstraints).catch(() => undefined);
    }
  };

  const onViewTap = (e: RMouseEvent<HTMLDivElement>) => {
    if (captured || count > 0) return;
    setHint(false);
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX;
    const cy = e.clientY;
    if (now - camTapRef.current < 320) {
      window.clearTimeout(camTapTimer.current);
      camTapRef.current = 0;
      setFocusPt(null);
      flipCamera();
      return;
    }
    camTapRef.current = now;
    window.clearTimeout(camTapTimer.current);
    camTapTimer.current = window.setTimeout(() => focusAt(cx, cy, rect), 240);
  };

  const changeExpo = (v: number) => {
    setExpo(v);
    window.clearTimeout(focusTimer.current);
    focusTimer.current = window.setTimeout(() => setFocusPt(null), 2600);
    const tr = streamRef.current?.getVideoTracks()[0];
    if (!tr) return;
    void tr.applyConstraints({ advanced: [{ exposureCompensation: v }] } as unknown as MediaTrackConstraints).catch(() => undefined);
  };

  const startLive = () => {
    if (!startRecording(Number.POSITIVE_INFINITY)) return;
    setLiveOn(true);
    setViewers(1);
    setMsgs([]);
    const phrases = ['live.c1', 'live.c2', 'live.c3', 'live.c4', 'live.c5', 'live.c6'] as const;
    simRef.current = window.setInterval(() => {
      setViewers((v) => Math.max(1, v + Math.floor(Math.random() * 7) - 2));
      if (Math.random() < 0.55) {
        const m: LiveMsg = { id: Date.now() + Math.random(), user: LIVE_USERS[Math.floor(Math.random() * LIVE_USERS.length)], text: t(phrases[Math.floor(Math.random() * phrases.length)]) };
        setMsgs((l) => [...l.slice(-5), m]);
      }
      if (Math.random() < 0.45) {
        const h = { id: Date.now() + Math.random(), x: 10 + Math.random() * 70 };
        setHearts((l) => [...l.slice(-8), h]);
        window.setTimeout(() => setHearts((l) => l.filter((x) => x.id !== h.id)), 2200);
      }
    }, 1700);
  };

  const endLive = () => {
    window.clearInterval(simRef.current);
    setLiveOn(false);
    setCaption(liveTitle);
    stopRecording();
    app.toast(t('camera.liveEnded'));
  };

  const askEndLive = () =>
    app.askConfirm({ title: t('camera.endLive'), body: t('camera.endLiveBody'), confirmLabel: t('camera.endLive'), danger: true, onConfirm: endLive });

  const sendLiveMsg = () => {
    const text = liveInput.trim();
    if (!text) return;
    setMsgs((l) => [...l.slice(-5), { id: Date.now(), user: app.profile.username || 'you', text }]);
    setLiveInput('');
  };

  useEffect(() => {
    if (!initialDraft) return;
    let alive = true;
    void app.loadDraft(initialDraft).then((r) => {
      if (!alive || !r) return;
      const url = r.draft.kind === 'video' && r.blob ? URL.createObjectURL(r.blob) : r.draft.src;
      if (!url) return;
      setCaptured({ kind: r.draft.kind, url, blob: r.blob });
      setCaption(r.draft.caption);
      setTags(r.draft.tags);
      setSound(r.draft.sound);
      setTarget('post');
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeCamera = () => {
    if (liveOn) askEndLive();
    else app.pop();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.type.startsWith('image/')) setCaptured({ kind: 'image', url: await resizeImage(file, 1080, 0.82) });
      else if (file.type.startsWith('video/')) setCaptured({ kind: 'video', blob: file, url: URL.createObjectURL(file) });
      else app.toast(t('toast.imageOnly'));
    } catch {
      app.toast(t('toast.error'));
    }
  };

  const discard = () => {
    if (captured && captured.url.startsWith('blob:')) URL.revokeObjectURL(captured.url);
    setCaptured(null);
    setCaption('');
    setTags('');
  };

  const [addOpen, setAddOpen] = useState(false);
  const pickFile = (accept: string) => {
    setAddOpen(false);
    app.requirePermission('photos', () => { if (fileRef.current) { fileRef.current.accept = accept; fileRef.current.click(); } });
  };
  const [audience, setAudience] = useState<'public' | 'friends' | 'me'>('public');
  const [storyDays, setStoryDays] = useState(1);
  const publish = async (overlays?: StoryOverlays, o?: ComposeOut) => {
    if (!captured || busy) return;
    setBusy(true);
    const isStory = target === 'story';
    const m = o?.media ?? captured;
    const cap = o ? o.caption : caption;
    const tg = o ? o.tags : tags;
    const tagText = tg.split(/[\s,]+/).filter(Boolean).map((x) => (x.startsWith('#') ? x : `#${x}`)).join(' ');
    const mentions = (o?.tagged ?? []).map((u) => `@${u}`).join(' ');
    const place = o?.place;
    await app.publishPost({
      kind: m.kind,
      src: m.url,
      blob: m.blob,
      caption: isStory ? cap.trim() : `${cap.trim()} ${mentions} ${tagText}`.replace(/\s+/g, ' ').trim() || t('camera.defaultCaption'),
      audio: o ? o.sound : sound,
      place: !isStory ? place : undefined,
      story: isStory,
      audience: isStory ? audience : undefined,
      storyDays: isStory ? storyDays : undefined,
      overlays: isStory ? overlays : undefined,
      soundSrc: !isStory ? soundSrc : undefined,
      poster: o?.poster,
      filter: o?.filter,
      commentsOff: o?.commentsOff,
      isPrivate: o ? o.vis !== 'public' : undefined,
    });
    if (draftRef.current) app.deleteDraft(draftRef.current);
    app.toast(t(isStory ? 'camera.storyShared' : 'camera.published'));
    app.pop();
    app.setTab(isStory ? 'inbox' : 'profile');
  };

  const saveAsDraft = async (o?: ComposeOut) => {
    if (!captured) return;
    const m = o?.media ?? captured;
    const id = draftRef.current ?? `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    draftRef.current = id;
    await app.saveDraft({ id, kind: m.kind, src: m.url, blob: m.blob, caption: o ? o.caption : caption, tags: o ? o.tags : tags, sound: o ? o.sound : sound });
    app.toast(pick(app.settings.language, 'Saved to drafts', 'لە ڕەشنووسەکان پاشەکەوت کرا', 'تم الحفظ في المسودات'));
    app.pop();
  };

  const saveToDevice = () =>
    app.requirePermission('storage', async () => {
      if (!captured) return;
      const blob = captured.blob ?? (await (await fetch(captured.url)).blob());
      downloadBlob(blob, `kurdtok-${Date.now()}.${extFromType(blob.type, captured.kind === 'video' ? 'webm' : 'jpg')}`);
      app.toast(t('toast.mediaSaved'));
    });

  if (!allowed) {
    return (
      <div className="overlay">
        <div className="empty" style={{ gap: 14 }}>
          <Icon name="camera" size={56} />
          <h2 style={{ margin: 0 }}>{t('camera.permissionTitle')}</h2>
          <p className="sub" style={{ margin: 0 }}>{t('camera.permissionBody')}</p>
          <div className="row">
            <button type="button" className="btn" onClick={app.pop}>{t('common.cancel')}</button>
            <button type="button" className="btn primary" onClick={() => app.setPermission('camera', true)}>{t('camera.allow')}</button>
          </div>
        </div>
      </div>
    );
  }

  if (captured && target === 'story') {
    return <StoryEditor captured={captured} busy={busy} onBack={discard} onPost={() => setTarget('post')} onShare={(o) => void publish(o)} onSave={saveToDevice} audience={audience} days={storyDays} onDays={setStoryDays} onAudienceSet={setAudience} onAudience={() => { const nx = nextAudience(audience); setAudience(nx); app.toast(audienceLabel(app.settings.language, nx)); }} />;
  }

  if (captured) {
    return (
      <ComposeScreen
        captured={captured}
        target={target}
        onTarget={setTarget}
        init={{ caption, tags, sound }}
        sounds={SOUNDS}
        busy={busy}
        onBack={discard}
        onPublish={(o) => void publish(undefined, o)}
        onDraft={(o) => void saveAsDraft(o)}
        onSave={saveToDevice}
        onReplace={discard}
      />
    );
  }

  const tool = (on: boolean, label: string, icon: string, onClick: () => void, disabled?: boolean) => (
    <button type="button" className={`iconbtn glass camtool${on ? ' on' : ''}`} aria-pressed={on} aria-label={label} title={label} disabled={disabled} onClick={onClick}>
      <Icon name={icon} size={20} />
    </button>
  );

  return (
    <div className="cam" role="dialog" aria-label={t('nav.create')}>
      <video ref={videoRef} className={`${facing === 'user' ? 'mirror' : ''}${flipAnim ? ' flipanim' : ''}`} autoPlay playsInline muted onLoadedMetadata={(e) => void e.currentTarget.play().catch(() => undefined)} />
      <div className="camtap" onClick={onViewTap} role="presentation" />
      {focusPt ? (
        <div className="focusring" style={{ left: focusPt.x, top: focusPt.y }} key={focusPt.id}>
          <i />
          {caps.exposureCompensation ? (
            <input
              className="expo"
              type="range"
              aria-label="Brightness"
              min={caps.exposureCompensation.min}
              max={caps.exposureCompensation.max}
              step={caps.exposureCompensation.step || 0.1}
              value={expo}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => changeExpo(Number(e.target.value))}
            />
          ) : null}
        </div>
      ) : null}
      {hint && !captured && !liveOn && !recording ? <div className="camhint">{t('camera.hint')}</div> : null}
      {grid ? <div className="camgrid" /> : null}
      {screenFlash ? <div className="screenflash" /> : null}
      {count > 0 ? <button type="button" className="countdown" onClick={cancelCount} aria-label={t('common.cancel')}>{count}</button> : null}
      <div className="top">
        <button type="button" className="iconbtn glass" onClick={closeCamera} aria-label={t('common.close')}><Icon name="x" /></button>
        {liveOn ? (
          <span className="row" style={{ gap: 8 }}>
            <span className="livebadge">LIVE</span>
            <span className="chip" style={{ background: 'rgba(0,0,0,.45)', color: '#fff', border: 0 }}><Icon name="eye" size={14} /> {viewers} · {fmtDuration(elapsed)}</span>
          </span>
        ) : recording ? <span className="recbadge">● {fmtDuration(elapsed)} / {fmtDuration(duration)}</span> : <span className="chip" style={{ background: 'rgba(0,0,0,.45)', color: '#fff', border: 0 }}><Icon name="music" size={14} /> {sound}</span>}
        {liveOn ? <button type="button" className="btn danger sm" onClick={askEndLive}>{t('camera.endLive')}</button> : <span style={{ width: 44 }} />}
      </div>
      {!liveOn ? (
        <div className="camtools">
          {tool(false, t('call.flip'), 'refresh', flipCamera, recording)}
          {tool(flash, t('camera.flash'), flash ? 'zap' : 'zapOff', toggleFlash)}
          {mode !== 'live' ? tool(timerSec > 0, `${t('camera.timer')} ${timerSec ? `${timerSec}s` : ''}`, 'timer', () => setTimerSec((s) => (s === 0 ? 3 : s === 3 ? 10 : 0)), recording) : null}
          {tool(grid, t('camera.grid'), 'grid', () => setGrid((g) => !g))}
          {timerSec > 0 ? <span className="camtag">{timerSec}s</span> : null}
        </div>
      ) : null}
      {err ? (
        <div className="empty" style={{ position: 'relative', zIndex: 3, color: '#fff' }}>
          <p>{err}</p>
          <button type="button" className="btn" onClick={() => setRetry((n) => n + 1)}>{t('common.retry')}</button>
        </div>
      ) : <div style={{ flex: 1 }} />}

      {liveOn ? (
        <>
          <div className="livehearts" aria-hidden="true">
            {hearts.map((h) => <span key={h.id} style={{ insetInlineEnd: `${h.x}px` }}>❤</span>)}
          </div>
          <div className="livechat" aria-live="polite">
            {msgs.map((m) => <div key={m.id}><b>{m.user}</b> {m.text}</div>)}
          </div>
        </>
      ) : null}

      <div className="bottom">
        {mode === 'video' && !recording ? (
          <div className="row" style={{ gap: 18, fontWeight: 800 }}>
            {[15, 60, 600].map((d) => (
              <button key={d} type="button" style={{ opacity: duration === d ? 1 : 0.5 }} onClick={() => setDuration(d)}>{d === 600 ? '10m' : `${d}s`}</button>
            ))}
          </div>
        ) : null}
        {mode === 'live' && !liveOn ? (
          <>
            <input className="input livetitle" value={liveTitle} maxLength={80} placeholder={t('camera.liveTitle')} aria-label={t('camera.liveTitle')} onChange={(e) => setLiveTitle(e.target.value)} />
            <p className="small center" style={{ margin: 0, opacity: 0.8 }}>{t('camera.liveDemo')}</p>
          </>
        ) : null}
        {liveOn ? (
          <form className="row" style={{ width: '100%', gap: 8 }} onSubmit={(e) => { e.preventDefault(); sendLiveMsg(); }}>
            <input className="input pill-input" style={{ flex: 1 }} value={liveInput} maxLength={120} placeholder={t('camera.liveSay')} aria-label={t('camera.liveSay')} onChange={(e) => setLiveInput(e.target.value)} />
            <button type="submit" className="iconbtn glass" aria-label={t('common.send')}><Icon name="send" size={20} className="flip-rtl" /></button>
          </form>
        ) : (
          <>
            {!recording && count === 0 ? (
              <div className="modes" role="tablist">
                {(['photo', 'video', 'live'] as const).map((m) => (
                  <button key={m} type="button" role="tab" aria-selected={mode === m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
                    {t(m === 'photo' ? 'camera.photo' : m === 'video' ? 'camera.video' : 'camera.live')}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="row" style={{ gap: 28 }}>
              <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
              <button type="button" className="iconbtn glass" style={{ width: 48, height: 48, borderRadius: 12 }} disabled={recording} onClick={() => setAddOpen(true)} aria-label={t('camera.gallery')}><Icon name="image" /></button>
              {mode === 'live' ? (
                <button type="button" className="golive" disabled={!!err} onClick={startLive}>
                  <Icon name="radio" size={20} /> {t('camera.goLive')}
                </button>
              ) : (
                <button
                  type="button"
                  className={`shutter${recording ? ' rec' : ''}${mode === 'photo' ? ' photo' : ''}`}
                  disabled={!!err}
                  aria-label={mode === 'photo' ? t('camera.photo') : recording ? t('camera.stop') : t('camera.record')}
                  onClick={onShutter}
                >
                  <i />
                </button>
              )}
              <span style={{ width: 48 }} />
            </div>
          </>
        )}
      </div>
      {addOpen ? (
        <Sheet label={pick(app.settings.language, 'Add media', 'زیادکردنی میدیا', 'إضافة وسائط')} onClose={() => setAddOpen(false)}>
          <h3 style={{ margin: 0 }}>{pick(app.settings.language, 'Add media', 'زیادکردنی میدیا', 'إضافة وسائط')}</h3>
          <div className="card cardlist">
            <button type="button" className="listrow" onClick={() => pickFile('image/*,video/*')}><Icon name="image" size={20} /><span className="grow">{pick(app.settings.language, 'Select from gallery', 'لە گاڵەری هەڵبژێرە', 'اختر من المعرض')}</span></button>
            <button type="button" className="listrow" onClick={() => pickFile('image/*')}><Icon name="camera" size={20} /><span className="grow">{pick(app.settings.language, 'Add photo', 'زیادکردنی وێنە', 'إضافة صورة')}</span></button>
            <button type="button" className="listrow" onClick={() => pickFile('video/*')}><Icon name="video" size={20} /><span className="grow">{pick(app.settings.language, 'Add video', 'زیادکردنی ڤیدیۆ', 'إضافة فيديو')}</span></button>
            <button type="button" className="listrow" onClick={() => { setAddOpen(false); setMode('video'); }}><Icon name="radio" size={20} /><span className="grow">{pick(app.settings.language, 'Record video', 'تۆمارکردنی ڤیدیۆ', 'تسجيل فيديو')}</span></button>
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}

export function EditProfileScreen() {
  const app = useApp();
  const { t, profile } = app;
  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username);
  const [uWarn, setUWarn] = useState(false);
  const [bio, setBio] = useState(profile.bio);
  const [location, setLocation] = useState(profile.location);
  const [website, setWebsite] = useState(profile.website);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [errs, setErrs] = useState<{ name?: string; username?: string }>({});
  const [locBusy, setLocBusy] = useState(false);
  const [field, setField] = useState<'' | 'name' | 'username' | 'bio' | 'location' | 'website'>('');
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = name !== profile.name || username !== profile.username || bio !== profile.bio || location !== profile.location || website !== profile.website || avatar !== profile.avatar;

  const back = () => {
    if (!dirty) return app.pop();
    app.askConfirm({ title: t('edit.discardTitle'), body: t('edit.discardBody'), confirmLabel: t('edit.discard'), danger: true, onConfirm: app.pop });
  };

  const save = () => {
    const e: { name?: string; username?: string } = {};
    const u = username.trim().toLowerCase();
    if (!name.trim()) e.name = t('edit.errName');
    if (!isValidUsername(u)) e.username = usernameRule(app.settings.language);
    else if (RESERVED_USERNAMES.has(u) && u !== profile.username) e.username = t('auth.errTaken');
    setErrs(e);
    if (e.name || e.username) return;
    app.updateProfile({ name: name.trim(), username: u, bio: bio.trim(), location: location.trim(), website: website.trim(), avatar });
    app.toast(t('edit.saved'));
    app.pop();
  };

  const useLocation = () =>
    app.requirePermission('location', () => {
      if (!navigator.geolocation) return app.toast(t('toast.error'));
      setLocBusy(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          let label = `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
          try {
            const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=${app.langMeta.code === 'ckb' ? 'ku' : app.langMeta.code}`);
            const d = (await r.json()) as { city?: string; locality?: string; countryName?: string };
            const place = [d.city || d.locality, d.countryName].filter(Boolean).join(', ');
            if (place) label = place;
          } catch {
            /* keep coordinates */
          }
          setLocation(label);
          setLocBusy(false);
        },
        () => {
          setLocBusy(false);
          app.toast(t('toast.locationFailed'));
        },
        { timeout: 10000 },
      );
    });

  return (
    <div className="overlay">
      <TopBar title={t('edit.title')} onBack={back} right={<button type="button" className="link" style={{ color: 'var(--accent)', fontWeight: 800, padding: 8 }} onClick={save}>{t('common.save')}</button>} />
      <div className="scroll">
        <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f && f.type.startsWith('image/')) { try { setAvatar(await resizeImage(f, 320, 0.82)); } catch { app.toast(t('toast.error')); } } }} />
          <div className="ep-avatar">
            <button type="button" className="ep-photo" onClick={() => app.requirePermission('photos', () => fileRef.current?.click())} aria-label={t('edit.changePhoto')}>
              <Avatar src={avatar} emoji={profile.username === DEFAULT_PROFILE.username ? DEMO_EMOJI : undefined} name={name} size={104} />
              <span className="ep-cam"><Icon name="camera" size={30} /></span>
            </button>
            <button type="button" style={{ color: 'var(--accent)', fontWeight: 800 }} onClick={() => app.requirePermission('photos', () => fileRef.current?.click())}>{t('edit.changePhoto')}</button>
            {avatar ? <button type="button" className="small sub" onClick={() => setAvatar(null)}>{t('edit.removePhoto')}</button> : null}
          </div>
          <div className="card cardlist ep-card">
            <button type="button" className="ep-row" onClick={() => setField('name')}><span className="ep-k">{t('edit.name')}</span><span className="ep-v truncate">{name}</span><Icon name="chevron" size={18} className="ep-ch" /></button>
            <button type="button" className="ep-row" onClick={() => setField('username')}><span className="ep-k">{t('edit.username')}</span><span className="ep-v truncate" dir="ltr">{username}</span><Icon name="chevron" size={18} className="ep-ch" /></button>
            <div className="ep-row ep-link"><span className="ep-k" /><span className="ep-v truncate" dir="ltr">kurdtok.app/@{username}</span><button type="button" className="iconbtn" aria-label={pick(app.settings.language, 'Copy link', 'کۆپی لینک', 'نسخ الرابط')} onClick={async () => { const ok = await copyText(`kurdtok.app/@${username}`); app.toast(t(ok ? 'toast.linkCopied' : 'toast.error')); }}><Icon name="link" size={18} /></button></div>
          </div>
          <div className="sectionhead">{pick(app.settings.language, 'Basic info', 'زانیاری بنەڕەتی', 'معلومات أساسية')}</div>
          <div className="card cardlist ep-card">
            <button type="button" className="ep-row" onClick={() => setField('bio')}><span className="ep-k">{t('edit.bio')}</span><span className="ep-v truncate">{bio || pick(app.settings.language, 'Add a bio', 'بایۆ زیاد بکە', 'أضف نبذة')}</span><Icon name="chevron" size={18} className="ep-ch" /></button>
          </div>
          <div className="sectionhead">{pick(app.settings.language, 'Others', 'ئەوانی تر', 'أخرى')}</div>
          <div className="card cardlist ep-card">
            <button type="button" className="ep-row" onClick={() => setField('location')}><span className="ep-k">{t('edit.location')}</span><span className="ep-v truncate">{location || '—'}</span><Icon name="chevron" size={18} className="ep-ch" /></button>
            <button type="button" className="ep-row" onClick={() => setField('website')}><span className="ep-k">{t('edit.website')}</span><span className="ep-v truncate" dir="ltr">{website || '—'}</span><Icon name="chevron" size={18} className="ep-ch" /></button>
          </div>
        </div>
      </div>
      {field === 'name' ? (
        <Sheet label={t('edit.name')} onClose={() => setField('')}>
          <div className="row between"><h3 style={{ margin: 0 }}>{t('edit.name')}</h3><button type="button" className="btn primary sm" onClick={() => setField('')}>{pick(app.settings.language, 'Done', 'تەواو', 'تم')}</button></div>
          <div className="field"><label htmlFor="en">{t('edit.name')}</label><input id="en" className={`input${errs.name ? ' err' : ''}`} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />{errs.name ? <p className="errtext">{errs.name}</p> : null}</div>
        </Sheet>
      ) : null}
      {field === 'username' ? (
        <Sheet label={t('edit.username')} onClose={() => setField('')}>
          <div className="row between"><h3 style={{ margin: 0 }}>{t('edit.username')}</h3><button type="button" className="btn primary sm" onClick={() => setField('')}>{pick(app.settings.language, 'Done', 'تەواو', 'تم')}</button></div>
          <div className="field"><label htmlFor="eu">{t('edit.username')}</label><input id="eu" className={`input${errs.username ? ' err' : ''}`} value={username} maxLength={20} autoCapitalize="none" autoCorrect="off" spellCheck={false} dir="ltr" onChange={(e) => { const r = cleanUsernameInput(e.target.value); setUWarn(r.changed); setUsername(r.value); }} /><div className="small sub" style={{ marginTop: 4, color: uWarn ? 'var(--danger)' : undefined }}>{usernameRule(app.settings.language)}</div>{errs.username ? <p className="errtext">{errs.username}</p> : null}{(() => { const u = username.trim().toLowerCase(); if (!u || u === profile.username || errs.username) return null; const bad = !isValidUsername(u); const taken = RESERVED_USERNAMES.has(u); return <p className="small" style={{ margin: '4px 0 0', color: bad || taken ? 'var(--danger)' : '#22c55e' }}>{bad ? usernameRule(app.settings.language) : taken ? t('auth.errTaken') : '@' + u + ' ✓'}</p>; })()}</div>
        </Sheet>
      ) : null}
      {field === 'bio' ? (
        <Sheet label={t('edit.bio')} onClose={() => setField('')}>
          <div className="row between"><h3 style={{ margin: 0 }}>{t('edit.bio')}</h3><button type="button" className="btn primary sm" onClick={() => setField('')}>{pick(app.settings.language, 'Done', 'تەواو', 'تم')}</button></div>
          <div className="field"><label htmlFor="eb">{t('edit.bio')} ({bio.length}/150)</label><textarea id="eb" className="input" value={bio} maxLength={150} onChange={(e) => setBio(e.target.value)} /></div>
        </Sheet>
      ) : null}
      {field === 'location' ? (
        <Sheet label={t('edit.location')} onClose={() => setField('')}>
          <div className="row between"><h3 style={{ margin: 0 }}>{t('edit.location')}</h3><button type="button" className="btn primary sm" onClick={() => setField('')}>{pick(app.settings.language, 'Done', 'تەواو', 'تم')}</button></div>
          <div className="field">
            <label htmlFor="el">{t('edit.location')}</label>
            <div className="row"><input id="el" className="input" value={location} maxLength={60} onChange={(e) => setLocation(e.target.value)} />
              <button type="button" className="btn sm" onClick={useLocation} disabled={locBusy} aria-label={t('edit.useLocation')}>{locBusy ? <span className="spinner" /> : <Icon name="pin" size={18} />}</button></div>
          </div>
        </Sheet>
      ) : null}
      {field === 'website' ? (
        <Sheet label={t('edit.website')} onClose={() => setField('')}>
          <div className="row between"><h3 style={{ margin: 0 }}>{t('edit.website')}</h3><button type="button" className="btn primary sm" onClick={() => setField('')}>{pick(app.settings.language, 'Done', 'تەواو', 'تم')}</button></div>
          <div className="field"><label htmlFor="ew">{t('edit.website')}</label><input id="ew" className="input" dir="ltr" value={website} maxLength={100} inputMode="url" onChange={(e) => setWebsite(e.target.value)} /></div>
        </Sheet>
      ) : null}
    </div>
  );
}
