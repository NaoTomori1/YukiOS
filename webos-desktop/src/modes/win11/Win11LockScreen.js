import { $, bindEvent, createElement } from "../../shared/domUtils.js";
import { resolveIconUrl } from "../../shared/assetResolver.js";
import { batteryService } from "../../services/batteryService.js";
import { applyWin11LoginWallpaper } from "./Win11Wallpaper.js";
import "./Win11LockScreen.css";

const SESSION_CLASS = "win11-session";
const LOCKED_CLASS = "win11-session-locked";
const STAGE_ATTRIBUTE = "data-win11-stage";
const LAYER_ID = "win11-lock-layer";
const IGNORED_KEYS = ["Shift", "Control", "Alt", "Meta", "CapsLock"];

const REVEAL_IGNORE_SELECTORS = [
  ".session-mode-btn",
  "#action-button",
  ".system-icon",
  ".user-carousel-tile",
  "#session-settings-btn",
  ".login-tip",
  ".session-features-link",
  ".session-electron-banner",
  ".win11-lock-signin",
];

const TYPING_TAGS = ["INPUT", "TEXTAREA", "SELECT"];

const GEAR_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;

let activeContainer = null;
let clickHandler = null;
let keyHandler = null;
let unsubscribeBattery = null;
let networkHandler = null;
let settingsIconBackup = null;
let signInHandler = null;
let relocatedNodes = [];

function buildSignInPanelHtml(userName, avatarUrl) {
  return `
    <div class="win11-lock-panel">
      <img class="win11-lock-avatar" src="${avatarUrl}" alt="">
      <div class="win11-lock-name">${userName || "Guest"}</div>
      <button type="button" class="win11-lock-signin">Sign in</button>
    </div>
  `;
}

function buildCornerHtml() {
  return `
    <div class="win11-lock-corner">
      <div class="uicon win11-lock-wifi">
        <img width="16" src="${resolveIconUrl("static/icons/win11-ui-wifi.png")}" alt="">
      </div>
      <div class="uicon win11-lock-battery" data-charging="false">
        <span class="win11-battery">
          <div class="win11-charger">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24">
              <path fill="currentColor" stroke="currentColor" stroke-width="2" d="m8.294 14-1.767 7.068c-.187.746.736 1.256 1.269.701L19.79 9.27A.75.75 0 0 0 19.25 8h-4.46l1.672-5.013A.75.75 0 0 0 15.75 2h-7a.75.75 0 0 0-.721.544l-3 10.5A.75.75 0 0 0 5.75 14h2.544Z"></path>
            </svg>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" fill="none" viewBox="0 0 24 24">
            <path fill="none" stroke="currentColor" stroke-width="1.6" d="M17 6a3 3 0 0 1 3 3v1h1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1v1a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h12Zm-.002 1.5H5a1.5 1.5 0 0 0-1.493 1.356L3.5 9v6a1.5 1.5 0 0 0 1.355 1.493L5 16.5h11.998a1.5 1.5 0 0 0 1.493-1.355l.007-.145V9a1.5 1.5 0 0 0-1.355-1.493l-.145-.007Z"></path>
          </svg>
          <div class="win11-btFull" style="width: 0%">
            <svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" fill="none" viewBox="0 0 24 24">
              <path fill="currentColor" d="M17 6a3 3 0 0 1 3 3v1h1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1v1a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h12Zm-.002 1.5H5a1.5 1.5 0 0 0-1.494 1.356L3.5 9v6a1.5 1.5 0 0 0 1.355 1.493L5 16.5h11.998a1.5 1.5 0 0 0 1.493-1.355l.007-.145V9a1.5 1.5 0 0 0-1.355-1.493l-.145-.007ZM6 9h10a1 1 0 0 1 .993.883L17 10v4a1 1 0 0 1-.883.993L16 15H6a1 1 0 0 1-.993-.883L5 14v-4a1 1 0 0 1 .883-.993L6 9h10H6Z"></path>
            </svg>
          </div>
        </span>
      </div>
    </div>
  `;
}

function updateBattery(layer, snapshot) {
  const batteryEl = $(".win11-lock-battery", layer);
  if (!batteryEl) return;
  const levelEl = $(".win11-btFull", layer);
  if (levelEl) {
    levelEl.style.width = `${Math.max(0, Math.min(100, snapshot.percent || 0))}%`;
  }
  batteryEl.dataset.charging = snapshot.charging ? "true" : "false";
}

function updateNetwork(layer) {
  const wifiEl = $(".win11-lock-wifi", layer);
  if (!wifiEl) return;
  wifiEl.dataset.online = navigator.onLine ? "true" : "false";
}

export function setWin11SessionStage(container, stage) {
  if (!container) return;
  container.setAttribute(STAGE_ATTRIBUTE, stage);
  const blurOverlay = $(".session-background", container);
  if (blurOverlay) blurOverlay.style.display = stage === "splash" ? "none" : "";
}

function isModalOpen(container) {
  const settingsModal = $("#session-settings-modal", container);
  if (settingsModal && settingsModal.classList.contains("open")) return true;
  const avatarModal = $("#avatar-edit-modal", container);
  if (avatarModal && avatarModal.style.display !== "none") return true;
  return false;
}

