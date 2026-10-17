import { $, $$, bindEvent, createElement } from "../framework.js";
import { playGrab, playHit, playLand, playWooob } from "./chaosSfx.js";
import { isCursorDestroyed } from "./stickmanCursorKill.js";

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
const MODES = ["walk", "run", "idle", "creep", "rage", "punch"];
const KEYS = [
  "lean",
  "tilt",
  "a1",
  "aK",
  "b1",
  "bK",
  "armA",
  "armAE",
  "armB",
  "armBE",
  "shout",
];

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

function pose(o) {
  return Object.assign(
    {
      lean: 0.15,
      tilt: 0.1,
      a1: 0.15,
      aK: 0.1,
      b1: -0.15,
      bK: 0.1,
      armA: 0.5,
      armAE: 1.7,
      armB: 0.2,
      armBE: 1.8,
      shout: 0,
    },
    o,
  );
}

function modePose(mode, p, now, both, glance) {
  const s = Math.sin(p);
  const c = Math.cos(p);
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

function scanPlatforms(now) {
  try {
    if (now - platScanAt < PLAT_SCAN_MS && platCache) return platCache;
  } catch {}
  const found = [];
  try {
    platScanAt = now;
    let floorTop = 0;
    try {
      floorTop = resolveFloor();
    } catch {}
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
        if (rect.top >= floorTop - 4) continue;
        found.push({ left: rect.left, right: rect.right, top: rect.top });
      } catch {}
    }
  } catch {}
  try {
    platCache = found;
  } catch {}
  return found;
}

function crossSurface(feetX, prevFeet, feet) {
  let best = -1;
  try {
    const floorTop = resolveFloor();
    if (floorTop >= prevFeet - 2 && floorTop <= feet + 8) best = floorTop;
  } catch {}
  let plats = null;
  try {
    plats = scanPlatforms(performance.now());
  } catch {}
  if (plats) {
    for (let i = 0; i < plats.length; i++) {
      try {
        const p = plats[i];
        if (feetX < p.left - 4 || feetX > p.right + 4) continue;
        if (p.top < prevFeet - 2 || p.top > feet + 8) continue;
        if (best < 0 || p.top < best) best = p.top;
      } catch {}
    }
  }
  return best < 0 ? null : { top: best };
}

