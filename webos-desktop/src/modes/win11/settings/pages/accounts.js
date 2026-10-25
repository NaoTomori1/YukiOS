import { os, StorageKeys, BusEvents } from "../../../../framework.js";
import {
  action,
  custom,
  escapeHtml,
  note,
  subHeading,
  toggle,
} from "../win11Controls.js";
import { registerWin11Binding } from "../win11SettingsBindings.js";
import { win11Icon, win11Description } from "../win11SettingsIcons.js";
import {
  $,
  $$,
  bindEvent,
  createElement,
  setHTML,
  setText,
} from "../../../../shared/domUtils.js";
import { formatSize, timeAgo } from "../../../../utils/utils.js";
import {
  PREDEFINED_AVATARS,
  generateUUID,
} from "../../../../utils/avatarData.js";
import {
  buildAccountBlockHtml,
  bindAccountBlock,
} from "../../../../social/accountUI.js";
import { isSocialDisabled } from "../../../../social/socialSettings.js";
import {
  SYNC_COMPONENTS,
  isSyncEnabledPref,
  setSyncEnabledPref,
  getToggles,
  setToggle,
  buildBundle,
  syncPush,
  syncPull,
  getCloudSummary,
} from "../../../../account/syncEngine.js";
import { isLoggedIn } from "../../../../account/session.js";

const accountState = {
  selectedUserId: null,
};

function readUserHistory() {
  const history = os.storage.get(StorageKeys.userHistory);
  return Array.isArray(history) ? history : [];
}

function readCurrentUser() {
  const currentUserId = os.storage.get(StorageKeys.userId);
  const history = readUserHistory();
  const found = history.find((user) => user.userId === currentUserId);
  if (found) return found;
  return {
    userId: currentUserId || generateUUID(),
    name: os.storage.get(StorageKeys.username) || "Guest",
    avatar: os.storage.get(StorageKeys.profilePicture) || PREDEFINED_AVATARS[0],
  };
}

function readSelectedUser() {
  const history = readUserHistory();
  const selected = accountState.selectedUserId
    ? history.find((user) => user.userId === accountState.selectedUserId)
    : null;
  return selected || readCurrentUser();
}

function userMeta(user, isCurrent) {
  const kind = user.cloudAccountId ? "Cloud account" : "Local account";
  if (isCurrent) return `${kind} | Current user`;
  const lastLogin = user.lastLogin
    ? timeAgo(new Date(user.lastLogin))
    : "Never";
  return `${kind} | Last signed in ${lastLogin}`;
}

function renderUsersSection() {
  const history = readUserHistory();
  const currentUser = readCurrentUser();
  const rows = history
    .map((user) => {
      const isCurrent = user.userId === currentUser.userId;
      const buttons = `
          <button type="button" class="win11-action" data-account-edit="${escapeHtml(user.userId)}">Edit</button>
          ${
            isCurrent
              ? ""
              : `
          <button type="button" class="win11-action" data-account-switch="${escapeHtml(user.userId)}">Switch</button>
          <button type="button" class="win11-action danger" data-account-delete="${escapeHtml(user.userId)}">Delete</button>`
          }`;
      return `
        <div class="win11-control">
          <div class="win11-control__text">
            <p class="win11-control__title">${escapeHtml(user.name || "User")}</p>
            <p class="win11-control__desc">${escapeHtml(userMeta(user, isCurrent))}</p>
          </div>
          ${buttons}
        </div>`;
    })
    .join("");

  const list =
    rows ||
    `<div class="win11-empty">No users yet. Add one to get started.</div>`;

  return `
    ${subHeading("Users")}
    ${list}
    <div class="win11-control win11-control--action">
      <div class="win11-control__text">
        <p class="win11-control__title">Add user</p>
        <p class="win11-control__desc">Create another local profile on this device</p>
      </div>
      <button type="button" class="win11-action" data-account-create>Add user</button>
    </div>`;
}

function renderProfileSection() {
  const user = readSelectedUser();
  const currentUser = readCurrentUser();
  const isCurrent = user.userId === currentUser.userId;
  return `
    ${subHeading(isCurrent ? "Your info" : "Editing profile")}
    <div class="win11-control win11-control--text">
      <div class="win11-control__text">
        <p class="win11-control__title">Nickname</p>
        <p class="win11-control__desc">Name shown on the lock screen and in the taskbar</p>
      </div>
      <input type="text" class="win11-input" data-account-name value="${escapeHtml(user.name || "")}" placeholder="Enter nickname" spellcheck="false" aria-label="Nickname" />
    </div>
    <div class="win11-control win11-control--text">
      <div class="win11-control__text">
        <p class="win11-control__title">Avatar</p>
        <p class="win11-control__desc">Image address used for this profile</p>
      </div>
      <input type="text" class="win11-input" data-account-avatar value="${escapeHtml(user.avatar || "")}" placeholder="Image address" spellcheck="false" aria-label="Avatar" />
    </div>
    <div class="win11-control win11-control--action">
      <div class="win11-control__text">
        <p class="win11-control__title">Save profile</p>
        <p class="win11-control__desc">Apply the nickname and avatar for this user</p>
      </div>
      <button type="button" class="win11-action primary" data-account-apply>Apply</button>
    </div>`;
}

