# Orange archive motion validation

Checked on 2026-11-04.

The redesign keeps the orange archive, all eleven public routes, the verified results and prior-team attribution, the five established player records, and the existing Discord application client. The application API, domain, and deployment workflow are unchanged.

## Completed checks

- `npm test`: all 13 site contracts pass.
- `npm audit`: zero vulnerabilities in the website package and the isolated video package.
- `git diff --check`: passes.
- Browser inspection at 1440 x 1000 and 320 x 900; no page-level horizontal overflow on any public route.
- axe-core 4.14.0: zero violations across all eleven routes at both widths.
- Manually checked the remaining axe review items: decorative arrow contrast, silent video alternatives, and text clipped within independently scrollable code/table regions.
- Decorative loop play/pause and native team-film playback verified in the browser. Film duration is 16 seconds. The film has a local caption track and an adjacent transcript.
- Logo video: 800 x 800, 8 seconds, 171,638 bytes. Team film: 1280 x 720, 16 seconds, 448,597 bytes. GIF: 360 x 360, 8 seconds, 124,202 bytes.
- Remotion verification confirms equal logo endpoint poses and a decoded loop seam mean error of 0.558 RGB units, consistent with video encoding noise. Both MP4s are silent.

The browser audit uses the separate local audit server in `scripts/`; those scripts and axe are absent from the deployed `site/` directory. GSAP and the public media are self-hosted.

## Required release follow-up

The Kitsune accessibility tool required by `AGENTS.md` is unavailable in this environment. Its all-route audit remains a release prerequisite. The axe audit is a fallback and does not replace that repository requirement. Live Discord sign-in and challenge submission were not performed, since they would create a real application session; the application client is unchanged and its contract tests pass.
