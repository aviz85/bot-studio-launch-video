// Full render: node render.mjs  →  out/bot-studio-launch.mp4 (1920×1080, 60 fps, H.264 + AAC)
// Env: BROWSER_EXECUTABLE (Chromium headless shell; auto-detected under /opt/pw-browsers), CONCURRENCY (default 4).
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const pub = (p) => path.join(ROOT, 'public', p);
const mtime = (p) => (fs.existsSync(p) ? fs.statSync(p).mtimeMs : 0);

// 1. Audio: the film plays public/mix.wav (music + every SFX cue). Both wavs are build products (gitignored).
if (!fs.existsSync(pub('music.wav'))) {
  console.log('decoding public/music.mp3 → public/music.wav');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', pub('music.mp3'), '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', pub('music.wav')], {stdio: 'inherit'});
}
const cueFiles = fs.readdirSync(path.join(ROOT, 'sfx/cues')).map((f) => path.join(ROOT, 'sfx/cues', f));
const newestInput = Math.max(...cueFiles.map(mtime), mtime(path.join(ROOT, 'sfx/lib.py')), mtime(path.join(ROOT, 'sfx/mix.py')), mtime(pub('music.wav')));
if (mtime(pub('mix.wav')) < newestInput) {
  console.log('mixing SFX → public/mix.wav');
  execFileSync('python3', [path.join(ROOT, 'sfx/mix.py'), '--quiet'], {stdio: 'inherit'});
}

// 2. Video
const browserExecutable = process.env.BROWSER_EXECUTABLE
  || (fs.existsSync('/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell') ? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' : null);
const concurrency = +(process.env.CONCURRENCY || 4);
const t0 = Date.now();
const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src/index.ts'), publicDir: path.join(ROOT, 'public')});
const composition = await selectComposition({serveUrl, id: 'Launch', browserExecutable});
fs.mkdirSync(path.join(ROOT, 'out'), {recursive: true});
let last = -1;
const t1 = Date.now();
await renderMedia({
  composition, serveUrl, browserExecutable, concurrency,
  codec: 'h264', crf: 16, audioCodec: 'aac', audioBitrate: '320k', imageFormat: 'jpeg', jpegQuality: 92,
  outputLocation: path.join(ROOT, 'out/bot-studio-launch.mp4'),
  timeoutInMilliseconds: 120000,
  onProgress: ({progress, renderedFrames}) => {
    const p = Math.floor(progress * 20);
    if (p === last) return;
    last = p;
    const el = (Date.now() - t1) / 1000;
    const eta = renderedFrames > 0 ? (el / renderedFrames) * (composition.durationInFrames - renderedFrames) : 0;
    console.log(`progress ${(progress * 100).toFixed(0)}%  frames ${renderedFrames}/${composition.durationInFrames}  elapsed ${el.toFixed(0)}s  eta ${eta.toFixed(0)}s`);
  },
});
console.log(`DONE out/bot-studio-launch.mp4 in ${((Date.now() - t0) / 1000).toFixed(0)}s (concurrency ${concurrency})`);