function renderSyncSection() {
  if (!isLoggedIn()) {
    return `
      ${subHeading("Cloud sync")}
      <div class="win11-empty">Sign in with a YukiOS Account to sync settings across devices.</div>`;
  }

  const enabled = isSyncEnabledPref();
  const toggles = getToggles();
  const bundle = buildBundle();
  const sizes = {};
  if (bundle && bundle.components) {
    Object.keys(bundle.components).forEach((id) => {
      sizes[id] = bundle.components[id].bytes || 0;
    });
  }
  const total = (bundle && bundle.totalBytes) || 0;

  const componentRows = SYNC_COMPONENTS.map((component) => {
    const checked = !!(enabled && toggles[component.id]);
    return `
      <div class="win11-control win11-control--toggle">
        <div class="win11-control__text">
          <p class="win11-control__title">${escapeHtml(component.label)}</p>
          <p class="win11-control__desc">${escapeHtml(component.description)} | ${escapeHtml(formatSize(sizes[component.id] || 0))}</p>
        </div>
        <button type="button" class="win11-switch${checked ? " is-on" : ""}" role="switch" aria-checked="${checked ? "true" : "false"}" aria-label="${escapeHtml(component.label)}" data-sync-component="${escapeHtml(component.id)}">
          <span class="win11-switch__thumb"></span>
        </button>
      </div>`;
  }).join("");

  return `
    ${subHeading("Cloud sync")}
    <div class="win11-control win11-control--toggle">
      <div class="win11-control__text">
        <p class="win11-control__title">Enable cloud sync</p>
        <p class="win11-control__desc">Upload the selected components to your account</p>
      </div>
      <button type="button" class="win11-switch${enabled ? " is-on" : ""}" role="switch" aria-checked="${enabled ? "true" : "false"}" aria-label="Enable cloud sync" data-sync-master>
        <span class="win11-switch__thumb"></span>
      </button>
    </div>
    <div class="win11-note">${escapeHtml(formatSize(total))} selected for upload</div>
    ${componentRows}
    <div class="win11-control win11-control--action">
      <div class="win11-control__text">
        <p class="win11-control__title">Sync now</p>
        <p class="win11-control__desc">Upload your selected data to the cloud</p>
      </div>
      <button type="button" class="win11-action primary" data-sync-push${enabled ? "" : " disabled"}>Sync now</button>
    </div>
    <div class="win11-control win11-control--action">
      <div class="win11-control__text">
        <p class="win11-control__title">Pull from cloud</p>
        <p class="win11-control__desc">Restore your data from the cloud</p>
      </div>
      <button type="button" class="win11-action" data-sync-pull${enabled ? "" : " disabled"}>Pull</button>
    </div>
    <div class="win11-control">
      <div class="win11-control__text">
        <p class="win11-control__title">Cloud storage</p>
        <p class="win11-control__desc" data-cloud-status>Checking the cloud...</p>
      </div>
    </div>
    <div class="win11-note" data-sync-status></div>`;
}

function renderAccountBlock() {
  const localName = String(os.storage.get(StorageKeys.username) || "").slice(
    0,
    32,
  );
  return `
    ${subHeading("YukiOS Account")}
    ${buildAccountBlockHtml(undefined, {
      socialDisabled: isSocialDisabled(),
      prefillNickname: localName,
    })}`;
}

