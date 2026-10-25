import { $, createElement, bindEvent } from "../../framework.js";
import { SYSTEM_APPS } from "../../AppRegistryConfig.js";
import { getEffectiveIcon } from "../../shared/iconPack.js";
import { resolveIconUrl } from "../../shared/assetResolver.js";
import { isImageFile } from "../../shared/fileKindDetector.js";
import { renderSelectMenu, bindSelectMenu } from "../../shared/selectMenu.js";
import { playSfx, SystemSfx } from "../../sfx/systemSfx.js";

const VIEW_MENU_ID = "win11-cat-view";

const PAGE_COLUMNS = 4;
const PAGE_ROWS = 3;
const PAGE_SIZE = PAGE_COLUMNS * PAGE_ROWS;
const WHEEL_TICK = 24;
const WHEEL_COOLDOWN = 220;

const CATEGORY_SECTIONS = [
  { key: "productivity", label: "Productivity", categories: ["office"] },
  { key: "other", label: "Other", categories: ["internet"] },
  { key: "developer", label: "Developer Tools", categories: ["development"] },
  { key: "utilities", label: "Utilities", categories: ["utilities", "system"] },
  { key: "entertainment", label: "Entertainment", categories: ["media"] },
  { key: "creativity", label: "Creativity", categories: ["graphics"] },
  { key: "games", label: "Games", categories: ["games"] },
  { key: "accessibility", label: "Accessibility", categories: ["help"] },
];

const VIEW_OPTIONS = [
  { value: "category", label: "Category" },
  { value: "list", label: "List" },
];

const viewState = { mode: "category" };

let activePopup = null;
let activePopupCleanup = null;

function closeCategoryPopup() {
  if (!activePopupCleanup) return;
  const cleanup = activePopupCleanup;
  const popup = activePopup;
  activePopupCleanup = null;
  activePopup = null;
  if (!popup) {
    cleanup();
    return;
  }
  popup.classList.add("closing");
  const onEnd = () => {
    popup.removeEventListener("animationend", onEnd);
    cleanup();
  };
  popup.addEventListener("animationend", onEnd);
}

function isIconImage(effective) {
  return (
    typeof effective === "string" &&
    (isImageFile(effective) ||
      effective.startsWith("http") ||
      effective.startsWith("data:") ||
      effective.startsWith("blob:") ||
      effective.startsWith("/"))
  );
}

function buildCatIcon(iconVal, size) {
  const px = size || 16;
  const effective = getEffectiveIcon(iconVal);
  if (
    typeof effective === "string" &&
    (effective.startsWith("papirus:") || isIconImage(effective))
  ) {
    const iconEl = createElement("img");
    iconEl.className = "catIcon";
    iconEl.src = resolveIconUrl(effective);
    iconEl.alt = "";
    iconEl.width = px;
    iconEl.height = px;
    return iconEl;
  }
  const iconEl = createElement("i");
  iconEl.className =
    (typeof effective === "string" && effective.startsWith("fa")
      ? effective
      : "fas fa-cube") + " catIcon";
  iconEl.style.fontSize = px + "px";
  iconEl.style.width = px + "px";
  iconEl.style.height = px + "px";
  return iconEl;
}

function getRegistryCategories() {
  const map = new Map();
  Object.entries(SYSTEM_APPS).forEach(([id, data]) => {
    if (!data || !data.category) return;
    map.set(id, data.category);
  });
  return map;
}

function resolveCategory(row, registry) {
  const category = registry.get(row.id) || row.category || "";
  if (category === "game" || category === "swf" || category === "remote")
    return "games";
  return category || "other";
}

function getCategoryMap(merged) {
  const registry = getRegistryCategories();
  const map = new Map();
  merged.forEach((row) => {
    const category = resolveCategory(row, registry);
    if (!map.has(category)) map.set(category, []);
    map.get(category).push(row);
  });
  return map;
}

function collectCategoryApps(map, categories) {
  const rows = [];
  categories.forEach((category) => {
    const list = map.get(category) || [];
    list.forEach((row) => {
      if (rows.some((entry) => entry.id === row.id)) return;
      rows.push(row);
    });
  });
  return rows;
}

