import { os, StorageKeys, $, APP_MANIFESTS } from "../../framework.js";
import { showStartStyleMenu } from "../../shared/contextMenu.js";

const MENU_CLASS = "win11-taskbar-menu";
const HOST_CLASS = "win11-taskbar-menu-host";
const APP_BUTTON_SELECTOR = "[data-win11-app-id]";
const TASKBAR_ITEM_SELECTOR = "#taskbar-windows .taskbar-item";

function findManifest(appId) {
  return (
    APP_MANIFESTS.find((manifest) => manifest.serviceKey === appId) || null
  );
}

function findOpenWindow(appId) {
  if (!appId) return null;
  const taskbarSystem = os.windowManager?.taskbarSystem;
  const winId = taskbarSystem?.findOpenWindowIdByAppId?.(appId);
  if (!winId) return null;
  return document.getElementById(winId) || null;
}

function launchApp(appId) {
  if (!appId) return;
  try {
    const result = os.app.launch(appId);
    if (result && typeof result.catch === "function") result.catch(() => {});
  } catch {}
}

function showAppInfo(appId, fallbackTitle) {
  const manifest = findManifest(appId);
  const info = os.app.getAppInfo(appId);
  const title = manifest?.title || info?.title || fallbackTitle || appId;
  const message =
    manifest?.description || info?.description || `Application id: ${appId}`;
  os.dialog.alert(title, message);
}

function buildAppMenuItems(appId, title, addMenuItem, addSeparator) {
  const openWin = findOpenWindow(appId);

  if (openWin) {
    os.windowManager.buildContextMenuItems(addMenuItem, addSeparator, openWin);
    addSeparator();
  } else {
    addMenuItem(
      "Open",
      () => {
        launchApp(appId);
      },
      "fa-play",
    );
    addSeparator();
  }

  addMenuItem(
    "App Info",
    () => {
      showAppInfo(appId, title);
    },
    "fa-info-circle",
  );
}

function buildWindowMenuItems(win, appId, addMenuItem, addSeparator) {
  os.windowManager.buildContextMenuItems(addMenuItem, addSeparator, win);
  if (!appId) return;
  addSeparator();
  addMenuItem(
    "App Info",
    () => {
      showAppInfo(appId, "");
    },
    "fa-info-circle",
  );
}

function applyTaskbarAlignment(alignment) {
  os.storage.set(StorageKeys.win11TaskbarAlign, alignment);
  const tasksCont = $("#taskbar .tasksCont");
  if (tasksCont) tasksCont.setAttribute("data-side", alignment);
}

function buildTaskbarMenuItems(addMenuItem, addSeparator) {
  addMenuItem(
    "Taskbar Settings",
    () => {
      launchApp("settingsApp");
    },
    "fa-cog",
  );

  addSeparator();

  addMenuItem(
    "Align Center",
    () => {
      applyTaskbarAlignment("center");
    },
    "fa-align-center",
  );

  addMenuItem(
    "Align Left",
    () => {
      applyTaskbarAlignment("left");
    },
    "fa-align-left",
  );
}

function createHost(taskbarRect) {
  const stale = $(`.${HOST_CLASS}`);
  if (stale) stale.remove();

  const host = document.createElement("div");
  host.className = HOST_CLASS;
  host.style.bottom = `${Math.max(0, window.innerHeight - taskbarRect.top)}px`;
  document.body.appendChild(host);
  return host;
}

function positionMenu(menu, anchorRect) {
  const maxLeft = Math.max(8, window.innerWidth - menu.offsetWidth - 8);
  const left = Math.min(Math.max(8, anchorRect.left), maxLeft);
  menu.style.setProperty("--ctx-left", `${left}px`);
  menu.style.setProperty("--ctx-bottom", "0px");
  menu.style.maxHeight = "";
  menu.style.overflowY = "";
}

function trackRemoval(host, menu) {
  const taskbarSystem = os.windowManager?.taskbarSystem;
  const observer = new MutationObserver(() => {
    if (menu.isConnected) return;
    observer.disconnect();
    host.remove();
    if (taskbarSystem) taskbarSystem.contextMenuOpen = false;
  });
  observer.observe(host, { childList: true });
}

function openWin11TaskbarMenu(event, appButton, taskbarItem) {
  const taskbar = $("#taskbar");
  if (!taskbar) return false;

  event.preventDefault();
  event.stopPropagation();

  const taskbarSystem = os.windowManager?.taskbarSystem;
  taskbarSystem?.hideTaskbarPreview?.();
  if (taskbarSystem) taskbarSystem.contextMenuOpen = true;

  const anchor = appButton || taskbarItem || taskbar;
  const anchorRect = anchor.getBoundingClientRect();
  const taskbarRect = taskbar.getBoundingClientRect();
  const host = createHost(taskbarRect);

  const menu = showStartStyleMenu(
    event,
    (addMenuItem, addSeparator) => {
      if (appButton) {
        buildAppMenuItems(
          appButton.dataset.win11AppId,
          appButton.dataset.title || "",
          addMenuItem,
          addSeparator,
        );
        return;
      }
      if (taskbarItem) {
        const win = document.getElementById(taskbarItem.dataset.winId);
        if (win) {
          buildWindowMenuItems(
            win,
            taskbarItem.dataset.appId || "",
            addMenuItem,
            addSeparator,
          );
        }
        return;
      }
      buildTaskbarMenuItems(addMenuItem, addSeparator);
    },
    { container: host, className: MENU_CLASS },
  );

  positionMenu(menu, anchorRect);
  trackRemoval(host, menu);
  return true;
}

export function handleWin11TaskbarContextMenu(event) {
  const target = event.target;
  if (!(target instanceof Element)) return false;

  const appButton = target.closest(APP_BUTTON_SELECTOR);
  const taskbarItem = target.closest(TASKBAR_ITEM_SELECTOR);

  if (!appButton && !taskbarItem) {
    const taskbar = $("#taskbar");
    if (!taskbar || !taskbar.contains(target)) return false;
    return openWin11TaskbarMenu(event, null, null);
  }

  return openWin11TaskbarMenu(event, appButton, taskbarItem);
}
