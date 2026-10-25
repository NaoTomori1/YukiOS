import { createElement } from "../../framework.js";
import { openRealityRift } from "./stickmanRift.js";

export const POSE_KEYS = [
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

const POSE_DEFAULTS = {
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
};

export function pose(o) {
  const out = {};
  for (const key in POSE_DEFAULTS) {
    const v = o ? o[key] : undefined;
    out[key] = Number.isFinite(v) ? v : POSE_DEFAULTS[key];
  }
  return out;
}

const MAX_FX = 90;
const MAX_STAINS = 44;
const MAX_STAINS_TOTAL = 320;
const MAX_STUCK = 10;
const STAIN_SELECTOR = ".stk-stain";
const STUCK_SELECTOR = ".stk-stuck";

let liveFx = 0;
let shakeAnim = null;
let shakePending = 0;

const stainRegistry = new Map();
const childLists = new WeakMap();
const prepCache = new WeakMap();

function f(n) {
  return n.toFixed(1);
}

function box(x, y, size, extra) {
  const node = createElement("div");
  node.style.cssText =
    "position:absolute;pointer-events:none;left:" +
    f(x - size / 2) +
    "px;top:" +
    f(y - size / 2) +
    "px;width:" +
    f(size) +
    "px;height:" +
    f(size) +
    "px;" +
    extra;
  return node;
}

function run(layer, node, frames, opts) {
  if (!layer || !layer.isConnected || liveFx >= MAX_FX || !node.animate) {
    return null;
  }
  layer.appendChild(node);
  liveFx += 1;
  let anim = null;
  try {
    anim = node.animate(frames, opts);
  } catch {
    node.remove();
    liveFx = Math.max(0, liveFx - 1);
    return null;
  }
  const done = () => {
    try {
      node.remove();
    } catch {}
    liveFx = Math.max(0, liveFx - 1);
  };
  anim.onfinish = done;
  anim.oncancel = done;
  return anim;
}

export function fxRing(layer, x, y, size, color) {
  const node = box(
    x,
    y,
    size,
    "border-radius:50%;box-sizing:border-box;border:4px solid " + color + ";",
  );
  run(
    layer,
    node,
    [
      { transform: "scale(0.1)", opacity: 0.95, borderWidth: "7px" },
      { transform: "scale(1)", opacity: 0, borderWidth: "1px" },
    ],
    { duration: 440, easing: "cubic-bezier(.1,.8,.3,1)", fill: "forwards" },
  );
}

export function fxDust(layer, x, y, power) {
  const p = Math.max(0.2, Math.min(1.5, power || 0.5));
  const n = 2 + Math.round(p * 3);
  for (let i = 0; i < n; i++) {
    const size = 8 + Math.random() * 9 * p;
    const node = box(
      x + (Math.random() - 0.5) * 14,
      y - size * 0.3,
      size,
      "border-radius:50%;background:radial-gradient(circle,rgba(225,225,230,.8) 0%,rgba(190,190,196,.45) 55%,rgba(190,190,196,0) 72%);",
    );
    const dx = (Math.random() - 0.5) * 44 * p;
    const dy = -(4 + Math.random() * 16 * p);
    run(
      layer,
      node,
      [
        { transform: "translate(0px,0px) scale(.5)", opacity: 0.85 },
        {
          transform:
            "translate(" +
            f(dx) +
            "px," +
            f(dy) +
            "px) scale(" +
            (1.4 + Math.random() * 0.9).toFixed(2) +
            ")",
          opacity: 0,
        },
      ],
      {
        duration: 360 + Math.random() * 260,
        easing: "ease-out",
        fill: "forwards",
      },
    );
  }
}

export function fxSmoke(layer, x, y, power) {
  const p = Math.max(0.3, Math.min(1.6, power || 0.6));
  const size = 10 + Math.random() * 10 * p;
  const node = box(
    x,
    y,
    size,
    "border-radius:50%;background:radial-gradient(circle,rgba(70,70,76,.7) 0%,rgba(110,110,118,.4) 55%,rgba(110,110,118,0) 74%);",
  );
  run(
    layer,
    node,
    [
      { transform: "translate(0px,0px) scale(.4)", opacity: 0.8 },
      {
        transform:
          "translate(" +
          f((Math.random() - 0.5) * 18) +
          "px," +
          f(-14 - Math.random() * 22) +
          "px) scale(" +
          (1.8 + Math.random()).toFixed(2) +
          ")",
        opacity: 0,
      },
    ],
    {
      duration: 560 + Math.random() * 360,
      easing: "ease-out",
      fill: "forwards",
    },
  );
}

export function fxFireball(layer, x, y, radius) {
  const size = radius * 2;
  const node = box(
    x,
    y,
    size,
    "border-radius:50%;background:radial-gradient(circle,#fff6c8 0%,#ffc23a 30%,#ff5a14 60%,rgba(255,60,10,0) 72%);",
  );
  run(
    layer,
    node,
    [
      { transform: "scale(.15)", opacity: 1 },
      { transform: "scale(.85)", opacity: 0.95, offset: 0.35 },
      { transform: "scale(1.15)", opacity: 0 },
    ],
    { duration: 420, easing: "ease-out", fill: "forwards" },
  );
}

export function fxJetExhaust(layer, x, y, dirX, dirY, power) {
  const p = Math.max(0.4, Math.min(1.5, power || 1));
  let vx = Number.isFinite(dirX) ? dirX : 0;
  let vy = Number.isFinite(dirY) ? dirY : 1;
  const mag = Math.hypot(vx, vy);
  if (!Number.isFinite(mag) || mag < 0.0001) {
    vx = 0;
    vy = 1;
  } else {
    vx = vx / mag;
    vy = vy / mag;
  }
  const rot = " rotate(" + Math.atan2(-vx, vy).toFixed(3) + "rad)";
  const travel = 26 + 20 * p;
  try {
    const size = 10 + 7 * p;
    const node = box(
      x,
      y,
      size,
      "border-radius:50% 50% 50% 50% / 70% 70% 30% 30%;transform-origin:50% 0%;filter:blur(1.2px);background:linear-gradient(180deg,rgba(255,243,196,.95) 0%,rgba(255,180,58,.9) 30%,rgba(255,106,18,.65) 62%,rgba(255,80,10,0) 100%);",
    );
    const jx = -vy * (Math.random() - 0.5) * 6;
    const jy = vx * (Math.random() - 0.5) * 6;
    run(
      layer,
      node,
      [
        {
          transform: "translate(0px,0px)" + rot + " scale(0.55,0.7)",
          opacity: 0.95,
        },
        {
          transform:
            "translate(" +
            f(vx * travel * 0.5 + jx * 0.5) +
            "px," +
            f(vy * travel * 0.5 + jy * 0.5) +
            "px)" +
            rot +
            " scale(0.88,1.3)",
          opacity: 0.5,
          offset: 0.55,
        },
        {
          transform:
            "translate(" +
            f(vx * travel + jx) +
            "px," +
            f(vy * travel + jy) +
            "px)" +
            rot +
            " scale(1.15,1.9)",
          opacity: 0,
        },
      ],
      {
        duration: 170 + Math.random() * 90,
        easing: "ease-out",
        fill: "forwards",
      },
    );
    if (Math.random() < 0.3) {
      const count = Math.random() < 0.5 ? 1 : 2;
      for (let i = 0; i < count; i++) {
        const speckSize = 2 + Math.random() * 1.5;
        const spread = (Math.random() - 0.5) * 1.1;
        const dx = vx * Math.cos(spread) - vy * Math.sin(spread);
        const dy = vx * Math.sin(spread) + vy * Math.cos(spread);
        const reach = (30 + 40 * p) * (0.7 + Math.random() * 0.6);
        const speck = box(
          x,
          y,
          speckSize,
          "border-radius:50%;background:radial-gradient(circle,#fff6d8 0%,rgba(255,170,50,.9) 55%,rgba(255,110,20,0) 78%);",
        );
        run(
          layer,
          speck,
          [
            { transform: "translate(0px,0px) scale(0.7)", opacity: 0.95 },
            {
              transform:
                "translate(" +
                f(dx * reach) +
                "px," +
                f(dy * reach) +
                "px) scale(0.2)",
              opacity: 0,
            },
          ],
          {
            duration: 260 + Math.random() * 200,
            easing: "ease-out",
            fill: "forwards",
          },
        );
      }
    }
    if (Math.random() < 0.14) fxSmoke(layer, x, y, p * 0.5);
  } catch {}
}

const SHAKE_MAX_PENDING = 12;

function startShakeCycle(amp) {
  const body = document.body;
  if (!body || !body.animate) return;
  const p = amp;
  try {
    if (shakeAnim) shakeAnim.cancel();
  } catch {}
  try {
    const anim = body.animate(
      [
        { translate: "0px 0px" },
        { translate: f(-p) + "px " + f(p * 0.5) + "px" },
        { translate: f(p * 0.8) + "px " + f(-p * 0.6) + "px" },
        { translate: f(-p * 0.5) + "px " + f(-p * 0.3) + "px" },
        { translate: f(p * 0.3) + "px " + f(p * 0.3) + "px" },
        { translate: "0px 0px" },
      ],
      { duration: 280 + p * 14, easing: "ease-out" },
    );
    shakeAnim = anim;
    anim.onfinish = () => {
      if (shakeAnim === anim) shakeAnim = null;
      if (shakePending > 0) {
        const next = shakePending;
        shakePending = 0;
        startShakeCycle(next);
      }
    };
    anim.oncancel = () => {
      if (shakeAnim === anim) shakeAnim = null;
    };
  } catch {
    shakeAnim = null;
  }
}

export function screenShake(power) {
  const amp = Math.min(1.5, Math.max(0.1, power || 0.4)) * 7;
  if (shakeAnim) {
    shakePending = Math.min(SHAKE_MAX_PENDING, shakePending + amp);
    return;
  }
  const next =
    shakePending > 0 ? Math.min(SHAKE_MAX_PENDING, shakePending + amp) : amp;
  shakePending = 0;
  startShakeCycle(next);
}

export function resetScreenShake() {
  shakePending = 0;
  try {
    if (shakeAnim) shakeAnim.cancel();
  } catch {}
  shakeAnim = null;
  try {
    const body = document.body;
    if (body) body.style.translate = "";
  } catch {}
}

function getChildList(node, selector) {
  let lists = childLists.get(node);
  if (!lists) {
    lists = new Map();
    childLists.set(node, lists);
  }
  let list = lists.get(selector);
  if (!list) {
    list = [];
    lists.set(selector, list);
  }
  return list;
}

function removeFromLists(parent, el) {
  if (!parent) return;
  const lists = childLists.get(parent);
  if (!lists) return;
  for (const list of lists.values()) {
    const index = list.indexOf(el);
    if (index !== -1) list.splice(index, 1);
  }
}

function untrackStain(el) {
  if (!el) return;
  const parent = stainRegistry.get(el);
  if (!parent) return;
  stainRegistry.delete(el);
  removeFromLists(parent, el);
}

function enforceStainCap() {
  try {
    for (const el of stainRegistry.keys()) {
      if (!el.isConnected) stainRegistry.delete(el);
    }
    while (stainRegistry.size > MAX_STAINS_TOTAL) {
      const oldest = stainRegistry.keys().next();
      if (oldest.done) break;
      const el = oldest.value;
      const parent = stainRegistry.get(el);
      stainRegistry.delete(el);
      try {
        if (el.isConnected) el.remove();
      } catch {}
      removeFromLists(parent, el);
    }
  } catch {}
}

function trim(node, selector, max) {
  try {
    const list = getChildList(node, selector);
    let count = 0;
    for (let i = list.length - 1; i >= 0; i--) {
      if (!list[i].isConnected) list.splice(i, 1);
      else count += 1;
    }
    while (count >= max) {
      const victim = list.shift();
      if (!victim) break;
      try {
        victim.remove();
      } catch {}
      untrackStain(victim);
      count -= 1;
    }
  } catch {}
}

function trackChild(node, selector, el, max) {
  trim(node, selector, max);
  const list = getChildList(node, selector);
  list.push(el);
  if (selector === STAIN_SELECTOR) stainRegistry.set(el, node);
  enforceStainCap();
}

function prep(node) {
  try {
    if (prepCache.has(node)) return;
    const inlinePosition = node.style && node.style.position;
    if (inlinePosition) {
      prepCache.set(node, true);
      return;
    }
    if (window.getComputedStyle(node).position === "static") {
      node.style.position = "relative";
    }
  } catch {
  } finally {
    try {
      prepCache.set(node, true);
    } catch {}
  }
}

function glow(el, strong) {
  if (!el || !el.animate) return;
  let overlay = null;
  try {
    overlay = createElement("i", { className: "stk-stain-glow" });
    el.appendChild(overlay);
    if (!overlay.animate) {
      overlay.remove();
      return;
    }
    const anim = overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: strong === false ? 320 : 1200,
      easing: "ease-out",
    });
    const cleanup = () => {
      try {
        overlay.remove();
      } catch {}
    };
    anim.onfinish = cleanup;
    anim.oncancel = cleanup;
  } catch {
    try {
      if (overlay) overlay.remove();
    } catch {}
  }
}

