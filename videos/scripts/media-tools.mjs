import {promisify} from 'node:util';
import {execFile} from 'node:child_process';

const run = promisify(execFile);

// The Remotion binary omits synthesis encoders and raw PCM output. Use a full
// ffmpeg on PATH, FFMPEG_BINARY, or the default WSL distro on Windows.
export const fullFfmpeg = async (args, options = {}) => {
  const useWsl = process.platform === 'win32' && !process.env.FFMPEG_BINARY;
  const linuxPath = value => value.replace(/^([A-Za-z]):[\\/]/, (_, drive) => `/mnt/${drive.toLowerCase()}/`).replaceAll('\\', '/');
  return run(useWsl ? 'wsl.exe' : (process.env.FFMPEG_BINARY || 'ffmpeg'), useWsl ? ['--exec', 'ffmpeg', ...args.map(String).map(linuxPath)] : args, {
    encoding: 'buffer',
    maxBuffer: 32 * 48000 * 2 * 4 + 4096,
    ...options,
  });
};
