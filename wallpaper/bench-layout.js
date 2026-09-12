(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BenchLayout = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  var SOURCE_WIDTH = 2560, SOURCE_HEIGHT = 1440;
  var ICON_SIZE = 48, CELL_WIDTH = 75, CELL_HEIGHT = 98;
  var TOP_CENTERS = [812, 930, 1048, 1166, 1284, 1402, 1520, 1638, 1756];
  var BOTTOM_CENTERS = [560, 718, 876, 1034, 1192, 1350, 1508, 1666, 1824];

  function rectangle(left, top, width, height) {
    return { x: left, y: top, width: width, height: height,
      left: left, top: top, right: left + width, bottom: top + height };
  }

  function computeLayout(width, height) {
    width = Number(width); height = Number(height);
    if (!Number.isFinite(width) || width <= 0) width = 1;
    if (!Number.isFinite(height) || height <= 0) height = 1;
    var scale = Math.min(width / SOURCE_WIDTH, height / SOURCE_HEIGHT);
    var view = { width: width, height: height, scale: scale,
      x: (width - SOURCE_WIDTH * scale) / 2,
      y: (height - SOURCE_HEIGHT * scale) / 2,
      orientation: height > width ? "portrait" : "landscape" };
    var battlefield = rectangle(view.x + 480 * scale, view.y + 250 * scale, 1540 * scale, 720 * scale);
    // Reserve the physical Windows taskbar and retain physical icon/label size.
    var workArea = rectangle(0, 0, width, Math.max(0, height - 48));
    var slots = [];
    if (view.orientation === "portrait" || width < 1524 || scale < .6) {
      return { view: view, battlefield: battlefield, workArea: workArea, slots: slots, supported: false };
    }

    var compact = scale < 1;
    function add(band, sourceRow, sourceCol, nativeX, nativeY, indexInBand) {
      var centerX = view.x + nativeX * scale;
      var iconY = view.y + nativeY * scale;
      var row = sourceRow, col = sourceCol;
      if (compact && band === "top") {
        // At 1080p two 98px label rows cannot fit above the battlefield.
        // Spread the upper group along one perimeter row instead.
        row = 0; col = indexInBand;
        centerX = width / 2 + (indexInBand - 8.5) * 82;
        iconY = Math.max(8, battlefield.top - CELL_HEIGHT - 24);
      } else if (compact) {
        row = Math.floor(indexInBand / 11); col = indexInBand % 11;
        centerX = view.x + (560 + (1824 - 560) * col / 10) * scale;
        iconY = battlefield.bottom + 22 + row * 108;
      }
      centerX = Math.round(centerX); iconY = Math.round(iconY);
      slots.push({ id: "bench-" + band + "-col-" + sourceCol + "-row-" + sourceRow,
        band: band, row: row, col: col, centerX: centerX,
        iconX: centerX - ICON_SIZE / 2, iconY: iconY, iconSize: ICON_SIZE,
        rect: rectangle(centerX - CELL_WIDTH / 2, iconY, CELL_WIDTH, CELL_HEIGHT) });
    }
    [22, 130].forEach(function (y, row) {
      TOP_CENTERS.forEach(function (x, col) { add("top", row, col, x, y, row * 9 + col); });
    });
    [1000, 1110].forEach(function (y, row) {
      BOTTOM_CENTERS.forEach(function (x, col) { add("bottom", row, col, x, y, row * 9 + col); });
    });
    [3, 4, 5, 6].forEach(function (col, index) {
      add("bottom", 2, col, BOTTOM_CENTERS[col], 1220, 18 + index);
    });
    return { view: view, battlefield: battlefield, workArea: workArea, slots: slots, supported: true };
  }

  function getIconSlots(width, height) { return computeLayout(width, height).slots; }
  return { computeLayout: computeLayout, getIconSlots: getIconSlots,
    ICON_SIZE: ICON_SIZE, CELL_WIDTH: CELL_WIDTH, CELL_HEIGHT: CELL_HEIGHT };
});