export function fxStreak(node, mx, my, len, rad, thick, strong) {
  if (!node || !node.isConnected) return null;
  prep(node);
  const t = thick || 4;
  const el = createElement("div", { className: "stk-stain stk-streak" });
  el.style.cssText =
    "position:absolute;pointer-events:none;z-index:6;left:" +
    f(mx - len / 2) +
    "px;top:" +
    f(my - t / 2) +
    "px;width:" +
    f(len) +
    "px;height:" +
    f(t) +
    "px;border-radius:" +
    f(t) +
    "px;transform:rotate(" +
    rad.toFixed(3) +
    "rad);background:linear-gradient(90deg,rgba(30,12,4,0) 0%,rgba(22,9,3,.88) 10%,rgba(14,6,2,.94) 50%,rgba(22,9,3,.88) 90%,rgba(30,12,4,0) 100%);";
  node.appendChild(el);
  trackChild(node, STAIN_SELECTOR, el, MAX_STAINS);
  glow(el, strong);
  return el;
}

export function fxBlob(node, x, y, size) {
  if (!node || !node.isConnected) return null;
  prep(node);
  const el = createElement("div", { className: "stk-stain stk-blob" });
  el.style.cssText =
    "position:absolute;pointer-events:none;z-index:6;border-radius:50%;left:" +
    f(x - size / 2) +
    "px;top:" +
    f(y - size / 2) +
    "px;width:" +
    f(size) +
    "px;height:" +
    f(size) +
    "px;background:radial-gradient(circle,rgba(10,5,2,.95) 0%,rgba(28,12,5,.85) 38%,rgba(110,38,8,.5) 64%,rgba(255,120,30,0) 80%);";
  node.appendChild(el);
  trackChild(node, STAIN_SELECTOR, el, MAX_STAINS);
  glow(el, true);
  return el;
}

