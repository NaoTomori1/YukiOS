import { os, createElement, bindEvent, $ } from "../../framework.js";

const PANEL_ID = "win11-calendar";
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

let panel = null;
let viewDate = new Date();
let dismissHandler = null;
let sessionToken = 0;

function getNotificationCenter() {
  try {
    return os.windowManager?.notificationCenter || null;
  } catch {
    return null;
  }
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function buildMonthCells(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells = [];

  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({ day: daysInPrev - i, outside: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, outside: false });
  }
  let next = 1;
  while (cells.length % 7 !== 0 || cells.length < 42) {
    cells.push({ day: next++, outside: true });
    if (cells.length >= 42) break;
  }
  return cells;
}

function isToday(cell) {
  if (cell.outside) return false;
  const now = new Date();
  return (
    cell.day === now.getDate() &&
    viewDate.getMonth() === now.getMonth() &&
    viewDate.getFullYear() === now.getFullYear()
  );
}

function renderBody() {
  if (!panel) return;
  const body = $(".win11-cal__body", panel);
  if (!body) return;

  const now = new Date();
  const header = $(".win11-cal__date", panel);
  if (header) {
    header.textContent = now.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }

  const monthLabel = $(".win11-cal__month", panel);
  if (monthLabel) {
    monthLabel.textContent = viewDate.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }

  const grid = $(".win11-cal__grid", panel);
  if (!grid) return;
  grid.innerHTML = "";
  WEEKDAYS.forEach((day) => {
    const cell = createElement("div", { className: "win11-cal__wd" });
    cell.textContent = day;
    grid.appendChild(cell);
  });
  buildMonthCells(viewDate).forEach((entry) => {
    const cell = createElement("div", {
      className: `win11-cal__day${entry.outside ? " win11-cal__day--out" : ""}${
        isToday(entry) ? " win11-cal__day--today" : ""
      }`,
      text: String(entry.day),
    });
    grid.appendChild(cell);
  });
}

function syncCalendarTop() {
  if (!panel) return;
  const rect = panel.getBoundingClientRect();
  const top = Math.round(window.innerHeight - rect.top);
  document.documentElement.style.setProperty("--win11-cal-top", `${top}px`);
}

function shiftMonth(delta) {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1);
  renderBody();
}

function buildPanel() {
  const root = createElement("div", {
    id: PANEL_ID,
    className: "win11-cal",
    attributes: { "data-hide": "false" },
  });

  const topBar = createElement("div", { className: "win11-cal__topbar" });
  const date = createElement("div", { className: "win11-cal__date" });
  topBar.appendChild(date);

  const nav = createElement("div", { className: "win11-cal__nav" });
  const prevBtn = createElement("button", {
    className: "win11-cal__btn",
    attributes: { title: "Previous month", type: "button" },
    html: '<i class="fas fa-chevron-left"></i>',
  });
  const nextBtn = createElement("button", {
    className: "win11-cal__btn",
    attributes: { title: "Next month", type: "button" },
    html: '<i class="fas fa-chevron-right"></i>',
  });
  const collapser = createElement("button", {
    className: "win11-cal__collapser",
    attributes: { title: "Collapse", type: "button" },
    html: '<i class="fas fa-chevron-down"></i>',
  });
  bindEvent(prevBtn, "click", () => shiftMonth(-1));
  bindEvent(nextBtn, "click", () => shiftMonth(1));
  bindEvent(collapser, "click", () => {
    if (!panel) return;
    panel.classList.toggle("win11-cal--collapsed");
    setTimeout(syncCalendarTop, 260);
  });
  nav.appendChild(prevBtn);
  nav.appendChild(nextBtn);
  nav.appendChild(collapser);
  topBar.appendChild(nav);

  const body = createElement("div", { className: "win11-cal__body" });
  const month = createElement("div", { className: "win11-cal__month" });
  const grid = createElement("div", { className: "win11-cal__grid" });
  body.appendChild(month);
  body.appendChild(grid);

  root.appendChild(topBar);
  root.appendChild(body);
  return root;
}

export function isWin11CalendarOpen() {
  return !!panel;
}

export function closeWin11Calendar() {
  if (!panel) return;
  const current = panel;
  const token = sessionToken;
  panel = null;
  current.setAttribute("data-hide", "true");
  const center = getNotificationCenter();
  if (center && typeof center.closeCenter === "function") {
    try {
      center.closeCenter();
    } catch {}
  }
  if (dismissHandler) {
    document.removeEventListener("click", dismissHandler);
    dismissHandler = null;
  }
  setTimeout(() => {
    if (token === sessionToken) {
      document.documentElement.classList.remove("win11-cal-open");
      document.documentElement.style.removeProperty("--win11-cal-top");
    }
    if (current.parentElement) current.remove();
  }, 320);
}

export function toggleWin11Calendar() {
  if (panel) {
    closeWin11Calendar();
    return;
  }
  openWin11Calendar();
}

export function openWin11Calendar() {
  if (panel) {
    closeWin11Calendar();
    return;
  }
  const sidepane = $("#win11-sidepane");
  if (sidepane && sidepane.getAttribute("data-hide") === "false") {
    sidepane.setAttribute("data-hide", "true");
  }
  import("./Win11Band.js").then((m) => m.closeWin11Band?.()).catch(() => {});
  sessionToken++;
  viewDate = new Date();
  const root = buildPanel();
  root.setAttribute("data-hide", "true");
  document.body.appendChild(root);
  panel = root;
  renderBody();
  syncCalendarTop();
  document.documentElement.classList.add("win11-cal-open");
  requestAnimationFrame(() => {
    if (panel === root) root.setAttribute("data-hide", "false");
  });

  const center = getNotificationCenter();
  if (center && typeof center.openCenter === "function") {
    try {
      center.openCenter();
    } catch {}
  }

  dismissHandler = (event) => {
    if (!panel) return;
    const target = event.target;
    if (panel.contains(target)) return;
    if ($("#ntf-panel") && $("#ntf-panel").contains(target)) return;
    if (target && target.closest && target.closest(".taskDate")) return;
    closeWin11Calendar();
  };
  setTimeout(() => {
    document.addEventListener("click", dismissHandler);
  }, 0);
}
