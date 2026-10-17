import {
  os,
  StorageKeys,
  BusEvents,
  $,
  $$,
  bindEvent,
  createElement,
} from "../../framework.js";
import { openWin11SearchMode } from "./Win11StartMenu.js";
import { resolveIconUrl } from "../../shared/assetResolver.js";

const HIDDEN_SELECTORS = [
  "#mac-menu-bar",
  "#start-button",
  "#taskbar-windows",
  "#system-tray",
  ".win11-taskbar-btn",
  "#win11-start-tsicon",
];

const SEARCH_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -1 26 26" height="28" width="28"><circle cx="13" cy="11" r="8" fill="#ffffff24"></circle><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2"><circle cx="13" cy="11" r="8"></circle><path d="M3 21l4-4" stroke-linecap="round"></path></g></svg>';

const WIFI_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12a10 10 0 0 1 14 0"></path><path d="M8.5 15.5a5 5 0 0 1 7 0"></path><circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none"></circle></svg>';

const AUDIO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none"></path><path d="M16 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M18.5 6.5a8 8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

const CHEVRON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="10" height="10"><path fill="currentColor" d="M416 352c-8.188 0-16.38-3.125-22.62-9.375L224 173.3l-169.4 169.4c-12.5 12.5-32.75 12.5-45.25 0s-12.5-32.75 0-45.25l192-192c12.5-12.5 32.75-12.5 45.25 0l192 192c12.5 12.5 12.5 32.75 0 45.25C432.4 348.9 424.2 352 416 352z"></path></svg>';

const CHARGER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24"><path fill="#000" stroke="#f3f3f3" stroke-width="2" d="m8.294 14-1.767 7.068c-.187.746.736 1.256 1.269.701L19.79 9.27A.75.75 0 0 0 19.25 8h-4.46l1.672-5.013A.75.75 0 0 0 15.75 2h-7a.75.75 0 0 0-.721.544l-3 10.5A.75.75 0 0 0 5.75 14h2.544Z"></path></svg>';

const BATTERY_BODY_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" fill="none" viewBox="0 0 24 24"><path xmlns="http://www.w3.org/2000/svg" fill="#000" d="M17 6a3 3 0 0 1 3 3v1h1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1v1a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h12Zm-.002 1.5H5a1.5 1.5 0 0 0-1.493 1.356L3.5 9v6a1.5 1.5 0 0 0 1.355 1.493L5 16.5h11.998a1.5 1.5 0 0 0 1.493-1.355l.007-.145V9a1.5 1.5 0 0 0-1.355-1.493l-.145-.007Z"></path></svg>';

const BATTERY_FILL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" fill="none" viewBox="0 0 24 24"><path fill="#000" d="M17 6a3 3 0 0 1 3 3v1h1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1v1a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h12Zm-.002 1.5H5a1.5 1.5 0 0 0-1.494 1.356L3.5 9v6a1.5 1.5 0 0 0 1.355 1.493L5 16.5h11.998a1.5 1.5 0 0 0 1.493-1.355l.007-.145V9a1.5 1.5 0 0 0-1.355-1.493l-.145-.007ZM6 9h10a1 1 0 0 1 .993.883L17 10v4a1 1 0 0 1-.883.993L16 15H6a1 1 0 0 1-.993-.883L5 14v-4a1 1 0 0 1 .883-.993L6 9h10H6Z"></path></svg>';
const PINNED_APPS = [
  {
    key: "settings",
    appId: "settingsApp",
    icon: "static/icons/win11-settings.png",
    title: "Settings",
  },
  {
    key: "explorer",
    appId: "explorerApp",
    icon: "static/icons/win11-explorer.png",
    title: "Files",
  },
  {
    key: "edge",
    appId: "browserApp",
    icon: "static/icons/win11-edge.png",
    title: "Browser",
  },
  {
    key: "spotify",
    appId: "shittifyApp",
    icon: "static/icons/win11-spotify.png",
    title: "Evil Spotify",
  },
];

const CLOCK_APP_ID = "clockApp";