registerWin11Binding("accountsPanel", {
  type: "custom",
  render: () => `<div class="win11-empty">Loading account information...</div>`,
  bind: (host) => {
    const renderUsers = () => {
      setHTML($("[data-accounts-users]", host), renderUsersSection());
      bindUserEvents();
    };

    const renderProfile = () => {
      setHTML($("[data-accounts-profile]", host), renderProfileSection());
      bindProfileEvents();
    };

    const renderAccount = () => {
      const container = $("[data-accounts-account]", host);
      if (!container) return;
      const accountHost = createElement("div");
      setHTML(accountHost, renderAccountBlock());
      setHTML(container, "");
      container.appendChild(accountHost);
      bindAccountBlock(accountHost, {
        onChange: () => {
          renderUsers();
          renderSync();
        },
        onEnableSocial: () =>
          os.app.launch("steamApp", { steamPage: "settings" }),
      });
    };

    const renderSync = () => {
      setHTML($("[data-accounts-sync]", host), renderSyncSection());
      bindSyncEvents();
      loadCloudStatus();
    };

    const renderAll = () => {
      renderUsers();
      renderProfile();
      renderAccount();
      renderSync();
    };

    const applyProfile = () => {
      const nameInput = $("[data-account-name]", host);
      const avatarInput = $("[data-account-avatar]", host);
      const user = readSelectedUser();
      const history = readUserHistory();
      const index = history.findIndex((entry) => entry.userId === user.userId);
      if (index < 0) return;
      const name =
        nameInput && nameInput.value.trim() ? nameInput.value.trim() : "User";
      const avatar = avatarInput ? avatarInput.value.trim() : "";
      history[index].name = name;
      if (avatar) history[index].avatar = avatar;
      os.storage.set(StorageKeys.userHistory, history);
      const currentUserId = os.storage.get(StorageKeys.userId);
      if (user.userId === currentUserId) {
        os.storage.set(StorageKeys.username, name);
        if (avatar) os.storage.set(StorageKeys.profilePicture, avatar);
        os.events.emit(BusEvents.PROFILE_UPDATED, {
          userId: currentUserId,
          name,
          avatar,
        });
      }
      renderAll();
    };

    const createUser = () => {
      const name = "New User";
      const avatar =
        os.storage.get(StorageKeys.profilePicture) || PREDEFINED_AVATARS[0];
      const userId = generateUUID();
      const history = readUserHistory();
      history.unshift({
        userId,
        key: userId,
        name,
        avatar,
        lastLogin: Date.now(),
      });
      os.storage.set(StorageKeys.userHistory, history);
      os.storage.set(StorageKeys.userId, userId);
      os.storage.set(StorageKeys.username, name);
      os.storage.set(StorageKeys.profilePicture, avatar);
      os.events.emit(BusEvents.SESSION_INITIALIZED, {
        userId,
        name,
        avatar,
      });
      accountState.selectedUserId = userId;
      renderAll();
    };

    const switchUser = async (userId) => {
      const history = readUserHistory();
      const user = history.find((entry) => entry.userId === userId);
      if (!user) return;
      const confirmed = await os.dialog.confirm(
        "Switch User",
        `Switch to ${user.name}?`,
      );
      if (!confirmed) return;
      user.lastLogin = Date.now();
      os.storage.set(StorageKeys.userHistory, history);
      os.storage.set(StorageKeys.userId, userId);
      os.storage.set(StorageKeys.username, user.name);
      os.storage.set(StorageKeys.profilePicture, user.avatar);
      os.events.emit(BusEvents.SESSION_INITIALIZED, user);
      accountState.selectedUserId = userId;
      renderAll();
    };

    const deleteUser = async (userId) => {
      const currentUser = readCurrentUser();
      if (userId === currentUser.userId) {
        os.dialog.alert(
          "Cannot Delete",
          "You cannot delete the active user. Switch to another user first.",
        );
        return;
      }
      const history = readUserHistory();
      const user = history.find((entry) => entry.userId === userId);
      if (!user) return;
      const confirmed = await os.dialog.confirm(
        "Delete User",
        `Delete ${user.name}? This cannot be undone.`,
      );
      if (!confirmed) return;
      os.storage.set(
        StorageKeys.userHistory,
        history.filter((entry) => entry.userId !== userId),
      );
      accountState.selectedUserId = currentUser.userId;
      renderAll();
    };

    function bindUserEvents() {
      $$("[data-account-edit]", host).forEach((button) => {
        bindEvent(button, "click", () => {
          accountState.selectedUserId = button.dataset.accountEdit;
          renderProfile();
        });
      });

      $$("[data-account-switch]", host).forEach((button) => {
        bindEvent(button, "click", () => {
          switchUser(button.dataset.accountSwitch);
        });
      });

      $$("[data-account-delete]", host).forEach((button) => {
        bindEvent(button, "click", () => {
          deleteUser(button.dataset.accountDelete);
        });
      });

      bindEvent($("[data-account-create]", host), "click", createUser);
    }

    function bindProfileEvents() {
      bindEvent($("[data-account-apply]", host), "click", applyProfile);
    }

    function bindSyncEvents() {
      bindEvent($("[data-sync-master]", host), "click", (event) => {
        const button = event.currentTarget;
        setSyncEnabledPref(!button.classList.contains("is-on"));
        renderSync();
      });

      $$("[data-sync-component]", host).forEach((button) => {
        bindEvent(button, "click", () => {
          setToggle(
            button.dataset.syncComponent,
            !button.classList.contains("is-on"),
          );
          renderSync();
        });
      });

      bindEvent($("[data-sync-push]", host), "click", async () => {
        const status = $("[data-sync-status]", host);
        setText(status, "Syncing...");
        const result = await syncPush();
        setText(
          status,
          result && result.ok
            ? "Synced."
            : (result && result.error) || "The sync could not finish.",
        );
        if (result && result.ok && result.quota) {
          os.storage.set(StorageKeys.accountQuota, result.quota);
        }
        loadCloudStatus();
      });

      bindEvent($("[data-sync-pull]", host), "click", async () => {
        const status = $("[data-sync-status]", host);
        setText(status, "Pulling from the cloud...");
        const result = await syncPull();
        setText(
          status,
          result && result.ok
            ? "Restored from the cloud."
            : (result && result.error) || "The pull could not finish.",
        );
        loadCloudStatus();
      });
    }

    async function loadCloudStatus() {
      const target = $("[data-cloud-status]", host);
      if (!target) return;
      try {
        const summary = await getCloudSummary();
        if (!summary) {
          setText(target, "No cloud data yet.");
          return;
        }
        if (summary.needsReauth) {
          setText(target, "Your session expired. Sign in again to continue.");
          return;
        }
        if (summary.error) {
          setText(target, String(summary.error));
          return;
        }
        const lastSynced = summary.updatedAt
          ? new Date(summary.updatedAt).toLocaleString()
          : "Never";
        const used = (summary.quota && summary.quota.used) || 0;
        const limit = (summary.quota && summary.quota.limit) || 0;
        const quotaText =
          limit > 0
            ? ` | ${formatSize(used)} of ${formatSize(limit)} used`
            : "";
        setText(target, `Last synced ${lastSynced}${quotaText}`);
      } catch {
        setText(target, "The cloud status is not available right now.");
      }
    }

    setHTML(
      host,
      `
      <div data-accounts-users></div>
      <div data-accounts-profile></div>
      <div data-accounts-account></div>
      <div data-accounts-sync></div>`,
    );

    renderAll();
  },
});

