import { $, $$, bindEvent, createElement } from "../../framework.js";
import { playGrab, playHit, playLand, playWooob } from "../chaosSfx.js";
import { isCursorDestroyed } from "./stickmanCursorKill.js";
import { createLaserWeapon } from "./stickmanLaser.js";
import { createTussleController } from "./stickmanTussle.js";
import { POSE_KEYS, pose } from "./stickmanRig.js";
import { moonwalkPose, dodgePose } from "./stickmanMoves.js";
import {
  createJetpack,
  createJetpackRig,
  updateJetpackRig,
} from "./stickmanJetpack.js";
import {
  createRageSystem,
  slamDivePose,
  slamLandPose,
  RAGE_SLAM_LAND_MS,
} from "./stickmanRage.js";
import { createAfterimageCombo } from "./stickmanAfterImage.js";

const NS = "http://www.w3.org/2000/svg";
const INK = "#ff0000";
const INK_BACK = "#ff0000";
const BOX_W = 28;
const BOX_H = 64;
const HIP_X = 14;
const THIGH = 14;
const SHIN = 14;
const TORSO = 17;
const UPPER = 10;
const FORE = 10;
const HEAD_R = 7.5;
const GRAVITY = 0.6;
const STICKMAN_HP = 5;
const STEP_UP = 24;
const JUMP_REACH = 110;
const MOUNT_DEPTH = 48;
const CAGE_FLOOR_PAD = 4;
const PLAT_SCAN_MS = 150;
const MODES = ["walk", "run", "idle", "creep", "rage", "punch", "moonwalk"];
const PUNCH_REACH = 120;
const RAGE_REACH = 220;
const SWORD_REACH = 62;
const DODGE_RADIUS = 96;
const DODGE_CHANCE = 0.55;
const DODGE_CD_MS = 6000;
const DODGE_HOP = 8.4;
const DODGE_PUSH = 8;
const DODGE_POSE_MS = 420;
const LASER_CD_MIN = 26000;
const LASER_CD_MAX = 44000;
const GHOST_COUNT = 3;
const BLADE = "#d8dde6";
const WEAPON_WINDUP = {
  gun: [200, 320],
  rocket: [380, 520],
  grenade: [300, 400],
  knife: [220, 320],
  sword: [320, 420],
};

let platCache = [];
let platScanAt = 0;