let taskRoot = null;
let clockTimer = null;
let focusedWinId = null;
let pinnedRefs = [];
let createdHandler = null;
let closedHandler = null;
let focusedHandler = null;

function readAlign() {
  try {
    const stored = os.storage.get(StorageKeys.win11TaskbarAlign);
    return stored === "left" ? "left" : "center";
  } catch {
    return "center";
  }
}

function hideNativeTaskbar() {
  HIDDEN_SELECTORS.forEach((selector) => {
    $$(selector).forEach((el) => {
      el.style.display = "none";
    });
  });
}

function restoreNativeTaskbar() {
  HIDDEN_SELECTORS.forEach((selector) => {
    $$(selector).forEach((el) => {
      el.style.display = "";
    });
  });
}

function toggleNativeStartMenu() {
  import("../../desktopui/startMenu.js")
    .then((mod) => {
      if (mod && mod.toggleStartMenu) mod.toggleStartMenu();
      else {
        const fallback = $("#start-button");
        if (fallback) fallback.click();
      }
    })
    .catch(() => {
      const fallback = $("#start-button");
      if (fallback) fallback.click();
    });
}

function focusStartSearchInput() {
  setTimeout(() => {
    const menu = $("#start-menu");
    const input = menu ? $(".searchBar input", menu) : $(".searchBar input");
    if (input) input.focus();
  }, 80);
}

function toggleWidgetsPanel() {
  import("./Win11Widgets.js")
    .then((mod) => {
      if (mod && typeof mod.toggleWin11Widgets === "function")
        mod.toggleWin11Widgets();
      else toggleNativeStartMenu();
    })
    .catch(() => toggleNativeStartMenu());
}

function toggleSidePane() {
  import("./Win11SidePane.js")
    .then((mod) => {
      if (mod && typeof mod.toggleWin11SidePane === "function")
        mod.toggleWin11SidePane();
      else toggleSystemTray();
    })
    .catch(() => toggleSystemTray());
}

function toggleSystemTray() {
  const tray = $("#system-tray");
  if (!tray) return;
  tray.style.display = tray.style.display === "none" ? "" : "none";
}

function resolveLaunchId(entry) {
  if (!entry || !entry.appId) return null;
  try {
    if (os.app.hasApp(entry.appId)) return entry.appId;
  } catch {
    return null;
  }
  return null;
}

function readOpenWindows() {
  try {
    return os.window.getOpenWindows() || null;
  } catch {
    return null;
  }
}

function getWindowAppId(winId, entry) {
  if (entry && entry.record && entry.record.appId) return entry.record.appId;
  if (entry && entry.appId) return entry.appId;
  if (typeof winId !== "string" || !winId) return null;
  const el = $("#" + winId);
  if (el && el.dataset && el.dataset.appId) return el.dataset.appId;
  return null;
}

function findOpenWinId(appId) {
  const wins = readOpenWindows();
  if (!wins) return null;
  const keys =
    typeof wins.keys === "function"
      ? Array.from(wins.keys())
      : Object.keys(wins);
  for (let i = 0; i < keys.length; i++) {
    const entry =
      typeof wins.get === "function" ? wins.get(keys[i]) : wins[keys[i]];
    if (getWindowAppId(keys[i], entry) === appId) return keys[i];
  }
  return null;
}

function launchPinned(entry) {
  const target = resolveLaunchId(entry);
  if (!target) return;
  const openId = findOpenWinId(target);
  if (openId) {
    const el = $("#" + openId);
    if (el) {
      if (el.style.display === "none") el.style.display = "";
      try {
        os.window.focus(el);
      } catch {
        return;
      }
      return;
    }
  }
  try {
    const result = os.app.launch(target);
    if (result && typeof result.catch === "function") result.catch(() => {});
  } catch {
    return;
  }
}

