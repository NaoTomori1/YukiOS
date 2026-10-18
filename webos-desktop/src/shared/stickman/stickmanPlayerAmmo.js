export const PLAYER_WEAPONS = [
  {
    slot: 0,
    id: "gun",
    label: "Gun",
    icon: "gun",
    resource: "mag",
    mag: 12,
    reserve: 96,
    reloadMs: 850,
    gapMs: 130,
    auto: true,
    key: "1",
  },
  {
    slot: 1,
    id: "rocket",
    label: "Rocket",
    icon: "rocket",
    resource: "mag",
    mag: 4,
    reserve: 20,
    reloadMs: 1600,
    gapMs: 480,
    auto: false,
    key: "2",
  },
  {
    slot: 2,
    id: "grenade",
    label: "Grenade",
    icon: "grenade",
    resource: "mag",
    mag: 3,
    reserve: 15,
    reloadMs: 1750,
    gapMs: 520,
    auto: false,
    key: "3",
  },
  {
    slot: 3,
    id: "knife",
    label: "Knife",
    icon: "knife",
    resource: "mag",
    mag: 8,
    reserve: 40,
    reloadMs: 780,
    gapMs: 110,
    auto: true,
    key: "4",
  },
  {
    slot: 4,
    id: "lightning",
    label: "Lightning",
    icon: "lightning",
    resource: "charge",
    cooldownMs: 1500,
    key: "5",
  },
  {
    slot: 5,
    id: "orb",
    label: "Orb",
    icon: "orb",
    resource: "charge",
    cooldownMs: 2800,
    key: "6",
  },
  {
    slot: 6,
    id: "laser",
    label: "Laser",
    icon: "laser",
    resource: "charge",
    cooldownMs: 9000,
    key: "7",
  },
  {
    slot: 7,
    id: "sword",
    label: "Flameblade",
    icon: "sword",
    resource: "melee",
    cooldownMs: 0,
    key: "8",
  },
  {
    slot: 8,
    id: "cutter",
    label: "Cutter",
    icon: "cutter",
    resource: "charge",
    cooldownMs: 60000,
    key: "9",
  },
];

export const CYCLE_EXTRA = [
  { id: "spear", label: "Spear", resource: "melee", cooldownMs: 0 },
];

const BY_ID = new Map();
for (const entry of PLAYER_WEAPONS) BY_ID.set(entry.id, entry);
for (const entry of CYCLE_EXTRA) {
  if (!BY_ID.has(entry.id)) BY_ID.set(entry.id, entry);
}

export const CYCLE_ORDER = [
  ...PLAYER_WEAPONS.map((entry) => entry.id),
  ...CYCLE_EXTRA.map((entry) => entry.id),
];

export function getWeaponSpec(id) {
  return BY_ID.get(id) || BY_ID.get("gun");
}

export function getWeaponSlot(id) {
  const spec = BY_ID.get(id);
  return spec && Number.isFinite(spec.slot) ? spec.slot : -1;
}

