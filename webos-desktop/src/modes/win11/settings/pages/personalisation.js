import { os, StorageKeys } from "../../../../framework.js";
import { WALLPAPER_NAME_URL_PAIRS } from "../../../../wallpaperConfig.js";
import { resolveWallpaperUrl } from "../../../../shared/assetResolver.js";
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
import "../panels/themeGallery.js";
import "../panels/trayAppsPanel.js";
import "../panels/wallpaperPicker.js";
import {
  WIN11_CONTEXT_MENU_OPTIONS,
  WIN11_FONT_FAMILY_OPTIONS,
  WIN11_HEADER_STYLE_OPTIONS,
  WIN11_ICON_PACK_OPTIONS,
  WIN11_THEME_OPTIONS,
  WIN11_UI_DENSITY_OPTIONS,
} from "../win11SettingsBindings.js";
import { win11Description, win11Icon } from "../win11SettingsIcons.js";

const WALLPAPER_THUMBNAIL_COUNT = 6;

function wallpaperSrc(url) {
  if (typeof url !== "string" || !url) return "";
  return resolveWallpaperUrl(url) || url;
}

function readCurrentWallpaper() {
  const stored = os.storage.get(StorageKeys.wallpaperKey);
  if (typeof stored !== "string") return "";
  const value = stored.trim();
  if (!value) return "";
  if (value.startsWith("vanta:")) return "";
  if (!/^(https?:\/\/|blob:|data:image\/|\/)/.test(value)) return "";
  return value;
}

function collectWallpaperThumbnails(current) {
  const currentSrc = wallpaperSrc(current);
  const items = WALLPAPER_NAME_URL_PAIRS.slice(
    0,
    WALLPAPER_THUMBNAIL_COUNT,
  ).map((pair) => ({ url: wallpaperSrc(pair.url), name: pair.name }));
  if (currentSrc && !items.some((item) => item.url === currentSrc)) {
    items.unshift({ url: currentSrc, name: "Current wallpaper" });
  }
  return items.slice(0, WALLPAPER_THUMBNAIL_COUNT);
}

function renderPersonalisationHero() {
  const current = readCurrentWallpaper();
  const currentSrc = wallpaperSrc(current);
  const imageHtml = currentSrc
    ? `<img class="mainImg" src="${escapeHtml(currentSrc)}" alt="" />`
    : "";
  const thumbnails = collectWallpaperThumbnails(current);
  const thumbnailsHtml = thumbnails
    .map(
      (item) =>
        `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.name)}"${
          item.url === currentSrc ? ' class="selected"' : ""
        } />`,
    )
    .join("");
  const noteHtml = currentSrc
    ? ""
    : note("Open the Wallpaper Engine to pick a background for your desktop.");
  return `
    <div class="personaliseTop">
      ${imageHtml}
      <div>
        <h3>Select a theme to apply</h3>
        <div class="bgBox">${thumbnailsHtml}</div>
        ${noteHtml}
      </div>
    </div>`;
}

