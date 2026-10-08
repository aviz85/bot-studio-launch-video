// s03 · Reveal — local app rig: the Bot Studio window as separate frost-glass layers in a cine World, with
// per-layer beat-timed flights from depth, exploded spacing, light beams, lock-in flashes and a ghost target frame.
// (A local variant of ui/holo HoloAppFrame: that component only offers one linear `assemble` clock with a fixed
// front-to-back order, but the brief needs sidebar → top bar → main → chat on exact half beats, then a separate lock.)
import React from 'react';
import {Obj} from '../../cine';
import {clamp, lerp} from '../../lib';
import {APP_W, APP_H, Sidebar, TopBar, ChatPanel, DashboardMain, GlassPane, Beam3D, UITheme} from '../../ui';

export type LayerKey = 'base' | 'side' | 'top' | 'main' | 'chat';
type Def = {key: LayerKey; x: number; y: number; w: number; h: number; zu: number; sx: number; sy: number; anchors: [number, number][]};
export const LAYERS: Def[] = [
  {key: 'base', x: 0, y: 0, w: APP_W, h: APP_H, zu: 0, sx: 0, sy: 0, anchors: []},
  {key: 'side', x: 12, y: 12, w: 240, h: 976, zu: 0.7, sx: -1, sy: 0, anchors: [[20, 20], [220, 20], [20, 956], [220, 956]]},
  {key: 'top', x: 276, y: 6, w: 1300, h: 76, zu: 1.1, sx: 0, sy: -0.6, anchors: [[30, 38], [1270, 38]]},
  {key: 'main', x: 252, y: 78, w: 964, h: 912, zu: 1.6, sx: 0, sy: 0, anchors: [[24, 24], [940, 24], [24, 888], [940, 888]]},
  {key: 'chat', x: 1222, y: 86, w: 360, h: 895, zu: 2.4, sx: 1, sy: 0, anchors: [[24, 24], [336, 24], [24, 871], [336, 871]]},
];

/** Per-layer timing (rig-local frames). fly = flight start; land = when it arrives (expo-out). */
export type LayerTiming = Partial<Record<LayerKey, number>>;

const expoOut = (u: number) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u));

export type AppRigProps = {
  /** rig clock (scene-local frame) */
  t: number;
  /** GLOBAL frame for audio-reactive content */
  f: number;
  /** flight start frame per layer (scene-local); layers without a key are hidden until `lockAt` (base) */
  fly: LayerTiming;
  /** flight length (frames) */
  flyDur?: number;
  /** explode amount (0 = assembled) */
  explode: number;
  spacing?: number;
  spread?: number;
  /** frame of the final lock (lock-in flashes + base pane fill) */
  lockAt: number;
  /** light sweep progress 0..1 */
  sheen?: number;
  /** beams between layers 0..1 */
  beams?: number;
  /** ghost target frame (holographic outline of the window) 0..1 */
  ghost?: number;
  /** kick pulse 0..1 (glow) */
  pulse?: number;
  /** cheap stand-in content for heavily motion-blurred frames (whip out) */
  lite?: boolean;
};

/** World-space centre offset of a layer (app centre = rig origin). */
const centre = (L: Def): [number, number] => [L.x + L.w / 2 - APP_W / 2, L.y + L.h / 2 - APP_H / 2];

export const layerPose = (L: Def, i: number, p: AppRigProps) => {
  const {t, fly, flyDur = 16, explode: e, spacing = 230, spread = 80} = p;
  const start = L.key === 'base' ? undefined : fly[L.key];
  const u = start === undefined ? 1 : clamp((t - start) / flyDur);
  const a = expoOut(u);
  const [cx, cy] = centre(L);
  const flyX = L.sx * 520 + (L.key === 'top' ? 0 : 0);
  const flyY = L.sy * 380 + (L.key === 'main' ? 160 : 0);
  const x = cx + L.sx * spread * e + flyX * (1 - a);
  const y = cy + L.sy * spread * e + flyY * (1 - a);
  const z = L.zu * spacing * e + i * 2 - 2600 * (1 - a);
  return {x, y, z, a, u, visible: start === undefined ? true : t >= start, start};
};

