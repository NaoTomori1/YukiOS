import { registerWin11Binding } from "../win11SettingsBindings.js";
import { escapeHtml } from "../win11Controls.js";
import { os, StorageKeys, BusEvents } from "../../../../framework.js";
import { $, $$, bindEvent, setHTML } from "../../../../shared/domUtils.js";
import {
  addCustomTheme,
  getBasicThemes,
  getCustomThemes,
  getSpecialThemes,
  getThemeByValue,
} from "../../../../shared/themeEngine.js";
import {
  applyTheme,
  applyThemeConfig,
} from "../../../../settings/settingsApply.js";
import {
  editTheme,
  exportTheme,
  openThemeCreator,
} from "../../../../settings/themeCreator.js";
import { sanitizeThemeContract } from "../../../../shared/themeContract.js";
import { applyThemeEffects } from "../../../../shared/themeEffects.js";
import {
  getStoredCustomColors,
  openCustomColorsDialog,
} from "../../../../shared/customColorsDialog.js";
import { audioMixer, SystemAudio } from "../../../../audioMixer.js";
import { Achievements } from "../../../../achievements.js";

const EMPTY_CUSTOM_TEXT =
  'No custom themes yet. Click "Create Theme" to make one';
const DEFAULT_PREVIEW = "linear-gradient(135deg, #6b5ce7, #312e81)";
const FALLBACK_THEME = "dark";

function readActiveTheme() {
  return os.storage.get(StorageKeys.theme) || FALLBACK_THEME;
}

function listCustomThemes() {
  const themes = getCustomThemes();
  const stored = os.storage.get(StorageKeys.customThemes);
  if (!Array.isArray(stored)) return themes;
  const known = new Set(stored.map((theme) => String(theme.value)));
  return themes.filter((theme) => known.has(String(theme.value)));
}

function themePreview(theme) {
  if (theme.preview) return theme.preview;
  if (theme.colors && theme.colors.brand) return theme.colors.brand;
  return DEFAULT_PREVIEW;
}

function swatchHtml(theme, active) {
  return `<button type="button" class="win11-theme-swatch${active ? " active" : ""}" data-theme-value="${escapeHtml(theme.value)}" style="background:${themePreview(theme)};color:${theme.textColor || "#fff"};">${escapeHtml(theme.label)}</button>`;
}

function basicThemesHtml(active) {
  return getBasicThemes()
    .map((theme) => swatchHtml(theme, theme.value === active))
    .join("");
}

function featuredThemesHtml(active) {
  return getSpecialThemes()
    .map((theme) => swatchHtml(theme, theme.value === active))
    .join("");
}

function customThemesHtml(active) {
  const custom = listCustomThemes();
  if (custom.length === 0) {
    return `<span class="win11-empty">${EMPTY_CUSTOM_TEXT}</span>`;
  }
  return custom
    .map(
      (theme) => `
      <div class="win11-theme-item" data-theme-item="${escapeHtml(theme.value)}">
        ${swatchHtml(theme, theme.value === active)}
        <div class="win11-theme-actions">
          <button type="button" class="win11-action" data-theme-action="edit" data-theme-value="${escapeHtml(theme.value)}">Edit</button>
          <button type="button" class="win11-action" data-theme-action="export" data-theme-value="${escapeHtml(theme.value)}">Export</button>
          <button type="button" class="win11-action" data-theme-action="remove" data-theme-value="${escapeHtml(theme.value)}">Remove</button>
        </div>
      </div>`,
    )
    .join("");
}

function renderGalleryHtml() {
  const active = readActiveTheme();
  return `
    <div class="win11-control win11-control--stacked">
      <div class="win11-control__text">
        <p class="win11-control__title">Theme</p>
        <p class="win11-control__desc">Set the OS color scheme</p>
      </div>
      <div class="win11-theme-grid">${basicThemesHtml(active)}</div>
    </div>

    <div class="win11-control win11-control--stacked">
      <div class="win11-control__text">
        <p class="win11-control__title">Featured Themes</p>
        <p class="win11-control__desc">Curated themes ready to apply in one click</p>
      </div>
      <div class="win11-theme-grid">${featuredThemesHtml(active)}</div>
    </div>

    <div class="win11-control win11-control--stacked">
      <div class="win11-control__text">
        <p class="win11-control__title">Custom Themes</p>
        <p class="win11-control__desc">Your saved themes</p>
      </div>
      <div class="win11-theme-grid">${customThemesHtml(active)}</div>
      <div class="win11-note">Saved themes can be edited, exported, or removed.</div>
    </div>

    <div class="win11-control win11-control--stacked">
      <div class="win11-control__text">
        <p class="win11-control__title">My Themes</p>
        <p class="win11-control__desc">Create, import, or save a theme</p>
      </div>
      <div class="win11-theme-actions">
        <button type="button" class="win11-action primary" data-gallery-action="create">Create Theme</button>
        <button type="button" class="win11-action" data-gallery-action="import">Import .yukiotheme</button>
        <button type="button" class="win11-action" data-gallery-action="save">Save Custom Theme</button>
      </div>
      <input type="file" accept=".yukiotheme,.json" style="display:none" data-gallery-import />
    </div>

    <div class="win11-control">
      <div class="win11-control__text">
        <p class="win11-control__title">Custom Colors</p>
        <p class="win11-control__desc">Override theme colors manually</p>
      </div>
      <button type="button" class="win11-action" data-gallery-action="colors">Customize</button>
    </div>`;
}

function applyThemeValue(value, refresh) {
  if (!value) return;
  os.storage.set(StorageKeys.theme, value);
  applyTheme(value, getStoredCustomColors);
  audioMixer().playSystemSound(SystemAudio.DESKTOP_CHANGE);
  os.notify.send("Themes", `Theme: ${value}`);
  os.events.emit(BusEvents.SETTINGS_CHANGED, { key: "theme", value });
  refresh();
}