export const personalisationPage = {
  id: "Personalisation",
  label: "Personalisation",
  hero: renderPersonalisationHero,
  tiles: () => [
    {
      name: "Background",
      desc: win11Description("Personalisation", "Background"),
      icon: win11Icon("Personalisation", "Background"),
      subPage: "personal-background",
    },
    {
      name: "Colours",
      desc: win11Description("Personalisation", "Colours"),
      icon: win11Icon("Personalisation", "Colours"),
      subPage: "personal-colours",
    },
    {
      name: "Themes",
      desc: win11Description("Personalisation", "Themes"),
      icon: win11Icon("Personalisation", "Themes"),
      subPage: "personal-themes",
    },
    {
      name: "Lock screen",
      desc: win11Description("Personalisation", "Lock screen"),
      icon: win11Icon("Personalisation", "Lock screen"),
      subPage: "personal-lock",
    },
    {
      name: "Start",
      desc: win11Description("Personalisation", "Start"),
      icon: win11Icon("Personalisation", "Start"),
      subPage: "personal-start",
    },
    {
      name: "Taskbar",
      desc: win11Description("Personalisation", "Taskbar"),
      icon: win11Icon("Personalisation", "Taskbar"),
      subPage: "personal-taskbar",
    },
    {
      name: "Fonts",
      desc: win11Description("Personalisation", "Fonts"),
      icon: win11Icon("Personalisation", "Fonts"),
      subPage: "personal-fonts",
    },
    {
      name: "Icons",
      desc: win11Description(
        "Personalisation",
        "Icons",
        "Choose the icon set used across the desktop",
      ),
      icon: "fas fa-icons",
      subPage: "personal-icons",
    },
  ],
  subPages: {
    "personal-background": {
      title: "Background",
      body: () =>
        [
          toggle(
            "cycleWallpaper",
            "Cycle Wallpapers on Start",
            "Automatically switch wallpapers on boot",
          ),
          toggle(
            "hideDesktopIcons",
            "Hide Desktop Icons",
            "Hide all desktop icons for a cleaner look",
          ),
          slider(
            "desktopIconSize",
            "Desktop Icon Size",
            "Adjust the size of desktop icons",
            { min: 32, max: 128, step: 8, format: "px" },
          ),
          action(
            "wallpaperEngine",
            "Wallpaper",
            "Browse and download wallpapers",
            "Open Wallpaper Engine",
            "primary",
          ),
          action(
            "uploadWallpaper",
            "Upload Wallpaper",
            "Set a picture or video from your device",
            "Upload",
          ),
          custom(
            "wallpaperPicker",
            "Wallpaper picker",
            "Pick a wallpaper without leaving settings",
          ),
        ].join(""),
    },
    "personal-colours": {
      title: "Colours",
      body: () =>
        [
          subHeading("Style & Transparency"),
          select(
            "theme",
            "Theme",
            "Set the OS colour scheme",
            WIN11_THEME_OPTIONS,
          ),
          action(
            "customColors",
            "Custom Colors",
            "Override theme colours manually",
            "Customize",
          ),
          subHeading("Transparency"),
          slider(
            "windowTransparency",
            "Window Transparency",
            "Adjust window opacity",
            { min: 20, max: 100, step: 1, format: "percent" },
          ),
          toggle(
            "transparentUI",
            "Transparent UI",
            "Enable glassmorphism across surfaces",
          ),
          subHeading("Transparent surfaces"),
          toggle("tp_taskbar", "Taskbar", "Use transparency on the taskbar"),
          toggle(
            "tp_windowHeader",
            "Window Header",
            "Use transparency on window headers",
          ),
          toggle(
            "tp_windowBody",
            "Window Body",
            "Use transparency on window bodies",
          ),
          toggle(
            "tp_startMenu",
            "Start Menu",
            "Use transparency on the start menu",
          ),
          toggle(
            "tp_contextMenus",
            "Context Menus",
            "Use transparency on context menus",
          ),
          toggle("tp_tray", "Tray Panels", "Use transparency on tray panels"),
          subHeading("Surface blur"),
          slider("blur_window", "Window", "Window body and header blur", {
            min: 0,
            max: 60,
            step: 1,
            format: "px",
          }),
          slider("blur_taskbar", "Taskbar", "Taskbar blur radius", {
            min: 0,
            max: 60,
            step: 1,
            format: "px",
          }),
          slider("blur_startMenu", "Start Menu", "Start menu blur radius", {
            min: 0,
            max: 60,
            step: 1,
            format: "px",
          }),
          slider("blur_context", "Context Menus", "Context menu blur radius", {
            min: 0,
            max: 60,
            step: 1,
            format: "px",
          }),
          slider("blur_tray", "Tray Panels", "Tray panel blur radius", {
            min: 0,
            max: 60,
            step: 1,
            format: "px",
          }),
        ].join(""),
    },
    "personal-themes": {
      title: "Themes",
      body: () =>
        [
          select(
            "theme",
            "Theme",
            "Set the OS colour scheme",
            WIN11_THEME_OPTIONS,
          ),
          subHeading("Icons & Taskbar"),
          segment(
            "iconPack",
            "Icon Pack",
            "Choose Icon Style",
            WIN11_ICON_PACK_OPTIONS,
          ),
          segment(
            "contextMenuStyle",
            "Context Menus",
            "Choose Context Menu Style",
            WIN11_CONTEXT_MENU_OPTIONS,
          ),
          subHeading("Window Headers"),
          select(
            "headerStyle",
            "Window Header Style",
            "Choose the window title bar design",
            WIN11_HEADER_STYLE_OPTIONS,
          ),
          custom("themeGallery", "Theme Gallery", "Featured and saved themes"),
        ].join(""),
    },
    "personal-lock": {
      title: "Lock screen",
      body: () =>
        [
          toggle(
            "windowSessionPersistence",
            "Remember Open Windows",
            "Restore the previous window layout after a restart",
          ),
          note(
            "Lock the session from the lock screen button in the taskbar quick settings.",
          ),
        ].join(""),
    },
    "personal-start": {
      title: "Start",
      body: () =>
        [
          slider(
            "startMenuWidth",
            "Start Menu Width",
            "Adjust the width of the start menu",
            { min: 400, max: 1000, step: 10, format: "px" },
          ),
          slider(
            "startMenuHeight",
            "Start Menu Height",
            "Adjust the height of the start menu",
            { min: 300, max: 900, step: 10, format: "px" },
          ),
          subHeading("Start Menu Categories"),
          toggle(
            "startMenuCat_menu",
            "Menu",
            "Show the All apps entry in the start menu",
          ),
          toggle("startMenuCat_games", "Games", "Show the Games category"),
          toggle("startMenuCat_system", "System", "Show the System category"),
          toggle(
            "startMenuCat_favorites",
            "Favorites",
            "Show the Favorites category",
          ),
          toggle(
            "startMenuCat_settingsApp",
            "Settings",
            "Show the Settings category",
          ),
        ].join(""),
    },
    "personal-taskbar": {
      title: "Taskbar",
      body: () =>
        [
          subHeading("Taskbar"),
          segment(
            "taskbarPosition",
            "Taskbar Position",
            "Dock the taskbar to an edge",
            [
              { value: "bottom", label: "Bottom" },
              { value: "top", label: "Top" },
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
            ],
          ),
          segment(
            "taskbarAlignment",
            "Taskbar Alignment",
            "Choose alignment for taskbar icons",
            [
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ],
          ),
          segment(
            "win11TaskbarAlign",
            "Windows 11 Alignment",
            "Center icons like Windows 11 or align them left",
            [
              { value: "center", label: "Center" },
              { value: "left", label: "Left" },
            ],
          ),
          toggle(
            "taskbarShowLabels",
            "Show Taskbar Labels",
            "Display window titles next to taskbar icons",
          ),
          slider(
            "taskbarScale",
            "Taskbar Scale",
            "Scale the size of the taskbar",
            { min: 50, max: 200, step: 10, format: "percent" },
          ),
          toggle(
            "trayEnabled",
            "Enable Tray",
            "Show system tray in the taskbar",
          ),
          subHeading("System Tray"),
          custom(
            "trayApps",
            "Tray Apps",
            "Toggle visibility of individual tray applications",
          ),
          toggle(
            "sidebarCompact",
            "Compact Sidebar",
            "Collapse categories into a rail; turn off to show all sections at once",
          ),
          subHeading("Dock"),
          toggle(
            "dockEnabled",
            "Enable Mac Dock",
            "Switch from taskbar to a macOS style dock",
          ),
          segment("dockPosition", "Position", "Dock screen edge", [
            { value: "bottom", label: "Bottom" },
            { value: "left", label: "Left" },
            { value: "right", label: "Right" },
          ]),
          toggle(
            "dockAutoHide",
            "Auto-Hide",
            "Dock hides until you hover near the edge",
          ),
          toggle(
            "dockMagnification",
            "Magnification",
            "Hover zoom effect on dock icons",
          ),
          slider(
            "dockMagnifyAmount",
            "Magnification Amount",
            "How much icons scale up on hover",
            { min: 0.1, max: 3, step: 0.1, format: "x" },
          ),
          slider(
            "dockMagnifyRange",
            "Magnification Range",
            "How many adjacent icons are affected",
            { min: 1, max: 5, step: 1 },
          ),
          slider("dockIconSize", "Icon Size", "Base size of dock icons", {
            min: 28,
            max: 80,
            step: 4,
            format: "px",
          }),
          slider("dockScale", "Dock Scale", "Overall size of the dock bar", {
            min: 50,
            max: 200,
            step: 10,
            format: "percent",
          }),
          slider(
            "dockAnimationSpeed",
            "Animation Speed",
            "Hover and transition speed",
            { min: 0.05, max: 0.5, step: 0.05, format: "seconds" },
          ),
        ].join(""),
    },
    "personal-fonts": {
      title: "Fonts",
      body: () =>
        [
          slider("fontSize", "Font Size", "Adjust the base font size", {
            min: 75,
            max: 150,
            step: 5,
            format: "percent",
          }),
          select(
            "fontFamily",
            "Font Family",
            "Choose the system font",
            WIN11_FONT_FAMILY_OPTIONS,
          ),
          slider("guiScale", "GUI Scale", "Scale the entire interface", {
            min: 50,
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
        ].join(""),
    },
    "personal-icons": {
      title: "Icons",
      body: () =>
        segment(
          "iconPack",
          "Icon Pack",
          "Choose Icon Style",
          WIN11_ICON_PACK_OPTIONS,
        ),
    },
  },
};
