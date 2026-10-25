const NS = "http://www.w3.org/2000/svg";

export const SWORD_REACH = 92;
export const SWORD_BLADE_LEN = 104;
export const SWORD_GUARD_W = 26;
export const SWORD_BLADE_HALF = 3.8;
export const SWORD_BLADE_BELLY = 5;

const GRADIENT_ID = "stk-sword-grad";
const CORE_ID = "stk-sword-core";
const AURA_ID = "stk-sword-aura";
const FIRE_ID = "stk-sword-fire";

const FLAME_FILTER_STEP_MS = 60;
const FLAME_FILTER_PULSE_STEPS = 16;

function f(n) {
  return Number(n.toFixed(2));
}

function el(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  for (const key in attrs) {
    node.setAttribute(key, attrs[key]);
  }
  return node;
}

function pathOf(points) {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${f(p.x)} ${f(p.y)}`)
    .join(" ");
}

function buildGradient() {
  const defs = el("defs");

  const bladeGrad = el("linearGradient", {
    id: GRADIENT_ID,
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "0",
  });

  [
    ["0%", "#7c1708"],
    ["18%", "#ff4b0a"],
    ["42%", "#ffb52e"],
    ["55%", "#fff7d0"],
    ["68%", "#ffad25"],
    ["88%", "#ff4510"],
    ["100%", "#7c1708"],
  ].forEach(([offset, color]) => {
    bladeGrad.appendChild(
      el("stop", {
        offset,
        "stop-color": color,
      }),
    );
  });

  const coreGrad = el("linearGradient", {
    id: CORE_ID,
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1",
  });

  [
    ["0%", "#fffde8"],
    ["35%", "#fff2a0"],
    ["75%", "#ffb52c"],
    ["100%", "#ff5a0a"],
  ].forEach(([offset, color]) => {
    coreGrad.appendChild(
      el("stop", {
        offset,
        "stop-color": color,
      }),
    );
  });

  const auraGrad = el("linearGradient", {
    id: AURA_ID,
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1",
  });

  [
    ["0%", "#ffef92"],
    ["45%", "#ff6a0b"],
    ["100%", "#ff2100"],
  ].forEach(([offset, color]) => {
    auraGrad.appendChild(
      el("stop", {
        offset,
        "stop-color": color,
      }),
    );
  });

  defs.appendChild(bladeGrad);
  defs.appendChild(coreGrad);
  defs.appendChild(auraGrad);

  return defs;
}

export function createFlamebladeRig() {
  const aura = el("path", {
    d: "",
    fill: `url(#${AURA_ID})`,
    opacity: "0",
    display: "none",
  });

  aura.style.filter = "blur(5px)";

  const fire = el("path", {
    d: "",
    fill: "none",
    stroke: "#ff9b20",
    "stroke-width": "2.8",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    opacity: "0",
    display: "none",
  });

  fire.style.filter = "blur(1px)";

  const blade = el("path", {
    d: "",
    fill: `url(#${GRADIENT_ID})`,
    stroke: "#7d2509",
    "stroke-width": "0.75",
    "stroke-linejoin": "round",
    display: "none",
  });

  const core = el("path", {
    d: "",
    fill: "none",
    stroke: `url(#${CORE_ID})`,
    "stroke-width": "1.15",
    "stroke-linecap": "round",
    opacity: "0",
    display: "none",
  });

  const edge = el("path", {
    d: "",
    fill: "none",
    stroke: "#fff0a6",
    "stroke-width": "0.55",
    "stroke-linecap": "round",
    opacity: "0",
    display: "none",
  });

  const hilt = el("path", {
    d: "",
    fill: "none",
    stroke: "#ffd982",
    "stroke-width": "2.1",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    display: "none",
  });

  const grip = el("path", {
    d: "",
    fill: "none",
    stroke: "#51251a",
    "stroke-width": "3",
    "stroke-linecap": "round",
    display: "none",
  });

  const pommel = el("circle", {
    cx: "0",
    cy: "0",
    r: "2.2",
    fill: "#ffcf72",
    stroke: "#7d350c",
    "stroke-width": "0.7",
    display: "none",
  });

  return {
    defs: buildGradient(),
    aura,
    fire,
    blade,
    core,
    edge,
    hilt,
    grip,
    pommel,
    fuller: null,
    fullerParent: undefined,
    fullerCount: -1,
  };
}