async function removeCustomTheme(value, refresh) {
  const theme = getThemeByValue(value);
  if (!theme) return;
  const confirmed = await os.dialog.confirm(
    "Remove Theme",
    `Delete "${theme.label}" permanently?`,
  );
  if (!confirmed) return;
  let themes = os.storage.get(StorageKeys.customThemes);
  if (!Array.isArray(themes)) themes = getCustomThemes();
  const remaining = themes.filter(
    (entry) => String(entry.value) !== String(value),
  );
  os.storage.set(StorageKeys.customThemes, remaining);
  if (os.storage.get(StorageKeys.theme) === value) {
    os.storage.set(StorageKeys.theme, FALLBACK_THEME);
    applyTheme(FALLBACK_THEME, getStoredCustomColors);
  }
  os.notify.send("Themes", `Removed "${theme.label}"`);
  os.events.emit(BusEvents.SETTINGS_CHANGED, {
    key: "theme",
    value: os.storage.get(StorageKeys.theme),
  });
  refresh();
}

async function importThemeFile(input, refresh) {
  const file = input.files && input.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const result = sanitizeThemeContract(parsed);
    if (!result.ok) {
      os.dialog.alert(
        "Import Theme",
        result.errors.join("\n") || "Invalid theme file",
      );
      return;
    }
    const contract = result.contract;
    const data = {
      value:
        contract.name.toLowerCase().replace(/[^a-z0-9-]/g, "-") +
        "-" +
        Math.random().toString(36).slice(2, 6),
      label: contract.name,
      icon: contract.icon,
      colors: contract.colors,
      description: contract.description,
      author: contract.author,
      effects: contract.effects,
      config: contract.config,
    };
    try {
      addCustomTheme({
        value: data.value,
        label: data.label,
        icon: data.icon,
        colors: data.colors,
        description: data.description,
        author: data.author,
        effects: data.effects,
        config: data.config,
      });
    } catch (error) {
      os.dialog.alert("Import Theme", error.message || "Couldn't import theme");
      return;
    }
    os.storage.set(StorageKeys.theme, data.value);
    applyTheme(data.value, getStoredCustomColors);
    if (contract.effects && Object.keys(contract.effects).length > 0)
      applyThemeEffects(contract.effects);
    if (contract.config && Object.keys(contract.config).length > 0)
      applyThemeConfig(contract.config);
    os.notify.send("Themes", `Imported "${contract.name}"`);
    os.events.emit(BusEvents.SETTINGS_CHANGED, {
      key: "theme",
      value: data.value,
    });
    refresh();
  } catch (error) {
    os.dialog.alert(
      "Import Theme",
      "Couldn't read that file: " + (error.message || error),
    );
  } finally {
    input.value = "";
  }
}

async function saveCustomTheme(refresh) {
  const customColors = getStoredCustomColors();
  if (!customColors) {
    os.dialog.alert("Alert", "No custom colors yet. Create one first.");
    return;
  }
  const themeName = await os.dialog.prompt(
    "Prompt",
    "Name your theme:",
    "My Theme",
  );
  if (!themeName) return;
  const themeValue = themeName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  try {
    addCustomTheme({
      value: themeValue,
      label: themeName,
      icon: "fas fa-palette",
      colors: customColors,
    });
    os.events.emit(BusEvents.ACHIEVEMENT_TRIGGER, {
      achievementId: Achievements.ThemeSmith,
    });
    os.dialog.alert("Alert", `Saved "${themeName}"`);
    os.notify.send("Themes", "Theme saved to My Themes");
    refresh();
  } catch (error) {
    os.dialog.alert("Alert", error.message || "Couldn't save the theme");
  }
}

function wireGallery(host, refresh) {
  const winElement = host.closest("#yukiOS-settings");

  $$(".win11-theme-swatch", host).forEach((swatch) => {
    bindEvent(swatch, "click", () =>
      applyThemeValue(swatch.dataset.themeValue, refresh),
    );
  });

  $$("[data-theme-action]", host).forEach((button) => {
    bindEvent(button, "click", () => {
      const action = button.dataset.themeAction;
      const value = button.dataset.themeValue;
      if (action === "edit") {
        editTheme(value, winElement);
        return;
      }
      if (action === "export") {
        exportTheme(value);
        return;
      }
      if (action === "remove") {
        removeCustomTheme(value, refresh);
      }
    });
  });

  const importInput = $("[data-gallery-import]", host);

  $$("[data-gallery-action]", host).forEach((button) => {
    bindEvent(button, "click", () => {
      const action = button.dataset.galleryAction;
      if (action === "create") {
        openThemeCreator(winElement);
        return;
      }
      if (action === "import") {
        if (importInput) importInput.click();
        return;
      }
      if (action === "colors") {
        openCustomColorsDialog();
        return;
      }
      if (action === "save") {
        saveCustomTheme(refresh);
      }
    });
  });

  bindEvent(importInput, "change", async () => {
    if (!importInput) return;
    await importThemeFile(importInput, refresh);
  });
}

registerWin11Binding("themeGallery", {
  type: "custom",
  render: () => `<div class="win11-empty">Loading themes...</div>`,
  bind: (host) => {
    const refresh = () => {
      setHTML(host, renderGalleryHtml());
      wireGallery(host, refresh);
    };

    refresh();

    const onSettingsChanged = (payload) => {
      if (!host.isConnected) {
        os.events.off(BusEvents.SETTINGS_CHANGED, onSettingsChanged);
        return;
      }
      if (payload && payload.key === "theme") refresh();
    };

    os.events.on(BusEvents.SETTINGS_CHANGED, onSettingsChanged);
  },
});
