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

test('daytime seating matches the TFT screenshot with twenty individual places',()=>{
 const scene=classroom.computeLayout(2560,1440);
 assert.equal(scene.desks.length,20);assert.equal(scene.obstacles.length,20);
 assert.equal(new Set(scene.desks.map(d=>d.profile.id)).size,20);
 assert.equal(new Set(scene.desks.map(d=>JSON.stringify(d.profile))).size,20);
 scene.desks.forEach((desk,i)=>{
  assert.equal(desk.row,Math.floor(i/5));assert.equal(desk.col,i%5);
  assert.equal(desk.zIndex,Math.round(desk.footY)+10);
  assert.ok(desk.profile.belongings,'each seat retains personal belongings');
  assert.ok(Number.isFinite(desk.rotation)&&Math.abs(desk.rotation)<=6);
  assert.ok(desk.artBounds.left>=665&&desk.artBounds.right<=1850,'furniture clears the poros and right wall');
  assert.ok(desk.artBounds.top>=235&&desk.artBounds.bottom<=945,'furniture stays between the bench icon bands');
 });
 const rows=[0,1,2,3].map(row=>scene.desks.filter(d=>d.row===row));
 for(const row of rows){
  assert.equal(row.length,5);
  assert.ok(row[0].light>row[4].light,'window-side furniture receives more light');
  assert.ok(Math.abs(row[2].tabletopCenter.x-1257)<3,'the middle column follows the arena vanishing line');
 }
 for(let row=1;row<rows.length;row++){
  assert.ok(rows[row][2].width>rows[row-1][2].width,'foreground furniture is larger');
  assert.ok(rows[row][4].tabletopCenter.x-rows[row][0].tabletopCenter.x>rows[row-1][4].tabletopCenter.x-rows[row-1][0].tabletopCenter.x,'the five columns spread toward the viewer');
  assert.ok(Math.min(...rows[row].map(d=>d.footY))>Math.max(...rows[row-1].map(d=>d.footY)));
 }
 // Independent scene landmarks register the screenshot's back-left and
 // front-right seats to these positions; raw image scaling does not.
 const back=rows[0][0],front=rows[3][4];
 assert.ok(Math.abs(back.tabletopCenter.x-863)<2&&Math.abs(back.tabletopCenter.y-275)<2);
 assert.ok(Math.abs(front.tabletopCenter.x-1731)<2&&Math.abs(front.tabletopCenter.y-783)<2);
 assert.ok(Math.abs(back.desktopWidth-103)<3&&Math.abs(front.desktopWidth-127)<3,'desktop sizes match the registered reference');
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
  assert.equal(scene.waypoints.length,52);
  for(const point of scene.waypoints)for(const obstacle of scene.obstacles)assert.ok(!pointInside(point,obstacle.rect,padding),point.id+' is clear of '+obstacle.id);
 }
});

test('all route targets stay inside the battlefield above the front bench',()=>{
 const scene=classroom.computeLayout(2560,1440),[a,,b]=scene.polygon;
 for(const point of scene.waypoints)assert.ok(point.x>a.x&&point.x<b.x&&point.y>a.y&&point.y<b.y,point.id);
 assert.equal(scene.waypoints.filter(p=>p.kind==='desk').length,20);
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
 scene.setMix(.74);assert.equal(dom.events.length,2);assert.equal(scene.getObstacles().length,20);assert.equal(dom.events[1].detail.desksActive,true);
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


test('the twenty-seat classroom keeps every standing target reachable for a larger Lux',()=>{
 const motion=require('../lux-motion.js'),scene=classroom.computeLayout(2560,1440);
 const options={polygon:scene.polygon,obstacles:scene.obstacles,waypoints:scene.waypoints,padding:20};
 const environment=motion.environment(options),from=scene.waypoints.find(p=>p.id==='aisle-3-3');
 for(const target of scene.waypoints){
  const path=motion.findPath(from,target,options);
  assert.ok(path,'reachable route to '+target.id);
  for(let i=1;i<path.length;i++)assert.equal(motion.clearSegment(path[i-1],path[i],environment),true,'clear route to '+target.id);
 }
});
