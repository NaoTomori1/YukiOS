import { os, StorageKeys } from "../../framework.js";
import { SystemUtilities } from "../../system.js";

export const CHAOS_WALLPAPER = "/static/wallpapers/win10.webp";
export const RAGE_WALLPAPER = "/static/wallpapers/redwin10.jpg";

const SNAPSHOT_KEYS = [
  StorageKeys.wallpaperKey,
  StorageKeys.wallpaperType,
  StorageKeys.manualWallpaper,
  StorageKeys.cycleWallpaper,
  StorageKeys.vantaWallpaper,
];

let snapshot = null;
let activeUrl = "";
let rageApplied = false;

function applyUrl(url) {
  if (!url || activeUrl === url) return;
  try {
    activeUrl = url;
    const result = SystemUtilities.setWallpaper(url);
    if (result && typeof result.catch === "function") {
      result.catch(() => {});
    }
  } catch {}
}

export function activateChaosWallpaper() {
  try {
    if (!snapshot) {
      const saved = {};
      for (let i = 0; i < SNAPSHOT_KEYS.length; i++) {
        const key = SNAPSHOT_KEYS[i];
        saved[key] = os.storage.get(key);
      }
      snapshot = saved;
    }
    rageApplied = false;
    applyUrl(CHAOS_WALLPAPER);
  } catch {}
}

export function setRageWallpaper() {
  try {
    if (!snapshot || rageApplied) return;
    rageApplied = true;
    applyUrl(RAGE_WALLPAPER);
  } catch {}
}

export function clearRageWallpaper() {
  try {
    if (!snapshot || !rageApplied) return;
    rageApplied = false;
    applyUrl(CHAOS_WALLPAPER);
  } catch {}
}

export function restoreWallpaper() {
  try {
    if (!snapshot) return;
    for (let i = 0; i < SNAPSHOT_KEYS.length; i++) {
      const key = SNAPSHOT_KEYS[i];
      const value = snapshot[key];
      if (value === undefined || value === null) os.storage.remove(key);
      else os.storage.set(key, value);
    }
  } catch {}
  snapshot = null;
  rageApplied = false;
  activeUrl = "";
  try {
    const result = SystemUtilities.loadWallpaper();
    if (result && typeof result.catch === "function") {
      result.catch(() => {});
    }
  } catch {}
}

export function isChaosWallpaperActive() {
  return !!snapshot;
}