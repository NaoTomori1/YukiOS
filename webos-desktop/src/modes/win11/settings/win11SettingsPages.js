import { systemPage } from "./pages/system.js";
import { bluetoothPage } from "./pages/bluetooth.js";
import { networkPage } from "./pages/network.js";
import { personalisationPage } from "./pages/personalisation.js";
import { appsPage } from "./pages/apps.js";
import { accountsPage } from "./pages/accounts.js";
import { timePage } from "./pages/time.js";
import { gamingPage } from "./pages/gaming.js";
import { accessibilityPage } from "./pages/accessibility.js";
import { privacyPage } from "./pages/privacy.js";
import { updatePage } from "./pages/update.js";

export const WIN11_PAGES = [
  systemPage,
  bluetoothPage,
  networkPage,
  personalisationPage,
  appsPage,
  accountsPage,
  timePage,
  gamingPage,
  accessibilityPage,
  privacyPage,
  updatePage,
];

export const WIN11_SUBPAGES = {};

WIN11_PAGES.forEach((page) => {
  const subPages = page.subPages || {};
  Object.entries(subPages).forEach(([subPageId, subPage]) => {
    WIN11_SUBPAGES[subPageId] = {
      title: subPage.title,
      body: subPage.body,
      category: page.id,
    };
  });
});

export const WIN11_SECTION_MAP = {
  "pane-quick": { category: "System" },
  "pane-general": { category: "System", subPage: "system-about" },
  "pane-system": { category: "System", subPage: "system-about" },
  "pane-about": { category: "System", subPage: "system-about" },
  "pane-data": { category: "System", subPage: "system-storage" },
  "pane-disks": { category: "System", subPage: "system-storage" },
  "pane-desktop": { category: "System", subPage: "system-multitasking" },
  "pane-notifications": { category: "System", subPage: "system-notifications" },
  "pane-audio": { category: "System", subPage: "system-sound" },
  "pane-appearance": {
    category: "Personalisation",
    subPage: "personal-colours",
  },
  "pane-shortcuts": { category: "Time & language", subPage: "time-typing" },
  "pane-accounts": { category: "Accounts", subPage: "accounts-users" },
  "pane-privacy": {
    category: "Privacy & security",
    subPage: "privacy-general",
  },
  "pane-cloak": { category: "Privacy & security", subPage: "privacy-security" },
  "pane-recent-files": {
    category: "Privacy & security",
    subPage: "privacy-activity",
  },
  "pane-network": { category: "Network & internet", subPage: "network-wifi" },
  "pane-autostart": { category: "Apps", subPage: "apps-startup" },
  "pane-ruffle": { category: "Apps", subPage: "apps-ruffle" },
  "pane-gaming": { category: "Gaming", subPage: "gaming-steam" },
  "pane-tiling": { category: "System", subPage: "system-multitasking" },
  "pane-win11": { category: "Personalisation", subPage: "personal-taskbar" },
};
