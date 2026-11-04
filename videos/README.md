# Kernel Kittens motion

Editable Remotion compositions matching the website's orange archive theme. The hero loop is silent. The team film includes original ambient synth music. The browser needs no React or Remotion runtime: only pre-rendered media is deployed.

```text
cd videos
npm ci
npm run music
npm run studio
npm run stills
npm run render
npm run verify
```

`KernelLoop` is an 8-second, 800 x 800, 60 fps orbit around the existing kitten mark. `KernelFilm` is a 16-second, 1280 x 720, 60 fps team/results film. The GIF version is 360 x 360 at 15 fps. All Remotion packages are pinned to the same exact version in the isolated video package.

Use `npm run render:film` to update only the musical film while keeping all hero assets and posters unchanged. The film references `public/music/kernel-intro.mp3` through Remotion's `Html5Audio` component. Its audio envelope is also editable in `src/Root.tsx`.

The pixel verification script needs a full ffmpeg on PATH. On Windows it uses the default WSL distro's ffmpeg; set `FFMPEG_BINARY` to a native ffmpeg executable to override this. Rendering itself uses only the binaries supplied by Remotion.

Final website files:

- `kernel-loop.mp4`: silent hero loop
- `kernel-poster.png`: static hero, including reduced-motion mode
- `kernel-loop.gif`: small shareable GIF; avoid autoplaying this when reduced motion is enabled
- `kernel-film.mp4`: results film with original music and stereo AAC; display with native controls
- `kernel-film-poster.png`: film cover
- `../audio/kernel-ambient.mp3`: 32-second original background loop
- `../audio/kernel-intro.mp3`: 16-second original film track

The original silent film is preserved under ignored `out/review/v1/`. The musical update, generated WAV masters and verification report use `out/review/v2/`. A repeat render overwrites version 2; increment the version directory before changing a published film again. All geometry and motion derive from the current frame. No remote assets, tracking, browser clocks, or animation timers are used.

The logo loop has equal first/last poses; its two tiny orbital points move slowly. Direct 60 fps rendering keeps these slow vector movements crisp. The hero stays silent. The film is not intended to autoplay. Its results are a subset of the verified site record, with the division explicitly shown for Kaspersky{CTF}.

`scripts/music.mjs` contains the original E-minor score and additive synthesizer. It generates 48 kHz stereo PCM from warm pads, sine bass and a gentle arpeggio at 120 BPM with a half-time pulse. No samples or third-party music are used. Note tails and stereo delays wrap around the 32-second background timeline; the final 256 samples are smoothly corrected to the exact first PCM value. The 16-second film arrangement fades in for 0.5 seconds and out for 1 second. MP3 exports use 112 kbps; the film uses 128 kbps AAC. A full ffmpeg is needed for MP3 encoding and verification.

The website should respect reduced motion and its motion toggle by showing the PNG poster and pausing the video. Keep the descriptive text in HTML and treat the hero video as decorative. Use `preload="none"` for the controlled film and `preload="metadata"` for the hero; both videos are H.264 with progressive playback metadata.

Site music should be quiet and controlled by the visitor. It is separate from the motion setting, and the background track should pause while the introduction film plays.
