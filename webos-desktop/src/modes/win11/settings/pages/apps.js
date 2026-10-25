import { os, StorageKeys, BusEvents } from "../../../../framework.js";
import { action, custom, escapeHtml, subHeading } from "../win11Controls.js";
import { registerWin11Binding } from "../win11SettingsBindings.js";
import { win11Icon, win11Description } from "../win11SettingsIcons.js";
import {
  $,
  $$,
  bindEvent,
  setHTML,
  setText,
} from "../../../../shared/domUtils.js";
import { renderSelectMenu } from "../../../../shared/selectMenu.js";
import {
  loadRuffleConfig,
  saveRuffleConfig,
} from "../../../../ruffle/ruffleSettings.js";
import {
  getSystemApps,
  loadStartupApps,
  saveStartupApps,
} from "../../../../shared/startupApps.js";
import "../panels/addOnsPanel.js";

const RUFFLE_DISPLAY_ROWS = [
  {
    key: "letterbox",
    title: "Letterbox",
    desc: "How the stage fits the window",
    options: [
      { value: "off", label: "Off stretches to fill" },
      { value: "on", label: "On keeps aspect ratio (default)" },
      { value: "fullscreen", label: "Fullscreen fills viewport" },
    ],
  },
  {
    key: "scale",
    title: "Scale Mode",
    desc: "SWF stage scaling",
    options: [
      { value: "showAll", label: "Show All" },
      { value: "noBorder", label: "No Border" },
      { value: "exactFit", label: "Exact Fit" },
      { value: "noScale", label: "No Scale" },
    ],
  },
];

const RUFFLE_PLAYBACK_ROWS = [
  {
    key: "autoplay",
    title: "Autoplay",
    desc: "Start SWF without a user gesture",
    options: [
      { value: "on", label: "On" },
      { value: "off", label: "Off" },
      { value: "auto", label: "Auto" },
    ],
  },
  {
    key: "unmuteOverlay",
    title: "Unmute Overlay",
    desc: "Click to unmute prompt for audio",
    options: [
      { value: "visible", label: "Visible" },
      { value: "hidden", label: "Hidden" },
    ],
  },
  {
    key: "contextMenu",
    title: "Context Menu",
    desc: "Right click menu inside the player",
    options: [
      { value: "on", label: "On" },
      { value: "off", label: "Off" },
      { value: "rightClickOnly", label: "Right click only" },
    ],
  },
];

const RUFFLE_COMPATIBILITY_ROWS = [
  {
    key: "openUrlMode",
    title: "Open URL Mode",
    desc: "How navigateToURL is handled",
    options: [
      { value: "allow", label: "Allow" },
      { value: "confirm", label: "Confirm" },
      { value: "deny", label: "Deny" },
    ],
  },
  {
    key: "logLevel",
    title: "Log Level",
    desc: "Verbosity inside the player console",
    options: [
      { value: "error", label: "Error" },
      { value: "warn", label: "Warn" },
      { value: "info", label: "Info" },
      { value: "debug", label: "Debug" },
      { value: "trace", label: "Trace" },
    ],
  },
];

const RUFFLE_TOGGLE_ROWS = [
  {
    key: "splashScreen",
    title: "Splash Screen",
    desc: "Show the Ruffle loading animation",
  },
  {
    key: "allowScriptAccess",
    title: "Allow Script Access",
    desc: "Let SWF content call JavaScript",
  },
  {
    key: "upgradeToHttps",
    title: "Upgrade to HTTPS",
    desc: "Rewrite http subrequests to https",
  },
  {
    key: "showSwfDownload",
    title: "Show SWF Download",
    desc: "Offer a download button when a game fails",
  },
  {
    key: "warnOnUnsupportedContent",
    title: "Warn on Unsupported Content",
    desc: "Console warning for unimplemented AS APIs",
  },
];

let ruffleFieldIndex = 0;

function nextRuffleFieldId(prefix) {
  ruffleFieldIndex += 1;
  return `win11Ruffle${prefix}${ruffleFieldIndex}`;
}

function saveRufflePatch(patch) {
  saveRuffleConfig(patch);
  os.events.emit(BusEvents.SETTINGS_CHANGED, {
    key: StorageKeys.ruffleConfig,
    value: patch,
  });
}

function ruffleSelectRow(row, config) {
  return `
    <div class="win11-control win11-control--select">
      <div class="win11-control__text">
        <p class="win11-control__title">${escapeHtml(row.title)}</p>
        <p class="win11-control__desc">${escapeHtml(row.desc)}</p>
      </div>
      ${renderSelectMenu(
        nextRuffleFieldId(row.key),
        row.options,
        config[row.key],
        "",
        `data-ruffle-select="${escapeHtml(row.key)}"`,
      )}
    </div>`;
}

