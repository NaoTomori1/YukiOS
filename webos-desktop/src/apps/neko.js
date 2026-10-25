import "../styles/neko.css";
import { BaseApp } from "../framework.js";
import { createElement, setStyle } from "../shared/domUtils.js";
import { showContextMenu } from "../shared/contextMenu.js";
import { audioMixer } from "../audioMixer.js";
import spriteSheetUrl from "../assets/neko/neko.png";
import awakeSoundUrl from "../assets/neko/awake.wav";
import yawnSoundUrl from "../assets/neko/idle3.wav";
import sleepSoundUrl from "../assets/neko/sleep.wav";

const OVERLAY_ID = "neko";
const SPRITE_SIZE = 32;
const SCALE = 2;
const CAT_SIZE = SPRITE_SIZE * SCALE;
const TICK_MS = 20;
const MAX_TICKS_PER_FRAME = 10;
const SPEED = 2;
const IDLE_DISTANCE = SPRITE_SIZE;
const DIRECTION_SECTOR = 45;
const DIRECTION_HALF_SECTOR = DIRECTION_SECTOR / 2;
const DIRECTION_HYSTERESIS = 3;
const FRAME_MIN_MOVE = 8;
const FRAME_MAX_MOVE = 16;
const FRAME_MIN_YAWN = 32;
const FRAME_MAX_YAWN = 64;
const SOUND_VOLUME = 0.3;

const STATE_MOVING = 0;
const STATE_AWAKE = 1;
const STATE_SCRATCH = 4;
const STATE_WASH = 7;
const STATE_YAWN = 10;
const STATE_SLEEP = 13;

const DIRECTIONS = [
  "right",
  "downright",
  "down",
  "downleft",
  "left",
  "upleft",
  "up",
  "upright",
];

const FRAME_CELLS = {
  up1: [1, 2],
  up2: [1, 3],
  upright1: [0, 2],
  upright2: [0, 3],
  right1: [3, 0],
  right2: [3, 1],
  downright1: [5, 1],
  downright2: [5, 2],
  down1: [6, 3],
  down2: [7, 2],
  downleft1: [5, 3],
  downleft2: [6, 1],
  left1: [4, 2],
  left2: [4, 3],
  upleft1: [1, 0],
  upleft2: [1, 1],
  awake: [7, 3],
  sleep1: [2, 0],
  sleep2: [2, 1],
  yawn1: [3, 2],
  yawn2: [3, 3],
  scratch1: [5, 0],
  scratch2: [6, 0],
  wash: [7, 0],
};

function angularDistance(a, b) {
  const distance = Math.abs(a - b);
  return Math.min(distance, 360 - distance);
}

export class NekoApp extends BaseApp {
  constructor(services) {
    super(services);
    this.overlay = null;
    this.cat = null;
    this.ctx = null;
    this.sheet = null;
    this.rafId = null;
    this.lastTime = 0;
    this.accumulator = 0;
    this.mouseX = 0;
    this.mouseY = 0;
    this.x = 0;
    this.y = 0;
    this.count = FRAME_MIN_MOVE;
    this.min = FRAME_MIN_MOVE;
    this.max = FRAME_MAX_MOVE;
    this.state = STATE_MOVING;
    this.sprite = "";
    this.lastFrame = null;
    this.waiting = false;
    this.muted = false;
    this.sounds = {};

    this.handleMouseMove = (event) => {
      this.mouseX = event.clientX;
      this.mouseY = event.clientY;
    };

    this.handleCatClick = () => {
      this.waiting = !this.waiting;
    };

    this.handleCatContextMenu = (event) => {
      event.preventDefault();
      this.showCatMenu(event);
    };

    this.loop = (now) => {
      this.rafId = requestAnimationFrame(this.loop);
      if (!this.lastTime) this.lastTime = now;
      let delta = now - this.lastTime;
      this.lastTime = now;
      if (delta > TICK_MS * MAX_TICKS_PER_FRAME) {
        delta = TICK_MS * MAX_TICKS_PER_FRAME;
      }
      this.accumulator += delta;
      let ticks = 0;
      while (this.accumulator >= TICK_MS && ticks < MAX_TICKS_PER_FRAME) {
        this.accumulator -= TICK_MS;
        ticks++;
        this.tick();
        this.draw();
      }
    };
  }