function buildPopupEntry(app, launchApp) {
  const entry = createElement("div", { className: "catPopupEntry" });
  entry.appendChild(buildCatIcon(app.icon, 26));
  entry.appendChild(
    createElement("div", { className: "catPopupName", text: app.title }),
  );
  bindEvent(entry, "click", () => launchApp(app.id));
  return entry;
}

function positionPopup(root, popup, anchorEl) {
  const rootRect = root.getBoundingClientRect();
  const anchorRect = anchorEl.getBoundingClientRect();
  const popupWidth = popup.offsetWidth;
  const popupHeight = popup.offsetHeight;
  const centered =
    anchorRect.left - rootRect.left + anchorRect.width / 2 - popupWidth / 2;
  const above = anchorRect.top - rootRect.top - popupHeight - 10;
  const maxLeft = Math.max(8, rootRect.width - popupWidth - 8);
  const maxTop = Math.max(8, rootRect.height - popupHeight - 8);
  const left = Math.max(8, Math.min(centered, maxLeft));
  const top = Math.max(8, Math.min(above, maxTop));
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  popup.style.setProperty(
    "--popup-start-y",
    `${anchorRect.top - rootRect.top - top}px`,
  );
}

function openCategoryPopup(section, apps, anchorEl, launchApp) {
  closeCategoryPopup();
  const root = $("#win11-start-root");
  if (!root) return;

  const popup = createElement("div", { className: "catPopup" });
  popup.appendChild(
    createElement("div", { className: "catPopupTitle", text: section.label }),
  );
  const viewport = createElement("div", { className: "catPopupViewport" });
  const track = createElement("div", { className: "catPopupTrack" });
  const totalPages = Math.max(1, Math.ceil(apps.length / PAGE_SIZE));
  for (let index = 0; index < totalPages; index++) {
    const grid = createElement("div", { className: "catPopupGrid" });
    grid.style.top = `${index * 100}%`;
    apps
      .slice(index * PAGE_SIZE, (index + 1) * PAGE_SIZE)
      .forEach((app) => grid.appendChild(buildPopupEntry(app, launchApp)));
    track.appendChild(grid);
  }
  viewport.appendChild(track);
  popup.appendChild(viewport);
  const bar = createElement("div", { className: "catPopupBar" });
  const thumb = createElement("div", { className: "catPopupThumb" });
  bar.appendChild(thumb);
  popup.appendChild(bar);
  root.appendChild(popup);
  activePopup = popup;

  let page = 0;
  let wheelSum = 0;
  let wheelLocked = false;

  const setPage = (next) => {
    if (next < 0 || next >= totalPages) return;
    page = next;
    track.style.transform = `translateY(-${page * 100}%)`;
    const ratio = 1 / totalPages;
    thumb.style.height = `${ratio * 100}%`;
    thumb.style.top = `${page * ratio * 100}%`;
  };
  if (totalPages <= 1) {
    bar.style.display = "none";
  } else {
    setPage(0);
  }

  bindEvent(
    viewport,
    "wheel",
    (event) => {
      event.preventDefault();
      if (wheelLocked) return;
      wheelSum += event.deltaY;
      if (Math.abs(wheelSum) < WHEEL_TICK) return;
      const direction = wheelSum > 0 ? 1 : -1;
      wheelSum = 0;
      setPage(page + direction);
      wheelLocked = true;
      setTimeout(() => {
        wheelLocked = false;
      }, WHEEL_COOLDOWN);
    },
    { passive: false },
  );

  const onDismiss = (event) => {
    if (popup.contains(event.target)) return;
    closeCategoryPopup();
  };
  const onKey = (event) => {
    if (event.key === "Escape") closeCategoryPopup();
  };
  root.addEventListener("click", onDismiss);
  document.addEventListener("keydown", onKey);

  activePopupCleanup = () => {
    root.removeEventListener("click", onDismiss);
    document.removeEventListener("keydown", onKey);
    if (activePopup === popup) activePopup = null;
    popup.remove();
  };

  positionPopup(root, popup, anchorEl);
}

