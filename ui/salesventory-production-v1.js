// Salesventory production compatibility bridge.
// Intentionally lightweight: the reference-v2 controller owns final UI, theme and routing.
(function(){
'use strict';
if(window.SalesventoryProductionV1)return;window.SalesventoryProductionV1=true;
const BRAND='Salesventory',FULL='/assets/salesventory-full-logo.webp',ICON='/assets/salesventory-logo.png';
const rx=/SalesDesk|SALESDESK|salesdesk|ModeFlow|MODEFLOW|modeflow|Velora|VELORA|velora/;
function replaceText(value){return String(value??'').replace(/SalesDesk|SALESDESK|salesdesk|ModeFlow|MODEFLOW|modeflow|Velora|VELORA|velora/g,BRAND)}
function apply(){
  document.title=replaceText(document.title||'Salesventory');
  const meta=document.querySelector('meta[name="description"]');if(meta)meta.content=replaceText(meta.content||'');
  const root=document.body;if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){const p=n.parentElement;if(!p||/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/i.test(p.tagName))return NodeFilter.FILTER_REJECT;return rx.test(n.nodeValue||'')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}});const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(n=>n.nodeValue=replaceText(n.nodeValue));
  const login=document.querySelector('#login .login-brand');if(login&&!login.querySelector('img'))login.innerHTML=`<img src="${FULL}" alt="Salesventory — Inventory today. A bigger tomorrow." style="display:block;width:min(270px,72vw);height:auto;object-fit:contain">`;
  const brand=document.querySelector('.sidebar .brand');if(brand){const mark=brand.querySelector('.brand-mark');if(mark&&!mark.querySelector('img')){mark.textContent='';mark.innerHTML=`<img src="${ICON}" alt="" style="display:block;width:100%;height:100%;object-fit:contain">`;}const word=brand.querySelector('b');if(word)word.textContent=BRAND;}
  document.querySelectorAll('#login>.velora-site-footer,#login .velora-site-footer').forEach(x=>x.remove());
}
window.SalesventoryBrandBridge={apply};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
[120,480,1200,2600].forEach(ms=>setTimeout(apply,ms));addEventListener('modeflow:workspace',()=>setTimeout(apply,30));
})();