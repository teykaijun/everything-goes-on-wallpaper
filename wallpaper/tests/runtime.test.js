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
  const timers = new Map(); let timerId=0;
  class LocalDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const elements = {};
  function element(id) {
    return elements[id] ||= {
      style: {}, children: [], listeners: {}, paused: true, muted: false,
      volume: 1, playCalls: 0, pauseCalls: 0,
      setAttribute(name, value) { this[name] = value; },
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
    documentElement: {dataset:{}},
    getElementById: element,
    createElement: () => ({}),
    addEventListener: (type, callback) => { documentEvents[type] = callback; }
  };
  const window = {
    innerWidth: behavior.width ?? 2560, innerHeight: behavior.height ?? 1440,
    WallpaperSchedule: schedule, WallpaperViewport: require("../viewport.js"),
    setTimeout(callback) { timers.set(++timerId,callback); return timerId; },
    clearTimeout(id) { timers.delete(id); },
    CustomEvent: class { constructor(type,options) { this.type=type; this.detail=options.detail; } },
    dispatchEvent(event) { windowEvents[event.type]?.(event); },
    removeEventListener(type) { delete windowEvents[type]; },
    WALLPAPER_CONFIG: overrides,
    location: { search: "", reload() { this.reloaded = true; } },
    ArenaLayout: behavior.layout, ChibiLux: behavior.lux,
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
    settle() { const current=[...timers.values()]; timers.clear(); current.forEach(callback=>callback()); },
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
  assert.equal(env.elements.night.volume, .21);
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
  assert.equal(env.elements.night.volume, .21);
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


test("portrait uses the matching arena-window scene and starts its soundtrack muted", async () => {
  const env = environment(22,{audioMode:"separate"},{width:1080,height:1920});
  await flush();
  assert.equal(env.document.documentElement.dataset.scene,"window");
  assert.equal(env.elements.night.children[0].src,"media/window-magic/night.mp4");
  assert.equal(env.elements.day.children[0].src,"media/window-magic/day.mp4");
  assert.equal(env.elements["night-audio"].volume,0);
  assert.equal(env.elements.day.playCalls,0);
});

test("landscape retains cleaned arena sources and configured music",async()=>{
  const env=environment(12,{daySources:["media/day-clean.webm"],nightSources:["media/night-clean.webm"],audioMode:"separate",volume:35});
  await flush();
  assert.equal(env.document.documentElement.dataset.scene,"classroom");
  assert.equal(env.elements.day.children[0].src,"media/day-clean.webm");
  assert.ok(env.elements["day-audio"].volume>0);
});


test("desktop emote menu opens and forwards each selected native emote", async () => {
  const commands = [];
  const env = environment(22, {}, {
    layout: { create: () => ({setPaused(){}, refresh(){}, setMix(){}}) },
    lux: { create: () => ({setPaused(){}, command: name => commands.push(name)}) }
  });
  const menu = env.elements["emote-menu"];
  const toggle = env.elements["emote-toggle"];
  assert.equal(menu.hidden, true);
  toggle.listeners.click();
  assert.equal(menu.hidden, false);
  assert.equal(toggle["aria-expanded"], "true");
  for (const emote of ["dance", "laugh", "taunt", "joke", "stop"]) {
    menu.listeners.click({target:{closest: () => ({dataset:{emote}})}});
  }
  assert.deepEqual(commands, ["dance", "laugh", "taunt", "joke", "stop"]);
});

test("automatic scene changes reload only after the new viewport settles", () => {
  const env = environment(22);
  env.windowEvents.resize();
  assert.equal(env.window.location.reloaded, undefined);
  env.window.innerWidth = 1080;
  env.window.innerHeight = 1920;
  env.windowEvents.resize();
  assert.equal(env.window.location.reloaded, undefined);
  env.settle();
  assert.equal(env.window.location.reloaded, true);
});


test('hot-plug resize bursts never reload the fixed Wallpaper Engine arena',async()=>{
 const env=environment(12,{scene:'classroom',audioMode:'separate'});await flush();
 for(const [w,h] of [[0,0],[1,1440],[1080,1920],[0,0],[2560,1440]]){
  env.window.innerWidth=w;env.window.innerHeight=h;env.windowEvents.resize();
 }
 assert.equal(env.window.wallpaperState().viewportPending,true);
 assert.equal(env.elements.day.paused,true);
 env.settle();await flush();
 assert.equal(env.window.location.reloaded,undefined);
 assert.equal(env.window.wallpaperState().scene,'classroom');
 assert.equal(env.window.wallpaperState().paused,false);
 assert.equal(env.elements.day.paused,false);
 assert.equal(env.elements['day-audio'].volume,.21);
});

test('fixed portrait project stays silent and uses WebM even with temporary landscape dimensions',async()=>{
 const env=environment(22,{scene:'window',audioMode:'separate',portraitDaySources:['media/window-magic/day.webm'],portraitNightSources:['media/window-magic/night.webm']},{width:2560,height:1440});
 await flush();
 assert.equal(env.window.wallpaperState().scene,'window');
 assert.equal(env.elements.night.children[0].src,'media/window-magic/night.webm');
 assert.equal(env.elements['night-audio'].playCalls,0);
 env.windowEvents.resize();env.settle();await flush();
 assert.equal(env.window.location.reloaded,undefined);
});

test('Wallpaper Engine accepts partial settings, preserves zero volume and separates engine master volume',async()=>{
 const env=environment(12,{scene:'classroom'});await flush();
 env.window.wallpaperPropertyListener.applyUserProperties({soundtrackVolume:{value:0},mode:{value:'night'}});await flush();env.frame(8000);
 assert.equal(env.window.wallpaperState().settings.volume,0);
 assert.equal(env.window.wallpaperState().active,'night');
 env.window.wallpaperPropertyListener.applyUserProperties({dayStartHour:{value:8},volume:{value:75}});
 assert.equal(env.window.wallpaperState().settings.volume,0);
 assert.equal(env.window.wallpaperState().settings.dayStartHour,8);
});

test('Wallpaper Engine pause and resume recheck the wall clock',async()=>{
 const env=environment(12,{scene:'classroom'});await flush();
 env.window.wallpaperPropertyListener.setPaused(true);env.setHour(22);env.tick();
 assert.equal(env.elements.night.playCalls,0);
 env.window.wallpaperPropertyListener.setPaused(false);await flush();
 assert.equal(env.window.wallpaperState().active,'night');
 assert.equal(env.elements.day.paused,true);
});

test('Wallpaper Engine FPS updates limit Lux without overriding other properties',()=>{
 const updates=[];
 const env=environment(12,{scene:'classroom'},{layout:{create:()=>({setPaused(){},setMix(){}})},lux:{create:()=>({setPaused(){},configure(v){updates.push(v);}})}});
 env.window.wallpaperPropertyListener.applyGeneralProperties({fps:15});
 assert.equal(updates.at(-1).fps,15);
 env.window.wallpaperPropertyListener.applyGeneralProperties({fps:120});
 assert.equal(updates.at(-1).fps,30);
 env.window.wallpaperPropertyListener.applyGeneralProperties({fps:0});
 assert.equal(updates.length,2);
});

test('empty startup viewport waits before loading video or creating renderers',async()=>{
 const env=environment(12,{scene:'classroom'},{width:0,height:0});
 assert.equal(env.window.wallpaperState,undefined);
 env.window.innerWidth=2560;env.window.innerHeight=1440;env.settle();await flush();
 assert.equal(env.window.wallpaperState().active,'day');
});
