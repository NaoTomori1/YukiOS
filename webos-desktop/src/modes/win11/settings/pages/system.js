import { $, $$, bindEvent, os } from "../../../../framework.js";
import { formatSize } from "../../../../utils/utils.js";
import {
  action,
  custom,
  escapeHtml,
  note,
  segment,
  select,
  slider,
  subHeading,
  toggle,
} from "../win11Controls.js";
import { registerWin11Binding } from "../win11SettingsBindings.js";
import { win11Icon, win11Description } from "../win11SettingsIcons.js";
import { YUKIOS_VERSION } from "../../../../apps/about.js";
import "../panels/aboutPanel.js";
import "../panels/quickLinks.js";
import "../panels/tilingPanel.js";
import {
  WIN11_ANIMATION_SPEED_OPTIONS,
  WIN11_NOTIFICATION_POSITION_OPTIONS,
  WIN11_PERFORMANCE_OPTIONS,
  WIN11_RESOLUTION_OPTIONS,
  WIN11_UI_DENSITY_OPTIONS,
} from "../win11SettingsBindings.js";

function renderSystemHero() {
  return `
    <div class="sysTop">
      <div class="left">
        <div class="column_device">
          <p class="device_name">YukiOS</p>
          <p class="device_model">${YUKIOS_VERSION}</p>
          <p class="device_rename">Windows 11 mode</p>
        </div>
      </div>
      <div class="right">
        <div class="column" data-win11-goto-category="Windows Update">
          <img src="/img/settings/Windows Update.webp" alt="" height="20" />
          <p>
            Windows Update
            <br />
            <span class="column_lower">Check for YukiOS updates</span>
          </p>
        </div>
      </div>
    </div>`;
}

registerWin11Binding("disksOverview", {
  type: "custom",
  render: () => `<div class="win11-empty">Loading disk information...</div>`,
  bind: (host) => {
    const render = async () => {
      let used = 0;
      let quota = 0;
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate();
          used = estimate.usage || 0;
          quota = estimate.quota || 0;
        }
      } catch {}
      const percent = quota > 0 ? Math.min((used / quota) * 100, 100) : 0;
      let mounts = [];
      try {
        mounts = (os.fs.getMounts && os.fs.getMounts()) || [];
      } catch {}
      const rows = mounts
        .map(
          (mount) => `
          <div class="win11-control win11-control--stacked">
            <div class="win11-control__text">
              <p class="win11-control__title">${mount.label}</p>
              <p class="win11-control__desc">Mounted drive</p>
            </div>
          </div>`,
        )
        .join("");
      let isoMounts = [];
      try {
        isoMounts = (os.fs.getISOMounts && os.fs.getISOMounts()) || [];
      } catch {}
      const isoRows = isoMounts
        .map(
          (iso) => `
          <div class="win11-control">
            <div class="win11-control__text">
              <p class="win11-control__title">${escapeHtml(iso.label)}</p>
              <p class="win11-control__desc">Disc image at ${escapeHtml(iso.mountPoint)}</p>
            </div>
            <button type="button" class="win11-action" data-eject-iso="${escapeHtml(iso.label)}">Eject</button>
          </div>`,
        )
        .join("");
      host.innerHTML = `
        <div class="win11-control win11-control--stacked">
          <div class="win11-control__text">
            <p class="win11-control__title">Local Disk (C:)</p>
            <p class="win11-control__desc">${formatSize(used)} used of origin storage</p>
          </div>
        </div>
        ${rows}
        <div class="subHeading">Disc images</div>
        <div class="win11-control">
          <div class="win11-control__text">
            <p class="win11-control__title">Mount disc image</p>
            <p class="win11-control__desc">Pick an ISO, BIN, IMG, NRG, MDF or CDI file</p>
          </div>
          <button type="button" class="win11-action" data-mount-iso>Mount</button>
        </div>
        ${isoRows}
        <div class="win11-control">
          <div class="win11-control__text">
            <p class="win11-control__title">Storage used</p>
            <p class="win11-control__desc">${percent.toFixed(1)}% of available quota</p>
          </div>
        </div>
        <div class="subHeading">Explore Files</div>
        <div class="win11-control">
          <div class="win11-control__text">
            <p class="win11-control__title">Open Explorer</p>
            <p class="win11-control__desc">Browse your virtual disks and mounted drives</p>
          </div>
          <button type="button" class="win11-action" data-disks-open-explorer>Open</button>
        </div>`;
      const openButton = $("[data-disks-open-explorer]", host);
      if (openButton) {
        bindEvent(openButton, "click", () => {
          os.app.launch("explorerApp").catch(() => {});
        });
      }
      $$("[data-eject-iso]", host).forEach((button) => {
        bindEvent(button, "click", () => {
          const label = button.dataset.ejectIso;
          if (!label) return;
          os.fs.unmountISO(label);
          render();
        });
      });
      $$("[data-mount-iso]", host).forEach((button) => {
        bindEvent(button, "click", async () => {
          const picked = await os.dialog.fileOpen({ initialPath: ["Home"] });
          if (!picked) return;
          const parts = picked.split("/").filter(Boolean);
          const name = parts.pop();
          if (!name) return;
          try {
            await os.fs.mountISO(parts, name);
            render();
          } catch (error) {
            os.dialog.alert(
              "Disc image",
              error?.message || "Could not mount that file.",
            );
          }
        });
      });
    };
    render().catch(() => {
      host.innerHTML = `<div class="win11-control">
        <div class="win11-control__text">
          <p class="win11-control__title">Disk information unavailable</p>
        </div>
      </div>`;
    });
  },
});

