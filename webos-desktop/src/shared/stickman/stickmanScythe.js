import { fxRing, fxDust, screenShake } from "./stickmanFx.js";

const SWING_MS = 290;
const SWING_ARC = Math.PI * 1.05;
const FULL_ARC = Math.PI * 2;
const BLADE_R = 130;
const BLADE_THICK = 18;
const VACUUM_R = 180;
const VACUUM_PULL = 0.55;
const LAUNCH_FORCE = 15;
const HIT_ARC = 0.5;
const VORTEX_MS = 900;
const VORTEX_R = 140;
const VORTEX_PULL = 0.85;
const VORTEX_CD_MS = 4000;

function el(tag, attrs) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  if (attrs) for (const k in attrs) node.setAttribute(k, attrs[k]);
  return node;
}

function makeRoot() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "stk-svg-root");
  svg.style.cssText =
    "position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none;";
  return svg;
}

function crescentPath(r, thick, a0, a1) {
  const rInner = r - thick;
  const sweep = a1 > a0 ? 1 : 0;
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  const ox0 = (Math.cos(a0) * r).toFixed(1);
  const oy0 = (Math.sin(a0) * r).toFixed(1);
  const ox1 = (Math.cos(a1) * r).toFixed(1);
  const oy1 = (Math.sin(a1) * r).toFixed(1);
  const ix0 = (Math.cos(a0) * rInner).toFixed(1);
  const iy0 = (Math.sin(a0) * rInner).toFixed(1);
  const ix1 = (Math.cos(a1) * rInner).toFixed(1);
  const iy1 = (Math.sin(a1) * rInner).toFixed(1);
  return (
    "M" +
    ix0 +
    " " +
    iy0 +
    "L" +
    ox0 +
    " " +
    oy0 +
    "A" +
    r +
    " " +
    r +
    " 0 " +
    large +
    " " +
    sweep +
    " " +
    ox1 +
    " " +
    oy1 +
    "L" +
    ix1 +
    " " +
    iy1 +
    "A" +
    rInner +
    " " +
    rInner +
    " 0 " +
    large +
    " " +
    (1 - sweep) +
    " " +
    ix0 +
    " " +
    iy0 +
    "Z"
  );
}

function poleEdgePath(r, a0) {
  const ex = (Math.cos(a0) * r).toFixed(1);
  const ey = (Math.sin(a0) * r).toFixed(1);
  return "M0 0L" + ex + " " + ey;
}

function vacuumPath(r, a0, a1) {
  const sweep = a1 > a0 ? 1 : 0;
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  const x0 = (Math.cos(a0) * r).toFixed(1);
  const y0 = (Math.sin(a0) * r).toFixed(1);
  const x1 = (Math.cos(a1) * r).toFixed(1);
  const y1 = (Math.sin(a1) * r).toFixed(1);
  return (
    "M0 0L" +
    x0 +
    " " +
    y0 +
    "A" +
    r +
    " " +
    r +
    " 0 " +
    large +
    " " +
    sweep +
    " " +
    x1 +
    " " +
    y1 +
    "Z"
  );
}

