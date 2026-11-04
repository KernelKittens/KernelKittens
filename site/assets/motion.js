/* Progressive enhancement: every link and all content work without this file. */
(() => {
  const root = document.querySelector('.kernel-home');
  if (!root) return;
  const toggle = root.querySelector('[data-motion-toggle]');
  const video = root.querySelector('[data-logo-loop]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const runner = root.querySelector('[data-kitten-runner]');
  const runway = root.querySelector('.kitten-runway');
  let paused = reduced.matches;
  let media;
  let cleanupMotion;
  let logoVisible = true;
  let playRequest = 0;
  let cursorTween;
  let runnerVisible = true;
  let runnerAnimations = [];
  let runnerTravel;
  let resizeFrame = 0;

  const synchronizeRunner = () => {
    const stop = paused || document.hidden || !runnerVisible;
    runnerAnimations.forEach((animation) => stop ? animation.pause() : animation.resume());
  };

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
      if (runner && runway) {
        const q = gsap.utils.selector(runner);
        const gait = gsap.timeline({ repeat: -1, yoyo: true, defaults: { duration: .18, ease: 'sine.inOut' } });
        const legs = [
          ['.runner-leg-front-a', '70 40', -26, 26],
          ['.runner-leg-front-b', '71 40', 26, -26],
          ['.runner-leg-back-a', '44 41', 24, -24],
          ['.runner-leg-back-b', '47 41', -24, 24],
        ];
        legs.forEach(([selector, origin, from, to]) => gait.fromTo(q(selector), { rotation: from, svgOrigin: origin }, { rotation: to, svgOrigin: origin }, 0));
        const bob = gsap.to(q('.kitten-runner__art'), { y: -1.5, duration: .18, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        const tail = gsap.fromTo(q('.runner-tail'), { rotation: -6, svgOrigin: '36 35' }, { rotation: 7, svgOrigin: '36 35', duration: .4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        const travel = gsap.timeline({ repeat: -1, repeatDelay: 1, repeatRefresh: true });
        const duration = () => Math.max(8, runway.clientWidth / 65);
        travel.set(runner, { x: 0, scaleX: 1 })
          .to(runner, { x: () => Math.max(0, runway.clientWidth - runner.clientWidth), duration: duration(), ease: 'none' })
          .set(runner, { scaleX: -1 })
          .to(runner, { x: 0, duration: duration(), ease: 'none' });
        runnerAnimations = [travel, gait, bob, tail];
        runnerTravel = travel;
        synchronizeRunner();
      }
    }, root);
    cleanupMotion = () => { media?.revert(); cursorTween = undefined; runnerAnimations = []; runnerTravel = undefined; };
  };
  const setPaused = (value, entrance = false) => {
    paused = value;
    cleanupMotion?.();
    if (!paused) startMotion(entrance);
    updateLabel();
    updateVideo();
    synchronizeRunner();
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
  if (runner && runway) {
    const runnerObserver = new IntersectionObserver(([entry]) => {
      runnerVisible = entry.isIntersecting;
      synchronizeRunner();
    }, { threshold: .05 });
    runnerObserver.observe(runway);
    window.addEventListener('resize', () => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        if (!runnerTravel) return;
        const progress = runnerTravel.progress();
        runnerTravel.invalidate().progress(progress, true);
        synchronizeRunner();
      });
    });
  }
  window.addEventListener('pagehide', () => { cleanupMotion?.(); video.pause(); });
  window.addEventListener('pageshow', (event) => { if (event.persisted) setPaused(paused); });
  setPaused(paused, true);
})();