export const systemPage = {
  id: "System",
  label: "System",
  hero: renderSystemHero,
  tiles: () => [
    {
      name: "Display",
      desc: win11Description("System", "Display"),
      icon: win11Icon("System", "Display"),
      subPage: "system-display",
    },
    {
      name: "Sound",
      desc: win11Description("System", "Sound"),
      icon: win11Icon("System", "Sound"),
      subPage: "system-sound",
    },
    {
      name: "Notifications",
      desc: win11Description("System", "Notifications"),
      icon: win11Icon("System", "Notifications"),
      subPage: "system-notifications",
    },
    {
      name: "Focus Assist",
      desc: win11Description("System", "Focus Assist"),
      icon: win11Icon("System", "Focus Assist"),
      subPage: "system-focus",
    },
    {
      name: "Power & battery",
      desc: win11Description("System", "Power & battery"),
      icon: win11Icon("System", "Power & battery"),
      subPage: "system-power",
    },
    {
      name: "Storage",
      desc: win11Description("System", "Storage"),
      icon: win11Icon("System", "Storage"),
      subPage: "system-storage",
    },
    {
      name: "Multi-tasking",
      desc: win11Description("System", "Multi-tasking"),
      icon: win11Icon("System", "Multi-tasking"),
      subPage: "system-multitasking",
    },
    {
      name: "Clipboard",
      desc: win11Description("System", "Clipboard"),
      icon: win11Icon("System", "Clipboard"),
      subPage: "system-clipboard",
    },
    {
      name: "Remote Desktop",
      desc: win11Description("System", "Remote Desktop"),
      icon: win11Icon("System", "Remote Desktop"),
      subPage: "system-remote",
    },
    {
      name: "About",
      desc: win11Description("System", "About"),
      icon: win11Icon("System", "About"),
      subPage: "system-about",
    },
    {
      name: "Most Used Pages",
      desc: "Jump straight to the settings you use most",
      icon: "fas fa-star",
      subPage: "system-quicklinks",
    },
  ],
  subPages: {
    "system-display": {
      title: "Display",
      body: () =>
        [
          slider("guiScale", "GUI Scale", "Scale the entire interface", {
            min: 50,
            max: 150,
            step: 5,
            format: "percent",
          }),
          slider("fontSize", "Font Size", "Adjust the base font size", {
            min: 75,
            max: 150,
            step: 5,
            format: "percent",
          }),
          segment(
            "uiDensity",
            "UI Density",
            "Adjust spacing throughout the interface",
            WIN11_UI_DENSITY_OPTIONS,
          ),
          select(
            "virtualResolution",
            "Display Resolution",
            "Scale the desktop to a different resolution",
            WIN11_RESOLUTION_OPTIONS,
          ),
        ].join(""),
    },
    "system-sound": {
      title: "Sound",
      body: () =>
        [
          toggle("soundEnabled", "Sound", "Enable or mute all OS audio"),
          slider("masterVolume", "Master Volume", "Global volume level", {
            min: 0,
            max: 100,
            step: 1,
            format: "percent",
          }),
          toggle(
            "systemAudioEnabled",
            "System Audio",
            "Enable login, logout, error and warning sounds",
          ),
          slider("systemVolume", "System Volume", "Volume for system sounds", {
            min: 0,
            max: 100,
            step: 1,
            format: "percent",
          }),
          toggle(
            "windowsSfxEnabled",
            "Windows Sounds",
            "Play Windows 11 startup, menu and navigation sounds",
          ),
        ].join(""),
    },
    "system-notifications": {
      title: "Notifications",
      body: () =>
        [
          toggle(
            "notificationsEnabled",
            "Enable Notifications",
            "Allow applications to show notifications",
          ),
          toggle(
            "notificationsRemoveTimeout",
            "Remove After Timeout",
            "Automatically dismiss notifications after they expire",
          ),
          toggle(
            "notificationsPopAnimation",
            "Pop Animation",
            "Show a sliding animation when notifications appear",
          ),
          toggle(
            "notificationsOverFullscreen",
            "Display Over Fullscreen",
            "Show notifications over active fullscreen windows",
          ),
          slider(
            "notificationsDuration",
            "Notification Duration",
            "Seconds before a notification expires",
            { min: 1, max: 30, step: 1, format: "seconds" },
          ),
          select(
            "notificationsPosition",
            "Notification Position",
            "Choose which corner notifications appear in",
            WIN11_NOTIFICATION_POSITION_OPTIONS,
          ),
        ].join(""),
    },
    "system-focus": {
      title: "Focus Assist",
      body: () =>
        toggle(
          "dnd",
          "Do Not Disturb",
          "Silence all toast notifications",
        ).concat(
          `<div class="win11-note">Focus Assist mutes banners until you turn it off.</div>`,
        ),
    },
    "system-power": {
      title: "Power & battery",
      body: () =>
        [
          segment(
            "performanceMode",
            "Performance Mode",
            "Reduce heavy visual effects and animations",
            WIN11_PERFORMANCE_OPTIONS,
          ),
          action(
            "physicsChaos",
            "Physics Chaos",
            "Drop every icon and window with gravity",
            "Unleash Chaos",
          ),
        ].join(""),
    },
    "system-storage": {
      title: "Storage",
      body: () =>
        [
          custom(
            "disksOverview",
            "Devices and drives",
            "Local disk and mounted drive usage",
          ),
          subHeading("Revert Options"),
          action(
            "resetToggles",
            "Reset Toggles",
            "Revert all OS switches back to default",
            "Reset",
          ),
          action(
            "resetSaved",
            "Reset to Saved",
            "Revert any unsaved changes to stored configuration",
            "Revert",
          ),
          subHeading("Save YukiOS"),
          action(
            "downloadPage",
            "Download Page",
            "Save a local copy of YukiOS",
            "Download",
          ),
        ].join(""),
    },
    "system-multitasking": {
      title: "Multi-tasking",
      body: () =>
        [
          subHeading("Layout & Alignment"),
          toggle(
            "disableDesktopStretchScroll",
            "Disable Desktop Stretch Scroll",
            "Prevent the desktop page from expanding when windows are dragged out",
          ),
          toggle(
            "showWorkspace",
            "Show Workspaces",
            "Show the workspaces area in the taskbar",
          ),
          toggle(
            "hideDesktopIcons",
            "Hide Desktop Icons",
            "Hide all desktop icons for a cleaner look",
          ),
          subHeading("Window Switcher (Alt+Q)"),
          select(
            "windowSwitcherMode",
            "Switching Logic",
            "Order mode for cycling through windows",
            [
              { value: "mru", label: "Most Recently Used (MRU)" },
              { value: "stack", label: "Cycle / Stack Order" },
            ],
          ),
          select(
            "windowSwitcherUI",
            "UI Display Mode",
            "Visual representation while cycling",
            [
              {
                value: "overlay",
                label: "App Switcher Overlay (shows previews)",
              },
              { value: "direct", label: "Fast Switching (no visual UI)" },
            ],
          ),
          toggle(
            "windowSwitcherIncludeMinimized",
            "Include Minimized Windows",
            "Show minimized windows in the switcher",
          ),
          custom(
            "tilingPanel",
            "Tiling",
            "Tiling bar, layouts and window rules",
          ),
        ].join(""),
    },
    "system-clipboard": {
      title: "Clipboard",
      body: () =>
        toggle(
          "clipboardManager",
          "Clipboard Manager",
          "Enable system wide clipboard history with tray icon",
        ),
    },
    "system-remote": {
      title: "Remote Desktop",
      body: () =>
        action(
          "remoteHost",
          "Remote Desktop",
          "Host this device for remote connections",
          "Open Remote Desktop",
          "primary",
        ),
    },
    "system-about": {
      title: "About",
      body: () =>
        [
          subHeading("Boot & Session"),
          toggle(
            "disableBootScreen",
            "Skip Boot Screen",
            "Skip the boot animation on startup",
          ),
          toggle(
            "windowSessionPersistence",
            "Window Session Persistence",
            "Remember and restore open windows on startup",
          ),
          subHeading("General Behavior"),
          toggle("weather", "Weather", "Show weather in the taskbar"),
          toggle("clippy", "Clippy", "Show Clippy after boot"),
          toggle(
            "cursorEffect",
            "Cursor Launch Effect",
            "Show a bouncing icon on cursor when launching apps",
          ),
          subHeading("System Behavior & Animation"),
          select(
            "windowAnimationSpeed",
            "Animation Speed",
            "Control how fast window animations play",
            WIN11_ANIMATION_SPEED_OPTIONS,
          ),
          toggle("dnd", "Do Not Disturb", "Silence all toast notifications"),
          toggle("soundEnabled", "Sound", "Enable or mute all OS audio"),
          action(
            "physicsChaos",
            "Physics Chaos",
            "Drop every icon and window with gravity",
            "Physics Chaos",
          ),
          action(
            "lockScreen",
            "Lock screen",
            "Immediately lock your session",
            "Lock now",
          ),
          subHeading("Screen Locking"),
          note(
            "Lock the session from the lock screen button in the taskbar quick settings.",
          ),
          subHeading("System information"),
          custom(
            "aboutPanel",
            "System information",
            "System details, credits and diagnostics",
          ),
        ].join(""),
    },
    "system-quicklinks": {
      title: "Most Used Pages",
      body: () =>
        custom(
          "quickLinks",
          "Most Used Pages",
          "Jump straight to the settings you use most",
        ),
    },
  },
};