  open() {
    if (this.overlay) return;

    const overlay = createElement("div", {
      id: OVERLAY_ID,
      className: "neko-overlay",
    });
    const cat = createElement("canvas", { className: "neko-cat" });
    overlay.appendChild(cat);
    document.body.appendChild(overlay);

    this.overlay = overlay;
    this.cat = cat;
    this.ctx = cat.getContext("2d");
    this.setupCat();

    this.x = (window.innerWidth - CAT_SIZE) / 2;
    this.y = (window.innerHeight - CAT_SIZE) / 2;
    this.mouseX = window.innerWidth / 2;
    this.mouseY = window.innerHeight / 2;
    this.positionCat();

    this.loadSheet();
    this.loadSounds();

    document.addEventListener("mousemove", this.handleMouseMove);
    cat.addEventListener("click", this.handleCatClick);
    cat.addEventListener("contextmenu", this.handleCatContextMenu);

    this.lastTime = 0;
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.loop);
  }

  close() {
    if (this.overlay) this.overlay.remove();
    this.cleanup();
  }

  setupCat() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cat.width = Math.round(CAT_SIZE * dpr);
    this.cat.height = Math.round(CAT_SIZE * dpr);
    setStyle(this.cat, {
      width: `${CAT_SIZE}px`,
      height: `${CAT_SIZE}px`,
    });
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  loadSheet() {
    const image = new Image();
    image.onload = () => {
      this.sheet = image;
      this.lastFrame = null;
      this.renderFrame();
    };
    image.src = spriteSheetUrl;
  }

  loadSounds() {
    this.sounds = {
      awake: new Audio(awakeSoundUrl),
      yawn: new Audio(yawnSoundUrl),
      sleep: new Audio(sleepSoundUrl),
    };
    Object.values(this.sounds).forEach((audio) => {
      audio.preload = "auto";
    });
  }

  playSound(name) {
    if (this.muted) return;
    const audio = this.sounds[name];
    if (!audio) return;
    const mixer = audioMixer();
    if (mixer.muted || mixer.systemAudioEnabled === false) return;
    const volume =
      SOUND_VOLUME *
      Number(mixer.masterVolume ?? 1) *
      Number(mixer.systemVolume ?? 1);
    if (!(volume > 0)) return;
    try {
      audio.volume = Math.min(1, volume);
      audio.currentTime = 0;
      const playback = audio.play();
      if (playback && typeof playback.catch === "function") {
        playback.catch(() => {});
      }
    } catch {}
  }

  tick() {
    this.count++;
    if (this.state === STATE_YAWN && this.count === this.min) {
      this.playSound("yawn");
    }

    const dx = this.mouseX - (this.x + SPRITE_SIZE / 2);
    const dy = this.mouseY - (this.y + SPRITE_SIZE / 2);
    const distance = Math.abs(dx) + Math.abs(dy);

    if (distance < IDLE_DISTANCE || this.waiting) {
      this.stayIdle();
      return;
    }

    if (this.state >= STATE_SLEEP) this.playSound("awake");
    this.catchCursor(dx, dy);
    this.positionCat();
  }

  stayIdle() {
    if (this.state < STATE_SCRATCH) {
      if (this.state === STATE_MOVING) this.state = STATE_AWAKE;
      this.sprite = "awake";
      return;
    }
    if (this.state < STATE_WASH) {
      this.sprite = "scratch";
      return;
    }
    if (this.state < STATE_YAWN) {
      this.sprite = "wash";
      return;
    }
    if (this.state < STATE_SLEEP) {
      this.min = FRAME_MIN_YAWN;
      this.max = FRAME_MAX_YAWN;
      this.sprite = "yawn";
      return;
    }
    this.sprite = "sleep";
  }

  catchCursor(dx, dy) {
    this.state = STATE_MOVING;
    this.min = FRAME_MIN_MOVE;
    this.max = FRAME_MAX_MOVE;

    const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    this.sprite = this.resolveDirection(angle);

    const distance = Math.hypot(dx, dy);
    if (distance === 0 || SPEED <= 0) return;
    const step = Math.min(SPEED, distance);
    const scale = step / distance;
    this.x += dx * scale;
    this.y += dy * scale;
  }

  resolveDirection(angle) {
    const previous = DIRECTIONS.indexOf(this.sprite);
    if (previous >= 0) {
      const center = previous * DIRECTION_SECTOR;
      if (
        angularDistance(angle, center) <=
        DIRECTION_HALF_SECTOR + DIRECTION_HYSTERESIS
      ) {
        return this.sprite;
      }
    }
    let index = Math.ceil((angle - DIRECTION_HALF_SECTOR) / DIRECTION_SECTOR);
    index =
      ((index % DIRECTIONS.length) + DIRECTIONS.length) % DIRECTIONS.length;
    return DIRECTIONS[index];
  }

  resolveFrame() {
    if (this.sprite === "awake" || this.sprite === "wash") return this.sprite;
    return this.count < this.min ? `${this.sprite}1` : `${this.sprite}2`;
  }

  draw() {
    const frame = this.resolveFrame();

    if (this.count > this.max) {
      this.count = 0;
      if (this.state > STATE_MOVING) {
        this.state++;
        if (this.state === STATE_SLEEP) this.playSound("sleep");
      }
    }

    this.renderFrame(frame);
  }

  renderFrame(frame = this.resolveFrame()) {
    if (!this.ctx || !this.sheet) return;
    if (frame === this.lastFrame) return;
    const cell = FRAME_CELLS[frame];
    if (!cell) return;

    this.lastFrame = frame;
    const [col, row] = cell;
    this.ctx.clearRect(0, 0, CAT_SIZE, CAT_SIZE);
    this.ctx.drawImage(
      this.sheet,
      col * SPRITE_SIZE,
      row * SPRITE_SIZE,
      SPRITE_SIZE,
      SPRITE_SIZE,
      0,
      0,
      CAT_SIZE,
      CAT_SIZE,
    );
  }

  positionCat() {
    if (!this.cat) return;
    setStyle(this.cat, {
      transform: `translate(${Math.round(this.x)}px, ${Math.round(this.y)}px)`,
    });
  }

  showCatMenu(event) {
    showContextMenu(
      event,
      [
        {
          id: "neko-wait",
          label: this.waiting ? "Resume" : "Pause",
          action: "wait",
          icon: this.waiting ? "fas fa-play" : "fas fa-pause",
        },
        {
          id: "neko-sound",
          label: this.muted ? "Unmute" : "Mute",
          action: "sound",
          icon: this.muted ? "fas fa-volume-mute" : "fas fa-volume-up",
        },
        "hr",
        {
          id: "neko-close",
          label: "Close Neko",
          action: "close",
          icon: "fas fa-times-circle",
        },
      ],
      {
        wait: () => {
          this.waiting = !this.waiting;
        },
        sound: () => {
          this.muted = !this.muted;
        },
        close: () => this.close(),
      },
    );
  }

  cleanup() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    document.removeEventListener("mousemove", this.handleMouseMove);
    Object.values(this.sounds).forEach((audio) => {
      try {
        audio.pause();
      } catch {}
    });
    this.sounds = {};
    this.sheet = null;
    this.ctx = null;
    this.cat = null;
    this.overlay = null;
    this.lastFrame = null;
  }
}
