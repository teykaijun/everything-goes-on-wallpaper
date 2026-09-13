const test=require('node:test');
const assert=require('node:assert/strict');
const motion=require('../lux-motion.js');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const floor={x:0,y:0,width:1000,height:600};

test('straight movement uses constant stride speed, including the beginning and end',()=>{
  const nav=motion.createNavigator({position:{x:100,y:300},bounds:floor,speed:200,yaw:Math.PI/2});
  assert.equal(nav.setTarget({x:700,y:300}),true);
  for(let i=0;i<12;i++){
    const before=nav.snapshot();const state=nav.update(.25);
    close(state.x-before.x,50);close(state.y,300);
  }
  const end=nav.snapshot();close(end.x,700);assert.equal(end.moving,false);
});

test('Lux turns before walking and never slides sideways while turning',()=>{
  const nav=motion.createNavigator({position:{x:100,y:300},bounds:floor,speed:200,yaw:0});
  nav.setTarget({x:700,y:300});
  const turn=nav.update(.05);assert.equal(turn.phase,'turning');close(turn.x,100);
  for(let i=0;i<4;i++)nav.update(.05);
  assert.ok(nav.snapshot().x>100);
});

test('the path goes around inflated furniture footprints without crossing them',()=>{
  const obstacles=[{x:400,y:180,width:200,height:240}];
  const env=motion.environment({bounds:floor,obstacles,padding:12});
  const path=motion.findPath({x:100,y:300},{x:900,y:300},{bounds:floor,obstacles,padding:12});
  assert.ok(path&&path.length>2);
  for(let i=1;i<path.length;i++)assert.equal(motion.clearSegment(path[i-1],path[i],env),true);
  const nav=motion.createNavigator({position:{x:100,y:300},bounds:floor,obstacles,padding:12,speed:250});
  nav.setTarget({x:900,y:300});
  for(let i=0;i<300;i++)assert.equal(motion.isWalkable(nav.update(.025),env),true);
  close(nav.snapshot().x,900);close(nav.snapshot().y,300);
});

test('unreachable or occupied click targets are rejected without changing the route',()=>{
  const options={bounds:floor,obstacles:[{x:450,y:0,width:100,height:600}],padding:10};
  const nav=motion.createNavigator({...options,position:{x:100,y:300}});
  assert.equal(nav.setTarget({x:800,y:300}),false);
  assert.equal(nav.setTarget({x:500,y:300}),false);
  assert.equal(nav.setTarget({x:-20,y:300}),false);
  assert.equal(nav.snapshot().moving,false);
});

test('resize relocates onto valid floor and replans rather than keeping a desk collision',()=>{
  const nav=motion.createNavigator({position:{x:200,y:300},bounds:floor});
  nav.setEnvironment({bounds:floor,obstacles:[{x:150,y:250,width:100,height:100}],waypoints:[{x:200,y:390}],padding:10},{x:200,y:300});
  const p=nav.snapshot();assert.ok(p.y>360||p.x<140||p.x>260);
});

test('dance and taunt intros advance to their loops and then return to idle',()=>{
  const sequence=motion.createSequencer({Run:.7666667,Idle:2,IdleIn:1.1,DanceIntro:3.7,DanceLoop:1.6666666,TauntIntro:.53333336,TauntLoop:1.3333334,Laugh:2.5333335,Joke:4.6666665});
  sequence.play('dance');assert.equal(sequence.snapshot().clip,'DanceIntro');
  assert.equal(sequence.update(3.71).clip,'DanceLoop');
  const finish=sequence.update(5);assert.equal(finish.clip,'Idle');assert.equal(finish.completed,true);
  sequence.play('taunt');assert.equal(sequence.update(.54).clip,'TauntLoop');
  assert.equal(sequence.update(4).clip,'Idle');
  sequence.play('stop');assert.equal(sequence.snapshot().clip,'IdleIn');
  assert.equal(sequence.update(1.1).clip,'Idle');
});

