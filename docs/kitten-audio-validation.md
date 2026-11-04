# Running kitten and optional music

Checked on 2026-11-04.

The homepage has a small orange vector kitten running on its own track above the challenge categories. GSAP handles its gait, tail and travel. The existing motion control pauses it, reduced-motion preferences keep it still, offscreen animation pauses, and travel adapts when the viewport changes.

Every public route has an optional, self-hosted background soundtrack and a fixed Music button. Sound fades in quietly when the browser allows it. If autoplay is blocked, the button offers Play music and an ordinary visitor interaction can start playback. A mute choice is stored locally; track position is retained within the tab. Background music pauses while the introduction plays and resumes when it pauses or ends, unless the visitor has muted it. Hidden tabs and page exits pause background playback.

The 16-second introduction now contains an original stereo AAC soundtrack. The hero logo video remains silent. Original music is synthesized from an editable score, without third-party recordings or samples. Source and render instructions are in `videos/`.

## Verification

- All 26 tests pass, including 11 audio behavior tests covering autoplay rejection, mute persistence, film ownership, asynchronous playback cancellation, page visibility, back/forward cache, saved position, unavailable storage, and bounded fade-in volume when frame timestamps precede the fade start.
- Website and video dependency audits report zero vulnerabilities. `git diff --check` passes.
- All eleven public routes have zero axe violations and no page overflow at 1440 x 1000 and 320 x 900.
- Browser checks confirm background playback, immediate pause on film playback, resume after film pause, and explicit mute remaining off after playing/pausing the film and navigating to another page.
- Desktop and mobile screenshots confirm that the kitten stays on its track and the music control remains reachable without covering navigation.
- The background loop is 32 seconds, stereo 48 kHz, 449,007 bytes. The musical film is 16 seconds, 1280 x 720, 714,630 bytes. Decoded audio is nonzero, has opening/closing fades, and does not clip. The film peak is -12.29 dBFS; the ambient loop peak is -13.67 dBFS.

The all-route accessibility audit uses the local axe harness. Kitsune remains unavailable in the authoring environment. Browser autoplay policies still govern whether sound may start before the first visitor interaction.
