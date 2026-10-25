import { CYCLE_ORDER, getWeaponSpec } from "./stickmanWeapons.js";

const PLAYER_TUNE = {
  boxW: 28,
  boxH: 64,
  halfW: 14,
  gravity: 0.6,
  cageFloorPad: 4,
  groundAccel: 0.34,
  groundDecel: 0.42,
  airAccel: 0.17,
  airDecel: 0.07,
  maxSpeed: 3.1,
  sprintMul: 1.62,
  creepMul: 0.42,
  jumpVel: 12.6,
  jumpCutMul: 0.42,
  fastFallMul: 1.55,
  fastFallFloor: 1.4,
  coyoteMs: 110,
  jumpBufferMs: 140,
  dodgeSpeed: 9.2,
  dodgeHop: 8.4,
  dodgeMs: 340,
  dodgeCooldownMs: 1400,
  slamWindupMs: 260,
  slamLaunch: 15.5,
  slamDiveSpeed: 17,
  slamSteerPull: 0.1,
  slamSteerLimit: 11,
  slamSteerPullWindup: 0.06,
  slamSteerLimitWindup: 8,
  slamStompRadius: 74,
  jetGroundLaunch: 12.4,
  landImpactThreshold: 3.2,
  dustStepIntervalMs: 150,
  sprintPhaseRate: 0.085,
  walkPhaseRate: 0.1,
  airPhaseRate: 0.12,
};

const TUNE = PLAYER_TUNE;

const DRY_FIRE_GAP_MS = 240;
const DENY_FEEDBACK_MS = 420;

function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function approach(current, target, rate) {
  return current + (target - current) * rate;
}

function easeFactor(rate, dt) {
  return 1 - Math.pow(1 - rate, dt);
}

function createMoveMemory() {
  return {
    groundedAt: 0,
    jumpPressedAt: -1e9,
    lastGrounded: true,
  };
}

function canCoyoteJump(memory, now) {
  return memory.lastGrounded && now - memory.groundedAt <= PLAYER_TUNE.coyoteMs;
}

function bufferJump(memory, now) {
  memory.jumpPressedAt = now;
}

function takeBufferedJump(memory, now) {
  if (now - memory.jumpPressedAt <= PLAYER_TUNE.jumpBufferMs) {
    memory.jumpPressedAt = -1e9;
    return true;
  }
  return false;
}

