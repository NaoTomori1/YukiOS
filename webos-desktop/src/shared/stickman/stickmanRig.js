export const POSE_KEYS = [
  "lean",
  "tilt",
  "a1",
  "aK",
  "b1",
  "bK",
  "armA",
  "armAE",
  "armB",
  "armBE",
  "shout",
];

const POSE_DEFAULTS = {
  lean: 0.15,
  tilt: 0.1,
  a1: 0.15,
  aK: 0.1,
  b1: -0.15,
  bK: 0.1,
  armA: 0.5,
  armAE: 1.7,
  armB: 0.2,
  armBE: 1.8,
  shout: 0,
};

export function pose(o) {
  return Object.assign({}, POSE_DEFAULTS, o);
}
