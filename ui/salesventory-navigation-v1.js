// Salesventory navigation + session view persistence.
(function(){
  'use strict';
  if(window.SalesventoryNavigationV1)return;
  window.SalesventoryNavigationV1=true;

  const viewPattern=/^[a-z0-9-]+$/i;
  const routeKey='salesventory-active-view-v1';
  const routeView=()=>{const m=String(location.hash||'').match(/^#app\/([a-z0-9-]+)$/i);return m&&viewPattern.test(m[1])?m[1]:null;};
  const appVisible=()=>{const app=document.getElementById('app');return !!app&&!app.classList.contains('hidden');};
  const activeView=()=>document.querySelector('#app .view.active-view')?.id||null;
  const remember=id=>{if(!viewPattern.test(String(id||'')))return;try{sessionStorage.setItem(routeKey,id)}catch{}};
  const remembered=()=>{try{const id=sessionStorage.getItem(routeKey);return id&&viewPattern.test(id)?id:null}catch{return null}};

  const baseGoto=typeof window.gotoView==='function'?window.gotoView:null;
  const baseShowApp=typeof window.showApp==='function'?window.showApp:null;

  function writeRoute(id,mode='replace'){
    if(!viewPattern.test(String(id||'')))return;
    remember(id);
    const hash='#app/'+id;
    if(location.hash===hash)return;
    try{
      const state={salesventoryView:id};
      if(mode==='push')history.pushState(state,'',location.pathname+location.search+hash);
      else history.replaceState(state,'',location.pathname+location.search+hash);
    }catch{}
  }

  function activate(id,{historyMode='none'}={}){
    if(!id||!viewPattern.test(String(id)))return false;
    const exists=document.getElementById(id);
    if(!exists)return false;
    if(baseGoto)baseGoto(id);
    else{
      document.querySelectorAll('#app .view').forEach(v=>v.classList.toggle('active-view',v.id===id));
      document.querySelectorAll('.sidebar .nav[data-view]').forEach(n=>n.classList.toggle('active',n.dataset.view===id));
    }
    remember(id);
    if(historyMode==='push')writeRoute(id,'push');
    else if(historyMode==='replace')writeRoute(id,'replace');
    return true;
  }

  window.gotoView=function(id,options){
    const mode=options?.fromHistory?'none':(options?.push?'push':(options?.replace?'replace':'none'));
    return activate(id,{historyMode:mode});
  };

  function restore({replace=true}={}){
    if(!appVisible())return false;
    const wanted=routeView()||remembered()||activeView()||'dashboard';
    if(!activate(wanted,{historyMode:'none'}))return false;
    if(replace)writeRoute(wanted,'replace');
    return true;
  }

  if(baseShowApp){
    window.showApp=function(mode){
      const result=baseShowApp(mode);
      requestAnimationFrame(()=>requestAnimationFrame(()=>restore({replace:true})));
      return result;
    };
  }

  document.addEventListener('click',event=>{
    const target=event.target;
    if(!target?.closest)return;
    if(target.closest('#logout,#sdMarketLogout')){
      try{sessionStorage.removeItem(routeKey)}catch{}
      try{history.replaceState(null,'',location.pathname+location.search+'#login')}catch{}
      return;
    }
    if(!appVisible())return;
    let id=null;
    const nav=target.closest('.sidebar .nav[data-view]');
    const go=target.closest('[data-go]');
    const sd=target.closest('[data-sd-go]');
    if(nav?.dataset?.view)id=nav.dataset.view;
    else if(go?.dataset?.go)id=go.dataset.go;
    else if(sd?.dataset?.sdGo)id=sd.dataset.sdGo;
    else if(target.closest('.goto-billing'))id='billing';
    if(!id||!document.getElementById(id))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    activate(id,{historyMode:'push'});
  },true);

  const handleHistory=()=>{
    if(!appVisible())return;
    const id=routeView();
    if(id&&document.getElementById(id)){activate(id,{historyMode:'none'});return;}
    const fallback=remembered()||activeView()||'dashboard';
    activate(fallback,{historyMode:'none'});
    writeRoute(fallback,'replace');
  };
  addEventListener('popstate',handleHistory);
  addEventListener('hashchange',handleHistory);

  let tries=0;
  const initialRestore=()=>{
    if(restore({replace:true}))return;
    if(tries++<80)setTimeout(initialRestore,75);
  };
  initialRestore();

  window.SalesventoryNavigation={restore,activate};
})();