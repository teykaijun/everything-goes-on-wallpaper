(function(root,factory){
  'use strict'; var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.WallpaperViewport=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function valid(width,height){return Number.isFinite(width)&&Number.isFinite(height)&&width>=64&&height>=64;}
  function create(host,options){
    options=options||{};var timer=null,pending=false,disposed=false;
    function resize(){
      if(disposed)return;
      if(timer!==null)host.clearTimeout(timer);timer=null;
      if(!pending){pending=true;if(options.onPending)options.onPending();}
      if(!valid(host.innerWidth,host.innerHeight))return;
      timer=host.setTimeout(function(){
        timer=null;if(disposed||!valid(host.innerWidth,host.innerHeight))return;
        pending=false;
        host.dispatchEvent(new host.CustomEvent('wallpaper-resize',{detail:{width:host.innerWidth,height:host.innerHeight}}));
        if(options.onSettled)options.onSettled();
      },options.delay===undefined?500:options.delay);
    }
    host.addEventListener('resize',resize);
    return {pending:function(){return pending;},destroy:function(){disposed=true;if(timer!==null)host.clearTimeout(timer);host.removeEventListener('resize',resize);}};
  }
  return {valid:valid,create:create};
});
