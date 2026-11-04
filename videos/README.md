# Kernel Kittens motion

Editable, silent Remotion compositions matching the website's orange archive theme. The browser needs no React or Remotion runtime: only the pre-rendered assets under `site/brand/motion/` are deployed.

```text
cd videos
npm ci
npm run studio
npm run stills
npm run render
node scripts/verify.mjs
```

`KernelLoop` is an 8-second, 800 x 800, 60 fps orbit around the existing kitten mark. `KernelFilm` is a 16-second, 1280 x 720, 60 fps team/results film. The GIF version is 360 x 360 at 15 fps. All Remotion packages are pinned to the same exact version in the isolated video package.

The pixel verification script needs a full ffmpeg on PATH. On Windows it uses the default WSL distro's ffmpeg; set `FFMPEG_BINARY` to a native ffmpeg executable to override this. Rendering itself uses only the binaries supplied by Remotion.

Final website files:

- `kernel-loop.mp4`: silent hero loop
- `kernel-poster.png`: static hero, including reduced-motion mode
- `kernel-loop.gif`: small shareable GIF; avoid autoplaying this when reduced motion is enabled
- `kernel-film.mp4`: silent results film; display with native controls
- `kernel-film-poster.png`: film cover

Render review stills and preserved version 1 videos live under ignored `out/review/v1/`. A repeat render overwrites that version; increment the version directory in the render script before changing a published film. All geometry and motion derive from the current frame. No remote assets, tracking, browser clocks, or animation timers are used.

The logo loop has equal first/last poses; its two tiny orbital points move slowly. Direct 60 fps rendering keeps these slow vector movements crisp. No motion blur, flashing, rapid cuts or sound is added. The film is not intended to autoplay. Its results are a subset of the verified site record, with the division explicitly shown for Kaspersky{CTF}.

The website should respect reduced motion and its motion toggle by showing the PNG poster and pausing the video. Keep the descriptive text in HTML and treat the hero video as decorative. Use `preload="none"` for the controlled film and `preload="metadata"` for the hero; both videos are H.264 with progressive playback metadata.
