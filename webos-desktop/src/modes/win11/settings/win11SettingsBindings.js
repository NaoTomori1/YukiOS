import { StorageKeys, os, BusEvents } from "../../../framework.js";
import { parseBool, downloadPage } from "../../../utils/utils.js";
import { $, createElement } from "../../../shared/domUtils.js";
import { audioMixer } from "../../../audioMixer.js";
import { performanceManager } from "../../../shared/performanceManager.js";
import { modeManager, MODES } from "../../../modeManager.js";
import { taskbarPositionManager } from "../../../desktopui/taskbarPositionManager.js";
import {
  getIconPack,
  setIconPack,
  ICON_PACKS,
} from "../../../shared/iconPack.js";
import {
  CM_STYLES,
  getContextMenuStyle,
  setContextMenuStyle,
} from "../../../shared/contextMenuStyle.js";
import {
  getStoredCustomColors,
  openCustomColorsDialog,
} from "../../../shared/customColorsDialog.js";
import {
  applyCursor,
  applyDesktopIconSize,
  applyDesktopStretchScrollDisabled,
  applyDockAnimationSpeed,
  applyDockIconSize,
  applyDockScale,
  applyFontFamily,
  applyFontSize,
  applyGuiScale,
  applyMikuCursor,
  applySound,
  applyStartMenuCats,
  applyStartMenuSize,
  applyTaskbarScale,
  applyTheme,
  applyTransparentUI,
  applyTransparencyBlur,
  applyTransparencyParts,
  applyTrayEnabled,
  applyUiDensity,
  applyVirtualResolution,
  applyWindowTransparency,
} from "../../../settings/settingsApply.js";
import { RESOLUTION_PRESETS } from "../../../resolution/resolutionManager.js";
import { WISP_SERVERS, isEpoxyOnlyWisp } from "../../../shared/wispConfig.js";
import {
  CDN_MIRRORS,
  setCdnMirror,
  initializeMirrors,
} from "../../../shared/assetResolver.js";
import { appMap } from "../../../games/gamesList.js";
import {
  CLOAK_PRESETS,
  DEFAULT_DECOY,
  PANIC_PRESETS,
} from "../../../stealth/tabCloak.js";
import { getBasicThemes } from "../../../shared/themeEngine.js";
import {
  getAvailableHeaderStyles,
  resolveHeaderStyleId,
} from "../../../windowManager/headerStyles.js";

export const WIN11_RESOLUTION_OPTIONS = RESOLUTION_PRESETS.map((preset) => ({
  value: preset.value,
  label: preset.label,
}));

export const WIN11_CDN_OPTIONS = CDN_MIRRORS.map((mirror) => ({
  value: mirror.id,
  label: mirror.name,
}));

export const WIN11_WISP_OPTIONS = [
  ...WISP_SERVERS.map((server) => ({ value: server.url, label: server.name })),
  { value: "custom", label: "Custom..." },
];

export const WIN11_CLOAK_OPTIONS = Object.entries(CLOAK_PRESETS).map(
  ([value, preset]) => ({
    value,
    label: value === "none" ? "None" : preset.label,
  }),
);

export const WIN11_PANIC_OPTIONS = Object.entries(PANIC_PRESETS).map(
  ([value, preset]) => ({ value, label: preset.label }),
);

export const WIN11_UI_DENSITY_OPTIONS = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
  { value: "spacious", label: "Spacious" },
];

export const WIN11_TRANSPORT_OPTIONS = [
  { value: "epoxy", label: "Epoxy (Wisp)" },
  { value: "libcurl", label: "libcurl (Wisp)" },
  { value: "bare", label: "Bare Server" },
];

export const WIN11_NOTIFICATION_POSITION_OPTIONS = [
  { value: "bottom-right", label: "Bottom Right (Default)" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "top-right", label: "Top Right" },
  { value: "top-left", label: "Top Left" },
];

export const WIN11_WINDOW_SWITCHER_MODE_OPTIONS = [
  { value: "mru", label: "Most Recently Used (MRU)" },
  { value: "stack", label: "Cycle / Stack Order" },
];

export const WIN11_WINDOW_SWITCHER_UI_OPTIONS = [
  { value: "overlay", label: "App Switcher Overlay (shows previews)" },
  { value: "direct", label: "Fast Switching (no visual UI)" },
];

export const WIN11_PERFORMANCE_OPTIONS = [
  { value: "high", label: "Quality" },
  { value: "balanced", label: "Balanced" },
  { value: "performance", label: "Performance" },
];

export const WIN11_ANIMATION_SPEED_OPTIONS = [
  { value: "3", label: "Slowest" },
  { value: "1.8", label: "Slow" },
  { value: "1", label: "Normal" },
  { value: "0.4", label: "Fast" },
  { value: "0.1", label: "Very Fast" },
];

