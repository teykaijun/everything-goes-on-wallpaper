import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||min));
const NATIVE_BODY_HEIGHT=166.656175;
const NATIVE_BODY_HEIGHTS_PER_SECOND=2.4;

export function navigationFingerprint(options,viewport){
  return JSON.stringify([viewport.width,viewport.height,options.padding,options.bounds,options.polygon,
    (options.obstacles||[]).map(item=>{const r=item.rect||item;return [r.x,r.y,r.width,r.height];}),
    (options.waypoints||[]).map(point=>[point.id,point.kind,point.x,point.y,point.lookAt?.x,point.lookAt?.y])]);
}

export function planNavigationChange(motion,position,options){
  const environment=motion.environment(options);
  if(motion.isWalkable(position,environment))return {kind:'direct',environment,options};
  const escapeTarget=motion.nearestWalkable(position,environment);
  if(escapeTarget&&motion.insideRect(position,environment.bounds)&&motion.insidePolygon(position,environment.polygon)){
    // An appearing desk may surround Lux. Allow departure from only the desks
    // containing her feet, while respecting every other newly visible desk.
    const escapeOptions={...options,obstacles:(options.obstacles||[]).filter((_,index)=>!motion.insideRect(position,environment.obstacles[index]))};
    if(motion.findPath(position,escapeTarget,escapeOptions))return {kind:'escape',environment,options,escapeOptions,escapeTarget};
  }
  // Only a viewport/floor change can put the old position outside the whole floor.
  return {kind:'relocate',environment,options};
}

