import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir, writeFile, copyFile, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fullFfmpeg} from './media-tools.mjs';

// Original score and additive synthesizer. No samples, imported music, random
// numbers or browser clocks. Every PCM sample is a deterministic function of
// the score and its time. Chord tails and delays wrap around the 32s timeline.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REVIEW = path.join(ROOT, 'out/review/v2');
const PUBLIC = path.join(ROOT, 'public/music');
const SITE = path.resolve(ROOT, '../site/brand/audio');
const RATE = 48000;
const DURATION = 32;
const LENGTH = RATE * DURATION;
const channels = [new Float64Array(LENGTH), new Float64Array(LENGTH)];
const TAU = Math.PI * 2;
const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => {const p = clamp(x); return p * p * (3 - 2 * p);};
const SCORE = [
  {name: 'Em(add9)', notes: [52, 55, 59, 66], bass: 40},
  {name: 'Cmaj7', notes: [48, 52, 55, 59], bass: 36},
  {name: 'G6', notes: [55, 59, 62, 64], bass: 43},
  {name: 'Dadd9', notes: [50, 54, 57, 64], bass: 38},
  {name: 'Em7', notes: [52, 55, 59, 62], bass: 40},
  {name: 'Cmaj7', notes: [48, 52, 55, 59], bass: 36},
  {name: 'Am7', notes: [57, 60, 64, 67], bass: 45},
  {name: 'Dadd9', notes: [50, 54, 57, 64], bass: 38},
];

function note(start, duration, midi, amplitude, pan, voice, phase = 0) {
  const f = frequency(midi);
  const begin = Math.round(start * RATE);
  const count = Math.round(duration * RATE);
  const gainL = Math.cos(pan * Math.PI / 2);
  const gainR = Math.sin(pan * Math.PI / 2);
  for (let sample = 0; sample < count; sample++) {
    const t = sample / RATE;
    let envelope;
    let waveform;
    if (voice === 'pad') {
      envelope = smooth(t / 0.8) * smooth((duration - t) / 1.1);
      const breathing = 0.91 + 0.09 * Math.cos(TAU * t / 4);
      waveform = (Math.sin(TAU * f * t + phase) * 0.58 + Math.sin(TAU * f * 1.0025 * t + phase) * 0.24 + Math.sin(TAU * f * 0.9975 * t + phase) * 0.14 + Math.sin(TAU * f * 2 * t) * 0.04) * breathing;
    } else if (voice === 'bass') {
      envelope = smooth(t / 0.08) * smooth((duration - t) / 0.55);
      waveform = (Math.sin(TAU * f * t + phase) + Math.sin(TAU * f * t * 2 + phase) * 0.14) / 1.14;
    } else {
      envelope = smooth(t / 0.016) * Math.exp(-3.9 * t) * smooth((duration - t) / 0.3);
      waveform = (Math.sin(TAU * f * t + phase) + Math.sin(TAU * f * t * 3 + phase) * 0.07 + Math.sin(TAU * f * t * 5 + phase) * 0.015) / 1.085;
    }
    const value = waveform * envelope * amplitude;
    const index = ((begin + sample) % LENGTH + LENGTH) % LENGTH;
    channels[0][index] += value * gainL;
    channels[1][index] += value * gainR;
  }
}

const motif = [0, 2, 1, 3, 2, 1, 0, 2];
for (let chordIndex = 0; chordIndex < SCORE.length; chordIndex++) {
  const chord = SCORE[chordIndex];
  const start = chordIndex * 4;
  chord.notes.forEach((midi, index) => note(start - 0.4, 4.8, midi, 0.042, 0.18 + index * 0.2, 'pad', index * 0.7));
  for (let pulse = 0; pulse < 2; pulse++) note(start + pulse * 2, 2.08, chord.bass, 0.073, 0.5, 'bass');
  for (let step = 0; step < 8; step++) {
    const midi = chord.notes[motif[step]] + 12;
    const at = start + step * 0.5;
    const pan = step % 2 === 0 ? 0.35 : 0.65;
    const gain = step % 4 === 0 ? 0.041 : 0.032;
    note(at, 1.6, midi, gain, pan, 'arp');
    note(at + 0.375, 1.6, midi, gain * 0.18, 1 - pan, 'arp');
    note(at + 0.75, 1.6, midi, gain * 0.06, pan, 'arp');
  }
}