function buildCategoryCard(section, apps, launchApp) {
  const card = createElement("div", { className: "catCard" });
  const box = createElement("div", { className: "catCardBox" });
  for (let index = 0; index < 3; index++) {
    const cell = createElement("div", { className: "catCell" });
    const app = apps[index];
    if (app) cell.appendChild(buildCatIcon(app.icon, 20));
    box.appendChild(cell);
  }
  const lastCell = createElement("div", { className: "catCell" });
  const mini = createElement("div", { className: "catMini" });
  apps.slice(3, 7).forEach((app) => {
    const slot = createElement("div", { className: "catMiniIcon" });
    slot.appendChild(buildCatIcon(app.icon, 10));
    mini.appendChild(slot);
  });
  lastCell.appendChild(mini);
  box.appendChild(lastCell);
  card.appendChild(box);
  card.appendChild(
    createElement("div", { className: "catCardLabel", text: section.label }),
  );
  bindEvent(card, "click", (event) => {
    if (event && event.stopPropagation) event.stopPropagation();
    playSfx(SystemSfx.NAV_NEXT);
    openCategoryPopup(section, apps, card, launchApp);
  });
  return card;
}

function getListLetter(title) {
  const first = (title || "").trim().charAt(0).toUpperCase();
  if (first >= "A" && first <= "Z") return first;
  return "#";
}

function buildAppList(merged, launchApp) {
  const rows = merged.slice().sort((a, b) => a.title.localeCompare(b.title));
  const groups = new Map();
  rows.forEach((row) => {
    const letter = getListLetter(row.title);
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(row);
  });
  const letters = Array.from(groups.keys()).sort((a, b) => {
    if (a === "#") return -1;
    if (b === "#") return 1;
    return a.localeCompare(b);
  });
  const list = createElement("div", { className: "catList" });
  letters.forEach((letter) => {
    list.appendChild(
      createElement("div", { className: "catListLetter", text: letter }),
    );
    groups.get(letter).forEach((row) => {
      const item = createElement("div", { className: "catListRow" });
      item.appendChild(buildCatIcon(row.icon, 32));
      item.appendChild(
        createElement("div", { className: "catListName", text: row.title }),
      );
      bindEvent(item, "click", () => launchApp(row.id));
      list.appendChild(item);
    });
  });
  return list;
}

function buildCategoryBody(merged, launchApp) {
  const body = createElement("div", { className: "catBody" });
  const map = getCategoryMap(merged);
  if (viewState.mode === "list") {
    body.appendChild(buildAppList(merged, launchApp));
    return body;
  }
  const grid = createElement("div", { className: "catGrid" });
  CATEGORY_SECTIONS.forEach((section) => {
    const apps = collectCategoryApps(map, section.categories);
    grid.appendChild(buildCategoryCard(section, apps, launchApp));
  });
  body.appendChild(grid);
  return body;
}

export function buildCategorySection(menuEl, merged, launchApp) {
  const section = createElement("div", { className: "catSection" });
  const bar = createElement("div", { className: "stAcbar" });
  const title = createElement("div", {
    className: "gpname catTitle",
    text: "All",
  });
  const viewWrap = createElement("div", { className: "catView" });
  viewWrap.appendChild(
    createElement("span", { className: "catViewText", text: "View:" }),
  );
  const selectHolder = createElement("div", {
    html: renderSelectMenu(
      VIEW_MENU_ID,
      VIEW_OPTIONS,
      viewState.mode,
      "catViewSelect",
    ),
  });
  viewWrap.appendChild(selectHolder.firstElementChild);
  bar.appendChild(title);
  bar.appendChild(viewWrap);
  let body = createElement("div", { className: "catBody" });
  section.appendChild(bar);
  section.appendChild(body);

  const refresh = () => {
    closeCategoryPopup();
    const fresh = buildCategoryBody(merged, launchApp);
    section.replaceChild(fresh, body);
    body = fresh;
  };

  bindSelectMenu(section, VIEW_MENU_ID, (value) => {
    viewState.mode = value;
    refresh();
  });

  refresh();
  return section;
}
