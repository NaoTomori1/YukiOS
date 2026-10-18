import { fxRing, fxDust, screenShake } from "./stickmanFx.js";

const SPEAR_SPEED = 15;
const SPEAR_LEN = 110;
const SPEAR_TAIL = 36;
const CURSOR_HIT_R = 22;
const EMBED_DEPTH = 16;
const STUCK_LIFE_MS = 9000;
const TRAP_ARM_MS = 620;
const TRAP_RADIUS = 30;
const TRAP_LIFE_MS = 7000;
const SPEAR_HURT_CD = 30;
const GRASP_RANGE = 58;
const MAX_SPEARS = 5;

function el(tag, attrs) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  if (attrs) for (const k in attrs) node.setAttribute(k, attrs[k]);
  return node;
}

function makeRoot() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "stk-svg-root");
  svg.style.cssText =
    "position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none;";
  return svg;
}

export function createSpearSystem(ctx) {
  const fn = (n) => (ctx && typeof ctx[n] === "function" ? ctx[n] : null);
  const getLayer = fn("getLayer");
  const getTargets = fn("getTargets");
  const getCursor = fn("getCursor");
  const cursorDead = fn("cursorDead");
  const damage = fn("damage");
  const hitCursor = fn("hitCursor");
  const hitStickman = fn("hitStickman");
  const pinCursor = fn("pinCursor");
  const sparks = fn("sparks");
  const push = fn("push");
  const rectOf = fn("rectOf");

  let spears = [];
  let root = null;

  function layer() {
    try {
      return getLayer ? getLayer() : null;
    } catch {
      return null;
    }
  }

  function cursor() {
    try {
      const c = getCursor ? getCursor() : null;
      if (c && c.seen && !(cursorDead && cursorDead())) return c;
    } catch {}
    return null;
  }

  function ensureRoot() {
    try {
      if (root && root.isConnected) return root;
      const lay = layer();
      if (!lay) return null;
      root = makeRoot();
      lay.appendChild(root);
      return root;
    } catch {
      return null;
    }
  }

  function buildNode() {
    const g = el("g", { class: "stk-spear" });

    const aura = el("path", {
      class: "stk-spear-aura",
      fill: "none",
      d: "M" + -SPEAR_TAIL + " 0L" + SPEAR_LEN + " 0",
    });

    const shaft = el("path", {
      class: "stk-spear-shaft",
      fill: "none",
      d: "M" + -SPEAR_TAIL + " 0L0 0",
    });
    const blade = el("path", {
      class: "stk-spear-blade",
      fill: "none",
      d: "M0 0L" + SPEAR_LEN + " 0",
    });
    const core = el("path", {
      class: "stk-spear-core",
      fill: "none",
      d: "M" + (-SPEAR_TAIL + 4) + " 0L" + SPEAR_LEN + " 0",
    });

    const tl = SPEAR_LEN;
    const tip = el("path", {
      class: "stk-spear-tip",
      fill: "none",
      d:
        "M" +
        tl +
        " 0" +
        "L" +
        (tl + 28) +
        " 0" +
        "M" +
        tl +
        " 0" +
        "L" +
        (tl + 14) +
        " -6" +
        "L" +
        (tl + 28) +
        " 0" +
        "M" +
        tl +
        " 0" +
        "L" +
        (tl + 14) +
        " 6" +
        "L" +
        (tl + 28) +
        " 0" +
        "M" +
        (tl - 8) +
        " -3" +
        "L" +
        tl +
        " 0" +
        "L" +
        (tl - 8) +
        " 3",
    });

    const guard = el("path", {
      class: "stk-spear-guard",
      fill: "none",
      d: "M-4 -11L-4 11" + "M-8 -7L0 7" + "M-8 7L0 -7",
    });

    g.appendChild(aura);
    g.appendChild(shaft);
    g.appendChild(blade);
    g.appendChild(core);
    g.appendChild(tip);
    g.appendChild(guard);
    return { group: g, guard, blade };
  }

  function place(s) {
    try {
      s.group.setAttribute(
        "transform",
        "translate(" +
          s.x.toFixed(1) +
          "," +
          s.y.toFixed(1) +
          ") rotate(" +
          ((s.ang * 180) / Math.PI).toFixed(1) +
          ")",
      );
    } catch {}
  }

  function embed(s, trap) {
    s.state = trap ? "trap" : "stuck";
    s.armAt = performance.now() + TRAP_ARM_MS;
    s.until = performance.now() + (trap ? TRAP_LIFE_MS : STUCK_LIFE_MS);
    const lay = layer();
    if (lay) {
      s.group.classList.add(trap ? "stk-spear-trap" : "stk-spear-stuck");
      if (trap) {
        fxRing(lay, s.x, s.y, 44, "#c23a00");
        fxDust(lay, s.x, s.y, 0.5);
      } else {
        fxRing(lay, s.x, s.y, 28, "#7ad4ff");
      }
    }
    place(s);
  }

  function throwSpear(sx, sy, tx, ty, ownerPlayer) {
    const host = ensureRoot();
    if (!host) return null;
    const built = buildNode();
    host.appendChild(built.group);
    const s = {
      el: built.group,
      group: built.group,
      state: "fly",
      x: sx,
      y: sy,
      ang: Math.atan2(ty - sy, tx - sx),
      ownerPlayer: ownerPlayer === true,
      hurtCd: 0,
      age: 0,
      armed: false,
    };
    place(s);
    if (sparks) {
      try {
        sparks(sx, sy, 5);
      } catch {}
    }
    screenShake(0.14);
    spears.push(s);
    while (spears.length > MAX_SPEARS) drop(spears[0]);
    return s;
  }

  function drop(s) {
    try {
      if (s.group) s.group.remove();
    } catch {}
    const i = spears.indexOf(s);
    if (i !== -1) spears.splice(i, 1);
  }

  function embedPoint(x, y) {
    let list = [];
    try {
      list = getTargets ? getTargets() || [] : [];
    } catch {
      list = [];
    }
    for (let i = 0; i < list.length; i++) {
      const r = rectOf ? rectOf(list[i]) : null;
      if (!r) continue;
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return r;
      }
    }
    return null;
  }

  function update(now, dt, dtSec) {
    for (let i = spears.length - 1; i >= 0; i--) {
      const s = spears[i];
      if (s.state === "fly") {
        s.x += Math.cos(s.ang) * SPEAR_SPEED * dt;
        s.y += Math.sin(s.ang) * SPEAR_SPEED * dt;
        s.age += dtSec;
        place(s);
        s.hurtCd -= dt;
        if (s.hurtCd <= 0 && hitStickman) {
          try {
            if (hitStickman(s.x, s.y, s.ownerPlayer)) s.hurtCd = SPEAR_HURT_CD;
          } catch {}
        }
        const c = s.ownerPlayer ? cursor() : null;
        if (c && Math.hypot(c.x - s.x, c.y - s.y) < CURSOR_HIT_R) {
          if (pinCursor) {
            try {
              pinCursor(c.x, c.y, 2600);
            } catch {}
          }
          if (hitCursor) {
            try {
              hitCursor(c.x, c.y);
            } catch {}
          }
          const lay = layer();
          if (lay) {
            fxRing(lay, s.x, s.y, 56, "#ff1028");
            fxDust(lay, s.x, s.y, 0.6);
          }
          screenShake(0.4);
          embed(s, false);
          continue;
        }
        if (
          s.age > 2.4 ||
          s.x < -80 ||
          s.x > window.innerWidth + 80 ||
          s.y < -80 ||
          s.y > window.innerHeight + 80
        ) {
          drop(s);
          continue;
        }
        const rect = s.age > 0.12 ? embedPoint(s.x, s.y) : null;
        if (rect) {
          if (sparks) {
            try {
              sparks(s.x, s.y, 6);
            } catch {}
          }
          embed(s, true);
          continue;
        }
        if (s.y >= (ctx.getFloor ? ctx.getFloor() : window.innerHeight)) {
          embed(s, true);
        }
        continue;
      }
      if (now >= s.until) {
        drop(s);
        continue;
      }
      if (s.state === "trap" && !s.armed && now >= s.armAt) {
        s.armed = true;
        const lay = layer();
        if (lay) fxRing(lay, s.x, s.y, TRAP_RADIUS, "#ff5a1f");
      }
      if (s.armed) {
        const c = cursor();
        if (c && Math.hypot(c.x - s.x, c.y - s.y) < TRAP_RADIUS) {
          if (hitCursor) {
            try {
              hitCursor(c.x, c.y);
            } catch {}
          }
          if (push) {
            try {
              push(s.x, s.y, 70, 5);
            } catch {}
          }
          const lay = layer();
          if (lay) {
            fxRing(lay, s.x, s.y, 72, "#ff1028");
            fxDust(lay, s.x, s.y, 0.8);
          }
          screenShake(0.45);
          s.armed = false;
          s.until = now + 900;
          s.state = "stuck";
          try {
            s.group.classList.remove("stk-spear-trap");
            s.group.classList.add("stk-spear-stuck");
          } catch {}
        }
      }
    }
  }

  function nearestGraspable(x, y) {
    let best = null;
    let bestD = GRASP_RANGE;
    for (let i = 0; i < spears.length; i++) {
      const s = spears[i];
      if (s.state !== "stuck" && s.state !== "trap") continue;
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  function vaultFrom(s, now) {
    if (!s) return null;
    const ang = s.ang;
    drop(s);
    const lay = layer();
    if (lay) {
      fxRing(lay, s.x, s.y, 48, "#7ad4ff");
      fxDust(lay, s.x, s.y, 0.6);
    }
    screenShake(0.3);
    return { x: s.x, y: s.y, ang: ang };
  }

  function clear() {
    for (let i = spears.length - 1; i >= 0; i--) drop(spears[i]);
    spears = [];
    try {
      if (root) root.remove();
    } catch {}
    root = null;
  }

  return {
    throwSpear,
    update,
    nearestGraspable,
    vaultFrom,
    clear,
    count: () => spears.length,
    EMBED_DEPTH: EMBED_DEPTH,
  };
}

export const SPEAR_TRAP_RADIUS = TRAP_RADIUS;
export const SPEAR_TRAP_ARM_MS = TRAP_ARM_MS;
export const SPEAR_GRASP_RANGE = GRASP_RANGE;