function stats(left, right) {
  let peak = 0;
  let sum = 0;
  for (let i = 0; i < left.length; i++) {
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
    sum += left[i] ** 2 + right[i] ** 2;
  }
  const rms = Math.sqrt(sum / (left.length * 2));
  return {peak, rms, peakDbFS: 20 * Math.log10(peak), rmsDbFS: 20 * Math.log10(rms)};
}
const rawStats = stats(...channels);
const ambientGain = Math.min(0.065 / rawStats.rms, 0.30 / rawStats.peak);
for (const channel of channels) for (let i = 0; i < LENGTH; i++) channel[i] *= ambientGain;
// Bring the final 5.3ms smoothly to the first PCM value. Wrapped musical tails
// already make the seam continuous; this also makes the endpoints exact.
for (const channel of channels) {
  const correction = channel[0] - channel[LENGTH - 1];
  for (let i = 0; i < 256; i++) channel[LENGTH - 256 + i] += correction * smooth(i / 255);
}

function wav(left, right) {
  const data = Buffer.alloc(44 + left.length * 4);
  data.write('RIFF', 0);
  data.writeUInt32LE(data.length - 8, 4);
  data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(RATE, 24);
  data.writeUInt32LE(RATE * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(left.length * 4, 40);
  for (let i = 0; i < left.length; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i])) * 32767), 44 + i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i])) * 32767), 46 + i * 4);
  }
  return data;
}

await Promise.all([REVIEW, PUBLIC, SITE].map(directory => mkdir(directory, {recursive: true})));
const ambientWav = wav(...channels);
const ambientSource = path.join(REVIEW, 'kernel-ambient.wav');
await writeFile(ambientSource, ambientWav);
const intro = channels.map(channel => Float64Array.from(channel.subarray(0, RATE * 16), (value, index) => {
  const t = index / RATE;
  // Musical dynamics align with four-second film chapters. Fades are repeated
  // in the Remotion audio component so Studio edits retain the same envelope.
  return value * 1.18 * smooth(t / 0.5) * smooth((16 - t) / 1);
}));
const introSource = path.join(REVIEW, 'kernel-intro.wav');
await writeFile(introSource, wav(...intro));
for (const [source, name, title] of [[ambientSource, 'kernel-ambient.mp3', 'Kernel Signal - ambient loop'], [introSource, 'kernel-intro.mp3', 'Kernel Signal - introduction']]) {
  const destination = path.join(SITE, name);
  await fullFfmpeg(['-v', 'error', '-y', '-i', source, '-codec:a', 'libmp3lame', '-b:a', '112k', '-ar', String(RATE), '-write_xing', '1', '-id3v2_version', '3', '-metadata', `title=${title}`, '-metadata', 'artist=Kernel Kittens', destination]);
  if (name === 'kernel-intro.mp3') await copyFile(destination, path.join(PUBLIC, name));
  await copyFile(destination, path.join(REVIEW, name));
  console.log(`${name}: ${(await stat(destination)).size} bytes`);
}
const report = {
  composition: 'Kernel Signal',
  original: true,
  tempoBpm: 120,
  perceivedPulseBpm: 60,
  key: 'E minor',
  sampleRate: RATE,
  channels: 2,
  duration: DURATION,
  chordSeconds: 4,
  score: SCORE,
  ambient: {...stats(...channels), pcmSha256: createHash('sha256').update(ambientWav).digest('hex'), seamDelta: channels.map(channel => Math.abs(channel[0] - channel[LENGTH - 1]))},
  intro: {...stats(...intro), duration: 16, fadeInSeconds: 0.5, fadeOutSeconds: 1},
};
await writeFile(path.join(REVIEW, 'music-source-verification.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
