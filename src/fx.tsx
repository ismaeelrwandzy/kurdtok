/* KurdTok — fx.tsx : like effect (glossy heart pop + floating hearts) */
import { useMemo } from 'react';
import type { CSSProperties } from 'react';

type Burst = { id: number; x: number; y: number };

const FLOATERS = 9;
const HEART = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

function HeartShape({ size, id, tone = 0 }: { size: number; id: string; tone?: number }) {
  const tones = [
    ['#ff6b81', '#ff1f4b', '#d90429'],
    ['#ff8fa3', '#ff4d6d', '#e0113a'],
    ['#ffd166', '#ff9f1c', '#f26b1d'],
  ][tone % 3];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`g${id}`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={tones[0]} />
          <stop offset=".5" stopColor={tones[1]} />
          <stop offset="1" stopColor={tones[2]} />
        </linearGradient>
        <radialGradient id={`h${id}`} cx=".3" cy=".25" r=".5">
          <stop offset="0" stopColor="#fff" stopOpacity=".65" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={HEART} fill={`url(#g${id})`} />
      <path d={HEART} fill={`url(#h${id})`} />
    </svg>
  );
}

function OneBurst({ b }: { b: Burst }) {
  const cfg = useMemo(() => {
    const tilt = Math.round((Math.random() - 0.5) * 24);
    const parts = Array.from({ length: FLOATERS }, (_, i) => {
      const spread = (i / (FLOATERS - 1) - 0.5) * 2;
      return {
        dx: spread * (60 + Math.random() * 50),
        dy: -(90 + Math.random() * 90),
        rot: Math.round(spread * 30 + (Math.random() - 0.5) * 20),
        size: 14 + Math.random() * 14,
        delay: 80 + Math.random() * 220,
        tone: i % 3,
      };
    });
    return { tilt, parts };
  }, []);

  return (
    <div className="hb" style={{ left: b.x, top: b.y }} aria-hidden="true">
      <span className="hb-ring" />
      <span className="hb-main" style={{ '--tilt': `${cfg.tilt}deg` } as CSSProperties}>
        <HeartShape size={112} id={String(Math.round(b.id))} />
      </span>
      {cfg.parts.map((p, i) => (
        <span
          key={i}
          className="hb-p"
          style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--rot': `${p.rot}deg`, animationDelay: `${p.delay}ms` } as CSSProperties}
        >
          <HeartShape size={p.size} id={`${Math.round(b.id)}p${i}`} tone={p.tone} />
        </span>
      ))}
    </div>
  );
}

export function HeartBursts({ list }: { list: Burst[] }) {
  return (
    <>
      {list.map((b) => (
        <OneBurst key={b.id} b={b} />
      ))}
    </>
  );
}

export const FX_CSS = `
.hb{position:absolute;z-index:9;pointer-events:none;width:0;height:0}
.hb-main{position:absolute;left:-56px;top:-56px;display:block;filter:drop-shadow(0 10px 22px rgba(255,31,75,.55));animation:hbMain 1s cubic-bezier(.2,.9,.25,1) forwards;transform-origin:50% 60%}
.hb-ring{position:absolute;left:-46px;top:-46px;width:92px;height:92px;border-radius:50%;background:radial-gradient(circle,rgba(255,60,95,.45),rgba(255,60,95,0) 68%);opacity:0;animation:hbRing .75s ease-out forwards}
.hb-p{position:absolute;left:-14px;top:-14px;display:block;opacity:0;animation:hbPart 1.05s cubic-bezier(.2,.7,.3,1) forwards;filter:drop-shadow(0 3px 6px rgba(255,31,75,.4))}
/* the like effect must stay visible even with reduced-motion / battery-saver */
.kt .hb .hb-main{animation-duration:1s !important;animation-iteration-count:1 !important}
.kt .hb .hb-ring{animation-duration:.75s !important;animation-iteration-count:1 !important}
.kt .hb .hb-p{animation-duration:1.05s !important;animation-iteration-count:1 !important}
.kt .likebtn.on svg{animation-duration:.5s !important}
@keyframes hbMain{0%{transform:scale(0) rotate(var(--tilt));opacity:0}18%{transform:scale(1.28) rotate(var(--tilt));opacity:1}32%{transform:scale(.96) rotate(var(--tilt))}46%{transform:scale(1.06) rotate(var(--tilt))}62%{transform:scale(1) rotate(var(--tilt));opacity:1}100%{transform:scale(1.15) translateY(-46px) rotate(var(--tilt));opacity:0}}
@keyframes hbRing{0%{transform:scale(.4);opacity:.95}100%{transform:scale(2.6);opacity:0}}
@keyframes hbPart{0%{transform:translate(0,0) scale(.2) rotate(0);opacity:0}18%{opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(1) rotate(var(--rot));opacity:0}}
.likebtn.on svg{animation:likePop .5s cubic-bezier(.2,.9,.25,1.3)}
@keyframes likePop{0%{transform:scale(.4)}45%{transform:scale(1.35)}70%{transform:scale(.94)}100%{transform:scale(1)}}
.post{touch-action:manipulation}
`;
