import win11CategoryData from "./win11SettingsData.json";

export const WIN11_CATEGORY_ICON_BASE = "/img/settings";

export function win11CategoryIcon(categoryId) {
  return `${WIN11_CATEGORY_ICON_BASE}/${categoryId}.webp`;
}

export function win11CategoryIds() {
  return Object.keys(win11CategoryData);
}

export function findWin11TileIcon(categoryId, tileName) {
  const category = win11CategoryData[categoryId];
  if (!category) return "";
  const tile = category.find(
    (entry) => entry.name === tileName && typeof entry.icon === "string",
  );
  return tile ? tile.icon : "";
}

export function findWin11TileDescription(categoryId, tileName) {
  const category = win11CategoryData[categoryId];
  if (!category) return "";
  const tile = category.find((entry) => entry.name === tileName);
  return tile && tile.desc ? tile.desc : "";
}

export function win11Icon(categoryId, tileName, fallback = "fas fa-cog") {
  return findWin11TileIcon(categoryId, tileName) || fallback;
}

export function win11Description(categoryId, tileName, fallback = "") {
  return findWin11TileDescription(categoryId, tileName) || fallback;
}
