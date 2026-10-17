const MAX_FX = 90;
const MAX_STAINS = 44;

let liveFx = 0;
let shakeAnim = null;

function f(n) {
  return n.toFixed(1);
}

function box(x, y, size, extra) {
  const node = document.createElement("div");
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

export function screenShake(power) {
  const body = document.body;
  if (!body || !body.animate) return;
  const p = Math.min(1.5, Math.max(0.1, power || 0.4)) * 7;
  try {
    if (shakeAnim) shakeAnim.cancel();
  } catch {}
  try {
    shakeAnim = body.animate(
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
  } catch {
    shakeAnim = null;
  }
}

function trim(node, selector, max) {
  try {
    const list = node.querySelectorAll(":scope > " + selector);
    if (list.length >= max) list[0].remove();
  } catch {}
}

function prep(node) {
  try {
    if (window.getComputedStyle(node).position === "static") {
      node.style.position = "relative";
    }
  } catch {}
}

function glow(el, strong) {
  if (!el.animate) return;
  try {
    el.animate(
      [
        {
          boxShadow:
            "0 0 10px 3px rgba(255,150,50,.95), 0 0 2px 1px rgba(255,235,170,.9)",
          filter: "brightness(1.9)",
        },
        { boxShadow: "0 0 0 0 rgba(255,110,30,0)", filter: "brightness(1)" },
      ],
      { duration: strong === false ? 320 : 1200, easing: "ease-out" },
    );
  } catch {}
}

export function fxStreak(node, mx, my, len, rad, thick, strong) {
  if (!node || !node.isConnected) return null;
  trim(node, ".stk-stain", MAX_STAINS);
  prep(node);
  const t = thick || 4;
  const el = document.createElement("div");
  el.className = "stk-stain stk-streak";
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
  glow(el, strong);
  return el;
}

export function fxBlob(node, x, y, size) {
  if (!node || !node.isConnected) return null;
  trim(node, ".stk-stain", MAX_STAINS);
  prep(node);
  const el = document.createElement("div");
  el.className = "stk-stain stk-blob";
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
  trim(node, ".stk-stuck", 10);
  prep(node);
  const el = document.createElement("div");
  el.className = "stk-stuck";
  el.style.cssText =
    "position:absolute;pointer-events:none;z-index:7;width:15px;height:5px;left:" +
    f(x - rect.left - 7) +
    "px;top:" +
    f(y - rect.top - 2.5) +
    "px;transform:rotate(" +
    f(deg) +
    "deg);clip-path:polygon(0 50%,24% 0,100% 34%,100% 66%,24% 100%);background:linear-gradient(90deg,#aeb4c0,#f6f8fc);";
  node.appendChild(el);
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
