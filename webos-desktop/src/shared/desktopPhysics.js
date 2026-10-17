import { os, StorageKeys } from "../framework.js";
import {
  spawnStickman,
  despawnStickman,
  onPhysicsHit,
} from "./stickman/stickmanChaos.js";

const GRAVITY = 0.6;
const MAX_SPIN = 5;
const SLEEP_FRAMES = 20;
const BOUNCE_MIN_SPEED = 3;
const WAKE_SPEED = 4;

let active = false;
let frameId = null;
let bodies = [];
let lastTime = 0;
let lastKickAt = 0;
const originalPositions = new Map();

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function getBounds() {
  const bounds = {
    left: 0,
    top: 0,
    right: window.innerWidth,
    bottom: window.innerHeight,
  };
  try {
    const bar = document.getElementById("taskbar");
    if (!bar || !isVisible(bar)) return bounds;
    const rect = bar.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return bounds;
    if (rect.height <= rect.width) {
      if (rect.top < window.innerHeight / 2)
        bounds.top = Math.max(0, rect.bottom);
      else bounds.bottom = Math.min(window.innerHeight, rect.top);
    } else {
      if (rect.left < window.innerWidth / 2)
        bounds.left = Math.max(0, rect.right);
      else bounds.right = Math.min(window.innerWidth, rect.left);
    }
  } catch {}
  return bounds;
}

function isVisible(el) {
  try {
    if (el.getClientRects().length === 0) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  } catch {
    return false;
  }
}

function collectElements() {
  const list = [];
  const seen = new Set();
  const addElement = (el, isIcon) => {
    if (!el || seen.has(el)) return;
    try {
      if (!isVisible(el)) return;
      if (!isIcon && el.offsetWidth > window.innerWidth * 0.9) return;
      seen.add(el);
      list.push({ el, type: isIcon ? "icon" : "window" });
    } catch {}
  };
  try {
    const icons = document.querySelectorAll("#desktop > .icon");
    icons.forEach((el) => {
      addElement(el, true);
    });
  } catch {}
  try {
    const open = os.window.getOpenWindows();
    for (const id of open.keys()) {
      try {
        const el = document.getElementById(id);
        if (!el) continue;
        addElement(el, false);
      } catch {}
    }
  } catch {}
  try {
    const windows = document.querySelectorAll(".window");
    windows.forEach((el) => {
      addElement(el, false);
    });
  } catch {}
  return list;
}

function wake(body) {
  body.settled = false;
  body.sleepFrames = 0;
}

function getInvMass(body) {
  if (body.held || body.settled) return 0;
  if (body.type === "icon") return 1;
  const area = (body.w || 300) * (body.h || 200);
  return 1 / (3 + area / 20000);
}

function getCollider(body) {
  const w = body.el.offsetWidth || body.w;
  const h = body.el.offsetHeight || body.h;
  if (body.type === "icon") {
    const cw = Math.max(24, w * 0.62);
    const ch = Math.max(24, h * 0.78);
    return { x: body.x + (w - cw) / 2, y: body.y + (h - ch) / 2, w: cw, h: ch };
  }
  const cw = Math.max(40, w - 8);
  const ch = Math.max(24, h - 8);
  return { x: body.x + (w - cw) / 2, y: body.y + (h - ch) / 2, w: cw, h: ch };
}

function addCollisionSpin(body, impulse) {
  if (body.held || body.settled || impulse < 2) return;
  body.spin = clamp(
    body.spin + (Math.random() * 2 - 1) * Math.min(1.5, impulse * 0.08),
    -MAX_SPIN,
    MAX_SPIN,
  );
}

function resolveAxis(a, b, invA, invB, overlap, axis, dir) {
  const totalInv = invA + invB;
  a[axis] += dir * overlap * (invA / totalInv);
  b[axis] -= dir * overlap * (invB / totalInv);
  const vKey = axis === "x" ? "vx" : "vy";
  const vn = (a[vKey] - b[vKey]) * dir;
  if (vn >= 0) return;
  const approach = -vn;
  const rest = approach < 1.5 ? 0 : Math.min(a.rest, b.rest);
  const impulseMag = (-(1 + rest) * vn) / totalInv;
  a[vKey] += impulseMag * invA * dir;
  b[vKey] -= impulseMag * invB * dir;
  if (axis === "y") {
    const lateral = (a.vx - b.vx) * 0.1;
    a.vx -= (lateral * invA) / totalInv;
    b.vx += (lateral * invB) / totalInv;
  }
  addCollisionSpin(a, impulseMag);
  addCollisionSpin(b, impulseMag);
  if (approach > WAKE_SPEED) {
    if (a.settled) wake(a);
    if (b.settled) wake(b);
  }
}

