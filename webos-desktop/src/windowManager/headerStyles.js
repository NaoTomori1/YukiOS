import "../styles/windowHeaderStyles.css";
import { os } from "../framework.js";
import { StorageKeys } from "../StorageKeys.js";
import { resolveIconUrl } from "../shared/assetResolver.js";

export const HEADER_STYLES = {
  default: { id: "default", label: "Default", headerClass: "" },
  mac: { id: "mac", label: "macOS", headerClass: "mac-header" },
  win7: { id: "win7", label: "Windows 7", headerClass: "win7-header" },
  win11: { id: "win11", label: "Windows 11", headerClass: "win11-header" },
  gnome: { id: "gnome", label: "GNOME", headerClass: "gnome-header" },
  kde: { id: "kde", label: "KDE Plasma", headerClass: "gnome-header" },
  winxp: { id: "winxp", label: "Windows XP", headerClass: "winxp-header" },
  winvista: {
    id: "winvista",
    label: "Windows Vista",
    headerClass: "winvista-header",
    controls: "win7",
  },
};

const AVAILABLE_HEADER_STYLES = Object.values(HEADER_STYLES).filter(
  (style) => style.available !== false,
);

export function getAvailableHeaderStyles() {
  return AVAILABLE_HEADER_STYLES;
}

const EXTERNAL_BUTTON_HTML = `<button class="external-btn" aria-label="Open in External">↗</button>`;

const DOWNLOAD_BUTTON_HTML = `<button class="download-btn" aria-label="Download">
      <svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 7L1.5 3.5h2V0h3v3.5h2L5 7zM0 9h10v1H0z"/>
      </svg>
    </button>`;

function buildDefaultControls(externalBtn, downloadBtn) {
  return `<div class="window-controls">
      ${externalBtn}${downloadBtn}
      <button class="minimize-btn" aria-label="Minimize"><svg viewBox="0 0 10 1" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h10v1H0z"></path></svg></button>
      <button class="maximize-btn" aria-label="Maximize">
        <svg class="maximize-glyph" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M0 0v10h10V0H0zm1 1h8v8H1V1z"></path></svg>
        <svg class="restore-glyph" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M3 3V0h7v7h-3v3H0V3h3zm6-1H4v4h5V2zM2 4v4h4V4H2z"></path></svg>
      </button>
      <button class="close-btn" aria-label="Close"><svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M10.2.7L9.5 0 5.1 4.4.7 0 0 .7l4.4 4.4L0 9.5l.7.7 4.4-4.4 4.4 4.4.7-.7-4.4-4.4z"></path></svg></button>
    </div>`;
}

function buildMacControls(externalBtn, downloadBtn) {
  return `<div class="window-controls mac-controls">
        ${externalBtn}${downloadBtn}
        <button class="close-btn mac-btn mac-close" aria-label="Close"></button>
        <button class="minimize-btn mac-btn mac-minimize" aria-label="Minimize"></button>
        <button class="maximize-btn mac-btn mac-maximize" aria-label="Maximize"></button>
      </div>`;
}

function buildWin7Controls(externalBtn, downloadBtn) {
  return `<div class="window-controls win7-controls">
      ${externalBtn}${downloadBtn}
      <div class="win7-caption-group">
        <button class="minimize-btn win7-cap win7-min" aria-label="Minimize"></button>
        <button class="maximize-btn win7-cap win7-max" aria-label="Maximize">
          <span class="maximize-glyph"></span>
          <span class="restore-glyph"></span>
        </button>
        <button class="close-btn win7-cap win7-close" aria-label="Close"></button>
      </div>
    </div>`;
}

function buildWin11Controls(externalBtn, downloadBtn) {
  return `<div class="window-controls win11-controls">
      ${externalBtn}${downloadBtn}
      <button class="minimize-btn win11-btn" aria-label="Minimize"><svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 6h9"></path></svg></button>
      <button class="maximize-btn win11-btn" aria-label="Maximize">
        <svg class="maximize-glyph" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="8" height="8" rx="1"></rect></svg>
        <img class="restore-glyph" width="12" data-action="EXPLORER" data-payload="mxmz" data-click="true" data-flip="false" data-invert="false" data-rounded="false" src="${resolveIconUrl("static/icons/win11-ui-maximize.png")}" alt="">
      </button>
      <button class="close-btn win11-btn" aria-label="Close"><svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7"></path></svg></button>
    </div>`;
}

