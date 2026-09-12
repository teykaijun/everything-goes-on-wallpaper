(function () {
  "use strict";
  var schedule = window.WallpaperSchedule;
  var config = window.WALLPAPER_CONFIG || {};
  var settings = schedule.normalize(config);
  var phases = ["day", "night"];
  var videos = { day: document.getElementById("day"), night: document.getElementById("night") };
  var audio = { day: document.getElementById("day-audio"), night: document.getElementById("night-audio") };
  var separateAudio = config.audioMode === "separate";
  var preview = new URLSearchParams(window.location.search).get("preview") === "1";
  var active = null;
  var pending = null;
  var mix = schedule.phaseAt(new Date(), settings) === "night" ? 1 : 0;
  var generation = 0;
  var frame = 0;
  var livelyPaused = false;
  var hidden = document.hidden;
  var browserMuted = false;
  var pageHidden = false;
  var playAttempts = new WeakMap();
  var lastCheck = Date.now();
  var status = document.getElementById("media-status");
  var sceneLayout = null;
  var lux = null;
  var luxSettings = { enabled: config.luxEnabled !== false, size: Number(config.luxSize) || 100, speed: Number(config.luxSpeed) || 100 };

  function syncEffects() {
    if (sceneLayout) { sceneLayout.setPaused(paused()); sceneLayout.setMix(mix); }
    if (lux) lux.setPaused(paused());
  }

  phases.forEach(function (phase) {
    var video = videos[phase];
    video.volume = 0;
    video.muted = separateAudio;
    var sources = config[phase + "Sources"] || ["media/" + phase + ".webm", "media/" + phase + ".mp4"];
    sources.forEach(function (path) {
      var source = document.createElement("source");
      source.src = path;
      source.type = /\.webm(?:$|\?)/i.test(path) ? "video/webm" : "video/mp4";
      video.appendChild(source);
    });
    if (separateAudio) audio[phase].src = config[phase + "Audio"] || "media/" + phase + ".ogg";
    audio[phase].volume = 0;
    video.addEventListener("error", function () {
      report("The " + phase + " video could not load. Check the files in the media folder.");
    });
  });

  function report(message) {
    status.textContent = message;
    if (message) console.warn("[Everything Goes On] " + message);
  }

  function paused() { return livelyPaused || hidden || pageHidden; }

  function render() {
    // An opaque day layer under a fading night layer avoids a dip to black at midfade.
    videos.day.style.opacity = "1";
    videos.night.style.opacity = String(mix);
    if (sceneLayout) sceneLayout.setMix(mix);
    var gains = schedule.audioGains(mix, settings.volume);
    phases.forEach(function (phase) {
      videos[phase].volume = separateAudio ? 0 : gains[phase];
      videos[phase].muted = separateAudio || browserMuted;
      audio[phase].volume = separateAudio ? gains[phase] : 0;
      audio[phase].muted = browserMuted;
    });
  }

  function pausePhase(phase) {
    videos[phase].pause();
    audio[phase].pause();
    playAttempts.delete(videos[phase]);
    playAttempts.delete(audio[phase]);
  }

  function cancelFade() {
    generation += 1;
    cancelAnimationFrame(frame);
    pending = null;
  }

  function playElement(element) {
    // paused becomes false before play() resolves. Share the pending promise so rapid
    // property updates cannot reveal a video whose first frame has not arrived yet.
    if (playAttempts.has(element)) return playAttempts.get(element);
    if (!element.paused) return Promise.resolve();
    var attempt = (async function () {
      try {
        await element.play();
      } catch (error) {
        if (error.name !== "NotAllowedError") throw error;
        // Browsers need a gesture for sound. Lively normally permits it automatically.
        browserMuted = true;
        render();
        document.getElementById("enable-audio").textContent = "Enable soundtrack";
        document.getElementById("enable-audio").hidden = false;
        await element.play();
      }
    })().finally(function () {
      if (playAttempts.get(element) === attempt) playAttempts.delete(element);
    });
    playAttempts.set(element, attempt);
    return attempt;
  }

  function phaseNeeded(phase) {
    return !paused() && (phase === active || phase === pending || (pending && mix > 0 && mix < 1));
  }

  function cleanupStalePhase(phase) {
    if (!phaseNeeded(phase)) pausePhase(phase);
  }

  function startAudio(phase) {
    if (!separateAudio) return;
    // Audio has its own full-length loop. A missing or slow soundtrack must not
    // keep an otherwise playable arena video hidden indefinitely.
    playElement(audio[phase]).then(function () {
      cleanupStalePhase(phase);
    }, function (error) {
      if (phaseNeeded(phase) && error.name !== "AbortError") {
        if (error.name === "NotAllowedError") {
          // Some browsers also block muted audio. Keep this distinct from an
          // unavailable file: a user gesture can enable the valid soundtrack.
          status.textContent = "Click Enable soundtrack to allow audio in this browser.";
          document.getElementById("enable-audio").textContent = "Enable soundtrack";
          document.getElementById("enable-audio").hidden = false;
          return;
        }
        report("The " + phase + " soundtrack could not load. Check its local audio file.");
        document.getElementById("enable-audio").textContent = "Retry soundtrack";
        document.getElementById("enable-audio").hidden = false;
      }
    });
  }

  async function startPhase(phase, request) {
    await playElement(videos[phase]);
    if (request !== generation || paused()) {
      cleanupStalePhase(phase);
      return;
    }
    startAudio(phase);
  }

  async function changePhase(target, immediate) {
    cancelFade();
    var request = generation;
    pending = target;
    var destination = target === "night" ? 1 : 0;
    if (active === null) mix = destination;
    render();
    try {
      await startPhase(target, request);
    } catch (error) {
      if (request === generation) {
        pending = null;
        if (active !== null) {
          mix = active === "night" ? 1 : 0;
          render();
        }
        phases.forEach(cleanupStalePhase);
        if (error.name !== "AbortError") report("The " + target + " video is unavailable or its codec is unsupported.");
      }
      return;
    }
    if (request !== generation || paused()) return;
    var origin = mix;
    var duration = immediate || active === null ? 0 : settings.transitionSeconds * 1000;
    var started = performance.now();

    function advance(now) {
      if (request !== generation || paused()) return;
      var progress = duration === 0 ? 1 : Math.min(1, (now - started) / duration);
      mix = origin + (destination - origin) * schedule.smoothstep(progress);
      render();
      if (progress < 1) frame = requestAnimationFrame(advance);
      else {
        active = target;
        pending = null;
        pausePhase(target === "day" ? "night" : "day");
        updatePreview();
      }
    }
    advance(started);
  }

  function reconcile(immediate) {
    if (paused()) return;
    var target = schedule.phaseAt(new Date(), settings);
    if (pending === target && !immediate) return;
    if (active === target && pending === null && !immediate && !videos[target].paused) return;
    changePhase(target, Boolean(immediate));
  }

  function updatePreview() {
    if (!preview) return;
    var now = new Date();
    var phase = schedule.phaseAt(now, settings);
    document.getElementById("clock").textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    document.getElementById("phase-label").textContent = (phase === "day" ? "Daylight" : "Nightfall") + (settings.mode === "automatic" ? " · automatic" : " · fixed");
    document.getElementById("phase-dot").style.background = phase === "day" ? "#f0d1a1" : "#b4b7ef";
    document.getElementById("mode").value = settings.mode;
    document.getElementById("day-start").value = asTime(settings.dayStartHour);
    document.getElementById("night-start").value = asTime(settings.nightStartHour);
    document.getElementById("volume").value = settings.volume;
    document.getElementById("volume-value").textContent = Math.round(settings.volume) + "%";
    document.getElementById("transition").value = settings.transitionSeconds;
    document.getElementById("transition-value").textContent = settings.transitionSeconds + "s";
  }

  function asTime(hour) {
    var minutes = Math.round(hour * 60);
    return String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
  }

  function setProperty(name, value) {
    if (name === "luxEnabled" || name === "luxSize" || name === "luxSpeed") {
      if (name === "luxEnabled") luxSettings.enabled = value === true || value === "true" || value === 1;
      else if (name === "luxSize") luxSettings.size = Math.max(65, Math.min(160, Number(value) || 100));
      else luxSettings.speed = Math.max(50, Math.min(150, Number(value) || 100));
      if (lux) lux.configure(luxSettings);
      if (preview) { document.getElementById("lux-enabled").checked = luxSettings.enabled; document.getElementById("lux-size").value = luxSettings.size; }
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(settings, name)) return;
    if (name === "mode" && !["automatic", "day", "night"].includes(value)) {
      value = ["automatic", "day", "night"][Number(value)] || "automatic";
    }
    settings = schedule.normalize(Object.assign({}, settings, { [name]: value }));
    render();
    reconcile(false);
    updatePreview();
  }

  window.livelyPropertyListener = setProperty;
  window.livelyWallpaperPlaybackChanged = function (data) {
    try {
      var payload = typeof data === "string" ? JSON.parse(data) : data;
      if (!payload || typeof payload.IsPaused !== "boolean") return;
      livelyPaused = payload.IsPaused;
      syncEffects();
      if (livelyPaused) {
        cancelFade();
        phases.forEach(pausePhase);
      } else reconcile(true);
    } catch (error) { console.warn("Invalid Lively playback event", error); }
  };

  document.addEventListener("visibilitychange", function () {
    hidden = document.hidden;
    syncEffects();
    if (hidden) {
      cancelFade();
      phases.forEach(pausePhase);
    } else reconcile(true);
  });
  window.addEventListener("pageshow", function () { pageHidden = false; syncEffects(); reconcile(true); });
  window.addEventListener("focus", function () { reconcile(false); });
  window.addEventListener("pagehide", function () {
    pageHidden = true;
    syncEffects();
    cancelFade();
    phases.forEach(pausePhase);
  });

  // Check wall time independently of animation time. This catches sleep, clock changes,
  // time-zone changes and delayed timers; the first check after a long gap is immediate.
  setInterval(function () {
    var now = Date.now();
    var resumed = now - lastCheck > 15000 || now < lastCheck;
    lastCheck = now;
    syncEffects();
    reconcile(resumed);
    updatePreview();
  }, 1000);

  if (preview) {
    document.getElementById("preview-panel").hidden = false;
    document.getElementById("lux-enabled").addEventListener("change", function (event) { setProperty("luxEnabled", event.target.checked); });
    document.getElementById("lux-size").addEventListener("input", function (event) { setProperty("luxSize", event.target.value); });
    document.getElementById("mode").addEventListener("change", function (event) { setProperty("mode", event.target.value); });
    [["day-start", "dayStartHour"], ["night-start", "nightStartHour"]].forEach(function (entry) {
      document.getElementById(entry[0]).addEventListener("change", function (event) {
        var parts = event.target.value.split(":");
        if (parts.length === 2) setProperty(entry[1], Number(parts[0]) + Number(parts[1]) / 60);
      });
    });
    [["volume", "volume"], ["transition", "transitionSeconds"]].forEach(function (entry) {
      document.getElementById(entry[0]).addEventListener("input", function (event) { setProperty(entry[1], event.target.value); });
    });
    document.getElementById("enable-audio").addEventListener("click", function () {
      browserMuted = false;
      render();
      this.hidden = true;
      report("");
      // Invoke audio.play within the user gesture, including retries after a previous
      // failure. Reconcile alone can skip it when the corresponding video is playing.
      phases.forEach(function (phase) { if (phaseNeeded(phase)) startAudio(phase); });
      reconcile(false);
    });
  }

  // Read-only diagnostics for local smoke tests and the preview console.
  window.wallpaperState = function () {
    return { active: active, pending: pending, nightMix: mix, paused: paused(), browserMuted: browserMuted, settings: Object.assign({}, settings) };
  };
  if (window.ArenaLayout) sceneLayout = window.ArenaLayout.create({day: videos.day, night: videos.night, canvas: document.getElementById("ambient"), getState: function () { return {nightMix: mix, paused: paused()}; }});
  if (window.ChibiLux && sceneLayout) lux = window.ChibiLux.create({element: document.getElementById("lux-layer"), layout: sceneLayout, getState: function () { return {nightMix: mix, paused: paused()}; }, enabled: luxSettings.enabled, size: luxSettings.size, speed: luxSettings.speed});
  render();
  syncEffects();
  updatePreview();
  reconcile(true);
})();
