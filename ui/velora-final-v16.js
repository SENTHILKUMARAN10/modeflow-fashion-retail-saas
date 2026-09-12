// Salesventory final loader + UI stability controller.
(function(){
  'use strict';
  const v='20260912-salesventory5';
  const $=s=>document.querySelector(s);

  function css(selector,href,attr){
    if(document.querySelector(selector))return;
    const x=document.createElement('link');x.rel='stylesheet';x.href=href;x.setAttribute(attr,'1');document.head.appendChild(x);
  }
  function js(selector,src,attr){
    if(document.querySelector(selector))return;
    const x=document.createElement('script');x.src=src;x.async=false;x.setAttribute(attr,'1');document.body.appendChild(x);
  }

  // Mature compatibility assets remain internal; Salesventory owns all visible branding.
  css('link[data-sv-final18]','ui/velora-final-v18.css?v='+v,'data-sv-final18');
  css('link[data-sv-market-suite]','ui/salesdesk-market-suite-v2.css?v='+v,'data-sv-market-suite');
  css('link[data-sv-public-hotfix]','ui/salesdesk-public-hotfix-v1.css?v='+v,'data-sv-public-hotfix');
  js('script[data-sv-public-base],script[src*="ui/public-experience-v2.js"]','ui/public-experience-v2.js?v='+v,'data-sv-public-base');
  js('script[data-sv-public-pro],script[src*="ui/salesdesk-public-pro-v1.js"]','ui/salesdesk-public-pro-v1.js?v='+v,'data-sv-public-pro');
  js('script[data-sv-footer],script[src*="ui/site-footer-v1.js"]','ui/site-footer-v1.js?v='+v,'data-sv-footer');
  js('script[data-sv-final18],script[src*="ui/velora-final-v18.js"]','ui/velora-final-v18.js?v='+v,'data-sv-final18');
  js('script[data-sv-market-v3],script[src*="ui/salesdesk-market-suite-v3.js"]','ui/salesdesk-market-suite-v3.js?v='+v,'data-sv-market-v3');
  js('script[data-salesventory-rpc-bridge],script[src*="ui/salesventory-rpc-compat-v1.js"]','ui/salesventory-rpc-compat-v1.js?v='+v,'data-salesventory-rpc-bridge');
  js('script[data-sv-customer-production],script[src*="ui/customer-production-v1.js"]','ui/customer-production-v1.js?v='+v,'data-sv-customer-production');
  js('script[data-salesventory-brand],script[src*="ui/salesventory-brand-v1.js"]','ui/salesventory-brand-v1.js?v='+v,'data-salesventory-brand');
  js('script[data-salesventory-logo-system],script[src*="ui/salesventory-logo-system-v1.js"]','ui/salesventory-logo-system-v1.js?v='+v,'data-salesventory-logo-system');
  js('script[data-salesventory-navigation],script[src*="ui/salesventory-navigation-v1.js"]','ui/salesventory-navigation-v1.js?v='+v,'data-salesventory-navigation');

  let ready=false;
  const appVisible=()=>{const app=$('#app');return !!app&&!app.classList.contains('hidden');};

  function brand(){
    window.SalesventoryBrand?.apply?.();
    window.SalesventoryFooters?.refresh?.();
    window.SalesventoryLogoSystem?.apply?.();
  }

  function reveal(){
    if(ready)return;
    brand();
    window.SalesventoryNavigation?.restore?.({replace:true});
    ready=true;
    document.body.classList.add('sv-ui-ready','sd-ui-ready');
  }

  function publicReady(){
    const landing=$('#veloraLanding');
    if(!landing)return false;
    return !!landing.querySelector('#sdPublicCommand,.ve-hero,.ve-nav');
  }

  async function decideInitialScreen(){
    let attempts=0;
    while(!window.tkCloud?.auth?.session&&attempts++<60)await new Promise(r=>setTimeout(r,50));
    let session=null;
    try{session=(await window.tkCloud?.auth?.session?.())?.data?.session||null}catch{}
    const callback=/access_token|refresh_token|error_description|type=recovery/i.test((location.hash||'')+(location.search||''));
    const explicitLogin=location.hash==='#login'||callback;

    if(session){
      let waits=0;
      const waitForWorkspace=()=>{
        if(appVisible()){
          brand();
          window.SalesventoryNavigation?.restore?.({replace:true});
          requestAnimationFrame(()=>requestAnimationFrame(reveal));
          return;
        }
        if(waits++<120){setTimeout(waitForWorkspace,50);return;}
        reveal();
      };
      waitForWorkspace();
      return;
    }

    if(explicitLogin)window.VeloraPublic?.showLogin?.();
    else window.VeloraPublic?.showHome?.();
    let tries=0;
    const waitForPublic=()=>{
      brand();
      if(explicitLogin||publicReady()||tries++>=35){reveal();return;}
      setTimeout(waitForPublic,100);
    };
    waitForPublic();
  }

  // Never expose the legacy base UI while the final Salesventory experience is still assembling.
  setTimeout(()=>{if(!ready)reveal();},5000);
  setTimeout(decideInitialScreen,0);
})();