import { audioMixer } from "../../audioMixer.js";
import {
  ensureContext,
  ensureNoiseBuffer,
  computeVolume,
} from "../chaosSfx.js";

const CHARGE_FLOOR_HZ = 90;
const CHARGE_TOP_HZ = 1500;
const CHARGE_SUB_HZ = 38;
const CHARGE_SUB_TOP_HZ = 230;
const BEAM_ATTACK = 0.03;
const BEAM_RELEASE = 0.22;
const BEAM_MAX_SECONDS = 1.6;
const BEAM_DRONE_HZ = 52;
const BEAM_WHINE_HZ = 1480;
const BEAM_CRACKLE_HZ = 23;
const BURN_MIN_GAP_MS = 45;
const BURN_DECAY = 0.14;

let beamVoice = null;
let lastBurnAt = 0;
let driveCurve = null;

function sfxVolume(level) {
  try {
    const mixer = audioMixer();
    if (!mixer || mixer.muted || mixer.systemAudioEnabled === false) return 0;
    return computeVolume(mixer, level);
  } catch {
    return 0;
  }
}

function silentAudio() {
  try {
    const mixer = audioMixer();
    return !mixer || mixer.muted || mixer.systemAudioEnabled === false;
  } catch {
    return true;
  }
}

function ensureDriveCurve() {
  if (driveCurve) return driveCurve;
  const size = 1024;
  const curve = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const x = (i / (size - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 4.5);
  }
  driveCurve = curve;
  return driveCurve;
}

function buildCharge(duration) {
  const volume = sfxVolume(0.22);
  if (!(volume > 0)) return;
  const context = ensureContext();
  if (!context) return;
  const buffer = ensureNoiseBuffer(context);
  const startAt = context.currentTime;
  const endAt = startAt + duration;
  const out = context.createGain();
  out.gain.setValueAtTime(0.0001, startAt);
  out.gain.exponentialRampToValueAtTime(
    volume * 0.45,
    startAt + duration * 0.35,
  );
  out.gain.exponentialRampToValueAtTime(volume, startAt + duration * 0.92);
  out.gain.exponentialRampToValueAtTime(0.0001, endAt);
  out.connect(context.destination);
  const pulse = context.createGain();
  pulse.gain.setValueAtTime(0.7, startAt);
  pulse.connect(out);
  const pulseLfo = context.createOscillator();
  pulseLfo.type = "sine";
  pulseLfo.frequency.setValueAtTime(3, startAt);
  pulseLfo.frequency.exponentialRampToValueAtTime(26, endAt);
  const pulseDepth = context.createGain();
  pulseDepth.gain.setValueAtTime(0.3, startAt);
  pulseLfo.connect(pulseDepth);
  pulseDepth.connect(pulse.gain);
  const sweep = context.createBiquadFilter();
  sweep.type = "lowpass";
  sweep.frequency.setValueAtTime(260, startAt);
  sweep.frequency.exponentialRampToValueAtTime(7200, endAt);
  sweep.Q.value = 7;
  sweep.connect(pulse);
  const whineA = context.createOscillator();
  whineA.type = "sawtooth";
  whineA.frequency.setValueAtTime(CHARGE_FLOOR_HZ, startAt);
  whineA.frequency.exponentialRampToValueAtTime(CHARGE_TOP_HZ, endAt);
  const whineB = context.createOscillator();
  whineB.type = "sawtooth";
  whineB.frequency.setValueAtTime(CHARGE_FLOOR_HZ * 1.0595, startAt);
  whineB.frequency.exponentialRampToValueAtTime(CHARGE_TOP_HZ * 1.0595, endAt);
  const whineGain = context.createGain();
  whineGain.gain.setValueAtTime(0.5, startAt);
  whineA.connect(whineGain);
  whineB.connect(whineGain);
  whineGain.connect(sweep);
  const sub = context.createOscillator();
  sub.type = "sine";
  sub.frequency.setValueAtTime(CHARGE_SUB_HZ, startAt);
  sub.frequency.exponentialRampToValueAtTime(CHARGE_SUB_TOP_HZ, endAt);
  const subGain = context.createGain();
  subGain.gain.setValueAtTime(0.0001, startAt);
  subGain.gain.exponentialRampToValueAtTime(0.9, startAt + duration * 0.7);
  sub.connect(subGain);
  subGain.connect(out);
  const sources = [whineA, whineB, sub, pulseLfo];
  if (buffer) {
    const riser = context.createBufferSource();
    riser.buffer = buffer;
    riser.loop = true;
    const riserShape = context.createBiquadFilter();
    riserShape.type = "bandpass";
    riserShape.frequency.setValueAtTime(400, startAt);
    riserShape.frequency.exponentialRampToValueAtTime(7500, endAt);
    riserShape.Q.value = 1.8;
    const riserGain = context.createGain();
    riserGain.gain.setValueAtTime(0.0001, startAt);
    riserGain.gain.exponentialRampToValueAtTime(0.35, endAt - 0.02);
    riser.connect(riserShape);
    riserShape.connect(riserGain);
    riserGain.connect(out);
    sources.push(riser);
  }
  for (let i = 0; i < sources.length; i++) {
    sources[i].start(startAt);
    sources[i].stop(endAt + 0.03);
  }
}

