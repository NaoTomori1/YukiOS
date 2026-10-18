import { createFoeRank } from "./stickmanFoeRank.js";

const FOE_STYLE_ID = "sk-foe-style";

const FOE_BAR_W = 78;
const FOE_BAR_H = 9;
const FOE_LABEL = "RED";
const SPAWN_GAP_PX = 190;
const SPAWN_MAX_TRIES = 8;
const DEATH_BURST_MS = 620;

const STYLE_TEXT = `
.foe-bar{position:absolute;left:0;top:0;width:${FOE_BAR_W}px;pointer-events:none;z-index:29;transform:translateX(-50%);user-select:none;-webkit-user-select:none}
.foe-tag{display:block;margin-bottom:2px;text-align:center;font:400 11px/12px "Impact","Haettenschweiler","Arial Narrow Bold","Arial Black",sans-serif;letter-spacing:.08em;color:#fff;text-shadow:2px 0 0 #000,-2px 0 0 #000,0 2px 0 #000,0 -2px 0 #000,2px 2px 0 #000,-2px -2px 0 #000}
.foe-track{position:relative;display:block;height:${FOE_BAR_H}px;background:#2a2a2a;border:3px solid #000;box-shadow:4px 4px 0 #000;transform:skewX(-14deg);overflow:hidden}
.foe-fill{display:block;height:100%;width:100%;background:#ff2d2d;transition:width .12s linear,background-color .15s}
.foe-bar[data-tone="warn"] .foe-fill{background:#ffb02b}
.foe-bar[data-tone="low"] .foe-fill{background:#8ed84f}
.foe-bar[data-tone="low"] .foe-track{animation:foe-shake .35s linear infinite}
@keyframes foe-shake{0%,100%{transform:skewX(-14deg) translateX(0)}25%{transform:skewX(-14deg) translateX(1.5px)}75%{transform:skewX(-14deg) translateX(-1.5px)}}
`;

function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(FOE_STYLE_ID)) return;
  try {
    const style = document.createElement("style");
    style.id = FOE_STYLE_ID;
    style.textContent = STYLE_TEXT;
    document.head.appendChild(style);
  } catch {}
}

function buildBar(level) {
  const bar = document.createElement("div");
  bar.className = "foe-bar";
  bar.setAttribute("data-tone", "full");
  const tag = document.createElement("span");
  tag.className = "foe-tag";
  tag.textContent = level > 1 ? FOE_LABEL + "  LV " + level : FOE_LABEL;
  bar.appendChild(tag);
  const track = document.createElement("span");
  track.className = "foe-track";
  const fill = document.createElement("span");
  fill.className = "foe-fill";
  track.appendChild(fill);
  bar.appendChild(track);
  return { bar, fill };
}

