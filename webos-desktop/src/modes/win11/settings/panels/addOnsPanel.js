import { os, StorageKeys } from "../../../../framework.js";
import { $$, bindEvent, setHTML } from "../../../../shared/domUtils.js";
import { escapeHtml, note, subHeading } from "../win11Controls.js";
import { registerWin11Binding } from "../win11SettingsBindings.js";
import { pluralize } from "../../../../utils/utils.js";

const FILE_SECTIONS = [
  {
    dir: ["ROMs"],
    emptyText: "No ROMs uploaded yet. Add ROM files in Yuki Emulator.",
    filter: null,
    meta: "ROM file",
  },
  {
    dir: ["Flash"],
    emptyText: "No SWF files uploaded yet. Add them in Ruffle.",
    filter: (name) => name.toLowerCase().endsWith(".swf"),
    meta: "SWF file",
  },
  {
    dir: ["Games"],
    emptyText: "No DOS games uploaded yet. Add them in JsDos.",
    filter: (name) => /\.(jsdos|exe|com)$/i.test(name),
    meta: "DOS game",
  },
];

function fileNames(entries) {
  if (Array.isArray(entries)) return entries.filter(Boolean);
  return Object.keys(entries || {}).filter(
    (name) => entries[name] && entries[name].type === "file",
  );
}

async function readSectionFiles(section) {
  const entries = await os.fs.readdir(section.dir).catch(() => null);
  return fileNames(entries).filter(
    (name) =>
      !name.startsWith(".") && (!section.filter || section.filter(name)),
  );
}

function readVirtualMachines() {
  const raw = os.storage.get(StorageKeys.VM_MANAGER_VMS);
  return Array.isArray(raw) ? raw : [];
}

function fileExtension(name) {
  const parts = String(name).split(".");
  return parts.length > 1 ? parts.pop().toUpperCase() : "FILE";
}

function itemRow(title, desc) {
  return `
    <div class="win11-control win11-control--stacked">
      <div class="win11-control__text">
        <p class="win11-control__title">${escapeHtml(title)}</p>
        <p class="win11-control__desc">${escapeHtml(desc)}</p>
      </div>
    </div>`;
}

function appRow(title, desc, appId, appLabel) {
  return `
    <div class="win11-control">
      <div class="win11-control__text">
        <p class="win11-control__title">${escapeHtml(title)}</p>
        <p class="win11-control__desc">${escapeHtml(desc)}</p>
      </div>
      <button type="button" class="win11-action" data-addon-open="${escapeHtml(appId)}">${escapeHtml(appLabel)}</button>
    </div>`;
}

function renderSection(title, items, emptyText) {
  const body = items.length
    ? items.join("")
    : `<div class="win11-empty">${escapeHtml(emptyText)}</div>`;
  return [subHeading(title), body].join("");
}

async function renderAddOns(host) {
  const vmList = readVirtualMachines();
  const [romFiles, flashFiles, dosFiles] = await Promise.all(
    FILE_SECTIONS.map((section) => readSectionFiles(section)),
  );

  const vmItems = vmList.map((vm) => {
    const specs = [
      vm.osName,
      vm.cpu ? `${vm.cpu} cores` : "",
      vm.ram ? `${vm.ram} GB RAM` : "",
    ]
      .filter(Boolean)
      .join(" | ");
    return itemRow(vm.name || "Virtual machine", specs || "Virtual machine");
  });

  const fileItems = [romFiles, flashFiles, dosFiles].map((files, index) => {
    const section = FILE_SECTIONS[index];
    return files.map((name) =>
      itemRow(name, `${fileExtension(name)} | ${section.meta}`),
    );
  });

  setHTML(
    host,
    [
      note(
        "Add-ons are files you uploaded to YukiOS apps. They are stored on your virtual drive.",
      ),
      renderSection(
        "Virtual machines",
        vmItems,
        "No virtual machines yet. Create one in the Virtual Machine Manager.",
      ),
      appRow(
        "Virtual Machine Manager",
        `${vmList.length} ${pluralize(vmList.length, "virtual machine")} saved`,
        "virtualMachineManagerApp",
        "Manage",
      ),
      renderSection("Console ROMs", fileItems[0], FILE_SECTIONS[0].emptyText),
      appRow(
        "Yuki Emulator",
        `${romFiles.length} ${pluralize(romFiles.length, "ROM file")} in ROMs`,
        "emulatorApp",
        "Open",
      ),
      renderSection("Flash games", fileItems[1], FILE_SECTIONS[1].emptyText),
      appRow(
        "Ruffle",
        `${flashFiles.length} ${pluralize(flashFiles.length, "SWF file")} in Flash`,
        "ruffleApp",
        "Open",
      ),
      renderSection("DOS games", fileItems[2], FILE_SECTIONS[2].emptyText),
      appRow(
        "JsDos",
        `${dosFiles.length} ${pluralize(dosFiles.length, "game")} in Games`,
        "jsDosApp",
        "Open",
      ),
      subHeading("Create add-ons"),
      appRow(
        "App Creator",
        "Turn any website into a desktop app",
        "appCreatorApp",
        "Open App Creator",
      ),
      `
      <div class="win11-control">
        <div class="win11-control__text">
          <p class="win11-control__title">Ruffle settings</p>
          <p class="win11-control__desc">Choose how Flash games play inside YukiOS</p>
        </div>
        <button type="button" class="win11-action" data-win11-goto-category="Apps" data-win11-goto-subpage="apps-ruffle">Open</button>
      </div>`,
    ].join(""),
  );

  $$("[data-addon-open]", host).forEach((button) => {
    bindEvent(button, "click", () => {
      const appId = button.dataset.addonOpen;
      if (appId) os.app.launch(appId).catch(() => {});
    });
  });
}

registerWin11Binding("addOnsPanel", {
  type: "custom",
  render: () => `<div class="win11-empty">Loading add-ons...</div>`,
  bind: (host) => {
    renderAddOns(host).catch(() => {
      setHTML(host, `<div class="win11-empty">Could not read add-ons.</div>`);
    });
  },
});
