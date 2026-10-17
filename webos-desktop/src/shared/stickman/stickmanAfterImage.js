import { fxRing, fxDust, screenShake } from "./stickmanFx.js";
import { pose } from "./stickmanRig.js";
import { playHit, playGrab } from "../chaosSfx.js";

const NS = "http://www.w3.org/2000/svg";
const TAU = Math.PI * 2;

export const COMBO_CHANCE = 0.28;
export const COMBO_ROLL_MS = 1400;
export const COMBO_CD_MS = 7500;
export const COMBO_MIN_DIST = 70;
export const COMBO_MAX_DIST = 760;
export const COMBO_RING = 86;
export const COMBO_REACH = 132;

const COIL_MS = 320;
const GAP_MS = 190;
const DASH_MS = 80;
const WIND_MS = 440;
const STRIKE_MS = 150;
const HOLD_MS = 140;
const FADE_MS = 280;
const RECOVER_MS = 480;
const BOX_W = 28;
const BOX_H = 64;
const MAX_SIL = 54;

let liveSil = 0;

function f(n) {
  return n.toFixed(1);
}

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function silhouette(layer, d, x, y, alpha, dur, delay, dx, dy) {
  if (!layer || !layer.isConnected || !d || liveSil >= MAX_SIL) return;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", BOX_W);
  svg.setAttribute("height", BOX_H);
  svg.setAttribute("viewBox", "0 0 " + BOX_W + " " + BOX_H);
  svg.style.cssText =
    "position:absolute;pointer-events:none;overflow:visible;opacity:0;left:" +
    f(x) +
    "px;top:" +
    f(y) +
    "px;filter:drop-shadow(0 0 4px rgba(255,40,30,.9)) drop-shadow(0 0 10px rgba(255,0,0,.5));";
  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#ff2a2a");
  path.setAttribute("stroke-width", "3.2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);
  if (!svg.animate) return;
  layer.appendChild(svg);
  liveSil += 1;
  let anim = null;
  try {
    anim = svg.animate(
      [
        { opacity: alpha, transform: "translate(0px,0px)" },
        {
          opacity: 0,
          transform: "translate(" + f(dx || 0) + "px," + f(dy || 0) + "px)",
        },
      ],
      {
        duration: dur,
        delay: delay || 0,
        easing: "ease-out",
        fill: "forwards",
      },
    );
  } catch {
    svg.remove();
    liveSil = Math.max(0, liveSil - 1);
    return;
  }
  const done = () => {
    try {
      svg.remove();
    } catch {}
    liveSil = Math.max(0, liveSil - 1);
  };
  anim.onfinish = done;
  anim.oncancel = done;
}

function streak(layer, x1, y1, x2, y2) {
  if (!layer || !layer.isConnected) return;
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 4) return;
  const ang = Math.atan2(y2 - y1, x2 - x1).toFixed(3);
  const node = document.createElement("div");
  node.style.cssText =
    "position:absolute;pointer-events:none;transform-origin:0 50%;opacity:0;left:" +
    f(x1) +
    "px;top:" +
    f(y1 - 3) +
    "px;width:" +
    f(len) +
    "px;height:6px;clip-path:polygon(0 50%,100% 0,100% 100%);background:linear-gradient(90deg,rgba(255,40,30,0) 0%,#ff3a2a 55%,#ffffff 100%);";
  if (!node.animate) return;
  layer.appendChild(node);
  let anim = null;
  try {
    anim = node.animate(
      [
        { transform: "rotate(" + ang + "rad) scaleX(0)", opacity: 1 },
        {
          transform: "rotate(" + ang + "rad) scaleX(1)",
          opacity: 0.95,
          offset: 0.3,
        },
        { transform: "rotate(" + ang + "rad) scaleX(1)", opacity: 0 },
      ],
      { duration: 300, easing: "ease-out", fill: "forwards" },
    );
  } catch {
    node.remove();
    return;
  }
  const done = () => {
    try {
      node.remove();
    } catch {}
  };
  anim.onfinish = done;
  anim.oncancel = done;
}

