import { resolveIconUrl } from "../../../../shared/assetResolver.js";
import {
  EXTERNAL_SERVICES,
  getPackageLicenses,
  getRuntimeInfo,
} from "../../../../settings/systemInfo.js";
import { YUKIOS_VERSION } from "../../../../apps/about.js";
import { registerWin11Binding } from "../win11SettingsBindings.js";
import { escapeHtml } from "../win11Controls.js";

function infoRow(label, value, monospace) {
  return `
    <div class="win11-info-row">
      <span class="win11-info-label">${escapeHtml(label)}</span>
      <span class="win11-info-value${monospace ? " is-mono" : ""}">${escapeHtml(value)}</span>
    </div>`;
}

function infoSection(title, rows) {
  return `
    <div class="win11-control win11-control--stacked">
      <div class="win11-control__text">
        <p class="win11-control__title">${escapeHtml(title)}</p>
      </div>
      <div class="win11-info">
        ${rows.map((row) => infoRow(row[0], row[1], row[2])).join("")}
      </div>
    </div>`;
}

function renderOsInformation() {
  const commit =
    typeof __GIT_COMMIT__ !== "undefined" ? __GIT_COMMIT__ : "unknown";
  return `
    <div class="subHeading">OS Information</div>
    <div class="win11-control win11-control--stacked">
      <div class="win11-control__text">
        <p class="win11-control__title">
          YukiOS <span class="win11-badge">${escapeHtml(YUKIOS_VERSION)}</span>
        </p>
        <p class="win11-control__desc">Desktop, in your browser</p>
      </div>
      <div class="win11-hero-row">
        <img class="win11-logo" src="${resolveIconUrl("static/icons/logo.png")}" alt="" onerror="this.src='favicon.ico'" />
        <div class="win11-control__text">
          <p class="win11-control__desc">
            A full desktop OS in your browser with emulators, tools, PWA support,
            virtual filesystem, and 3000+ games included.
          </p>
          <div class="win11-chip-row">
            <span class="win11-control__desc">Build</span>
            <a class="win11-link" href="https://github.com/Reeyuki/yukios/commit/${commit}" target="_blank" rel="noopener noreferrer">${escapeHtml(commit)}</a>
          </div>
        </div>
      </div>
    </div>`;
}

function renderCommunity() {
  return `
    <div class="subHeading">Community</div>
    <div class="win11-control">
      <div class="win11-control__text">
        <p class="win11-control__title">YukiCord</p>
        <p class="win11-control__desc">Join our Discord server</p>
      </div>
      <div class="win11-chip-row">
        <input readonly value="https://discord.gg/2Z8Gvtqt7" class="win11-input" style="font-family:var(--font-mono);user-select:all;cursor:text;" onclick="this.select()" title="Click to select invite" aria-label="Discord invite" />
        <a class="win11-link" href="https://discord.gg/2Z8Gvtqt7" target="_blank" rel="noopener noreferrer">
          <button type="button" class="win11-action primary"><i class="fab fa-discord"></i> Join</button>
        </a>
      </div>
    </div>`;
}

function renderCredits() {
  const licenses = getPackageLicenses();
  const licenseItems = licenses
    .map((pkg) => {
      const tag = pkg.repo ? "a" : "div";
      const attrs = pkg.repo
        ? `href="${pkg.repo}" target="_blank" rel="noopener noreferrer"`
        : "";
      return `
        <${tag} class="win11-info-row" ${attrs}>
          <span class="win11-info-label">${escapeHtml(pkg.name)}</span>
          <span class="win11-info-value">
            ${escapeHtml(pkg.version)}
            <span class="win11-badge">${escapeHtml(pkg.license)}</span>
          </span>
        </${tag}>`;
    })
    .join("");

  const serviceItems = EXTERNAL_SERVICES.map((service) => {
    const icon = service.icon
      ? `<img class="win11-service-icon" src="${resolveIconUrl(service.icon)}" alt="" loading="lazy" onerror="this.style.display='none'" />`
      : `<i class="fas fa-cube win11-service-icon-fallback"></i>`;
    const creditTitle = service.contact
      ? `${service.credit} ${service.contact}`
      : service.credit;
    return `
      <a class="win11-service-card" href="${service.url}" target="_blank" rel="noopener noreferrer">
        ${icon}
        <span class="win11-service-name">${escapeHtml(service.name)}</span>
        <span class="win11-service-detail">${escapeHtml(service.detail)}</span>
        <span class="win11-service-credit" title="${escapeHtml(creditTitle)}">${escapeHtml(service.credit)}</span>
      </a>`;
  }).join("");

  return `
    <div class="subHeading">Credits</div>
    <div class="win11-control win11-control--stacked">
      <div class="win11-control__text">
        <p class="win11-control__title">Credits</p>
        <p class="win11-control__desc">YukiOS is MIT Licensed</p>
      </div>
      <div class="win11-hero-row">
        <img class="win11-logo" src="${resolveIconUrl("static/icons/reeyuki.webp")}" alt="Reeyuki" loading="lazy" onerror="this.style.display='none'" />
        <div class="win11-control__text">
          <p class="win11-control__title"><i class="fas fa-heart"></i> Made by Reeyuki</p>
          <p class="win11-control__desc">Creator of YukiOS</p>
          <div class="win11-chip-row">
            <a class="win11-link" href="https://github.com/reeyuki" target="_blank" rel="noopener noreferrer"><i class="fab fa-github"></i> GitHub</a>
            <a class="win11-link" href="https://reeyuki.neocities.org" target="_blank" rel="noopener noreferrer"><i class="fas fa-globe"></i> Website</a>
          </div>
        </div>
      </div>
    </div>
    <div class="win11-control win11-control--stacked">
      <div class="win11-control__text">
        <p class="win11-control__title">External Services</p>
      </div>
      <div class="win11-service-grid">
        ${serviceItems}
      </div>
    </div>
    <div class="win11-control win11-control--stacked">
      <div class="win11-control__text">
        <p class="win11-control__title">Libraries Used</p>
      </div>
      <div class="win11-info">
        ${licenseItems}
      </div>
    </div>`;
}

function renderDiagnostics() {
  const runtime = getRuntimeInfo();
  return [
    '<div class="subHeading">System Diagnostics</div>',
    infoSection("Hardware", runtime.hardware),
    infoSection("Browser", runtime.browserRows),
    infoSection("Operating System", runtime.osRows),
    infoSection("Network", runtime.networkRows),
    infoSection("Graphics", runtime.graphicsRows),
  ].join("");
}

registerWin11Binding("aboutPanel", {
  type: "custom",
  render: () => `<div class="win11-empty">Loading system information...</div>`,
  bind: (host) => {
    if (!host) return;
    host.innerHTML = [
      renderOsInformation(),
      renderCommunity(),
      renderCredits(),
      renderDiagnostics(),
    ].join("");
  },
});