export const WIN11_OPEN_ANIMATION_OPTIONS = [
  { value: "instant", label: "Instant (No Animation)" },
  { value: "fade", label: "Fade In" },
  { value: "scaleCenter", label: "Scale Center" },
  { value: "scaleFromSource", label: "Scale From Taskbar" },
  { value: "slideUp", label: "Slide Up" },
  { value: "slideLeft", label: "Slide In From Left" },
  { value: "slideRight", label: "Slide In From Right" },
  { value: "glassBlurin", label: "Glass Blur Transition" },
  { value: "elasticBounce", label: "Elastic Bounce" },
  { value: "blurReveal", label: "Blur Reveal" },
  { value: "perspective3D", label: "Perspective 3D" },
  { value: "cornerUnfold", label: "Corner Unfold" },
];

export const WIN11_CLOSE_ANIMATION_OPTIONS = [
  { value: "instant", label: "Instant (No Animation)" },
  { value: "scaleDownCenter", label: "Scale Down Center" },
  { value: "scaleToOrigin", label: "Scale to Taskbar Origin" },
  { value: "zoomToDock", label: "Zoom to Dock (macOS)" },
  { value: "fadeOut", label: "Fade Out Only" },
  { value: "slideDown", label: "Slide Down Exit" },
  { value: "burn", label: "Window Burn Close" },
  { value: "shrinkToPoint", label: "Shrink to Point" },
  { value: "dissolveBlur", label: "Dissolve with Blur" },
  { value: "fallApart", label: "Fall Apart" },
];

export const WIN11_MINIMIZE_ANIMATION_OPTIONS = [
  { value: "instant", label: "Instant (No Animation)" },
  { value: "taskbarShrink", label: "Taskbar Shrink" },
  { value: "dockZoomShrink", label: "Dock Zoom Shrink" },
  { value: "magicLamp", label: "Magic Lamp Warp" },
  { value: "fadeToTaskbar", label: "Fade to Taskbar" },
  { value: "elasticStretch", label: "Elastic Stretch" },
  { value: "spiralDown", label: "Spiral Down" },
];

export const WIN11_RESTORE_ANIMATION_OPTIONS = [
  { value: "fromTaskbar", label: "From Taskbar" },
  { value: "scaleCenter", label: "Scale Center" },
  { value: "fade", label: "Fade In" },
  { value: "slideUp", label: "Slide Up" },
  { value: "genieFromDock", label: "Genie From Dock" },
  { value: "instant", label: "Instant (No Animation)" },
];

export const WIN11_FONT_FAMILY_OPTIONS = [
  { value: "opensans", label: "Open Sans" },
  { value: "inter", label: "Inter" },
  { value: "rubik", label: "Rubik" },
  { value: "sora", label: "Sora" },
  { value: "jetbrainsmono", label: "JetBrains Mono" },
  { value: "monocraft", label: "Monocraft" },
];

export const WIN11_THEME_OPTIONS = getBasicThemes().map((theme) => ({
  value: theme.value,
  label: theme.label,
}));

export const WIN11_HEADER_STYLE_OPTIONS = getAvailableHeaderStyles().map(
  (style) => ({ value: style.id, label: style.label }),
);

export const WIN11_ICON_PACK_OPTIONS = [
  { value: ICON_PACKS.PAPIRUS, label: "Papirus" },
  { value: ICON_PACKS.FA, label: "Font Awesome" },
];

export const WIN11_CONTEXT_MENU_OPTIONS = [
  { value: CM_STYLES.YUKIOS, label: "YukiOS" },
  { value: CM_STYLES.WIN11, label: "Windows 11" },
];

const registry = new Map();

export function registerWin11Binding(key, entry) {
  registry.set(key, entry);
}

export function getWin11Binding(key) {
  return registry.get(key) || null;
}

export function getWin11Value(key) {
  const entry = registry.get(key);
  if (!entry || typeof entry.read !== "function") return undefined;
  try {
    return entry.read();
  } catch {
    return undefined;
  }
}

export function applyWin11Value(key, value) {
  const entry = registry.get(key);
  if (!entry || typeof entry.apply !== "function") return;
  entry.apply(value);
  os.events.emit(BusEvents.SETTINGS_CHANGED, { key, value });
}

function readStored(key, fallback) {
  const raw = os.storage.get(key);
  if (raw === null || raw === undefined || raw === "") return fallback;
  return raw;
}

function readStoredNumber(key, fallback) {
  const raw = Number(os.storage.get(key));
  return Number.isFinite(raw) ? raw : fallback;
}

function readStoredBool(key, fallback = false) {
  const raw = os.storage.get(key);
  if (raw === null || raw === undefined) return fallback;
  return parseBool(raw, fallback);
}

function readTransparencyParts() {
  const raw = os.storage.get(StorageKeys.transparencyParts);
  if (!raw) {
    return {
      taskbar: true,
      windowHeader: true,
      windowBody: false,
      startMenu: false,
      contextMenus: false,
      tray: false,
    };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      taskbar: !!parsed.taskbar,
      windowHeader: !!parsed.windowHeader,
      windowBody: !!parsed.windowBody,
      startMenu: !!parsed.startMenu,
      contextMenus: !!parsed.contextMenus,
      tray: !!parsed.tray,
    };
  } catch {
    return {
      taskbar: true,
      windowHeader: true,
      windowBody: false,
      startMenu: false,
      contextMenus: false,
      tray: false,
    };
  }
}

