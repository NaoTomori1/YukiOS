import "../styles/codeRed.css";
import { BaseApp, os, $, bindEvent, setText } from "../framework.js";
import {
  isPhysicsChaosActive,
  togglePhysicsChaos,
} from "../shared/desktopPhysics.js";
import { createCellCompanion } from "../shared/stickman/stickmanCellCompanion.js";

export class CodeRedApp extends BaseApp {
  constructor(services) {
    super(services);
    this.openWindows = new Set();
  }

  async open(opts = {}) {
    const winId = "code-red";
    if (await this.isSingletonOpen(winId)) return;
    const win = os.window.create(winId, "Code Red", "300px", "360px", {
      icon: "icons/codered.svg",
    });
    win.innerHTML = `<div class="code-red-root"><div class="code-red-jail"><div class="code-red-cell"><div class="code-red-interior"><div class="code-red-floor"></div><div class="code-red-pet"></div></div><div class="code-red-gate-slot"><div class="code-red-gate"></div></div></div><div class="code-red-jail-label">Contained</div></div><button class="code-red-toggle"></button></div>`;
    const jailEl = $(".code-red-jail", win);
    const labelEl = $(".code-red-jail-label", win);
    const toggleEl = $(".code-red-toggle", win);
    const cellEl = $(".code-red-cell", win);
    const petEl = $(".code-red-pet", win);
    const floorEl = $(".code-red-floor", win);
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
      setText(labelEl, active ? "Escaped" : "Contained");
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
        if (breakTimer) clearTimeout(breakTimer);
      } catch {}
      breakTimer = null;
      try {
        if (syncTimer) clearInterval(syncTimer);
      } catch {}
      syncTimer = null;
      stopCompanion();
      this.openWindows.delete(winId);
    });
    if (!lastActive) startCompanion();
    refresh();
    syncTimer = setInterval(syncState, 300);
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
