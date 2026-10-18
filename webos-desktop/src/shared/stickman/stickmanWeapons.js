import { createElement } from "../../framework.js";
import {
  fxRing,
  fxSmoke,
  fxFireball,
  fxDust,
  screenShake,
  fxStuckBlade,
  fxElectricSpark,
  fxEnergyBurst,
  fxRealityRift,
} from "./stickmanFx.js";

const ROCKET_TURN = 0.07;
const ROCKET_TOP_SPEED = 15;
const GRENADE_FUSE = 64;
const GRENADE_GRAVITY = 0.32;
const GRENADE_FLIGHT = 46;
const KNIFE_SPEED = 15;
const BLAST_RADIUS = 96;
const MAX_SHOTS = 16;
const LIGHTNING_LIFE = 0.38;
const LIGHTNING_GROW = 0.06;
const LIGHTNING_FADE = 0.16;
const LIGHTNING_FRAME = 0.04;
const ORB_SPEED_MAX = 11;
const ORB_TURN = 0.06;
const ORB_RADIUS = 85;
const SVG_NS = "http://www.w3.org/2000/svg";

function clampV(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function wrap(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function puff(layer, x, y, size, color, life, dx, dy, grow) {
  if (!layer) return;
  const el = document.createElement("i");
  const h = size / 2;
  el.style.cssText =
    "position:absolute;pointer-events:none;border-radius:50%;left:" +
    (x - h).toFixed(1) +
    "px;top:" +
    (y - h).toFixed(1) +
    "px;width:" +
    size.toFixed(1) +
    "px;height:" +
    size.toFixed(1) +
    "px;background:radial-gradient(circle," +
    color +
    " 0%,rgba(0,0,0,0) 70%);";
  layer.appendChild(el);
  const done = () => {
    try {
      el.remove();
    } catch {}
  };
  setTimeout(done, life + 250);
  try {
    if (el.animate) {
      const a = el.animate(
        [
          { opacity: 1, transform: "translate(0px,0px) scale(1)" },
          {
            opacity: 0,
            transform:
              "translate(" +
              dx.toFixed(1) +
              "px," +
              dy.toFixed(1) +
              "px) scale(" +
              grow +
              ")",
          },
        ],
        { duration: life, easing: "ease-out" },
      );
      a.onfinish = done;
    }
  } catch {}
}

function flashScreen(layer, color, peak, ms, strobe) {
  if (!layer) return;
  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;mix-blend-mode:screen;opacity:0;background:" +
    color +
    ";";
  layer.appendChild(el);
  const done = () => {
    try {
      el.remove();
    } catch {}
  };
  setTimeout(done, ms + 200);
  try {
    if (el.animate) {
      const frames = strobe
        ? [
            { opacity: peak, offset: 0 },
            { opacity: peak * 0.15, offset: 0.22 },
            { opacity: peak * 0.8, offset: 0.36 },
            { opacity: 0, offset: 1 },
          ]
        : [{ opacity: peak }, { opacity: 0 }];
      const a = el.animate(frames, { duration: ms, easing: "ease-out" });
      a.onfinish = done;
    }
  } catch {}
}

function svgEl(name, attrs) {
  const n = document.createElementNS(SVG_NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

function boltSplit(ax, ay, bx, by, jag, depth, out) {
  if (depth === 0) {
    out.push([bx, by]);
    return;
  }
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const off = (Math.random() - 0.5) * 2 * len * jag;
  const px = (ax + bx) / 2 + (-dy / len) * off;
  const py = (ay + by) / 2 + (dx / len) * off;
  boltSplit(ax, ay, px, py, jag, depth - 1, out);
  boltSplit(px, py, bx, by, jag, depth - 1, out);
}

function boltPoints(ax, ay, bx, by, jag, depth) {
  const out = [[ax, ay]];
  boltSplit(ax, ay, bx, by, jag, depth, out);
  return out;
}

function pathD(lists) {
  let d = "";
  for (let i = 0; i < lists.length; i++) {
    const pts = lists[i];
    for (let j = 0; j < pts.length; j++) {
      d +=
        (j === 0 ? "M" : "L") +
        pts[j][0].toFixed(1) +
        " " +
        pts[j][1].toFixed(1);
    }
  }
  return d;
}

function buildLightning(s) {
  const dx = s.tx - s.x;
  const dy = s.ty - s.y;
  const dist = Math.hypot(dx, dy) || 1;
  const depth = clampV(Math.round(Math.log2(dist / 9)), 3, 7);
  const main = boltPoints(s.x, s.y, s.tx, s.ty, 0.28, depth);
  const base = Math.atan2(dy, dx);
  const branches = [];
  const count = 3 + Math.floor(Math.random() * 4) + Math.floor(dist / 260);
  for (let i = 0; i < count; i++) {
    const at = 1 + Math.floor(Math.random() * (main.length - 2) * 0.9);
    const p = main[at];
    const side = Math.random() < 0.5 ? -1 : 1;
    const a = base + side * (0.35 + Math.random() * 0.8);
    const len = dist * (0.08 + Math.random() * 0.2) + 14;
    const pts = boltPoints(
      p[0],
      p[1],
      p[0] + Math.cos(a) * len,
      p[1] + Math.sin(a) * len,
      0.3,
      clampV(depth - 2, 2, 5),
    );
    branches.push({ at, pts });
    if (Math.random() < 0.45 && pts.length > 4) {
      const q = pts[Math.floor(pts.length * (0.3 + Math.random() * 0.4))];
      const a2 =
        a + (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.6);
      const l2 = len * (0.3 + Math.random() * 0.3);
      branches.push({
        at,
        pts: boltPoints(
          q[0],
          q[1],
          q[0] + Math.cos(a2) * l2,
          q[1] + Math.sin(a2) * l2,
          0.3,
          2,
        ),
      });
    }
  }
  const last = main.length - 1;
  const rays = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < rays; i++) {
    const a = Math.random() * Math.PI * 2;
    const l = 18 + Math.random() * 46;
    branches.push({
      at: last,
      pts: boltPoints(
        s.tx,
        s.ty,
        s.tx + Math.cos(a) * l,
        s.ty + Math.sin(a) * l,
        0.35,
        3,
      ),
    });
  }
  return { main, branches };
}

function renderLightning(s, grow, pulse, alpha) {
  const shape = s.shape;
  const visible = Math.max(2, Math.ceil(shape.main.length * grow));
  const mainD = pathD([shape.main.slice(0, visible)]);
  const brLists = [];
  for (let i = 0; i < shape.branches.length; i++) {
    if (shape.branches[i].at < visible) brLists.push(shape.branches[i].pts);
  }
  const brD = pathD(brLists);
  const p = s.parts;
  p.glowMain.setAttribute("d", mainD);
  p.midMain.setAttribute("d", mainD);
  p.coreMain.setAttribute("d", mainD);
  p.glowBr.setAttribute("d", brD);
  p.midBr.setAttribute("d", brD);
  p.coreBr.setAttribute("d", brD);
  p.glowMain.setAttribute("stroke-width", (13 * pulse).toFixed(1));
  p.midMain.setAttribute("stroke-width", (5 * pulse).toFixed(1));
  p.coreMain.setAttribute("stroke-width", (2.2 * pulse).toFixed(1));
  p.glowBr.setAttribute("stroke-width", (7 * pulse).toFixed(1));
  p.midBr.setAttribute("stroke-width", (2.6 * pulse).toFixed(1));
  p.coreBr.setAttribute("stroke-width", (1.1 * pulse).toFixed(1));
  const struck = grow >= 1;
  p.hitHalo.setAttribute(
    "r",
    struck ? ((30 + Math.random() * 16) * pulse).toFixed(1) : "0",
  );
  p.hitCore.setAttribute(
    "r",
    struck ? ((12 + Math.random() * 10) * pulse).toFixed(1) : "0",
  );
  p.srcHalo.setAttribute("r", ((9 + Math.random() * 6) * pulse).toFixed(1));
  s.el.style.opacity = alpha.toFixed(2);
}

export function createWeaponSystem(ctx) {
  let shots = [];

  function host() {
    try {
      return ctx.getLayer();
    } catch {
      return null;
    }
  }

  function targets() {
    try {
      return ctx.getTargets() || [];
    } catch {
      return [];
    }
  }

  function cursor() {
    try {
      const c = ctx.getCursor();
      if (c && c.seen && !ctx.cursorDead()) return c;
    } catch {}
    return null;
  }

  function aimFor(ownerPlayer) {
    try {
      if (typeof ctx.getAnchor === "function") {
        const a = ctx.getAnchor(ownerPlayer);
        if (a && a.seen) return { x: a.x, y: a.y };
      }
    } catch {}
    if (ownerPlayer === false) return null;
    return cursor();
  }

  function floorLine() {
    try {
      return ctx.getFloor();
    } catch {
      return window.innerHeight;
    }
  }

  function rectOf(node) {
    try {
      if (!node || !node.isConnected) return null;
      const r = node.getBoundingClientRect();
      return r.width > 0 && r.height > 0 ? r : null;
    } catch {
      return null;
    }
  }

  function hitTarget(x, y) {
    const list = targets();
    for (let i = 0; i < list.length; i++) {
      const r = rectOf(list[i]);
      if (!r) continue;
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return { node: list[i], rect: r };
      }
    }
    return null;
  }

  function place(s) {
    if (s.kind === "lightning") return;
    s.el.style.left = s.x.toFixed(1) + "px";
    s.el.style.top = s.y.toFixed(1) + "px";
    s.el.style.transform =
      "translate(-50%,-50%) rotate(" +
      ((s.ang * 180) / Math.PI).toFixed(1) +
      "deg)";
  }

  function explode(x, y, radius, power, ownerPlayer) {
    const layer = host();
    try {
      ctx.sparks(x, y, 38);
    } catch {}
    try {
      ctx.sfx.shatter();
      ctx.sfx.hit();
    } catch {}
    if (layer) {
      puff(layer, x, y, radius * 2.6, "rgba(255,248,215,1)", 240, 0, 0, 1.5);
      puff(layer, x, y, radius * 1.6, "rgba(255,190,80,0.95)", 420, 0, 0, 1.8);
      fxFireball(layer, x, y, radius * 0.9);
      fxRing(layer, x, y, radius * 2.6, "#ff8a2a");
      fxRing(layer, x, y, radius * 2.2, "#ffb347");
      fxRing(layer, x, y, radius * 1.3, "#fff3c4");
      for (let i = 0; i < 7; i++) {
        fxSmoke(
          layer,
          x + (Math.random() - 0.5) * radius,
          y + (Math.random() - 0.5) * radius * 0.6,
          1.1,
        );
      }
      for (let i = 0; i < 16; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = radius * (0.5 + Math.random() * 1.1);
        puff(
          layer,
          x,
          y,
          5 + Math.random() * 7,
          Math.random() < 0.5 ? "rgba(255,210,100,1)" : "rgba(255,120,40,1)",
          450 + Math.random() * 450,
          Math.cos(a) * d,
          Math.sin(a) * d + 30 + Math.random() * 40,
          0.2,
        );
      }
      fxDust(layer, x, y, 1);
      flashScreen(layer, "#ffd9a0", 0.18 + power * 0.1, 280, false);
    }
    screenShake(0.6 + power * 0.7);
    const list = targets();
    for (let i = 0; i < list.length; i++) {
      const r = rectOf(list[i]);
      if (!r) continue;
      const cx = clampV(x, r.left, r.right);
      const cy = clampV(y, r.top, r.bottom);
      const d = Math.hypot(cx - x, cy - y);
      if (d > radius) continue;
      try {
        ctx.damage(list[i], cx, cy);
        if (d < radius * 0.45) ctx.damage(list[i], cx, cy);
      } catch {}
    }
    try {
      ctx.hitStickman(x, y, ownerPlayer);
    } catch {}
    try {
      ctx.push(x, y, radius * 1.7, 5 + power * 4);
    } catch {}
    const c = cursor();
    if (c && Math.hypot(c.x - x, c.y - y) < radius + 14) {
      try {
        ctx.hitCursor(c.x, c.y);
      } catch {}
    }
  }

  function removeShot(i) {
    const s = shots[i];
    try {
      if (s && s.el) s.el.remove();
    } catch {}
    shots.splice(i, 1);
  }

  function makeRocket(layer, sx, sy, tx, ty, ownerPlayer) {
    const el = createElement("div", { className: "stk-weapon-shot" });
    el.style.cssText =
      "position:absolute;pointer-events:none;width:26px;height:9px;filter:drop-shadow(0 0 5px rgba(255,140,40,0.8));";
    const body = document.createElement("i");
    body.style.cssText =
      "position:absolute;left:0;top:0;width:26px;height:9px;clip-path:polygon(0 0,18% 22%,58% 22%,78% 36%,100% 50%,78% 64%,58% 78%,18% 78%,0 100%,8% 50%);background:linear-gradient(180deg,rgba(255,255,255,0.6) 0%,rgba(0,0,0,0) 45%,rgba(0,0,0,0.4) 100%),linear-gradient(90deg,#5a0a0a 0%,#c42020 18%,#dcdcdc 20%,#f6f6f6 52%,#c02020 56%,#c02020 63%,#e8e8e8 65%,#b9bfc9 80%,#e03030 100%);";
    const flame = document.createElement("i");
    flame.style.cssText =
      "position:absolute;left:-17px;top:0;width:19px;height:9px;border-radius:50%;transform-origin:100% 50%;background:radial-gradient(ellipse at 80% 50%,#ffffff 0%,#fff3b0 25%,#ff9a1c 55%,rgba(255,60,10,0) 82%);";
    el.appendChild(flame);
    el.appendChild(body);
    try {
      if (flame.animate) {
        flame.animate(
          [
            { transform: "scaleX(1)", opacity: 0.9 },
            { transform: "scaleX(1.7)", opacity: 1 },
            { transform: "scaleX(0.85)", opacity: 0.8 },
            { transform: "scaleX(1.4)", opacity: 1 },
          ],
          { duration: 140, iterations: Infinity },
        );
      }
    } catch {}
    layer.appendChild(el);
    const c = aimFor(ownerPlayer);
    const chase = !!(c && Math.hypot(c.x - tx, c.y - ty) < 34);
    return {
      kind: "rocket",
      el,
      x: sx,
      y: sy,
      tx,
      ty,
      chase,
      ang: Math.atan2(ty - sy, tx - sx),
      speed: 4,
      trail: 0,
      ember: 0,
      age: 0,
    };
  }

  function makeGrenade(layer, sx, sy, tx, ty) {
    const el = createElement("div", { className: "stk-weapon-shot" });
    el.style.cssText =
      "position:absolute;pointer-events:none;width:11px;height:13px;";
    const body = document.createElement("i");
    body.style.cssText =
      "position:absolute;left:0;top:2px;width:11px;height:11px;border-radius:46%;background:radial-gradient(circle at 32% 28%,rgba(255,255,255,0.45) 0%,rgba(255,255,255,0) 35%),repeating-linear-gradient(0deg,rgba(0,0,0,0.28) 0 1px,rgba(0,0,0,0) 1px 3px),radial-gradient(circle at 40% 35%,#7da06a 0%,#3c5632 60%,#1a2716 100%);box-shadow:0 1px 3px rgba(0,0,0,0.5);";
    const cap = document.createElement("i");
    cap.style.cssText =
      "position:absolute;left:3px;top:0;width:5px;height:3px;border-radius:1px;background:linear-gradient(180deg,#b8b8b8,#6a6a6a);";
    const lever = document.createElement("i");
    lever.style.cssText =
      "position:absolute;left:6px;top:-1px;width:3px;height:8px;border-radius:2px;background:linear-gradient(90deg,#d0d0d0,#808080);transform:rotate(-14deg);transform-origin:50% 0;";
    const ring = document.createElement("i");
    ring.style.cssText =
      "position:absolute;left:-3px;top:-1px;width:5px;height:5px;border-radius:50%;border:1px solid #c8c8c8;box-sizing:border-box;";
    el.appendChild(body);
    el.appendChild(cap);
    el.appendChild(lever);
    el.appendChild(ring);
    layer.appendChild(el);
    const dx = tx - sx;
    const dy = ty - sy;
    const T = GRENADE_FLIGHT;
    return {
      kind: "grenade",
      el,
      x: sx,
      y: sy,
      vx: clampV(dx / T, -13, 13),
      vy: clampV((dy - (GRENADE_GRAVITY * T * (T + 1)) / 2) / T, -15, 6),
      ang: 0,
      fuse: GRENADE_FUSE,
      spark: 0,
      age: 0,
    };
  }

  function makeKnife(layer, sx, sy, tx, ty) {
    const el = createElement("div", { className: "stk-weapon-shot" });
    el.style.cssText =
      "position:absolute;pointer-events:none;width:15px;height:15px;clip-path:polygon(50% 0%,60% 36%,100% 50%,60% 64%,50% 100%,40% 64%,0% 50%,40% 36%);background:radial-gradient(circle,#2a2f3a 0%,#2a2f3a 12%,#ffffff 14%,#d8deea 42%,#5a6270 100%);filter:drop-shadow(0 0 5px rgba(200,225,255,0.85));";
    layer.appendChild(el);
    const dir = Math.atan2(ty - sy, tx - sx) + (Math.random() - 0.5) * 0.08;
    return {
      kind: "knife",
      el,
      x: sx,
      y: sy,
      vx: Math.cos(dir) * (KNIFE_SPEED + 2),
      vy: Math.sin(dir) * (KNIFE_SPEED + 2),
      dir,
      ang: dir,
      spinRate: (Math.random() < 0.5 ? -1 : 1) * 0.75,
      flying: 0,
      age: 0,
    };
  }

  function explodeLightning(x, y, ownerPlayer) {
    const layer = host();
    try {
      ctx.sparks(x, y, 18);
    } catch {}
    try {
      ctx.sfx.shatter();
      ctx.sfx.hit();
    } catch {}
    if (layer) {
      fxElectricSpark(layer, x, y, 18);
      fxRing(layer, x, y, 90, "#a0e8ff");
      fxRing(layer, x, y, 44, "#ffffff");
      puff(layer, x, y, 120, "rgba(220,240,255,1)", 220, 0, 0, 1.5);
      puff(layer, x, y, 70, "rgba(120,190,255,0.9)", 380, 0, 0, 2);
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = 30 + Math.random() * 60;
        puff(
          layer,
          x,
          y,
          4 + Math.random() * 4,
          "rgba(200,235,255,1)",
          260 + Math.random() * 200,
          Math.cos(a) * d,
          Math.sin(a) * d,
          0.2,
        );
      }
      flashScreen(layer, "#bcd8ff", 0.4, 340, true);
    }
    screenShake(0.4);
    const hit = hitTarget(x, y);
    try {
      ctx.hitStickman(x, y, ownerPlayer);
    } catch {}
    if (hit) {
      try {
        ctx.damage(hit.node, x, y);
      } catch {}
      try {
        ctx.sparks(x, y, 8);
      } catch {}
    }
    const c = cursor();
    if (c && Math.hypot(c.x - x, c.y - y) < 34) {
      try {
        ctx.hitCursor(c.x, c.y);
      } catch {}
    }
  }

  function makeLightning(layer, sx, sy, tx, ty) {
    const dist = Math.max(1, Math.hypot(tx - sx, ty - sy));
    const ang = Math.atan2(ty - sy, tx - sx);
    const pad = Math.max(70, dist * 0.35);
    const x0 = Math.min(sx, tx) - pad;
    const y0 = Math.min(sy, ty) - pad;
    const w = Math.abs(tx - sx) + pad * 2;
    const h = Math.abs(ty - sy) + pad * 2;
    const svg = svgEl("svg", {
      class: "stk-weapon-shot",
      viewBox:
        x0.toFixed(1) +
        " " +
        y0.toFixed(1) +
        " " +
        w.toFixed(1) +
        " " +
        h.toFixed(1),
    });
    svg.style.cssText =
      "position:absolute;pointer-events:none;overflow:visible;left:" +
      x0.toFixed(1) +
      "px;top:" +
      y0.toFixed(1) +
      "px;width:" +
      w.toFixed(1) +
      "px;height:" +
      h.toFixed(1) +
      "px;filter:drop-shadow(0 0 5px #6ab8ff) drop-shadow(0 0 16px #2f6bff);";
    const stroke = (color) => ({
      fill: "none",
      stroke: color,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      d: "",
    });
    const parts = {
      glowMain: svgEl("path", stroke("rgba(70,150,255,0.38)")),
      glowBr: svgEl("path", stroke("rgba(70,150,255,0.3)")),
      midMain: svgEl("path", stroke("#8fd0ff")),
      midBr: svgEl("path", stroke("#8fd0ff")),
      coreMain: svgEl("path", stroke("#ffffff")),
      coreBr: svgEl("path", stroke("#f2faff")),
      hitHalo: svgEl("circle", {
        cx: tx.toFixed(1),
        cy: ty.toFixed(1),
        r: "0",
        fill: "rgba(120,190,255,0.45)",
      }),
      hitCore: svgEl("circle", {
        cx: tx.toFixed(1),
        cy: ty.toFixed(1),
        r: "0",
        fill: "#ffffff",
      }),
      srcHalo: svgEl("circle", {
        cx: sx.toFixed(1),
        cy: sy.toFixed(1),
        r: "0",
        fill: "rgba(200,235,255,0.9)",
      }),
    };
    for (const k in parts) svg.appendChild(parts[k]);
    layer.appendChild(svg);
    const s = {
      kind: "lightning",
      el: svg,
      parts,
      x: sx,
      y: sy,
      tx,
      ty,
      ang,
      life: LIGHTNING_LIFE,
      frame: LIGHTNING_FRAME,
      struck: false,
      age: 0,
    };
    s.shape = buildLightning(s);
    renderLightning(s, 0.02, 1.6, 1);
    flashScreen(layer, "#9cc4ff", 0.12, 140, false);
    return s;
  }

  function makeOrb(layer, sx, sy, tx, ty) {
    const el = createElement("div", { className: "stk-weapon-shot" });
    el.style.cssText =
      "position:absolute;pointer-events:none;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle,#ffffff 0%,#c8b0ff 25%,#9060ff 45%,#4020aa 68%,rgba(40,0,120,0) 82%);box-shadow:0 0 14px 5px rgba(140,60,255,0.9),0 0 30px 10px rgba(90,30,200,0.45);";
    const halo = document.createElement("i");
    halo.style.cssText =
      "position:absolute;left:-8px;top:-8px;width:32px;height:32px;border-radius:50%;background:radial-gradient(circle,rgba(160,110,255,0.35) 0%,rgba(100,40,220,0) 70%);";
    const ring = document.createElement("i");
    ring.style.cssText =
      "position:absolute;left:-9px;top:-9px;width:34px;height:34px;";
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("b");
      const a = (i / 3) * Math.PI * 2;
      dot.style.cssText =
        "position:absolute;width:4px;height:4px;border-radius:50%;background:#e4d6ff;box-shadow:0 0 5px 2px rgba(170,120,255,0.9);left:" +
        (15 + Math.cos(a) * 15).toFixed(1) +
        "px;top:" +
        (15 + Math.sin(a) * 15).toFixed(1) +
        "px;";
      ring.appendChild(dot);
    }
    el.appendChild(halo);
    el.appendChild(ring);
    try {
      if (ring.animate) {
        ring.animate(
          [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
          { duration: 600, iterations: Infinity },
        );
      }
      if (halo.animate) {
        halo.animate(
          [
            { transform: "scale(0.85)", opacity: 0.7 },
            { transform: "scale(1.25)", opacity: 1 },
            { transform: "scale(0.85)", opacity: 0.7 },
          ],
          { duration: 380, iterations: Infinity },
        );
      }
    } catch {}
    layer.appendChild(el);
    return {
      kind: "orb",
      el,
      x: sx,
      y: sy,
      tx,
      ty,
      ang: Math.atan2(ty - sy, tx - sx),
      speed: 3,
      trail: 0,
      age: 0,
    };
  }

  function makeRealityCutter(layer, sx, sy, tx, ty) {
    const el = createElement("div", { className: "stk-weapon-shot" });
    el.style.cssText =
      "position:absolute;pointer-events:none;width:48px;height:8px;background:linear-gradient(90deg,rgba(0,0,0,0) 0%,#050102 18%,#ff1028 48%,#ffffff 50%,#ff1028 52%,#050102 82%,rgba(0,0,0,0) 100%);box-shadow:0 0 16px 5px rgba(255,10,30,0.9),0 0 2px 1px #fff;clip-path:polygon(0 50%,20% 0,80% 0,100% 50%,80% 100%,20% 100%);filter:drop-shadow(0 0 9px #ff0022);";
    try {
      if (el.animate) {
        el.animate(
          [
            { filter: "drop-shadow(0 0 6px #ff0022) brightness(1)" },
            { filter: "drop-shadow(0 0 14px #ff0022) brightness(1.6)" },
            { filter: "drop-shadow(0 0 6px #ff0022) brightness(1)" },
          ],
          { duration: 160, iterations: Infinity },
        );
      }
    } catch {}
    layer.appendChild(el);
    const ang = Math.atan2(ty - sy, tx - sx);
    const isX = Math.hypot(tx - sx, ty - sy) < 400 && Math.random() < 0.45;
    fxRealityRift(layer, sx, sy, ang);
    return {
      kind: "cutter",
      el,
      x: sx,
      y: sy,
      ang,
      isX,
      speed: 13,
      riftCd: 0,
      age: 0,
    };
  }

  function fire(kind, sx, sy, tx, ty, ownerPlayer) {
    const layer = host();
    if (!layer || shots.length >= MAX_SHOTS) return;
    let s = null;
    if (kind === "rocket") s = makeRocket(layer, sx, sy, tx, ty, ownerPlayer);
    else if (kind === "grenade") s = makeGrenade(layer, sx, sy, tx, ty);
    else if (kind === "knife") s = makeKnife(layer, sx, sy, tx, ty);
    else if (kind === "lightning") s = makeLightning(layer, sx, sy, tx, ty);
    else if (kind === "orb") s = makeOrb(layer, sx, sy, tx, ty);
    else if (kind === "cutter") s = makeRealityCutter(layer, sx, sy, tx, ty);
    if (!s) return;
    s.ownerPlayer = ownerPlayer;
    shots.push(s);
    place(s);
    if (kind === "rocket") {
      puff(layer, sx, sy, 34, "rgba(255,230,160,1)", 160, 0, 0, 1.6);
    } else if (kind === "orb") {
      puff(layer, sx, sy, 38, "rgba(190,150,255,1)", 220, 0, 0, 1.6);
    } else if (kind === "cutter") {
      puff(layer, sx, sy, 40, "rgba(255,60,80,1)", 220, 0, 0, 1.7);
    } else if (kind === "knife") {
      puff(layer, sx, sy, 20, "rgba(220,235,255,1)", 130, 0, 0, 1.5);
    }
    try {
      ctx.sfx.hit();
    } catch {}
  }

  function stepRocket(s, dt, dtSec) {
    const layer = host();
    if (s.chase) {
      const c = aimFor(s.ownerPlayer);
      if (c) {
        s.tx = c.x;
        s.ty = c.y;
      }
    }
    const want = Math.atan2(s.ty - s.y, s.tx - s.x);
    s.ang += clampV(wrap(want - s.ang), -ROCKET_TURN * dt, ROCKET_TURN * dt);
    s.speed = Math.min(ROCKET_TOP_SPEED, s.speed + 0.28 * dt);
    s.x += Math.cos(s.ang) * s.speed * dt;
    s.y += Math.sin(s.ang) * s.speed * dt;
    s.age += dtSec;
    s.trail -= dt;
    s.ember -= dt;
    const bx = s.x - Math.cos(s.ang) * 13;
    const by = s.y - Math.sin(s.ang) * 13;
    if (s.trail <= 0 && layer) {
      s.trail = 1.6;
      fxSmoke(layer, bx, by, 0.55);
    }
    if (s.ember <= 0 && layer) {
      s.ember = 0.8;
      puff(
        layer,
        bx + (Math.random() - 0.5) * 3,
        by + (Math.random() - 0.5) * 3,
        7 + Math.random() * 6,
        Math.random() < 0.5 ? "rgba(255,190,70,0.95)" : "rgba(255,110,30,0.9)",
        260,
        -Math.cos(s.ang) * 10 + (Math.random() - 0.5) * 8,
        -Math.sin(s.ang) * 10 + (Math.random() - 0.5) * 8 + 6,
        0.25,
      );
    }
    place(s);
    if (s.age > 3.2) return "gone";
    if (s.x < -40 || s.x > window.innerWidth + 40 || s.y < -40) return "gone";
    if (s.y >= floorLine()) return "boom";
    const c = aimFor(s.ownerPlayer);
    if (c && Math.hypot(c.x - s.x, c.y - s.y) < 22) return "boom";
    if (hitTarget(s.x, s.y)) return "boom";
    const arrived = s.chase ? c : null;
    if (!arrived && Math.hypot(s.tx - s.x, s.ty - s.y) < 12) return "boom";
    return null;
  }

  function stepGrenade(s, dt, dtSec) {
    const layer = host();
    s.vy += GRENADE_GRAVITY * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.ang += s.vx * 0.09 * dt;
    s.age += dtSec;
    s.fuse -= dt;
    s.spark -= dt;
    const floor = floorLine() - 5;
    if (s.y >= floor) {
      if (Math.abs(s.vy) > 1.5 && layer) {
        puff(
          layer,
          s.x,
          floor + 4,
          16,
          "rgba(190,170,140,0.8)",
          260,
          0,
          -6,
          1.8,
        );
      }
      s.y = floor;
      s.vy = -Math.abs(s.vy) * 0.45;
      s.vx *= 0.72;
      if (Math.abs(s.vy) < 0.8) s.vy = 0;
    }
    if (s.x < 4) {
      s.x = 4;
      s.vx = Math.abs(s.vx) * 0.6;
    } else if (s.x > window.innerWidth - 4) {
      s.x = window.innerWidth - 4;
      s.vx = -Math.abs(s.vx) * 0.6;
    }
    if (s.spark <= 0 && layer) {
      s.spark = 2.2;
      puff(
        layer,
        s.x,
        s.y - 6,
        6 + Math.random() * 3,
        "rgba(255,225,120,1)",
        200,
        (Math.random() - 0.5) * 10,
        -8 - Math.random() * 8,
        0.2,
      );
    }
    place(s);
    try {
      s.el.style.filter =
        s.fuse < 28 && Math.floor(s.fuse / 3) % 2 === 0
          ? "brightness(2.6) saturate(2) drop-shadow(0 0 6px #ff3020)"
          : "";
    } catch {}
    if (s.fuse <= 0) return "boom";
    return null;
  }

  function stepKnife(s, dt, dtSec) {
    const layer = host();
    s.vy += 0.05 * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.ang += s.spinRate * dt;
    s.age += dtSec;
    if (layer) {
      puff(
        layer,
        s.x - s.vx * 0.4,
        s.y - s.vy * 0.4,
        10,
        "rgba(205,225,255,0.85)",
        170,
        -s.vx * 0.5,
        -s.vy * 0.5,
        0.3,
      );
    }
    place(s);
    if (
      s.age > 2 ||
      s.x < -30 ||
      s.x > window.innerWidth + 30 ||
      s.y > window.innerHeight + 30
    ) {
      return "gone";
    }
    if (s.ownerPlayer === true) {
      const c = cursor();
      if (c && Math.hypot(c.x - s.x, c.y - s.y) < 20) {
        try {
          ctx.sparks(s.x, s.y, 8);
          ctx.hitCursor(c.x, c.y);
        } catch {}
        return "gone";
      }
    }
    const hit = hitTarget(s.x, s.y);
    try {
      ctx.hitStickman(s.x, s.y, s.ownerPlayer);
    } catch {}
    if (hit) {
      try {
        ctx.damage(hit.node, s.x, s.y);
        ctx.sparks(s.x, s.y, 7);
      } catch {}
      if (layer)
        puff(layer, s.x, s.y, 26, "rgba(255,255,255,1)", 140, 0, 0, 1.6);
      fxStuckBlade(
        hit.node,
        s.x,
        s.y,
        (Math.atan2(s.vy, s.vx) * 180) / Math.PI,
      );
      return "gone";
    }
    return null;
  }

  function stepLightning(s, dt, dtSec) {
    s.age += dtSec;
    s.frame -= dtSec;
    if (s.frame <= 0) {
      s.frame = LIGHTNING_FRAME;
      s.shape = buildLightning(s);
    }
    const grow = clampV(s.age / LIGHTNING_GROW, 0, 1);
    if (grow >= 1 && !s.struck) {
      s.struck = true;
      explodeLightning(s.tx, s.ty, s.ownerPlayer);
    }
    const since = Math.max(0, s.age - LIGHTNING_GROW);
    const pulse = 1 + Math.max(0, 1 - since / 0.09) * 0.9;
    let alpha = clampV((s.life - s.age) / LIGHTNING_FADE, 0, 1);
    if (since > 0)
      alpha *= Math.random() < 0.2 ? 0.25 : 0.8 + Math.random() * 0.2;
    renderLightning(s, grow, pulse, alpha);
    if (s.age >= s.life) return "gone";
    return null;
  }

  function stepOrb(s, dt, dtSec) {
    const layer = host();
    const c = aimFor(s.ownerPlayer);
    if (c) {
      const want = Math.atan2(c.y - s.y, c.x - s.x);
      const diff = wrap(want - s.ang);
      s.ang += clampV(diff, -ORB_TURN * dt, ORB_TURN * dt);
    } else {
      const want = Math.atan2(s.ty - s.y, s.tx - s.x);
      s.ang += clampV(wrap(want - s.ang), -ORB_TURN * dt, ORB_TURN * dt);
    }
    s.speed = Math.min(ORB_SPEED_MAX, s.speed + 0.22 * dt);
    s.x += Math.cos(s.ang) * s.speed * dt;
    s.y += Math.sin(s.ang) * s.speed * dt;
    s.age += dtSec;
    s.trail -= dt;
    if (layer) {
      puff(
        layer,
        s.x,
        s.y,
        14 + Math.random() * 6,
        "rgba(150,100,255,0.8)",
        320,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        0.3,
      );
    }
    if (s.trail <= 0 && layer) {
      s.trail = 1.4;
      fxSmoke(layer, s.x, s.y, 0.4);
    }
    place(s);
    if (s.age > 2.8) return "gone";
    if (
      s.x < -60 ||
      s.x > window.innerWidth + 60 ||
      s.y < -60 ||
      s.y > window.innerHeight + 60
    )
      return "gone";
    if (s.y >= floorLine()) return "orbBoom";
    const c2 = aimFor(s.ownerPlayer);
    if (c2 && Math.hypot(c2.x - s.x, c2.y - s.y) < 24) return "orbBoom";
    if (hitTarget(s.x, s.y)) return "orbBoom";
    if (Math.hypot(s.tx - s.x, s.ty - s.y) < 14) return "orbBoom";
    return null;
  }

  function stepRealityCutter(s, dt, dtSec) {
    const layer = host();
    s.x += Math.cos(s.ang) * s.speed * dt;
    s.y += Math.sin(s.ang) * s.speed * dt;
    s.age += dtSec;
    s.riftCd -= dt;
    if (layer) {
      puff(
        layer,
        s.x - Math.cos(s.ang) * 14,
        s.y - Math.sin(s.ang) * 14,
        16 + Math.random() * 8,
        "rgba(255,20,50,0.85)",
        280,
        -Math.cos(s.ang) * 14,
        -Math.sin(s.ang) * 14,
        0.3,
      );
    }
    if (s.riftCd <= 0 && layer) {
      s.riftCd = 4.5;
      fxRealityRift(layer, s.x, s.y, s.ang);
      try {
        ctx.sparks(s.x, s.y, 4);
      } catch {}
    }
    for (let j = shots.length - 1; j >= 0; j--) {
      const other = shots[j];
      if (
        other &&
        other !== s &&
        (other.kind === "rocket" ||
          other.kind === "knife" ||
          other.kind === "grenade")
      ) {
        if (Math.hypot(other.x - s.x, other.y - s.y) < 32) {
          try {
            if (other.el) other.el.remove();
          } catch {}
          shots.splice(j, 1);
          try {
            ctx.sparks(s.x, s.y, 10);
          } catch {}
          if (layer)
            puff(layer, s.x, s.y, 50, "rgba(255,40,60,1)", 220, 0, 0, 1.8);
          screenShake(0.18);
        }
      }
    }
    place(s);
    if (s.age > 2.6) return "gone";
    if (
      s.x < -80 ||
      s.x > window.innerWidth + 80 ||
      s.y < -80 ||
      s.y > window.innerHeight + 80
    ) {
      return "gone";
    }
    try {
      if (typeof ctx.cutCage === "function" && ctx.cutCage(s.x, s.y, 40)) {
        if (s.isX) return "xBoom";
      }
    } catch {}
    if (s.ownerPlayer === true) {
      const c = cursor();
      if (c && Math.hypot(c.x - s.x, c.y - s.y) < 28) {
        try {
          ctx.hitCursor(c.x, c.y);
          ctx.sparks(s.x, s.y, 12);
        } catch {}
        return s.isX ? "xBoom" : "gone";
      }
    }
    const hit = hitTarget(s.x, s.y);
    try {
      ctx.hitStickman(s.x, s.y, s.ownerPlayer);
    } catch {}
    if (hit) {
      try {
        ctx.damage(hit.node, s.x, s.y);
        ctx.sparks(s.x, s.y, 12);
        screenShake(0.25);
      } catch {}
      return s.isX ? "xBoom" : "gone";
    }
    return null;
  }

  function update(dt, dtSec) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      let verdict = null;
      try {
        if (s.kind === "rocket") verdict = stepRocket(s, dt, dtSec);
        else if (s.kind === "grenade") verdict = stepGrenade(s, dt, dtSec);
        else if (s.kind === "lightning") verdict = stepLightning(s, dt, dtSec);
        else if (s.kind === "orb") verdict = stepOrb(s, dt, dtSec);
        else if (s.kind === "cutter") verdict = stepRealityCutter(s, dt, dtSec);
        else verdict = stepKnife(s, dt, dtSec);
      } catch {
        verdict = "gone";
      }
      if (!verdict) continue;
      const x = s.x;
      const y = s.y;
      const isX = s.isX;
      removeShot(i);
      if (verdict === "boom") {
        try {
          explode(
            x,
            y,
            BLAST_RADIUS,
            s.kind === "rocket" ? 1 : 0.8,
            s.ownerPlayer,
          );
        } catch {}
      } else if (
        verdict === "xBoom" ||
        (verdict === "gone" && isX && Math.random() < 0.5)
      ) {
        const layer = host();
        try {
          ctx.sparks(x, y, 28);
          ctx.sfx.shatter();
        } catch {}
        if (layer) {
          fxRealityRift(layer, x, y, Math.PI / 4);
          fxRealityRift(layer, x, y, -Math.PI / 4);
          fxRing(layer, x, y, 140, "#ff1028");
          fxRing(layer, x, y, 70, "#000000");
          fxFireball(layer, x, y, 48);
          puff(layer, x, y, 150, "rgba(255,30,60,0.9)", 320, 0, 0, 1.8);
          flashScreen(layer, "#ff2040", 0.2, 300, true);
        }
        screenShake(0.55);
        const list = targets();
        for (let j = 0; j < list.length; j++) {
          const r = rectOf(list[j]);
          if (!r) continue;
          const cx = clampV(x, r.left, r.right);
          const cy = clampV(y, r.top, r.bottom);
          if (Math.hypot(cx - x, cy - y) > 90) continue;
          try {
            ctx.damage(list[j], cx, cy);
          } catch {}
        }
        try {
          ctx.hitStickman(x, y, s ? s.ownerPlayer : undefined);
        } catch {}
        try {
          ctx.push(x, y, 120, 6);
        } catch {}
        const cur = cursor();
        if (cur && Math.hypot(cur.x - x, cur.y - y) < 80) {
          try {
            ctx.hitCursor(cur.x, cur.y);
          } catch {}
        }
      } else if (verdict === "orbBoom") {
        const layer = host();
        try {
          ctx.sparks(x, y, 18);
        } catch {}
        try {
          ctx.sfx.shatter();
        } catch {}
        if (layer) {
          fxEnergyBurst(layer, x, y, "#9060ff", ORB_RADIUS);
          puff(
            layer,
            x,
            y,
            ORB_RADIUS * 1.8,
            "rgba(190,150,255,0.95)",
            300,
            0,
            0,
            1.7,
          );
          fxRing(layer, x, y, ORB_RADIUS * 2, "#c8b0ff");
          flashScreen(layer, "#9060ff", 0.2, 280, false);
        }
        screenShake(0.35);
        const list = targets();
        for (let j = 0; j < list.length; j++) {
          const r = rectOf(list[j]);
          if (!r) continue;
          const cx = clampV(x, r.left, r.right);
          const cy = clampV(y, r.top, r.bottom);
          if (Math.hypot(cx - x, cy - y) > ORB_RADIUS) continue;
          try {
            ctx.damage(list[j], cx, cy);
          } catch {}
        }
        try {
          ctx.hitStickman(x, y, s ? s.ownerPlayer : undefined);
        } catch {}
        try {
          ctx.push(x, y, ORB_RADIUS * 1.4, 4);
        } catch {}
        const c = cursor();
        if (c && Math.hypot(c.x - x, c.y - y) < ORB_RADIUS + 12) {
          try {
            ctx.hitCursor(c.x, c.y);
          } catch {}
        }
      }
    }
  }

  function clear() {
    for (let i = shots.length - 1; i >= 0; i--) removeShot(i);
    shots = [];
  }

  return { fire, update, clear, explode };
}
