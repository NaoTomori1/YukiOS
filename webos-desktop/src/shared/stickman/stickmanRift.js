import { $, addClass, createElement, removeClass } from "../domUtils.js";

const SPACE_ID = "stk-rift-space";
const RIM_ID = "stk-rift-rim";
const WALLPAPER_IDS = ["wallpaper-img", "wallpaper-video"];

const RIM_VIEW = "-1.5 -1.5 3 3";
const RIM_BASE_PX = 100;
const RIM_W = 300;
const RIM_H = 300;

const OPEN_MS = 1500;
const HOLD_MS = 5600;
const HEAL_MS = 3400;
const TOTAL_MS = OPEN_MS + HOLD_MS + HEAL_MS;
const SPAN_RATIO = 0.3;
const MIN_SPAN = 190;
const MAX_SPAN = 520;
const HEAL_POW = 2.4;
const EDGE_BLUR = 7;

const NEBULA = [
  "radial-gradient(110% 85% at 26% 20%,rgba(126,84,214,0.5),rgba(0,0,0,0) 60%)",
  "radial-gradient(95% 75% at 78% 74%,rgba(64,86,214,0.44),rgba(0,0,0,0) 56%)",
  "radial-gradient(70% 60% at 58% 42%,rgba(168,96,224,0.28),rgba(0,0,0,0) 68%)",
  "radial-gradient(46% 40% at 44% 62%,rgba(72,176,255,0.2),rgba(0,0,0,0) 64%)",
];

const STAR_TILES = [
  { count: 22, tile: 170, min: 1, max: 1.8, alpha: 0.75 },
  { count: 18, tile: 310, min: 1.3, max: 2.4, alpha: 0.85 },
  { count: 12, tile: 520, min: 2.2, max: 3.8, alpha: 0.95 },
  { count: 6, tile: 820, min: 3.4, max: 5.2, alpha: 1 },
];

const WAIST = 0.13;
const FLARE_X = 1;
const FLARE_Y = 0.86;
const SHAPE_HX = 1.05;
const SHAPE_HY = 0.86;
const EDGE_PAD = 16;
const MIN_MASK_SPAN = 0.75;

const RIGHT_BLADE_D =
  "M0 " +
  -WAIST +
  "C0.34 -0.24 0.62 -0.52 " +
  FLARE_X +
  " " +
  -FLARE_Y +
  "C1.05 -0.6 1.05 -0.36 " +
  FLARE_X +
  " " +
  -FLARE_Y * 0.62 +
  "C1.05 -0.3 1.05 0.3 " +
  FLARE_X +
  " " +
  FLARE_Y * 0.62 +
  "C1.05 0.36 1.05 0.6 " +
  FLARE_X +
  " " +
  FLARE_Y +
  "C0.62 0.52 0.34 0.24 0 " +
  WAIST +
  "Z";

const LEFT_BLADE_D =
  "M0 " +
  -WAIST +
  "C-0.34 -0.24 -0.62 -0.52 " +
  -FLARE_X +
  " " +
  -FLARE_Y +
  "C-1.05 -0.6 -1.05 -0.36 " +
  -FLARE_X +
  " " +
  -FLARE_Y * 0.62 +
  "C-1.05 -0.3 -1.05 0.3 " +
  -FLARE_X +
  " " +
  FLARE_Y * 0.62 +
  "C-1.05 0.36 -1.05 0.6 " +
  -FLARE_X +
  " " +
  FLARE_Y +
  "C-0.62 0.52 -0.34 0.24 0 " +
  WAIST +
  "Z";

const BLADE_CLOSED_DEG = 88;
const BLADE_WOBBLE_DEG = 11;

