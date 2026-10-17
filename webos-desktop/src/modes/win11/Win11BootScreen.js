import { $, bindEvent, createElement } from "../../framework.js";
import { resolveIconUrl } from "../../shared/assetResolver.js";

const BOOT_ID = "win11-bootscreen";
const SVG_NS = "http://www.w3.org/2000/svg";
let bootRoot = null;
let doneTimer = null;
let clearTimer = null;

function clearTimers() {
  if (doneTimer) {
    clearTimeout(doneTimer);
    doneTimer = null;
  }
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
}

function buildBootScreen() {
  const root = createElement("div", { id: BOOT_ID, className: "bootscreen" });
  const wrap = createElement("div");
  const logo = createElement("img", {
    attributes: {
      width: "180",
      src: resolveIconUrl("static/icons/win11-home.png"),
      alt: "",
    },
  });
  wrap.appendChild(logo);
  const loader = createElement("div", { id: "loader", className: "mt-48" });
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "progressRing");
  svg.setAttribute("height", "48");
  svg.setAttribute("width", "48");
  svg.setAttribute("viewBox", "0 0 16 16");
  const circle = document.createElementNS(SVG_NS, "circle");
  circle.setAttribute("cx", "8px");
  circle.setAttribute("cy", "8px");
  circle.setAttribute("r", "7px");
  svg.appendChild(circle);
  loader.appendChild(svg);
  wrap.appendChild(loader);
  root.appendChild(wrap);
  return root;
}

export function showWin11BootScreen(durationMs = 1500) {
  if (bootRoot || $("#" + BOOT_ID)) return Promise.resolve();
  const root = buildBootScreen();
  const bodyNode = $("body");
  if (!bodyNode) return Promise.resolve();
  bodyNode.appendChild(root);
  bootRoot = root;
  return new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimers();
      root.remove();
      if (bootRoot === root) bootRoot = null;
      resolve();
    };
    bindEvent(root, "click", finish);
    doneTimer = setTimeout(() => {
      doneTimer = null;
      root.setAttribute("data-done", "true");
      clearTimer = setTimeout(() => {
        clearTimer = null;
        finish();
      }, 450);
    }, durationMs);
  });
}

export function hideWin11BootScreen() {
  clearTimers();
  if (bootRoot) {
    bootRoot.remove();
    bootRoot = null;
  } else {
    const existing = $("#" + BOOT_ID);
    if (existing) existing.remove();
  }
}
