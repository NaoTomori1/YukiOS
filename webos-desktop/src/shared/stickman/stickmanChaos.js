import "../../styles/stickmanChaos.css";
import {
  $,
  $$,
  createElement,
  bindEvent,
  os,
  StorageKeys,
} from "../../framework.js";
import { createStickmanActor } from "./stickmanActor.js";
import { createFoeSystem } from "./stickmanFoe.js";
import {
  playShoot,
  playHit,
  playShatter,
  playRebuild,
  playGrab,
} from "../chaosSfx.js";
import {
  registerCursorHit,
  cleanupCursorKill,
  isCursorDestroyed,
} from "./stickmanCursorKill.js";
import { createWeaponSystem, createAmmoRack } from "./stickmanWeapons.js";
import { createSpearSystem } from "./stickmanMelee.js";
import { resetLaserSfx } from "./stickmanLaser.js";
import {
  createAirWarp,
  AIR_WARP_LEAD_MS,
  AIR_WARP_RADIUS,
} from "./stickmanAirWarp.js";
import {
  setRageWallpaper,
  clearRageWallpaper,
  restoreWallpaper,
} from "./stickmanWallpaper.js";
import { resetRealityRift } from "./stickmanRift.js";
import {
  fxRing,
  fxDust,
  screenShake,
  resetScreenShake,
  fxStreak,
  fxBlob,
  fxNinjaSmoke,
  fxSubstitutionLog,
} from "./stickmanFx.js";
import {
  captureCage,
  updateCage,
  cleanupCage,
  getCageRect,
  isCaged,
  onCageBreak,
  nudgeCage,
  getSelectedShards,
  setShardSelected,
  clearShardSelection,
} from "./stickmanCage.js";
import { cleanupTussle } from "./stickmanTussle.js";
import {
  getRegistryTargets,
  getRegistryTargetEntries,
  initTargetRegistry,
} from "./stickmanTargetRegistry.js";
import {
  createControlsGuide,
  createPlayerHud,
  createPlayerInput,
  createRivalHint,
} from "./stickmanPlayerUi.js";

let layer = null;
const MELEE_SLACK = 46;
const BODY_SEPARATION = 30;

let actorRef = null;

function syncFoeHud() {
  try {
    if (!playerHud || typeof playerHud.setFoeRank !== "function") return;
    const alive = !!(foeSys && foeSys.isAlive());
    playerHud.setFoeRank(alive ? foeSys.getProfile() : null);
  } catch {}
}
let foeSys = null;
let weapons = null;
let spearSys = null;
let airWarp = null;
let warpReleaseTimer = null;
let active = false;
let frameId = null;
let lastTime = 0;
let cursorX = -9999;
let cursorY = -9999;
let cursorPin = null;
let cursorKickX = 0;
let cursorKickY = 0;
let cursorSeen = false;
let mouseHandler = null;
let impactX = 0;
let impactY = 0;
let bullets = [];
let sparks = [];
let hpMap = new Map();
let shattered = new Map();
let hitTimers = new Map();
let shatterOverlays = new Map();
let shatterOverlayIndex = new Map();
let husks = new Map();
let liveShardTotal = 0;
let debris = [];
let rebuildDock = null;
let dragEntry = null;
let dragGroup = [];
let dragOffsetX = 0;
let dragOffsetY = 0;
let dragSamples = [];
let dragMoveHandler = null;
let dragUpHandler = null;
let physicsHitHandler = null;
let controlMode = "ai";
let playerInput = null;
let playerRack = null;
let playerGuide = null;
let playerHud = null;
let playerHint = null;
const controlListeners = new Set();

function releaseDragGroup() {
  try {
    for (let i = 0; i < dragGroup.length; i++) {
      try {
        const item = dragGroup[i];
        const target = item && item.entry ? item.entry : item;
        if (target) {
          target.held = false;
          target.settled = false;
        }
      } catch {}
    }
  } catch {}
  try {
    dragGroup = [];
  } catch {}
}

function purgeDragEntry(target) {
  try {
    if (!target) return;
    dragGroup = dragGroup.filter((item) => {
      try {
        const current = item && item.entry ? item.entry : item;
        return current && current !== target;
      } catch {
        return false;
      }
    });
    if (dragEntry === target) {
      try {
        const next = dragGroup.length > 0 ? dragGroup[0] : null;
        dragEntry = next && next.entry ? next.entry : next;
      } catch {
        dragEntry = null;
      }
      if (!dragEntry) {
        try {
          dragSamples = [];
        } catch {}
      }
    }
  } catch {}
}

function isVisible(el) {
  try {
    if (el.getClientRects().length === 0) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  } catch {
    return false;
  }
}

const FLOOR_CACHE_MS = 250;
let floorCacheValue = null;
let floorCacheAt = 0;
let floorCacheHeight = 0;
let floorResizeHandler = null;

function measureFloor() {
  try {
    const bar = $("#taskbar");
    if (!bar || !isVisible(bar)) return window.innerHeight;
    const rect = bar.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return window.innerHeight;
    return Math.max(0, window.innerHeight - rect.height);
  } catch {
    return window.innerHeight;
  }
}

function invalidateFloorCache() {
  floorCacheValue = null;
  floorCacheAt = 0;
  floorCacheHeight = 0;
}

function getFloor() {
  try {
    const height = window.innerHeight;
    const now = nowMs();
    if (
      floorCacheValue !== null &&
      floorCacheHeight === height &&
      now - floorCacheAt < FLOOR_CACHE_MS
    )
      return floorCacheValue;
    const value = measureFloor();
    floorCacheValue = value;
    floorCacheAt = now;
    floorCacheHeight = height;
    return value;
  } catch {
    return window.innerHeight;
  }
}

function isMenuOpen(menu) {
  try {
    if (!menu || !isVisible(menu)) return false;
    if (menu.style.display !== "flex") return false;
    const rect = menu.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  } catch {
    return false;
  }
}

function pinCursor(x, y, ms) {
  if (!cursorDamageAllowed()) return;
  cursorPin = { x: x, y: y, until: performance.now() + (ms || 2000) };
  cursorKickX = 0;
  cursorKickY = 0;
  cursorX = x;
  cursorY = y;
}

function launchCursor(fx, fy) {
  if (!cursorDamageAllowed()) return;
  cursorKickX += fx;
  cursorKickY += fy;
  if (cursorPin) cursorPin = null;
}

function updateCursorPhysics(dtSec) {
  const now = performance.now();
  if (cursorPin) {
    if (now >= cursorPin.until) cursorPin = null;
    else {
      cursorX = cursorPin.x;
      cursorY = cursorPin.y;
      cursorKickX = 0;
      cursorKickY = 0;
    }
  }
  if (cursorKickX || cursorKickY) {
    cursorX += cursorKickX * dtSec;
    cursorY += cursorKickY * dtSec;
    cursorKickX *= 0.86;
    cursorKickY *= 0.86;
    if (Math.abs(cursorKickX) < 0.02) cursorKickX = 0;
    if (Math.abs(cursorKickY) < 0.02) cursorKickY = 0;
    if (cursorX < 2) {
      cursorX = 2;
      cursorKickX = Math.abs(cursorKickX) * 0.5;
    }
    if (cursorX > window.innerWidth - 2) {
      cursorX = window.innerWidth - 2;
      cursorKickX = -Math.abs(cursorKickX) * 0.5;
    }
    if (cursorY < 2) {
      cursorY = 2;
      cursorKickY = Math.abs(cursorKickY) * 0.5;
    }
    if (cursorY > window.innerHeight - 2) {
      cursorY = window.innerHeight - 2;
      cursorKickY = -Math.abs(cursorKickY) * 0.5;
    }
  }
}

function onMouseMove(e) {
  try {
    if (cursorPin) return;
    cursorX = e.clientX;
    cursorY = e.clientY;
    cursorSeen = true;
  } catch {}
}

function getTargetHp(el) {
  try {
    if (!el) return 5;
    if (el.id === "start-menu") return 3;
    if (el.classList && el.classList.contains("icon")) return 1;
    try {
      if (el.closest && el.closest("#taskbar")) return 1;
    } catch {}
    return 4;
  } catch {
    return 5;
  }
}

function syncDesktopBottom() {
  try {
    let bar = null;
    try {
      bar = $("#taskbar");
    } catch {}
    let gone = false;
    try {
      gone = bar ? shattered.has(bar) : false;
    } catch {}
    try {
      const desks = $$(".desktop");
      for (let i = 0; i < desks.length; i++) {
        try {
          const target = desks[i];
          if (!target) continue;
          try {
            target.classList.toggle("stk-no-taskbar", gone);
          } catch {}
        } catch {}
      }
    } catch {}
  } catch {}
}

function ensureRebuildDock() {
  try {
    if (rebuildDock && layer && rebuildDock.parentNode === layer)
      return rebuildDock;
  } catch {}
  try {
    if (!layer) return null;
    rebuildDock = createElement("div", { className: "stk-rebuild-dock" });
    try {
      rebuildDock.style.display = "none";
    } catch {}
    try {
      layer.appendChild(rebuildDock);
    } catch {}
    return rebuildDock;
  } catch {
    return null;
  }
}

function renderDock() {
  try {
    if (!rebuildDock) return;
    try {
      rebuildDock.innerHTML = "";
    } catch {}
    try {
      if (shattered.size === 0) {
        try {
          rebuildDock.style.display = "none";
        } catch {}
        return;
      }
    } catch {}
    try {
      rebuildDock.style.removeProperty("display");
    } catch {}
    try {
      const allBtn = createElement("button", { className: "stk-rebuild-all" });
      try {
        allBtn.innerHTML =
          '<i class="fas fa-hammer"></i><span>Rebuild desktop</span><span class="stk-rebuild-count">' +
          shattered.size +
          "</span>";
      } catch {}
      try {
        bindEvent(allBtn, "click", () => {
          try {
            try {
              playRebuild();
            } catch {}
            const targets = Array.from(shattered.keys());
            for (let j = 0; j < targets.length; j++) {
              try {
                restoreElement(targets[j]);
              } catch {}
            }
          } catch {}
        });
      } catch {}
      try {
        rebuildDock.appendChild(allBtn);
      } catch {}
    } catch {}
  } catch {}
}

function getLiveTargets() {
  try {
    return getRegistryTargets();
  } catch {
    return [];
  }
}