/** Rim flash envelope: a short flash when the flight lands (~6 f after start) and a second one at the lock. */
const flashAt = (t: number, at: number, tau = 4) => (t < at ? 0 : Math.exp(-(t - at) / tau));

export const AppRig: React.FC<AppRigProps> = (p) => {
  const {t, f, fly, explode: e, lockAt, sheen, beams = 0, ghost = 0, pulse = 0, lite = false} = p;
  const lockP = clamp((t - lockAt + 3) / 6); // base pane fills in over the lock
  const lockFlash = flashAt(t, lockAt, 5);
  const poses = LAYERS.map((L, i) => ({L, i, ...layerPose(L, i, p)}));
  return (
    <UITheme look="frost">
      {/* ghost target: holographic outline of the window, drawn where the base will lock */}
      {ghost > 0.01 && (
        <Obj z={-6} w={APP_W} h={APP_H}>
          <GhostFrame o={ghost * (1 - lockP)} t={t} />
        </Obj>
      )}
      {/* blueprint slots: where each layer will land (exploded pose), vanish as it arrives */}
      {ghost > 0.01 && poses.map(({L, i}) => {
        if (L.key === 'base') return null;
        const st = fly[L.key];
        const land = st === undefined ? 0 : clamp((t - st - 5) / 5);
        const o = ghost * (1 - land) * (1 - lockP) * (st === undefined ? 0 : 1);
        if (o < 0.02) return null;
        const fin = layerPose(L, i, {...p, t: 1e6});
        const blink = st !== undefined && t > st - 1 && t < st + 6 ? 0.55 + 0.45 * Math.cos((t - st) * 2.4) : 1;
        return (
          <Obj key={`slot-${L.key}`} x={fin.x} y={fin.y} z={fin.z - 1} w={L.w} h={L.h} o={o * blink}>
            <SlotFrame w={L.w} h={L.h} label={SLOT_LABEL[L.key]} />
          </Obj>
        );
      })}
      {poses.map(({L, i, x, y, z, a, u, visible, start}) => {
        if (!visible) return null;
        if (L.key === 'base' && lockP <= 0) return null;
        const landFlash = start === undefined ? 0 : Math.max(0, Math.sin(Math.PI * clamp((u - 0.12) / 0.5))) * (1 - lockP * 0);
        const flash = clamp(Math.max(landFlash * 0.9, lockFlash));
        const sh = sheen === undefined ? undefined : clamp(sheen * 1.35 - i * 0.07);
        const o = L.key === 'base' ? lockP : clamp(a * 3);
        const content = (() => {
          switch (L.key) {
            case 'base':
              return <GlassPane w={L.w} h={L.h} radius={40} tint="frame" glow={0.35 + 0.5 * pulse} flash={flash * 0.7} sheen={sh} />;
            case 'side':
              return (
                <GlassPane w={L.w} h={L.h} radius={30} tint="glass" rim={0.9} specular={0.8} flash={flash} sheen={sh}>
                  <div style={{position: 'absolute', left: -10, top: -12}}><Sidebar active="Live Dashboard" t={start === undefined ? 999 : t - start + 2} /></div>
                </GlassPane>
              );
            case 'top':
              return (
                <GlassPane w={L.w} h={L.h} radius={24} tint="glass" rim={0.8} specular={0.6} flash={flash} sheen={sh} contentStyle={{padding: '0 0 0 26px'}}>
                  <TopBar title="Welcome assistant" />
                </GlassPane>
              );
            case 'main':
              return (
                <div style={{position: 'absolute', inset: 0, transformStyle: 'preserve-3d'}}>
                  <GlassPane w={L.w} h={L.h} radius={34} tint="glass" rim={0.9} flash={flash} sheen={sh} />
                  <div style={{position: 'absolute', left: 12, top: 8, width: 940, height: 895, transformStyle: 'preserve-3d', transform: 'translateZ(2px)'}}>
                    {lite ? <MainLite /> : <DashboardMain f={f} t={start === undefined ? 999 : t - start + 16} e={e * 1.1} />}
                  </div>
                </div>
              );
            case 'chat':
              return <ChatPanel t={start === undefined ? 999 : t - start} sheen={sh} flash={flash} glow={0.25 + 0.4 * pulse} />;
          }
        })();
        const tilt = (1 - a) * -18;
        return (
          <Obj key={L.key} x={x} y={y} z={z} rx={tilt} w={L.w} h={L.h} o={o < 1 ? o : 1}>
            {content}
          </Obj>
        );
      })}
      {/* flight trails: light streaks from depth to each arriving layer */}
      {poses.map(({L, x, y, z, a, u, visible}) => {
        if (!visible || L.key === 'base' || u >= 1) return null;
        const tr = (1 - u) * clamp(u * 8);
        if (tr < 0.02) return null;
        const half = L.w / 2 - 30;
        return (
          <React.Fragment key={`tr-${L.key}`}>
            {[-1, 1].map((s) => (
              <Beam3D key={s} a={[x + s * half, y, z - 1500 * (1 - a) - 400]} b={[x + s * half, y, z]} o={tr} thick={3} color={s < 0 ? '127,231,255' : '205,187,255'} pulse={0.92} />
            ))}
          </React.Fragment>
        );
      })}
      {/* beams between exploded layers and the base */}
      {beams > 0.01 && e > 0.03 && poses.flatMap(({L, x, y, z, a, visible}, li) =>
        !visible || L.key === 'base' ? [] : L.anchors.map(([ax, ay], k) => {
          const [cx, cy] = centre(L);
          const bx = x - cx, by = y - cy;
          const px = L.x + ax - APP_W / 2, py = L.y + ay - APP_H / 2;
          const uu = ((t * 0.02 + k * 0.29 + li * 0.17) % 1 + 1) % 1;
          return <Beam3D key={`${L.key}-${k}`} a={[px, py, 0]} b={[px + bx, py + by, z]} o={beams * clamp(e * 2) * clamp(a)} color="160,140,255" pulse={uu} thick={1.6} />;
        }),
      )}
    </UITheme>
  );
};