export function fxStuckBlade(node, x, y, deg) {
  if (!node || !node.isConnected) return null;
  let rect = null;
  try {
    rect = node.getBoundingClientRect();
  } catch {
    return null;
  }
  prep(node);
  const el = createElement("div", { className: "stk-stuck" });
  el.style.cssText =
    "position:absolute;pointer-events:none;z-index:7;width:15px;height:5px;left:" +
    f(x - rect.left - 7) +
    "px;top:" +
    f(y - rect.top - 2.5) +
    "px;transform:rotate(" +
    f(deg) +
    "deg);clip-path:polygon(0 50%,24% 0,100% 34%,100% 66%,24% 100%);background:linear-gradient(90deg,#aeb4c0,#f6f8fc);";
  node.appendChild(el);
  trackChild(node, STUCK_SELECTOR, el, MAX_STUCK);
  setTimeout(() => {
    try {
      if (!el.isConnected) return;
      if (!el.animate) {
        el.remove();
        return;
      }
      const a = el.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 600,
        fill: "forwards",
      });
      a.onfinish = () => {
        try {
          el.remove();
        } catch {}
      };
    } catch {}
  }, 9000);
  return el;
}

export function fxElectricSpark(layer, x, y, count) {
  if (!layer || !layer.isConnected) return;
  const n = Math.min(count || 8, 18);
  for (let i = 0; i < n; i++) {
    const size = 2 + Math.random() * 2.5;
    const ang = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
    const reach = 18 + Math.random() * 28;
    const node = box(
      x,
      y,
      size,
      "border-radius:50%;background:radial-gradient(circle,#e8f8ff 0%,#40b0ff 55%,rgba(64,160,255,0) 80%);",
    );
    run(
      layer,
      node,
      [
        { transform: "translate(0px,0px) scale(1)", opacity: 1 },
        {
          transform:
            "translate(" +
            f(Math.cos(ang) * reach) +
            "px," +
            f(Math.sin(ang) * reach) +
            "px) scale(0.2)",
          opacity: 0,
        },
      ],
      {
        duration: 180 + Math.random() * 120,
        easing: "ease-out",
        fill: "forwards",
      },
    );
  }
}

