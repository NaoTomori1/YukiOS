import { $$ } from "../../framework.js";
import { fxRing, fxFireball, screenShake } from "./stickmanFx.js";

const NS = "http://www.w3.org/2000/svg";
const FILTER_ID = "stk-air-warp";
const TARGET_SELECTOR = ".window, #desktop > .icon";
const RAMP_MS = 180;
export const AIR_WARP_LEAD_MS = 200;
export const AIR_WARP_RADIUS = 300;
export const AIR_WARP_PEAK = 26;
export const AIR_WARP_MAX_TARGETS = 14;
const MIN_RADIUS = 90;
const MAX_RADIUS = 2400;
const NOISE_FREQ = "0.012 0.02";

function svgEl(tag, attrs) {
  const node = document.createElementNS(NS, tag);
  if (attrs) for (const key in attrs) node.setAttribute(key, attrs[key]);
  return node;
}

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function easeOutCubic(t) {
  const inv = 1 - t;
  return 1 - inv * inv * inv;
}

function stamp() {
  try {
    if (typeof performance !== "undefined" && performance.now)
      return performance.now();
  } catch {}
  return Date.now();
}

export function createAirWarp(ctx) {
  const fn = (name) =>
    ctx && typeof ctx[name] === "function" ? ctx[name] : null;
  const getLayer = fn("getLayer");

  let svg = null;
  let displacement = null;
  let tracked = [];
  let primed = false;
  let startedAt = 0;
  let peak = AIR_WARP_PEAK;

  function layer() {
    try {
      return getLayer ? getLayer() : null;
    } catch {
      return null;
    }
  }

  function ensureFilter() {
    if (displacement && svg) return displacement;
    try {
      svg = svgEl("svg", {
        "aria-hidden": "true",
        focusable: "false",
        width: "0",
        height: "0",
      });
      svg.style.cssText =
        "position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;pointer-events:none;";
      const defs = svgEl("defs", null);
      const filter = svgEl("filter", {
        id: FILTER_ID,
        x: "-25%",
        y: "-25%",
        width: "150%",
        height: "150%",
        "color-interpolation-filters": "sRGB",
      });
      const turbulence = svgEl("feTurbulence", {
        type: "fractalNoise",
        baseFrequency: NOISE_FREQ,
        numOctaves: "2",
        seed: "7",
        result: "warpNoise",
      });
      displacement = svgEl("feDisplacementMap", {
        in: "SourceGraphic",
        in2: "warpNoise",
        scale: "0",
        xChannelSelector: "R",
        yChannelSelector: "G",
      });
      filter.appendChild(turbulence);
      filter.appendChild(displacement);
      defs.appendChild(filter);
      svg.appendChild(defs);
      document.body.appendChild(svg);
    } catch {
      svg = null;
      displacement = null;
    }
    return displacement;
  }

  function setScale(value) {
    try {
      if (displacement) displacement.setAttribute("scale", String(value));
    } catch {}
  }

  function detach() {
    for (let i = 0; i < tracked.length; i++) {
      const entry = tracked[i];
      try {
        if (entry && entry.node && entry.node.isConnected)
          entry.node.style.filter = entry.prev;
      } catch {}
    }
    tracked = [];
  }

  function prune() {
    const kept = [];
    for (let i = 0; i < tracked.length; i++) {
      const entry = tracked[i];
      try {
        if (entry && entry.node && entry.node.isConnected) kept.push(entry);
      } catch {}
    }
    tracked = kept;
  }

  function collect(x, y, radius) {
    const found = [];
    let nodes = [];
    try {
      nodes = $$(TARGET_SELECTOR);
    } catch {
      nodes = [];
    }
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      try {
        if (!node || !node.isConnected) continue;
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(cx - x, cy - y);
        if (dist > radius) continue;
        found.push({ node: node, dist: dist, prev: node.style.filter });
      } catch {}
    }
    found.sort((a, b) => a.dist - b.dist);
    return found.slice(0, AIR_WARP_MAX_TARGETS);
  }

  function prime(x, y, radius) {
    try {
      if (!ensureFilter()) return false;
      detach();
      setScale(0);
      const reach = clamp(
        Number.isFinite(radius) ? radius : AIR_WARP_RADIUS,
        MIN_RADIUS,
        MAX_RADIUS,
      );
      tracked = collect(x, y, reach);
      const link = "url(#" + FILTER_ID + ")";
      for (let i = 0; i < tracked.length; i++) {
        const entry = tracked[i];
        try {
          entry.node.style.filter = entry.prev ? entry.prev + " " + link : link;
        } catch {}
      }
      peak = AIR_WARP_PEAK;
      startedAt = stamp();
      primed = true;
      return true;
    } catch {
      primed = false;
      return false;
    }
  }

  function update(now) {
    try {
      if (!primed) return;
      prune();
      const at = Number.isFinite(now) ? now : stamp();
      const t = clamp((at - startedAt) / RAMP_MS, 0, 1);
      setScale(peak * easeOutCubic(t));
    } catch {}
  }

  function release(x, y) {
    try {
      setScale(0);
      detach();
      primed = false;
    } catch {}
    try {
      const target = layer();
      if (target) fxRing(target, x, y, 104, "#ffffff");
    } catch {}
    try {
      const target = layer();
      if (target) fxFireball(target, x, y, 36);
    } catch {}
    try {
      screenShake(0.28);
    } catch {}
  }

  function isActive() {
    return primed;
  }

  function destroy() {
    try {
      setScale(0);
    } catch {}
    try {
      detach();
    } catch {}
    primed = false;
    try {
      if (svg && svg.parentNode) svg.parentNode.removeChild(svg);
    } catch {}
    svg = null;
    displacement = null;
  }

  return { prime, release, update, isActive, destroy };
}