function writeTransparencyPart(part, enabled) {
  const parts = readTransparencyParts();
  parts[part] = enabled;
  os.storage.set(StorageKeys.transparencyParts, JSON.stringify(parts));
  applyTransparencyParts(parts);
}

function readTransparencyBlur() {
  const raw = os.storage.get(StorageKeys.transparencyBlur);
  if (!raw) {
    return {
      window: 40,
      taskbar: 32,
      startMenu: 32,
      context: 20,
      tray: 32,
    };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      window: Number(parsed.window) || 40,
      taskbar: Number(parsed.taskbar) || 32,
      startMenu: Number(parsed.startMenu) || 32,
      context: Number(parsed.context) || 20,
      tray: Number(parsed.tray) || 32,
    };
  } catch {
    return {
      window: 40,
      taskbar: 32,
      startMenu: 32,
      context: 20,
      tray: 32,
    };
  }
}

function writeTransparencyBlur(part, value) {
  const blur = readTransparencyBlur();
  blur[part] = value;
  os.storage.set(StorageKeys.transparencyBlur, JSON.stringify(blur));
  applyTransparencyBlur(blur);
}

function readStartMenuCats() {
  const raw = os.storage.get(StorageKeys.startMenuCats);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStartMenuCat(cat, enabled) {
  const cats = readStartMenuCats();
  cats[cat] = enabled;
  os.storage.set(StorageKeys.startMenuCats, cats);
  applyStartMenuCats(cats);
}

function currentGuiScale() {
  return readStoredNumber(StorageKeys.guiScale, 100);
}

function currentMasterVolume() {
  return readStoredNumber(StorageKeys.masterVolume, 1);
}

function currentSystemVolume() {
  return readStoredNumber(StorageKeys.systemVolume, 1);
}

registerWin11Binding("weather", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.weather, true),
  apply: (value) => os.storage.set(StorageKeys.weather, String(value)),
});

registerWin11Binding("clippy", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.clippy, false),
  apply: (value) => os.storage.set(StorageKeys.clippy, String(value)),
});

registerWin11Binding("clipboardManager", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.clipboardManagerEnabled, true),
  apply: (value) =>
    os.storage.set(StorageKeys.clipboardManagerEnabled, String(value)),
});

registerWin11Binding("cursorEffect", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.cursorEffectEnabled, true),
  apply: (value) =>
    os.storage.set(StorageKeys.cursorEffectEnabled, String(value)),
});

registerWin11Binding("performanceMode", {
  type: "segment",
  read: () => readStored(StorageKeys.performanceMode, "high"),
  apply: (value) => {
    os.storage.set(StorageKeys.performanceMode, value);
    performanceManager.setMode(value);
  },
});

registerWin11Binding("physicsChaos", {
  type: "action",
  apply: () => {
    import("../../../shared/desktopPhysics.js").then((module) =>
      module.togglePhysicsChaos(),
    );
  },
});

registerWin11Binding("disableBootScreen", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.disableBootScreen, false),
  apply: (value) =>
    os.storage.set(StorageKeys.disableBootScreen, String(value)),
});

registerWin11Binding("windowSessionPersistence", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.windowSessionPersistence, true),
  apply: (value) =>
    os.storage.set(StorageKeys.windowSessionPersistence, String(value)),
});

registerWin11Binding("lockScreen", {
  type: "action",
  apply: () => os.app.lockSession(),
});

registerWin11Binding("guiScale", {
  type: "slider",
  read: () => currentGuiScale(),
  apply: (value) => {
    os.storage.set(StorageKeys.guiScale, String(value));
    applyGuiScale(value);
    applyVirtualResolution(
      readStored(StorageKeys.virtualResolution, "native"),
      value,
    );
  },
});

registerWin11Binding("fontSize", {
  type: "slider",
  read: () => readStoredNumber(StorageKeys.fontSize, 100),
  apply: (value) => {
    os.storage.set(StorageKeys.fontSize, String(value));
    applyFontSize(value);
  },
});

registerWin11Binding("uiDensity", {
  type: "segment",
  read: () => readStored(StorageKeys.uiDensity, "comfortable"),
  apply: (value) => {
    os.storage.set(StorageKeys.uiDensity, value);
    applyUiDensity(value);
  },
});

registerWin11Binding("virtualResolution", {
  type: "select",
  read: () => readStored(StorageKeys.virtualResolution, "native"),
  apply: (value) => {
    os.storage.set(StorageKeys.virtualResolution, value);
    applyVirtualResolution(value, currentGuiScale());
  },
});

registerWin11Binding("fontFamily", {
  type: "select",
  read: () => readStored(StorageKeys.fontFamily, "opensans"),
  apply: (value) => {
    os.storage.set(StorageKeys.fontFamily, value);
    applyFontFamily(value);
  },
});