function surfaceAhead(aheadX, feet, minAbove, maxAbove) {
  let best = -1;
  let plats = null;
  try {
    plats = scanPlatforms(performance.now());
  } catch {}
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

function mountAssist() {
  let best = -1;
  try {
    const feetX = posX + BOX_W / 2;
    const feet = posY + BOX_H;
    const plats = scanPlatforms(performance.now());
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
  let laserTarget = null;
  let laserLockAt = 0;
  let laserUntil = 0;
  let laserFired = false;
  let sweepActive = false;
  let sweepAngle = 0;
  let sweepRate = 0;
  let sweepLastAngle = 0;
  let sweepLastBurnAt = 0;
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
  let platCache = [];
  let platScanAt = 0;
  let nextAutoJumpAt = 0;
  let moveHandler = null;
  let upHandler = null;
  let downHandler = null;
  let introUntil = 0;
  let introBaseY = 0;
  let introToY = 0;
  let introStartAt = 0;
  let lastCageHit = 0;
  let hp = STICKMAN_HP;
  let koUntil = 0;

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
      else if (dist < 200) next = "rage";
      else next = Math.random() < 0.6 ? "run" : "walk";
      if (Math.abs(cdx) > 30) dir = cdx > 0 ? 1 : -1;
    } else {
      const roll = Math.random();
      next =
        roll < 0.3
          ? "walk"
          : roll < 0.5
            ? "run"
            : roll < 0.62
              ? "idle"
              : roll < 0.74
                ? "creep"
                : "rage";
      if (Math.random() < 0.3) dir = -dir;
    }
    if (next === mode) next = MODES[Math.floor(Math.random() * MODES.length)];
    mode = next;
    const spans = {
      walk: [3600, 7000],
      run: [2400, 5000],
      idle: [900, 1600],
      creep: [2800, 5200],
      rage: [2000, 3600],
      punch: [2200, 3800],
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
            : 0;
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

  function beginAim(now) {
    aiming = true;
    aimTarget = pickTarget();
    aimStand = Math.random() < 0.6;
    shotsLeft = Math.random() < 0.3 ? 2 + Math.floor(Math.random() * 2) : 1;
    fireAt = now + rand(200, 320);
    aimEndAt = Infinity;
  }

  function doFire(now) {
    const sx = muzzle ? posX + muzzle.x : posX + 14;
    const sy = muzzle ? posY + muzzle.y : posY + 20;
    try {
      if (hooks && typeof hooks.fire === "function")
        hooks.fire(sx, sy, aimTarget.x, aimTarget.y);
    } catch {}
    flashUntil = now + 90;
    recoilUntil = now + 140;
  }

  function tickAim(now) {
    if (fireAt !== null && now >= fireAt) {
      doFire(now);
      shotsLeft--;
      if (shotsLeft > 0) {
        fireAt = now + rand(140, 210);
        aimTarget = pickTarget();
      } else {
        fireAt = null;
        aimEndAt = now + rand(260, 420);
      }
    }
    if (fireAt === null && now >= aimEndAt) {
      aiming = false;
      nextShootAt = now + rand(1200, 2600);
    }
  }

  function beginLaser(now) {
    try {
      const tgt = pickTarget();
      if (!tgt) return;
      laserTarget = tgt;
      laserLockAt = now + 200;
      laserUntil = now + 650;
      laserFired = false;
      sweepActive = false;
      sweepAngle = 0;
      sweepRate = 0;
      sweepLastAngle = 0;
      sweepLastBurnAt = 0;
    } catch {}
  }

  function onGrabDown(e) {
    if (destroyed) return;
    try {
      held = true;
      try {
        laserTarget = null;
      } catch {}
      sweepActive = false;
      try {
        introUntil = 0;
      } catch {}
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
          const mountTop = mountAssist();
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

  function draw(j, now) {
    const pivotY = j.hip.y - 8;
    parts.root.setAttribute(
      "transform",
      "rotate(" + f(spin * 57.2958) + " " + HIP_X + " " + f(pivotY) + ")",
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
    const tip = { x: hand.x + fx * 7, y: hand.y + fy * 7 };
    let px = -fy;
    let py = fx;
    if (py < 0) {
      px = -px;
      py = -py;
    }
    const gs = { x: hand.x + fx * 1.5, y: hand.y + fy * 1.5 };
    muzzle = tip;
    if (aiming) {
      parts.gun.setAttribute("display", "inline");
      parts.gun.setAttribute(
        "d",
        pathOf([hand, tip]) +
          pathOf([gs, { x: gs.x + px * 3.4, y: gs.y + py * 3.4 }]),
      );
    } else {
      parts.gun.setAttribute("display", "none");
    }
    if (now < flashUntil) {
      parts.flash.setAttribute("display", "inline");
      parts.flash.setAttribute("cx", f(tip.x + fx * 2));
      parts.flash.setAttribute("cy", f(tip.y + fy * 2));
      parts.flash.setAttribute("r", f(rand(3, 4.8)));
    } else {
      parts.flash.setAttribute("display", "none");
    }
    if (laserTarget && !sweepActive && now >= laserLockAt && now < laserUntil) {
      try {
        const flick = 0.6 + 0.4 * Math.sin(now * 0.09);
        const bx1 = f(j.headC.x);
        const by1 = f(j.headC.y);
        const bx2 = f(laserTarget.x - posX);
        const by2 = f(laserTarget.y - posY);
        parts.beamHalo.setAttribute("display", "inline");
        parts.beamHalo.setAttribute("x1", bx1);
        parts.beamHalo.setAttribute("y1", by1);
        parts.beamHalo.setAttribute("x2", bx2);
        parts.beamHalo.setAttribute("y2", by2);
        parts.beamHalo.setAttribute(
          "opacity",
          (0.35 * flick + 0.15).toFixed(2),
        );
        parts.beam.setAttribute("display", "inline");
        parts.beam.setAttribute("x1", bx1);
        parts.beam.setAttribute("y1", by1);
        parts.beam.setAttribute("x2", bx2);
        parts.beam.setAttribute("y2", by2);
        parts.beam.setAttribute("opacity", flick.toFixed(2));
        parts.beamCore.setAttribute("display", "inline");
        parts.beamCore.setAttribute("x1", bx1);
        parts.beamCore.setAttribute("y1", by1);
        parts.beamCore.setAttribute("x2", bx2);
        parts.beamCore.setAttribute("y2", by2);
        parts.beamCore.setAttribute("opacity", "1");
        parts.laserGlow.setAttribute("display", "inline");
        parts.laserGlow.setAttribute("cx", f(j.headC.x));
        parts.laserGlow.setAttribute("cy", f(j.headC.y));
      } catch {}
    } else if (sweepActive && now >= laserLockAt) {
      try {
        const ang = sweepAngle;
        const flick = 0.7 + 0.3 * Math.sin(now * 0.11);
        const jx = f(j.headC.x);
        const jy = f(j.headC.y);
        const bx2 = jx + Math.cos(ang) * 3000;
        const by2 = jy + Math.sin(ang) * 3000;
        parts.beamHalo.setAttribute("display", "inline");
        parts.beamHalo.setAttribute("x1", jx);
        parts.beamHalo.setAttribute("y1", jy);
        parts.beamHalo.setAttribute("x2", bx2);
        parts.beamHalo.setAttribute("y2", by2);
        parts.beamHalo.setAttribute(
          "opacity",
          (0.35 * flick + 0.15).toFixed(2),
        );
        parts.beam.setAttribute("display", "inline");
        parts.beam.setAttribute("x1", jx);
        parts.beam.setAttribute("y1", jy);
        parts.beam.setAttribute("x2", bx2);
        parts.beam.setAttribute("y2", by2);
        parts.beam.setAttribute("opacity", flick.toFixed(2));
        parts.beamCore.setAttribute("display", "inline");
        parts.beamCore.setAttribute("x1", jx);
        parts.beamCore.setAttribute("y1", jy);
        parts.beamCore.setAttribute("x2", bx2);
        parts.beamCore.setAttribute("y2", by2);
        parts.beamCore.setAttribute("opacity", "1");
        parts.laserGlow.setAttribute("display", "inline");
        parts.laserGlow.setAttribute("cx", jx);
        parts.laserGlow.setAttribute("cy", jy);
      } catch {}
    } else {
      parts.beamHalo.setAttribute("display", "none");
      parts.beam.setAttribute("display", "none");
      parts.beamCore.setAttribute("display", "none");
      parts.laserGlow.setAttribute("display", "none");
    }
  }

  function frame(now, dt) {
    const groundY = Math.max(0, resolveFloor() - BOX_H);
    const maxX = Math.max(0, window.innerWidth - BOX_W);
    let cageRect = null;
    try {
      if (hooks && typeof hooks.getCage === "function")
        cageRect = hooks.getCage();
    } catch {}
    if (cageRect) {
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
        for (let i = 0; i < KEYS.length; i++)
          P[KEYS[i]] += (ct[KEYS[i]] - P[KEYS[i]]) * ck;
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
        for (let i = 0; i < KEYS.length; i++)
          P[KEYS[i]] += (kt[KEYS[i]] - P[KEYS[i]]) * kk;
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
        for (let i = 0; i < KEYS.length; i++)
          P[KEYS[i]] += (it[KEYS[i]] - P[KEYS[i]]) * ik;
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
        for (let i = 0; i < KEYS.length; i++)
          P[KEYS[i]] += (t[KEYS[i]] - P[KEYS[i]]) * hk;
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

    if (flying) {
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
          );
      } catch {}
      if (flySurface || posY >= groundY) {
        if (flySurface) posY = flySurface.top - BOX_H;
        else posY = groundY;
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
      let ft = airPose(velY, flipping);
      const fk = ease(0.28, dt);
      for (let i = 0; i < KEYS.length; i++)
        P[KEYS[i]] += (ft[KEYS[i]] - P[KEYS[i]]) * fk;
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
    if (!aiming && !laserTarget && now >= nextShootAt) {
      if (Math.random() < 0.25) beginLaser(now);
      else beginAim(now);
    }
    if (aiming) tickAim(now);
    if (laserTarget && !laserFired && now >= laserLockAt) {
      try {
        laserFired = true;
      } catch {}
      try {
        const worldX = posX + j.headC.x;
        const worldY = posY + j.headC.y;
        const baseAng = Math.atan2(
          laserTarget.y - worldY,
          laserTarget.x - worldX,
        );
        const dir = Math.random() < 0.5 ? -1 : 1;
        sweepAngle = baseAng;
        sweepRate = dir * 0.55;
        sweepLastAngle = baseAng;
        sweepLastBurnAt = 0;
        sweepActive = true;
        laserTarget = null;
      } catch {}
    }
    if (sweepActive) {
      sweepAngle += sweepRate * dt;
    }
    if (sweepActive && hooks && typeof hooks.laserSweep === "function") {
      try {
        const worldX = posX + j.headC.x;
        const worldY = posY + j.headC.y;
        if (now - sweepLastBurnAt > 90 && sweepAngle !== sweepLastAngle) {
          sweepLastBurnAt = now;
          sweepLastAngle = sweepAngle;
          const sx = worldX + Math.cos(sweepAngle) * 3000;
          const sy = worldY + Math.sin(sweepAngle) * 3000;
          hooks.laserSweep(worldX, worldY, sx, sy);
        }
      } catch {}
    }
    if (laserTarget && now >= laserUntil) {
      try {
        laserTarget = null;
      } catch {}
    }

    const standing = aiming && aimStand;
    const effective = standing ? "idle" : mode;

    const prevFeet = posY + BOX_H;
    velY += GRAVITY * dt;
    posY += velY * dt;
    let grounded = false;
    let groundSurface = null;
    try {
      if (velY >= 0)
        groundSurface = crossSurface(posX + BOX_W / 2, prevFeet, posY + BOX_H);
    } catch {}
    if (groundSurface || posY >= groundY) {
      let slamFall = false;
      try {
        slamFall = wasAir && velY > 6;
      } catch {}
      if (wasAir) {
        landUntil = now + 80 + clamp(velY, 0, 14) * 7;
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
      }
    }
    if (posY < 0) {
      posY = 0;
      if (velY < 0) velY = 0;
    }

    if (grounded && !pendingJump && !aiming && now >= nextJumpAt) {
      const r = Math.random();
      pendingJump =
        r < 0.5 ? rand(10.5, 12) : r < 0.78 ? rand(13, 14.5) : rand(13, 14);
      flipNext = r >= 0.78;
      windupUntil = now + rand(110, 170);
      nextJumpAt = now + rand(1800, 4500);
    }
    if (pendingJump && grounded && now >= windupUntil) {
      velY = -pendingJump;
      if (flipNext) {
        flipping = true;
        spinRate = (dir * 6.1) / ((2 * pendingJump) / GRAVITY);
      }
      pendingJump = 0;
      flipNext = false;
      grounded = false;
    }
    wasAir = !grounded;
    if (false) {
    }

    const busy =
      pendingJump > 0 ||
      now < landUntil ||
      (laserTarget && now < laserUntil) ||
      sweepActive;
    const targetSpeed = standing || busy ? 0 : modeSpeed;
    speed += (targetSpeed - speed) * ease(0.12, dt);
    if (grounded && targetSpeed > 0.5 && now >= nextAutoJumpAt) {
      try {
        const feetNow = posY + BOX_H;
        const aheadX = posX + BOX_W / 2 + dir * 30;
        const stepTop = surfaceAhead(aheadX, feetNow, 1, STEP_UP);
        if (stepTop) {
          posY -= Math.min(feetNow - stepTop.top, 7 * dt);
        } else {
          const jumpTop = surfaceAhead(aheadX, feetNow, STEP_UP, JUMP_REACH);
          if (jumpTop) {
            const rise = feetNow - jumpTop.top;
            velY = -clamp(Math.sqrt(2 * GRAVITY * rise) + 1.5, 9, 14);
            grounded = false;
            pendingJump = 0;
            flipNext = false;
            nextAutoJumpAt = now + 1200;
          }
        }
      } catch {}
    }
    posX += speed * dir * dt;
    if (posX <= 0) {
      posX = 0;
      if (speed > 0.2) dir = 1;
    } else if (posX >= maxX) {
      posX = maxX;
      if (speed > 0.2) dir = -1;
    }
    if (now >= nextTurnAt) {
      if (!aiming && speed > 0.5) dir = -dir;
      nextTurnAt = now + rand(1800, 5000);
    }

    const gk = effective === "run" ? 0.085 : effective === "creep" ? 0.14 : 0.1;
    let rate;
    if (effective === "walk" || effective === "run" || effective === "creep")
      rate = speed * gk + 0.02;
    else
      rate = effective === "rage" ? 0.26 : effective === "punch" ? 0.2 : 0.05;
    phase += rate * dt;

    let t;
    if (!grounded) t = airPose(velY, flipping);
    else if (pendingJump) t = crouchPose(true);
    else if (now < landUntil) t = crouchPose(false);
    else t = modePose(effective, phase, now, rageBoth, glance);

    const recoil = clamp((recoilUntil - now) / 140, 0, 1);
    if (aiming && aimTarget) {
      const sx = last ? posX + last.shoulder.x : posX + 14;
      const sy = last ? posY + last.shoulder.y : posY + 22;
      const dx = aimTarget.x - sx;
      const dy = aimTarget.y - sy;
      if (Math.abs(dx) > 8) dir = dx > 0 ? 1 : -1;
      t.armA = Math.atan2(dx * dir, dy) - 0.35 * recoil;
      t.armAE = 0;
      t.lean += 0.05;
      t.tilt -= 0.2 * recoil;
      t.shout = fireAt === null ? 1 : 0.5;
    }

    const k = ease(aiming ? 0.55 : grounded ? 0.32 : 0.28, dt);
    for (let i = 0; i < KEYS.length; i++)
      P[KEYS[i]] += (t[KEYS[i]] - P[KEYS[i]]) * k;
    fv += (dir - fv) * ease(0.3, dt);
    airBlend += ((grounded ? 0 : 1) - airBlend) * ease(0.3, dt);

    const rt =
      effective === "rage"
        ? 1
        : aiming
          ? 0.85
          : effective === "punch"
            ? 0.8
            : effective === "run"
              ? 0.65
              : 0.4;
    rage += (rt - rage) * ease(0.08, dt);

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

  function update(now, dt) {
    try {
      if (destroyed || !actor) return;
      frame(now, clamp(dt || 1, 0.2, 3));
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
    pinDot = null;
    try {
      if (moveHandler) window.removeEventListener("pointermove", moveHandler);
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
    parts.beamHalo = el("line", {
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
      style: "stroke:var(--error)",
      "stroke-width": 14,
      "stroke-linecap": "round",
      display: "none",
    });
    parts.beam = el("line", {
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
      style: "stroke:var(--error)",
      "stroke-width": 7,
      "stroke-linecap": "round",
      display: "none",
    });
    parts.beamCore = el("line", {
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
      style: "stroke:var(--text-primary)",
      "stroke-width": 2.5,
      "stroke-linecap": "round",
      display: "none",
    });
    parts.laserGlow = el("circle", {
      r: 5,
      fill: "none",
      style: "stroke:var(--error)",
      "stroke-width": 2,
      display: "none",
    });
    parts.vein = el("path", {
      d: "M-2.4 -0.8Q-0.8 -0.8 -0.8 -2.4M0.8 -2.4Q0.8 -0.8 2.4 -0.8M2.4 0.8Q0.8 0.8 0.8 2.4M-0.8 2.4Q-0.8 0.8 -2.4 0.8",
      fill: "none",
      style: "stroke:#ff0000",
      "stroke-width": 1.3,
      "stroke-linecap": "round",
      opacity: 0,
    });
    const order = [
      parts.legB,
      parts.armB,
      parts.torso,
      parts.legA,
      parts.head,
      parts.armA,
      parts.gun,
      parts.flash,
      parts.beamHalo,
      parts.beam,
      parts.beamCore,
      parts.laserGlow,
      parts.vein,
    ];
    for (let i = 0; i < order.length; i++) parts.root.appendChild(order[i]);
    svg.appendChild(parts.root);
    return svg;
  }

  try {
    actor = build();
    try {
      layer.appendChild(actor);
    } catch {}
    downHandler = onGrabDown;
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
