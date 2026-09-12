// Salesventory reference UI v2 — final customer-facing UX controller.
(function(){
'use strict';
if(window.SalesventoryReferenceV2)return;
window.SalesventoryReferenceV2=true;

const BRAND='Salesventory';
const FULL_LOGO='/assets/salesventory-full-logo.webp';
const ICON_LOGO='/assets/salesventory-logo.png';
const THEME_KEY='salesventory-theme-v1';
const ROUTE_KEY='salesventory-active-view-v3';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function savedTheme(){try{return localStorage.getItem(THEME_KEY)}catch{return null}}
function systemTheme(){return matchMedia?.('(prefers-color-scheme: dark)')?.matches?'dark':'light'}
function applyTheme(theme){const next=theme==='dark'?'dark':'light';document.documentElement.dataset.theme=next;try{localStorage.setItem(THEME_KEY,next)}catch{};document.querySelector('meta[name="theme-color"]')?.setAttribute('content',next==='dark'?'#07191a':'#f6f4ee');}
applyTheme(savedTheme()||systemTheme());

const icons={
 dashboard:'<svg viewBox="0 0 24 24"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/></svg>',
 billing:'<svg viewBox="0 0 24 24"><path d="M5 3h14v18H5z"/><path d="M8 7h8M8 11h8M8 15h4"/></svg>',
 inventory:'<svg viewBox="0 0 24 24"><path d="m4 7 8-4 8 4-8 4z"/><path d="m4 7 8 4 8-4M4 7v10l8 4 8-4V7M12 11v10"/></svg>',
 customers:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>',
 expenses:'<svg viewBox="0 0 24 24"><path d="M4 7h16v13H4z"/><path d="M7 7V4h10v3M8 12h8"/></svg>',
 history:'<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>',
 reports:'<svg viewBox="0 0 24 24"><path d="M5 21V11M12 21V3M19 21v-7"/></svg>',
 subscription:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 15h4"/></svg>',
 settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2.8 2.8-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1 1.6v.2h-4v-.2a1.8 1.8 0 0 0-1-1.6 1.8 1.8 0 0 0-2 .4l-.1.1-2.8-2.8.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.6-1H3v-4h.2a1.8 1.8 0 0 0 1.6-1 1.8 1.8 0 0 0-.4-2l-.1-.1 2.8-2.8.1.1a1.8 1.8 0 0 0 2 .4 1.8 1.8 0 0 0 1-1.6V3h4v.2a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 2-.4l.1-.1 2.8 2.8-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.6 1h.2v4h-.2a1.8 1.8 0 0 0-1.6 1z"/></svg>'
};

function iconForNav(btn){
  const view=btn.dataset.view||'';
  if(icons[view])return icons[view];
  const text=btn.textContent.toLowerCase();
  if(/subscription|billing plan/.test(text))return icons.subscription;
  if(/setting|region|currency|profile|account/.test(text))return icons.settings;
  if(/report|analytic|insight/.test(text))return icons.reports;
  if(/customer|people|staff|supplier/.test(text))return icons.customers;
  if(/product|inventory|stock|catalog/.test(text))return icons.inventory;
  if(/sale|order|invoice|transaction/.test(text))return icons.billing;
  return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M9 12h6"/></svg>';
}

function replaceVisibleBrand(root=document.body){
  if(!root)return;
  const rx=/SalesDesk|SALESDESK|salesdesk|ModeFlow|MODEFLOW|modeflow|Velora|VELORA|velora/g;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){const p=node.parentElement;if(!p||/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/i.test(p.tagName))return NodeFilter.FILTER_REJECT;return rx.test(node.nodeValue||'')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}});
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){rx.lastIndex=0;node.nodeValue=node.nodeValue.replace(rx,BRAND).replace(/\b(?:VL|SD)-(?=\d)/g,'SV-');}
  $$('[title],[aria-label],[alt],[placeholder]',root).forEach(el=>['title','aria-label','alt','placeholder'].forEach(a=>{const v=el.getAttribute(a);if(v&&rx.test(v)){rx.lastIndex=0;el.setAttribute(a,v.replace(rx,BRAND));}}));
}

