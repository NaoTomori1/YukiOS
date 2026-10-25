import { $ } from "../shared/domUtils.js";
import { os, MODES } from "../framework.js";

export function getSnapAreaPx() {
  const taskbar = $("#taskbar");
  let taskbarPosition = "bottom";
  let taskbarH = 0;
  if (taskbar) {
    taskbarPosition = taskbar.classList.contains("position-left")
      ? "left"
      : taskbar.classList.contains("position-right")
        ? "right"
        : taskbar.classList.contains("position-top")
          ? "top"
          : "bottom";
    taskbarH = taskbar.getBoundingClientRect().height;
  }

  let tilingBarH = 0;
  let tilingBarTop = 0;
  const tilingBar = $("#tiling-bar");
  if (
    tilingBar &&
    tilingBar.style.display !== "none" &&
    os.modes.isActive(MODES.TILING)
  ) {
    tilingBarH = parseFloat(getComputedStyle(tilingBar).height) || 0;
    tilingBarTop = tilingBar.classList.contains("position-bottom")
      ? 0
      : tilingBarH;
  }

  const left = taskbarPosition === "left" ? taskbarH : 0;
  const top = taskbarPosition === "top" ? taskbarH : tilingBarTop;
  const width =
    window.innerWidth -
    (taskbarPosition === "left" || taskbarPosition === "right" ? taskbarH : 0);
  const height =
    window.innerHeight -
    (taskbarPosition === "top" || taskbarPosition === "bottom" ? taskbarH : 0) -
    tilingBarH;

  return { left, top, width, height };
}

function snapPercent(value, total) {
  const num =
    typeof value === "number" ? value : parseFloat(String(value ?? "0"));
  if (!Number.isFinite(num)) return 0;
  return (num / 100) * total;
}

export function snapRectToPixels(dim, area = getSnapAreaPx()) {
  const left = area.left + snapPercent(dim.left, area.width);
  const top = area.top + snapPercent(dim.top, area.height);
  const width = Math.max(0, snapPercent(dim.width, area.width));
  const height = Math.max(0, snapPercent(dim.height, area.height));
  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(width),
    height: Math.round(height),
  };
}
