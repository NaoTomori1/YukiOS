import { os, StorageKeys } from "../../../../framework.js";
import { openFileWith, resolveFileIcon } from "../../../../fileDisplay.js";
import { $, $$, bindEvent, setHTML } from "../../../../shared/domUtils.js";
import {
  action,
  custom,
  escapeHtml,
  select,
  subHeading,
  textField,
  toggle,
} from "../win11Controls.js";
import { registerWin11Binding } from "../win11SettingsBindings.js";
import { win11Description, win11Icon } from "../win11SettingsIcons.js";
import {
  WIN11_CLOAK_OPTIONS,
  WIN11_PANIC_OPTIONS,
} from "../win11SettingsBindings.js";

function readRecentFiles() {
  let recent = os.storage.get(StorageKeys.recentFiles);
  if (typeof recent === "string") {
    try {
      recent = JSON.parse(recent);
    } catch {
      recent = [];
    }
  }
  if (!Array.isArray(recent)) recent = [];
  return recent;
}

function formatTimestamp(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function fileIconHtml(name) {
  const raw = resolveFileIcon(name);
  if (!raw || raw === "@content" || raw === "rom") {
    return `<i class="fas fa-file"></i>`;
  }
  if (raw.includes("fa-")) {
    return `<i class="${escapeHtml(raw)}"></i>`;
  }
  return `<img src="${escapeHtml(raw)}" alt="" />`;
}

registerWin11Binding("recentFilesPanel", {
  type: "custom",
  render: () => `<div class="win11-empty">Loading recent files...</div>`,
  bind: (host) => {
    const renderList = () => {
      const recent = readRecentFiles();

      if (!recent.length) {
        setHTML(
          host,
          `
          <div class="win11-control win11-control--stacked">
            <div class="win11-control__text">
              <p class="win11-control__title">No recent files yet</p>
              <p class="win11-control__desc">Files you open in the Explorer will appear here</p>
            </div>
          </div>`,
        );
        return;
      }

      const rows = recent
        .map((entry, index) => {
          const path =
            typeof entry.path === "string"
              ? entry.path
              : Array.isArray(entry.path)
                ? entry.path.join("/")
                : "";
          const stamp = entry.timestamp
            ? ` | ${formatTimestamp(entry.timestamp)}`
            : "";
          return `
            <div class="win11-control win11-control--stacked" data-recent-index="${index}">
              <div class="win11-control__text">
                <p class="win11-control__title">${fileIconHtml(entry.name)} ${escapeHtml(entry.name)}</p>
                <p class="win11-control__desc">${escapeHtml(path)}${escapeHtml(stamp)}</p>
              </div>
              <div class="win11-range">
                <button type="button" class="win11-action" data-recent-open="${index}"><i class="fas fa-folder-open"></i> Open</button>
                <button type="button" class="win11-action" data-recent-remove="${index}"><i class="fas fa-xmark"></i> Remove</button>
              </div>
            </div>`;
        })
        .join("");

      setHTML(
        host,
        `
        <div class="win11-control win11-control--stacked">
          <div class="win11-control__text">
            <p class="win11-control__title">File History (${recent.length})</p>
            <p class="win11-control__desc">Files opened recently across YukiOS</p>
          </div>
          <div class="win11-range">
            <button type="button" class="win11-action" data-recent-clear><i class="fas fa-trash"></i> Clear all</button>
          </div>
        </div>
        ${rows}`,
      );

      $$("[data-recent-open]", host).forEach((btn) => {
        bindEvent(btn, "click", () => {
          const entry = readRecentFiles()[Number(btn.dataset.recentOpen)];
          if (!entry) return;
          const dir =
            typeof entry.path === "string"
              ? entry.path.split("/").filter(Boolean)
              : entry.path;
          openFileWith({ name: entry.name, path: dir });
        });
      });

      $$("[data-recent-remove]", host).forEach((btn) => {
        bindEvent(btn, "click", async () => {
          const index = Number(btn.dataset.recentRemove);
          const entry = readRecentFiles()[index];
          if (!entry) return;
          const confirmed = await os.dialog.confirm(
            "Remove from History",
            `Remove "${entry.name}" from your recent files?`,
          );
          if (!confirmed) return;
          const next = readRecentFiles().filter(
            (_, position) => position !== index,
          );
          os.storage.set(StorageKeys.recentFiles, next);
          renderList();
        });
      });

      const clearBtn = $("[data-recent-clear]", host);
      bindEvent(clearBtn, "click", async () => {
        const confirmed = await os.dialog.confirm(
          "Clear History",
          "Remove all recent files? This cannot be undone.",
        );
        if (!confirmed) return;
        os.storage.set(StorageKeys.recentFiles, []);
        renderList();
      });
    };

    renderList();
  },
});

export const privacyPage = {
  id: "Privacy & security",
  label: "Privacy & security",
  tiles: () => [
    {
      name: "Windows Security",
      desc: win11Description("Privacy & security", "Windows Security"),
      icon: win11Icon("Privacy & security", "Windows Security"),
      subPage: "privacy-security",
    },
    {
      name: "General",
      desc: win11Description("Privacy & security", "General"),
      icon: win11Icon("Privacy & security", "General"),
      subPage: "privacy-general",
    },
    {
      name: "Activity history",
      desc: win11Description("Privacy & security", "Activity history"),
      icon: win11Icon("Privacy & security", "Activity history"),
      subPage: "privacy-activity",
    },
  ],
  subPages: {
    "privacy-security": {
      title: "Windows Security",
      body: () =>
        [
          subHeading("Tab Cloak & Panic"),
          select(
            "tabCloak",
            "Tab Cloak",
            "Disguise the tab title and icon",
            WIN11_CLOAK_OPTIONS,
          ),
          textField(
            "aboutBlankDecoy",
            "Decoy URL",
            "Page shown in this tab afterwards",
          ),
          toggle(
            "beforeunload",
            "Prevent tab close",
            "Ask before the tab can be closed",
          ),
          toggle(
            "autoCloakOnBoot",
            "Auto Cloak on Boot",
            "Instantly open about:blank on load and redirect tab",
          ),
          action(
            "aboutBlankNow",
            "Open in about:blank",
            "Reopen YukiOS in a blank tab behind a decoy page",
            "Open now",
          ),
          action(
            "panicKey",
            "Panic key",
            "Press to instantly leave YukiOS",
            "Set key",
          ),
          select(
            "panicPreset",
            "Panic destination",
            "Where the panic key takes you",
            WIN11_PANIC_OPTIONS,
          ),
          textField(
            "panicUrl",
            "Custom panic URL",
            "Used when destination is Custom",
          ),
        ].join(""),
    },
    "privacy-general": {
      title: "General",
      body: () =>
        [
          subHeading("Privacy & Analytics"),
          toggle("analytics", "Analytics", "Allow usage analytics"),
          toggle("ads", "Ads", "Show sponsored content"),
          toggle(
            "achievements",
            "Achievements",
            "Enable or disable the achievement system",
          ),
          toggle(
            "friendsActivity",
            "Share Live Activity",
            "Let others see what game you are playing",
          ),
          toggle(
            "clipboardManager",
            "Clipboard Manager",
            "Enable system wide clipboard history with tray icon",
          ),
          toggle("weather", "Weather", "Show weather in the taskbar"),
        ].join(""),
    },
    "privacy-activity": {
      title: "Activity history",
      body: () =>
        [
          custom(
            "recentFilesPanel",
            "File History",
            "Recently opened files and quick actions",
          ),
        ].join(""),
    },
  },
};
