import { os, MODES } from "../framework.js";
import { audioMixer } from "../audioMixer.js";
import { resolveYukiAsset } from "../shared/assetResolver.js";
import { StorageKeys } from "../StorageKeys.js";
import { parseBool } from "../utils/utils.js";

const SFX_BASE_PATH = "static/audio/win11";

const SCOPE_WINDOWS = "windows";
const SCOPE_SYSTEM = "system";

export const SystemSfx = Object.freeze({
  ERROR: "error",
  CRITICAL_STOP: "critical-stop",
  WARNING: "warning",
  NOTIFICATION: "notify",
  NOTIFICATION_SYSTEM: "notify-system",
  BALLOON: "balloon",
  BATTERY_LOW: "battery-low",
  BATTERY_CRITICAL: "battery-critical",
  MINIMIZE: "minimize",
  RESTORE: "restore",
  HARDWARE_INSERT: "hardware-insert",
  HARDWARE_REMOVE: "hardware-remove",
  HARDWARE_FAIL: "hardware-fail",
  RECYCLE: "recycle",
  STARTUP: "startup",
  LOGOFF: "logoff",
  SHUTDOWN: "shutdown",
  DING: "ding",
  MENU_COMMAND: "menu-command",
  DEFAULT: "default",
  BACKGROUND: "background",
  INFORMATION_BAR: "information-bar",
  PRINT_COMPLETE: "print-complete",
  NAVIGATION_START: "navigation-start",
  RING_IN: "ringin",
  TADA: "tada",
  NAV_BACK: "nav-back",
  NAV_INVOKE: "nav-invoke",
  NAV_NEXT: "nav-next",
  FOCUS_1: "focus-1",
});

const CATALOG = {
  [SystemSfx.ERROR]: { scope: SCOPE_SYSTEM, minGap: 120 },
  [SystemSfx.CRITICAL_STOP]: { scope: SCOPE_SYSTEM, minGap: 200 },
  [SystemSfx.WARNING]: { scope: SCOPE_SYSTEM, minGap: 200 },
  [SystemSfx.NOTIFICATION]: { scope: SCOPE_SYSTEM, minGap: 220 },
  [SystemSfx.NOTIFICATION_SYSTEM]: { scope: SCOPE_SYSTEM, minGap: 220 },
  [SystemSfx.BALLOON]: { scope: SCOPE_SYSTEM, minGap: 200 },
  [SystemSfx.BATTERY_LOW]: { scope: SCOPE_SYSTEM, minGap: 60000 },
  [SystemSfx.BATTERY_CRITICAL]: { scope: SCOPE_SYSTEM, minGap: 60000 },
  [SystemSfx.MINIMIZE]: { scope: SCOPE_SYSTEM, minGap: 120, volume: 0.8 },
  [SystemSfx.RESTORE]: { scope: SCOPE_SYSTEM, minGap: 120, volume: 0.8 },
  [SystemSfx.HARDWARE_INSERT]: { scope: SCOPE_SYSTEM, minGap: 250 },
  [SystemSfx.HARDWARE_REMOVE]: { scope: SCOPE_SYSTEM, minGap: 250 },
  [SystemSfx.HARDWARE_FAIL]: { scope: SCOPE_SYSTEM, minGap: 500 },
  [SystemSfx.RECYCLE]: { scope: SCOPE_SYSTEM, minGap: 120, volume: 0.75 },
  [SystemSfx.STARTUP]: { scope: SCOPE_SYSTEM, minGap: 5000 },
  [SystemSfx.LOGOFF]: { scope: SCOPE_SYSTEM, minGap: 3000 },
  [SystemSfx.SHUTDOWN]: { scope: SCOPE_SYSTEM, minGap: 3000 },
  [SystemSfx.DING]: { scope: SCOPE_SYSTEM, minGap: 150, volume: 0.8 },
  [SystemSfx.MENU_COMMAND]: { scope: SCOPE_SYSTEM, minGap: 60, volume: 0.55 },
  [SystemSfx.DEFAULT]: { scope: SCOPE_SYSTEM, minGap: 200 },
  [SystemSfx.BACKGROUND]: { scope: SCOPE_SYSTEM, minGap: 200 },
  [SystemSfx.INFORMATION_BAR]: { scope: SCOPE_SYSTEM, minGap: 200 },
  [SystemSfx.PRINT_COMPLETE]: { scope: SCOPE_SYSTEM, minGap: 1000 },
  [SystemSfx.NAVIGATION_START]: {
    scope: SCOPE_SYSTEM,
    minGap: 150,
    volume: 0.6,
  },
  [SystemSfx.RING_IN]: { scope: SCOPE_SYSTEM, minGap: 1000 },
  [SystemSfx.TADA]: { scope: SCOPE_SYSTEM, minGap: 1000 },
  [SystemSfx.NAV_BACK]: { scope: SCOPE_WINDOWS, minGap: 80, volume: 0.6 },
  [SystemSfx.NAV_INVOKE]: { scope: SCOPE_WINDOWS, minGap: 80, volume: 0.6 },
  [SystemSfx.NAV_NEXT]: { scope: SCOPE_WINDOWS, minGap: 80, volume: 0.55 },
  [SystemSfx.FOCUS_1]: { scope: SCOPE_SYSTEM, minGap: 60, volume: 0.45 },
};