function buildGnomeControls(externalBtn, downloadBtn) {
  return `<div class="window-controls gnome-controls">
      ${externalBtn}${downloadBtn}
      <button class="minimize-btn gnome-btn" aria-label="Minimize"><svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M3.5 8h9"></path></svg></button>
      <button class="maximize-btn gnome-btn" aria-label="Maximize"><svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><rect x="4.2" y="4.2" width="7.6" height="7.6" rx="1"></rect></svg></button>
      <button class="close-btn gnome-btn" aria-label="Close"><svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"></path></svg></button>
    </div>`;
}

function buildKdeControls(externalBtn, downloadBtn) {
  return `<div class="window-controls kde-controls">
      ${externalBtn}${downloadBtn}
      <button class="minimize-btn kde-btn" aria-label="Minimize"><svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 6.25L8 9.75l3.5-3.5"></path></svg></button>
      <button class="maximize-btn kde-btn" aria-label="Maximize">
        <svg class="maximize-glyph" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 9.75L8 6.25l3.5 3.5"></path></svg>
        <svg class="restore-glyph" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 6.25L8 9.75l3.5-3.5"></path></svg>
      </button>
      <button class="close-btn kde-btn" aria-label="Close"><svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M4.75 4.75l6.5 6.5M11.25 4.75l-6.5 6.5"></path></svg></button>
    </div>`;
}

function buildWinXpControls(externalBtn, downloadBtn) {
  return `<div class="window-controls winxp-controls">
      ${externalBtn}${downloadBtn}
      <button class="minimize-btn winxp-btn winxp-min" aria-label="Minimize"><svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M0 4.5h10v1.5H0z"></path></svg></button>
      <button class="maximize-btn winxp-btn winxp-max" aria-label="Maximize">
        <svg class="maximize-glyph" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M0 1v8h8V1H0zm1 1h6v6H1V2z"></path></svg>
        <svg class="restore-glyph" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M2 0v6h6V0H2zm1 1h4v4H3V1zM0 3v6h6V3H0zm1 1h4v4H1V4z"></path></svg>
      </button>
      <button class="close-btn winxp-btn winxp-close" aria-label="Close"><svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M10 1L9 0 5 4 1 0 0 1l4 4L0 9l1 1 4-4 4 4 1-1-4-4z"></path></svg></button>
    </div>`;
}

const CONTROL_BUILDERS = {
  default: buildDefaultControls,
  mac: buildMacControls,
  win7: buildWin7Controls,
  win11: buildWin11Controls,
  gnome: buildGnomeControls,
  kde: buildKdeControls,
  winxp: buildWinXpControls,
};

export function getStoredHeaderStyleId() {
  const storedStyleId = os.storage.get(StorageKeys.windowHeaderStyle);
  return typeof storedStyleId === "string" &&
    HEADER_STYLES[storedStyleId] &&
    HEADER_STYLES[storedStyleId].available !== false
    ? storedStyleId
    : null;
}

export function resolveHeaderStyleId() {
  return getStoredHeaderStyleId() ?? "default";
}

export function getHeaderStyle(styleId) {
  return HEADER_STYLES[styleId] ?? HEADER_STYLES.default;
}

export function buildControlsForStyle(
  styleId,
  externalUrl = null,
  showDownload = false,
) {
  const style = HEADER_STYLES[styleId] ?? HEADER_STYLES.default;
  const builderKey = style.controls ?? styleId;
  const buildControls = CONTROL_BUILDERS[builderKey] ?? buildDefaultControls;
  const externalBtn = externalUrl ? EXTERNAL_BUTTON_HTML : "";
  const downloadBtn = showDownload ? DOWNLOAD_BUTTON_HTML : "";
  return buildControls(externalBtn, downloadBtn);
}

export function buildHeaderForStyle(title, iconHtml, controlsHtml, styleId) {
  const style = getHeaderStyle(styleId);
  const classes = ["window-header", style.headerClass]
    .filter(Boolean)
    .join(" ");
  return `<div class="${classes}"><span>${iconHtml}${title}</span>${controlsHtml}</div>`;
}