export function createAmmoRack() {
  const mags = new Map();
  const reserves = new Map();
  const nextShotAt = new Map();
  const cooldowns = new Map();
  let reloadUntil = 0;
  let reloadStart = 0;
  let reloadSpan = 0;
  let reloading = null;
  let current = "gun";

  function magOf(id) {
    const spec = getWeaponSpec(id);
    const cap = spec.resource === "mag" ? spec.mag : 0;
    if (!mags.has(id)) mags.set(id, cap);
    return mags.get(id);
  }

  function reserveOf(id) {
    const spec = getWeaponSpec(id);
    if (!reserves.has(id)) {
      reserves.set(id, spec.resource === "mag" ? spec.reserve : 0);
    }
    return reserves.get(id);
  }

  function refill(id) {
    const spec = getWeaponSpec(id);
    if (spec.resource !== "mag") return;
    const cap = spec.mag;
    const need = cap - mags.get(id);
    if (need <= 0) return;
    const take = Math.min(need, reserves.get(id));
    mags.set(id, mags.get(id) + take);
    reserves.set(id, reserves.get(id) - take);
  }

  function isReloading() {
    return !!reloading;
  }

  function reloadProgress(now) {
    if (!reloading || reloadSpan <= 0) return 0;
    return Math.min(1, Math.max(0, (now - reloadStart) / reloadSpan));
  }

  function canFire(id, now) {
    if (isReloading()) return false;
    if (now < (nextShotAt.get(id) || 0)) return false;
    const spec = getWeaponSpec(id);
    if (spec.resource === "charge") {
      return now >= (cooldowns.get(id) || 0);
    }
    if (spec.resource === "mag") {
      return (mags.get(id) || 0) > 0;
    }
    return true;
  }

  function startReload(now) {
    const spec = getWeaponSpec(current);
    if (spec.resource !== "mag") return false;
    if (isReloading()) return false;
    if ((mags.get(current) || 0) >= spec.mag) return false;
    if ((reserves.get(current) || 0) <= 0) return false;
    reloading = current;
    reloadStart = now;
    reloadSpan = spec.reloadMs;
    reloadUntil = now + spec.reloadMs;
    return true;
  }

  function cancelReload() {
    reloading = null;
    reloadSpan = 0;
    reloadUntil = 0;
  }

  function onFired(id, now) {
    const spec = getWeaponSpec(id);
    if (spec.resource === "mag") {
      const left = Math.max(0, (mags.get(id) || 0) - 1);
      mags.set(id, left);
      if (left === 0) startReload(now);
    } else if (spec.resource === "charge") {
      cooldowns.set(id, now + spec.cooldownMs);
    }
    nextShotAt.set(id, now + (spec.gapMs || 0));
  }

  function update(now) {
    if (!reloading) return;
    if (now < reloadUntil) return;
    refill(reloading);
    cancelReload();
  }

  function snapshot(id, now) {
    const weaponId = id || current;
    const spec = getWeaponSpec(weaponId);
    const base = {
      id: weaponId,
      label: spec.label,
      icon: spec.icon,
      resource: spec.resource,
      key: spec.key || "",
      mag: 0,
      magSize: 0,
      reserve: 0,
      cooldownLeft: 0,
      cooldownSpan: spec.cooldownMs || 0,
      reloading: isReloading() && reloading === weaponId,
      reloadProgress: 0,
      low: false,
      empty: false,
    };
    if (spec.resource === "mag") {
      const mag = magOf(weaponId);
      base.mag = mag;
      base.magSize = spec.mag;
      base.reserve = reserveOf(weaponId);
      base.low = spec.mag > 0 && mag <= Math.max(1, Math.ceil(spec.mag * 0.34));
      base.empty = mag <= 0;
      base.reloading = isReloading() && reloading === weaponId;
      base.reloadProgress = base.reloading ? reloadProgress(now) : 0;
    } else if (spec.resource === "charge") {
      const left = Math.max(0, (cooldowns.get(weaponId) || 0) - now);
      base.cooldownLeft = left;
      base.cooldownSpan = spec.cooldownMs || 1;
      base.empty = left > 0;
      base.low = left > 0;
    }
    return base;
  }

  function setWeapon(id) {
    if (!BY_ID.has(id)) return false;
    current = id;
    magOf(id);
    reserveOf(id);
    if (isReloading() && reloading !== id) cancelReload();
    return true;
  }

  function reset() {
    mags.clear();
    reserves.clear();
    nextShotAt.clear();
    cooldowns.clear();
    cancelReload();
    current = "gun";
    magOf(current);
    reserveOf(current);
  }

  magOf(current);
  reserveOf(current);

  return {
    canFire,
    onFired,
    startReload,
    cancelReload,
    update,
    snapshot,
    setWeapon,
    reset,
    isReloading,
    reloadProgress,
    getWeapon: () => current,
  };
}
