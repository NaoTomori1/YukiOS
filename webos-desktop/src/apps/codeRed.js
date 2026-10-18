import "../styles/codeRed.css";
import { BaseApp, os, $, $$, bindEvent, setText } from "../framework.js";
import {
  isPhysicsChaosActive,
  togglePhysicsChaos,
} from "../shared/desktopPhysics.js";
import { createStickmanActor } from "../shared/stickman/stickmanActor.js";
import {
  activateChaosWallpaper,
  restoreWallpaper,
} from "../shared/stickman/stickmanWallpaper.js";
import {
  getStickmanControlMode,
  onStickmanControlMode,
  setStickmanControlMode,
} from "../shared/stickman/stickmanChaos.js";

function createCellCompanion(container, options = {}) {
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

export class CodeRedApp extends BaseApp {
  constructor(services) {
    super(services);
    this.openWindows = new Set();
  }

  async open(opts = {}) {
    const winId = "code-red";
    if (await this.isSingletonOpen(winId)) return;
    const win = os.window.create(winId, "Code Red", "300px", "380px", {
      icon: "icons/codered.svg",
    });
    win.innerHTML = `<div class="code-red-root"><div class="code-red-jail"><div class="code-red-cell"><div class="code-red-interior"><div class="code-red-floor"></div><div class="code-red-pet"></div></div><div class="code-red-gate-slot"><div class="code-red-gate"></div></div></div></div><button class="code-red-toggle"></button><div class="code-red-modes"><div class="code-red-modes-label">Mode</div><div class="code-red-segment" role="group"><button class="code-red-mode" data-mode="ai"><i class="fas fa-robot"></i><span>AI MODE</span></button><button class="code-red-mode" data-mode="player"><i class="fas fa-gamepad"></i><span>CONTROLLER</span></button></div></div></div>`;
    const jailEl = $(".code-red-jail", win);
    const toggleEl = $(".code-red-toggle", win);
    const cellEl = $(".code-red-cell", win);
    const petEl = $(".code-red-pet", win);
    const floorEl = $(".code-red-floor", win);
    const segmentEl = $(".code-red-segment", win);
    const modeButtons = Array.from($$(".code-red-mode", win) || []);
    let breakTimer = null;
    let syncTimer = null;
    let companion = null;
    let lastActive = isPhysicsChaosActive();
    const punchCell = () => {
      try {
        cellEl.classList.remove("code-red-hit");
        cellEl.getBoundingClientRect();
        cellEl.classList.add("code-red-hit");
      } catch {}
    };
    const stopCompanion = () => {
      try {
        if (companion) companion.destroy();
      } catch {}
      companion = null;
    };
    const startCompanion = () => {
      stopCompanion();
      try {
        companion = createCellCompanion(petEl, {
          floor: floorEl,
          onPunch: punchCell,
        });
        companion.start();
      } catch {
        companion = null;
      }
    };
    const refresh = () => {
      const active = isPhysicsChaosActive();
      setText(toggleEl, active ? "Contain chaos" : "Unleash chaos");
      toggleEl.setAttribute("data-active", active ? "true" : "false");
      jailEl.classList.toggle("code-red-loose", active);
      if (!active) jailEl.classList.remove("code-red-breaking");
      try {
        refreshMode(getStickmanControlMode());
      } catch {}
    };
    const syncState = () => {
      const active = isPhysicsChaosActive();
      if (active === lastActive) return;
      lastActive = active;
      if (active) stopCompanion();
      else startCompanion();
      refresh();
    };
    const contain = () => {
      togglePhysicsChaos();
      syncState();
    };
    const refreshMode = (mode) => {
      const next = mode === "player" ? "player" : "ai";
      segmentEl.setAttribute("data-active", next);
      segmentEl.setAttribute(
        "data-live",
        isPhysicsChaosActive() ? "true" : "false",
      );
      for (const btn of modeButtons) {
        const on = btn.getAttribute("data-mode") === next;
        btn.setAttribute("data-on", on ? "true" : "false");
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      }
    };
    const setMode = (mode) => {
      refreshMode(setStickmanControlMode(mode));
    };
    for (const btn of modeButtons) {
      bindEvent(btn, "click", () => {
        setMode(btn.getAttribute("data-mode"));
      });
    }
    const unleash = () => {
      if (isPhysicsChaosActive()) return;
      toggleEl.disabled = true;
      jailEl.classList.add("code-red-breaking");
      try {
        if (breakTimer) clearTimeout(breakTimer);
      } catch {}
      breakTimer = setTimeout(() => {
        try {
          if (!win.isConnected) return;
        } catch {
          return;
        }
        let startX = window.innerWidth / 2 - 14;
        let startY = 200;
        try {
          const pos = companion ? companion.getScreenPos() : null;
          if (pos) {
            startX = pos.x - 14;
            startY = Math.max(0, pos.y - 64);
          }
        } catch {}
        try {
          togglePhysicsChaos({
            x: startX,
            y: startY,
            vx: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2),
            vy: -11,
            intro: true,
          });
        } catch {}
        syncState();
        try {
          toggleEl.disabled = false;
        } catch {}
        jailEl.classList.remove("code-red-breaking");
      }, 1500);
    };
    bindEvent(toggleEl, "click", () => {
      if (isPhysicsChaosActive()) contain();
      else unleash();
    });
    this.openWindows.add(winId);
    bindEvent(win, "remove", () => {
      try {
        onStickmanControlMode(null);
      } catch {}
      try {
        if (breakTimer) clearTimeout(breakTimer);
      } catch {}
      breakTimer = null;
      try {
        if (syncTimer) clearInterval(syncTimer);
      } catch {}
      syncTimer = null;
      stopCompanion();
      this.openWindows.delete(winId);
      try {
        restoreWallpaper();
      } catch {}
    });
    if (!lastActive) startCompanion();
    try {
      onStickmanControlMode((mode) => refreshMode(mode));
    } catch {}
    refresh();
    syncTimer = setInterval(syncState, 300);
    try {
      activateChaosWallpaper();
    } catch {}
    if (opts.autoUnleash) {
      try {
        unleash();
      } catch {}
    }
  }

  onClose(winId) {
    this.openWindows.delete(winId);
  }
}
