import {
  $,
  bindEvent,
  createElement,
  setText,
  os,
  StorageKeys,
  BusEvents,
} from "../../framework.js";
import { resolveIconUrl } from "../../shared/assetResolver.js";
import { playSfx, SystemSfx } from "../../sfx/systemSfx.js";
import { mountFlyoutStage, unmountFlyoutStage } from "./Win11FlyoutStage.js";

const PANE_ID = "win11-sidepane";
const BRIGHTNESS_ID = "brightnessSlider";

let paneRoot = null;
let stageRoot = null;
let quickButtons = [];
let quickIcons = [];
let brightnessInput = null;
let volumeInput = null;
let volumeIconNode = null;
let saverRestoreValue = null;
let outsideHandler = null;

function readStoredBool(key, fallback) {
  const raw = os.storage.get(key);
  if (raw === null || raw === undefined) return fallback;
  if (raw === true || raw === "true") return true;
  if (raw === false || raw === "false") return false;
  return fallback;
}

function readBrightnessValue() {
  const raw = os.storage.get(StorageKeys.brightness);
  if (raw === null || raw === undefined || raw === "") return 100;
  const num = Number(raw);
  if (!Number.isFinite(num)) return 100;
  return Math.max(10, Math.min(100, Math.round(num)));
}

function paintSlider(input, value) {
  const num = Number(value);
  if (!input || !Number.isFinite(num)) return;
  input.style.setProperty(
    "--track-color",
    `linear-gradient(90deg, var(--clrPrm) ${num - 3}%, #888888 ${num}%)`,
  );
}

function applyDisplayFilter() {
  const brightness = readBrightnessValue();
  const night = readStoredBool(StorageKeys.win11NightLight, false);
  if (brightness >= 100 && !night) {
    document.documentElement.style.filter = "";
    return;
  }
  const sepia = night ? 0.5 : 0;
  document.documentElement.style.filter = `brightness(${brightness / 100}) contrast(1) saturate(1) sepia(${sepia})`;
}

function isDarkActive() {
  const stored = os.storage.get(StorageKeys.theme);
  if (stored === "dark") return true;
  if (stored === "light") return false;
  if (stored === "auto") {
    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return true;
    }
  }
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark") return true;
  if (attr === "light") return false;
  return true;
}

function applyThemeValue(value) {
  os.storage.set(StorageKeys.theme, value);
  let effective = value;
  try {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    if (value === "auto") effective = prefersDark ? "dark" : "light";
  } catch {
    effective = value;
  }
  document.documentElement.setAttribute("data-theme", effective);
  os.events.emit(BusEvents.SETTINGS_CHANGED, { key: "theme", value });
}

function getQuickState(index) {
  if (index === 0) return readStoredBool(StorageKeys.win11Wifi, true);
  if (index === 1) return readStoredBool(StorageKeys.win11Bluetooth, false);
  if (index === 2) return readStoredBool(StorageKeys.win11Airplane, false);
  if (index === 3) return readStoredBool(StorageKeys.win11Saver, false);
  if (index === 4) return isDarkActive();
  return readStoredBool(StorageKeys.win11NightLight, false);
}

function refreshQuicks() {
  for (let i = 0; i < quickButtons.length; i++) {
    const btn = quickButtons[i];
    if (!btn) continue;
    const state = getQuickState(i);
    btn.setAttribute("data-state", String(state));
    if (i === 4) {
      const icon = quickIcons[i];
      if (icon) {
        icon.setAttribute(
          "src",
          resolveIconUrl(
            state
              ? "static/icons/win11-ui-moon.png"
              : "static/icons/win11-ui-sun.png",
          ),
        );
        icon.setAttribute("data-invert", state ? "true" : "false");
      }
    }
  }
}

function refreshBrightnessSlider() {
  if (!brightnessInput) return;
  const val = readBrightnessValue();
  brightnessInput.value = String(val);
  paintSlider(brightnessInput, val);
}

function updateVolumeIcon(level) {
  if (!volumeIconNode) return;
  let src = resolveIconUrl("static/icons/win11-ui-audio3.png");
  if (level === 0) src = resolveIconUrl("static/icons/win11-ui-audio0.png");
  else if (level < 34) src = resolveIconUrl("static/icons/win11-ui-audio1.png");
  else if (level < 67) src = resolveIconUrl("static/icons/win11-ui-audio2.png");
  volumeIconNode.setAttribute("src", src);
}

async function refreshVolumeSlider() {
  let level = 100;
  try {
    const mod = await import("../../audioMixer.js");
    const mixer = mod.audioMixer ? mod.audioMixer() : null;
    if (mixer && Number.isFinite(Number(mixer.masterVolume)))
      level = Math.round(Number(mixer.masterVolume) * 100);
  } catch {
    level = 100;
  }
  level = Math.max(0, Math.min(100, level));
  if (!volumeInput) return;
  volumeInput.value = String(level);
  updateVolumeIcon(level);
  paintSlider(volumeInput, level);
}

