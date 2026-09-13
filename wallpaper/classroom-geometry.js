(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ClassroomGeometry = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var SOURCE_WIDTH = 2560, SOURCE_HEIGHT = 1440, ROWS = 4, COLS = 5;
  var FLOOR = [{x:.21,y:.19},{x:.80,y:.19},{x:.80,y:965/1440},{x:.21,y:965/1440}];
  // The screenshot has different framing from our arena video. Matching 134
  // static scene landmarks registers these tabletop centers to the 2560x1440
  // video, preserving its five-column perspective instead of scaling the crop.
  var TABLETOP_CENTERS = [
    [[863.2,274.6],[1060.9,274.9],[1258.5,275.2],[1456.0,275.4],[1653.4,275.7]],
    [[836.2,421.1],[1041.2,426.2],[1255.9,424.0],[1465.6,426.7],[1677.7,426.9]],
    [[804.2,592.0],[1033.7,592.3],[1258.2,592.5],[1480.1,592.7],[1701.9,592.9]],
    [[774.7,780.1],[1011.5,782.7],[1255.6,780.5],[1494.6,783.1],[1731.0,783.3]]
  ];
  var DESKTOP_WIDTHS = [102.45,109.78,117.07,126.86];
  var VISIBLE_HEIGHTS = [122.05,134.25,148.93,166.08];
  var ROTATIONS = [[0,0,0,0,4],[0,0,0,-6,0],[-2,2,0,2,-2],[2,-2,3,0,1]];
  // Atlas contract: canvas160x166, desktop192/248 of its width, tabletop
  // center(80,38), chair feet(80,158), and148px of visible furniture height.
  var DESKTOP_FRACTION = 192/248, ANCHOR_Y = 158, TABLETOP_Y = 38;

  function size(value, fallback) { value=Number(value);return Number.isFinite(value)&&value>0?value:fallback; }
  function clamp(value) { return Math.max(0,Math.min(1,Number(value)||0)); }
  function viewport(width,height) {
    width=size(width,SOURCE_WIDTH);height=size(height,SOURCE_HEIGHT);
    var sceneWidth=Math.min(width,height*16/9),sceneHeight=sceneWidth*9/16;
    return {width:width,height:height,landscape:width>=height,scale:sceneWidth/SOURCE_WIDTH,x:(width-sceneWidth)/2,y:(height-sceneHeight)/2,sceneWidth:sceneWidth,sceneHeight:sceneHeight};
  }
  function project(point,view) { return {x:view.x+point.x*view.scale,y:view.y+point.y*view.scale}; }
  function rect(x,y,width,height) { return {x:x,y:y,width:width,height:height,left:x,top:y,right:x+width,bottom:y+height}; }
  function bounds(points) {
    var xs=points.map(function(p){return p.x;}),ys=points.map(function(p){return p.y;});
    var x=Math.min.apply(null,xs),y=Math.min.apply(null,ys);
    return rect(x,y,Math.max.apply(null,xs)-x,Math.max.apply(null,ys)-y);
  }
  function aroundDesk(x,y,desk) {
    var angle=desk.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
    return {x:desk.centerX+x*c-y*s,y:desk.footY+x*s+y*c};
  }
  function nativeDesk(row,col,profiles) {
    var center=TABLETOP_CENTERS[row][col],deskWidth=DESKTOP_WIDTHS[row]/DESKTOP_FRACTION;
    var deskHeight=VISIBLE_HEIGHTS[row]*166/148,scaleY=deskHeight/166;
    var angle=ROTATIONS[row][col]*Math.PI/180;
    // Rotate around the planted chair feet without moving the measured desk
    // center. The foreground rows have the taller aspect ratio in the reference.
    var centerX=center[0]-(ANCHOR_Y-TABLETOP_Y)*scaleY*Math.sin(angle);
    var footY=center[1]+(ANCHOR_Y-TABLETOP_Y)*scaleY*Math.cos(angle);
    return {id:'desk-'+(row+1)+'-'+(col+1),row:row,col:col,centerX:centerX,footY:footY,width:deskWidth,height:deskHeight,desktopWidth:DESKTOP_WIDTHS[row],tabletopCenterX:center[0],tabletopCenterY:center[1],rotation:ROTATIONS[row][col],light:1.08-col*.034,tabletopFrontY:footY-(ANCHOR_Y-72)*scaleY,profile:profiles&&profiles[row*COLS+col]};
  }

  function computeLayout(width,height,options,profiles,benchLayout) {
    options=options||{};
    var mix=clamp(options.nightMix),desksActive=options.desksActive===undefined?mix<.82:Boolean(options.desksActive);
    var view=viewport(width,height),desks=[],slots=[],obstacles=[],waypoints=[],nativeRows=[];
    if(!view.landscape)return {view:view,desks:desks,slots:slots,obstacles:obstacles,waypoints:waypoints,polygon:[],desksActive:false,nightMix:mix};
    for(var row=0;row<ROWS;row++){
      nativeRows[row]=[];
      for(var col=0;col<COLS;col++){
        var native=nativeDesk(row,col,profiles),sx=native.width/160,sy=native.height/166,foot=project({x:native.centerX,y:native.footY},view),artScale=sx*view.scale;
        var floorPoints=[[-native.width*.43,-48*sy],[native.width*.43,-48*sy],[native.width*.43,0],[-native.width*.43,0]].map(function(p){return aroundDesk(p[0],p[1],native);});
        var nativeObstacle=bounds(floorPoints);
        var obstacle=bounds(floorPoints.map(function(p){return project(p,view);}));
        var tabletopPoints=[[-62*sx,-148*sy],[62*sx,-148*sy],[62*sx,-86*sy],[-62*sx,-86*sy]].map(function(p){return project(aroundDesk(p[0],p[1],native),view);});
        var front=project(aroundDesk(0,-86*sy,native),view);
        var artPoints=[[-80*sx,-158*sy],[80*sx,-158*sy],[80*sx,8*sy],[-80*sx,8*sy]].map(function(p){return project(aroundDesk(p[0],p[1],native),view);});
        desks.push({id:native.id,row:row,col:col,centerX:foot.x,footY:foot.y,tabletopFrontY:front.y,width:native.width*view.scale,height:native.height*view.scale,x:foot.x-80*artScale,y:foot.y-158*sy*view.scale,artScale:artScale,artScaleY:sy*view.scale,desktopWidth:native.desktopWidth*view.scale,tabletopCenter:project({x:native.tabletopCenterX,y:native.tabletopCenterY},view),zIndex:Math.round(foot.y)+10,rotation:native.rotation,light:native.light,profile:native.profile,tabletopRect:bounds(tabletopPoints),artBounds:bounds(artPoints)});
        obstacles.push({id:native.id,kind:'desk',row:row,col:col,x:obstacle.x,y:obstacle.y,width:obstacle.width,height:obstacle.height,rect:obstacle,footY:foot.y,polygon:[{x:obstacle.left,y:obstacle.top},{x:obstacle.right,y:obstacle.top},{x:obstacle.right,y:obstacle.bottom},{x:obstacle.left,y:obstacle.bottom}]});
        nativeRows[row].push({desk:native,rect:nativeObstacle});
        var approach=project({x:native.centerX,y:nativeObstacle.bottom+25},view);
        waypoints.push({id:native.id+'-approach',deskId:native.id,row:row,col:col,x:approach.x,y:approach.y,kind:'desk',lookAt:project({x:native.tabletopCenterX,y:native.tabletopCenterY},view)});
      }
    }
    // Every cross aisle follows the actual shifted and rotated floor footprints.
    // Its vertical clearance includes the 20-source-pixel navigation padding.
    for(var aisleRow=0;aisleRow<=ROWS;aisleRow++){
      var above=aisleRow>0?nativeRows[aisleRow-1]:null,below=aisleRow<ROWS?nativeRows[aisleRow]:null;
      var upper=above?Math.max.apply(null,above.map(function(d){return d.rect.bottom;})):null;
      var lower=below?Math.min.apply(null,below.map(function(d){return d.rect.top;})):null;
      var aisleY=above&&below?(upper+lower)/2:above?upper+25:lower-28;
      for(var aisleCol=0;aisleCol<=COLS;aisleCol++){
        var aisleX;
        if(aisleCol===0)aisleX=584;
        else if(aisleCol===COLS)aisleX=1956;
        else{
          var adjacent=[];
          [above,below].forEach(function(group){if(group)adjacent.push((group[aisleCol-1].rect.right+group[aisleCol].rect.left)/2);});
          aisleX=adjacent.reduce(function(total,value){return total+value;},0)/adjacent.length;
        }
        var point=project({x:aisleX,y:aisleY},view);
        waypoints.push({id:'aisle-'+aisleRow+'-'+aisleCol,x:point.x,y:point.y,kind:'aisle'});
      }
    }
    [{x:700,y:437,id:'poro-upper-left',lookAt:{x:636,y:404}},{x:636,y:790,id:'poro-lower-left',lookAt:{x:556,y:716}}].forEach(function(point){
      var p=project(point,view),focus=project(point.lookAt,view);
      waypoints.push({id:point.id,x:p.x,y:p.y,kind:'poro',lookAt:focus});
    });
    var polygon=FLOOR.map(function(p){return project({x:p.x*SOURCE_WIDTH,y:p.y*SOURCE_HEIGHT},view);});
    slots=benchLayout?benchLayout.getIconSlots(view.width,view.height):[];
    return {view:view,desks:desks,slots:slots,obstacles:desksActive?obstacles:[],waypoints:desksActive?waypoints:waypoints.filter(function(p){return p.kind!=='desk';}),polygon:polygon,desksActive:desksActive,nightMix:mix};
  }
  return {rows:ROWS,cols:COLS,sourceWidth:SOURCE_WIDTH,sourceHeight:SOURCE_HEIGHT,nativeDesk:nativeDesk,computeLayout:computeLayout};
});
