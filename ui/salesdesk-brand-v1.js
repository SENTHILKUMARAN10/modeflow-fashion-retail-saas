// SalesDesk brand layer — replaces legacy Velora/ModeFlow branding in all visible UI without renaming internal app identifiers.
(function(){
  'use strict';
  if(window.SalesDeskBrandV1)return;window.SalesDeskBrandV1=true;
  const BRAND='SalesDesk';
  const SUPPORT='support@salesdesk.app';
  const replace=s=>String(s??'')
    .replace(/MODEFLOW/g,'SALESDESK').replace(/ModeFlow/g,BRAND).replace(/modeflow/g,'salesdesk')
    .replace(/VELORA/g,'SALESDESK').replace(/Velora/g,BRAND).replace(/velora/g,'salesdesk')
    .replace(/support@salesdesk\.app/gi,SUPPORT);

  function patchText(root=document.body){
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){const p=n.parentElement;if(!p||/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/i.test(p.tagName))return NodeFilter.FILTER_REJECT;return /velora|modeflow/i.test(n.nodeValue||'')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}});
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(n=>{n.nodeValue=replace(n.nodeValue);});
    root.querySelectorAll?.('[aria-label],[title],[alt],a[href^="mailto:"]').forEach(el=>{
      ['aria-label','title','alt'].forEach(a=>{const v=el.getAttribute(a);if(v&&/velora|modeflow/i.test(v))el.setAttribute(a,replace(v));});
      const href=el.getAttribute('href');if(href&&/^mailto:/i.test(href)&&/velora|modeflow/i.test(href))el.setAttribute('href',replace(href));
    });
  }
  function patchMarks(root=document){
    root.querySelectorAll?.('.brand-mark,.ve-mark,.vl-logo-mark,.velora-site-footer__mark,.vf-mark,.mark').forEach(el=>{
      const t=(el.textContent||'').trim();if(t==='V'||t==='M')el.textContent='S';
    });
  }
  function patchMeta(){
    document.title=replace(document.title||'')||'SalesDesk — Business, made clear.';
    const meta=document.querySelector('meta[name="description"]');if(meta)meta.setAttribute('content',replace(meta.getAttribute('content')||''));
  }
  function apply(root=document.body){patchMeta();patchText(root);patchMarks(root||document);}
  function schedule(root){queueMicrotask(()=>apply(root||document.body));}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>apply(),{once:true});else apply();
  [80,250,700,1600,3200].forEach(ms=>setTimeout(()=>apply(),ms));
  addEventListener('load',()=>apply(),{once:true});
  addEventListener('modeflow:workspace',()=>setTimeout(()=>apply(),20));
  document.addEventListener('input',e=>{if(e.target.closest?.('#invoiceForm'))setTimeout(()=>apply(document.querySelector('#preview')||document.body),0);},true);
  document.addEventListener('change',e=>{if(e.target.closest?.('#invoiceForm'))setTimeout(()=>apply(document.querySelector('#preview')||document.body),0);},true);
  document.addEventListener('click',e=>{if(e.target.closest?.('.nav,[data-view],[data-go],[data-ve-login],#mfPayNow,#mfOpenRegion'))setTimeout(()=>apply(),25);},true);
  window.SalesDeskBrand={apply,replace};
})();