function buildBeam() {
  const volume = sfxVolume(0.2);
  if (!(volume > 0)) return;
  const context = ensureContext();
  if (!context) return;
  const buffer = ensureNoiseBuffer(context);
  const startAt = context.currentTime;
  const capEnd = startAt + BEAM_MAX_SECONDS;
  const out = context.createGain();
  out.gain.setValueAtTime(0.0001, startAt);
  out.gain.exponentialRampToValueAtTime(volume, startAt + BEAM_ATTACK);
  out.gain.setValueAtTime(volume, capEnd - BEAM_RELEASE);
  out.gain.linearRampToValueAtTime(0, capEnd);
  out.connect(context.destination);
  const trem = context.createGain();
  trem.gain.setValueAtTime(0.66, startAt);
  trem.connect(out);
  const droneA = context.createOscillator();
  droneA.type = "sawtooth";
  droneA.frequency.setValueAtTime(BEAM_DRONE_HZ * 2.2, startAt);
  droneA.frequency.exponentialRampToValueAtTime(BEAM_DRONE_HZ, startAt + 0.14);
  const droneB = context.createOscillator();
  droneB.type = "sawtooth";
  droneB.frequency.setValueAtTime(BEAM_DRONE_HZ * 2.2 * 1.02, startAt);
  droneB.frequency.exponentialRampToValueAtTime(
    BEAM_DRONE_HZ * 1.02,
    startAt + 0.14,
  );
  const droneMix = context.createGain();
  droneMix.gain.setValueAtTime(0.55, startAt);
  const drive = context.createWaveShaper();
  drive.curve = ensureDriveCurve();
  drive.oversample = "2x";
  const droneShape = context.createBiquadFilter();
  droneShape.type = "lowpass";
  droneShape.frequency.setValueAtTime(1400, startAt);
  droneShape.frequency.exponentialRampToValueAtTime(520, startAt + 0.6);
  droneShape.Q.value = 2;
  const droneGain = context.createGain();
  droneGain.gain.setValueAtTime(0.85, startAt);
  droneA.connect(droneMix);
  droneB.connect(droneMix);
  droneMix.connect(drive);
  drive.connect(droneShape);
  droneShape.connect(droneGain);
  droneGain.connect(trem);
  const growl = context.createOscillator();
  growl.type = "square";
  growl.frequency.setValueAtTime(233, startAt);
  const growlShape = context.createBiquadFilter();
  growlShape.type = "bandpass";
  growlShape.frequency.setValueAtTime(700, startAt);
  growlShape.Q.value = 3;
  const growlGain = context.createGain();
  growlGain.gain.setValueAtTime(0.16, startAt);
  growl.connect(growlShape);
  growlShape.connect(growlGain);
  growlGain.connect(trem);
  const whine = context.createOscillator();
  whine.type = "sawtooth";
  whine.frequency.setValueAtTime(BEAM_WHINE_HZ, startAt);
  whine.frequency.linearRampToValueAtTime(BEAM_WHINE_HZ * 0.93, capEnd);
  const whineHigh = context.createOscillator();
  whineHigh.type = "sawtooth";
  whineHigh.frequency.setValueAtTime(BEAM_WHINE_HZ * 1.4142, startAt);
  whineHigh.frequency.linearRampToValueAtTime(
    BEAM_WHINE_HZ * 1.4142 * 0.93,
    capEnd,
  );
  const whineShape = context.createBiquadFilter();
  whineShape.type = "bandpass";
  whineShape.frequency.setValueAtTime(2300, startAt);
  whineShape.Q.value = 8;
  const whineGain = context.createGain();
  whineGain.gain.setValueAtTime(0.32, startAt);
  whine.connect(whineShape);
  whineHigh.connect(whineShape);
  whineShape.connect(whineGain);
  whineGain.connect(trem);
  const warble = context.createOscillator();
  warble.type = "sine";
  warble.frequency.setValueAtTime(5.5, startAt);
  const warbleDepth = context.createGain();
  warbleDepth.gain.setValueAtTime(150, startAt);
  warble.connect(warbleDepth);
  warbleDepth.connect(whine.frequency);
  warbleDepth.connect(whineHigh.frequency);
  const crackle = context.createOscillator();
  crackle.type = "square";
  crackle.frequency.setValueAtTime(BEAM_CRACKLE_HZ, startAt);
  const crackleDepth = context.createGain();
  crackleDepth.gain.setValueAtTime(0.38, startAt);
  crackle.connect(crackleDepth);
  crackleDepth.connect(trem.gain);
  const flutter = context.createOscillator();
  flutter.type = "sawtooth";
  flutter.frequency.setValueAtTime(37, startAt);
  const flutterDepth = context.createGain();
  flutterDepth.gain.setValueAtTime(0.14, startAt);
  flutter.connect(flutterDepth);
  flutterDepth.connect(trem.gain);
  const sources = [
    droneA,
    droneB,
    growl,
    whine,
    whineHigh,
    warble,
    crackle,
    flutter,
  ];
  if (buffer) {
    const sizzle = context.createBufferSource();
    sizzle.buffer = buffer;
    sizzle.loop = true;
    const sizzleShape = context.createBiquadFilter();
    sizzleShape.type = "highpass";
    sizzleShape.frequency.setValueAtTime(3800, startAt);
    sizzleShape.Q.value = 0.8;
    const sizzleGain = context.createGain();
    sizzleGain.gain.setValueAtTime(0.2, startAt);
    sizzle.connect(sizzleShape);
    sizzleShape.connect(sizzleGain);
    sizzleGain.connect(trem);
    const ignite = context.createBufferSource();
    ignite.buffer = buffer;
    ignite.loop = true;
    const igniteShape = context.createBiquadFilter();
    igniteShape.type = "bandpass";
    igniteShape.frequency.setValueAtTime(5200, startAt);
    igniteShape.frequency.exponentialRampToValueAtTime(900, startAt + 0.22);
    igniteShape.Q.value = 1;
    const igniteGain = context.createGain();
    igniteGain.gain.setValueAtTime(0.9, startAt);
    igniteGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.24);
    ignite.connect(igniteShape);
    igniteShape.connect(igniteGain);
    igniteGain.connect(out);
    sources.push(sizzle, ignite);
  }
  for (let i = 0; i < sources.length; i++) {
    sources[i].start(startAt);
    sources[i].stop(capEnd);
  }
  beamVoice = { out: out, sources: sources, endsAt: capEnd };
}

