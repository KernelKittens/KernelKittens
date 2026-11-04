/* Optional, self-hosted music. Browser autoplay policy always takes precedence. */
(() => {
  const audio = document.querySelector('[data-site-audio]');
  const button = document.querySelector('[data-audio-toggle]');
  const label = button?.querySelector('[data-audio-label]');
  if (!audio || !button || !label) return;

  const film = document.querySelector('.kernel-film');
  const preferenceKey = 'kernel-kittens:music';
  const positionKey = 'kernel-kittens:music-position';
  const quietVolume = 0.2;
  let enabled = true;
  let blocked = false;
  let request = 0;
  let fadeFrame = 0;
  let unavailable = false;
  let leaving = false;

  try { enabled = localStorage.getItem(preferenceKey) !== 'off'; } catch { /* Storage is optional. */ }
  const filmPlaying = () => Boolean(film && !film.paused && !film.ended && !film.error);
  const shouldPlay = () => enabled && !unavailable && !leaving && !document.hidden && !filmPlaying();
  const state = () => {
    if (unavailable) return 'unavailable';
    if (!enabled) return 'off';
    if (filmPlaying() || document.hidden) return 'paused';
    if (blocked || audio.paused) return 'ready';
    return 'playing';
  };
  const render = () => {
    const value = state();
    const text = { unavailable: 'Music unavailable', off: 'Music off', paused: 'Music paused', ready: 'Play music', playing: 'Music on' }[value];
    label.textContent = text;
    button.dataset.audioState = value;
    button.setAttribute('aria-pressed', String(enabled && !unavailable && value !== 'ready'));
    button.title = value === 'paused' && filmPlaying()
      ? 'Background music pauses while the introduction plays. Click to keep it off.'
      : value === 'playing' ? 'Mute background music' : 'Play soft background music';
    button.disabled = unavailable;
  };
  const cancelFade = () => {
    if (fadeFrame) cancelAnimationFrame(fadeFrame);
    fadeFrame = 0;
  };
  const savePosition = () => {
    try { sessionStorage.setItem(positionKey, String(audio.currentTime || 0)); } catch { /* Storage is optional. */ }
  };
  const pauseBackground = () => {
    ++request;
    cancelFade();
    audio.pause();
    audio.volume = quietVolume;
    savePosition();
    render();
  };
  const fadeIn = (token) => {
    cancelFade();
    audio.volume = 0;
    const start = performance.now();
    const tick = (now) => {
      if (token !== request || !shouldPlay() || audio.paused) return;
      audio.volume = quietVolume * Math.min(1, Math.max(0, (now - start) / 2400));
      if (now - start < 2400) fadeFrame = requestAnimationFrame(tick);
      else fadeFrame = 0;
    };
    fadeFrame = requestAnimationFrame(tick);
  };
  const startBackground = () => {
    if (!shouldPlay()) { pauseBackground(); return; }
    if (!audio.paused) { render(); return; }
    const token = ++request;
    // Attempt audible playback honestly; do not use muting to evade autoplay policy.
    audio.volume = quietVolume;
    const playback = audio.play();
    if (!playback?.then) { render(); return; }
    playback.then(() => {
      if (!shouldPlay()) { audio.pause(); return; }
      if (token !== request) return;
      blocked = false;
      fadeIn(token);
      document.removeEventListener('pointerdown', firstInteraction, true);
      document.removeEventListener('keydown', firstInteraction, true);
      render();
    }).catch((error) => {
      if (token !== request || error.name === 'AbortError' || !shouldPlay()) return;
      blocked = true;
      render();
    });
  };
  const synchronize = () => shouldPlay() ? startBackground() : pauseBackground();
  function firstInteraction(event) {
    if (!enabled || unavailable || event.target?.closest?.('[data-audio-toggle]')) return;
    if (event.type === 'keydown' && ['Tab', 'Escape', 'Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
    // Native film controls own this interaction; the film's play event pauses the background.
    if (event.target?.closest?.('.kernel-film')) return;
    startBackground();
  }

  button.hidden = false;
  button.addEventListener('click', () => {
    const value = state();
    enabled = !(enabled && ['playing', 'paused'].includes(value));
    blocked = false;
    try { localStorage.setItem(preferenceKey, enabled ? 'on' : 'off'); } catch { /* Storage is optional. */ }
    synchronize();
  });
  audio.addEventListener('loadedmetadata', () => {
    try {
      const saved = Number(sessionStorage.getItem(positionKey));
      if (Number.isFinite(saved) && saved > 0 && Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = saved % audio.duration;
    } catch { /* A failed seek must not prevent playback. */ }
  }, { once: true });
  audio.addEventListener('error', () => { unavailable = true; pauseBackground(); });
  audio.addEventListener('play', render);
  audio.addEventListener('pause', render);
  if (film) {
    film.addEventListener('play', pauseBackground);
    film.addEventListener('playing', pauseBackground);
    film.addEventListener('pause', synchronize);
    film.addEventListener('ended', synchronize);
    film.addEventListener('error', synchronize);
  }
  document.addEventListener('pointerdown', firstInteraction, true);
  document.addEventListener('keydown', firstInteraction, true);
  document.addEventListener('visibilitychange', synchronize);
  window.addEventListener('pagehide', () => { leaving = true; pauseBackground(); });
  window.addEventListener('pageshow', (event) => { if (event.persisted) { leaving = false; synchronize(); } });
  render();
  synchronize();
})();
