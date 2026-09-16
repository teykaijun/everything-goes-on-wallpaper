(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ClassroomScene = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';
  var SOURCE_WIDTH = 2560, SOURCE_HEIGHT = 1440, ROWS = 4, COLS = 5;
  var active = null, serial = 0;
  var GEOMETRY = root.ClassroomGeometry || (typeof module === 'object' && module.exports ? require('./classroom-geometry.js') : null);
  var BENCH_LAYOUT = root.BenchLayout || (typeof module === 'object' && module.exports ? require('./bench-layout.js') : null);
  var PROFILES = [["#c6a27c","#8d68bd","none","book-papers",0,0],["#648bc4","#ed93b0","backpack","star-case",1,0],["#80b4a7","#ede0be","none","openbook-pencil",0,0],["#d7809f","#805ab8","satchel","bottle",1,0],["#68b5af","#a69bc8","none","books-star",1,0],["#8964b2","#6f91c6","backpack","notebook",1,0],["#c3a07d","#edadd0","none","papers-star",0,0],["#ba9a73","#eadfc4","tote","openbook",1,0],["#b683a8","#7fa8ce","none","bottle-case",0,0],["#80b5ab","#e9bf69","none","notebook-star",0,0],["#d585ad","#7956a9","backpack","book",1,0],["#c7a783","#83a2c8","none","papers-case",0,0],["#c27583","#e9dec2","satchel","openbook",1,0],["#72aeb6","#92aabd","none","books-mascot",0,0],["#d38ab3","#b49ad3","none","bottle-notebook",0,0],["#be946b","#e8d9be","satchel","notebook",1,0],["#648dc6","#8b60ae","backpack","book",1,0],["#c09e79","#e99bc0","none","papers-case",0,0],["#77a9a5","#e9dbb9","tote","openbook",1,0],["#d7a4b8","#8966ba","none","bottle-mascot",0,0]].map(function(p,index){return {id:'student-'+String(index+1).padStart(2,'0'),bagColor:p[0],bookColor:p[1],bagShape:p[2],belongings:p[3],bagSide:p[4],chairAngle:p[5]};});
  var DAY = {shadow:'#392627'};
  var NIGHT = {shadow:'#17152d'};

  function clamp(value) { return Math.max(0,Math.min(1,Number(value)||0)); }
  function nativeDesk(row,col) { return GEOMETRY.nativeDesk(row,col,PROFILES); }
  function computeLayout(width,height,options) {
    return GEOMETRY.computeLayout(width===undefined?root.innerWidth:width,height===undefined?root.innerHeight:height,options,PROFILES,BENCH_LAYOUT||root.BenchLayout);
  }
  function deskOpacity(value) { var t=clamp((clamp(value)-.20)/.62);return 1-t*t*(3-2*t); }
  function nextDeskState(previous,mix) { return previous?mix<.82:mix<=.74; }
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
  // Twenty individual sprites, selected from the unchanged generated atlas.
  // Crop metrics and the measured tabletop/foot anchors are shared with geometry.
  var SPRITES = Array.from({length:20},function(_,index){return index;});
  var ATLAS_X = [134,380.5,626,871.5,1117], ATLAS_Y = [45,340,639,937];
  function deskSvg(id,row,col) {
    var tileX=ATLAS_X[col]-124,tileY=ATLAS_Y[row];
    var shadowOpacity=.25-col*.018;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 166" preserveAspectRatio="none" aria-hidden="true" focusable="false">'+
      '<defs><filter id="'+id+'-shadow" x="-35%" y="-70%" width="190%" height="230%"><feGaussianBlur stdDeviation="2.2"/></filter><filter id="'+id+'-matte"><feComponentTransfer><feFuncA type="linear" slope="1.035" intercept="-.035"/></feComponentTransfer></filter></defs>'+
      '<g class="desk-cast-shadow" fill="var(--desk-shadow)" opacity="'+shadowOpacity+'" filter="url(#'+id+'-shadow)"><ellipse cx="81" cy="156" rx="48" ry="7"/><path d="M31 123L59 147 143 154 129 132 117 117 71 117Z"/><path d="M56 156l19 12 42 2-17-15-15-5-23 1Z"/></g>'+
      '<svg class="desk-illustration" x="0" y="0" width="160" height="166" style="clip-path:inset(0 0 0 '+(row===3&&col===2?'2%':'0')+')" viewBox="'+tileX+' '+tileY+' 248 259" preserveAspectRatio="none" overflow="hidden"><image href="media/classroom-v4/desks.png" x="0" y="0" width="1254" height="1254" filter="url(#'+id+'-matte)"/></svg></svg>';
  }
  function create(options) {
    options=options||{};
    var host=options.window||root,doc=options.document||host.document,getState=options.getState||function(){return {nightMix:0};};
    var element=options.element||doc.createElement('div'),created=!options.element,enabled=options.enabled!==false,paused=false,disposed=false,frame=0,lastCheck=-Infinity,lastMix=-1;
    element.classList.add('classroom-scene');element.setAttribute('aria-hidden','true');
    if(created)(doc.getElementById('arena')||doc.body).appendChild(element);
    var layout,items=[],instanceId=++serial,desksActive=clamp((getState()||{}).nightMix)<.82;
    for(var row=0;row<ROWS;row++)for(var col=0;col<COLS;col++){
      var desk=doc.createElement('div');desk.className='classroom-desk';desk.dataset.deskId=nativeDesk(row,col).id;
      desk.innerHTML=deskSvg('desk-'+instanceId+'-'+row+'-'+col,row,col);element.appendChild(desk);items.push(desk);
    }
    function setMix(value) {
      var mix=clamp(value),previous=desksActive;desksActive=nextDeskState(desksActive,mix);
      if(Math.abs(mix-lastMix)>=.002||previous!==desksActive){
        lastMix=mix;element.style.setProperty('--desk-opacity',String(deskOpacity(mix)));
        Object.keys(DAY).forEach(function(key){element.style.setProperty('--desk-'+key,colorBetween(DAY[key],NIGHT[key],mix));});
      }
      if(layout)layout.nightMix=mix;
      if(layout&&(previous!==desksActive)){
        layout=computeLayout(host.innerWidth,host.innerHeight,{nightMix:mix,desksActive:desksActive});
        notifyLayout({navigationChanged:true,viewportChanged:false});
      }
    }
    function notifyLayout(flags) {
      var current=getLayout();
      if(typeof host.CustomEvent==='function')host.dispatchEvent(new host.CustomEvent('classroom-layout',{detail:Object.assign({enabled:enabled&&layout.view.landscape,desksActive:enabled&&desksActive,nightMix:lastMix,slots:current.slots,obstacles:current.obstacles,waypoints:current.waypoints,polygon:current.polygon},flags)}));
    }
    function resize() {
      var previous=layout&&layout.view,mix=clamp((getState()||{}).nightMix);
      desksActive=nextDeskState(desksActive,mix);layout=computeLayout(host.innerWidth,host.innerHeight,{nightMix:mix,desksActive:desksActive});element.hidden=!enabled||!layout.view.landscape;
      if(enabled&&layout.view.landscape)layout.desks.forEach(function(desk,index){var style=items[index].style;style.left=desk.x+'px';style.top=desk.y+'px';style.width=desk.width+'px';style.height=desk.height+'px';style.zIndex=String(desk.zIndex);style.transform='rotate('+desk.rotation+'deg)';style.setProperty('--desk-light',String(desk.light));items[index].dataset.sprite=String(SPRITES[index]);});
      setMix(mix);notifyLayout({navigationChanged:true,viewportChanged:!previous||previous.width!==layout.view.width||previous.height!==layout.view.height});return layout;
    }
    function tick(now) { frame=0;if(disposed||paused)return;if(now-lastCheck>=150){lastCheck=now;setMix((getState()||{}).nightMix);}frame=host.requestAnimationFrame(tick); }
    function setPaused(value) { paused=Boolean(value);if(paused){host.cancelAnimationFrame(frame);frame=0;}else if(!disposed&&!frame)frame=host.requestAnimationFrame(tick); }
    function getLayout() { if(!enabled)return {view:layout.view,desks:[],slots:layout.slots,obstacles:[],waypoints:layout.waypoints.filter(function(p){return p.kind!=='desk';}),polygon:layout.polygon,desksActive:false,nightMix:lastMix};return layout; }
    var instance={resize:resize,setMix:setMix,setPaused:setPaused,setEnabled:function(value){enabled=Boolean(value);resize();},getLayout:getLayout,getIconSlots:function(){return getLayout().slots;},getObstacles:function(){return getLayout().obstacles;},getWaypoints:function(){return getLayout().waypoints;},getWalkablePolygon:function(){return getLayout().polygon;},isIconPoint:function(x,y){return getLayout().slots.some(function(s){var r=s.rect;return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;});},destroy:function(){disposed=true;host.cancelAnimationFrame(frame);host.removeEventListener(host.WallpaperViewport?'wallpaper-resize':'resize',resize);items.forEach(function(item){item.remove();});if(created)element.remove();if(active===instance)active=null;}};
    active=instance;host.addEventListener(host.WallpaperViewport?'wallpaper-resize':'resize',resize);resize();setPaused(Boolean((getState()||{}).paused));return instance;
  }
  return {rows:ROWS,cols:COLS,sourceWidth:SOURCE_WIDTH,sourceHeight:SOURCE_HEIGHT,deskOpacity:deskOpacity,nextDeskState:nextDeskState,profiles:PROFILES,computeLayout:computeLayout,nativeDesk:nativeDesk,getIconSlots:getIconSlots,getObstacles:getObstacles,getWaypoints:getWaypoints,getWalkablePolygon:getWalkablePolygon,isIconPoint:isIconPoint,create:create};
});
