const BOLT_SEGMENTS = 6;
const BOLT_JITTER = 5.5;
const BRANCH_CHANCE = 0.5;
const SUB_BRANCH_CHANCE = 0.25;
const ARC_COUNT = 3;

function el(tag, attrs) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  if (attrs) {
    for (const key in attrs) node.setAttribute(key, attrs[key]);
  }
  return node;
}

function bones(j) {
  return [
    [j.hip, j.legs[0].knee, j.legs[0].foot],
    [j.hip, j.legs[1].knee, j.legs[1].foot],
    [j.shoulder, j.arms[0].elbow, j.arms[0].hand],
    [j.shoulder, j.arms[1].elbow, j.arms[1].hand],
    [j.hip, j.neck],
  ];
}

function endpoints(j) {
  return [
    j.legs[0].foot,
    j.legs[1].foot,
    j.arms[0].hand,
    j.arms[1].hand,
    j.headC,
    j.hip,
  ];
}

function bolt(ax, ay, bx, by, spread) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  let d = "M" + ax.toFixed(1) + " " + ay.toFixed(1);
  for (let i = 1; i <= BOLT_SEGMENTS; i++) {
    const t = i / BOLT_SEGMENTS;
    const wobble =
      i === BOLT_SEGMENTS ? 0 : (Math.random() - 0.5) * BOLT_JITTER * spread;
    d +=
      "L" +
      (ax + dx * t + nx * wobble).toFixed(1) +
      " " +
      (ay + dy * t + ny * wobble).toFixed(1);
  }
  return d;
}

function branchPath(ax, ay, bx, by, spread) {
  const mx = (ax + bx) / 2 + (Math.random() - 0.5) * 18 * spread;
  const my = (ay + by) / 2 + (Math.random() - 0.5) * 18 * spread;
  const tx = mx + (Math.random() - 0.5) * 16 * spread;
  const ty = my + (Math.random() - 0.5) * 16 * spread;
  let d =
    "M" +
    mx.toFixed(1) +
    " " +
    my.toFixed(1) +
    "L" +
    tx.toFixed(1) +
    " " +
    ty.toFixed(1);
  if (Math.random() < SUB_BRANCH_CHANCE) {
    const sx = tx + (Math.random() - 0.5) * 10 * spread;
    const sy = ty + (Math.random() - 0.5) * 10 * spread;
    d +=
      "M" +
      tx.toFixed(1) +
      " " +
      ty.toFixed(1) +
      "L" +
      sx.toFixed(1) +
      " " +
      sy.toFixed(1);
  }
  return d;
}

function arcPath(pts, spread) {
  const a = pts[Math.floor(Math.random() * pts.length)];
  let b = pts[Math.floor(Math.random() * pts.length)];
  if (!a || !b || a === b) return "";
  return bolt(a.x, a.y, b.x, b.y, spread * 1.4);
}

function headRing(cx, cy, r, segments) {
  let d = "";
  const step = (Math.PI * 2) / segments;
  for (let i = 0; i < segments; i++) {
    const a1 = step * i;
    const a2 = step * (i + 1);
    const jR = r + (Math.random() - 0.5) * 2.8;
    const x1 = cx + Math.cos(a1) * jR;
    const y1 = cy + Math.sin(a1) * jR;
    const jR2 = r + (Math.random() - 0.5) * 2.8;
    const x2 = cx + Math.cos(a2) * jR2;
    const y2 = cy + Math.sin(a2) * jR2;
    d += (i === 0 ? "M" : "L") + x1.toFixed(1) + " " + y1.toFixed(1);
    if (i === segments - 1) d += "L" + x2.toFixed(1) + " " + y2.toFixed(1);
  }
  d += "Z";
  return d;
}

function buildFilter() {
  const defs = el("defs");
  const filter = el("filter", {
    id: "stk-bolt-filter",
    x: "-50%",
    y: "-50%",
    width: "200%",
    height: "200%",
  });
  const blur = el("feGaussianBlur", { in: "SourceGraphic", stdDeviation: "3" });
  const merge = el("feMerge");
  const n1 = el("feMergeNode");
  const n2 = el("feMergeNode", { in: "SourceGraphic" });
  merge.appendChild(n1);
  merge.appendChild(n2);
  filter.appendChild(blur);
  filter.appendChild(merge);
  defs.appendChild(filter);
  return defs;
}