export function fxEnergyBurst(layer, x, y, color, radius) {
  if (!layer || !layer.isConnected) return;
  const r = radius || 80;
  fxRing(layer, x, y, r, color || "#9060ff");
  fxRing(layer, x, y, r * 0.5, "#ffffff");
  const size = r * 0.7;
  const node = box(
    x,
    y,
    size,
    "border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.95) 0%," +
      (color || "rgba(144,96,255,.8)") +
      " 35%,rgba(80,0,200,0) 70%);",
  );
  run(
    layer,
    node,
    [
      { transform: "scale(.1)", opacity: 1 },
      { transform: "scale(.7)", opacity: 0.8, offset: 0.4 },
      { transform: "scale(1.1)", opacity: 0 },
    ],
    { duration: 380, easing: "ease-out", fill: "forwards" },
  );
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    const ds = 3 + Math.random() * 3;
    const reach = r * (0.4 + Math.random() * 0.5);
    const debris = box(
      x,
      y,
      ds,
      "border-radius:50%;background:" + (color || "#9060ff") + ";",
    );
    run(
      layer,
      debris,
      [
        { transform: "translate(0px,0px) scale(1)", opacity: 1 },
        {
          transform:
            "translate(" +
            f(Math.cos(ang) * reach) +
            "px," +
            f(Math.sin(ang) * reach) +
            "px) scale(0.1)",
          opacity: 0,
        },
      ],
      {
        duration: 400 + Math.random() * 200,
        easing: "ease-out",
        fill: "forwards",
      },
    );
  }
}

