import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import path from 'path';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browserExecutable = process.env.BROWSER_EXECUTABLE || null;
const composition = await selectComposition({serveUrl, id: 'Launch', browserExecutable});
let last = -1;
await renderMedia({composition, serveUrl, codec: 'h264', crf: 16, audioCodec: 'aac', audioBitrate: '320k', outputLocation: 'out/bot-studio-launch.mp4', browserExecutable, concurrency: 4, imageFormat: 'jpeg', jpegQuality: 92,
  onProgress: ({progress}) => { const p = Math.floor(progress * 20); if (p !== last) { last = p; console.log('progress', (progress*100).toFixed(0)); } }});
console.log('DONE');
