#!/usr/bin/env node
/**
 * Preview stills for one scene (isolated bundle) or the whole film.
 *
 *   node tools/preview.mjs <s01..s10|all> [--frames 900,950,1000] [--range 860-1070:13] [--beats 32,33.5]
 *                          [--scale 0.5] [--grade] [--video] [--cols 4]
 *
 * Frame numbers are GLOBAL film frames (60 fps). Default: every half beat across the scene.
 * Output: out/preview/<id>/fNNNNN.jpg + out/preview/<id>/sheet.jpg (labelled contact sheet).
 * --grade   also renders the GlobalGrade finishing pass (vfx) on top.
 * --video   renders the frame range as out/preview/<id>/clip.mp4 (with audio) instead of stills.
 *
 * Demo sandboxes: `node tools/preview.mjs demo:vfx --frames 0,30,60 [--from 860 --dur 600]` previews
 * src/demos/vfx.tsx (export const Scene: React.FC<SceneProps>), mounted at global frame --from (default 0).
 */
import {bundle} from '@remotion/bundler';
import {renderStill, renderMedia, selectComposition, openBrowser} from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
import {execFileSync} from 'child_process';
import {fileURLToPath} from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const id = args[0];
if (!id) { console.error('usage: node tools/preview.mjs <sceneId|all> [...]'); process.exit(1); }
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : def; };
const FPS = 60, PER = 0.44776219579374094;
const B = (k) => Math.round(k * PER * FPS);
const audio = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/audio.json'), 'utf8'));
const DURATION = audio.frames;

// scene ranges from registry (parse the TS literal)
const reg = fs.readFileSync(path.join(ROOT, 'src/scenes/registry.ts'), 'utf8');
const defs = [...reg.matchAll(/id: '(s\d+)'.*?startBeat: ([\d.]+), endBeat: ([\d.]+|null)/g)].map((m) => ({id: m[1], from: B(+m[2]), to: m[3] === 'null' ? DURATION : B(+m[3])}));
const isDemo = id.startsWith('demo:');
const demoName = isDemo ? id.slice(5) : null;
const def = id === 'all' ? {id: 'all', from: 0, to: DURATION} : isDemo ? {id, from: +(opt('from', 0)), to: +(opt('from', 0)) + +(opt('dur', 600))} : defs.find((d) => d.id === id);
if (!def) { console.error('unknown scene', id); process.exit(1); }

let frames = [];
if (opt('frames')) frames = String(opt('frames')).split(',').map(Number);
else if (opt('beats')) frames = String(opt('beats')).split(',').map((b) => B(+b));
else if (opt('range')) { const [r, st] = String(opt('range')).split(':'); const [a, b] = r.split('-').map(Number); for (let f = a; f <= b; f += +(st || 13)) frames.push(f); }
else { for (let f = def.from + 6; f < def.to; f += Math.round(PER * FPS / 2)) frames.push(f); }
frames = frames.filter((f) => f >= 0 && f < DURATION);

const scale = +opt('scale', 0.5);
const grade = !!opt('grade', false);
const outDir = path.join(ROOT, 'out/preview', id.replace(':', '-'));
fs.mkdirSync(outDir, {recursive: true});

// isolated entry so a broken file elsewhere cannot break this preview
const entryDir = path.join(ROOT, '.preview', id.replace(':', '-'));
fs.mkdirSync(entryDir, {recursive: true});
const entry = path.join(entryDir, 'entry.tsx');
const rel = (p) => path.relative(entryDir, path.join(ROOT, p)).split(path.sep).join('/');
if (id === 'all') {
  fs.writeFileSync(entry, `import {registerRoot} from 'remotion';\nimport {Root} from '${rel('src/Root')}';\nregisterRoot(Root);\n`);
} else {
  fs.writeFileSync(entry, `import React from 'react';
import {registerRoot, Composition, Sequence, AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {Scene} from '${rel(isDemo ? 'src/demos/' + demoName : 'src/scenes/' + id)}';
${grade ? `import {GlobalGrade} from '${rel('src/vfx')}';` : ''}
const G: React.FC = () => { const f = useCurrentFrame(); return ${grade ? '<GlobalGrade frame={f} />' : 'null'}; };
const P: React.FC = () => (
  <AbsoluteFill style={{background: '#05020A'}}>
    <Sequence from={${def.from}} durationInFrames={${def.to - def.from}}><Scene from={${def.from}} dur={${def.to - def.from}} /></Sequence>
    <G />
    <Audio src={staticFile('mix.wav')} />
  </AbsoluteFill>
);
const R: React.FC = () => <Composition id="Launch" component={P} durationInFrames={${DURATION}} fps={60} width={1920} height={1080} />;
registerRoot(R);
`);
}

const browserExecutable = process.env.BROWSER_EXECUTABLE || (fs.existsSync('/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell') ? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' : null);
const t0 = Date.now();
const serveUrl = await bundle({entryPoint: entry, publicDir: path.join(ROOT, 'public'), outDir: path.join(entryDir, 'bundle')});
const composition = await selectComposition({serveUrl, id: 'Launch', browserExecutable});

if (opt('video')) {
  const a = Math.min(...frames), b = Math.max(...frames);
  await renderMedia({composition, serveUrl, codec: 'h264', crf: 22, outputLocation: path.join(outDir, 'clip.mp4'), frameRange: [a, b], scale, browserExecutable, concurrency: 2});
  console.log('clip', path.join(outDir, 'clip.mp4'), `${((Date.now() - t0) / 1000).toFixed(1)}s`);
  process.exit(0);
}

const browser = await openBrowser('chrome', {browserExecutable});
const files = [];
for (const f of frames) {
  const file = path.join(outDir, `f${String(f).padStart(5, '0')}.jpg`);
  const s = Date.now();
  await renderStill({composition, serveUrl, output: file, frame: f, imageFormat: 'jpeg', jpegQuality: 82, scale, puppeteerInstance: browser});
  files.push([f, file]);
  console.log(`frame ${f} (beat ${(f / (PER * FPS)).toFixed(2)}) ${Date.now() - s}ms`);
}
await browser.close({silent: true});

// labelled contact sheet
const cols = +opt('cols', 4);
try {
  const w = 480;
  const inputs = files.flatMap(([, p]) => ['-i', p]);
  const lab = files.map(([f], i) => `[${i}]scale=${w}:-1,drawtext=text='${f} b${(f / (PER * FPS)).toFixed(1)}':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6[v${i}]`).join(';');
  const n = files.length;
  const pad = (cols - (n % cols)) % cols;
  let fc = lab;
  const labels = files.map((_, i) => `[v${i}]`);
  for (let i = 0; i < pad; i++) { fc += `;color=black:s=${w}x${Math.round(w * 9 / 16)}:d=1[p${i}]`; labels.push(`[p${i}]`); }
  fc += `;${labels.join('')}xstack=inputs=${labels.length}:layout=${labels.map((_, i) => `${(i % cols) ? Array.from({length: i % cols}, () => 'w0').join('+') : '0'}_${Math.floor(i / cols) ? Array.from({length: Math.floor(i / cols)}, () => 'h0').join('+') : '0'}`).join('|')}[out]`;
  if (labels.length === 1) fc = lab.replace(/\[v0\]$/, '[out]');
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...inputs, '-filter_complex', fc, '-map', '[out]', '-frames:v', '1', path.join(outDir, 'sheet.jpg')]);
  console.log('sheet', path.join(outDir, 'sheet.jpg'));
} catch (e) { console.error('sheet failed', e.message); }
console.log(`done ${files.length} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
