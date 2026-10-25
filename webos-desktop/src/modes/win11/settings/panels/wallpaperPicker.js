import { os } from "../../../../framework.js";
import { bindEvent, setHTML } from "../../../../shared/domUtils.js";
import { registerWin11Binding } from "../win11SettingsBindings.js";

const WALLPAPER_ENGINE_SERVICE = "wallpaperEngineApp";
const WALLPAPER_ENGINE_HOST_ID = "wallpaper-engine-host";

function wallpaperCardHtml(item, isFav) {
  const thumb = item.thumbnail
    ? `<img class="we-win11-thumb" src="${item.thumbnail}" alt="${item.name}" loading="lazy" />`
    : `<div class="we-win11-thumb we-win11-thumb--placeholder"><i class="fas fa-${item.type === "vanta" ? "magic" : "image"}"></i></div>`;
  const starIcon = isFav ? "fas fa-star" : "far fa-star";
  return `
    <div class="we-win11-card" data-id="${item.id}" data-type="${item.type}">
      <div class="we-win11-thumb-wrap">${thumb}</div>
      <div class="we-win11-body">
        <div class="we-win11-name">${item.name}</div>
        <div class="we-win11-meta">${item.type.charAt(0).toUpperCase() + item.type.slice(1)} &#8226; ${item.meta?.source || "Unknown"}</div>
      </div>
      <div class="we-win11-actions">
        <button class="we-win11-fav" data-fav="${item.id}" title="${isFav ? "Remove from favorites" : "Add to favorites"}"><i class="${starIcon}"></i></button>
        <button class="we-win11-set we-win11-set--primary" data-set="${item.id}" title="Set Desktop"><i class="fas fa-desktop"></i></button>
        <button class="we-win11-set" data-login="${item.id}" title="Set Login"><i class="fas fa-lock"></i></button>
      </div>
    </div>`;
}

registerWin11Binding("wallpaperPicker", {
  type: "custom",
  render: () => `<div class="win11-empty">Loading wallpapers...</div>`,
  bind: (host) => {
    if (!host || host.dataset.mounted === "1") return;
    const app = os.app.getInstance(WALLPAPER_ENGINE_SERVICE);
    if (!app) {
      setHTML(
        host,
        `<div class="win11-empty">The wallpaper engine is unavailable right now.</div>`,
      );
      return;
    }
    host.id = WALLPAPER_ENGINE_HOST_ID;
    host.dataset.mounted = "1";

    const render = () => {
      const items = app.getFilteredItems ? app.getFilteredItems() : [];
      if (!items || !items.length) {
        setHTML(
          host,
          `<div class="win11-empty">No wallpapers available. Open the Wallpaper Engine app to browse and import more.</div>`,
        );
        return;
      }
      setHTML(
        host,
        `<div class="we-win11-grid">${items
          .map((item) =>
            wallpaperCardHtml(item, app.favorites?.includes(item.id)),
          )
          .join("")}</div>`,
      );
      bindEvents(host, app);
    };

    const bindEvents = (root, app) => {
      bindEvent(root, "click", (e) => {
        const setBtn = e.target.closest(".we-win11-set--primary");
        const loginBtn = e.target.closest(
          ".we-win11-set:not(.we-win11-set--primary)",
        );
        const favBtn = e.target.closest(".we-win11-fav");
        if (setBtn) {
          e.stopPropagation();
          const item = app.wallpaperItems.find(
            (i) => i.id === setBtn.dataset.set,
          );
          if (item) app.setDesktop(item);
          return;
        }
        if (loginBtn) {
          e.stopPropagation();
          const item = app.wallpaperItems.find(
            (i) => i.id === loginBtn.dataset.login,
          );
          if (item) app.setLogin(item);
          return;
        }
        if (favBtn) {
          e.stopPropagation();
          app.toggleFavorite(favBtn.dataset.fav);
          render();
          return;
        }
      });
    };

    bindEvents(host, app);

    app.loadAllWallpapers().then(render);
    render();
  },
});
