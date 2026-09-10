(function(){
  function applyDeviceClass(){
    var sw=Math.min(window.screen&&screen.width||9999,window.screen&&screen.height||9999);
    var phone=sw<=600||window.innerWidth<=767;
    document.documentElement.classList.toggle('device-phone',phone);
  }
  function addCss(selector,href,attr){
    if(document.querySelector(selector))return;
    var css=document.createElement('link');css.rel='stylesheet';css.href=href;css.setAttribute(attr,'1');document.head.appendChild(css);
  }
  function addScript(selector,src,attr){
    if(document.querySelector(selector))return;
    var js=document.createElement('script');js.src=src;js.async=false;js.setAttribute(attr,'1');document.body.appendChild(js);
  }
  function loadDeviceLayer(){
    if(!document.querySelector('link[data-mf-premium-fonts]')){
      var fonts=document.createElement('link');fonts.rel='stylesheet';fonts.href='https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Playfair+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';fonts.setAttribute('data-mf-premium-fonts','1');document.head.appendChild(fonts);
    }
    addCss('link[data-mf-premium]','premium-v5.css?v=20260910-1415','data-mf-premium');
    addCss('link[data-mf-mobile-drawer]','mobile-drawer-v1.css?v=20260910-1415','data-mf-mobile-drawer');
    addCss('link[data-mf-billing]','ui/billing-v1.css?v=20260910-1415','data-mf-billing');
    addScript('script[data-velora-public],script[src*="ui/public-experience-v1.js"]','ui/public-experience-v1.js?v=20260910-1415','data-velora-public');
    addScript('script[data-mf-account-pages],script[src*="account-pages-v1.js"]','account-pages-v1.js?v=20260910-1415','data-mf-account-pages');
    addScript('script[data-mf-billing],script[src*="ui/billing-v1.js"]','ui/billing-v1.js?v=20260910-1415','data-mf-billing');
    addScript('script[data-mf-mobile-drawer],script[src*="mobile-drawer-v1.js"]','mobile-drawer-v1.js?v=20260910-1415','data-mf-mobile-drawer');
    addScript('script[data-velora-excel-export],script[src*="ui/export-excel-v1.js"]','ui/export-excel-v1.js?v=20260910-1415','data-velora-excel-export');
    addScript('script[data-velora-site-footer],script[src*="ui/site-footer-v1.js"]','ui/site-footer-v1.js?v=20260910-1415','data-velora-site-footer');
    addScript('script[data-client-branding],script[src*="ui/client-branding-v2.js"]','ui/client-branding-v2.js?v=20260910-1415','data-client-branding');
    addScript('script[data-client-branding-extras],script[src*="ui/client-branding-extras-v1.js"]','ui/client-branding-extras-v1.js?v=20260910-1415','data-client-branding-extras');
    // Invoice rendering is intentionally NOT loaded here. The page starts the authoritative renderer exactly once.
  }
  applyDeviceClass();
  window.addEventListener('resize',applyDeviceClass,{passive:true});
  window.addEventListener('orientationchange',applyDeviceClass,{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadDeviceLayer,{once:true});else loadDeviceLayer();
})();
