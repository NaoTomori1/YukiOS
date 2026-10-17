import "../styles/stickmanChaos.css";
import { $, $$, createElement, bindEvent } from "../framework.js";
import { createStickmanActor } from "./stickmanActor.js";
import {
  playShoot,
  playHit,
  playShatter,
  playRebuild,
  playGrab,
} from "./chaosSfx.js";
import { registerCursorHit, cleanupCursorKill } from "./stickmanCursorKill.js";
import {
  captureCage,
  updateCage,
  cleanupCage,
  getCageRect,
  isCaged,
  onCageBreak,
  nudgeCage,
} from "./stickmanCage.js";
import {
  getSelectedShards,
  setShardSelected,
  clearShardSelection,
} from "./stickmanSelection.js";

let layer = null;
let actorRef = null;
let active = false;
let frameId = null;
let lastTime = 0;
let cursorX = -9999;
let cursorY = -9999;
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

function getFloor() {
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

function onMouseMove(e) {
  try {
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
  const list = [];
  try {
    const menu = $("#start-menu");
    if (menu && isMenuOpen(menu)) list.push(menu);
  } catch {}
  try {
    const wins = $$(".window");
    for (let i = 0; i < wins.length && i < 50; i++) {
      try {
        const el = wins[i];
        if (!el) continue;
        try {
          if (el.closest && el.closest(".stk-layer")) continue;
        } catch {}
        if (!isVisible(el)) continue;
        if (el.offsetWidth < 200 || el.offsetHeight < 120) continue;
        try {
          const rect = el.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) continue;
        } catch {
          continue;
        }
        list.push(el);
      } catch {}
    }
  } catch {}
  try {
    const icons = $$("#desktop > .icon");
    for (let i = 0; i < icons.length && i < 60; i++) {
      try {
        const el = icons[i];
        if (!el) continue;
        try {
          if (el.closest && el.closest(".stk-layer")) continue;
        } catch {}
        if (!isVisible(el)) continue;
        try {
          const rect = el.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) continue;
        } catch {
          continue;
        }
        list.push(el);
      } catch {}
    }
  } catch {}
  return list;
}