export function createElectricRig() {
  const group = el("g", { class: "stk-bolt", display: "none" });
  const defs = buildFilter();
  group.appendChild(defs);

  const corona = el("path", {
    class: "stk-bolt-corona",
    fill: "none",
    d: "",
  });
  const glow = el("path", {
    class: "stk-bolt-glow",
    fill: "none",
    d: "",
  });
  const core = el("path", {
    class: "stk-bolt-core",
    fill: "none",
    d: "",
    filter: "url(#stk-bolt-filter)",
  });
  const arcLayer = el("path", {
    class: "stk-bolt-arc",
    fill: "none",
    d: "",
  });
  const skull = el("path", {
    class: "stk-bolt-core",
    fill: "none",
    d: "",
  });
  const skullGlow = el("path", {
    class: "stk-bolt-glow",
    fill: "none",
    d: "",
  });

  group.appendChild(corona);
  group.appendChild(glow);
  group.appendChild(core);
  group.appendChild(arcLayer);
  group.appendChild(skullGlow);
  group.appendChild(skull);
  return { group, corona, core, glow, arcLayer, skull, skullGlow };
}

export function paintElectric(rig, joints, spread) {
  if (!rig || !joints) return;
  let main = "";
  let extra = "";
  let arcD = "";
  const chain = bones(joints);
  for (let b = 0; b < chain.length; b++) {
    const pts = chain[b];
    for (let s = 0; s < pts.length - 1; s++) {
      main += bolt(pts[s].x, pts[s].y, pts[s + 1].x, pts[s + 1].y, spread);
      main += bolt(
        pts[s].x,
        pts[s].y,
        pts[s + 1].x,
        pts[s + 1].y,
        spread * 0.6,
      );
      if (Math.random() < BRANCH_CHANCE) {
        extra += branchPath(
          pts[s].x,
          pts[s].y,
          pts[s + 1].x,
          pts[s + 1].y,
          spread,
        );
      }
    }
  }

  const eps = endpoints(joints);
  for (let a = 0; a < ARC_COUNT; a++) {
    arcD += arcPath(eps, spread);
  }

  const head = joints.headC;
  let headD = "";
  if (head) {
    const r = 5.8;
    headD = headRing(head.x, head.y, r, 10);
    headD += headRing(head.x, head.y, r * 0.5, 6);
  }

  const all = main + extra;
  rig.core.setAttribute("d", all);
  rig.glow.setAttribute("d", all);
  rig.corona.setAttribute("d", all);
  rig.arcLayer.setAttribute("d", arcD);
  rig.skull.setAttribute("d", headD);
  rig.skullGlow.setAttribute("d", headD);
}

export function showElectric(rig, joints, spread) {
  if (!rig) return;
  rig.group.setAttribute("display", "inline");
  paintElectric(rig, joints, spread);
}

export function hideElectric(rig) {
  if (!rig) return;
  rig.group.setAttribute("display", "none");
  rig.core.setAttribute("d", "");
  rig.glow.setAttribute("d", "");
  rig.corona.setAttribute("d", "");
  rig.arcLayer.setAttribute("d", "");
  rig.skull.setAttribute("d", "");
  rig.skullGlow.setAttribute("d", "");
}

export const BOLT_SPREAD = BOLT_JITTER;

const SURGE_MS = 260;
const SURGE_BOOST = 3.2;
const MIN_FREEZE_MS = 40;
const MAX_FREEZE_MS = 80;

export function createFreezeSystem(host) {
  const fn = (name) =>
    host && typeof host[name] === "function" ? host[name] : null;
  const getLayer = fn("getLayer");

  let freezeUntil = 0;
  let paused = [];
  let releasedAt = -1e9;

  function layer() {
    try {
      return getLayer ? getLayer() : null;
    } catch {
      return null;
    }
  }

  function pauseLayerAnimations() {
    const lay = layer();
    if (!lay || typeof lay.getAnimations !== "function") return;
    try {
      const running = lay
        .getAnimations({ subtree: true })
        .filter((a) => a.playState === "running");
      for (let i = 0; i < running.length; i++) {
        running[i].pause();
        paused.push(running[i]);
      }
    } catch {}
  }

  function resumeLayerAnimations() {
    for (let i = 0; i < paused.length; i++) {
      try {
        paused[i].play();
      } catch {}
    }
    paused = [];
  }

  function trigger(now, ms) {
    const dur = Math.max(
      MIN_FREEZE_MS,
      Math.min(MAX_FREEZE_MS, ms || MAX_FREEZE_MS),
    );
    if (now >= freezeUntil) {
      freezeUntil = now + dur;
      pauseLayerAnimations();
    } else if (now + dur > freezeUntil) {
      freezeUntil = now + dur;
    }
    return dur;
  }

  function isFrozen(now) {
    return now < freezeUntil;
  }

  function update(now) {
    if (freezeUntil && now >= freezeUntil) {
      freezeUntil = 0;
      releasedAt = now;
      resumeLayerAnimations();
    }
  }

  function surge(now) {
    if (now < releasedAt || now - releasedAt > SURGE_MS) return 1;
    const k = (now - releasedAt) / SURGE_MS;
    return 1 + (SURGE_BOOST - 1) * (1 - k) * (1 - k);
  }

  function destroy() {
    resumeLayerAnimations();
    freezeUntil = 0;
    releasedAt = -1e9;
  }

  return {
    trigger,
    isFrozen,
    update,
    surge,
    destroy,
    timeLeft: (now) => Math.max(0, freezeUntil - now),
  };
}

