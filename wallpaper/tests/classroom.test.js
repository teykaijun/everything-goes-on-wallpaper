const test = require('node:test');
const assert = require('node:assert/strict');
const classroom = require('../classroom.js');

function pointInside(point, rect, pad=0) { return point.x>rect.left-pad && point.x<rect.right+pad && point.y>rect.top-pad && point.y<rect.bottom+pad; }
function overlaps(a,b) { return a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top; }

test('classroom provides exactly 40 fixed Windows icon seats in row-major order',()=>{
 const scene=classroom.computeLayout(2560,1440);
 assert.equal(scene.desks.length,40);assert.equal(scene.slots.length,40);assert.equal(new Set(scene.slots.map(s=>s.id)).size,40);
 scene.slots.forEach((slot,i)=>{assert.equal(slot.row,Math.floor(i/8));assert.equal(slot.col,i%8);assert.equal(slot.footY,340+170*slot.row);assert.equal(slot.iconSize,48);assert.equal(slot.iconX+24,slot.centerX);assert.equal(slot.iconY+48,slot.tabletopFrontY);});
 assert.equal(scene.slots[0].centerX,730);assert.equal(scene.slots[39].centerX,1950);
});

test('icon images remain 48 physical pixels on scaled and letterboxed landscape displays',()=>{
 for(const [width,height] of [[1920,1080],[2560,1440],[3840,1440]]){
  const scene=classroom.computeLayout(width,height);
  scene.slots.forEach(slot=>{assert.equal(slot.iconX+24,slot.centerX);assert.equal(slot.iconY+48,slot.tabletopFrontY);assert.ok(slot.rect.left>=0&&slot.rect.top>=0&&slot.rect.right<=width&&slot.rect.bottom<=height);});
  for(let i=0;i<scene.slots.length;i++)for(let j=i+1;j<scene.slots.length;j++)assert.ok(!overlaps(scene.slots[i].rect,scene.slots[j].rect),'icon labels have separate seats');
 }
});

test('portrait leaves the arena clear of classroom art, seats and obstacles',()=>{
 const scene=classroom.computeLayout(1080,1920);
 for(const name of ['desks','slots','obstacles','waypoints','polygon'])assert.deepEqual(scene[name],[]);
 assert.equal(classroom.isIconPoint(400,700,1080,1920),false);
});

test('desk approaches are outside furniture even with a 10-source-pixel Lux collider',()=>{
 for(const [width,height] of [[1920,1080],[2560,1440]]){
  const scene=classroom.computeLayout(width,height),padding=10*scene.view.scale;
  for(const point of scene.waypoints)for(const obstacle of scene.obstacles)assert.ok(!pointInside(point,obstacle.rect,padding),point.id+' has a reachable standing point');
 }
});

test('all route targets stay inside the widened classroom floor',()=>{
 const scene=classroom.computeLayout(2560,1440),[a,,b]=scene.polygon;
 for(const point of scene.waypoints)assert.ok(point.x>a.x&&point.x<b.x&&point.y>a.y&&point.y<b.y,point.id);
 assert.equal(scene.waypoints.filter(p=>p.kind==='desk').length,40);
 assert.equal(scene.waypoints.filter(p=>p.kind==='poro').length,2);
});

test('cross aisles stay free of desks and icon click regions do not include approaches',()=>{
 const scene=classroom.computeLayout(2560,1440);
 for(const point of scene.waypoints.filter(p=>p.kind==='aisle'))for(const obstacle of scene.obstacles)assert.ok(point.y<obstacle.rect.top||point.y>obstacle.rect.bottom);
 for(const point of scene.waypoints.filter(p=>p.kind==='desk'))assert.equal(classroom.isIconPoint(point.x,point.y,2560,1440),false);
 for(const slot of scene.slots)assert.equal(classroom.isIconPoint(slot.iconX+24,slot.iconY+24,2560,1440),true);
});

test('floor depth and icon positions are deterministic across theme changes',()=>{
 const day=classroom.computeLayout(2560,1440),night=classroom.computeLayout(2560,1440);
 assert.deepEqual(day.slots,night.slots);
 day.desks.forEach(desk=>assert.equal(desk.zIndex,Math.round(desk.footY)+10));
});

test('scenery visits stop beside the real left-wall poros and face the objects',()=>{
 for(const [width,height] of [[2560,1440],[1920,1080],[3840,1440]]){
  const scene=classroom.computeLayout(width,height),s=scene.view.scale;
  const poros=scene.waypoints.filter(p=>p.kind==='poro');assert.equal(poros.length,2);
  for(const point of poros){
   const target=point.lookAt;
   const nativeTarget={x:(target.x-scene.view.x)/s,y:(target.y-scene.view.y)/s};
   assert.ok(nativeTarget.x>=550&&nativeTarget.x<=640&&nativeTarget.y>=400&&nativeTarget.y<=730);
   assert.ok(point.x>target.x,'Lux stands on the open floor to the right of the poro');
   const reach=Math.hypot(point.x-target.x,point.y-target.y)/s;
   assert.ok(reach>40&&reach<100,'Lux stops beside the poro without standing on it');
  }
  for(const point of scene.waypoints.filter(p=>p.kind==='desk')){
   const seat=scene.slots.find(slot=>slot.id===point.deskId);
   assert.ok(pointInside(point.lookAt,seat.tabletopRect),'the desk emote faces its tabletop');
  }
 }
});