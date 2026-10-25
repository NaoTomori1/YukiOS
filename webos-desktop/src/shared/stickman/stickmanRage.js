import { fxRing, fxDust, screenShake, pose } from "./stickmanFx.js";
import { playHit, playShatter } from "../chaosSfx.js";

export const RAGE_MAX_LEVEL = 5;
export const RAGE_ENGAGE_DIST = 250;
export const RAGE_ESCAPE_DIST = 400;
export const RAGE_ESCAPE_WINDOW_MS = 2400;
export const RAGE_ESCAPE_TRAVEL = 150;
export const RAGE_ESCAPE_CD_MS = 1500;
export const RAGE_DECAY_MS = 40000;
export const RAGE_DURATION_MS = 15000;
export const RAGE_SLAM_MIN_DIST = 150;
export const RAGE_SLAM_MAX_DIST = 680;
export const RAGE_SLAM_CD_MS = 8000;
export const RAGE_SLAM_ROLL_MS = 900;
export const RAGE_SLAM_LAND_MS = 460;

const RAGE_FILTER_STEP_MS = 100;
const RAGE_GLOW_STEPS = 16;
const RAGE_PULSE_STEPS = 16;

const WAVE_SPEED = 17;
const WAVE_TURN = 0.035;
const WAVE_LIFE_MS = 1500;
const WAVE_HIT_DIST = 30;
const MAX_WAVES = 4;
const MAX_NODES = 72;

let liveNodes = 0;

function f(n) {
  return n.toFixed(1);
}

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function norm(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function spawn(layer, node, frames, opts) {
  if (!layer || !layer.isConnected || liveNodes >= MAX_NODES || !node.animate) {
    return null;
  }
  layer.appendChild(node);
  liveNodes += 1;
  let anim = null;
  try {
    anim = node.animate(frames, opts);
  } catch {
    node.remove();
    liveNodes = Math.max(0, liveNodes - 1);
    return null;
  }
  const done = () => {
    try {
      node.remove();
    } catch {}
    liveNodes = Math.max(0, liveNodes - 1);
  };
  anim.onfinish = done;
  anim.oncancel = done;
  return anim;
}

function groundRing(layer, x, y, size, color, delay) {
  const h = size * 0.26;
  const node = document.createElement("div");
  node.style.cssText =
    "position:absolute;pointer-events:none;opacity:0;left:" +
    f(x - size / 2) +
    "px;top:" +
    f(y - h / 2) +
    "px;width:" +
    f(size) +
    "px;height:" +
    f(h) +
    "px;border-radius:50%;box-sizing:border-box;border:3px solid " +
    color +
    ";box-shadow:0 0 14px " +
    color +
    ",inset 0 0 14px " +
    color +
    ";";
  spawn(
    layer,
    node,
    [
      { transform: "scale(.12,.12)", opacity: 0.95 },
      { transform: "scale(1,1)", opacity: 0 },
    ],
    {
      duration: 540,
      delay: delay || 0,
      easing: "cubic-bezier(.1,.7,.3,1)",
      fill: "forwards",
    },
  );
}

function groundFlash(layer, x, y, size) {
  const w = size * 0.9;
  const h = 34;
  const node = document.createElement("div");
  node.style.cssText =
    "position:absolute;pointer-events:none;left:" +
    f(x - w / 2) +
    "px;top:" +
    f(y - h * 0.7) +
    "px;width:" +
    f(w) +
    "px;height:" +
    f(h) +
    "px;border-radius:50%;background:radial-gradient(ellipse,rgba(255,244,200,.95) 0%,rgba(255,120,40,.75) 32%,rgba(255,30,10,0) 70%);";
  spawn(
    layer,
    node,
    [
      { transform: "scale(.3,.6)", opacity: 1 },
      { transform: "scale(1,1.1)", opacity: 0 },
    ],
    { duration: 300, easing: "ease-out", fill: "forwards" },
  );
}

function cracks(layer, x, y, size, count) {
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const len = size * rand(0.22, 0.46);
    const ang = (side > 0 ? 0 : 180) + rand(-12, 12);
    const node = document.createElement("div");
    node.style.cssText =
      "position:absolute;pointer-events:none;transform-origin:0 50%;left:" +
      f(x) +
      "px;top:" +
      f(y - 2 + rand(-2, 2)) +
      "px;width:" +
      f(len) +
      "px;height:3px;clip-path:polygon(0 0,100% 50%,0 100%);background:linear-gradient(90deg,#fff2c0 0%,#ff5a1a 30%,rgba(120,10,0,.85) 70%,rgba(60,0,0,0) 100%);";
    spawn(
      layer,
      node,
      [
        { transform: "rotate(" + f(ang) + "deg) scaleX(0)", opacity: 1 },
        {
          transform: "rotate(" + f(ang) + "deg) scaleX(1)",
          opacity: 0.9,
          offset: 0.3,
        },
        { transform: "rotate(" + f(ang) + "deg) scaleX(1)", opacity: 0 },
      ],
      {
        duration: 520 + Math.random() * 280,
        easing: "ease-out",
        fill: "forwards",
      },
    );
  }
}