export function createPlayerController(host) {
  const val = (name) => (host && host[name] ? host[name] : null);
  const fn = (name) =>
    host && typeof host[name] === "function" ? host[name] : null;

  const input = val("input");
  const rack = val("rack");
  const guide = val("guide");
  const hud = val("hud");

  const memory = createMoveMemory();
  let active = false;
  let jetLatch = false;
  let jumpCut = false;
  let slamArmed = false;
  let slamAir = false;
  let slamDived = false;
  let slamVX = 0;
  let slamWindupUntil = 0;
  let slamLandUntil = 0;
  let dodgeUntil = 0;
  let dodgeCooldownAt = 0;
  let dryFireAt = 0;
  let feedbackAt = 0;
  let deniedBinding = "";
  let stepDustAt = 0;

  const state = () => fn("getState")();

  function commit(patch) {
    const setter = fn("setState");
    if (setter) setter(patch);
  }

  function pulse(bindingId) {
    if (!guide) return;
    try {
      guide.pulse(bindingId);
    } catch {}
  }

  function deny(bindingId) {
    deniedBinding = bindingId || "";
    feedbackAt = performance.now();
    pulse(bindingId);
  }

  function equip(id) {
    const next = fn("equipWeapon")(id);
    if (!next) return false;
    try {
      rack.setWeapon(next);
    } catch {}
    pulse(next === "laser" ? "attack" : "weapons");
    return true;
  }

  function cycle() {
    const index = CYCLE_ORDER.indexOf(rack.getWeapon());
    const next =
      CYCLE_ORDER[(index + 1 + CYCLE_ORDER.length) % CYCLE_ORDER.length];
    return equip(next);
  }

  function handleWeaponInput(now) {
    const slot = input.consumeSlot();
    if (slot !== null) {
      if (slot === -1) cycle();
      else if (CYCLE_ORDER[slot]) equip(CYCLE_ORDER[slot]);
    } else if (input.consume("cycle")) {
      cycle();
    }
    if (input.consume("reload")) {
      if (!rack.startReload(now)) deny("reload");
      else pulse("reload");
    }
  }

  function doDodge(now, grounded) {
    if (now < dodgeCooldownAt || !grounded) {
      deny("dodge");
      return false;
    }
    fn("cancelLaser")();
    const s = state();
    const aim = input.getAim();
    let away;
    if (aim.seen) away = s.posX + TUNE.halfW < aim.x ? -1 : 1;
    else if (Math.abs(s.speed) > 0.4) away = s.speed > 0 ? 1 : -1;
    else away = -s.dir;

    dodgeCooldownAt = now + TUNE.dodgeCooldownMs;
    dodgeUntil = now + TUNE.dodgeMs;
    commit({
      dir: away,
      velX: away * TUNE.dodgeSpeed,
      velY: -TUNE.dodgeHop,
      flying: true,
      wasAir: true,
      flipping: true,
      spin: 0,
      spinRate: (away * Math.PI * 2) / ((2 * TUNE.dodgeHop) / TUNE.gravity),
      sqV: 0.12,
    });
    fn("dust")(s.posX + TUNE.halfW + away * 8, s.posY + TUNE.boxH, 0.45);
    fn("smoke")(s.posX + TUNE.halfW, s.posY + TUNE.boxH * 0.5);
    fn("shake")(0.2);
    fn("sound")("grab");
    pulse("dodge");
    return true;
  }

  function startSlam(now, grounded) {
    const s = state();
    if (!grounded || slamWindupUntil > now) {
      deny("slam");
      return false;
    }
    if (
      !fn("rageTrySlam")(now, s.posX + TUNE.halfW, s.posY + TUNE.boxH * 0.5)
    ) {
      deny("slam");
      return false;
    }
    slamArmed = true;
    slamWindupUntil = now + TUNE.slamWindupMs;
    fn("shake")(0.15);
    pulse("slam");
    return true;
  }

  function launchJet(now, grounded) {
    if (grounded) {
      commit({ velY: -TUNE.jetGroundLaunch, sqV: 0.1 });
    }
    if (!fn("jetLaunch")(now)) return false;
    jetLatch = true;
    fn("shake")(0.25);
    fn("sound")("grab");
    pulse("jet");
    return true;
  }

  function launchCombo(now) {
    if (fn("comboLaunch")(now)) {
      fn("shake")(0.18);
      pulse("combo");
      return true;
    }
    deny("combo");
    return false;
  }

  function launchTussle(now) {
    if (fn("tussleRequest")(now)) {
      pulse("tussle");
      return true;
    }
    deny("tussle");
    return false;
  }

  function handleAbilities(now, grounded, dodgePressed) {
    if (input.consume("combo")) launchCombo(now);
    if (dodgePressed) doDodge(now, grounded);
    if (input.consume("slam")) startSlam(now, grounded);
    if (input.consume("tussle")) launchTussle(now);
    if (input.consume("foe")) {
      const spawnFoe = fn("spawnFoe");
      if (spawnFoe) {
        spawnFoe(now);
        pulse("foe");
      }
    }
  }

  function tickLaser(now, dt, aim) {
    if (!fn("tickLaserManual")) return;
    fn("tickLaserManual")(now, dt, { x: aim.x, y: aim.y, seen: aim.seen });
  }

  function handleAttack(
    now,
    dt,
    laserBusy,
    tussling,
    reloading,
    aim,
    grounded,
    dodgePressed,
  ) {
    const weaponId = rack.getWeapon();
    const spec = getWeaponSpec(weaponId);
    const attackPressed = input.consume("attack");
    const attackHeld = input.isAttackDown();
    const wants = spec.auto ? attackHeld : attackPressed;

    if (fn("getState")().aiming) {
      fn("tickAim")(now);
      return;
    }

    if (laserBusy) {
      if (dodgePressed) {
        fn("cancelLaser")();
        doDodge(now, grounded);
        return;
      }
      tickLaser(now, dt, aim);
      return;
    }

    if (weaponId === "laser") {
      if (tussling) return;
      if (!attackPressed) return;
      if (!rack.canFire("laser", now)) {
        deny("attack");
        return;
      }
      if (fn("tryLaser")(now)) {
        rack.onFired("laser", now);
        tickLaser(now, dt, aim);
      } else {
        deny("attack");
      }
      return;
    }
    if (tussling) return;
    if (!wants) return;

    if (reloading) return;

    if (!rack.canFire(weaponId, now)) {
      rack.startReload(now);
      if (now - dryFireAt > DRY_FIRE_GAP_MS) {
        dryFireAt = now;
        fn("dryFire")();
      }
      return;
    }

    fn("startAim")(now, weaponId, 1);
  }

  function buildHudModel(now, grounded) {
    const hpState = fn("hpState")();
    const rageState = fn("rageState")();
    const jetState = fn("jetHudState")(now);
    return {
      now,
      hp: hpState.hp,
      hpRatio: clamp(hpState.hp / Math.max(1, hpState.max), 0, 1),
      ammo: rack.snapshot(rack.getWeapon(), now),
      jet: jetState,
      rageRatio: clamp(rageState.intensity, 0, 1),
      paused: input.isPaused(),
      abilities: {
        jet: jetState.ability,
        slam: {
          ready: grounded && slamWindupUntil <= now && rageState.canSlam,
          ratio: rageState.slamReady,
        },
        dodge: {
          ready: now >= dodgeCooldownAt && grounded,
          ratio:
            1 - clamp((dodgeCooldownAt - now) / TUNE.dodgeCooldownMs, 0, 1),
        },
        combo: fn("comboHudState")(now),
        tussle: fn("tussleHudState")(now),
      },
    };
  }

  function pushHud(model) {
    if (!hud) return;
    try {
      hud.update(model);
    } catch {}
  }

  function frame(now, dt) {
    if (!input || !active) return false;
    if (input.consume("pause")) input.setPaused(!input.isPaused());
    try {
      rack.update(now);
    } catch {}

    const aim = input.getAim();
    if (aim.seen) fn("aimAt")(aim.x, aim.y);

    const laserBusyEarly = fn("laserBusy")();
    const dodgePressed = input.consume("dodge");

    if (fn("comboActive")(now) && fn("applyComboFrame")(now, dt)) {
      pushHud(buildHudModel(now, false));
      return true;
    }
    if (fn("jetActive")(now)) {
      if (input.consume("jet")) {
        const stopJet = fn("jetStop");
        if (stopJet) {
          stopJet(now);
          jetLatch = true;
          pulse("jet");
        }
      }
      if (fn("jetActive")(now)) {
        handleAttack(
          now,
          dt,
          laserBusyEarly,
          fn("tussleActive")(),
          rack.isReloading(),
          aim,
          memory.lastGrounded && !state().flying,
          dodgePressed,
        );
        if (fn("applyJetFrame")(now, dt)) {
          pushHud(buildHudModel(now, false));
          return true;
        }
      }
    }

    if (input.isPaused()) {
      fn("renderPaused")(now, dt);
      pushHud(buildHudModel(now, memory.lastGrounded));
      return true;
    }

    let grounded = memory.lastGrounded && !state().flying;
    handleAbilities(now, grounded, dodgePressed);
    handleWeaponInput(now);

    const s = state();
    grounded = memory.lastGrounded && !s.flying;
    const floorTop = fn("resolveFloor")();
    const groundY = Math.max(0, floorTop - TUNE.boxH);
    const maxX = Math.max(0, window.innerWidth - TUNE.boxW);
    const cx = s.posX + TUNE.boxW / 2;
    const feetPrev = s.posY + TUNE.boxH;

    const tussling = fn("tussleActive")();
    const laserBusy = laserBusyEarly;
    const reloading = rack.isReloading();
    const dodgeActive = now < dodgeUntil;
    const slamming = slamWindupUntil > now;

    const left = input.isDown("left");
    const right = input.isDown("right");
    const moveX = (right ? 1 : 0) - (left ? 1 : 0);
    const crouching = input.isDown("down");
    const sprinting = input.isDown("sprint");

    let velX = s.velX;
    let velY = s.velY;
    let posX = s.posX;
    let posY = s.posY;
    let speed = s.speed;
    let dir = s.dir;
    let flipping = s.flipping;
    let spin = s.spin;

    const busy = tussling || slamming || now < s.landUntil || now < s.koUntil;

    let targetSpeed = 0;
    if (!busy && moveX !== 0) {
      const mul = crouching ? TUNE.creepMul : sprinting ? TUNE.sprintMul : 1;
      targetSpeed = moveX * TUNE.maxSpeed * mul;
    }
    const moving = targetSpeed !== 0;
    const accel = grounded
      ? moving
        ? TUNE.groundAccel
        : TUNE.groundDecel
      : moving
        ? TUNE.airAccel
        : TUNE.airDecel;
    speed = approach(speed, targetSpeed, easeFactor(accel, dt));
    if (Math.abs(speed) < 0.02) speed = 0;

    if (aim.seen) {
      const aimDx = aim.x - cx;
      if (Math.abs(aimDx) > 12) dir = aimDx > 0 ? 1 : -1;
    } else if (moveX !== 0) {
      dir = moveX;
    }

    if (grounded) jetLatch = false;
    if (input.consume("jet") && !jetLatch) {
      launchJet(now, grounded);
    } else if (!grounded && !jetLatch && input.isDown("thrust")) {
      launchJet(now, false);
    }

    if (input.consume("jump")) bufferJump(memory, now);
    if (
      takeBufferedJump(memory, now) &&
      (grounded || canCoyoteJump(memory, now)) &&
      !busy
    ) {
      velY = -TUNE.jumpVel;
      grounded = false;
      jumpCut = false;
      flipping = false;
      spin = 0;
      memory.groundedAt = now;
      commit({ sqV: 0.1 });
      fn("dust")(cx, posY + TUNE.boxH, 0.45);
      fn("sound")("grab");
    }

    if (!grounded && velY < 0) {
      if (!jumpCut && !input.isDown("jump")) {
        velY *= TUNE.jumpCutMul;
        jumpCut = true;
      }
    }

    if (slamArmed && now >= slamWindupUntil) {
      slamArmed = false;
      slamWindupUntil = 0;
      slamAir = true;
      slamDived = false;
      slamVX = 0;
      velY = -TUNE.slamLaunch;
      grounded = false;
      jumpCut = false;
      flipping = false;
      spin = 0;
      commit({ sqV: 0.12 });
      fn("dust")(cx, posY + TUNE.boxH, 0.8);
      fn("shake")(0.15);
      fn("sound")("grab");
    }

    velY += TUNE.gravity * dt * (crouching && !grounded ? TUNE.fastFallMul : 1);
    if (crouching && !grounded) velY = Math.max(velY, TUNE.fastFallFloor);

    if (slamAir) velX = slamVX;
    else if (now < dodgeUntil) {
      const steer = moveX !== 0 ? moveX * TUNE.maxSpeed * 1.5 : 0;
      velX = approach(velX, steer, easeFactor(0.06, dt));
    } else if (busy || slamming)
      velX = approach(velX, 0, easeFactor(TUNE.groundDecel, dt));
    else velX = speed;

    posX += velX * dt;
    posY += velY * dt;

    if (posX <= 0) {
      posX = 0;
      if (velX < 0) velX = 0;
      if (speed < 0) speed = 0;
      dir = 1;
    } else if (posX >= maxX) {
      posX = maxX;
      if (velX > 0) velX = 0;
      if (speed > 0) speed = 0;
      dir = -1;
    }
    if (posY < 0) {
      posY = 0;
      if (velY < 0) velY = 0;
    }

    let surface = null;
    if (velY >= 0)
      surface = fn("crossSurface")(cx, feetPrev, posY + TUNE.boxH, floorTop);

    const wasGrounded = grounded;
    let landingImpact = 0;
    if (surface || posY >= groundY) {
      posY = surface ? surface.top - TUNE.boxH : groundY;
      landingImpact = velY;
      velY = 0;
      grounded = true;
    } else {
      grounded = false;
    }

    if (!wasGrounded && grounded) {
      memory.groundedAt = now;
      jetLatch = false;
      jumpCut = false;
      handleLanding(now, landingImpact, cx, posY + TUNE.boxH);
    } else if (grounded) {
      memory.groundedAt = now;
    }

    if (slamAir) {
      if (grounded) {
        slamAir = false;
        slamDived = false;
        slamArmed = false;
        if (now > slamLandUntil) {
          slamLandUntil = now + fn("slamLandMs")();
          fn("stomp")(cx, posY + TUNE.boxH, TUNE.slamStompRadius);
          fn("shake")(0.45);
        }
      } else {
        if (!slamDived && velY > -1) {
          slamDived = true;
          velY = TUNE.slamDiveSpeed;
          fn("shake")(0.18);
        }
        const pull = slamDived ? TUNE.slamSteerPull : TUNE.slamSteerPullWindup;
        const lim = slamDived ? TUNE.slamSteerLimit : TUNE.slamSteerLimitWindup;
        slamVX = aim.seen ? clamp((aim.x - cx) * pull, -lim, lim) : 0;
        if (Math.abs(slamVX) > 0.5) dir = slamVX > 0 ? 1 : -1;
      }
    }

    handleAttack(
      now,
      dt,
      laserBusy,
      tussling,
      reloading,
      aim,
      grounded,
      dodgePressed,
    );

    if (grounded) velX = 0;
    if (grounded) {
      flipping = false;
      spin = 0;
    }

    memory.lastGrounded = grounded;
    commit({
      posX,
      posY,
      velX,
      velY,
      speed,
      dir,
      flipping,
      spin,
      grounded,
      flying: !grounded,
      wasAir: !grounded,
      slamArmed,
      slamAir,
      slamDived,
      slamVX,
    });

    renderFrame(now, dt, {
      grounded,
      velY,
      flipping,
      speed,
      dir,
      crouching,
      sprinting,
      dodgeActive: now < dodgeUntil,
      slamming,
      slamDived,
      slamAir,
      posX,
      posY,
      cx,
    });

    if (grounded && speed > 1.4 && now >= stepDustAt) {
      stepDustAt = now + TUNE.dustStepIntervalMs;
      fn("dust")(cx - dir * 7, posY + TUNE.boxH, 0.3);
    }

    pushHud(buildHudModel(now, grounded));
    return true;
  }

  function handleLanding(now, impact, footX, footY) {
    const heavy = impact >= TUNE.landImpactThreshold;
    if (!heavy && slamLandUntil > now) return;
    commit({ sq: -clamp(impact * 0.03, 0.06, 0.32), sqV: 0 });
    fn("dust")(footX, footY, clamp(impact / 9, 0.35, 1.4));
    if (impact > 11) fn("shake")(clamp(impact / 28, 0.2, 0.6));
    fn("sound")("land");
    if (slamAir) {
      slamAir = false;
      slamDived = false;
      slamArmed = false;
      slamLandUntil = now + fn("slamLandMs")();
      fn("stomp")(footX, footY, TUNE.slamStompRadius);
      fn("shake")(0.45);
    } else if (impact > 7) {
      fn("rageLanding")(now, footX, footY, impact, false);
    }
    fn("landFx")();
  }

  function renderFrame(now, dt, ctx) {
    const s = state();
    let effective = "idle";
    if (Math.abs(ctx.speed) > 0.25) {
      const fast = Math.abs(ctx.speed) > TUNE.maxSpeed * 0.78;
      effective = ctx.sprinting && ctx.grounded ? "run" : fast ? "run" : "walk";
    }

    let rate;
    if (!ctx.grounded) rate = TUNE.airPhaseRate;
    else if (effective === "run")
      rate = Math.abs(ctx.speed) * TUNE.sprintPhaseRate;
    else if (effective === "walk")
      rate = Math.abs(ctx.speed) * TUNE.walkPhaseRate;
    else rate = 0.05;

    let t;
    if (!ctx.grounded) {
      if (ctx.slamAir) t = fn("slamDivePose")(ctx.slamDived, now);
      else if (ctx.dodgeActive) t = fn("dodgePose")(s.phase, now);
      else t = fn("airPose")(ctx.velY, ctx.flipping);
    } else if (ctx.slamming) {
      t = fn("crouchPose")(true);
    } else if (now < slamLandUntil) {
      t = fn("slamLandPose")(
        1 - (slamLandUntil - now) / Math.max(1, fn("slamLandMs")()),
      );
    } else if (now < s.landUntil || ctx.crouching) {
      t = fn("crouchPose")(false);
    } else if (ctx.dodgeActive) {
      t = fn("dodgePose")(s.phase, now);
    } else {
      t = fn("modePose")(effective, s.phase, now, false, 0);
    }

    if (s.aiming) fn("applyAimPose")(t, now);

    const k = easeFactor(s.aiming ? 0.55 : ctx.grounded ? 0.3 : 0.26, dt);
    commit({ phase: s.phase + rate * dt });
    fn("blendPose")(t, k);

    let fv = finiteOr(s.fv, ctx.dir);
    fv += (ctx.dir - fv) * easeFactor(0.3, dt);
    if (!Number.isFinite(fv)) fv = ctx.dir;
    const airTarget = ctx.grounded ? 0 : 1;
    let airBlend = finiteOr(s.airBlend, airTarget);
    airBlend += (airTarget - airBlend) * easeFactor(0.3, dt);
    if (!Number.isFinite(airBlend)) airBlend = airTarget;

    const rageState = fn("rageState")();
    const rageTarget = s.aiming ? 0.8 : effective === "run" ? 0.6 : 0.35;
    const rage = approach(
      finiteOr(s.rage, 0),
      Math.max(rageTarget, finiteOr(rageState.floor, 0)),
      easeFactor(0.08, dt),
    );

    const joints = fn("solve")(fv, 0, airBlend);
    fn("draw")(joints, now);
    fn("place")(ctx.posX, ctx.posY);
    commit({ fv, airBlend, rage });
  }

  function renderPaused(now, dt) {
    const s = state();
    const t = fn("modePose")("idle", s.phase, now, false, 0);
    fn("blendPose")(t, easeFactor(0.12, dt));
    const joints = fn("solve")(finiteOr(s.fv, 1), 0, finiteOr(s.airBlend, 0));
    fn("draw")(joints, now);
    fn("place")(s.posX, s.posY);
  }

  function cageFrame(now, dt) {
    if (!input || !active) return false;
    const rect = fn("getCage")();
    if (!rect) return false;
    const s = state();
    const minX = rect.left;
    const maxCageX = rect.left + rect.width - TUNE.boxW;
    const floorC = rect.top + rect.height - TUNE.boxH - TUNE.cageFloorPad;

    const left = input.isDown("left");
    const right = input.isDown("right");
    const moveX = (right ? 1 : 0) - (left ? 1 : 0);
    const crouching = input.isDown("down");

    if (input.consume("jump")) bufferJump(memory, now);
    let hopping = false;
    if (takeBufferedJump(memory, now)) {
      hopping = true;
      fn("sound")("grab");
    }

    let speed = approach(
      s.speed,
      moveX * TUNE.maxSpeed * 0.72,
      easeFactor(TUNE.groundAccel, dt),
    );
    if (Math.abs(speed) < 0.02) speed = 0;
    let posX = clamp(s.posX + speed * dt, minX, Math.max(minX, maxCageX));
    if (posX <= minX && speed < 0) speed = 0;
    if (posX >= maxCageX && speed > 0) speed = 0;
    const dir = moveX !== 0 ? moveX : s.dir;

    const targetY = hopping ? rect.top + 7 : floorC;
    let posY = s.posY;
    if (rect.held) posY = targetY;
    else posY += (targetY - posY) * easeFactor(0.5, dt);

    commit({
      posX,
      posY,
      dir,
      speed,
      velX: 0,
      velY: 0,
      flying: false,
      wasAir: false,
      flipping: false,
      spin: 0,
      grounded: true,
      phase: s.phase + (Math.abs(speed) > 0.25 ? 0.12 : 0.04) * dt,
    });

    memory.lastGrounded = true;
    memory.groundedAt = now;

    let t;
    if (crouching) t = fn("crouchPose")(false);
    else {
      const effective = Math.abs(speed) > 0.25 ? "walk" : "idle";
      t = fn("modePose")(effective, s.phase, now, false, 0);
    }
    if (s.aiming) fn("applyAimPose")(t, now);
    fn("blendPose")(t, easeFactor(s.aiming ? 0.5 : 0.16, dt));

    const fv = approach(s.fv, dir, easeFactor(0.3, dt));
    const airBlend = approach(s.airBlend, 0, easeFactor(0.3, dt));
    const joints = fn("solve")(fv, 0, airBlend);
    fn("draw")(joints, now);
    fn("place")(posX, posY);
    commit({ fv, airBlend });
    pushHud(buildHudModel(now, true));
    return true;
  }

  function enter() {
    if (active) return;
    active = true;
    const s = state();
    memory.lastGrounded = !s.flying;
    memory.groundedAt = performance.now();
    memory.jumpPressedAt = -1e9;
    slamAir = false;
    slamDived = false;
    slamArmed = false;
    slamWindupUntil = 0;
    slamLandUntil = 0;
    dodgeUntil = 0;
    dodgeCooldownAt = 0;
    jetLatch = false;
    jumpCut = false;
    stepDustAt = 0;
    dryFireAt = 0;
    try {
      rack.reset();
    } catch {}
  }

  function exit() {
    active = false;
    memory.jumpPressedAt = -1e9;
    slamAir = false;
    slamDived = false;
    slamArmed = false;
    slamWindupUntil = 0;
    slamLandUntil = 0;
    dodgeUntil = 0;
    dodgeCooldownAt = 0;
    jetLatch = false;
    jumpCut = false;
    try {
      rack.cancelReload();
    } catch {}
    if (input) {
      try {
        input.releaseAll();
      } catch {}
    }
  }

  return {
    frame,
    cageFrame,
    enter,
    exit,
    isActive: () => active,
    getPilotInput: () => {
      const climb = input.isDown("jump") || input.isDown("thrust");
      return {
        moveX: (input.isDown("right") ? 1 : 0) - (input.isDown("left") ? 1 : 0),
        lift: (input.isDown("down") ? 1 : 0) - (climb ? 1 : 0),
      };
    },
    deniedBinding: () =>
      performance.now() - feedbackAt < DENY_FEEDBACK_MS ? deniedBinding : "",
  };
}