function fadeOut(voice, release) {
  if (!voice) return;
  const context = ensureContext();
  if (!context) return;
  const stopAt = context.currentTime;
  try {
    const level = Math.max(0.0001, voice.out.gain.value);
    voice.out.gain.cancelScheduledValues(stopAt);
    voice.out.gain.setValueAtTime(level, stopAt);
    voice.out.gain.exponentialRampToValueAtTime(0.0001, stopAt + release);
  } catch {}
  for (let i = 0; i < voice.sources.length; i++) {
    try {
      voice.sources[i].stop(stopAt + release + 0.03);
    } catch {}
  }
}

export function startLaserCharge(durationMs) {
  try {
    buildCharge(Math.max(0.05, (durationMs || 0) / 1000));
  } catch {}
}

export function startLaserBeam() {
  try {
    if (beamVoice) {
      fadeOut(beamVoice, 0.04);
      beamVoice = null;
    }
    buildBeam();
  } catch {}
}

export function stopLaserBeam() {
  const voice = beamVoice;
  beamVoice = null;
  if (!voice) return;
  try {
    fadeOut(voice, BEAM_RELEASE);
  } catch {}
}

export function playLaserBurn() {
  try {
    if (silentAudio()) return;
    const nowMs = Date.now();
    if (nowMs - lastBurnAt < BURN_MIN_GAP_MS) return;
    lastBurnAt = nowMs;
    const volume = sfxVolume(0.14);
    if (!(volume > 0)) return;
    const context = ensureContext();
    if (!context) return;
    const buffer = ensureNoiseBuffer(context);
    if (!buffer) return;
    const startAt = context.currentTime;
    const decay = BURN_DECAY * (0.8 + Math.random() * 0.5);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const shape = context.createBiquadFilter();
    shape.type = "bandpass";
    shape.frequency.setValueAtTime(7600 + Math.random() * 1800, startAt);
    shape.frequency.exponentialRampToValueAtTime(1200, startAt + decay);
    shape.Q.value = 2.2;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + decay);
    source.connect(shape);
    shape.connect(gain);
    gain.connect(context.destination);
    source.start(startAt, Math.random() * 0.5);
    source.stop(startAt + decay + 0.02);
    const thump = context.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(140, startAt);
    thump.frequency.exponentialRampToValueAtTime(46, startAt + decay);
    const thumpGain = context.createGain();
    thumpGain.gain.setValueAtTime(0.0001, startAt);
    thumpGain.gain.exponentialRampToValueAtTime(volume * 0.9, startAt + 0.006);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, startAt + decay);
    thump.connect(thumpGain);
    thumpGain.connect(context.destination);
    thump.start(startAt);
    thump.stop(startAt + decay + 0.02);
  } catch {}
}

export function resetLaserSfx() {
  const voice = beamVoice;
  beamVoice = null;
  try {
    if (voice) fadeOut(voice, 0.08);
  } catch {}
}
