import { createElement } from "../../framework.js";
import { resolveIconUrl } from "../assetResolver.js";
import { playGrab } from "../chaosSfx.js";
import { isCursorDestroyed, getCursorDamage } from "./stickmanCursorKill.js";
import { pose } from "./stickmanRig.js";

const CURSOR_ICON = "static/icons/cursor.webp";
const CRACK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><path d="M6 3L11 10L8 14L14 19L12 25M11 10L18 11M14 19L21 21" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 3L11 10L8 14L14 19L12 25M11 10L18 11M14 19L21 21" fill="none" stroke="#111" stroke-width="0.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CRACK_URL = "data:image/svg+xml;utf8," + encodeURIComponent(CRACK_SVG);

const LEAP_MIN = 30;
const LEAP_MAX = 360;
const WINDUP_MS = 200;
const LEAP_GRAVITY = 0.6;
const GRAB_HAND_R = 26;
const GRAB_BODY_R = 34;
const START_CHANCE = 0.05;
const RESOLVE_STUN_MS = 1300;
const SHAKEN_STUN_MS = 1900;
const VICTORY_MS = 2600;
const WIN_COOLDOWN_MS = 3000;
const LOSS_COOLDOWN_MS = 4200;
const MISS_COOLDOWN_MS = 1800;
const REQUEST_WINDOW_MS = 420;

const FOLLOW_GAIN = 0.4;
const TARGET_RANGE = 460;
const TARGET_GIVEUP_MS = 3000;
const SLAM_REACH = 34;
const SLAMS_PER_GRIP = 3;
const REPOSITION_MS = 700;
const REFRESH_MS = 320;
const SLAM_COOLDOWN_MS = 260;
const TIMEOUT_MS = 12000;
const FAILSAFE_MS = 16000;
const SHAKE_SPEED = 7;
const SHAKE_DRAIN = 0.001;
const GRIP_REGEN = 0.0006;
const SWING_LIMIT = 1.5;

let session = null;
let handNode = null;
let crackNode = null;
let failsafeTimer = null;