function buildFire(hand, fx, fy, px, py, now = 0) {
  const segments = [];
  const length = SWORD_BLADE_LEN;
  const phase = now * 0.004;

  for (let i = 0; i < 7; i++) {
    const t = 0.12 + i * 0.115;
    const side = i % 2 === 0 ? -1 : 1;
    const start = 17 + t * length;
    const height = 4.5 + (i % 3) * 2.3;
    const sway = Math.sin(phase + i * 2.1) * 2.1;

    const bx = hand.x + fx * start;
    const by = hand.y + fy * start;

    const rootX = bx + px * side * 2;
    const rootY = by + py * side * 2;

    const controlX =
      bx + fx * (height * 0.5) + px * side * (height * 0.8 + sway);

    const controlY =
      by + fy * (height * 0.5) + py * side * (height * 0.8 + sway);

    const tipX = bx + fx * (height * 1.5) + px * side * (height * 1.5 + sway);

    const tipY = by + fy * (height * 1.5) + py * side * (height * 1.5 + sway);

    const returnX = bx + px * side * 0.6;
    const returnY = by + py * side * 0.6;

    segments.push(
      `M${f(rootX)} ${f(rootY)}` +
        ` Q${f(controlX)} ${f(controlY)} ${f(tipX)} ${f(tipY)}` +
        ` Q${f(returnX)} ${f(returnY)} ${f(rootX)} ${f(rootY)}`,
    );
  }

  return segments.join(" ");
}

function buildFlameSilhouette(hand, fx, fy, px, py, now = 0) {
  const points = [];
  const length = SWORD_BLADE_LEN;
  const phase = now * 0.003;

  points.push({
    x: hand.x + fx * 12 - px * 3.8,
    y: hand.y + fy * 12 - py * 3.8,
  });

  for (let i = 0; i < 9; i++) {
    const t = 0.12 + i * 0.095;
    const side = i % 2 === 0 ? -1 : 1;
    const height = 3 + (i % 3) * 1.6;
    const flicker = Math.sin(phase + i * 2.3) * 1.5;

    points.push({
      x: hand.x + fx * (12 + length * t) + px * side * (3.8 + height + flicker),
      y: hand.y + fy * (12 + length * t) + py * side * (3.8 + height + flicker),
    });
  }

  points.push({
    x: hand.x + fx * (12 + length),
    y: hand.y + fy * (12 + length),
  });

  for (let i = 8; i >= 0; i--) {
    const t = 0.12 + i * 0.095;
    const side = i % 2 === 0 ? 1 : -1;
    const height = 3 + (i % 3) * 1.6;
    const flicker = Math.sin(phase + i * 2.3) * 1.5;

    points.push({
      x: hand.x + fx * (12 + length * t) + px * side * (3.8 + height + flicker),
      y: hand.y + fy * (12 + length * t) + py * side * (3.8 + height + flicker),
    });
  }

  points.push({
    x: hand.x + fx * 12 + px * 3.8,
    y: hand.y + fy * 12 + py * 3.8,
  });

  return pathOf(points) + " Z";
}

export function shapeFlameblade(hand, fx, fy, px, py) {
  const length = SWORD_BLADE_LEN;
  const half = SWORD_BLADE_HALF;

  const point = (distance, side = 0) => ({
    x: hand.x + fx * distance + px * side,
    y: hand.y + fy * distance + py * side,
  });

  const rootA = point(13, -half);
  const rootB = point(13, half);
  const shoulderA = point(22, -half * 0.82);
  const shoulderB = point(22, half * 0.82);
  const tip = point(13 + length);
  const spineControl = point(13 + length * 0.48, -SWORD_BLADE_BELLY);
  const edgeControl = point(13 + length * 0.48, half * 0.82);

  const bladeD =
    `M${f(rootA.x)} ${f(rootA.y)}` +
    ` L${f(shoulderA.x)} ${f(shoulderA.y)}` +
    ` Q${f(spineControl.x)} ${f(spineControl.y)} ${f(tip.x)} ${f(tip.y)}` +
    ` Q${f(edgeControl.x)} ${f(edgeControl.y)} ${f(shoulderB.x)} ${f(shoulderB.y)}` +
    ` L${f(rootB.x)} ${f(rootB.y)} Z`;

  const fullerStart = point(22);
  const fullerEnd = point(13 + length * 0.83, 0.15);

  const guardCenter = point(9);
  const guardA = point(5, -SWORD_GUARD_W * 0.48);
  const guardB = point(5, SWORD_GUARD_W * 0.48);
  const guardTipA = point(12, -SWORD_GUARD_W * 0.62);
  const guardTipB = point(12, SWORD_GUARD_W * 0.62);

  const gripBack = point(-11);
  const gripMid = point(-3);

  const pommel = point(-13);

  const hiltD = [
    pathOf([guardTipA, guardA, guardCenter, guardB, guardTipB]),
    pathOf([point(0, -2), point(0, 2)]),
  ].join(" ");

  const gripD = pathOf([gripBack, gripMid]);

  const edgeD = pathOf([
    point(17, -2.5),
    point(13 + length * 0.25, -2.7),
    point(13 + length * 0.55, -1.9),
    point(13 + length * 0.86, -0.7),
  ]);

  const coreD = pathOf([
    point(17, 0),
    point(13 + length * 0.25, 0),
    point(13 + length * 0.55, 0),
    point(13 + length * 0.86, 0),
  ]);

  const fireD = buildFire(hand, fx, fy, px, py);
  const auraD = buildFlameSilhouette(hand, fx, fy, px, py);

  return {
    bladeD,
    fireD,
    auraD,
    hiltD,
    gripD,
    edgeD,
    coreD,
    fullerD: pathOf([fullerStart, fullerEnd]),
    tip,
    pommel,
    hiltW: 2.1,
    hiltColor: "#ffd982",
  };
}