const LIVE_TARGET_CACHE_MS = 100;
let liveTargetsCache = null;
let liveTargetsCacheAt = 0;

function nowMs() {
  try {
    if (typeof performance !== "undefined" && performance.now)
      return performance.now();
  } catch {}
  try {
    return Date.now();
  } catch {}
  return 0;
}

function getLiveTargetEntries() {
  const now = nowMs();
  if (liveTargetsCache && now - liveTargetsCacheAt < LIVE_TARGET_CACHE_MS)
    return liveTargetsCache;
  let entries = [];
  try {
    entries = getRegistryTargetEntries();
  } catch {
    entries = [];
  }
  const targets = [];
  for (let i = 0; i < entries.length; i++) {
    try {
      targets.push(entries[i].el);
    } catch {}
  }
  liveTargetsCache = { targets: targets, entries: entries };
  liveTargetsCacheAt = now;
  return liveTargetsCache;
}

function getLiveTargetsCached() {
  try {
    return getLiveTargetEntries().targets;
  } catch {
    return [];
  }
}

function spawnSparks(x, y, count) {
  try {
    if (!layer) return;
    const total = Math.max(0, Math.min(count, 200));
    for (let i = 0; i < total; i++) {
      try {
        if (sparks.length >= 100) break;
        const el = createElement("div", { className: "stk-spark" });
        el.style.left = "0px";
        el.style.top = "0px";
        el.style.translate = x + "px " + y + "px";
        layer.appendChild(el);
        sparks.push({
          el: el,
          x: x,
          y: y,
          vx: Math.random() * 8 - 4,
          vy: Math.random() * -5 - 1,
          age: 0,
        });
      } catch {}
    }
  } catch {}
}

function removeShatterOverlay(el) {
  try {
    if (!shatterOverlays.has(el)) return;
    let record = null;
    try {
      record = shatterOverlays.get(el);
    } catch {
      return;
    }
    try {
      shatterOverlays.delete(el);
    } catch {}
    try {
      const overlay = record ? record.overlay : null;
      if (overlay) {
        try {
          shatterOverlayIndex.delete(overlay);
        } catch {}
        try {
          for (let i = debris.length - 1; i >= 0; i--) {
            try {
              const entry = debris[i];
              if (entry && entry.overlay === overlay) {
                try {
                  purgeDragEntry(entry);
                } catch {}
                try {
                  entry.node.remove();
                } catch {}
                debris.splice(i, 1);
              }
            } catch {}
          }
        } catch {}
        try {
          overlay.remove();
        } catch {}
      }
      try {
        liveShardTotal = debris.length;
      } catch {}
    } catch {}
  } catch {}
}

function freeSettledSpace(need) {
  try {
    while (debris.length + need > 120) {
      let found = -1;
      for (let i = 0; i < debris.length; i++) {
        try {
          if (debris[i] && debris[i].settled) {
            found = i;
            break;
          }
        } catch {}
      }
      if (found < 0) return false;
      try {
        const victim = debris[found];
        try {
          if (victim && victim.node) victim.node.remove();
        } catch {}
        try {
          debris.splice(found, 1);
        } catch {}
        try {
          purgeDragEntry(victim);
        } catch {}
        try {
          liveShardTotal = debris.length;
        } catch {}
        try {
          const rec =
            victim && victim.overlay
              ? shatterOverlayIndex.get(victim.overlay)
              : null;
          if (rec) {
            try {
              rec.count = Math.max(0, rec.count - 1);
            } catch {}
          }
        } catch {}
      } catch {}
    }
    return true;
  } catch {
    return false;
  }
}

function collideShardWithCage(s, cageRect) {
  try {
    if (!s || !cageRect) return false;
    const sx = s.baseX + s.x;
    const sy = s.baseY + s.y;
    if (
      sx >= cageRect.left + cageRect.width ||
      sx + s.w <= cageRect.left ||
      sy >= cageRect.top + cageRect.height ||
      sy + s.h <= cageRect.top
    )
      return false;
    const fromTop = sy + s.h - cageRect.top;
    const fromBottom = cageRect.top + cageRect.height - sy;
    const fromLeft = sx + s.w - cageRect.left;
    const fromRight = cageRect.left + cageRect.width - sx;
    const m = Math.min(fromTop, fromBottom, fromLeft, fromRight);
    if (m === fromTop) {
      s.y = cageRect.top - s.baseY - s.h;
      if (s.vy > 0) {
        s.vy = s.vy * -0.35;
        s.vx = s.vx * 0.7;
        s.spin = s.spin * 0.5;
        if (
          Math.abs(s.vy) < 1 &&
          Math.abs(s.vx) < 0.8 &&
          Math.abs(s.spin) < 0.8
        ) {
          s.vy = 0;
          s.vx = 0;
          s.spin = 0;
          s.settled = true;
          s.restOn = "cage";
        } else {
          s.settled = false;
          s.restOn = null;
        }
      } else if (!s.settled) {
        s.restOn = null;
      }
    } else if (m === fromBottom) {
      s.y = cageRect.top + cageRect.height - s.baseY;
      if (s.vy < 0) s.vy = s.vy * -0.4;
      s.settled = false;
      s.restOn = null;
    } else if (m === fromLeft) {
      s.x = cageRect.left - s.baseX - s.w;
      s.vx = -Math.abs(s.vx) * 0.6 - 1;
      s.settled = false;
      s.restOn = null;
    } else {
      s.x = cageRect.left + cageRect.width - s.baseX;
      s.vx = Math.abs(s.vx) * 0.6 + 1;
      s.settled = false;
      s.restOn = null;
    }
    return true;
  } catch {
    return false;
  }
}

const SHARD_FADE_AFTER = 9000;
const SHARD_FADE_DUR = 1500;

function updateDebris(dt) {
  try {
    if (debris.length === 0) return;
    let floor = window.innerHeight;
    try {
      floor = getFloor();
    } catch {}
    const right = window.innerWidth;
    let cageRect = null;
    try {
      cageRect = getCageRect();
    } catch {}
    for (let i = 0; i < debris.length; i++) {
      try {
        const s = debris[i];
        if (!s) continue;
        if (s.held) continue;
        if (s.settled) {
          try {
            if (cageRect && s.restOn === "cage") {
              const supY = s.baseY + s.y;
              const supX = s.baseX + s.x;
              const supported =
                supX + s.w > cageRect.left &&
                supX < cageRect.left + cageRect.width &&
                Math.abs(supY + s.h - cageRect.top) < 4;
              if (!supported) {
                s.settled = false;
                s.restOn = null;
              }
            }
            if (s.settled && cageRect) collideShardWithCage(s, cageRect);
            if (s.settled) {
              let nowMs = 0;
              try {
                nowMs = performance.now();
              } catch {}
              if (!s.settledAt) {
                try {
                  s.settledAt = nowMs;
                } catch {}
              }
              const age = nowMs - (s.settledAt || nowMs);
              if (age > SHARD_FADE_AFTER) {
                const k = (age - SHARD_FADE_AFTER) / SHARD_FADE_DUR;
                if (k >= 1) {
                  try {
                    s.node.remove();
                  } catch {}
                  debris.splice(i, 1);
                  i--;
                  try {
                    liveShardTotal = debris.length;
                  } catch {}
                  try {
                    const rec = s.overlay
                      ? shatterOverlayIndex.get(s.overlay)
                      : null;
                    if (rec) {
                      rec.count = Math.max(0, rec.count - 1);
                    }
                  } catch {}
                } else {
                  try {
                    s.node.style.opacity = String(1 - k);
                  } catch {}
                }
              }
            }
          } catch {}
          continue;
        }
        try {
          s.settledAt = 0;
        } catch {}
        try {
          if (s.node) s.node.style.opacity = "";
        } catch {}
        s.vy += 0.5 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.angle += s.spin * dt;
        let screenY = s.baseY + s.y;
        if (screenY + s.h >= floor) {
          s.y = floor - s.baseY - s.h;
          s.vy = s.vy * -0.35;
          s.vx = s.vx * 0.7;
          s.spin = s.spin * 0.5;
          if (
            Math.abs(s.vy) < 1 &&
            Math.abs(s.vx) < 0.8 &&
            Math.abs(s.spin) < 0.8
          ) {
            s.vy = 0;
            s.vx = 0;
            s.spin = 0;
            s.settled = true;
            s.restOn = "floor";
          } else {
            s.restOn = null;
          }
        }
        let screenX = s.baseX + s.x;
        if (screenX <= 0) {
          s.x = 0 - s.baseX;
          s.vx = Math.abs(s.vx) * 0.6;
          s.spin = s.spin * 0.8;
        } else if (screenX + s.w >= right) {
          s.x = right - s.baseX - s.w;
          s.vx = Math.abs(s.vx) * -0.6;
          s.spin = s.spin * 0.8;
        }
        try {
          if (cageRect) collideShardWithCage(s, cageRect);
        } catch {}
        try {
          s.node.style.translate = s.x + "px " + s.y + "px";
          s.node.style.transform = "rotate(" + s.angle.toFixed(2) + "deg)";
        } catch {}
      } catch {}
    }
  } catch {}
}

function onDragMove(e) {
  try {
    if (!dragEntry) return;
    let px = 0;
    let py = 0;
    try {
      px = e.clientX;
      py = e.clientY;
    } catch {
      return;
    }
    let now = 0;
    try {
      now = Date.now();
    } catch {
      try {
        now = dragSamples.length;
      } catch {}
    }
    try {
      dragSamples.push({ x: px, y: py, t: now });
      while (dragSamples.length > 8) {
        try {
          dragSamples.shift();
        } catch {
          break;
        }
      }
    } catch {}
    try {
      const group = dragGroup.length > 0 ? dragGroup : null;
      if (group) {
        for (let i = 0; i < group.length; i++) {
          try {
            const item = group[i];
            const target = item && item.entry ? item.entry : null;
            if (!target) continue;
            const ox =
              item && typeof item.ox === "number" ? item.ox : dragOffsetX;
            const oy =
              item && typeof item.oy === "number" ? item.oy : dragOffsetY;
            target.x = px + ox - target.baseX;
            target.y = py + oy - target.baseY;
            target.vx = 0;
            target.vy = 0;
          } catch {}
        }
        for (let i = 0; i < group.length; i++) {
          try {
            const item = group[i];
            const target = item && item.entry ? item.entry : null;
            if (!target || !target.node) continue;
            target.node.style.translate = target.x + "px " + target.y + "px";
          } catch {}
        }
      } else {
        dragEntry.x = px + dragOffsetX - dragEntry.baseX;
        dragEntry.y = py + dragOffsetY - dragEntry.baseY;
        dragEntry.vx = 0;
        dragEntry.vy = 0;
      }
    } catch {}
    try {
      if (!dragGroup || dragGroup.length === 0) {
        dragEntry.node.style.translate =
          dragEntry.x + "px " + dragEntry.y + "px";
      }
    } catch {}
    try {
      if (e.preventDefault) e.preventDefault();
    } catch {}
  } catch {}
}

