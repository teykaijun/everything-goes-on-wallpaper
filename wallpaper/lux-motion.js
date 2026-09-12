(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.LuxMotion=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  "use strict";
  const EPS=.001;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
  const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
  function insideRect(p,r){return p.x>=r.x&&p.x<=r.x+r.width&&p.y>=r.y&&p.y<=r.y+r.height;}
  function insidePolygon(p,polygon){
    if(!polygon||polygon.length<3)return true;
    let inside=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const a=polygon[i],b=polygon[j];
      const cross=(p.x-a.x)*(b.y-a.y)-(p.y-a.y)*(b.x-a.x);
      if(Math.abs(cross)<EPS&&p.x>=Math.min(a.x,b.x)-EPS&&p.x<=Math.max(a.x,b.x)+EPS&&p.y>=Math.min(a.y,b.y)-EPS&&p.y<=Math.max(a.y,b.y)+EPS)return true;
      if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
    }
    return inside;
  }
  function inflate(rect,padding){
    rect=rect.rect||rect;
    return {x:rect.x-padding,y:rect.y-padding,width:rect.width+padding*2,height:rect.height+padding*2};
  }
  function segmentHitsRect(a,b,r){
    let low=0,high=1;
    for(const [origin,delta,min,max]of[[a.x,b.x-a.x,r.x,r.x+r.width],[a.y,b.y-a.y,r.y,r.y+r.height]]){
      if(Math.abs(delta)<EPS){if(origin<min||origin>max)return false;}
      else{
        const t1=(min-origin)/delta,t2=(max-origin)/delta;
        low=Math.max(low,Math.min(t1,t2));high=Math.min(high,Math.max(t1,t2));
        if(low>high)return false;
      }
    }
    return true;
  }
  function environment(options={}){
    const polygon=options.polygon||null;
    const bounds=options.bounds||(polygon&&{x:Math.min(...polygon.map(p=>p.x)),y:Math.min(...polygon.map(p=>p.y)),width:Math.max(...polygon.map(p=>p.x))-Math.min(...polygon.map(p=>p.x)),height:Math.max(...polygon.map(p=>p.y))-Math.min(...polygon.map(p=>p.y))})||{x:0,y:0,width:2560,height:1440};
    return {bounds,polygon,obstacles:(options.obstacles||[]).map(r=>inflate(r,Math.max(0,options.padding||0))),waypoints:options.waypoints||[]};
  }
  function isWalkable(point,env){return Number.isFinite(point.x)&&Number.isFinite(point.y)&&insideRect(point,env.bounds)&&insidePolygon(point,env.polygon)&&!env.obstacles.some(r=>insideRect(point,r));}
  function clearSegment(a,b,env){
    if(!isWalkable(a,env)||!isWalkable(b,env)||env.obstacles.some(r=>segmentHitsRect(a,b,r)))return false;
    // The classroom floor is convex; this also catches a concave custom floor.
    for(let i=1;i<8;i++)if(!insidePolygon({x:a.x+(b.x-a.x)*i/8,y:a.y+(b.y-a.y)*i/8},env.polygon))return false;
    return true;
  }
  function cornerNodes(env){
    return env.obstacles.flatMap(r=>[{x:r.x-1,y:r.y-1},{x:r.x+r.width+1,y:r.y-1},{x:r.x+r.width+1,y:r.y+r.height+1},{x:r.x-1,y:r.y+r.height+1}]);
  }
  function nearestWalkable(point,env){
    if(isWalkable(point,env))return {x:point.x,y:point.y};
    const b=env.bounds;
    const candidates=[...env.waypoints,...cornerNodes(env),{x:b.x+b.width/2,y:b.y+b.height/2}].filter(p=>isWalkable(p,env));
    candidates.sort((a,b)=>distance(point,a)-distance(point,b));
    return candidates.length?{x:candidates[0].x,y:candidates[0].y}:null;
  }
  function findPath(from,to,options={}){
    const env=options.obstacles&&options.bounds&&options.prepared?options:environment(options);
    if(!isWalkable(from,env)||!isWalkable(to,env))return null;
    if(clearSegment(from,to,env))return [{x:from.x,y:from.y},{x:to.x,y:to.y}];
    const nodes=[from,to,...env.waypoints,...cornerNodes(env)].filter((p,index)=>index<2||isWalkable(p,env));
    const costs=Array(nodes.length).fill(Infinity),previous=Array(nodes.length).fill(-1),visited=new Set();
    costs[0]=0;
    // Visibility-graph Dijkstra routes around whole desk footprints, never through them.
    while(visited.size<nodes.length){
      let current=-1;
      for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(current<0||costs[i]<costs[current]))current=i;
      if(current<0||!Number.isFinite(costs[current]))break;
      if(current===1){
        const route=[];for(let i=1;i>=0;i=previous[i])route.unshift({x:nodes[i].x,y:nodes[i].y});
        return route;
      }
      visited.add(current);
      for(let i=0;i<nodes.length;i++){
        if(visited.has(i)||i===current||!clearSegment(nodes[current],nodes[i],env))continue;
        const next=costs[current]+distance(nodes[current],nodes[i]);
        if(next<costs[i]){costs[i]=next;previous[i]=current;}
      }
    }
    return null;
  }
  function createNavigator(options={}){
    let env=environment(options),position=nearestWalkable(options.position||{x:env.bounds.x+env.bounds.width/2,y:env.bounds.y+env.bounds.height/2},env);
    position=position||{x:env.bounds.x+env.bounds.width/2,y:env.bounds.y+env.bounds.height/2};
    let route=[],target=null,speed=Math.max(1,options.speed||250),yaw=options.yaw||0,phase='idle',look=null,lookTime=0,age=0;
    const turnSpeed=options.turnSpeed||10,depthFactor=options.depthFactor||1.32;
    function setTarget(point,kind='aisle'){
      const path=findPath(position,point,Object.assign({prepared:true},env));
      if(!path)return false;
      route=path.slice(1);target={x:point.x,y:point.y,kind};look=null;lookTime=0;
      phase=route.length?'turning':'idle';return true;
    }
    function stop(){const moving=route.length>0;route=[];target=null;phase='idle';return moving;}
    function snapshot(){return {x:position.x,y:position.y,yaw,phase,walking:phase==='walking',moving:route.length>0,target:target&&{...target},route:route.map(p=>({...p})),age};}
    function update(seconds){
      let remaining=clamp(Number(seconds)||0,0,.25),arrived=false,moved=0;
      age+=remaining;lookTime=Math.max(0,lookTime-remaining);
      if(!route.length){
        phase='idle';
        if(look&&lookTime>0){const wanted=Math.atan2(look.x-position.x,(look.y-position.y)*depthFactor);yaw+=clamp(angleDelta(yaw,wanted),-turnSpeed*remaining,turnSpeed*remaining);}
      }
      while(route.length&&remaining>EPS){
        const next=route[0],length=distance(position,next);
        if(length<EPS){position={...next};route.shift();continue;}
        const wanted=Math.atan2(next.x-position.x,(next.y-position.y)*depthFactor),turn=angleDelta(yaw,wanted);
        if(Math.abs(turn)>.035){
          const turnTime=Math.min(remaining,Math.abs(turn)/turnSpeed);
          yaw+=Math.sign(turn)*turnSpeed*turnTime;remaining-=turnTime;phase='turning';
          if(remaining<=EPS)break;
        }
        yaw=wanted;const used=Math.min(remaining,length/speed),step=used*speed;
        position={x:position.x+(next.x-position.x)*step/length,y:position.y+(next.y-position.y)*step/length};
        moved+=step;remaining-=used;phase='walking';
        if(step>=length-EPS){position={...next};route.shift();if(!route.length){arrived=true;phase='idle';}}
      }
      return {...snapshot(),arrived,moved};
    }
    return {
      update,snapshot,setTarget,stop,
      setSpeed(value){speed=Math.max(1,Number(value)||1);},
      lookAt(point,seconds=1.5){look={x:point.x,y:point.y};lookTime=seconds;},
      canVisit(point){return isWalkable(point,env);},
      setEnvironment(options,nextPosition){
        env=environment(options);const safe=nearestWalkable(nextPosition||position,env);if(safe)position=safe;
        if(target&&!setTarget(target,target.kind))stop();
      }
    };
  }
  function createSequencer(durations){
    durations=durations||{Run:.7666667,Idle:2,IdleIn:1.1};
    const available=Object.keys(durations),find=name=>available.find(key=>key.toLowerCase()===name.toLowerCase());
    const idle=find('Idle')||available[0];
    let plan=[],index=0,time=0,command='idle';
    function part(name,repeats=1){const clip=find(name);return clip?{clip,duration:Math.max(.01,Number(durations[clip])||1),repeats}:null;}
    function play(name){
      name=String(name||'idle').toLowerCase();
      if((name==='run'||name==='idle')&&command===name&&plan.length)return;
      const sequences={run:[part('Run',Infinity)],idle:[part('Idle',Infinity)],stop:[part('IdleIn'),part('Idle',Infinity)],dance:[part('DanceIntro'),part('DanceLoop',3)],taunt:[part('TauntIntro'),part('TauntLoop',3)],laugh:[part('Laugh')],joke:[part('Joke')],'laugh-wacky':[part('LaughWacky')]};
      plan=(sequences[name]||sequences.idle).filter(Boolean);
      if(!plan.length||plan[plan.length-1].repeats!==Infinity)plan.push(part(idle,Infinity));
      plan=plan.filter(Boolean);index=0;time=0;command=name;
    }
    function snapshot(){
      const item=plan[index]||{clip:idle,duration:1,repeats:Infinity};
      return {clip:item.clip,time:time%item.duration,loop:item.repeats!==1,command,busy:item.clip!==idle&&command!=='run',duration:item.duration};
    }
    function update(seconds){
      time+=Math.max(0,Number(seconds)||0);let completed=false;
      while(plan[index]&&time>=plan[index].duration*plan[index].repeats&&index<plan.length-1){time-=plan[index].duration*plan[index].repeats;index++;if(plan[index].clip===idle)completed=true;}
      return {...snapshot(),completed};
    }
    play('idle');return {play,update,snapshot};
  }
  function strideTimeScale(screenSpeed,bodyPixels,yaw,elevation){
    const projectedForward=Math.hypot(Math.sin(yaw),Math.cos(yaw)*Math.sin(elevation));
    const nativePixelsPerSecond=Math.max(.001,bodyPixels*2.4/Math.cos(elevation)*projectedForward);
    return Math.max(0,screenSpeed)/nativePixelsPerSecond;
  }
  function visibilityFor(metadata,clip,time){
    const visible=new Set(metadata.initialVisible||['Body','Weapons','Face_Basic','Face_Basic_Eyes']);
    const events=metadata.clips?.[clip]?.visibility||[];
    events.forEach(event=>{if(time>=event.start&&time<event.end){(event.hide||[]).forEach(name=>visible.delete(name));(event.show||[]).forEach(name=>visible.add(name));}});
    return visible;
  }
  return {insidePolygon,insideRect,segmentHitsRect,environment,isWalkable,clearSegment,findPath,nearestWalkable,createNavigator,createSequencer,strideTimeScale,visibilityFor,angleDelta};
});