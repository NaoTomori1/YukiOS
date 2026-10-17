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
