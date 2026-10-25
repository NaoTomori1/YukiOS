import {
  $,
  BusEvents,
  StorageKeys,
  bindEvent,
  os,
  setHTML,
  toggleClass,
} from "../../../../framework.js";
import {
  getWin11Binding,
  getWin11Value,
  registerWin11Binding,
} from "../win11SettingsBindings.js";
import { select, slider, subHeading, toggle } from "../win11Controls.js";

const DEFAULT_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";

const BAR_POSITION_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
];

const LAYOUT_OPTIONS = [
  { value: "bsp", label: "BSP" },
  { value: "master-stack", label: "Master-Stack" },
];

const EASING_OPTIONS = [
  { value: "cubic-bezier(0.16, 1, 0.3, 1)", label: "easeOutExpo" },
  { value: "cubic-bezier(0, 0.55, 0.45, 1)", label: "easeOutCirc" },
  { value: "cubic-bezier(0.33, 1, 0.68, 1)", label: "easeOutCubic" },
  { value: "cubic-bezier(0.25, 1, 0.5, 1)", label: "easeOutQuart" },
  { value: "cubic-bezier(0.65, 0, 0.35, 1)", label: "easeInOutCubic" },
  { value: "cubic-bezier(0.85, 0, 0.15, 1)", label: "easeInOutCirc" },
  { value: "cubic-bezier(0.34, 1.56, 0.64, 1)", label: "easeOutBack" },
  { value: "cubic-bezier(0, 0, 1, 1)", label: "linear" },
];

function readStoredEnabled(storageKey) {
  return os.storage.get(storageKey) !== "false";
}

function readStoredNumber(storageKey, fallback) {
  const value = Number(os.storage.get(storageKey));
  return value ? value : fallback;
}

function readStoredText(storageKey, fallback) {
  const raw = os.storage.get(storageKey);
  if (raw === null || raw === undefined || raw === "") return fallback;
  return String(raw);
}

function tilingConfigValue(configKey, fallback) {
  try {
    const config = os.tiling.getEffectiveConfig();
    if (!config) return fallback;
    const parts = configKey.split(".");
    let value = config;
    for (const part of parts) {
      if (value == null) return fallback;
      value = value[part];
    }
    return value != null ? value : fallback;
  } catch {
    return fallback;
  }
}

function tilingConfigSnapshot() {
  return {
    layout: String(tilingConfigValue("layout", "bsp")),
    gaps: {
      inner: Number(tilingConfigValue("gaps.inner", 5)),
      outer: Number(tilingConfigValue("gaps.outer", 10)),
    },
    split_ratio: Number(tilingConfigValue("split_ratio", 0.5)),
    border_width: Number(tilingConfigValue("border_width", 2)),
    border_radius: Number(tilingConfigValue("border_radius", 4)),
    resize_delta: Number(tilingConfigValue("resize_delta", 0.05)),
    animation_duration: Number(tilingConfigValue("animation_duration", 200)),
    animation_easing: String(
      tilingConfigValue("animation_easing", DEFAULT_EASING),
    ),
    mouse_resize: tilingConfigValue("mouse_resize", true) !== false,
    workspace_switch_delay: Number(
      tilingConfigValue("workspace_switch_delay", 320),
    ),
    resize_debounce: Number(tilingConfigValue("resize_debounce", 150)),
  };
}

