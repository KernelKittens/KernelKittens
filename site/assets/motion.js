/* Progressive enhancement: every link and all content work without this file. */
(() => {
  const root = document.querySelector('.kernel-home');
  if (!root) return;
  const toggle = root.querySelector('[data-motion-toggle]');
  const video = root.querySelector('[data-logo-loop]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches;
  let media;
  let cleanupMotion;
  let logoVisible = true;
  let playRequest = 0;
  let cursorTween;

  const updateLabel = () => {
    toggle.textContent = paused ? 'Play motion' : 'Pause motion';
    toggle.setAttribute('aria-pressed', String(paused));
  };
  const updateVideo = () => {
    const request = ++playRequest;
    if (paused || document.hidden || !logoVisible) {
      video.pause();
      cursorTween?.pause();
    } else {
      cursorTween?.resume();
      video.play().catch((error) => {
      if (request !== playRequest || error.name === 'AbortError' || paused || document.hidden || !logoVisible) return;
      // Keep the poster when autoplay is unavailable. The button can retry.
      paused = true;
      cleanupMotion?.();
      updateLabel();
      });
    }
  };
  const startMotion = (entrance = false) => {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      if (entrance) {
        gsap.timeline({ defaults: { duration: .8, ease: 'power3.out' } })
          .from('.terminal-label', { y: 10, autoAlpha: 0 }, 0)
          .from('.kernel-intro h1', { y: 28, autoAlpha: 0 }, .08)
          .from('.kernel-tagline, .kernel-description, .hero-actions, .hero-prompt', { y: 14, autoAlpha: 0, stagger: .08 }, .2)
          .from('.kernel-signal', { autoAlpha: 0, duration: 1.1 }, .3);
        gsap.utils.toArray('.section-heading, .note-entry, .roster-member', root).forEach((element) => {
          // Transform-only reveals keep offscreen links and summaries focusable.
          gsap.from(element, { y: 16, duration: .65, ease: 'power2.out', scrollTrigger: { trigger: element, start: 'top 94%', once: true } });
        });
      }
      cursorTween = gsap.to('.kernel-cursor', { opacity: .15, duration: .7, repeat: -1, yoyo: true, ease: 'steps(1)' });
    }, root);
    cleanupMotion = () => { media?.revert(); cursorTween = undefined; };
  };
  const setPaused = (value, entrance = false) => {
    paused = value;
    cleanupMotion?.();
    if (!paused) startMotion(entrance);
    updateLabel();
    updateVideo();
  };

  toggle.hidden = false;
  toggle.addEventListener('click', () => setPaused(!paused));
  reduced.addEventListener('change', () => setPaused(reduced.matches));
  document.addEventListener('visibilitychange', () => {
    updateVideo();
    if (document.hidden) cleanupMotion?.();
    else if (!paused) startMotion();
  });
  const observer = new IntersectionObserver(([entry]) => {
    logoVisible = entry.isIntersecting;
    updateVideo();
  }, { threshold: .05 });
  observer.observe(video);
  window.addEventListener('pagehide', () => { cleanupMotion?.(); video.pause(); });
  window.addEventListener('pageshow', (event) => { if (event.persisted) setPaused(paused); });
  setPaused(paused, true);
})();
