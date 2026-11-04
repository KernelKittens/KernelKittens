import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {execFile} from 'node:child_process';
import {mkdir, stat, readFile, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {RenderInternals} from '@remotion/renderer';
import {fullFfmpeg} from './media-tools.mjs';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(root, '../site/brand/motion');
const bin = type => RenderInternals.getExecutablePath({type, logLevel: 'error', indent: false, binariesDirectory: null});
const probe = async file => JSON.parse((await run(bin('ffprobe'), ['-v', 'error', '-show_entries', 'format=duration:stream=width,height,codec_type,codec_name,nb_frames,sample_rate,channels', '-of', 'json', file])).stdout);
async function audioMetrics(file, duration) {
  const {stdout} = await fullFfmpeg(['-v', 'error', '-i', file, '-map', '0:a:0', '-f', 'f32le', '-acodec', 'pcm_f32le', '-ac', '2', '-ar', '48000', 'pipe:1']);
  let peak = 0;
  let sum = 0;
  const count = stdout.length / 4;
  for (let i = 0; i < count; i++) {
    const value = stdout.readFloatLE(i * 4);
    if (!Number.isFinite(value)) throw new Error(`Non-finite decoded audio sample in ${file}`);
    peak = Math.max(peak, Math.abs(value));
    sum += value ** 2;
  }
  const rms = Math.sqrt(sum / count);
  const decodedDuration = count / (48000 * 2);
  if (peak > 0.95 || rms < 0.005 || rms > 0.2 || Math.abs(decodedDuration - duration) > 0.1) throw new Error(`Audio level/duration failed for ${file}: peak=${peak}, rms=${rms}, duration=${decodedDuration}`);
  const segmentRms = (start, end) => {
    const first = Math.floor(start * 48000 * 2);
    const last = Math.min(count, Math.floor(end * 48000 * 2));
    let energy = 0;
    for (let i = first; i < last; i++) energy += stdout.readFloatLE(i * 4) ** 2;
    return Math.sqrt(energy / (last - first));
  };
  return {
    peak, rms, peakDbFS: 20 * Math.log10(peak), rmsDbFS: 20 * Math.log10(rms), decodedDuration,
    first100msRms: segmentRms(0, 0.1), last100msRms: segmentRms(duration - 0.1, duration),
    seamDelta: [0, 1].map(channel => Math.abs(stdout.readFloatLE(channel * 4) - stdout.readFloatLE((count - 2 + channel) * 4))),
  };
}
const checks = [];
for (const [name, width, height, duration] of [['kernel-loop.mp4', 800, 800, 8], ['kernel-film.mp4', 1280, 720, 16], ['kernel-loop.gif', 360, 360, 8]]) {
  const file = path.join(dir, name);
  const data = await probe(file);
  const stream = data.streams.find(item => item.codec_type === 'video');
  if (stream.width !== width || stream.height !== height || Math.abs(Number(data.format.duration) - duration) > 0.1) throw new Error(`Wrong media metadata for ${name}: ${JSON.stringify(data)}`);
  const audio = data.streams.find(item => item.codec_type === 'audio');
  let sound;
  if (name === 'kernel-film.mp4') {
    if (!audio || audio.codec_name !== 'aac' || audio.channels !== 2) throw new Error('Team film must contain stereo AAC music');
    sound = await audioMetrics(file, 16);
    if (sound.first100msRms > sound.rms * 0.1 || sound.last100msRms > sound.rms * 0.1) throw new Error('Film music fades are missing');
  } else if (audio) throw new Error(`${name} must remain silent`);
  const decoded = await fullFfmpeg(['-v', 'error', '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1']);
  const bg = [...decoded.stdout.subarray(0, 3)];
  if (bg.some(v => Math.abs(v - 6) > 3)) throw new Error(`Unexpected decoded background for ${name}: ${bg}`);
  checks.push({name, width, height, duration: Number(data.format.duration), bytes: (await stat(file)).size, decodedBackground: bg, ...(sound ? {audio: sound} : {silent: true})});
}
for (const [name, duration] of [['kernel-ambient.mp3', 32], ['kernel-intro.mp3', 16]]) {
  const file = path.resolve(root, '../site/brand/audio', name);
  const data = await probe(file);
  const stream = data.streams.find(item => item.codec_type === 'audio');
  if (!stream || stream.codec_name !== 'mp3' || stream.channels !== 2 || Number(stream.sample_rate) !== 48000) throw new Error(`${name} must be a48kHz stereo MP3`);
  const metrics = await audioMetrics(file, duration);
  if (name === 'kernel-ambient.mp3' && metrics.seamDelta.some(value => value > 0.02)) throw new Error('Ambient loop has an excessive seam discontinuity');
  checks.push({name, bytes: (await stat(file)).size, audio: metrics});
}
let equalLoopEndpointPNGs = null;
for (const version of ['v2', 'v1']) {
  const firstFile = path.join(root, `out/review/${version}/logo-start.png`);
  const lastFile = path.join(root, `out/review/${version}/logo-end.png`);
  if (existsSync(firstFile) && existsSync(lastFile)) {
    equalLoopEndpointPNGs = (await readFile(firstFile)).equals(await readFile(lastFile));
    if (!equalLoopEndpointPNGs) throw new Error('First and last uncompressed loop poses differ');
    break;
  }
}
const decodeLoopFrame = async time => (await fullFfmpeg(['-v', 'error', '-ss', String(time), '-i', path.join(dir, 'kernel-loop.mp4'), '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'])).stdout;
const decodedFirst = await decodeLoopFrame(0);
const decodedLast = await decodeLoopFrame(479 / 60);
if (decodedFirst.length !== decodedLast.length) throw new Error('Decoded endpoint frame sizes differ');
let totalError = 0;
for (let i = 0; i < decodedFirst.length; i++) totalError += Math.abs(decodedFirst[i] - decodedLast[i]);
const seamMeanError = totalError / decodedFirst.length;
if (seamMeanError > 1) throw new Error(`Loop seam differs by ${seamMeanError} average RGB units`);
const report = {checkedAt: new Date().toISOString(), equalLoopEndpointPNGs, loopDecodedSeamMeanError: seamMeanError, assets: checks};
await mkdir(path.join(root, 'out/review/v2'), {recursive: true});
await writeFile(path.join(root, 'out/review/v2/verification.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
