const test = require('node:test');
const assert = require('node:assert/strict');
const bench = require('../bench-layout.js');
const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

test('the primary 2K display has 40 individual icons grouped around the native benches', () => {
  const { slots } = bench.computeLayout(2560, 1440);
  assert.equal(slots.length, 40);
  assert.equal(slots.filter(s => s.band === 'top').length, 18);
  assert.equal(slots.filter(s => s.band === 'bottom').length, 22);
  assert.deepEqual(slots.slice(0, 9).map(s => s.centerX), [812,930,1048,1166,1284,1402,1520,1638,1756]);
  assert.deepEqual([...new Set(slots.map(s => s.iconY))], [22,130,1000,1110,1220]);
  assert.equal(new Set(slots.map(s => s.id)).size, 40);
  assert.equal(new Set(slots.map(s => `${s.iconX},${s.iconY}`)).size, 40);
});

test('icons and complete label cells clear the battlefield, each other and the taskbar', () => {
  for (const [width,height] of [[1920,1080],[2560,1440],[3840,1440],[3840,2160],[1600,900]]) {
    const { slots, battlefield, workArea } = bench.computeLayout(width,height);
    assert.equal(slots.length, 40);
    for (let i=0;i<slots.length;i++) {
      const { rect, iconX, iconY, iconSize, id } = slots[i];
      assert.equal(iconSize,48); assert.equal(rect.width,75); assert.equal(rect.height,98);
      assert.ok(rect.left >= workArea.left && rect.right <= workArea.right && rect.top >= workArea.top && rect.bottom <= workArea.bottom, `${width}×${height}: ${id} keeps its label in the primary work area`);
      assert.ok(iconX >= rect.left && iconX+iconSize <= rect.right && iconY >= rect.top && iconY+iconSize <= rect.bottom);
      assert.ok(!overlaps(rect,battlefield), `${width}×${height}: ${id} clears the battlefield`);
      for (let j=0;j<i;j++) assert.ok(!overlaps(rect,slots[j].rect), `${width}×${height}: ${id} clears ${slots[j].id}`);
    }
  }
});

test('theme cannot move icon anchors and layout results do not share mutable slot objects', () => {
  const day = bench.getIconSlots(2560,1440);
  assert.deepEqual(day,bench.getIconSlots(2560,1440));
  assert.deepEqual(day.map(s=>s.id),bench.getIconSlots(1920,1080).map(s=>s.id));
  day[0].iconX=999; day[0].rect.left=999;
  assert.equal(bench.getIconSlots(2560,1440)[0].iconX,788);
  assert.equal(bench.getIconSlots(2560,1440)[0].rect.left,774.5);
});

test('portrait and undersized viewports do not receive desktop icon slots', () => {
  for (const size of [[1080,1920],[1440,2560],[800,600],[0,0],[NaN,Infinity]]) {
    assert.deepEqual(bench.getIconSlots(...size),[]);
    assert.equal(bench.computeLayout(...size).supported,false);
  }
});