function clampValue(v, lo, hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function clearFailsafe() {
  if (failsafeTimer === null) return;
  try {
    clearTimeout(failsafeTimer);
  } catch {}
  failsafeTimer = null;
}

function armFailsafe() {
  clearFailsafe();
  try {
    failsafeTimer = setTimeout(() => {
      failsafeTimer = null;
      cleanupTussle();
    }, FAILSAFE_MS);
  } catch {}
}

function ensureHandNode() {
  try {
    if (handNode && handNode.isConnected) return handNode;
  } catch {}
  try {
    handNode = createElement("div", { className: "stk-cursor-hand" });
    handNode.style.backgroundImage = `url("${resolveIconUrl(CURSOR_ICON)}")`;
    crackNode = document.createElement("div");
    crackNode.style.cssText =
      "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;background-size:100% 100%;background-repeat:no-repeat;opacity:0;background-image:url('" +
      CRACK_URL +
      "');";
    handNode.appendChild(crackNode);
    if (document.body) document.body.appendChild(handNode);
    return handNode;
  } catch {
    handNode = null;
    crackNode = null;
    return null;
  }
}

function dropHandNode() {
  try {
    if (handNode) handNode.remove();
  } catch {}
  handNode = null;
  crackNode = null;
}

function setHeldFlag(on) {
  try {
    if (document.documentElement)
      document.documentElement.classList.toggle("stk-cursor-held", !!on);
  } catch {}
}

function renderHand() {
  const s = session;
  if (!s) return;
  const node = ensureHandNode();
  if (!node) return;
  try {
    node.style.left = s.x + "px";
    node.style.top = s.y + "px";
    node.style.rotate = (s.swing * 0.55).toFixed(3) + "rad";
    const jitter = s.grip < 0.4 ? (0.4 - s.grip) * 7 : 0;
    node.style.translate =
      (Math.sin(performance.now() * 0.09) * jitter).toFixed(1) +
      "px " +
      (Math.cos(performance.now() * 0.11) * jitter).toFixed(1) +
      "px";
    node.classList.toggle("stk-cursor-hand-strain", s.grip < 0.45);
    if (crackNode) {
      const dmg = getCursorDamage();
      crackNode.style.opacity = dmg >= 2 ? "1" : dmg >= 1 ? "0.6" : "0";
    }
  } catch {}
}

function release() {
  session = null;
  clearFailsafe();
  dropHandNode();
  setHeldFlag(false);
}

function windupPose(now) {
  const b = Math.sin(now * 0.03) * 0.05;
  return pose({
    lean: 0.5 + b,
    tilt: 0.25,
    a1: 1.15,
    aK: 2.1,
    b1: 0.95,
    bK: 2.1,
    armA: -0.9,
    armAE: 0.8,
    armB: -1.1,
    armBE: 0.8,
    shout: 0.5,
  });
}

function leapPoseFor(leap, dir) {
  const dx = leap && Number.isFinite(leap.dx) ? leap.dx : 1;
  const dy = leap && Number.isFinite(leap.dy) ? leap.dy : 0;
  const aim = Math.atan2(dx * dir, dy);
  return pose({
    lean: 0.5,
    tilt: 0.05,
    a1: 1.2,
    aK: 1.7,
    b1: 0.6,
    bK: 1.5,
    armA: aim,
    armAE: 0.05,
    armB: aim - 0.2,
    armBE: 0.1,
    shout: 1,
  });
}

function hangPoseFor(st, now, anim) {
  const sw = st.swing;
  const sv = st.swingV;
  const flutter = Math.sin(anim * 2.1);
  const p = {
    lean: 0.06 - sv * 0.6,
    tilt: 0.12 - sw * 0.1,
    a1: 0.28 + sv * 1.4 + 0.14 * flutter,
    aK: 0.55,
    b1: -0.08 + sv * 1.1 - 0.14 * flutter,
    bK: 0.62,
    armA: 3.02,
    armAE: 0.1,
    armB: 2.84,
    armBE: 0.14,
    shout: 0.35 + (1 - st.grip) * 0.6,
  };
  if (st.slamFlash) {
    p.lean = -0.38;
    p.a1 = 1.35;
    p.aK = 0.35;
    p.b1 = 1.1;
    p.bK = 0.4;
    p.armA = 2.2;
    p.armAE = 0.9;
    p.armB = 2.0;
    p.armBE = 1.0;
    p.shout = 1;
  } else if (st.act === "pull") {
    p.armA = 1.9;
    p.armAE = 1.1;
    p.armB = 1.6;
    p.armBE = 1.4;
    p.a1 = 0.8;
    p.aK = 1.5;
    p.b1 = 0.55;
    p.bK = 1.6;
    p.lean = 0.2;
    p.shout = 0.7;
  } else if (st.act === "kick") {
    const k = Math.sin(anim * 6);
    p.a1 = 0.6 + 0.9 * Math.max(0, k);
    p.aK = 0.3 + 1.2 * Math.max(0, -k);
    p.b1 = 0.6 + 0.9 * Math.max(0, -k);
    p.bK = 0.3 + 1.2 * Math.max(0, k);
    p.lean = 0.25 * k;
    p.shout = 0.9;
  } else if (st.act === "swing") {
    const k = Math.sin(now * 0.014);
    p.lean = 0.35 * k;
    p.a1 = 0.55 + 0.5 * k;
    p.b1 = 0.4 + 0.4 * k;
    p.aK = 0.4;
    p.bK = 0.4;
  }
  if (st.grip < 0.4) {
    const t = Math.sin(now * 0.06) * 0.06;
    p.armAE += 0.25 + t;
    p.armBE += 0.25 - t;
    p.shout = 1;
  }
  if (st.nearFloor > 0) {
    const nf = st.nearFloor;
    p.a1 += (1.25 - p.a1) * nf;
    p.b1 += (0.95 - p.b1) * nf;
    p.aK += (2.2 - p.aK) * nf;
    p.bK += (2.2 - p.bK) * nf;
  }
  return pose(p);
}

function victoryPose(now) {
  const b = Math.sin(now * 0.016);
  return pose({
    lean: -0.08,
    tilt: -0.1,
    a1: 0.5,
    aK: 0.2,
    b1: -0.5,
    bK: 0.2,
    armA: 2.75 + 0.25 * b,
    armAE: 0.25,
    armB: 2.45 - 0.25 * b,
    armBE: 0.3,
    shout: 1,
  });
}

function stunPose(now) {
  const r = Math.sin(now * 0.03) * 0.08;
  return pose({
    lean: -0.35 + r,
    tilt: 0.32,
    a1: 0.5,
    aK: 1.1,
    b1: -0.45,
    bK: 1.05,
    armA: -2.3 + r,
    armAE: 0.9,
    armB: -2.6 - r,
    armBE: 0.7,
    shout: 0.85,
  });
}

function solveLeap(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  for (let T = 18; T <= 54; T += 2) {
    const vx = dx / T;
    const vy = (dy - (LEAP_GRAVITY * T * (T + 1)) / 2) / T;
    if (Math.abs(vx) <= 15 && vy >= -17.5 && vy <= 6) return { vx, vy, T };
  }
  return null;
}

export function createTussleController(host) {
  const fn = (name) =>
    host && typeof host[name] === "function" ? host[name] : null;
  const getPointer = fn("getPointer");
  const getHand = fn("getHand");
  const getBody = fn("getBody");
  const getFloor = fn("getFloor");
  const canStart = fn("canStart");
  const isAllowed = fn("isAllowed");
  const pickTarget = fn("pickTarget");
  const onSlam = fn("onSlam");
  const onWin = fn("onWin");
  const onLeap = fn("onLeap");
  const onSteer = fn("onSteer");
  const onHang = fn("onHang");
  const onDetach = fn("onDetach");

  let stage = null;
  let status = null;
  let stunUntil = 0;
  let victoryUntil = 0;
  let cooldownAt = 0;
  let cooldownSpan = LOSS_COOLDOWN_MS;
  let windup = null;
  let leap = null;
  let requestedAt = -1e9;

  function end(now, reason) {
    requestedAt = -1e9;
    const s = session;
    const wasHang = stage === "hang";
    const rvx = s ? s.vx : 0;
    const rvy = s ? s.vy : 0;
    const sv = s ? s.swingV : 0;
    release();
    stage = null;
    status = null;
    windup = null;
    leap = null;
    if (wasHang && onDetach) {
      try {
        if (reason === "shaken") onDetach(rvx * 0.9, rvy * 0.9 - 3, sv * 1.5);
        else if (reason === "win") onDetach(rvx * 0.3, -5, 0);
        else if (reason === "drop") onDetach(rvx * 0.4, -2, 0);
        else onDetach(0, 0, 0);
      } catch {}
    }
    if (reason === "win") {
      cooldownAt = now + WIN_COOLDOWN_MS;
      cooldownSpan = WIN_COOLDOWN_MS;
      stunUntil = 0;
      victoryUntil = now + VICTORY_MS;
      if (onWin) {
        try {
          onWin();
        } catch {}
      }
      return;
    }
    if (reason === "miss") {
      cooldownAt = now + MISS_COOLDOWN_MS;
      cooldownSpan = MISS_COOLDOWN_MS;
      return;
    }
    cooldownAt = now + LOSS_COOLDOWN_MS;
    cooldownSpan = LOSS_COOLDOWN_MS;
    if (reason === "shaken") stunUntil = now + SHAKEN_STUN_MS;
    else if (reason === "drop") stunUntil = now + RESOLVE_STUN_MS;
  }

  function tryStart(now, body, pointer) {
    if (!canStart || !pickTarget || !onSlam || !onLeap) return;
    if (stunUntil > now || victoryUntil > now || now < cooldownAt) return;
    if (!canStart(now)) return;
    if (!pointer.seen || isCursorDestroyed()) return;
    const d = Math.hypot(pointer.x - body.x, pointer.y - body.y);
    if (d < LEAP_MIN || d > LEAP_MAX) return;
    const forced = requestedAt > now - REQUEST_WINDOW_MS;
    if (!forced && Math.random() > START_CHANCE) return;
    if (!solveLeap(body, pointer)) return;
    requestedAt = -1e9;
    stage = "windup";
    windup = {
      endAt: now + WINDUP_MS,
      dx: pointer.x - body.x,
      dy: pointer.y - body.y,
    };
    armFailsafe();
    try {
      playGrab();
    } catch {}
    status = {
      phase: "windup",
      goal: { x: pointer.x, y: pointer.y },
    };
  }

  function stepWindup(now, body, pointer) {
    if (isCursorDestroyed() || !pointer.seen) {
      end(now, "miss");
      return;
    }
    windup.dx = pointer.x - body.x;
    windup.dy = pointer.y - body.y;
    status = { phase: "windup", goal: { x: pointer.x, y: pointer.y } };
    if (now < windup.endAt) return;
    const sol = solveLeap(body, pointer);
    if (!sol) {
      end(now, "miss");
      return;
    }
    leap = {
      startAt: now,
      endAt: now + sol.T * 16.667,
      dx: windup.dx,
      dy: windup.dy,
      lastVx: sol.vx,
    };
    windup = null;
    stage = "leap";
    try {
      onLeap(sol.vx, sol.vy);
    } catch {}
  }

  function beginHang(now, pointer) {
    const approach = leap ? leap.lastVx : 0;
    leap = null;
    windup = null;
    stage = "hang";
    session = {
      x: pointer.x,
      y: pointer.y,
      vx: 0,
      vy: 0,
      lastTx: pointer.x,
      lastTy: pointer.y,
      prevVx: 0,
      target: null,
      startedAt: now,
      lastTargetAt: now,
      refreshAt: now + 200,
      readyAt: now,
      lastSlamAt: now - SLAM_COOLDOWN_MS,
      slams: 0,
      grip: 1,
      swing: 0,
      swingV: clampValue(-approach * 0.03, -0.4, 0.4),
      flashUntil: 0,
      act: "dangle",
      actUntil: now + 500,
    };
    ensureHandNode();
    setHeldFlag(true);
    armFailsafe();
    try {
      playGrab();
    } catch {}
    if (onHang) {
      try {
        onHang();
      } catch {}
    }
  }

  function stepLeap(now, body, hand, pointer) {
    if (isCursorDestroyed() || !pointer.seen) {
      end(now, "miss");
      return;
    }
    const dx = pointer.x - body.x;
    const dy = pointer.y - body.y;
    leap.dx = dx;
    leap.dy = dy;
    const trem = Math.max(1.5, (leap.endAt - now) / 16.667);
    const vx = dx / trem;
    const vy = (dy - (LEAP_GRAVITY * trem * (trem + 1)) / 2) / trem;
    leap.lastVx = vx;
    if (onSteer) {
      try {
        onSteer(vx, vy);
      } catch {}
    }
    status = { phase: "leap", goal: { x: pointer.x, y: pointer.y } };
    const dh = Math.hypot(pointer.x - hand.x, pointer.y - hand.y);
    const db = Math.hypot(dx, dy);
    if (dh <= GRAB_HAND_R || db <= GRAB_BODY_R) {
      beginHang(now, pointer);
      return;
    }
    if (now > leap.endAt + 140) end(now, "miss");
  }

  function pickAct(s, now) {
    const r = Math.random();
    s.act =
      r < 0.4 ? "dangle" : r < 0.65 ? "pull" : r < 0.85 ? "kick" : "swing";
    s.actUntil = now + rand(420, 900);
  }

  function stepHang(now, dt, pointer) {
    const s = session;
    if (!s) {
      end(now, "interrupted");
      return;
    }
    const step = clampValue(dt || 1, 0.2, 3);
    if (now - s.startedAt > TIMEOUT_MS) {
      end(now, "drop");
      return;
    }
    if (isCursorDestroyed()) {
      end(now, "win");
      return;
    }
    if (now >= s.actUntil) pickAct(s, now);
    if (now >= s.refreshAt) {
      s.refreshAt = now + REFRESH_MS;
      if (!s.target && pickTarget) {
        let found = null;
        try {
          found = pickTarget(s.x, s.y, TARGET_RANGE);
        } catch {}
        if (found && Number.isFinite(found.x) && Number.isFinite(found.y)) {
          s.target = { x: found.x, y: found.y };
          s.readyAt = now;
          s.lastTargetAt = now;
        }
      }
    }
    if (!s.target && now - s.lastTargetAt > TARGET_GIVEUP_MS) {
      end(now, "drop");
      return;
    }

    let shake = 0;
    if (pointer.seen) {
      const pdx = pointer.x - s.lastTx;
      const pdy = pointer.y - s.lastTy;
      s.vx = pdx;
      s.vy = pdy;
      shake = Math.hypot(pdx, pdy) / step;
      const follow = clampValue(FOLLOW_GAIN * step, 0, 1);
      s.x += (pointer.x - s.x) * follow;
      s.y += (pointer.y - s.y) * follow;
    }
    s.lastTx = pointer.x;
    s.lastTy = pointer.y;

    if (shake > SHAKE_SPEED)
      s.grip -= (shake - SHAKE_SPEED) * SHAKE_DRAIN * step;
    else s.grip += GRIP_REGEN * step;
    s.grip = clampValue(s.grip, 0, 1);
    if (s.grip <= 0) {
      end(now, "shaken");
      return;
    }

    let viewH = 0;
    try {
      viewH = window.innerHeight;
    } catch {}
    let floor = viewH;
    if (getFloor) {
      try {
        const value = getFloor();
        if (Number.isFinite(value)) floor = value;
      } catch {}
    }

    const ax = s.vx - s.prevVx;
    s.prevVx = s.vx;
    s.swingV += (ax * 0.022 - Math.sin(s.swing) * 0.06) * step;
    if (s.act === "swing") s.swingV += Math.sin(now * 0.014) * 0.006 * step;
    s.swingV *= Math.pow(0.985, step);
    s.swing += s.swingV * step;
    if (s.swing > SWING_LIMIT) {
      s.swing = SWING_LIMIT;
      s.swingV = -Math.abs(s.swingV) * 0.4;
    } else if (s.swing < -SWING_LIMIT) {
      s.swing = -SWING_LIMIT;
      s.swingV = Math.abs(s.swingV) * 0.4;
    }

    if (s.target && now >= s.readyAt && now - s.lastSlamAt > SLAM_COOLDOWN_MS) {
      if (Math.hypot(s.target.x - s.x, s.target.y - s.y) <= SLAM_REACH) {
        const sx = s.x;
        const sy = s.y;
        const rx = sx - s.target.x;
        const ry = sy - s.target.y;
        const m = Math.max(1, Math.hypot(rx, ry));
        s.slams += 1;
        s.lastSlamAt = now;
        s.flashUntil = now + 280;
        s.grip = Math.max(0.05, s.grip - 0.05);
        s.target = null;
        s.readyAt = now + REPOSITION_MS;
        s.refreshAt = now + REPOSITION_MS;
        s.swingV += (rx / m) * -0.4;
        try {
          if (onSlam) onSlam(sx, sy);
        } catch {}
        if (isCursorDestroyed()) {
          end(now, "win");
          return;
        }
        if (s.slams >= SLAMS_PER_GRIP) {
          end(now, "drop");
          return;
        }
      }
    }

    let nearFloor = 0;
    if (viewH > 0) nearFloor = clampValue((s.y - (floor - 110)) / 70, 0, 1);
    status = {
      phase: "hang",
      x: s.x,
      y: s.y,
      swing: s.swing,
      swingV: s.swingV,
      grip: s.grip,
      act: s.act,
      slamFlash: now < s.flashUntil,
      nearFloor,
      goal: s.target ? { x: s.target.x, y: s.target.y } : { x: s.x, y: s.y },
    };
    renderHand();
  }

  function update(now, dt) {
    try {
      if (isAllowed && !isAllowed(now)) {
        if (stage !== null) end(now, "interrupted");
        return;
      }
      if (!getHand) return;
      const hand = getHand();
      if (!hand) return;
      const body = (getBody ? getBody() : null) || hand;
      const pointer = getPointer ? getPointer() : { x: 0, y: 0, seen: false };
      if (stage === "windup") stepWindup(now, body, pointer);
      else if (stage === "leap") stepLeap(now, body, hand, pointer);
      else if (stage === "hang") stepHang(now, dt, pointer);
      else tryStart(now, body, pointer);
    } catch {}
  }

  return {
    update,
    requestStart: (now) => {
      requestedAt = now;
    },
    requested: () => requestedAt > performance.now() - REQUEST_WINDOW_MS,
    isBlocked: (now) => stage !== null || stunUntil > now || now < cooldownAt,
    cooldownSpan: () => cooldownSpan,
    cooldownLeft: (now) =>
      Math.max(0, stunUntil - now, cooldownAt - now, victoryUntil - now),
    isActive: () => stage !== null,
    isLeaping: () => stage === "leap",
    isHanging: () => stage === "hang",
    isPosing: (now) => stunUntil > now || victoryUntil > now,
    getStatus: () => status,
    getGoal: () => (status && status.goal ? status.goal : null),
    getPose: (now, anim, dir) => {
      if (stage === "windup") return windupPose(now);
      if (stage === "leap") return leapPoseFor(leap, dir || 1);
      if (stage === "hang" && status)
        return hangPoseFor(status, now, anim || 0);
      if (victoryUntil > now) return victoryPose(now);
      if (stunUntil > now) return stunPose(now);
      return null;
    },
    interrupt: (now) => {
      if (stage === null) return;
      end(now, "interrupted");
    },
    miss: (now) => {
      if (stage === "leap" || stage === "windup") end(now, "miss");
    },
    destroy: () => {
      release();
      stage = null;
      status = null;
      windup = null;
      leap = null;
      stunUntil = 0;
      victoryUntil = 0;
      cooldownAt = 0;
      cooldownSpan = LOSS_COOLDOWN_MS;
      requestedAt = -1e9;
    },
  };
}

export function cleanupTussle() {
  session = null;
  clearFailsafe();
  dropHandNode();
  setHeldFlag(false);
}
