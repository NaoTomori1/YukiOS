import { pose } from "./stickmanRig.js";

export function moonwalkPose(p, now) {
  const slide = Math.sin(p * 1.6);
  const step = Math.cos(p * 1.6);
  const rock = Math.sin(now * 0.003);
  return pose({
    lean: 0.05,
    tilt: 0.06 * rock,
    a1: 0.15 + 0.1 * slide,
    aK: 0.5 + 0.18 * step,
    b1: 0.15 - 0.1 * slide,
    bK: 0.5 - 0.18 * step,
    armA: 1.45 + 0.08 * rock,
    armAE: 0.9,
    armB: -1.35 - 0.08 * rock,
    armBE: 1.0,
    shout: 0.15,
  });
}

export function dodgePose(p, now) {
  const flinch = Math.sin(p * 7) * 0.06 + Math.sin(now * 0.02) * 0.03;
  return pose({
    lean: 0.25 + flinch,
    tilt: 0.2,
    a1: 1.15,
    aK: 1.9,
    b1: 0.95,
    bK: 1.8,
    armA: 2.35 + flinch,
    armAE: 0.35,
    armB: 2.15 + flinch,
    armBE: 0.45,
    shout: 0.8,
  });
}
