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
test('the actual forty-desk classroom has collision-free routes to desks and both poros',()=>{
  const classroom=require('../classroom.js').computeLayout(2560,1440);
  const options={polygon:classroom.polygon,obstacles:classroom.obstacles,waypoints:classroom.waypoints,padding:12};
  const env=motion.environment(options),from={x:1280,y:850};
  assert.equal(classroom.obstacles.length,40);
  const targets=classroom.waypoints.filter(p=>p.kind==='poro'||(p.kind==='desk'&&(p.col===0||p.col===7)));
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