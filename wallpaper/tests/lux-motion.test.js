const test=require('node:test');
const assert=require('node:assert/strict');
const motion=require('../lux-motion.js');
const layout=require('../layout.js');
test('Lux stays on visible playable ground in landscape and portrait for the entire patrol',()=>{
 for(let t=0;t<motion.period;t+=.1){
  const p=motion.poseAt(t);
  assert.ok(p.u>=0&&p.u<=1&&p.v>=0&&p.v<=1);
  for(const [w,h]of[[2560,1440],[1080,1920]]){
   const q=layout.groundToScreen(p.u,p.v,w,h);
   assert.ok(q.x>80&&q.x<w-80&&q.y>100&&q.y<h-100);
  }
 }
});
test('patrol has walking and resting phases without teleporting between segments or at its loop',()=>{
 let previous=motion.poseAt(0),walk=0,idle=0;
 for(let t=.02;t<motion.period*2;t+=.02){
  const p=motion.poseAt(t);
  assert.ok(Math.hypot(p.u-previous.u,p.v-previous.v)<.004);
  p.walking?walk++:idle++;
  previous=p;
 }
 assert.ok(walk>idle&&idle>100);
});
