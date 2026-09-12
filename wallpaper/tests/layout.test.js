"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const layout = require("../layout.js");

function near(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`); }

test("a 2K landscape display shows the complete native arena", () => {
  const rect = layout.getArenaRect(2560, 1440);
  assert.deepEqual(rect, { x: 0, y: 0, width: 2560, height: 1440, orientation: "landscape" });
});

test("portrait screens preserve the board and enlarge it without stretching", () => {
  for (const [width, height] of [[1440, 2560], [1080, 1920], [1200, 1920]]) {
    const rect = layout.getArenaRect(width, height);
    assert.equal(rect.orientation, "portrait");
    near(rect.width / rect.height, 16 / 9);
    near(rect.width, width * 1.65);
    // These bound the actual board in both source videos, including its bench edges.
    for (const point of [{ x: .20, y: .17 }, { x: .76, y: .78 }]) {
      const x = rect.x + point.x * rect.width, y = rect.y + point.y * rect.height;
      assert.ok(x >= 0 && x <= width && y >= 0 && y <= height);
    }
  }
});

test("unusual landscape ratios preserve the whole source and native aspect", () => {
  for (const [width, height] of [[3440, 1440], [1920, 1200], [1024, 1024]]) {
    const rect = layout.getArenaRect(width, height);
    near(rect.width / rect.height, 16 / 9);
    assert.ok(rect.x >= 0 && rect.y >= 0);
    assert.ok(rect.x + rect.width <= width + 1e-8);
    assert.ok(rect.y + rect.height <= height + 1e-8);
  }
});

test("walking coordinates stay on the safe ground at every screen orientation", () => {
  for (const [width, height] of [[2560, 1440], [1440, 2560], [1080, 1920], [3440, 1440]]) {
    for (const u of [-1, 0, .5, 1, 2]) {
      for (const v of [-1, 0, .5, 1, 2]) {
        const point = layout.groundToScreen(u, v, width, height);
        assert.ok(point.x >= 0 && point.x <= width);
        assert.ok(point.y >= 0 && point.y <= height);
        assert.ok(point.scale > 0);
      }
    }
    assert.ok(layout.groundToScreen(.5, 0, width, height).scale < layout.groundToScreen(.5, 1, width, height).scale);
  }
  assert.deepEqual(layout.groundToSource(0, 0), layout.ground.topLeft);
  assert.deepEqual(layout.groundToSource(1, 1), layout.ground.bottomRight);
});

test("ambient composition reuses the two videos and stops work during playback pause", () => {
  const draws = [], frames = new Map(), listeners = {}, created = [];
  let frameId = 0;
  const state = { nightMix: 1, paused: false };
  const style = { setProperty() {} };
  const context = { fillRect() {}, drawImage(video) { draws.push(video.id); } };
  const elements = {
    ambient: { getContext() { return context; } },
    day: { id: "day", readyState: 2, videoWidth: 2560, videoHeight: 1440 },
    night: { id: "night", readyState: 2, videoWidth: 2560, videoHeight: 1440 },
    arena: { appendChild(element) { elements[element.id] = element; } }
  };
  const document = {
    documentElement: { style, dataset: {} },
    getElementById(id) { return elements[id]; },
    createElement(tag) { created.push(tag); return { style: {}, setAttribute() {}, remove() {} }; }
  };
  const window = {
    innerWidth: 1080, innerHeight: 1920,
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    addEventListener(event, callback) { listeners[event] = callback; },
    removeEventListener(event) { delete listeners[event]; }
  };
  const scene = layout.create({ document, window, getState: () => state });
  assert.deepEqual(created, ["div"]);
  assert.deepEqual(draws, ["day", "night"]);
  assert.equal(elements.ambient.width, 320);
  assert.equal(elements.ambient.height, 569);
  assert.equal(frames.size, 1);
  scene.setPaused(true);
  assert.equal(frames.size, 0);
  scene.setPaused(false);
  assert.equal(frames.size, 1);
  window.innerWidth = 2560; window.innerHeight = 1440;
  listeners.resize();
  assert.equal(scene.getRect().orientation, "landscape");
  scene.destroy();
  assert.equal(frames.size, 0);
  assert.deepEqual(listeners, {});
});