function resolveCollisions() {
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    for (let j = i + 1; j < bodies.length; j++) {
      try {
        const b = bodies[j];
        if (a.settled && b.settled) continue;
        const ca = getCollider(a);
        const cb = getCollider(b);
        if (
          ca.x + ca.w <= cb.x ||
          ca.x >= cb.x + cb.w ||
          ca.y + ca.h <= cb.y ||
          ca.y >= cb.y + cb.h
        )
          continue;
        if (a.held && b.settled) wake(b);
        if (b.held && a.settled) wake(a);
        const invA = getInvMass(a);
        const invB = getInvMass(b);
        if (invA + invB === 0) continue;
        const overlapX = Math.min(ca.x + ca.w - cb.x, cb.x + cb.w - ca.x);
        const overlapY = Math.min(ca.y + ca.h - cb.y, cb.y + cb.h - ca.y);
        if (overlapX < overlapY) {
          const dir = ca.x + ca.w / 2 < cb.x + cb.w / 2 ? -1 : 1;
          resolveAxis(a, b, invA, invB, overlapX, "x", dir);
        } else {
          const dir = ca.y + ca.h / 2 < cb.y + cb.h / 2 ? -1 : 1;
          resolveAxis(a, b, invA, invB, overlapY, "y", dir);
        }
      } catch {}
    }
  }
}

function applyTransform(body) {
  body.el.style.left = body.x + "px";
  body.el.style.top = body.y + "px";
  body.el.style.transform = "rotate(" + body.angle.toFixed(1) + "deg)";
}

function step(now) {
  try {
    if (!lastTime) lastTime = now;
    const dt = Math.min(Math.max((now - lastTime) / 16.667, 0.5), 2);
    lastTime = now;
    const kick = now - lastKickAt >= 2000;
    if (kick) lastKickAt = now;
    const bounds = getBounds();
    const airDrag = Math.pow(0.985, dt);
    const groundDrag = Math.pow(0.82, dt);
    const groundSpinDrag = Math.pow(0.7, dt);
    const calmSpinDrag = Math.pow(0.8, dt);
    for (const body of bodies) {
      try {
        if (body.held) {
          body.sleepFrames = 0;
          continue;
        }
        if (body.settled) continue;
        body.vy += GRAVITY * dt;
        body.x += body.vx * dt;
        body.y += body.vy * dt;
        body.angle += body.spin * dt;
        body.spin = clamp(body.spin * airDrag, -MAX_SPIN, MAX_SPIN);
        const w = body.el.offsetWidth || body.w;
        const h = body.el.offsetHeight || body.h;
        const floor = bounds.bottom;
        if (body.y + h >= floor) {
          const impact = body.vy;
          body.y = floor - h;
          if (impact > BOUNCE_MIN_SPEED) {
            body.vy = -impact * body.rest;
            if (Math.abs(body.vy) < 1.5) body.vy = 0;
            body.spin = clamp(
              body.spin +
                (Math.random() * 2 - 1) * Math.min(1.5, impact * 0.08),
              -MAX_SPIN,
              MAX_SPIN,
            );
          } else {
            body.vy = 0;
          }
          body.vx *= groundDrag;
          if (Math.abs(body.vx) < 0.05) body.vx = 0;
          body.spin *= groundSpinDrag;
        }
        if (body.x < bounds.left) {
          body.x = bounds.left;
          body.vx *= -body.rest;
          body.spin *= -0.5;
        } else if (body.x + w > bounds.right) {
          body.x = bounds.right - w;
          body.vx *= -body.rest;
          body.spin *= -0.5;
        }
        if (body.y < bounds.top) {
          body.y = bounds.top;
          body.vy *= -body.rest;
        }
        if (Math.abs(body.vx) < 1.5 && Math.abs(body.vy) < 1.5) {
          body.angle += -body.angle * Math.min(1, 0.15 * dt);
          body.spin *= calmSpinDrag;
        }
        applyTransform(body);
      } catch {}
    }
    resolveCollisions();
    for (const body of bodies) {
      try {
        if (body.held) continue;
        if (body.settled) continue;
        const w = body.el.offsetWidth || body.w;
        const h = body.el.offsetHeight || body.h;
        if (body.x < bounds.left) {
          body.x = bounds.left;
          if (body.vx < 0) body.vx *= -body.rest;
        } else if (body.x + w > bounds.right) {
          body.x = bounds.right - w;
          if (body.vx > 0) body.vx *= -body.rest;
        }
        if (body.y < bounds.top) {
          body.y = bounds.top;
          if (body.vy < 0) body.vy *= -body.rest;
        }
        const floor = bounds.bottom;
        if (body.y + h > floor) {
          body.y = floor - h;
          if (body.vy > 0) body.vy = 0;
        }
        const calm =
          Math.hypot(body.vx, body.vy) < 1 &&
          Math.abs(body.spin) < 0.3 &&
          Math.abs(body.angle) < 1;
        if (calm) {
          body.sleepFrames += 1;
          if (body.sleepFrames >= SLEEP_FRAMES) {
            if (body.kicks > 0) {
              if (kick) {
                body.kicks -= 1;
                body.vy = -(2.5 + Math.random() * 2.5);
                body.vx = Math.random() * 4 - 2;
                body.spin = Math.random() * 2 - 1;
                body.sleepFrames = 0;
              }
            } else {
              body.vx = 0;
              body.vy = 0;
              body.spin = 0;
              body.angle = 0;
              body.settled = true;
            }
          }
        } else {
          body.sleepFrames = 0;
        }
        applyTransform(body);
      } catch {}
    }
  } catch {}
  if (active) frameId = requestAnimationFrame(step);
}

