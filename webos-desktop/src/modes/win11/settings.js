import { StorageKeys, os } from "../../framework.js";
import { $, $$, bindEvent, toggleClass } from "../../shared/domUtils.js";

function getSettings() {
  return {
    align: os.storage.get(StorageKeys.win11TaskbarAlign) || "center",
  };
}

export function renderWin11Settings() {
  const s = getSettings();
  return `
    <div id="pane-win11" class="settings-category-pane">
      <div class="settings-category-header">Windows 11</div>

      <div class="settings-card">
        <div class="settings-card-header"><i class="fab fa-windows"></i> Taskbar</div>
        <div class="settings-row">
          <div class="settings-label-group">
            <span class="settings-label-title">Taskbar Alignment</span>
            <span class="settings-label-desc">Center icons like Windows 11 or align them left</span>
          </div>
          <div class="settings-button-group">
            <button class="settings-btn ${s.align === "center" ? "active" : ""}" data-win11-align="center"><i class="fas fa-align-center"></i> Center</button>
            <button class="settings-btn ${s.align === "left" ? "active" : ""}" data-win11-align="left"><i class="fas fa-align-left"></i> Left</button>
          </div>
        </div>
      </div>

      <div class="settings-card" style="margin-top: 16px;">
        <div class="settings-card-header"><i class="fas fa-list-ul"></i> Context Menus</div>
        <div class="settings-row">
          <div class="settings-label-group">
            <span class="settings-label-title">Win 11 Menu Style</span>
            <span class="settings-label-desc">Context menus use the Win 11 style by default in this mode. Change the style anytime under Appearance.</span>
          </div>
        </div>
      </div>

    </div>
  `;
}

export function bindWin11Category(win, showSaved) {
  const applyAlign = (align) => {
    $$(".settings-btn[data-win11-align]", win).forEach((b) =>
      toggleClass(b, "active", b.dataset.win11Align === align),
    );
    os.storage.set(StorageKeys.win11TaskbarAlign, align);
    const taskbarWindows = $("#taskbar-windows");
    if (taskbarWindows) {
      const justifyMap = { left: "flex-start", center: "center" };
      taskbarWindows.style.justifyContent = justifyMap[align] || "center";
    }
    showSaved();
  };

  $$(".settings-btn[data-win11-align]", win).forEach((btn) => {
    bindEvent(btn, "click", () => applyAlign(btn.dataset.win11Align));
  });
}