function reticle(layer, x, y, dur) {
  if (!layer || !layer.isConnected) return;
  const size = 96;
  const node = document.createElement("div");
  node.style.cssText =
    "position:absolute;pointer-events:none;opacity:0;box-sizing:border-box;border-radius:50%;border:2px solid #ff3a2a;box-shadow:0 0 12px rgba(255,40,30,.8),inset 0 0 10px rgba(255,40,30,.5);left:" +
    f(x - size / 2) +
    "px;top:" +
    f(y - size / 2) +
    "px;width:" +
    size +
    "px;height:" +
    size +
    "px;background:linear-gradient(#ff3a2a,#ff3a2a) center/2px 100% no-repeat,linear-gradient(#ff3a2a,#ff3a2a) center/100% 2px no-repeat;";
  if (!node.animate) return;
  layer.appendChild(node);
  let anim = null;
  try {
    anim = node.animate(
      [
        { transform: "scale(1.8) rotate(0deg)", opacity: 0 },
        { transform: "scale(1.2) rotate(40deg)", opacity: 0.9, offset: 0.25 },
        { transform: "scale(.5) rotate(90deg)", opacity: 0.95 },
      ],
      { duration: dur, easing: "ease-in", fill: "forwards" },
    );
  } catch {
    node.remove();
    return;
  }
  const done = () => {
    try {
      node.remove();
    } catch {}
  };
  anim.onfinish = done;
  anim.oncancel = done;
}

export function comboCoilPose() {
  return pose({
    lean: 0.5,
    tilt: 0.25,
    a1: 1.1,
    aK: 2.0,
    b1: 0.9,
    bK: 2.0,
    armA: -0.8,
    armAE: 0.8,
    armB: -1.0,
    armBE: 0.8,
    shout: 0.4,
  });
}

export function comboDashPose() {
  return pose({
    lean: 0.95,
    tilt: 0.1,
    a1: 1.2,
    aK: 1.3,
    b1: -1.0,
    bK: 1.0,
    armA: -1.2,
    armAE: 0.3,
    armB: -1.0,
    armBE: 0.3,
    shout: 1,
  });
}

export function comboWindPose(ang, charge) {
  const c = clamp(charge, 0, 1);
  return pose({
    lean: 0.2 + 0.25 * c,
    tilt: 0.1,
    a1: 0.6,
    aK: 0.6,
    b1: -0.5,
    bK: 0.5,
    armA: ang - 1.9 * c,
    armAE: 0.9 * c,
    armB: ang + 0.6,
    armBE: 1.3,
    shout: 0.5 + 0.4 * c,
  });
}

export function comboStrikePose(ang) {
  return pose({
    lean: 0.42,
    tilt: -0.05,
    a1: 0.9,
    aK: 0.5,
    b1: -0.7,
    bK: 0.4,
    armA: ang,
    armAE: 0,
    armB: ang + 1.2,
    armBE: 1.0,
    shout: 1,
  });
}

function decoyNode(layer) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", BOX_W);
  svg.setAttribute("height", BOX_H);
  svg.setAttribute("viewBox", "0 0 " + BOX_W + " " + BOX_H);
  svg.style.cssText =
    "position:absolute;pointer-events:none;overflow:visible;opacity:0;filter:drop-shadow(0 0 5px rgba(255,40,30,.95)) drop-shadow(0 0 12px rgba(255,0,0,.55));";
  const path = document.createElementNS(NS, "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#ff2a2a");
  path.setAttribute("stroke-width", "3.2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);
  layer.appendChild(svg);
  return { svg, path };
}