function handleQuickClick(index) {
  if (index === 0) {
    const cur = readStoredBool(StorageKeys.win11Wifi, true);
    const next = !cur;
    os.storage.set(StorageKeys.win11Wifi, next);
  } else if (index === 1) {
    const cur = readStoredBool(StorageKeys.win11Bluetooth, false);
    const next = !cur;
    os.storage.set(StorageKeys.win11Bluetooth, next);
  } else if (index === 2) {
    const cur = readStoredBool(StorageKeys.win11Airplane, false);
    const next = !cur;
    os.storage.set(StorageKeys.win11Airplane, next);
    if (next) {
      os.storage.set(StorageKeys.win11Wifi, false);
      os.storage.set(StorageKeys.win11Bluetooth, false);
    }
  } else if (index === 3) {
    const cur = readStoredBool(StorageKeys.win11Saver, false);
    const next = !cur;
    os.storage.set(StorageKeys.win11Saver, next);
    if (next) {
      saverRestoreValue = readBrightnessValue();
      const target = 70;
      os.storage.set(StorageKeys.brightness, String(target));
      if (brightnessInput) {
        brightnessInput.value = String(target);
        paintSlider(brightnessInput, target);
      }
      applyDisplayFilter();
    } else {
      const restore = saverRestoreValue === null ? 100 : saverRestoreValue;
      saverRestoreValue = null;
      os.storage.set(StorageKeys.brightness, String(restore));
      if (brightnessInput) {
        brightnessInput.value = String(restore);
        paintSlider(brightnessInput, restore);
      }
      applyDisplayFilter();
    }
  } else if (index === 4) {
    const dark = isDarkActive();
    applyThemeValue(dark ? "light" : "dark");
  } else {
    const cur = readStoredBool(StorageKeys.win11NightLight, false);
    os.storage.set(StorageKeys.win11NightLight, !cur);
    applyDisplayFilter();
  }
  refreshQuicks();
}

function handleBrightnessInput(evt) {
  const target = evt && evt.target ? evt.target : brightnessInput;
  if (!target) return;
  let val = Math.round(Number(target.value));
  if (!Number.isFinite(val)) return;
  val = Math.max(10, Math.min(100, val));
  os.storage.set(StorageKeys.brightness, String(val));
  paintSlider(target, val);
  applyDisplayFilter();
  playSfx(SystemSfx.BACKGROUND, { minGap: 300 });
}

async function handleVolumeInput(evt) {
  const target = evt && evt.target ? evt.target : volumeInput;
  if (!target) return;
  let val = Math.round(Number(target.value));
  if (!Number.isFinite(val)) return;
  val = Math.max(0, Math.min(100, val));
  try {
    const mod = await import("../../audioMixer.js");
    const mixer = mod.audioMixer ? mod.audioMixer() : null;
    if (mixer) mixer.setMaster(val / 100);
  } catch {
    val = val;
  }
  updateVolumeIcon(val);
  paintSlider(target, val);
  playSfx(SystemSfx.BACKGROUND, { minGap: 300 });
}

function handleOutsidePress(evt) {
  const pane = paneRoot || $("#" + PANE_ID);
  if (!pane) return;
  if (pane.getAttribute("data-hide") === "true") return;
  const target = evt ? evt.target : null;
  if (!target || !target.closest) return;
  if (target.closest("#" + PANE_ID)) return;
  if (target.closest(".taskright")) {
    if (
      !target.closest(".win11-band-trigger") &&
      !target.closest(".taskDate")
    ) {
      return;
    }
  }
  pane.setAttribute("data-hide", "true");
}

