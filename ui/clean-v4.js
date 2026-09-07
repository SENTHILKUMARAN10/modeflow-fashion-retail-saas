// ModeFlow v4 lightweight UI + identity controller. No MutationObservers, no pointermove loops.
(function(){
  'use strict';
  if(document.querySelector('link[data-modeflow-v4]')) return;
  const link=document.createElement('link');link.rel='stylesheet';link.href='ui/clean-v4.css?v=4';link.dataset.modeflowV4='1';document.head.appendChild(link);
  const qs=s=>document.querySelector(s);
  const core=window.ModeFlowCore;
  const cloud=window.tkCloud;
  try{localStorage.removeItem('mf_products');localStorage.removeItem('mf_invoices');localStorage.removeItem('mf_expenses');if(typeof store!=='undefined'){store.products=[];store.invoices=[];store.expenses=[];}}catch{}
  const initials=(name,fallback='MF')=>{const p=String(name||'').trim().split(/\s+/).filter(Boolean);return (p.length?((p[0][0]||'')+(p.length>1?(p[p.length-1][0]||''):'')):fallback).toUpperCase();};
  const businessName=()=>{const t=qs('.store-card b')?.textContent?.trim();return (!t||/atelier vogue/i.test(t))?'ModeFlow Store':t;};
  let cachedUser=null;
  function syncBusiness(){
    const name=businessName();const b=qs('.store-card b');if(b&&/atelier vogue/i.test(b.textContent))b.textContent='ModeFlow Store';
    const small=qs('.store-card small');if(small&&/flagship|tiruppur/i.test(small.textContent))small.textContent='Secure cloud workspace';
    const av=qs('.store-card .store-avatar');if(av)av.textContent=initials(name);
    const badge=qs('#modeBadge');if(badge&&/demo/i.test(badge.textContent))badge.textContent='Cloud workspace';
    const sub=qs('.login-box .subtext');if(sub)sub.textContent='Sign in or create an account to access your secure cloud workspace.';
  }
  function userName(user){const m=user?.user_metadata||{};return m.full_name||m.name||m.display_name||user?.email?.split('@')[0]||'ModeFlow user';}
  function greeting(){const h=new Date().getHours();return h<12?'Good morning':h<17?'Good afternoon':'Good evening';}
  function syncUser(){
    const user=cachedUser;if(!user)return;const name=userName(user);const init=initials(name,'MF');
    const p=qs('.profile');if(p){p.textContent=init;p.title='Profile';p.setAttribute('aria-label','Open profile');p.setAttribute('role','button');p.tabIndex=0;}
    const title=qs('#title');if(title&&qs('#dashboard.active-view'))title.textContent=`${greeting()}, ${name.split(/\s+/)[0]}.`;
    const n=qs('#mfv4Name');if(n)n.textContent=name;const e=qs('#mfv4Email');if(e)e.textContent=user.email||'—';
    const provider=qs('#mfv4Provider');if(provider)provider.textContent=user.app_metadata?.provider==='google'?'Signed in with Google':'Signed in with email';
    const a=qs('#mfv4Avatar');if(a){const pic=user.user_metadata?.avatar_url||user.user_metadata?.picture||'';a.innerHTML=pic?`<img src="${pic.replace(/"/g,'&quot;')}" alt="">`:init;}
    const w=qs('#mfv4Workspace');if(w)w.textContent=businessName();const r=qs('#mfv4Role');if(r)r.textContent=(qs('#modeBadge')?.textContent||'Cloud member').replace(/^Cloud\s*·\s*/i,'');
  }
  function syncAll(){syncBusiness();syncUser();}
  function ensureProfile(){
    if(qs('#mfv4Profile'))return;const d=document.createElement('dialog');d.id='mfv4Profile';d.className='mfv4-profile';d.innerHTML='<div class="mfv4-card"><div class="mfv4-head"><div class="mfv4-avatar" id="mfv4Avatar">MF</div><div><h3 id="mfv4Name">ModeFlow user</h3><p id="mfv4Provider">Secure account</p></div></div><div class="mfv4-row"><small>Email</small><strong id="mfv4Email">—</strong></div><div class="mfv4-row"><small>Workspace</small><strong id="mfv4Workspace">ModeFlow Store</strong></div><div class="mfv4-row"><small>Access</small><strong id="mfv4Role">Cloud member</strong></div><div class="mfv4-actions"><button type="button" class="btn ghost" id="mfv4Close">Close</button><button type="button" class="btn dark" id="mfv4Logout">Sign out</button></div></div>';document.body.appendChild(d);
    qs('#mfv4Close').onclick=()=>d.close();qs('#mfv4Logout').onclick=()=>{d.close();qs('#logout')?.click();};
    const p=qs('.profile');if(p){const open=()=>{syncAll();d.showModal();};p.onclick=open;p.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};}
  }
  // Keep identity correct after normal app renders without observing the DOM.
  const oldRender=window.renderAll;if(typeof oldRender==='function'){window.renderAll=function(){const v=oldRender.apply(this,arguments);queueMicrotask(syncAll);return v;};}
  ensureProfile();syncBusiness();
  if(cloud?.enabled){cloud.auth.session().then(({data})=>{cachedUser=data?.session?.user||null;syncAll();});cloud.auth.onChange((event,session)=>{cachedUser=session?.user||cachedUser;if(event==='SIGNED_OUT')cachedUser=null;syncAll();});}
  // One-shot post-startup corrections cover workspace data arriving after auth.
  setTimeout(syncAll,150);setTimeout(syncAll,700);setTimeout(syncAll,1800);
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-view],[data-go],.goto-billing'))setTimeout(syncAll,0)},true);
})();
