"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { normalize, phaseAt, nextBoundary, audioGains, smoothstep } = require("../schedule.js");
const at = (h, m = 0, s = 0) => new Date(2026, 8, 12, h, m, s);

test("day includes 07:00 and night includes 19:00, without a boundary gap", () => {
  assert.equal(phaseAt(at(6, 59, 59)), "night");
  assert.equal(phaseAt(at(7)), "day");
  assert.equal(phaseAt(at(18, 59, 59)), "day");
  assert.equal(phaseAt(at(19)), "night");
  assert.equal(phaseAt(at(0)), "night");
});

test("a day interval can cross midnight", () => {
  const settings = { dayStartHour: 20, nightStartHour: 6 };
  assert.equal(phaseAt(at(19, 59, 59), settings), "night");
  assert.equal(phaseAt(at(20), settings), "day");
  assert.equal(phaseAt(at(0), settings), "day");
  assert.equal(phaseAt(at(5, 59, 59), settings), "day");
  assert.equal(phaseAt(at(6), settings), "night");
});

test("fixed modes override the clock and equal boundaries mean day all day", () => {
  assert.equal(phaseAt(at(0), { mode: "day" }), "day");
  assert.equal(phaseAt(at(12), { mode: "night" }), "night");
  assert.equal(phaseAt(at(0), { dayStartHour: 7, nightStartHour: 7 }), "day");
  assert.equal(nextBoundary(at(12), { mode: "night" }), null);
  assert.equal(nextBoundary(at(12), { dayStartHour: 7, nightStartHour: 7 }), null);
});

test("fractional hours represent local minutes and next boundary advances the date", () => {
  const settings = { dayStartHour: 7.5, nightStartHour: 19.25 };
  assert.equal(phaseAt(at(7, 29, 59), settings), "night");
  assert.equal(phaseAt(at(7, 30), settings), "day");
  assert.equal(nextBoundary(at(7, 30), settings).getTime(), at(19, 15).getTime());
  const next = nextBoundary(at(20), settings);
  assert.equal(next.getDate(), 13);
  assert.equal(next.getHours(), 7);
  assert.equal(next.getMinutes(), 30);
});

test("bad property values cannot produce NaN or unsafe audio levels", () => {
  assert.deepEqual(normalize({ mode: "invalid", dayStartHour: NaN, nightStartHour: "", transitionSeconds: Infinity, volume: null }), normalize());
  assert.equal(normalize({ volume: 300 }).volume, 100);
  assert.equal(normalize({ volume: -10 }).volume, 0);
  assert.equal(normalize({ transitionSeconds: "2" }).transitionSeconds, 2);
});

test("sound crossfade has exact silent endpoints and constant combined power", () => {
  assert.deepEqual(audioGains(0, 80), { day: .8, night: 0 });
  assert.deepEqual(audioGains(1, 80), { day: 0, night: .8 });
  for (let i = 0; i <= 100; i++) {
    const gains = audioGains(i / 100, 80);
    assert.ok(Math.abs(gains.day ** 2 + gains.night ** 2 - .64) < 1e-12);
  }
  assert.equal(smoothstep(-1), 0);
  assert.equal(smoothstep(2), 1);
  assert.equal(smoothstep(.5), .5);
});
