import { createElement } from "../../framework.js";
import { resolveIconUrl } from "../assetResolver.js";
import { playShatter, playRebuild } from "../chaosSfx.js";
import { fxRing, screenShake } from "./stickmanFx.js";

export const HITS_TO_KILL = 3;
export const HIT_WINDOW_MS = 4000;
export const REGEN_MS = 15000;

const CURSOR_ICON = "static/icons/cursor.webp";
const SHARD_SIZE = 30;
const REBUILD_MS = 850;
const SHARD_BASE_FILTER = "drop-shadow(0 0 2px rgba(255,255,255,.75))";
const SHARD_REBUILD_FILTER =
  "drop-shadow(0 0 4px rgba(120,200,255,.95)) brightness(1.4)";
const SHARD_CUTS = [
  { poly: "0 0, 50% 0, 35% 40%, 0 55%", cx: 0.2, cy: 0.25 },
  { poly: "50% 0, 100% 0, 100% 30%, 70% 38%, 35% 40%", cx: 0.7, cy: 0.18 },
  { poly: "100% 30%, 100% 70%, 70% 60%, 70% 38%", cx: 0.88, cy: 0.5 },
  { poly: "100% 70%, 100% 100%, 65% 100%, 70% 60%", cx: 0.84, cy: 0.86 },
  { poly: "65% 100%, 40% 100%, 35% 40%, 70% 38%, 70% 60%", cx: 0.55, cy: 0.7 },
  { poly: "0 55%, 35% 40%, 40% 100%, 0 100%", cx: 0.2, cy: 0.8 },
];

let destroyed = false;
let hitTimes = [];
let regenTimer = null;
let rebuildTimer = null;
let blocker = null;
let shards = [];
let shardFrame = null;
let shardLast = 0;
let rebuilding = false;
let rebuildStart = 0;
let originX = 0;
let originY = 0;

