(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ClassroomGeometry = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var SOURCE_WIDTH = 2560, SOURCE_HEIGHT = 1440, ROWS = 4, COLS = 6;
  var FLOOR = [{x:.21,y:.19},{x:.80,y:.19},{x:.80,y:965/1440},{x:.21,y:965/1440}];
  // Small, fixed differences preserve a lived-in classroom while keeping the
  // walking lanes stable. Perspective widens toward the foreground.
  var X_OFFSETS = [[-4,3,-5,5,-3,1],[-8,-2,4,1,5,-3],[2,-5,4,-7,3,0],[-3,6,-4,3,-5,-4]];
  var Y_OFFSETS = [[-3,4,-5,1,-2,5],[3,-5,2,-3,5,-1],[-4,3,-1,5,-3,2],[2,-4,3,-2,4,-5]];
  var WIDTH_OFFSETS = [[-3,2,0,3,-1,-2],[2,-2,3,-1,1,-3],[-2,3,-1,2,-3,1],[1,-3,2,-2,3,-1]];
  var ROTATIONS = [[-1.5,.7,-.6,1.1,-.9,1.6],[1.3,-1.7,.8,-.5,1.6,-1.1],[-.8,1.5,-1.2,.6,-1.8,.9],[1.7,-.9,1.2,-1.5,.7,-1.3]];

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
    var span=1046+8*row,deskWidth=154+8*row+WIDTH_OFFSETS[row][col];
    var centerX=1288-span/2+col*span/(COLS-1)+X_OFFSETS[row][col];
    var footY=460+143*row+Y_OFFSETS[row][col];
    return {id:'desk-'+(row+1)+'-'+(col+1),row:row,col:col,centerX:centerX,footY:footY,width:deskWidth,rotation:ROTATIONS[row][col],light:1.10-col*.042+(row===1?.012:row===3?-.016:0),tabletopFrontY:footY-86*deskWidth/160,profile:profiles&&profiles[row*COLS+col]};
  }
  function computeLayout(width,height,options,profiles,benchLayout) {
    options=options||{};
    var mix=clamp(options.nightMix),desksActive=options.desksActive===undefined?mix<.82:Boolean(options.desksActive);
    var view=viewport(width,height),desks=[],slots=[],obstacles=[],waypoints=[],nativeRows=[];
    if(!view.landscape)return {view:view,desks:desks,slots:slots,obstacles:obstacles,waypoints:waypoints,polygon:[],desksActive:false,nightMix:mix};
    for(var row=0;row<ROWS;row++){
      nativeRows[row]=[];
      for(var col=0;col<COLS;col++){
        var native=nativeDesk(row,col,profiles),s=native.width/160,foot=project({x:native.centerX,y:native.footY},view),artScale=s*view.scale;
        var floorPoints=[[-native.width*.50,-35],[native.width*.50,-35],[native.width*.50,12],[-native.width*.50,12]].map(function(p){return aroundDesk(p[0],p[1],native);});
        var nativeObstacle=bounds(floorPoints);
        var obstacle=bounds(floorPoints.map(function(p){return project(p,view);}));
        var tabletopPoints=[[-native.width*.43,-132*s],[native.width*.43,-132*s],[native.width*.43,-86*s],[-native.width*.43,-86*s]].map(function(p){return project(aroundDesk(p[0],p[1],native),view);});
        var front=project(aroundDesk(0,-86*s,native),view);
        var artPoints=[[-80*s,-148*s],[80*s,-148*s],[80*s,18*s],[-80*s,18*s]].map(function(p){return project(aroundDesk(p[0],p[1],native),view);});
        desks.push({id:native.id,row:row,col:col,centerX:foot.x,footY:foot.y,tabletopFrontY:front.y,width:native.width*view.scale,height:166*artScale,x:foot.x-80*artScale,y:foot.y-148*artScale,artScale:artScale,zIndex:Math.round(foot.y)+10,rotation:native.rotation,light:native.light,profile:native.profile,tabletopRect:bounds(tabletopPoints),artBounds:bounds(artPoints)});
        obstacles.push({id:native.id,kind:'desk',row:row,col:col,x:obstacle.x,y:obstacle.y,width:obstacle.width,height:obstacle.height,rect:obstacle,footY:foot.y,polygon:[{x:obstacle.left,y:obstacle.top},{x:obstacle.right,y:obstacle.top},{x:obstacle.right,y:obstacle.bottom},{x:obstacle.left,y:obstacle.bottom}]});
        nativeRows[row].push({desk:native,rect:nativeObstacle});
        var approach=project({x:native.centerX,y:nativeObstacle.bottom+25},view);
        waypoints.push({id:native.id+'-approach',deskId:native.id,row:row,col:col,x:approach.x,y:approach.y,kind:'desk',lookAt:project(aroundDesk(0,-116*s,native),view)});
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
    var firstRowBottom=Math.max.apply(null,nativeRows[0].map(function(d){return d.rect.bottom;}));
    [{x:660,y:firstRowBottom+24,id:'poro-upper-left',lookAt:{x:636,y:404}},{x:636,y:790,id:'poro-lower-left',lookAt:{x:556,y:716}}].forEach(function(point){
      var p=project(point,view),focus=project(point.lookAt,view);
      waypoints.push({id:point.id,x:p.x,y:p.y,kind:'poro',lookAt:focus});
    });
    var polygon=FLOOR.map(function(p){return project({x:p.x*SOURCE_WIDTH,y:p.y*SOURCE_HEIGHT},view);});
    slots=benchLayout?benchLayout.getIconSlots(view.width,view.height):[];
    return {view:view,desks:desks,slots:slots,obstacles:desksActive?obstacles:[],waypoints:desksActive?waypoints:waypoints.filter(function(p){return p.kind!=='desk';}),polygon:polygon,desksActive:desksActive,nightMix:mix};
  }
  return {rows:ROWS,cols:COLS,sourceWidth:SOURCE_WIDTH,sourceHeight:SOURCE_HEIGHT,nativeDesk:nativeDesk,computeLayout:computeLayout};
});
