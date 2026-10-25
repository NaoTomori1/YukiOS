import { registerWin11Binding } from "../win11SettingsBindings.js";
import { escapeHtml } from "../win11Controls.js";

const QUICK_LINKS = [
  {
    label: "Wallpaper",
    icon: "fas fa-images",
    category: "Personalisation",
    subPage: "personal-background",
  },
  {
    label: "Global Theme",
    icon: "fas fa-palette",
    category: "Personalisation",
    subPage: "personal-colours",
  },
  {
    label: "Default Apps",
    icon: "fas fa-cubes",
    category: "Apps",
    subPage: "apps-defaults",
  },
  {
    label: "Keyboard",
    icon: "fas fa-keyboard",
    category: "Time & language",
    subPage: "time-typing",
  },
  {
    label: "Remote Desktop",
    icon: "fas fa-desktop",
    category: "System",
    subPage: "system-remote",
  },
  {
    label: "Notifications",
    icon: "fas fa-bell",
    category: "System",
    subPage: "system-notifications",
  },
  {
    label: "Tab Cloak & Panic",
    icon: "fas fa-user-secret",
    category: "Privacy & security",
    subPage: "privacy-security",
  },
  {
    label: "Window Management",
    icon: "fas fa-border-all",
    category: "System",
    subPage: "system-multitasking",
  },
  {
    label: "Display & Monitor",
    icon: "fas fa-desktop",
    category: "System",
    subPage: "system-display",
  },
];

registerWin11Binding("quickLinks", {
  type: "custom",
  render: () => `<div class="win11-empty">Loading shortcuts...</div>`,
  bind: (host) => {
    if (!host) return;
    host.innerHTML = `
      <div class="subHeading">Most Used Pages</div>
      <div class="win11-chip-row">
        ${QUICK_LINKS.map(
          (link) =>
            `<button type="button" class="win11-action" data-win11-goto-subpage="${escapeHtml(link.subPage)}" data-win11-goto-category="${escapeHtml(link.category)}"><i class="${link.icon}"></i> ${escapeHtml(link.label)}</button>`,
        ).join("")}
      </div>`;
  },
});
