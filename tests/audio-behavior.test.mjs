import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../site/assets/audio.js', import.meta.url), 'utf8');

class Events {
  listeners = new Map();
  addEventListener(type, callback, options = false) {
    const entries = this.listeners.get(type) ?? [];
    const capture = typeof options === 'boolean' ? options : Boolean(options.capture);
    if (!entries.some((entry) => entry.callback === callback && entry.capture === capture)) {
      entries.push({ callback, capture, once: Boolean(options?.once) });
    }
    this.listeners.set(type, entries);
  }
  removeEventListener(type, callback, options = false) {
    const capture = typeof options === 'boolean' ? options : Boolean(options.capture);
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((entry) => entry.callback !== callback || entry.capture !== capture));
  }
  emit(type, details = {}) {
    const event = { type, target: this, ...details };
    for (const entry of [...(this.listeners.get(type) ?? [])]) {
      if (entry.once) this.removeEventListener(type, entry.callback, entry.capture);
      entry.callback.call(this, event);
    }
  }
}

class Button extends Events {
  hidden = true;
  disabled = false;
  dataset = {};
  attributes = new Map([['aria-pressed', 'false']]);
  label = { textContent: 'Play music' };
  querySelector(selector) { return selector === '[data-audio-label]' ? this.label : null; }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  closest(selector) { return selector === '[data-audio-toggle]' ? this : null; }
  click() { this.emit('click'); }
}

class Media extends Events {
  paused = true;
  ended = false;
  currentTime = 0;
  duration = 120;
  _volume = 1;
  get volume() { return this._volume; }
  set volume(value) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new DOMException('Media volume must be between zero and one', 'IndexSizeError');
    }
    this._volume = value;
  }
  muted = false;
  playCalls = 0;
  pauseCalls = 0;
  plans = [];
  play() {
    this.playCalls++;
    const plan = this.plans.shift();
    if (plan instanceof Error) return Promise.reject(plan);
    this.paused = false;
    this.ended = false;
    this.emit('play');
    return plan?.promise ?? Promise.resolve();
  }
  pause() {
    this.pauseCalls++;
    const changed = !this.paused;
    this.paused = true;
    if (changed) this.emit('pause');
  }
  finish() { this.paused = true; this.ended = true; this.emit('ended'); }
  closest(selector) { return selector === '.kernel-film' ? this : null; }
}

