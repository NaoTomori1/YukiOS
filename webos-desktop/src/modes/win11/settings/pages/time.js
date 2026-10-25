import { os } from "../../../../framework.js";
import { KeybindManager } from "../../../../keybindManager.js";
import { $, $$, bindEvent, setHTML } from "../../../../shared/domUtils.js";
import { action, custom, escapeHtml, note } from "../win11Controls.js";
import { registerWin11Binding } from "../win11SettingsBindings.js";
import { win11Description, win11Icon } from "../win11SettingsIcons.js";

const SHORTCUT_CATEGORY_LABELS = {
  global: "Global & System",
  desktop: "Desktop & Files",
  notepad: "Notepad",
  browser: "Yuki Browser",
  calc: "Calculator",
  calendar: "Calendar",
  terminal: "Terminal",
  office: "Office",
  games: "Games",
  steamdeck: "Yuki Deck",
  custom: "Custom",
};

const MODIFIER_KEYS = ["Shift", "Control", "Alt", "Meta"];

function formatShortcutKeys(keys) {
  if (!Array.isArray(keys) || !keys.length) return "None";
  return keys
    .map((key) => {
      const lower = String(key).toLowerCase();
      if (lower === "ctrl" || lower === "control") return "Ctrl";
      if (lower === "shift") return "Shift";
      if (lower === "alt" || lower === "option") return "Alt";
      if (
        lower === "meta" ||
        lower === "cmd" ||
        lower === "command" ||
        lower === "super"
      )
        return "Cmd";
      if (key === " ") return "Space";
      return key;
    })
    .join(" + ");
}

function shortcutCategoryLabel(cat) {
  return SHORTCUT_CATEGORY_LABELS[cat] || "Shortcuts";
}

function filterShortcuts(shortcuts, query) {
  const term = String(query || "")
    .trim()
    .toLowerCase();
  if (!term) return shortcuts;
  return shortcuts.filter((shortcut) => {
    const desc = String(shortcut.desc || "").toLowerCase();
    const id = String(shortcut.id || "").toLowerCase();
    const cat = shortcutCategoryLabel(shortcut.cat).toLowerCase();
    const keys = (shortcut.currentKeys || []).some((key) =>
      String(key).toLowerCase().includes(term),
    );
    return (
      desc.includes(term) || id.includes(term) || cat.includes(term) || keys
    );
  });
}

function renderShortcutRows(shortcuts, capturingId) {
  if (!shortcuts.length) {
    return `<div class="win11-empty">No keyboard shortcuts found.</div>`;
  }
  return shortcuts
    .map((shortcut) => {
      const capturing = capturingId === shortcut.id;
      const keysLabel = capturing
        ? "Press keys..."
        : formatShortcutKeys(shortcut.currentKeys);
      const customized = KeybindManager.isCustomized(shortcut.id);
      const state = customized ? " | Customized" : "";
      return `
        <div class="win11-control win11-control--stacked" data-shortcut-id="${escapeHtml(shortcut.id)}">
          <div class="win11-control__text">
            <p class="win11-control__title">${escapeHtml(shortcut.desc || shortcut.id)}</p>
            <p class="win11-control__desc">${escapeHtml(shortcutCategoryLabel(shortcut.cat))} | ${escapeHtml(shortcut.id)}${escapeHtml(state)}</p>
          </div>
          <div class="win11-range">
            <button type="button" class="win11-action" data-shortcut-rebind="${escapeHtml(shortcut.id)}">${escapeHtml(keysLabel)}</button>
            <button type="button" class="win11-action" data-shortcut-reset="${escapeHtml(shortcut.id)}"><i class="fas fa-undo"></i></button>
          </div>
        </div>`;
    })
    .join("");
}

