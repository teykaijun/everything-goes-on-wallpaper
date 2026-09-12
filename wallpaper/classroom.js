(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ClassroomScene = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';
  var SOURCE_WIDTH = 2560, SOURCE_HEIGHT = 1440, ROWS = 4, COLS = 6;
  var active = null, serial = 0;
  var FLOOR = [{x:.21,y:.19},{x:.80,y:.19},{x:.80,y:965/1440},{x:.21,y:965/1440}];
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
    var span=1100+10*row,deskWidth=164+8*row,centerX=1280-5*row-span/2+col*span/(COLS-1),footY=400+170*row;
    return {id:'desk-'+(row+1)+'-'+(col+1),row:row,col:col,centerX:centerX,footY:footY,width:deskWidth,tabletopFrontY:footY-56*deskWidth/160,profile:PROFILES[row*COLS+col]};
  }
  function computeLayout(width,height,options) {
    options=options||{};var mix=clamp(options.nightMix),desksActive=options.desksActive===undefined?mix<.82:Boolean(options.desksActive);
    var view=viewport(width,height),desks=[],slots=[],obstacles=[],waypoints=[];
    if(!view.landscape)return {view:view,desks:desks,slots:slots,obstacles:obstacles,waypoints:waypoints,polygon:[]};
    for(var row=0;row<ROWS;row++)for(var col=0;col<COLS;col++){
      var native=nativeDesk(row,col),foot=project({x:native.centerX,y:native.footY},view),front=project({x:native.centerX,y:native.tabletopFrontY},view),artScale=native.width/160*view.scale;
      var obstacle=rect(foot.x-native.width*.52*view.scale,foot.y-35*view.scale,native.width*1.04*view.scale,47*view.scale);
      var desk={id:native.id,row:row,col:col,centerX:foot.x,footY:foot.y,tabletopFrontY:front.y,width:native.width*view.scale,height:166*artScale,x:foot.x-80*artScale,y:foot.y-148*artScale,artScale:artScale,zIndex:Math.round(foot.y)+10,profile:native.profile,tabletopRect:rect(foot.x-native.width*.46*view.scale,front.y-55*artScale,native.width*.92*view.scale,55*artScale)};
      desks.push(desk);
      obstacles.push({id:native.id,kind:'desk',row:row,col:col,x:obstacle.x,y:obstacle.y,width:obstacle.width,height:obstacle.height,rect:obstacle,footY:foot.y,polygon:[{x:obstacle.left,y:obstacle.top},{x:obstacle.right,y:obstacle.top},{x:obstacle.right,y:obstacle.bottom},{x:obstacle.left,y:obstacle.bottom}]});
      var approach=project({x:native.centerX,y:native.footY+35},view);
      waypoints.push({id:native.id+'-approach',deskId:native.id,row:row,col:col,x:approach.x,y:approach.y,kind:'desk',lookAt:{x:front.x,y:front.y-18*view.scale}});
    }
    // Cross aisles join the space between each row. Vertical aisle centers follow
    // the perspective fan of desk columns, keeping all targets outside furniture.
    for(var aisleRow=0;aisleRow<=ROWS;aisleRow++){
      var referenceRow=Math.max(0,Math.min(ROWS-1,aisleRow-.5)),span=1100+10*referenceRow;
      var aisleY=aisleRow===0?316:aisleRow===ROWS?944:400+(aisleRow-1)*170+85;
      for(var aisleCol=0;aisleCol<=COLS;aisleCol++){
        var aisleX=aisleCol===0?566:aisleCol===COLS?1922:1280-5*referenceRow-span/2+(aisleCol-.5)*span/(COLS-1);
        var point=project({x:aisleX,y:aisleY},view);
        waypoints.push({id:'aisle-'+aisleRow+'-'+aisleCol,x:point.x,y:point.y,kind:'aisle'});
      }
    }
    // Visit the actual glowing poros along the left wall. These standing points
    // use the cross-row gaps, clear of both the poros and desk floor footprints.
    [{x:676,y:445,id:'poro-upper-left',lookAt:{x:636,y:404}},{x:636,y:790,id:'poro-lower-left',lookAt:{x:556,y:716}}].forEach(function(point){
      var p=project(point,view),focus=project(point.lookAt,view);
      waypoints.push({id:point.id,x:p.x,y:p.y,kind:'poro',lookAt:focus});
    });
    var polygon=FLOOR.map(function(p){return project({x:p.x*SOURCE_WIDTH,y:p.y*SOURCE_HEIGHT},view);});
    slots=benchSlots(view);
    return {view:view,desks:desks,slots:slots,obstacles:desksActive?obstacles:[],waypoints:desksActive?waypoints:waypoints.filter(function(p){return p.kind!=='desk';}),polygon:polygon,desksActive:desksActive,nightMix:mix};
  }
  function benchSlots(view) {
    var bench=BENCH_LAYOUT||root.BenchLayout;
    return bench?bench.getIconSlots(view.width,view.height):[];
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
  function bagSvg(profile) {
    var side=profile.bagSide,x=side<0?2:133,y=105,color=profile.bagColor;
    if(profile.bagShape==='round')return '<g transform="translate('+x+' '+(y+6)+')"><ellipse cx="12" cy="34" rx="16" ry="4" fill="var(--desk-shadow)" opacity=".17"/><path d="M6 5q6-10 13 0" fill="none" stroke="'+color+'" stroke-width="3"/><circle cx="13" cy="20" r="16" fill="'+color+'" stroke="var(--desk-metalDark)" stroke-width=".65"/><circle cx="13" cy="20" r="12" fill="none" stroke="#f0dcd5" stroke-width=".9" opacity=".55"/><path d="M6 13q7-3 14 0" fill="none" stroke="#f6e8cd" stroke-width="1.2" opacity=".5"/><path d="M12 15l1-3 1 3 3 1-3 1-1 3-1-3-3-1Z" fill="#ead5ac" opacity=".65"/></g>';
    var top=profile.bagShape==='tote'?'<path d="M6 9q0-13 8-13t8 13" fill="none" stroke="'+color+'" stroke-width="3"/>':'<path d="M8 3q7-9 13 0" fill="none" stroke="'+color+'" stroke-width="3"/>';
    var pocket=profile.bagShape==='satchel'?'<path d="M2 7q12 8 26 0v9q-13 6-26 0Z" fill="#fff0d8" opacity=".18"/><rect x="13" y="14" width="4" height="6" rx="1" fill="#eed19b"/>':'<rect x="6" y="18" width="17" height="11" rx="3" fill="#fff0d8" opacity=".14"/><path d="M8 21h12" stroke="#ead9c2" stroke-width="1" opacity=".7"/>';
    return '<g transform="translate('+x+' '+y+') rotate('+(side*5)+' 14 18)"><ellipse cx="14" cy="38" rx="18" ry="4" fill="var(--desk-shadow)" opacity=".16"/>'+top+'<path d="M3 5q12-4 24 0l3 28q-15 6-30 0Z" fill="'+color+'" stroke="var(--desk-metalDark)" stroke-width=".65"/><path d="M3 8l2 23m21-22-1 22" fill="none" stroke="#fff1d9" stroke-width=".8" opacity=".35"/>'+pocket+'</g>';
  }
  function belongingsSvg(profile,index) {
    var variant=profile.belongings,color=profile.bookColor,angle=(index%5-2)*3,x=40+(index%3)*5,y=54+(index%2)*4;
    var paper='<g transform="rotate('+(angle+8)+' 94 65)"><path d="M80 51l27 2 3 23-29-2Z" fill="#fff3d8" stroke="#c8af84" stroke-width=".55"/><path d="M85 58l16 1m-16 4 18 1m-17 4 11 1" stroke="#9eabb0" stroke-width=".6" opacity=".65"/></g>';
    var book='<g transform="rotate('+angle+' '+(x+17)+' '+(y+10)+')"><path d="M'+x+' '+(y+2)+'l34-1 2 21-36 2Z" fill="#9d835e" opacity=".15"/><path d="M'+x+' '+y+'l33-1 1 20-34 2Z" fill="#e9ddc3" stroke="#a78b67" stroke-width=".6"/><path d="M'+x+' '+(y-2)+'l33-1 1 19-34 2Z" fill="'+color+'" stroke="#927f6b" stroke-width=".6"/><path d="M'+(x+4)+' '+(y-1)+'l1 17" stroke="#fff1d6" stroke-width=".9" opacity=".65"/><path d="M'+(x+11)+' '+(y+5)+'l14-1m-12 4 10-1" stroke="#fff1d6" stroke-width=".9" opacity=".55"/></g>';
    if(variant.indexOf('openbook')>=0)book='<g transform="rotate('+angle+' 60 65)"><path d="M36 55q12-6 25-1 13-7 27-2l-1 24q-13-4-26 2-12-5-24 0Z" fill="'+color+'" opacity=".8"/><path d="M38 54q11-5 23 0 13-6 25-2l-1 22q-12-4-24 2-12-4-23 1Z" fill="#f8ebce" stroke="#bba887" stroke-width=".65"/><path d="M61 55v20m-18-16 12 1m-12 4 12 1m13-7 12-1m-12 5 12-1" stroke="#a8aaa2" stroke-width=".65" opacity=".7"/></g>';
    if(variant.indexOf('papers')===0)book=paper.replace('94 65','67 65').replace('M80','M50').replace('M85','M55');
    var extra='';
    if(variant.indexOf('books')===0)extra='<g transform="translate(7 -5)">'+book+'</g>';
    if(variant.indexOf('papers')>0)extra+=paper;
    if(variant.indexOf('case')>=0)extra+='<g transform="rotate(-9 116 76)"><rect x="101" y="70" width="29" height="10" rx="4" fill="'+profile.bagColor+'" stroke="#897e73" stroke-width=".55"/><path d="M105 74h21" stroke="#ebd7b5" stroke-width=".8"/><path d="M125 73v4" stroke="#e9c478" stroke-width="1.1"/></g>';
    if(variant.indexOf('pencil')>=0)extra+='<g transform="rotate(13 117 69)"><path d="M108 65h25" stroke="#d2a14c" stroke-width="2.2"/><path d="M107 69h23" stroke="'+profile.bagColor+'" stroke-width="2"/><path d="M132 64l4 1-4 1m-3 2 4 1-4 1" fill="#e8d8b9"/><path d="M135 65h2m-5 4h2" stroke="#5b5e69" stroke-width="1"/></g>';
    if(variant.indexOf('bottle')>=0)extra+='<g transform="translate(117 48)"><ellipse cx="5" cy="23" rx="8" ry="3" fill="#927650" opacity=".18"/><path d="M1 3h8l2 17q-6 5-12 0Z" fill="'+profile.bagColor+'" stroke="#8f9291" stroke-width=".6"/><rect x="1" y="0" width="8" height="5" rx="1.5" fill="#eadab9"/><path d="M2 7v10" stroke="#f4edda" stroke-width="1.3" opacity=".6"/></g>';
    if(variant.indexOf('frog')>=0)extra+='<g transform="translate(115 63)"><ellipse cx="7" cy="11" rx="11" ry="4" fill="#9b7d53" opacity=".18"/><ellipse cx="7" cy="5" rx="9" ry="7" fill="#93b276"/><circle cx="2" cy="0" r="3" fill="#adc58a"/><circle cx="12" cy="0" r="3" fill="#adc58a"/><circle cx="2" cy="0" r=".8" fill="#576957"/><circle cx="12" cy="0" r=".8" fill="#576957"/><path d="M4 7q3 2 6 0" fill="none" stroke="#647c58" stroke-width=".65"/></g>';
    if(variant.indexOf('star')>=0)extra+='<path d="M119 69l3 6 6 1-5 5 1 6-5-3-6 3 1-6-5-5 7-1Z" fill="#e9bf78" stroke="#c49764" stroke-width=".65"/>';
    return '<g class="desk-belongings">'+extra+book+'</g>';
  }
  function deskSvg(id,row,col) {
    // Broad honey-wood plane for the arena's overhead camera. The floor anchor
    // remains (80,148), with the center of the tabletop's front lip at y=92.
    var profile=PROFILES[row*COLS+col],index=row*COLS+col;
    var grain=(row+col)%3===0?'<path d="M28 62q12-3 21-1m-21 3q8-2 14-1" fill="none" stroke="var(--desk-woodLine)" stroke-width=".65" opacity=".24"/>':'';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 166" aria-hidden="true" focusable="false">'+
      '<defs><linearGradient id="'+id+'-top" x1=".05" y1="0" x2=".85" y2="1"><stop stop-color="var(--desk-woodLight)"/><stop offset=".32" stop-color="var(--desk-woodTop)"/><stop offset=".88" stop-color="var(--desk-woodTop)"/><stop offset="1" stop-color="var(--desk-woodEdge)"/></linearGradient><linearGradient id="'+id+'-leg" x1="0" y1="0" x2="1" y2="0"><stop stop-color="var(--desk-metal)"/><stop offset=".35" stop-color="var(--desk-metalLight)"/><stop offset=".67" stop-color="var(--desk-metal)"/><stop offset="1" stop-color="var(--desk-metalDark)"/></linearGradient><radialGradient id="'+id+'-shadow"><stop stop-color="var(--desk-shadow)" stop-opacity=".28"/><stop offset=".57" stop-color="var(--desk-shadow)" stop-opacity=".16"/><stop offset="1" stop-color="var(--desk-shadow)" stop-opacity="0"/></radialGradient><linearGradient id="'+id+'-chair" x1="0" y1="0" x2=".35" y2="1"><stop stop-color="var(--desk-woodLight)"/><stop offset="1" stop-color="var(--desk-chair)"/></linearGradient></defs>'+
      '<ellipse cx="83" cy="147" rx="75" ry="15" fill="url(#'+id+'-shadow)"/>'+
      '<g class="desk-chair" transform="rotate('+profile.chairAngle+' 80 31)"><path d="M59 20l-5 88m47-88 5 88" fill="none" stroke="var(--desk-metal)" stroke-width="4.2" stroke-linecap="round"/><path d="M61 20l-5 86m43-86 5 86" fill="none" stroke="var(--desk-metalLight)" stroke-width="1.3" opacity=".8"/><path d="M53 9q27-6 54 0l-1 12q-26 5-52 0Z" fill="var(--desk-chairDark)" stroke="var(--desk-metalDark)" stroke-width=".7"/><path d="M55 8q25-5 50 0l-1 10q-24 4-48 0Z" fill="var(--desk-chair)"/><path d="M59 10q21-3 42 0" fill="none" stroke="var(--desk-woodLight)" stroke-width="1" opacity=".64"/><path d="M57 28q23-4 46 0l10 19q-33 7-66 0Z" fill="var(--desk-chairDark)" stroke="var(--desk-metalDark)" stroke-width=".7"/><path d="M58 26q22-4 44 0l9 18q-31 6-62 0Z" fill="url(#'+id+'-chair)"/><path d="M59 29q21-3 42 0m-48 14q27 4 54 0" fill="none" stroke="var(--desk-woodLight)" stroke-width=".9" opacity=".5"/><path d="M61 32q19-2 38 0" fill="none" stroke="var(--desk-woodLine)" stroke-width=".6" opacity=".2"/></g>'+
      '<g class="desk-frame"><path d="M43 78l-3 49m77-49 3 49" fill="none" stroke="var(--desk-metalDark)" stroke-width="4.8" stroke-linecap="round"/><path d="M43 79l-3 46m77-46 3 46" fill="none" stroke="var(--desk-metalLight)" stroke-width="2.9" stroke-linecap="round"/><path d="M33 95l-6 49m100-49 6 49" fill="none" stroke="var(--desk-metalDark)" stroke-width="6.5" stroke-linecap="round"/><path d="M33 96l-6 46m100-46 6 46" fill="none" stroke="url(#'+id+'-leg)" stroke-width="4.5" stroke-linecap="round"/><path d="M29 126q51 5 102 0" fill="none" stroke="var(--desk-teal)" stroke-width="2.7" opacity=".9"/><path d="M30 125q50 5 100 0" fill="none" stroke="var(--desk-metalLight)" stroke-width=".8" opacity=".6"/><path d="M24 147h7m98 0h7" stroke="var(--desk-teal)" stroke-width="3.7" stroke-linecap="round"/></g>'+
      bagSvg(profile)+
      '<path d="M29 95q51 8 102 0l-7 16q-44 6-88 0Z" fill="var(--desk-woodFront)" stroke="var(--desk-woodEdge)" stroke-width=".8"/><path d="M37 106q43 4 86 0" fill="none" stroke="var(--desk-woodLight)" stroke-width=".8" opacity=".27"/><path d="M66 108q14 2 28 0" fill="none" stroke="var(--desk-woodLine)" stroke-width="1.1" opacity=".48"/>'+
      '<path d="M24 42q56-8 112 0l18 40q4 8-10 12-64 11-128 0Q2 91 6 82Z" fill="var(--desk-woodEdge)" stroke="var(--desk-woodFront)" stroke-width=".9"/>'+
      '<path d="M24 38q56-8 112 0l18 40q4 8-10 10Q80 96 16 88 2 86 6 78Z" fill="url(#'+id+'-top)" stroke="var(--desk-woodEdge)" stroke-width=".85"/>'+
      '<path d="M24 38q56-8 112 0l18 40q4 8-10 10Q80 96 16 88 2 86 6 78Z" fill="'+profile.woodTint+'" opacity=".09"/>'+
      '<path d="M26 40q54-7 108 0M12 83q68 12 136 0" fill="none" stroke="var(--desk-woodLight)" stroke-width="1.35" opacity=".72"/>'+
      '<path d="M28 47q21-3 44-2t62 1M19 70q31-2 60 0t64-1M16 81q33 6 57 5t70-3" fill="none" stroke="var(--desk-woodLine)" stroke-width=".6" opacity=".18"/>'+
      '<path d="M32 51q21-2 37-1m33 28q19 1 32-1" fill="none" stroke="var(--desk-woodLight)" stroke-width=".75" opacity=".22"/>'+grain+
      '<path d="M141 91l4-1" stroke="var(--desk-brass)" stroke-width="1.6" stroke-linecap="round" opacity=".65"/>'+
      belongingsSvg(profile,index)+
      '</svg>';
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
      if(enabled&&layout.view.landscape)layout.desks.forEach(function(desk,index){var style=items[index].style;style.left=desk.x+'px';style.top=desk.y+'px';style.width=desk.width+'px';style.height=desk.height+'px';style.zIndex=String(desk.zIndex);});
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
