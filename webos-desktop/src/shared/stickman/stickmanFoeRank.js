const LEVEL_CAP = 12;
const BASE_HP = 5;
const HP_STEP = 2;
const HP_CAP = 26;

const GAP_MUL_STEP = 0.94;
const GAP_MUL_FLOOR = 0.62;
const DODGE_CHANCE_STEP = 0.035;
const DODGE_CHANCE_CAP = 0.92;
const DODGE_CD_STEP = 0.92;
const DODGE_CD_FLOOR = 0.55;
const AGGRESSION_STEP = 0.03;
const AGGRESSION_CAP = 0.42;

const POW = Math.pow;

export function foeLevelForKills(kills) {
  const n = Number.isFinite(kills) ? Math.floor(kills) : 0;
  return Math.max(1, Math.min(LEVEL_CAP, 1 + Math.max(0, n)));
}

export function foeHpForLevel(level) {
  const lv = Math.max(1, Math.min(LEVEL_CAP, Math.floor(level) || 1));
  return Math.min(HP_CAP, BASE_HP + (lv - 1) * HP_STEP);
}

export function foeProfileForLevel(level) {
  const lv = Math.max(1, Math.min(LEVEL_CAP, Math.floor(level) || 1));
  const tier = lv - 1;
  return {
    level: lv,
    atCap: lv >= LEVEL_CAP,
    hp: foeHpForLevel(lv),
    shootGapMul: Math.max(GAP_MUL_FLOOR, POW(GAP_MUL_STEP, tier)),
    dodgeChance: Math.min(DODGE_CHANCE_CAP, 0.55 + DODGE_CHANCE_STEP * tier),
    dodgeCdMul: Math.max(DODGE_CD_FLOOR, POW(DODGE_CD_STEP, tier)),
    aggression: Math.min(AGGRESSION_CAP, AGGRESSION_STEP * tier),
  };
}

export const FOE_LEVEL_CAP = LEVEL_CAP;

export function createFoeRank(store) {
  const read = () => {
    try {
      const get = store && typeof store.get === "function" ? store.get : null;
      if (!get) return 0;
      const raw = get();
      if (raw && typeof raw === "object") {
        const n = Math.floor(raw.kills);
        return Number.isFinite(n) && n > 0 ? n : 0;
      }
      const n = Math.floor(raw);
      return Number.isFinite(n) && n > 0 ? n : 0;
    } catch {
      return 0;
    }
  };

  const write = (kills) => {
    try {
      const set = store && typeof store.set === "function" ? store.set : null;
      if (set) set({ kills: kills });
    } catch {}
  };

  let kills = read();

  function sync() {
    const fresh = read();
    if (fresh !== kills) kills = fresh;
  }

  return {
    getKills: () => kills,
    getLevel: () => foeLevelForKills(kills),
    getProfile: () => foeProfileForLevel(foeLevelForKills(kills)),
    recordDefeat: () => {
      sync();
      kills += 1;
      write(kills);
      return this.getProfile();
    },
    refresh: sync,
  };
}