function clampV(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function fxHost() {
  try {
    return document.querySelector(".stk-layer") || document.body;
  } catch {
    return document.body;
  }
}

function pageCenter() {
  const x = Math.round(window.innerWidth / 2);
  const y = Math.round(window.innerHeight / 2);
  return { x: x, y: y };
}

function floorLine() {
  try {
    const bar = document.getElementById("taskbar");
    if (!bar) return window.innerHeight;
    const rect = bar.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return window.innerHeight;
    return Math.max(0, window.innerHeight - rect.height);
  } catch {
    return window.innerHeight;
  }
}

function isImageSurfaceAt(x, y) {
  let el = null;
  try {
    el = document.elementFromPoint(x, y);
  } catch {
    return true;
  }
  if (!el) return true;
  try {
    if (el.closest && el.closest(".stk-layer")) return false;
  } catch {}
  try {
    const tag = el.tagName ? el.tagName.toUpperCase() : "";
    if (tag === "IMG" || tag === "VIDEO" || tag === "CANVAS") return true;
  } catch {}
  try {
    if (
      el.closest &&
      el.closest("img, video, canvas, #desktop, .desktop, .wallpaper")
    )
      return true;
  } catch {}
  try {
    if (el === document.body || el === document.documentElement) return true;
  } catch {}
  return false;
}

function impactFlash() {
  try {
    const node = createElement("div", { className: "stk-impact-flash" });
    node.style.cssText =
      "position:fixed;left:0;top:0;width:100vw;height:100vh;background:#fff;pointer-events:none;z-index:2147483600;";
    document.body.appendChild(node);
    if (!node.animate) {
      setTimeout(() => node.remove(), 120);
      return;
    }
    const anim = node.animate([{ opacity: 0.6 }, { opacity: 0 }], {
      duration: 240,
      easing: "ease-out",
    });
    anim.onfinish = () => {
      try {
        node.remove();
      } catch {}
    };
  } catch {}
}

function applyShardFilter(s) {
  if (!s || s.filter === s.lastFilter) return;
  s.lastFilter = s.filter;
  try {
    s.node.style.filter = s.filter;
  } catch {}
}

function applyShard(s) {
  s.node.style.transform =
    "translate(" +
    s.x.toFixed(1) +
    "px," +
    s.y.toFixed(1) +
    "px) rotate(" +
    s.rot.toFixed(1) +
    "deg)";
  applyShardFilter(s);
}

function buildShards(x, y) {
  clearShards();
  const host = fxHost();
  let url = "";
  try {
    url = resolveIconUrl(CURSOR_ICON);
  } catch {}
  for (let i = 0; i < SHARD_CUTS.length; i++) {
    const cut = SHARD_CUTS[i];
    const node = createElement("div", { className: "stk-cursor-shard" });
    node.style.cssText =
      "position:fixed;pointer-events:none;left:" +
      x +
      "px;top:" +
      y +
      "px;width:" +
      SHARD_SIZE +
      "px;height:" +
      SHARD_SIZE +
      'px;background-image:url("' +
      url +
      '");background-size:100% 100%;background-repeat:no-repeat;clip-path:polygon(' +
      cut.poly +
      ");z-index:2147483000;will-change:transform;filter:drop-shadow(0 0 2px rgba(255,255,255,.75));";
    try {
      host.appendChild(node);
    } catch {}
    const s = {
      node,
      cx: cut.cx,
      cy: cut.cy,
      x: 0,
      y: 0,
      vx: (cut.cx - 0.5) * 15 + (Math.random() - 0.5) * 5,
      vy: (cut.cy - 0.5) * 9 - 4 - Math.random() * 6,
      rot: 0,
      vr: (Math.random() - 0.5) * 22,
      fromX: 0,
      fromY: 0,
      fromRot: 0,
      filter: SHARD_BASE_FILTER,
      lastFilter: SHARD_BASE_FILTER,
    };
    applyShard(s);
    shards.push(s);
  }
}

function clearShards() {
  if (shardFrame !== null) {
    try {
      cancelAnimationFrame(shardFrame);
    } catch {}
    shardFrame = null;
  }
  for (let i = 0; i < shards.length; i++) {
    try {
      shards[i].node.remove();
    } catch {}
  }
  shards = [];
  shardLast = 0;
  rebuilding = false;
}

function tick(now) {
  shardFrame = null;
  if (!shards.length) return;
  const dt = clampV((now - (shardLast || now)) / 16.667, 0.3, 2.5);
  shardLast = now;
  if (rebuilding) {
    const t = clampV((now - rebuildStart) / REBUILD_MS, 0, 1);
    const e = 1 - Math.pow(1 - t, 3);
    const center = pageCenter();
    const tx = center.x - originX;
    const ty = center.y - originY;
    for (let i = 0; i < shards.length; i++) {
      const s = shards[i];
      s.x = s.fromX + (tx - s.fromX) * e;
      s.y = s.fromY + (ty - s.fromY) * e;
      s.rot = s.fromRot * (1 - e);
      applyShard(s);
    }
  } else {
    const floor = floorLine() - 4;
    const right = window.innerWidth - SHARD_SIZE;
    for (let i = 0; i < shards.length; i++) {
      const s = shards[i];
      s.vy += 0.55 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += s.vr * dt;
      const top = originY + s.y;
      if (top < 0) {
        s.y = -originY;
        s.vy = Math.abs(s.vy) * 0.4;
      }
      const bottom = originY + s.y + SHARD_SIZE * 0.85;
      if (bottom >= floor) {
        s.y = floor - originY - SHARD_SIZE * 0.85;
        s.vy = -Math.abs(s.vy) * 0.4;
        s.vx *= 0.75;
        s.vr *= 0.6;
        if (Math.abs(s.vy) < 1) {
          s.vy = 0;
          if (Math.abs(s.vx) < 0.4) {
            s.vx = 0;
            s.vr = 0;
          }
        }
      }
      const sx = originX + s.x;
      if (sx < 0) {
        s.x = -originX;
        s.vx = Math.abs(s.vx) * 0.6;
      } else if (sx > right) {
        s.x = right - originX;
        s.vx = -Math.abs(s.vx) * 0.6;
      }
      applyShard(s);
    }
  }
  shardFrame = requestAnimationFrame(tick);
}

function startRebuild() {
  rebuildTimer = null;
  if (!destroyed || !shards.length) return;
  for (let i = 0; i < shards.length; i++) {
    const s = shards[i];
    s.fromX = s.x;
    s.fromY = s.y;
    s.fromRot = s.rot % 360;
    s.filter = SHARD_REBUILD_FILTER;
    s.lastFilter = null;
    applyShardFilter(s);
  }
  rebuildStart = performance.now();
  rebuilding = true;
}

function destroyCursor(x, y) {
  destroyed = true;
  hitTimes = [];
  originX = x;
  originY = y;
  try {
    document.documentElement.classList.add("stk-cursor-dead");
  } catch {}
  try {
    blocker = createElement("div", { className: "stk-cursor-blocker" });
    if (document.body) document.body.appendChild(blocker);
  } catch {
    blocker = null;
  }
  buildShards(x, y);
  const host = fxHost();
  fxRing(host, x, y, 160, "#ffffff");
  fxRing(host, x, y, 96, "#ff5a3c");
  impactFlash();
  screenShake(0.9);
  try {
    playShatter();
  } catch {}
  shardLast = 0;
  shardFrame = requestAnimationFrame(tick);
  clearTimers();
  rebuildTimer = setTimeout(startRebuild, Math.max(0, REGEN_MS - REBUILD_MS));
  regenTimer = setTimeout(healCursor, REGEN_MS);
}

function clearTimers() {
  if (regenTimer) {
    try {
      clearTimeout(regenTimer);
    } catch {}
    regenTimer = null;
  }
  if (rebuildTimer) {
    try {
      clearTimeout(rebuildTimer);
    } catch {}
    rebuildTimer = null;
  }
}

function healCursor() {
  clearTimers();
  try {
    if (blocker) blocker.remove();
  } catch {}
  blocker = null;
  clearShards();
  try {
    document.documentElement.classList.remove("stk-cursor-dead");
  } catch {}
  destroyed = false;
  hitTimes = [];
  const center = pageCenter();
  try {
    fxRing(fxHost(), center.x, center.y, 90, "#7ad0ff");
  } catch {}
  try {
    playRebuild();
  } catch {}
}

export function isCursorDestroyed() {
  return destroyed;
}

export function getCursorDamage() {
  try {
    const now = Date.now();
    return hitTimes.filter((t) => now - t <= HIT_WINDOW_MS).length;
  } catch {
    return 0;
  }
}

export function registerCursorHit(x, y, forced) {
  if (destroyed) return false;
  try {
    const now = Date.now();
    hitTimes = hitTimes.filter((t) => now - t <= HIT_WINDOW_MS);
    const surface = forced ? true : isImageSurfaceAt(x, y);
    if (!surface) return false;
    hitTimes.push(now);
    if (hitTimes.length >= HITS_TO_KILL) {
      destroyCursor(x, y);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function cleanupCursorKill() {
  clearTimers();
  try {
    if (blocker) blocker.remove();
  } catch {}
  blocker = null;
  clearShards();
  try {
    document.documentElement.classList.remove("stk-cursor-dead");
  } catch {}
  destroyed = false;
  hitTimes = [];
}