function applyTilingSettings(overrides = {}) {
  const snapshot = tilingConfigSnapshot();
  const config = { ...snapshot, ...overrides };
  if (overrides.gaps) {
    config.gaps = { ...snapshot.gaps, ...overrides.gaps };
  }

  try {
    os.tiling.updateConfig(config);
  } catch {}

  os.storage.set(
    StorageKeys.tilingBarEnabled,
    String(readStoredEnabled(StorageKeys.tilingBarEnabled)),
  );
  os.storage.set(
    StorageKeys.tilingBarPosition,
    readStoredText(StorageKeys.tilingBarPosition, "top"),
  );
  os.storage.set(
    StorageKeys.tilingBarHeight,
    String(readStoredNumber(StorageKeys.tilingBarHeight, 36)),
  );
  os.storage.set(
    StorageKeys.tilingBarShowClock,
    String(readStoredEnabled(StorageKeys.tilingBarShowClock)),
  );
  os.storage.set(
    StorageKeys.tilingBarShowWorkspace,
    String(readStoredEnabled(StorageKeys.tilingBarShowWorkspace)),
  );
  os.storage.set(
    StorageKeys.tilingBarShowFocusedTitle,
    String(readStoredEnabled(StorageKeys.tilingBarShowFocusedTitle)),
  );
  os.storage.set(
    StorageKeys.tilingBarShowTray,
    String(readStoredEnabled(StorageKeys.tilingBarShowTray)),
  );
  os.storage.set(
    StorageKeys.tilingRofiEnabled,
    String(readStoredEnabled(StorageKeys.tilingRofiEnabled)),
  );
  os.storage.set(
    StorageKeys.tilingRofiMaxResults,
    String(readStoredNumber(StorageKeys.tilingRofiMaxResults, 10)),
  );
  os.storage.set(
    StorageKeys.tilingRofiWidth,
    String(readStoredNumber(StorageKeys.tilingRofiWidth, 50)),
  );

  try {
    os.tiling.applyBarSettings();
  } catch {}

  os.events.emit(BusEvents.SETTINGS_CHANGED, { tiling: true });
}

function registerTilingBinding(key, entry) {
  if (getWin11Binding(key)) return;
  registerWin11Binding(key, entry);
}

function registerTilingStorageToggle(key, storageKey) {
  registerTilingBinding(key, {
    type: "toggle",
    read: () => readStoredEnabled(storageKey),
    apply: (value) => {
      os.storage.set(storageKey, String(!!value));
      applyTilingSettings();
    },
  });
}

function registerTilingStorageSlider(key, storageKey, fallback) {
  registerTilingBinding(key, {
    type: "slider",
    read: () => readStoredNumber(storageKey, fallback),
    apply: (value) => {
      os.storage.set(storageKey, String(Number(value)));
      applyTilingSettings();
    },
  });
}

function registerTilingStorageSelect(key, storageKey, fallback) {
  registerTilingBinding(key, {
    type: "select",
    read: () => readStoredText(storageKey, fallback),
    apply: (value) => {
      os.storage.set(storageKey, String(value || fallback));
      applyTilingSettings();
    },
  });
}

function registerTilingConfigToggle(key, configKey) {
  registerTilingBinding(key, {
    type: "toggle",
    read: () => tilingConfigValue(configKey, true) !== false,
    apply: (value) => applyTilingSettings({ [configKey]: !!value }),
  });
}

function registerTilingConfigSlider(key, configKey, fallback) {
  registerTilingBinding(key, {
    type: "slider",
    read: () => Number(tilingConfigValue(configKey, fallback)),
    apply: (value) => applyTilingSettings({ [configKey]: Number(value) }),
  });
}

function registerTilingConfigSelect(key, configKey, fallback) {
  registerTilingBinding(key, {
    type: "select",
    read: () => String(tilingConfigValue(configKey, fallback)),
    apply: (value) =>
      applyTilingSettings({ [configKey]: String(value || fallback) }),
  });
}

