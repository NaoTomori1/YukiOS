import { createElement } from "../../framework.js";
import {
  fxRing,
  fxSmoke,
  fxFireball,
  fxDust,
  screenShake,
  fxStuckBlade,
} from "./stickmanFx.js";

const ROCKET_TURN = 0.07;
const ROCKET_TOP_SPEED = 15;
const GRENADE_FUSE = 64;
const GRENADE_GRAVITY = 0.32;
const GRENADE_FLIGHT = 46;
const KNIFE_SPEED = 15;
const BLAST_RADIUS = 96;
const MAX_SHOTS = 16;

function clampV(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function wrap(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
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
    s.el.style.left = s.x.toFixed(1) + "px";
    s.el.style.top = s.y.toFixed(1) + "px";
    s.el.style.transform =
      "translate(-50%,-50%) rotate(" +
      ((s.ang * 180) / Math.PI).toFixed(1) +
      "deg)";
  }

  function explode(x, y, radius, power) {
    const layer = host();
    try {
      ctx.sparks(x, y, 26);
    } catch {}
    try {
      ctx.sfx.shatter();
      ctx.sfx.hit();
    } catch {}
    if (layer) {
      fxFireball(layer, x, y, radius * 0.9);
      fxRing(layer, x, y, radius * 2.2, "#ffb347");
      fxRing(layer, x, y, radius * 1.3, "#fff3c4");
      for (let i = 0; i < 6; i++) {
        fxSmoke(
          layer,
          x + (Math.random() - 0.5) * radius,
          y + (Math.random() - 0.5) * radius * 0.6,
          1.1,
        );
      }
      fxDust(layer, x, y, 1);
    }
    screenShake(0.5 + power * 0.6);
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

  function makeRocket(layer, sx, sy, tx, ty) {
    const el = createElement("div", { className: "stk-weapon-shot" });
    el.style.cssText =
      "position:absolute;pointer-events:none;width:20px;height:7px;background:linear-gradient(90deg,#8a1010 0%,#e03030 45%,#f4f4f4 46%,#c8c8c8 100%);clip-path:polygon(0 18%,68% 0,100% 50%,68% 100%,0 82%);";
    const flame = document.createElement("i");
    flame.style.cssText =
      "position:absolute;left:-9px;top:1px;width:11px;height:5px;border-radius:50%;background:radial-gradient(circle,#fff3b0 0%,#ff9a1c 55%,rgba(255,80,10,0) 80%);";
    el.appendChild(flame);
    try {
      if (flame.animate) {
        flame.animate(
          [
            { transform: "scaleX(1)" },
            { transform: "scaleX(1.7)" },
            { transform: "scaleX(1)" },
          ],
          { duration: 120, iterations: Infinity },
        );
      }
    } catch {}
    layer.appendChild(el);
    const c = cursor();
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
      age: 0,
    };
  }

  function makeGrenade(layer, sx, sy, tx, ty) {
    const el = createElement("div", { className: "stk-weapon-shot" });
    el.style.cssText =
      "position:absolute;pointer-events:none;width:9px;height:10px;border-radius:45%;background:radial-gradient(circle at 35% 30%,#7da06a 0%,#38502f 60%,#1d2b19 100%);box-shadow:0 -4px 0 -2px #bbb;";
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
      age: 0,
    };
  }

  function makeKnife(layer, sx, sy, tx, ty) {
    const el = createElement("div", { className: "stk-weapon-shot" });
    el.style.cssText =
      "position:absolute;pointer-events:none;width:15px;height:5px;clip-path:polygon(0 50%,24% 0,100% 34%,100% 66%,24% 100%);background:linear-gradient(90deg,#aeb4c0,#f6f8fc);";
    layer.appendChild(el);
    const dir = Math.atan2(ty - sy, tx - sx) + (Math.random() - 0.5) * 0.1;
    return {
      kind: "knife",
      el,
      x: sx,
      y: sy,
      vx: Math.cos(dir) * KNIFE_SPEED,
      vy: Math.sin(dir) * KNIFE_SPEED,
      dir,
      ang: dir,
      spinRate: (Math.random() < 0.5 ? -1 : 1) * 0.5,
      flying: 0,
      age: 0,
    };
  }

  function fire(kind, sx, sy, tx, ty) {
    const layer = host();
    if (!layer || shots.length >= MAX_SHOTS) return;
    let s = null;
    if (kind === "rocket") s = makeRocket(layer, sx, sy, tx, ty);
    else if (kind === "grenade") s = makeGrenade(layer, sx, sy, tx, ty);
    else if (kind === "knife") s = makeKnife(layer, sx, sy, tx, ty);
    if (!s) return;
    shots.push(s);
    place(s);
    try {
      ctx.sfx.hit();
    } catch {}
  }

  function stepRocket(s, dt, dtSec) {
    const layer = host();
    if (s.chase) {
      const c = cursor();
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
    if (s.trail <= 0 && layer) {
      s.trail = 1.6;
      fxSmoke(
        layer,
        s.x - Math.cos(s.ang) * 11,
        s.y - Math.sin(s.ang) * 11,
        0.5,
      );
    }
    place(s);
    if (s.age > 3.2) return "gone";
    if (s.x < -40 || s.x > window.innerWidth + 40 || s.y < -40) return "gone";
    if (s.y >= floorLine()) return "boom";
    const c = cursor();
    if (c && Math.hypot(c.x - s.x, c.y - s.y) < 22) return "boom";
    if (hitTarget(s.x, s.y)) return "boom";
    if (Math.hypot(s.tx - s.x, s.ty - s.y) < 12) return "boom";
    return null;
  }

  function stepGrenade(s, dt, dtSec) {
    s.vy += GRENADE_GRAVITY * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.ang += s.vx * 0.09 * dt;
    s.age += dtSec;
    s.fuse -= dt;
    const floor = floorLine() - 5;
    if (s.y >= floor) {
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
    place(s);
    try {
      s.el.style.filter =
        s.fuse < 28 && Math.floor(s.fuse / 3) % 2 === 0
          ? "brightness(2.6) saturate(2)"
          : "";
    } catch {}
    if (s.fuse <= 0) return "boom";
    return null;
  }

  function stepKnife(s, dt, dtSec) {
    s.vy += 0.05 * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.ang += s.spinRate * dt;
    s.age += dtSec;
    place(s);
    if (
      s.age > 2 ||
      s.x < -30 ||
      s.x > window.innerWidth + 30 ||
      s.y > window.innerHeight + 30
    ) {
      return "gone";
    }
    const c = cursor();
    if (c && Math.hypot(c.x - s.x, c.y - s.y) < 20) {
      try {
        ctx.sparks(s.x, s.y, 6);
        ctx.hitCursor(c.x, c.y);
      } catch {}
      return "gone";
    }
    const hit = hitTarget(s.x, s.y);
    if (hit) {
      try {
        ctx.damage(hit.node, s.x, s.y);
        ctx.sparks(s.x, s.y, 5);
      } catch {}
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

  function update(dt, dtSec) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      let verdict = null;
      try {
        if (s.kind === "rocket") verdict = stepRocket(s, dt, dtSec);
        else if (s.kind === "grenade") verdict = stepGrenade(s, dt, dtSec);
        else verdict = stepKnife(s, dt, dtSec);
      } catch {
        verdict = "gone";
      }
      if (!verdict) continue;
      const x = s.x;
      const y = s.y;
      removeShot(i);
      if (verdict === "boom") {
        try {
          explode(x, y, BLAST_RADIUS, s.kind === "rocket" ? 1 : 0.8);
        } catch {}
      }
    }
  }

  function clear() {
    for (let i = shots.length - 1; i >= 0; i--) removeShot(i);
    shots = [];
  }

  return { fire, update, clear, explode };
}