function patchBrand(){
  document.title='Salesventory — Run your business with clarity.';
  const desc=$('meta[name="description"]');if(desc)desc.content='Salesventory helps businesses manage sales, inventory, customers, expenses, reports and daily operations from one workspace.';
  replaceVisibleBrand();
  const brand=$('.sidebar .brand');
  if(brand&&!$('.sv-sidebar-full-logo',brand)){
    const img=document.createElement('img');img.src=FULL_LOGO;img.alt='Salesventory';img.className='sv-sidebar-full-logo';brand.prepend(img);
  }
  $$('.velora-site-footer__logo').forEach(link=>{
    if(!link.querySelector('img'))link.innerHTML=`<img class="sv-footer-logo" src="${FULL_LOGO}" alt="Salesventory — Inventory today. A bigger tomorrow.">`;
    link.setAttribute('aria-label','Salesventory home');
  });
  $$('.sidebar .nav').forEach(btn=>{const i=btn.querySelector('i');if(i&&!i.querySelector('svg'))i.innerHTML=iconForNav(btn);});
  const store=$('.store-card b');if(store&&/salesventory/i.test(store.textContent))store.textContent='Salesventory Workspace';
  $$('.store-avatar').forEach(x=>{if(/^(SD|VL)$/i.test(x.textContent.trim()))x.textContent='SV'});
}

function ensureTopbar(){
  const top=$('.topbar');const actions=$('.header-actions');if(!top||!actions)return;
  if(!$('.sv-mobile-menu',top)){
    const menu=document.createElement('button');menu.type='button';menu.className='sv-top-icon sv-mobile-menu';menu.setAttribute('aria-label','Open navigation');menu.innerHTML='<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';menu.onclick=()=>document.body.classList.toggle('sv-sidebar-open');top.prepend(menu);
  }
  if(!$('.sv-search-shell',top)){
    const shell=document.createElement('label');shell.className='sv-search-shell';shell.innerHTML='<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="svGlobalSearch" type="search" autocomplete="off" aria-label="Search" placeholder="Search products, orders, customers...">';
    top.insertBefore(shell,actions);
    const input=shell.querySelector('input');
    input.addEventListener('input',()=>{
      const active=$('#app .view.active-view');const target=active?.querySelector('#productSearch,#customerSearch,#invoiceSearch,.search-input');if(target&&target!==input){target.value=input.value;target.dispatchEvent(new Event('input',{bubbles:true}));}
    });
    input.addEventListener('keydown',e=>{if(e.key!=='Enter'||!input.value.trim())return;const nav=$('.sidebar .nav[data-view="inventory"]');nav?.click();setTimeout(()=>{const q=$('#productSearch');if(q){q.value=input.value;q.dispatchEvent(new Event('input',{bubbles:true}));}},0);});
  }
  if(!$('.sv-bell',actions)){
    const bell=document.createElement('button');bell.type='button';bell.className='sv-top-icon sv-bell';bell.setAttribute('aria-label','Notifications');bell.innerHTML='<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>';actions.prepend(bell);
  }
  if(!$('.sv-theme-toggle',actions)){
    const btn=document.createElement('button');btn.type='button';btn.className='sv-top-icon sv-theme-toggle';btn.setAttribute('aria-label','Toggle light and dark mode');btn.innerHTML='<svg class="sv-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><svg class="sv-moon" viewBox="0 0 24 24"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5z"/></svg>';btn.onclick=()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');actions.prepend(btn);
  }
}

function greeting(){const h=new Date().getHours();return h<12?'Good morning,':h<17?'Good afternoon,':'Good evening,'}
function dashboardCopy(){
  const intro=$('#dashboard .page-intro');if(!intro)return;
  const h=intro.querySelector('h3');if(h)h.textContent=greeting();
  const p=intro.querySelector(':scope > p');if(p)p.textContent="Here's what's happening today.";
  const kicker=intro.querySelector('.kicker');if(kicker)kicker.textContent='BUSINESS OVERVIEW';
}