const audioByKey = new Map();
const lastPlayedAt = new Map();

function isBlockedByMode() {
  return os.modes.isActive(MODES.MAC) || os.modes.isActive(MODES.CHROME_OS);
}

function isWindowsMode() {
  return os.modes.isActive(MODES.WIN11);
}

function isScopeAllowed(scope) {
  if (isBlockedByMode()) return false;
  if (scope === SCOPE_SYSTEM) return true;
  return isWindowsMode();
}

function resolveSfxUrl(key) {
  return resolveYukiAsset(`${SFX_BASE_PATH}/${key}.wav`);
}

function getVolumeLevel(mixer, entry, options) {
  const level = options.volume ?? entry.volume ?? 1;
  return mixer.masterVolume * mixer.systemVolume * level;
}

export function isSystemSfxEnabled() {
  return parseBool(os.storage.get(StorageKeys.windowsSfxEnabled), true);
}

export function setSystemSfxEnabled(enabled) {
  os.storage.set(StorageKeys.windowsSfxEnabled, String(Boolean(enabled)));
}

export function playSfx(key, options = {}) {
  const entry = CATALOG[key];
  if (!entry) return false;

  if (isBlockedByMode()) return false;
  if (!options.ignoreToggle && !isSystemSfxEnabled()) return false;
  if (!options.ignoreMode && !isScopeAllowed(entry.scope)) return false;

  const mixer = audioMixer();
  if (mixer.muted || mixer.systemAudioEnabled === false) return false;

  const now = Date.now();
  const minGap = options.minGap ?? entry.minGap ?? 60;
  const lastPlayed = lastPlayedAt.get(key) ?? 0;
  if (now - lastPlayed < minGap) return false;
  lastPlayedAt.set(key, now);

  const volume = getVolumeLevel(mixer, entry, options);
  if (!(volume > 0)) return false;

  let audio = audioByKey.get(key);
  if (!audio) {
    audio = new Audio(resolveSfxUrl(key));
    audio.preload = "auto";
    audioByKey.set(key, audio);
  }

  try {
    audio.volume = Math.min(1, volume);
    audio.currentTime = 0;
    const playback = audio.play();
    if (playback && typeof playback.catch === "function") {
      playback.catch(() => {});
    }
  } catch {
    return false;
  }
  return true;
}

export function startSfxLoop(key, options = {}) {
  const entry = CATALOG[key];
  if (!entry) return null;
  if (isBlockedByMode()) return null;
  if (!options.ignoreToggle && !isSystemSfxEnabled()) return null;
  if (!options.ignoreMode && !isScopeAllowed(entry.scope)) return null;

  const mixer = audioMixer();
  if (mixer.muted || mixer.systemAudioEnabled === false) return null;

  const volume = getVolumeLevel(mixer, entry, options);
  if (!(volume > 0)) return null;

  let audio;
  try {
    audio = new Audio(resolveSfxUrl(key));
    audio.loop = true;
    audio.volume = Math.min(1, volume);
    const playback = audio.play();
    if (playback && typeof playback.catch === "function") {
      playback.catch(() => {});
    }
  } catch {
    return null;
  }

  return {
    stop() {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {}
    },
  };
}
