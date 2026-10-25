import { StorageKeys, os } from "../../../framework.js";
import "./win11Settings.css";
import {
  getHeaderStyle,
  resolveHeaderStyleId,
} from "../../../windowManager/headerStyles.js";
import { WIN11_PAGES, WIN11_SUBPAGES } from "./win11SettingsPages.js";
import { escapeHtml } from "./win11Controls.js";
import {
  WIN11_CATEGORY_ICON_BASE,
  win11CategoryIcon,
  win11CategoryIds,
} from "./win11SettingsIcons.js";

export function win11TileIcon(icon) {
  if (!icon) return "";
  if (typeof icon === "string" && /^fa[bs]? fa-/.test(icon)) {
    return `<i class="${icon}" style="font-size:20px;margin:0 21px 0 17.5px;"></i>`;
  }
  return `<span class="settingsIcon">${escapeHtml(icon)}</span>`;
}

function renderNavLink(categoryId, selected) {
  return `
    <div class="navLink${selected ? " selected" : ""}" data-win11-category="${escapeHtml(categoryId)}" role="link" tabindex="0">
      <img src="${win11CategoryIcon(categoryId)}" alt="" height="16" width="16" />
      ${escapeHtml(categoryId)}
    </div>`;
}

export function renderWin11Nav(activeCategory) {
  const links = win11CategoryIds()
    .map((categoryId) =>
      renderNavLink(categoryId, categoryId === activeCategory),
    )
    .join("");
  const userName = os.storage.get(StorageKeys.username) || "Guest";
  return `
    <nav>
      <div class="nav_top">
        <div class="account" data-win11-account>
          <img src="${WIN11_CATEGORY_ICON_BASE}/defAccount.webp" alt="" height="60" width="60" />
          <div>
            <p>${escapeHtml(userName)}</p>
            <p>Local Account</p>
          </div>
        </div>
        <input type="text" class="search" placeholder="Find a setting" name="search" id="win11SettingsSearch" autocomplete="off" spellcheck="false" />
      </div>
      <div class="nav_bottom win11Scroll">
        ${links}
        <div class="marker"></div>
      </div>
    </nav>`;
}

function resolveContent(value) {
  return typeof value === "function" ? value() : value || "";
}

function renderTile(tile, categoryId) {
  const classes = ["tile"];
  if (tile.square) classes.push("square");
  if (tile.thin) classes.push("thin-blue");
  if (tile.subPage) classes.push("clickable");
  const content = `
    <div>
      <p>${escapeHtml(tile.name)}</p>
      ${tile.desc ? `<p class="tile_desc">${escapeHtml(tile.desc)}</p>` : ""}
    </div>`;
  const body = resolveContent(tile.body);
  const subPageAttr = tile.subPage
    ? ` data-win11-subpage="${escapeHtml(tile.subPage)}"`
    : "";
  return `
    <div class="${classes.join(" ")}"${subPageAttr} data-win11-category="${escapeHtml(categoryId)}" data-win11-tile-name="${escapeHtml(tile.name)}">
      ${win11TileIcon(tile.icon)}
      ${content}
      ${body}
    </div>`;
}

export function renderWin11Category(categoryId) {
  const page =
    WIN11_PAGES.find((entry) => entry.id === categoryId) || WIN11_PAGES[0];
  const hero = resolveContent(page.hero);
  const tiles = resolveContent(page.tiles) || [];
  const heroHtml = hero ? `<div class="win11-hero">${hero}</div>` : "";
  const tileHtml = tiles
    .map((tile) => {
      if (tile.type === "subHeading") {
        return `<div class="subHeading">${escapeHtml(tile.name)}</div>`;
      }
      if (tile.type === "spacer") return `<div class="spacer"></div>`;
      return renderTile(tile, page.id);
    })
    .join("");
  return `
    <h1>${escapeHtml(page.label || page.id)}</h1>
    <div class="tilesCont win11Scroll">
      ${heroHtml}
      ${tileHtml}
    </div>`;
}

export function renderWin11SubPage(subPageId, parentCategoryId) {
  const subPage = WIN11_SUBPAGES[subPageId];
  if (!subPage) return renderWin11Category(parentCategoryId);
  return `
    <div class="win11-subpage-head">
      <button type="button" class="win11-back" data-win11-back="${escapeHtml(parentCategoryId)}">
        <i class="fas fa-chevron-left" style="font-size:12px;"></i> Back
      </button>
    </div>
    <h1>${escapeHtml(subPage.title || subPageId)}</h1>
    <div class="tilesCont win11Scroll">
      ${resolveContent(subPage.body)}
    </div>`;
}

export function buildWin11SettingsHTML(wm) {
  const headerStyle = getHeaderStyle(resolveHeaderStyleId());
  const headerClass = headerStyle.headerClass
    ? ` ${headerStyle.headerClass}`
    : "";
  const activeCategory = win11CategoryIds()[0];
  return `
  <div class="window-header${headerClass} win11-settings-header">
    <span><i class="fas fa-cog" style="color:white;margin-right:6px;font-size:25px;vertical-align:middle;"></i>Settings</span>
    ${wm.getWindowControls()}
  </div>
  <div class="window-content win11-settings-content" style="padding: 0; gap: 0;">
    <div class="settingsApp win11-settings" id="win11SettingsRoot">
      <div class="restWindow">
        ${renderWin11Nav(activeCategory)}
        <main id="win11SettingsMain">
          ${renderWin11Category(activeCategory)}
        </main>
        <div class="navMenuBtn" data-win11-nav-toggle>
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 48 48" width="24" height="24">
            <path d="M5.5 9a1.5 1.5 0 1 0 0 3h37a1.5 1.5 0 1 0 0-3h-37zm0 13.5a1.5 1.5 0 1 0 0 3h37a1.5 1.5 0 1 0 0-3h-37zm0 13.5a1.5 1.5 0 1 0 0 3h37a1.5 1.5 0 1 0 0-3h-37z" />
          </svg>
        </div>
      </div>
    </div>
  </div>`;
}
