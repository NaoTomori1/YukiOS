const SURGE_MS = 260;
const SURGE_BOOST = 3.2;
const MIN_FREEZE_MS = 40;
const MAX_FREEZE_MS = 80;

export function createFreezeSystem(host) {
  const fn = (name) =>
    host && typeof host[name] === "function" ? host[name] : null;
  const getLayer = fn("getLayer");

  let freezeUntil = 0;
  let paused = [];
  let releasedAt = -1e9;

  function layer() {
    try {
      return getLayer ? getLayer() : null;
    } catch {
      return null;
    }
  }

  function pauseLayerAnimations() {
    const lay = layer();
    if (!lay || typeof lay.getAnimations !== "function") return;
    try {
      const running = lay
        .getAnimations({ subtree: true })
        .filter((a) => a.playState === "running");
      for (let i = 0; i < running.length; i++) {
        running[i].pause();
        paused.push(running[i]);
      }
    } catch {}
  }

  function resumeLayerAnimations() {
    for (let i = 0; i < paused.length; i++) {
      try {
        paused[i].play();
      } catch {}
    }
    paused = [];
  }

  function trigger(now, ms) {
    const dur = Math.max(
      MIN_FREEZE_MS,
      Math.min(MAX_FREEZE_MS, ms || MAX_FREEZE_MS),
    );
    if (now >= freezeUntil) {
      freezeUntil = now + dur;
      pauseLayerAnimations();
    } else if (now + dur > freezeUntil) {
      freezeUntil = now + dur;
    }
    return dur;
  }

  function isFrozen(now) {
    return now < freezeUntil;
  }

  function update(now) {
    if (freezeUntil && now >= freezeUntil) {
      freezeUntil = 0;
      releasedAt = now;
      resumeLayerAnimations();
    }
  }

  function surge(now) {
    if (now < releasedAt || now - releasedAt > SURGE_MS) return 1;
    const k = (now - releasedAt) / SURGE_MS;
    return 1 + (SURGE_BOOST - 1) * (1 - k) * (1 - k);
  }

  function destroy() {
    resumeLayerAnimations();
    freezeUntil = 0;
    releasedAt = -1e9;
  }

  return {
    trigger,
    isFrozen,
    update,
    surge,
    destroy,
    timeLeft: (now) => Math.max(0, freezeUntil - now),
  };
}

export const FREEZE_MIN_MS = MIN_FREEZE_MS;
export const FREEZE_MAX_MS = MAX_FREEZE_MS;
export const FREEZE_SURGE_MS = SURGE_MS;
export const FREEZE_SURGE_BOOST = SURGE_BOOST;
