import { fxJetExhaust } from "./stickmanFx.js";
import { pose } from "./stickmanRig.js";

const NS = "http://www.w3.org/2000/svg";

export const JET_CHANCE = 0.12;
export const JET_ROLL_MS = 1500;
export const JET_CD_MS = 26000;
export const JET_MIN_MS = 3200;
export const JET_MAX_MS = 6200;
export const JET_HOVER_MIN = 70;
export const JET_FLAME_MS = 70;
export const JET_PHASE_STEP = 0.06;
export const JET_RAGE_TARGET = 0.7;

const FLAME_OUTER_D = "M-3.2 0C-4.6 5.5-3 11.5 0 21C3 11.5 4.6 5.5 3.2 0Z";
const FLAME_INNER_D = "M-1.5 0C-2.1 4-1.1 8.5 0 13C1.1 8.5 2.1 4 1.5 0Z";
const TANK_GAP = 2.6;
const TANK_LEN = 8;
const NOZZLE_Y = 9;
const PACK_BACK = 5;
const PACK_COLOR = "#9aa3b2";
const THRUST = 0.16;
const DRIFT_DAMP = 0.95;
const MAX_DRIFT = 3.2;
const EDGE_GAP = 8;

function svgEl(tag, attrs) {
  const node = document.createElementNS(NS, tag);
  for (const key in attrs) node.setAttribute(key, attrs[key]);
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

export function jetPose(p, now, vn) {
  const v = vn || 0;
  const sway = Math.sin(p * 1.4);
  const flutter = Math.sin(now * 0.02);
  return pose({
    lean: 0.06 + 0.2 * v + 0.03 * flutter,
    tilt: 0.06 + 0.04 * sway,
    a1: 0.4 + 0.25 * sway - 0.45 * v,
    aK: 1.4,
    b1: -0.3 + 0.25 * sway - 0.35 * v,
    bK: 1.5,
    armA: 1.15,
    armAE: 0.85,
    armB: 0.85,
    armBE: 1.05,
    shout: 0.35,
  });
}

export function createJetpackRig() {
  const root = svgEl("g", { display: "none", class: "stk-jet-pack" });
  const tankL = svgEl("path", {
    d: "M" + -TANK_GAP + " 0L" + -TANK_GAP + " " + TANK_LEN,
    fill: "none",
    style: "stroke:" + PACK_COLOR,
    "stroke-width": 3.6,
    "stroke-linecap": "round",
  });
  const tankR = svgEl("path", {
    d: "M" + TANK_GAP + " 0L" + TANK_GAP + " " + TANK_LEN,
    fill: "none",
    style: "stroke:" + PACK_COLOR,
    "stroke-width": 3.6,
    "stroke-linecap": "round",
  });
  const strap = svgEl("path", {
    d: "M" + -TANK_GAP + " 2.2L" + TANK_GAP + " 2.2",
    fill: "none",
    style: "stroke:#ff0000",
    "stroke-width": 1.4,
    "stroke-linecap": "round",
  });
  root.appendChild(tankL);
  root.appendChild(tankR);
  root.appendChild(strap);
  const flames = [];
  const offsets = [-TANK_GAP, TANK_GAP];
  for (let i = 0; i < offsets.length; i++) {
    const node = svgEl("g", { display: "none" });
    node.appendChild(
      svgEl("path", {
        d: FLAME_OUTER_D,
        style: "fill:var(--stk-flame-outer)",
        class: "stk-jet-flame",
        opacity: 0.92,
      }),
    );
    node.appendChild(
      svgEl("path", {
        d: FLAME_INNER_D,
        style: "fill:var(--stk-flame-core)",
        class: "stk-jet-core",
        opacity: 0.9,
      }),
    );
    root.insertBefore(node, tankL);
    flames.push({ node: node, x: offsets[i] });
  }
  return { root: root, flames: flames };
}

export function updateJetpackRig(rig, joints, fv, level, now) {
  if (!rig) return null;
  if (level < 0.02) {
    rig.root.setAttribute("display", "none");
    return null;
  }
  const tx = joints.neck.x - joints.hip.x;
  const ty = joints.neck.y - joints.hip.y;
  const tl = Math.max(0.001, Math.hypot(tx, ty));
  const ux = tx / tl;
  const uy = ty / tl;
  const ax = joints.hip.x + ux * tl * 0.62 + uy * fv * PACK_BACK;
  const ay = joints.hip.y + uy * tl * 0.62 - ux * fv * PACK_BACK;
  const rot = Math.atan2(ux, -uy) * 57.2958;
  rig.root.setAttribute("display", "inline");
  rig.root.setAttribute("opacity", clamp(level * 2.5, 0, 1).toFixed(2));
  rig.root.setAttribute(
    "transform",
    "translate(" +
      ax.toFixed(1) +
      " " +
      ay.toFixed(1) +
      ") rotate(" +
      rot.toFixed(1) +
      ")",
  );
  const flutter =
    0.9 + 0.12 * Math.sin(now * 0.045) + 0.06 * Math.sin(now * 0.113);
  const len = level * flutter;
  const wide = 0.55 + 0.45 * level;
  for (let i = 0; i < rig.flames.length; i++) {
    const fl = rig.flames[i];
    if (len < 0.05) {
      fl.node.setAttribute("display", "none");
      continue;
    }
    fl.node.setAttribute("display", "inline");
    fl.node.setAttribute(
      "transform",
      "translate(" +
        fl.x +
        " " +
        NOZZLE_Y +
        ") scale(" +
        wide.toFixed(2) +
        " " +
        len.toFixed(2) +
        ")",
    );
  }
  return { x: ax - ux * NOZZLE_Y, y: ay - uy * NOZZLE_Y };
}

export function jetFire(layer, x, y, dirX, dirY, power) {
  if (!layer) return;
  try {
    fxJetExhaust(layer, x, y, dirX, dirY, power);
  } catch {}
}

export function createJetpack(host) {
  const fn = (name) =>
    host && typeof host[name] === "function" ? host[name] : null;
  const getState = fn("getState");
  const setState = fn("setState");
  const getSize = fn("getSize");
  const getFloor = fn("getFloor");
  const getLayer = fn("getLayer");
  const getHead = fn("getHead");
  const getNozzle = fn("getNozzle");
  const isLaserBusy = fn("isLaserBusy");
  const beginAim = fn("beginAim");
  const tickAim = fn("tickAim");
  const beginLaser = fn("beginLaser");
  const tickLaser = fn("tickLaser");
  const isTussling = fn("isTussling");
  const interruptTussle = fn("interruptTussle");
  const resetAim = fn("resetAim");
  const canStart = fn("canStart");
  const onStart = fn("onStart");
  const onEnd = fn("onEnd");

  let until = 0;
  let cooldownAt =
    (typeof performance !== "undefined" ? performance.now() : 0) +
    rand(5000, 12000);
  let nextRollAt = 0;
  let baseY = 0;
  let retargetAt = 0;
  let flameAt = 0;
  let nextShoot = 0;
  let turnAt = 0;

  function sizeOf() {
    return getSize ? getSize() : { w: 28, h: 64 };
  }

  function hoverRange(floorTop, size) {
    const low = Math.max(JET_HOVER_MIN, floorTop - size.h - JET_HOVER_MIN);
    const high = Math.max(JET_HOVER_MIN, low - 240);
    return { low: low, high: high };
  }

  function isActive(now) {
    return now < until;
  }

  function stop(now, cooldown) {
    until = 0;
    if (cooldown) cooldownAt = now + JET_CD_MS;
  }

  function start(now) {
    if (isTussling && isTussling() && interruptTussle) {
      try {
        interruptTussle(now);
      } catch {}
    }
    const size = sizeOf();
    const floorTop = getFloor ? getFloor() : 0;
    const range = hoverRange(floorTop, size);
    until = now + rand(JET_MIN_MS, JET_MAX_MS);
    cooldownAt = until + JET_CD_MS;
    baseY = rand(range.high, range.low);
    retargetAt = now + rand(1200, 2400);
    flameAt = now;
    nextShoot = now + rand(500, 900);
    turnAt = now + rand(900, 1800);
    if (resetAim) {
      try {
        resetAim();
      } catch {}
    }
    if (onStart) {
      try {
        onStart(now);
      } catch {}
    }
  }

  function tryStart(now) {
    if (isActive(now) || now < cooldownAt || now < nextRollAt) return false;
    nextRollAt = now + JET_ROLL_MS;
    if (canStart) {
      let ok = false;
      try {
        ok = !!canStart(now);
      } catch {}
      if (!ok) return false;
    }
    if (Math.random() >= JET_CHANCE) return false;
    start(now);
    return true;
  }

  function end(now, state) {
    stop(now, false);
    if (state && setState) {
      try {
        setState({
          flying: true,
          wasAir: true,
          flipping: false,
          spin: 0,
          velX: state.dir * 3.5,
          velY: 1.5,
          sqV: 0.1,
        });
      } catch {}
    }
    if (resetAim) {
      try {
        resetAim();
      } catch {}
    }
    if (onEnd) {
      try {
        onEnd(now);
      } catch {}
    }
  }

  function step(now, dt) {
    const state = getState ? getState() : null;
    if (!state) return null;
    if (now >= until) {
      end(now, state);
      return null;
    }
    const size = sizeOf();
    const floorTop = getFloor ? getFloor() : 0;
    let x = state.x;
    let y = state.y;
    let velX = state.velX;
    let dir = state.dir;
    const laserBusy = isLaserBusy ? !!isLaserBusy() : false;
    const holding = !!state.aiming || laserBusy;

    if (!holding) velX += dir * THRUST * dt;
    velX *= Math.pow(DRIFT_DAMP, dt);
    velX = clamp(velX, -MAX_DRIFT, MAX_DRIFT);
    x += velX * dt;
    const maxX = Math.max(0, window.innerWidth - size.w);
    if (x <= 0) {
      x = 0;
      velX = Math.abs(velX) * 0.3;
      dir = 1;
      turnAt = now + rand(900, 1800);
    } else if (x >= maxX) {
      x = maxX;
      velX = -Math.abs(velX) * 0.3;
      dir = -1;
      turnAt = now + rand(900, 1800);
    }
    if (!holding && now >= turnAt) {
      dir = -dir;
      turnAt = now + rand(900, 1800);
    }

    const range = hoverRange(floorTop, size);
    const lowest = Math.max(0, floorTop - size.h - EDGE_GAP);
    if (now >= retargetAt) {
      baseY += rand(-60, 60);
      retargetAt = now + rand(1200, 2400);
    }
    baseY = clamp(baseY, range.high, range.low);
    const bob = Math.sin(now * 0.005) * 5;
    y += (clamp(baseY + bob, 0, lowest) - y) * ease(0.1, dt);

    if (!state.aiming && !laserBusy && now >= nextShoot) {
      let fired = false;
      if (beginLaser && Math.random() < 0.2) {
        try {
          fired = !!beginLaser(now);
        } catch {}
      }
      if (!fired && beginAim) {
        try {
          beginAim(now);
          fired = true;
        } catch {}
      }
      if (fired) nextShoot = now + rand(1400, 2400);
    }
    if (state.aiming && tickAim) {
      try {
        tickAim(now);
      } catch {}
    }
    if (tickLaser) {
      try {
        tickLaser(now, dt, x, y, getHead ? getHead() : null);
      } catch {}
    }

    const vn = clamp((velX * dir) / MAX_DRIFT, 0, 1);

    if (now >= flameAt) {
      flameAt = now + JET_FLAME_MS;
      const nozzle = getNozzle ? getNozzle() : null;
      const px = nozzle ? nozzle.x : x + size.w / 2 - dir * 5;
      const py = nozzle ? nozzle.y : y + size.h * 0.7;
      const lean = -dir * (0.2 + 0.3 * vn);
      const len = Math.hypot(lean, 1) || 1;
      jetFire(
        getLayer ? getLayer() : null,
        px + rand(-1.5, 1.5),
        py + rand(0, 3),
        lean / len,
        1 / len,
        rand(0.75, 1.35),
      );
    }

    return {
      x: x,
      y: y,
      velX: velX,
      dir: dir,
      target: jetPose(state.phase, now, vn),
      phaseStep: JET_PHASE_STEP,
      rageTarget: JET_RAGE_TARGET,
    };
  }

  return {
    isActive,
    step,
    stop,
    tryStart,
    jetFire,
  };
}
