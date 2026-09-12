const test = require('node:test');
const assert = require('node:assert/strict');
const classroom = require('../classroom.js');
const bench = require('../bench-layout.js');

function pointInside(point, rect, pad=0) { return point.x>rect.left-pad && point.x<rect.right+pad && point.y>rect.top-pad && point.y<rect.bottom+pad; }

function fakeDom(state={nightMix:0,paused:true}) {
 const events=[];
 function element() {
  const properties={};
  return {style:{setProperty(k,v){properties[k]=v;},getPropertyValue(k){return properties[k];}},dataset:{},classList:{add(){}},children:[],setAttribute(){},appendChild(child){this.children.push(child);},remove(){}};
 }
 const arena=element(),doc={createElement:element,getElementById(){return arena;},body:arena};
 const host={innerWidth:2560,innerHeight:1440,document:doc,requestAnimationFrame(){return 1;},cancelAnimationFrame(){},addEventListener(){},removeEventListener(){},dispatchEvent(event){events.push(event);},CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail;}}};
 const instance=classroom.create({window:host,document:doc,getState:()=>state});
 return {instance,host,state,events,element:arena.children[0]};
}

test('daytime furniture has 24 distinct student desks in four perspective rows',()=>{
 const scene=classroom.computeLayout(2560,1440);
 assert.equal(scene.desks.length,24);assert.equal(scene.obstacles.length,24);
 assert.equal(new Set(scene.desks.map(d=>d.profile.id)).size,24);
 assert.equal(new Set(scene.desks.map(d=>JSON.stringify(d.profile))).size,24);
 scene.desks.forEach((desk,i)=>{
  assert.equal(desk.row,Math.floor(i/6));assert.equal(desk.col,i%6);
  assert.equal(desk.footY,400+170*desk.row);assert.equal(desk.width,164+8*desk.row);
  assert.equal(desk.zIndex,Math.round(desk.footY)+10);
  assert.ok(desk.profile.bagColor&&desk.profile.bookColor&&desk.profile.belongings);
 });
 assert.equal(scene.desks[0].centerX,730);assert.equal(scene.desks[23].centerX,1830);
 assert.equal(scene.desks[18].centerX,700);
 for(const desk of scene.desks)assert.ok(desk.centerX+desk.width/2<=1924);
 assert.ok(scene.desks.some(d=>d.profile.bagShape==='round'));
 assert.equal(scene.desks.filter(d=>d.profile.belongings.includes('frog')).length,1);
});

test('night removes all added furniture obstacles and desk visits while keeping the arena floor',()=>{
 const day=classroom.computeLayout(2560,1440,{nightMix:0}),night=classroom.computeLayout(2560,1440,{nightMix:1});
 assert.equal(day.desksActive,true);assert.equal(night.desksActive,false);
 assert.equal(classroom.deskOpacity(0),1);assert.equal(classroom.deskOpacity(.2),1);assert.equal(classroom.deskOpacity(.82),0);assert.equal(classroom.deskOpacity(1),0);
 assert.equal(night.obstacles.length,0);assert.equal(night.waypoints.filter(p=>p.kind==='desk').length,0);
 assert.equal(night.waypoints.filter(p=>p.kind==='poro').length,2);
 assert.deepEqual(day.polygon,night.polygon);assert.deepEqual(day.slots,night.slots);
 assert.ok(Math.abs(night.polygon[2].y-965)<1e-8);
});

test('furniture collision hysteresis avoids replanning on tiny theme changes',()=>{
 assert.equal(classroom.nextDeskState(true,.819),true);assert.equal(classroom.nextDeskState(true,.82),false);
 assert.equal(classroom.nextDeskState(false,.741),false);assert.equal(classroom.nextDeskState(false,.74),true);
 for(let i=0;i<=100;i++)assert.ok(classroom.deskOpacity(i/100)>=0&&classroom.deskOpacity(i/100)<=1);
 for(let i=1;i<=100;i++)assert.ok(classroom.deskOpacity(i/100)<=classroom.deskOpacity((i-1)/100));
});

test('portrait leaves the arena clear of classroom furniture and obstacles',()=>{
 const scene=classroom.computeLayout(1080,1920);
 for(const name of ['desks','slots','obstacles','waypoints','polygon'])assert.deepEqual(scene[name],[]);
 assert.equal(classroom.isIconPoint(400,700,1080,1920),false);
});

test('all navigation targets clear desks with a 20-source-pixel Lux collider',()=>{
 for(const [width,height] of [[1920,1080],[2560,1440],[3840,1440]]){
  const scene=classroom.computeLayout(width,height),padding=20*scene.view.scale;
  assert.equal(scene.waypoints.length,61);
  for(const point of scene.waypoints)for(const obstacle of scene.obstacles)assert.ok(!pointInside(point,obstacle.rect,padding),point.id+' is clear of '+obstacle.id);
 }
});

