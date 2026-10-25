import { os, StorageKeys } from "../../../../framework.js";
import {
  $$,
  bindEvent,
  setHTML,
  toggleClass,
} from "../../../../shared/domUtils.js";
import { escapeHtml } from "../win11Controls.js";
import { registerWin11Binding } from "../win11SettingsBindings.js";

const URL_ICON_PATTERN = /^(https?|data:|\/|.*\.(webp|png|jpg|jpeg|gif|svg))/;
const FONT_ICON_PATTERN = /^(fa-|fas|fab|far|fa )/;
const HIDDEN_TRAY_IDS = new Set([
  "audio-mixer",
  "network-tray-window",
  "display-performance-window",
]);

function readVisibilityMap() {
  const raw = os.storage.get(StorageKeys.trayAppVisibility);
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === "object" ? raw : {};
}

function readTrayEntries() {
  const all = os.tray.getAllItems?.();
  if (Array.isArray(all)) {
    return all
      .filter((item) => !HIDDEN_TRAY_IDS.has(item.winId))
      .map((item) => ({ ...(item || {}) }));
  }
  const items = os.tray.getTrayItems?.();
  if (!items) return [];
  if (items instanceof Map) {
    return Array.from(items.entries())
      .filter(([winId]) => !HIDDEN_TRAY_IDS.has(winId))
      .map(([winId, item]) => ({
        ...(item || {}),
        winId,
      }));
  }
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => !HIDDEN_TRAY_IDS.has(item.winId))
    .map((item) => ({ ...(item || {}) }));
}

function buildIconHtml(icon, label) {
  if (typeof icon !== "string" || icon.length === 0) return "";
  if (URL_ICON_PATTERN.test(icon)) {
    return `<img src="${escapeHtml(icon)}" alt="${escapeHtml(label || "")}" width="16" height="16" />`;
  }
  if (FONT_ICON_PATTERN.test(icon)) {
    return `<i class="${escapeHtml(icon)}"></i>`;
  }
  return `<span>${escapeHtml(icon)}</span>`;
}

function buildRowHtml(entry, visible) {
  const name = escapeHtml(entry.label || entry.winId || "");
  const iconHtml = buildIconHtml(entry.icon, entry.label);
  const title = iconHtml
    ? `${iconHtml} <span>${name}</span>`
    : `<span>${name}</span>`;
  return `
    <div class="win11-control win11-control--toggle">
      <div class="win11-control__text">
        <p class="win11-control__title">${title}</p>
        <p class="win11-control__desc">Show this app in the system tray</p>
      </div>
      <button type="button" class="win11-switch${visible ? " is-on" : ""}" role="switch" aria-checked="${visible ? "true" : "false"}" data-tray-toggle="${escapeHtml(entry.winId || "")}"><span class="win11-switch__thumb"></span></button>
    </div>`;
}

registerWin11Binding("trayApps", {
  type: "custom",
  render: () => `<div class="win11-empty">Loading tray apps...</div>`,
  bind: (host) => {
    const entries = readTrayEntries();
    if (entries.length === 0) {
      setHTML(host, `<div class="win11-empty">No tray apps yet</div>`);
      return;
    }

    const visibility = readVisibilityMap();
    const rows = entries
      .map((entry) => buildRowHtml(entry, visibility[entry.winId] !== false))
      .join("");
    setHTML(host, rows);

    $$("[data-tray-toggle]", host).forEach((button) => {
      bindEvent(button, "click", () => {
        const winId = button.dataset.trayToggle;
        if (!winId) return;
        const map = readVisibilityMap();
        const visible = map[winId] === false;
        map[winId] = visible;
        os.storage.set(StorageKeys.trayAppVisibility, map);
        os.tray.updateItemVisibility(winId, visible);
        toggleClass(button, "is-on", visible);
        button.setAttribute("aria-checked", visible ? "true" : "false");
      });
    });
  },
});
