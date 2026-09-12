(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.LuxMotion=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  "use strict";
  const points=[[.22,.70],[.73,.70],[.79,.35],[.50,.19],[.21,.40],[.45,.64],[.69,.38]];
  const segments=points.map((p,i)=>{
    const q=points[(i+1)%points.length];
    return {from:p,to:q,walk:Math.hypot(q[0]-p[0],q[1]-p[1])*24+4,pause:2.4+(i%3)*.8};
  });
  const period=segments.reduce((sum,s)=>sum+s.walk+s.pause,0);
  function poseAt(seconds){
    let t=((seconds%period)+period)%period;
    for(let i=0;i<segments.length;i++){
      const s=segments[i];
      if(t<s.walk+s.pause){
        const progress=Math.min(1,t/s.walk);
        const p=progress*progress*(3-2*progress);
        return {u:s.from[0]+(s.to[0]-s.from[0])*p,v:s.from[1]+(s.to[1]-s.from[1])*p,
          du:s.to[0]-s.from[0],dv:s.to[1]-s.from[1],walking:t<s.walk,
          pace:Math.max(.18,6*progress*(1-progress)),segment:i};
      }
      t-=s.walk+s.pause;
    }
    return {u:points[0][0],v:points[0][1],du:1,dv:0,walking:false,pace:0,segment:0};
  }
  return {poseAt,period};
});