const STATE_KEYS = [
  "posX",
  "posY",
  "velX",
  "velY",
  "speed",
  "dir",
  "fv",
  "spin",
  "spinRate",
  "flipping",
  "flying",
  "wasAir",
  "phase",
  "airBlend",
  "sq",
  "sqV",
  "weapon",
  "aiming",
  "fireAt",
  "landUntil",
  "koUntil",
  "hp",
  "rage",
];

const WRITABLE_KEYS = [
  "posX",
  "posY",
  "velX",
  "velY",
  "speed",
  "dir",
  "fv",
  "spin",
  "spinRate",
  "flipping",
  "flying",
  "wasAir",
  "phase",
  "airBlend",
  "sq",
  "sqV",
  "slamArmed",
  "slamAir",
  "slamDived",
  "slamVX",
  "rage",
];

export function createActorPlayerController(bind) {
  const input = bind.hooks && bind.hooks.playerInput;
  const rack = bind.hooks && bind.hooks.playerRack;
  if (!input || !rack) return null;

  const hook = (name, ...args) => {
    try {
      if (bind.hooks && typeof bind.hooks[name] === "function") {
        return bind.hooks[name](...args);
      }
    } catch {}
    return undefined;
  };

  function abilityRatio(active, left, span) {
    if (active) return 1;
    return 1 - Math.min(1, Math.max(0, left / Math.max(1, span)));
  }

  function rageState() {
    const sys = bind.rageSys();
    return {
      intensity: sys ? sys.intensity() : 0,
      floor: sys ? sys.rageFloor() : 0,
      canSlam: !!sys,
      slamReady: sys && sys.level() > 0 ? 1 : 0,
    };
  }

  function jetHudState(now) {
    const sys = bind.jet();
    if (!sys)
      return {
        ready: false,
        active: false,
        ratio: 0,
        ability: { ready: false, ratio: 0 },
      };
    if (sys.isActive(now)) {
      const fuel = clamp(sys.fuelLeft(now) / Math.max(1, sys.fuelSpan()), 0, 1);
      return {
        ready: false,
        active: true,
        ratio: fuel,
        ability: { ready: false, ratio: fuel },
      };
    }
    const left = sys.cooldownLeft(now);
    const ratio = 1 - clamp(left / Math.max(1, sys.cooldownSpan()), 0, 1);
    return {
      ready: left <= 0,
      active: false,
      ratio: ratio,
      ability: { ready: left <= 0, ratio: ratio },
    };
  }

  function comboHudState(now) {
    const sys = bind.combo();
    const active = sys ? sys.isActive(now) : false;
    const left = sys ? sys.cooldownLeft(now) : 0;
    return {
      ready: !active && left <= 0,
      ratio: abilityRatio(active, left, sys ? sys.cooldownSpan() : 1),
    };
  }

  function tussleHudState(now) {
    const sys = bind.tussle();
    const active = sys ? sys.isActive() : false;
    const left = sys ? sys.cooldownLeft(now) : 0;
    return {
      ready: !active && left <= 0,
      ratio: abilityRatio(active, left, sys ? sys.cooldownSpan() : 1),
    };
  }

  try {
    return createPlayerController({
      input: input,
      rack: rack,
      guide: bind.hooks.playerGuide || null,
      hud: bind.hooks.playerHud || null,
      getState: () => {
        const live = bind.state();
        const out = {};
        for (let i = 0; i < STATE_KEYS.length; i++)
          out[STATE_KEYS[i]] = live[STATE_KEYS[i]];
        out.grounded = live.wasAir === false;
        return out;
      },
      setState: (patch) => {
        if (!patch) return;
        bind.setState(patch, WRITABLE_KEYS);
      },
      equipWeapon: bind.equipWeapon,
      aimAt: bind.aimAt,
      renderPaused: bind.renderPaused,
      comboActive: (now) => {
        const sys = bind.combo();
        return !!sys && sys.isActive(now);
      },
      applyComboFrame: bind.applyComboFrame,
      comboLaunch: (now) => {
        const sys = bind.combo();
        return sys ? sys.launch(now) : false;
      },
      comboHudState: comboHudState,
      jetActive: (now) => {
        const sys = bind.jet();
        return !!sys && sys.isActive(now);
      },
      applyJetFrame: bind.applyJetFrame,
      jetLaunch: (now) => {
        const sys = bind.jet();
        return sys ? sys.launch(now) : false;
      },
      jetAvailable: (now) => {
        const sys = bind.jet();
        return sys ? sys.available(now) : false;
      },
      jetStop: bind.jetStop,
      jetHudState: jetHudState,
      tussleActive: () => {
        const sys = bind.tussle();
        return !!sys && sys.isActive();
      },
      tussleRequest: (now) => {
        const sys = bind.tussle();
        if (!sys || !bind.tussleReady(now)) return false;
        sys.requestStart(now);
        return true;
      },
      tussleHudState: tussleHudState,
      laserBusy: () => {
        const sys = bind.laser();
        return !!(sys && sys.isBusy());
      },
      tryLaser: bind.tryLaser,
      tickLaserManual: bind.tickLaserManual,
      cancelLaser: bind.cancelLaser,
      spawnFoe: bind.spawnFoe,
      dryFire: () => bind.sound("grab"),
      resolveFloor: bind.resolveFloor,
      crossSurface: bind.crossSurface,
      getCage: () => {
        const rect = hook("getCage");
        return rect || null;
      },
      dust: (x, y, power) => hook("dust", x, y, power),
      smoke: (x, y) => hook("ninjaSmoke", x, y),
      shake: (power) => hook("shake", power),
      stomp: (x, y, radius) => hook("stomp", x, y, radius),
      sound: bind.sound,
      landFx: bind.landFx,
      rageTrySlam: (now, x, y) => {
        const sys = bind.rageSys();
        return sys ? sys.trySlam(now, x, y) : false;
      },
      rageLanding: (now, x, y, impact, slam) => {
        const sys = bind.rageSys();
        if (sys) sys.landing(now, x, y, impact, slam);
      },
      rageState: rageState,
      hpState: () => ({ hp: bind.hp(), max: bind.maxHp() }),
      slamDivePose: bind.slamDivePose,
      slamLandPose: bind.slamLandPose,
      slamLandMs: bind.slamLandMs,
      dodgePose: bind.dodgePose,
      airPose: bind.airPose,
      crouchPose: bind.crouchPose,
      modePose: bind.modePose,
      applyAimPose: bind.applyAimPose,
      blendPose: bind.blendPose,
      solve: bind.solvePlayer,
      draw: bind.draw,
      place: bind.place,
      startAim: bind.startAim,
      tickAim: bind.tickAim,
    });
  } catch {
    return null;
  }
}