test('native face and Pet events reset completely between emotes',()=>{
  const metadata={initialVisible:['Body','Weapons','Face_Basic','Face_Basic_Eyes'],clips:{DanceIntro:{visibility:[{start:0,end:3.7,show:['Pet'],hide:[]},{start:.4,end:1.6,show:['Surprise','Surprise_Eyes'],hide:['Face_Basic','Face_Basic_Eyes']}]},Idle:{visibility:[]}}};
  const surprised=motion.visibilityFor(metadata,'DanceIntro',.8);
  assert.ok(surprised.has('Pet')&&surprised.has('Surprise'));assert.equal(surprised.has('Face_Basic'),false);
  const idle=motion.visibilityFor(metadata,'Idle',0);
  assert.equal(idle.has('Pet'),false);assert.equal(idle.has('Surprise'),false);assert.ok(idle.has('Face_Basic_Eyes'));
});
test('the actual twenty-desk classroom has collision-free routes to desks and both poros',()=>{
  const classroom=require('../classroom.js').computeLayout(2560,1440);
  const options={polygon:classroom.polygon,obstacles:classroom.obstacles,waypoints:classroom.waypoints,padding:12};
  const env=motion.environment(options),from=classroom.waypoints.find(p=>p.id==='aisle-3-3');
  assert.equal(classroom.obstacles.length,20);
  const targets=classroom.waypoints.filter(p=>p.kind==='poro'||(p.kind==='desk'&&(p.col===0||p.col===4)));
  for(const target of targets){
    const path=motion.findPath(from,target,options);assert.ok(path,`No route to ${target.id}`);
    for(let i=1;i<path.length;i++)assert.equal(motion.clearSegment(path[i-1],path[i],env),true,`Desk collision en route to ${target.id}`);
  }
});

test('camera projection keeps native planted-foot motion matched in both screen directions',()=>{
  const elevation=54*Math.PI/180,bodyPixels=110,speed=264;
  const horizontal=motion.strideTimeScale(speed,bodyPixels,Math.PI/2,elevation);
  const vertical=motion.strideTimeScale(speed,bodyPixels,0,elevation);
  close(horizontal,Math.cos(elevation));
  close(vertical,Math.cos(elevation)/Math.sin(elevation));
  assert.ok(horizontal<vertical&&vertical<1);
  close(motion.strideTimeScale(speed*1.5,bodyPixels,0,elevation),vertical*1.5);
});
let runtimeHelpers;
async function getRuntimeHelpers(){
 if(!runtimeHelpers){
  const originalWindow=global.window;global.window={};
  try{runtimeHelpers=await import('../../src/lux.mjs');}
  finally{if(originalWindow===undefined)delete global.window;else global.window=originalWindow;}
 }
 return runtimeHelpers;
}

test('smooth theme fades keep the navigation fingerprint stable until furniture topology changes',async()=>{
 const {navigationFingerprint}=await getRuntimeHelpers();
 const viewport={width:2560,height:1440},options={bounds:floor,padding:12,obstacles:[{x:400,y:200,width:100,height:100}],waypoints:[{id:'desk-1',kind:'desk',x:450,y:350}]};
 const day=navigationFingerprint({...options,nightMix:0},viewport);
 for(const mix of [.1,.3,.6,.8])assert.equal(navigationFingerprint({...options,nightMix:mix},viewport),day);
 assert.notEqual(navigationFingerprint({...options,obstacles:[],waypoints:[]},viewport),day);
});

test('Lux walks out of an appearing desk before its full collision map activates',async()=>{
 const {planNavigationChange}=await getRuntimeHelpers();
 const position={x:500,y:300},options={bounds:floor,padding:12,obstacles:[{x:450,y:250,width:100,height:100},{x:680,y:180,width:120,height:220}],waypoints:[]};
 const plan=planNavigationChange(motion,position,options);assert.equal(plan.kind,'escape');
 const nav=motion.createNavigator({...plan.escapeOptions,position,speed:180});
 close(nav.snapshot().x,position.x);close(nav.snapshot().y,position.y);
 assert.equal(plan.escapeOptions.obstacles.length,1,'unrelated appearing furniture still blocks the route');
 assert.equal(nav.setTarget(plan.escapeTarget,'evacuate'),true);
 let previous=nav.snapshot();
 for(let i=0;i<150;i++){
  const next=nav.update(.02);assert.ok(Math.hypot(next.x-previous.x,next.y-previous.y)<=3.600001,'there is no position jump');previous=next;
 }
 assert.ok(motion.isWalkable(nav.snapshot(),plan.environment));
 const before=nav.snapshot();nav.setEnvironment(options);close(nav.snapshot().x,before.x);close(nav.snapshot().y,before.y);
});

test('night topology removes phantom furniture from the active route',async()=>{
 const {planNavigationChange}=await getRuntimeHelpers();
 const position={x:100,y:300},destination={x:900,y:300};
 const dayOptions={bounds:floor,padding:12,obstacles:[{x:400,y:150,width:200,height:300}],waypoints:[{kind:'desk',x:500,y:500}]};
 const dayPath=motion.findPath(position,destination,dayOptions);assert.ok(dayPath.length>2);
 const night=planNavigationChange(motion,position,{...dayOptions,obstacles:[],waypoints:[]});
 assert.equal(night.kind,'direct');assert.equal(night.environment.obstacles.length,0);
 assert.equal(motion.findPath(position,destination,night.options).length,2);
});