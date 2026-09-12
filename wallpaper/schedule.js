(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WallpaperSchedule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function bounded(value, fallback, min, max) {
    if (value === null || value === "" || typeof value === "boolean") return fallback;
    var number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  }

  function normalize(options) {
    options = options || {};
    return {
      mode: ["automatic", "day", "night"].includes(options.mode) ? options.mode : "automatic",
      dayStartHour: bounded(options.dayStartHour, 7, 0, 23.99),
      nightStartHour: bounded(options.nightStartHour, 19, 0, 23.99),
      transitionSeconds: bounded(options.transitionSeconds, 8, 0, 60),
      volume: bounded(options.volume, 35, 0, 100)
    };
  }

  function phaseAt(date, options) {
    var settings = normalize(options);
    if (settings.mode !== "automatic") return settings.mode;
    var minute = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
    var start = Math.round(settings.dayStartHour * 60);
    var end = Math.round(settings.nightStartHour * 60);
    // Equal boundaries explicitly mean day all day; fixed night is available in Mode.
    if (start === end) return "day";
    var day = start < end ? minute >= start && minute < end : minute >= start || minute < end;
    return day ? "day" : "night";
  }

  function nextBoundary(date, options) {
    var settings = normalize(options);
    if (settings.mode !== "automatic" || Math.round(settings.dayStartHour * 60) === Math.round(settings.nightStartHour * 60)) return null;
    var candidates = [settings.dayStartHour, settings.nightStartHour].map(function (hour) {
      var next = new Date(date.getTime());
      var minutes = Math.round(hour * 60);
      next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      if (next <= date) {
        // Advance the calendar date, not 24 elapsed hours: local DST days vary in length.
        next.setDate(next.getDate() + 1);
        next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      }
      return next;
    });
    return candidates[0] < candidates[1] ? candidates[0] : candidates[1];
  }

  function smoothstep(progress) {
    var p = Math.min(1, Math.max(0, progress));
    return p * p * (3 - 2 * p);
  }

  function audioGains(nightMix, volume) {
    var mix = Math.min(1, Math.max(0, nightMix));
    var level = bounded(volume, 35, 0, 100) / 100;
    return {
      day: mix === 1 ? 0 : Math.cos(mix * Math.PI / 2) * level,
      night: mix === 0 ? 0 : Math.sin(mix * Math.PI / 2) * level
    };
  }

  return { normalize: normalize, phaseAt: phaseAt, nextBoundary: nextBoundary, smoothstep: smoothstep, audioGains: audioGains };
});
