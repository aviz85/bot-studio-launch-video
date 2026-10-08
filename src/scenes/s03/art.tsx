// s03 · Reveal — hero art: glass avatar medallion, shard implosion, chrome title, tagline, converging light.
// All pure functions of the frame. Owned by the s03 scene agent.
import React from 'react';
import {Img} from 'remotion';
import {Obj} from '../../cine';
import {DISPLAY, clamp, lerp, rand} from '../../lib';
import {glowSprite, useCanvasDraw, W, H, full, prng} from '../../vfx';

/* ------------------------------------------------------------------ */
/* Avatar art (brand winking robot) as a cached SVG image               */
/* ------------------------------------------------------------------ */
/** Medallion diameter in world px (rendered natively large so macro shots stay crisp). */
export const AV = 480;

/** Hero version of the Bot Studio avatar (same construction as ui/kit Avatar, brand wink chevron from the real logo).
 *  wink: 0 = both eyes open, 0.5 = right eye half shut, 1 = brand wink "<". Quantised so each state decodes once. */
const avatarSvg = (wink: number) => {
  const w = Math.round(clamp(wink) * 2) / 2;
  const eye = w >= 1
    ? `<path d="M44.6 26.6 L37.6 30.4 L44.6 34.2" stroke="#39294B" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<ellipse cx="40.6" cy="30.2" rx="3.2" ry="${(3.6 * (1 - w * 1.4) + 0.4).toFixed(2)}" fill="#39294B"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${AV * 2}" height="${AV * 2}" viewBox="0 0 64 64">
<defs>
<radialGradient id="b" cx="32%" cy="26%" r="85%"><stop offset="0%" stop-color="#C9B6FF"/><stop offset="45%" stop-color="#9677F2"/><stop offset="100%" stop-color="#5B36D6"/></radialGradient>
<linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#EEE8FB"/></linearGradient>
<radialGradient id="h" cx="30%" cy="18%" r="55%"><stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.55"/><stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
</defs>
<circle cx="32" cy="32" r="31.4" fill="url(#b)"/>
<circle cx="32" cy="32" r="31.4" fill="url(#h)"/>
<circle cx="32" cy="32" r="30.6" fill="none" stroke="#E9E0FF" stroke-opacity="0.55" stroke-width="0.8"/>
<line x1="32" y1="9.5" x2="32" y2="15.5" stroke="#39294B" stroke-width="2.4" stroke-linecap="round"/>
<circle cx="32" cy="7.6" r="3" fill="#2C1E40"/>
<rect x="13" y="16" width="38" height="32" rx="14" fill="url(#f)"/>
<rect x="9.2" y="27" width="4.6" height="10" rx="2.3" fill="#E4DBF7"/>
<rect x="50.2" y="27" width="4.6" height="10" rx="2.3" fill="#E4DBF7"/>
<ellipse cx="24.2" cy="30.2" rx="3.2" ry="3.6" fill="#39294B"/>
${eye}
<path d="M24 38.4 q 8 6.2 16 0" stroke="#39294B" stroke-width="2.9" fill="none" stroke-linecap="round"/>
<circle cx="19.6" cy="37.2" r="2.3" fill="#F7B6D2" opacity="0.75"/>
<circle cx="44.4" cy="37.2" r="2.3" fill="#F7B6D2" opacity="0.75"/>
</svg>`;
};
const URI_CACHE = new Map<number, string>();
export const avatarUri = (wink: number) => {
  const k = Math.round(clamp(wink) * 2) / 2;
  let u = URI_CACHE.get(k);
  if (!u) {
    u = `data:image/svg+xml;utf8,${encodeURIComponent(avatarSvg(k))}`;
    URI_CACHE.set(k, u);
  }
  return u;
};

/** Flat avatar image (size px). Img → Remotion waits for decode before capture. */
export const AvatarImg: React.FC<{size: number; wink?: number; style?: React.CSSProperties}> = ({size, wink = 1, style}) => (
  <Img src={avatarUri(wink)} style={{width: size, height: size, display: 'block', ...style}} />
);