function ruffleToggleRow(row, config) {
  const enabled = !!config[row.key];
  return `
    <div class="win11-control win11-control--toggle">
      <div class="win11-control__text">
        <p class="win11-control__title">${escapeHtml(row.title)}</p>
        <p class="win11-control__desc">${escapeHtml(row.desc)}</p>
      </div>
      <button type="button" class="win11-switch${enabled ? " is-on" : ""}" role="switch" aria-checked="${enabled ? "true" : "false"}" aria-label="${escapeHtml(row.title)}" data-ruffle-toggle="${escapeHtml(row.key)}">
        <span class="win11-switch__thumb"></span>
      </button>
    </div>`;
}

function ruffleColorRow(config) {
  return `
    <div class="win11-control">
      <div class="win11-control__text">
        <p class="win11-control__title">Background Color</p>
        <p class="win11-control__desc">Stage background while letterboxed</p>
      </div>
      <input type="color" class="wp-control-input" data-ruffle-color value="${escapeHtml(config.backgroundColor)}" aria-label="Background Color" />
    </div>`;
}

function ruffleDurationRow(config) {
  return `
    <div class="win11-control win11-control--text">
      <div class="win11-control__text">
        <p class="win11-control__title">Max Execution Duration</p>
        <p class="win11-control__desc">Seconds before a script timeout</p>
      </div>
      <input type="number" class="win11-input" data-ruffle-duration min="1" max="120" step="1" value="${escapeHtml(String(config.maxExecutionDuration))}" aria-label="Max Execution Duration" />
    </div>`;
}

function ruffleResetRow() {
  return `
    <div class="win11-control win11-control--action">
      <div class="win11-control__text">
        <p class="win11-control__title">Reset Ruffle Settings</p>
        <p class="win11-control__desc">Restore every Flash option to its default</p>
      </div>
      <button type="button" class="win11-action" data-ruffle-reset>Reset</button>
    </div>`;
}

registerWin11Binding("ruffleSettings", {
  type: "custom",
  render: () => `<div class="win11-empty">Loading Flash options...</div>`,
  bind: (host) => {
    const render = () => {
      const config = loadRuffleConfig();
      const displayRows = RUFFLE_DISPLAY_ROWS.map((row) =>
        ruffleSelectRow(row, config),
      );
      const playbackRows = [
        ruffleToggleRow(RUFFLE_TOGGLE_ROWS[0], config),
        ...RUFFLE_PLAYBACK_ROWS.map((row) => ruffleSelectRow(row, config)),
      ];
      const compatibilityRows = [
        ruffleToggleRow(RUFFLE_TOGGLE_ROWS[1], config),
        ruffleToggleRow(RUFFLE_TOGGLE_ROWS[2], config),
        ruffleToggleRow(RUFFLE_TOGGLE_ROWS[3], config),
        ruffleToggleRow(RUFFLE_TOGGLE_ROWS[4], config),
        ...RUFFLE_COMPATIBILITY_ROWS.map((row) => ruffleSelectRow(row, config)),
      ];
      setHTML(
        host,
        [
          subHeading("Display"),
          ...displayRows,
          ruffleColorRow(config),
          subHeading("Playback"),
          ...playbackRows,
          subHeading("Compatibility"),
          ...compatibilityRows,
          subHeading("Advanced"),
          ruffleDurationRow(config),
          ruffleResetRow(),
        ].join(""),
      );
      bindRuffleEvents(host, render);
    };
    render();
  },
});

function bindRuffleEvents(host, render) {
  $$("[data-ruffle-select]", host).forEach((element) => {
    bindEvent(element, "change", () => {
      saveRufflePatch({
        [element.dataset.ruffleSelect]: element.dataset.value,
      });
    });
  });

  $$("[data-ruffle-toggle]", host).forEach((element) => {
    bindEvent(element, "click", () => {
      const next = !element.classList.contains("is-on");
      element.classList.toggle("is-on", next);
      element.setAttribute("aria-checked", next ? "true" : "false");
      saveRufflePatch({ [element.dataset.ruffleToggle]: next });
    });
  });

  $$("[data-ruffle-color]", host).forEach((element) => {
    bindEvent(element, "input", () => {
      saveRufflePatch({ backgroundColor: element.value });
    });
    bindEvent(element, "change", () => {
      saveRufflePatch({ backgroundColor: element.value });
    });
  });

  $$("[data-ruffle-duration]", host).forEach((element) => {
    bindEvent(element, "change", () => {
      const value = Math.max(1, Math.min(120, Number(element.value) || 15));
      element.value = String(value);
      saveRufflePatch({ maxExecutionDuration: value });
    });
  });

  bindEvent($("[data-ruffle-reset]", host), "click", async () => {
    const confirmed = await os.dialog.confirm(
      "Reset Ruffle Settings",
      "Restore every Flash option to its default?",
    );
    if (!confirmed) return;
    os.storage.remove(StorageKeys.ruffleConfig);
    os.events.emit(BusEvents.SETTINGS_CHANGED, {
      key: StorageKeys.ruffleConfig,
      value: null,
    });
    render();
  });
}

