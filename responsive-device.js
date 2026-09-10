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
    addCss('link[data-mf-premium]','premium-v5.css?v=20260910-1440','data-mf-premium');
    addCss('link[data-mf-mobile-drawer]','mobile-drawer-v1.css?v=20260910-1440','data-mf-mobile-drawer');
    addCss('link[data-mf-billing]','ui/billing-v1.css?v=20260910-1440','data-mf-billing');
    addCss('link[data-velora-public-hotfix]','ui/public-hotfix-v3.css?v=20260910-1440','data-velora-public-hotfix');
    addScript('script[data-velora-public-v2],script[src*="ui/public-experience-v2.js"]','ui/public-experience-v2.js?v=20260910-1440','data-velora-public-v2');
    addScript('script[data-mf-account-pages],script[src*="account-pages-v1.js"]','account-pages-v1.js?v=20260910-1440','data-mf-account-pages');
    addScript('script[data-mf-billing],script[src*="ui/billing-v1.js"]','ui/billing-v1.js?v=20260910-1440','data-mf-billing');
    addScript('script[data-mf-mobile-drawer],script[src*="mobile-drawer-v1.js"]','mobile-drawer-v1.js?v=20260910-1440','data-mf-mobile-drawer');
    addScript('script[data-velora-excel-export],script[src*="ui/export-excel-v1.js"]','ui/export-excel-v1.js?v=20260910-1440','data-velora-excel-export');
    addScript('script[data-velora-site-footer],script[src*="ui/site-footer-v1.js"]','ui/site-footer-v1.js?v=20260910-1440','data-velora-site-footer');
    // Client-branding observer layers were removed because they continuously fought the Velora invoice renderer and could freeze the page.
    // The app and invoice now keep Velora as the product brand while showing the business/client details in their intended fields.
  }
  applyDeviceClass();
  window.addEventListener('resize',applyDeviceClass,{passive:true});
  window.addEventListener('orientationchange',applyDeviceClass,{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadDeviceLayer,{once:true});else loadDeviceLayer();
})();