/** Flat stand-in for the dashboard (same colour layout) used only under heavy motion blur. */
const MainLite: React.FC = () => {
  const col = (x: number, c: string) => (
    <div key={x} style={{position: 'absolute', left: x, top: 64, width: 172, bottom: 24}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 80, bottom: 0, background: 'repeating-linear-gradient(180deg, rgba(57,41,75,0.5) 0 9px, transparent 9px 33px)'}} />
      <div style={{position: 'absolute', left: 92, top: 0, width: 76, bottom: 0, background: `repeating-linear-gradient(180deg, ${c} 0 11px, transparent 11px 33px)`}} />
    </div>
  );
  return (
    <div style={{position: 'relative', width: 940, height: 895}}>
      <div style={{position: 'absolute', left: 14, top: 14, width: 380, height: 48, borderRadius: 10, background: 'rgba(57,41,75,0.85)'}} />
      <div style={{position: 'absolute', left: 520, top: 18, width: 380, height: 44, borderRadius: 22, background: 'linear-gradient(90deg, rgba(231,244,185,0.9) 0 40%, rgba(255,255,255,0.8) 45%)'}} />
      <div style={{position: 'absolute', left: 0, top: 112, width: 590, height: 580, borderRadius: 26, background: 'rgba(255,255,255,0.78)'}}>
        <div style={{position: 'absolute', left: 22, top: 20, width: 150, height: 26, borderRadius: 6, background: 'rgba(57,41,75,0.8)'}} />
        {col(22, 'rgba(54,153,125,0.85)')}{col(212, 'rgba(140,107,234,0.85)')}{col(400, 'rgba(236,175,66,0.8)')}
      </div>
      {[[112, 250], [374, 200], [586, 106]].map(([y, h]) => (
        <div key={y} style={{position: 'absolute', left: 605, top: y, width: 335, height: h, borderRadius: 22, background: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.85) 0 26px, rgba(214,200,245,0.9) 26px 50px)'}} />
      ))}
      <div style={{position: 'absolute', left: 0, top: 706, width: 940, height: 189, borderRadius: 26, background: 'rgba(255,255,255,0.8)'}}>
        <div style={{position: 'absolute', left: 50, right: 50, top: 92, height: 4, background: 'linear-gradient(90deg, #8C6BEA, #36997D)'}} />
      </div>
    </div>
  );
};