registerWin11Binding("shortcutsPanel", {
  type: "custom",
  render: () => `<div class="win11-empty">Loading keyboard shortcuts...</div>`,
  bind: (host) => {
    let captureHandler = null;
    let capturingId = null;

    const stopCapture = () => {
      if (captureHandler) {
        document.removeEventListener("keydown", captureHandler, true);
        captureHandler = null;
      }
      capturingId = null;
    };

    setHTML(
      host,
      `
      <div class="win11-range">
        <input type="text" class="win11-input" data-shortcut-search placeholder="Search shortcuts" spellcheck="false" />
        <button type="button" class="win11-action" data-shortcut-reset-all>Reset all</button>
      </div>
      <div data-shortcut-list></div>`,
    );

    const searchInput = $("[data-shortcut-search]", host);
    const listHost = $("[data-shortcut-list]", host);

    const renderList = () => {
      if (!listHost) return;
      const query = searchInput ? searchInput.value : "";
      const shortcuts = filterShortcuts(KeybindManager.getAll(), query);
      setHTML(listHost, renderShortcutRows(shortcuts, capturingId));

      $$("[data-shortcut-rebind]", listHost).forEach((btn) => {
        bindEvent(btn, "click", () => startCapture(btn.dataset.shortcutRebind));
      });

      $$("[data-shortcut-reset]", listHost).forEach((btn) => {
        bindEvent(btn, "click", async () => {
          const id = btn.dataset.shortcutReset;
          if (id.startsWith("custom_")) {
            const confirmed = await os.dialog.confirm(
              "Delete shortcut",
              "Remove this custom shortcut from the system?",
            );
            if (!confirmed) return;
            KeybindManager.deleteCustomAction(id);
          } else {
            KeybindManager.reset(id);
          }
          renderList();
        });
      });
    };

    const startCapture = (id) => {
      stopCapture();
      capturingId = id;
      captureHandler = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.key === "Escape") {
          stopCapture();
          renderList();
          return;
        }
        if (MODIFIER_KEYS.includes(event.key)) return;
        const keys = [];
        if (event.ctrlKey) keys.push("Ctrl");
        if (event.shiftKey) keys.push("Shift");
        if (event.altKey) keys.push("Alt");
        if (event.metaKey) keys.push("Meta");
        keys.push(event.key === " " ? "Space" : event.key);
        if (!KeybindManager.isCustomizationValid(keys)) return;
        KeybindManager.setKeys(capturingId, keys);
        stopCapture();
        renderList();
      };
      document.addEventListener("keydown", captureHandler, true);
      renderList();
    };

    const resetAllBtn = $("[data-shortcut-reset-all]", host);
    bindEvent(resetAllBtn, "click", () => {
      KeybindManager.resetAll();
      renderList();
    });

    bindEvent(searchInput, "input", () => renderList());

    const windowEl = host.closest ? host.closest(".window") : null;
    bindEvent(windowEl, "remove", stopCapture);

    renderList();
  },
});

function renderTimeHero() {
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
  return `
    <div class="timeTop">
      <h1>${escapeHtml(time)}</h1>
    </div>`;
}

export const timePage = {
  id: "Time & language",
  label: "Time & language",
  hero: renderTimeHero,
  tiles: () => [
    {
      name: "Date & time",
      desc: win11Description("Time & language", "Date & time"),
      icon: win11Icon("Time & language", "Date & time"),
      subPage: "time-datetime",
    },
    {
      name: "Typing",
      desc: win11Description("Time & language", "Typing"),
      icon: win11Icon("Time & language", "Typing"),
      subPage: "time-typing",
    },
  ],
  subPages: {
    "time-datetime": {
      title: "Date & time",
      body: () =>
        [
          action(
            "clock",
            "Clock",
            "Open the clock app to set alarms and timers",
            "Open Clock",
            "primary",
          ),
          note("The system clock follows your device time zone."),
        ].join(""),
    },
    "time-typing": {
      title: "Typing",
      body: () =>
        [
          custom(
            "shortcutsPanel",
            "Keyboard Shortcuts",
            "Rebind keys and create custom shortcut actions",
          ),
        ].join(""),
    },
  },
};
