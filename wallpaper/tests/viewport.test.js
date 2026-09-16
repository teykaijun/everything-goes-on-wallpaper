const test=require('node:test');
const assert=require('node:assert/strict');
const viewport=require('../viewport.js');
function host(){
 let id=0;const timers=new Map(),listeners={},events=[];
 return {innerWidth:2560,innerHeight:1440,events,timers,listeners,
 setTimeout(fn){timers.set(++id,fn);return id;},clearTimeout(id){timers.delete(id);},
 addEventListener(type,fn){listeners[type]=fn;},removeEventListener(type){delete listeners[type];},
 CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},dispatchEvent(e){events.push(e);},
 settle(){const all=[...timers.values()];timers.clear();all.forEach(fn=>fn());},
 resize(w,h){this.innerWidth=w;this.innerHeight=h;listeners.resize();}};
}
test('display removal cancels queued layout work and reconnection emits one settled viewport',()=>{
 const h=host();let pauses=0,resumes=0;
 const watcher=viewport.create(h,{onPending(){pauses++;},onSettled(){resumes++;}});
 h.resize(1080,1920);assert.equal(h.timers.size,1);
 h.resize(0,0);assert.equal(h.timers.size,0);h.settle();assert.equal(h.events.length,0);
 h.resize(2560,1);h.resize(2560,1440);h.resize(2560,1440);h.settle();
 assert.equal(pauses,1);assert.equal(resumes,1);assert.equal(h.events.length,1);
 assert.deepEqual(h.events[0].detail,{width:2560,height:1440});assert.equal(watcher.pending(),false);
});
test('disposing the viewport watcher cancels pending work and removes the listener',()=>{
 const h=host();const watcher=viewport.create(h);h.resize(3840,2160);watcher.destroy();h.settle();
 assert.equal(h.events.length,0);assert.equal(h.timers.size,0);assert.equal(h.listeners.resize,undefined);
});