registerWin11Binding("soundEnabled", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.soundEnabled, true),
  apply: (value) => {
    os.storage.set(StorageKeys.soundEnabled, String(value));
    applySound(value, currentMasterVolume());
  },
});

registerWin11Binding("masterVolume", {
  type: "slider",
  read: () => Math.round(currentMasterVolume() * 100),
  apply: (value) => {
    const ratio = value / 100;
    os.storage.set(StorageKeys.masterVolume, String(ratio));
    if (readStoredBool(StorageKeys.soundEnabled, true)) {
      audioMixer().setMaster(ratio);
    }
  },
});

registerWin11Binding("systemAudioEnabled", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.systemAudioEnabled, true),
  apply: (value) => {
    os.storage.set(StorageKeys.systemAudioEnabled, String(value));
    audioMixer().setSystemVolume(value ? currentSystemVolume() : 0);
  },
});

registerWin11Binding("systemVolume", {
  type: "slider",
  read: () => Math.round(currentSystemVolume() * 100),
  apply: (value) => {
    const ratio = value / 100;
    os.storage.set(StorageKeys.systemVolume, String(ratio));
    if (readStoredBool(StorageKeys.systemAudioEnabled, true)) {
      audioMixer().setSystemVolume(ratio);
    }
  },
});

registerWin11Binding("windowsSfxEnabled", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.windowsSfxEnabled, true),
  apply: (value) =>
    os.storage.set(StorageKeys.windowsSfxEnabled, String(value)),
});

registerWin11Binding("notificationsEnabled", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.notificationsEnabled, true),
  apply: (value) =>
    os.storage.set(StorageKeys.notificationsEnabled, String(value)),
});

registerWin11Binding("notificationsRemoveTimeout", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.notificationsRemoveTimeout, true),
  apply: (value) =>
    os.storage.set(StorageKeys.notificationsRemoveTimeout, String(value)),
});

registerWin11Binding("notificationsPopAnimation", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.notificationsPopAnimation, true),
  apply: (value) =>
    os.storage.set(StorageKeys.notificationsPopAnimation, String(value)),
});

registerWin11Binding("notificationsOverFullscreen", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.notificationsOverFullscreen, false),
  apply: (value) =>
    os.storage.set(StorageKeys.notificationsOverFullscreen, String(value)),
});

registerWin11Binding("notificationsDuration", {
  type: "slider",
  read: () => readStoredNumber(StorageKeys.notificationsDuration, 5),
  apply: (value) =>
    os.storage.set(StorageKeys.notificationsDuration, String(value)),
});

registerWin11Binding("notificationsPosition", {
  type: "select",
  read: () => readStored(StorageKeys.notificationsPosition, "bottom-right"),
  apply: (value) => os.storage.set(StorageKeys.notificationsPosition, value),
});

registerWin11Binding("dnd", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.dndKey, false),
  apply: (value) => {
    os.storage.set(StorageKeys.dndKey, String(value));
    os.notify.setDoNotDisturb(value);
  },
});

registerWin11Binding("disableDesktopStretchScroll", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.disableDesktopStretchScroll, true),
  apply: (value) => {
    os.storage.set(StorageKeys.disableDesktopStretchScroll, String(value));
    applyDesktopStretchScrollDisabled(value);
  },
});

registerWin11Binding("showWorkspace", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.showWorkspace, true),
  apply: (value) => os.storage.set(StorageKeys.showWorkspace, String(value)),
});

registerWin11Binding("hideDesktopIcons", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.hideDesktopIcons, false),
  apply: (value) => os.storage.set(StorageKeys.hideDesktopIcons, String(value)),
});

registerWin11Binding("taskbarPosition", {
  type: "segment",
  read: () => readStored(StorageKeys.taskbarPosition, "bottom"),
  apply: (value) => {
    os.storage.set(StorageKeys.taskbarPosition, value);
    taskbarPositionManager.setPosition(value);
  },
});

registerWin11Binding("taskbarAlignment", {
  type: "segment",
  read: () => readStored(StorageKeys.taskbarAlignment, "left"),
  apply: (value) => {
    os.storage.set(StorageKeys.taskbarAlignment, value);
    taskbarPositionManager.setAlignment(value);
  },
});

registerWin11Binding("taskbarShowLabels", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.taskbarShowLabels, false),
  apply: (value) =>
    os.storage.set(StorageKeys.taskbarShowLabels, String(value)),
});

registerWin11Binding("desktopIconSize", {
  type: "slider",
  read: () => readStoredNumber(StorageKeys.desktopIconSize, 48),
  apply: (value) => {
    os.storage.set(StorageKeys.desktopIconSize, String(value));
    applyDesktopIconSize(value);
  },
});

registerWin11Binding("taskbarScale", {
  type: "slider",
  read: () => readStoredNumber(StorageKeys.taskbarScale, 100),
  apply: (value) => {
    os.storage.set(StorageKeys.taskbarScale, String(value));
    applyTaskbarScale(value);
  },
});

