// ModeFlow commercial readiness UI: mobile drawer, onboarding and legal links.
(function(){
  'use strict';
  if(!document.querySelector('link[data-modeflow-mobile-v7]')){const l=document.createElement('link');l.rel='stylesheet';l.href='ui/mobile-v6.css?v=8';l.dataset.modeflowMobileV7='1';document.head.appendChild(l);}
  const qs=s=>document.querySelector(s), qsa=s=>[...document.querySelectorAll(s)];
  const mobile=()=>matchMedia('(max-width:720px)').matches;
  function setDrawer(open){
    document.body.classList.toggle('mf-nav-open',open);
    document.documentElement.classList.toggle('mf-nav-open',open);
    const menu=qs('.mf-mobile-menu');if(menu)menu.setAttribute('aria-expanded',String(open));
  }
  function ensureMobileNav(){
    const header=qs('.app main>header'); if(!header||qs('.mf-mobile-menu')) return;
    const menu=document.createElement('button'); menu.type='button'; menu.className='mf-mobile-menu'; menu.setAttribute('aria-label','Open navigation'); menu.setAttribute('aria-expanded','false'); menu.textContent='☰';
    header.insertBefore(menu,header.firstChild);
    const side=qs('.sidebar');
    if(side&&!qs('.mf-nav-close')){const closeBtn=document.createElement('button');closeBtn.type='button';closeBtn.className='mf-nav-close';closeBtn.setAttribute('aria-label','Close navigation');closeBtn.textContent='×';side.insertBefore(closeBtn,side.firstChild);closeBtn.onclick=()=>setDrawer(false);}
    menu.onclick=()=>setDrawer(!document.body.classList.contains('mf-nav-open'));
    qsa('.sidebar .nav[data-view],#logout').forEach(el=>el.addEventListener('click',()=>{if(mobile())setDrawer(false);}));
    document.addEventListener('click',e=>{if(mobile()&&document.body.classList.contains('mf-nav-open')&&!e.target.closest('.sidebar')&&!e.target.closest('.mf-mobile-menu'))setDrawer(false);},true);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')setDrawer(false);});
    addEventListener('resize',()=>{if(!mobile())setDrawer(false);},{passive:true});
  }
  function ensureFab(){
    if(qs('.mf-mobile-fab'))return;
    const b=document.createElement('button');b.type='button';b.className='mf-mobile-fab';b.textContent='+';b.title='New sale';b.setAttribute('aria-label','Create new sale');
    b.onclick=()=>qs('.goto-billing')?.click();document.body.appendChild(b);
  }
  function removeWasteBadge(){const badge=qs('#modeBadge');if(badge){badge.style.display='none';badge.setAttribute('aria-hidden','true');}}
  function legalLinks(){
    const box=qs('.login-box');if(!box||qs('.mf-legal-links'))return;
    const p=document.createElement('p');p.className='mf-legal-links micro';p.style.textAlign='center';p.style.marginTop='18px';p.innerHTML='<a href="privacy.html" style="color:inherit">Privacy Policy</a> · <a href="terms.html" style="color:inherit">Terms of Service</a>';
    box.appendChild(p);
  }
  function onboarding(){
    if(localStorage.getItem('modeflow-onboarding-v1')==='done'||qs('#mfOnboarding'))return;
    const d=document.createElement('dialog');d.id='mfOnboarding';d.innerHTML='<div class="dialog-card"><div><p class="kicker dark">WELCOME TO MODEFLOW</p><h3>Set up your store in 3 steps</h3><p class="muted">Add your products, record your first sale, then use Analytics to track performance.</p></div><div class="mfv4-row"><small>1 · Products</small><strong>Add product name, cost, selling price and stock.</strong></div><div class="mfv4-row"><small>2 · New Sale</small><strong>Create a sale and ModeFlow updates inventory automatically.</strong></div><div class="mfv4-row"><small>3 · Analytics</small><strong>Track sales, profit, stock alerts and expenses.</strong></div><div class="dialog-actions"><button type="button" class="btn primary" id="mfStartOnboarding">Start using ModeFlow</button></div></div>';
    document.body.appendChild(d);qs('#mfStartOnboarding').onclick=()=>{localStorage.setItem('modeflow-onboarding-v1','done');d.close();qs('[data-view="inventory"]')?.click();};
    const tryOpen=()=>{if(!qs('#app')?.classList.contains('hidden')&&!d.open)d.showModal();};setTimeout(tryOpen,900);
  }
  ensureMobileNav();ensureFab();removeWasteBadge();legalLinks();onboarding();
})();
