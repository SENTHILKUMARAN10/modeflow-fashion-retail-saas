// Keeps the complete Salesventory design authoritative after functional feature modules load.
(function(){
'use strict';
if(window.SalesventoryCascadeGuardV1)return;window.SalesventoryCascadeGuardV1=true;
function restack(){
  const head=document.head;if(!head)return;
  const complete=head.querySelector('link[href*="salesventory-complete-ui-v1.css"]');
  const invoice=head.querySelector('style#svInvoiceReferenceStyle');
  const logo=head.querySelector('link[href*="salesventory-logo-blend-v1.css"]');
  if(complete)head.appendChild(complete);
  if(logo)head.appendChild(logo);
  if(invoice)head.appendChild(invoice);
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
      const payload={product:'Salesventory',version:2,exportedAt:new Date().toISOString(),...data};
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');
      a.href=URL.createObjectURL(blob);a.download='salesventory-business-backup.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
      if(typeof toast==='function')toast('Salesventory backup exported');
    }catch(error){console.error(error);if(typeof toast==='function')toast('Unable to export backup');}
  },true);
}
function refresh(){restack();bindExport();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
[80,260,700,1400,2800].forEach(ms=>setTimeout(refresh,ms));
addEventListener('modeflow:workspace',()=>setTimeout(refresh,20));
addEventListener('salesventory:features-loaded',()=>{refresh();setTimeout(refresh,80);setTimeout(refresh,300)});
document.addEventListener('submit',()=>setTimeout(restack,50),true);
document.addEventListener('click',e=>{if(e.target.closest?.('.nav,.action-btn,#addProduct,[data-go],[data-view]'))setTimeout(restack,50);},true);
})();
