import {
  startLaserCharge,
  startLaserBeam,
  stopLaserBeam,
  playLaserBurn,
} from "./stickmanLaserSfx.js";

const NS = "http://www.w3.org/2000/svg";
const LOCK_DELAY_MS = 200;
const LOCK_WINDOW_MS = 650;
const SWEEP_RATE = 0.025;
const SWEEP_DURATION_MS = 1200;
const SWEEP_LENGTH = 3000;
const SWEEP_BURN_MS = 70;

function svgEl(tag, attrs) {
  const node = document.createElementNS(NS, tag);
  for (const key in attrs) node.setAttribute(key, attrs[key]);
  return node;
}

function beamLine(stroke, width) {
  return svgEl("line", {
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
    style: "stroke:" + stroke,
    "stroke-width": width,
    "stroke-linecap": "round",
    display: "none",
  });
}

export function createLaserWeapon(host) {
  const strike = host && typeof host.strike === "function" ? host.strike : null;
  const sweep = host && typeof host.sweep === "function" ? host.sweep : null;

  let target = null;
  let lockAt = 0;
  let until = 0;
  let fired = false;
  let sweeping = false;
  let angle = 0;
  let rate = 0;
  let lastBurnAngle = 0;
  let lastBurnAt = 0;
  let sweepStartedAt = 0;

  const parts = {
    halo: beamLine("var(--error)", 14),
    beam: beamLine("var(--error)", 7),
    core: beamLine("var(--text-primary)", 2.5),
    glow: svgEl("circle", {
      r: 5,
      fill: "none",
      style: "stroke:var(--error)",
      "stroke-width": 2,
      display: "none",
    }),
  };

  function f(n) {
    return n.toFixed(1);
  }

  function hide() {
    parts.halo.setAttribute("display", "none");
    parts.beam.setAttribute("display", "none");
    parts.core.setAttribute("display", "none");
    parts.glow.setAttribute("display", "none");
  }

  function paint(x1, y1, x2, y2, flick) {
    parts.halo.setAttribute("display", "inline");
    parts.halo.setAttribute("x1", f(x1));
    parts.halo.setAttribute("y1", f(y1));
    parts.halo.setAttribute("x2", f(x2));
    parts.halo.setAttribute("y2", f(y2));
    parts.halo.setAttribute("opacity", (0.35 * flick + 0.15).toFixed(2));
    parts.beam.setAttribute("display", "inline");
    parts.beam.setAttribute("x1", f(x1));
    parts.beam.setAttribute("y1", f(y1));
    parts.beam.setAttribute("x2", f(x2));
    parts.beam.setAttribute("y2", f(y2));
    parts.beam.setAttribute("opacity", flick.toFixed(2));
    parts.core.setAttribute("display", "inline");
    parts.core.setAttribute("x1", f(x1));
    parts.core.setAttribute("y1", f(y1));
    parts.core.setAttribute("x2", f(x2));
    parts.core.setAttribute("y2", f(y2));
    parts.core.setAttribute("opacity", "1");
    parts.glow.setAttribute("display", "inline");
    parts.glow.setAttribute("cx", f(x1));
    parts.glow.setAttribute("cy", f(y1));
    parts.glow.setAttribute("r", f(5 + 2.5 * flick));
    parts.glow.setAttribute("opacity", "1");
  }

  function render(now, originX, originY, localHead) {
    if (!localHead) {
      hide();
      return;
    }
    if (target && !sweeping && now < lockAt) {
      const k = 1 - (lockAt - now) / LOCK_DELAY_MS;
      hide();
      parts.glow.setAttribute("display", "inline");
      parts.glow.setAttribute("cx", f(localHead.x));
      parts.glow.setAttribute("cy", f(localHead.y));
      parts.glow.setAttribute("r", f(2 + 9 * k));
      parts.glow.setAttribute("opacity", (0.35 + 0.65 * k).toFixed(2));
      return;
    }
    if (target && !sweeping && now >= lockAt && now < until) {
      paint(
        localHead.x,
        localHead.y,
        target.x - originX,
        target.y - originY,
        0.6 + 0.4 * Math.sin(now * 0.09),
      );
      return;
    }
    if (sweeping && now >= lockAt) {
      paint(
        localHead.x,
        localHead.y,
        localHead.x + Math.cos(angle) * SWEEP_LENGTH,
        localHead.y + Math.sin(angle) * SWEEP_LENGTH,
        0.7 + 0.3 * Math.sin(now * 0.11),
      );
      return;
    }
    hide();
  }

  function begin(now, picked) {
    if (!picked) return false;
    if (!Number.isFinite(picked.x) || !Number.isFinite(picked.y)) return false;
    target = picked;
    lockAt = now + LOCK_DELAY_MS;
    until = now + LOCK_WINDOW_MS;
    fired = false;
    sweeping = false;
    angle = 0;
    rate = 0;
    lastBurnAngle = 0;
    lastBurnAt = 0;
    sweepStartedAt = 0;
    try {
      startLaserCharge(LOCK_DELAY_MS);
    } catch {}
    return true;
  }

  function update(now, dt, originX, originY, localHead) {
    if (target && !fired && now >= lockAt && localHead) {
      fired = true;
      const worldX = originX + localHead.x;
      const worldY = originY + localHead.y;
      const baseAngle = Math.atan2(target.y - worldY, target.x - worldX);
      angle = baseAngle;
      rate = (Math.random() < 0.5 ? -1 : 1) * SWEEP_RATE;
      lastBurnAngle = baseAngle;
      lastBurnAt = 0;
      sweepStartedAt = now;
      sweeping = true;
      target = null;
      try {
        startLaserBeam();
      } catch {}
    }
    if (sweeping) {
      angle += rate * dt;
      if (sweep && localHead && now - lastBurnAt > SWEEP_BURN_MS) {
        if (angle !== lastBurnAngle) {
          lastBurnAt = now;
          lastBurnAngle = angle;
          try {
            playLaserBurn();
          } catch {}
          const worldX = originX + localHead.x;
          const worldY = originY + localHead.y;
          sweep(
            worldX,
            worldY,
            worldX + Math.cos(angle) * SWEEP_LENGTH,
            worldY + Math.sin(angle) * SWEEP_LENGTH,
          );
        }
      }
      if (now - sweepStartedAt >= SWEEP_DURATION_MS) {
        sweeping = false;
        try {
          stopLaserBeam();
        } catch {}
      }
    }
    if (target && now >= until) target = null;
  }

  function cancel() {
    target = null;
    sweeping = false;
    fired = false;
    sweepStartedAt = 0;
    try {
      stopLaserBeam();
    } catch {}
  }

  return {
    parts,
    begin,
    update,
    render,
    cancel,
    isTargeting: () => !!target,
    isSweeping: () => sweeping,
    isBusy: () => !!(target || sweeping),
  };
}