test('all route targets stay inside the battlefield above the front bench',()=>{
 const scene=classroom.computeLayout(2560,1440),[a,,b]=scene.polygon;
 for(const point of scene.waypoints)assert.ok(point.x>a.x&&point.x<b.x&&point.y>a.y&&point.y<b.y,point.id);
 assert.equal(scene.waypoints.filter(p=>p.kind==='desk').length,24);
 assert.equal(scene.waypoints.filter(p=>p.kind==='poro').length,2);
 for(const point of scene.waypoints.filter(p=>p.kind==='aisle'))for(const obstacle of scene.obstacles)assert.ok(point.y<obstacle.rect.top||point.y>obstacle.rect.bottom);
 for(const point of scene.waypoints.filter(p=>p.kind==='desk'))assert.equal(classroom.isIconPoint(point.x,point.y,2560,1440),false);
});

test('scenery visits face the real left-wall poros and individual tabletops',()=>{
 for(const [width,height] of [[2560,1440],[1920,1080],[3840,1440]]){
  const scene=classroom.computeLayout(width,height),s=scene.view.scale;
  const poros=scene.waypoints.filter(p=>p.kind==='poro');assert.equal(poros.length,2);
  for(const point of poros){
   const target=point.lookAt,nativeTarget={x:(target.x-scene.view.x)/s,y:(target.y-scene.view.y)/s};
   assert.ok(nativeTarget.x>=550&&nativeTarget.x<=640&&nativeTarget.y>=400&&nativeTarget.y<=730);
   assert.ok(point.x>target.x);
   const reach=Math.hypot(point.x-target.x,point.y-target.y)/s;
   assert.ok(reach>40&&reach<120,'Lux stops beside the poro');
  }
  for(const point of scene.waypoints.filter(p=>p.kind==='desk')){
   const desk=scene.desks.find(d=>d.id===point.deskId);
   assert.ok(pointInside(point.lookAt,desk.tabletopRect),'the desk emote faces its tabletop');
  }
 }
});

test('theme topology changes emit once with clear day/night collision data',()=>{
 const dom=fakeDom(),scene=dom.instance;dom.events.length=0;
 scene.setMix(.4);scene.setMix(.819);assert.equal(dom.events.length,0);
 scene.setMix(.82);assert.equal(dom.events.length,1);
 assert.equal(dom.element.style.getPropertyValue('--desk-opacity'),'0');
 assert.equal(scene.getObstacles().length,0);assert.equal(scene.getWaypoints().filter(p=>p.kind==='desk').length,0);
 assert.equal(dom.events[0].detail.navigationChanged,true);assert.equal(dom.events[0].detail.viewportChanged,false);assert.equal(dom.events[0].detail.desksActive,false);
 scene.setMix(.81);scene.setMix(.75);assert.equal(dom.events.length,1);
 scene.setMix(.74);assert.equal(dom.events.length,2);assert.equal(scene.getObstacles().length,24);assert.equal(dom.events[1].detail.desksActive,true);
 scene.destroy();
});

test('disabling desks preserves open-floor navigation and independent icon slots',()=>{
 const dom=fakeDom(),scene=dom.instance,slots=scene.getIconSlots(),polygon=scene.getWalkablePolygon();
 scene.setEnabled(false);
 assert.equal(scene.getObstacles().length,0);assert.equal(scene.getLayout().desks.length,0);
 assert.equal(scene.getWaypoints().filter(p=>p.kind==='desk').length,0);assert.equal(scene.getWaypoints().filter(p=>p.kind==='poro').length,2);
 assert.deepEqual(scene.getIconSlots(),slots);assert.deepEqual(scene.getWalkablePolygon(),polygon);
 scene.destroy();
});



test('all 40 icon anchors belong to the independent benches and stay fixed at night',()=>{
 for(const [width,height] of [[1920,1080],[2560,1440],[3840,1440]]){
  const day=classroom.computeLayout(width,height),night=classroom.computeLayout(width,height,{nightMix:1});
  assert.equal(day.slots.length,40);assert.deepEqual(day.slots,bench.getIconSlots(width,height));assert.deepEqual(day.slots,night.slots);
  for(const slot of day.slots){
   assert.equal(slot.iconSize,48);assert.equal(slot.iconX+24,slot.centerX);
   assert.equal(classroom.isIconPoint(slot.iconX+24,slot.iconY+24,width,height),true);
   assert.ok(!day.desks.some(d=>d.id===slot.id),'icons have no classroom desk dependency');
  }
 }
});


test('the tightened classroom keeps every standing target reachable for a larger Lux',()=>{
 const motion=require('../lux-motion.js'),scene=classroom.computeLayout(2560,1440);
 const options={polygon:scene.polygon,obstacles:scene.obstacles,waypoints:scene.waypoints,padding:20};
 const environment=motion.environment(options),from={x:1280,y:850};
 for(const target of scene.waypoints){
  const path=motion.findPath(from,target,options);
  assert.ok(path,'reachable route to '+target.id);
  for(let i=1;i<path.length;i++)assert.equal(motion.clearSegment(path[i-1],path[i],environment),true,'clear route to '+target.id);
 }
});
