import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir, copyFile, stat, writeFile} from 'node:fs/promises';
import {bundle} from '@remotion/bundler';
import {selectComposition, renderMedia, renderStill} from '@remotion/renderer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(root, '../site/brand/motion');
const review = path.join(root, 'out/review/v1');
await mkdir(output, {recursive: true});
await mkdir(review, {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.tsx')});
const loop = await selectComposition({serveUrl, id: 'KernelLoop', inputProps: {fps: 60}});
const film = await selectComposition({serveUrl, id: 'KernelFilm', inputProps: {fps: 60}});
const base = {serveUrl, imageFormat: 'png', concurrency: 4, logLevel: 'error'};
for (const [composition, frame, file] of [[loop, 0, 'logo-start.png'], [loop, 150, 'logo-pose.png'], [loop, 479, 'logo-end.png'], [film, 90, 'identity.png'], [film, 330, 'blackhat.png'], [film, 570, 'kaspersky.png'], [film, 810, 'close.png']]) {
  await renderStill({...base, composition, frame, output: path.join(review, file)});
  process.stdout.write(`Still ${file}\n`);
}
await copyFile(path.join(review, 'logo-pose.png'), path.join(output, 'kernel-poster.png'));
await copyFile(path.join(review, 'identity.png'), path.join(output, 'kernel-film-poster.png'));
if (process.argv[2] === 'stills') process.exit(0);
for (const [composition, name] of [[loop, 'kernel-loop.mp4'], [film, 'kernel-film.mp4']]) {
  const outputLocation = path.join(output, name);
  let reported = -1;
  await renderMedia({...base, composition, codec: 'h264', crf: 22, pixelFormat: 'yuv420p', muted: true, outputLocation, x264Preset: 'fast', onProgress: ({progress}) => {
    const checkpoint = Math.floor(progress * 5);
    if (checkpoint > reported) {
      reported = checkpoint;
      process.stdout.write(`${name} ${checkpoint * 20}%\n`);
    }
  }});
  await copyFile(outputLocation, path.join(review, name));
  process.stdout.write(`\n${name}: ${(await stat(outputLocation)).size} bytes\n`);
}
const gifComposition = {...loop, width: 360, height: 360, fps: 15, durationInFrames: 120};
await renderMedia({...base, composition: gifComposition, codec: 'gif', imageFormat: 'png', outputLocation: path.join(output, 'kernel-loop.gif'), muted: true});
await copyFile(path.join(output, 'kernel-loop.gif'), path.join(review, 'kernel-loop.gif'));
await writeFile(path.join(output, 'README.txt'), 'Kernel Kittens motion assets. Silent 8-second logo loop and 16-second team film. Generated with Remotion; editable source and render commands are in videos/.\n');
process.stdout.write(`GIF: ${(await stat(path.join(output, 'kernel-loop.gif'))).size} bytes\n`);
