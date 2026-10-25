import { BaseApp, os, StorageKeys } from "../framework.js";
import { parseBool } from "../utils/utils.js";

function setClippyEnabled(enabled) {
  os.storage.set(StorageKeys.clippy, String(enabled));
  window.dispatchEvent(
    new CustomEvent("yukios:clippy-toggle", { detail: { enabled } }),
  );
}

export class ClippyApp extends BaseApp {
  open() {
    const enabled = parseBool(os.storage.get(StorageKeys.clippy));
    setClippyEnabled(!enabled);
  }
}
