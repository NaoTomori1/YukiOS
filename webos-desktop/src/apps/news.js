import newsUpdates from "../news.json";
import "../styles/news.css";
import {
  $,
  addClass,
  bindEvent,
  removeClass,
  setStyle,
  setText,
} from "../shared/domUtils.js";
import { APP_MANIFESTS, BaseApp, StorageKeys, os } from "../framework.js";

const appNewsEntries = APP_MANIFESTS.filter((manifest) => manifest.news).map(
  (manifest) => manifest.news,
);

const EXISTING_NEWS_UPDATES = newsUpdates;

const NEWS_UPDATES = [...appNewsEntries, ...EXISTING_NEWS_UPDATES];

const NEWS_PAGE_SIZE = 6;
const NEWS_SCROLL_THRESHOLD = 240;

const hashStringDjb2 = (text) => {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 33) ^ text.charCodeAt(i);
  }
  return `djb2:${(hash >>> 0).toString(16)}`;
};

export const getNewsContentSignature = () => {
  const minimal = (Array.isArray(NEWS_UPDATES) ? NEWS_UPDATES : [])
    .filter((u) => u)
    .map((u) => ({
      date: u.date,
      sections: (u.sections || [])
        .filter((s) => s)
        .map((s) => ({
          icon: s.icon,
          title: s.title,
          items: (s.items || [])
            .filter((entry) => Array.isArray(entry))
            .map(([i, t, d]) => [i, t, d]),
        })),
    }));
  return hashStringDjb2(JSON.stringify(minimal));
};

export const getRecentNews = (count = 3) => NEWS_UPDATES.slice(0, count);

export const updateNewsBadge = () => {
  const currentSignature = getNewsContentSignature();
  const storedSignature = os.storage.get(StorageKeys.newsReadSignatureKey);
  const hasUnreadNews = currentSignature !== storedSignature;

  const badge = $(".news-badge");
  if (badge) {
    setStyle(badge, { display: hasUnreadNews ? "flex" : "none" });
  }
};

const renderSections = (sections) =>
  (Array.isArray(sections) ? sections : [])
    .filter((section) => section && Array.isArray(section.items))
    .map(
      (section) => `
        <div class="news-section">
          <h2 class="news-section-title">
            <i class="fas ${section.icon}"></i>
            <span>${section.title}</span>
          </h2>
          <div class="news-items">
            ${section.items
              .filter((item) => Array.isArray(item))
              .map(
                ([icon, title, desc]) => `
              <div class="news-item">
                <div class="news-item-icon" aria-hidden="true">
                  <i class="fas ${icon}"></i>
                </div>
                <div class="news-item-body">
                  <div class="news-item-title">${title}</div>
                  <div class="news-item-desc">${desc}</div>
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      `,
    )
    .join("");

const renderUpdate = (update) => `
      <div class="news-update">
        <div class="news-update-head">
          ${update.date ? `<div class="news-date">${update.date}</div>` : ""}
          <div class="news-label">${update.label || "YukiOS Update"}</div>
        </div>
        ${renderSections(update.sections)}
      </div>
    `;

const renderUpdates = (updates) =>
  (Array.isArray(updates) ? updates : []).map(renderUpdate).join("");

const getRenderableUpdates = () =>
  (Array.isArray(NEWS_UPDATES) ? NEWS_UPDATES : []).filter(
    (update) => update && (update.sections || update.label),
  );

export class NewsApp extends BaseApp {
  singletonWindowIds = ["news-yukios"];

  constructor(services) {
    super(services);
  }

  async open() {
    const updates = getRenderableUpdates();
    const latestDate = updates[0]?.date ?? "-";

    const content = `
      <div class="window-content" style="padding:0; height: calc(100% - 40px); overflow: hidden;">
        <div class="news-root">
          <div class="news-hero">
            <div class="news-hero-left">
              <div class="news-hero-icon" aria-hidden="true">
                <i class="fas fa-newspaper"></i>
              </div>
              <div class="news-hero-title">
                <h1>What's New</h1>
                <p>The latest updates and fixes for YukiOS</p>
              </div>
            </div>
            <div class="news-hero-meta">
              <div class="news-pill" title="Latest update shown first">
                <i class="fas fa-clock"></i>
                <span>Latest: ${latestDate}</span>
              </div>
            </div>
          </div>

          <div class="news-list"></div>
          <div class="news-list-status" role="status"></div>
        </div>
      </div>
    `;

    const win = os.window.create(
      "news-yukios",
      "What's New",
      "720px",
      "520px",
      {
        icon: "fa fa-newspaper",
        appId: "newsApp",
      },
    );
    win.innerHTML = content;
    this.setupLazyLoading(win, updates);
    this.initNews();
    return win;
  }

  setupLazyLoading(win, updates) {
    const scroller = $(".news-root", win);
    const list = $(".news-list", win);
    const status = $(".news-list-status", win);
    if (!scroller || !list) return;

    let loaded = 0;

    const hasMore = () => loaded < updates.length;

    const appendBatch = () => {
      if (!hasMore()) return false;
      const next = updates.slice(loaded, loaded + NEWS_PAGE_SIZE);
      loaded += next.length;
      list.insertAdjacentHTML("beforeend", renderUpdates(next));
      return true;
    };

    const isNearBottom = () =>
      scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <=
      NEWS_SCROLL_THRESHOLD;

    const renderStatus = () => {
      if (!status) return;
      if (hasMore()) {
        setText(status, "Scroll for more updates");
        addClass(status, "news-list-status-active");
      } else {
        setText(status, "You are all caught up");
        removeClass(status, "news-list-status-active");
      }
    };

    const loadMore = () => {
      if (!appendBatch()) return;
      renderStatus();
      if (isNearBottom() && hasMore()) loadMore();
    };

    renderStatus();
    loadMore();

    let framePending = false;
    const onScroll = () => {
      if (framePending) return;
      framePending = true;
      requestAnimationFrame(() => {
        framePending = false;
        if (isNearBottom() && hasMore()) loadMore();
      });
    };

    bindEvent(scroller, "scroll", onScroll, { passive: true });
    bindEvent(status, "click", () => {
      if (hasMore()) loadMore();
    });

    win.addEventListener("remove", () => {
      scroller.removeEventListener("scroll", onScroll);
    });
  }

  initNews() {
    os.storage.set(StorageKeys.newsReadSignatureKey, getNewsContentSignature());
    os.storage.set(StorageKeys.newsSeenKey, "true");
    updateNewsBadge();
  }
}
