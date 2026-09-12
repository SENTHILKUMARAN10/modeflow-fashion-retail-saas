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
function bindExport(){
  const button=document.getElementById('exportData');if(!button||button.dataset.salesventoryExportBound)return;
  button.dataset.salesventoryExportBound='1';
  button.addEventListener('click',event=>{
    event.preventDefault();event.stopImmediatePropagation();
    try{
      const data=typeof store!=='undefined'?store:{products:[],invoices:[],expenses:[]};
      const payload={product:'Salesventory',version:1,exportedAt:new Date().toISOString(),...data};
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='salesventory-business-backup.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
      if(typeof toast==='function')toast('Salesventory backup exported');
    }catch(error){console.error(error);if(typeof toast==='function')toast('Unable to export backup');}
  },true);
}
function refresh(){restack();bindExport();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
[80,260,700,1400,2800].forEach(ms=>setTimeout(refresh,ms));
addEventListener('modeflow:workspace',()=>setTimeout(refresh,20));
document.addEventListener('submit',()=>setTimeout(restack,50),true);
document.addEventListener('click',e=>{if(e.target.closest?.('.nav,.action-btn,#addProduct,[data-go],[data-view]'))setTimeout(restack,50);},true);
})();