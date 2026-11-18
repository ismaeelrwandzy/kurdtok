/* KurdTok — camera.tsx */
import { useEffect, useRef, useState } from 'react';
import { useApp } from './state';
import { Icon } from './utils';

export function CameraScreen() {
  const app = useApp();
  const { t } = app;
  const videoRef = useRef<HTMLVideoElement>(null);
const [, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [flash, setFlash] = useState(false);
  const [mode, setMode] = useState<'photo' | 'video' | 'live'>('video');
  const [isRecording, setIsRecording] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveTitle, setLiveTitle] = useState('');
  const [timer, setTimer] = useState(0);

  // دەستپێکردنی کامێرا
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: facing },
        audio: true,
      })
      .then((s) => {
        activeStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch((err) => {
        console.error('Camera error:', err);
        app.toast(t('perm.cameraDesc'));
      });

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facing]);

  // کاتژمێری تۆمارکردن
  useEffect(() => {
    let interval: number | undefined;
    if (isRecording || isLiveActive) {
      interval = window.setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    } else {
      setTimer(0);
    }
    return () => window.clearInterval(interval);
  }, [isRecording, isLiveActive]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCapture = () => {
    if (mode === 'photo') {
      app.toast('وێنە گیرا!');
      app.pop();
    } else if (mode === 'video') {
      if (!isRecording) {
        setIsRecording(true);
        app.toast('تۆمارکردنی ڤیدیۆ دەست پێکرد...');
      } else {
        setIsRecording(false);
        app.toast('ڤیدیۆکە سەیڤ کرا!');
        app.pop();
      }
    } else if (mode === 'live') {
      if (!isLiveActive) {
        if (!liveTitle.trim()) {
          app.toast('تکایە ناوی ڕاستەوخۆ بنووسە!');
          return;
        }
        setIsLiveActive(true);
        app.toast('تۆ ئێستا لە ڵایڤدا دیت! 🔴');
      } else {
        setIsLiveActive(false);
        app.toast('ڵایڤ کۆتایی هات.');
      }
    }
  };

  return (
    <div className="overlay dark" style={{ background: '#000', display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* ڤیدیۆی پیشاندانی کامێرا */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
      />

      {/* سێبەری سەرەوە و خوارەوە بۆ جوانی دیزاین */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)', zIndex: 2 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 180, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', zIndex: 2 }} />

      {/* مۆدی ڵایڤ (کاتی چالاکبوون) */}
      {isLiveActive ? (
        <div style={{ position: 'absolute', top: 70, left: 20, right: 20, zIndex: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,0,0,0.8)', padding: '4px 12px', borderRadius: 20, color: '#fff', fontWeight: 'bold', fontSize: '0.85rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite' }} />
            LIVE · {formatTimer(timer)}
          </div>
          <div style={{ background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: 20, color: '#fff', fontSize: '0.85rem', backdropFilter: 'blur(6px)' }}>
            👥 1.2K viewers
          </div>
        </div>
      ) : null}

      {/* سەرەوە: دوگمەکان و دەنگ */}
      <div style={{ position: 'relative', zIndex: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
        <button type="button" className="iconbtn glass" onClick={app.pop} aria-label={t('common.close')} style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
          <Icon name="x" size={20} />
        </button>

        {!isLiveActive ? (
          <div style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', padding: '6px 16px', borderRadius: 20, color: '#fff', fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="music" size={14} /> KurdTok Original
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 10 }}>
          {!isLiveActive ? (
            <>
              <button
                type="button"
                className="iconbtn glass"
                onClick={() => setFlash(!flash)}
                style={{ background: flash ? 'var(--accent)' : 'rgba(0,0,0,0.4)', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <Icon name="zap" size={18} />
              </button>
              <button
                type="button"
                className="iconbtn glass"
                onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
                style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <Icon name="refresh" size={18} />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* کاتی تۆمارکردن بۆ ڤیدیۆ */}
      {(isRecording || (isLiveActive && timer > 0)) && !isLiveActive ? (
        <div style={{ position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 3, background: 'rgba(255,0,0,0.8)', color: '#fff', padding: '4px 14px', borderRadius: 20, fontWeight: 'bold', fontSize: '0.85rem' }}>
          ● {formatTimer(timer)}
        </div>
      ) : null}

      {/* ناوەڕاست لە مۆدی ڵایڤدا: داواکاری ناونیشان */}
      {mode === 'live' && !isLiveActive ? (
        <div style={{ position: 'absolute', top: '35%', left: '20px', right: '20px', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <input
            type="text"
            placeholder="ناونیشانی ڕاستەوخۆ بنووسە (Live Title)..."
            value={liveTitle}
            onChange={(e) => setLiveTitle(e.target.value)}
            style={{ width: '100%', maxWidth: 320, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: '1rem', outline: 'none', textAlign: 'center', backdropFilter: 'blur(8px)' }}
          />
        </div>
      ) : null}

      {/* خوارەوە: کۆنتڕۆڵ و مۆدەکان */}
      <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        {/* دوگمەی گرتن/تۆمارکردن/ڵایڤ */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative' }}>
          {!isLiveActive ? (
            <button
              type="button"
              onClick={handleCapture}
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                background: mode === 'photo' ? '#fff' : mode === 'live' ? '#ff3b30' : 'transparent',
                border: mode === 'video' || mode === 'live' ? '4px solid #fff' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
                boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                transition: 'transform 0.1s ease',
              }}
            >
              {mode === 'video' && (
                <div style={{ width: isRecording ? 28 : 56, height: isRecording ? 28 : 56, background: '#ff3b30', borderRadius: isRecording ? 6 : '50%', transition: 'all 0.2s ease' }} />
              )}
              {mode === 'live' && <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.9rem' }}>GO</span>}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCapture}
              style={{ background: '#ff3b30', color: '#fff', border: 'none', padding: '12px 32px', borderRadius: 30, fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,59,48,0.5)' }}
            >
              کۆتایی هێنان بە ڵایڤ
            </button>
          )}

          {!isLiveActive && (
            <button
              type="button"
              onClick={() => app.toast('گالەری کرایەوە')}
              style={{ position: 'absolute', left: 40, width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
            >
              <Icon name="image" size={20} />
            </button>
          )}
        </div>

        {/* مۆدەکان (Photo, Video, Live) */}
        {!isLiveActive ? (
          <div style={{ display: 'flex', gap: 24, background: 'rgba(0,0,0,0.5)', padding: '6px 20px', borderRadius: 30, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              type="button"
              onClick={() => setMode('photo')}
              style={{ background: 'none', border: 'none', color: mode === 'photo' ? 'var(--accent)' : '#aaa', fontWeight: mode === 'photo' ? 'bold' : 'normal', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              Photo
            </button>
            <button
              type="button"
              onClick={() => setMode('video')}
              style={{ background: 'none', border: 'none', color: mode === 'video' ? 'var(--accent)' : '#aaa', fontWeight: mode === 'video' ? 'bold' : 'normal', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              Video
            </button>
            <button
              type="button"
              onClick={() => setMode('live')}
              style={{ background: 'none', border: 'none', color: mode === 'live' ? '#ff3b30' : '#aaa', fontWeight: mode === 'live' ? 'bold' : 'normal', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              LIVE
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
