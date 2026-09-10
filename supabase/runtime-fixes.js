// Velora runtime corrections — roles, dashboard and greeting only. Invoice rendering is owned by velora-final-v18.js.
(function(){
  'use strict';
  const core=window.ModeFlowCore;
  if(!core)return;
  const qs=s=>document.querySelector(s);
  const qsa=s=>[...document.querySelectorAll(s)];
  const regionZones={IN:'Asia/Kolkata',US:'America/New_York',GB:'Europe/London',AE:'Asia/Dubai',SG:'Asia/Singapore',AU:'Australia/Sydney',CA:'America/Toronto'};
  let clientFirstName='';

  function currentRole(){
    const text=qs('#modeBadge')?.textContent||'';
    const match=text.match(/\b(owner|manager|staff)\b/i);
    return match?match[1].toLowerCase():'staff';
  }

  function businessName(){return window.ModeFlowBusiness?.business?.name||qs('.store-card div b')?.textContent?.trim()||'Your business';}

  function currentZone(){
    const region=localStorage.getItem('mf_region')||localStorage.getItem('modeflow-region')||'IN';
    return regionZones[region]||Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Kolkata';
  }

  function greeting(){
    let hour=new Date().getHours();
    try{hour=Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hour12:false,timeZone:currentZone()}).format(new Date()));}catch{}
    return hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
  }

  async function resolveClientName(){
    try{
      const result=await window.tkCloud?.auth?.user?.();
      const user=result?.data?.user;
      const raw=user?.user_metadata?.full_name||user?.user_metadata?.name||user?.email?.split('@')[0]||'';
      clientFirstName=String(raw).trim().split(/\s+/)[0]||'';
    }catch{}
    renderDashboardHeader();
  }

  function applyRoleUI(){
    const cap=core.capabilities(currentRole());
    const add=qs('#addProduct');if(add){add.disabled=!cap.manageProducts;add.hidden=!cap.manageProducts;}
    qsa('#inventoryRows .action-btn').forEach(btn=>{btn.hidden=!cap.manageProducts;});
    qsa('#historyRows .action-btn.danger').forEach(btn=>{btn.hidden=!cap.deleteSales;});
    qsa('#expenseList .action-btn.danger').forEach(btn=>{btn.hidden=!cap.deleteExpenses;});
  }

  function renderDashboardHeader(){
    if(qs('#dashboard.active-view')){
      const title=qs('#title');
      if(title)title.textContent=clientFirstName?`${greeting()}, ${clientFirstName}.`:`${greeting()}.`;
    }
    const profile=qs('.profile');if(profile)profile.textContent=core.initials(clientFirstName||businessName());
  }

  function apply(){
    try{applyRoleUI();renderDashboardHeader();}
    catch(err){console.warn('Velora runtime correction failed',err);}
  }

  const oldRenderAll=window.renderAll;
  if(typeof oldRenderAll==='function'&&!oldRenderAll.__veloraRuntimeWrapped){
    const wrapped=function(){const result=oldRenderAll.apply(this,arguments);queueMicrotask(apply);return result;};
    wrapped.__veloraRuntimeWrapped=true;
    window.renderAll=wrapped;
  }

  const badge=qs('#modeBadge');if(badge)new MutationObserver(apply).observe(badge,{childList:true,subtree:true,characterData:true});
  document.addEventListener('click',e=>{if(e.target.closest?.('.nav[data-view="dashboard"]'))queueMicrotask(renderDashboardHeader)},true);
  addEventListener('modeflow:workspace',()=>queueMicrotask(()=>{resolveClientName();apply();}));
  resolveClientName();
  apply();
})();
