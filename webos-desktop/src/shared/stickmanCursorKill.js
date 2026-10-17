import { createElement } from "../framework.js";
import { playShatter, playRebuild } from "./chaosSfx.js";

export const HITS_TO_KILL = 3;
export const HIT_WINDOW_MS = 4000;
export const REGEN_MS = 15000;

let destroyed = false;
let hitTimes = [];
let regenTimer = null;
let blocker = null;
let debris = null;

function isImageSurfaceAt(x, y) {
  let el = null;
  try {
    el = document.elementFromPoint(x, y);
  } catch {
    return true;
  }
  try {
    if (!el) return true;
  } catch {
    return true;
  }
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

function destroyCursor(x, y) {
  try {
    destroyed = true;
  } catch {}
  try {
    hitTimes = [];
  } catch {}
  try {
    document.documentElement.classList.add("stk-cursor-dead");
  } catch {}
  try {
    blocker = createElement("div", { className: "stk-cursor-blocker" });
  } catch {
    blocker = null;
  }
  try {
    if (blocker && document.body) document.body.appendChild(blocker);
  } catch {}
  try {
    debris = createElement("div", { className: "stk-cursor-debris" });
  } catch {
    debris = null;
  }
  try {
    if (debris) {
      debris.style.left = x + "px";
      debris.style.top = y + "px";
    }
  } catch {}
  try {
    if (debris) {
      let shardA = null;
      let shardB = null;
      try {
        shardA = createElement("span", { className: "stk-cursor-shard-a" });
      } catch {
        shardA = null;
      }
      try {
        shardB = createElement("span", { className: "stk-cursor-shard-b" });
      } catch {
        shardB = null;
      }
      try {
        if (shardA) debris.appendChild(shardA);
      } catch {}
      try {
        if (shardB) debris.appendChild(shardB);
      } catch {}
    }
  } catch {}
  try {
    if (debris && document.body) document.body.appendChild(debris);
  } catch {}
  try {
    playShatter();
  } catch {}
  try {
    if (regenTimer) {
      try {
        clearTimeout(regenTimer);
      } catch {}
      regenTimer = null;
    }
  } catch {}
  try {
    regenTimer = setTimeout(() => {
      try {
        healCursor();
      } catch {}
    }, REGEN_MS);
  } catch {}
}

function healCursor() {
  try {
    if (regenTimer) {
      try {
        clearTimeout(regenTimer);
      } catch {}
    }
  } catch {}
  try {
    regenTimer = null;
  } catch {}
  try {
    if (blocker) blocker.remove();
  } catch {}
  try {
    blocker = null;
  } catch {}
  try {
    if (debris) debris.remove();
  } catch {}
  try {
    debris = null;
  } catch {}
  try {
    document.documentElement.classList.remove("stk-cursor-dead");
  } catch {}
  try {
    destroyed = false;
  } catch {}
  try {
    hitTimes = [];
  } catch {}
  try {
    playRebuild();
  } catch {}
}

export function isCursorDestroyed() {
  return destroyed;
}

export function registerCursorHit(x, y) {
  try {
    if (destroyed) return false;
  } catch {
    return false;
  }
  try {
    const now = Date.now();
    try {
      hitTimes = hitTimes.filter((t) => now - t <= HIT_WINDOW_MS);
    } catch {}
    let surface = false;
    try {
      surface = isImageSurfaceAt(x, y);
    } catch {
      return false;
    }
    if (!surface) return false;
    try {
      hitTimes.push(Date.now());
    } catch {}
    try {
      if (hitTimes.length >= HITS_TO_KILL) {
        try {
          destroyCursor(x, y);
        } catch {}
        return true;
      }
    } catch {}
    return false;
  } catch {
    return false;
  }
}

export function cleanupCursorKill() {
  try {
    if (regenTimer) {
      try {
        clearTimeout(regenTimer);
      } catch {}
    }
  } catch {}
  try {
    regenTimer = null;
  } catch {}
  try {
    if (blocker) blocker.remove();
  } catch {}
  try {
    blocker = null;
  } catch {}
  try {
    if (debris) debris.remove();
  } catch {}
  try {
    debris = null;
  } catch {}
  try {
    document.documentElement.classList.remove("stk-cursor-dead");
  } catch {}
  try {
    destroyed = false;
  } catch {}
  try {
    hitTimes = [];
  } catch {}
}