let rift = null;
let maskPrimed = false;
let frame = null;
let spaceEl = null;
let rimEl = null;

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function seeded(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function baseSpan() {
  try {
    const side = Math.min(window.innerWidth, window.innerHeight);
    return Math.max(MIN_SPAN, Math.min(MAX_SPAN, side * SPAN_RATIO));
  } catch {
    return MIN_SPAN;
  }
}

function starLayer(rand, tile, count, minSize, maxSize, minAlpha, out) {
  for (let i = 0; i < count; i++) {
    const x = Math.round(rand() * tile);
    const y = Math.round(rand() * tile);
    const size = (minSize + rand() * (maxSize - minSize)).toFixed(2);
    const alpha = (minAlpha + rand() * (1 - minAlpha)).toFixed(2);
    out.image.push(
      "radial-gradient(" +
        size +
        "px " +
        size +
        "px at " +
        x +
        "px " +
        y +
        "px,rgba(255,255,255," +
        alpha +
        "),transparent)",
    );
    out.size.push(tile + "px " + tile + "px");
    out.repeat.push("repeat");
  }
}

function buildStarfield() {
  const rand = seeded(20260818);
  const out = { image: [], size: [], repeat: [] };
  for (let i = 0; i < NEBULA.length; i++) {
    out.image.push(NEBULA[i]);
    out.size.push("100% 100%");
    out.repeat.push("no-repeat");
  }
  for (let i = 0; i < STAR_TILES.length; i++) {
    const t = STAR_TILES[i];
    starLayer(rand, t.tile, t.count, t.min, t.max, t.alpha, out);
  }
  return {
    image: out.image.join(","),
    size: out.size.join(","),
    repeat: out.repeat.join(","),
  };
}

function ensureSpace() {
  try {
    if (spaceEl && spaceEl.isConnected) return spaceEl;
    const field = buildStarfield();
    spaceEl = createElement("div", {
      id: SPACE_ID,
      className: "stk-rift-space",
      styles: {
        backgroundImage: field.image,
        backgroundSize: field.size,
        backgroundRepeat: field.repeat,
      },
    });
    document.body.appendChild(spaceEl);
    rimEl = createElement("div", {
      id: RIM_ID,
      className: "stk-rift-rim",
      html:
        "<svg viewBox='" +
        RIM_VIEW +
        "' width='100%' height='100%' preserveAspectRatio='xMidYMid meet'>" +
        "<g class='stk-rift-blade stk-rift-blade-right'>" +
        "<path class='stk-rift-rim-glow' d='" +
        RIGHT_BLADE_D +
        "'/>" +
        "<path class='stk-rift-rim-core' d='" +
        RIGHT_BLADE_D +
        "'/>" +
        "</g>" +
        "<g class='stk-rift-blade stk-rift-blade-left'>" +
        "<path class='stk-rift-rim-glow' d='" +
        LEFT_BLADE_D +
        "'/>" +
        "<path class='stk-rift-rim-core' d='" +
        LEFT_BLADE_D +
        "'/>" +
        "</g>" +
        "</svg>",
    });
    document.body.appendChild(rimEl);
    return spaceEl;
  } catch {
    return null;
  }
}

function paintRim() {
  if (!rimEl) return;
  try {
    const scale = rift.span * rift.open;
    const blade = bladeAngles(rift.spread);
    const k = (scale / RIM_BASE_PX).toFixed(4);
    rimEl.style.left = (rift.x - RIM_W / 2).toFixed(1) + "px";
    rimEl.style.top = (rift.y - RIM_H / 2).toFixed(1) + "px";
    rimEl.style.transform =
      "rotate(" + rift.deg.toFixed(2) + "deg) scale(" + k + ")";
    rimEl.style.setProperty("--blade-r", blade.right.toFixed(2) + "deg");
    rimEl.style.setProperty("--blade-l", blade.left.toFixed(2) + "deg");
    rimEl.style.opacity = clamp01(rift.open * 1.2).toFixed(3);
  } catch {}
}

function openness(now) {
  const t = now - rift.born;
  if (t < OPEN_MS) return clamp01(t / OPEN_MS);
  if (t < OPEN_MS + HOLD_MS) return 1;
  return clamp01(1 - Math.pow((t - OPEN_MS - HOLD_MS) / HEAL_MS, HEAL_POW));
}

function bladeAngles(p) {
  const settle = 1 - Math.pow(1 - p, 3);
  const spread = BLADE_CLOSED_DEG * (1 - settle);
  const wobble = Math.sin(p * 34) * BLADE_WOBBLE_DEG * (1 - p) * (1 - p);
  return {
    right: -spread + wobble,
    left: spread + wobble * 0.6,
  };
}

function buildMask(w, h, span, spread01) {
  const base =
    "translate(" +
    rift.x.toFixed(1) +
    "," +
    rift.y.toFixed(1) +
    ") rotate(" +
    rift.deg.toFixed(2) +
    ") scale(" +
    span.toFixed(4) +
    ")";
  const blade = bladeAngles(spread01);
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='" +
    w +
    "' height='" +
    h +
    "' viewBox='0 0 " +
    w +
    " " +
    h +
    "'>" +
    "<defs>" +
    "<filter id='rb' filterUnits='userSpaceOnUse' x='" +
    (rift.x - span * 2).toFixed(1) +
    "' y='" +
    (rift.y - span * 2).toFixed(1) +
    "' width='" +
    (span * 4).toFixed(1) +
    "' height='" +
    (span * 4).toFixed(1) +
    "' color-interpolation-filters='sRGB'>" +
    "<feGaussianBlur stdDeviation='" +
    EDGE_BLUR.toFixed(2) +
    "'/></filter>" +
    "<mask id='m' maskUnits='userSpaceOnUse' x='0' y='0' width='" +
    w +
    "' height='" +
    h +
    "'>" +
    "<rect width='" +
    w +
    "' height='" +
    h +
    "' fill='#fff'/>" +
    "<g filter='url(#rb)'>" +
    "<g transform='" +
    base +
    "'>" +
    "<g transform='rotate(" +
    blade.right.toFixed(2) +
    ")'><path fill='#000' d='" +
    RIGHT_BLADE_D +
    "'/></g>" +
    "<g transform='rotate(" +
    blade.left.toFixed(2) +
    ")'><path fill='#000' d='" +
    LEFT_BLADE_D +
    "'/></g>" +
    "</g>" +
    "</g>" +
    "</mask>" +
    "</defs>" +
    "<rect width='" +
    w +
    "' height='" +
    h +
    "' fill='#fff' mask='url(#m)'/>" +
    "</svg>";
  return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
}

function applyMask() {
  let w = 0;
  let h = 0;
  try {
    const probe = $("#wallpaper-img") || $("#wallpaper-video");
    w = probe && probe.clientWidth ? probe.clientWidth : window.innerWidth;
    h = probe && probe.clientHeight ? probe.clientHeight : window.innerHeight;
  } catch {
    return;
  }
  if (!w || !h) return false;
  const mask = buildMask(
    w,
    h,
    Math.max(MIN_MASK_SPAN, rift.span * rift.open),
    rift.spread,
  );
  for (let i = 0; i < WALLPAPER_IDS.length; i++) {
    let el = null;
    try {
      el = $("#" + WALLPAPER_IDS[i]);
    } catch {}
    if (!el) continue;
    try {
      el.style.maskImage = mask;
      el.style.maskRepeat = "no-repeat";
      el.style.maskSize = "100% 100%";
      el.style.webkitMaskImage = mask;
      el.style.webkitMaskRepeat = "no-repeat";
      el.style.webkitMaskSize = "100% 100%";
    } catch {}
  }
  return true;
}

function clearMask() {
  for (let i = 0; i < WALLPAPER_IDS.length; i++) {
    let el = null;
    try {
      el = $("#" + WALLPAPER_IDS[i]);
    } catch {}
    if (!el) continue;
    try {
      el.style.maskImage = "none";
      el.style.maskRepeat = "";
      el.style.maskSize = "";
      el.style.webkitMaskImage = "";
      el.style.webkitMaskRepeat = "";
      el.style.webkitMaskSize = "";
    } catch {}
  }
}

function hideSpace() {
  try {
    if (spaceEl) {
      removeClass(spaceEl, "stk-rift-space-live");
      spaceEl.remove();
    }
  } catch {}
  spaceEl = null;
  try {
    if (rimEl) rimEl.remove();
  } catch {}
  rimEl = null;
}

function tick() {
  frame = null;
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  rift.open = openness(now);
  rift.spread = rift.open;
  if (now - rift.born >= TOTAL_MS) {
    rift = null;
    maskPrimed = false;
    clearMask();
    hideSpace();
    return;
  }
  const revealReady = maskPrimed;
  ensureSpace();
  if (applyMask()) maskPrimed = true;
  if (spaceEl && revealReady) {
    try {
      addClass(spaceEl, "stk-rift-space-live");
    } catch {}
  }
  paintRim();
  frame = requestAnimationFrame(tick);
}

function start() {
  if (frame === null) frame = requestAnimationFrame(tick);
}

function keepOnScreen(x, y, span, deg, vw, vh) {
  const rad = (deg * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  const reachX = (SHAPE_HX * c + SHAPE_HY * s) * span + EDGE_PAD;
  const reachY = (SHAPE_HX * s + SHAPE_HY * c) * span + EDGE_PAD;
  const mx = Math.min(reachX, vw / 2);
  const my = Math.min(reachY, vh / 2);
  return {
    x: Math.max(mx, Math.min(vw - mx, x)),
    y: Math.max(my, Math.min(vh - my, y)),
  };
}

export function openRealityRift(x, y, ang) {
  try {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const deg = ((ang || 0) * 180) / Math.PI;
    const span = baseSpan();
    const spot = keepOnScreen(x, y, span, deg, vw, vh);
    const cx = spot.x;
    const cy = spot.y;
    if (rift) {
      rift.x = cx;
      rift.y = cy;
      rift.deg = deg;
      rift.span = span;
      rift.born = performance.now();
      rift.open = 0;
      rift.spread = 0;
      maskPrimed = false;
      try {
        if (spaceEl) removeClass(spaceEl, "stk-rift-space-live");
      } catch {}
      return true;
    }
    rift = {
      x: cx,
      y: cy,
      deg: deg,
      span: span,
      born: performance.now(),
      open: 0,
      spread: 0,
    };
    maskPrimed = false;
    ensureSpace();
    start();
    return true;
  } catch {
    return false;
  }
}

export function resetRealityRift() {
  rift = null;
  maskPrimed = false;
  clearMask();
  if (frame !== null) {
    try {
      cancelAnimationFrame(frame);
    } catch {}
    frame = null;
  }
  hideSpace();
}