export function fxChargeParticle(layer, ox, oy, tx, ty, color) {
  if (!layer || !layer.isConnected) return;
  const node = box(
    ox,
    oy,
    3,
    "border-radius:50%;background:" + (color || "#a0e8ff") + ";",
  );
  run(
    layer,
    node,
    [
      { transform: "translate(0px,0px) scale(1)", opacity: 0.9 },
      {
        transform:
          "translate(" + f(tx - ox) + "px," + f(ty - oy) + "px) scale(0.15)",
        opacity: 0,
      },
    ],
    {
      duration: 200 + Math.random() * 100,
      easing: "ease-in",
      fill: "forwards",
    },
  );
}

export function fxNinjaSmoke(layer, x, y) {
  if (!layer || !layer.isConnected) return;
  fxRing(layer, x, y, 64, "rgba(220,220,230,.7)");
  for (let i = 0; i < 9; i++) {
    const size = 18 + Math.random() * 18;
    const node = box(
      x + (Math.random() - 0.5) * 16,
      y + (Math.random() - 0.5) * 24,
      size,
      "border-radius:50%;background:radial-gradient(circle,rgba(240,240,245,.95) 0%,rgba(160,160,170,.6) 50%,rgba(100,100,110,0) 75%);",
    );
    const dx = (Math.random() - 0.5) * 52;
    const dy = -16 - Math.random() * 32;
    run(
      layer,
      node,
      [
        { transform: "translate(0px,0px) scale(0.35)", opacity: 0.95 },
        {
          transform:
            "translate(" +
            f(dx) +
            "px," +
            f(dy) +
            "px) scale(" +
            (1.5 + Math.random() * 0.8).toFixed(2) +
            ")",
          opacity: 0,
        },
      ],
      {
        duration: 480 + Math.random() * 260,
        easing: "cubic-bezier(0.1, 0.8, 0.3, 1)",
        fill: "forwards",
      },
    );
  }
}

export function fxSubstitutionLog(layer, x, y) {
  if (!layer || !layer.isConnected) return;
  const node = createElement("div");
  node.style.cssText =
    "position:absolute;pointer-events:none;z-index:4;left:" +
    f(x - 9) +
    "px;top:" +
    f(y - 20) +
    "px;width:18px;height:40px;border-radius:6px;background:linear-gradient(90deg,#5a3618 0%,#8b5a2b 35%,#6f421b 70%,#46270e 100%);box-shadow:inset 0 4px 0 #9c6c39,0 4px 10px rgba(0,0,0,.5);";
  run(
    layer,
    node,
    [
      { transform: "translate(0px,0px) rotate(0deg) scale(1)", opacity: 1 },
      {
        transform:
          "translate(" +
          f((Math.random() - 0.5) * 16) +
          "px,8px) rotate(" +
          (Math.random() < 0.5 ? 14 : -14) +
          "deg) scale(0.95)",
        opacity: 0,
        offset: 0.7,
      },
      {
        transform: "translate(0px,16px) rotate(22deg) scale(0.8)",
        opacity: 0,
      },
    ],
    { duration: 850, easing: "ease-out", fill: "forwards" },
  );
}

export function fxRealityRift(layer, x, y, ang) {
  if (!layer || !layer.isConnected) return;
  openRealityRift(x, y, ang);
  try {
    const body = document.body;
    if (body && body.animate) {
      body.animate(
        [
          { filter: "none" },
          {
            filter:
              "invert(0.1) drop-shadow(-3px 0 0 rgba(255,0,0,0.6)) drop-shadow(3px 0 0 rgba(120,200,255,0.5))",
            offset: 0.3,
          },
          { filter: "none" },
        ],
        { duration: 340, easing: "ease-out" },
      );
    }
  } catch {}
}
