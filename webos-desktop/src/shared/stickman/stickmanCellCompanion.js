import { createStickmanActor } from "./stickmanActor.js";

export function createCellCompanion(container, options = {}) {
  const floorEl = options.floor || null;
  const onPunch =
    typeof options.onPunch === "function" ? options.onPunch : null;
  const width = Number.isFinite(options.width) ? options.width : 28;
  const height = Number.isFinite(options.height) ? options.height : 64;
  let actor = null;
  let frameId = null;
  let lastTime = 0;
  let destroyed = false;

  function localFloor() {
    try {
      if (floorEl && floorEl.offsetHeight)
        return Math.max(0, floorEl.offsetTop);
    } catch {}
    try {
      return container.clientHeight;
    } catch {
      return 0;
    }
  }

  function localCage() {
    try {
      const cageWidth = container.clientWidth;
      const cageHeight = localFloor();
      if (cageWidth <= 0 || cageHeight <= 0) return null;
      return { left: 0, top: 0, width: cageWidth, height: cageHeight };
    } catch {
      return null;
    }
  }

  function loop(now) {
    if (destroyed) return;
    if (!lastTime) lastTime = now;
    const dt = Math.min(Math.max((now - lastTime) / 16.667, 0.5), 2);
    lastTime = now;
    try {
      if (actor) actor.update(now, dt);
    } catch {}
    frameId = requestAnimationFrame(loop);
  }

  function start() {
    if (actor || destroyed) return;
    try {
      actor = createStickmanActor(container, {
        draggable: false,
        getCage: localCage,
        getFloor: localFloor,
        cagePunch: onPunch,
      });
    } catch {
      actor = null;
      return;
    }
    try {
      const cageWidth = Math.max(width, container.clientWidth);
      const floorY = Math.max(0, localFloor() - height);
      actor.launch(cageWidth / 2 - width / 2, floorY, 0, 0);
    } catch {}
    lastTime = 0;
    frameId = requestAnimationFrame(loop);
  }

  function getScreenPos() {
    try {
      const rect = container.getBoundingClientRect();
      const p = actor.getPos();
      return { x: rect.left + p.x + p.w / 2, y: rect.top + p.y + p.h };
    } catch {
      return null;
    }
  }

  function destroy() {
    destroyed = true;
    if (frameId !== null) {
      try {
        cancelAnimationFrame(frameId);
      } catch {}
      frameId = null;
    }
    try {
      if (actor) actor.destroy();
    } catch {}
    actor = null;
  }

  return { start, destroy, getScreenPos };
}