/* ------------------------------------------------------------------ */
/* Glass shards (jittered grid triangulation of the medallion)          */
/* ------------------------------------------------------------------ */
type Shard = {
  pts: [number, number][]; // triangle in avatar px (0..AV)
  bx: number; by: number; bw: number; bh: number; // bbox
  cx: number; cy: number; // centroid (relative to medallion centre)
  off: [number, number, number]; // start offset (world px)
  rot: [number, number, number];
  spin: [number, number, number];
  t0: number; t1: number; // convergence window (shot-local frames)
  r: number; // normalised distance from centre
};
const N = 5;
const buildShards = (): Shard[] => {
  const g: [number, number][][] = [];
  for (let j = 0; j <= N; j++) {
    g.push([]);
    for (let i = 0; i <= N; i++) {
      const edge = i === 0 || j === 0 || i === N || j === N;
      const jx = edge ? 0 : (rand(i * 17.3 + j * 5.1) - 0.5) * 0.62;
      const jy = edge ? 0 : (rand(i * 3.7 + j * 11.9) - 0.5) * 0.62;
      g[j].push([((i + jx) / N) * AV, ((j + jy) / N) * AV]);
    }
  }
  const out: Shard[] = [];
  let k = 0;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const a = g[j][i], b = g[j][i + 1], c = g[j + 1][i + 1], d = g[j + 1][i];
      const tris: [number, number][][] = (i + j) % 2 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]];
      for (const pts of tris) {
        const cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3 - AV / 2;
        const cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3 - AV / 2;
        const r = Math.hypot(cx, cy) / (AV / 2);
        if (r > 1.02) continue; // fully transparent corner pieces
        const bx = Math.floor(Math.min(...pts.map((p) => p[0]))) - 1;
        const by = Math.floor(Math.min(...pts.map((p) => p[1]))) - 1;
        const bw = Math.ceil(Math.max(...pts.map((p) => p[0]))) + 1 - bx;
        const bh = Math.ceil(Math.max(...pts.map((p) => p[1]))) + 1 - by;
        const s = k * 7.31 + 3;
        const ang = Math.atan2(cy, cx) + (rand(s) - 0.5) * 1.3;
        const R = 300 + rand(s * 1.7) * 950;
        const z = -950 + rand(s * 2.3) * 1250; // some come from the lens side
        out.push({
          pts, bx, by, bw, bh, cx, cy, r,
          off: [Math.cos(ang) * R, Math.sin(ang) * R * 0.8 - 120, z],
          rot: [(rand(s * 3.1) - 0.5) * 320, (rand(s * 4.3) - 0.5) * 360, (rand(s * 5.7) - 0.5) * 220],
          spin: [(rand(s * 6.1) - 0.5) * 9, (rand(s * 7.9) - 0.5) * 11, (rand(s * 8.3) - 0.5) * 6],
          t0: 1 + rand(s * 9.7) * 5,
          t1: 17 + r * 8 + rand(s * 2.9) * 1.5,
        });
        k++;
      }
    }
  }
  return out;
};
export const SHARDS = buildShards();
/** Frame (shot-local) at which the last shard locks. */
export const SHARD_LOCK = Math.max(...SHARDS.map((s) => s.t1));

const easeConverge = (u: number) => Math.pow(u, 2.35); // reversed explosion: accelerate into the lock

/** Shard positions/state for local frame t (relative to the drop). */
export const shardState = (s: Shard, t: number) => {
  const u = clamp((t - s.t0) / (s.t1 - s.t0));
  const e = easeConverge(u);
  const blast = 0.72 + 0.28 * (1 - Math.exp(-Math.max(0, t) / 3.2)); // pushed outward by the blast first
  const k = (1 - e) * blast;
  const x = s.cx + s.off[0] * k, y = s.cy + s.off[1] * k, z = s.off[2] * k;
  const rx = (s.rot[0] + s.spin[0] * t) * (1 - e), ry = (s.rot[1] + s.spin[1] * t) * (1 - e), rz = (s.rot[2] + s.spin[2] * t) * (1 - e);
  return {x, y, z, rx, ry, rz, e, u, locked: u >= 1};
};