export function createScytheSystem(ctx) {
  const fn = (n) => (ctx && typeof ctx[n] === "function" ? ctx[n] : null);
  const getLayer = fn("getLayer");
  const getCursor = fn("getCursor");
  const cursorDead = fn("cursorDead");
  const hitCursor = fn("hitCursor");
  const launchCursor = fn("launchCursor");
  const sparks = fn("sparks");

  let swing = null;
  let vortex = null;
  let root = null;
  let vortexCdAt = 0;

  function layer() {
    try {
      return getLayer ? getLayer() : null;
    } catch {
      return null;
    }
  }

  function cursor() {
    try {
      const c = getCursor ? getCursor() : null;
      if (c && c.seen && !(cursorDead && cursorDead())) return c;
    } catch {}
    return null;
  }

  function ensureRoot() {
    try {
      if (root && root.isConnected) return root;
      const lay = layer();
      if (!lay) return null;
      root = makeRoot();
      lay.appendChild(root);
      return root;
    } catch {
      return null;
    }
  }

  function startSwing(now, x, y, ang, full) {
    const host = ensureRoot();
    if (!host) return;
    const group = el("g", { class: "stk-scythe" });
    const vac = el("path", { class: "stk-scythe-vacuum", fill: "none", d: "" });
    const blade = el("path", { class: "stk-scythe-blade", d: "" });
    const edge = el("path", { class: "stk-scythe-edge", fill: "none", d: "" });
    const pole = el("path", { class: "stk-scythe-pole", fill: "none", d: "" });
    group.appendChild(vac);
    group.appendChild(blade);
    group.appendChild(edge);
    group.appendChild(pole);
    group.setAttribute(
      "transform",
      "translate(" +
        x.toFixed(1) +
        "," +
        y.toFixed(1) +
        ") rotate(" +
        ((ang * 180) / Math.PI).toFixed(1) +
        ")",
    );
    host.appendChild(group);
    swing = {
      el: group,
      blade: blade,
      edge: edge,
      vac: vac,
      pole: pole,
      x: x,
      y: y,
      ang: ang,
      t: 0,
      full: !!full,
      hit: false,
    };
    if (sparks) {
      try {
        sparks(x, y, 4);
      } catch {}
    }
  }

  function spawnVortex(now, x, y) {
    const lay = layer();
    const host = ensureRoot();
    if (lay && host) {
      const g = el("g", { class: "stk-scythe-vortex" });
      const r1 = el("path", {
        class: "stk-vortex-ring",
        fill: "none",
        d: crescentPath(VORTEX_R, 22, 0, Math.PI * 1.5),
      });
      const r2 = el("path", {
        class: "stk-vortex-ring",
        fill: "none",
        d: crescentPath(VORTEX_R * 0.7, 16, 0, Math.PI * 1.3),
      });
      const r3 = el("path", {
        class: "stk-vortex-ring",
        fill: "none",
        d: crescentPath(VORTEX_R * 0.4, 10, 0, Math.PI * 1.1),
      });
      g.appendChild(r1);
      g.appendChild(r2);
      g.appendChild(r3);
      g.setAttribute(
        "transform",
        "translate(" + x.toFixed(1) + "," + y.toFixed(1) + ")",
      );
      host.appendChild(g);
      vortex = { el: g, x: x, y: y, born: now, until: now + VORTEX_MS };
      fxRing(lay, x, y, VORTEX_R, "#9b30ff");
      screenShake(0.5);
    }
    vortexCdAt = now + VORTEX_CD_MS;
  }

  function pullCursor(now, cx, cy, pull, radius) {
    const c = cursor();
    if (!c) return;
    const dx = cx - c.x;
    const dy = cy - c.y;
    const d = Math.hypot(dx, dy);
    if (d < 2 || d > radius) return;
    if (launchCursor) {
      try {
        launchCursor((dx / d) * pull * 6, (dy / d) * pull * 6);
      } catch {}
    }
  }

  function update(now, dt, dtSec) {
    if (swing) {
      swing.t += dtSec;
      const k = Math.min(1, swing.t / (SWING_MS / 1000));
      const a0 = swing.ang;
      const a1 = swing.ang + (swing.full ? FULL_ARC : SWING_ARC) * k;
      try {
        swing.blade.setAttribute(
          "d",
          crescentPath(BLADE_R, BLADE_THICK, a0, a1),
        );
        swing.edge.setAttribute("d", crescentPath(BLADE_R + 8, 4, a0, a1));
        swing.vac.setAttribute("d", vacuumPath(VACUUM_R, a0, a1));
        swing.pole.setAttribute("d", poleEdgePath(BLADE_R - BLADE_THICK, a0));
        swing.el.setAttribute("opacity", (1 - k * 0.55).toFixed(2));
      } catch {}
      const c = cursor();
      if (c) {
        const dx = c.x - swing.x;
        const dy = c.y - swing.y;
        const d = Math.hypot(dx, dy);
        if (d < VACUUM_R) {
          const ca = Math.atan2(dy, dx);
          let diff = Math.abs(
            ((ca - swing.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI,
          );
          if (d <= BLADE_R + 10 && diff < HIT_ARC && !swing.hit) {
            swing.hit = true;
            if (launchCursor) {
              try {
                launchCursor(
                  Math.cos(swing.ang) * LAUNCH_FORCE,
                  Math.sin(swing.ang) * LAUNCH_FORCE,
                );
              } catch {}
            }
            if (hitCursor) {
              try {
                hitCursor(c.x, c.y);
              } catch {}
            }
            const lay = layer();
            if (lay) fxRing(lay, c.x, c.y, 80, "#ff1028");
            screenShake(0.55);
          } else if (diff < 1.7) {
            pullCursor(now, swing.x, swing.y, VACUUM_PULL, VACUUM_R);
          }
        }
      }
      if (k >= 1) {
        try {
          swing.el.remove();
        } catch {}
        const wasFull = swing.full;
        const sx = swing.x;
        const sy = swing.y;
        swing = null;
        if (wasFull && now >= vortexCdAt) spawnVortex(now, sx, sy);
      }
    }
    if (vortex) {
      if (now >= vortex.until) {
        try {
          vortex.el.remove();
        } catch {}
        vortex = null;
      } else {
        const age = (now - vortex.born) / VORTEX_MS;
        try {
          vortex.el.setAttribute("opacity", (1 - age).toFixed(2));
          vortex.el.setAttribute(
            "transform",
            "translate(" +
              vortex.x.toFixed(1) +
              "," +
              vortex.y.toFixed(1) +
              ") rotate(" +
              ((now * 0.006) % 360).toFixed(1) +
              ")",
          );
        } catch {}
        pullCursor(now, vortex.x, vortex.y, VORTEX_PULL, VORTEX_R);
      }
    }
  }

  function clear() {
    if (swing) {
      try {
        swing.el.remove();
      } catch {}
      swing = null;
    }
    if (vortex) {
      try {
        vortex.el.remove();
      } catch {}
      vortex = null;
    }
    try {
      if (root) root.remove();
    } catch {}
    root = null;
  }

  return {
    startSwing,
    update,
    clear,
    isSwinging: () => !!swing,
    hasVortex: () => !!vortex,
    SWING_MS: SWING_MS,
    VORTEX_MS: VORTEX_MS,
  };
}

export const SCYTHE_BLADE_R = BLADE_R;
export const SCYTHE_VACUUM_R = VACUUM_R;
export const SCYTHE_VORTEX_MS = VORTEX_MS;
