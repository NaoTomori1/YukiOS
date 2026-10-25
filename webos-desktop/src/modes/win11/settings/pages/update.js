import { os, StorageKeys } from "../../../../framework.js";
import { YUKIOS_VERSION } from "../../../../apps/about.js";
import { versionChecker } from "../../../../versionChecker.js";
import { $, bindEvent, setHTML, setText } from "../../../../shared/domUtils.js";
import { custom, escapeHtml } from "../win11Controls.js";
import {
  getWin11Binding,
  registerWin11Binding,
} from "../win11SettingsBindings.js";
import { win11Icon } from "../win11SettingsIcons.js";

function isNewerVersion(remote, current) {
  const clean = (value) =>
    String(value).replace(/^v/i, "").split(".").map(Number);
  const remoteParts = clean(remote);
  const currentParts = clean(current);
  if (remoteParts.some(isNaN) || currentParts.some(isNaN)) return false;
  for (
    let index = 0;
    index < Math.max(remoteParts.length, currentParts.length);
    index += 1
  ) {
    const remotePart = remoteParts[index] || 0;
    const currentPart = currentParts[index] || 0;
    if (remotePart > currentPart) return true;
    if (remotePart < currentPart) return false;
  }
  return false;
}

function lastCheckedLabel() {
  const raw = os.storage.get(StorageKeys.lastVersionCheck);
  if (!raw) return "Today";
  const timestamp = Number(raw);
  if (!Number.isFinite(timestamp)) return "Today";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "Today";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  return sameDay ? "Today" : date.toLocaleString();
}

function updateStatusText() {
  const remote = os.storage.get(StorageKeys.lastKnownRemoteVersion);
  if (remote && isNewerVersion(remote, YUKIOS_VERSION)) {
    return {
      title: "Update available",
      detail: `YukiOS ${remote} is ready to install`,
    };
  }
  return {
    title: "You're up to date",
    detail: `Last checked: ${lastCheckedLabel()}`,
  };
}

function renderUpdateHero() {
  const status = updateStatusText();
  return `
    <div class="updateTop">
      <div class="left">
        <img src="/img/settings/update.png" width="90" alt="" />
        <div>
          <h2>${escapeHtml(status.title)}</h2>
          <p>${escapeHtml(status.detail)}</p>
        </div>
      </div>
      <div class="right">
        <button class="btn" data-win11-check-updates>Check for updates</button>
      </div>
    </div>`;
}

async function waitForCheckResult(previousStamp) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const current = os.storage.get(StorageKeys.lastVersionCheck);
    if (current && current !== previousStamp) return true;
  }
  return false;
}

registerWin11Binding("updateHero", {
  type: "custom",
  render: renderUpdateHero,
  bind: (host) => {
    const button = $("[data-win11-check-updates]", host);
    const title = $(".left h2", host);
    const detail = $(".left p", host);

    bindEvent(button, "click", async () => {
      const binding = getWin11Binding("checkUpdates");
      const previousStamp = os.storage.get(StorageKeys.lastVersionCheck);
      setText(title, "Checking for updates");
      setText(detail, "Contacting the update server");
      if (binding && typeof binding.apply === "function") {
        binding.apply();
      } else {
        versionChecker.check();
      }
      await waitForCheckResult(previousStamp);
      const status = updateStatusText();
      setText(title, status.title);
      setText(detail, status.detail);
    });
  },
});

registerWin11Binding("updateHistory", {
  type: "custom",
  render: () => `<div class="win11-empty">Loading update history...</div>`,
  bind: (host) => {
    const remote = os.storage.get(StorageKeys.lastKnownRemoteVersion);
    const current = YUKIOS_VERSION;
    setHTML(
      host,
      `
      <div class="win11-control win11-control--stacked">
        <div class="win11-control__text">
          <p class="win11-control__title">Installed version</p>
          <p class="win11-control__desc">${escapeHtml(current)}</p>
        </div>
      </div>
      <div class="win11-control win11-control--stacked">
        <div class="win11-control__text">
          <p class="win11-control__title">Last version check</p>
          <p class="win11-control__desc">${escapeHtml(lastCheckedLabel())}</p>
        </div>
      </div>
      <div class="win11-control win11-control--stacked">
        <div class="win11-control__text">
          <p class="win11-control__title">Known remote version</p>
          <p class="win11-control__desc">${escapeHtml(remote || "None recorded")}</p>
        </div>
      </div>`,
    );
  },
});

export const updatePage = {
  id: "Windows Update",
  label: "Windows Update",
  hero: () =>
    `<div class="win11-custom" data-win11-custom="updateHero">${renderUpdateHero()}</div>`,
  tiles: () => [
    {
      name: "Update history",
      desc: "Last check time and known remote version",
      icon: win11Icon("Windows Update", "Update history"),
      subPage: "update-history",
    },
  ],
  subPages: {
    "update-history": {
      title: "Update history",
      body: () =>
        [
          custom(
            "updateHistory",
            "Update history",
            "Version information recorded by the update checker",
          ),
        ].join(""),
    },
  },
};
