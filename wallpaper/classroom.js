(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ClassroomScene = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';
  var SOURCE_WIDTH = 2560, SOURCE_HEIGHT = 1440, ROWS = 4, COLS = 6;
  var active = null, serial = 0;
  var GEOMETRY = root.ClassroomGeometry || (typeof module === 'object' && module.exports ? require('./classroom-geometry.js') : null);
  var BENCH_LAYOUT = root.BenchLayout || (typeof module === 'object' && module.exports ? require('./bench-layout.js') : null);
  var PROFILES = [
    ['#5baba2','#edaaae','satchel','book-papers',-1,-2],['#718ebb','#9585b7','backpack','books-star',1,1],
    ['#ab82aa','#659d9b','tote','notebook-case',-1,2],['#dd9ca5','#7399be','backpack','book-bottle',1,-1],
    ['#688eaa','#d5aa69','satchel','papers-pencil',1,2],['#bd97c0','#cb888b','tote','openbook-case',-1,-2],
    ['#cb9c71','#80a7a2','backpack','books-bottle',1,1],['#77a8a3','#9d8db7','satchel','notebook-papers',-1,-1],
    ['#d7a5ae','#7d96b9','tote','openbook-pencil',1,2],['#7f9cba','#d1a777','backpack','papers-case',-1,-2],
    ['#9484ad','#e0b2ac','satchel','book-bottle',-1,1],['#a8b993','#8099b2','tote','books-pencil',1,-1],
    ['#699caa','#d4b782','backpack','notebook-case',-1,2],['#a886bd','#93b4ab','round','book-papers',1,-2],
    ['#db9eb4','#9e8db8','satchel','openbook-bottle',1,1],['#7293b6','#d59b97','tote','books-case',-1,-1],
    ['#ac8b91','#8dafa2','backpack','papers-pencil',1,2],['#8ba5b8','#c3a873','satchel','book-frog',-1,-2],
    ['#a98cbd','#bc9d73','tote','openbook-papers',1,1],['#69a59c','#d69dac','backpack','books-case',-1,-1],
    ['#d1a48a','#88a1bb','satchel','notebook-bottle',-1,2],['#8aa8b9','#b795bc','tote','papers-case',1,-2],
    ['#b58da9','#6ca7a1','backpack','openbook-pencil',-1,1],['#7899ac','#d4b377','round','books-bottle',1,-1]
  ].map(function(p,index){return {id:'student-'+String(index+1).padStart(2,'0'),bagColor:p[0],bookColor:p[1],bagShape:p[2],belongings:p[3],bagSide:p[4],chairAngle:p[5],woodTint:['#8b5c2e','#f8e1a4','#c59c55','#c2905d'][index%4]};});
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
  // A cached transparent illustration atlas supplies painted material and chair
  // detail. Viewports select each sprite without modifying the generated PNG.
  var SPRITES = [0,1,3,7,9,10, 2,8,5,9,0,11, 3,10,8,2,4,1, 9,0,11,1,8,6];
  function deskSvg(id,row,col) {
    var sprite=SPRITES[row*COLS+col],tileX=(sprite%4)*313.5,tileY=[72,456,834][Math.floor(sprite/4)];
    var shadowOpacity=.30-col*.025;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 166" aria-hidden="true" focusable="false">'+
      '<defs><filter id="'+id+'-shadow" x="-35%" y="-70%" width="190%" height="230%"><feGaussianBlur stdDeviation="2.7"/></filter><filter id="'+id+'-matte"><feComponentTransfer><feFuncA type="linear" slope="1.035" intercept="-.035"/></feComponentTransfer></filter></defs>'+
      '<g class="desk-cast-shadow" fill="var(--desk-shadow)" opacity="'+shadowOpacity+'" filter="url(#'+id+'-shadow)"><path d="M31 117L75 142 147 157 131 124 119 98 74 100Z"/><path d="M52 147l40 29 47 3-29-33-21-12-25 2Z"/></g>'+
      '<svg class="desk-illustration" x="0" y="0" width="160" height="166" viewBox="'+tileX+' '+tileY+' 313.5 386" preserveAspectRatio="none" overflow="hidden"><image href="media/classroom-v3/desks.png" x="0" y="0" width="1254" height="1254" filter="url(#'+id+'-matte)"/></svg></svg>';
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
    var instance={resize:resize,setMix:setMix,setPaused:setPaused,setEnabled:function(value){enabled=Boolean(value);resize();},getLayout:getLayout,getIconSlots:function(){return getLayout().slots;},getObstacles:function(){return getLayout().obstacles;},getWaypoints:function(){return getLayout().waypoints;},getWalkablePolygon:function(){return getLayout().polygon;},isIconPoint:function(x,y){return getLayout().slots.some(function(s){var r=s.rect;return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;});},destroy:function(){disposed=true;host.cancelAnimationFrame(frame);host.removeEventListener('resize',resize);items.forEach(function(item){item.remove();});if(created)element.remove();if(active===instance)active=null;}};
    active=instance;host.addEventListener('resize',resize);resize();setPaused(Boolean((getState()||{}).paused));return instance;
  }
  return {rows:ROWS,cols:COLS,sourceWidth:SOURCE_WIDTH,sourceHeight:SOURCE_HEIGHT,deskOpacity:deskOpacity,nextDeskState:nextDeskState,profiles:PROFILES,computeLayout:computeLayout,nativeDesk:nativeDesk,getIconSlots:getIconSlots,getObstacles:getObstacles,getWaypoints:getWaypoints,getWalkablePolygon:getWalkablePolygon,isIconPoint:isIconPoint,create:create};
});