window.ChibiLux={create({element,layout,getState,enabled=true,size=100,speed=100,interactions=true}){
  const motion=window.LuxMotion;
  let destroyed=false,paused=false,loaded=false,failed=false,frame=0,last=0,elapsed=0;
  const settings={enabled:enabled!==false,size:clamp(size,45,160),speed:clamp(speed,50,150),interactions:interactions!==false};
  let mixer,actor,currentAction=null,currentClip='',sequencer,navigator,environment;
  let currentRunRate=1;
  let environmentKey='',pendingEnvironment=null,activeSceneryKind=null;
  let previousPhase='idle',automaticWait=3,activityCount=0,emoteIndex=0,lastVisit=-1,afterArrival=null;
  let viewport={width:innerWidth,height:innerHeight},renderWidth=0,renderHeight=0,hitBox=null,lastPointer=null;
  const clips=new Map(),actions=new Map(),managedMaterials=[];
  const metadata=window.LUX_ANIMATION_DATA||{initialVisible:['Body','Weapons','Face_Basic','Face_Basic_Eyes'],clips:{},faceRenderOrder:[]};
  const emotes=['dance','laugh','taunt','joke'];
  const sprite=document.createElement('div');sprite.className='lux-character';
  const shadow=document.createElement('div');shadow.className='lux-shadow';
  sprite.appendChild(shadow);element.appendChild(sprite);
  // Furniture and Lux share the arena's depth ordering, one layer per foot position.
  element.style.zIndex='auto';
  let renderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}
  catch(error){console.warn('Lux WebGL renderer could not start',error);return {setPaused(){},configure(){},destroy(){sprite.remove();},status(){return {loaded:false,failed:true};}};}
  renderer.setClearColor(0x000000,0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
  renderer.domElement.className='lux-canvas';sprite.appendChild(renderer.domElement);
  const scene=new THREE.Scene();
  // Match the arena's elevated camera and allow room for the native staff/Pet emotes.
  const camera=new THREE.OrthographicCamera(-2.3,2.3,2.4,-2.4,.1,100);
  const elevation=THREE.MathUtils.degToRad(54),cameraDistance=9;
  camera.position.set(0,1+Math.sin(elevation)*cameraDistance,Math.cos(elevation)*cameraDistance);
  camera.lookAt(0,1,0);camera.updateMatrixWorld(true);
  const ambient=new THREE.AmbientLight(0xffffff,2.3);scene.add(ambient);
  const light=new THREE.DirectionalLight(0xfff2e4,2.0);light.position.set(-3,7,5);scene.add(light);
  const rim=new THREE.DirectionalLight(0xb0bfff,.6);rim.position.set(3,3,-2);scene.add(rim);
  const pivot=new THREE.Group();scene.add(pivot);
  const foot=new THREE.Vector3(0,0,0).project(camera),footX=(foot.x+1)/2,footY=(1-foot.y)/2;
  const bodyProjectionFraction=2*Math.cos(elevation)/(camera.top-camera.bottom);

  function scenery(){return window.ClassroomScene||{};}
  function bodyHeight(y){
    const rect=layout.getRect(),bounds=environment?.bounds||{y:rect.y,height:rect.height};
    const depth=clamp((y-bounds.y)/Math.max(1,bounds.height),0,1);
    return rect.height*.08*(.88+depth*.18)*settings.size/100;
  }
  function readEnvironment(){
    const classroom=scenery(),rect=layout.getRect();
    let polygon=classroom.getWalkablePolygon?.();
    const bounds=classroom.getBounds?.();
    if(!polygon?.length&&!bounds){
      polygon=[[0,0],[1,0],[1,1],[0,1]].map(([u,v])=>window.ArenaLayout.groundToScreen(u,v,innerWidth,innerHeight));
    }
    return {polygon,bounds,obstacles:classroom.getObstacles?.()||[],waypoints:classroom.getWaypoints?.()||[],padding:Math.max(6,rect.height*.08*1.06*settings.size/100*.1)};
  }
  function resize(event){
    if(event?.type==='classroom-layout'&&event.detail?.navigationChanged===false)return;
    const oldViewport=viewport,nextViewport={width:innerWidth,height:innerHeight},options=readEnvironment();
    const key=navigationFingerprint(options,nextViewport);
    if(key===environmentKey)return;
    environmentKey=key;viewport=nextViewport;
    if(!navigator){
      environment=motion.environment(options);
      const start=window.ArenaLayout.groundToScreen(.5,.8,innerWidth,innerHeight);
      navigator=motion.createNavigator({...options,position:start,speed:250,depthFactor:1/Math.sin(elevation)});
    }else{
      const point=navigator.snapshot(),scaleX=viewport.width/Math.max(1,oldViewport.width),scaleY=viewport.height/Math.max(1,oldViewport.height);
      const scalePoint=value=>value&&({...value,x:value.x*scaleX,y:value.y*scaleY});
      let resumeTarget=scalePoint(pendingEnvironment?pendingEnvironment.resumeTarget:point.target);
      let resumeVisit=pendingEnvironment?pendingEnvironment.resumeVisit:afterArrival;
      if(resumeVisit)resumeVisit={...resumeVisit,lookAt:scalePoint(resumeVisit.lookAt)};
      const queuedEmote=pendingEnvironment?.emote;
      const plan=planNavigationChange(motion,{x:point.x*scaleX,y:point.y*scaleY},options);
      environment=plan.environment;
      const desksActive=environment.waypoints.some(value=>value.kind==='desk');
      if(!desksActive){
        if(resumeTarget?.kind==='desk')resumeTarget=null;
        if(resumeVisit?.kind==='desk')resumeVisit=null;
        if(activeSceneryKind==='desk'){sequencer?.play('stop');activeSceneryKind=null;}
      }
      navigator.stop();pendingEnvironment=null;afterArrival=null;
      const position={x:point.x*scaleX,y:point.y*scaleY};
      if(plan.kind==='escape'){
        navigator.setEnvironment(plan.escapeOptions,position);
        if(navigator.setTarget(plan.escapeTarget,'evacuate')){
          pendingEnvironment={options,resumeTarget,resumeVisit,emote:queuedEmote};
          sequencer?.play('stop');previousPhase='idle';
        }
      }
      if(!pendingEnvironment){
        navigator.setEnvironment(options,position);
        if(resumeTarget&&navigator.setTarget(resumeTarget,resumeTarget.kind))afterArrival=resumeVisit;
        else{sequencer?.play('stop');previousPhase='idle';automaticWait=Math.max(automaticWait,1.5);}
        if(queuedEmote)playEmote(queuedEmote.name,queuedEmote.lookAt,queuedEmote.kind);
      }
    }
    renderWidth=0;last=0;
  }
  function finishEnvironmentChange(){
    const pending=pendingEnvironment;if(!pending)return;
    pendingEnvironment=null;navigator.stop();navigator.setEnvironment(pending.options);
    if(pending.resumeTarget&&navigator.setTarget(pending.resumeTarget,pending.resumeTarget.kind))afterArrival=pending.resumeVisit;
    else automaticWait=Math.max(automaticWait,1.5);
    if(pending.emote)playEmote(pending.emote.name,pending.emote.lookAt,pending.emote.kind);
    return Boolean(pending.emote);
  }
  function setAction(state){
    let action=actions.get(state.clip);
    if(!action){const clip=clips.get(state.clip);if(!clip)return;action=mixer.clipAction(clip);actions.set(state.clip,action);}
    if(action!==currentAction){
      action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1);
      action.setLoop(state.loop?THREE.LoopRepeat:THREE.LoopOnce,state.loop?Infinity:1);
      action.clampWhenFinished=true;action.play();
      if(currentAction)action.crossFadeFrom(currentAction,state.clip==='IdleIn'?.12:.10,false);
      currentAction=action;currentClip=state.clip;
    }
    action.setEffectiveTimeScale(state.command==='run'?currentRunRate:1);
  }
  function applyVisibility(state){
    const visible=motion.visibilityFor(metadata,state.clip,state.time);
    managedMaterials.forEach(({material,name})=>{material.visible=visible.has(name);});
  }
  function playEmote(name,facingPoint=null,sceneryKind=null){
    if(!sequencer||!navigator)return;
    if(pendingEnvironment){pendingEnvironment.resumeTarget=null;pendingEnvironment.resumeVisit=null;pendingEnvironment.emote={name,lookAt:facingPoint,kind:sceneryKind};return;}
    navigator.stop();afterArrival=null;previousPhase='idle';automaticWait=4+Math.random()*3;
    const point=navigator.snapshot();navigator.lookAt(facingPoint||{x:point.x,y:point.y+bodyHeight(point.y)*2},12);
    sequencer.play(name);activeSceneryKind=sceneryKind;sprite.dataset.command=name;sprite.dataset.interaction=facingPoint?'scenery':'viewer';
  }
  function visit(point){
    const visitAction=point.kind==='poro'?{name:'laugh',kind:'poro',lookAt:point.lookAt}:point.kind==='desk'?{name:'joke',kind:'desk',lookAt:point.lookAt}:null;
    if(pendingEnvironment){
      if(!motion.isWalkable(point,environment))return false;
      pendingEnvironment.resumeTarget={x:point.x,y:point.y,kind:point.kind||'aisle'};
      pendingEnvironment.resumeVisit=visitAction;pendingEnvironment.emote=null;return true;
    }
    if(!navigator.setTarget(point,point.kind||'aisle'))return false;
    afterArrival=visitAction;automaticWait=3+Math.random()*3;return true;
  }
  function chooseActivity(){
    activityCount++;
    if(activityCount%3===0){playEmote(emotes[emoteIndex++%emotes.length]);return;}
    const point=navigator.snapshot(),candidates=environment.waypoints.filter(p=>navigator.canVisit(p)&&Math.hypot(p.x-point.x,p.y-point.y)>bodyHeight(point.y)*1.4);
    const preferred=candidates.filter(p=>activityCount%2===0?p.kind==='desk':p.kind==='poro');
    const choices=preferred.length?preferred:candidates;
    for(let attempt=0;attempt<Math.min(choices.length,8);attempt++){
      const index=Math.floor(Math.random()*choices.length);
      if(index===lastVisit&&choices.length>1)continue;
      if(visit(choices[index])){lastVisit=index;return;}
    }
    // Without furniture, visit different points on the actual arena floor.
    for(let attempt=0;attempt<8;attempt++){
      const next=window.ArenaLayout.groundToScreen(.1+Math.random()*.8,.1+Math.random()*.8,innerWidth,innerHeight);
      if(visit(next))return;
    }
    automaticWait=4;
  }
  function tick(now){
    frame=0;
    if(destroyed||paused||!settings.enabled||!loaded)return;
    const state=getState()||{};
    if(state.paused){last=0;frame=requestAnimationFrame(tick);return;}
    // The source game animation and arena are 30fps; avoid unnecessary 60fps WebGL work.
    if(last&&now-last<1000/30-.5){frame=requestAnimationFrame(tick);return;}
    const dt=last?Math.min(.1,(now-last)/1000):0;last=now;elapsed+=dt;
    const before=navigator.snapshot(),heightOnFloor=bodyHeight(before.y);
    navigator.setSpeed(heightOnFloor*NATIVE_BODY_HEIGHTS_PER_SECOND*settings.speed/100);
    let pose=navigator.update(dt);
    if(pendingEnvironment&&pose.arrived){const moved=pose.moved,emoteStarted=finishEnvironmentChange();pose={...navigator.snapshot(),arrived:!emoteStarted,moved};}
    const bodyPixels=bodyHeight(pose.y);
    currentRunRate=motion.strideTimeScale(heightOnFloor*NATIVE_BODY_HEIGHTS_PER_SECOND*settings.speed/100,bodyPixels,pose.yaw,elevation);
    if(pose.walking)sequencer.play('run');
    else if(previousPhase==='walking'||pose.arrived)sequencer.play('stop');
    previousPhase=pose.phase;
    let animation=sequencer.update(dt*(sequencer.snapshot().command==='run'?currentRunRate:1));
    if(!animation.busy)activeSceneryKind=null;
    if(!pose.moving&&!animation.busy&&!pendingEnvironment){
      if(afterArrival){const visitAction=afterArrival;afterArrival=null;playEmote(visitAction.name,visitAction.lookAt,visitAction.kind);animation=sequencer.snapshot();}
      else{
        automaticWait-=dt;
        if(automaticWait<=0){chooseActivity();animation=sequencer.snapshot();}
      }
    }
    const height=Math.round(bodyPixels/bodyProjectionFraction),width=Math.round(height*(camera.right-camera.left)/(camera.top-camera.bottom));
    if(width!==renderWidth||height!==renderHeight){
      renderWidth=width;renderHeight=height;renderer.setSize(width,height,false);
      sprite.style.width=width+'px';sprite.style.height=height+'px';
    }
    pivot.rotation.y=pose.yaw;
    sprite.style.transform=`translate3d(${pose.x-width*footX}px,${pose.y-height*footY}px,0)`;
    sprite.style.zIndex=String(Math.round(pose.y)+10);
    shadow.style.left=(footX*100)+'%';shadow.style.top=(footY*100)+'%';
    shadow.style.width=(bodyPixels*.63/width*100)+'%';shadow.style.height=(bodyPixels*.12/height*100)+'%';
    const night=state.nightMix||0;
    shadow.style.opacity=String(.25-night*.08);light.color.setRGB(1,.96-night*.09,.90+night*.10);rim.intensity=.45+night*.55;
    hitBox={x:pose.x-bodyPixels*.62,y:pose.y-bodyPixels*1.23,width:bodyPixels*1.24,height:bodyPixels*1.4};
    setAction(animation);mixer.update(dt);applyVisibility({...animation,time:currentAction?.time||0});renderer.render(scene,camera);
    sprite.dataset.animation=animation.clip;sprite.dataset.ready='true';sprite.dataset.motion=pose.phase;
    frame=requestAnimationFrame(tick);
  }
  function restart(){
    sprite.hidden=!settings.enabled||failed;
    if(!frame&&!paused&&settings.enabled&&loaded){last=0;frame=requestAnimationFrame(tick);}
  }
  function ignoredPointer(event){
    return !settings.interactions||paused||!loaded||!settings.enabled||(getState()||{}).paused||event.target?.closest?.('[data-lux-ui],#preview-panel,button,input,select,textarea,a');
  }
  function pointerMove(event){
    if(ignoredPointer(event))return;
    const point={x:event.clientX,y:event.clientY};if(!Number.isFinite(point.x)||!Number.isFinite(point.y))return;
    lastPointer=point;
    const pose=navigator.snapshot();
    if(!pose.moving&&!sequencer.snapshot().busy&&Math.hypot(point.x-pose.x,point.y-pose.y)<bodyHeight(pose.y)*2.8){navigator.lookAt(point,1.1);automaticWait=Math.max(automaticWait,1.5);}
  }
  function pointerClick(event){
    if(ignoredPointer(event)||(event.button!==undefined&&event.button!==0))return;
    const point={x:event.clientX,y:event.clientY};if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||scenery().isIconPoint?.(point.x,point.y))return;
    lastPointer=point;
    if(hitBox&&motion.insideRect(point,hitBox)){playEmote(emotes[emoteIndex++%emotes.length]);return;}
    if(visit(point)){afterArrival=null;sequencer.play('stop');automaticWait=6;}
  }
  function commandEvent(event){
    if(!loaded||!settings.enabled||paused)return;
    const name=String(event.detail?.name||'').toLowerCase();
    if(name==='come-here'){
      const point=Number.isFinite(event.detail?.x)&&Number.isFinite(event.detail?.y)?event.detail:lastPointer;
      if(point&&!scenery().isIconPoint?.(point.x,point.y))visit(point);
    }else if(name==='stop'){if(pendingEnvironment){pendingEnvironment.resumeTarget=null;pendingEnvironment.resumeVisit=null;pendingEnvironment.emote=null;}else{navigator.stop();sequencer.play('stop');}afterArrival=null;automaticWait=8;}
    else if(['dance','laugh','taunt','joke','laugh-wacky'].includes(name))playEmote(name);
  }
  function disposeModel(){
    actor?.traverse(object=>{
      if(!object.isMesh)return;object.geometry?.dispose();
      (Array.isArray(object.material)?object.material:[object.material]).forEach(material=>{
        Object.values(material).forEach(value=>{if(value?.isTexture)value.dispose();});material.dispose();
      });
    });
  }
  window.addEventListener('resize',resize);
  window.addEventListener('classroom-layout',resize);
  window.addEventListener('lux-command',commandEvent);
  document.addEventListener('mousemove',pointerMove,{passive:true});
  document.addEventListener('click',pointerClick,{passive:true});
  resize();
  const data=window.LUX_MODEL_BASE64;
  if(!data){failed=true;sprite.hidden=true;console.warn('The local Lux model is missing.');}
  else{
    const binary=atob(data),bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    new GLTFLoader().parse(bytes.buffer,'',gltf=>{
      if(destroyed){actor=gltf.scene;disposeModel();return;}
      actor=gltf.scene;
      const normalize=new THREE.Group();normalize.scale.setScalar(2/NATIVE_BODY_HEIGHT);
      // Native ground is Y=0. Both the root and floor bone bounce during the run;
      // rebasing to a bind-pose minimum or foot bone would cancel the genuine motion.
      actor.position.set(0,0,0);normalize.add(actor);pivot.add(normalize);
      const controlled=new Set([...(metadata.initialVisible||[]),...(metadata.faceRenderOrder||[]),'Pet']);
      Object.values(metadata.clips||{}).forEach(clip=>(clip.visibility||[]).forEach(event=>[...(event.show||[]),...(event.hide||[])].forEach(name=>controlled.add(name))));
      actor.traverse(object=>{
        if(!object.isMesh)return;object.frustumCulled=false;
        const materials=Array.isArray(object.material)?object.material:[object.material];
        materials.forEach(material=>{
          if(material.metalness!==undefined)material.metalness=0;if(material.roughness!==undefined)material.roughness=1;
          if(controlled.has(material.name))managedMaterials.push({material,name:material.name});
          const order=(metadata.faceRenderOrder||[]).indexOf(material.name);
          if(order>=0){material.depthWrite=false;object.renderOrder=order+1;}
        });
      });
      gltf.animations.forEach(clip=>clips.set(clip.name,clip));
      const run=[...clips.keys()].find(name=>/^run$/i.test(name)),idle=[...clips.keys()].find(name=>/^idle$/i.test(name));
      if(!run||!idle){failed=true;sprite.hidden=true;console.warn('Lux requires the native Run and Idle clips.');return;}
      mixer=new THREE.AnimationMixer(actor);
      sequencer=motion.createSequencer(Object.fromEntries([...clips].map(([name,clip])=>[name,clip.duration])));
      setAction(sequencer.snapshot());applyVisibility(sequencer.snapshot());loaded=true;restart();
    },error=>{failed=true;sprite.hidden=true;console.warn('Lux could not load',error);});
  }
  return {
    setPaused(value){paused=Boolean(value);if(paused){cancelAnimationFrame(frame);frame=0;last=0;}else restart();},
    configure(options={}){
      if('enabled'in options)settings.enabled=Boolean(options.enabled);
      if('size'in options)settings.size=clamp(options.size,45,160);
      if('speed'in options)settings.speed=clamp(options.speed,50,150);
      if('interactions'in options)settings.interactions=Boolean(options.interactions);
      if('size'in options)resize();
      if(!settings.enabled){cancelAnimationFrame(frame);frame=0;}
      restart();
    },
    command(name){commandEvent({detail:{name}});},
    status(){return {loaded,failed,paused,enabled:settings.enabled,interactions:settings.interactions,elapsed,animation:currentClip,runTimeScale:currentRunRate,evacuating:Boolean(pendingEnvironment),deskObstacles:environment?.obstacles.length||0,navigation:navigator?.snapshot(),clips:{walk:[...clips.keys()].find(name=>/^run$/i.test(name)),idle:[...clips.keys()].find(name=>/^idle$/i.test(name))}};},
    destroy(){
      destroyed=true;cancelAnimationFrame(frame);
      window.removeEventListener('resize',resize);window.removeEventListener('classroom-layout',resize);window.removeEventListener('lux-command',commandEvent);
      document.removeEventListener('mousemove',pointerMove);document.removeEventListener('click',pointerClick);
      mixer?.stopAllAction();disposeModel();renderer.dispose();sprite.remove();
    }
  };
}};