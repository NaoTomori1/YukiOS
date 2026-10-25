import { createElement, bindEvent } from "../framework.js";
import { SNAP_LAYOUTS, buildLayoutTile } from "./snapLayouts.js";

const PICKER_ID = "win11-snap-picker";
const OPEN_DELAY = 120;
const REVEAL_DELAY = 900;
const CLOSE_DELAY = 500;

let picker = null;
let openTimer = null;
let closeTimer = null;
let revealTimer = null;

function clearTimers() {
  if (openTimer) {
    clearTimeout(openTimer);
    openTimer = null;
  }
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
  if (revealTimer) {
    clearTimeout(revealTimer);
    revealTimer = null;
  }
}

function positionPicker(anchorEl) {
  if (!anchorEl) return;
  const anchorRect = anchorEl.getBoundingClientRect();
  const pickerWidth = picker.offsetWidth;
  const pickerHeight = picker.offsetHeight;
  let left = anchorRect.right - pickerWidth;
  let top = anchorRect.bottom + 6;
  const maxLeft = Math.max(8, window.innerWidth - pickerWidth - 8);
  const maxTop = Math.max(8, window.innerHeight - pickerHeight - 8);
  left = Math.max(8, Math.min(left, maxLeft));
  top = Math.max(8, Math.min(top, maxTop));
  picker.style.left = `${left}px`;
  picker.style.top = `${top}px`;
}

export function openSnapLayoutPicker(win, anchorEl, wm) {
  if (!win || !anchorEl || !wm) return;
  clearTimers();
  if (picker) {
    closeSnapLayoutPicker();
  }
  const root = createElement("div", {
    id: PICKER_ID,
    className: "snapcont snapLayouts",
  });
  SNAP_LAYOUTS.forEach((layout) => {
    root.appendChild(
      buildLayoutTile(layout, (dim) => {
        wm.applySnapRect(win, dim);
        closeSnapLayoutPicker();
      }),
    );
  });
  document.body.appendChild(root);
  picker = root;
  positionPicker(anchorEl);
  revealTimer = setTimeout(() => {
    revealTimer = null;
    if (picker === root) root.classList.add("snapcont--revealed");
  }, REVEAL_DELAY);

  bindEvent(root, "mouseenter", () => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
  });
  bindEvent(root, "mouseleave", () => scheduleCloseSnapLayoutPicker());
}

export function scheduleCloseSnapLayoutPicker() {
  if (closeTimer) clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    closeTimer = null;
    closeSnapLayoutPicker();
  }, CLOSE_DELAY);
}

export function scheduleOpenSnapLayoutPicker(win, anchorEl, wm) {
  if (openTimer) clearTimeout(openTimer);
  openTimer = setTimeout(() => {
    openTimer = null;
    openSnapLayoutPicker(win, anchorEl, wm);
  }, OPEN_DELAY);
}

export function closeSnapLayoutPicker() {
  clearTimers();
  if (picker) {
    picker.remove();
    picker = null;
  }
}
