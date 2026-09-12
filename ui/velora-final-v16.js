// Compatibility loader for the Salesventory production workspace.
(function(){
  'use strict';
  const v='20260912-salesventory-reference2';
  function css(selector,href,attr){if(document.querySelector(selector))return;const x=document.createElement('link');x.rel='stylesheet';x.href=href;x.setAttribute(attr,'1');document.head.appendChild(x)}
  function js(selector,src,attr){if(document.querySelector(selector))return;const x=document.createElement('script');x.src=src;x.async=false;x.setAttribute(attr,'1');document.body.appendChild(x)}
  css('link[data-velora-final18]','ui/velora-final-v18.css?v='+v,'data-velora-final18');
  css('link[data-salesdesk-market-suite]','ui/salesdesk-market-suite-v2.css?v='+v,'data-salesdesk-market-suite');
  css('link[data-salesventory-logo-blend]','ui/salesventory-logo-blend-v1.css?v='+v,'data-salesventory-logo-blend');
  js('script[data-velora-final18],script[src*="ui/velora-final-v18.js"]','ui/velora-final-v18.js?v='+v,'data-velora-final18');
  js('script[data-salesdesk-market-v3],script[src*="ui/salesdesk-market-suite-v3.js"]','ui/salesdesk-market-suite-v3.js?v='+v,'data-salesdesk-market-v3');
  js('script[data-salesdesk-customer-production],script[src*="ui/customer-production-v1.js"]','ui/customer-production-v1.js?v='+v,'data-salesdesk-customer-production');
  js('script[data-salesventory-production],script[src*="ui/salesventory-production-v1.js"]','ui/salesventory-production-v1.js?v='+v,'data-salesventory-production');
  js('script[data-salesventory-cascade-guard],script[src*="ui/salesventory-cascade-guard-v1.js"]','ui/salesventory-cascade-guard-v1.js?v='+v,'data-salesventory-cascade-guard');
})();