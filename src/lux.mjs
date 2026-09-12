import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

function clamp(v,a,b){return Math.max(a,Math.min(b,Number(v)));}
function angleDelta(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a));}

window.ChibiLux={create({element,layout,getState,enabled=true,size=100,speed=100}){
  let destroyed=false,paused=false,loaded=false,failed=false,frame=0,last=0,elapsed=0;
  let settings={enabled:enabled!==false,size:clamp(size,65,160),speed:clamp(speed,50,150)};
  let mixer,actor,walk,idle,currentAction=null,lastDirection=0;
  const sprite=document.createElement('div');
  sprite.className='lux-character';
  const shadow=document.createElement('div');shadow.className='lux-shadow';
  sprite.appendChild(shadow);element.appendChild(sprite);
  let renderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}
  catch(error){console.warn('Lux WebGL renderer could not start',error);failed=true;return {setPaused(){},configure(){},destroy(){sprite.remove();},status(){return {loaded:false,failed:true};}};}
  renderer.setClearColor(0x000000,0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.NoToneMapping;
  renderer.domElement.className='lux-canvas';sprite.appendChild(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-1.65,1.65,2.0,-2.0,.1,100);
  camera.position.set(0,3.8,7);camera.lookAt(0,1.05,0);camera.updateMatrixWorld(true);
  const ambient=new THREE.AmbientLight(0xffffff,2.3);scene.add(ambient);
  const light=new THREE.DirectionalLight(0xfff2e4,2.0);light.position.set(-3,7,5);scene.add(light);
  const rim=new THREE.DirectionalLight(0xb0bfff,.6);rim.position.set(3,3,-2);scene.add(rim);
  const pivot=new THREE.Group();scene.add(pivot);
  const foot=new THREE.Vector3(0,0,0).project(camera);
  const footX=(foot.x+1)/2,footY=(1-foot.y)/2;
  let renderWidth=0,renderHeight=0;

  function setAction(action){
    if(!action||action===currentAction)return;
    action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if(currentAction) action.crossFadeFrom(currentAction,.28,true);
    currentAction=action;
  }
  function tick(now){
    frame=0;
    if(destroyed||paused||!settings.enabled||!loaded)return;
    const state=getState();
    if(state.paused){last=0;frame=requestAnimationFrame(tick);return;}
    const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
    elapsed+=dt*settings.speed/100;
    const pose=window.LuxMotion.poseAt(elapsed);
    const rect=layout.getRect();
    const ground=window.ArenaLayout.groundToScreen(pose.u,pose.v,innerWidth,innerHeight);
    const ahead=window.ArenaLayout.groundToScreen(pose.u+pose.du*.02,pose.v+pose.dv*.02,innerWidth,innerHeight);
    const dx=ahead.x-ground.x,dy=ahead.y-ground.y;
    const direction=Math.atan2(dx,dy*1.5);
    if(pose.walking)lastDirection+=angleDelta(lastDirection,direction)*Math.min(1,dt*7);
    pivot.rotation.y=lastDirection;
    const height=Math.round(rect.height*.175*(.87+pose.v*.18)*settings.size/100);
    const width=Math.round(height*.825);
    if(width!==renderWidth||height!==renderHeight){
      renderWidth=width;renderHeight=height;renderer.setSize(width,height,false);
      sprite.style.width=width+'px';sprite.style.height=height+'px';
    }
    sprite.style.transform=`translate3d(${ground.x-width*footX}px,${ground.y-height*footY}px,0)`;
    shadow.style.left=(footX*100)+'%';shadow.style.top=(footY*100)+'%';
    const night=state.nightMix||0;
    shadow.style.opacity=String(.2-night*.08);
    light.color.setRGB(1,.96-night*.09,.90+night*.10);
    rim.intensity=.45+night*.55;
    setAction(pose.walking?walk:idle);
    sprite.dataset.animation=pose.walking?'walk':'idle';
    sprite.dataset.ready='true';
    if(walk)walk.setEffectiveTimeScale((.55+pose.pace*.38)*settings.speed/100);
    mixer.update(dt);
    renderer.render(scene,camera);
    frame=requestAnimationFrame(tick);
  }
  function restart(){
    sprite.hidden=!settings.enabled;
    if(!frame&&!paused&&settings.enabled&&loaded){last=0;frame=requestAnimationFrame(tick);}
  }
  const data=window.LUX_MODEL_BASE64;
  if(!data){failed=true;console.warn('The local Lux model is missing.');}
  else {
    const binary=atob(data),bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    new GLTFLoader().parse(bytes.buffer,'',gltf=>{
      if(destroyed)return;
      actor=gltf.scene;
      const box=new THREE.Box3().setFromObject(actor),extent=box.getSize(new THREE.Vector3());
      const scale=2.0/extent.y;
      const normalize=new THREE.Group();normalize.scale.setScalar(scale);
      actor.position.x-=(box.min.x+box.max.x)/2;
      // The native animated rig is grounded at Y=0; bind-pose bounds include
      // parts below the feet, so using their minimum would make Lux float.
      actor.position.y=0;
      actor.position.z-=(box.min.z+box.max.z)/2;
      normalize.add(actor);pivot.add(normalize);
      actor.traverse(obj=>{
        if(obj.isMesh){obj.frustumCulled=false;const mats=Array.isArray(obj.material)?obj.material:[obj.material];
          mats.forEach(mat=>{if(mat.metalness!==undefined)mat.metalness=0;if(mat.roughness!==undefined)mat.roughness=1; if(mat.name.startsWith('Face_')) { mat.depthWrite=false; obj.renderOrder=mat.name==='Face_Basic_Eyes'?2:1; }});}
      });
      mixer=new THREE.AnimationMixer(actor);
      const walkClip=gltf.animations.find(c=>/walk|run|move/i.test(c.name));
      const idleClip=gltf.animations.find(c=>/idle/i.test(c.name));
      if(!walkClip||!idleClip){failed=true;console.warn('Lux requires both walking and idle clips.');return;}
      walk=mixer.clipAction(walkClip);idle=mixer.clipAction(idleClip);
      setAction(idle);loaded=true;restart();
    },error=>{failed=true;console.warn('Lux could not load',error);});
  }
  return {
    setPaused(value){paused=Boolean(value);if(paused){cancelAnimationFrame(frame);frame=0;last=0;}else restart();},
    configure(options){
      if('enabled'in options)settings.enabled=Boolean(options.enabled);
      if('size'in options)settings.size=clamp(options.size,65,160);
      if('speed'in options)settings.speed=clamp(options.speed,50,150);
      if(!settings.enabled){cancelAnimationFrame(frame);frame=0;}
      restart();
    },
    status(){return {loaded,failed,paused,enabled:settings.enabled,elapsed,clips:{walk:walk?.getClip().name,idle:idle?.getClip().name}};},
    destroy(){destroyed=true;cancelAnimationFrame(frame);renderer.dispose();sprite.remove();}
  };
}};
