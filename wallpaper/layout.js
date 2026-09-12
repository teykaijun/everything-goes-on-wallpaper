(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ArenaLayout = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  var ASPECT = 16 / 9;
  var GROUND = {
    topLeft: { x: .32, y: .25 }, topRight: { x: .68, y: .25 },
    bottomLeft: { x: .27, y: .66 }, bottomRight: { x: .72, y: .66 }
  };

  function finiteSize(value) {
    var number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 1;
  }
  function clamp(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }
  function interpolate(a, b, amount) { return a + (b - a) * amount; }

  function getArenaRect(viewWidth, viewHeight) {
    var width = finiteSize(viewWidth), height = finiteSize(viewHeight);
    var portrait = height > width;
    // Portrait preserves the entire playable board. The outer room is cropped,
    // while the source's top and bottom dissolve into the sampled atmosphere.
    var sceneWidth = portrait ? width * 1.65 : Math.min(width, height * ASPECT);
    var sceneHeight = sceneWidth / ASPECT;
    return {
      x: portrait ? width * .5 - sceneWidth * .49 : (width - sceneWidth) / 2,
      y: portrait ? height * .52 - sceneHeight * .5 : (height - sceneHeight) / 2,
      width: sceneWidth,
      height: sceneHeight,
      orientation: portrait ? "portrait" : "landscape"
    };
  }

  function groundToSource(u, v) {
    u = clamp(u); v = clamp(v);
    var left = interpolate(GROUND.topLeft.x, GROUND.bottomLeft.x, v);
    var right = interpolate(GROUND.topRight.x, GROUND.bottomRight.x, v);
    return { x: interpolate(left, right, u), y: interpolate(GROUND.topLeft.y, GROUND.bottomLeft.y, v) };
  }

  function groundToScreen(u, v, viewWidth, viewHeight) {
    var point = groundToSource(u, v), rect = getArenaRect(viewWidth, viewHeight);
    return {
      x: rect.x + point.x * rect.width,
      y: rect.y + point.y * rect.height,
      // Scale relative to the 2560px source, with restrained depth perspective.
      scale: rect.width / 2560 * interpolate(.88, 1.08, clamp(v))
    };
  }

  function create(options) {
    options = options || {};
    var doc = options.document || document;
    var host = options.window || window;
    var root = doc.documentElement;
    var canvas = options.canvas || doc.getElementById("ambient");
    var day = options.day || doc.getElementById("day");
    var night = options.night || doc.getElementById("night");
    var getState = options.getState || function () { return { nightMix: 0, paused: false }; };
    var context = canvas && canvas.getContext("2d", { alpha: false });
    var frame = 0, stopped = false, disposed = false, lastDraw = -Infinity, rect;
    var viewportWidth = 1, viewportHeight = 1;
    var atmosphere = doc.getElementById("atmosphere");
    var createdAtmosphere = !atmosphere;
    if (!atmosphere) {
      atmosphere = doc.createElement("div");
      atmosphere.id = "atmosphere";
      atmosphere.setAttribute("aria-hidden", "true");
      doc.getElementById("arena").appendChild(atmosphere);
    }

    function setMix(mix) {
      root.style.setProperty("--night-mix", String(clamp(mix)));
    }

    function resize() {
      viewportWidth = finiteSize(host.innerWidth);
      viewportHeight = finiteSize(host.innerHeight);
      rect = options.sceneMode === "study" ? { x:0, y:0, width:viewportWidth, height:viewportHeight, orientation:"portrait" } : getArenaRect(viewportWidth, viewportHeight);
      root.dataset.orientation = rect.orientation;
      root.style.setProperty("--arena-x", rect.x + "px");
      root.style.setProperty("--arena-y", rect.y + "px");
      root.style.setProperty("--arena-width", rect.width + "px");
      root.style.setProperty("--arena-height", rect.height + "px");
      if (canvas) {
        // At most 320 pixels on the short axis; a blurred light wash needs no 2K redraw.
        var ratio = Math.min(1, 320 / Math.min(viewportWidth, viewportHeight));
        canvas.width = Math.round(viewportWidth * ratio);
        canvas.height = Math.round(viewportHeight * ratio);
      }
      lastDraw = -Infinity;
      draw();
    }

    function drawVideo(video, opacity) {
      if (!video || video.readyState < 2 || !video.videoWidth || opacity <= 0) return false;
      var width = canvas.width, height = canvas.height;
      var scale = Math.max(width / video.videoWidth, height / video.videoHeight);
      var imageWidth = video.videoWidth * scale, imageHeight = video.videoHeight * scale;
      context.globalAlpha = opacity;
      context.drawImage(video, (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight);
      return true;
    }

    function draw() {
      if (disposed) return;
      var state = getState() || {}, mix = clamp(state.nightMix);
      setMix(mix);
      if (!context || options.sceneMode === "study") return;
      // Use the already decoded videos; no extra media instances or soundtracks.
      context.globalAlpha = 1;
      context.fillStyle = mix > .5 ? "#181636" : "#513d39";
      context.fillRect(0, 0, canvas.width, canvas.height);
      drawVideo(day, 1);
      drawVideo(night, mix);
      context.globalAlpha = 1;
    }

    function tick(now) {
      frame = 0;
      if (disposed || stopped) return;
      var state = getState() || {};
      if (!state.paused && now - lastDraw >= 125) {
        // The wash changes slowly, so 8fps is sufficient even for a 30fps arena.
        draw();
        lastDraw = now;
      }
      frame = host.requestAnimationFrame(tick);
    }

    function setPaused(value) {
      stopped = Boolean(value);
      atmosphere.style.animationPlayState = stopped ? "paused" : "running";
      root.dataset.scenePaused = String(stopped);
      if (stopped) { host.cancelAnimationFrame(frame); frame = 0; }
      else if (!frame && !disposed && options.sceneMode !== "study") {
        lastDraw = -Infinity;
        frame = host.requestAnimationFrame(tick);
      }
    }

    function destroy() {
      disposed = true;
      host.cancelAnimationFrame(frame);
      host.removeEventListener("resize", resize);
      if (createdAtmosphere) atmosphere.remove();
    }

    host.addEventListener("resize", resize);
    resize();
    setPaused(Boolean((getState() || {}).paused));
    return { resize: resize, setPaused: setPaused, setMix: setMix, draw: draw, destroy: destroy, getRect: function () { return Object.assign({}, rect); } };
  }

  return { sourceAspect: ASPECT, ground: GROUND, getArenaRect: getArenaRect, groundToSource: groundToSource, groundToScreen: groundToScreen, create: create };
});