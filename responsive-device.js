(function(){
  'use strict';
  const VERSION='20260912-salesventory-production-features-v1';
  function applyDeviceClass(){
    const sw=Math.min(window.screen&&screen.width||9999,window.screen&&screen.height||9999);
    const phone=sw<=600||window.innerWidth<=767;
    document.documentElement.classList.toggle('device-phone',phone);
  }
  function addCss(key,href){
    if(document.querySelector(`link[data-sv-feature="${key}"]`))return;
    const el=document.createElement('link');el.rel='stylesheet';el.href=href+'?v='+VERSION;el.dataset.svFeature=key;document.head.appendChild(el);
  }
  function addScript(key,src){
    return new Promise(resolve=>{
      if(document.querySelector(`script[data-sv-feature="${key}"],script[src*="${src}"]`))return resolve();
      const el=document.createElement('script');el.src=src+'?v='+VERSION;el.async=false;el.dataset.svFeature=key;el.onload=resolve;el.onerror=()=>{console.error('Salesventory feature failed to load:',src);resolve()};document.body.appendChild(el);
    });
  }
  async function loadProductionFeatures(){
    if(window.__SalesventoryFeaturesLoading)return;window.__SalesventoryFeaturesLoading=true;
    window.__SALESVENTORY_COMPLETE_UI__=true;
    [
      ['billing','ui/billing-v1.css'],
      ['business-suite','ui/salesdesk-business-suite-v1.css'],
      ['operations','ui/salesdesk-operations-v1.css'],
      ['market','ui/salesdesk-market-suite-v2.css'],
      ['pro','ui/salesdesk-pro-suite-v1.css'],
      ['operations-pro','ui/salesdesk-operations-pro-v2.css'],
      ['people','ui/salesdesk-people-intelligence-v1.css'],
      ['automation','ui/salesdesk-automation-center-v1.css']
    ].forEach(([key,href])=>addCss(key,href));

    const scripts=[
      ['billing','ui/billing-v1.js'],
      ['excel','ui/export-excel-v1.js'],
      ['business-suite','ui/salesdesk-business-suite-v1.js'],
      ['operations','ui/salesdesk-operations-v1.js'],
      ['catalog','ui/salesdesk-catalog-v1.js'],
      ['market','ui/salesdesk-market-suite-v3.js'],
      ['pro','ui/salesdesk-pro-suite-v1.js'],
      ['pos','ui/salesdesk-pos-v1.js'],
      ['finance','ui/salesdesk-finance-v1.js'],
      ['notifications','ui/salesdesk-notification-inbox-v1.js'],
      ['import','ui/salesdesk-import-v1.js'],
      ['account-security','ui/salesdesk-account-security-v1.js'],
      ['backup','ui/salesdesk-backup-v2.js'],
      ['observability','ui/observability-v1.js'],
      ['operations-pro','ui/salesdesk-operations-pro-v2.js'],
      ['people','ui/salesdesk-people-intelligence-v1.js'],
      ['automation','ui/salesdesk-automation-center-v1.js']
    ];
    for(const [key,src] of scripts)await addScript(key,src);
    window.__SalesventoryFeaturesReady=true;
    dispatchEvent(new CustomEvent('salesventory:features-loaded'));
  }
  applyDeviceClass();
  addEventListener('resize',applyDeviceClass,{passive:true});
  addEventListener('orientationchange',applyDeviceClass,{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadProductionFeatures,{once:true});else loadProductionFeatures();
})();