registerWin11Binding("startMenuWidth", {
  type: "slider",
  read: () => readStoredNumber(StorageKeys.startMenuWidth, 650),
  apply: (value) => {
    os.storage.set(StorageKeys.startMenuWidth, String(value));
    applyStartMenuSize(
      value,
      readStoredNumber(StorageKeys.startMenuHeight, 500),
    );
  },
});

registerWin11Binding("startMenuHeight", {
  type: "slider",
  read: () => readStoredNumber(StorageKeys.startMenuHeight, 500),
  apply: (value) => {
    os.storage.set(StorageKeys.startMenuHeight, String(value));
    applyStartMenuSize(
      readStoredNumber(StorageKeys.startMenuWidth, 650),
      value,
    );
  },
});

["menu", "games", "system", "favorites", "settingsApp"].forEach((cat) => {
  registerWin11Binding(`startMenuCat_${cat}`, {
    type: "toggle",
    read: () => readStartMenuCats()[cat] !== false,
    apply: (value) => writeStartMenuCat(cat, value),
  });
});

registerWin11Binding("trayEnabled", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.trayEnabled, true),
  apply: (value) => {
    os.storage.set(StorageKeys.trayEnabled, String(value));
    applyTrayEnabled(value);
  },
});

registerWin11Binding("windowSwitcherMode", {
  type: "select",
  read: () => readStored(StorageKeys.windowSwitcherMode, "mru"),
  apply: (value) => os.storage.set(StorageKeys.windowSwitcherMode, value),
});

registerWin11Binding("windowSwitcherUI", {
  type: "select",
  read: () => readStored(StorageKeys.windowSwitcherUI, "overlay"),
  apply: (value) => os.storage.set(StorageKeys.windowSwitcherUI, value),
});

registerWin11Binding("windowSwitcherIncludeMinimized", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.windowSwitcherIncludeMinimized, true),
  apply: (value) =>
    os.storage.set(StorageKeys.windowSwitcherIncludeMinimized, String(value)),
});

registerWin11Binding("dockEnabled", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.dockEnabled, false),
  apply: (value) => {
    os.storage.set(StorageKeys.dockEnabled, String(value));
    if (value) modeManager.enter(MODES.MAC);
    else modeManager.exit(MODES.MAC);
  },
});

registerWin11Binding("dockPosition", {
  type: "segment",
  read: () => readStored(StorageKeys.dockPosition, "bottom"),
  apply: (value) => os.storage.set(StorageKeys.dockPosition, value),
});

registerWin11Binding("dockAutoHide", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.dockAutoHide, false),
  apply: (value) => os.storage.set(StorageKeys.dockAutoHide, String(value)),
});

registerWin11Binding("dockMagnification", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.dockMagnification, true),
  apply: (value) =>
    os.storage.set(StorageKeys.dockMagnification, String(value)),
});

registerWin11Binding("dockMagnifyAmount", {
  type: "slider",
  read: () => readStoredNumber(StorageKeys.dockMagnifyAmount, 1.2),
  apply: (value) =>
    os.storage.set(StorageKeys.dockMagnifyAmount, String(value)),
});

registerWin11Binding("dockMagnifyRange", {
  type: "slider",
  read: () => readStoredNumber(StorageKeys.dockMagnifyRange, 3),
  apply: (value) => os.storage.set(StorageKeys.dockMagnifyRange, String(value)),
});

registerWin11Binding("dockIconSize", {
  type: "slider",
  read: () => readStoredNumber(StorageKeys.dockIconSize, 43),
  apply: (value) => {
    os.storage.set(StorageKeys.dockIconSize, String(value));
    applyDockIconSize(value);
  },
});

registerWin11Binding("dockScale", {
  type: "slider",
  read: () => readStoredNumber(StorageKeys.dockScale, 100),
  apply: (value) => {
    os.storage.set(StorageKeys.dockScale, String(value));
    applyDockScale(value);
  },
});

registerWin11Binding("dockAnimationSpeed", {
  type: "slider",
  read: () => readStoredNumber(StorageKeys.dockAnimationSpeed, 0.2),
  apply: (value) => {
    os.storage.set(StorageKeys.dockAnimationSpeed, String(value));
    applyDockAnimationSpeed(value);
  },
});

registerWin11Binding("theme", {
  type: "select",
  read: () => readStored(StorageKeys.theme, "dark"),
  apply: (value) => {
    os.storage.set(StorageKeys.theme, value);
    applyTheme(value, getStoredCustomColors);
  },
});

registerWin11Binding("iconPack", {
  type: "segment",
  read: () => getIconPack(),
  apply: (value) => setIconPack(value),
});

registerWin11Binding("contextMenuStyle", {
  type: "segment",
  read: () => getContextMenuStyle(),
  apply: (value) => setContextMenuStyle(value),
});

registerWin11Binding("headerStyle", {
  type: "select",
  read: () => resolveHeaderStyleId(),
  apply: (value) => {
    os.storage.set(StorageKeys.windowHeaderStyle, value);
    os.events.emit(BusEvents.SETTINGS_CHANGED, { headerStyle: value });
  },
});