registerWin11Binding("startupApps", {
  type: "custom",
  render: () => `<div class="win11-empty">Loading startup apps...</div>`,
  bind: (host) => {
    const state = { list: loadStartupApps(), filter: "" };

    const renderList = () => {
      const apps = getSystemApps();
      const filter = state.filter.trim().toLowerCase();
      const filtered = apps
        .filter(
          (app) => !filter || (app.title || "").toLowerCase().includes(filter),
        )
        .sort((first, second) => {
          const firstOn = state.list.includes(first.id);
          const secondOn = state.list.includes(second.id);
          if (firstOn && !secondOn) return -1;
          if (!firstOn && secondOn) return 1;
          return (first.title || "").localeCompare(second.title || "");
        });

      const rows = filtered
        .map((app) => {
          const enabled = state.list.includes(app.id);
          const title = app.title || app.id;
          return `
            <div class="win11-control win11-control--toggle">
              <div class="win11-control__text">
                <p class="win11-control__title">${escapeHtml(title)}</p>
                <p class="win11-control__desc">${enabled ? "Starts automatically when YukiOS launches" : "Does not start automatically"}</p>
              </div>
              <button type="button" class="win11-switch${enabled ? " is-on" : ""}" role="switch" aria-checked="${enabled ? "true" : "false"}" aria-label="${escapeHtml(title)}" data-startup-app="${escapeHtml(app.id)}">
                <span class="win11-switch__thumb"></span>
              </button>
            </div>`;
        })
        .join("");

      setHTML(
        $("[data-startup-list]", host),
        rows || `<div class="win11-empty">No apps found</div>`,
      );
      setText(
        $("[data-startup-count]", host),
        `${state.list.length} of ${apps.length} apps start automatically`,
      );

      $$("[data-startup-app]", host).forEach((button) => {
        bindEvent(button, "click", () => {
          const appId = button.dataset.startupApp;
          const index = state.list.indexOf(appId);
          if (index >= 0) state.list.splice(index, 1);
          else state.list.push(appId);
          saveStartupApps([...state.list]);
          renderList();
        });
      });
    };

    setHTML(
      host,
      `
      <div class="win11-control win11-control--text">
        <div class="win11-control__text">
          <p class="win11-control__title">Filter apps</p>
          <p class="win11-control__desc">Search the system apps that can start automatically</p>
        </div>
        <input type="text" class="win11-input" data-startup-filter placeholder="Type an app name" spellcheck="false" aria-label="Filter apps" />
      </div>
      <div class="win11-note" data-startup-count></div>
      <div data-startup-list></div>`,
    );

    bindEvent($("[data-startup-filter]", host), "input", (event) => {
      state.filter = event.target.value;
      renderList();
    });

    renderList();
  },
});

export const appsPage = {
  id: "Apps",
  label: "Apps",
  hero: () => `
    <div class="win11-hero-row">
      <div>
        <p class="win11-control__title">Apps</p>
        <p class="win11-control__desc">Manage applications, file defaults and startup behaviour</p>
      </div>
    </div>`,
  tiles: () => [
    {
      name: "Apps & features",
      desc: win11Description("Apps", "Apps & features"),
      icon: win11Icon("Apps", "Apps & features"),
      subPage: "apps-features",
    },
    {
      name: "Default apps",
      desc: win11Description("Apps", "Default apps"),
      icon: win11Icon("Apps", "Default apps"),
      subPage: "apps-defaults",
    },
    {
      name: "Startup",
      desc: win11Description("Apps", "Startup"),
      icon: win11Icon("Apps", "Startup"),
      subPage: "apps-startup",
    },
    {
      name: "Ruffle (Flash)",
      desc: win11Description("Apps", "Ruffle (Flash)"),
      icon: win11Icon("Apps", "Ruffle (Flash)"),
      subPage: "apps-ruffle",
    },
    {
      name: "Add-ons",
      desc: win11Description(
        "Apps",
        "Add-ons",
        "Uploaded ROMs, virtual machines, Flash and DOS games",
      ),
      icon: win11Icon("Apps", "Add-ons", "fas fa-puzzle-piece"),
      subPage: "apps-addons",
    },
  ],
  subPages: {
    "apps-features": {
      title: "Apps & features",
      body: () =>
        [
          action(
            "installedApps",
            "Installed Apps",
            "View and manage installed applications",
            "Open Installed Apps",
            "primary",
          ),
        ].join(""),
    },
    "apps-defaults": {
      title: "Default apps",
      body: () =>
        action(
          "defaultApps",
          "Default Applications",
          "Choose which app opens each file type",
          "Open Default Apps",
          "primary",
        ),
    },
    "apps-startup": {
      title: "Startup",
      body: () =>
        [
          custom(
            "startupApps",
            "Launch on Startup",
            "Choose which system apps open automatically when YukiOS starts",
          ),
        ].join(""),
    },
    "apps-ruffle": {
      title: "Ruffle (Flash)",
      body: () =>
        [
          subHeading("Flash Player"),
          custom(
            "ruffleSettings",
            "Flash playback options",
            "Configure how the Ruffle player behaves",
          ),
        ].join(""),
    },
    "apps-addons": {
      title: "Add-ons",
      body: () =>
        custom(
          "addOnsPanel",
          "Add-on library",
          "Files and machines you added to YukiOS",
        ),
    },
  },
};