/** The cloud of shards converging into the medallion (place inside an Obj at the medallion centre). */
export const ShardCloud: React.FC<{t: number; glint?: number}> = ({t, glint = 1}) => (
  <>
    {SHARDS.map((s, i) => {
      const st = shardState(s, t);
      const poly = s.pts.map((p) => `${(p[0] - s.bx).toFixed(1)}px ${(p[1] - s.by).toFixed(1)}px`).join(', ');
      const fl = 1 - st.e; // in flight → glassy & bright
      const ang = (st.rx * 0.7 + st.ry) * (Math.PI / 180);
      const spec = glint * clamp(fl * 1.4) * (0.25 + 0.75 * Math.pow(Math.abs(Math.cos(ang * 0.5 + i)), 6));
      const lockFlash = st.locked ? Math.exp(-(t - s.t1) / 2.5) : 0;
      const svgPts = s.pts.map((p) => `${(p[0] - s.bx).toFixed(1)},${(p[1] - s.by).toFixed(1)}`).join(' ');
      return (
        <Obj key={i} x={st.x + s.bx + s.bw / 2 - AV / 2 - s.cx} y={st.y + s.by + s.bh / 2 - AV / 2 - s.cy} z={st.z + i * 0.04} rx={st.rx} ry={st.ry} rz={st.rz} w={s.bw} h={s.bh} nearFade={[40, 260]}>
          <div style={{position: 'absolute', inset: 0, clipPath: `polygon(${poly})`, overflow: 'hidden'}}>
            <Img src={avatarUri(0)} style={{position: 'absolute', left: -s.bx, top: -s.by, width: AV, height: AV}} />
            {(spec > 0.01 || lockFlash > 0.02) && (
              <div style={{position: 'absolute', inset: 0, background: `linear-gradient(${125 + i * 23}deg, rgba(255,255,255,${(0.75 * spec + 0.5 * lockFlash).toFixed(3)}) 0%, rgba(200,240,255,${(0.35 * spec + 0.3 * lockFlash).toFixed(3)}) 45%, rgba(140,107,234,${(0.25 * spec).toFixed(3)}) 100%)`}} />
            )}
          </div>
          {fl > 0.02 && (
            <svg width={s.bw} height={s.bh} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
              <polygon points={svgPts} fill={`rgba(200,240,255,${(0.08 * clamp(fl * 1.6)).toFixed(3)})`} stroke={`rgba(235,250,255,${(0.95 * clamp(fl * 1.6)).toFixed(3)})`} strokeWidth={2.4} strokeLinejoin="round" />
            </svg>
          )}
        </Obj>
      );
    })}
  </>
);