registerWin11Binding("customColors", {
  type: "action",
  apply: () => openCustomColorsDialog(),
});
registerWin11Binding("windowTransparency", {
  type: "slider",
  read: () =>
    Math.round(readStoredNumber(StorageKeys.windowTransparency, 1) * 100),
  apply: (value) => {
    os.storage.set(StorageKeys.windowTransparency, String(value / 100));
    applyWindowTransparency(value / 100);
  },
});

registerWin11Binding("transparentUI", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.transparentUI, true),
  apply: (value) => {
    os.storage.set(StorageKeys.transparentUI, String(value));
    applyTransparentUI(value);
  },
});

[
  "taskbar",
  "windowHeader",
  "windowBody",
  "startMenu",
  "contextMenus",
  "tray",
].forEach((part) => {
  registerWin11Binding(`tp_${part}`, {
    type: "toggle",
    read: () => readTransparencyParts()[part],
    apply: (value) => writeTransparencyPart(part, value),
  });
});

["window", "taskbar", "startMenu", "context", "tray"].forEach((part) => {
  registerWin11Binding(`blur_${part}`, {
    type: "slider",
    read: () => readTransparencyBlur()[part],
    apply: (value) => writeTransparencyBlur(part, value),
  });
});

registerWin11Binding("cycleWallpaper", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.cycleWallpaper, true),
  apply: (value) => os.storage.set(StorageKeys.cycleWallpaper, String(value)),
});

registerWin11Binding("wallpaperEngine", {
  type: "action",
  apply: () => os.app.launch("wallpaperEngineApp"),
});

registerWin11Binding("windowOpenAnimation", {
  type: "select",
  read: () => readStored(StorageKeys.windowOpenAnimation, "scaleCenter"),
  apply: (value) => os.storage.set(StorageKeys.windowOpenAnimation, value),
});

registerWin11Binding("windowCloseAnimation", {
  type: "select",
  read: () => readStored(StorageKeys.windowCloseAnimation, "scaleDownCenter"),
  apply: (value) => os.storage.set(StorageKeys.windowCloseAnimation, value),
});

registerWin11Binding("windowMinimizeAnimation", {
  type: "select",
  read: () => readStored(StorageKeys.windowMinimizeAnimation, "taskbarShrink"),
  apply: (value) => os.storage.set(StorageKeys.windowMinimizeAnimation, value),
});

registerWin11Binding("windowRestoreAnimation", {
  type: "select",
  read: () => readStored(StorageKeys.windowRestoreAnimation, "fromTaskbar"),
  apply: (value) => os.storage.set(StorageKeys.windowRestoreAnimation, value),
});

registerWin11Binding("windowAnimationSpeed", {
  type: "select",
  read: () => String(readStoredNumber(StorageKeys.windowAnimationSpeed, 1)),
  apply: (value) =>
    os.storage.set(StorageKeys.windowAnimationSpeed, String(value)),
});

registerWin11Binding("clickBubble", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.clickBubbleFeedback, false),
  apply: (value) =>
    os.storage.set(StorageKeys.clickBubbleFeedback, String(value)),
});

registerWin11Binding("wobblyWindows", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.wobblyWindows, false),
  apply: (value) => os.storage.set(StorageKeys.wobblyWindows, String(value)),
});

registerWin11Binding("wobbleSpringK", {
  type: "slider",
  read: () => readStoredNumber(StorageKeys.wobbleSpringK, 170),
  apply: (value) => os.storage.set(StorageKeys.wobbleSpringK, String(value)),
});

registerWin11Binding("wobbleDamping", {
  type: "slider",
  read: () => readStoredNumber(StorageKeys.wobbleDamping, 15),
  apply: (value) => os.storage.set(StorageKeys.wobbleDamping, String(value)),
});

registerWin11Binding("wobbleMass", {
  type: "slider",
  read: () => readStoredNumber(StorageKeys.wobbleMass, 1),
  apply: (value) => os.storage.set(StorageKeys.wobbleMass, String(value)),
});

registerWin11Binding("wobbleDragLag", {
  type: "slider",
  read: () => readStoredNumber(StorageKeys.wobbleDragLag, 0.55),
  apply: (value) => os.storage.set(StorageKeys.wobbleDragLag, String(value)),
});

registerWin11Binding("wobbleCoupleK", {
  type: "slider",
  read: () => readStoredNumber(StorageKeys.wobbleCoupleK, 90),
  apply: (value) => os.storage.set(StorageKeys.wobbleCoupleK, String(value)),
});

registerWin11Binding("cursorUpload", {
  type: "action",
  apply: () => {
    import("../../../shared/domUtils.js").then((module) => {
      const input = module.createElement("input");
      input.type = "file";
      input.accept = "image/png,image/jpeg,image/gif,image/webp";
      input.style.display = "none";
      document.body.appendChild(input);
      input.addEventListener("change", () => {
        const file = input.files?.[0];
        input.remove();
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          os.storage.set(StorageKeys.cursorOriginalKey, String(reader.result));
          os.storage.set(StorageKeys.cursorKey, String(reader.result));
          applyCursor(String(reader.result));
        };
        reader.readAsDataURL(file);
      });
      input.click();
    });
  },
});

