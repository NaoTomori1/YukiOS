import { audioMixer } from "../audioMixer.js";

let contextRef = null;
let cachedNoise = null;
let lastShootAt = 0;
let lastHitAt = 0;
let lastShatterAt = 0;
let lastRebuildAt = 0;
let lastWooobAt = 0;
let lastGrabAt = 0;
let lastLandAt = 0;

export function ensureContext() {
  try {
    if (!contextRef) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) {
        return null;
      }
      contextRef = new Ctor();
    }
    if (contextRef.state === "suspended") {
      try {
        const pending = contextRef.resume();
        if (pending && typeof pending.catch === "function") {
          pending.catch(() => {});
        }
      } catch (resumeErr) {}
    }
    return contextRef;
  } catch (err) {
    return null;
  }
}

export function ensureNoiseBuffer(context) {
  try {
    if (cachedNoise) {
      return cachedNoise;
    }
    const size = Math.floor(context.sampleRate);
    const buffer = context.createBuffer(1, size, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++) {
      channel[i] = Math.random() * 2 - 1;
    }
    cachedNoise = buffer;
    return cachedNoise;
  } catch (err) {
    return null;
  }
}

export function computeVolume(mixer, level) {
  try {
    return mixer.masterVolume * mixer.systemVolume * level;
  } catch (err) {
    return 0;
  }
}

export function playShoot() {
  try {
    const mixer = audioMixer();
    if (!mixer || mixer.muted || mixer.systemAudioEnabled === false) {
      return;
    }
    const nowMs = Date.now();
    if (nowMs - lastShootAt < 90) {
      return;
    }
    lastShootAt = nowMs;
    const context = ensureContext();
    if (!context) {
      return;
    }
    const volume = computeVolume(mixer, 0.22);
    if (!(volume > 0)) {
      return;
    }
    const startAt = context.currentTime;
    const duration = 0.12;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, startAt);
    osc.frequency.exponentialRampToValueAtTime(220, startAt + duration);
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(startAt);
    osc.stop(startAt + duration);
  } catch (err) {}
}

export function playHit() {
  try {
    const mixer = audioMixer();
    if (!mixer || mixer.muted || mixer.systemAudioEnabled === false) {
      return;
    }
    const nowMs = Date.now();
    if (nowMs - lastHitAt < 60) {
      return;
    }
    lastHitAt = nowMs;
    const context = ensureContext();
    if (!context) {
      return;
    }
    const volume = computeVolume(mixer, 0.3);
    if (!(volume > 0)) {
      return;
    }
    const buffer = ensureNoiseBuffer(context);
    if (!buffer) {
      return;
    }
    const startAt = context.currentTime;
    const duration = 0.06;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1800, startAt);
    filter.Q.value = 1;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start(startAt);
    source.stop(startAt + duration);
  } catch (err) {}
}