function embers(layer, x, y, count, power) {
  for (let i = 0; i < count; i++) {
    const size = 2.5 + Math.random() * 3.5;
    const dx = (Math.random() - 0.5) * 70 * power;
    const rise = 30 + Math.random() * 60 * power;
    const node = document.createElement("div");
    node.style.cssText =
      "position:absolute;pointer-events:none;border-radius:50%;left:" +
      f(x - size / 2) +
      "px;top:" +
      f(y - size / 2) +
      "px;width:" +
      f(size) +
      "px;height:" +
      f(size) +
      "px;background:radial-gradient(circle,#fff3c0 0%,#ff8a2a 55%,rgba(255,60,10,0) 80%);";
    spawn(
      layer,
      node,
      [
        { transform: "translate(0px,0px) scale(1)", opacity: 1 },
        {
          transform:
            "translate(" + f(dx * 0.6) + "px," + f(-rise) + "px) scale(.8)",
          opacity: 0.85,
          offset: 0.5,
        },
        {
          transform:
            "translate(" + f(dx) + "px," + f(-rise * 0.6) + "px) scale(.2)",
          opacity: 0,
        },
      ],
      {
        duration: 520 + Math.random() * 520,
        easing: "ease-out",
        fill: "forwards",
      },
    );
  }
}

function debris(layer, x, y, count) {
  for (let i = 0; i < count; i++) {
    const size = 3 + Math.random() * 3;
    const dx = (Math.random() - 0.5) * 220;
    const up = 40 + Math.random() * 90;
    const node = document.createElement("div");
    node.style.cssText =
      "position:absolute;pointer-events:none;left:" +
      f(x - size / 2) +
      "px;top:" +
      f(y - size) +
      "px;width:" +
      f(size) +
      "px;height:" +
      f(size) +
      "px;background:" +
      (Math.random() < 0.5 ? "#ff5a1a" : "#ffd36a") +
      ";box-shadow:0 0 6px rgba(255,90,20,.9);";
    spawn(
      layer,
      node,
      [
        { transform: "translate(0px,0px) rotate(0deg)", opacity: 1 },
        {
          transform:
            "translate(" +
            f(dx * 0.55) +
            "px," +
            f(-up) +
            "px) rotate(" +
            f(rand(-200, 200)) +
            "deg)",
          opacity: 1,
          offset: 0.45,
        },
        {
          transform:
            "translate(" +
            f(dx) +
            "px,6px) rotate(" +
            f(rand(-400, 400)) +
            "deg)",
          opacity: 0,
        },
      ],
      {
        duration: 560 + Math.random() * 360,
        easing: "cubic-bezier(.2,.6,.5,1)",
        fill: "forwards",
      },
    );
  }
}

function arcStyle(scale) {
  const w = 34 * scale;
  const h = 96 * scale;
  return (
    "position:absolute;pointer-events:none;left:0;top:0;box-sizing:border-box;width:" +
    f(w) +
    "px;height:" +
    f(h) +
    "px;margin:" +
    f(-h / 2) +
    "px 0 0 " +
    f(-w / 2) +
    "px;border-radius:50%;border-right:" +
    f(7 * scale) +
    "px solid #ff3b2a;background:radial-gradient(ellipse at 100% 50%,rgba(255,90,40,.4),rgba(255,40,20,0) 65%);filter:drop-shadow(0 0 8px #ff2a14) drop-shadow(0 0 18px rgba(255,60,20,.7));will-change:transform;"
  );
}

export function slamDivePose(dived, now) {
  const t = Math.sin(now * 0.05) * 0.04;
  if (!dived) {
    return pose({
      lean: 0.2 + t,
      tilt: -0.15,
      a1: 0.7,
      aK: 1.4,
      b1: 0.1,
      bK: 0.8,
      armA: 2.9,
      armAE: 0.15,
      armB: 2.7,
      armBE: 0.2,
      shout: 1,
    });
  }
  return pose({
    lean: 0.45,
    tilt: 0.25,
    a1: 0.55,
    aK: 0.6,
    b1: -0.45,
    bK: 0.5,
    armA: 0.15,
    armAE: 0.1,
    armB: 0.05,
    armBE: 0.15,
    shout: 1,
  });
}