const SLOT_LABEL: Record<LayerKey, string> = {base: 'WINDOW', side: 'NAV · 10 VIEWS', top: 'WORKSPACE', main: 'LIVE DASHBOARD', chat: 'TRY YOUR BOT'};

/** Blueprint outline of a layer's landing slot. */
const SlotFrame: React.FC<{w: number; h: number; label: string}> = ({w, h, label}) => (
  <div style={{position: 'relative', width: w, height: h}}>
    <div style={{position: 'absolute', inset: 0, borderRadius: 26, border: '2px dashed rgba(127,231,255,0.75)', background: 'linear-gradient(160deg, rgba(127,231,255,0.10), rgba(140,107,234,0.04) 60%, rgba(127,231,255,0.08))', boxShadow: '0 0 24px rgba(127,231,255,0.25), inset 0 0 30px rgba(127,231,255,0.12)'}} />
    <div style={{position: 'absolute', left: 18, top: h > 120 ? 18 : 22, fontFamily: 'Inter', fontWeight: 600, fontSize: 22, letterSpacing: '0.3em', color: 'rgba(190,245,255,0.95)', whiteSpace: 'nowrap', textShadow: '0 0 12px rgba(127,231,255,0.8)'}}>{label}</div>
    {h > 120 && <div style={{position: 'absolute', right: 18, bottom: 14, fontFamily: "'DejaVu Sans Mono', monospace", fontSize: 18, color: 'rgba(190,245,255,0.7)'}}>{`${w}×${h}`}</div>}
  </div>
);

/** Holographic outline of the window (target frame): thin cyan rim, corner brackets, scan line. */
const GhostFrame: React.FC<{o: number; t: number}> = ({o, t}) => {
  const scan = ((t * 14) % (APP_H + 200)) - 100;
  const br = (s: React.CSSProperties) => <div style={{position: 'absolute', width: 120, height: 120, ...s}} />;
  const c = 'rgba(127,231,255,0.95)';
  return (
    <div style={{position: 'relative', width: APP_W, height: APP_H, opacity: o}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: 40, boxShadow: 'inset 0 0 0 2px rgba(127,231,255,0.7), inset 0 0 80px rgba(127,231,255,0.16), 0 0 40px rgba(127,231,255,0.25)', background: 'linear-gradient(180deg, rgba(127,231,255,0.08), rgba(140,107,234,0.05))'}} />
      {br({left: -10, top: -10, borderLeft: `4px solid ${c}`, borderTop: `4px solid ${c}`, borderTopLeftRadius: 44})}
      {br({right: -10, top: -10, borderRight: `4px solid ${c}`, borderTop: `4px solid ${c}`, borderTopRightRadius: 44})}
      {br({left: -10, bottom: -10, borderLeft: `4px solid ${c}`, borderBottom: `4px solid ${c}`, borderBottomLeftRadius: 44})}
      {br({right: -10, bottom: -10, borderRight: `4px solid ${c}`, borderBottom: `4px solid ${c}`, borderBottomRightRadius: 44})}
      <div style={{position: 'absolute', left: 0, right: 0, top: scan, height: 90, background: 'linear-gradient(180deg, transparent, rgba(127,231,255,0.10) 70%, rgba(200,245,255,0.55) 98%, transparent)'}} />
      {/* grid hint */}
      <div style={{position: 'absolute', inset: 0, borderRadius: 40, opacity: 0.35, backgroundImage: 'linear-gradient(rgba(127,231,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(127,231,255,0.35) 1px, transparent 1px)', backgroundSize: '80px 80px'}} />
    </div>
  );
};

export const lerpN = lerp;