export function playShatter() {
  try {
    const mixer = audioMixer();
    if (!mixer || mixer.muted || mixer.systemAudioEnabled === false) {
      return;
    }
    const nowMs = Date.now();
    if (nowMs - lastShatterAt < 150) {
      return;
    }
    lastShatterAt = nowMs;
    const context = ensureContext();
    if (!context) {
      return;
    }
    const volume = computeVolume(mixer, 0.5);
    if (!(volume > 0)) {
      return;
    }
    const buffer = ensureNoiseBuffer(context);
    if (!buffer) {
      return;
    }
    const startAt = context.currentTime;
    const duration = 0.4;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(3000, startAt);
    filter.frequency.exponentialRampToValueAtTime(300, startAt + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start(startAt);
    source.stop(startAt + duration);
  } catch (err) {}
}

export function playRebuild() {
  try {
    const mixer = audioMixer();
    if (!mixer || mixer.muted || mixer.systemAudioEnabled === false) {
      return;
    }
    const nowMs = Date.now();
    if (nowMs - lastRebuildAt < 200) {
      return;
    }
    lastRebuildAt = nowMs;
    const context = ensureContext();
    if (!context) {
      return;
    }
    const volume = computeVolume(mixer, 0.35);
    if (!(volume > 0)) {
      return;
    }
    const startAt = context.currentTime;
    const blip = 0.12;
    const firstOsc = context.createOscillator();
    const firstGain = context.createGain();
    firstOsc.type = "sine";
    firstOsc.frequency.setValueAtTime(523, startAt);
    firstGain.gain.setValueAtTime(volume, startAt);
    firstGain.gain.exponentialRampToValueAtTime(0.001, startAt + blip);
    firstOsc.connect(firstGain);
    firstGain.connect(context.destination);
    firstOsc.start(startAt);
    firstOsc.stop(startAt + blip);
    const secondStart = startAt + blip;
    const secondOsc = context.createOscillator();
    const secondGain = context.createGain();
    secondOsc.type = "sine";
    secondOsc.frequency.setValueAtTime(784, secondStart);
    secondGain.gain.setValueAtTime(volume, secondStart);
    secondGain.gain.exponentialRampToValueAtTime(0.001, secondStart + blip);
    secondOsc.connect(secondGain);
    secondGain.connect(context.destination);
    secondOsc.start(secondStart);
    secondOsc.stop(secondStart + blip);
  } catch (err) {}
}

export function playWooob() {
  try {
    const mixer = audioMixer();
    if (!mixer || mixer.muted || mixer.systemAudioEnabled === false) {
      return;
    }
    const nowMs = Date.now();
    if (nowMs - lastWooobAt < 300) {
      return;
    }
    lastWooobAt = nowMs;
    const context = ensureContext();
    if (!context) {
      return;
    }
    const volume = computeVolume(mixer, 0.32);
    if (!(volume > 0)) {
      return;
    }
    const startAt = context.currentTime;
    const duration = 1.2;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, startAt);
    osc.frequency.exponentialRampToValueAtTime(110, startAt + duration);
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(9, startAt);
    lfoGain.gain.setValueAtTime(40, startAt);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(startAt);
    lfo.start(startAt);
    osc.stop(startAt + duration);
    lfo.stop(startAt + duration);
  } catch (err) {}
}

export function playGrab() {
  try {
    const mixer = audioMixer();
    if (!mixer || mixer.muted || mixer.systemAudioEnabled === false) {
      return;
    }
    const nowMs = Date.now();
    if (nowMs - lastGrabAt < 120) {
      return;
    }
    lastGrabAt = nowMs;
    const context = ensureContext();
    if (!context) {
      return;
    }
    const volume = computeVolume(mixer, 0.2);
    if (!(volume > 0)) {
      return;
    }
    const startAt = context.currentTime;
    const duration = 0.07;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(400, startAt);
    osc.frequency.exponentialRampToValueAtTime(600, startAt + duration);
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(startAt);
    osc.stop(startAt + duration);
  } catch (err) {}
}

export function playLand() {
  try {
    const mixer = audioMixer();
    if (!mixer || mixer.muted || mixer.systemAudioEnabled === false) {
      return;
    }
    const nowMs = Date.now();
    if (nowMs - lastLandAt < 150) {
      return;
    }
    lastLandAt = nowMs;
    const context = ensureContext();
    if (!context) {
      return;
    }
    const volume = computeVolume(mixer, 0.3);
    if (!(volume > 0)) {
      return;
    }
    const startAt = context.currentTime;
    const toneDuration = 0.12;
    const osc = context.createOscillator();
    const toneGain = context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, startAt);
    osc.frequency.exponentialRampToValueAtTime(60, startAt + toneDuration);
    toneGain.gain.setValueAtTime(volume, startAt);
    toneGain.gain.exponentialRampToValueAtTime(0.001, startAt + toneDuration);
    osc.connect(toneGain);
    toneGain.connect(context.destination);
    osc.start(startAt);
    osc.stop(startAt + toneDuration);
    const buffer = ensureNoiseBuffer(context);
    if (!buffer) {
      return;
    }
    const thumpDuration = 0.05;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(500, startAt);
    const thumpGain = context.createGain();
    thumpGain.gain.setValueAtTime(volume, startAt);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, startAt + thumpDuration);
    source.connect(filter);
    filter.connect(thumpGain);
    thumpGain.connect(context.destination);
    source.start(startAt);
    source.stop(startAt + thumpDuration);
  } catch (err) {}
}