export function slamLandPose(u) {
  const r = clamp(u, 0, 1);
  return pose({
    lean: 0.8 - 0.55 * r,
    tilt: 0.3 - 0.2 * r,
    a1: 1.25 - 0.8 * r,
    aK: 2.2 - 1.7 * r,
    b1: 1.0 - 0.8 * r,
    bK: 2.1 - 1.6 * r,
    armA: 0.35,
    armAE: 0.1 + 1.2 * r,
    armB: 0.1,
    armBE: 0.15 + 1.2 * r,
    shout: 0.8,
  });
}

export function createRageSystem(host) {
  const fn = (name) =>
    host && typeof host[name] === "function" ? host[name] : null;
  const getLayer = fn("getLayer");
  const getCursor = fn("getCursor");
  const getAnchor = fn("getAnchor");
  const cursorDead = fn("cursorDead");
  const hitCursor = fn("hitCursor");
  const stomp = fn("stomp");
  const getFloor = fn("getFloor");

  let level = 0;
  let glow = 0;
  let levelAt = 0;
  let lockedUntil = 0;
  let rageUntil = 0;
  let engaged = false;
  let engagedAt = 0;
  let travel = 0;
  let lastCX = null;
  let lastCY = null;
  let escapeAt = -1e9;
  let nextSlamAt = 0;
  let nextRollAt = 0;
  let nextEmberAt = 0;
  let vignette = null;
  let lastVignetteOpacity = "";
  let lastFilter = "";
  let lastFilterNode = null;
  let waves = [];

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

  function anchor() {
    try {
      if (getAnchor) {
        const a = getAnchor();
        if (a && a.seen) return { x: a.x, y: a.y };
      }
    } catch {}
    return cursor();
  }

  function floorY() {
    try {
      return getFloor ? getFloor() : window.innerHeight;
    } catch {
      return window.innerHeight;
    }
  }

  function roar(x, y) {
    const lay = layer();
    if (!lay) return;
    try {
      fxRing(lay, x, y, 180, "#ff2a14");
      fxRing(lay, x, y, 110, "#ffb347");
      embers(lay, x, y - 10, 12, 1.2);
      screenShake(0.4 + 0.08 * level);
      playHit();
    } catch {}
  }

  function cool() {
    level = 0;
    levelAt = 0;
    engaged = false;
    travel = 0;
    rageUntil = 0;
    escapeAt = -1e9;
    for (let i = 0; i < waves.length; i++) {
      try {
        waves[i].el.remove();
      } catch {}
    }
    waves = [];
    if (vignette) {
      try {
        vignette.style.opacity = "0";
      } catch {}
      lastVignetteOpacity = "0";
    }
  }

  function lock(now, ms) {
    lockedUntil = now + ms;
    cool();
  }

  function isLocked(now) {
    return now < lockedUntil;
  }

  function registerEscape(now, x, y) {
    if (isLocked(now)) return false;
    if (now - escapeAt < RAGE_ESCAPE_CD_MS) return false;
    escapeAt = now;
    engaged = false;
    travel = 0;
    level = Math.min(RAGE_MAX_LEVEL, level + 1);
    levelAt = now;
    rageUntil = now + RAGE_DURATION_MS;
    roar(x, y);
    return true;
  }

  function observe(now, cx, cy) {
    const c = anchor();
    if (!c) {
      engaged = false;
      lastCX = null;
      lastCY = null;
      return;
    }
    if (lastCX !== null && engaged) {
      travel += Math.hypot(c.x - lastCX, c.y - lastCY);
    }
    lastCX = c.x;
    lastCY = c.y;
    const d = Math.hypot(c.x - cx, c.y - cy);
    if (d < RAGE_ENGAGE_DIST) {
      if (!engaged) travel = 0;
      engaged = true;
      engagedAt = now;
      return;
    }
    if (!engaged) return;
    if (now - engagedAt > RAGE_ESCAPE_WINDOW_MS) {
      engaged = false;
      return;
    }
    if (d > RAGE_ESCAPE_DIST && travel >= RAGE_ESCAPE_TRAVEL) {
      registerEscape(now, cx, cy);
    }
  }

  function paintVignette(now) {
    const lay = layer();
    if (glow < 0.03 || !lay) {
      if (vignette) {
        try {
          vignette.remove();
        } catch {}
        vignette = null;
      }
      lastVignetteOpacity = "";
      return;
    }
    if (!vignette || !vignette.isConnected) {
      vignette = document.createElement("div");
      vignette.style.cssText =
        "position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;opacity:0;background:radial-gradient(ellipse at 50% 50%,rgba(255,0,0,0) 54%,rgba(190,0,10,.45) 84%,rgba(110,0,0,.78) 100%);";
      lastVignetteOpacity = "";
      try {
        lay.insertBefore(vignette, lay.firstChild);
      } catch {
        vignette = null;
        return;
      }
    }
    const pulse = 0.82 + 0.18 * Math.sin(now * 0.006 * (1 + glow * 2));
    const value = (glow * 0.85 * pulse).toFixed(3);
    if (value !== lastVignetteOpacity) {
      lastVignetteOpacity = value;
      vignette.style.opacity = value;
    }
  }

  function trailArc(lay, w) {
    const node = document.createElement("div");
    node.style.cssText = arcStyle(0.85);
    const tf =
      "translate(" +
      f(w.x) +
      "px," +
      f(w.y) +
      "px) rotate(" +
      w.ang.toFixed(3) +
      "rad)";
    spawn(
      lay,
      node,
      [
        { transform: tf + " scale(1)", opacity: 0.55 },
        { transform: tf + " scale(.7,.9)", opacity: 0 },
      ],
      { duration: 280, easing: "ease-out", fill: "forwards" },
    );
  }

  function launchWave(x, y) {
    const lay = layer();
    const c = anchor();
    if (!lay || !c || waves.length >= MAX_WAVES) return;
    const node = document.createElement("div");
    node.style.cssText = arcStyle(1);
    try {
      lay.appendChild(node);
    } catch {
      return;
    }
    const ang = Math.atan2(c.y - y, c.x - x);
    const w = {
      el: node,
      x: x,
      y: y,
      ang: ang,
      speed: 7,
      age: 0,
      trail: 0,
      hitAt: 0,
    };
    node.style.transform =
      "translate(" +
      f(x) +
      "px," +
      f(y) +
      "px) rotate(" +
      ang.toFixed(3) +
      "rad)";
    waves.push(w);
  }

  function dropWave(i, boom) {
    const w = waves[i];
    waves.splice(i, 1);
    if (!w) return;
    const lay = layer();
    try {
      w.el.remove();
    } catch {}
    if (boom && lay) {
      try {
        fxRing(lay, w.x, w.y, 130, "#ff3b2a");
        fxRing(lay, w.x, w.y, 76, "#fff3c4");
        embers(lay, w.x, w.y, 8, 1);
        screenShake(0.5);
        playShatter();
      } catch {}
    }
  }

  function stepWaves(dt) {
    const lay = layer();
    const floor = floorY();
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      const a = anchor();
      if (a) {
        const want = Math.atan2(a.y - w.y, a.x - w.x);
        w.ang += clamp(norm(want - w.ang), -WAVE_TURN * dt, WAVE_TURN * dt);
      }
      w.speed = Math.min(WAVE_SPEED, w.speed + 0.7 * dt);
      w.x += Math.cos(w.ang) * w.speed * dt;
      w.y += Math.sin(w.ang) * w.speed * dt;
      w.age += dt * 16.667;
      try {
        w.el.style.transform =
          "translate(" +
          f(w.x) +
          "px," +
          f(w.y) +
          "px) rotate(" +
          w.ang.toFixed(3) +
          "rad)";
      } catch {}
      w.trail -= dt;
      if (w.trail <= 0 && lay) {
        w.trail = 1.1;
        trailArc(lay, w);
        if (Math.random() < 0.5) embers(lay, w.x, w.y, 1, 0.5);
      }
      w.hitAt -= dt;
      if (w.hitAt <= 0 && stomp) {
        w.hitAt = 6;
        try {
          stomp(w.x, w.y, 18);
        } catch {}
      }
      const c = cursor();
      if (c && Math.hypot(c.x - w.x, c.y - w.y) < WAVE_HIT_DIST) {
        try {
          if (hitCursor) hitCursor(c.x, c.y);
        } catch {}
        dropWave(i, true);
        continue;
      }
      if (
        w.age > WAVE_LIFE_MS ||
        w.x < -80 ||
        w.x > window.innerWidth + 80 ||
        w.y < -80
      ) {
        dropWave(i, false);
        continue;
      }
      if (w.y >= floor + 6) dropWave(i, true);
    }
  }

  function update(now, dt, cx, cy) {
    const step = clamp(dt || 1, 0.2, 3);
    if (rageUntil && now >= rageUntil) {
      cool();
    } else if (level > 0 && now - levelAt > RAGE_DECAY_MS) {
      level -= 1;
      levelAt = now;
    }
    const target = level / RAGE_MAX_LEVEL;
    glow += (target - glow) * (1 - Math.pow(0.95, step));
    if (Math.abs(target - glow) < 0.002) glow = target;
    paintVignette(now);
    if (glow > 0.25 && now >= nextEmberAt) {
      nextEmberAt = now + 190 - 120 * glow + Math.random() * 60;
      const lay = layer();
      if (lay)
        embers(lay, cx + rand(-8, 8), cy + rand(-24, 10), 1, 0.5 + glow * 0.4);
    }
    if (waves.length) stepWaves(step);
  }

  function applyGlow(node, now) {
    if (!node) return;
    let next = "none";
    if (glow >= 0.02) {
      const stepped =
        Math.floor(now / RAGE_FILTER_STEP_MS) * RAGE_FILTER_STEP_MS;
      const heat = Math.round(glow * RAGE_GLOW_STEPS) / RAGE_GLOW_STEPS;
      const rawPulse = 0.75 + 0.25 * Math.sin(stepped * 0.012 * (1 + heat));
      const pulse =
        0.5 +
        Math.round((rawPulse - 0.5) * RAGE_PULSE_STEPS) / RAGE_PULSE_STEPS;
      const r1 = Math.round(2 + 4 * heat * pulse);
      const r2 = Math.round(6 + 14 * heat * pulse);
      next =
        "drop-shadow(0 0 " +
        r1 +
        "px rgba(255,60,30,.95)) drop-shadow(0 0 " +
        r2 +
        "px rgba(255,0,0," +
        (0.35 + 0.5 * heat).toFixed(2) +
        ")) brightness(" +
        (1 + 0.22 * heat * pulse).toFixed(2) +
        ")";
    }
    if (next !== lastFilter || node !== lastFilterNode) {
      lastFilter = next;
      lastFilterNode = node;
      try {
        node.style.filter = next;
      } catch {}
    }
  }

  function landing(now, x, footY, impact, slam) {
    const lay = layer();
    if (!lay) return;
    if (!slam && glow < 0.05) return;
    const power = slam
      ? 1.25
      : clamp(0.3 + glow * 0.85 + impact * 0.015, 0.3, 1.1);
    const size = slam ? 340 : 110 + 200 * power;
    try {
      groundRing(lay, x, footY - 2, size, "#ff2a14", 0);
      groundRing(lay, x, footY - 2, size * 0.66, "#ffb347", 70);
      if (slam) groundRing(lay, x, footY - 2, size * 1.3, "#ff5a3c", 130);
      groundFlash(lay, x, footY, size);
      cracks(lay, x, footY, size, slam ? 8 : 4 + Math.round(glow * 2));
      debris(lay, x, footY, slam ? 16 : 5 + Math.round(8 * glow));
      fxDust(lay, x, footY, power);
      screenShake(0.25 + 0.55 * power);
    } catch {}
    if (slam) {
      try {
        playShatter();
      } catch {}
      try {
        if (stomp) stomp(x, footY - 20, 70);
      } catch {}
      launchWave(x, footY - 14);
    } else if (glow > 0.55 && stomp) {
      try {
        stomp(x, footY - 10, 30 + 30 * power);
      } catch {}
    }
  }

  function trySlam(now, cx, cy) {
    if (level < 1) return false;
    if (now < nextSlamAt || now < nextRollAt) return false;
    nextRollAt = now + RAGE_SLAM_ROLL_MS;
    const c = anchor();
    if (!c) return false;
    const d = Math.hypot(c.x - cx, c.y - cy);
    if (d < RAGE_SLAM_MIN_DIST || d > RAGE_SLAM_MAX_DIST) return false;
    if (Math.random() > 0.35 + 0.1 * level) return false;
    nextSlamAt = now + RAGE_SLAM_CD_MS * (1 - 0.1 * level);
    return true;
  }

  function destroy() {
    for (let i = waves.length - 1; i >= 0; i--) {
      try {
        waves[i].el.remove();
      } catch {}
    }
    waves = [];
    if (vignette) {
      try {
        vignette.remove();
      } catch {}
      vignette = null;
    }
    lastVignetteOpacity = "";
  }

  return {
    observe,
    update,
    applyGlow,
    landing,
    trySlam,
    registerEscape,
    cool,
    lock,
    isLocked,
    rageTimeLeft: (now) => (rageUntil ? Math.max(0, rageUntil - now) : 0),
    destroy,
    level: () => level,
    intensity: () => glow,
    timeScale: () => 1 + 0.3 * glow,
    speedMul: () => 1 + 0.65 * glow,
    rageFloor: () => (level > 0 ? 0.5 + 0.5 * glow : 0),
  };
}
