// Salesventory final loader + UI stability controller.
// Preserves secure sessions and the current workspace view while applying one final customer-facing brand.
(function(){
  'use strict';
  const v='20260912-salesventory1';
  const $=s=>document.querySelector(s);

  function css(selector,href,attr){
    if(document.querySelector(selector))return;
    const x=document.createElement('link');x.rel='stylesheet';x.href=href;x.setAttribute(attr,'1');document.head.appendChild(x);
  }
  function js(selector,src,attr){
    if(document.querySelector(selector))return;
    const x=document.createElement('script');x.src=src;x.async=false;x.setAttribute(attr,'1');document.body.appendChild(x);
  }

  const initialHash=location.hash||'';
  const initialSearch=location.search||'';
  const routeKey='salesventory-active-view-v1';
  const viewPattern=/^[a-z0-9-]+$/i;
  const routeFromHash=hash=>{const m=String(hash||'').match(/^#app\/([a-z0-9-]+)$/i);return m&&viewPattern.test(m[1])?m[1]:null};
  let rememberedView=routeFromHash(initialHash);
  try{
    rememberedView=rememberedView||sessionStorage.getItem(routeKey)||null;
    if(rememberedView&&viewPattern.test(rememberedView))sessionStorage.setItem(routeKey,rememberedView);else rememberedView=null;
  }catch{}

  // Compatibility assets keep the mature production feature set; the final brand authority below owns all visible branding.
  css('link[data-sv-final18]','ui/velora-final-v18.css?v='+v,'data-sv-final18');
  css('link[data-sv-market-suite]','ui/salesdesk-market-suite-v2.css?v='+v,'data-sv-market-suite');
  css('link[data-sv-public-hotfix]','ui/salesdesk-public-hotfix-v1.css?v='+v,'data-sv-public-hotfix');
  js('script[data-sv-public-base],script[src*="ui/public-experience-v2.js"]','ui/public-experience-v2.js?v='+v,'data-sv-public-base');
  js('script[data-sv-public-pro],script[src*="ui/salesdesk-public-pro-v1.js"]','ui/salesdesk-public-pro-v1.js?v='+v,'data-sv-public-pro');
  js('script[data-sv-footer],script[src*="ui/site-footer-v1.js"]','ui/site-footer-v1.js?v='+v,'data-sv-footer');
  js('script[data-sv-final18],script[src*="ui/velora-final-v18.js"]','ui/velora-final-v18.js?v='+v,'data-sv-final18');
  js('script[data-sv-market-v3],script[src*="ui/salesdesk-market-suite-v3.js"]','ui/salesdesk-market-suite-v3.js?v='+v,'data-sv-market-v3');
  js('script[data-sv-customer-production],script[src*="ui/customer-production-v1.js"]','ui/customer-production-v1.js?v='+v,'data-sv-customer-production');
  js('script[data-salesventory-brand],script[src*="ui/salesventory-brand-v1.js"]','ui/salesventory-brand-v1.js?v='+v,'data-salesventory-brand');

  let replayingHistory=false,ready=false,routeRetries=0;
  const validView=id=>typeof id==='string'&&viewPattern.test(id);
  const activeView=()=>$('#app .view.active-view')?.id||null;
  const appVisible=()=>{const app=$('#app');return !!app&&!app.classList.contains('hidden')};
  const routeUrl=id=>`${location.pathname}#app/${id}`;

  function storeView(id){if(!validView(id))return;rememberedView=id;try{sessionStorage.setItem(routeKey,id)}catch{}}
  function writeRoute(id,mode='replace'){
    if(!validView(id))return;storeView(id);const wanted=`#app/${id}`;if(location.hash===wanted)return;
    try{const state={salesventoryView:id};if(mode==='push')history.pushState(state,'',routeUrl(id));else history.replaceState(state,'',routeUrl(id))}catch{}
  }
  function targetViewFromClick(target){
    const nav=target.closest?.('.sidebar .nav[data-view]');if(nav?.dataset?.view)return nav.dataset.view;
    const go=target.closest?.('[data-go]');if(go?.dataset?.go)return go.dataset.go;
    const sv=target.closest?.('[data-sd-go]');if(sv?.dataset?.sdGo)return sv.dataset.sdGo;
    if(target.closest?.('.goto-billing'))return 'billing';return null;
  }
  function activateView(id,replace=true){
    if(!validView(id)||!appVisible())return false;
    const nav=Array.from(document.querySelectorAll('.sidebar .nav[data-view]')).find(x=>x.dataset.view===id);
    if(nav){replayingHistory=true;try{nav.click()}finally{replayingHistory=false}if(replace)writeRoute(id,'replace');return true}
    if(typeof window.gotoView==='function'&&document.getElementById(id)){replayingHistory=true;try{window.gotoView(id)}finally{replayingHistory=false}if(replace)writeRoute(id,'replace');return true}
    return false;
  }
  function restoreRememberedView(){
    const wanted=routeFromHash(location.hash)||rememberedView||'dashboard';storeView(wanted);
    if(activateView(wanted,true)){routeRetries=0;return}
    if(routeRetries++<50)setTimeout(restoreRememberedView,80);else{routeRetries=0;writeRoute(activeView()||'dashboard','replace')}
  }

  function brand(){window.SalesventoryBrand?.apply?.();window.SalesDeskFooters?.refresh?.()}
  function reveal(){if(ready)return;brand();ready=true;document.body.classList.add('sv-ui-ready','sd-ui-ready')}
  function publicExperienceReady(){
    const landing=$('#veloraLanding');if(!landing)return false;brand();
    const name=landing.querySelector('.ve-word')?.textContent?.trim();return name==='Salesventory'&&!!landing.querySelector('#sdPublicCommand');
  }
  function revealPublic(showLogin){
    const apply=()=>{
      if(showLogin)window.VeloraPublic?.showLogin?.();else window.VeloraPublic?.showHome?.();brand();
      if(publicExperienceReady()||showLogin){reveal();return}if(!ready)setTimeout(apply,60);
    };apply();
  }

  async function decideInitialScreen(){
    let attempts=0;while(!window.tkCloud?.auth?.session&&attempts++<60)await new Promise(r=>setTimeout(r,50));
    let session=null;try{session=(await window.tkCloud?.auth?.session?.())?.data?.session||null}catch{}
    const callback=/access_token|refresh_token|error_description|type=recovery/i.test(initialHash+initialSearch);
    const explicitLogin=initialHash==='#login'||callback;
    if(session){
      let waits=0;const waitForWorkspace=()=>{
        brand();
        if(appVisible()){restoreRememberedView();requestAnimationFrame(()=>requestAnimationFrame(reveal));return}
        if(waits++<120){setTimeout(waitForWorkspace,50);return}reveal();
      };waitForWorkspace();
    }else{
      try{sessionStorage.removeItem(routeKey)}catch{}rememberedView=null;revealPublic(explicitLogin);
    }
  }

  document.addEventListener('click',event=>{
    if(event.target.closest?.('#logout,#sdMarketLogout')){try{sessionStorage.removeItem(routeKey)}catch{}rememberedView=null;try{history.replaceState(null,'',`${location.pathname}#login`)}catch{}return}
    if(replayingHistory||!appVisible())return;const id=targetViewFromClick(event.target);if(validView(id))writeRoute(id,'push');
  },true);

  const app=$('#app');if(app)new MutationObserver(()=>{
    brand();if(!appVisible())return;const id=activeView();if(validView(id)){storeView(id);if(!replayingHistory&&routeFromHash(location.hash)!==id)writeRoute(id,'replace')}
  }).observe(app,{subtree:true,attributes:true,attributeFilter:['class']});

  addEventListener('popstate',async()=>{
    const id=routeFromHash(location.hash);if(id&&appVisible()){activateView(id,false);storeView(id);return}
    let session=null;try{session=(await window.tkCloud?.auth?.session?.())?.data?.session||null}catch{}
    if(session&&appVisible()){const fallback=rememberedView||activeView()||'dashboard';activateView(fallback,false);writeRoute(fallback,'replace')}
  });

  setTimeout(()=>{if(!ready){if(appVisible())restoreRememberedView();brand();reveal()}},7000);
  setTimeout(decideInitialScreen,0);
})();