registerWin11Binding("cursorClear", {
  type: "action",
  apply: () => {
    os.storage.remove(StorageKeys.cursorKey);
    os.storage.remove(StorageKeys.cursorOriginalKey);
    applyCursor("");
  },
});

registerWin11Binding("cursorSize", {
  type: "slider",
  read: () => readStoredNumber(StorageKeys.cursorSizeKey, 32),
  apply: (value) => os.storage.set(StorageKeys.cursorSizeKey, String(value)),
});

registerWin11Binding("mikuCursor", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.mikuCursor, true),
  apply: (value) => {
    os.storage.set(StorageKeys.mikuCursor, String(value));
    applyMikuCursor(value);
  },
});

registerWin11Binding("cdnMirror", {
  type: "select",
  read: () => readStored(StorageKeys.cdnMirror, "jsdelivr"),
  apply: (value) => {
    os.storage.set(StorageKeys.cdnMirror, value);
    setCdnMirror(value);
    initializeMirrors(appMap);
  },
});

registerWin11Binding("wispServer", {
  type: "select",
  read: () => readStored(StorageKeys.wispServer, WISP_SERVERS[0].url),
  apply: (value) => {
    if (value === "custom") return;
    os.storage.set(StorageKeys.wispServer, value);
    if (isEpoxyOnlyWisp(value)) {
      os.storage.set(StorageKeys.browserTransport, "epoxy");
    }
  },
});

registerWin11Binding("customWispUrl", {
  type: "text",
  read: () => readStored(StorageKeys.wispServer, ""),
  apply: (value) => {
    const url = String(value || "").trim();
    if (!url) return;
    os.storage.set(StorageKeys.wispServer, url);
    if (isEpoxyOnlyWisp(url)) {
      os.storage.set(StorageKeys.browserTransport, "epoxy");
    }
  },
});

registerWin11Binding("browserTransport", {
  type: "segment",
  read: () => readStored(StorageKeys.browserTransport, "epoxy"),
  apply: (value) => {
    if (
      value !== "epoxy" &&
      isEpoxyOnlyWisp(readStored(StorageKeys.wispServer, ""))
    ) {
      return;
    }
    os.storage.set(StorageKeys.browserTransport, value);
  },
});

registerWin11Binding("achievements", {
  type: "toggle",
  read: () => !readStoredBool(StorageKeys.achievementsDisabled, false),
  apply: (value) =>
    os.storage.set(StorageKeys.achievementsDisabled, String(!value)),
});

registerWin11Binding("analytics", {
  type: "toggle",
  read: () => !readStoredBool(StorageKeys.analyticsDisabled, false),
  apply: (value) =>
    os.storage.set(StorageKeys.analyticsDisabled, String(!value)),
});

registerWin11Binding("ads", {
  type: "toggle",
  read: () => !readStoredBool(StorageKeys.adsDisabled, false),
  apply: (value) => os.storage.set(StorageKeys.adsDisabled, String(!value)),
});

registerWin11Binding("friendsActivity", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.friendsLiveActivity, true),
  apply: (value) =>
    os.storage.set(StorageKeys.friendsLiveActivity, String(value)),
});

registerWin11Binding("tabCloak", {
  type: "select",
  read: () => readStored(StorageKeys.tabCloak, "none"),
  apply: (value) => os.storage.set(StorageKeys.tabCloak, value),
});

registerWin11Binding("aboutBlankDecoy", {
  type: "text",
  read: () => readStored(StorageKeys.tabCloakDecoy, DEFAULT_DECOY),
  apply: (value) =>
    os.storage.set(StorageKeys.tabCloakDecoy, String(value || DEFAULT_DECOY)),
});

registerWin11Binding("beforeunload", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.beforeunloadProtect, false),
  apply: (value) =>
    os.storage.set(StorageKeys.beforeunloadProtect, String(value)),
});

registerWin11Binding("autoCloakOnBoot", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.autoCloakOnBoot, false),
  apply: (value) => os.storage.set(StorageKeys.autoCloakOnBoot, String(value)),
});

registerWin11Binding("panicKey", {
  type: "action",
  apply: () => {
    os.dialog
      .prompt(
        "Panic Key",
        "Press the key combination you want to use as the panic shortcut.",
        readStored(StorageKeys.panicKey, ""),
      )
      .then((value) => {
        if (value === null) return;
        os.storage.set(StorageKeys.panicKey, value);
      });
  },
});

registerWin11Binding("panicPreset", {
  type: "select",
  read: () => "classroom",
  apply: (value) => {
    const preset = PANIC_PRESETS[value];
    if (!preset) return;
    os.storage.set(StorageKeys.panicUrl, preset.url);
  },
});

