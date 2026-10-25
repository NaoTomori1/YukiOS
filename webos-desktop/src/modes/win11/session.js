import { MODES } from "../../modeManager.js";
import { os, StorageKeys, BusEvents } from "../../framework.js";
import { taskbarPositionManager } from "../../desktopui/taskbarPositionManager.js";
import { SessionMode } from "../shared/sessionBase.js";
import { win11Manager } from "./Win11Manager.js";
import { WIN11_WALLPAPER } from "./Win11Wallpaper.js";
import { showWin11BootScreen, hideWin11BootScreen } from "./Win11BootScreen.js";
import { playSfx, SystemSfx } from "../../sfx/systemSfx.js";
import { SystemUtilities } from "../../system.js";
import { trayManager } from "../../tray/tray.js";

const win11Session = new SessionMode(MODES.WIN11);

let win11WallpaperApplied = false;

function applyWin11Wallpaper() {
  try {
    SystemUtilities.applyWallpaperOnly(WIN11_WALLPAPER);
    win11WallpaperApplied = true;
  } catch {}
}

function restoreUserWallpaper() {
  if (!win11WallpaperApplied) return;
  win11WallpaperApplied = false;
  try {
    const result = SystemUtilities.loadWallpaper();
    if (result && typeof result.catch === "function") {
      result.catch(() => {});
    }
  } catch {}
}

function syncSpeakerIndicators() {
  try {
    os.windowManager?.taskbarSystem?.syncSpeakerIndicators();
  } catch {}
}

export function applyWin11Settings({ playStartup = false } = {}) {
  win11Session.enter();
  const runSetup = () => {
    const prevPos =
      taskbarPositionManager.getCurrentPosition() ||
      os.storage.get(StorageKeys.taskbarPosition) ||
      "bottom";
    os.storage.set(StorageKeys.win11PrevTaskbar, prevPos);
    const prevAlign = os.storage.get(StorageKeys.taskbarAlignment) || "left";
    os.storage.set(StorageKeys.win11PrevAlign, prevAlign);
    taskbarPositionManager.setPosition("bottom");
    let align = os.storage.get(StorageKeys.win11TaskbarAlign);
    if (align !== "center" && align !== "left") {
      align = "center";
      os.storage.set(StorageKeys.win11TaskbarAlign, align);
    }
    taskbarPositionManager.setAlignment(align);
    if (!os.storage.get(StorageKeys.win11PrevHeader)) {
      os.storage.set(
        StorageKeys.win11PrevHeader,
        os.storage.get(StorageKeys.windowHeaderStyle) || "default",
      );
    }
    os.storage.set(StorageKeys.windowHeaderStyle, "win11");
    os.events.emit(BusEvents.SETTINGS_CHANGED, {});
    win11Manager.setup();
    syncSpeakerIndicators();
    applyWin11Wallpaper();
    trayManager.render();
  };
  const finish = () => {
    runSetup();
    if (playStartup) playSfx(SystemSfx.STARTUP);
  };
  if (os.storage.get(StorageKeys.win11SkipStartupBoot)) {
    os.storage.remove(StorageKeys.win11SkipStartupBoot);
    finish();
    return;
  }
  showWin11BootScreen(1500).then(finish).catch(finish);
}

export function disableWin11Settings() {
  win11Session.exit();
  hideWin11BootScreen();
  const prevPos = os.storage.get(StorageKeys.win11PrevTaskbar) || "bottom";
  const restorePos = ["top", "bottom", "left", "right"].includes(prevPos)
    ? prevPos
    : "bottom";
  os.storage.set(StorageKeys.taskbarPosition, restorePos);
  taskbarPositionManager.setPosition(restorePos);
  os.storage.remove(StorageKeys.win11PrevTaskbar);
  const prevAlign = os.storage.get(StorageKeys.win11PrevAlign) || "left";
  const restoreAlign = ["left", "center", "right"].includes(prevAlign)
    ? prevAlign
    : "left";
  taskbarPositionManager.setAlignment(restoreAlign);
  os.storage.remove(StorageKeys.win11PrevAlign);
  const prevHeader = os.storage.get(StorageKeys.win11PrevHeader);
  if (prevHeader) {
    os.storage.set(StorageKeys.windowHeaderStyle, prevHeader);
    os.storage.remove(StorageKeys.win11PrevHeader);
    os.events.emit(BusEvents.SETTINGS_CHANGED, {});
  }
  win11Manager.teardown();
  syncSpeakerIndicators();
  restoreUserWallpaper();
  trayManager.render();
}