function renderAccountsHero() {
  const userName = os.storage.get(StorageKeys.username) || "Guest";
  return `
    <div class="accountsTop">
      <img src="/img/settings/defAccount.webp" alt="" width="90" />
      <div>
        <p>${escapeHtml(userName)}</p>
        <p>Local Account</p>
        <p>Administrator</p>
      </div>
    </div>`;
}

export const accountsPage = {
  id: "Accounts",
  label: "Accounts",
  hero: renderAccountsHero,
  tiles: () => [
    {
      name: "Your info",
      desc: win11Description("Accounts", "Your info"),
      icon: win11Icon("Accounts", "Your info"),
      subPage: "accounts-users",
    },
    {
      name: "Other users",
      desc: win11Description("Accounts", "Other users"),
      icon: win11Icon("Accounts", "Other users"),
      subPage: "accounts-other",
    },
    {
      name: "Sign-in options",
      desc: win11Description("Accounts", "Sign-in options"),
      icon: win11Icon("Accounts", "Sign-in options"),
      subPage: "accounts-signin",
    },
    {
      name: "Windows backup",
      desc: win11Description("Accounts", "Windows backup"),
      icon: win11Icon("Accounts", "Windows backup"),
      subPage: "accounts-backup",
    },
  ],
  subPages: {
    "accounts-users": {
      title: "Your info",
      body: () =>
        [
          custom(
            "accountsPanel",
            "Your info",
            "Profile, local users and cloud sync for this device",
          ),
        ].join(""),
    },
    "accounts-other": {
      title: "Other users",
      body: () =>
        [
          custom(
            "accountsPanel",
            "Other users",
            "Additional local profiles stored on this device",
          ),
          note(
            "Switching a user changes the active profile for the whole system.",
          ),
        ].join(""),
    },
    "accounts-signin": {
      title: "Sign-in options",
      body: () =>
        [
          toggle(
            "windowSessionPersistence",
            "Remember Open Windows",
            "Restore the previous window layout after a restart",
          ),
          toggle(
            "disableBootScreen",
            "Skip Boot Screen",
            "Skip the boot animation on startup",
          ),
          note(
            "Lock the session from the lock screen button in the taskbar quick settings.",
          ),
        ].join(""),
    },
    "accounts-backup": {
      title: "Windows backup",
      body: () =>
        [
          subHeading("Import / Export"),
          action(
            "exportData",
            "Export Data",
            "Backup your system settings, files and configuration",
            "Export",
          ),
          action(
            "importData",
            "Import Data",
            "Restore a previously saved system backup",
            "Import",
          ),
          subHeading("Save YukiOS"),
          action(
            "downloadPage",
            "Download Page",
            "Save a local copy of YukiOS",
            "Download",
          ),
          subHeading("Danger Zone"),
          action(
            "deleteAllData",
            "Delete All Data",
            "Permanently wipe all games, files and OS settings",
            "Wipe",
            "danger",
          ),
        ].join(""),
    },
  },
};
