// Salesventory brand authority — lightweight, stable customer-facing branding.
(function(){
  'use strict';
  if(window.SalesventoryBrandV1)return;
  window.SalesventoryBrandV1=true;

  const BRAND='Salesventory';
  const BRAND_UPPER='SALESVENTORY';
  const LOGO='/assets/salesventory-logo.png';
  const SUPPORT='support@salesventory.com';
  let applying=false;

  const replace=s=>String(s??'')
    .replace(/SALESDESK/g,BRAND_UPPER).replace(/SalesDesk/g,BRAND).replace(/salesdesk/g,'salesventory')
    .replace(/MODEFLOW/g,BRAND_UPPER).replace(/ModeFlow/g,BRAND).replace(/modeflow/g,'salesventory')
    .replace(/VELORA/g,BRAND_UPPER).replace(/Velora/g,BRAND).replace(/velora/g,'salesventory')
    .replace(/support@(?:salesdesk|velora)\.(?:app|com)/gi,SUPPORT);

  function ensureHead(){
    document.title=replace(document.title||'')||`${BRAND} — Business, made clear.`;
    const description=document.querySelector('meta[name="description"]');
    if(description&&/salesdesk|modeflow|velora/i.test(description.content||''))description.content=replace(description.content);
    document.querySelectorAll('meta[content]').forEach(m=>{
      if(/salesdesk|modeflow|velora/i.test(m.content||''))m.content=replace(m.content);
    });
    if(!document.querySelector('link[rel~="icon"][data-salesventory-icon]')){
      const icon=document.createElement('link');
      icon.rel='icon';icon.type='image/png';icon.href=LOGO;icon.dataset.salesventoryIcon='1';
      document.head.appendChild(icon);
    }
    if(!document.querySelector('link[rel="apple-touch-icon"][data-salesventory-icon]')){
      const apple=document.createElement('link');
      apple.rel='apple-touch-icon';apple.href=LOGO;apple.dataset.salesventoryIcon='1';
      document.head.appendChild(apple);
    }
    if(!document.getElementById('salesventoryBrandStyles')){
      const style=document.createElement('style');
      style.id='salesventoryBrandStyles';
      style.textContent=`
        .sv-brand-mark{display:inline-grid!important;place-items:center!important;overflow:visible!important;background:transparent!important;border:0!important;box-shadow:none!important;color:transparent!important;padding:0!important}
        .sv-brand-mark>img{display:block!important;width:100%!important;height:100%!important;object-fit:contain!important}
        .brand-mark.sv-brand-mark,.ve-mark.sv-brand-mark,.velora-site-footer__mark.sv-brand-mark,.vf-mark.sv-brand-mark,.mark.sv-brand-mark{width:42px!important;height:42px!important;min-width:42px!important;border-radius:0!important}
        .brand-mark.small.sv-brand-mark{width:36px!important;height:36px!important;min-width:36px!important}
        .brand b,.login-brand strong,.ve-word,.velora-site-footer__word,.vf-brand-name,.sv-wordmark{font-family:'DM Serif Display','Playfair Display',Georgia,serif!important;font-weight:400!important;letter-spacing:-.025em!important}
      `;
      document.head.appendChild(style);
    }
  }

  function patchText(root=document.body){
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){
      const p=n.parentElement;
      if(!p||/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/i.test(p.tagName))return NodeFilter.FILTER_REJECT;
      return /salesdesk|modeflow|velora/i.test(n.nodeValue||'')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
    }});
    const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(n=>n.nodeValue=replace(n.nodeValue));
    root.querySelectorAll?.('[aria-label],[title],[alt],[placeholder],a[href^="mailto:"]').forEach(el=>{
      ['aria-label','title','alt','placeholder'].forEach(a=>{
        const v=el.getAttribute(a);
        if(v&&/salesdesk|modeflow|velora/i.test(v))el.setAttribute(a,replace(v));
      });
      const href=el.getAttribute('href');
      if(href&&/^mailto:/i.test(href)&&/salesdesk|modeflow|velora/i.test(href))el.setAttribute('href','mailto:'+SUPPORT);
    });
  }

  function patchMarks(root=document){
    root.querySelectorAll?.('.brand-mark,.ve-mark,.velora-site-footer__mark,.vf-mark,.mark').forEach(el=>{
      if(el.classList.contains('sv-brand-mark')&&el.querySelector('img'))return;
      el.classList.add('sv-brand-mark');
      el.textContent='';
      const img=document.createElement('img');
      img.src=LOGO;img.alt='';img.setAttribute('aria-hidden','true');
      el.appendChild(img);
    });
  }

  function apply(root=document.body){
    if(applying)return;
    applying=true;
    try{
      ensureHead();
      patchText(root||document.body);
      patchMarks(document);
    }finally{
      applying=false;
    }
  }

  function boot(){
    apply();
    [120,500,1200,2600].forEach(ms=>setTimeout(()=>apply(),ms));
    addEventListener('load',()=>apply(),{once:true});
    addEventListener('modeflow:workspace',()=>setTimeout(()=>apply(),50));
  }

  window.SalesventoryBrand={apply,replace,logo:LOGO,name:BRAND};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