function onDragUp(e) {
  try {
    if (!dragEntry) {
      try {
        dragSamples = [];
      } catch {}
      return;
    }
    let entry = null;
    try {
      entry = dragEntry;
    } catch {}
    let vx = 0;
    let vy = 0;
    try {
      if (dragSamples.length >= 2) {
        let first = dragSamples[0];
        let last = dragSamples[dragSamples.length - 1];
        try {
          const cutoff = last.t - 120;
          for (let i = 0; i < dragSamples.length; i++) {
            try {
              if (dragSamples[i].t >= cutoff) {
                first = dragSamples[i];
                break;
              }
            } catch {}
          }
        } catch {}
        let dx = 0;
        let dy = 0;
        let dt = 0;
        try {
          dx = last.x - first.x;
        } catch {}
        try {
          dy = last.y - first.y;
        } catch {}
        try {
          dt = last.t - first.t;
        } catch {}
        if (dt > 0) {
          try {
            vx = (dx / dt) * 16.667;
          } catch {}
          try {
            vy = (dy / dt) * 16.667;
          } catch {}
        }
      }
    } catch {}
    try {
      if (vx > 20) vx = 20;
    } catch {}
    try {
      if (vx < -20) vx = -20;
    } catch {}
    try {
      if (vy > 20) vy = 20;
    } catch {}
    try {
      if (vy < -20) vy = -20;
    } catch {}
    try {
      if (entry) {
        entry.vx = vx;
        entry.vy = vy;
        entry.held = false;
        entry.settled = false;
      }
    } catch {}
    try {
      for (let i = 0; i < dragGroup.length; i++) {
        try {
          const item = dragGroup[i];
          const target = item && item.entry ? item.entry : null;
          if (!target || target === entry) continue;
          target.vx = vx;
          target.vy = vy;
          target.held = false;
          target.settled = false;
        } catch {}
      }
    } catch {}
    try {
      dragGroup = [];
    } catch {}
    try {
      dragEntry = null;
    } catch {}
    try {
      dragSamples = [];
    } catch {}
  } catch {}
}

function collectHiddenPaths(src, path, out) {
  try {
    if (!src) return;
    let hidden = false;
    let invisible = false;
    try {
      const style = window.getComputedStyle(src);
      hidden = style.display === "none";
      invisible = !hidden && style.visibility === "hidden";
    } catch {}
    if (hidden) {
      out.push({ path: path.slice(), mode: "none" });
      return;
    }
    if (invisible) {
      out.push({ path: path.slice(), mode: "visibility" });
    }
    const children = src.children;
    for (let i = 0; i < children.length; i++) {
      path.push(i);
      collectHiddenPaths(children[i], path, out);
      path.pop();
    }
  } catch {}
}

function applyHiddenPaths(clone, records) {
  try {
    if (!clone || !records || !records.length) return;
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        const steps = record.path;
        let node = clone;
        let valid = true;
        for (let j = 0; j < steps.length; j++) {
          if (!node || !node.children || steps[j] >= node.children.length) {
            valid = false;
            break;
          }
          node = node.children[steps[j]];
        }
        if (!valid || !node) continue;
        if (record.mode === "none") {
          try {
            node.style.display = "none";
          } catch {}
        } else {
          try {
            node.style.visibility = "hidden";
          } catch {}
        }
      } catch {}
    }
  } catch {}
}

function createHusk(el, rect) {
  try {
    if (!el || !layer || !rect) return;
    try {
      removeHusk(el);
    } catch {}
    const husk = createElement("div", { className: "stk-husk" });
    husk.style.left = rect.left + "px";
    husk.style.top = rect.top + "px";
    husk.style.width = rect.width + "px";
    husk.style.height = rect.height + "px";
    bindEvent(husk, "click", () => {
      try {
        restoreElement(el);
      } catch {}
    });
    layer.appendChild(husk);
    husks.set(el, husk);
  } catch {}
}

function removeHusk(el) {
  try {
    if (!husks.has(el)) return;
    const husk = husks.get(el);
    husks.delete(el);
    if (husk) husk.remove();
  } catch {}
}

function shatterElement(el, hitX, hitY) {
  try {
    if (!el || !layer) return false;
    let rect = null;
    try {
      rect = el.getBoundingClientRect();
    } catch {
      return false;
    }
    if (!rect || rect.width <= 0 || rect.height <= 0) return false;
    let cols = 2;
    let rows = 1;
    try {
      cols = Math.max(2, Math.min(3, Math.round(rect.width / 300)));
      rows = Math.max(1, Math.min(2, Math.round(rect.height / 300)));
      let guard = 0;
      while (cols * rows > 6 && guard < 10) {
        if (cols > 2 && cols >= rows) cols = cols - 1;
        else if (rows > 1) rows = rows - 1;
        else break;
        guard = guard + 1;
      }
    } catch {}
    const total = cols * rows;
    try {
      if (liveShardTotal + total > 120 || liveShardTotal >= 120) {
        let freed = false;
        try {
          freed = freeSettledSpace(total);
        } catch {}
        if (!freed || liveShardTotal + total > 120) {
          try {
            el.classList.add("stk-shatter-hidden");
          } catch {}
          try {
            shattered.set(el, {});
          } catch {}
          try {
            if (el.id === "start-menu") createHusk(el, rect);
          } catch {}
          try {
            ensureRebuildDock();
          } catch {}
          try {
            renderDock();
          } catch {}
          return false;
        }
      }
    } catch {}
    let overlay = null;
    try {
      overlay = createElement("div", { className: "stk-shatter" });
    } catch {
      return false;
    }
    try {
      overlay.style.position = "fixed";
      overlay.style.left = rect.left + "px";
      overlay.style.top = rect.top + "px";
      overlay.style.width = rect.width + "px";
      overlay.style.height = rect.height + "px";
      overlay.style.pointerEvents = "none";
    } catch {}
    try {
      layer.appendChild(overlay);
    } catch {
      return false;
    }
    const shards = [];
    const hiddenRecords = [];
    try {
      collectHiddenPaths(el, [], hiddenRecords);
    } catch {}
    try {
      const tileWBase = rect.width / cols;
      const tileHBase = rect.height / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          try {
            const tileX = c * tileWBase;
            const tileY = r * tileHBase;
            const tileW = c === cols - 1 ? rect.width - tileX : tileWBase;
            const tileH = r === rows - 1 ? rect.height - tileY : tileHBase;
            const wrapper = createElement("div", { className: "stk-shard" });
            wrapper.style.position = "absolute";
            wrapper.style.left = "0px";
            wrapper.style.top = "0px";
            wrapper.style.translate = tileX + "px " + tileY + "px";
            wrapper.style.width = tileW + "px";
            wrapper.style.height = tileH + "px";
            wrapper.style.overflow = "hidden";
            const inner = createElement("div", {
              className: "stk-shard-inner",
            });
            inner.style.position = "absolute";
            inner.style.width = rect.width + "px";
            inner.style.height = rect.height + "px";
            inner.style.left = 0 - tileX + "px";
            inner.style.top = 0 - tileY + "px";
            let clone = null;
            try {
              clone = el.cloneNode(true);
            } catch {
              continue;
            }
            try {
              if (clone.removeAttribute) clone.removeAttribute("id");
            } catch {}
            try {
              if (clone.querySelectorAll) {
                const ids = clone.querySelectorAll("[id]");
                for (let k = 0; k < ids.length; k++) {
                  try {
                    ids[k].removeAttribute("id");
                  } catch {}
                }
              }
            } catch {}
            try {
              applyHiddenPaths(clone, hiddenRecords);
            } catch {}
            try {
              clone.classList.remove("stk-shatter-hidden");
              clone.classList.remove("stk-hit");
            } catch {}
            try {
              clone.style.position = "absolute";
              clone.style.left = "0px";
              clone.style.top = "0px";
              clone.style.width = rect.width + "px";
              clone.style.height = rect.height + "px";
              clone.style.margin = "0px";
            } catch {}
            try {
              inner.appendChild(clone);
            } catch {}
            try {
              wrapper.appendChild(inner);
            } catch {}
            try {
              overlay.appendChild(wrapper);
            } catch {}
            shards.push({
              wrapper: wrapper,
              tileX: tileX,
              tileY: tileY,
              tileW: tileW,
              tileH: tileH,
            });
          } catch {}
        }
      }
    } catch {}
    try {
      el.classList.add("stk-shatter-hidden");
    } catch {}
    try {
      shattered.set(el, {});
    } catch {}
    try {
      ensureRebuildDock();
    } catch {}
    try {
      renderDock();
    } catch {}
    try {
      liveShardTotal = liveShardTotal + shards.length;
    } catch {}
    try {
      const shatterRecord = { overlay: overlay, count: shards.length };
      shatterOverlays.set(el, shatterRecord);
      shatterOverlayIndex.set(overlay, shatterRecord);
    } catch {}
    try {
      if (el.id === "start-menu") createHusk(el, rect);
    } catch {}
    try {
      for (let i = 0; i < shards.length; i++) {
        try {
          const info = shards[i];
          const centerX = rect.left + info.tileX + info.tileW / 2;
          const centerY = rect.top + info.tileY + info.tileH / 2;
          const ox = centerX - hitX;
          const oy = centerY - hitY;
          const mag = Math.max(1, Math.sqrt(ox * ox + oy * oy));
          const ux = ox / mag;
          const uy = oy / mag;
          const speed = 3 + Math.random() * 5;
          const entry = {
            node: info.wrapper,
            overlay: overlay,
            source: el,
            baseX: rect.left,
            baseY: rect.top,
            x: info.tileX,
            y: info.tileY,
            vx: ux * speed,
            vy: uy * speed - (2 + Math.random() * 5),
            angle: 0,
            spin: Math.random() * 12 - 6,
            w: info.tileW,
            h: info.tileH,
            settled: false,
            held: false,
            stainCount: 0,
            lastStainAt: 0,
          };
          try {
            entry.node.style.transform = "rotate(0deg)";
          } catch {}
          try {
            bindEvent(entry.node, "pointerdown", (ev) => {
              try {
                let px = 0;
                let py = 0;
                try {
                  px = ev.clientX;
                  py = ev.clientY;
                } catch {
                  return;
                }
                try {
                  releaseDragGroup();
                } catch {}
                try {
                  let group = [entry];
                  try {
                    const nodes = getSelectedShards();
                    if (
                      nodes.length > 1 &&
                      entry.node &&
                      entry.node.classList.contains("stk-selected")
                    ) {
                      const picked = [];
                      for (let i = 0; i < debris.length; i++) {
                        try {
                          if (nodes.indexOf(debris[i].node) !== -1)
                            picked.push(debris[i]);
                        } catch {}
                      }
                      if (picked.length > 1) group = picked;
                    } else {
                      try {
                        clearShardSelection();
                      } catch {}
                      try {
                        setShardSelected(entry.node, true);
                      } catch {}
                    }
                  } catch {}
                  dragGroup = [];
                  for (let i = 0; i < group.length; i++) {
                    try {
                      const target = group[i];
                      if (!target) continue;
                      target.held = true;
                      target.settled = false;
                      target.vx = 0;
                      target.vy = 0;
                      dragGroup.push({
                        entry: target,
                        ox: target.baseX + target.x - px,
                        oy: target.baseY + target.y - py,
                      });
                    } catch {}
                  }
                } catch {}
                try {
                  dragOffsetX = entry.baseX + entry.x - px;
                } catch {}
                try {
                  dragOffsetY = entry.baseY + entry.y - py;
                } catch {}
                try {
                  dragEntry = entry;
                } catch {}
                try {
                  entry.hitActor = false;
                } catch {}
                let stamp = 0;
                try {
                  stamp = Date.now();
                } catch {
                  try {
                    stamp = dragSamples.length;
                  } catch {}
                }
                try {
                  dragSamples = [{ x: px, y: py, t: stamp }];
                } catch {}
                try {
                  playGrab();
                } catch {}
                try {
                  if (ev.preventDefault) ev.preventDefault();
                } catch {}
              } catch {}
            });
          } catch {}
          debris.push(entry);
        } catch {}
      }
      try {
        liveShardTotal = debris.length;
      } catch {}
    } catch {}
    try {
      playShatter();
    } catch {}
    try {
      syncDesktopBottom();
    } catch {}
    return true;
  } catch {
    return false;
  }
}

