import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {execFile} from 'node:child_process';
import {stat, readFile, writeFile} from 'node:fs/promises';
import {RenderInternals} from '@remotion/renderer';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(root, '../site/brand/motion');
const bin = type => RenderInternals.getExecutablePath({type, logLevel: 'error', indent: false, binariesDirectory: null});
// The Remotion binary intentionally omits the rawvideo muxer. Verification uses
// a full ffmpeg, from FFMPEG_BINARY/PATH or the default WSL distro on Windows.
const fullFfmpeg = async args => {
  const useWsl = process.platform === 'win32' && !process.env.FFMPEG_BINARY;
  const linuxPath = value => value.replace(/^([A-Za-z]):[\\/]/, (_, drive) => `/mnt/${drive.toLowerCase()}/`).replaceAll('\\', '/');
  return run(useWsl ? 'wsl.exe' : (process.env.FFMPEG_BINARY || 'ffmpeg'), useWsl ? ['--exec', 'ffmpeg', ...args.map(linuxPath)] : args, {encoding: 'buffer', maxBuffer: 1280 * 720 * 4});
};
const checks = [];
for (const [name, width, height, duration] of [['kernel-loop.mp4', 800, 800, 8], ['kernel-film.mp4', 1280, 720, 16], ['kernel-loop.gif', 360, 360, 8]]) {
  const file = path.join(dir, name);
  const {stdout} = await run(bin('ffprobe'), ['-v', 'error', '-show_entries', 'format=duration:stream=width,height,codec_name,nb_frames', '-of', 'json', file]);
  const data = JSON.parse(stdout);
  const stream = data.streams[0];
  if (stream.width !== width || stream.height !== height || Math.abs(Number(data.format.duration) - duration) > 0.1) throw new Error(`Wrong media metadata for ${name}: ${stdout}`);
  const decoded = await fullFfmpeg(['-v', 'error', '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1']);
  const bg = [...decoded.stdout.subarray(0, 3)];
  if (bg.some(v => Math.abs(v - 6) > 3)) throw new Error(`Unexpected decoded background for ${name}: ${bg}`);
  checks.push({name, width, height, duration: Number(data.format.duration), bytes: (await stat(file)).size, decodedBackground: bg});
}
const first = await readFile(path.join(root, 'out/review/v1/logo-start.png'));
const last = await readFile(path.join(root, 'out/review/v1/logo-end.png'));
if (!first.equals(last)) throw new Error('First and last uncompressed loop poses differ');
const decodeLoopFrame = async time => (await fullFfmpeg(['-v', 'error', '-ss', String(time), '-i', path.join(dir, 'kernel-loop.mp4'), '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'])).stdout;
const decodedFirst = await decodeLoopFrame(0);
const decodedLast = await decodeLoopFrame(479 / 60);
if (decodedFirst.length !== decodedLast.length) throw new Error('Decoded endpoint frame sizes differ');
let totalError = 0;
for (let i = 0; i < decodedFirst.length; i++) totalError += Math.abs(decodedFirst[i] - decodedLast[i]);
const seamMeanError = totalError / decodedFirst.length;
if (seamMeanError > 1) throw new Error(`Loop seam differs by ${seamMeanError} average RGB units`);
const report = {checkedAt: new Date().toISOString(), equalLoopEndpointPNGs: true, loopDecodedSeamMeanError: seamMeanError, assets: checks};
await writeFile(path.join(root, 'out/review/v1/verification.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