function reconcileOpenState() {
  if (pinnedRefs.length === 0) return;
  let focusAppId = null;
  if (focusedWinId) {
    const wins = readOpenWindows();
    const entry =
      wins && typeof wins.get === "function" ? wins.get(focusedWinId) : null;
    focusAppId = getWindowAppId(focusedWinId, entry);
  }
  pinnedRefs.forEach((ref) => {
    const appId = ref.entry ? ref.entry.appId : null;
    const open = appId ? Boolean(findOpenWinId(appId)) : false;
    ref.wrap.setAttribute("data-open", open ? "true" : "false");
    const active = open && focusAppId ? focusAppId === appId : false;
    ref.wrap.setAttribute("data-active", active ? "true" : "false");
  });
}

function buildIconButton(extraClass, imgSrc, imgAlt) {
  const outer = createElement("div", {
    className: "uicon tsIcon" + (extraClass ? " " + extraClass : ""),
  });
  const inner = createElement("div", {
    styles: { width: "24px", height: "24px" },
  });
  const img = createElement("img", {
    attributes: { width: "24", src: resolveIconUrl(imgSrc), alt: imgAlt || "" },
  });
  inner.appendChild(img);
  outer.appendChild(inner);
  return outer;
}

function buildStartButton() {
  const btn = buildIconButton("", "static/icons/win11-home.png", "Start");
  bindEvent(btn, "click", (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    toggleNativeStartMenu();
  });
  return btn;
}

function buildSearchButton() {
  const btn = createElement("div", {
    className: "uicon tsIcon searchIcon",
    html: SEARCH_SVG,
  });
  bindEvent(btn, "click", (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      openWin11SearchMode();
    } catch {
      toggleNativeStartMenu();
      return;
    }
    focusStartSearchInput();
  });
  return btn;
}

function buildWidgetsButton() {
  const btn = buildIconButton(
    "widget",
    "static/icons/win11-widget.png",
    "Widgets",
  );
  bindEvent(btn, "click", (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    toggleWidgetsPanel();
  });
  return btn;
}

function buildPinnedButton(entry) {
  const wrap = createElement("div", {
    attributes: {
      value: entry.key,
      "data-open": "false",
      "data-active": "false",
    },
  });
  wrap.appendChild(buildIconButton("", entry.icon, entry.title));
  bindEvent(wrap, "click", () => launchPinned(entry));
  pinnedRefs.push({ entry, wrap });
  return wrap;
}

function renderClock(timeEl, dateEl) {
  const now = new Date();
  timeEl.textContent = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "numeric",
  });
  dateEl.textContent = now.toLocaleDateString("en-US", {
    year: "2-digit",
    month: "2-digit",
    day: "numeric",
  });
}

function updateBatteryFill(fillEl, chargerEl) {
  try {
    if (!navigator || !navigator.getBattery) return;
    navigator
      .getBattery()
      .then((battery) => {
        const render = () => {
          try {
            if (fillEl)
              fillEl.style.width = Math.round(battery.level * 100) + "%";
            if (chargerEl)
              chargerEl.style.display = battery.charging ? "" : "none";
          } catch {
            return;
          }
        };
        render();
        battery.addEventListener("levelchange", render);
        battery.addEventListener("chargingchange", render);
      })
      .catch(() => {});
  } catch {
    return;
  }
}

function minimizeAllWindows() {
  const wins = readOpenWindows();
  if (!wins) return;
  const keys =
    typeof wins.keys === "function"
      ? Array.from(wins.keys())
      : Object.keys(wins);
  keys.forEach((winId) => {
    try {
      os.window.minimize(winId);
    } catch {
      return;
    }
  });
}

