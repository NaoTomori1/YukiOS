import "./style.css";
import {
  setupWin11StartMenu,
  teardownWin11StartMenu,
  refreshWin11StartMenu,
} from "./Win11StartMenu.js";
import { setupWin11Taskbar, teardownWin11Taskbar } from "./Win11Taskbar.js";
import { setupWin11Widgets, teardownWin11Widgets } from "./Win11Widgets.js";
import { setupWin11SidePane, teardownWin11SidePane } from "./Win11SidePane.js";
import { setupWin11Explorer, teardownWin11Explorer } from "./Win11Explorer.js";
import { os } from "../../framework.js";
import { MODES } from "../../modeManager.js";
import { BusEvents } from "../../core/EventBus.js";

export class Win11Manager {
  constructor() {
    this.active = false;
    this.modeEnteredHandler = null;
  }

  init() {
    if (this.modeEnteredHandler) return;
    this.modeEnteredHandler = (data) => {
      if (data && data.id === MODES.WIN11) {
        try {
          refreshWin11StartMenu();
        } catch {}
      }
    };
    os.events.on(BusEvents.MODE_ENTERED, this.modeEnteredHandler);
  }

  setup() {
    if (this.active) return;
    this.active = true;
    document.documentElement.dataset.win11 = "true";
    try {
      setupWin11StartMenu();
      refreshWin11StartMenu();
    } catch {}
    try {
      setupWin11Taskbar();
    } catch {}
    try {
      setupWin11Explorer();
    } catch {}
    try {
      setupWin11Widgets();
    } catch {}
    try {
      setupWin11SidePane();
    } catch {}
  }

  teardown() {
    try {
      teardownWin11SidePane();
    } catch {}
    try {
      teardownWin11Widgets();
    } catch {}
    try {
      teardownWin11Explorer();
    } catch {}
    try {
      teardownWin11Taskbar();
    } catch {}
    try {
      teardownWin11StartMenu();
    } catch {}
    this.active = false;
    if (document.documentElement.dataset.win11)
      delete document.documentElement.dataset.win11;
  }
}

export const win11Manager = new Win11Manager();
