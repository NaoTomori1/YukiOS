import {
  $,
  bindEvent,
  createElement,
  setText,
  toggleClass,
} from "../../framework.js";
import { PLAYER_WEAPONS } from "./stickmanPlayerAmmo.js";

const KEY_MAP = {
  KeyA: "left",
  KeyD: "right",
  KeyW: "jump",
  KeyS: "down",
  Space: "thrust",
  ShiftLeft: "sprint",
  ShiftRight: "sprint",
  KeyR: "reload",
  KeyX: "cycle",
  KeyQ: "jet",
  KeyF: "slam",
  KeyC: "dodge",
  KeyV: "combo",
  KeyE: "tussle",
  KeyG: "foe",
  Escape: "pause",
};

const SLOT_KEYS = {
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Digit4: 3,
  Digit5: 4,
  Digit6: 5,
  Digit7: 6,
  Digit8: 7,
  Digit9: 8,
};

const EDITABLE = /^(INPUT|TEXTAREA|SELECT)$/;

function isEditable(node) {
  try {
    if (!node || !node.tagName) return false;
    return EDITABLE.test(node.tagName) || !!node.isContentEditable;
  } catch {
    return false;
  }
}

export function createPlayerInput() {
  const held = new Set();
  const queue = [];
  let attached = false;
  let armed = false;
  let paused = false;
  let attackDown = false;
  let aimX = -9999;
  let aimY = -9999;
  let aimSeen = false;
  let attackHeldAt = 0;
  let lastMoveAt = 0;
  let onPauseChange = null;

  function push(action) {
    if (queue.length > 24) queue.shift();
    queue.push(action);
  }

  function releaseAll() {
    held.clear();
    attackDown = false;
    attackHeldAt = 0;
    queue.length = 0;
  }

  function onKeyDown(e) {
    if (!armed || isEditable(e.target)) return;
    let action = KEY_MAP[e.code];
    if (action === undefined && e.code in SLOT_KEYS) {
      action = "slot";
    }
    if (action === undefined) return;
    if (action !== "pause") {
      try {
        e.preventDefault();
      } catch {}
    }
    if (action === "pause") {
      if (!e.repeat) push("pause");
      return;
    }
    if (paused) return;
    if (action === "slot") {
      if (!e.repeat) push("slot:" + SLOT_KEYS[e.code]);
      return;
    }
    if (!held.has(action)) {
      push(action);
      held.add(action);
    }
  }

  function onKeyUp(e) {
    const action = KEY_MAP[e.code];
    if (action === undefined) return;
    if (action !== "pause" && armed && !isEditable(e.target)) {
      try {
        e.preventDefault();
      } catch {}
    }
    if (action === "pause") return;
    held.delete(action);
  }

  function onMouseDown(e) {
    if (!armed || paused || isEditable(e.target)) return;
    if (e.button !== 0) return;
    attackDown = true;
    attackHeldAt = performance.now();
    push("attack");
  }

  function onMouseUp(e) {
    if (e.button !== 0) return;
    attackDown = false;
    attackHeldAt = 0;
  }

  function onMouseMove(e) {
    if (!armed) return;
    aimX = e.clientX;
    aimY = e.clientY;
    aimSeen = true;
    lastMoveAt = performance.now();
  }

  function onWindowBlur() {
    releaseAll();
  }

  function onVisibility() {
    try {
      if (document.hidden) releaseAll();
    } catch {}
  }

  function attach() {
    if (attached) return;
    attached = true;
    bindEvent(window, "keydown", onKeyDown, { capture: true });
    bindEvent(window, "keyup", onKeyUp, { capture: true });
    bindEvent(window, "mousedown", onMouseDown, { capture: true });
    bindEvent(window, "mouseup", onMouseUp, { capture: true });
    bindEvent(window, "mousemove", onMouseMove, { passive: true });
    bindEvent(window, "blur", onWindowBlur);
    bindEvent(document, "visibilitychange", onVisibility);
  }

  function detach() {
    if (!attached) return;
    attached = false;
    window.removeEventListener("keydown", onKeyDown, { capture: true });
    window.removeEventListener("keyup", onKeyUp, { capture: true });
    window.removeEventListener("mousedown", onMouseDown, { capture: true });
    window.removeEventListener("mouseup", onMouseUp, { capture: true });
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("blur", onWindowBlur);
    document.removeEventListener("visibilitychange", onVisibility);
    releaseAll();
    armed = false;
    paused = false;
  }

  function setArmed(on) {
    armed = !!on;
    if (!armed) releaseAll();
  }

  function setPaused(on) {
    const next = !!on;
    if (next === paused) return;
    paused = next;
    if (paused) {
      held.clear();
      attackDown = false;
    }
    if (typeof onPauseChange === "function") {
      try {
        onPauseChange(paused);
      } catch {}
    }
  }

  function consume(action) {
    for (let i = 0; i < queue.length; i++) {
      if (queue[i] === action) {
        queue.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  function consumeSlot() {
    for (let i = 0; i < queue.length; i++) {
      const entry = queue[i];
      if (typeof entry === "string" && entry.indexOf("slot:") === 0) {
        queue.splice(i, 1);
        return Number(entry.slice(5));
      }
    }
    return null;
  }

  return {
    attach,
    detach,
    setArmed,
    setPaused,
    consume,
    consumeSlot,
    releaseAll,
    isDown: (action) => held.has(action),
    anyDown: (...actions) => {
      for (let i = 0; i < actions.length; i++)
        if (held.has(actions[i])) return true;
      return false;
    },
    isAttackDown: () => attackDown && !paused,
    getAttackHeldMs: () => (attackDown ? performance.now() - attackHeldAt : 0),
    getAim: () => ({ x: aimX, y: aimY, seen: aimSeen, movedAt: lastMoveAt }),
    isPaused: () => paused,
    isArmed: () => armed,
    onPauseChange: (fn) => {
      onPauseChange = typeof fn === "function" ? fn : null;
    },
  };
}

const STYLE_ID = "sk-hud-style";

const STYLE_TEXT = `
.sk-hud,.sk-guide{--sk-outline:2px 0 #000,-2px 0 #000,0 2px #000,0 -2px #000,2px 2px #000,-2px -2px #000,2px -2px #000,-2px 2px #000;--sk-ink:#111;--sk-paper:#f3ecd8;--sk-yellow:#ffd23f;--sk-ammo-h:107px;--sk-display:"Impact","Haettenschweiler","Arial Narrow Bold","Arial Black",sans-serif;font-family:"Trebuchet MS","Segoe UI",Arial,sans-serif;user-select:none;-webkit-user-select:none}
.sk-hud{position:absolute;inset:0;pointer-events:none;z-index:30;transition:opacity .2s}
.sk-hud-hidden{display:none}
.sk-hud-paused{opacity:.5}
.sk-num{font-family:var(--sk-display);font-weight:400}
.sk-vitals{position:absolute;left:50%;top:22px;width:290px;transform:translateX(-50%)}
.sk-vitals-top{display:flex;align-items:flex-end;gap:10px;margin-bottom:4px}
.sk-name{padding:2px 9px 1px;background:var(--sk-ink);color:#fff;font:400 14px/18px var(--sk-display);letter-spacing:.06em;transform:skewX(-12deg);box-shadow:3px 3px 0 rgba(0,0,0,.45)}
.sk-hp-num{margin-left:auto;font-size:38px;line-height:34px;color:#fff;text-shadow:var(--sk-outline),4px 4px 0 #000}
.sk-bar{position:relative;display:block;height:12px;background:#2a2a2a;border:3px solid #000;box-shadow:4px 4px 0 #000;transform:skewX(-14deg);overflow:hidden}
.sk-bar-fill{display:block;height:100%;width:100%;transition:width .12s linear,background-color .15s}
.sk-bar-hp{height:24px}
.sk-bar-hp .sk-bar-fill{background:#8ed84f;box-shadow:inset 0 -6px 0 rgba(0,0,0,.18)}
.sk-bar-hp[data-tone="danger"] .sk-bar-fill{background:#ff4136}
.sk-bar-hp[data-tone="danger"]{animation:sk-shake .35s linear infinite}
.sk-minis{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:11px}
.sk-mini-label{display:block;margin-bottom:2px;font:400 13px/14px var(--sk-display);letter-spacing:.05em;color:#fff;text-shadow:var(--sk-outline)}
.sk-mini .sk-bar{height:7px;border-width:2px;box-shadow:3px 3px 0 #000}
.sk-mini-jet .sk-bar-fill{background:#3fb8ff}
.sk-mini-jet .sk-bar[data-tone="warn"] .sk-bar-fill{background:#8a8f99}
.sk-mini-jet .sk-bar[data-tone="good"] .sk-bar-fill{background:#b6ecff}
.sk-mini-rage .sk-bar-fill{background:#ff8a2b}
.sk-mini-rage .sk-bar[data-tone="warn"] .sk-bar-fill{background:#ffb02b}
.sk-mini-rage .sk-bar[data-tone="danger"] .sk-bar-fill{background:#ff2d2d}
.sk-foe-lv{position:absolute;left:50%;top:0;transform:translateX(-50%) translateY(-100%);display:flex;align-items:center;gap:7px;padding:3px 10px 2px;background:#1a0505;border:2px solid #000;box-shadow:3px 3px 0 rgba(0,0,0,.45)}
.sk-foe-lv[hidden]{display:none}
.sk-foe-lv-name{font:400 12px/14px var(--sk-display);letter-spacing:.08em;color:#ff5a5a;text-shadow:1px 0 0 #000,-1px 0 0 #000,0 1px 0 #000,0 -1px 0 #000}
.sk-foe-lv-val{font:400 17px/18px var(--sk-display);letter-spacing:.04em;color:#fff;text-shadow:2px 0 0 #000,-2px 0 0 #000,0 2px 0 #000,0 -2px 0 #000}
.sk-foe-lv-cap{font:400 12px/14px var(--sk-display);letter-spacing:.06em;color:var(--sk-yellow);text-shadow:1px 0 0 #000,-1px 0 0 #000,0 1px 0 #000,0 -1px 0 #000}
.sk-weapon{position:absolute;right:22px;top:22px;width:230px;text-align:right}
.sk-weapon-head{display:flex;align-items:center;justify-content:flex-end;gap:9px}
.sk-weapon-icon{order:3;font-size:16px;color:#fff;filter:drop-shadow(2px 2px 0 #000)}
.sk-weapon-name{order:2;font:400 20px/22px var(--sk-display);letter-spacing:.04em;text-transform:uppercase;color:#fff;text-shadow:var(--sk-outline),3px 3px 0 #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sk-slot{order:1;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;background:var(--sk-yellow);border:3px solid #000;box-shadow:3px 3px 0 #000;color:#000;font-size:15px;line-height:1;transform:rotate(-5deg)}
.sk-ammo-row{display:flex;align-items:flex-end;justify-content:flex-end;gap:8px;margin:2px 0 6px}
.sk-ammo-count{font-size:60px;line-height:54px;color:#fff;text-shadow:var(--sk-outline),5px 5px 0 #000}
.sk-ammo-cap{padding-bottom:4px;font-size:20px;line-height:20px;color:#fff;text-shadow:var(--sk-outline),3px 3px 0 #000}
.sk-weapon .sk-bar{height:9px;margin-left:12px}
.sk-weapon .sk-bar-fill{background:var(--sk-yellow)}
.sk-weapon.sk-low .sk-ammo-count{color:#ffb02b}
.sk-weapon.sk-empty .sk-ammo-count{color:#ff4136}
.sk-weapon.sk-empty .sk-bar-fill{background:#ff4136}
.sk-weapon.sk-reloading .sk-ammo-count{opacity:.6}
.sk-weapon.sk-reloading .sk-bar-fill{background:#c9c9c9}
.sk-abilities{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);display:flex;gap:10px}
.sk-chip{position:relative;display:flex;align-items:center;justify-content:center;width:46px;height:46px;background:var(--sk-paper);border:3px solid #000;box-shadow:4px 4px 0 #000;color:#000;font-size:18px;overflow:hidden;transition:transform .12s,background-color .12s}
.sk-chip::after{content:"";position:absolute;left:0;right:0;top:0;height:calc(100% - var(--chip-fill,100%));background:rgba(0,0,0,.6)}
.sk-chip-key{position:absolute;top:0;left:0;z-index:2;min-width:15px;padding:1px 3px 0;background:#000;color:#fff;font-size:12px;line-height:14px;text-align:center}
.sk-chip:not(.sk-chip-ready){color:#555}
.sk-chip-ready{transform:translateY(-2px)}
.sk-chip-on{background:var(--sk-yellow);color:#000}
.sk-guide{position:absolute;right:22px;top:calc(22px + var(--sk-ammo-h) + 14px);width:452px;background:var(--sk-paper);border:3px solid #000;box-shadow:6px 6px 0 #000;pointer-events:none;color:#111;z-index:31;transition:opacity .15s;opacity:.94}
.sk-guide-paused{opacity:1}
.sk-guide-hidden{display:none}
.sk-guide-head{display:flex;align-items:center;gap:10px;padding:4px 6px 4px 12px;background:#000}
.sk-guide-title{flex:1;font:400 18px/22px var(--sk-display);letter-spacing:.1em;color:#fff}
.sk-guide-status{display:none;padding:0 8px;background:var(--sk-yellow);color:#000;font:400 14px/20px var(--sk-display);letter-spacing:.06em;transform:skewX(-12deg)}
.sk-guide-status i{display:none}
.sk-guide-status-paused{display:block}
.sk-guide-toggle{pointer-events:auto;width:24px;height:24px;padding:0;border:2px solid #fff;background:transparent;color:#fff;font-size:10px;cursor:pointer}
.sk-guide-toggle:hover{background:var(--sk-yellow);color:#000;border-color:var(--sk-yellow)}
.sk-guide-toggle i{display:inline-block;transition:transform .15s}
.sk-guide-collapsed .sk-guide-toggle i{transform:rotate(180deg)}
.sk-guide-collapsed .sk-guide-body{display:none}
.sk-guide-collapsed{width:auto}
.sk-guide-body{columns:2;column-gap:0;padding:8px 0 2px}
.sk-guide-group{break-inside:avoid;padding:2px 14px 10px}
.sk-guide-group-title{display:inline-block;margin-bottom:5px;padding:0 7px;background:var(--sk-yellow);border:2px solid #000;font:400 13px/17px var(--sk-display);letter-spacing:.06em;text-transform:uppercase;transform:skewX(-10deg)}
.sk-guide-row{display:grid;grid-template-columns:88px 1fr;align-items:center;column-gap:6px;min-height:25px;padding:0 3px}
.sk-guide-row-active{animation:sk-flash .5s ease-out}
.sk-guide-keys{display:flex;align-items:center;gap:3px}
.sk-guide-key{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:21px;padding:0 5px;box-sizing:border-box;font:400 13px/1 var(--sk-display);letter-spacing:.03em;color:#000;background:#fff;border:2px solid #000;border-bottom-width:4px;border-radius:3px}
.sk-guide-sep{font:400 14px/1 var(--sk-display)}
.sk-guide-text{font-size:12px;font-weight:700;color:#111}
@keyframes sk-flash{0%{background:rgba(255,210,63,.95)}100%{background:transparent}}
@keyframes sk-shake{0%{transform:skewX(-14deg) translate(0,0)}25%{transform:skewX(-14deg) translate(1px,-1px)}50%{transform:skewX(-14deg) translate(-1px,1px)}75%{transform:skewX(-14deg) translate(1px,1px)}100%{transform:skewX(-14deg) translate(0,0)}}
.sk-hint{position:absolute;left:50%;top:152px;transform:translateX(-50%);display:flex;align-items:center;gap:9px;padding:6px 14px 5px;background:var(--sk-ink);border:3px solid #000;box-shadow:5px 5px 0 #000;color:#fff;font:400 14px/17px var(--sk-display);letter-spacing:.05em;text-transform:uppercase;pointer-events:none;z-index:31;opacity:0;visibility:hidden;transition:opacity .2s ease}
.sk-hint-live{opacity:1;visibility:visible}
.sk-hint-key{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:23px;background:var(--sk-yellow);border:3px solid #000;color:#000;font:400 14px/14px var(--sk-display);box-shadow:2px 2px 0 #000;animation:sk-hint-pulse .9s ease-in-out infinite alternate}
@keyframes sk-hint-pulse{from{transform:scale(1)}to{transform:scale(1.14)}}
`;

function ensureStyles() {
  try {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = STYLE_TEXT;
    document.head.appendChild(style);
  } catch {}
}

export const CONTROL_BINDINGS = [
  { id: "move", keys: ["A", "D"], label: "Move", group: "move" },
  { id: "jump", keys: ["W"], label: "Jump", group: "move" },
  { id: "thrust", keys: ["SPACE"], label: "Jetpack thrust", group: "move" },
  { id: "down", keys: ["S"], label: "Crouch / descend", group: "move" },
  { id: "sprint", keys: ["SHIFT"], label: "Sprint", group: "move" },
  { id: "aim", keys: ["MOUSE"], label: "Aim", group: "combat" },
  { id: "attack", keys: ["LMB"], label: "Attack", group: "combat" },
  { id: "reload", keys: ["R"], label: "Reload", group: "combat" },
  {
    id: "weapons",
    keys: PLAYER_WEAPONS.map((entry) => entry.key),
    label: "Weapon slot",
    group: "combat",
  },
  { id: "cycle", keys: ["X"], label: "Next weapon", group: "combat" },
  { id: "jet", keys: ["Q"], label: "Jetpack", group: "ability" },
  { id: "fly", keys: ["A", "D", "W", "S"], label: "Fly", group: "ability" },
  { id: "slam", keys: ["F"], label: "Slam dive", group: "ability" },
  { id: "dodge", keys: ["C"], label: "Dodge roll", group: "ability" },
  { id: "combo", keys: ["V"], label: "Afterimage combo", group: "ability" },
  { id: "tussle", keys: ["E"], label: "Grab", group: "ability" },
  {
    id: "foe",
    keys: ["G"],
    label: "Spawn red rival",
    group: "ability",
  },
  { id: "pause", keys: ["ESC"], label: "Pause", group: "system" },
];

const GROUP_LABELS = {
  move: "Movement",
  combat: "Combat",
  ability: "Abilities",
  system: "System",
};

function keycap(label) {
  return createElement("kbd", { className: "sk-guide-key", text: label });
}

function buildRow(binding) {
  const row = createElement("div", { className: "sk-guide-row" });
  row.setAttribute("data-binding", binding.id);
  const keys = createElement("span", { className: "sk-guide-keys" });
  const list = binding.keys || [];
  if (list.length > 4) {
    keys.appendChild(keycap(list[0]));
    keys.appendChild(
      createElement("span", { className: "sk-guide-sep", text: "-" }),
    );
    keys.appendChild(keycap(list[list.length - 1]));
  } else if (list.length) {
    for (const label of list) keys.appendChild(keycap(label));
  } else if (binding.icon) {
    const glyph = createElement("i", { className: binding.icon });
    glyph.setAttribute("aria-hidden", "true");
    keys.appendChild(glyph);
  }
  row.appendChild(keys);
  row.appendChild(
    createElement("span", { className: "sk-guide-text", text: binding.label }),
  );
  return row;
}

const HINT_LIVE_MS = 8000;

export function createRivalHint(layer) {
  ensureStyles();
  const root = createElement("div", { className: "sk-hint" });
  root.appendChild(
    createElement("kbd", { className: "sk-hint-key", text: "G" }),
  );
  root.appendChild(
    createElement("span", {
      className: "sk-hint-text",
      text: "Call a Red Rival",
    }),
  );
  try {
    if (layer) layer.appendChild(root);
  } catch {}

  let hideAt = 0;
  let live = false;

  function setLive(on) {
    if (live === on) return;
    live = on;
    try {
      root.classList.toggle("sk-hint-live", on);
    } catch {}
  }

  function show(now) {
    setLive(true);
    hideAt = now + HINT_LIVE_MS;
  }

  function hide() {
    setLive(false);
    hideAt = 0;
  }

  function update(now) {
    if (!live) return;
    if (hideAt && now >= hideAt) hide();
  }

  return {
    show,
    hide,
    update,
    isLive: () => live,
    destroy: () => {
      try {
        root.remove();
      } catch {}
    },
  };
}

export function createControlsGuide(layer) {
  ensureStyles();
  const root = createElement("div", { className: "sk-guide" });
  const head = createElement("div", { className: "sk-guide-head" });
  head.appendChild(
    createElement("span", { className: "sk-guide-title", text: "CONTROLS" }),
  );

  const status = createElement("span", { className: "sk-guide-status" });
  const statusText = createElement("span", {
    className: "sk-guide-status-text",
  });
  status.appendChild(statusText);
  head.appendChild(status);

  const toggleBtn = createElement("button", { className: "sk-guide-toggle" });
  toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
  toggleBtn.setAttribute("aria-label", "Toggle controls guide");
  head.appendChild(toggleBtn);
  root.appendChild(head);

  const body = createElement("div", { className: "sk-guide-body" });
  for (const group of ["move", "combat", "ability", "system"]) {
    const rows = CONTROL_BINDINGS.filter((binding) => binding.group === group);
    if (!rows.length) continue;
    const section = createElement("div", { className: "sk-guide-group" });
    section.appendChild(
      createElement("div", {
        className: "sk-guide-group-title",
        text: GROUP_LABELS[group] || group,
      }),
    );
    for (const binding of rows) section.appendChild(buildRow(binding));
    body.appendChild(section);
  }
  root.appendChild(body);

  let collapsed = false;

  function setCollapsed(next) {
    collapsed = !!next;
    try {
      root.classList.toggle("sk-guide-collapsed", collapsed);
    } catch {}
    try {
      toggleBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    } catch {}
  }

  function setStatus(text, tone) {
    setText(statusText, text || "");
    try {
      status.classList.toggle("sk-guide-status-paused", tone === "pause");
    } catch {}
  }

  function setPaused(on) {
    try {
      root.classList.toggle("sk-guide-paused", !!on);
    } catch {}
    setStatus(on ? "PAUSED" : "", on ? "pause" : "live");
  }

  function pulse(bindingId) {
    const row = $('.sk-guide-row[data-binding="' + bindingId + '"]', body);
    if (!row) return;
    try {
      row.classList.remove("sk-guide-row-active");
      void row.offsetWidth;
      row.classList.add("sk-guide-row-active");
    } catch {}
  }

  bindEvent(toggleBtn, "click", () => setCollapsed(!collapsed));
  setCollapsed(false);
  setStatus("", "live");

  if (layer) {
    try {
      layer.appendChild(root);
    } catch {}
  }

  return {
    root,
    setCollapsed,
    setPaused,
    pulse,
    setVisible: (on) => {
      try {
        root.classList.toggle("sk-guide-hidden", !on);
      } catch {}
    },
    isCollapsed: () => collapsed,
    destroy: () => {
      try {
        root.remove();
      } catch {}
    },
  };
}

const WEAPON_GLYPHS = {
  gun: "fas fa-bullseye",
  rocket: "fas fa-rocket",
  grenade: "fas fa-bomb",
  knife: "fas fa-utensils",
  lightning: "fas fa-bolt",
  orb: "fas fa-circle-dot",
  laser: "fas fa-ruler-horizontal",
  sword: "fas fa-khanda",
  cutter: "fas fa-scissors",
  spear: "fas fa-arrow-up-right-dots",
};

const ABILITY_GLYPHS = {
  jet: "fas fa-rocket",
  slam: "fas fa-arrow-down",
  dodge: "fas fa-wind",
  combo: "fas fa-ghost",
  tussle: "fas fa-hand-fist",
};

const ABILITY_KEYS = {
  jet: "Q",
  slam: "F",
  dodge: "C",
  combo: "V",
  tussle: "E",
};
const ABILITY_ORDER = ["jet", "slam", "dodge", "combo", "tussle"];

function bar(extraClass) {
  const track = createElement("span", {
    className: "sk-bar" + (extraClass ? " " + extraClass : ""),
  });
  const fill = createElement("span", { className: "sk-bar-fill" });
  track.appendChild(fill);
  return { track, fill };
}

function mini(key, label) {
  const wrap = createElement("div", { className: "sk-mini sk-mini-" + key });
  wrap.setAttribute("data-meter", key);
  wrap.appendChild(
    createElement("span", { className: "sk-mini-label", text: label }),
  );
  const entry = bar();
  wrap.appendChild(entry.track);
  return { wrap, track: entry.track, fill: entry.fill };
}

export function createPlayerHud(layer) {
  ensureStyles();
  const root = createElement("div", { className: "sk-hud" });

  const vitals = createElement("div", { className: "sk-vitals" });
  const vitalsTop = createElement("div", { className: "sk-vitals-top" });
  vitalsTop.appendChild(
    createElement("span", { className: "sk-name", text: "PLAYER" }),
  );
  const hpNum = createElement("span", {
    className: "sk-hp-num sk-num",
    text: "",
  });
  vitalsTop.appendChild(hpNum);
  vitals.appendChild(vitalsTop);
  const hp = bar("sk-bar-hp");
  vitals.appendChild(hp.track);
  const minis = createElement("div", { className: "sk-minis" });
  const jet = mini("jet", "JET");
  const rage = mini("rage", "RAGE");
  minis.appendChild(jet.wrap);
  minis.appendChild(rage.wrap);
  vitals.appendChild(minis);
  root.appendChild(vitals);

  const weapon = createElement("div", { className: "sk-weapon" });
  const weaponHead = createElement("div", { className: "sk-weapon-head" });
  const weaponSlot = createElement("span", {
    className: "sk-slot sk-num",
    text: "1",
  });
  const weaponName = createElement("span", {
    className: "sk-weapon-name",
    text: "Gun",
  });
  const weaponIcon = createElement("i", {
    className: "sk-weapon-icon fas fa-bullseye",
  });
  weaponHead.appendChild(weaponSlot);
  weaponHead.appendChild(weaponName);
  weaponHead.appendChild(weaponIcon);
  weapon.appendChild(weaponHead);
  const ammoRow = createElement("div", { className: "sk-ammo-row" });
  const ammoCount = createElement("span", {
    className: "sk-ammo-count sk-num",
    text: "12",
  });
  const ammoCap = createElement("span", {
    className: "sk-ammo-cap sk-num",
    text: "/ 12",
  });
  ammoRow.appendChild(ammoCount);
  ammoRow.appendChild(ammoCap);
  weapon.appendChild(ammoRow);
  const ammoBar = bar();
  weapon.appendChild(ammoBar.track);
  root.appendChild(weapon);

  const abilityRow = createElement("div", { className: "sk-abilities" });
  const abilityChips = {};
  for (const id of ABILITY_ORDER) {
    const chip = createElement("div", { className: "sk-chip" });
    chip.setAttribute("data-ability", id);
    const key = createElement("span", {
      className: "sk-chip-key sk-num",
      text: ABILITY_KEYS[id],
    });
    const glyph = createElement("i", {
      className: ABILITY_GLYPHS[id] || "fas fa-circle",
    });
    chip.appendChild(key);
    chip.appendChild(glyph);
    abilityRow.appendChild(chip);
    abilityChips[id] = { chip };
  }
  root.appendChild(abilityRow);

  const foeLv = createElement("div", { className: "sk-foe-lv" });
  foeLv.setAttribute("hidden", "");
  const foeLvName = createElement("span", {
    className: "sk-foe-lv-name",
    text: "RED",
  });
  const foeLvVal = createElement("span", {
    className: "sk-foe-lv-val",
    text: "1",
  });
  const foeLvCap = createElement("span", {
    className: "sk-foe-lv-cap",
    text: "",
  });
  foeLv.appendChild(foeLvName);
  foeLv.appendChild(foeLvVal);
  foeLv.appendChild(foeLvCap);
  root.appendChild(foeLv);

  let lastFoeLevel = -1;
  let lastFoeCap = false;

  function setFoeRank(profile) {
    try {
      const level =
        profile && Number.isFinite(profile.level) ? profile.level : 0;
      const atCap = !!(profile && profile.atCap);
      if (level <= 0) {
        if (lastFoeLevel !== 0) {
          lastFoeLevel = 0;
          foeLv.setAttribute("hidden", "");
        }
        return;
      }
      foeLv.removeAttribute("hidden");
      if (level !== lastFoeLevel) {
        lastFoeLevel = level;
        setText(foeLvVal, "LV " + level);
      }
      if (atCap !== lastFoeCap) {
        lastFoeCap = atCap;
        setText(foeLvCap, atCap ? "MAX" : "");
      }
    } catch {}
  }

  if (layer) {
    try {
      layer.appendChild(root);
    } catch {}
  }

  let lastHp = -1;
  let lastLabel = "";
  let lastKey = "";
  let lastMag = -1;
  let lastCharge = -1;
  let lastCap = "";

  function setCap(text) {
    if (text === lastCap) return;
    lastCap = text;
    setText(ammoCap, text);
  }

  function setMeter(entry, ratio, tone) {
    try {
      entry.fill.style.width =
        Math.round(Math.max(0, Math.min(1, ratio)) * 100) + "%";
    } catch {}
    try {
      entry.track.setAttribute("data-tone", tone || "ok");
    } catch {}
  }

  function update(model) {
    if (!model) return;

    if (model.hp !== lastHp) {
      lastHp = model.hp;
      setMeter(hp, model.hpRatio, model.hpRatio <= 0.34 ? "danger" : "ok");
      if (Number.isFinite(model.hp)) {
        setText(hpNum, String(Math.max(0, Math.ceil(model.hp))));
      }
    }

    const ammo = model.ammo;
    if (ammo) {
      if (ammo.label !== lastLabel) {
        lastLabel = ammo.label;
        setText(weaponName, ammo.label);
        const glyph = WEAPON_GLYPHS[ammo.id] || "fas fa-bullseye";
        weaponIcon.setAttribute("class", "sk-weapon-icon " + glyph);
      }
      if (ammo.key !== lastKey) {
        lastKey = ammo.key;
        setText(weaponSlot, ammo.key || "-");
      }
      if (ammo.resource === "mag") {
        if (ammo.mag !== lastMag) {
          lastMag = ammo.mag;
          setText(ammoCount, String(ammo.mag));
        }
        setCap(ammo.reloading ? "RELOAD" : "/ " + ammo.magSize);
        const ratio = ammo.magSize > 0 ? ammo.mag / ammo.magSize : 0;
        try {
          ammoBar.fill.style.width = Math.round(ratio * 100) + "%";
        } catch {}
        toggleClass(weapon, "sk-low", !!ammo.low);
        toggleClass(weapon, "sk-empty", !!ammo.empty);
        toggleClass(weapon, "sk-reloading", !!ammo.reloading);
        try {
          ammoBar.fill.style.opacity = ammo.reloading
            ? String(ammo.reloadProgress)
            : "1";
        } catch {}
      } else if (ammo.resource === "charge") {
        const ready = ammo.cooldownLeft <= 0;
        if (Math.round(ammo.cooldownLeft) !== lastCharge) {
          lastCharge = Math.round(ammo.cooldownLeft);
          setText(
            ammoCount,
            ready ? "RDY" : (ammo.cooldownLeft / 1000).toFixed(1),
          );
        }
        setCap(ready ? "" : "s");
        toggleClass(weapon, "sk-empty", !ready);
        toggleClass(weapon, "sk-low", !ready);
        toggleClass(weapon, "sk-reloading", false);
        try {
          ammoBar.fill.style.opacity = "1";
          ammoBar.fill.style.width = ready
            ? "100%"
            : Math.round(
                (1 - ammo.cooldownLeft / Math.max(1, ammo.cooldownSpan)) * 100,
              ) + "%";
        } catch {}
      } else {
        lastMag = -1;
        setText(ammoCount, "MELEE");
        setCap("");
        try {
          ammoBar.fill.style.opacity = "1";
          ammoBar.fill.style.width = "100%";
        } catch {}
        toggleClass(weapon, "sk-empty", false);
        toggleClass(weapon, "sk-low", false);
        toggleClass(weapon, "sk-reloading", false);
      }
    }

    const jetState = model.jet || { ready: false, ratio: 0, active: false };
    setMeter(
      jet,
      jetState.ratio,
      jetState.active ? "good" : jetState.ready ? "ok" : "warn",
    );

    setMeter(
      rage,
      model.rageRatio,
      model.rageRatio > 0.6 ? "danger" : model.rageRatio > 0.3 ? "warn" : "ok",
    );

    const abilities = model.abilities || {};
    for (const id of ABILITY_ORDER) {
      const entry = abilityChips[id];
      const state = abilities[id] || { ready: false, ratio: 0 };
      toggleClass(entry.chip, "sk-chip-ready", !!state.ready);
      toggleClass(entry.chip, "sk-chip-on", id === "jet" && !!jetState.active);
      try {
        entry.chip.style.setProperty(
          "--chip-fill",
          Math.round(Math.max(0, Math.min(1, state.ratio)) * 100) + "%",
        );
      } catch {}
    }

    try {
      root.classList.toggle("sk-hud-paused", !!model.paused);
    } catch {}
  }

  return {
    root,
    update,
    setFoeRank,
    setVisible: (on) => {
      try {
        root.classList.toggle("sk-hud-hidden", !on);
      } catch {}
    },
    destroy: () => {
      try {
        root.remove();
      } catch {}
    },
  };
}
