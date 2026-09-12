// Salesventory production branding + stable navigation layer.
(function(){
  'use strict';
  if(window.SalesventoryProductionV1)return;
  window.SalesventoryProductionV1=true;

  const BRAND='Salesventory';
  const ICON='/assets/salesventory-logo.png';
  const FULL='/assets/salesventory-full-logo.webp';
  const routeKey='salesventory-active-view-v2';
  const valid=id=>/^[a-z0-9-]+$/i.test(String(id||''))&&!!document.getElementById(id);
  const $=s=>document.querySelector(s);
  const replace=s=>String(s??'')
    .replace(/SALESDESK/g,'SALESVENTORY').replace(/SalesDesk/g,BRAND).replace(/salesdesk/g,'salesventory')
    .replace(/MODEFLOW/g,'SALESVENTORY').replace(/ModeFlow/g,BRAND).replace(/modeflow/g,'salesventory')
    .replace(/VELORA/g,'SALESVENTORY').replace(/Velora/g,BRAND).replace(/velora/g,'salesventory');

  function styles(){
    if($('#salesventory-production-styles'))return;
    const s=document.createElement('style');s.id='salesventory-production-styles';s.textContent=`
      #login>.velora-site-footer,body.ve-login #login .velora-site-footer{display:none!important}
      .sv-full-logo{display:block!important;width:min(265px,72vw)!important;height:auto!important;object-fit:contain!important;mix-blend-mode:multiply}
      .sv-icon-logo{display:block!important;width:100%!important;height:100%!important;object-fit:contain!important}
      .sidebar .brand b,.login-brand strong,.sv-wordmark{font-family:'DM Serif Display',Georgia,serif!important;font-weight:400!important;letter-spacing:-.025em!important}
      .sidebar .brand-mark,.sidebar .brand-mark.small{background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;overflow:visible!important}
    `;document.head.appendChild(s);
  }

  function patchText(root=document.body){
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){
      const p=n.parentElement;if(!p||/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/i.test(p.tagName))return NodeFilter.FILTER_REJECT;
      return /salesdesk|modeflow|velora/i.test(n.nodeValue||'')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
    }});
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(n=>n.nodeValue=replace(n.nodeValue));
    root.querySelectorAll?.('[title],[aria-label],[alt],[placeholder]').forEach(el=>['title','aria-label','alt','placeholder'].forEach(a=>{const v=el.getAttribute(a);if(v&&/salesdesk|modeflow|velora/i.test(v))el.setAttribute(a,replace(v));}));
  }

  function patchHead(){
    document.title=replace(document.title||'Salesventory — Business, made clear.');
    const d=$('meta[name="description"]');if(d)d.content=replace(d.content||'');
    if(!$('link[data-salesventory-favicon]')){const l=document.createElement('link');l.rel='icon';l.type='image/png';l.href=ICON;l.dataset.salesventoryFavicon='1';document.head.appendChild(l)}
  }

  function patchLogos(){
    const login=$('#login .login-brand');
    if(login&&!login.querySelector('img[data-salesventory-full]')){login.innerHTML='';const img=document.createElement('img');img.src=FULL;img.alt='Salesventory';img.className='sv-full-logo';img.dataset.salesventoryFull='1';login.appendChild(img)}
    const brand=$('.sidebar .brand');
    if(brand){const mark=brand.querySelector('.brand-mark');if(mark&&!mark.querySelector('img')){mark.textContent='';const img=document.createElement('img');img.src=ICON;img.alt='';img.className='sv-icon-logo';mark.appendChild(img)}const word=brand.querySelector('b');if(word)word.textContent=BRAND;}
    const store=$('.store-card b');if(store&&/salesdesk|modeflow|velora/i.test(store.textContent||''))store.textContent='Salesventory Workspace';
    document.querySelectorAll('.velora-site-footer').forEach(f=>{if(f.closest('#login'))f.remove()});
  }

  function applyBrand(){styles();patchHead();patchText();patchLogos()}

  function activeView(){return $('#app .view.active-view')?.id||'dashboard'}
  function appVisible(){const a=$('#app');return !!a&&!a.classList.contains('hidden')}
  function hashView(){const m=String(location.hash||'').match(/^#app\/([a-z0-9-]+)$/i);return m?.[1]||null}
  function remember(id){if(valid(id))try{sessionStorage.setItem(routeKey,id)}catch{}}
  function remembered(){try{return sessionStorage.getItem(routeKey)||null}catch{return null}}
  function route(id,mode='replace'){if(!valid(id))return;remember(id);const h='#app/'+id;if(location.hash===h)return;const fn=mode==='push'?'pushState':'replaceState';try{history[fn]({salesventoryView:id},'',location.pathname+location.search+h)}catch{}}
  function activate(id,mode='none'){if(!valid(id)||!appVisible())return false;if(typeof window.gotoView==='function')window.gotoView(id);else{document.querySelectorAll('#app .view').forEach(v=>v.classList.toggle('active-view',v.id===id));document.querySelectorAll('.nav[data-view]').forEach(n=>n.classList.toggle('active',n.dataset.view===id));}remember(id);if(mode!=='none')route(id,mode);return true}
  function restore(){if(!appVisible())return false;const id=hashView()||remembered()||activeView()||'dashboard';if(!activate(id,'none'))return false;route(id,'replace');return true}

  document.addEventListener('click',e=>{
    const t=e.target?.closest?.('.nav[data-view],[data-go],.goto-billing');if(!t||!appVisible())return;
    const id=t.dataset.view||t.dataset.go||(t.classList.contains('goto-billing')?'billing':null);if(!valid(id))return;
    setTimeout(()=>{remember(id);route(id,'push');applyBrand()},0);
  },true);
  document.addEventListener('input',()=>setTimeout(applyBrand,0),true);
  document.addEventListener('change',()=>setTimeout(applyBrand,0),true);
  addEventListener('popstate',()=>{const id=hashView();if(id)activate(id,'none')});
  addEventListener('hashchange',()=>{const id=hashView();if(id)activate(id,'none')});
  document.addEventListener('click',e=>{if(e.target?.closest?.('#logout')){try{sessionStorage.removeItem(routeKey)}catch{}}},true);
  addEventListener('modeflow:workspace',()=>{setTimeout(()=>{applyBrand();restore()},30)});
  addEventListener('salesdesk:data-refreshed',()=>setTimeout(applyBrand,0));
  addEventListener('salesdesk:operations-updated',()=>setTimeout(applyBrand,0));

  function boot(){
    applyBrand();
    let tries=0;const tick=()=>{applyBrand();if(restore())return;if(tries++<80)setTimeout(tick,75)};tick();
    [150,500,1200,2500,5000].forEach(ms=>setTimeout(()=>{applyBrand();restore()},ms));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