function buildTaskRight() {
  const right = createElement("div", { className: "taskright" });
  const chev = createElement("div", {
    className: "px-2 prtclk handcr hvlight flex",
  });
  const chevIcon = createElement("div", {
    className: "uicon prtclk",
    html: CHEVRON_SVG,
  });
  chev.appendChild(chevIcon);
  bindEvent(chev, "click", toggleSystemTray);
  right.appendChild(chev);
  const cluster = createElement("div", {
    className: "prtclk handcr my-1 px-1 hvlight flex rounded",
  });
  const wifiWrap = createElement("div", {
    className: "uicon taskIcon",
    html: WIFI_SVG,
  });
  const audioWrap = createElement("div", {
    className: "uicon taskIcon",
    html: AUDIO_SVG,
  });
  const batteryWrap = createElement("div", { className: "uicon taskIcon" });
  const batterySpan = createElement("span", {
    className: "battery",
    html:
      '<div class="charger">' +
      CHARGER_SVG +
      "</div>" +
      BATTERY_BODY_SVG +
      '<div class="btFull">' +
      BATTERY_FILL_SVG +
      "</div>",
  });
  batteryWrap.appendChild(batterySpan);
  cluster.appendChild(wifiWrap);
  cluster.appendChild(audioWrap);
  cluster.appendChild(batteryWrap);
  bindEvent(cluster, "click", toggleSidePane);
  right.appendChild(cluster);
  updateBatteryFill($(".btFull", batterySpan), $(".charger", batterySpan));
  const dateWrap = createElement("div", {
    className: "taskDate m-1 handcr prtclk rounded hvlight",
  });
  const timeEl = createElement("div");
  const dateEl = createElement("div");
  dateWrap.appendChild(timeEl);
  dateWrap.appendChild(dateEl);
  renderClock(timeEl, dateEl);
  bindEvent(dateWrap, "click", () => {
    try {
      if (!os.app.hasApp(CLOCK_APP_ID)) return;
      const result = os.app.launch(CLOCK_APP_ID);
      if (result && typeof result.catch === "function") result.catch(() => {});
    } catch {
      return;
    }
  });
  right.appendChild(dateWrap);
  const sliver = createElement("div", { className: "uicon graybd my-4" });
  bindEvent(sliver, "click", minimizeAllWindows);
  right.appendChild(sliver);
  clockTimer = setInterval(() => renderClock(timeEl, dateEl), 1000);
  return right;
}

export function setupWin11Taskbar() {
  if (taskRoot) return;
  hideNativeTaskbar();
  pinnedRefs = [];
  focusedWinId = null;
  const taskbar = $("#taskbar");
  if (!taskbar) return;
  taskRoot = createElement("div", { className: "taskcont" });
  const tasksCont = createElement("div", {
    className: "tasksCont",
    attributes: { "data-menu": "task", "data-side": readAlign() },
  });
  const tsbar = createElement("div", { className: "tsbar" });
  tsbar.appendChild(buildStartButton());
  tsbar.appendChild(buildSearchButton());
  tsbar.appendChild(buildWidgetsButton());
  PINNED_APPS.forEach((entry) => tsbar.appendChild(buildPinnedButton(entry)));
  tasksCont.appendChild(tsbar);
  taskRoot.appendChild(tasksCont);
  taskRoot.appendChild(buildTaskRight());
  taskbar.appendChild(taskRoot);
  createdHandler = () => reconcileOpenState();
  closedHandler = (data) => {
    if (data && data.winId && data.winId === focusedWinId) focusedWinId = null;
    reconcileOpenState();
  };
  focusedHandler = (data) => {
    if (data && data.winId) focusedWinId = data.winId;
    reconcileOpenState();
  };
  os.events.on(BusEvents.WINDOW_CREATED, createdHandler);
  os.events.on(BusEvents.WINDOW_CLOSED, closedHandler);
  os.events.on(BusEvents.WINDOW_FOCUSED, focusedHandler);
  reconcileOpenState();
}

export function teardownWin11Taskbar() {
  if (clockTimer) {
    clearInterval(clockTimer);
    clockTimer = null;
  }
  if (createdHandler) {
    os.events.off(BusEvents.WINDOW_CREATED, createdHandler);
    createdHandler = null;
  }
  if (closedHandler) {
    os.events.off(BusEvents.WINDOW_CLOSED, closedHandler);
    closedHandler = null;
  }
  if (focusedHandler) {
    os.events.off(BusEvents.WINDOW_FOCUSED, focusedHandler);
    focusedHandler = null;
  }
  if (taskRoot) {
    taskRoot.remove();
    taskRoot = null;
  }
  pinnedRefs = [];
  focusedWinId = null;
  restoreNativeTaskbar();
}