/* ------------------------------------------------------------------ */
/* Glass medallion (thickness, rim, specular, sheen)                    */
/* ------------------------------------------------------------------ */
export const Medallion: React.FC<{wink: number; sheen?: number; glow?: number; rimHot?: number; thick?: number; bulb?: number}> = ({wink, sheen, glow = 1, rimHot = 0, thick = 1, bulb = 0}) => {
  const D = AV;
  const layers = 9;
  return (
    <>
      {/* soft halo far behind (gradient only) */}
      <Obj z={-90} w={D * 2.6} h={D * 2.6} dof={false}>
        <div style={{width: D * 2.6, height: D * 2.6, borderRadius: '50%', background: `radial-gradient(circle, rgba(160,130,255,${(0.42 * glow).toFixed(3)}) 0%, rgba(127,231,255,${(0.12 * glow).toFixed(3)}) 28%, rgba(106,69,224,${(0.08 * glow).toFixed(3)}) 45%, transparent 68%)`}} />
      </Obj>
      {/* glass thickness: stacked rings → a luminous edge seen from 3/4 angles */}
      {thick > 0 && Array.from({length: layers}, (_, i) => {
        const z = -3 - (i * 44 * thick) / layers;
        const edge = i === layers - 1 ? 0.95 : 0.55;
        return (
          <Obj key={i} z={z} w={D} h={D} dof={false}>
            <div style={{width: D, height: D, borderRadius: '50%', background: `radial-gradient(circle closest-side, rgba(90,54,214,${i === layers - 1 ? 0.9 : 0}) 0%, rgba(90,54,214,${i === layers - 1 ? 0.9 : 0}) 90%, rgba(190,170,255,${edge}) 96%, rgba(127,231,255,${(edge * 0.8).toFixed(2)}) 99%, transparent 100%)`}} />
          </Obj>
        );
      })}
      {/* front face */}
      <Obj z={0} w={D} h={D}>
        <div style={{position: 'relative', width: D, height: D, borderRadius: '50%'}}>
          <AvatarImg size={D} wink={wink} />
          {/* specular dome */}
          <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(120% 90% at 28% 12%, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.06) 38%, transparent 55%), radial-gradient(70% 50% at 70% 100%, rgba(127,231,255,0.18), transparent 70%)'}} />
          {/* fresnel rim */}
          <div style={{position: 'absolute', inset: -2, borderRadius: '50%', background: `radial-gradient(circle closest-side, transparent 91%, rgba(255,255,255,${(0.35 + 0.65 * rimHot).toFixed(3)}) 97%, rgba(127,231,255,${(0.5 + 0.5 * rimHot).toFixed(3)}) 99.5%, transparent 100%)`}} />
          {sheen !== undefined && sheen > 0 && sheen < 1 && (
            <div style={{position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden'}}>
              <div style={{position: 'absolute', inset: 0, background: `linear-gradient(115deg, transparent ${(lerp(-30, 130, sheen) - 14).toFixed(1)}%, rgba(255,255,255,0.0) ${(lerp(-30, 130, sheen) - 8).toFixed(1)}%, rgba(255,255,255,0.75) ${lerp(-30, 130, sheen).toFixed(1)}%, rgba(255,255,255,0) ${(lerp(-30, 130, sheen) + 6).toFixed(1)}%, transparent ${(lerp(-30, 130, sheen) + 12).toFixed(1)}%)`}} />
            </div>
          )}
          {/* antenna bulb glow (kick-reactive) */}
          {bulb > 0.01 && (
            <div style={{position: 'absolute', left: D / 2 - 70, top: D * (7.6 / 64) - 70, width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle, rgba(255,255,255,${(0.95 * bulb).toFixed(3)}) 0%, rgba(127,231,255,${(0.7 * bulb).toFixed(3)}) 14%, rgba(140,107,234,${(0.25 * bulb).toFixed(3)}) 40%, transparent 70%)`, mixBlendMode: 'screen'}} />
          )}
        </div>
      </Obj>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Chrome title — per-letter 3D slam                                    */
/* ------------------------------------------------------------------ */
export const TITLE = 'Bot Studio';
export const TITLE_SIZE = 250;
const CHROME = 'linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 24%, #E4DAFF 44%, #A58CF2 52.5%, #D9CDFF 57%, #FFFFFF 74%, #F1F8D6 92%, #E7F4B9 100%)';

/** One letter's slam state: s = 0 (far / off) … 1 (landed). */
export type LetterPose = {x: number; y: number; z: number; rx: number; ry: number; rz: number; o: number; blur: number; s: number};

/** The title as inline-block letters in a preserve-3d row (keeps real text layout). sheen = 0..1 sweep across the word. */
export const ChromeTitle: React.FC<{pose: (i: number, n: number) => LetterPose; sheen?: number; glow?: number}> = ({pose, sheen, glow = 1}) => {
  const letters = TITLE.split('');
  return (
    <div style={{position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', whiteSpace: 'nowrap', transformStyle: 'preserve-3d', fontFamily: DISPLAY, fontWeight: 900, fontSize: TITLE_SIZE, lineHeight: 1, letterSpacing: '-0.045em'}}>
      {letters.map((ch, i) => {
        const p = pose(i, letters.length);
        const pos = i / (letters.length - 1);
        const sx = sheen === undefined ? -999 : lerp(-0.35, 1.35, sheen) - pos;
        const band = sheen === undefined ? 0 : Math.exp(-Math.pow(sx / 0.16, 2));
        const shine = 50 - sx * 260; // per-letter diagonal band position (%)
        return (
          <span
            key={i}
            style={{
              display: 'inline-block', whiteSpace: 'pre', position: 'relative',
              transform: `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, ${p.z.toFixed(1)}px) rotateY(${p.ry.toFixed(2)}deg) rotateX(${p.rx.toFixed(2)}deg) rotateZ(${p.rz.toFixed(2)}deg) scale(${p.s.toFixed(4)})`,
              opacity: p.o < 1 ? Math.max(0, p.o) : undefined,
              filter: p.blur > 0.4 ? `blur(${p.blur.toFixed(1)}px)` : undefined,
              color: 'transparent',
              backgroundImage: `${band > 0.01 ? `linear-gradient(108deg, transparent ${(shine - 22).toFixed(1)}%, rgba(255,255,255,${(0.95 * band).toFixed(3)}) ${shine.toFixed(1)}%, transparent ${(shine + 22).toFixed(1)}%), ` : ''}${CHROME}`,
              WebkitBackgroundClip: 'text', backgroundClip: 'text',
              paddingBottom: 18, marginBottom: -18,
            }}
          >
            {ch}
          </span>
        );
      })}
      {/* luminous underglow (gradient only) */}
      <div style={{position: 'absolute', left: '8%', right: '8%', top: '62%', height: 90, transform: 'translateZ(-30px)', background: `radial-gradient(50% 50% at 50% 50%, rgba(160,130,255,${(0.32 * glow).toFixed(3)}), transparent 72%)`, pointerEvents: 'none'}} />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Tagline (screen-space super)                                         */
/* ------------------------------------------------------------------ */
export const TAGLINE = 'Bots that think in the open.';
export const Tagline: React.FC<{t: number; at: number; out?: number; y?: number; size?: number}> = ({t, at, out, y = 820, size = 68}) => {
  const words = TAGLINE.split(' ');
  const oP = out === undefined ? 0 : clamp((t - out) / 14);
  if (t < at - 1 || oP >= 1) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: y - size * 0.62, display: 'flex', justifyContent: 'center', gap: `0 ${size * 0.25}px`, fontFamily: DISPLAY, fontWeight: 800, fontSize: size, letterSpacing: '-0.035em', lineHeight: 1.12, pointerEvents: 'none'}}>
      {words.map((w, i) => {
        const p = clamp((t - at - i * 2.2) / 14);
        const e = 1 - Math.pow(1 - p, 4);
        const q = clamp((t - (out ?? 1e9) - i * 1) / 8);
        const eo = q * q;
        const open = i === words.length - 2 || i === words.length - 1; // "the open." gets the pistachio accent
        return (
          <span key={i} style={{display: 'inline-block', overflow: 'hidden', padding: `0 4px ${size * 0.16}px`, margin: `0 -4px ${-size * 0.16}px`}}>
            <span
              style={{
                display: 'inline-block',
                transform: `translateY(${((1 - e) * 92 - eo * 70).toFixed(1)}%)`,
                filter: (1 - e) * 10 + eo * 12 > 0.4 ? `blur(${((1 - e) * 10 + eo * 12).toFixed(1)}px)` : undefined,
                opacity: Math.min(1, e * 1.3) * (1 - eo),
                color: 'transparent',
                backgroundImage: open ? 'linear-gradient(180deg, #FFFFFF 0%, #F4F9DF 45%, #E7F4B9 100%)' : 'linear-gradient(180deg, #FFFFFF 0%, #EEE8FF 50%, #CDBBFF 100%)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text',
              }}
            >
              {w}
            </span>
          </span>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Converging light particles (Canvas2D, screen space)                  */
/* ------------------------------------------------------------------ */
export const ConvergeLight: React.FC<{x: number; y: number; t: number; radius: number; count?: number; end?: number; intensity?: number; seed?: number}> = ({x, y, t, radius, count = 320, end = 26, intensity = 1, seed = 11}) => {
  const ref = useCanvasDraw((ctx) => {
    if (intensity <= 0.01) return;
    ctx.globalCompositeOperation = 'lighter';
    const rnd = prng(seed);
    const cols = ['#FFFFFF', '#7FE7FF', '#CDBBFF', '#B49BF2', '#7FE7FF'];
    for (let i = 0; i < count; i++) {
      const r0 = 260 + Math.pow(rnd(), 0.8) * 1500;
      const a0 = rnd() * Math.PI * 2;
      const t0 = -2 + rnd() * 9;
      const t1 = 9 + rnd() * (end - 9);
      const rEnd = radius * (0.15 + 0.85 * Math.sqrt(rnd()));
      const swirl = (rnd() - 0.5) * 2.2;
      const col = cols[i % cols.length];
      const w = 0.8 + rnd() * 2.2;
      const u = (t - t0) / (t1 - t0);
      if (u <= 0 || u >= 1) continue;
      const pos = (uu: number) => {
        const e = Math.pow(clamp(uu), 2.1);
        const r = lerp(r0, rEnd, e);
        const a = a0 + swirl * (1 - e);
        return [x + Math.cos(a) * r, y + Math.sin(a) * r * 0.86] as const;
      };
      const [px, py] = pos(u);
      const [qx, qy] = pos(u - 0.09);
      const alpha = intensity * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 0.6);
      if (alpha < 0.02) continue;
      // tapered streak without per-particle gradients: a faint long tail + a brighter short head segment
      const [mx, my] = pos(u - 0.03);
      ctx.strokeStyle = col;
      ctx.lineCap = 'round';
      ctx.globalAlpha = Math.min(1, alpha * 0.35);
      ctx.lineWidth = w * 0.8;
      ctx.beginPath();
      ctx.moveTo(qx, qy);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(px, py);
      ctx.stroke();
      if (i % 2 === 0) {
        const sz = 10 + w * 7;
        ctx.globalAlpha = Math.min(1, alpha * 0.9);
        ctx.drawImage(glowSprite(col, 0.8), px - sz / 2, py - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;
    }
  });
  if (intensity <= 0.01) return null;
  return <canvas ref={ref} width={W} height={H} style={full} />;
};