function restoreElement(el) {
  try {
    if (hitTimers.has(el)) {
      clearTimeout(hitTimers.get(el));
      hitTimers.delete(el);
    }
  } catch {}
  try {
    removeHusk(el);
  } catch {}
  try {
    removeShatterOverlay(el);
  } catch {}
  try {
    el.classList.remove("stk-hit");
    el.classList.remove("stk-shatter-hidden");
  } catch {}
  try {
    const burns = el.querySelectorAll(".stk-burn-blob, .stk-stain, .stk-stuck");
    for (let i = 0; i < burns.length; i++) {
      try {
        burns[i].remove();
      } catch {}
    }
  } catch {}
  try {
    hpMap.delete(el);
  } catch {}
  try {
    shattered.delete(el);
  } catch {}
  try {
    renderDock();
  } catch {}
  try {
    syncDesktopBottom();
  } catch {}
}

export function onPhysicsHit(fn) {
  try {
    physicsHitHandler = typeof fn === "function" ? fn : null;
  } catch {}
}
function notifyPhysicsHit(node) {
  try {
    if (physicsHitHandler && node) physicsHitHandler(node, impactX, impactY);
  } catch {}
}
function damageTarget(el) {
  try {
    if (!el) return;
    if (shattered.has(el)) return;
    try {
      notifyPhysicsHit(el);
    } catch {}
    const base = getTargetHp(el);
    const current = hpMap.has(el) ? hpMap.get(el) : base;
    spawnSparks(impactX, impactY, 6);
    try {
      el.classList.add("stk-hit");
    } catch {}
    try {
      if (hitTimers.has(el)) clearTimeout(hitTimers.get(el));
    } catch {}
    try {
      const timer = setTimeout(() => {
        try {
          el.classList.remove("stk-hit");
        } catch {}
        try {
          hitTimers.delete(el);
        } catch {}
      }, 300);
      hitTimers.set(el, timer);
    } catch {}
    const next = current - 1;
    if (next <= 0) {
      try {
        hpMap.set(el, 0);
      } catch {}
      try {
        shatterElement(el, impactX, impactY);
      } catch {}
      try {
        const rect = el.getBoundingClientRect();
        for (let i = 0; i < 16; i++) {
          try {
            const rx = rect.left + Math.random() * Math.max(1, rect.width);
            const ry = rect.top + Math.random() * Math.max(1, rect.height);
            spawnSparks(rx, ry, 1);
          } catch {}
        }
      } catch {}
      return;
    }
    try {
      hpMap.set(el, next);
    } catch {}
    try {
      playHit();
    } catch {}
  } catch {}
}

function findTargetAt(x, y, radius) {
  const reach = Number.isFinite(radius) ? radius : 0;
  try {
    const desk = $$("#taskbar .taskbar-item, #system-tray > *");
    for (let t = 0; t < desk.length; t++) {
      try {
        const node = desk[t];
        if (!node || !node.isConnected) continue;
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        if (
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom
        )
          return node;
      } catch {}
    }
  } catch {}
  let targets = [];
  try {
    targets = Array.from(getLiveTargets());
  } catch {}
  for (let t = 0; t < targets.length; t++) {
    try {
      const rect = targets[t].getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      )
        return targets[t];
    } catch {}
  }
  if (reach <= 0) return null;
  let best = null;
  let bestDist = reach;
  for (let t = 0; t < targets.length; t++) {
    try {
      const rect = targets[t].getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      const d = Math.hypot(
        rect.left + rect.width / 2 - x,
        rect.top + rect.height / 2 - y,
      );
      if (d < bestDist) {
        bestDist = d;
        best = targets[t];
      }
    } catch {}
  }
  return best;
}

function laserStrikeAt(tx, ty) {
  try {
    playShoot();
  } catch {}
  const hit = findTargetAt(tx, ty, 90);
  if (!hit) {
    try {
      spawnSparks(tx, ty, 6);
    } catch {}
    return;
  }
  try {
    const rect = hit.getBoundingClientRect();
    impactX = Math.min(Math.max(tx, rect.left), rect.right);
    impactY = Math.min(Math.max(ty, rect.top), rect.bottom);
  } catch {}
  try {
    damageTarget(hit);
  } catch {}
  try {
    plantBurn(hit, impactX, impactY);
  } catch {}
  try {
    spawnSparks(tx, ty, 10);
  } catch {}
}

function getWeaponTargets() {
  const list = getLiveTargetsCached().slice();
  try {
    const bar = $$("#taskbar .taskbar-item, #system-tray > *");
    for (let i = 0; i < bar.length && i < 40; i++) {
      try {
        const node = bar[i];
        if (node && node.isConnected && isVisible(node)) list.push(node);
      } catch {}
    }
  } catch {}
  return list;
}

function pushDebris(x, y, radius, force) {
  try {
    for (let i = 0; i < debris.length; i++) {
      const s = debris[i];
      if (!s || s.held) continue;
      const cx = s.baseX + s.x + s.w / 2;
      const cy = s.baseY + s.y + s.h / 2;
      const dx = cx - x;
      const dy = cy - y;
      const d = Math.hypot(dx, dy);
      if (d > radius) continue;
      const k = (1 - d / radius) * force;
      const m = Math.max(1, d);
      s.vx += (dx / m) * k * 2;
      s.vy += (dy / m) * k * 2 - k * 0.6;
      s.spin += (Math.random() - 0.5) * k * 2;
      s.settled = false;
      s.restOn = null;
    }
  } catch {}
}

function clipSegment(a, b, w, h) {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const p = [-dx, dx, -dy, dy];
  const q = [a.x, w - a.x, a.y, h - a.y];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null;
      continue;
    }
    const r = q[i] / p[i];
    if (p[i] < 0) {
      if (r > t1) return null;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return null;
      if (r < t1) t1 = r;
    }
  }
  return {
    x0: a.x + dx * t0,
    y0: a.y + dy * t0,
    x1: a.x + dx * t1,
    y1: a.y + dy * t1,
  };
}

const STAIN_REACH = 2400;
const SHARD_STAIN_PER_CALL = 24;
const SHARD_STAIN_COOLDOWN = 90;
const SHARD_STAIN_LIFETIME = 16;

function clampSegment(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len <= STAIN_REACH || len === 0)
    return { x1: x1, y1: y1, x2: x2, y2: y2 };
  const k = STAIN_REACH / len;
  return { x1: x1, y1: y1, x2: x1 + dx * k, y2: y1 + dy * k };
}

function segmentDistanceSq(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 0) {
    const ex = px - x1;
    const ey = py - y1;
    return ex * ex + ey * ey;
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const ex = px - (x1 + dx * t);
  const ey = py - (y1 + dy * t);
  return ex * ex + ey * ey;
}

