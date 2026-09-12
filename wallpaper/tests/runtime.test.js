"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const schedule = require("../schedule.js");
const source = fs.readFileSync(path.join(__dirname, "..", "wallpaper.js"), "utf8");
const flush = () => new Promise(resolve => setImmediate(resolve));

function environment(hour = 22, overrides = {}, behavior = {}) {
  let now = new Date(2026, 8, 12, hour).getTime();
  let animationTime = 0;
  let frameId = 0;
  const frames = new Map();
  const intervals = [];
  class LocalDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const elements = {};
  function element(id) {
    return elements[id] ||= {
      style: {}, children: [], listeners: {}, paused: true, muted: false,
      volume: 1, playCalls: 0, pauseCalls: 0,
      appendChild(child) { this.children.push(child); },
      addEventListener(type, listener) { this.listeners[type] = listener; },
      play() {
        this.paused = false;
        this.playCalls++;
        return behavior.play ? behavior.play(id, this) : Promise.resolve();
      },
      pause() { this.paused = true; this.pauseCalls++; }
    };
  }
  const documentEvents = {};
  const windowEvents = {};
  const document = {
    hidden: false,
    getElementById: element,
    createElement: () => ({}),
    addEventListener: (type, callback) => { documentEvents[type] = callback; }
  };
  const window = {
    WallpaperSchedule: schedule,
    WALLPAPER_CONFIG: overrides,
    location: { search: "" },
    addEventListener: (type, callback) => { windowEvents[type] = callback; }
  };
  vm.runInNewContext(source, {
    window, document, console, URLSearchParams, Date: LocalDate,
    performance: { now: () => animationTime },
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
    setInterval: callback => intervals.push(callback)
  });
  return {
    window, document, elements, documentEvents, windowEvents,
    setHour(hour) { now = new Date(2026, 8, 12, hour).getTime(); },
    tick() { intervals.forEach(callback => callback()); },
    frame(milliseconds) {
      animationTime += milliseconds;
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(callback => callback(animationTime));
    }
  };
}

test("night startup never plays the day video or displays a day-first fade", async () => {
  const env = environment(22);
  assert.equal(env.elements.night.style.opacity, "1");
  assert.equal(env.elements.day.playCalls, 0);
  await flush();
  assert.equal(env.window.wallpaperState().active, "night");
  assert.equal(env.elements.day.paused, true);
  assert.equal(env.elements.night.paused, false);
  assert.equal(env.elements.night.volume, .35);
});

test("a transition crossfades sound and pauses the hidden decoder at completion", async () => {
  const env = environment(12);
  await flush();
  env.window.livelyPropertyListener("mode", 2);
  await flush();
  assert.equal(env.elements.day.paused, false);
  assert.equal(env.elements.night.paused, false);
  env.frame(4000);
  assert.equal(env.window.wallpaperState().nightMix, .5);
  assert.ok(Math.abs(env.elements.day.volume - env.elements.night.volume) < 1e-12);
  env.frame(4000);
  assert.equal(env.window.wallpaperState().active, "night");
  assert.equal(env.elements.day.paused, true);
  assert.equal(env.elements.day.volume, 0);
  assert.equal(env.elements.night.volume, .35);
});

test("Lively pause stops all media and resume immediately selects the current clock phase", async () => {
  const env = environment(12);
  await flush();
  env.window.livelyWallpaperPlaybackChanged('{"IsPaused":true}');
  assert.ok(env.elements.day.paused && env.elements.night.paused);
  env.setHour(22);
  env.tick();
  assert.equal(env.elements.night.playCalls, 0);
  env.window.livelyWallpaperPlaybackChanged('{"IsPaused":false}');
  await flush();
  assert.equal(env.window.wallpaperState().active, "night");
  assert.equal(env.window.wallpaperState().nightMix, 1);
  assert.equal(env.elements.day.paused, true);
});

