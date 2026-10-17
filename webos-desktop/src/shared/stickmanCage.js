import { createElement } from "../framework.js";
import { playShatter, playGrab, playHit } from "./chaosSfx.js";

export const CAGE_MIN_W = 64;
export const CAGE_MIN_H = 96;
export const CAGE_GRAVITY = 0.5;
export const BREAK_VY = 17;

let cage = null;
let breakCb = null;
let offX = 0;
let offY = 0;
let samples = [];
let moveHandler = null;
let upHandler = null;

function floorTop() {
  try {
    const bar = document.getElementById("taskbar");
    if (!bar) return window.innerHeight;
    const rect = bar.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return window.innerHeight;
    return Math.max(0, window.innerHeight - rect.height);
  } catch {
    return window.innerHeight;
  }
}

export function isCaged() {
  return !!cage;
}

export function getCageRect() {
  try {
    if (!cage) return null;
    return { left: cage.x, top: cage.y, width: cage.w, height: cage.h };
  } catch {
    return null;
  }
}

export function onCageBreak(cb) {
  try {
    breakCb = cb;
  } catch {}
}

export function captureCage(rect) {
  try {
    if (cage) return false;
  } catch {
    return false;
  }
  let w = 0;
  let h = 0;
  let x = 0;
  let y = 0;
  try {
    w = Math.max(rect.width, CAGE_MIN_W);
  } catch {
    return false;
  }
  try {
    h = Math.max(rect.height, CAGE_MIN_H);
  } catch {
    return false;
  }
  try {
    x = rect.left + (rect.width - w) / 2;
  } catch {
    return false;
  }
  try {
    y = rect.top + (rect.height - h) / 2;
  } catch {
    return false;
  }
  try {
    const maxX = Math.max(0, window.innerWidth - w);
    x = Math.min(Math.max(x, 0), maxX);
  } catch {}
  try {
    const maxY = Math.max(0, window.innerHeight - h);
    y = Math.min(Math.max(y, 0), maxY);
  } catch {}
  let node = null;
  let front = null;
  try {
    node = createElement("div", { className: "stk-cage" });
  } catch {
    return false;
  }
  try {
    if (!node) return false;
  } catch {
    return false;
  }
  try {
    node.style.left = x + "px";
  } catch {}
  try {
    node.style.top = y + "px";
  } catch {}
  try {
    node.style.width = w + "px";
  } catch {}
  try {
    node.style.height = h + "px";
  } catch {}
  try {
    if (document.body) document.body.appendChild(node);
  } catch {
    return false;
  }
  try {
    node.addEventListener("pointerdown", onCageDown);
  } catch {}
  try {
    front = createElement("div", { className: "stk-cage-front" });
  } catch {
    front = null;
  }
  try {
    if (front) {
      front.style.left = x + "px";
      front.style.top = y + "px";
      front.style.width = w + "px";
      front.style.height = h + "px";
    }
  } catch {}
  try {
    if (front && document.body) document.body.appendChild(front);
  } catch {}
  try {
    playHit();
  } catch {}
  try {
    cage = { node, front, x, y, w, h, vx: 0, vy: 0, held: false };
  } catch {
    return false;
  }
  return true;
}

export function updateCage(dt) {
  try {
    if (!cage || cage.held) return;
  } catch {
    return;
  }
  let step = 1;
  try {
    step = Math.min(Math.max(dt || 1, 0.2), 3);
  } catch {}
  try {
    cage.vy += CAGE_GRAVITY * step;
  } catch {}
  try {
    cage.x += cage.vx * step;
  } catch {}
  try {
    cage.y += cage.vy * step;
  } catch {}
  try {
    const right = window.innerWidth;
    if (cage.x <= 0) {
      cage.x = 0;
      cage.vx = Math.abs(cage.vx) * 0.6;
    } else if (cage.x + cage.w >= right) {
      cage.x = right - cage.w;
      cage.vx = -Math.abs(cage.vx) * 0.6;
    }
    if (Math.abs(cage.vx) < 0.3) cage.vx = 0;
  } catch {}
  try {
    const floor = floorTop();
    if (cage.y + cage.h >= floor) {
      if (cage.vy > BREAK_VY) {
        try {
          breakCage();
        } catch {}
        return;
      }
      cage.y = floor - cage.h;
      cage.vy = cage.vy * -0.35;
      cage.vx = cage.vx * 0.7;
      if (Math.abs(cage.vy) < 1 && Math.abs(cage.vx) < 0.8) {
        cage.vx = 0;
        cage.vy = 0;
      }
    }
  } catch {}
  try {
    cage.node.style.left = cage.x + "px";
  } catch {}
  try {
    cage.node.style.top = cage.y + "px";
  } catch {}
  try {
    if (cage.front) {
      cage.front.style.left = cage.x + "px";
      cage.front.style.top = cage.y + "px";
    }
  } catch {}
}

export function cleanupCage() {
  try {
    if (moveHandler) {
      try {
        window.removeEventListener("pointermove", moveHandler);
      } catch {}
    }
  } catch {}
  try {
    if (upHandler) {
      try {
        window.removeEventListener("pointerup", upHandler);
      } catch {}
    }
  } catch {}
  try {
    moveHandler = null;
  } catch {}
  try {
    upHandler = null;
  } catch {}
  try {
    if (cage && cage.node) cage.node.remove();
  } catch {}
  try {
    if (cage && cage.front) cage.front.remove();
  } catch {}
  try {
    cage = null;
  } catch {}
}

