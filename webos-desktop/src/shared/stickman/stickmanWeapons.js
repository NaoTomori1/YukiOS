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
const LIGHTNING_LIFE = 0.11;
const ORB_SPEED_MAX = 11;
const ORB_TURN = 0.06;
const ORB_RADIUS = 85;

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
      "position:absolute;pointer-events:none;width:13px;height:13px;clip-path:polygon(50% 0%,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0% 50%,38% 38%);background:radial-gradient(circle,#ffffff 0%,#d0d6e2 40%,#545b69 100%);filter:drop-shadow(0 0 4px rgba(220,230,255,0.7));";
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

  function explodeLightning(x, y) {
    const layer = host();
    try {
      ctx.sparks(x, y, 12);
    } catch {}
    try {
      ctx.sfx.shatter();
    } catch {}
    if (layer) {
      fxElectricSpark(layer, x, y, 14);
      fxRing(layer, x, y, 72, "#a0e8ff");
      fxRing(layer, x, y, 36, "#ffffff");
    }
    screenShake(0.28);
    const hit = hitTarget(x, y);
    if (hit) {
      try {
        ctx.damage(hit.node, x, y);
      } catch {}
      try {
        ctx.sparks(x, y, 6);
      } catch {}
    }
    const c = cursor();
    if (c && Math.hypot(c.x - x, c.y - y) < 30) {
      try {
        ctx.hitCursor(c.x, c.y);
      } catch {}
    }
  }

  function makeLightning(layer, sx, sy, tx, ty) {
    const dist = Math.max(1, Math.hypot(tx - sx, ty - sy));
    const ang = Math.atan2(ty - sy, tx - sx);
    const el = createElement("div", { className: "stk-weapon-shot" });
    el.style.cssText =
      "position:absolute;pointer-events:none;height:3px;width:" +
      dist.toFixed(1) +
      "px;background:linear-gradient(90deg,rgba(180,230,255,0) 0%,#c0e8ff 12%,#ffffff 50%,#c0e8ff 88%,rgba(180,230,255,0) 100%);clip-path:polygon(0 33%,8% 0,14% 60%,24% 15%,32% 70%,44% 10%,52% 65%,64% 5%,72% 60%,84% 20%,92% 55%,100% 33%,100% 67%,92% 45%,84% 80%,72% 40%,64% 95%,52% 35%,44% 90%,32% 30%,24% 85%,14% 40%,8% 100%,0 67%);box-shadow:0 0 8px 2px rgba(120,200,255,0.9);";
    layer.appendChild(el);
    el.style.left = sx.toFixed(1) + "px";
    el.style.top = sy.toFixed(1) + "px";
    el.style.transformOrigin = "0 50%";
    el.style.transform =
      "rotate(" + ((ang * 180) / Math.PI).toFixed(1) + "deg)";
    return {
      kind: "lightning",
      el,
      x: sx,
      y: sy,
      tx,
      ty,
      ang,
      life: LIGHTNING_LIFE,
      age: 0,
    };
  }

  function makeOrb(layer, sx, sy, tx, ty) {
    const el = createElement("div", { className: "stk-weapon-shot" });
    el.style.cssText =
      "position:absolute;pointer-events:none;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle,#ffffff 0%,#9060ff 35%,#4020aa 65%,rgba(40,0,120,0) 80%);box-shadow:0 0 14px 5px rgba(140,60,255,0.9);";
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
      "position:absolute;pointer-events:none;width:44px;height:7px;background:linear-gradient(90deg,rgba(0,0,0,0) 0%,#050102 20%,#ff1028 50%,#050102 80%,rgba(0,0,0,0) 100%);box-shadow:0 0 14px 4px rgba(255,10,30,0.9),0 0 2px 1px #fff;clip-path:polygon(0 50%,20% 0,80% 0,100% 50%,80% 100%,20% 100%);filter:drop-shadow(0 0 8px #ff0022);";
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

  function fire(kind, sx, sy, tx, ty) {
    const layer = host();
    if (!layer || shots.length >= MAX_SHOTS) return;
    let s = null;
    if (kind === "rocket") s = makeRocket(layer, sx, sy, tx, ty);
    else if (kind === "grenade") s = makeGrenade(layer, sx, sy, tx, ty);
    else if (kind === "knife") s = makeKnife(layer, sx, sy, tx, ty);
    else if (kind === "lightning") s = makeLightning(layer, sx, sy, tx, ty);
    else if (kind === "orb") s = makeOrb(layer, sx, sy, tx, ty);
    else if (kind === "cutter") s = makeRealityCutter(layer, sx, sy, tx, ty);
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

  function stepLightning(s, dt, dtSec) {
    s.life -= dtSec;
    try {
      s.el.style.opacity = (0.7 + Math.random() * 0.3).toFixed(2);
    } catch {}
    if (s.life <= 0) {
      explodeLightning(s.tx, s.ty);
      return "gone";
    }
    return null;
  }

  function stepOrb(s, dt, dtSec) {
    const layer = host();
    const c = cursor();
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
    const c2 = cursor();
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
    if (s.riftCd <= 0 && layer) {
      s.riftCd = 4.5;
      fxRealityRift(layer, s.x, s.y, s.ang);
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
            ctx.sparks(s.x, s.y, 8);
          } catch {}
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
    const c = cursor();
    if (c && Math.hypot(c.x - s.x, c.y - s.y) < 28) {
      try {
        ctx.hitCursor(c.x, c.y);
        ctx.sparks(s.x, s.y, 10);
      } catch {}
      return s.isX ? "xBoom" : "gone";
    }
    const hit = hitTarget(s.x, s.y);
    if (hit) {
      try {
        ctx.damage(hit.node, s.x, s.y);
        ctx.sparks(s.x, s.y, 10);
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
          explode(x, y, BLAST_RADIUS, s.kind === "rocket" ? 1 : 0.8);
        } catch {}
      } else if (
        verdict === "xBoom" ||
        (verdict === "gone" && isX && Math.random() < 0.5)
      ) {
        const layer = host();
        try {
          ctx.sparks(x, y, 22);
          ctx.sfx.shatter();
        } catch {}
        if (layer) {
          fxRealityRift(layer, x, y, Math.PI / 4);
          fxRealityRift(layer, x, y, -Math.PI / 4);
          fxRing(layer, x, y, 140, "#ff1028");
          fxRing(layer, x, y, 70, "#000000");
          fxFireball(layer, x, y, 48);
        }
        screenShake(0.5);
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
          ctx.sparks(x, y, 14);
        } catch {}
        try {
          ctx.sfx.shatter();
        } catch {}
        if (layer) fxEnergyBurst(layer, x, y, "#9060ff", ORB_RADIUS);
        screenShake(0.3);
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
