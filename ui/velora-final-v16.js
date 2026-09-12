// Salesventory compatibility loader — functional helpers only, no legacy visual stack.
(function(){
  'use strict';
  const v='20260912-salesventory-clean-v4';
  function css(selector,href,attr){if(document.querySelector(selector))return;const x=document.createElement('link');x.rel='stylesheet';x.href=href;x.setAttribute(attr,'1');document.head.appendChild(x)}
  function js(selector,src,attr){if(document.querySelector(selector))return;const x=document.createElement('script');x.src=src;x.async=false;x.setAttribute(attr,'1');document.body.appendChild(x)}

  // Restore the requested app view while the page is still hidden. This prevents
  // Dashboard/Login/legacy-page flashes during refresh and browser Back/Forward.
  (function preRoute(){
    try{
      const q=new URL(location.href).searchParams.get('view');
      const saved=localStorage.getItem('salesventory-active-view-v3');
      const view=q||saved;
      if(!view||!document.getElementById(view))return;
      document.querySelectorAll('#app .view').forEach(x=>x.classList.toggle('active-view',x.id===view));
      document.querySelectorAll('.sidebar .nav[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===view));
    }catch{}
  })();

  // Only Salesventory-safe support layers are allowed here. The old Velora/
  // SalesDesk redesign, market suite and invoice renderer are intentionally not loaded.
  css('link[data-salesventory-logo-blend]','ui/salesventory-logo-blend-v1.css?v='+v,'data-salesventory-logo-blend');
  js('script[data-salesventory-site-footer],script[src*="ui/site-footer-v1.js"]','ui/site-footer-v1.js?v='+v,'data-salesventory-site-footer');
  js('script[data-salesinventory-customer-production],script[src*="ui/customer-production-v1.js"]','ui/customer-production-v1.js?v='+v,'data-salesinventory-customer-production');
  js('script[data-salesventory-production],script[src*="ui/salesventory-production-v1.js"]','ui/salesventory-production-v1.js?v='+v,'data-salesventory-production');
  js('script[data-salesventory-invoice-reference],script[src*="ui/salesventory-invoice-reference-v1.js"]','ui/salesventory-invoice-reference-v1.js?v='+v,'data-salesventory-invoice-reference');
  js('script[data-salesventory-cascade-guard],script[src*="ui/salesventory-cascade-guard-v1.js"]','ui/salesventory-cascade-guard-v1.js?v='+v,'data-salesventory-cascade-guard');
})();
