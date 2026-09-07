// ModeFlow production-only guard: remove all legacy demo data, labels and placeholders.
(function(){
  'use strict';
  const qs=s=>document.querySelector(s);
  const core=window.ModeFlowCore;

  // Legacy demo/local-storage data is never used in production.
  try{
    localStorage.removeItem('mf_products');
    localStorage.removeItem('mf_invoices');
    localStorage.removeItem('mf_expenses');
    if(typeof store!=='undefined'){
      store.products=[];
      store.invoices=[];
      store.expenses=[];
    }
  }catch(e){console.warn('ModeFlow demo cleanup skipped',e);}

  // Keep the app cloud-only. The production controller calls showApp with "Cloud · role".
  if(typeof showApp==='function'){
    const productionShowApp=showApp;
    window.showApp=function(mode){
      if(!/^Cloud\b/i.test(String(mode||''))) return;
      return productionShowApp.apply(this,arguments);
    };
  }

  function businessName(){
    return qs('.store-card b')?.textContent?.trim()||'ModeFlow Store';
  }
  function initials(name){
    if(core?.initials) return core.initials(name);
    return String(name||'ModeFlow Store').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'MF';
  }

  function cleanProductionUI(){
    const sub=qs('.login-box .subtext');
    if(sub) sub.textContent='Sign in or create an account to access your secure cloud workspace.';

    const badge=qs('#modeBadge');
    if(badge && /demo/i.test(badge.textContent)) badge.textContent='Cloud workspace';

    const name=businessName();
    const avatar=qs('.store-card .store-avatar');
    if(avatar) avatar.textContent=initials(name);

    // Remove any remaining legacy placeholder branding that can appear before cloud data finishes loading.
    document.querySelectorAll('b,strong,small,p,span').forEach(el=>{
      if(el.children.length) return;
      const t=(el.textContent||'').trim();
      if(t==='Atelier Vogue') el.textContent=name;
      if(t==='Flagship Store · Tiruppur') el.textContent='Secure cloud workspace';
      if(t==='Demo workspace') el.textContent='Cloud workspace';
    });
  }

  // Store name is replaced by realtime-app after authentication; keep its initials in sync.
  const storeCard=qs('.store-card');
  if(storeCard) new MutationObserver(cleanProductionUI).observe(storeCard,{childList:true,subtree:true,characterData:true});

  const badge=qs('#modeBadge');
  if(badge) new MutationObserver(cleanProductionUI).observe(badge,{childList:true,subtree:true,characterData:true});

  cleanProductionUI();
  setTimeout(cleanProductionUI,150);
  setTimeout(cleanProductionUI,800);
})();
