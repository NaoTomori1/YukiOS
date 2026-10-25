import { $, $$ } from "../../framework.js";

const WINDOW_LIMIT = 50;
const ICON_LIMIT = 60;
const MIN_WINDOW_WIDTH = 200;
const MIN_WINDOW_HEIGHT = 120;
const LAYER_SELECTOR = ".stk-layer";
const CANDIDATE_SELECTOR = ".window, .icon";
const POSITION_FOLLOWING = 4;
const POSITION_PRECEDING = 2;

let candidates = new Set();
let orderedWindows = [];
let orderedIcons = [];
let orderDirty = true;
let observer = null;

function isElement(node) {
  return !!node && node.nodeType === 1;
}

function matchesWindow(el) {
  try {
    return el.matches(".window");
  } catch {
    return false;
  }
}

function matchesIcon(el) {
  try {
    if (!el.matches(".icon")) return false;
    const parent = el.parentElement;
    return !!parent && parent.id === "desktop";
  } catch {
    return false;
  }
}

function collectLoose(root, out) {
  if (!isElement(root)) return;
  try {
    if (root.matches(CANDIDATE_SELECTOR)) out.push(root);
  } catch {}
  let nodes = [];
  try {
    nodes = root.querySelectorAll(CANDIDATE_SELECTOR);
  } catch {
    nodes = [];
  }
  for (let i = 0; i < nodes.length; i++) out.push(nodes[i]);
}

function addCandidate(el) {
  if (!el) return;
  if (!candidates.has(el)) candidates.add(el);
  orderDirty = true;
}

function dropCandidate(el) {
  if (!el) return;
  if (!candidates.has(el)) return;
  candidates.delete(el);
  orderDirty = true;
}

function handleAdded(root) {
  const found = [];
  collectLoose(root, found);
  for (let i = 0; i < found.length; i++) addCandidate(found[i]);
}

function handleRemoved(root) {
  const found = [];
  collectLoose(root, found);
  for (let i = 0; i < found.length; i++) {
    const el = found[i];
    if (el.isConnected) {
      addCandidate(el);
      continue;
    }
    dropCandidate(el);
  }
}

function processRecords(records) {
  try {
    if (!records || !records.length) return;
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        if (!record || record.type !== "childList") continue;
        const removed = record.removedNodes;
        for (let j = 0; j < removed.length; j++) handleRemoved(removed[j]);
        const added = record.addedNodes;
        for (let j = 0; j < added.length; j++) handleAdded(added[j]);
      } catch {}
    }
  } catch {}
}

function sortByDocumentOrder(list) {
  try {
    list.sort((a, b) => {
      if (a === b) return 0;
      const relation = a.compareDocumentPosition(b);
      if (relation & POSITION_FOLLOWING) return -1;
      if (relation & POSITION_PRECEDING) return 1;
      return 0;
    });
  } catch {}
}

function rebuildOrder() {
  const windows = [];
  const icons = [];
  candidates.forEach((el) => {
    try {
      if (!el || !el.isConnected) return;
      if (matchesWindow(el)) {
        windows.push(el);
        return;
      }
      if (matchesIcon(el)) icons.push(el);
    } catch {}
  });
  sortByDocumentOrder(windows);
  sortByDocumentOrder(icons);
  orderedWindows = windows;
  orderedIcons = icons;
  orderDirty = false;
}

function scanDocument() {
  const found = new Set();
  try {
    const wins = $$(".window");
    for (let i = 0; i < wins.length; i++) {
      if (wins[i]) found.add(wins[i]);
    }
  } catch {}
  try {
    const icons = $$("#desktop > .icon");
    for (let i = 0; i < icons.length; i++) {
      if (icons[i]) found.add(icons[i]);
    }
  } catch {}
  candidates = found;
  orderDirty = true;
}

export function initTargetRegistry() {
  try {
    if (observer) return true;
    if (typeof document === "undefined") return false;
    if (!document.body) return false;
    scanDocument();
    observer = new MutationObserver(processRecords);
    observer.observe(document.body, { childList: true, subtree: true });
    return true;
  } catch {
    return false;
  }
}

export function refreshTargetRegistry() {
  try {
    initTargetRegistry();
    scanDocument();
  } catch {}
}

function ensureReady() {
  if (observer) return true;
  return initTargetRegistry();
}

function isRendered(el) {
  try {
    if (el.getClientRects().length === 0) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  } catch {
    return false;
  }
}

function isStartMenuOpen(menu) {
  try {
    if (!menu) return false;
    if (menu.getClientRects().length === 0) return false;
    const style = window.getComputedStyle(menu);
    if (style.display === "none") return false;
    if (style.visibility === "hidden") return false;
    if (menu.style.display !== "flex") return false;
    return true;
  } catch {
    return false;
  }
}

function readRect(el) {
  try {
    return el.getBoundingClientRect();
  } catch {
    return null;
  }
}

function hasArea(rect) {
  if (!rect) return false;
  return rect.width > 0 && rect.height > 0;
}

function collectFiltered() {
  const targets = [];
  const entries = [];
  ensureReady();
  try {
    if (observer) processRecords(observer.takeRecords());
  } catch {}
  if (orderDirty) rebuildOrder();
  try {
    const menu = $("#start-menu");
    if (menu && isStartMenuOpen(menu)) {
      targets.push(menu);
      entries.push({ el: menu, rect: readRect(menu) });
    }
  } catch {}
  const windows = orderedWindows.slice(0, WINDOW_LIMIT);
  for (let i = 0; i < windows.length; i++) {
    try {
      const el = windows[i];
      if (!el || !el.isConnected) continue;
      if (el.closest && el.closest(LAYER_SELECTOR)) continue;
      if (!isRendered(el)) continue;
      if (el.offsetWidth < MIN_WINDOW_WIDTH) continue;
      if (el.offsetHeight < MIN_WINDOW_HEIGHT) continue;
      const rect = readRect(el);
      if (!hasArea(rect)) continue;
      targets.push(el);
      entries.push({ el: el, rect: rect });
    } catch {}
  }
  const icons = orderedIcons.slice(0, ICON_LIMIT);
  for (let i = 0; i < icons.length; i++) {
    try {
      const el = icons[i];
      if (!el || !el.isConnected) continue;
      if (el.closest && el.closest(LAYER_SELECTOR)) continue;
      if (!isRendered(el)) continue;
      const rect = readRect(el);
      if (!hasArea(rect)) continue;
      targets.push(el);
      entries.push({ el: el, rect: rect });
    } catch {}
  }
  return { targets: targets, entries: entries };
}

export function getRegistryTargets() {
  try {
    return collectFiltered().targets;
  } catch {
    return [];
  }
}

export function getRegistryTargetEntries() {
  try {
    return collectFiltered().entries;
  } catch {
    return [];
  }
}
