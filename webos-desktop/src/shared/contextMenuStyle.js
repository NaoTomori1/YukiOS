import { StorageKeys, os } from "../framework.js";

export const CM_STYLES = {
  YUKIOS: "yukios",
  WIN11: "win11",
};

export function getContextMenuStyle() {
  try {
    const stored = os.storage.get(StorageKeys.contextMenuStyle);
    if (stored === CM_STYLES.WIN11 || stored === CM_STYLES.YUKIOS)
      return stored;
    if (document.documentElement.dataset.win11 !== undefined)
      return CM_STYLES.WIN11;
  } catch {}
  return CM_STYLES.YUKIOS;
}

export function applyContextMenuStyle(style) {
  const normalized =
    style === CM_STYLES.WIN11 ? CM_STYLES.WIN11 : CM_STYLES.YUKIOS;
  document.documentElement.dataset.cmstyle = normalized;
  try {
    os.storage.set(StorageKeys.contextMenuStyle, normalized);
  } catch {}
  return normalized;
}

export function setContextMenuStyle(style) {
  const normalized =
    style === CM_STYLES.WIN11 ? CM_STYLES.WIN11 : CM_STYLES.YUKIOS;
  applyContextMenuStyle(normalized);
  try {
    os.events.emit("context-menu-style-changed", normalized);
  } catch {}
  return normalized;
}
