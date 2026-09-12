// Keeps the final Salesventory stylesheet authoritative after legacy compatibility modules load.
(function(){
'use strict';
if(window.SalesventoryCascadeGuardV1)return;window.SalesventoryCascadeGuardV1=true;
function restack(){
  const head=document.head;if(!head)return;
  const ref=head.querySelector('link[href*="salesventory-reference-v2.css"]');
  const logo=head.querySelector('link[href*="salesventory-logo-blend-v1.css"]');
  if(ref)head.appendChild(ref);
  if(logo)head.appendChild(logo);
  window.SalesventoryBrandBridge?.apply?.();
  window.SalesventoryFooters?.refresh?.();
  document.querySelectorAll('#login>.velora-site-footer,#login .velora-site-footer').forEach(x=>x.remove());
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restack,{once:true});else restack();
[80,260,700,1400,2800].forEach(ms=>setTimeout(restack,ms));
addEventListener('modeflow:workspace',()=>setTimeout(restack,20));
})();