export function nudgeCage(dx) {
  try {
    if (!cage || cage.held) return;
  } catch {
    return;
  }
  try {
    const maxX = Math.max(0, window.innerWidth - cage.w);
    cage.x = Math.min(Math.max(cage.x + dx, 0), maxX);
  } catch {}
  try {
    cage.node.style.left = cage.x + "px";
  } catch {}
  try {
    if (cage.front) cage.front.style.left = cage.x + "px";
  } catch {}
}

function breakCage() {
  let stash = null;
  try {
    if (!cage) return;
  } catch {
    return;
  }
  try {
    stash = {
      x: cage.x,
      y: cage.y,
      w: cage.w,
      h: cage.h,
      vx: cage.vx,
      vy: cage.vy,
    };
  } catch {}
  try {
    if (moveHandler) {
      try {
        window.removeEventListener("pointermove", moveHandler);
      } catch {}
    }
  } catch {}
  try {
    if (upHandler) {
      try {
        window.removeEventListener("pointerup", upHandler);
      } catch {}
    }
  } catch {}
  try {
    moveHandler = null;
  } catch {}
  try {
    upHandler = null;
  } catch {}
  try {
    if (cage.node) cage.node.remove();
  } catch {}
  try {
    if (cage.front) cage.front.remove();
  } catch {}
  try {
    cage = null;
  } catch {}
  try {
    playShatter();
  } catch {}
  try {
    if (breakCb) breakCb(stash);
  } catch {}
}

function onCageDown(e) {
  try {
    if (!cage) return;
  } catch {
    return;
  }
  try {
    cage.held = true;
  } catch {}
  try {
    cage.vx = 0;
  } catch {}
  try {
    cage.vy = 0;
  } catch {}
  try {
    offX = cage.x - e.clientX;
  } catch {}
  try {
    offY = cage.y - e.clientY;
  } catch {}
  try {
    samples = [{ x: e.clientX, y: e.clientY, t: Date.now() }];
  } catch {}
  try {
    playGrab();
  } catch {}
  try {
    if (moveHandler) {
      try {
        window.removeEventListener("pointermove", moveHandler);
      } catch {}
    }
  } catch {}
  try {
    if (upHandler) {
      try {
        window.removeEventListener("pointerup", upHandler);
      } catch {}
    }
  } catch {}
  try {
    moveHandler = onCageMove;
  } catch {}
  try {
    upHandler = onCageUp;
  } catch {}
  try {
    window.addEventListener("pointermove", moveHandler);
  } catch {}
  try {
    window.addEventListener("pointerup", upHandler);
  } catch {}
}

function onCageMove(e) {
  try {
    if (!cage) return;
  } catch {
    return;
  }
  let px = 0;
  let py = 0;
  try {
    px = e.clientX;
  } catch {
    return;
  }
  try {
    py = e.clientY;
  } catch {
    return;
  }
  try {
    let nx = px + offX;
    let ny = py + offY;
    const maxX = Math.max(0, window.innerWidth - cage.w);
    const maxY = Math.max(0, window.innerHeight - cage.h);
    nx = Math.min(Math.max(nx, 0), maxX);
    ny = Math.min(Math.max(ny, 0), maxY);
    cage.x = nx;
    cage.y = ny;
  } catch {}
  try {
    cage.vx = 0;
  } catch {}
  try {
    cage.vy = 0;
  } catch {}
  try {
    let now = 0;
    try {
      now = Date.now();
    } catch {
      now = samples.length;
    }
    samples.push({ x: px, y: py, t: now });
    while (samples.length > 8) {
      try {
        samples.shift();
      } catch {
        break;
      }
    }
  } catch {}
  try {
    cage.node.style.left = cage.x + "px";
  } catch {}
  try {
    cage.node.style.top = cage.y + "px";
  } catch {}
  try {
    if (cage.front) {
      cage.front.style.left = cage.x + "px";
      cage.front.style.top = cage.y + "px";
    }
  } catch {}
}

function onCageUp(e) {
  try {
    if (!cage) return;
  } catch {
    return;
  }
  let vx = 0;
  let vy = 0;
  try {
    if (samples.length >= 2) {
      let first = samples[0];
      let last = samples[samples.length - 1];
      try {
        const cutoff = last.t - 120;
        for (let i = 0; i < samples.length; i++) {
          try {
            if (samples[i].t >= cutoff) {
              first = samples[i];
              break;
            }
          } catch {}
        }
      } catch {}
      let dx = 0;
      let dy = 0;
      let dtm = 0;
      try {
        dx = last.x - first.x;
      } catch {}
      try {
        dy = last.y - first.y;
      } catch {}
      try {
        dtm = last.t - first.t;
      } catch {}
      if (dtm > 0) {
        try {
          vx = (dx / dtm) * 16.667;
        } catch {}
        try {
          vy = (dy / dtm) * 16.667;
        } catch {}
      }
    }
  } catch {}
  try {
    if (vx > 20) vx = 20;
  } catch {}
  try {
    if (vx < -20) vx = -20;
  } catch {}
  try {
    if (vy > 20) vy = 20;
  } catch {}
  try {
    if (vy < -20) vy = -20;
  } catch {}
  try {
    cage.vx = vx;
  } catch {}
  try {
    cage.vy = vy;
  } catch {}
  try {
    cage.held = false;
  } catch {}
  try {
    if (moveHandler) {
      try {
        window.removeEventListener("pointermove", moveHandler);
      } catch {}
    }
  } catch {}
  try {
    if (upHandler) {
      try {
        window.removeEventListener("pointerup", upHandler);
      } catch {}
    }
  } catch {}
  try {
    moveHandler = null;
  } catch {}
  try {
    upHandler = null;
  } catch {}
  try {
    samples = [];
  } catch {}
}