export function createFoeSystem(ctx) {
  const fn = (name) =>
    ctx && typeof ctx[name] === "function" ? ctx[name] : null;

  let foeRef = null;
  let barEls = null;
  let dyingAt = 0;
  let lastHp = -1;
  let lastLevel = -1;
  let rank = null;

  try {
    rank = createFoeRank({
      get: () => {
        const get = fn("loadRank");
        return get ? get() : null;
      },
      set: (value) => {
        const save = fn("saveRank");
        if (save) save(value);
      },
    });
  } catch {
    rank = null;
  }

  function rankProfile() {
    try {
      if (rank) rank.refresh();
      return rank ? rank.getProfile() : null;
    } catch {
      return null;
    }
  }

  function applyRank(ref) {
    const profile = rankProfile();
    if (!profile) return null;
    try {
      if (typeof ref.setRankProfile === "function") {
        ref.setRankProfile(profile);
      } else {
        if (typeof ref.setMaxHp === "function") ref.setMaxHp(profile.hp);
      }
    } catch {}
    return profile;
  }

  function layer() {
    try {
      const get = fn("getLayer");
      return get ? get() : null;
    } catch {
      return null;
    }
  }

  function clear() {
    if (barEls && barEls.bar) {
      try {
        barEls.bar.remove();
      } catch {}
    }
    barEls = null;
    if (foeRef) {
      try {
        foeRef.setOpponent(null);
      } catch {}
      try {
        foeRef.destroy();
      } catch {}
    }
    foeRef = null;
    dyingAt = 0;
    lastHp = -1;
  }

  function pickSpawn() {
    const host = fn("getPlayerPos");
    const lay = layer();
    if (!host) return null;
    let best = null;
    for (let i = 0; i < SPAWN_MAX_TRIES; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = host.x + side * (SPAWN_GAP_PX + Math.random() * 160);
      const y = host.y;
      if (lay && (x < 8 || x > window.innerWidth - 40)) continue;
      if (!best) best = { x: x, y: y };
      if (Math.random() < 0.5) break;
    }
    return best || { x: host.x + 220, y: host.y };
  }

  function link() {
    try {
      if (!foeRef) return false;
      const player = fn("getPlayerRef");
      foeRef.setOpponent(player || null);
      if (player && typeof player.setOpponent === "function") {
        player.setOpponent(foeRef);
      }
      return true;
    } catch {
      return false;
    }
  }

  function spawn(now) {
    clear();
    const lay = layer();
    const make = fn("createActor");
    if (!lay || !make) return false;
    const spot = pickSpawn();
    if (!spot) return false;
    ensureStyles();
    try {
      foeRef = make(lay);
    } catch {
      foeRef = null;
      return false;
    }
    if (!foeRef) return false;
    const profile = applyRank(foeRef);
    lastLevel = profile ? profile.level : -1;
    try {
      foeRef.setControlMode("ai");
    } catch {}
    link();
    try {
      foeRef.launch(spot.x, spot.y, -3, 0);
      foeRef.startIntro(700);
    } catch {}
    const built = buildBar(lastLevel > 0 ? lastLevel : 1);
    barEls = built;
    try {
      lay.appendChild(built.bar);
    } catch {}
    const pop = fn("pop");
    if (pop) {
      try {
        pop(spot.x + 14, spot.y, 18);
      } catch {}
    }
    return true;
  }

  function remove() {
    const player = fn("getPlayerRef");
    try {
      if (player && typeof player.setOpponent === "function") {
        player.setOpponent(null);
      }
    } catch {}
    clear();
    try {
      const changed = fn("onRankChange");
      if (changed) changed(null);
    } catch {}
  }

  function bumpRank() {
    try {
      if (rank) rank.recordDefeat();
    } catch {}
    try {
      const changed = fn("onRankChange");
      if (changed) changed(rankProfile());
    } catch {}
  }

  function update(now, dt) {
    if (foeRef) {
      try {
        foeRef.update(now, dt);
      } catch {}
    }
    if (!barEls) return;
    let box = null;
    let hp = 0;
    let max = 1;
    try {
      box = foeRef ? foeRef.getPos() : null;
      hp = foeRef && typeof foeRef.getHp === "function" ? foeRef.getHp() : 0;
    } catch {}
    try {
      const maxHp =
        foeRef && typeof foeRef.getMaxHp === "function" ? foeRef.getMaxHp() : 0;
      max = maxHp || 5;
    } catch {
      max = 5;
    }
    if (!box) {
      try {
        barEls.bar.style.display = "none";
      } catch {}
      return;
    }
    if (hp !== lastHp) {
      lastHp = hp;
      const ratio = Math.max(0, Math.min(1, hp / Math.max(1, max)));
      try {
        barEls.fill.style.width = (ratio * 100).toFixed(0) + "%";
      } catch {}
      try {
        barEls.bar.setAttribute(
          "data-tone",
          ratio <= 0.34 ? "low" : ratio <= 0.67 ? "warn" : "full",
        );
      } catch {}
    }
    if (hp <= 0) {
      if (!dyingAt) {
        dyingAt = now;
        bumpRank();
      }
      const k = Math.min(1, (now - dyingAt) / DEATH_BURST_MS);
      try {
        barEls.bar.style.opacity = (1 - k).toFixed(2);
        barEls.bar.style.display = k >= 1 ? "none" : "inline";
      } catch {}
      if (k >= 1) {
        remove();
        return;
      }
    }
    try {
      barEls.bar.style.display = "inline";
      barEls.bar.style.left = (box.x + box.w / 2).toFixed(1) + "px";
      barEls.bar.style.top = (box.y - 26).toFixed(1) + "px";
    } catch {}
  }

  return {
    spawn,
    remove,
    link,
    update,
    clear,
    isAlive: () => !!foeRef,
    getRef: () => foeRef,
    getMaxHp: () => {
      try {
        const ref = foeRef;
        if (ref && typeof ref.getMaxHp === "function") return ref.getMaxHp();
      } catch {}
      const profile = rankProfile();
      return profile ? profile.hp : 5;
    },
    getLevel: () => {
      const profile = rankProfile();
      return profile ? profile.level : 1;
    },
    getKills: () => {
      try {
        return rank ? rank.getKills() : 0;
      } catch {
        return 0;
      }
    },
    getProfile: () => rankProfile(),
  };
}