export const FREEZE_MIN_MS = MIN_FREEZE_MS;
export const FREEZE_MAX_MS = MAX_FREEZE_MS;
export const FREEZE_SURGE_MS = SURGE_MS;
export const FREEZE_SURGE_BOOST = SURGE_BOOST;

const TRAIL_COUNT = 6;
const TRAIL_SPEED_MIN = 6;
const TRAIL_SPEED_MAX = 15;
const TRAIL_LEN_BASE = 40;
const TRAIL_LEN_MAX = 150;
const TRAIL_HEAD_BASE = 1.2;
const TRAIL_HEAD_MAX = 2;
const TRAIL_EASE = 0.2;
const TRAIL_ORIGIN_X = 14;
const TRAIL_ORIGIN_Y = 29;
const TRAIL_GRADIENT_SPAN = 190;
const TRAIL_SPEED_STEPS = 2;
const TRAIL_DIR_STEPS = 24;
let trailSeq = 0;

const round1 = (n) => Number(n.toFixed(1));

function hashSeed(a, b, c) {
  let h = Math.imul(a | 0, 0x9e3779b1) >>> 0;
  h = (h ^ Math.imul(b | 0, 0x85ebca77)) >>> 0;
  h = (h ^ Math.imul(c | 0, 0xc2b2ae3d)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
}

function seededUnit(seed, salt) {
  let t = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  t = Math.imul(t ^ (t >>> 16), 0x21f0aaad) >>> 0;
  t = Math.imul(t ^ (t >>> 15), 0x735a2d97) >>> 0;
  return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
}

function buildTrailGradient(gradId) {
  const grad = el("linearGradient", {
    id: gradId,
    gradientUnits: "userSpaceOnUse",
    x1: 0,
    y1: 0,
    x2: 1,
    y2: 0,
  });
  const stops = [
    { offset: "0%", opacity: "0" },
    { offset: "45%", opacity: "1" },
    { offset: "100%", opacity: "0" },
  ];
  for (let i = 0; i < stops.length; i++) {
    const stop = el("stop", {
      offset: stops[i].offset,
      "stop-opacity": stops[i].opacity,
      style: "stop-color: var(--stk-trail-core)",
    });
    grad.appendChild(stop);
  }
  return grad;
}

function buildTrailFilter(filterId) {
  const filter = el("filter", {
    id: filterId,
    x: "-30%",
    y: "-30%",
    width: "160%",
    height: "160%",
  });
  filter.appendChild(el("feGaussianBlur", { stdDeviation: "1.1" }));
  return filter;
}

export function createSpeedTrail() {
  const gradId = "stk-trail-grad-" + ++trailSeq;
  const filterId = "stk-trail-blur-" + ++trailSeq;
  const group = el("g", {
    class: "stk-speed-trail",
    display: "none",
    filter: "url(#" + filterId + ")",
  });
  const defs = el("defs");
  const grad = buildTrailGradient(gradId);
  defs.appendChild(grad);
  defs.appendChild(buildTrailFilter(filterId));
  group.appendChild(defs);
  const streaks = [];
  for (let i = 0; i < TRAIL_COUNT; i++) {
    const path = el("path", {
      d: "",
      fill: "url(#" + gradId + ")",
      opacity: "0",
    });
    streaks.push(path);
    group.appendChild(path);
  }
  return { group, streaks, grad, alpha: 0, lastX: 0, lastY: 0, speedEma: 0 };
}

function setTrailDisplay(trail, value) {
  if (!trail || !trail.group) return;
  if (trail.group.getAttribute("display") === value) return;
  trail.group.setAttribute("display", value);
}

function setTrailGradient(trail, name, value) {
  if (!trail || !trail.grad) return;
  if (trail.grad.getAttribute(name) === value) return;
  trail.grad.setAttribute(name, value);
}

export function updateSpeedTrail(trail, x, y) {
  if (!trail || !trail.group) return;
  const px = Number.isFinite(x) ? x : trail.lastX;
  const py = Number.isFinite(y) ? y : trail.lastY;
  const dx = px - trail.lastX;
  const dy = py - trail.lastY;
  trail.lastX = px;
  trail.lastY = py;
  const speed = Math.hypot(dx, dy);
  if (!Number.isFinite(speed)) {
    setTrailDisplay(trail, "none");
    return;
  }
  let strength = 0;
  if (speed > TRAIL_SPEED_MIN) {
    const raw = (speed - TRAIL_SPEED_MIN) / (TRAIL_SPEED_MAX - TRAIL_SPEED_MIN);
    const k = raw > 1 ? 1 : raw < 0 ? 0 : raw;
    strength = k * k * (3 - 2 * k);
  }
  trail.alpha += (strength - trail.alpha) * TRAIL_EASE;
  if (trail.alpha < 0.02 || speed < 0.001) {
    setTrailDisplay(trail, "none");
    return;
  }
  const dirX = dx / speed;
  const dirY = dy / speed;
  const ema = trail.speedEma
    ? trail.speedEma + (speed - trail.speedEma) * 0.25
    : speed;
  trail.speedEma = ema;
  const speedKey = Math.round(ema * TRAIL_SPEED_STEPS);
  const dirKey = Math.round(Math.atan2(dirY, dirX) * TRAIL_DIR_STEPS);
  const stepAngle = dirKey / TRAIL_DIR_STEPS;
  const dirQX = Math.cos(stepAngle);
  const dirQY = Math.sin(stepAngle);
  const normQX = -dirQY;
  const normQY = dirQX;
  let keyStrength = 0;
  if (speedKey > TRAIL_SPEED_MIN * TRAIL_SPEED_STEPS) {
    const raw =
      (speedKey - TRAIL_SPEED_MIN * TRAIL_SPEED_STEPS) /
      ((TRAIL_SPEED_MAX - TRAIL_SPEED_MIN) * TRAIL_SPEED_STEPS);
    const k = raw > 1 ? 1 : raw < 0 ? 0 : raw;
    keyStrength = k * k * (3 - 2 * k);
  }
  for (let i = 0; i < trail.streaks.length; i++) {
    const streak = trail.streaks[i];
    const seed = hashSeed(i + 1, speedKey, dirKey);
    const back = 6 + seededUnit(seed, 1) * 18;
    const lateral = (seededUnit(seed, 2) - 0.5) * 28;
    const sx = TRAIL_ORIGIN_X - dirQX * back + normQX * lateral;
    const sy = TRAIL_ORIGIN_Y - dirQY * back + normQY * lateral;
    const len =
      (TRAIL_LEN_BASE + keyStrength * TRAIL_LEN_MAX) *
      (0.45 + seededUnit(seed, 3) * 0.55);
    const w =
      (TRAIL_HEAD_BASE + keyStrength * TRAIL_HEAD_MAX) *
      (0.6 + seededUnit(seed, 4) * 0.7);
    const tx = sx - dirQX * len;
    const ty = sy - dirQY * len;
    const h1x = sx + (normQX * w) / 2;
    const h1y = sy + (normQY * w) / 2;
    const h2x = sx - (normQX * w) / 2;
    const h2y = sy - (normQY * w) / 2;
    const midX = (sx + tx) / 2;
    const midY = (sy + ty) / 2;
    const bow = w * 0.7;
    const c1x = midX + normQX * bow - dirQX * len * 0.15;
    const c1y = midY + normQY * bow - dirQY * len * 0.15;
    const c2x = midX - normQX * bow - dirQX * len * 0.15;
    const c2y = midY - normQY * bow - dirQY * len * 0.15;
    const d =
      "M" +
      round1(h1x) +
      " " +
      round1(h1y) +
      " Q" +
      round1(c1x) +
      " " +
      round1(c1y) +
      " " +
      round1(tx) +
      " " +
      round1(ty) +
      " Q" +
      round1(c2x) +
      " " +
      round1(c2y) +
      " " +
      round1(h2x) +
      " " +
      round1(h2y) +
      " Z";
    if (streak.stkTrailD !== d) {
      streak.setAttribute("d", d);
      streak.stkTrailD = d;
    }
    const opacityValue = (
      (0.16 + strength * 0.34) *
      (0.55 + seededUnit(seed, 5) * 0.45)
    ).toFixed(3);
    if (streak.stkTrailOpacity !== opacityValue) {
      streak.setAttribute("opacity", opacityValue);
      streak.stkTrailOpacity = opacityValue;
    }
  }
  setTrailGradient(trail, "x1", String(round1(TRAIL_ORIGIN_X)));
  setTrailGradient(trail, "y1", String(round1(TRAIL_ORIGIN_Y)));
  setTrailGradient(
    trail,
    "x2",
    String(round1(TRAIL_ORIGIN_X - dirX * TRAIL_GRADIENT_SPAN)),
  );
  setTrailGradient(
    trail,
    "y2",
    String(round1(TRAIL_ORIGIN_Y - dirY * TRAIL_GRADIENT_SPAN)),
  );
  setTrailDisplay(trail, "inline");
}

export function syncSpeedTrail(trail, x, y) {
  if (!trail) return;
  trail.lastX = Number.isFinite(x) ? x : trail.lastX;
  trail.lastY = Number.isFinite(y) ? y : trail.lastY;
}
