import { createElement } from "../framework.js";
import { SNAP_LAYOUTS, buildLayoutTile } from "./snapLayouts.js";
import { getSnapAreaPx, snapRectToPixels } from "./snapGeometry.js";

const BAR_ID = "win11-snap-bar";
const PREVIEW_ID = "win11-snap-preview";
const TIP_SIZE = 20;
const DRAG_THRESHOLD = 5;

let bar = null;
let preview = null;
let barHideTimer = null;
let barRevealed = false;
let hoveredDim = null;

function ensurePreview() {
  if (preview) return preview;
  const el = createElement("div", {
    id: PREVIEW_ID,
    className: "snapPreview",
  });
  document.body.appendChild(el);
  preview = el;
  return el;
}

export function showSnapPreview(dim) {
  if (!dim) {
    hideSnapPreview();
    return;
  }
  const rect = snapRectToPixels(dim, getSnapAreaPx());
  const el = ensurePreview();
  el.style.left = `${rect.left}px`;
  el.style.top = `${rect.top}px`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
  el.classList.add("snapPreview--visible");
}

export function hideSnapPreview() {
  if (preview) preview.classList.remove("snapPreview--visible");
}

export function setSnapBarHover(dim) {
  hoveredDim = dim;
  showSnapPreview(dim);
}

export function clearSnapBarHover() {
  hoveredDim = null;
  hideSnapPreview();
}

export function getSnapBarHover() {
  return hoveredDim;
}

export function showSnapBar(win, wm) {
  removeSnapBarNow();
  if (!win || !wm) return;
  const root = createElement("div", {
    id: BAR_ID,
    className: "snapBar snapLayouts snapBar--entering",
  });
  SNAP_LAYOUTS.forEach((layout) => {
    root.appendChild(
      buildLayoutTile(layout, null, {
        onHover: (dim) => {
          setSnapBarHover(dim);
        },
      }),
    );
  });
  document.body.appendChild(root);
  bar = root;
  barRevealed = false;
  requestAnimationFrame(() => {
    if (bar === root) root.classList.remove("snapBar--entering");
  });
}

export function revealSnapBar() {
  if (!bar || barRevealed) return;
  barRevealed = true;
  bar.classList.add("snapBar--revealed");
}

export function hideSnapBar() {
  clearSnapBarHover();
  if (barHideTimer) {
    clearTimeout(barHideTimer);
    barHideTimer = null;
  }
  if (preview) {
    preview.remove();
    preview = null;
  }
  if (!bar) return;
  const current = bar;
  bar = null;
  barRevealed = false;
  current.setAttribute("data-hide", "true");
  barHideTimer = setTimeout(() => {
    barHideTimer = null;
    if (current.parentElement) current.remove();
  }, 240);
}

export function removeSnapBarNow() {
  clearSnapBarHover();
  if (barHideTimer) {
    clearTimeout(barHideTimer);
    barHideTimer = null;
  }
  if (bar) {
    bar.remove();
    bar = null;
  }
  if (preview) {
    preview.remove();
    preview = null;
  }
  barRevealed = false;
}

export function isSnapBarAt(clientY) {
  if (!bar) return false;
  if (typeof clientY !== "number") return false;
  return clientY <= TIP_SIZE;
}

export function snapBarTipSize() {
  return TIP_SIZE;
}

export function snapBarActivationZone() {
  return window.innerHeight * 0.3;
}

export function snapBarDragThreshold() {
  return DRAG_THRESHOLD;
}
