(function(){
  function applyDeviceClass(){
    var sw=Math.min(window.screen&&screen.width||9999,window.screen&&screen.height||9999);
    var phone=sw<=600||window.innerWidth<=767;
    document.documentElement.classList.toggle('device-phone',phone);
  }
  function addCss(selector,href,attr){if(document.querySelector(selector))return;var css=document.createElement('link');css.rel='stylesheet';css.href=href;css.setAttribute(attr,'1');document.head.appendChild(css)}
  function addScript(selector,src,attr){if(document.querySelector(selector))return;var js=document.createElement('script');js.src=src;js.async=false;js.setAttribute(attr,'1');document.body.appendChild(js)}
  function loadDeviceLayer(){
    if(!document.querySelector('link[data-mf-premium-fonts]')){var fonts=document.createElement('link');fonts.rel='stylesheet';fonts.href='https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Playfair+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';fonts.setAttribute('data-mf-premium-fonts','1');document.head.appendChild(fonts)}
    var v='20260910-market4';
    addCss('link[data-mf-premium]','premium-v5.css?v='+v,'data-mf-premium');
    addCss('link[data-mf-mobile-drawer]','mobile-drawer-v1.css?v='+v,'data-mf-mobile-drawer');
    addCss('link[data-mf-billing]','ui/billing-v1.css?v='+v,'data-mf-billing');
    addCss('link[data-velora-public-hotfix]','ui/public-hotfix-v3.css?v='+v,'data-velora-public-hotfix');
    addCss('link[data-salesdesk-business-suite]','ui/salesdesk-business-suite-v1.css?v='+v,'data-salesdesk-business-suite');
    addCss('link[data-salesdesk-operations]','ui/salesdesk-operations-v1.css?v='+v,'data-salesdesk-operations');
    addCss('link[data-salesdesk-market-suite]','ui/salesdesk-market-suite-v2.css?v='+v,'data-salesdesk-market-suite');
    addScript('script[data-velora-public-v2],script[src*="ui/public-experience-v2.js"]','ui/public-experience-v2.js?v='+v,'data-velora-public-v2');
    addScript('script[data-mf-account-pages],script[src*="account-pages-v1.js"]','account-pages-v1.js?v='+v,'data-mf-account-pages');
    addScript('script[data-mf-billing],script[src*="ui/billing-v1.js"]','ui/billing-v1.js?v='+v,'data-mf-billing');
    addScript('script[data-mf-mobile-drawer],script[src*="mobile-drawer-v1.js"]','mobile-drawer-v1.js?v='+v,'data-mf-mobile-drawer');
    addScript('script[data-velora-excel-export],script[src*="ui/export-excel-v1.js"]','ui/export-excel-v1.js?v='+v,'data-velora-excel-export');
    addScript('script[data-velora-site-footer],script[src*="ui/site-footer-v1.js"]','ui/site-footer-v1.js?v='+v,'data-velora-site-footer');
    addScript('script[data-salesdesk-business-suite-js],script[src*="ui/salesdesk-business-suite-v1.js"]','ui/salesdesk-business-suite-v1.js?v='+v,'data-salesdesk-business-suite-js');
    addScript('script[data-salesdesk-operations-js],script[src*="ui/salesdesk-operations-v1.js"]','ui/salesdesk-operations-v1.js?v='+v,'data-salesdesk-operations-js');
    addScript('script[data-salesdesk-catalog],script[src*="ui/salesdesk-catalog-v1.js"]','ui/salesdesk-catalog-v1.js?v='+v,'data-salesdesk-catalog');
    addScript('script[data-salesdesk-market-v3],script[src*="ui/salesdesk-market-suite-v3.js"]','ui/salesdesk-market-suite-v3.js?v='+v,'data-salesdesk-market-v3');
    addScript('script[data-salesdesk-backup],script[src*="ui/salesdesk-backup-v1.js"]','ui/salesdesk-backup-v1.js?v='+v,'data-salesdesk-backup');
    addScript('script[data-salesdesk-observability],script[src*="ui/observability-v1.js"]','ui/observability-v1.js?v='+v,'data-salesdesk-observability');
    addScript('script[data-salesdesk-brand],script[src*="ui/salesdesk-brand-v1.js"]','ui/salesdesk-brand-v1.js?v='+v,'data-salesdesk-brand');
  }
  applyDeviceClass();window.addEventListener('resize',applyDeviceClass,{passive:true});window.addEventListener('orientationchange',applyDeviceClass,{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadDeviceLayer,{once:true});else loadDeviceLayer();
})();
