import { createElement, bindEvent } from "../framework.js";

export const SNAP_LAYOUTS = [
  [
    { width: "50%", height: "100%", top: 0, left: 0 },
    { width: "50%", height: "100%", top: 0, left: "50%" },
  ],
  [
    { width: "66%", height: "100%", top: 0, left: 0 },
    { width: "34%", height: "100%", top: 0, left: "66%" },
  ],
  [
    { width: "33%", height: "100%", top: 0, left: 0 },
    { width: "34%", height: "100%", top: 0, left: "33%" },
    { width: "33%", height: "100%", top: 0, left: "67%" },
  ],
  [
    { width: "50%", height: "100%", top: 0, left: 0 },
    { width: "50%", height: "50%", top: 0, left: "50%" },
    { width: "50%", height: "50%", top: "50%", left: "50%" },
  ],
  [
    { width: "50%", height: "50%", top: 0, left: 0 },
    { width: "50%", height: "50%", top: 0, left: "50%" },
    { width: "50%", height: "50%", top: "50%", left: 0 },
    { width: "50%", height: "50%", top: "50%", left: "50%" },
  ],
  [
    { width: "25%", height: "100%", top: 0, left: 0 },
    { width: "50%", height: "100%", top: 0, left: "25%" },
    { width: "25%", height: "100%", top: 0, left: "75%" },
  ],
];

export function buildLayoutTile(layout, onPick, options = {}) {
  const { eventName = "click", onHover = null } = options;
  const tile = createElement("div", { className: "snapLay" });
  layout.forEach((dim) => {
    const cell = createElement("div", { className: "snapper" });
    bindEvent(cell, "mousedown", (event) => {
      if (event && event.preventDefault) event.preventDefault();
    });
    if (onHover) {
      bindEvent(cell, "mouseenter", () => onHover(dim));
      bindEvent(cell, "mouseleave", () => onHover(null));
    }
    if (onPick) {
      bindEvent(cell, eventName, (event) => {
        if (event && event.stopPropagation) event.stopPropagation();
        if (event && event.preventDefault) event.preventDefault();
        onPick(dim);
      });
    }
    tile.appendChild(cell);
  });
  return tile;
}
