import { os, BusEvents } from "../framework.js";
import { SystemSfx, playSfx } from "./systemSfx.js";

let initialized = false;

export function initSystemSfx() {
  if (initialized) return;
  initialized = true;

  os.events.on(BusEvents.SYSTEM_UNLOCKED, () => {
    playSfx(SystemSfx.STARTUP);
  });
}