function storage({ unavailable = false } = {}) {
  const values = new Map();
  return {
    getItem(key) { if (unavailable) throw new Error('Storage unavailable'); return values.get(key) ?? null; },
    setItem(key, value) { if (unavailable) throw new Error('Storage unavailable'); values.set(key, String(value)); },
  };
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const namedError = (name) => Object.assign(new Error(name), { name });
const settle = () => new Promise((resolve) => setImmediate(resolve));

function page({ plans = [], local = storage(), session = storage(), missing, withFilm = true } = {}) {
  const audio = new Media();
  audio.plans.push(...plans);
  const button = new Button();
  if (missing === 'label') button.label = null;
  const film = withFilm ? new Media() : null;
  const document = new Events();
  document.hidden = false;
  document.querySelector = (selector) => ({
    '[data-site-audio]': missing === 'audio' ? null : audio,
    '[data-audio-toggle]': missing === 'button' ? null : button,
    '.kernel-film': film,
  })[selector] ?? null;
  const window = new Events();
  const frames = new Map();
  let frameId = 0, now = 0;
  vm.runInNewContext(source, {
    document, window, localStorage: local, sessionStorage: session,
    performance: { now: () => now },
    requestAnimationFrame: (callback) => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: (id) => frames.delete(id),
  }, { filename: 'site/assets/audio.js' });
  return {
    audio, button, film, document, window, local, session,
    advance(ms) {
      now += ms;
      const current = [...frames.values()];
      frames.clear();
      for (const callback of current) callback(now);
    },
    setHidden(value) { document.hidden = value; document.emit('visibilitychange'); },
    gesture() { document.emit('pointerdown', { target: { closest: () => null } }); },
  };
}

test('background playback starts quietly and exposes a working mute control', async () => {
  const p = page({ withFilm: false });
  assert.equal(p.button.hidden, false);
  assert.equal(p.audio.playCalls, 1);
  assert.equal(p.audio.muted, false, 'autoplay is not attempted through a muted-policy workaround');
  assert.ok(p.audio.volume > 0 && p.audio.volume <= 0.2);
  await settle();
  p.advance(2400);
  assert.equal(p.button.label.textContent, 'Music on');
  assert.equal(p.button.getAttribute('aria-pressed'), 'true');
  assert.ok(p.audio.volume > 0 && p.audio.volume <= 0.2);
  p.button.click();
  assert.equal(p.audio.paused, true);
  assert.equal(p.button.label.textContent, 'Music off');
});

test('a first animation timestamp before the fade start never sets negative media volume', async () => {
  const p = page();
  await settle();
  p.advance(-1);
  assert.equal(p.audio.volume, 0);
  p.advance(1201);
  assert.ok(Math.abs(p.audio.volume - 0.1) < 0.001, 'the fade continues after an early animation timestamp');
  p.advance(1200);
  assert.ok(p.audio.volume > 0 && p.audio.volume <= 0.2);
  assert.equal(p.audio.paused, false);
  assert.equal(p.button.label.textContent, 'Music on');
});
test('blocked autoplay offers Play music and retries after an ordinary gesture', async () => {
  const p = page({ plans: [namedError('NotAllowedError')] });
  await settle();
  assert.equal(p.audio.paused, true);
  assert.equal(p.button.label.textContent, 'Play music');
  assert.equal(p.button.getAttribute('aria-pressed'), 'false');
  p.document.emit('keydown', { key: 'Tab' });
  assert.equal(p.audio.playCalls, 1, 'keyboard navigation does not unexpectedly start audio');
  p.gesture();
  await settle();
  assert.equal(p.audio.playCalls, 2);
  assert.equal(p.audio.paused, false);
  assert.equal(p.button.label.textContent, 'Music on');
});

test('muting persists across pages and prevents film or visibility events from resuming music', async () => {
  const local = storage();
  const p = page({ local });
  await settle();
  p.button.click();
  const attempts = p.audio.playCalls;
  await p.film.play();
  p.film.pause();
  p.setHidden(true);
  p.setHidden(false);
  await settle();
  assert.equal(p.audio.playCalls, attempts);
  assert.equal(p.audio.paused, true);
  assert.equal(p.button.label.textContent, 'Music off');
  const next = page({ local });
  await settle();
  assert.equal(next.audio.playCalls, 0);
  assert.equal(next.button.label.textContent, 'Music off');
  next.button.click();
  await settle();
  assert.equal(next.audio.paused, false, 'the visitor can enable saved muted music again');
});

test('the introduction immediately owns audio and background music resumes on pause or end', async () => {
  const p = page();
  await settle();
  const filmStart = p.film.play();
  assert.equal(p.audio.paused, true, 'background audio pauses synchronously on film play');
  assert.equal(p.button.label.textContent, 'Music paused');
  await filmStart;
  const attempts = p.audio.playCalls;
  p.film.pause();
  await settle();
  assert.equal(p.audio.playCalls, attempts + 1);
  assert.equal(p.audio.paused, false);
  await p.film.play();
  assert.equal(p.audio.paused, true);
  p.film.finish();
  await settle();
  assert.equal(p.audio.paused, false);
  assert.equal(p.button.label.textContent, 'Music on');
});

test('a stale aborted play request cannot overwrite a newer successful playback', async () => {
  const old = deferred();
  const p = page({ plans: [old] });
  await p.film.play();
  p.film.pause();
  await settle();
  assert.equal(p.audio.playCalls, 2);
  assert.equal(p.audio.paused, false);
  old.reject(namedError('AbortError'));
  await settle();
  assert.equal(p.audio.paused, false);
  assert.equal(p.button.label.textContent, 'Music on');
  assert.equal(p.button.getAttribute('aria-pressed'), 'true');
});

test('muting while play is pending cannot resurrect the background when that promise settles', async () => {
  const pending = deferred();
  const p = page({ plans: [pending] });
  p.button.click();
  assert.equal(p.audio.paused, true);
  pending.resolve();
  await settle();
  p.advance(3000);
  assert.equal(p.audio.paused, true);
  assert.equal(p.audio.playCalls, 1);
  assert.equal(p.button.label.textContent, 'Music off');
  assert.equal(p.button.getAttribute('aria-pressed'), 'false');
});

test('a saved music position is restored once the next page knows its duration', async () => {
  const session = storage();
  const first = page({ session });
  await settle();
  first.audio.currentTime = 137;
  first.window.emit('pagehide');
  const next = page({ session });
  next.audio.duration = 120;
  next.audio.emit('loadedmetadata');
  assert.equal(next.audio.currentTime, 17);
  next.audio.currentTime = 25;
  next.audio.emit('loadedmetadata');
  assert.equal(next.audio.currentTime, 25, 'a later metadata event does not jump back again');
});

test('hidden pages and pagehide pause music, and visible or bfcache returns resume it', async () => {
  const p = page();
  await settle();
  p.setHidden(true);
  assert.equal(p.audio.paused, true);
  p.setHidden(false);
  await settle();
  assert.equal(p.audio.paused, false);
  p.window.emit('pagehide');
  assert.equal(p.audio.paused, true);
  const attempts = p.audio.playCalls;
  p.setHidden(false);
  await settle();
  assert.equal(p.audio.playCalls, attempts, 'visibility alone cannot restart a page that is leaving');
  p.window.emit('pageshow', { persisted: true });
  await settle();
  assert.equal(p.audio.paused, false);
  assert.equal(p.button.label.textContent, 'Music on');
});

test('unavailable storage does not prevent playback, mute, metadata handling, or page transitions', async () => {
  const p = page({ local: storage({ unavailable: true }), session: storage({ unavailable: true }) });
  await settle();
  p.audio.emit('loadedmetadata');
  p.window.emit('pagehide');
  p.window.emit('pageshow', { persisted: true });
  await settle();
  assert.equal(p.audio.paused, false);
  p.button.click();
  assert.equal(p.audio.paused, true);
  assert.equal(p.button.label.textContent, 'Music off');
});

test('missing audio, button, or its label leaves the page untouched', () => {
  for (const missing of ['audio', 'button', 'label']) {
    const p = page({ missing });
    assert.equal(p.audio.playCalls, 0, `${missing}: no playback without usable controls`);
    assert.equal(p.button.hidden, true, `${missing}: no inert button is exposed`);
    assert.equal(p.document.listeners.size, 0);
    assert.equal(p.window.listeners.size, 0);
  }
});