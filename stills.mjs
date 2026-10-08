import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'path';
const frames = process.argv.slice(2).map(Number);
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browserExecutable = process.env.BROWSER_EXECUTABLE || null;
const composition = await selectComposition({serveUrl, id: 'Launch', browserExecutable});
for (const f of frames) {
  await renderStill({composition, serveUrl, output: `out/stills/f${String(f).padStart(5,'0')}.jpg`, frame: f, imageFormat: 'jpeg', jpegQuality: 80, browserExecutable, scale: 0.5});
  console.log('ok', f);
}
