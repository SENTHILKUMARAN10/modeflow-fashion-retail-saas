// Velora production polish — non-invoice UI only.
(function(){
  'use strict';
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  let clientName='';
  const regionZones={IN:'Asia/Kolkata',US:'America/New_York',GB:'Europe/London',AE:'Asia/Dubai',SG:'Asia/Singapore',AU:'Australia/Sydney',CA:'America/Toronto'};

  async function resolveClientName(){
    try{
      const result=await window.tkCloud?.auth?.user?.();
      const u=result?.data?.user;
      const raw=u?.user_metadata?.full_name||u?.user_metadata?.name||u?.email?.split('@')[0]||'';
      clientName=String(raw).trim().split(/\s+/)[0]||'';
    }catch{}
    updateGreeting();
  }

  function hourForZone(){
    const region=localStorage.getItem('mf_region')||localStorage.getItem('modeflow-region')||'IN';
    const zone=regionZones[region]||Intl.DateTimeFormat().resolvedOptions().timeZone;
    try{return Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hour12:false,timeZone:zone}).format(new Date()));}catch{return new Date().getHours();}
  }

  function updateGreeting(){
    const title=$('#title'),dashboard=$('#dashboard');
    if(!title||!dashboard?.classList.contains('active-view'))return;
    const h=hourForZone(),greeting=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
    title.textContent=clientName?`${greeting}, ${clientName}.`:`${greeting}.`;
  }

  function cleanAdminDuplicates(){
    const items=$$('#mfAdminPaymentsButton');
    items.slice(1).forEach(x=>x.remove());
    if(items[0]){
      const span=items[0].querySelector('span');
      if(span)span.textContent='Admin payments';
    }
  }

  function bind(){
    resolveClientName();
    cleanAdminDuplicates();
    document.addEventListener('click',e=>{if(e.target.closest?.('.nav[data-view="dashboard"]'))queueMicrotask(updateGreeting)},true);
    addEventListener('modeflow:workspace',()=>queueMicrotask(()=>{resolveClientName();cleanAdminDuplicates();}));
    const footer=$('.side-footer');if(footer)new MutationObserver(cleanAdminDuplicates).observe(footer,{childList:true});
    setInterval(updateGreeting,30000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
