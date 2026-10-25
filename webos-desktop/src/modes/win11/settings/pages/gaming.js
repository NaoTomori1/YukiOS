import { os, StorageKeys } from "../../../../framework.js";
import { KeybindManager } from "../../../../keybindManager.js";
import { $, $$, bindEvent, setHTML } from "../../../../shared/domUtils.js";
import {
  SteamSettings,
  openSteamSettingsWindow,
} from "../../../../games/steamSettings.js";
import {
  loadRuffleConfig,
  saveRuffleConfig,
} from "../../../../ruffle/ruffleSettings.js";
import { action, custom, escapeHtml, note } from "../win11Controls.js";
import { registerWin11Binding } from "../win11SettingsBindings.js";
import { win11Description, win11Icon } from "../win11SettingsIcons.js";

const UNMUTE_OVERLAY_OPTIONS = [
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Hidden" },
];

const SCREENSHOT_FORMAT_OPTIONS = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
];

function switchMarkup(isOn, key) {
  const marker = key ? ` data-gaming-switch="${escapeHtml(key)}"` : "";
  return `<button type="button" class="win11-switch${isOn ? " is-on" : ""}"${marker} role="switch" aria-checked="${isOn ? "true" : "false"}"><span class="win11-switch__thumb"></span></button>`;
}

function loadOverlayEnabled() {
  try {
    const raw = os.storage.get(StorageKeys.overlaySettings);
    if (!raw) return true;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (typeof parsed.enabled === "boolean") return parsed.enabled;
    return true;
  } catch {
    return true;
  }
}