export function createAfterimageCombo(host) {
  const fn = (name) =>
    host && typeof host[name] === "function" ? host[name] : null;
  const getState = fn("getState");
  const setState = fn("setState");
  const getFloor = fn("getFloor");
  const getLayer = fn("getLayer");
  const getCursor = fn("getCursor");
  const cursorDead = fn("cursorDead");
  const getRage = fn("getRage");
  const currentPath = fn("currentPath");
  const pathFor = fn("pathFor");
  const hitCursor = fn("hitCursor");
  const stomp = fn("stomp");
  const onWhiff = fn("onWhiff");
  const resetAim = fn("resetAim");
  const canStart = fn("canStart");
  const onStart = fn("onStart");
  const onEnd = fn("onEnd");

  let run = null;
  let cdAt =
    (typeof performance !== "undefined" ? performance.now() : 0) +
    rand(6000, 12000);
  let nextRollAt = 0;
  let cvx = 0;
  let cvy = 0;
  let lastCX = null;
  let lastCY = null;
  let lastObsAt = 0;

  function layer() {
    try {
      return getLayer ? getLayer() : null;
    } catch {
      return null;
    }
  }

  function cursor() {
    try {
      const c = getCursor ? getCursor() : null;
      if (!c || !c.seen) return null;
      if (cursorDead && cursorDead()) return null;
      return { x: c.x, y: c.y };
    } catch {
      return null;
    }
  }

  function rageNow() {
    try {
      return getRage ? clamp(getRage(), 0, 1) : 0;
    } catch {
      return 0;
    }
  }

  function observe(now) {
    const c = cursor();
    if (!c) {
      lastCX = null;
      return;
    }
    if (lastCX !== null && now > lastObsAt) {
      const span = Math.max(8, now - lastObsAt);
      cvx += (((c.x - lastCX) / span) * 16.667 - cvx) * 0.25;
      cvy += (((c.y - lastCY) / span) * 16.667 - cvy) * 0.25;
    }
    lastCX = c.x;
    lastCY = c.y;
    lastObsAt = now;
  }

  function clampSpot(px, py) {
    let floor = window.innerHeight;
    try {
      if (getFloor) floor = getFloor();
    } catch {}
    return {
      x: clamp(px - BOX_W / 2, 0, Math.max(0, window.innerWidth - BOX_W)),
      y: clamp(py - BOX_H / 2, 0, Math.max(0, floor - BOX_H - 2)),
    };
  }

  function aimAt(px, py, dirSign, c) {
    const dx = c.x - px;
    const dy = c.y - (py - 10);
    return Math.atan2(dx * dirSign, dy);
  }

  function cleanup() {
    if (!run) return;
    for (let i = 0; i < run.slots.length; i++) {
      const s = run.slots[i];
      if (s.node) {
        try {
          s.node.svg.remove();
        } catch {}
        s.node = null;
      }
    }
  }

  function isActive() {
    return !!run;
  }

  function start(now) {
    const state = getState ? getState() : null;
    const lay = layer();
    const c = cursor();
    if (!state || !lay || !c || !pathFor) return false;
    const rage = rageNow();
    const k = 1 / (1 + 0.45 * rage);
    const speed = Math.hypot(cvx, cvy);
    const base = speed > 2.2 ? Math.atan2(cvy, cvx) + Math.PI : rand(0, TAU);
    const realIdx = Math.floor(Math.random() * 3);
    const decoyAngles = [base + TAU / 3, base - TAU / 3];
    const coil = COIL_MS * k;
    const slots = [];
    let decoyAt = 0;
    for (let i = 0; i < 3; i++) {
      const real = i === realIdx;
      const dashAt = now + coil + i * GAP_MS * k;
      const arriveAt = dashAt + DASH_MS * k;
      const strikeAt = arriveAt + WIND_MS * k;
      slots.push({
        real,
        ang: real ? base : decoyAngles[decoyAt++],
        dashAt,
        arriveAt,
        strikeAt,
        state: 0,
        x: 0,
        y: 0,
        px: 0,
        py: 0,
        dir: state.dir >= 0 ? 1 : -1,
        node: null,
        lx: 0,
        ly: 0,
        lunge: 0,
        fadeAt: 0,
        hit: false,
      });
    }
    let lastDone = 0;
    for (let i = 0; i < slots.length; i++) {
      lastDone = Math.max(
        lastDone,
        slots[i].strikeAt + (STRIKE_MS + HOLD_MS) * k,
      );
    }
    const endAt = lastDone + RECOVER_MS * k;
    let originD = "";
    try {
      originD = currentPath ? currentPath() : "";
    } catch {}
    run = {
      k,
      t0: now,
      ox: state.x,
      oy: state.y,
      odir: state.dir >= 0 ? 1 : -1,
      coilEnd: now + coil,
      endAt,
      slots,
      realIdx,
      vanished: false,
      originD,
      lastC: c,
      jitterAt: 0,
    };
    cdAt = endAt + COMBO_CD_MS * (1 - 0.5 * rage);
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
    try {
      playGrab();
    } catch {}
    return true;
  }

  function tryStart(now) {
    if (run || now < cdAt || now < nextRollAt) return false;
    nextRollAt = now + COMBO_ROLL_MS;
    const c = cursor();
    const state = getState ? getState() : null;
    if (!c || !state) return false;
    const d = Math.hypot(
      c.x - (state.x + BOX_W / 2),
      c.y - (state.y + BOX_H / 2),
    );
    if (d < COMBO_MIN_DIST || d > COMBO_MAX_DIST) return false;
    if (canStart) {
      let ok = false;
      try {
        ok = !!canStart(now);
      } catch {}
      if (!ok) return false;
    }
    if (Math.random() >= COMBO_CHANCE * (1 + 1.5 * rageNow())) return false;
    return start(now);
  }

  function finish(now) {
    const current = run;
    cleanup();
    run = null;
    if (current && setState) {
      const real = current.slots[current.realIdx];
      try {
        setState({
          flying: true,
          wasAir: true,
          flipping: false,
          spin: 0,
          velX: real.dir * 1.5,
          velY: 0.5,
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

  function cancel(now) {
    if (!run) return;
    cleanup();
    run = null;
    if (onEnd) {
      try {
        onEnd(now);
      } catch {}
    }
  }

  function vanish(lay) {
    run.vanished = true;
    const ox = run.ox;
    const oy = run.oy;
    const cx = ox + BOX_W / 2;
    const cy = oy + BOX_H / 2;
    silhouette(lay, run.originD, ox, oy, 0.65, 460, 0, -16, 0);
    silhouette(lay, run.originD, ox, oy, 0.5, 460, 30, 16, -6);
    silhouette(lay, run.originD, ox, oy, 0.4, 460, 60, 0, -14);
    try {
      fxRing(lay, cx, cy, 120, "#ff2a2a");
      fxDust(lay, cx, oy + BOX_H, 0.6);
      screenShake(0.2);
    } catch {}
  }

  function beginDash(s, lay, c) {
    const tx = c.x + cvx * 7;
    const ty = c.y + cvy * 7;
    const spot = clampSpot(
      tx + Math.cos(s.ang) * COMBO_RING,
      ty + Math.sin(s.ang) * COMBO_RING,
    );
    s.x = spot.x;
    s.y = spot.y;
    s.px = spot.x + BOX_W / 2;
    s.py = spot.y + BOX_H / 2;
    s.dir = c.x >= s.px ? 1 : -1;
    s.state = 1;
    const oc = { x: run.ox + BOX_W / 2, y: run.oy + BOX_H / 2 };
    streak(lay, oc.x, oc.y, s.px, s.py);
    const ds = s.px >= oc.x ? 1 : -1;
    let d = "";
    try {
      d = pathFor(comboDashPose(), ds);
    } catch {}
    for (let j = 1; j <= 3; j++) {
      const t = j / 4;
      silhouette(
        lay,
        d,
        run.ox + (s.x - run.ox) * t,
        run.oy + (s.y - run.oy) * t,
        0.55 - j * 0.1,
        320,
        j * 22,
        -ds * 8,
        0,
      );
    }
  }

  function arrive(s, lay, c, now) {
    s.state = 2;
    if (!s.real) {
      try {
        s.node = decoyNode(lay);
      } catch {
        s.node = null;
      }
    }
    let d = "";
    try {
      d = pathFor(comboWindPose(aimAt(s.px, s.py, s.dir, c), 1), s.dir);
    } catch {}
    silhouette(lay, d, s.x, s.y, 0.6, 360, 0, -s.dir * 10, 0);
    silhouette(lay, d, s.x, s.y, 0.4, 360, 40, -s.dir * 20, 0);
    try {
      fxRing(lay, s.px, s.py, 74, "#ff3030");
      fxDust(lay, s.px, s.y + BOX_H, 0.35);
    } catch {}
    reticle(lay, c.x, c.y, Math.max(120, s.strikeAt - now));
  }

  function strike(s, lay, c, now) {
    s.state = 3;
    const dx = c.x - s.px;
    const dy = c.y - s.py;
    const d = Math.hypot(dx, dy);
    const ux = d > 0.001 ? dx / d : s.dir;
    const uy = d > 0.001 ? dy / d : 0;
    const reach = clamp(d - 24, 0, 36);
    s.lx = ux * reach;
    s.ly = uy * reach;
    const tipX = s.px + ux * Math.min(d, reach + 26);
    const tipY = s.py + uy * Math.min(d, reach + 26);
    if (!s.real) {
      try {
        fxRing(lay, tipX, tipY, 56, "#ff7070");
      } catch {}
      return;
    }
    try {
      playHit();
      fxRing(lay, tipX, tipY, 80, "#ffffff");
      fxDust(lay, tipX, tipY, 0.5);
      screenShake(0.35);
    } catch {}
    try {
      if (stomp) stomp(tipX, tipY, 28);
    } catch {}
    if (d <= COMBO_REACH) {
      s.hit = true;
      try {
        if (hitCursor) hitCursor(c.x, c.y);
        fxRing(lay, c.x, c.y, 130, "#ff2a2a");
        screenShake(0.6);
      } catch {}
    } else if (onWhiff) {
      try {
        onWhiff(now, s.px, s.py);
      } catch {}
    }
  }

  function tickDecoy(s, now, lay) {
    const node = s.node;
    if (!node) return;
    const u =
      s.state >= 3 ? clamp((now - s.strikeAt) / (STRIKE_MS * run.k), 0, 1) : 0;
    const lunge = easeOut(u);
    node.svg.style.left = f(s.x + s.lx * lunge) + "px";
    node.svg.style.top = f(s.y + s.ly * lunge) + "px";
    const c = run.lastC;
    const ang = aimAt(s.px, s.py, s.dir, c);
    let p = null;
    let alpha = 0.6 + 0.12 * Math.sin(now * 0.05);
    if (s.state === 2) {
      const charge = clamp((now - s.arriveAt) / (WIND_MS * run.k), 0, 1);
      p = comboWindPose(ang, charge);
      alpha = Math.min(alpha, 0.2 + charge * 0.6);
    } else if (s.state === 3) {
      p = comboStrikePose(ang);
      alpha = 0.85;
    } else if (s.state === 4) {
      p = comboStrikePose(ang);
      alpha = 0.85 * (1 - clamp((now - s.fadeAt) / (FADE_MS * run.k), 0, 1));
    }
    if (p) {
      try {
        node.path.setAttribute("d", pathFor(p, s.dir));
      } catch {}
    }
    node.svg.style.opacity = alpha.toFixed(2);
  }

  function step(now) {
    if (!run) return null;
    const state = getState ? getState() : null;
    const lay = layer();
    if (!state || !lay) {
      cancel(now);
      return null;
    }
    if (now >= run.endAt) {
      finish(now);
      return null;
    }
    const live = cursor();
    if (live) run.lastC = live;
    const c = run.lastC;
    if (now >= run.coilEnd && !run.vanished) vanish(lay);
    if (now < run.coilEnd && now >= run.jitterAt) {
      run.jitterAt = now + 60;
      silhouette(
        lay,
        run.originD,
        run.ox + rand(-3, 3),
        run.oy + rand(-2, 2),
        0.5,
        260,
        0,
        rand(-6, 6),
        0,
      );
    }
    for (let i = 0; i < run.slots.length; i++) {
      const s = run.slots[i];
      if (s.state === 0 && now >= s.dashAt) beginDash(s, lay, c);
      if (s.state === 1 && now >= s.arriveAt) arrive(s, lay, c, now);
      if (s.state === 2 && now >= s.strikeAt) strike(s, lay, c, now);
      if (s.state === 3 && now >= s.strikeAt + (STRIKE_MS + HOLD_MS) * run.k) {
        s.state = 4;
        s.fadeAt = now;
        if (!s.real) {
          let d = "";
          try {
            d = pathFor(comboStrikePose(aimAt(s.px, s.py, s.dir, c)), s.dir);
          } catch {}
          silhouette(
            lay,
            d,
            s.x + s.lx,
            s.y + s.ly,
            0.5,
            380,
            0,
            s.dir * 10,
            -8,
          );
          try {
            fxRing(lay, s.px, s.py, 60, "#ff4a4a");
          } catch {}
        }
      }
      if (
        !s.real &&
        s.state === 4 &&
        now - s.fadeAt >= FADE_MS * run.k &&
        s.node
      ) {
        try {
          s.node.svg.remove();
        } catch {}
        s.node = null;
        s.state = 5;
      }
      if (!s.real && s.node) tickDecoy(s, now, lay);
    }
    const real = run.slots[run.realIdx];
    if (now < run.coilEnd) {
      return {
        x: run.ox + rand(-1, 1),
        y: run.oy,
        dir: run.odir,
        target: comboCoilPose(),
        opacity: 1,
        snap: false,
      };
    }
    if (real.state < 2) {
      return {
        x: run.ox,
        y: run.oy,
        dir: run.odir,
        target: comboDashPose(),
        opacity: 0,
        snap: true,
      };
    }
    const ang = aimAt(real.px, real.py, real.dir, c);
    let target = null;
    let lunge = 0;
    if (real.state === 2) {
      target = comboWindPose(ang, (now - real.arriveAt) / (WIND_MS * run.k));
    } else {
      target = comboStrikePose(ang);
      lunge = easeOut(clamp((now - real.strikeAt) / (STRIKE_MS * run.k), 0, 1));
      if (real.state >= 4) {
        lunge *=
          1 - clamp((now - real.fadeAt) / (RECOVER_MS * run.k), 0, 1) * 0.6;
      }
    }
    const bob = real.state === 2 ? Math.sin(now * 0.03) * 1.2 : 0;
    return {
      x: real.x + real.lx * lunge,
      y: real.y + real.ly * lunge + bob,
      dir: real.dir,
      target,
      opacity: 1,
      snap: real.state === 3,
    };
  }

  function destroy() {
    cleanup();
    run = null;
  }

  return {
    observe,
    tryStart,
    step,
    cancel,
    destroy,
    isActive,
  };
}