function moneyLabel(n){try{return typeof money==='function'?money(n):'₹'+Number(n||0).toLocaleString('en-IN')}catch{return '₹'+Number(n||0).toLocaleString('en-IN')}}
function chartData(){
  try{
    if(typeof store==='undefined'||!Array.isArray(store.invoices))return [];
    const days=7,out=[];for(let d=days-1;d>=0;d--){const date=new Date();date.setHours(0,0,0,0);date.setDate(date.getDate()-d);const next=new Date(date);next.setDate(next.getDate()+1);const total=store.invoices.filter(i=>{const ts=Number(i.ts||new Date(i.created_at||i.date||0).getTime());return ts>=date.getTime()&&ts<next.getTime()}).reduce((a,i)=>a+Number(i.total||0),0);out.push({label:date.toLocaleDateString('en-IN',{day:'2-digit',month:'short'}),value:total});}return out;
  }catch{return []}
}
function renderReferenceChart(){
  const root=$('#bars');if(!root)return;
  const data=chartData();const values=data.map(x=>x.value);const max=Math.max(...values,1);const W=720,H=230,PX=34,PY=22,bottom=30;const usableW=W-PX*2,usableH=H-PY-bottom;
  const pts=data.map((x,i)=>({x:PX+(data.length===1?usableW/2:i*usableW/(data.length-1)),y:PY+usableH-(x.value/max)*usableH,v:x.value,label:x.label}));
  if(!pts.length)return;
  const d=pts.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ');const area=`M ${pts[0].x} ${PY+usableH} ${pts.map(p=>`L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')} L ${pts[pts.length-1].x} ${PY+usableH} Z`;
  const grid=[0,.25,.5,.75,1].map(t=>{const y=PY+usableH-usableH*t;return `<line x1="${PX}" y1="${y}" x2="${W-PX}" y2="${y}"/>`;}).join('');
  const labels=pts.map(p=>`<text class="sv-chart-label" x="${p.x}" y="${H-7}" text-anchor="middle">${esc(p.label)}</text>`).join('');
  const dots=pts.map(p=>`<circle class="sv-chart-dot" cx="${p.x}" cy="${p.y}" r="3.3"><title>${esc(p.label)} · ${esc(moneyLabel(p.v))}</title></circle>`).join('');
  root.innerHTML=`<svg class="sv-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sales overview chart"><g class="sv-chart-grid">${grid}</g><path class="sv-chart-area" d="${area}"/><path class="sv-chart-line" d="${d}"/>${dots}${labels}</svg>`;
  const head=root.closest('.panel')?.querySelector('.panel-head h3');if(head)head.textContent='Sales overview';
}

function invoicePreviewData(){
  const p=(()=>{try{return typeof selectedProduct==='function'?selectedProduct():null}catch{return null}})();
  const qty=Number($('#qty')?.value||1),rate=Number($('#rate')?.value||p?.price||0),discount=Number($('#discount')?.value||0),subtotal=qty*rate,total=Math.max(0,subtotal-discount);return{product:p?.name||$('#product option:checked')?.textContent?.split(' · ')[0]||'Product or Service',qty,rate,discount,subtotal,total,customer:$('#customerName')?.value||'Company Name'};
}
function renderInvoicePreview(){
  const root=$('#preview');if(!root)return;const d=invoicePreviewData();const today=new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'});
  root.innerHTML=`<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px"><img src="${FULL_LOGO}" alt="Salesventory" style="width:150px;height:auto;object-fit:contain"><div style="font-size:8px;line-height:1.65;text-align:right;color:#315d51">salesventory.online<br>Business workspace</div></div><div style="font-size:28px;letter-spacing:.08em;color:#155442;margin:32px 0 26px">INVOICE</div><div style="display:flex;justify-content:space-between;gap:18px;font-size:9px;line-height:1.55"><div><b>Bill To:</b><br>${esc(d.customer)}<br><span style="color:#6b766f">Customer address</span></div><div><b>Invoice No:</b> SV-${String(Date.now()).slice(-6)}<br><b>Issue Date:</b> ${today}<br><b>Due Date:</b> ${today}</div></div><table style="width:100%;min-width:0;margin-top:26px;border-collapse:collapse;font-size:8px"><thead><tr><th style="background:#144c3d;color:white;text-align:left;padding:8px">Description</th><th style="background:#144c3d;color:white;padding:8px">Qty</th><th style="background:#144c3d;color:white;text-align:right;padding:8px">Unit Price</th><th style="background:#144c3d;color:white;text-align:right;padding:8px">Amount</th></tr></thead><tbody><tr><td style="padding:9px;border-bottom:1px solid #d9d4c7">${esc(d.product)}</td><td style="text-align:center;border-bottom:1px solid #d9d4c7">${d.qty}</td><td style="text-align:right;border-bottom:1px solid #d9d4c7">${esc(moneyLabel(d.rate))}</td><td style="text-align:right;border-bottom:1px solid #d9d4c7">${esc(moneyLabel(d.subtotal))}</td></tr></tbody></table><div style="width:55%;margin:22px 0 0 auto;font-size:9px"><div style="display:flex;justify-content:space-between;padding:5px 0"><span>Subtotal</span><span>${esc(moneyLabel(d.subtotal))}</span></div><div style="display:flex;justify-content:space-between;padding:5px 0"><span>Discount</span><span>− ${esc(moneyLabel(d.discount))}</span></div><div style="display:flex;justify-content:space-between;padding:10px;background:#ceddce;font-weight:800;font-size:11px"><span>Total</span><span>${esc(moneyLabel(d.total))}</span></div></div><div style="margin-top:70px;font-size:9px;font-weight:800;color:#174f40">Thank you for your business.</div><div style="margin-top:13px;font-size:6px;letter-spacing:.22em;color:#174f40">INVENTORY TODAY. A BIGGER TOMORROW.</div>`;
}