export function isPhysicsChaosActive() {
  return active;
}

export function startPhysicsChaos(opts) {
  if (active) return;
  try {
    const elements = collectElements();
    bodies = [];
    originalPositions.clear();
    for (const entry of elements) {
      try {
        const el = entry.el;
        originalPositions.set(el, {
          left: el.style.left,
          top: el.style.top,
          transform: el.style.transform,
        });
        let x = parseFloat(el.style.left);
        let y = parseFloat(el.style.top);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          if (el.offsetParent !== null) {
            x = el.offsetLeft;
            y = el.offsetTop;
          } else {
            const rect = el.getBoundingClientRect();
            x = rect.left;
            y = rect.top;
          }
        }
        const isWin = entry.type === "window";
        bodies.push({
          el,
          x,
          y,
          vx: 0,
          vy: 0,
          angle: 0,
          spin: 0,
          rest: isWin
            ? 0.35 + Math.random() * 0.15
            : 0.5 + Math.random() * 0.15,
          w: el.offsetWidth,
          h: el.offsetHeight,
          type: entry.type,
          sleepFrames: 0,
          settled: true,
          held: false,
          dragDX: 0,
          dragDY: 0,
          kicks: isWin ? 1 : 0,
        });
      } catch {}
    }
    if (bodies.length === 0) return;
    active = true;
    lastTime = 0;
    lastKickAt = performance.now();
    frameId = requestAnimationFrame(step);
    try {
      spawnStickman(opts);
    } catch {}
    try {
      if (!os.storage.get(StorageKeys.stickmanCageTipSeen)) {
        os.notify.send(
          "Red is loose",
          "Drag a box on the desktop to trap Red inside a jail cage.",
          { type: "info", appSource: "Chaos" },
        );
        os.storage.set(StorageKeys.stickmanCageTipSeen, "true");
      }
    } catch {}
    try {
      onPhysicsHit(hitPhysicsBody);
    } catch {}
  } catch {}
}

export function stopPhysicsChaos() {
  if (!active && frameId === null) return;
  try {
    active = false;
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
    for (const [el, pos] of originalPositions) {
      try {
        el.style.left = pos.left;
        el.style.top = pos.top;
        el.style.transform = pos.transform;
      } catch {}
    }
  } catch {}
  try {
    despawnStickman();
  } catch {}
  try {
    onPhysicsHit(null);
  } catch {}
  originalPositions.clear();
  bodies = [];
}

export function togglePhysicsChaos(opts) {
  if (active) stopPhysicsChaos();
  else startPhysicsChaos(opts);
  return active;
}

export function grabPhysicsBody(el) {
  try {
    const body = bodies.find((b) => b.el === el);
    if (!body) return;
    body.held = true;
    wake(body);
    body.vx = 0;
    body.vy = 0;
    body.spin = 0;
  } catch {}
}

export function hitPhysicsBody(el, hx, hy) {
  try {
    if (!active) return;
    const body = bodies.find((b) => b.el === el);
    if (!body) return;
    wake(body);
    const cx = body.x + (body.w || 100) / 2;
    const cy = body.y + (body.h || 100) / 2;
    let dx = cx - hx;
    let dy = cy - hy;
    if (typeof hx !== "number" || typeof hy !== "number") {
      dx = Math.random() * 2 - 1;
      dy = -1;
    }
    const m = Math.max(4, Math.sqrt(dx * dx + dy * dy));
    const punch = body.type === "icon" ? 7 : 4;
    body.vx += (dx / m) * punch + (Math.random() * 2 - 1);
    body.vy += (dy / m) * punch - 2.5;
    body.spin = clamp((Math.random() * 2 - 1) * 2, -MAX_SPIN, MAX_SPIN);
    body.sleepFrames = 0;
  } catch {}
}

export function notePhysicsDrag(el) {
  try {
    const body = bodies.find((b) => b.el === el);
    if (!body) return;
    body.held = true;
    wake(body);
    const x = parseFloat(el.style.left);
    const y = parseFloat(el.style.top);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    body.dragDX = x - body.x;
    body.dragDY = y - body.y;
    body.x = x;
    body.y = y;
  } catch {}
}

export function releasePhysicsBody(el) {
  try {
    const body = bodies.find((b) => b.el === el);
    if (!body) return;
    body.held = false;
    const limit = (v) => Math.max(-15, Math.min(15, v * 3));
    body.vx = limit(body.dragDX || 0);
    body.vy = limit(body.dragDY || 0);
    body.spin = clamp(body.vx * 0.1, -MAX_SPIN, MAX_SPIN);
    body.dragDX = 0;
    body.dragDY = 0;
    wake(body);
  } catch {}
}
