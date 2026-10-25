import { createElement, $ } from "../../framework.js";
import { trayManager } from "../../tray/tray.js";
import { mountFlyoutStage, unmountFlyoutStage } from "./Win11FlyoutStage.js";

const BAND_ID = "win11-band";

export const WIN11_BAND_TRIGGER_CLASS = "win11-band-trigger";

const EXCLUDED_TRAY_IDS = [
  "audio-mixer",
  "network-tray-window",
  "display-performance-window",
];

let bandRoot = null;
let bandContainer = null;
let bandObserver = null;
let outsideHandler = null;
let stageRoot = null;

function stripExcludedTrayItems(container) {
  if (!container) return;
  EXCLUDED_TRAY_IDS.forEach((id) => {
    const btn = $(`[data-win-id="${id}"]`, container);
    if (btn) btn.remove();
  });
}

function handleOutsidePress(event) {
  if (!bandRoot) return;
  const target = event.target;
  if (target && target.closest) {
    if (target.closest(`.${WIN11_BAND_TRIGGER_CLASS}`)) return;
  }
  if (bandRoot.contains(target)) return;
  closeWin11Band();
}

function syncTriggerState() {
  const trigger = $(`.${WIN11_BAND_TRIGGER_CLASS}`);
  if (!trigger) return;
  trigger.setAttribute("data-open", bandRoot ? "true" : "false");
}

function syncEmptyState() {
  if (!bandRoot || !bandContainer) return;
  const empty = $("[data-win11-band-empty]", bandRoot);
  if (!empty) return;
  const hasItems = bandContainer.children.length > 0;
  empty.style.display = hasItems ? "none" : "block";
  bandContainer.style.display = hasItems ? "flex" : "none";
}

export function isWin11BandOpen() {
  return !!bandRoot;
}

export function closeWin11Band() {
  if (outsideHandler) {
    document.removeEventListener("pointerdown", outsideHandler);
    outsideHandler = null;
  }
  if (bandObserver) {
    bandObserver.disconnect();
    bandObserver = null;
  }
  if (!bandRoot) {
    syncTriggerState();
    return;
  }
  const current = bandRoot;
  const currentStage = stageRoot;
  bandRoot = null;
  stageRoot = null;
  if (bandContainer) {
    trayManager.removeSecondaryContainer(bandContainer);
    bandContainer = null;
  }
  current.setAttribute("data-hide", "true");
  syncTriggerState();
  setTimeout(() => {
    if (current.parentElement) current.remove();
    unmountFlyoutStage(currentStage);
  }, 320);
}

export function toggleWin11Band() {
  if (bandRoot) {
    closeWin11Band();
    return;
  }
  openWin11Band();
}

export function openWin11Band() {
  const sidepane = $("#win11-sidepane");
  if (sidepane && sidepane.getAttribute("data-hide") === "false") {
    sidepane.setAttribute("data-hide", "true");
  }
  import("./Win11Calendar.js")
    .then((m) => m.closeWin11Calendar?.())
    .catch(() => {});
  closeWin11Band();
  const root = createElement("div", {
    id: BAND_ID,
    className: "win11-band",
    attributes: { "data-hide": "true" },
  });
  const container = createElement("div", { className: "bandContainer" });
  const empty = createElement("div", {
    className: "win11-band__empty",
    attributes: { "data-win11-band-empty": "true" },
  });
  empty.textContent = "No tray apps";

  root.appendChild(container);
  root.appendChild(empty);
  stageRoot = mountFlyoutStage(root);
  bandRoot = root;
  bandContainer = container;

  trayManager.addSecondaryContainer(container);
  trayManager.renderInContainer(container);
  stripExcludedTrayItems(container);
  syncEmptyState();

  if (typeof MutationObserver !== "undefined") {
    bandObserver = new MutationObserver(() => {
      stripExcludedTrayItems(container);
      syncEmptyState();
    });
    bandObserver.observe(container, { childList: true });
  }

  syncTriggerState();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (bandRoot === root) root.setAttribute("data-hide", "false");
    });
  });

  outsideHandler = handleOutsidePress;
  setTimeout(() => {
    document.addEventListener("pointerdown", outsideHandler);
  }, 0);
}
