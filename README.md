# Kernel Kittens site

Public team site for [kernelkittens.team](https://kernelkittens.team).

The orange archive includes a responsive homepage, self-hosted GSAP entrance and scroll motion, an 8-second kitten loop, a downloadable GIF, and a 16-second silent team film. The film has native playback controls, captions, and a text transcript. Decorative motion respects reduced-motion preferences and can be paused. All routes, results, roster attribution, and the application API remain available in the static HTML.

The complete static site lives in `site/`, and `site/assets/theme.css` is its only stylesheet. Old themes are deliberately absent from active branches and local working copies.

The active application challenge is `stray.rar`. It uses the first-party Ready API for Discord sign-in, private archive delivery, flag submission, and solve-gated Discord access. The page shows the exact submit format `KernelFlag{first_second_third}`.

Every correct solver can join the KernelKittens Discord and receives Member. A first accepted solve under five minutes also receives CTF Player. The server owns the timer and does not reset it for another archive.

## Checks

```powershell
npm ci
npm test
npm audit --audit-level=high
git diff --check
```

`npm run preview` serves the site at `http://127.0.0.1:4173`. GSAP is pinned and vendored under `site/assets/vendor/`; `npm run assets:sync` refreshes those files after a deliberate dependency update. Visitors make no requests to a script or font CDN.

Editable Remotion sources and render instructions are in [videos/README.md](videos/README.md). Only the pre-rendered media is deployed; the public website needs no React or Remotion runtime.

For a local axe accessibility audit, run `npm install --prefix .qa --no-save axe-core` and `node scripts/audit-server.mjs`, then open the public routes at `http://127.0.0.1:4174`. This separate server adds a visible JSON report after checking each page. Its audit scripts and dependencies are never included in `site/`. The repository's Kitsune release check remains required before deployment.

## Hosting

GitHub Actions tests `site/` and publishes that exact directory to GitHub Pages. The live domain is `kernelkittens.team`.

Do not restore a design from Git history. Historical commits include rejected themes.
