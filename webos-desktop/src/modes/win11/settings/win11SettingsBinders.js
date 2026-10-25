import { $, $$, bindEvent } from "../../../shared/domUtils.js";
import { bindSelectMenu } from "../../../shared/selectMenu.js";
import { bindRangeSlider } from "../../../shared/rangeSlider.js";
import { applyWin11Value, getWin11Binding } from "./win11SettingsBindings.js";
import {
  renderWin11Category,
  renderWin11SubPage,
} from "./win11SettingsShell.js";
import { WIN11_SECTION_MAP } from "./win11SettingsPages.js";
import { win11CategoryIds } from "./win11SettingsIcons.js";

function formatRangeValue(value, format) {
  switch (format) {
    case "percent":
      return `${value}%`;
    case "px":
      return `${value}px`;
    case "seconds":
      return `${value}s`;
    case "x":
      return `${value}x`;
    default:
      return String(value);
  }
}

function updateRangeLabel(slider) {
  const wrapper = slider.closest(".win11-range");
  if (!wrapper) return;
  const label = wrapper.querySelector("[data-win11-value-for]");
  if (!label) return;
  const format = wrapper.dataset.win11Format || "number";
  label.textContent = formatRangeValue(Number(slider.dataset.value), format);
}

function bindWin11Control(el) {
  const key = el.dataset.bind;
  if (!key) return;
  const binding = getWin11Binding(key);
  if (!binding) return;

  if (el.classList.contains("win11-switch")) {
    bindEvent(el, "click", () => {
      const next = !el.classList.contains("is-on");
      el.classList.toggle("is-on", next);
      el.setAttribute("aria-checked", next ? "true" : "false");
      applyWin11Value(key, next);
    });
    return;
  }

  if (el.classList.contains("range-slider")) {
    bindEvent(el, "input", () => updateRangeLabel(el));
    bindEvent(el, "change", () => {
      updateRangeLabel(el);
      applyWin11Value(key, Number(el.dataset.value));
    });
    return;
  }

  if (el.classList.contains("select-menu")) {
    bindEvent(el, "change", () => applyWin11Value(key, el.dataset.value));
    return;
  }

  if (el.classList.contains("win11-segment")) {
    $$(".win11-segment__btn", el).forEach((btn) => {
      bindEvent(btn, "click", () => {
        $$(".win11-segment__btn", el).forEach((other) =>
          other.classList.remove("active"),
        );
        btn.classList.add("active");
        applyWin11Value(key, btn.dataset.value);
      });
    });
    return;
  }

  if (el.classList.contains("win11-input")) {
    bindEvent(el, "change", () => applyWin11Value(key, el.value));
    return;
  }

  if (el.classList.contains("win11-action")) {
    bindEvent(el, "click", () => {
      if (typeof binding.apply === "function") binding.apply();
    });
  }
}

function bindCustomControls(root) {
  $$("[data-win11-custom]", root).forEach((host) => {
    const key = host.dataset.win11Custom;
    const binding = getWin11Binding(key);
    if (!binding || typeof binding.bind !== "function") return;
    binding.bind(host);
  });
}

export function bindWin11Content(root) {
  bindCustomControls(root);
  $$("[data-bind]", root).forEach(bindWin11Control);
}

function setActiveNav(win, categoryId) {
  $$(".navLink", win).forEach((link) => {
    link.classList.toggle(
      "selected",
      link.dataset.win11Category === categoryId,
    );
  });
}

export function showWin11Category(win, categoryId) {
  const main = $("#win11SettingsMain", win);
  if (!main) return;
  main.innerHTML = renderWin11Category(categoryId);
  setActiveNav(win, categoryId);
  bindWin11Content(main);
  applySearchFilter(win, activeQuery);
}

export function showWin11SubPage(win, subPageId, categoryId) {
  const main = $("#win11SettingsMain", win);
  if (!main) return;
  main.innerHTML = renderWin11SubPage(subPageId, categoryId);
  setActiveNav(win, categoryId);
  bindWin11Content(main);
  applySearchFilter(win, activeQuery);
}

export function navigateWin11Section(win, section) {
  const target = WIN11_SECTION_MAP[section];
  if (!target) {
    showWin11Category(win, win11CategoryIds()[0]);
    return false;
  }
  if (target.subPage) {
    showWin11SubPage(win, target.subPage, target.category);
  } else {
    showWin11Category(win, target.category);
  }
  return true;
}

let activeQuery = "";

function applySearchFilter(win, query) {
  activeQuery = String(query || "");
  const term = activeQuery.trim().toLowerCase();
  $$(".navLink", win).forEach((link) => {
    const matches = !term || link.textContent.toLowerCase().includes(term);
    link.style.display = matches ? "" : "none";
  });
  $$(".tile", win).forEach((tile) => {
    const name = (tile.dataset.win11TileName || "").toLowerCase();
    const desc = (
      tile.querySelector(".tile_desc")?.textContent || ""
    ).toLowerCase();
    const matches = !term || name.includes(term) || desc.includes(term);
    tile.style.display = matches ? "" : "none";
  });
}

export function bindWin11Settings(win) {
  bindSelectMenu(win);
  if (!win.__win11RangeBound) {
    win.__win11RangeBound = true;
    bindRangeSlider(win);
  }
  bindWin11Content(win);

  if (!win.__win11NavBound) {
    win.__win11NavBound = true;

    bindEvent(win, "click", (event) => {
      const navLink = event.target.closest(".navLink");
      if (navLink) {
        showWin11Category(win, navLink.dataset.win11Category);
        return;
      }
      const goto = event.target.closest("[data-win11-goto-category]");
      if (goto) {
        const gotoSubPage = goto.dataset.win11GotoSubpage;
        if (gotoSubPage) {
          showWin11SubPage(win, gotoSubPage, goto.dataset.win11GotoCategory);
        } else {
          showWin11Category(win, goto.dataset.win11GotoCategory);
        }
        return;
      }
      const tile = event.target.closest("[data-win11-subpage]");
      if (tile) {
        const subPageId = tile.dataset.win11Subpage;
        const categoryId = tile.dataset.win11Category || activeCategoryId(win);
        showWin11SubPage(win, subPageId, categoryId);
        return;
      }
      const back = event.target.closest("[data-win11-back]");
      if (back) {
        showWin11Category(win, back.dataset.win11Back);
        return;
      }
      const toggle = event.target.closest("[data-win11-nav-toggle]");
      if (toggle) {
        const nav = win.querySelector("nav");
        if (nav) nav.classList.toggle("open");
      }
    });

    bindEvent(win, "keydown", (event) => {
      const navLink = event.target.closest(".navLink");
      if (!navLink) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      showWin11Category(win, navLink.dataset.win11Category);
    });

    bindEvent(win, "input", (event) => {
      if (event.target.id !== "win11SettingsSearch") return;
      applySearchFilter(win, event.target.value);
    });
  }
}

function activeCategoryId(win) {
  const selected = win.querySelector(".navLink.selected");
  return selected ? selected.dataset.win11Category : win11CategoryIds()[0];
}
