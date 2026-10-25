import { renderSelectMenu } from "../../../shared/selectMenu.js";
import { renderRangeSlider } from "../../../shared/rangeSlider.js";
import { getWin11Binding, getWin11Value } from "./win11SettingsBindings.js";

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function controlText(title, desc) {
  return `
    <div class="win11-control__text">
      <p class="win11-control__title">${escapeHtml(title)}</p>
      ${desc ? `<p class="win11-control__desc">${escapeHtml(desc)}</p>` : ""}
    </div>`;
}

export function toggle(key, title, desc) {
  const checked = !!getWin11Value(key);
  return `
    <div class="win11-control win11-control--toggle" data-win11-control="${key}">
      ${controlText(title, desc)}
      <button type="button" class="win11-switch${checked ? " is-on" : ""}" data-bind="${key}" role="switch" aria-checked="${checked ? "true" : "false"}" aria-label="${escapeHtml(title)}">
        <span class="win11-switch__thumb"></span>
      </button>
    </div>`;
}

function formatValue(value, format) {
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

export function slider(key, title, desc, options = {}) {
  const {
    min = 0,
    max = 100,
    step = 1,
    format = "number",
    disabled = false,
  } = options;
  const value = Number(getWin11Value(key) ?? min);
  const id = `win11-${key}`;
  return `
    <div class="win11-control win11-control--slider" data-win11-control="${key}">
      ${controlText(title, desc)}
      <div class="win11-range" data-win11-format="${escapeHtml(format)}">
        ${renderRangeSlider(id, min, max, step, value, disabled, `data-bind="${key}"`)}
        <span class="win11-range-value" data-win11-value-for="${key}">${formatValue(value, format)}</span>
      </div>
    </div>`;
}

export function select(key, title, desc, options) {
  const value = getWin11Value(key);
  const id = `win11-${key}`;
  return `
    <div class="win11-control win11-control--select" data-win11-control="${key}">
      ${controlText(title, desc)}
      ${renderSelectMenu(id, options, value, "", `data-bind="${key}"`)}
    </div>`;
}

export function segment(key, title, desc, options) {
  const value = String(getWin11Value(key) ?? "");
  const buttons = options
    .map(
      (option) =>
        `<button type="button" class="win11-segment__btn${option.value === value ? " active" : ""}" data-value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</button>`,
    )
    .join("");
  return `
    <div class="win11-control win11-control--segment" data-win11-control="${key}">
      ${controlText(title, desc)}
      <div class="win11-segment" data-bind="${key}">${buttons}</div>
    </div>`;
}

export function textField(key, title, desc, placeholder = "") {
  const value = getWin11Value(key) ?? "";
  return `
    <div class="win11-control win11-control--text" data-win11-control="${key}">
      ${controlText(title, desc)}
      <input type="text" class="win11-input" data-bind="${key}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" spellcheck="false" aria-label="${escapeHtml(title)}" />
    </div>`;
}

export function action(key, title, desc, label, variant = "") {
  return `
    <div class="win11-control win11-control--action" data-win11-control="${key}">
      ${controlText(title, desc)}
      <button type="button" class="win11-action${variant ? ` ${variant}` : ""}" data-bind="${key}">${escapeHtml(label)}</button>
    </div>`;
}

export function custom(key, title, desc) {
  const binding = getWin11Binding(key);
  if (!binding || typeof binding.render !== "function") {
    return `
    <div class="win11-control win11-control--custom" data-win11-control="${key}">
      ${controlText(title, desc)}
      <span class="win11-empty">Not available in this session</span>
    </div>`;
  }
  return `
    <div class="win11-control win11-control--custom win11-control--stacked" data-win11-control="${key}">
      ${controlText(title, desc)}
      <div class="win11-custom" data-win11-custom="${key}">${binding.render()}</div>
    </div>`;
}

export function subHeading(name) {
  return `<div class="subHeading">${escapeHtml(name)}</div>`;
}

export function spacer() {
  return `<div class="spacer"></div>`;
}

export function note(text) {
  return `<div class="win11-note">${escapeHtml(text)}</div>`;
}