function hashView(){const m=String(location.hash||'').match(/^#app\/([a-z0-9-]+)$/i);return m?.[1]||null}
function validView(id){return !!id&&!!document.getElementById(id)&&document.getElementById(id).classList.contains('view')}
function appVisible(){const a=$('#app');return !!a&&!a.classList.contains('hidden')}
function rememberView(id){if(validView(id))try{sessionStorage.setItem(ROUTE_KEY,id)}catch{}}
function rememberedView(){try{return sessionStorage.getItem(ROUTE_KEY)||null}catch{return null}}
function writeRoute(id,mode='replace'){if(!validView(id))return;rememberView(id);const url=location.pathname+location.search+'#app/'+id;if(location.hash==='#app/'+id)return;try{history[mode==='push'?'pushState':'replaceState']({salesventoryView:id},'',url)}catch{}}
function activate(id,{push=false}={}){if(!validView(id)||!appVisible())return false;try{if(typeof gotoView==='function')gotoView(id);else{$$('#app .view').forEach(v=>v.classList.toggle('active-view',v.id===id));$$('.sidebar .nav[data-view]').forEach(n=>n.classList.toggle('active',n.dataset.view===id));}}catch{}rememberView(id);writeRoute(id,push?'push':'replace');setTimeout(()=>{patchBrand();renderReferenceChart();},0);return true}
function restoreRoute(){if(!appVisible())return false;const id=hashView()||rememberedView()||$('#app .view.active-view')?.id||'dashboard';return activate(validView(id)?id:'dashboard')}

function bindRouting(){
  document.addEventListener('click',e=>{
    const nav=e.target.closest?.('.sidebar .nav[data-view],[data-go],.goto-billing');if(!nav||!appVisible())return;const id=nav.dataset.view||nav.dataset.go||(nav.classList.contains('goto-billing')?'billing':null);if(!validView(id))return;rememberView(id);setTimeout(()=>writeRoute(id,'push'),0);if(innerWidth<=900)document.body.classList.remove('sv-sidebar-open');
  },true);
  addEventListener('popstate',()=>{if(!appVisible())return;const id=hashView();if(validView(id)){activate(id);return;}activate(rememberedView()||$('#app .view.active-view')?.id||'dashboard');});
  addEventListener('hashchange',()=>{if(!appVisible())return;const id=hashView();if(validView(id))activate(id);});
  document.addEventListener('click',e=>{if(e.target.closest?.('#logout,#sdMarketLogout')){try{sessionStorage.removeItem(ROUTE_KEY)}catch{};document.documentElement.dataset.svSession='0';}},true);
}

async function resolveAuthFlash(){
  const login=$('#login');if(!login)return;let session=null;
  try{session=(await window.tkCloud?.auth?.session?.())?.data?.session||null}catch{}
  login.classList.add('sv-auth-resolved');document.documentElement.dataset.svSession=session?'1':'0';
  if(session){let n=0;const wait=()=>{if(appVisible()){restoreRoute();return}if(n++<40)setTimeout(wait,75)};wait();}
}

function closeSidebarOnBackdrop(e){if(innerWidth>900||!document.body.classList.contains('sv-sidebar-open'))return;if(e.target.closest?.('.sidebar,.sv-mobile-menu'))return;document.body.classList.remove('sv-sidebar-open')}

function finalize(){ensureTopbar();patchBrand();dashboardCopy();renderReferenceChart();renderInvoicePreview();}
function boot(){
  bindRouting();finalize();
  document.addEventListener('click',closeSidebarOnBackdrop,true);
  $('#rangeSel')?.addEventListener('change',()=>setTimeout(renderReferenceChart,0));
  $('#invoiceForm')?.addEventListener('submit',()=>setTimeout(()=>{renderReferenceChart();renderInvoicePreview();},25));
  document.addEventListener('input',e=>{if(e.target?.matches?.('#qty,#rate,#discount,#customerName,#phone,#product'))setTimeout(renderInvoicePreview,0)},true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('#product,#qty,#rate,#discount'))setTimeout(renderInvoicePreview,0)},true);
  addEventListener('modeflow:workspace',()=>setTimeout(()=>{finalize();restoreRoute();},30));
  addEventListener('resize',()=>{if(innerWidth>900)document.body.classList.remove('sv-sidebar-open')});
  [120,420,900,1800,3200,5200].forEach(ms=>setTimeout(()=>{finalize();if(appVisible())restoreRoute();},ms));
  resolveAuthFlash();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
