(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ClassroomScene = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';
  var SOURCE_WIDTH = 2560, SOURCE_HEIGHT = 1440, ROWS = 5, COLS = 8;
  var active = null, serial = 0;
  var FLOOR = [{x:.21,y:.19},{x:.80,y:.19},{x:.80,y:.81},{x:.21,y:.81}];
  var DAY = {woodTop:'#e8be68',woodLight:'#ffe1a0',woodEdge:'#c69a56',woodFront:'#ae824d',woodLine:'#b98943',metal:'#cbbb99',metalLight:'#f3e3b9',metalDark:'#726e5c',brass:'#e4c583',chair:'#d7b775',chairDark:'#a28a5c',teal:'#6e9690',shadow:'#342a38'};
  var NIGHT = {woodTop:'#ba9b71',woodLight:'#ddba8e',woodEdge:'#998065',woodFront:'#857269',woodLine:'#977d5d',metal:'#ada199',metalLight:'#d3beb0',metalDark:'#696378',brass:'#ccb394',chair:'#b49b78',chairDark:'#857472',teal:'#708f99',shadow:'#17152d'};

  function size(value, fallback) { value=Number(value);return Number.isFinite(value)&&value>0?value:fallback; }
  function clamp(value) { return Math.max(0,Math.min(1,Number(value)||0)); }
  function viewport(width,height) {
    width=size(width,size(root.innerWidth,SOURCE_WIDTH));height=size(height,size(root.innerHeight,SOURCE_HEIGHT));
    var sceneWidth=Math.min(width,height*16/9),sceneHeight=sceneWidth*9/16;
    return {width:width,height:height,landscape:width>=height,scale:sceneWidth/SOURCE_WIDTH,x:(width-sceneWidth)/2,y:(height-sceneHeight)/2,sceneWidth:sceneWidth,sceneHeight:sceneHeight};
  }
  function project(point,view) { return {x:view.x+point.x*view.scale,y:view.y+point.y*view.scale}; }
  function rect(x,y,width,height) { return {x:x,y:y,width:width,height:height,left:x,top:y,right:x+width,bottom:y+height}; }
  function nativeDesk(row,col) {
    var span=1100+60*row,deskWidth=128+5*row,centerX=1280-span/2+col*span/(COLS-1),footY=340+170*row;
    return {id:'desk-'+(row+1)+'-'+(col+1),row:row,col:col,centerX:centerX,footY:footY,width:deskWidth,tabletopFrontY:footY-56*deskWidth/160};
  }
  function computeLayout(width,height) {
    var view=viewport(width,height),desks=[],slots=[],obstacles=[],waypoints=[];
    if(!view.landscape)return {view:view,desks:desks,slots:slots,obstacles:obstacles,waypoints:waypoints,polygon:[]};
    for(var row=0;row<ROWS;row++)for(var col=0;col<COLS;col++){
      var native=nativeDesk(row,col),foot=project({x:native.centerX,y:native.footY},view),front=project({x:native.centerX,y:native.tabletopFrontY},view),artScale=native.width/160*view.scale;
      var obstacle=rect(foot.x-native.width*.44*view.scale,foot.y-30*view.scale,native.width*.88*view.scale,44*view.scale);
      var desk={id:native.id,row:row,col:col,centerX:foot.x,footY:foot.y,tabletopFrontY:front.y,width:native.width*view.scale,height:166*artScale,x:foot.x-80*artScale,y:foot.y-148*artScale,artScale:artScale,zIndex:Math.round(foot.y)+10};
      desks.push(desk);
      // Windows uses a fixed 48px icon image. Keep the icon bottom on the table.
      var iconX=foot.x-24,iconY=front.y-48;
      slots.push({id:native.id,row:row,col:col,centerX:foot.x,footY:foot.y,tabletopFrontY:front.y,iconX:iconX,iconY:iconY,iconSize:48,rect:rect(foot.x-42,iconY-6,84,100),tabletopRect:rect(foot.x-native.width*.46*view.scale,front.y-45*artScale,native.width*.92*view.scale,45*artScale)});
      obstacles.push({id:native.id,kind:'desk',row:row,col:col,x:obstacle.x,y:obstacle.y,width:obstacle.width,height:obstacle.height,rect:obstacle,footY:foot.y,polygon:[{x:obstacle.left,y:obstacle.top},{x:obstacle.right,y:obstacle.top},{x:obstacle.right,y:obstacle.bottom},{x:obstacle.left,y:obstacle.bottom}]});
      var approach=project({x:native.centerX,y:native.footY+42},view);
      waypoints.push({id:native.id+'-approach',deskId:native.id,row:row,col:col,x:approach.x,y:approach.y,kind:'desk',lookAt:{x:front.x,y:front.y-18*view.scale}});
    }
    // Cross aisles join the space between each row. Vertical aisle centers follow
    // the perspective fan of desk columns, keeping all targets outside furniture.
    for(var aisleRow=0;aisleRow<=ROWS;aisleRow++){
      var referenceRow=Math.max(0,Math.min(ROWS-1,aisleRow-.5)),span=1100+60*referenceRow;
      var aisleY=aisleRow===0?292:340+(aisleRow-1)*170+88;
      for(var aisleCol=0;aisleCol<=COLS;aisleCol++){
        var aisleX=aisleCol===0?566:aisleCol===COLS?2018:1280-span/2+(aisleCol-.5)*span/(COLS-1);
        var point=project({x:aisleX,y:aisleY},view);
        waypoints.push({id:'aisle-'+aisleRow+'-'+aisleCol,x:point.x,y:point.y,kind:'aisle'});
      }
    }
    // Visit the actual glowing poros along the left wall. These standing points
    // use the cross-row gaps, clear of both the poros and desk floor footprints.
    [{x:676,y:424,id:'poro-upper-left',lookAt:{x:636,y:404}},{x:638,y:744,id:'poro-lower-left',lookAt:{x:556,y:716}}].forEach(function(point){
      var p=project(point,view),focus=project(point.lookAt,view);
      waypoints.push({id:point.id,x:p.x,y:p.y,kind:'poro',lookAt:focus});
    });
    var polygon=FLOOR.map(function(p){return project({x:p.x*SOURCE_WIDTH,y:p.y*SOURCE_HEIGHT},view);});
    return {view:view,desks:desks,slots:slots,obstacles:obstacles,waypoints:waypoints,polygon:polygon};
  }
  function current(width,height) { return width===undefined&&height===undefined&&active?active.getLayout():computeLayout(width,height); }
  function getIconSlots(width,height) { return current(width,height).slots; }
  function getObstacles(width,height) { return current(width,height).obstacles; }
  function getWaypoints(width,height) { return current(width,height).waypoints; }
  function getWalkablePolygon(width,height) { return current(width,height).polygon; }
  function isIconPoint(x,y,width,height) { return getIconSlots(width,height).some(function(slot){var r=slot.rect;return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;}); }
  function colorBetween(day,night,mix) {
    function parts(hex){return [1,3,5].map(function(i){return parseInt(hex.slice(i,i+2),16);});}
    var a=parts(day),b=parts(night);return 'rgb('+a.map(function(v,i){return Math.round(v+(b[i]-v)*mix);}).join(',')+')';
  }
  function deskSvg(id,row,col) {
    // Broad honey-wood plane for the arena's overhead camera. The floor anchor
    // remains (80,148), with the center of the tabletop's front lip at y=92.
    var grain=(row+col)%3===0?'<path d="M28 62q12-3 21-1m-21 3q8-2 14-1" fill="none" stroke="var(--desk-woodLine)" stroke-width=".65" opacity=".24"/>':'';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 166" aria-hidden="true" focusable="false">'+
      '<defs><linearGradient id="'+id+'-top" x1=".05" y1="0" x2=".85" y2="1"><stop stop-color="var(--desk-woodLight)"/><stop offset=".32" stop-color="var(--desk-woodTop)"/><stop offset=".88" stop-color="var(--desk-woodTop)"/><stop offset="1" stop-color="var(--desk-woodEdge)"/></linearGradient><linearGradient id="'+id+'-leg" x1="0" y1="0" x2="1" y2="0"><stop stop-color="var(--desk-metal)"/><stop offset=".35" stop-color="var(--desk-metalLight)"/><stop offset=".67" stop-color="var(--desk-metal)"/><stop offset="1" stop-color="var(--desk-metalDark)"/></linearGradient><radialGradient id="'+id+'-shadow"><stop stop-color="var(--desk-shadow)" stop-opacity=".28"/><stop offset=".57" stop-color="var(--desk-shadow)" stop-opacity=".16"/><stop offset="1" stop-color="var(--desk-shadow)" stop-opacity="0"/></radialGradient><linearGradient id="'+id+'-chair" x1="0" y1="0" x2=".35" y2="1"><stop stop-color="var(--desk-woodLight)"/><stop offset="1" stop-color="var(--desk-chair)"/></linearGradient></defs>'+
      '<ellipse cx="83" cy="147" rx="75" ry="15" fill="url(#'+id+'-shadow)"/>'+
      '<g class="desk-chair"><path d="M59 20l-5 88m47-88 5 88" fill="none" stroke="var(--desk-metal)" stroke-width="4.2" stroke-linecap="round"/><path d="M61 20l-5 86m43-86 5 86" fill="none" stroke="var(--desk-metalLight)" stroke-width="1.3" opacity=".8"/><path d="M53 9q27-6 54 0l-1 12q-26 5-52 0Z" fill="var(--desk-chairDark)" stroke="var(--desk-metalDark)" stroke-width=".7"/><path d="M55 8q25-5 50 0l-1 10q-24 4-48 0Z" fill="var(--desk-chair)"/><path d="M59 10q21-3 42 0" fill="none" stroke="var(--desk-woodLight)" stroke-width="1" opacity=".64"/><path d="M57 28q23-4 46 0l10 19q-33 7-66 0Z" fill="var(--desk-chairDark)" stroke="var(--desk-metalDark)" stroke-width=".7"/><path d="M58 26q22-4 44 0l9 18q-31 6-62 0Z" fill="url(#'+id+'-chair)"/><path d="M59 29q21-3 42 0m-48 14q27 4 54 0" fill="none" stroke="var(--desk-woodLight)" stroke-width=".9" opacity=".5"/><path d="M61 32q19-2 38 0" fill="none" stroke="var(--desk-woodLine)" stroke-width=".6" opacity=".2"/></g>'+
      '<g class="desk-frame"><path d="M43 78l-3 49m77-49 3 49" fill="none" stroke="var(--desk-metalDark)" stroke-width="4.8" stroke-linecap="round"/><path d="M43 79l-3 46m77-46 3 46" fill="none" stroke="var(--desk-metalLight)" stroke-width="2.9" stroke-linecap="round"/><path d="M33 95l-6 49m100-49 6 49" fill="none" stroke="var(--desk-metalDark)" stroke-width="6.5" stroke-linecap="round"/><path d="M33 96l-6 46m100-46 6 46" fill="none" stroke="url(#'+id+'-leg)" stroke-width="4.5" stroke-linecap="round"/><path d="M29 126q51 5 102 0" fill="none" stroke="var(--desk-teal)" stroke-width="2.7" opacity=".9"/><path d="M30 125q50 5 100 0" fill="none" stroke="var(--desk-metalLight)" stroke-width=".8" opacity=".6"/><path d="M24 147h7m98 0h7" stroke="var(--desk-teal)" stroke-width="3.7" stroke-linecap="round"/></g>'+
      '<path d="M29 95q51 8 102 0l-7 16q-44 6-88 0Z" fill="var(--desk-woodFront)" stroke="var(--desk-woodEdge)" stroke-width=".8"/><path d="M37 106q43 4 86 0" fill="none" stroke="var(--desk-woodLight)" stroke-width=".8" opacity=".27"/><path d="M66 108q14 2 28 0" fill="none" stroke="var(--desk-woodLine)" stroke-width="1.1" opacity=".48"/>'+
      '<path d="M24 42q56-8 112 0l18 40q4 8-10 12-64 11-128 0Q2 91 6 82Z" fill="var(--desk-woodEdge)" stroke="var(--desk-woodFront)" stroke-width=".9"/>'+
      '<path d="M24 38q56-8 112 0l18 40q4 8-10 10Q80 96 16 88 2 86 6 78Z" fill="url(#'+id+'-top)" stroke="var(--desk-woodEdge)" stroke-width=".85"/>'+
      '<path d="M26 40q54-7 108 0M12 83q68 12 136 0" fill="none" stroke="var(--desk-woodLight)" stroke-width="1.35" opacity=".72"/>'+
      '<path d="M28 47q21-3 44-2t62 1M19 70q31-2 60 0t64-1M16 81q33 6 57 5t70-3" fill="none" stroke="var(--desk-woodLine)" stroke-width=".6" opacity=".18"/>'+
      '<path d="M32 51q21-2 37-1m33 28q19 1 32-1" fill="none" stroke="var(--desk-woodLight)" stroke-width=".75" opacity=".22"/>'+grain+
      '<path d="M141 91l4-1" stroke="var(--desk-brass)" stroke-width="1.6" stroke-linecap="round" opacity=".65"/>'+
      '</svg>';
  }
  function create(options) {
    options=options||{};
    var host=options.window||root,doc=options.document||host.document,getState=options.getState||function(){return {nightMix:0};};
    var element=options.element||doc.createElement('div'),created=!options.element,enabled=options.enabled!==false,paused=false,disposed=false,frame=0,lastCheck=-Infinity,lastMix=-1;
    element.classList.add('classroom-scene');element.setAttribute('aria-hidden','true');
    if(created)(doc.getElementById('arena')||doc.body).appendChild(element);
    var layout,items=[],instanceId=++serial;
    for(var row=0;row<ROWS;row++)for(var col=0;col<COLS;col++){
      var desk=doc.createElement('div');desk.className='classroom-desk';desk.dataset.deskId=nativeDesk(row,col).id;
      desk.innerHTML=deskSvg('desk-'+instanceId+'-'+row+'-'+col,row,col);element.appendChild(desk);items.push(desk);
    }
    function setMix(value) {
      var mix=clamp(value);if(Math.abs(mix-lastMix)<.002)return;lastMix=mix;
      Object.keys(DAY).forEach(function(key){element.style.setProperty('--desk-'+key,colorBetween(DAY[key],NIGHT[key],mix));});
    }
    function notifyLayout() { if(typeof host.CustomEvent==='function')host.dispatchEvent(new host.CustomEvent('classroom-layout',{detail:{enabled:enabled&&layout.view.landscape,slots:layout.slots,obstacles:layout.obstacles,waypoints:layout.waypoints,polygon:layout.polygon}})); }
    function resize() {
      layout=computeLayout(host.innerWidth,host.innerHeight);element.hidden=!enabled||!layout.view.landscape;
      if(enabled&&layout.view.landscape)layout.desks.forEach(function(desk,index){var style=items[index].style;style.left=desk.x+'px';style.top=desk.y+'px';style.width=desk.width+'px';style.height=desk.height+'px';style.zIndex=String(desk.zIndex);});
      setMix((getState()||{}).nightMix);notifyLayout();return layout;
    }
    function tick(now) { frame=0;if(disposed||paused)return;if(now-lastCheck>=150){lastCheck=now;setMix((getState()||{}).nightMix);}frame=host.requestAnimationFrame(tick); }
    function setPaused(value) { paused=Boolean(value);if(paused){host.cancelAnimationFrame(frame);frame=0;}else if(!disposed&&!frame)frame=host.requestAnimationFrame(tick); }
    function getLayout() { if(!enabled)return {view:layout.view,desks:[],slots:[],obstacles:[],waypoints:[],polygon:[]};return layout; }
    var instance={resize:resize,setMix:setMix,setPaused:setPaused,setEnabled:function(value){enabled=Boolean(value);resize();},getLayout:getLayout,getIconSlots:function(){return getLayout().slots;},getObstacles:function(){return getLayout().obstacles;},getWaypoints:function(){return getLayout().waypoints;},getWalkablePolygon:function(){return getLayout().polygon;},isIconPoint:function(x,y){return getLayout().slots.some(function(s){var r=s.rect;return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;});},destroy:function(){disposed=true;host.cancelAnimationFrame(frame);host.removeEventListener('resize',resize);items.forEach(function(item){item.remove();});if(created)element.remove();if(active===instance)active=null;}};
    active=instance;host.addEventListener('resize',resize);resize();setPaused(Boolean((getState()||{}).paused));return instance;
  }
  return {rows:ROWS,cols:COLS,sourceWidth:SOURCE_WIDTH,sourceHeight:SOURCE_HEIGHT,computeLayout:computeLayout,nativeDesk:nativeDesk,getIconSlots:getIconSlots,getObstacles:getObstacles,getWaypoints:getWaypoints,getWalkablePolygon:getWalkablePolygon,isIconPoint:isIconPoint,create:create};
});