function el(tag, attrs) {
  const node = document.createElementNS(NS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  return node;
}

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function ease(rate, dt) {
  return 1 - Math.pow(1 - rate, dt);
}

function f(n) {
  return n.toFixed(1);
}

function norm(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function pathOf(pts) {
  let s = "";
  for (let i = 0; i < pts.length; i++)
    s += (i ? "L" : "M") + f(pts[i].x) + " " + f(pts[i].y);
  return s;
}

function modePose(mode, p, now, both, glance) {
  const s = Math.sin(p);
  const c = Math.cos(p);
  if (mode === "moonwalk") return moonwalkPose(p, now);
  if (mode === "walk") {
    return pose({
      lean: 0.2,
      tilt: 0.18,
      a1: 0.55 * s,
      aK: 0.15 + Math.max(0, c),
      b1: -0.55 * s,
      bK: 0.15 + Math.max(0, -c),
      armA: 0.3 - 0.7 * s,
      armAE: 1.4,
      armB: 0.3 + 0.7 * s,
      armBE: 1.4,
    });
  }
  if (mode === "run") {
    return pose({
      lean: 0.42,
      tilt: 0.25,
      a1: 0.9 * s + 0.1,
      aK: 0.35 + 1.7 * Math.max(0, c),
      b1: -0.9 * s + 0.1,
      bK: 0.35 + 1.7 * Math.max(0, -c),
      armA: 0.2 - 1.1 * s,
      armAE: 1.7,
      armB: 0.2 + 1.1 * s,
      armBE: 1.7,
      shout: 0.3,
    });
  }
  if (mode === "creep") {
    return pose({
      lean: 0.5,
      tilt: 0.3,
      a1: 0.95 + 0.35 * s,
      aK: 1.7 + 0.5 * Math.max(0, c),
      b1: 0.95 - 0.35 * s,
      bK: 1.7 + 0.5 * Math.max(0, -c),
      armA: 0.9,
      armAE: 1.0,
      armB: 0.5,
      armBE: 1.6,
    });
  }
  if (mode === "rage") {
    const st = Math.max(0, s);
    return pose({
      lean: 0.3,
      tilt: 0.25 + 0.12 * Math.sin(p * 5),
      a1: 0.9 * st,
      aK: 0.15 + 1.6 * st,
      b1: -0.25,
      bK: 0.3,
      armA: 2.4 + 0.35 * Math.sin(p * 3.3),
      armAE: 0.5 + 0.4 * Math.sin(p * 3.3 + 1),
      armB: both
        ? 2.2 + 0.35 * Math.sin(p * 3.3 + 2)
        : 0.5 + 0.3 * Math.sin(p * 2.1),
      armBE: both ? 0.6 : 1.8,
      shout: 0.9,
    });
  }
  if (mode === "punch") {
    const eA = Math.pow(Math.max(0, s), 0.7);
    const eB = Math.pow(Math.max(0, -s), 0.7);
    return pose({
      lean: 0.18 + 0.12 * Math.max(eA, eB),
      tilt: 0.2,
      a1: 0.55,
      aK: 0.5,
      b1: -0.5,
      bK: 0.4,
      armA: 0.7 + 0.85 * eA,
      armAE: 2.0 * (1 - eA),
      armB: 0.5 + 0.9 * eB,
      armBE: 2.0 * (1 - eB),
      shout: 0.2 + 0.6 * Math.max(eA, eB),
    });
  }
  if (mode === "stomp") {
    const up = Math.max(0, s);
    const down = Math.max(0, -s);
    return pose({
      lean: 0.3 + 0.15 * down,
      tilt: 0.2,
      a1: 0.2 + 1.5 * up,
      aK: 0.4 + 1.2 * up,
      b1: 0.5,
      bK: 1.4,
      armA: 2.4 - 1.6 * down,
      armAE: 0.6,
      armB: 2.0 - 1.4 * down,
      armBE: 0.8,
      shout: 0.7,
    });
  }
  const b = Math.sin(now * 0.005);
  return pose({
    lean: 0.14 + 0.02 * b,
    tilt: 0.1 + glance,
    a1: 0.3,
    aK: 0.15,
    b1: -0.28,
    bK: 0.2,
    armA: 0.55 + 0.04 * b,
    armAE: 1.9,
    armB: 0.2,
    armBE: 2.0,
  });
}

function airPose(vy, flipping) {
  if (flipping) {
    return pose({
      lean: 0.5,
      tilt: 0.3,
      a1: 1.5,
      aK: 2.5,
      b1: 1.35,
      bK: 2.5,
      armA: 1.2,
      armAE: 2.0,
      armB: 1.0,
      armBE: 2.2,
      shout: 1,
    });
  }
  if (vy < -1.5) {
    return pose({
      lean: 0.25,
      tilt: -0.2,
      a1: 0.85,
      aK: 1.5,
      b1: 0.2,
      bK: 0.9,
      armA: 2.7,
      armAE: 0.2,
      armB: 2.3,
      armBE: 0.4,
      shout: 1,
    });
  }
  if (vy > 1.5) {
    return pose({
      lean: 0.1,
      tilt: 0.1,
      a1: 0.45,
      aK: 0.3,
      b1: -0.5,
      bK: 0.6,
      armA: 1.6,
      armAE: 0.2,
      armB: -1.3,
      armBE: 0.3,
      shout: 0.6,
    });
  }
  return pose({
    lean: 0.2,
    tilt: 0,
    a1: 0.7,
    aK: 1.1,
    b1: -0.2,
    bK: 0.9,
    armA: 2.0,
    armAE: 0.3,
    armB: 1.8,
    armBE: 0.4,
    shout: 0.8,
  });
}

function angelPose(p, now) {
  const s = Math.sin(p * 0.6);
  const sway = Math.sin(now * 0.0018) * 0.08;
  return pose({
    lean: 0.1 + sway,
    tilt: 0.05,
    a1: 0.22 + s * 0.12,
    aK: 0.3,
    b1: -0.18 - s * 0.12,
    bK: 0.26,
    armA: 1.42 + s * 0.06,
    armAE: 0.18,
    armB: -1.42 - s * 0.06,
    armBE: 0.18,
    shout: 0,
  });
}

function crouchPose(windup) {
  return pose({
    lean: 0.45,
    tilt: 0.25,
    a1: 1.1,
    aK: 2.0,
    b1: 0.9,
    bK: 2.0,
    armA: windup ? -0.8 : 1.0,
    armAE: windup ? 0.8 : 1.0,
    armB: windup ? -1.0 : 0.6,
    armBE: windup ? 0.8 : 1.2,
    shout: 0.3,
  });
}

function sleepPose(now) {
  const breathe = Math.sin(now * 0.0016) * 0.05;
  return pose({
    lean: 0.5 + breathe,
    tilt: 0.55,
    a1: 1.3,
    aK: 2.3,
    b1: 1.1,
    bK: 2.3,
    armA: 0.9,
    armAE: 1.2,
    armB: 0.7,
    armBE: 1.4,
    shout: 0,
  });
}

function hangPose(p, now) {
  const s = Math.sin(p * 0.7 + now * 0.0015) * 0.1;
  return pose({
    lean: s,
    tilt: 0.08,
    a1: 0.2 + s,
    aK: 0.55,
    b1: -0.15 + s,
    bK: 0.5,
    armA: 2.9,
    armAE: 0.3,
    armB: 2.7,
    armBE: 0.35,
    shout: 0,
  });
}

function scanPlatforms(now, floorTop) {
  if (now - platScanAt < PLAT_SCAN_MS && platCache) return platCache;
  const found = [];
  try {
    platScanAt = now;
    const floorLine =
      typeof floorTop === "number" ? floorTop : window.innerHeight;
    const wins = $$(".window");
    for (let i = 0; i < wins.length && i < 24; i++) {
      try {
        const node = wins[i];
        if (!node) continue;
        try {
          if (node.closest && node.closest(".stk-layer")) continue;
        } catch {}
        if (!node.isConnected) continue;
        if (node.offsetWidth < 120) continue;
        const rect = node.getBoundingClientRect();
        if (!rect || rect.width < 120 || rect.height <= 0) continue;
        if (rect.top >= floorLine - 4) continue;
        found.push({ left: rect.left, right: rect.right, top: rect.top });
      } catch {}
    }
  } catch {}
  platCache = found;
  return found;
}

function crossSurface(feetX, prevFeet, feet, floorTop) {
  let best = -1;
  if (floorTop >= prevFeet - 2 && floorTop <= feet) best = floorTop;
  const plats = scanPlatforms(performance.now(), floorTop);
  if (plats) {
    for (let i = 0; i < plats.length; i++) {
      try {
        const p = plats[i];
        if (feetX < p.left - 4 || feetX > p.right + 4) continue;
        if (p.top < prevFeet - 2 || p.top > feet) continue;
        if (best < 0 || p.top < best) best = p.top;
      } catch {}
    }
  }
  return best < 0 ? null : { top: best };
}

function surfaceAhead(aheadX, feet, minAbove, maxAbove, floorTop) {
  let best = -1;
  const plats = scanPlatforms(performance.now(), floorTop);
  if (!plats) return null;
  for (let i = 0; i < plats.length; i++) {
    try {
      const p = plats[i];
      if (aheadX < p.left - 2 || aheadX > p.right + 2) continue;
      const above = feet - p.top;
      if (above < minAbove || above > maxAbove) continue;
      if (best < 0 || p.top > best) best = p.top;
    } catch {}
  }
  return best < 0 ? null : { top: best };
}

function mountAssist(feetX, feet, floorTop) {
  let best = -1;
  try {
    const plats = scanPlatforms(performance.now(), floorTop);
    if (!plats) return null;
    for (let i = 0; i < plats.length; i++) {
      try {
        const p = plats[i];
        if (feetX < p.left - 2 || feetX > p.right + 2) continue;
        const sunk = feet - p.top;
        if (sunk < -4 || sunk > MOUNT_DEPTH) continue;
        if (best < 0 || p.top > best) best = p.top;
      } catch {}
    }
  } catch {}
  return best < 0 ? null : best;
}

function solve(P, fv, shake, air) {
  const legs = [
    [P.b1, P.bK],
    [P.a1, P.aK],
  ].map(([t, k]) => {
    const kx = Math.sin(t) * THIGH * fv;
    const ky = Math.cos(t) * THIGH;
    const fx = kx + Math.sin(t - k) * SHIN * fv;
    const fy = ky + Math.cos(t - k) * SHIN;
    return { kx, ky, fx, fy };
  });
  const contactHip = BOX_H - Math.max(legs[0].fy, legs[1].fy);
  const hy = contactHip + (BOX_H - THIGH - SHIN - contactHip) * air;
  const hx = HIP_X + shake;
  const tx = Math.sin(P.lean) * TORSO * fv;
  const ty = -Math.cos(P.lean) * TORSO;
  const neck = { x: hx + tx, y: hy + ty };
  const shoulder = { x: hx + tx * 0.92, y: hy + ty * 0.92 };
  const ha = P.lean + P.tilt;
  const headC = {
    x: neck.x + Math.sin(ha) * (HEAD_R + 0.8) * fv,
    y: neck.y - Math.cos(ha) * (HEAD_R + 0.8),
  };
  const arms = [
    [P.armB, P.armBE],
    [P.armA, P.armAE],
  ].map(([a, e]) => {
    const elbow = {
      x: shoulder.x + Math.sin(a) * UPPER * fv,
      y: shoulder.y + Math.cos(a) * UPPER,
    };
    const hand = {
      x: elbow.x + Math.sin(a + e) * FORE * fv,
      y: elbow.y + Math.cos(a + e) * FORE,
    };
    return { elbow, hand };
  });
  return {
    hip: { x: hx, y: hy },
    neck,
    shoulder,
    headC,
    legs: legs.map((l) => ({
      knee: { x: hx + l.kx, y: hy + l.ky },
      foot: { x: hx + l.fx, y: hy + l.fy },
    })),
    arms,
  };
}

export function createStickmanActor(layer, hooks) {
  const draggable = !hooks || hooks.draggable !== false;
  let actor = null;
  let destroyed = false;
  const parts = {};
  const P = pose({});
  let posX = 0;
  let posY = 0;
  let velY = 0;
  let dir = 1;
  let fv = 1;
  let speed = 0;
  let phase = 0;
  let spin = 0;
  let spinRate = 0;
  let flipping = false;
  let flipNext = false;
  let airBlend = 0;
  let wasAir = false;
  let mode = "idle";
  let modeUntil = 0;
  let modeSpeed = 0;
  let rageBoth = false;
  let stompAt = 0;
  let stompHit = true;
  let rage = 0.4;
  let nextJumpAt = 0;
  let pendingJump = 0;
  let windupUntil = 0;
  let landUntil = 0;
  let nextTurnAt = 0;
  let nextGlanceAt = 0;
  let glance = 0;
  let nextShootAt = 0;
  let aiming = false;
  let aimStand = false;
  let aimTarget = null;
  let fireAt = null;
  let aimEndAt = 0;
  let shotsLeft = 0;
  let flashUntil = 0;
  let recoilUntil = 0;
  let laser = null;
  let last = null;
  let muzzle = null;
  let held = false;
  let flying = false;
  let velX = 0;
  let grabDX = 0;
  let grabDY = 0;
  let samples = [];
  let dragPX = 0;
  let dragPY = 0;
  let dragVX = 0;
  let dragVY = 0;
  let sway = 0;
  let swayV = 0;
  let trailA = 0;
  let spinV = 0;
  let trailB = 0;
  let prevVang = 0;
  let pinDot = null;
  let lastPX = 0;
  let lastPY = 0;
  let prevCX = 0;
  let prevCY = 0;
  let punchPhase = 0;
  let landTimer = null;
  let cageMode = "walk";
  let cageUntil = 0;
  let nextAutoJumpAt = 0;
  let moveHandler = null;
  let upHandler = null;
  let downHandler = null;
  let clickHandler = null;
  let introUntil = 0;
  let introBaseY = 0;
  let introToY = 0;
  let introStartAt = 0;
  let lastCageHit = 0;
  let hp = STICKMAN_HP;
  let koUntil = 0;
  let tussle = null;
  let weapon = "gun";
  let windSpan = 300;
  let recoilSpan = 140;
  let slashStart = 0;
  let slashUntil = 0;
  let slashDone = true;
  let tipTrail = [];
  let sq = 0;
  let sqV = 0;
  let ghosts = [];
  let ghostTick = 0;
  let ghostPX = 0;
  let ghostPY = 0;
  let pivotOverride = null;
  let stepDustAt = 0;
  let dodgeUntil = 0;
  let dodgeCooldownAt = 0;
  let laserCooldownAt = 0;
  let jet = null;
  let jetRig = null;
  let jetLevel = 0;
  let jetNozzle = null;
  let landImpact = 0;
  let rageSys = null;
  let combo = null;
  let comboOpacity = 1;
  let slamArmed = false;
  let slamAir = false;
  let slamDived = false;
  let slamVX = 0;
  let slamLandUntil = 0;

  function isVisible(node) {
    try {
      if (node.getClientRects().length === 0) return false;
      const style = window.getComputedStyle(node);
      return style.display !== "none" && style.visibility !== "hidden";
    } catch {
      return false;
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

  function resolveFloor() {
    try {
      if (hooks && typeof hooks.getFloor === "function") {
        const value = hooks.getFloor();
        if (typeof value === "number" && isFinite(value)) return value;
      }
    } catch {}
    try {
      return window.innerHeight;
    } catch {
      return posY + BOX_H;
    }
  }

  function resolveCursor() {
    try {
      if (hooks && typeof hooks.getCursor === "function") {
        const current = hooks.getCursor();
        if (
          current &&
          typeof current.x === "number" &&
          typeof current.y === "number"
        ) {
          return { x: current.x, y: current.y, seen: !!current.seen };
        }
      }
    } catch {}
    return { x: -9999, y: -9999, seen: false };
  }

  function pickTarget() {
    const cx = posX + 14;
    const cy = posY + 30;
    try {
      const cursor = resolveCursor();
      if (!isCursorDestroyed() && cursor.seen) {
        if (Math.hypot(cursor.x - cx, cursor.y - cy) <= 420) {
          return { x: cursor.x, y: cursor.y };
        }
        if (Math.random() < 0.5) {
          let gx = cursor.x;
          let gy = cursor.y;
          try {
            gx = clamp(gx, 0, window.innerWidth);
            gy = clamp(gy, 0, window.innerHeight);
          } catch {}
          return { x: gx, y: gy };
        }
      }
      const menu = $("#start-menu");
      if (isMenuOpen(menu)) {
        const rect = menu.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
      let best = null;
      let bestDist = Infinity;
      const consider = (list, limit, minW, minH) => {
        for (let i = 0; i < list.length && i < limit; i++) {
          const node = list[i];
          try {
            if (
              !node ||
              (node.closest && node.closest(".stk-layer")) ||
              !isVisible(node)
            )
              continue;
            if (node.offsetWidth < minW || node.offsetHeight < minH) continue;
            const rect = node.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) continue;
            const wx = rect.left + rect.width / 2;
            const wy = rect.top + rect.height / 2;
            const d = Math.hypot(wx - cx, wy - cy);
            if (d < bestDist) {
              bestDist = d;
              best = { x: wx, y: wy };
            }
          } catch {}
        }
      };
      consider($$(".window"), 50, 200, 120);
      consider($$("#desktop > .icon"), 60, 0, 0);
      if (best) return best;
      const bar = $("#taskbar");
      if (bar && isVisible(bar)) {
        const rect = bar.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };
        }
      }
    } catch {}
    try {
      return {
        x: clamp(cx + rand(-180, 180), 0, window.innerWidth),
        y: clamp(posY + rand(-160, 60), 0, window.innerHeight),
      };
    } catch {
      return { x: cx, y: posY };
    }
  }

  function modePool(dist) {
    if (dist < PUNCH_REACH) return ["punch", "walk", "run", "creep", "idle"];
    return ["walk", "run", "creep", "idle"];
  }

  function chooseMode(now) {
    const cur = resolveCursor();
    let near = false;
    let dist = 9999;
    let cdx = 0;
    if (cur.seen) {
      cdx = cur.x - (posX + 14);
      dist = Math.hypot(cdx, cur.y - (posY + 30));
      near = dist < 520;
    }
    let next;
    if (near && Math.random() < 0.6) {
      if (dist < 120) next = Math.random() < 0.5 ? "punch" : "rage";
      else if (dist < 200) next = "run";
      else next = Math.random() < 0.6 ? "run" : "walk";
      if (Math.abs(cdx) > 30) dir = cdx > 0 ? 1 : -1;
    } else {
      const roll = Math.random();
      next =
        roll < 0.42
          ? "walk"
          : roll < 0.72
            ? "run"
            : roll < 0.86
              ? "idle"
              : "creep";
      if (Math.random() < 0.14) next = "moonwalk";
      if (Math.random() < 0.3) dir = -dir;
    }
    const pool = modePool(near ? dist : Infinity);
    const allowed = next === "moonwalk" || pool.indexOf(next) !== -1;
    if (next === mode || !allowed) {
      let options = pool.filter((m) => m !== mode);
      if (!options.length) options = pool;
      next = options[Math.floor(Math.random() * options.length)];
    }
    mode = next;
    const spans = {
      walk: [3600, 7000],
      run: [2400, 5000],
      idle: [900, 1600],
      creep: [2800, 5200],
      rage: [2000, 3600],
      punch: [1500, 2600],
      moonwalk: [2400, 4200],
    };
    const span = spans[mode];
    modeUntil = now + rand(span[0], span[1]);
    modeSpeed =
      mode === "walk"
        ? rand(0.7, 1.1)
        : mode === "run"
          ? rand(1.6, 2.3)
          : mode === "creep"
            ? rand(0.4, 0.6)
            : mode === "moonwalk"
              ? rand(0.5, 0.85)
              : 0;
    const fury = rageSys ? rageSys.intensity() : 0;
    if (
      fury > 0.25 &&
      (mode === "walk" ||
        mode === "creep" ||
        mode === "idle" ||
        mode === "moonwalk") &&
      Math.random() < fury
    ) {
      mode = "run";
      modeSpeed = rand(1.6, 2.3);
    }
    modeUntil = now + (modeUntil - now) * (1 - 0.4 * fury);
    rageBoth = Math.random() < 0.5;
    if (mode === "stomp") {
      stompAt = now + 350;
      stompHit = false;
    }
  }

  function chooseCageMode(now) {
    const options = [
      ["walk", 0.3],
      ["crouch", 0.22],
      ["sleep", 0.22],
      ["hang", 0.18],
      ["punch", 0.08],
    ];
    let total = 0;
    for (let i = 0; i < options.length; i++) {
      if (options[i][0] === cageMode) continue;
      total += options[i][1];
    }
    let roll = Math.random() * total;
    let next = cageMode === "walk" ? "crouch" : "walk";
    for (let i = 0; i < options.length; i++) {
      if (options[i][0] === cageMode) continue;
      if (roll < options[i][1]) {
        next = options[i][0];
        break;
      }
      roll -= options[i][1];
    }
    cageMode = next;
    const spans = {
      walk: [2600, 5600],
      crouch: [2000, 3600],
      sleep: [3200, 6000],
      hang: [2800, 5200],
      punch: [900, 1400],
    };
    const span = spans[next];
    cageUntil = now + rand(span[0], span[1]);
  }

  function callHook(name, a, b, c, d, e) {
    try {
      if (hooks && typeof hooks[name] === "function")
        return hooks[name](a, b, c, d, e);
    } catch {}
    return undefined;
  }

  function chooseWeapon(target) {
    let dist = 999;
    try {
      dist = Math.hypot(target.x - (posX + 14), target.y - (posY + 30));
    } catch {}
    const r = Math.random();
    if (dist < SWORD_REACH + 40 && r < 0.65) return "sword";
    if (r < 0.32) return "gun";
    if (r < 0.5) return "rocket";
    if (r < 0.7) return "grenade";
    return "knife";
  }

  function beginAim(now) {
    aiming = true;
    aimTarget = pickTarget();
    weapon = chooseWeapon(aimTarget);
    aimStand = weapon === "sword" ? true : Math.random() < 0.6;
    if (weapon === "gun")
      shotsLeft = Math.random() < 0.3 ? 2 + Math.floor(Math.random() * 2) : 1;
    else if (weapon === "knife") shotsLeft = 2 + Math.floor(Math.random() * 2);
    else shotsLeft = 1;
    const span = WEAPON_WINDUP[weapon];
    windSpan = rand(span[0], span[1]);
    fireAt = now + windSpan;
    aimEndAt = Infinity;
    slashStart = 0;
    slashUntil = 0;
    slashDone = true;
    tipTrail = [];
  }

  function tryLaser(now) {
    try {
      if (!laser) return false;
      if (now < laserCooldownAt) return false;
      if (!laser.begin(now, pickTarget())) return false;
      laserCooldownAt = now + rand(LASER_CD_MIN, LASER_CD_MAX);
      return true;
    } catch {
      return false;
    }
  }

  function doFire(now) {
    const sx = muzzle ? posX + muzzle.x : posX + 14;
    const sy = muzzle ? posY + muzzle.y : posY + 20;
    try {
      if (weapon === "gun") {
        callHook("fire", sx, sy, aimTarget.x, aimTarget.y);
        flashUntil = now + 90;
        recoilSpan = 140;
      } else if (weapon === "rocket") {
        callHook("fireWeapon", "rocket", sx, sy, aimTarget.x, aimTarget.y);
        flashUntil = now + 140;
        recoilSpan = 300;
        callHook("dust", posX + 14 - dir * 10, posY + BOX_H, 0.6);
        callHook("shake", 0.35);
      } else if (weapon === "sword") {
        slashStart = now;
        slashUntil = now + 200;
        slashDone = false;
        tipTrail = [];
        recoilSpan = 200;
      } else {
        callHook("fireWeapon", weapon, sx, sy, aimTarget.x, aimTarget.y);
        recoilSpan = 220;
      }
    } catch {}
    recoilUntil = now + recoilSpan;
  }

  function tickAim(now) {
    if (!slashDone && now >= slashStart + 80) {
      slashDone = true;
      callHook("slash", posX + 14, posY + 26, SWORD_REACH, dir);
      callHook("shake", 0.2);
    }
    if (fireAt !== null && now >= fireAt) {
      doFire(now);
      shotsLeft--;
      if (shotsLeft > 0) {
        windSpan = rand(140, 210);
        fireAt = now + windSpan;
        aimTarget = pickTarget();
      } else {
        fireAt = null;
        aimEndAt = now + rand(weapon === "sword" ? 320 : 260, 420);
      }
    }
    if (fireAt === null && now >= aimEndAt) {
      aiming = false;
      nextShootAt = now + rand(1200, 2600);
    }
  }

  function onGrabDown(e) {
    if (destroyed) return;
    try {
      held = true;
      try {
        if (laser) laser.cancel();
      } catch {}
      try {
        introUntil = 0;
      } catch {}
      try {
        if (jet) jet.stop(performance.now(), true);
      } catch {}
      try {
        if (combo) combo.cancel(performance.now());
      } catch {}
      slamArmed = false;
      slamAir = false;
      slamDived = false;
      playGrab();
      flying = false;
      velX = 0;
      velY = 0;
      aiming = false;
      fireAt = null;
      pendingJump = 0;
      grabDX = posX - e.clientX;
      grabDY = posY - e.clientY;
      dragPX = posX;
      dragPY = posY;
      dragVX = 0;
      dragVY = 0;
      sway = 0;
      swayV = 0;
      trailA = 0;
      spinV = 0;
      trailB = 0;
      prevVang = 0;
      punchPhase = 0;
      samples = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
      lastPX = e.clientX;
      lastPY = e.clientY;
      prevCX = e.clientX;
      prevCY = e.clientY;
      try {
        if (pinDot && pinDot.remove) pinDot.remove();
      } catch {}
      pinDot = null;
      try {
        pinDot = el("circle", {
          cx: -grabDX,
          cy: -grabDY,
          r: 0.6,
          fill: "none",
          "pointer-events": "none",
        });
        if (parts.root) parts.root.appendChild(pinDot);
      } catch {}
      if (landTimer) {
        try {
          clearTimeout(landTimer);
        } catch {}
        landTimer = null;
      }
      try {
        if (actor) actor.classList.remove("stk-land");
      } catch {}
      try {
        e.preventDefault();
      } catch {}
    } catch {}
  }

  function onClickPulse(e) {
    try {
      if (destroyed) return;
      const now = performance.now();
      if (held || flying || koUntil || now < introUntil) return;
      if (pendingJump > 0 || now < landUntil) return;
      if (tussle && tussle.isActive()) return;
      if (combo && combo.isActive(now)) return;
      if (slamAir || slamArmed) return;
      try {
        if (actor && e.target && actor.contains && actor.contains(e.target))
          return;
      } catch {}
      const cx = posX + BOX_W / 2;
      const cy = posY + BOX_H / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
      if (Math.hypot(dx, dy) > DODGE_RADIUS) return;
      try {
        if (isCursorDestroyed()) return;
      } catch {}
      callHook("clickRipple", e.clientX, e.clientY);
      if (now < dodgeCooldownAt || Math.random() > DODGE_CHANCE) {
        dir = dx === 0 ? dir : dx > 0 ? -1 : 1;
        sq = 0.26;
        sqV = 0;
        playHit();
        callHook("dust", cx - dir * 6, posY + BOX_H, 0.3);
        return;
      }
      dodgeCooldownAt = now + DODGE_CD_MS;
      dodgeUntil = now + DODGE_POSE_MS;
      try {
        if (jet) jet.stop(now, true);
      } catch {}
      const away = dx === 0 ? (Math.random() < 0.5 ? -1 : 1) : dx > 0 ? -1 : 1;
      dir = away;
      aiming = false;
      fireAt = null;
      pendingJump = 0;
      try {
        if (laser) laser.cancel();
      } catch {}
      velX = away * DODGE_PUSH;
      velY = -DODGE_HOP;
      flying = true;
      wasAir = true;
      flipping = true;
      spinRate = (away * Math.PI * 2) / ((2 * DODGE_HOP) / GRAVITY);
      sqV = 0.12;
      playGrab();
      callHook("dust", cx + away * 8, posY + BOX_H, 0.45);
    } catch {}
  }

  function onGrabMove(e) {
    if (!held || destroyed) return;
    try {
      posX = e.clientX + grabDX;
      posY = e.clientY + grabDY;
      try {
        const maxLocalX = Math.max(0, window.innerWidth - BOX_W);
        if (posX < 0) posX = 0;
        if (posX > maxLocalX) posX = maxLocalX;
        if (posY < 0) posY = 0;
      } catch {}
      try {
        actor.style.left = posX + "px";
      } catch {}
      try {
        actor.style.top = posY + "px";
      } catch {}
      lastPX = e.clientX;
      lastPY = e.clientY;
      try {
        samples.push({ x: e.clientX, y: e.clientY, t: performance.now() });
        while (samples.length > 8) samples.shift();
      } catch {}
    } catch {}
  }

  function onGrabUp(e) {
    if (!held || destroyed) return;
    try {
      held = false;
      try {
        if (pinDot && pinDot.remove) pinDot.remove();
      } catch {}
      pinDot = null;
      try {
        samples.push({ x: e.clientX, y: e.clientY, t: performance.now() });
        while (samples.length > 8) samples.shift();
      } catch {}
      let vx = 0;
      let vy = 0;
      try {
        if (samples.length >= 2) {
          const lastSample = samples[samples.length - 1];
          let firstSample = samples[0];
          try {
            for (let i = samples.length - 1; i >= 0; i--) {
              if (lastSample.t - samples[i].t > 120) {
                firstSample = samples[i + 1] || samples[i];
                break;
              }
              firstSample = samples[i];
            }
          } catch {}
          const dtm = lastSample.t - firstSample.t;
          const safeDtm = dtm < 16 ? 16 : dtm;
          vx = ((lastSample.x - firstSample.x) / safeDtm) * 16.7;
          vy = ((lastSample.y - firstSample.y) / safeDtm) * 16.7;
        }
      } catch {}
      velX = clamp(vx, -18, 18);
      velY = clamp(vy, -18, 18);
      if (Math.abs(spinV) > 0.12) {
        flipping = true;
        spinRate = clamp(spinV, -0.6, 0.6);
      } else {
        flipping = false;
      }
      spinV = 0;
      flying = true;
      wasAir = true;
      try {
        if (Math.abs(velX) < 6 && Math.abs(velY) < 6) {
          const mountTop = mountAssist(
            posX + BOX_W / 2,
            posY + BOX_H,
            resolveFloor(),
          );
          if (mountTop !== null) {
            posY = mountTop - BOX_H;
            velX = 0;
            velY = 0;
            flying = false;
          }
        }
      } catch {}
      try {
        actor.style.left = posX + "px";
      } catch {}
      try {
        actor.style.top = posY + "px";
      } catch {}
    } catch {}
  }

  function circlePath(c) {
    return (
      "M" +
      f(c.x - HEAD_R) +
      " " +
      f(c.y) +
      "a" +
      HEAD_R +
      " " +
      HEAD_R +
      " 0 1 0 " +
      HEAD_R * 2 +
      " 0a" +
      HEAD_R +
      " " +
      HEAD_R +
      " 0 1 0 " +
      -HEAD_R * 2 +
      " 0"
    );
  }

  function bodyPath(j) {
    return (
      pathOf([j.hip, j.legs[0].knee, j.legs[0].foot]) +
      pathOf([j.hip, j.legs[1].knee, j.legs[1].foot]) +
      pathOf([j.shoulder, j.arms[0].elbow, j.arms[0].hand]) +
      pathOf([j.shoulder, j.arms[1].elbow, j.arms[1].hand]) +
      pathOf([j.hip, j.neck]) +
      circlePath(j.headC)
    );
  }

  function updateGhosts(j, pv) {
    const dx = posX - ghostPX;
    const dy = posY - ghostPY;
    ghostPX = posX;
    ghostPY = posY;
    const fast = Math.hypot(dx, dy) > 4.5;
    ghostTick += 1;
    if (fast && ghostTick % 2 === 0) {
      ghosts.push({
        d: bodyPath(j),
        x: posX,
        y: posY,
        rot: spin * 57.2958,
        px: pv.x,
        py: pv.y,
      });
      if (ghosts.length > GHOST_COUNT) ghosts.shift();
    } else if (!fast && ghosts.length && ghostTick % 2 === 0) {
      ghosts.shift();
    }
    for (let i = 0; i < parts.ghosts.length; i++) {
      const gp = parts.ghosts[i];
      const item = ghosts[ghosts.length - 1 - i];
      if (!item) {
        gp.setAttribute("display", "none");
        continue;
      }
      gp.setAttribute("display", "inline");
      gp.setAttribute("d", item.d);
      gp.setAttribute("opacity", (0.34 - i * 0.1).toFixed(2));
      gp.setAttribute(
        "transform",
        "translate(" +
          f(item.x - posX) +
          " " +
          f(item.y - posY) +
          ") rotate(" +
          f(item.rot) +
          " " +
          f(item.px) +
          " " +
          f(item.py) +
          ")",
      );
    }
  }

  function stepSquash(dt) {
    sqV += (-sq * 0.32 - sqV * 0.2) * dt;
    sq = clamp(sq + sqV * dt, -0.4, 0.4);
  }

  function draw(j, now) {
    const pv = pivotOverride || { x: HIP_X, y: j.hip.y - 8 };
    const stretch =
      airBlend > 0.5 && !flipping && !pivotOverride
        ? clamp(Math.abs(velY) * 0.01, 0, 0.12)
        : 0;
    const scY = 1 + sq + stretch;
    const scX = 1 - (sq + stretch) * 0.6;
    parts.root.setAttribute(
      "transform",
      "translate(" +
        HIP_X +
        " " +
        BOX_H +
        ") scale(" +
        scX.toFixed(3) +
        " " +
        scY.toFixed(3) +
        ") translate(" +
        -HIP_X +
        " " +
        -BOX_H +
        ") rotate(" +
        f(spin * 57.2958) +
        " " +
        f(pv.x) +
        " " +
        f(pv.y) +
        ")",
    );
    parts.legB.setAttribute(
      "d",
      pathOf([j.hip, j.legs[0].knee, j.legs[0].foot]),
    );
    parts.legA.setAttribute(
      "d",
      pathOf([j.hip, j.legs[1].knee, j.legs[1].foot]),
    );
    parts.armB.setAttribute(
      "d",
      pathOf([j.shoulder, j.arms[0].elbow, j.arms[0].hand]),
    );
    parts.armA.setAttribute(
      "d",
      pathOf([j.shoulder, j.arms[1].elbow, j.arms[1].hand]),
    );
    parts.torso.setAttribute("d", pathOf([j.hip, j.neck]));
    jetNozzle = updateJetpackRig(jetRig, j, fv, jetLevel, now);

    parts.head.setAttribute("cx", f(j.headC.x));
    parts.head.setAttribute("cy", f(j.headC.y));

    const veinOn = clamp((rage - 0.55) * 3, 0, 1);
    const pulse = 0.8 + 0.15 * Math.sin(now * 0.03);
    parts.vein.setAttribute("opacity", veinOn.toFixed(2));
    parts.vein.setAttribute(
      "transform",
      "translate(" +
        f(j.headC.x + fv * 6.6) +
        " " +
        f(j.headC.y - 7.4) +
        ") scale(" +
        pulse.toFixed(2) +
        ")",
    );

    const hand = j.arms[1].hand;
    const elbow = j.arms[1].elbow;
    let fx = hand.x - elbow.x;
    let fy = hand.y - elbow.y;
    const len = Math.hypot(fx, fy);
    if (len > 0.001) {
      fx /= len;
      fy /= len;
    } else {
      fx = fv;
      fy = 0;
    }
    let px = -fy;
    let py = fx;
    if (py < 0) {
      px = -px;
      py = -py;
    }
    let tip = { x: hand.x + fx * 7, y: hand.y + fy * 7 };
    let showGun = false;
    let gunD = "";
    let gunW = 2.8;
    let gunColor = INK;
    let showBall = false;
    const armed = aiming || now < slashUntil;
    if (armed) {
      if (weapon === "gun") {
        const gs = { x: hand.x + fx * 1.5, y: hand.y + fy * 1.5 };
        gunD =
          pathOf([hand, tip]) +
          pathOf([gs, { x: gs.x + px * 3.4, y: gs.y + py * 3.4 }]);
        showGun = true;
      } else if (weapon === "rocket") {
        tip = { x: hand.x + fx * 14, y: hand.y + fy * 14 };
        gunD = pathOf([{ x: hand.x - fx * 9, y: hand.y - fy * 9 }, tip]);
        gunW = 5.4;
        showGun = true;
      } else if (weapon === "knife") {
        if (fireAt !== null) {
          gunD = pathOf([hand, { x: hand.x + fx * 9, y: hand.y + fy * 9 }]);
          gunW = 2.2;
          gunColor = BLADE;
          showGun = true;
        }
      } else if (weapon === "sword") {
        const st = { x: hand.x + fx * 21, y: hand.y + fy * 21 };
        const gA = {
          x: hand.x + fx * 3 + px * 3.6,
          y: hand.y + fy * 3 + py * 3.6,
        };
        const gB = {
          x: hand.x + fx * 3 - px * 3.6,
          y: hand.y + fy * 3 - py * 3.6,
        };
        gunD = pathOf([hand, st]) + pathOf([gA, gB]);
        gunW = 2.6;
        gunColor = BLADE;
        showGun = true;
        tip = st;
      } else if (weapon === "grenade" && fireAt !== null) {
        showBall = true;
      }
    }
    muzzle = tip;
    if (showGun) {
      parts.gun.setAttribute("display", "inline");
      parts.gun.setAttribute("d", gunD);
      parts.gun.setAttribute("stroke-width", gunW);
      parts.gun.style.stroke = gunColor;
    } else {
      parts.gun.setAttribute("display", "none");
    }
    if (showBall) {
      parts.ball.setAttribute("display", "inline");
      parts.ball.setAttribute("cx", f(hand.x + fx * 2.5));
      parts.ball.setAttribute("cy", f(hand.y + fy * 2.5));
    } else {
      parts.ball.setAttribute("display", "none");
    }
    if (now < slashUntil && weapon === "sword") {
      tipTrail.push({ x: tip.x, y: tip.y });
      while (tipTrail.length > 7) tipTrail.shift();
      if (tipTrail.length > 1) {
        parts.swoosh.setAttribute("display", "inline");
        parts.swoosh.setAttribute("d", pathOf(tipTrail));
      }
    } else {
      if (tipTrail.length) tipTrail = [];
      parts.swoosh.setAttribute("display", "none");
    }
    if (now < flashUntil) {
      const big = weapon === "rocket";
      parts.flash.setAttribute("display", "inline");
      parts.flash.setAttribute("fill", big ? "#ffb347" : "#ffd23c");
      parts.flash.setAttribute("cx", f(tip.x + fx * 2));
      parts.flash.setAttribute("cy", f(tip.y + fy * 2));
      parts.flash.setAttribute("r", f(big ? rand(5, 8) : rand(3, 4.8)));
    } else {
      parts.flash.setAttribute("display", "none");
    }
    updateGhosts(j, pv);
    try {
      if (laser) laser.render(now, posX, posY, j.headC);
    } catch {}
    try {
      if (rageSys) rageSys.applyGlow(actor, now);
    } catch {}
    try {
      const op = comboOpacity < 0.999 ? comboOpacity.toFixed(2) : "";
      if (actor && actor.style.opacity !== op) actor.style.opacity = op;
    } catch {}
  }

  function hangFrame(now, dt) {
    const st = tussle ? tussle.getStatus() : null;
    if (!st || st.phase !== "hang") return;
    phase += (0.05 + Math.abs(st.swingV) * 0.4) * dt;
    const target = tussle.getPose(now, phase, dir) || hangPose(phase, now);
    const hk = ease(0.35, dt);
    for (let i = 0; i < POSE_KEYS.length; i++)
      P[POSE_KEYS[i]] += (target[POSE_KEYS[i]] - P[POSE_KEYS[i]]) * hk;
    if (st.goal) {
      const gx = st.goal.x - st.x;
      if (Math.abs(gx) > 10) dir = gx > 0 ? 1 : -1;
    }
    fv += (dir - fv) * ease(0.3, dt);
    airBlend += (1 - airBlend) * ease(0.3, dt);
    rage += (0.95 - rage) * ease(0.1, dt);
    sq = 0;
    sqV = 0;
    velX = 0;
    velY = 0;
    flying = false;
    wasAir = false;
    flipping = false;
    spin += (st.swing - spin) * ease(0.6, dt);
    last = solve(P, fv, 0, airBlend);
    const h0 = last.arms[0].hand;
    const h1 = last.arms[1].hand;
    const pivot = { x: (h0.x + h1.x) / 2, y: (h0.y + h1.y) / 2 };
    pivotOverride = pivot;
    const pk = ease(0.5, dt);
    posX += (st.x - pivot.x - posX) * pk;
    posY += (st.y - pivot.y - posY) * pk;
    draw(last, now);
    try {
      actor.style.left = posX + "px";
      actor.style.top = posY + "px";
    } catch {}
  }

  function applyAimPose(t, now) {
    const recoil = clamp((recoilUntil - now) / Math.max(1, recoilSpan), 0, 1);
    const sx = last ? posX + last.shoulder.x : posX + 14;
    const sy = last ? posY + last.shoulder.y : posY + 22;
    const dx = aimTarget.x - sx;
    const dy = aimTarget.y - sy;
    if (Math.abs(dx) > 8) dir = dx > 0 ? 1 : -1;
    const ang = Math.atan2(dx * dir, dy);
    const pre =
      fireAt !== null ? clamp((fireAt - now) / Math.max(1, windSpan), 0, 1) : 0;
    if (weapon === "rocket") {
      t.armA = ang - 0.15 * recoil;
      t.armAE = 0;
      t.armB = ang + 0.45;
      t.armBE = 0.25;
      t.lean += 0.05 - 0.2 * recoil;
      t.tilt -= 0.25 * recoil;
      t.shout = fireAt === null ? 1 : 0.6;
    } else if (weapon === "grenade" || weapon === "knife") {
      const cock = weapon === "knife" ? 1.9 : 2.4;
      t.armA = ang - cock * pre + 0.7 * recoil;
      t.armAE = (weapon === "knife" ? 0.7 : 1.0) * pre;
      t.lean += 0.05 - 0.15 * pre + 0.2 * recoil;
      t.shout = fireAt === null ? 0.9 : 0.6;
    } else if (weapon === "sword") {
      if (slashUntil === 0) {
        t.armA = ang - 2.5 + 0.08 * Math.sin(now * 0.02);
        t.armAE = 0.5;
        t.lean -= 0.1 * (1 - pre);
      } else if (now < slashUntil) {
        const u = clamp(
          (now - slashStart) / Math.max(1, slashUntil - slashStart),
          0,
          1,
        );
        const e = 1 - Math.pow(1 - u, 3);
        t.armA = ang - 2.5 + 3.05 * e;
        t.armAE = 0.5 * (1 - e);
        t.lean += 0.3 * e;
      } else {
        t.armA = ang + 0.55;
        t.armAE = 0;
        t.lean += 0.2;
      }
      t.shout = 1;
    } else {
      t.armA = ang - 0.35 * recoil;
      t.armAE = 0;
      t.lean += 0.05;
      t.tilt -= 0.2 * recoil;
      t.shout = fireAt === null ? 1 : 0.5;
    }
  }

  function buildJetpack() {
    try {
      jet = createJetpack({
        getLayer: () =>
          (hooks &&
            typeof hooks.getFxLayer === "function" &&
            hooks.getFxLayer()) ||
          layer,
        getSize: () => ({ w: BOX_W, h: BOX_H }),
        getFloor: () => resolveFloor(),
        getState: () => ({
          x: posX,
          y: posY,
          velX: velX,
          dir: dir,
          phase: phase,
          aiming: aiming,
        }),
        setState: (patch) => {
          if (!patch) return;
          if (patch.aiming !== undefined) aiming = patch.aiming;
          if (patch.fireAt !== undefined) fireAt = patch.fireAt;
          if (patch.flying !== undefined) flying = patch.flying;
          if (patch.wasAir !== undefined) wasAir = patch.wasAir;
          if (patch.flipping !== undefined) flipping = patch.flipping;
          if (patch.spin !== undefined) spin = patch.spin;
          if (patch.velX !== undefined) velX = patch.velX;
          if (patch.velY !== undefined) velY = patch.velY;
          if (patch.sqV !== undefined) sqV = patch.sqV;
        },
        getHead: () => (last ? last.headC : null),
        getNozzle: () =>
          jetNozzle ? { x: posX + jetNozzle.x, y: posY + jetNozzle.y } : null,
        isLaserBusy: () => !!(laser && laser.isBusy()),
        beginAim: (now) => beginAim(now),
        tickAim: (now) => tickAim(now),
        beginLaser: (now) => {
          try {
            if (Math.random() >= 0.1) return false;
            return tryLaser(now);
          } catch {
            return false;
          }
        },
        tickLaser: (now, dt, x, y, head) => {
          try {
            if (laser) laser.update(now, dt, x, y, head);
          } catch {}
        },
        isTussling: () => !!(tussle && tussle.isActive()),
        interruptTussle: (now) => {
          if (tussle) tussle.interrupt(now);
        },
        resetAim: () => {
          aiming = false;
          fireAt = null;
          nextShootAt = performance.now() + rand(1200, 2600);
        },
        canStart: (now) =>
          !koUntil &&
          !held &&
          !flying &&
          now >= introUntil &&
          pendingJump === 0 &&
          now >= landUntil &&
          !(combo && combo.isActive(now)) &&
          !slamAir &&
          !slamArmed,
        onStart: () => {
          sqV = 0.1;
          playGrab();
          callHook("shake", 0.3);
        },
        onEnd: (now) => {
          modeUntil = now + rand(400, 900);
        },
      });
    } catch {
      jet = null;
    }
  }

  function buildRage() {
    try {
      rageSys = createRageSystem({
        getLayer: () =>
          (hooks &&
            typeof hooks.getFxLayer === "function" &&
            hooks.getFxLayer()) ||
          layer,
        getCursor: () => resolveCursor(),
        cursorDead: () => isCursorDestroyed(),
        getFloor: () => resolveFloor(),
        hitCursor: (x, y) => callHook("hitCursor", x, y),
        stomp: (x, y, r) => callHook("stomp", x, y, r),
      });
    } catch {
      rageSys = null;
    }
  }

  function buildCombo() {
    try {
      combo = createAfterimageCombo({
        getLayer: () =>
          (hooks &&
            typeof hooks.getFxLayer === "function" &&
            hooks.getFxLayer()) ||
          layer,
        getState: () => ({ x: posX, y: posY, dir: dir }),
        setState: (patch) => {
          if (!patch) return;
          if (patch.flying !== undefined) flying = patch.flying;
          if (patch.wasAir !== undefined) wasAir = patch.wasAir;
          if (patch.flipping !== undefined) flipping = patch.flipping;
          if (patch.spin !== undefined) spin = patch.spin;
          if (patch.velX !== undefined) velX = patch.velX;
          if (patch.velY !== undefined) velY = patch.velY;
          if (patch.sqV !== undefined) sqV = patch.sqV;
        },
        getFloor: () => resolveFloor(),
        getCursor: () => resolveCursor(),
        cursorDead: () => isCursorDestroyed(),
        getRage: () => (rageSys ? rageSys.intensity() : 0),
        currentPath: () => (last ? bodyPath(last) : ""),
        pathFor: (target, dirSign) => bodyPath(solve(target, dirSign, 0, 1)),
        hitCursor: (x, y) => callHook("hitCursor", x, y),
        stomp: (x, y, r) => callHook("stomp", x, y, r),
        onWhiff: (now, x, y) => {
          if (rageSys) rageSys.registerEscape(now, x, y);
        },
        resetAim: () => {
          aiming = false;
          fireAt = null;
          nextShootAt = performance.now() + rand(1200, 2600);
        },
        canStart: (now) =>
          !koUntil &&
          !held &&
          !flying &&
          now >= introUntil &&
          pendingJump === 0 &&
          now >= landUntil &&
          !aiming &&
          !(laser && laser.isBusy()) &&
          !(tussle && tussle.isActive()) &&
          !(jet && jet.isActive(now)) &&
          !slamAir &&
          !slamArmed &&
          !callHook("getCage"),
        onStart: () => {
          sqV = 0.1;
          callHook("shake", 0.2);
        },
        onEnd: (now) => {
          comboOpacity = 1;
          modeUntil = now + rand(400, 900);
        },
      });
    } catch {
      combo = null;
    }
  }

  function applyComboFrame(now, dt) {
    const fr = combo.step(now, dt);
    if (!fr) {
      comboOpacity = 1;
      if (!flying) return false;
      try {
        if (last) draw(last, now);
        actor.style.left = posX + "px";
        actor.style.top = posY + "px";
      } catch {}
      return true;
    }
    posX = fr.x;
    posY = fr.y;
    velX = 0;
    velY = 0;
    dir = fr.dir;
    speed = 0;
    flying = false;
    wasAir = true;
    flipping = false;
    pendingJump = 0;
    aiming = false;
    fireAt = null;
    phase += 0.2 * dt;
    const k = ease(fr.snap ? 0.7 : 0.45, dt);
    for (let i = 0; i < POSE_KEYS.length; i++)
      P[POSE_KEYS[i]] += (fr.target[POSE_KEYS[i]] - P[POSE_KEYS[i]]) * k;
    fv = dir;
    airBlend += (1 - airBlend) * ease(0.4, dt);
    rage += (1 - rage) * ease(0.1, dt);
    spin = 0;
    comboOpacity = fr.opacity;
    last = solve(P, fv, 0, airBlend);
    draw(last, now);
    try {
      actor.style.left = posX + "px";
      actor.style.top = posY + "px";
    } catch {}
    return true;
  }

  function applyJetFrame(now, dt) {
    const frameStep = jet.step(now, dt);
    if (!frameStep) {
      if (!flying) return false;
      try {
        if (last) draw(last, now);
        actor.style.left = posX + "px";
        actor.style.top = posY + "px";
      } catch {}
      return true;
    }
    posX = frameStep.x;
    posY = frameStep.y;
    velX = frameStep.velX;
    velY = 0;
    dir = frameStep.dir;
    speed = 0;
    flying = false;
    wasAir = true;
    flipping = false;
    pendingJump = 0;
    phase += frameStep.phaseStep * dt;
    const target = frameStep.target;
    if (aiming && aimTarget) applyAimPose(target, now);
    const k = ease(aiming ? 0.5 : 0.22, dt);
    for (let i = 0; i < POSE_KEYS.length; i++)
      P[POSE_KEYS[i]] += (target[POSE_KEYS[i]] - P[POSE_KEYS[i]]) * k;
    fv += (dir - fv) * ease(0.3, dt);
    airBlend += (1 - airBlend) * ease(0.3, dt);
    rage += (frameStep.rageTarget - rage) * ease(0.08, dt);
    spin += (clamp(velX * 0.035, -0.14, 0.14) - spin) * ease(0.15, dt);
    last = solve(P, fv, Math.sin(now * 0.08) * 0.5, airBlend);
    draw(last, now);
    try {
      actor.style.left = posX + "px";
      actor.style.top = posY + "px";
    } catch {}
    return true;
  }

  function frame(now, dt) {
    pivotOverride = null;
    stepSquash(dt);
    jetLevel += ((jet && jet.isActive(now) ? 1 : 0) - jetLevel) * ease(0.1, dt);
    const floorTop = resolveFloor();
    const groundY = Math.max(0, floorTop - BOX_H);
    const maxX = Math.max(0, window.innerWidth - BOX_W);
    let cageRect = null;
    try {
      if (hooks && typeof hooks.getCage === "function")
        cageRect = hooks.getCage();
    } catch {}
    if (
      jet &&
      jet.isActive(now) &&
      (cageRect || koUntil || held || now < introUntil)
    )
      jet.stop(now, true);
    if (
      combo &&
      combo.isActive(now) &&
      (cageRect || koUntil || held || now < introUntil)
    )
      combo.cancel(now);
    if (
      laser &&
      laser.isBusy() &&
      (held || koUntil || cageRect || flying || now < introUntil)
    ) {
      try {
        laser.cancel();
      } catch {}
    }
    if (cageRect) {
      if (tussle && tussle.isActive()) tussle.interrupt(now);
      try {
        const minX = cageRect.left;
        const maxXc = cageRect.left + cageRect.width - BOX_W;
        const floorC = cageRect.top + cageRect.height - BOX_H - CAGE_FLOOR_PAD;
        posX = clamp(posX, Math.min(minX, maxXc), Math.max(minX, maxXc));
        if (now >= cageUntil) chooseCageMode(now);
        const hanging = cageMode === "hang";
        const targetY = hanging ? cageRect.top + 7 : floorC;
        posY += (targetY - posY) * ease(0.1, dt);
        if (hanging) {
          posX = clamp(posX, minX, maxXc);
        } else {
          if (cageMode === "walk") {
            if (posX <= minX) dir = 1;
            else if (posX >= maxXc) dir = -1;
            posX += dir * 1.4 * dt;
            if (posX <= minX || posX >= maxXc) {
              posX = clamp(posX, minX, maxXc);
              dir = -dir;
            }
          } else if (cageMode === "punch") {
            const nearLeft = posX - minX <= maxXc - posX;
            const target = nearLeft ? minX : maxXc;
            dir = nearLeft ? -1 : 1;
            if (Math.abs(posX - target) > 2) {
              posX = clamp(
                posX + Math.sign(target - posX) * 2.2 * dt,
                minX,
                maxXc,
              );
            } else {
              posX = target;
              if (now - lastCageHit > 250) {
                lastCageHit = now;
                try {
                  playHit();
                } catch {}
                if (hooks && typeof hooks.cagePunch === "function")
                  hooks.cagePunch();
              }
            }
          }
        }
        velY = 0;
        flipping = false;
        spin += ((hanging ? Math.PI : 0) - spin) * ease(0.08, dt);
        airBlend += ((hanging ? 1 : 0) - airBlend) * ease(0.14, dt);
        phase +=
          (cageMode === "punch" ? 0.22 : cageMode === "walk" ? 0.12 : 0.04) *
          dt;
        let ct;
        if (cageMode === "punch") ct = modePose("punch", phase, now, false, 0);
        else if (cageMode === "walk")
          ct = modePose("walk", phase, now, false, 0);
        else if (cageMode === "crouch") ct = crouchPose(false);
        else if (cageMode === "sleep") ct = sleepPose(now);
        else ct = hangPose(phase, now);
        const ck = ease(0.13, dt);
        for (let i = 0; i < POSE_KEYS.length; i++)
          P[POSE_KEYS[i]] += (ct[POSE_KEYS[i]] - P[POSE_KEYS[i]]) * ck;
        fv += (dir - fv) * ease(0.3, dt);
        last = solve(P, fv, 0, airBlend);
        draw(last, now);
        try {
          actor.style.left = posX + "px";
        } catch {}
        try {
          actor.style.top = posY + "px";
        } catch {}
      } catch {}
      return;
    }
    if (
      tussle &&
      tussle.isActive() &&
      (koUntil ||
        held ||
        (flying && !tussle.isLeaping() && !tussle.isHanging()) ||
        now < introUntil ||
        (jet && jet.isActive(now)))
    ) {
      tussle.interrupt(now);
    }
    try {
      if (koUntil && now >= koUntil) {
        koUntil = 0;
        hp = STICKMAN_HP;
      }
    } catch {}
    if (koUntil) {
      try {
        speed += (0 - speed) * ease(0.12, dt);
        spin += (dir * 1.5708 - spin) * ease(0.15, dt);
        velY = 0;
        airBlend += (0 - airBlend) * ease(0.3, dt);
        const kt = modePose("idle", phase, now, false, glance);
        const kk = ease(0.2, dt);
        for (let i = 0; i < POSE_KEYS.length; i++)
          P[POSE_KEYS[i]] += (kt[POSE_KEYS[i]] - P[POSE_KEYS[i]]) * kk;
        fv += (dir - fv) * ease(0.3, dt);
        last = solve(P, fv, 0, airBlend);
        draw(last, now);
        try {
          actor.style.left = posX + "px";
        } catch {}
        try {
          actor.style.top = posY + "px";
        } catch {}
      } catch {}
      return;
    }
    if (now < introUntil) {
      try {
        const span = Math.max(1, introUntil - introStartAt);
        const t = clamp((now - introStartAt) / span, 0, 1);
        const drop = t * t;
        posY =
          introBaseY +
          (introToY - introBaseY) * drop +
          Math.sin(now * 0.004) * 2;
        phase += 0.05 * dt;
        const it = angelPose(phase, now);
        const ik = ease(0.2, dt);
        for (let i = 0; i < POSE_KEYS.length; i++)
          P[POSE_KEYS[i]] += (it[POSE_KEYS[i]] - P[POSE_KEYS[i]]) * ik;
        fv += (dir - fv) * ease(0.3, dt);
        airBlend += (1 - airBlend) * ease(0.25, dt);
        last = solve(P, fv, 0, airBlend);
        draw(last, now);
        try {
          actor.style.left = posX + "px";
        } catch {}
        try {
          actor.style.top = posY + "px";
        } catch {}
      } catch {}
      return;
    }
    if (!held && tussle) tussle.update(now, dt);
    if (!held && tussle && tussle.isHanging()) {
      hangFrame(now, dt);
      return;
    }
    if (held) {
      try {
        const pvx = (lastPX - prevCX) / dt;
        const pvy = (lastPY - prevCY) / dt;
        dragPX = posX;
        dragPY = posY;
        const sk = ease(0.4, dt);
        dragVX += (clamp(pvx, -30, 30) - dragVX) * sk;
        dragVY += (clamp(pvy, -30, 30) - dragVY) * sk;
        const spd = Math.hypot(dragVX, dragVY);
        if (Math.abs(dragVX) > 2.5) dir = dragVX > 0 ? 1 : -1;
        const vang = Math.atan2(dragVY, dragVX);
        let curve = 0;
        if (spd > 1.5)
          curve =
            clamp(norm(vang - prevVang) / dt, -0.5, 0.5) * Math.min(1, spd / 6);
        prevVang = vang;
        spinV += (curve - spinV) * ease(0.25, dt);
        spinV *= Math.pow(0.92, dt);
        spinV += -Math.sin(spin) * 0.02 * dt;
        spin = norm(spin + spinV * dt);
        const target = clamp(-dragVX * 0.05, -0.85, 0.85);
        swayV += ((target - sway) * 0.03 - swayV * 0.06) * dt;
        sway += swayV * dt;
        const flail = clamp(Math.abs(spinV) * 1.6 + spd * 0.03, 0, 1);
        trailB += (sway * 1.2 - spinV * 1.6 - trailB) * ease(0.07, dt);
        const tuck = clamp(-dragVY * 0.02, 0, 0.5) * (1 - flail * 0.5);

        punchPhase += 0.2 * dt;
        const ps = Math.sin(punchPhase);
        const eA = Math.pow(Math.max(0, ps), 0.7);
        const eB = Math.pow(Math.max(0, -ps), 0.7);
        const shx = last ? last.shoulder.x : 14;
        const shy = last ? last.shoulder.y : 22;
        const tdx = -grabDX - shx;
        const tdy = -grabDY - shy;
        const tdist = Math.hypot(tdx, tdy);
        const aim = tdist < 6 ? 2.4 : Math.atan2(tdx * dir, tdy);

        const t = pose({
          lean: sway + spinV * 0.8 + 0.12 * Math.max(eA, eB),
          tilt: 0.12,
          a1: 0.3 + trailB * 0.8 + flail * 0.4,
          aK: 0.45 + tuck,
          b1: 0.3 - trailB * 0.8 - flail * 0.4,
          bK: 0.45 + tuck,
          armA: 0.7 + (aim - 0.7) * eA,
          armAE: 2.0 * (1 - eA),
          armB: 0.5 + (aim - 0.5) * eB,
          armBE: 2.0 * (1 - eB),
          shout: 0.9,
        });
        const hk = ease(0.45, dt);
        for (let i = 0; i < POSE_KEYS.length; i++)
          P[POSE_KEYS[i]] += (t[POSE_KEYS[i]] - P[POSE_KEYS[i]]) * hk;
        fv += (dir - fv) * ease(0.3, dt);
        airBlend += (0 - airBlend) * ease(0.3, dt);
        rage += (0.95 - rage) * ease(0.1, dt);
        last = solve(P, fv, 0, airBlend);
        draw(last, now);
        actor.style.left = posX + "px";
        actor.style.top = posY + "px";
        try {
          if (pinDot) {
            const r = pinDot.getBoundingClientRect();
            posX += lastPX - (r.left + r.width / 2);
            posY += lastPY - (r.top + r.height / 2);
            actor.style.left = posX + "px";
            actor.style.top = posY + "px";
          }
        } catch {}
        prevCX = lastPX;
        prevCY = lastPY;
      } catch {}
      return;
    }

    if (combo) {
      if (!combo.isActive(now) && !flying) combo.tryStart(now);
      if (combo.isActive(now) && applyComboFrame(now, dt)) return;
    }

    if (jet) {
      if (!jet.isActive(now) && !flying) jet.tryStart(now);
      if (jet.isActive(now) && applyJetFrame(now, dt)) return;
    }

    if (flying) {
      slamArmed = false;
      slamAir = false;
      slamDived = false;
      const prevFlyFeet = posY + BOX_H;
      velY += GRAVITY * dt;
      posY += velY * dt;
      posX += velX * dt;
      if (posX <= 0) {
        posX = 0;
        velX = -velX * 0.6;
        if (Math.abs(velX) < 0.3) velX = 0;
      } else if (posX >= maxX) {
        posX = maxX;
        velX = -velX * 0.6;
        if (Math.abs(velX) < 0.3) velX = 0;
      }
      if (posY < 0) {
        posY = 0;
        if (velY < 0) velY = 0;
      }
      let flySurface = null;
      try {
        if (velY >= 0)
          flySurface = crossSurface(
            posX + BOX_W / 2,
            prevFlyFeet,
            posY + BOX_H,
            floorTop,
          );
      } catch {}
      if (flySurface || posY >= groundY) {
        const impact = velY;
        if (flySurface) posY = flySurface.top - BOX_H;
        else posY = groundY;
        try {
          if (tussle && tussle.isLeaping()) tussle.miss(now);
        } catch {}
        sq = -clamp(impact * 0.03, 0.08, 0.34);
        sqV = 0;
        callHook(
          "dust",
          posX + BOX_W / 2,
          posY + BOX_H,
          clamp(impact / 9, 0.4, 1.5),
        );
        if (impact > 12) callHook("shake", clamp(impact / 30, 0.2, 0.6));
        if (rageSys && impact > 7)
          rageSys.landing(now, posX + BOX_W / 2, posY + BOX_H, impact, false);
        velX = 0;
        velY = 0;
        flying = false;
        wasAir = false;
        flipping = false;
        spin = 0;
        speed = 0;
        modeUntil = now + 1000;
        nextJumpAt = now + rand(1500, 3000);
        nextShootAt = now + rand(1200, 2200);
        landUntil = now + 250;
        try {
          actor.classList.add("stk-land");
        } catch {}
        playLand();
        if (landTimer) {
          try {
            clearTimeout(landTimer);
          } catch {}
        }
        landTimer = setTimeout(function () {
          try {
            if (actor) actor.classList.remove("stk-land");
          } catch {}
          landTimer = null;
        }, 250);
      }
      const leapPose =
        tussle && tussle.isLeaping() ? tussle.getPose(now, phase, dir) : null;
      const dodgeActive = now < dodgeUntil;
      let ft =
        leapPose ||
        (dodgeActive ? dodgePose(phase, now) : airPose(velY, flipping));
      const fk = ease(0.28, dt);
      for (let i = 0; i < POSE_KEYS.length; i++)
        P[POSE_KEYS[i]] += (ft[POSE_KEYS[i]] - P[POSE_KEYS[i]]) * fk;
      fv += (dir - fv) * ease(0.3, dt);
      airBlend += (1 - airBlend) * ease(0.3, dt);
      rage += (0.65 - rage) * ease(0.08, dt);
      if (flipping) spin += spinRate * dt;
      else spin *= Math.pow(0.55, dt);
      last = solve(P, fv, 0, airBlend);
      draw(last, now);
      try {
        actor.style.left = posX + "px";
        actor.style.top = posY + "px";
      } catch {}
      return;
    }

    if (now >= modeUntil) chooseMode(now);
    if (now >= nextGlanceAt) {
      glance = rand(-0.3, 0.4);
      nextGlanceAt = now + rand(500, 1500);
    }
    const tussling = !!(tussle && tussle.isActive());
    const laserBusy = laser ? laser.isBusy() : false;
    if (!aiming && !laserBusy && !tussling && now >= nextShootAt) {
      if (Math.random() < 0.12 && tryLaser(now)) {
        nextShootAt = now + rand(1200, 2600);
      } else beginAim(now);
    }
    if (aiming) tickAim(now);
    try {
      if (laser) laser.update(now, dt, posX, posY, last ? last.headC : null);
    } catch {}

    const standing = aiming && aimStand;
    let effective = standing ? "idle" : mode;
    if (tussling) {
      effective = "tussle";
      const goal = tussle.getGoal();
      if (goal) {
        const gx = goal.x - (posX + 14);
        if (Math.abs(gx) > 8) dir = gx > 0 ? 1 : -1;
      }
    }

    const prevFeet = posY + BOX_H;
    velY += GRAVITY * dt;
    posY += velY * dt;
    let grounded = false;
    let groundSurface = null;
    try {
      if (velY >= 0)
        groundSurface = crossSurface(
          posX + BOX_W / 2,
          prevFeet,
          posY + BOX_H,
          floorTop,
        );
    } catch {}
    if (groundSurface || posY >= groundY) {
      let slamFall = false;
      try {
        slamFall = wasAir && velY > 6;
        landImpact = velY;
      } catch {}
      if (wasAir) {
        if (velY > 8) landUntil = now + 80 + clamp(velY, 0, 14) * 7;
        spin = norm(spin);
        flipping = false;
      }
      if (groundSurface) posY = groundSurface.top - BOX_H;
      else posY = groundY;
      velY = 0;
      grounded = true;
      if (slamFall) {
        try {
          playLand();
        } catch {}
        sq = -clamp(landImpact * 0.028, 0.06, 0.3);
        sqV = 0;
        callHook(
          "dust",
          posX + BOX_W / 2,
          posY + BOX_H,
          clamp(landImpact / 10, 0.3, 1.3),
        );
        if (landImpact > 12) callHook("shake", 0.3);
      }
      if (slamAir) {
        const dived = slamDived;
        slamAir = false;
        slamDived = false;
        slamLandUntil = now + RAGE_SLAM_LAND_MS;
        landUntil = Math.max(landUntil, slamLandUntil);
        if (rageSys)
          rageSys.landing(
            now,
            posX + BOX_W / 2,
            posY + BOX_H,
            landImpact,
            dived,
          );
      } else if (rageSys && slamFall && landImpact > 7) {
        rageSys.landing(now, posX + BOX_W / 2, posY + BOX_H, landImpact, false);
      }
    }
    if (posY < 0) {
      posY = 0;
      if (velY < 0) velY = 0;
    }

    if (
      rageSys &&
      grounded &&
      !slamAir &&
      !slamArmed &&
      pendingJump === 0 &&
      now >= landUntil &&
      !aiming &&
      !laserBusy &&
      !tussling &&
      !(tussle && tussle.isPosing(now)) &&
      !(jet && jet.isActive(now)) &&
      rageSys.trySlam(now, posX + BOX_W / 2, posY + BOX_H / 2)
    ) {
      slamArmed = true;
      pendingJump = 15.5;
      windupUntil = now + 300;
      flipNext = false;
      const target = resolveCursor();
      if (Math.abs(target.x - (posX + BOX_W / 2)) > 8)
        dir = target.x > posX + BOX_W / 2 ? 1 : -1;
      callHook("shake", 0.15);
    }
    if (pendingJump && grounded && now >= windupUntil) {
      velY = -pendingJump;
      if (slamArmed) {
        slamArmed = false;
        slamAir = true;
        slamDived = false;
        slamVX = 0;
        sqV = 0.12;
        playGrab();
        callHook("dust", posX + BOX_W / 2, posY + BOX_H, 0.8);
      }
      if (flipNext) {
        flipping = true;
        spinRate = (dir * 6.1) / ((2 * pendingJump) / GRAVITY);
      }
      pendingJump = 0;
      flipNext = false;
      grounded = false;
    }
    wasAir = !grounded;
    if (slamAir && !grounded) {
      const tgt = resolveCursor();
      const sx = posX + BOX_W / 2;
      if (!slamDived && velY > -1) {
        slamDived = true;
        velY = 17;
        sqV = -0.06;
        callHook("shake", 0.15);
      }
      const pull = slamDived ? 0.09 : 0.05;
      const lim = slamDived ? 10 : 8;
      if (tgt.seen) slamVX = clamp((tgt.x - sx) * pull, -lim, lim);
      if (Math.abs(slamVX) > 0.5) dir = slamVX > 0 ? 1 : -1;
      posX = clamp(posX + slamVX * dt, 0, maxX);
    }

    const laserBusyNow = laser ? laser.isBusy() : false;
    const posing = tussle ? tussle.isPosing(now) : false;
    const busy =
      pendingJump > 0 || now < landUntil || laserBusyNow || tussling || posing;
    const targetSpeed =
      standing || busy ? 0 : modeSpeed * (rageSys ? rageSys.speedMul() : 1);
    speed += (targetSpeed - speed) * ease(0.12, dt);
    if (grounded && targetSpeed > 0.5 && now >= nextAutoJumpAt) {
      try {
        const feetNow = posY + BOX_H;
        const centerX = posX + BOX_W / 2;
        const aheadX = centerX + dir * 30;
        const stepTop = surfaceAhead(centerX, feetNow, 1, STEP_UP, floorTop);
        if (stepTop) {
          posY = stepTop.top - BOX_H;
        } else {
          const jumpTop = surfaceAhead(
            aheadX,
            feetNow,
            STEP_UP,
            JUMP_REACH,
            floorTop,
          );
          if (jumpTop) {
            const rise = feetNow - jumpTop.top;
            velY = -clamp(Math.sqrt(2 * GRAVITY * rise) + 1.5, 9, 14);
            sqV = 0.08;
            grounded = false;
            pendingJump = 0;
            flipNext = false;
            nextAutoJumpAt = now + 1200;
          }
        }
      } catch {}
    }
    const moveDir = effective === "moonwalk" ? -dir : dir;
    posX += speed * moveDir * dt;
    if (posX <= 0) {
      posX = 0;
      if (speed > 0.2) dir = 1;
    } else if (posX >= maxX) {
      posX = maxX;
      if (speed > 0.2) dir = -1;
    }
    if (now >= nextTurnAt) {
      if (!aiming && !tussling && speed > 0.5) dir = -dir;
      nextTurnAt = now + rand(1800, 5000);
    }

    if (
      (effective === "walk" ||
        effective === "run" ||
        effective === "creep" ||
        effective === "moonwalk") &&
      speed < 0.25
    )
      effective = "idle";
    const gk =
      effective === "run"
        ? 0.085
        : effective === "creep"
          ? 0.14
          : effective === "moonwalk"
            ? 0.06
            : 0.1;
    let rate;
    if (
      effective === "walk" ||
      effective === "run" ||
      effective === "creep" ||
      effective === "moonwalk"
    )
      rate = speed * gk;
    else
      rate = effective === "rage" ? 0.26 : effective === "punch" ? 0.2 : 0.05;
    phase += rate * dt;
    if (grounded && speed > 1.4 && now >= stepDustAt) {
      stepDustAt = now + 150;
      callHook("dust", posX + BOX_W / 2 - dir * 7, posY + BOX_H, 0.3);
    }

    let t;
    if (!grounded)
      t = slamAir
        ? slamDivePose(slamDived, now)
        : now < dodgeUntil && !flipping
          ? dodgePose(phase, now)
          : airPose(velY, flipping);
    else if (pendingJump) t = crouchPose(true);
    else if (now < slamLandUntil)
      t = slamLandPose(1 - (slamLandUntil - now) / RAGE_SLAM_LAND_MS);
    else if (now < landUntil) t = crouchPose(false);
    else {
      const tussleTarget = tussle ? tussle.getPose(now, phase, dir) : null;
      t = tussleTarget || modePose(effective, phase, now, rageBoth, glance);
    }

    if (aiming && aimTarget) applyAimPose(t, now);

    const k = ease(aiming ? 0.55 : grounded ? 0.32 : 0.28, dt);
    for (let i = 0; i < POSE_KEYS.length; i++)
      P[POSE_KEYS[i]] += (t[POSE_KEYS[i]] - P[POSE_KEYS[i]]) * k;
    fv += (dir - fv) * ease(0.3, dt);
    airBlend += ((grounded ? 0 : 1) - airBlend) * ease(0.3, dt);

    const rt = tussling
      ? 0.9
      : effective === "rage"
        ? 1
        : aiming
          ? 0.85
          : effective === "punch"
            ? 0.8
            : effective === "run"
              ? 0.65
              : 0.4;
    rage +=
      (Math.max(rt, rageSys ? rageSys.rageFloor() : 0) - rage) * ease(0.08, dt);

    if (!grounded && flipping) spin += spinRate * dt;
    else if (grounded) spin *= Math.pow(0.55, dt);

    const shake =
      Math.sin(now * 0.09) *
      0.9 *
      Math.max(0, rage - 0.5) *
      (effective === "rage" ? 1.4 : 0.5);

    last = solve(P, fv, shake, airBlend);
    draw(last, now);
    actor.style.left = posX + "px";
    actor.style.top = posY + "px";
  }

  function frontHandPoint() {
    if (!last) return null;
    try {
      const arm = last.arms[1];
      return { x: posX + arm.hand.x, y: posY + arm.hand.y };
    } catch {
      return null;
    }
  }

  function tussleReady(now) {
    if (koUntil || held || flying || now < introUntil) return false;
    if (pendingJump > 0 || now < landUntil) return false;
    if (aiming || (laser && laser.isBusy())) return false;
    if (jet && jet.isActive(now)) return false;
    return true;
  }

  function buildTussle() {
    try {
      tussle = createTussleController({
        getPointer: () => resolveCursor(),
        getHand: () => frontHandPoint(),
        getBody: () => {
          if (!last) return null;
          return { x: posX + last.shoulder.x, y: posY + last.shoulder.y };
        },
        getFloor: () => resolveFloor(),
        canStart: (now) => tussleReady(now),
        pickTarget: hooks && hooks.pickTussleTarget,
        onSlam: hooks && hooks.onTussleSlam,
        onWin: () => playWooob(),
        onLeap: (vx, vy) => {
          velX = clamp(vx, -18, 18);
          velY = vy;
          flying = true;
          wasAir = true;
          flipping = false;
          spin = 0;
          speed = 0;
          sqV = 0.1;
          if (Math.abs(vx) > 1) dir = vx > 0 ? 1 : -1;
          callHook("dust", posX + BOX_W / 2, posY + BOX_H, 0.8);
        },
        onSteer: (vx, vy) => {
          if (!flying) return;
          velX += (clamp(vx, -16, 16) - velX) * 0.3;
          velY += (clamp(vy, -19, 15) - velY) * 0.2;
          if (Math.abs(vx) > 2) dir = vx > 0 ? 1 : -1;
        },
        onHang: () => {
          flying = false;
          wasAir = false;
          flipping = false;
          velX = 0;
          velY = 0;
          speed = 0;
          pendingJump = 0;
          aiming = false;
          fireAt = null;
          try {
            if (laser) laser.cancel();
          } catch {}
          callHook("shake", 0.25);
        },
        onDetach: (vx, vy, sp) => {
          flying = true;
          wasAir = true;
          velX = clamp(vx, -18, 18);
          velY = clamp(vy, -18, 18);
          if (Math.abs(sp) > 0.1) {
            flipping = true;
            spinRate = clamp(sp, -0.5, 0.5);
          } else {
            flipping = false;
          }
        },
      });
    } catch {
      tussle = null;
    }
  }

  function update(now, dt) {
    try {
      if (destroyed || !actor) return;
      const baseDt = clamp(dt || 1, 0.2, 3);
      if (rageSys) {
        rageSys.observe(now, posX + BOX_W / 2, posY + BOX_H / 2);
        rageSys.update(now, baseDt, posX + BOX_W / 2, posY + BOX_H / 2);
      }
      if (combo) combo.observe(now);
      frame(now, clamp(baseDt * (rageSys ? rageSys.timeScale() : 1), 0.2, 3));
    } catch {}
  }

  function launch(x, y, vx, vy) {
    try {
      const maxLocalX = Math.max(0, window.innerWidth - BOX_W);
      posX = clamp(x, 0, maxLocalX);
    } catch {}
    try {
      posY = Math.max(0, y);
    } catch {}
    try {
      velX = clamp(vx || 0, -18, 18);
    } catch {}
    try {
      velY = vy || 0;
    } catch {}
    try {
      flying = true;
    } catch {}
    try {
      wasAir = true;
    } catch {}
    try {
      flipping = false;
    } catch {}
    try {
      spin = 0;
    } catch {}
    try {
      speed = 0;
    } catch {}
    try {
      actor.style.left = posX + "px";
    } catch {}
    try {
      actor.style.top = posY + "px";
    } catch {}
  }

  function startIntro(ms) {
    try {
      introBaseY = posY;
    } catch {}
    try {
      introToY = Math.max(0, resolveFloor() - BOX_H);
    } catch {}
    try {
      const nowMs = performance.now();
      introStartAt = nowMs;
      introUntil = nowMs + (ms || 1800);
    } catch {}
    try {
      flying = false;
    } catch {}
    try {
      velX = 0;
    } catch {}
    try {
      velY = 0;
    } catch {}
    try {
      playWooob();
    } catch {}
  }
  function hurt(fromX, fromY, power) {
    try {
      if (destroyed) return;
      try {
        if (performance.now() < koUntil) return;
      } catch {}
      hp -= 1;
    } catch {}
    try {
      if (tussle && tussle.isActive()) tussle.interrupt(performance.now());
    } catch {}
    try {
      playHit();
    } catch {}
    try {
      aiming = false;
    } catch {}
    try {
      fireAt = null;
    } catch {}
    try {
      introUntil = 0;
    } catch {}
    try {
      if (jet) jet.stop(performance.now(), true);
    } catch {}
    try {
      if (combo) combo.cancel(performance.now());
    } catch {}
    slamArmed = false;
    slamAir = false;
    slamDived = false;
    let cagedNow = false;
    try {
      cagedNow = !!(
        hooks &&
        typeof hooks.getCage === "function" &&
        hooks.getCage()
      );
    } catch {}
    if (!cagedNow) {
      try {
        const cx = posX + 14;
        const cy = posY + 30;
        const dx = cx - fromX;
        const dy = cy - fromY;
        const m = Math.max(6, Math.sqrt(dx * dx + dy * dy));
        const pw = clamp(power || 8, 4, 14);
        velX = clamp((dx / m) * pw, -16, 16);
        velY = clamp((dy / m) * pw - 4, -16, 16);
      } catch {}
      try {
        flying = true;
      } catch {}
      try {
        wasAir = true;
      } catch {}
      try {
        flipping = false;
      } catch {}
      try {
        spin *= 0.3;
      } catch {}
    }
    try {
      if (hp <= 0) koUntil = performance.now() + 3000;
    } catch {}
  }
  function destroy() {
    destroyed = true;
    try {
      if (rageSys) rageSys.destroy();
    } catch {}
    try {
      if (combo) combo.destroy();
    } catch {}
    if (tussle && tussle.isActive()) {
      try {
        tussle.destroy();
      } catch {}
    }
    pinDot = null;
    try {
      if (moveHandler) window.removeEventListener("pointermove", moveHandler);
    } catch {}
    try {
      if (clickHandler) window.removeEventListener("pointerdown", clickHandler);
    } catch {}
    try {
      if (upHandler) window.removeEventListener("pointerup", upHandler);
    } catch {}
    try {
      if (landTimer) clearTimeout(landTimer);
    } catch {}
    landTimer = null;
    moveHandler = null;
    upHandler = null;
    downHandler = null;
    clickHandler = null;
    try {
      if (actor) actor.remove();
    } catch {}
    actor = null;
  }

  function build() {
    const svg = el("svg", {
      width: BOX_W,
      height: BOX_H,
      viewBox: "0 0 " + BOX_W + " " + BOX_H,
      class: "stk-actor",
    });
    svg.style.position = "absolute";
    svg.style.overflow = "visible";
    svg.style.pointerEvents = draggable ? "auto" : "none";
    svg.style.cursor = draggable ? "grab" : "default";
    svg.style.filter = "none";
    const limb = (color, w) =>
      el("path", {
        fill: "none",
        style: "stroke:" + color,
        "stroke-width": w,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      });
    parts.root = el("g", {});
    parts.legB = limb(INK_BACK, 3.2);
    parts.armB = limb(INK_BACK, 3.2);
    parts.torso = limb(INK, 3.4);
    parts.legA = limb(INK, 3.2);
    parts.armA = limb(INK, 3.2);
    parts.head = el("circle", {
      r: HEAD_R,
      fill: "none",
      style: "stroke:" + INK,
      "stroke-width": 3,
    });
    parts.gun = el("path", {
      d: "",
      fill: "none",
      style: "stroke:" + INK,
      "stroke-width": 2.8,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      display: "none",
    });
    parts.flash = el("circle", {
      r: 4,
      fill: "#ffd23c",
      stroke: "#ff7a00",
      "stroke-width": 1,
      display: "none",
    });
    jetRig = createJetpackRig();
    parts.ball = el("circle", {
      r: 3.3,
      fill: "#38502f",
      style: "stroke:#1d2b19",
      "stroke-width": 1,
      display: "none",
    });
    parts.swoosh = el("path", {
      d: "",
      fill: "none",
      style: "stroke:#ffffff",
      "stroke-width": 3,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      opacity: 0.75,
      display: "none",
    });
    parts.ghosts = [];
    parts.ghostG = el("g", {});
    for (let gi = 0; gi < GHOST_COUNT; gi++) {
      const gp = el("path", {
        fill: "none",
        style: "stroke:" + INK,
        "stroke-width": 2.6,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        display: "none",
      });
      parts.ghosts.push(gp);
      parts.ghostG.appendChild(gp);
    }
    parts.vein = el("path", {
      d: "M-2.4 -0.8Q-0.8 -0.8 -0.8 -2.4M0.8 -2.4Q0.8 -0.8 2.4 -0.8M2.4 0.8Q0.8 0.8 0.8 2.4M-0.8 2.4Q-0.8 0.8 -2.4 0.8",
      fill: "none",
      style: "stroke:#ff0000",
      "stroke-width": 1.3,
      "stroke-linecap": "round",
      opacity: 0,
    });
    laser = createLaserWeapon({
      strike:
        hooks && typeof hooks.laserStrike === "function"
          ? hooks.laserStrike
          : null,
      sweep:
        hooks && typeof hooks.laserSweepAlong === "function"
          ? hooks.laserSweepAlong
          : null,
    });
    const order = [
      jetRig.root,
      parts.legB,
      parts.armB,
      parts.torso,
      parts.legA,
      parts.head,
      parts.armA,
      parts.gun,
      parts.ball,
      parts.swoosh,
      parts.flash,
      laser.parts.halo,
      laser.parts.beam,
      laser.parts.core,
      laser.parts.glow,
      parts.vein,
    ];
    for (let i = 0; i < order.length; i++) parts.root.appendChild(order[i]);
    svg.appendChild(parts.ghostG);
    svg.appendChild(parts.root);
    return svg;
  }

  try {
    actor = build();
    try {
      buildTussle();
    } catch {}
    try {
      buildJetpack();
    } catch {}
    try {
      buildRage();
    } catch {}
    try {
      buildCombo();
    } catch {}
    try {
      layer.appendChild(actor);
    } catch {}
    downHandler = onGrabDown;
    clickHandler = onClickPulse;
    moveHandler = onGrabMove;
    upHandler = onGrabUp;
    if (draggable) {
      try {
        bindEvent(actor, "pointerdown", downHandler);
      } catch {}
      try {
        bindEvent(window, "pointermove", moveHandler);
      } catch {}
      try {
        bindEvent(window, "pointerup", upHandler);
      } catch {}
      try {
        bindEvent(window, "pointerdown", clickHandler);
      } catch {}
    }
    const floor = resolveFloor();
    posX = Math.max(
      0,
      Math.min(
        window.innerWidth - BOX_W,
        Math.random() * Math.max(1, window.innerWidth - 60),
      ),
    );
    posY = Math.max(0, floor - BOX_H);
    dir = Math.random() < 0.5 ? -1 : 1;
    fv = dir;
    const now = performance.now();
    modeUntil = 0;
    nextJumpAt = now + rand(1500, 3000);
    nextShootAt = now + rand(1200, 2200);
    nextTurnAt = now + rand(2000, 4000);
    nextGlanceAt = now;
    actor.style.left = posX + "px";
    actor.style.top = posY + "px";
  } catch {}

  return {
    root: actor,
    update: update,
    destroy: destroy,
    launch: launch,
    startIntro: startIntro,
    hurt: hurt,
    getPos: () => {
      try {
        return { x: posX, y: posY, w: BOX_W, h: BOX_H };
      } catch {
        return { x: 0, y: 0, w: 28, h: 64 };
      }
    },
  };
}
