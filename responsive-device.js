(function(){
  function applyDeviceClass(){
    var sw=Math.min(window.screen && screen.width || 9999, window.screen && screen.height || 9999);
    var phone=sw<=600 || window.innerWidth<=767;
    document.documentElement.classList.toggle('device-phone',phone);
  }
  function loadPremiumLayer(){
    if(!document.querySelector('link[data-mf-premium]')){
      var fonts=document.createElement('link');
      fonts.rel='stylesheet';
      fonts.href='https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
      fonts.setAttribute('data-mf-premium-fonts','1');
      document.head.appendChild(fonts);
      var css=document.createElement('link');
      css.rel='stylesheet';
      css.href='premium-v5.css?v=20260910-1125';
      css.setAttribute('data-mf-premium','1');
      document.head.appendChild(css);
    }
    if(!document.querySelector('link[data-mf-mobile-drawer]')){
      var drawerCss=document.createElement('link');
      drawerCss.rel='stylesheet';
      drawerCss.href='mobile-drawer-v1.css?v=20260910-1125';
      drawerCss.setAttribute('data-mf-mobile-drawer','1');
      document.head.appendChild(drawerCss);
    }
    if(!document.querySelector('link[data-mf-billing]')){
      var billingCss=document.createElement('link');
      billingCss.rel='stylesheet';
      billingCss.href='ui/billing-v1.css?v=20260910-1125';
      billingCss.setAttribute('data-mf-billing','1');
      document.head.appendChild(billingCss);
    }
    if(!document.querySelector('link[data-mf-pro-polish]')){
      var polishCss=document.createElement('link');
      polishCss.rel='stylesheet';
      polishCss.href='ui/pro-polish-v8.css?v=20260910-1125';
      polishCss.setAttribute('data-mf-pro-polish','1');
      document.head.appendChild(polishCss);
    }
    if(!document.querySelector('link[data-mf-invoice-v9]')){
      var invoiceCss=document.createElement('link');
      invoiceCss.rel='stylesheet';
      invoiceCss.href='ui/invoice-v9.css?v=20260910-1125';
      invoiceCss.setAttribute('data-mf-invoice-v9','1');
      document.head.appendChild(invoiceCss);
    }
    if(!document.querySelector('script[data-mf-account-pages],script[src*="account-pages-v1.js"]')){
      var js=document.createElement('script');
      js.src='account-pages-v1.js?v=20260910-1125';
      js.defer=true;
      js.setAttribute('data-mf-account-pages','1');
      document.body.appendChild(js);
    }
    if(!document.querySelector('script[data-mf-billing],script[src*="ui/billing-v1.js"]')){
      var billingJs=document.createElement('script');
      billingJs.src='ui/billing-v1.js?v=20260910-1125';
      billingJs.defer=true;
      billingJs.setAttribute('data-mf-billing','1');
      document.body.appendChild(billingJs);
    }
    if(!document.querySelector('script[data-mf-mobile-drawer],script[src*="mobile-drawer-v1.js"]')){
      var drawerJs=document.createElement('script');
      drawerJs.src='mobile-drawer-v1.js?v=20260910-1125';
      drawerJs.defer=true;
      drawerJs.setAttribute('data-mf-mobile-drawer','1');
      document.body.appendChild(drawerJs);
    }
    if(!document.querySelector('script[data-mf-pro-polish],script[src*="ui/pro-polish-v8.js"]')){
      var polishJs=document.createElement('script');
      polishJs.src='ui/pro-polish-v8.js?v=20260910-1125';
      polishJs.defer=true;
      polishJs.setAttribute('data-mf-pro-polish','1');
      document.body.appendChild(polishJs);
    }
    if(!document.querySelector('script[data-mf-invoice-v9],script[src*="ui/invoice-v9.js"]')){
      var invoiceJs=document.createElement('script');
      invoiceJs.src='ui/invoice-v9.js?v=20260910-1125';
      invoiceJs.defer=true;
      invoiceJs.setAttribute('data-mf-invoice-v9','1');
      document.body.appendChild(invoiceJs);
    }
  }
  applyDeviceClass();
  window.addEventListener('resize',applyDeviceClass,{passive:true});
  window.addEventListener('orientationchange',applyDeviceClass,{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadPremiumLayer,{once:true});else loadPremiumLayer();
})();
