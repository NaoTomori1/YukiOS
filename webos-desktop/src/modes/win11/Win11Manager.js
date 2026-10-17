import "./style.css";
import {
  setupWin11StartMenu,
  teardownWin11StartMenu,
  refreshWin11StartMenu,
  openWin11SearchMode,
} from "./Win11StartMenu.js";
import { setupWin11Taskbar, teardownWin11Taskbar } from "./Win11Taskbar.js";
import { setupWin11Widgets, teardownWin11Widgets } from "./Win11Widgets.js";
import { setupWin11SidePane, teardownWin11SidePane } from "./Win11SidePane.js";
import { setupWin11Explorer, teardownWin11Explorer } from "./Win11Explorer.js";
import {
  os,
  StorageKeys,
  $,
  $$,
  bindEvent,
  createElement,
} from "../../framework.js";
import { MODES } from "../../modeManager.js";
import { BusEvents } from "../../core/EventBus.js";
import { resolveIconUrl } from "../../shared/assetResolver.js";

const ALIGN_JUSTIFY = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

export class Win11Manager {
  constructor() {
    this.active = false;
    this.modeEnteredHandler = null;
    this.modeExitedHandler = null;
  }

  init() {
    if (this.modeEnteredHandler) return;
    this.modeEnteredHandler = (data) => {
      if (data && data.id === MODES.WIN11) {
        this.syncStartButton();
        try {
          refreshWin11StartMenu();
        } catch {}
      }
    };
    this.modeExitedHandler = (data) => {
      if (data && data.id === MODES.WIN11) {
        const startButton = $("#start-button");
        if (startButton) startButton.classList.remove("win11-start");
      }
    };
    os.events.on(BusEvents.MODE_ENTERED, this.modeEnteredHandler);
    os.events.on(BusEvents.MODE_EXITED, this.modeExitedHandler);
  }

  setup() {
    if (this.active) {
      this.syncStartButton();
      return;
    }
    this.active = true;
    document.documentElement.dataset.win11 = "true";
    this.applyStoredAlignment();
    this.syncStartButton();
    this.injectTaskbarButtons();
    this.injectStartTsIcon();
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
    $$(".win11-taskbar-btn").forEach((el) => el.remove());
    const tsIcon = $("#win11-start-tsicon");
    if (tsIcon) tsIcon.remove();
    const startButton = $("#start-button");
    if (startButton) {
      startButton.classList.remove("win11-start");
      startButton.style.display = "";
    }
  }

  applyStoredAlignment() {
    const align = os.storage.get(StorageKeys.win11TaskbarAlign) || "center";
    const taskbarWindows = $("#taskbar-windows");
    if (taskbarWindows)
      taskbarWindows.style.justifyContent = ALIGN_JUSTIFY[align] || "center";
  }

  syncStartButton() {
    const startButton = $("#start-button");
    if (startButton) startButton.classList.add("win11-start");
  }

  injectTaskbarButtons() {
    const taskbar = $("#taskbar");
    if (!taskbar) return;
    const anchor = $("#taskbar-windows");
    if (!$("#win11-search-btn")) {
      const searchBtn = createElement("button", {
        id: "win11-search-btn",
        className: "win11-taskbar-btn",
        html: '<i class="fas fa-magnifying-glass"></i>',
        attributes: { title: "Search", "aria-label": "Search" },
      });
      bindEvent(searchBtn, "click", () => this.focusStartSearch());
      if (anchor) taskbar.insertBefore(searchBtn, anchor);
      else taskbar.appendChild(searchBtn);
    }
    if (!$("#win11-widgets-btn")) {
      const widgetsBtn = createElement("button", {
        id: "win11-widgets-btn",
        className: "win11-taskbar-btn",
        html: '<i class="fas fa-cloud-sun"></i>',
        attributes: { title: "Widgets", "aria-label": "Widgets" },
      });
      bindEvent(widgetsBtn, "click", () => this.toggleWidgetsPanel());
      if (anchor) taskbar.insertBefore(widgetsBtn, anchor);
      else taskbar.appendChild(widgetsBtn);
    }
  }

  injectStartTsIcon() {
    if ($("#win11-start-tsicon")) return;
    const taskbarWindows = $("#taskbar-windows");
    if (!taskbarWindows) return;
    const outer = createElement("div", {
      id: "win11-start-tsicon",
      className: "uicon tsIcon",
    });
    const inner = createElement("div", {
      styles: { width: "24px", height: "24px" },
    });
    const img = createElement("img", {
      attributes: {
        width: "24",
        src: resolveIconUrl("static/icons/win11-home.png"),
        alt: "",
      },
    });
    inner.appendChild(img);
    outer.appendChild(inner);
    bindEvent(outer, "click", () => {
      import("../../desktopui/startMenu.js")
        .then((mod) => {
          if (mod && mod.toggleStartMenu) {
            mod.toggleStartMenu();
          } else {
            const startButton = $("#start-button");
            if (startButton) startButton.click();
          }
        })
        .catch(() => {
          const startButton = $("#start-button");
          if (startButton) startButton.click();
        });
    });
    taskbarWindows.prepend(outer);
    const startButton = $("#start-button");
    if (startButton) startButton.style.display = "none";
  }

  focusStartSearch() {
    try {
      openWin11SearchMode();
    } catch {
      const startButton = $("#start-button");
      if (startButton) startButton.click();
    }
    setTimeout(() => {
      const menu = $("#start-menu");
      const input = menu ? $(".startMenu .searchBar input", menu) : null;
      if (input) input.focus();
    }, 80);
  }

  toggleWidgetsPanel() {
    import("./Win11Widgets.js")
      .then((mod) => {
        if (mod && typeof mod.toggleWin11Widgets === "function")
          mod.toggleWin11Widgets();
        else {
          const startButton = $("#start-button");
          if (startButton) startButton.click();
        }
      })
      .catch(() => {
        const startButton = $("#start-button");
        if (startButton) startButton.click();
      });
  }
}

export const win11Manager = new Win11Manager();