function isTypingTarget(target) {
  if (!target || !target.tagName) return false;
  if (TYPING_TAGS.includes(target.tagName)) return true;
  return Boolean(target.isContentEditable);
}

function bindReveal(container) {
  const reveal = () => {
    setWin11SessionStage(container, "revealed");
    teardownReveal();
  };
  clickHandler = (event) => {
    const origin = event.target;
    if (origin && origin.closest) {
      if (origin.closest(REVEAL_IGNORE_SELECTORS.join(","))) return;
    }
    if (isModalOpen(container)) return;
    reveal();
  };
  keyHandler = (event) => {
    if (IGNORED_KEYS.includes(event.key)) return;
    if (isModalOpen(container)) return;
    if (isTypingTarget(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    reveal();
  };
  container.addEventListener("click", clickHandler);
  document.addEventListener("keydown", keyHandler, true);
}

function teardownReveal() {
  if (clickHandler && activeContainer) {
    activeContainer.removeEventListener("click", clickHandler);
  }
  clickHandler = null;
  if (keyHandler) {
    document.removeEventListener("keydown", keyHandler, true);
    keyHandler = null;
  }
}

function moveIntoLayer(node, target) {
  if (!node || !target) return;
  const origin = node.parentElement;
  if (!origin) return;
  relocatedNodes.push({ node, origin });
  target.appendChild(node);
}

function restoreRelocatedNodes() {
  relocatedNodes.forEach(({ node, origin }) => {
    if (!node) return;
    if (origin && origin.isConnected) origin.appendChild(node);
  });
  relocatedNodes = [];
}

function restoreSettingsIcon() {
  if (settingsIconBackup === null) return;
  const settingsBtn = $("#session-settings-btn", document);
  if (settingsBtn) settingsBtn.innerHTML = settingsIconBackup;
  settingsIconBackup = null;
}

function mountLayer(container, { locked, userName, avatarUrl } = {}) {
  const layer = createElement("div", {
    id: LAYER_ID,
    className: "win11-lock-layer",
  });
  layer.innerHTML = `${locked ? buildSignInPanelHtml(userName, avatarUrl) : ""}${buildCornerHtml()}`;
  container.appendChild(layer);

  const corner = $(".win11-lock-corner", layer);
  const settingsBtn = $("#session-settings-btn", container);
  if (corner && settingsBtn) {
    moveIntoLayer(settingsBtn, corner);
    if (settingsIconBackup === null) {
      settingsIconBackup = settingsBtn.innerHTML;
    }
    settingsBtn.innerHTML = GEAR_ICON;
  }

  const options = createElement("div", { className: "win11-lock-options" });
  layer.appendChild(options);

  const modeSelector = $("#session-selector", container);
  if (modeSelector) {
    moveIntoLayer(modeSelector, options);
  }

  const loginTip = $(".login-tip", container);
  if (loginTip) {
    moveIntoLayer(loginTip, layer);
  }

  const signInBtn = $(".win11-lock-signin", layer);
  if (signInBtn) {
    bindEvent(signInBtn, "click", (event) => {
      event.stopPropagation();
      if (typeof signInHandler === "function") signInHandler();
    });
  }

  updateBattery(layer, batteryService.getSnapshot());
  updateNetwork(layer);
  unsubscribeBattery = batteryService.subscribe((snapshot) =>
    updateBattery(layer, snapshot),
  );
  networkHandler = () => updateNetwork(layer);
  bindEvent(window, "online", networkHandler);
  bindEvent(window, "offline", networkHandler);
}

export function setupWin11SessionUI(container, options = {}) {
  if (!container) return null;
  unmountWin11SessionUI(container);

  container.classList.add(SESSION_CLASS);
  if (options.locked) container.classList.add(LOCKED_CLASS);
  applyWin11LoginWallpaper(container, { onlyWhenEmpty: true });
  setWin11SessionStage(container, "splash");

  signInHandler =
    typeof options.onSignIn === "function" ? options.onSignIn : null;

  activeContainer = container;
  bindReveal(container);
  mountLayer(container, options);

  return container;
}

export function setWin11SignInHandler(container, onSignIn) {
  if (!isWin11SessionUI(container)) return;
  signInHandler = typeof onSignIn === "function" ? onSignIn : null;
}

export function unmountWin11SessionUI(container) {
  teardownReveal();
  signInHandler = null;
  if (unsubscribeBattery) {
    unsubscribeBattery();
    unsubscribeBattery = null;
  }
  if (networkHandler) {
    window.removeEventListener("online", networkHandler);
    window.removeEventListener("offline", networkHandler);
    networkHandler = null;
  }
  restoreSettingsIcon();
  restoreRelocatedNodes();
  const layer = $(`#${LAYER_ID}`, container || document);
  if (layer) layer.remove();
  const target = container || activeContainer;
  if (target && !target.classList.contains("exit")) {
    target.classList.remove(SESSION_CLASS);
    target.classList.remove(LOCKED_CLASS);
    target.removeAttribute(STAGE_ATTRIBUTE);
  }
  activeContainer = null;
}

export function isWin11SessionUI(container) {
  return Boolean(container && container.classList.contains(SESSION_CLASS));
}