function resolveFuller(rig) {
  if (!rig) return null;
  let parent = null;
  try {
    parent = rig.blade ? rig.blade.parentNode : null;
  } catch {
    parent = null;
  }
  let count = -1;
  try {
    count = parent ? parent.childElementCount : -1;
  } catch {
    count = -1;
  }
  if (rig.fullerParent === parent && rig.fullerCount === count)
    return rig.fuller;
  rig.fullerParent = parent;
  rig.fullerCount = count;
  try {
    rig.fuller = parent
      ? parent.querySelector('[data-flameblade-fuller="true"]')
      : null;
  } catch {
    rig.fuller = null;
  }
  return rig.fuller;
}

const lastFilterValues = new WeakMap();

function writeFilter(node, value) {
  if (!node) return;
  if (lastFilterValues.get(node) === value) return;
  lastFilterValues.set(node, value);
  node.style.filter = value;
}

export function paintFlameblade(rig, model, now) {
  if (!rig || !model) return;

  const flicker = Math.sin(now * 0.018);
  const pulse = 0.5 + 0.5 * Math.sin(now * 0.025);
  const stepped = Math.floor(now / FLAME_FILTER_STEP_MS) * FLAME_FILTER_STEP_MS;
  const rawFilterPulse = 0.5 + 0.5 * Math.sin(stepped * 0.025);
  const filterPulse =
    Math.round(rawFilterPulse * FLAME_FILTER_PULSE_STEPS) /
    FLAME_FILTER_PULSE_STEPS;

  rig.blade.setAttribute("display", "inline");
  rig.blade.setAttribute("d", model.bladeD);

  rig.aura.setAttribute("display", "inline");
  rig.aura.setAttribute("d", model.auraD || model.bladeD);
  rig.aura.setAttribute("opacity", (0.2 + pulse * 0.18).toFixed(2));

  rig.fire.setAttribute("display", "inline");
  rig.fire.setAttribute("d", buildFireFromModel(model, now));
  rig.fire.setAttribute("opacity", (0.45 + pulse * 0.3).toFixed(2));

  rig.core.setAttribute("display", "inline");
  rig.core.setAttribute("d", model.coreD || "");
  rig.core.setAttribute("opacity", "0.95");

  rig.edge.setAttribute("display", "inline");
  rig.edge.setAttribute("d", model.edgeD || "");
  rig.edge.setAttribute("opacity", (0.58 + pulse * 0.25).toFixed(2));

  rig.hilt.setAttribute("display", "inline");
  rig.hilt.setAttribute("d", model.hiltD);
  rig.hilt.setAttribute("stroke-width", String(model.hiltW || 2.1));

  rig.grip.setAttribute("display", "inline");
  rig.grip.setAttribute("d", model.gripD || "");

  rig.pommel.setAttribute("display", "inline");
  rig.pommel.setAttribute("cx", f(model.pommel.x));
  rig.pommel.setAttribute("cy", f(model.pommel.y));

  const fuller = resolveFuller(rig);

  if (fuller) {
    fuller.setAttribute("d", model.fullerD || "");
    fuller.setAttribute("display", "inline");
  }

  const auraFilter = `blur(${(4 + filterPulse * 2).toFixed(1)}px)`;
  const fireFilter = `blur(${(0.5 + filterPulse * 0.8).toFixed(1)}px)`;
  const bladeFilter = `drop-shadow(0 0 ${Math.round(2 + filterPulse * 2)}px #ff5a0a)`;
  writeFilter(rig.aura, auraFilter);
  writeFilter(rig.fire, fireFilter);
  writeFilter(rig.blade, bladeFilter);
}

let cachedFireSource = null;
let cachedFirePulse = null;
let cachedFirePath = "";

function buildFireFromModel(model, now) {
  if (!model.fireD) return "";
  const pulse = Number((Math.sin(now * 0.021) * 0.8).toFixed(2));
  if (pulse === cachedFirePulse && model.fireD === cachedFireSource) {
    return cachedFirePath;
  }
  const path = model.fireD.replace(
    /Z/g,
    ` Q${pulse} ${pulse} ${pulse} ${pulse} Z`,
  );
  cachedFireSource = model.fireD;
  cachedFirePulse = pulse;
  cachedFirePath = path;
  return path;
}

export function hideFlameblade(rig) {
  if (!rig) return;

  ["blade", "aura", "fire", "core", "edge", "hilt", "grip", "pommel"].forEach(
    (key) => {
      if (rig[key]) {
        rig[key].setAttribute("display", "none");
      }
    },
  );

  const fuller = resolveFuller(rig);
  if (fuller) fuller.setAttribute("display", "none");
}