function buildPane() {
  const pane = createElement("div", {
    id: PANE_ID,
    className: "sidePane dpShad",
    attributes: { "data-hide": "true" },
  });
  pane.setAttribute(
    "style",
    "--prefix: PANE; backdrop-filter: blur(24px); background: var(--win11-flyout-bg);",
  );
  const quickSettings = createElement("div", {
    className: "quickSettings p-5 pb-8",
  });
  pane.appendChild(quickSettings);
  const qkCont = createElement("div", { className: "qkCont" });
  quickSettings.appendChild(qkCont);
  const defs = [
    {
      label: "WiFi",
      src: resolveIconUrl("static/icons/win11-ui-wifi.png"),
      invert: "true",
      action: "STNGTOGG",
      payload: "network.wifi.state",
    },
    {
      label: "Bluetooth",
      src: resolveIconUrl("static/icons/win11-ui-bluetooth.png"),
      invert: "false",
      action: "STNGTOGG",
      payload: "devices.bluetooth",
    },
    {
      label: "Flight Mode",
      src: resolveIconUrl("static/icons/win11-ui-airplane.png"),
      invert: "false",
      action: "flightMode",
      payload: "network.airplane",
    },
    {
      label: "Battery Saver",
      src: resolveIconUrl("static/icons/win11-ui-saver.png"),
      invert: "false",
      action: "STNGTOGG",
      payload: "system.power.saver.state",
    },
    {
      label: "Theme",
      src: resolveIconUrl("static/icons/win11-ui-moon.png"),
      invert: "true",
      action: "changeTheme",
      payload: "person.theme",
    },
    {
      label: "Night Light",
      src: resolveIconUrl("static/icons/win11-ui-nightlight.png"),
      invert: "false",
      action: "STNGTOGG",
      payload: "system.display.nightlight.state",
    },
  ];
  quickButtons = [];
  quickIcons = [];
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    const grp = createElement("div", { className: "qkGrp" });
    const btn = createElement("div", {
      className: "qkbtn handcr prtclk",
      attributes: {
        "data-state": "false",
        "data-action": def.action,
        "data-payload": def.payload,
      },
    });
    const iconWrap = createElement("div", { className: "uicon quickIcon" });
    const icon = createElement("img", {
      attributes: {
        width: "14",
        alt: "",
        src: def.src,
        "data-click": "false",
        "data-flip": "false",
        "data-rounded": "false",
        "data-invert": def.invert,
      },
    });
    iconWrap.appendChild(icon);
    btn.appendChild(iconWrap);
    grp.appendChild(btn);
    const label = createElement("div", { className: "qktext" });
    setText(label, def.label);
    grp.appendChild(label);
    qkCont.appendChild(grp);
    quickButtons.push(btn);
    quickIcons.push(icon);
    const idx = i;
    bindEvent(btn, "click", () => handleQuickClick(idx));
  }
  const sliderContOne = createElement("div", { className: "sliderCont" });
  const brightWrap = createElement("div", { className: "uicon mx-2" });
  const brightImg = createElement("img", {
    attributes: {
      width: "20",
      alt: "",
      src: resolveIconUrl("static/icons/win11-ui-brightness.png"),
      "data-click": "false",
      "data-flip": "false",
      "data-invert": "false",
      "data-rounded": "false",
    },
  });
  brightWrap.appendChild(brightImg);
  sliderContOne.appendChild(brightWrap);
  brightnessInput = createElement("input", {
    id: BRIGHTNESS_ID,
    className: "sliders bSlider",
    attributes: { type: "range", min: "10", max: "100" },
  });
  brightnessInput.value = String(readBrightnessValue());
  sliderContOne.appendChild(brightnessInput);
  quickSettings.appendChild(sliderContOne);
  bindEvent(brightnessInput, "input", handleBrightnessInput);
  const sliderContTwo = createElement("div", { className: "sliderCont" });
  const volWrap = createElement("div", { className: "uicon mx-2" });
  volumeIconNode = createElement("img", {
    attributes: {
      width: "18",
      alt: "",
      src: resolveIconUrl("static/icons/win11-ui-audio3.png"),
      "data-click": "false",
      "data-flip": "false",
      "data-invert": "false",
      "data-rounded": "false",
    },
  });
  volWrap.appendChild(volumeIconNode);
  sliderContTwo.appendChild(volWrap);
  volumeInput = createElement("input", {
    className: "sliders vSlider",
    attributes: { type: "range", min: "0", max: "100" },
  });
  volumeInput.value = "100";
  sliderContTwo.appendChild(volumeInput);
  quickSettings.appendChild(sliderContTwo);
  bindEvent(volumeInput, "input", handleVolumeInput);
  return pane;
}

export function setupWin11SidePane() {
  if (paneRoot || $("#" + PANE_ID)) return;
  const pane = buildPane();
  const bodyNode = $("body");
  if (!bodyNode) return;
  stageRoot = mountFlyoutStage(pane, "win11-flyout-stage--sidepane");
  paneRoot = pane;
  outsideHandler = handleOutsidePress;
  bindEvent(document, "pointerdown", outsideHandler);
  refreshQuicks();
  refreshBrightnessSlider();
  refreshVolumeSlider();
  applyDisplayFilter();
}

export function teardownWin11SidePane() {
  try {
    if (outsideHandler)
      document.removeEventListener("pointerdown", outsideHandler);
  } catch {
    outsideHandler = null;
  }
  outsideHandler = null;
  if (paneRoot) {
    paneRoot.remove();
    paneRoot = null;
  } else {
    const existing = $("#" + PANE_ID);
    if (existing) existing.remove();
  }
  unmountFlyoutStage(stageRoot);
  stageRoot = null;
  quickButtons = [];
  quickIcons = [];
  brightnessInput = null;
  volumeInput = null;
  volumeIconNode = null;
}

export function toggleWin11SidePane() {
  const pane = paneRoot || $("#" + PANE_ID);
  if (!pane) return;
  const hidden = pane.getAttribute("data-hide") !== "false";
  if (hidden) {
    import("./Win11Band.js").then((m) => m.closeWin11Band?.()).catch(() => {});
    import("./Win11Calendar.js")
      .then((m) => m.closeWin11Calendar?.())
      .catch(() => {});
    pane.setAttribute("data-hide", "false");
    refreshQuicks();
    refreshBrightnessSlider();
    refreshVolumeSlider();
  } else {
    pane.setAttribute("data-hide", "true");
  }
}

export function isWin11SidePaneOpen() {
  const pane = paneRoot || $("#" + PANE_ID);
  if (!pane) return false;
  return pane.getAttribute("data-hide") === "false";
}

export function hideWin11SidePane() {
  const pane = paneRoot || $("#" + PANE_ID);
  if (!pane) return;
  pane.setAttribute("data-hide", "true");
}