function stainShardsAlong(x1, y1, x2, y2) {
  try {
    if (Math.hypot(x2 - x1, y2 - y1) < 1) return;
    const now = nowMs();
    const candidates = [];
    for (let i = 0; i < debris.length; i++) {
      try {
        const s = debris[i];
        if (!s || !s.node || !s.node.isConnected) continue;
        if (!s.w || !s.h) continue;
        if ((s.stainCount || 0) >= SHARD_STAIN_LIFETIME) continue;
        const lastStainAt = s.lastStainAt || 0;
        if (lastStainAt > 0 && now - lastStainAt < SHARD_STAIN_COOLDOWN)
          continue;
        const cx = s.baseX + s.x + s.w / 2;
        const cy = s.baseY + s.y + s.h / 2;
        const rad = (-(s.angle || 0) * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const toLocal = (px, py) => {
          const dx = px - cx;
          const dy = py - cy;
          return {
            x: dx * cos - dy * sin + s.w / 2,
            y: dx * sin + dy * cos + s.h / 2,
          };
        };
        const a = toLocal(x1, y1);
        const b = toLocal(x2, y2);
        const clip = clipSegment(a, b, s.w, s.h);
        if (!clip) continue;
        const len = Math.hypot(clip.x1 - clip.x0, clip.y1 - clip.y0);
        if (len < 3) continue;
        candidates.push({
          shard: s,
          a: a,
          b: b,
          clip: clip,
          len: len,
          dist: segmentDistanceSq(cx, cy, x1, y1, x2, y2),
          order: i,
        });
      } catch {}
    }
    candidates.sort((left, right) => {
      if (left.dist !== right.dist) return left.dist - right.dist;
      return left.order - right.order;
    });
    const limit = Math.min(SHARD_STAIN_PER_CALL, candidates.length);
    for (let c = 0; c < limit; c++) {
      try {
        const cand = candidates[c];
        const s = cand.shard;
        const clip = cand.clip;
        const ang = Math.atan2(cand.b.y - cand.a.y, cand.b.x - cand.a.x);
        fxStreak(
          s.node,
          (clip.x0 + clip.x1) / 2,
          (clip.y0 + clip.y1) / 2,
          cand.len,
          ang,
          3 + Math.random() * 2.5,
        );
        if (Math.random() < 0.45) {
          const t = Math.random();
          fxBlob(
            s.node,
            clip.x0 + (clip.x1 - clip.x0) * t,
            clip.y0 + (clip.y1 - clip.y0) * t,
            8 + Math.random() * 10,
          );
        }
        s.stainCount = (s.stainCount || 0) + 1;
        s.lastStainAt = now;
      } catch {}
    }
  } catch {}
}

function stainDomAlong(x1, y1, x2, y2) {
  try {
    if (Math.random() < 0.4) return;
    const list = getLiveTargetEntries().entries;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    for (let i = 0; i < list.length; i++) {
      try {
        const entry = list[i];
        const node = entry.el;
        const rect = entry.rect || node.getBoundingClientRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) continue;
        const clip = clipSegment(
          { x: x1 - rect.left, y: y1 - rect.top },
          { x: x2 - rect.left, y: y2 - rect.top },
          rect.width,
          rect.height,
        );
        if (!clip) continue;
        const len = Math.hypot(clip.x1 - clip.x0, clip.y1 - clip.y0);
        if (len < 3) continue;
        fxStreak(
          node,
          (clip.x0 + clip.x1) / 2,
          (clip.y0 + clip.y1) / 2,
          len,
          ang,
          3 + Math.random() * 2,
        );
      } catch {}
    }
  } catch {}
}

function slashAt(cx, cy, reach, dirSign) {
  const sign = dirSign < 0 ? -1 : 1;
  const fx = cx + sign * reach * 0.5;
  const radius = reach * 0.8;
  try {
    spawnSparks(fx + sign * reach * 0.3, cy, 10);
    playHit();
  } catch {}
  let hits = 0;
  try {
    const list = getWeaponTargets();
    for (let i = 0; i < list.length && hits < 2; i++) {
      try {
        const node = list[i];
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        const px = Math.min(Math.max(fx, rect.left), rect.right);
        const py = Math.min(Math.max(cy, rect.top), rect.bottom);
        if (Math.hypot(px - fx, py - cy) > radius) continue;
        impactX = px;
        impactY = py;
        damageTarget(node);
        fxStreak(
          node,
          px - rect.left,
          py - rect.top,
          34,
          -0.6 * sign,
          2.4,
          true,
        );
        hits += 1;
      } catch {}
    }
  } catch {}
  try {
    if (cursorSeen && !isCursorDestroyed() && cursorDamageAllowed()) {
      if (Math.hypot(cursorX - fx, cursorY - cy) <= radius) {
        hitCursorAt(cursorX, cursorY);
      }
    }
  } catch {}
  try {
    pushDebris(fx, cy, reach * 1.2, 5);
  } catch {}
}

function pickTussleTarget(hx, hy, maxDist) {
  const reach = Number.isFinite(maxDist) ? maxDist : 185;
  const nearest = (list) => {
    let best = null;
    let bestDist = reach;
    for (let i = 0; i < list.length; i++) {
      try {
        const node = list[i];
        if (!node || !node.isConnected) continue;
        if (node.closest && node.closest(".stk-layer")) continue;
        if (!isVisible(node)) continue;
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const d = Math.hypot(x - hx, y - hy);
        if (d < bestDist) {
          bestDist = d;
          best = { x, y };
        }
      } catch {}
    }
    return best;
  };
  try {
    const bar = $("#taskbar");
    if (bar && isVisible(bar)) {
      const hit = nearest($$("#taskbar .taskbar-item, #system-tray > *"));
      if (hit) return hit;
    }
  } catch {}
  try {
    const hit = nearest($$(".window"));
    if (hit) return hit;
  } catch {}
  try {
    const hit = nearest($$("#desktop > .icon"));
    if (hit) return hit;
  } catch {}
  return null;
}

function primeAirWarp(x, y, radius) {
  try {
    if (!airWarp) return;
    clearWarpRelease();
    airWarp.prime(x, y, radius);
    warpReleaseTimer = setTimeout(() => {
      warpReleaseTimer = null;
      releaseAirWarp(x, y);
    }, AIR_WARP_LEAD_MS);
  } catch {}
}

function clearWarpRelease() {
  try {
    if (warpReleaseTimer) clearTimeout(warpReleaseTimer);
    warpReleaseTimer = null;
  } catch {}
}

function releaseAirWarp(x, y) {
  try {
    if (airWarp) airWarp.release(x, y);
  } catch {}
}

function slamCursor(x, y) {
  try {
    primeAirWarp(x, y, AIR_WARP_RADIUS);
  } catch {}
  try {
    impactX = x;
    impactY = y;
  } catch {}
  try {
    spawnSparks(x, y, 14);
  } catch {}
  try {
    playHit();
  } catch {}
  try {
    hitCursorAt(x, y, true);
  } catch {}
  try {
    fxRing(layer, x, y, 80, "#ffffff");
    fxDust(layer, x, y, 0.6);
    screenShake(0.5);
  } catch {}
  try {
    const hit = findTargetAt(x, y, 0);
    if (hit) {
      const rect = hit.getBoundingClientRect();
      impactX = Math.min(Math.max(x, rect.left), rect.right);
      impactY = Math.min(Math.max(y, rect.top), rect.bottom);
      damageTarget(hit);
      plantBurn(hit, impactX, impactY);
    }
  } catch {}
  try {
    syncDesktopBottom();
  } catch {}
}

export function laserSweepAlong(x1, y1, x2, y2, ownerPlayer) {
  try {
    const foe = foeSys && foeSys.getRef ? foeSys.getRef() : null;
    const skip =
      ownerPlayer === true ? actorRef : ownerPlayer === false ? foe : null;
    const list = [actorRef, foe];
    const steps = 10;
    for (let s = 0; s <= steps; s++) {
      const px = x1 + ((x2 - x1) * s) / steps;
      const py = y1 + ((y2 - y1) * s) / steps;
      let struck = false;
      for (let i = 0; i < list.length; i++) {
        const ref = list[i];
        if (!ref || ref === skip || typeof ref.hurt !== "function") continue;
        const box = ref.getPos();
        if (!box) continue;
        const nx = Math.max(box.x, Math.min(px, box.x + box.w));
        const ny = Math.max(box.y, Math.min(py, box.y + box.h));
        if (Math.hypot(nx - px, ny - py) > 10) continue;
        ref.hurt(px, py, 1);
        spawnSparks(nx, ny, 10);
        struck = true;
        break;
      }
      if (struck) break;
    }
  } catch {}
  try {
    const clamped = clampSegment(x1, y1, x2, y2);
    stainShardsAlong(clamped.x1, clamped.y1, clamped.x2, clamped.y2);
    stainDomAlong(clamped.x1, clamped.y1, clamped.x2, clamped.y2);
  } catch {}
  const steps = 24;
  let nearest = null;
  let impactX = 0;
  let impactY = 0;
  let desk = [];
  let targets = [];
  try {
    desk = $$("#taskbar .taskbar-item, #system-tray > *");
  } catch {
    desk = [];
  }
  try {
    targets = getLiveTargetEntries().entries;
  } catch {
    targets = [];
  }
  for (let s = 0; s <= steps && !nearest; s++) {
    const px = x1 + ((x2 - x1) * s) / steps;
    const py = y1 + ((y2 - y1) * s) / steps;
    try {
      for (let t = 0; t < desk.length; t++) {
        try {
          const node = desk[t];
          if (!node || !node.isConnected) continue;
          const rect = node.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) continue;
          if (
            px >= rect.left &&
            px <= rect.right &&
            py >= rect.top &&
            py <= rect.bottom
          ) {
            nearest = node;
            break;
          }
        } catch {}
      }
    } catch {}
    if (!nearest) {
      try {
        for (let t = 0; t < targets.length; t++) {
          try {
            const entry = targets[t];
            const node = entry.el;
            const rect = entry.rect || node.getBoundingClientRect();
            if (!rect || rect.width <= 0 || rect.height <= 0) continue;
            if (
              px >= rect.left &&
              px <= rect.right &&
              py >= rect.top &&
              py <= rect.bottom
            ) {
              nearest = node;
              break;
            }
          } catch {}
        }
      } catch {}
    }
    if (nearest) {
      try {
        const rect = nearest.getBoundingClientRect();
        impactX = Math.min(Math.max(px, rect.left), rect.right);
        impactY = Math.min(Math.max(py, rect.top), rect.bottom);
      } catch {}
    }
  }
  if (!nearest) return;
  try {
    damageTarget(nearest);
    plantBurn(nearest, impactX, impactY);
    spawnSparks(impactX, impactY, 4);
  } catch {}
}
function plantBurn(node, x, y) {
  try {
    if (!node || !node.isConnected) return;
    let existing = 0;
    try {
      existing = node.querySelectorAll(":scope > .stk-burn-blob").length;
    } catch {}
    if (existing >= 8) {
      try {
        const oldest = node.querySelector(":scope > .stk-burn-blob");
        if (oldest) oldest.remove();
      } catch {}
    }
    let rw = 0;
    let rh = 0;
    let rx = 0;
    let ry = 0;
    try {
      const rect = node.getBoundingClientRect();
      rw = rect.width;
      rh = rect.height;
      rx = x - rect.left;
      ry = y - rect.top;
    } catch {
      return;
    }
    try {
      const pos = window.getComputedStyle(node).position;
      if (pos === "static") node.style.position = "relative";
    } catch {}
    const n = 2 + Math.floor(Math.random() * 2);
    const cap = Math.max(10, Math.max(rw, rh));
    for (let k = 0; k < n; k++) {
      try {
        const size = Math.min(14 + Math.random() * 16, cap);
        const blob = createElement("div", { className: "stk-burn-blob" });
        blob.style.width = size + "px";
        blob.style.height = size + "px";
        blob.style.left =
          Math.min(
            Math.max(rx + (Math.random() - 0.5) * 24 - size / 2, 0),
            Math.max(0, rw - size),
          ) + "px";
        blob.style.top =
          Math.min(
            Math.max(ry + (Math.random() - 0.5) * 24 - size / 2, 0),
            Math.max(0, rh - size),
          ) + "px";
        node.appendChild(blob);
      } catch {}
    }
  } catch {}
}
function stompAt(sx, sy, radius) {
  try {
    primeAirWarp(sx, sy, Math.max(AIR_WARP_RADIUS, (radius || 0) * 2));
  } catch {}
  try {
    let targets = [];
    try {
      targets = getLiveTargetEntries().entries;
    } catch {}
    for (let t = 0; t < targets.length; t++) {
      try {
        const entry = targets[t];
        const node = entry.el;
        const rect = entry.rect || node.getBoundingClientRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) continue;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(cx - sx, cy - sy);
        if (dist > radius + Math.max(rect.width, rect.height) / 2) continue;
        try {
          impactX = Math.min(Math.max(sx, rect.left), rect.right);
        } catch {}
        try {
          impactY = Math.min(Math.max(sy, rect.top), rect.bottom);
        } catch {}
        damageTarget(node);
        hopTarget(node);
      } catch {}
    }
  } catch {}
  try {
    spawnSparks(sx, sy, 10);
  } catch {}
}
function hopTarget(node) {
  try {
    if (!node || !node.animate) return;
    try {
      if (node.stkHopAnim) node.stkHopAnim.cancel();
    } catch {}
    node.stkHopAnim = node.animate(
      [
        { transform: "translateY(0px)" },
        { transform: "translateY(-14px)", offset: 0.35 },
        { transform: "translateY(0px)" },
      ],
      { duration: 320, easing: "ease-out" },
    );
    try {
      node.stkHopAnim.onfinish = () => {
        try {
          node.stkHopAnim = null;
        } catch {}
      };
    } catch {}
  } catch {}
}
function fireAt(sx, sy, tx, ty, ownerPlayer) {
  try {
    if (!layer || bullets.length >= 24) return;
    const dx = tx - sx;
    const dy = ty - sy;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.12;
    const speed = 11 + Math.random() * 3;
    const el = createElement("div", { className: "stk-bullet" });
    el.style.left = "0px";
    el.style.top = "0px";
    el.style.translate = sx + "px " + sy + "px";
    layer.appendChild(el);
    bullets.push({
      el: el,
      x: sx,
      y: sy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0,
      ownerPlayer: ownerPlayer,
    });
    try {
      playShoot();
    } catch {}
  } catch {}
}