test("sleep or manual clock changes reconcile even without a visibility callback", async () => {
  const env = environment(12);
  await flush();
  env.setHour(22);
  env.tick();
  await flush();
  assert.equal(env.window.wallpaperState().active, "night");
  assert.equal(env.window.wallpaperState().pending, null);
  env.setHour(8);
  env.tick();
  await flush();
  assert.equal(env.window.wallpaperState().active, "day");
  assert.equal(env.elements.night.paused, true);
});

test("reversing a transition preserves its current visual mixture", async () => {
  const env = environment(12);
  await flush();
  env.window.livelyPropertyListener("mode", 2);
  await flush();
  env.frame(4000);
  env.window.livelyPropertyListener("mode", 1);
  await flush();
  assert.equal(env.window.wallpaperState().nightMix, .5);
  env.frame(8000);
  assert.equal(env.window.wallpaperState().active, "day");
  assert.equal(env.elements.night.paused, true);
});

test("separate soundtracks play only with their corresponding visible videos", async () => {
  const env = environment(12, { audioMode: "separate", transitionSeconds: 0 });
  await flush();
  assert.equal(env.elements.day.muted, true);
  assert.equal(env.elements["day-audio"].paused, false);
  assert.equal(env.elements["night-audio"].paused, true);
  env.window.livelyPropertyListener("mode", 2);
  await flush();
  assert.equal(env.elements["day-audio"].paused, true);
  assert.equal(env.elements["night-audio"].paused, false);
  env.window.livelyWallpaperPlaybackChanged({ IsPaused: true });
  assert.equal(env.elements["night-audio"].paused, true);
});

test("rapid startup properties wait for the first frame and preserve the latest theme", async () => {
  let firstFrame;
  const waiting = new Promise(resolve => { firstFrame = resolve; });
  const env = environment(12, { audioMode: "separate" }, {
    play(id) { return id === "day" ? waiting : Promise.resolve(); }
  });
  env.window.livelyPropertyListener("volume", 10);
  env.window.livelyPropertyListener("dayStartHour", 8);
  env.window.livelyPropertyListener("mode", 2);
  env.window.livelyPropertyListener("mode", 1);
  await flush();
  assert.equal(env.window.wallpaperState().active, null);
  assert.equal(env.elements.day.playCalls, 1);
  firstFrame();
  await flush();
  assert.equal(env.window.wallpaperState().active, "day");
  assert.equal(env.elements.night.paused, true);
  assert.equal(env.elements["day-audio"].volume, .1);
});

test("a stalled soundtrack cannot prevent the arena from appearing", async () => {
  const env = environment(22, { audioMode: "separate" }, {
    play(id) { return id === "night-audio" ? new Promise(() => {}) : Promise.resolve(); }
  });
  await flush();
  assert.equal(env.window.wallpaperState().active, "night");
  assert.equal(env.window.wallpaperState().pending, null);
  assert.equal(env.elements.night.paused, false);
});

test("a rejected soundtrack is handled while its video remains playable", async () => {
  const env = environment(22, { audioMode: "separate" }, {
    play(id, media) {
      if (id !== "night-audio") return Promise.resolve();
      media.paused = true;
      return Promise.reject(Object.assign(new Error("Unsupported media"), { name: "NotSupportedError" }));
    }
  });
  await flush();
  assert.equal(env.window.wallpaperState().active, "night");
  assert.match(env.elements["media-status"].textContent, /soundtrack could not load/);
  assert.equal(env.elements["enable-audio"].hidden, false);
});

test("a browser blocking even muted audio asks for a gesture instead of reporting a missing file", async () => {
  const env = environment(22, { audioMode: "separate" }, {
    play(id, media) {
      if (id !== "night-audio") return Promise.resolve();
      media.paused = true;
      return Promise.reject(Object.assign(new Error("Gesture required"), { name: "NotAllowedError" }));
    }
  });
  await flush();
  assert.equal(env.window.wallpaperState().active, "night");
  assert.equal(env.elements["night-audio"].playCalls, 2);
  assert.match(env.elements["media-status"].textContent, /allow audio in this browser/);
  assert.equal(env.elements["enable-audio"].textContent, "Enable soundtrack");
  assert.equal(env.elements["enable-audio"].hidden, false);
});
