// Legacy compatibility loader. Keeps the final invoice layer and boots the SalesDesk market workspace.
(function(){
  'use strict';
  const v='20260911-customer1';
  function css(selector,href,attr){if(document.querySelector(selector))return;const x=document.createElement('link');x.rel='stylesheet';x.href=href;x.setAttribute(attr,'1');document.head.appendChild(x)}
  function js(selector,src,attr){if(document.querySelector(selector))return;const x=document.createElement('script');x.src=src;x.async=false;x.setAttribute(attr,'1');document.body.appendChild(x)}
  css('link[data-velora-final18]','ui/velora-final-v18.css?v='+v,'data-velora-final18');
  css('link[data-salesdesk-market-suite]','ui/salesdesk-market-suite-v2.css?v='+v,'data-salesdesk-market-suite');
  js('script[data-velora-final18],script[src*="ui/velora-final-v18.js"]','ui/velora-final-v18.js?v='+v,'data-velora-final18');
  js('script[data-salesdesk-market-v3],script[src*="ui/salesdesk-market-suite-v3.js"]','ui/salesdesk-market-suite-v3.js?v='+v,'data-salesdesk-market-v3');
  js('script[data-salesdesk-customer-production],script[src*="ui/customer-production-v1.js"]','ui/customer-production-v1.js?v='+v,'data-salesdesk-customer-production');
})();