function updateBullets(dt, dtSec) {
  try {
    if (bullets.length === 0) return;
    let targets = [];
    try {
      targets = getLiveTargetEntries().entries;
    } catch {}
    for (let i = bullets.length - 1; i >= 0; i--) {
      try {
        const b = bullets[i];
        if (!b) {
          bullets.splice(i, 1);
          continue;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.age += dtSec;
        let dead = b.age > 2.5;
        if (
          b.x < -30 ||
          b.x > window.innerWidth + 30 ||
          b.y < -30 ||
          b.y > window.innerHeight + 30
        )
          dead = true;
        if (!dead && hitStickmanAt(b.x, b.y, b.ownerPlayer)) {
          dead = true;
        }
        if (!dead && b.ownerPlayer === true && cursorSeen) {
          const dx = b.x - cursorX;
          const dy = b.y - cursorY;
          if (Math.sqrt(dx * dx + dy * dy) <= 26) {
            spawnSparks(b.x, b.y, 5);
            let killed = false;
            try {
              killed = hitCursorAt(b.x, b.y);
            } catch {}
            if (killed) spawnSparks(b.x, b.y, 16);
            dead = true;
          }
        }
        if (!dead) {
          for (let t = 0; t < targets.length; t++) {
            try {
              const entry = targets[t];
              const node = entry.el;
              const rect = entry.rect || node.getBoundingClientRect();
              if (!rect) continue;
              if (
                b.x >= rect.left &&
                b.x <= rect.right &&
                b.y >= rect.top &&
                b.y <= rect.bottom
              ) {
                impactX = b.x;
                impactY = b.y;
                damageTarget(node);
                dead = true;
                break;
              }
            } catch {}
          }
        }
        if (dead) {
          try {
            b.el.remove();
          } catch {}
          bullets.splice(i, 1);
          continue;
        }
        try {
          b.el.style.translate = b.x + "px " + b.y + "px";
        } catch {}
      } catch {}
    }
  } catch {}
}

function updateSparks(dt, dtSec) {
  try {
    if (sparks.length === 0) return;
    for (let i = sparks.length - 1; i >= 0; i--) {
      try {
        const s = sparks[i];
        if (!s) {
          sparks.splice(i, 1);
          continue;
        }
        s.vy += 0.3 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.age += dtSec;
        if (s.age >= 0.6) {
          try {
            s.el.remove();
          } catch {}
          sparks.splice(i, 1);
          continue;
        }
        try {
          s.el.style.translate = s.x + "px " + s.y + "px";
          s.el.style.opacity = String(Math.max(0, 1 - s.age / 0.6));
        } catch {}
      } catch {}
    }
  } catch {}
}

function checkShardHits() {
  try {
    if (debris.length === 0) return;
    if (!actorRef || typeof actorRef.getPos !== "function") return;
    let ax = 0;
    let ay = 0;
    let aw = 28;
    let ah = 64;
    try {
      const p = actorRef.getPos();
      ax = p.x;
      ay = p.y;
      if (typeof p.w === "number") aw = p.w;
      if (typeof p.h === "number") ah = p.h;
    } catch {
      return;
    }
    for (let i = 0; i < debris.length; i++) {
      try {
        const s = debris[i];
        if (!s || s.held || s.hitActor) continue;
        const spd = Math.hypot(s.vx || 0, s.vy || 0);
        if (spd < 4) continue;
        const sx = s.baseX + s.x;
        const sy = s.baseY + s.y;
        if (sx + s.w < ax || sx > ax + aw || sy + s.h < ay || sy > ay + ah)
          continue;
        try {
          s.hitActor = true;
        } catch {}
        try {
          s.vx *= -0.4;
          s.vy = -Math.abs(s.vy) * 0.3 - 2;
          s.settled = false;
        } catch {}
        try {
          if (typeof actorRef.hurt === "function")
            actorRef.hurt(
              sx + s.w / 2,
              sy + s.h / 2,
              Math.min(12, 5 + spd * 0.5),
            );
        } catch {}
        try {
          spawnSparks(ax + aw / 2, ay + ah / 2, 8);
        } catch {}
      } catch {}
    }
  } catch {}
}

function loop(now) {
  try {
    if (!lastTime) lastTime = now;
    const dt = Math.min(Math.max((now - lastTime) / 16.667, 0.5), 2);
    lastTime = now;
    const dtSec = dt * 0.016667;
    try {
      if (actorRef) actorRef.update(now, dt);
    } catch {}
    separateActors();
    try {
      if (foeSys) foeSys.update(now, dt);
    } catch {}
    try {
      if (playerHint) playerHint.update(now);
    } catch {}
    updateBullets(dt, dtSec);
    try {
      if (weapons) weapons.update(dt, dtSec);
    } catch {}
    try {
      updateCursorPhysics(dtSec);
    } catch {}
    try {
      if (spearSys) spearSys.update(now, dt, dtSec);
    } catch {}
    updateSparks(dt, dtSec);
    try {
      if (airWarp) airWarp.update(now);
    } catch {}
    updateDebris(dt);
    try {
      updateCage(dt);
    } catch {}
    try {
      checkShardHits();
    } catch {}
  } catch {}
  if (active) frameId = requestAnimationFrame(loop);
}

export function isStickmanActive() {
  return active;
}

export function getStickmanControlMode() {
  return controlMode;
}

export function onStickmanControlMode(fn) {
  try {
    if (typeof fn === "function") controlListeners.add(fn);
    else controlListeners.delete(fn);
  } catch {}
}

function ensurePlayerUi() {
  if (playerInput) return;
  try {
    playerRack = createAmmoRack();
  } catch {
    playerRack = null;
  }
  try {
    playerInput = createPlayerInput();
  } catch {
    playerInput = null;
  }
  try {
    playerHud = layer ? createPlayerHud(layer) : null;
  } catch {
    playerHud = null;
  }
  try {
    playerHint = layer ? createRivalHint(layer) : null;
  } catch {
    playerHint = null;
  }
  try {
    playerGuide = layer ? createControlsGuide(layer) : null;
  } catch {
    playerGuide = null;
  }
  if (playerInput) {
    try {
      playerInput.onPauseChange((paused) => {
        if (playerGuide) playerGuide.setPaused(paused);
      });
    } catch {}
  }
  if (playerHud) {
    try {
      playerHud.setVisible(false);
    } catch {}
  }
  if (playerGuide) {
    try {
      playerGuide.setVisible(false);
      playerGuide.setCollapsed(true);
    } catch {}
  }
}

function teardownPlayerUi() {
  try {
    if (playerInput) playerInput.detach();
  } catch {}
  try {
    if (playerHint) playerHint.destroy();
  } catch {}
  try {
    if (playerGuide) playerGuide.destroy();
  } catch {}
  try {
    if (playerHud) playerHud.destroy();
  } catch {}
  playerInput = null;
  playerRack = null;
  playerGuide = null;
  playerHud = null;
  playerHint = null;
}

function hitStickmanAt(x, y, ownerPlayer) {
  try {
    const foe = foeSys && foeSys.getRef ? foeSys.getRef() : null;
    const playerRef = actorRef;
    const foeRef = foe;
    const skip =
      ownerPlayer === true ? playerRef : ownerPlayer === false ? foeRef : null;
    const list = [
      { ref: playerRef, name: "PLAYER" },
      { ref: foeRef, name: "RIVAL" },
    ];
    for (let i = 0; i < list.length; i++) {
      const entry = list[i];
      const ref = entry.ref;
      if (!ref || ref === skip) continue;
      if (typeof ref.hurt !== "function") continue;
      const box = ref.getPos();
      if (!box) continue;
      const cx = Math.max(box.x, Math.min(x, box.x + box.w));
      const cy = Math.max(box.y, Math.min(y, box.y + box.h));
      const dist = Math.hypot(cx - x, cy - y);
      if (dist > 14) continue;
      ref.hurt(x, y, 1);
      spawnSparks(cx, cy, 8);
      return true;
    }
  } catch {}
  return false;
}

function separateActors() {
  try {
    const foe = foeSys && foeSys.getRef ? foeSys.getRef() : null;
    if (!actorRef || !foe) return;
    const a = actorRef.getPos();
    const b = foe.getPos();
    if (!a || !b) return;
    const ax = a.x + a.w / 2;
    const bx = b.x + b.w / 2;
    const overlap = BODY_SEPARATION - Math.abs(bx - ax);
    if (overlap <= 0) return;
    const dir = bx >= ax ? 1 : -1;
    const shift = (overlap / 2) * dir;
    if (typeof foe.nudge === "function") foe.nudge(-shift, 0);
    if (typeof actorRef.nudge === "function") actorRef.nudge(shift, 0);
  } catch {}
}

function cursorDamageAllowed() {
  return controlMode !== "player";
}

function hitCursorAt(x, y, forced) {
  if (!cursorDamageAllowed()) return false;
  try {
    return registerCursorHit(x, y, forced);
  } catch {
    return false;
  }
}

function cursorAnchor() {
  return { x: cursorX, y: cursorY, seen: cursorSeen };
}

function playerBodyAnchor() {
  try {
    if (actorRef && typeof actorRef.getPos === "function") {
      const box = actorRef.getPos();
      if (box)
        return { x: box.x + box.w / 2, y: box.y + box.h / 2, seen: true };
    }
  } catch {}
  return null;
}

function rivalAnchor() {
  if (controlMode !== "player") return cursorAnchor();
  return playerBodyAnchor() || { x: -9999, y: -9999, seen: false };
}

function shotAnchor(ownerPlayer) {
  if (ownerPlayer === false) return rivalAnchor();
  return cursorAnchor();
}

function applyControlMode(next) {
  const mode = next === "player" ? "player" : "ai";
  const wasPlayer = controlMode === "player";
  controlMode = mode;
  if (wasPlayer && mode === "ai") {
    try {
      cleanupCursorKill();
    } catch {}
  }
  if (active) {
    try {
      if (actorRef && typeof actorRef.setControlMode === "function") {
        actorRef.setControlMode(mode);
      }
    } catch {}
    try {
      if (foeSys && typeof foeSys.link === "function") foeSys.link();
    } catch {}
    try {
      if (playerInput) {
        if (mode === "player") {
          playerInput.attach();
          playerInput.setArmed(true);
          playerInput.setPaused(false);
        } else {
          playerInput.releaseAll();
          playerInput.setPaused(false);
          playerInput.setArmed(false);
          playerInput.detach();
        }
      }
    } catch {}
    try {
      if (playerHud) playerHud.setVisible(mode === "player");
    } catch {}
    syncFoeHud();
    try {
      if (playerHint) {
        if (mode === "player" && !(foeSys && foeSys.isAlive()))
          playerHint.show(performance.now());
        else playerHint.hide();
      }
    } catch {}
    try {
      if (playerGuide) {
        playerGuide.setPaused(false);
        playerGuide.setVisible(mode === "player");
        playerGuide.setCollapsed(mode !== "player");
      }
    } catch {}
  }
  for (const fn of controlListeners) {
    try {
      fn(mode);
    } catch {}
  }
  return controlMode;
}

export function setStickmanControlMode(mode) {
  return applyControlMode(mode);
}

export function spawnStickman(opts) {
  if (active) return;
  try {
    if (layer) {
      try {
        layer.remove();
      } catch {}
      layer = null;
    }
    try {
      teardownPlayerUi();
    } catch {}
    layer = createElement("div", { className: "stk-layer" });
    document.body.appendChild(layer);
    try {
      initTargetRegistry();
    } catch {}
    try {
      ensurePlayerUi();
    } catch {}
    try {
      if (airWarp) airWarp.destroy();
    } catch {}
    try {
      airWarp = createAirWarp({ getLayer: () => layer });
    } catch {
      airWarp = null;
    }
    try {
      if (weapons) weapons.clear();
    } catch {}
    weapons = createWeaponSystem({
      getLayer: () => layer,
      getTargets: () => getWeaponTargets(),
      getFloor: () => getFloor(),
      getCursor: () => ({ x: cursorX, y: cursorY, seen: cursorSeen }),
      getAnchor: (ownerPlayer) => shotAnchor(ownerPlayer),
      cursorDead: () => isCursorDestroyed(),
      sparks: (x, y, n) => spawnSparks(x, y, n),
      damage: (node, x, y) => {
        impactX = x;
        impactY = y;
        damageTarget(node);
        plantBurn(node, x, y);
      },
      hitCursor: (x, y) => hitCursorAt(x, y, true),
      hitStickman: (x, y, ownerPlayer) => hitStickmanAt(x, y, ownerPlayer),
      push: (x, y, r, force) => pushDebris(x, y, r, force),
      sfx: { hit: playHit, shatter: playShatter },
      cutCage: (x, y, radius) => {
        try {
          const rect = getCageRect();
          if (!rect) return false;
          if (
            x >= rect.left - radius &&
            x <= rect.left + rect.width + radius &&
            y >= rect.top - radius &&
            y <= rect.top + rect.height + radius
          ) {
            nudgeCage(12);
            playShatter();
            spawnSparks(x, y, 16);
            return true;
          }
        } catch {}
        return false;
      },
    });
    const weaponCtx = {
      getLayer: () => layer,
      getTargets: () => getWeaponTargets(),
      getFloor: () => getFloor(),
      getCursor: () => ({ x: cursorX, y: cursorY, seen: cursorSeen }),
      getAnchor: (ownerPlayer) => shotAnchor(ownerPlayer),
      cursorDead: () => isCursorDestroyed(),
      damage: (node, x, y) => {
        impactX = x;
        impactY = y;
        damageTarget(node);
        plantBurn(node, x, y);
      },
      hitCursor: (x, y) => hitCursorAt(x, y, true),
      hitStickman: (x, y, ownerPlayer) => hitStickmanAt(x, y, ownerPlayer),
      sparks: (x, y, n) => spawnSparks(x, y, n),
      push: (x, y, r, force) => pushDebris(x, y, r, force),
      rectOf: (node) => {
        try {
          if (node && node.getBoundingClientRect)
            return node.getBoundingClientRect();
        } catch {}
        return null;
      },
    };
    try {
      spearSys = createSpearSystem(weaponCtx);
    } catch {
      spearSys = null;
    }
    try {
      const actorHooks = {
        fire: (sx, sy, tx, ty, fromPlayer) => {
          try {
            fireAt(sx, sy, tx, ty, fromPlayer);
          } catch {}
        },
        fireWeapon: (kind, sx, sy, tx, ty, fromPlayer) => {
          try {
            if (weapons) weapons.fire(kind, sx, sy, tx, ty, fromPlayer);
          } catch {}
        },
        spawnFoe: (now) => {
          try {
            if (!foeSys) return false;
            if (!foeSys.isAlive()) {
              const spawned = foeSys.spawn(now || performance.now());
              if (spawned) {
                if (playerHint) playerHint.hide();
                syncFoeHud();
              }
              return spawned;
            }
            foeSys.remove();
            syncFoeHud();
            return false;
          } catch {
            return false;
          }
        },
        slash: (cx, cy, reach, dirSign, fromPlayer) => {
          try {
            slashAt(cx, cy, reach, dirSign);
          } catch {}
          try {
            const victim = fromPlayer
              ? foeSys && foeSys.getRef
                ? foeSys.getRef()
                : null
              : actorRef;
            if (!victim || typeof victim.hurt !== "function") return;
            const box = victim.getPos();
            if (!box) return;
            const vx = box.x + box.w / 2;
            const vy = box.y + box.h / 2;
            const nearX = Math.max(box.x, Math.min(vx, box.x + box.w));
            const nearY = Math.max(box.y, Math.min(vy, box.y + box.h));
            if (Math.hypot(nearX - cx, nearY - cy) > reach + MELEE_SLACK)
              return;
            victim.hurt(cx, cy, 1);
            spawnSparks(nearX, nearY, 8);
          } catch {}
        },
        dust: (x, y, power) => {
          try {
            fxDust(layer, x, y, power);
          } catch {}
        },
        shake: (power) => {
          try {
            screenShake(power);
          } catch {}
        },
        clickRipple: (x, y) => {
          try {
            fxRing(layer, x, y, 74, "#ffffff");
          } catch {}
        },
        ninjaSmoke: (x, y) => {
          try {
            fxNinjaSmoke(layer, x, y);
          } catch {}
        },
        electricBurst: (x, y) => {
          try {
            fxElectricSpark(layer, x, y, 10);
          } catch {}
        },
        throwSpear: (sx, sy, tx, ty, ownerPlayer) => {
          try {
            if (spearSys) spearSys.throwSpear(sx, sy, tx, ty, ownerPlayer);
          } catch {}
        },
        nearestSpear: (x, y) => {
          try {
            return spearSys ? spearSys.nearestGraspable(x, y) : null;
          } catch {
            return null;
          }
        },
        vaultSpear: (s) => {
          try {
            return spearSys ? spearSys.vaultFrom(s, performance.now()) : null;
          } catch {
            return null;
          }
        },
        pinCursor: (x, y, ms) => {
          try {
            pinCursor(x, y, ms);
          } catch {}
        },
        launchCursor: (fx, fy) => {
          try {
            launchCursor(fx, fy);
          } catch {}
        },
        substitutionLog: (x, y) => {
          try {
            fxSubstitutionLog(layer, x, y);
          } catch {}
        },
        getCursor: () => {
          return { x: cursorX, y: cursorY, seen: cursorSeen };
        },
        getFloor: () => {
          try {
            return getFloor();
          } catch {
            return window.innerHeight;
          }
        },
        getCage: () => {
          try {
            return getCageRect();
          } catch {
            return null;
          }
        },
        stomp: (sx, sy, radius) => {
          try {
            stompAt(sx, sy, radius);
          } catch {}
        },
        hitCursor: (x, y) => hitCursorAt(x, y, true),
        cagePunch: () => {
          try {
            nudgeCage(Math.random() * 6 - 3);
          } catch {}
        },
        laserStrike: (tx, ty) => {
          try {
            laserStrikeAt(tx, ty);
          } catch {}
        },
        laserSweepAlong: (x1, y1, x2, y2, fromPlayer) => {
          try {
            laserSweepAlong(x1, y1, x2, y2, fromPlayer);
          } catch {}
        },
        pickTussleTarget: (hx, hy, maxDist) => {
          try {
            return pickTussleTarget(hx, hy, maxDist);
          } catch {
            return null;
          }
        },
        onTussleSlam: (x, y) => {
          try {
            slamCursor(x, y);
          } catch {}
        },
        rage: (on) => {
          try {
            if (on) setRageWallpaper();
            else clearRageWallpaper();
          } catch {}
        },
        getFxLayer: () => layer,
        cursorDamageAllowed: () => cursorDamageAllowed(),
        playerInput: playerInput,
        playerRack: playerRack,
        playerGuide: playerGuide,
        playerHud: playerHud,
        onWeaponFired: (kind) => {
          try {
            if (playerRack) playerRack.onFired(kind, performance.now());
          } catch {}
        },
      };
      actorRef = createStickmanActor(layer, actorHooks);
      foeSys = createFoeSystem({
        getLayer: () => layer,
        getPlayerRef: () => actorRef,
        getPlayerPos: () => {
          try {
            if (actorRef && typeof actorRef.getPos === "function") {
              return actorRef.getPos();
            }
          } catch {}
          return null;
        },
        createActor: (lay) => {
          const rivalHooks = Object.assign({}, actorHooks, {
            draggable: false,
          });
          const rivalCursor = rivalHooks.getCursor;
          rivalHooks.getCursor = () =>
            controlMode === "player"
              ? { x: -9999, y: -9999, seen: false }
              : rivalCursor();
          return createStickmanActor(lay, rivalHooks);
        },
        pop: (x, y, n) => spawnSparks(x, y, n),
        loadRank: () => {
          try {
            return os.storage.get(StorageKeys.codeRedFoeRank);
          } catch {
            return null;
          }
        },
        saveRank: (value) => {
          try {
            os.storage.set(StorageKeys.codeRedFoeRank, value);
          } catch {}
        },
        onRankChange: (profile) => {
          try {
            if (playerHud && typeof playerHud.setFoeRank === "function") {
              playerHud.setFoeRank(profile);
            }
          } catch {}
        },
      });
    } catch {
      foeSys = null;
    }
    try {
      if (
        opts &&
        typeof opts.x === "number" &&
        typeof opts.y === "number" &&
        actorRef &&
        typeof actorRef.launch === "function"
      ) {
        actorRef.launch(opts.x, opts.y, opts.vx || 0, opts.vy || 0);
      }
    } catch {}
    try {
      if (
        opts &&
        opts.intro &&
        actorRef &&
        typeof actorRef.startIntro === "function"
      )
        actorRef.startIntro(1800);
    } catch {}
    bullets = [];
    sparks = [];
    debris = [];
    try {
      dragEntry = null;
    } catch {}
    try {
      dragGroup = [];
    } catch {}
    try {
      dragOffsetX = 0;
      dragOffsetY = 0;
    } catch {}
    try {
      dragSamples = [];
    } catch {}
    try {
      shatterOverlays.clear();
    } catch {}
    try {
      shatterOverlayIndex.clear();
    } catch {}
    try {
      shattered.clear();
    } catch {}
    try {
      rebuildDock = null;
    } catch {}
    try {
      liveShardTotal = 0;
    } catch {}
    cursorSeen = false;
    try {
      cleanupCursorKill();
    } catch {}
    try {
      cleanupCage();
    } catch {}
    try {
      cleanupTussle();
    } catch {}
    try {
      onCageBreak((state) => {
        try {
          if (state)
            spawnSparks(state.x + state.w / 2, state.y + state.h / 2, 16);
        } catch {}
        try {
          if (actorRef && typeof actorRef.launch === "function" && state)
            actorRef.launch(
              state.x + state.w / 2 - 14,
              state.y,
              state.vx || 0,
              -6,
            );
        } catch {}
      });
    } catch {}
    mouseHandler = onMouseMove;
    bindEvent(window, "mousemove", mouseHandler);
    try {
      if (floorResizeHandler) {
        try {
          window.removeEventListener("resize", floorResizeHandler);
        } catch {}
      }
      floorResizeHandler = () => {
        invalidateFloorCache();
      };
      bindEvent(window, "resize", floorResizeHandler);
    } catch {}
    try {
      dragMoveHandler = onDragMove;
    } catch {}
    try {
      dragUpHandler = onDragUp;
    } catch {}
    try {
      bindEvent(window, "pointermove", dragMoveHandler);
    } catch {}
    try {
      bindEvent(window, "pointerup", dragUpHandler);
    } catch {}
    active = true;
    lastTime = 0;
    frameId = requestAnimationFrame(loop);
    try {
      if (opts && opts.controlMode) applyControlMode(opts.controlMode);
      else applyControlMode(controlMode);
    } catch {}
    try {
      syncDesktopBottom();
    } catch {}
  } catch {}
}

export function despawnStickman() {
  if (!active && !layer) return;
  try {
    active = false;
    try {
      resetScreenShake();
    } catch {}
    try {
      teardownPlayerUi();
    } catch {}
    for (const fn of controlListeners) {
      try {
        fn(controlMode);
      } catch {}
    }
    if (frameId !== null) {
      try {
        cancelAnimationFrame(frameId);
      } catch {}
      frameId = null;
    }
    if (mouseHandler) {
      try {
        window.removeEventListener("mousemove", mouseHandler);
      } catch {}
      mouseHandler = null;
    }
    try {
      if (floorResizeHandler) {
        try {
          window.removeEventListener("resize", floorResizeHandler);
        } catch {}
        floorResizeHandler = null;
      }
    } catch {}
    try {
      invalidateFloorCache();
    } catch {}
    try {
      if (dragMoveHandler) {
        try {
          window.removeEventListener("pointermove", dragMoveHandler);
        } catch {}
      }
    } catch {}
    try {
      if (dragUpHandler) {
        try {
          window.removeEventListener("pointerup", dragUpHandler);
        } catch {}
      }
    } catch {}
    try {
      dragMoveHandler = null;
      dragUpHandler = null;
    } catch {}
    try {
      dragEntry = null;
    } catch {}
    try {
      dragGroup = [];
    } catch {}
    try {
      dragSamples = [];
    } catch {}
    try {
      cleanupCursorKill();
    } catch {}
    try {
      resetLaserSfx();
    } catch {}
    try {
      restoreWallpaper();
    } catch {}
    try {
      resetRealityRift();
    } catch {}
    try {
      cleanupCage();
    } catch {}
    try {
      cleanupTussle();
    } catch {}
    try {
      if (foeSys) {
        try {
          foeSys.clear();
        } catch {}
        foeSys = null;
      }
      if (actorRef) actorRef.destroy();
    } catch {}
    actorRef = null;
    try {
      if (weapons) weapons.clear();
    } catch {}
    weapons = null;
    try {
      if (spearSys) spearSys.clear();
    } catch {}
    spearSys = null;
    clearWarpRelease();
    try {
      if (airWarp) airWarp.destroy();
    } catch {}
    airWarp = null;
    cursorPin = null;
    cursorKickX = 0;
    cursorKickY = 0;
    try {
      const hitKeys = Array.from(hitTimers.keys());
      for (let i = 0; i < hitKeys.length && i < 50; i++) {
        try {
          clearTimeout(hitTimers.get(hitKeys[i]));
        } catch {}
      }
    } catch {}
    hitTimers.clear();
    try {
      const tracked = Array.from(shatterOverlays.keys());
      for (let i = 0; i < tracked.length && i < 50; i++) {
        try {
          restoreElement(tracked[i]);
        } catch {}
      }
    } catch {}
    try {
      shatterOverlays.clear();
    } catch {}
    try {
      shatterOverlayIndex.clear();
    } catch {}
    try {
      const pending = Array.from(shattered.keys());
      for (let i = 0; i < pending.length && i < 50; i++) {
        try {
          restoreElement(pending[i]);
        } catch {}
      }
    } catch {}
    try {
      shattered.clear();
    } catch {}
    try {
      const leftovers = Array.from(hpMap.keys());
      for (let i = 0; i < leftovers.length && i < 50; i++) {
        try {
          restoreElement(leftovers[i]);
        } catch {}
      }
    } catch {}
    hpMap.clear();
    try {
      liveShardTotal = 0;
    } catch {}
    try {
      for (let i = debris.length - 1; i >= 0; i--) {
        try {
          const entry = debris[i];
          if (entry && entry.node) {
            try {
              entry.node.remove();
            } catch {}
          }
        } catch {}
      }
    } catch {}
    debris = [];
    bullets = [];
    sparks = [];
    try {
      if (rebuildDock) {
        try {
          rebuildDock.remove();
        } catch {}
      }
    } catch {}
    rebuildDock = null;
    try {
      if (layer) {
        try {
          const overlays = $$(".stk-shatter", layer);
          for (let i = 0; i < overlays.length; i++) {
            try {
              overlays[i].remove();
            } catch {}
          }
        } catch {}
      }
    } catch {}
    if (layer) {
      try {
        layer.remove();
      } catch {}
      layer = null;
    }
  } catch {}
  actorRef = null;
  lastTime = 0;
  try {
    syncDesktopBottom();
  } catch {}
}