function spawnSparks(x, y, count) {
  try {
    if (!layer) return;
    const total = Math.max(0, Math.min(count, 200));
    for (let i = 0; i < total; i++) {
      try {
        if (sparks.length >= 100) break;
        const el = createElement("div", { className: "stk-spark" });
        el.style.left = x + "px";
        el.style.top = y + "px";
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
          const entries = Array.from(shatterOverlays.entries());
          for (let k = 0; k < entries.length; k++) {
            try {
              const rec = entries[k][1];
              if (rec && victim && rec.overlay === victim.overlay) {
                try {
                  rec.count = Math.max(0, rec.count - 1);
                } catch {}
                break;
              }
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
                    const entries = Array.from(shatterOverlays.entries());
                    for (let k = 0; k < entries.length; k++) {
                      try {
                        const rec = entries[k][1];
                        if (rec && s.overlay && rec.overlay === s.overlay) {
                          rec.count = Math.max(0, rec.count - 1);
                          break;
                        }
                      } catch {}
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
          s.node.style.left = s.x + "px";
          s.node.style.top = s.y + "px";
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
            target.node.style.left = target.x + "px";
            target.node.style.top = target.y + "px";
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
        dragEntry.node.style.left = dragEntry.x + "px";
        dragEntry.node.style.top = dragEntry.y + "px";
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

function freezeHiddenSubtrees(src, dst) {
  try {
    if (!src || !dst) return;
    let hidden = false;
    let invisible = false;
    try {
      const style = window.getComputedStyle(src);
      hidden = style.display === "none";
      invisible = !hidden && style.visibility === "hidden";
    } catch {}
    if (hidden) {
      try {
        dst.style.display = "none";
      } catch {}
      return;
    }
    if (invisible) {
      try {
        dst.style.visibility = "hidden";
      } catch {}
    }
    try {
      const sc = src.children;
      const dc = dst.children;
      const n = Math.min(sc.length, dc.length);
      for (let i = 0; i < n; i++) freezeHiddenSubtrees(sc[i], dc[i]);
    } catch {}
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
    let cols = 3;
    let rows = 2;
    try {
      cols = Math.max(2, Math.min(4, Math.round(rect.width / 220)));
      rows = Math.max(1, Math.min(3, Math.round(rect.height / 220)));
      let guard = 0;
      while (cols * rows > 12 && guard < 10) {
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
            wrapper.style.left = tileX + "px";
            wrapper.style.top = tileY + "px";
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
              freezeHiddenSubtrees(el, clone);
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
      shatterOverlays.set(el, { overlay: overlay, count: shards.length });
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
    const burns = el.querySelectorAll(".stk-burn-blob");
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

function laserStrikeAt(tx, ty) {
  try {
    playShoot();
  } catch {}
  let hit = null;
  try {
    const desk = $$("#taskbar .taskbar-item, #system-tray > *");
    for (let t = 0; t < desk.length; t++) {
      try {
        const node = desk[t];
        if (!node || !node.isConnected) continue;
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        if (
          tx >= rect.left &&
          tx <= rect.right &&
          ty >= rect.top &&
          ty <= rect.bottom
        ) {
          hit = node;
          break;
        }
      } catch {}
    }
  } catch {}
  try {
    if (hit) {
      const rect = hit.getBoundingClientRect();
      impactX = Math.min(Math.max(tx, rect.left), rect.right);
      impactY = Math.min(Math.max(ty, rect.top), rect.bottom);
      try {
        damageTarget(hit);
      } catch {}
      try {
        plantBurn(hit, impactX, impactY);
      } catch {}
      try {
        spawnSparks(tx, ty, 10);
      } catch {}
      return;
    }
    const targets = getLiveTargets();
    for (let t = 0; t < targets.length; t++) {
      try {
        const rect = targets[t].getBoundingClientRect();
        if (
          tx >= rect.left &&
          tx <= rect.right &&
          ty >= rect.top &&
          ty <= rect.bottom
        ) {
          hit = targets[t];
          break;
        }
      } catch {}
    }
    if (!hit) {
      let bestDist = 90;
      for (let t = 0; t < targets.length; t++) {
        try {
          const rect = targets[t].getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) continue;
          const d = Math.hypot(
            rect.left + rect.width / 2 - tx,
            rect.top + rect.height / 2 - ty,
          );
          if (d < bestDist) {
            bestDist = d;
            hit = targets[t];
          }
        } catch {}
      }
    }
  } catch {}
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
export function laserSweepAlong(x1, y1, x2, y2) {
  const steps = 24;
  const hitList = [];
  for (let s = 0; s <= steps; s++) {
    const px = x1 + ((x2 - x1) * s) / steps;
    const py = y1 + ((y2 - y1) * s) / steps;
    let found = null;
    try {
      const desk = $$("#taskbar .taskbar-item, #system-tray > *");
      for (let t = 0; t < desk.length; t++) {
        try {
          const node = desk[t];
          if (!node || !node.isConnected) continue;
          if (hitList.includes(node)) continue;
          const rect = node.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) continue;
          if (
            px >= rect.left &&
            px <= rect.right &&
            py >= rect.top &&
            py <= rect.bottom
          ) {
            found = node;
            break;
          }
        } catch {}
      }
    } catch {}
    if (!found) {
      try {
        const targets = getLiveTargets();
        for (let t = 0; t < targets.length; t++) {
          try {
            if (hitList.includes(targets[t])) continue;
            const rect = targets[t].getBoundingClientRect();
            if (
              px >= rect.left &&
              px <= rect.right &&
              py >= rect.top &&
              py <= rect.bottom
            ) {
              found = targets[t];
              break;
            }
          } catch {}
        }
      } catch {}
    }
    if (found) hitList.push(found);
  }
  for (let i = 0; i < hitList.length; i++) {
    try {
      const rect = hitList[i].getBoundingClientRect();
      const impactX = Math.min(Math.max((x1 + x2) / 2, rect.left), rect.right);
      const impactY = Math.min(Math.max((y1 + y2) / 2, rect.top), rect.bottom);
      damageTarget(hitList[i]);
      plantBurn(hitList[i], impactX, impactY);
      spawnSparks(impactX, impactY, 4);
    } catch {}
  }
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
    let targets = [];
    try {
      targets = getLiveTargets();
    } catch {}
    for (let t = 0; t < targets.length; t++) {
      try {
        const node = targets[t];
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
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
function fireAt(sx, sy, tx, ty) {
  try {
    if (!layer || bullets.length >= 24) return;
    const dx = tx - sx;
    const dy = ty - sy;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.12;
    const speed = 11 + Math.random() * 3;
    const el = createElement("div", { className: "stk-bullet" });
    el.style.left = sx + "px";
    el.style.top = sy + "px";
    layer.appendChild(el);
    bullets.push({
      el: el,
      x: sx,
      y: sy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0,
    });
    try {
      playShoot();
    } catch {}
  } catch {}
}

function updateBullets(dt, dtSec) {
  try {
    let targets = [];
    try {
      targets = getLiveTargets();
    } catch {}
    for (let i = bullets.length - 1; i >= 0; i--) {
      try {
        const b = bullets[i];
        if (!b) {
          bullets.splice(i, 1);
          continue;
        }
        b.vy += 0.12 * dt;
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
        if (!dead && cursorSeen) {
          const dx = b.x - cursorX;
          const dy = b.y - cursorY;
          if (Math.sqrt(dx * dx + dy * dy) <= 26) {
            spawnSparks(b.x, b.y, 5);
            let killed = false;
            try {
              killed = registerCursorHit(b.x, b.y);
            } catch {}
            if (killed) spawnSparks(b.x, b.y, 16);
            dead = true;
          }
        }
        if (!dead) {
          for (let t = 0; t < targets.length; t++) {
            try {
              const rect = targets[t].getBoundingClientRect();
              if (
                b.x >= rect.left &&
                b.x <= rect.right &&
                b.y >= rect.top &&
                b.y <= rect.bottom
              ) {
                impactX = b.x;
                impactY = b.y;
                damageTarget(targets[t]);
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
          b.el.style.left = b.x + "px";
          b.el.style.top = b.y + "px";
        } catch {}
      } catch {}
    }
  } catch {}
}

function updateSparks(dt, dtSec) {
  try {
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
          s.el.style.left = s.x + "px";
          s.el.style.top = s.y + "px";
          s.el.style.opacity = String(Math.max(0, 1 - s.age / 0.6));
        } catch {}
      } catch {}
    }
  } catch {}
}

function checkShardHits() {
  try {
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
    updateBullets(dt, dtSec);
    updateSparks(dt, dtSec);
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

export function spawnStickman(opts) {
  if (active) return;
  try {
    if (layer) {
      try {
        layer.remove();
      } catch {}
      layer = null;
    }
    layer = createElement("div", { className: "stk-layer" });
    document.body.appendChild(layer);
    try {
      actorRef = createStickmanActor(layer, {
        fire: (sx, sy, tx, ty) => {
          try {
            fireAt(sx, sy, tx, ty);
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
        laserSweepAlong: (x1, y1, x2, y2) => {
          try {
            laserSweepAlong(x1, y1, x2, y2);
          } catch {}
        },
      });
    } catch {}
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
      syncDesktopBottom();
    } catch {}
  } catch {}
}

export function despawnStickman() {
  if (!active && !layer) return;
  try {
    active = false;
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
      cleanupCage();
    } catch {}
    try {
      if (actorRef) actorRef.destroy();
    } catch {}
    actorRef = null;
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