registerTilingStorageToggle("tilingBarEnabled", StorageKeys.tilingBarEnabled);
registerTilingStorageSelect(
  "tilingBarPosition",
  StorageKeys.tilingBarPosition,
  "top",
);
registerTilingStorageSlider("tilingBarHeight", StorageKeys.tilingBarHeight, 36);
registerTilingStorageToggle(
  "tilingBarShowClock",
  StorageKeys.tilingBarShowClock,
);
registerTilingStorageToggle(
  "tilingBarShowWorkspace",
  StorageKeys.tilingBarShowWorkspace,
);
registerTilingStorageToggle(
  "tilingBarShowFocusedTitle",
  StorageKeys.tilingBarShowFocusedTitle,
);
registerTilingStorageToggle("tilingBarShowTray", StorageKeys.tilingBarShowTray);
registerTilingStorageToggle("tilingRofiEnabled", StorageKeys.tilingRofiEnabled);
registerTilingStorageSlider(
  "tilingRofiMaxResults",
  StorageKeys.tilingRofiMaxResults,
  10,
);
registerTilingStorageSlider("tilingRofiWidth", StorageKeys.tilingRofiWidth, 50);
registerTilingConfigSelect("tilingLayout", "layout", "bsp");
registerTilingBinding("tilingInnerGap", {
  type: "slider",
  read: () => Number(tilingConfigValue("gaps.inner", 5)),
  apply: (value) => applyTilingSettings({ gaps: { inner: Number(value) } }),
});
registerTilingBinding("tilingOuterGap", {
  type: "slider",
  read: () => Number(tilingConfigValue("gaps.outer", 10)),
  apply: (value) => applyTilingSettings({ gaps: { outer: Number(value) } }),
});
registerTilingConfigSlider("tilingSplitRatio", "split_ratio", 0.5);
registerTilingConfigSlider("tilingResizeDelta", "resize_delta", 0.05);
registerTilingConfigToggle("tilingMouseResize", "mouse_resize");
registerTilingConfigSlider("tilingBorderWidth", "border_width", 2);
registerTilingConfigSlider("tilingBorderRadius", "border_radius", 4);
registerTilingConfigSlider(
  "tilingAnimationDuration",
  "animation_duration",
  200,
);
registerTilingConfigSelect(
  "tilingAnimationEasing",
  "animation_easing",
  DEFAULT_EASING,
);
registerTilingConfigSlider(
  "tilingWorkspaceSwitchDelay",
  "workspace_switch_delay",
  320,
);
registerTilingConfigSlider("tilingResizeDebounce", "resize_debounce", 150);

function easingPreviewMarkup() {
  return `
    <div class="win11-control win11-control--stacked" data-win11-control="tilingEasingPreview">
      <div class="easing-preview" id="win11-tiling-easing-preview">
        <div class="easing-preview-track">
          <div class="easing-preview-ball" id="win11-tiling-easing-preview-ball"></div>
        </div>
      </div>
    </div>`;
}

