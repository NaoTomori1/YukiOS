import {
  os,
  ServiceKeys,
  StorageKeys,
  $,
  $$,
  bindEvent,
  createElement,
  setText,
} from "../../framework.js";
import { showDynamicContextMenu } from "../../shared/contextMenu.js";
import {
  showSidebarItemContextMenu,
  showTrashContextMenu,
} from "../../apps/explorer/contextMenus.js";
import { resolveIconUrl } from "../../shared/assetResolver.js";
const enhancedWins = new Set();
const sigMap = new Map();
let observer = null;
let scanScheduled = false;
const ICON_BASE = "static/icons";
const RIB_PNG = {
  new: "win11-ex-new.png",
  cut: "win11-ex-cut.png",
  copy: "win11-ex-copy.png",
  paste: "win11-ex-paste.png",
  rename: "win11-ex-rename.png",
  share: "win11-ex-share.png",
  sort: "win11-ex-sort.png",
  view: "win11-ex-view.png",
};
const RIB_FA = {
  new: "fas fa-plus",
  cut: "fas fa-cut",
  copy: "fas fa-copy",
  paste: "fas fa-paste",
  rename: "fas fa-edit",
  share: "fas fa-share-alt",
  delete: "fas fa-trash-alt",
  sort: "fas fa-sort",
  view: "fas fa-eye",
};
const NAV_PNG = {
  star: "win11-nav-star-sm.png",
  down: "win11-nav-down-sm.png",
  user: "win11-nav-user-sm.png",
  docs: "win11-nav-docs-sm.png",
  folder: "win11-nav-folder-sm.png",
  pics: "win11-nav-pics-sm.png",
  pinned: "win11-nav-pinned.png",
  onedrive: "win11-nav-onedrive-sm.png",
  thispc: "win11-nav-thispc-sm.png",
  desk: "win11-nav-desk-sm.png",
  music: "win11-nav-music-sm.png",
  vid: "win11-nav-vid-sm.png",
  disc: "win11-nav-disc-sm.png",
  disk: "win11-nav-disk-sm.png",
};
const SEARCH_PNG = ICON_BASE + "/win11-ex-search.png";
const VIEW_LARGE_PNG = ICON_BASE + "/win11-view-large.png";
const VIEW_INFO_PNG = ICON_BASE + "/win11-view-info.png";
function getExplorerApp() {
  try {
    return os.app.getInstance(ServiceKeys.EXPLORER);
  } catch {
    return null;
  }
}
function isSpecialView(inst) {
  return inst.isTrashView || inst.isDiskView;
}
function denySpecial() {
  os.notify.send("Not available in this view");
}
function freshInst(app, winId) {
  try {
    return app.getInstance(winId);
  } catch {
    return null;
  }
}
function makeFaIcon(cls, sizePx) {
  return createElement("i", {
    className: cls,
    styles: { fontSize: sizePx + "px" },
  });
}
function makePngImg(src, sizePx, margin) {
  const styles = { width: sizePx + "px", height: sizePx + "px" };
  if (margin) styles.margin = margin;
  return createElement("img", {
    attributes: { src: resolveIconUrl(src), alt: "", draggable: "false" },
    styles: styles,
  });
}
function ribVisual(pngFile, faCls) {
  return createElement("i", {
    className: faCls + " uicon",
    styles: { fontSize: "18px", margin: "0 6px" },
  });
}
function makeRibIcon(pngFile, faCls, title) {
  const btn = createElement("div", {
    className: "uicon",
    attributes: { title: title },
  });
  btn.appendChild(ribVisual(pngFile, faCls));
  return btn;
}
function makeRibLabeled(pngFile, faCls, label, title) {
  const btn = createElement("div", {
    className: "drdwcont flex",
    attributes: { title: title },
  });
  btn.appendChild(ribVisual(pngFile, faCls));
  const lab = createElement("span");
  setText(lab, label);
  btn.appendChild(lab);
  return btn;
}
function makeFaRibIcon(faCls, title) {
  const btn = createElement("div", {
    className: "uicon",
    attributes: { title: title },
  });
  const icon = makeFaIcon(faCls, 18);
  icon.style.margin = "0 6px";
  btn.appendChild(icon);
  return btn;
}
function attachRibAction(btn, label, handler) {
  btn.setAttribute("role", "button");
  btn.setAttribute("tabindex", "0");
  btn.setAttribute("aria-label", label);
  if (btn.ribActionBound) return;
  btn.ribActionBound = true;
  bindEvent(btn, "click", (event) => handler(event));
  bindEvent(btn, "keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handler(event);
    }
  });
}
function bindNewButton(btn, app, winId) {
  attachRibAction(btn, "New", (e) => {
    const inst = freshInst(app, winId);
    if (!inst) return;
    if (isSpecialView(inst)) {
      denySpecial();
      return;
    }
    showDynamicContextMenu(e, (menu, item) => {
      menu.appendChild(
        item(
          "New Folder",
          () => {
            const cur = freshInst(app, winId);
            if (!cur) return;
            if (isSpecialView(cur)) {
              denySpecial();
              return;
            }
            app.spawnInlineItem(cur, false);
          },
          "fa-folder-plus",
        ),
      );
      menu.appendChild(
        item(
          "New File",
          () => {
            const cur = freshInst(app, winId);
            if (!cur) return;
            if (isSpecialView(cur)) {
              denySpecial();
              return;
            }
            app.spawnInlineItem(cur, true);
          },
          "fa-file-medical",
        ),
      );
    });
  });
}
function bindEditButtons(group, app, win, winId) {
  const cutBtn = makeRibIcon(RIB_PNG.cut, RIB_FA.cut, "Cut");
  const copyBtn = makeRibIcon(RIB_PNG.copy, RIB_FA.copy, "Copy");
  const pasteBtn = makeRibIcon(RIB_PNG.paste, RIB_FA.paste, "Paste");
  const renameBtn = makeRibIcon(RIB_PNG.rename, RIB_FA.rename, "Rename");
  const shareBtn = makeRibIcon(RIB_PNG.share, RIB_FA.share, "Share");
  const deleteBtn = makeFaRibIcon(RIB_FA.delete, "Delete");
  attachRibAction(cutBtn, "Cut", () => {
    const inst = freshInst(app, winId);
    if (!inst) return;
    if (isSpecialView(inst)) {
      denySpecial();
      return;
    }
    app.clipboardAction("cut", inst);
  });
  attachRibAction(copyBtn, "Copy", () => {
    const inst = freshInst(app, winId);
    if (!inst) return;
    app.clipboardAction("copy", inst);
  });
  attachRibAction(pasteBtn, "Paste", () => {
    const inst = freshInst(app, winId);
    if (!inst) return;
    if (isSpecialView(inst)) {
      denySpecial();
      return;
    }
    app.pasteToCurrentPath(inst);
  });
  attachRibAction(renameBtn, "Rename", () => {
    const inst = freshInst(app, winId);
    if (!inst) return;
    if (isSpecialView(inst)) {
      denySpecial();
      return;
    }
    const single =
      inst.selectedFile ||
      (inst.selectedItems.size === 1 ? [...inst.selectedItems][0] : null);
    if (!single) return;
    const view = $(`#${winId}-view`, win);
    if (!view) return;
    const found = $$(".file-item", view).find((el) => {
      const span = $("span", el);
      return span && span.textContent === single;
    });
    if (found) app.startInlineRename(found, single, inst);
  });
  attachRibAction(shareBtn, "Share", () => {
    const inst = freshInst(app, winId);
    if (!inst) return;
    const full = "/" + (inst.currentPath || []).join("/");
    try {
      os.app.setClipboardContent(full);
    } catch {}
    try {
      navigator.clipboard
        .writeText(full)
        .then(() => {
          os.notify.send("Path copied to clipboard");
        })
        .catch(() => {
          os.notify.send("Copy failed");
        });
    } catch {
      os.notify.send("Copy failed");
    }
  });
  attachRibAction(deleteBtn, "Delete", () => {
    const inst = freshInst(app, winId);
    if (!inst) return;
    if (isSpecialView(inst)) {
      denySpecial();
      return;
    }
    const names = [...inst.selectedItems];
    if (!names.length) {
      os.notify.send("No items selected");
      return;
    }
    inst.selectedItems = new Set();
    Promise.all(names.map((n) => os.fs.trashFile(inst.currentPath, n))).then(
      () => {
        os.notify.send("Moved to trash");
        app.renderInstance(inst);
      },
    );
  });
  group.appendChild(cutBtn);
  group.appendChild(copyBtn);
  group.appendChild(pasteBtn);
  group.appendChild(renameBtn);
  group.appendChild(shareBtn);
  group.appendChild(deleteBtn);
}
function bindSortViewButtons(group, app, winId) {
  const sortBtn = makeRibLabeled(RIB_PNG.sort, RIB_FA.sort, "Sort", "Sort");
  const viewBtn = makeRibLabeled(RIB_PNG.view, RIB_FA.view, "View", "View");
  attachRibAction(sortBtn, "Sort", (e) => {
    showDynamicContextMenu(e, (menu, item) => {
      const picks = [
        ["Name", "name"],
        ["Date modified", "date"],
        ["Type", "type"],
        ["Size", "size"],
      ];
      picks.forEach((pick) => {
        const label = pick[0];
        const key = pick[1];
        menu.appendChild(
          item(
            label,
            () => {
              const inst = freshInst(app, winId);
              if (!inst) return;
              inst.sortBy = key;
              inst.sortDir = "asc";
              app.renderInstance(inst);
            },
            "fa-sort",
          ),
        );
      });
    });
  });
  attachRibAction(viewBtn, "View", (e) => {
    showDynamicContextMenu(e, (menu, item) => {
      menu.appendChild(
        item(
          "Large icons",
          () => {
            const inst = freshInst(app, winId);
            if (!inst) return;
            app.viewMode = "grid";
            app.renderInstance(inst);
          },
          "fa-th-large",
        ),
      );
      menu.appendChild(
        item(
          "Details list",
          () => {
            const inst = freshInst(app, winId);
            if (!inst) return;
            app.viewMode = "list";
            app.renderInstance(inst);
          },
          "fa-list",
        ),
      );
    });
  });
  group.appendChild(sortBtn);
  group.appendChild(viewBtn);
}
function buildRibbon(win, winId, app) {
  if ($(".msribbon", win)) return $(".msribbon", win);
  const ribbon = createElement("div", { className: "msribbon flex" });
  const secNew = createElement("div", { className: "ribsec" });
  const secEdit = createElement("div", { className: "ribsec" });
  const secView = createElement("div", { className: "ribsec" });
  const newBtn = makeRibLabeled(RIB_PNG.new, RIB_FA.new, "New", "New");
  bindNewButton(newBtn, app, winId);
  secNew.appendChild(newBtn);
  bindEditButtons(secEdit, app, win, winId);
  bindSortViewButtons(secView, app, winId);
  ribbon.appendChild(secNew);
  ribbon.appendChild(secEdit);
  ribbon.appendChild(secView);
  const header = $(".window-header.explorer-tab-header", win);
  if (header) {
    if (header.nextSibling) win.insertBefore(ribbon, header.nextSibling);
    else win.appendChild(ribbon);
  } else if (win.firstChild) win.insertBefore(ribbon, win.firstChild);
  else win.appendChild(ribbon);
  return ribbon;
}
function styleNavButtons(win, winId) {
  const specs = [
    [`#${winId}-back`, "fas fa-arrow-left"],
    [`#${winId}-next`, "fas fa-arrow-right"],
    [`#${winId}-up`, "fas fa-arrow-up"],
  ];
  specs.forEach((spec) => {
    const sel = spec[0];
    const cls = spec[1];
    const el = $(sel, win);
    if (!el || el.win11NavDone) return;
    el.classList.add("navIcon");
    el.classList.add("hvtheme");
    el.innerHTML = "";
    el.appendChild(makeFaIcon(cls, 14));
    el.win11NavDone = true;
  });
}
function updateNavDisabled(win, winId, inst) {
  const back = $(`#${winId}-back`, win);
  const next = $(`#${winId}-next`, win);
  const up = $(`#${winId}-up`, win);
  if (back) back.classList.toggle("disableIt", !(inst.historyIndex > 0));
  if (next)
    next.classList.toggle(
      "disableIt",
      !(inst.history && inst.historyIndex < inst.history.length - 1),
    );
  const atRoot = !(inst.currentPath && inst.currentPath.length);
  if (up)
    up.classList.toggle("disableIt", Boolean(atRoot && !isSpecialView(inst)));
}
function styleSearch(win) {
  const wrap = $(".explorer-search-wrap", win);
  if (wrap) wrap.classList.add("srchbar");
  const icon = $(".explorer-search-icon", win);
  if (!icon || icon.win11IconDone) return;
  icon.classList.add("searchIcon");
  if (icon.tagName === "IMG") {
    icon.setAttribute("src", resolveIconUrl(SEARCH_PNG));
    icon.style.width = "12px";
    icon.style.height = "12px";
    icon.win11IconDone = true;
    bindEvent(icon, "error", () => {
      const parent = icon.parentElement;
      if (!parent) return;
      const fallback = createElement("i", {
        className: "fas fa-search explorer-search-icon searchIcon",
        styles: { fontSize: "12px" },
      });
      parent.replaceChild(fallback, icon);
    });
    return;
  }
  icon.innerHTML = "";
  const img = makePngImg(SEARCH_PNG, 12, null);
  bindEvent(img, "error", () => {
    const fallback = makeFaIcon("fas fa-search", 12);
    if (img.parentElement) img.parentElement.replaceChild(fallback, img);
  });
  icon.appendChild(img);
  icon.win11IconDone = true;
}
function styleViewButton(btn, pngSrc, faCls) {
  if (!btn || btn.win11IconDone) return;
  btn.classList.add("viewicon");
  btn.classList.add("hvtheme");
  btn.classList.add("p-1");
  if (btn.tagName === "IMG") {
    btn.setAttribute("src", resolveIconUrl(pngSrc));
    btn.style.width = "16px";
    btn.style.height = "16px";
    btn.win11IconDone = true;
    bindEvent(btn, "error", () => {
      const parent = btn.parentElement;
      if (!parent) return;
      const fallback = createElement("i", {
        className: faCls + " explorer-view-btn viewicon hvtheme p-1",
        styles: { fontSize: "16px" },
      });
      fallback.id = btn.id;
      const title = btn.getAttribute("title");
      if (title) fallback.setAttribute("title", title);
      fallback.win11IconDone = true;
      parent.replaceChild(fallback, btn);
    });
    return;
  }
  btn.innerHTML = "";
  const img = makePngImg(pngSrc, 16, null);
  bindEvent(img, "error", () => {
    const fallback = makeFaIcon(faCls, 16);
    if (img.parentElement) img.parentElement.replaceChild(fallback, img);
  });
  btn.appendChild(img);
  btn.win11IconDone = true;
}
function styleViewToggle(win, winId) {
  const toggle = $(`#${winId}-view-toggle`, win);
  if (toggle) {
    toggle.classList.add("view-opts");
    toggle.classList.add("flex");
  }
  const gridBtn = $(`#${winId}-view-grid`, win);
  const listBtn = $(`#${winId}-view-list`, win);
  styleViewButton(gridBtn, VIEW_LARGE_PNG, "fas fa-th-large");
  styleViewButton(listBtn, VIEW_INFO_PNG, "fas fa-list");
  let mode = "grid";
  try {
    const app = getExplorerApp();
    if (app && typeof app.viewMode === "string") mode = app.viewMode;
    else {
      const inst = app ? freshInst(app, winId) : null;
      if (inst && typeof inst.viewMode === "string") mode = inst.viewMode;
    }
  } catch {}
  if (gridBtn) {
    gridBtn.classList.add("viewicon");
    gridBtn.classList.add("hvtheme");
    gridBtn.classList.add("p-1");
    gridBtn.setAttribute("data-open", mode === "grid" ? "true" : "false");
  }
  if (listBtn) {
    listBtn.classList.add("viewicon");
    listBtn.classList.add("hvtheme");
    listBtn.classList.add("p-1");
    listBtn.setAttribute("data-open", mode === "list" ? "true" : "false");
  }
}
function styleChrome(win, winId) {
  const nav = $(".explorer-nav", win);
  if (nav) nav.classList.add("sec1");
  const wrap = $(".explorer-path-wrap", win);
  if (wrap) {
    wrap.classList.add("path-bar");
    wrap.classList.add("noscroll");
  }
  const input = $(`#${winId}-path`, win);
  if (input) input.classList.add("path-field");
  const container = $(".explorer-container", win);
  if (container) container.classList.add("sec2");
  const status = $(".explorer-status-bar", win);
  if (status) status.classList.add("sec3");
  const items = $(`#${winId}-status-items`, win);
  if (items) {
    items.classList.add("item-count");
    items.classList.add("text-xs");
  }
  styleNavButtons(win, winId);
  styleSearch(win);
  styleViewToggle(win, winId);
}
function rebuildCrumbs(win, winId, app, inst) {
  const wrap = $(".explorer-path-wrap", win);
  if (!wrap) return;
  const crumbs = $(".dirfbox", wrap);
  if (!crumbs) return;
  crumbs.innerHTML = "";
  const path = inst.currentPath || [];
  const homeCont = createElement("div", {
    className: "dirCont flex items-center",
  });
  const homeName = createElement("div", { className: "dncont" });
  homeName.appendChild(makeFaIcon("fas fa-home", 12));
  bindEvent(homeName, "click", (e) => {
    e.stopPropagation();
    app.navigateInstance(inst, []);
  });
  homeCont.appendChild(homeName);
  homeCont.appendChild(makeFaIcon("fas fa-chevron-right", 8));
  const homeChev = $(".fas.fa-chevron-right", homeCont);
  if (homeChev) homeChev.classList.add("dirchev");
  crumbs.appendChild(homeCont);
  path.forEach((seg, idx) => {
    const cont = createElement("div", {
      className: "dirCont flex items-center",
    });
    const name = createElement("div", { className: "dncont" });
    setText(name, seg);
    bindEvent(name, "click", (e) => {
      e.stopPropagation();
      app.navigateInstance(inst, path.slice(0, idx + 1));
    });
    cont.appendChild(name);
    const chev = makeFaIcon("fas fa-chevron-right", 8);
    chev.classList.add("dirchev");
    cont.appendChild(chev);
    crumbs.appendChild(cont);
  });
}
function ensureCrumbs(win, winId, app, inst) {
  const wrap = $(".explorer-path-wrap", win);
  if (!wrap) return null;
  wrap.classList.add("path-bar");
  wrap.classList.add("noscroll");
  let crumbs = $(".dirfbox", wrap);
  if (!crumbs) {
    crumbs = createElement("div", {
      className: "dirfbox h-full flex win11-crumbs",
    });
    if (wrap.firstChild) wrap.insertBefore(crumbs, wrap.firstChild);
    else wrap.appendChild(crumbs);
    const input = $(`#${winId}-path`, win);
    if (!wrap.dataset.crumbEditBound) {
      wrap.dataset.crumbEditBound = "1";
      bindEvent(wrap, "click", (e) => {
        const target = e.target;
        const field = $(`#${winId}-path`, win);
        if (!field || target === field) return;
        if (
          target.classList &&
          target.classList.contains("explorer-reload-icon")
        )
          return;
        if (target.closest && target.closest(".dncont")) return;
        wrap.classList.add("crumb-editing");
        field.focus();
        field.select();
      });
    }
    if (input) {
      input.classList.add("path-field");
      bindEvent(input, "focus", () => {
        wrap.classList.add("crumb-editing");
      });
      bindEvent(input, "blur", () => {
        wrap.classList.remove("crumb-editing");
      });
      bindEvent(input, "keydown", (e) => {
        if (e.key === "Enter" || e.key === "Escape")
          wrap.classList.remove("crumb-editing");
      });
    }
  }
  crumbs.classList.add("h-full");
  crumbs.classList.add("flex");
  return crumbs;
}
function navPngVisual(pngFile, faCls) {
  const img = makePngImg(ICON_BASE + "/" + pngFile, 16, null);
  img.classList.add("mr-1");
  bindEvent(img, "error", () => {
    const fallback = makeFaIcon(faCls, 16);
    fallback.classList.add("mr-1");
    if (img.parentElement) img.parentElement.replaceChild(fallback, img);
  });
  return img;
}
function makeArrIcon(expanded) {
  const icon = makeFaIcon(
    expanded ? "fas fa-chevron-down" : "fas fa-chevron-right",
    10,
  );
  icon.classList.add("arrUi");
  return icon;
}
function makeNavTitle(pngFile, faCls, label) {
  const title = createElement("div", { className: "navtitle flex prtclk" });
  let visual = null;
  if (pngFile) visual = navPngVisual(pngFile, faCls);
  else visual = makeFaIcon(faCls, 16);
  visual.classList.add("mr-1");
  title.appendChild(visual);
  const span = createElement("span");
  setText(span, label);
  title.appendChild(span);
  return title;
}
function makePinIcon() {
  const pin = makePngImg(ICON_BASE + "/" + NAV_PNG.pinned, 16, null);
  pin.classList.add("pinUi");
  bindEvent(pin, "error", () => {
    if (pin.parentElement) pin.parentElement.removeChild(pin);
  });
  return pin;
}
function bindLeafDrop(leaf, app, inst) {
  bindEvent(leaf, "dragover", (e) => {
    if (!e.dataTransfer) return;
    e.preventDefault();
    try {
      e.dataTransfer.dropEffect = e.ctrlKey ? "copy" : "move";
    } catch {}
    leaf.classList.add("explorer-drop-target");
  });
  bindEvent(leaf, "dragleave", () => {
    leaf.classList.remove("explorer-drop-target");
  });
  bindEvent(leaf, "drop", (e) => {
    e.preventDefault();
    try {
      const result = app.handleSidebarDrop(e, leaf, inst);
      if (result && result.catch) result.catch(() => {});
    } catch {}
  });
}
function makeLeaf(app, inst, opts) {
  const leaf = createElement("div", { className: "dropdownmenu" });
  if (opts.mount) {
    leaf.setAttribute("data-mount", opts.mount);
    leaf.setAttribute("data-label", opts.mountLabel || opts.label);
  } else {
    leaf.setAttribute("data-path", opts.path);
  }
  const head = createElement("div", { className: "droptitle" });
  const placeholder = makeFaIcon("fas fa-circle", 10);
  placeholder.classList.add("arrUi");
  placeholder.classList.add("opacity-0");
  head.appendChild(placeholder);
  head.appendChild(makeNavTitle(opts.png, opts.fa, opts.label));
  if (opts.pinned) head.appendChild(makePinIcon());
  bindEvent(head, "click", (e) => {
    e.stopPropagation();
    opts.onOpen();
  });
  if (opts.onMenu) bindEvent(leaf, "contextmenu", (e) => opts.onMenu(e));
  bindLeafDrop(leaf, app, inst);
  leaf.appendChild(head);
  return leaf;
}
function openMountMenu(e, app, win, inst, mountPoint, label, isISO) {
  e.preventDefault();
  e.stopPropagation();
  showDynamicContextMenu(e, (menu, menuItem, hr) => {
    menu.appendChild(
      menuItem(
        "Open",
        () => app.navigateInstance(inst, mountPoint.split("/").filter(Boolean)),
        "fa-folder-open",
      ),
    );
    menu.appendChild(
      menuItem(
        "Open in New Window",
        () => app.open(mountPoint.split("/").filter(Boolean)),
        "fa-external-link-alt",
      ),
    );
    menu.appendChild(hr());
    menu.appendChild(
      menuItem(
        "Copy Path",
        () => {
          const full = "/" + mountPoint;
          try {
            os.app.setClipboardContent(full);
          } catch {}
          try {
            navigator.clipboard
              .writeText(full)
              .then(() => {
                os.notify.send("Path copied to clipboard");
              })
              .catch(() => {
                os.notify.send("Copy failed");
              });
          } catch {
            os.notify.send("Copy failed");
          }
        },
        "fa-copy",
      ),
    );
    menu.appendChild(
      menuItem(
        "Unmount",
        () => {
          os.dialog
            .confirm("Unmount", `Eject "${label}"?`)
            .then((confirmed) => {
              if (!confirmed) return;
              if (isISO) os.fs.unmountISO(label);
              else os.fs.unmount(label);
              const cur = freshInst(app, inst.winId);
              const curWin = $(`#${inst.winId}`);
              if (cur && curWin) buildNavpane(curWin, inst.winId, app, cur);
              if (cur) app.renderInstance(cur);
            });
        },
        "fa-eject",
      ),
    );
  });
}
function makeGroup(title, pngFile, faCls, groupKey, expanded, onToggle) {
  const group = createElement("div", { className: "dropdownmenu" });
  const head = createElement("div", { className: "droptitle" });
  head.appendChild(makeArrIcon(expanded));
  head.appendChild(makeNavTitle(pngFile, faCls, title));
  bindEvent(head, "click", (e) => {
    e.stopPropagation();
    onToggle(groupKey, !expanded);
  });
  group.appendChild(head);
  const body = createElement("div", { className: "dropcontent" });
  group.appendChild(body);
  return { group: group, body: body };
}
function toggleGroupCollapsed(groupKey, willCollapse) {
  const collapsed = os.storage.get(StorageKeys.explorerSidebarCollapsed) || {};
  collapsed[groupKey] = willCollapse;
  os.storage.set(StorageKeys.explorerSidebarCollapsed, collapsed);
}
function homeLabel() {
  try {
    return os.storage.get(StorageKeys.username) || "Home";
  } catch {
    return "Home";
  }
}
function quickDefaults() {
  return [
    {
      path: "Downloads",
      label: "Downloads",
      png: NAV_PNG.down,
      fa: "fas fa-download",
    },
    { path: "", label: homeLabel(), png: NAV_PNG.user, fa: "fas fa-home" },
    {
      path: "Documents",
      label: "Documents",
      png: NAV_PNG.docs,
      fa: "fas fa-file-alt",
    },
    {
      path: "Pictures",
      label: "Pictures",
      png: NAV_PNG.pics,
      fa: "fas fa-image",
    },
  ];
}
function appendQuickLeaves(body, app, inst) {
  const defaults = quickDefaults();
  const hidden = new Set(
    os.storage.get(StorageKeys.explorerQuickAccessHidden) || [],
  );
  defaults
    .filter((entry) => !hidden.has(entry.path))
    .forEach((entry) => {
      body.appendChild(
        makeLeaf(app, inst, {
          path: entry.path,
          label: entry.label,
          png: entry.png,
          fa: entry.fa,
          pinned: false,
          onOpen: () =>
            app.navigateInstance(inst, entry.path.split("/").filter(Boolean)),
          onMenu: (e) =>
            showSidebarItemContextMenu(app, e, entry.path, entry.label, inst),
        }),
      );
    });
  const pinned = os.storage.get(StorageKeys.explorerQuickAccess) || [];
  pinned
    .filter((p) => !defaults.some((entry) => entry.path === p.path))
    .forEach((p) => {
      body.appendChild(
        makeLeaf(app, inst, {
          path: p.path,
          label: p.label,
          png: NAV_PNG.folder,
          fa: "fas fa-folder",
          pinned: true,
          onOpen: () =>
            app.navigateInstance(
              inst,
              String(p.path).split("/").filter(Boolean),
            ),
          onMenu: (e) =>
            showSidebarItemContextMenu(app, e, p.path, p.label, inst),
        }),
      );
    });
}
function appendThisPcLeaves(body, app, win, inst) {
  const entries = [
    { path: "Desktop", png: NAV_PNG.desk, fa: "fas fa-desktop" },
    { path: "Documents", png: NAV_PNG.docs, fa: "fas fa-file-alt" },
    { path: "Downloads", png: NAV_PNG.down, fa: "fas fa-download" },
    { path: "Music", png: NAV_PNG.music, fa: "fas fa-music" },
    { path: "Pictures", png: NAV_PNG.pics, fa: "fas fa-image" },
    { path: "Videos", png: NAV_PNG.vid, fa: "fas fa-video" },
  ];
  entries.forEach((entry) => {
    body.appendChild(
      makeLeaf(app, inst, {
        path: entry.path,
        label: entry.path,
        png: entry.png,
        fa: entry.fa,
        pinned: false,
        onOpen: () =>
          app.navigateInstance(inst, entry.path.split("/").filter(Boolean)),
        onMenu: (e) =>
          showSidebarItemContextMenu(app, e, entry.path, entry.path, inst),
      }),
    );
  });
  body.appendChild(
    makeLeaf(app, inst, {
      path: "__disk__",
      label: "Local Disk (C:)",
      png: NAV_PNG.disc,
      fa: "fas fa-hdd",
      pinned: false,
      onOpen: () => app.showDiskView(inst),
      onMenu: null,
    }),
  );
  let mounts = [];
  try {
    mounts = (os.fs.getMounts() || []).filter((m) => m.type !== "iso");
  } catch {
    mounts = [];
  }
  mounts.forEach((m) => {
    body.appendChild(
      makeLeaf(app, inst, {
        mount: m.mountPoint,
        mountLabel: m.label,
        label: m.label,
        png: NAV_PNG.disk,
        fa: "fas fa-hdd",
        pinned: false,
        onOpen: () =>
          app.navigateInstance(inst, m.mountPoint.split("/").filter(Boolean)),
        onMenu: (e) =>
          openMountMenu(e, app, win, inst, m.mountPoint, m.label, false),
      }),
    );
  });
  let isoMounts = [];
  try {
    isoMounts = os.fs.getISOMounts() || [];
  } catch {
    isoMounts = [];
  }
  isoMounts.forEach((m) => {
    body.appendChild(
      makeLeaf(app, inst, {
        mount: m.mountPoint,
        mountLabel: m.label,
        label: m.label,
        png: NAV_PNG.disc,
        fa: "fas fa-compact-disc",
        pinned: false,
        onOpen: () =>
          app.navigateInstance(inst, m.mountPoint.split("/").filter(Boolean)),
        onMenu: (e) =>
          openMountMenu(e, app, win, inst, m.mountPoint, m.label, true),
      }),
    );
  });
  body.appendChild(
    makeLeaf(app, inst, {
      path: "__trash__",
      label: "Trash",
      png: null,
      fa: "fas fa-trash-alt",
      pinned: false,
      onOpen: () => app.showTrashView(inst),
      onMenu: (e) => showTrashContextMenu(app, e, inst),
    }),
  );
}
function buildNavpane(win, winId, app, inst) {
  const sidebar = $(".explorer-sidebar", win);
  if (!sidebar) return;
  sidebar.innerHTML = "";
  const pane = createElement("div", { className: "navpane win11Scroll" });
  const ext = createElement("div", { className: "extcont" });
  pane.appendChild(ext);
  sidebar.appendChild(pane);
  const collapsed = os.storage.get(StorageKeys.explorerSidebarCollapsed) || {};
  const quickOpen = !collapsed.quick;
  const pcOpen = !collapsed.pc;
  const retoggle = (key, willCollapse) => {
    toggleGroupCollapsed(key, willCollapse);
    const cur = freshInst(app, winId);
    if (cur) buildNavpane(win, winId, app, cur);
  };
  const quick = makeGroup(
    "Quick access",
    NAV_PNG.star,
    "fas fa-star",
    "quick",
    quickOpen,
    retoggle,
  );
  ext.appendChild(quick.group);
  if (quickOpen) appendQuickLeaves(quick.body, app, inst);
  const pc = makeGroup(
    "This PC",
    NAV_PNG.thispc,
    "fas fa-desktop",
    "pc",
    pcOpen,
    retoggle,
  );
  ext.appendChild(pc.group);
  if (pcOpen) appendThisPcLeaves(pc.body, app, win, inst);
  updateWin11Active(win, inst);
}
function updateWin11Active(win, inst) {
  const sidebar = $(".explorer-sidebar", win);
  if (!sidebar) return;
  const current = (inst.currentPath || []).join("/");
  $$("[data-path], [data-mount]", sidebar).forEach((item) => {
    const dataPath = item.getAttribute("data-path");
    const mountPoint = item.getAttribute("data-mount");
    let match = false;
    if (mountPoint)
      match = mountPoint.split("/").filter(Boolean).join("/") === current;
    else if (dataPath !== null && dataPath !== undefined)
      match = dataPath === current;
    if (dataPath === "__trash__" && inst.isTrashView) match = true;
    if (dataPath === "" && inst.isTrashView) match = false;
    if (dataPath === "__disk__" && inst.isDiskView) match = true;
    if (dataPath !== "__disk__" && inst.isDiskView) match = false;
    item.classList.toggle("nav-item--active", match);
  });
}
function sidebarNeedsRebuild(win) {
  const sidebar = $(".explorer-sidebar", win);
  if (!sidebar) return false;
  if ($(".nav-item", sidebar)) return true;
  if (!$(".navpane", sidebar)) return true;
  return false;
}
function refreshWindow(win, winId) {
  const app = getExplorerApp();
  if (!app) return;
  const inst = freshInst(app, winId);
  if (!inst) return;
  if (inst.mode !== "browse") return;
  if (sidebarNeedsRebuild(win)) buildNavpane(win, winId, app, inst);
  styleChrome(win, winId);
  const path = inst.currentPath || [];
  const sig =
    path.join("/") +
    "|" +
    (inst.isTrashView ? "1" : "0") +
    (inst.isDiskView ? "1" : "0");
  if (sigMap.get(winId) !== sig) {
    rebuildCrumbs(win, winId, app, inst);
    sigMap.set(winId, sig);
  }
  updateNavDisabled(win, winId, inst);
  updateWin11Active(win, inst);
  const ribbon = $(".msribbon", win);
  if (ribbon) ribbon.style.display = isSpecialView(inst) ? "none" : "";
}
function enhanceWindow(win, winId) {
  const app = getExplorerApp();
  if (!app) return;
  const inst = freshInst(app, winId);
  if (!inst) return;
  if (inst.mode !== "browse") return;
  if ($(".msribbon", win)) {
    enhancedWins.add(winId);
    refreshWindow(win, winId);
    return;
  }
  buildRibbon(win, winId, app);
  styleChrome(win, winId);
  ensureCrumbs(win, winId, app, inst);
  buildNavpane(win, winId, app, inst);
  enhancedWins.add(winId);
  refreshWindow(win, winId);
}
function scanWindows() {
  const wins = $$(".window.explorer-window");
  wins.forEach((win) => {
    const winId = win.id;
    if (!winId) return;
    if (!enhancedWins.has(winId)) enhanceWindow(win, winId);
    else refreshWindow(win, winId);
  });
  [...enhancedWins].forEach((winId) => {
    const el = $(`#${winId}`);
    if (!el) {
      enhancedWins.delete(winId);
      sigMap.delete(winId);
    }
  });
}
export function setupWin11Explorer() {
  if (observer) return;
  observer = new MutationObserver(() => {
    if (scanScheduled) return;
    scanScheduled = true;
    setTimeout(() => {
      scanScheduled = false;
      try {
        scanWindows();
      } catch {}
    }, 0);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  scanWindows();
}
export function teardownWin11Explorer() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  scanScheduled = false;
  $$(".window.explorer-window .msribbon").forEach((el) => el.remove());
  $$(".win11-exribbon").forEach((el) => el.remove());
  $$(".window.explorer-window .navpane").forEach((el) => el.remove());
  $$(".window.explorer-window .win11-crumbs").forEach((el) => el.remove());
  $$(".win11-crumbs").forEach((el) => el.remove());
  $$(".explorer-path-wrap").forEach((wrap) =>
    wrap.classList.remove("crumb-editing"),
  );
  $$(".explorer-win-path").forEach((input) => {
    input.style.display = "";
  });
  const app = getExplorerApp();
  if (app) {
    $$(".window.explorer-window").forEach((win) => {
      if (!win.id) return;
      try {
        const inst = freshInst(app, win.id);
        if (inst) app.sidebarRebuild(win, inst);
      } catch {}
    });
  }
  enhancedWins.clear();
  sigMap.clear();
}