registerWin11Binding("panicUrl", {
  type: "text",
  read: () => readStored(StorageKeys.panicUrl, ""),
  apply: (value) => os.storage.set(StorageKeys.panicUrl, String(value || "")),
});

registerWin11Binding("aboutBlankNow", {
  type: "action",
  apply: () => {
    window.open("about:blank", "_blank");
  },
});

registerWin11Binding("exportData", {
  type: "action",
  apply: () => {
    import("../../../settings/settingsData.js").then((module) =>
      module.exportData(os.fileSystemManager, (message) =>
        os.notify.send("Settings", message, { type: "info" }),
      ),
    );
  },
});

registerWin11Binding("importData", {
  type: "action",
  apply: () => {
    import("../../../settings/settingsData.js").then((module) =>
      module.importData(os.fileSystemManager, (message) =>
        os.notify.send("Settings", message, { type: "info" }),
      ),
    );
  },
});

registerWin11Binding("deleteAllData", {
  type: "action",
  apply: () => {
    import("../../../settings/settingsData.js").then((module) =>
      module.deleteAllData(),
    );
  },
});

registerWin11Binding("downloadPage", {
  type: "action",
  apply: () => {
    downloadPage((message) =>
      os.notify.send("Settings", message, { type: "info" }),
    );
  },
});

registerWin11Binding("installedApps", {
  type: "action",
  apply: () => os.app.launch("systemAppsApp"),
});

registerWin11Binding("defaultApps", {
  type: "action",
  apply: () => os.app.launch("defaultApps"),
});

registerWin11Binding("magnifier", {
  type: "action",
  apply: () => os.app.launch("magnifierApp"),
});

registerWin11Binding("camera", {
  type: "action",
  apply: () => os.app.launch("cameraApp"),
});

registerWin11Binding("clock", {
  type: "action",
  apply: () => os.app.launch("clockApp"),
});

registerWin11Binding("remoteHost", {
  type: "action",
  apply: () => os.app.launch("remoteHostApp"),
});

registerWin11Binding("win11TaskbarAlign", {
  type: "segment",
  read: () => readStored(StorageKeys.win11TaskbarAlign, "center"),
  apply: (value) => {
    os.storage.set(StorageKeys.win11TaskbarAlign, value);
    const tasksCont = $("#taskbar .tasksCont");
    if (tasksCont) tasksCont.setAttribute("data-side", value);
  },
});

registerWin11Binding("checkUpdates", {
  type: "action",
  apply: () => {
    import("../../../versionChecker.js").then((module) =>
      module.versionChecker.check(),
    );
  },
});

registerWin11Binding("sidebarCompact", {
  type: "toggle",
  read: () => readStoredBool(StorageKeys.sidebarCompact, true),
  apply: (value) => os.storage.set(StorageKeys.sidebarCompact, String(value)),
});

registerWin11Binding("uploadWallpaper", {
  type: "action",
  apply: () => {
    const app = os.app.getInstance("wallpaperEngineApp");
    if (!app || typeof app.uploadAndSetWallpaper !== "function") return;
    const input = createElement("input");
    input.type = "file";
    input.accept = "image/*,video/*,.gif";
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener("change", async () => {
      const files = input.files;
      input.remove();
      if (!files || !files.length) return;
      await app.uploadAndSetWallpaper(files);
    });
    input.click();
  },
});

registerWin11Binding("resetToggles", {
  type: "action",
  apply: () => {
    const defaults = [
      [StorageKeys.weather, true],
      [StorageKeys.cycleWallpaper, true],
      [StorageKeys.sidebarCompact, true],
      [StorageKeys.clippy, false],
      [StorageKeys.achievementsDisabled, false],
      [StorageKeys.analyticsDisabled, false],
      [StorageKeys.adsDisabled, false],
      [StorageKeys.disableDesktopStretchScroll, false],
      [StorageKeys.showWorkspace, true],
      [StorageKeys.disableBootScreen, false],
      [StorageKeys.performanceMode, "high"],
    ];
    defaults.forEach(([key, value]) => os.storage.set(key, String(value)));
    applyDesktopStretchScrollDisabled(false);
    performanceManager.setMode("high");
    os.events.emit(BusEvents.SETTINGS_CHANGED, {});
    os.notify.send("Settings", "Toggles reset", { type: "info" });
  },
});

registerWin11Binding("resetSaved", {
  type: "action",
  apply: () => {
    os.events.emit(BusEvents.SETTINGS_CHANGED, {});
    os.notify.send("Settings", "Reset to saved values", { type: "info" });
  },
});

registerWin11Binding("cursorStatus", {
  type: "custom",
  render: () => `<div class="win11-empty">Checking cursor</div>`,
  bind: (host) => {
    const dataUrl = os.storage.get(StorageKeys.cursorOriginalKey) || "";
    host.innerHTML = dataUrl
      ? `<div class="win11-note">Custom cursor enabled</div>`
      : `<div class="win11-note">Default cursor</div>`;
  },
});