function renderTilingPanelMarkup() {
  return [
    subHeading("Bar Settings"),
    toggle(
      "tilingBarEnabled",
      "Enable Top Bar",
      "Show a top bar when tiling mode is active",
    ),
    select(
      "tilingBarPosition",
      "Bar Position",
      "Where the bar appears on screen",
      BAR_POSITION_OPTIONS,
    ),
    slider(
      "tilingBarHeight",
      "Bar Height",
      "Height of the bar in pixels (24–56)",
      { min: 24, max: 56, step: 1, format: "px" },
    ),
    subHeading("Bar Elements"),
    toggle(
      "tilingBarShowClock",
      "Show Clock",
      "Display the current time and date",
    ),
    toggle(
      "tilingBarShowWorkspace",
      "Show Workspace Indicator",
      "Show workspace dots for switching",
    ),
    toggle(
      "tilingBarShowFocusedTitle",
      "Show Focused Window Title",
      "Show the title of the focused window",
    ),
    toggle(
      "tilingBarShowTray",
      "Show Tray Icons",
      "Display tray icons in the bar",
    ),
    subHeading("Rofi Launcher"),
    toggle(
      "tilingRofiEnabled",
      "Enable Rofi",
      "Enable the rofi overlay (Alt+D) with Apps, Run, Window, and Calc modes",
    ),
    slider(
      "tilingRofiMaxResults",
      "Max Results",
      "Maximum number of search results (5–20)",
      { min: 5, max: 20, step: 1 },
    ),
    slider(
      "tilingRofiWidth",
      "Overlay Width",
      "Width of the rofi overlay as a percentage (30–90%)",
      { min: 30, max: 90, step: 5, format: "percent" },
    ),
    subHeading("Layout"),
    select(
      "tilingLayout",
      "Layout Type",
      "BSP splits windows recursively; Master-Stack keeps a primary region with a side stack",
      LAYOUT_OPTIONS,
    ),
    slider(
      "tilingInnerGap",
      "Inner Gap",
      "Space between tiled windows (0–20px)",
      { min: 0, max: 20, step: 1, format: "px" },
    ),
    slider(
      "tilingOuterGap",
      "Outer Gap",
      "Space around the edge of the screen (0–30px)",
      { min: 0, max: 30, step: 1, format: "px" },
    ),
    slider(
      "tilingSplitRatio",
      "Default Split Ratio",
      "Initial split ratio for new windows (0.1–0.9)",
      { min: 0.1, max: 0.9, step: 0.05 },
    ),
    slider(
      "tilingResizeDelta",
      "Resize Increment",
      "Amount to resize per keypress (0.01–0.2)",
      { min: 0.01, max: 0.2, step: 0.01 },
    ),
    toggle(
      "tilingMouseResize",
      "Mouse Resize",
      "Enable resizing tiled windows with the mouse",
    ),
    subHeading("Appearance"),
    slider(
      "tilingBorderWidth",
      "Border Width",
      "Border width of tiled windows (0–8px)",
      { min: 0, max: 8, step: 1, format: "px" },
    ),
    slider(
      "tilingBorderRadius",
      "Border Radius",
      "Corner radius of tiled windows (0–16px)",
      { min: 0, max: 16, step: 1, format: "px" },
    ),
    slider(
      "tilingAnimationDuration",
      "Animation Duration",
      "Duration of layout transitions (0–500ms)",
      { min: 0, max: 500, step: 25 },
    ),
    select(
      "tilingAnimationEasing",
      "Animation Easing",
      "Timing curve for layout transitions",
      EASING_OPTIONS,
    ),
    easingPreviewMarkup(),
    subHeading("Performance"),
    slider(
      "tilingWorkspaceSwitchDelay",
      "Workspace Switch Delay",
      "Delay before reapplying layout on workspace switch (100–500ms)",
      { min: 100, max: 500, step: 20 },
    ),
    slider(
      "tilingResizeDebounce",
      "Resize Debounce",
      "Debounce period for window resize events (50–300ms)",
      { min: 50, max: 300, step: 10 },
    ),
  ].join("");
}

function updateEasingPreview(host, easing) {
  const ball = $("#win11-tiling-easing-preview-ball", host);
  if (!ball) return;
  ball.style.setProperty("--easing", easing);
  toggleClass(ball, "easing-preview-anim", false);
  void ball.offsetWidth;
  toggleClass(ball, "easing-preview-anim", true);
}

function isTilingAvailable() {
  try {
    return !!os.tiling.getEffectiveConfig();
  } catch {
    return false;
  }
}

registerWin11Binding("tilingPanel", {
  type: "custom",
  render: () => `<div class="win11-empty">Loading tiling options...</div>`,
  bind: (host) => {
    if (!host) return;

    if (!isTilingAvailable()) {
      setHTML(
        host,
        `<div class="win11-empty">Tiling mode is not active.</div>`,
      );
      return;
    }

    setHTML(host, renderTilingPanelMarkup());

    const easing = getWin11Value("tilingAnimationEasing");
    if (easing) updateEasingPreview(host, easing);

    const easingSelect = $("#win11-tilingAnimationEasing", host);
    bindEvent(easingSelect, "change", () => {
      const value = easingSelect?.dataset.value;
      if (value) updateEasingPreview(host, value);
    });
  },
});
