import { StorageKeys, os } from "../../framework.js";
import { createElement } from "../../shared/domUtils.js";
import { resolveWallpaperUrl } from "../../shared/assetResolver.js";

export const WIN11_WALLPAPER = "/static/wallpapers/win11dark.webp";
const WIN11_WALLPAPER_ZOOM = 4;
const WIN11_WALLPAPER_ZOOM_CLASS = "session-wallpaper-zoom";
const WIN11_WALLPAPER_ZOOMED_CLASS = "session-wallpaper-zoomed";

export function hasCustomLoginWallpaper() {
  try {
    const saved = os.storage.get(StorageKeys.loginWallpaperKey);
    return Boolean(saved && saved !== "none");
  } catch {
    return false;
  }
}

function ensureImageWallpaper(container) {
  const existing = container.querySelector(".session-wallpaper");
  if (existing) {
    if (existing.tagName.toLowerCase() === "img") return existing;
    const img = createElement("img", { className: "session-wallpaper" });
    existing.parentNode.replaceChild(img, existing);
    return img;
  }
  const img = createElement("img", { className: "session-wallpaper" });
  container.insertBefore(img, container.firstChild);
  return img;
}

export function applyWin11LoginWallpaper(
  container,
  { onlyWhenEmpty = false } = {},
) {
  if (!container) return false;
  if (onlyWhenEmpty && hasCustomLoginWallpaper()) return false;
  const bgEl = ensureImageWallpaper(container);
  if (!bgEl) return false;
  bgEl.src = resolveWallpaperUrl(WIN11_WALLPAPER) || WIN11_WALLPAPER;
  bgEl.classList.add(WIN11_WALLPAPER_ZOOM_CLASS);
  bgEl.style.transform = `scale(${WIN11_WALLPAPER_ZOOM})`;
  bgEl.style.transformOrigin = "center";
  container.classList.add(WIN11_WALLPAPER_ZOOMED_CLASS);
  return true;
}

export function resetWin11LoginWallpaper(container) {
  if (!container) return;
  const bgEl = container.querySelector(".session-wallpaper");
  if (bgEl) {
    bgEl.classList.remove(WIN11_WALLPAPER_ZOOM_CLASS);
    bgEl.style.transform = "";
    bgEl.style.transformOrigin = "";
  }
  container.classList.remove(WIN11_WALLPAPER_ZOOMED_CLASS);
}
