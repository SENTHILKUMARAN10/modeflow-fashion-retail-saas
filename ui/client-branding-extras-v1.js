// Extra client-brand protections for dialogs and generated Excel files outside #app.
(function(){
  'use strict';
  const $=s=>document.querySelector(s);
  const placeholder=/^(Velora Workspace|ModeFlow Store|ModeFlow|Velora|Your business|Your Business|Business workspace)$/i;
  function company(){
    const cloud=String(window.ModeFlowBusiness?.business?.name||'').trim();if(cloud&&!placeholder.test(cloud))return cloud;
    const card=String($('.store-card div b')?.textContent||'').trim();if(card&&!placeholder.test(card))return card;
    return 'Your Business';
  }
  function patchDialogs(){
    const name=company();
    const pay=$('#mfUpiDialog');
    if(pay){
      const title=pay.querySelector('#mfUpiTitle');if(title&&/ModeFlow|Velora/i.test(title.textContent||''))title.textContent='Subscription payment';
      const walker=document.createTreeWalker(pay,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
      nodes.forEach(n=>{const old=n.nodeValue||'';const next=old.replace(/\bModeFlow\b/g,name).replace(/\bVelora\b/g,name);if(next!==old)n.nodeValue=next;});
    }
    const exp=$('#veloraExportDialog');
    if(exp){const small=exp.querySelector('.vx-head small');if(small)small.textContent=`${name.toUpperCase()} · BUSINESS EXPORT`;}
  }
  function patchXlsx(){
    const X=window.XLSX;if(!X||X.__clientBusinessBrand||typeof X.writeFile!=='function')return;
    const original=X.writeFile.bind(X);
    X.writeFile=function(wb,filename,options){
      const name=company(),clean=name.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,40)||'Business';
      try{
        wb.Props=wb.Props||{};wb.Props.Title=`${name} Business Export`;wb.Props.Subject=`${name} business report`;wb.Props.Author=name;wb.Props.Company=name;
        Object.values(wb.Sheets||{}).forEach(ws=>Object.keys(ws).forEach(k=>{const cell=ws[k];if(cell&&typeof cell.v==='string'&&/Velora|ModeFlow/i.test(cell.v))cell.v=cell.v.replace(/Velora|ModeFlow/gi,name);}));
        filename=String(filename||'Business-Export.xlsx').replace(/^Velora-/i,'').replace(/^ModeFlow-/i,'');
        if(!filename.toLowerCase().startsWith(clean.toLowerCase()))filename=`${clean}-${filename}`;
      }catch{}
      return original(wb,filename,options);
    };
    X.__clientBusinessBrand=true;
  }
  function apply(){patchDialogs();patchXlsx();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  new MutationObserver(muts=>{for(const m of muts){for(const node of m.addedNodes){if(node.nodeType===1&&node.matches?.('script[data-velora-xlsx]'))node.addEventListener('load',()=>setTimeout(patchXlsx,0),{once:true});}}setTimeout(apply,0);}).observe(document.documentElement,{childList:true,subtree:true});
  addEventListener('modeflow:workspace',()=>setTimeout(apply,100));
})();
