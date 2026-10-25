import { $, $$, bindEvent, createElement } from "../../framework.js";
import { resolveIconUrl } from "../../shared/assetResolver.js";

const BOOT_ID = "win11-bootscreen";
const SVG_NS = "http://www.w3.org/2000/svg";
const PHASE_LOGO = "logo";
const PHASE_BLACKOUT = "blackout";
const FADE_OUT_MS = 450;

const RESTART_PLAN = [
  { phase: PHASE_LOGO, duration: 2500 },
  { phase: PHASE_BLACKOUT, duration: 1500 },
  { phase: PHASE_LOGO, duration: 2500 },
];

const SHUTDOWN_PLAN = [
  { phase: PHASE_LOGO, duration: 2500 },
  { phase: PHASE_BLACKOUT, duration: 1500, hold: true },
];

let bootRoot = null;
let doneTimer = null;
let clearTimer = null;
let phaseTimer = null;
let pendingResolve = null;

function clearTimers() {
  if (doneTimer) {
    clearTimeout(doneTimer);
    doneTimer = null;
  }
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
  if (phaseTimer) {
    clearTimeout(phaseTimer);
    phaseTimer = null;
  }
}

function registerPending(resolve) {
  if (typeof resolve !== "function") return;
  if (pendingResolve) {
    const previous = pendingResolve;
    pendingResolve = () => {
      previous();
      resolve();
    };
    return;
  }
  pendingResolve = resolve;
}

function resolvePending() {
  if (!pendingResolve) return;
  const resolve = pendingResolve;
  pendingResolve = null;
  resolve();
}

function buildBootScreen() {
  const root = createElement("div", {
    id: BOOT_ID,
    className: "bootscreen",
    attributes: { "data-phase": PHASE_LOGO },
  });
  const content = createElement("div", { className: "bootContent" });
  const logo = createElement("img", {
    attributes: {
      width: "180",
      src: resolveIconUrl("static/icons/win11-home.png"),
      alt: "",
    },
  });
  content.appendChild(logo);
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
  content.appendChild(loader);
  root.appendChild(content);
  return root;
}

function removeBootScreen(root) {
  if (!root) return;
  root.remove();
  if (bootRoot === root) bootRoot = null;
  resolvePending();
}

function mountBootScreen(phase = PHASE_LOGO) {
  const existing = bootRoot || $("#" + BOOT_ID);
  if (existing) removeBootScreen(existing);
  const bodyNode = $("body");
  if (!bodyNode) return null;
  const root = buildBootScreen();
  setPhase(root, phase);
  bodyNode.appendChild(root);
  bootRoot = root;
  return root;
}

function setPhase(root, phase) {
  if (!root) return;
  root.setAttribute("data-phase", phase);
}

function enterHold(root) {
  if (!root) return;
  root.setAttribute("data-hold", "true");
  if ($$(".bootPowerHint", root).length === 0) {
    root.appendChild(
      createElement("div", {
        className: "bootPowerHint",
        text: "Click to power on",
      }),
    );
  }
}

function fadeOutRoot(root, onRemoved) {
  if (!root) {
    if (typeof onRemoved === "function") onRemoved();
    return;
  }
  root.setAttribute("data-done", "true");
  doneTimer = setTimeout(() => {
    doneTimer = null;
    removeBootScreen(root);
    if (typeof onRemoved === "function") onRemoved();
  }, FADE_OUT_MS);
}

function finishChoreography(root, resolve, onComplete) {
  clearTimers();
  fadeOutRoot(root, () => {
    if (typeof resolve === "function") resolve();
    if (typeof onComplete === "function") onComplete();
  });
}

export function showWin11BootScreen(durationMs = 1500) {
  if (bootRoot || $("#" + BOOT_ID)) return Promise.resolve();
  const root = mountBootScreen(PHASE_LOGO);
  if (!root) return Promise.resolve();
  return new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimers();
      removeBootScreen(root);
    };
    registerPending(resolve);
    bindEvent(root, "click", finish);
    doneTimer = setTimeout(() => {
      doneTimer = null;
      root.setAttribute("data-done", "true");
      clearTimer = setTimeout(() => {
        clearTimer = null;
        finish();
      }, FADE_OUT_MS);
    }, durationMs);
  });
}

export function showWin11BootScreenHold({ phase = PHASE_LOGO } = {}) {
  const root = mountBootScreen(phase);
  if (!root) return Promise.resolve();
  return new Promise((resolve) => {
    registerPending(resolve);
  });
}

export function showWin11BootChoreography({
  mode = "restart",
  onComplete,
} = {}) {
  const plan = (mode === "shutdown" ? SHUTDOWN_PLAN : RESTART_PLAN).slice();
  const root = mountBootScreen(PHASE_LOGO);
  if (!root) {
    if (typeof onComplete === "function") onComplete();
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let settled = false;
    let finishing = false;
    let holding = false;
    let completed = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const complete = () => {
      if (completed) return;
      completed = true;
      if (typeof onComplete === "function") onComplete();
    };
    const finish = () => {
      if (settled || finishing) return;
      finishing = true;
      finishChoreography(root, settle, complete);
    };
    const runStep = () => {
      const step = plan.shift();
      if (!step) {
        finish();
        return;
      }
      setPhase(root, step.phase);
      phaseTimer = setTimeout(() => {
        phaseTimer = null;
        if (step.hold) {
          holding = true;
          enterHold(root);
          return;
        }
        runStep();
      }, step.duration);
    };
    registerPending(settle);
    bindEvent(root, "click", () => {
      if (holding) {
        finish();
        return;
      }
      if (mode === "shutdown") {
        clearTimers();
        setPhase(root, PHASE_BLACKOUT);
        holding = true;
        enterHold(root);
        return;
      }
      finish();
    });
    runStep();
  });
}

export function fadeOutWin11BootScreen() {
  const root = bootRoot || $("#" + BOOT_ID);
  if (!root) {
    resolvePending();
    return Promise.resolve();
  }
  clearTimers();
  return new Promise((resolve) => {
    fadeOutRoot(root, resolve);
  });
}

export function hideWin11BootScreen() {
  clearTimers();
  if (bootRoot) {
    removeBootScreen(bootRoot);
  } else {
    const existing = $("#" + BOOT_ID);
    if (existing) existing.remove();
  }
  resolvePending();
}