function saveOverlayEnabled(value) {
  try {
    const raw = os.storage.get(StorageKeys.overlaySettings);
    let current = {};
    if (raw) {
      try {
        current = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch {}
      if (typeof current !== "object" || current === null) current = {};
    }
    current.enabled = !!value;
    if (current.restoreTabs === undefined) current.restoreTabs = true;
    if (current.perfMonitor === undefined) current.perfMonitor = false;
    os.storage.set(StorageKeys.overlaySettings, current);
    const ctrl = os.app?.launcher?.overlayController;
    if (ctrl && ctrl.settings) {
      ctrl.settings.enabled = !!value;
      try {
        ctrl.saveSettings();
      } catch {}
    }
  } catch {}
}

function overlayHotkeyLabel() {
  const keys = KeybindManager.getCurrentKeys("steam.overlay");
  return keys ? keys.join(" + ") : "Shift + Tab";
}

function notifySteamSetting(setting, value) {
  window.dispatchEvent(
    new CustomEvent("steam-settings-changed", {
      detail: { setting, value },
    }),
  );
}

registerWin11Binding("gamingOverlay", {
  type: "custom",
  render: () => `<div class="win11-empty">Loading overlay options...</div>`,
  bind: (host) => {
    const steam = SteamSettings.load();
    const overlayEnabled =
      loadOverlayEnabled() && steam.overlayEnabled !== false;
    const unmuteOverlay = loadRuffleConfig().unmuteOverlay;

    setHTML(
      host,
      `
      <div class="subHeading">In-Game Overlay</div>
      <div class="win11-control win11-control--stacked">
        <div class="win11-control__text">
          <p class="win11-control__title">Shift+Tab Overlay in Games</p>
          <p class="win11-control__desc">Show the draggable Yuki overlay while a game is focused</p>
        </div>
        <div class="win11-range">
          ${switchMarkup(overlayEnabled, "overlay")}
        </div>
      </div>
      <div class="win11-control win11-control--stacked">
        <div class="win11-control__text">
          <p class="win11-control__title">Overlay Shortcut</p>
          <p class="win11-control__desc">Hotkey that toggles the in-game overlay</p>
        </div>
        <div class="win11-range">
          <button type="button" class="win11-action" data-gaming-hotkey><i class="fas fa-keyboard"></i> ${escapeHtml(overlayHotkeyLabel())}</button>
        </div>
      </div>
      <div class="win11-control win11-control--stacked">
        <div class="win11-control__text">
          <p class="win11-control__title">Unmute overlay</p>
          <p class="win11-control__desc">Click to unmute prompt for game audio</p>
        </div>
        <div class="win11-range">
          <div class="win11-segment" data-gaming-unmute>
            ${UNMUTE_OVERLAY_OPTIONS.map(
              (option) =>
                `<button type="button" class="win11-segment__btn${option.value === unmuteOverlay ? " active" : ""}" data-value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</button>`,
            ).join("")}
          </div>
        </div>
      </div>`,
    );

    const overlayButton = $("[data-gaming-switch='overlay']", host);
    bindEvent(overlayButton, "click", () => {
      const next = !overlayButton.classList.contains("is-on");
      overlayButton.classList.toggle("is-on", next);
      overlayButton.setAttribute("aria-checked", next ? "true" : "false");
      SteamSettings.set("overlayEnabled", next);
      saveOverlayEnabled(next);
      notifySteamSetting("overlayEnabled", next);
    });

    const hotkeyButton = $("[data-gaming-hotkey]", host);
    bindEvent(hotkeyButton, "click", () => {
      os.app.launch("shortcutsApp");
    });

    $$("[data-gaming-unmute] .win11-segment__btn", host).forEach((btn) => {
      bindEvent(btn, "click", () => {
        $$("[data-gaming-unmute] .win11-segment__btn", host).forEach((other) =>
          other.classList.remove("active"),
        );
        btn.classList.add("active");
        saveRuffleConfig({ unmuteOverlay: btn.dataset.value });
      });
    });
  },
});

registerWin11Binding("gamingCaptures", {
  type: "custom",
  render: () => `<div class="win11-empty">Loading capture options...</div>`,
  bind: (host) => {
    const steam = SteamSettings.load();
    const screenshotsEnabled = steam.screenshotsEnabled !== false;
    const screenshotFormat = steam.screenshotFormat || "png";
    const autoRecordHighlights = !!steam.autoRecordHighlights;

    setHTML(
      host,
      `
      <div class="win11-control win11-control--stacked">
        <div class="win11-control__text">
          <p class="win11-control__title">Screenshots</p>
          <p class="win11-control__desc">Enable screenshot capture from the overlay</p>
        </div>
        <div class="win11-range">
          ${switchMarkup(screenshotsEnabled, "screenshots")}
        </div>
      </div>
      <div class="win11-control win11-control--stacked">
        <div class="win11-control__text">
          <p class="win11-control__title">Screenshot format</p>
          <p class="win11-control__desc">Image format used for captured frames</p>
        </div>
        <div class="win11-range">
          <div class="win11-segment" data-gaming-shot-format>
            ${SCREENSHOT_FORMAT_OPTIONS.map(
              (option) =>
                `<button type="button" class="win11-segment__btn${option.value === screenshotFormat ? " active" : ""}" data-value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</button>`,
            ).join("")}
          </div>
        </div>
      </div>
      <div class="win11-control win11-control--stacked">
        <div class="win11-control__text">
          <p class="win11-control__title">Auto record highlights</p>
          <p class="win11-control__desc">Record gameplay clips automatically</p>
        </div>
        <div class="win11-range">
          ${switchMarkup(autoRecordHighlights, "autoRecord")}
        </div>
      </div>`,
    );

    const screenshotToggle = $("[data-gaming-switch='screenshots']", host);
    bindEvent(screenshotToggle, "click", () => {
      const next = !screenshotToggle.classList.contains("is-on");
      screenshotToggle.classList.toggle("is-on", next);
      screenshotToggle.setAttribute("aria-checked", next ? "true" : "false");
      SteamSettings.set("screenshotsEnabled", next);
      notifySteamSetting("screenshotsEnabled", next);
    });

    const autoRecordToggle = $("[data-gaming-switch='autoRecord']", host);
    bindEvent(autoRecordToggle, "click", () => {
      const next = !autoRecordToggle.classList.contains("is-on");
      autoRecordToggle.classList.toggle("is-on", next);
      autoRecordToggle.setAttribute("aria-checked", next ? "true" : "false");
      SteamSettings.set("autoRecordHighlights", next);
      notifySteamSetting("autoRecordHighlights", next);
    });

    $$("[data-gaming-shot-format] .win11-segment__btn", host).forEach((btn) => {
      bindEvent(btn, "click", () => {
        $$("[data-gaming-shot-format] .win11-segment__btn", host).forEach(
          (other) => other.classList.remove("active"),
        );
        btn.classList.add("active");
        SteamSettings.set("screenshotFormat", btn.dataset.value);
      });
    });
  },
});

registerWin11Binding("gamingSteam", {
  type: "custom",
  render: () => `<div class="win11-empty">Loading Steam options...</div>`,
  bind: (host) => {
    const steam = SteamSettings.load();
    const restoreTabs = steam.overlayRestoreTabs !== false;
    const perfMonitor = !!steam.overlayPerfMonitor;

    setHTML(
      host,
      `
      <div class="win11-control win11-control--stacked">
        <div class="win11-control__text">
          <p class="win11-control__title">Open Steam Settings</p>
          <p class="win11-control__desc">Open the Steam settings panel</p>
        </div>
        <div class="win11-range">
          <button type="button" class="win11-action" data-gaming-steam-open><i class="fas fa-external-link-alt"></i> Open</button>
        </div>
      </div>
      <div class="win11-control win11-control--stacked">
        <div class="win11-control__text">
          <p class="win11-control__title">Restore overlay tabs</p>
          <p class="win11-control__desc">Restore previously open overlay tabs</p>
        </div>
        <div class="win11-range">
          ${switchMarkup(restoreTabs, "restoreTabs")}
        </div>
      </div>
      <div class="win11-control win11-control--stacked">
        <div class="win11-control__text">
          <p class="win11-control__title">Performance monitor</p>
          <p class="win11-control__desc">Show frame time and refresh rate in the overlay</p>
        </div>
        <div class="win11-range">
          ${switchMarkup(perfMonitor, "perfMonitor")}
        </div>
      </div>`,
    );

    const openButton = $("[data-gaming-steam-open]", host);
    bindEvent(openButton, "click", () => {
      try {
        openSteamSettingsWindow(os.windowManager);
      } catch {
        os.app.launch("steamApp", { steamPage: "settings" });
      }
    });

    const restoreTabsToggle = $("[data-gaming-switch='restoreTabs']", host);
    bindEvent(restoreTabsToggle, "click", () => {
      const next = !restoreTabsToggle.classList.contains("is-on");
      restoreTabsToggle.classList.toggle("is-on", next);
      restoreTabsToggle.setAttribute("aria-checked", next ? "true" : "false");
      SteamSettings.set("overlayRestoreTabs", next);
      notifySteamSetting("overlayRestoreTabs", next);
    });

    const perfMonitorToggle = $("[data-gaming-switch='perfMonitor']", host);
    bindEvent(perfMonitorToggle, "click", () => {
      const next = !perfMonitorToggle.classList.contains("is-on");
      perfMonitorToggle.classList.toggle("is-on", next);
      perfMonitorToggle.setAttribute("aria-checked", next ? "true" : "false");
      SteamSettings.set("overlayPerfMonitor", next);
      notifySteamSetting("overlayPerfMonitor", next);
    });
  },
});

export const gamingPage = {
  id: "Gaming",
  label: "Gaming",
  tiles: () => [
    {
      name: "Xbox Game Bar",
      desc: win11Description("Gaming", "Xbox Game Bar"),
      icon: win11Icon("Gaming", "Xbox Game Bar"),
      subPage: "gaming-overlay",
    },
    {
      name: "Captures",
      desc: win11Description("Gaming", "Captures"),
      icon: win11Icon("Gaming", "Captures"),
      subPage: "gaming-captures",
    },
    {
      name: "Game Mode",
      desc: win11Description("Gaming", "Game Mode"),
      icon: win11Icon("Gaming", "Game Mode"),
      subPage: "gaming-mode",
    },
    {
      name: "Yuki Steam",
      desc: "Storefront, overlay and library preferences",
      icon: "fab fa-steam",
      subPage: "gaming-steam",
    },
  ],
  subPages: {
    "gaming-overlay": {
      title: "Xbox Game Bar",
      body: () =>
        [
          custom(
            "gamingOverlay",
            "In-game overlay",
            "Overlay visibility, shortcut and audio prompt",
          ),
        ].join(""),
    },
    "gaming-captures": {
      title: "Captures",
      body: () =>
        [
          custom(
            "gamingCaptures",
            "Screen captures",
            "Screenshot and recording options for games",
          ),
        ].join(""),
    },
    "gaming-mode": {
      title: "Game Mode",
      body: () =>
        action(
          "physicsChaos",
          "Physics Chaos",
          "Drop every icon and window with gravity",
          "Unleash Chaos",
        ),
    },
    "gaming-steam": {
      title: "Yuki Steam",
      body: () =>
        [
          custom(
            "gamingSteam",
            "Steam",
            "Steam settings entry point and overlay preferences",
          ),
          note("Steam library management lives inside the Steam app."),
        ].join(""),
    },
  },
};
