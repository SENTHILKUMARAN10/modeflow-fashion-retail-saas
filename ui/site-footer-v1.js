// Salesventory footer + static-page brand guard.
(function(){
  'use strict';
  if(window.SalesventoryFooters)return;
  const BRAND='Salesventory',LOGO='/assets/salesventory-logo.png',FULL='/assets/salesventory-full-logo.webp',SUPPORT='support@salesventory.com';
  const replace=s=>String(s??'').replace(/SALESDESK|MODEFLOW|VELORA/g,'SALESVENTORY').replace(/SalesDesk|ModeFlow|Velora/g,BRAND).replace(/salesdesk|modeflow|velora/g,'salesventory').replace(/support@(?:salesdesk|velora)\.(?:app|com)/gi,SUPPORT);

  function fullLogo(el,label='Salesventory home'){
    if(!el)return;
    if(el.querySelector(':scope > img[data-salesventory-full-logo]'))return;
    el.innerHTML='';el.setAttribute('aria-label',label);el.classList.add('sv-footer-full-logo');
    const img=document.createElement('img');img.src=FULL;img.alt='Salesventory — Inventory today. A bigger tomorrow.';img.dataset.salesventoryFullLogo='1';el.appendChild(img);
  }

  function patchPage(){
    document.title=replace(document.title||'');
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode(n){const p=n.parentElement;if(!p||/^(SCRIPT|STYLE|TEXTAREA|NOSCRIPT)$/i.test(p.tagName))return NodeFilter.FILTER_REJECT;return /salesdesk|modeflow|velora/i.test(n.nodeValue||'')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(n=>n.nodeValue=replace(n.nodeValue));
    document.querySelectorAll('a[href^="mailto:"]').forEach(a=>{if(/salesdesk|modeflow|velora/i.test(a.getAttribute('href')||''))a.href='mailto:'+SUPPORT});
    document.querySelectorAll('.top .brand').forEach(el=>fullLogo(el));
    document.querySelectorAll('.brand-mark,.ve-mark').forEach(el=>{if(el.querySelector?.('img[data-sv-logo]'))return;el.textContent='';el.style.background='transparent';el.style.border='0';const img=document.createElement('img');img.src=LOGO;img.alt='';img.dataset.svLogo='1';img.style.cssText='width:100%;height:100%;object-fit:contain;display:block';el.appendChild(img)});
  }

  const style=document.createElement('style');style.id='salesventorySiteFooterStyles';style.textContent=`
    .velora-site-footer{margin-top:64px;background:#f7f3e8;border-top:1px solid #ddd3c2;color:#182019;padding:42px clamp(20px,4vw,52px) 22px;font-family:'Plus Jakarta Sans',system-ui,sans-serif}.velora-site-footer__grid{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:minmax(280px,1.35fr) repeat(2,minmax(150px,.7fr));gap:clamp(28px,5vw,68px);align-items:start}.velora-site-footer__brand{max-width:460px}.velora-site-footer__logo,.sv-footer-full-logo{display:inline-flex;align-items:center;text-decoration:none;color:#172f27;width:min(300px,100%)}.velora-site-footer__logo img,.sv-footer-full-logo>img{display:block;width:100%;height:auto;object-fit:contain;object-position:left center}.velora-site-footer__tag{margin:15px 0 0;max-width:390px;color:#5f6962;font-size:13px;line-height:1.7}.velora-site-footer__eyebrow{display:block;margin-bottom:16px;color:#7b7c72;font-size:9px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.velora-site-footer__links{display:grid;gap:11px}.velora-site-footer__links a{width:max-content;max-width:100%;color:#27352e;text-decoration:none;font-size:12px;line-height:1.45}.velora-site-footer__email{font-weight:800;color:#1f5b49!important;word-break:break-word}.velora-site-footer__bottom{max-width:1180px;margin:34px auto 0;padding-top:18px;border-top:1px solid #ddd3c2;display:flex;justify-content:space-between;gap:20px;align-items:center;color:#8a897f;font-size:10px;line-height:1.5}.velora-site-footer__bottom b{font-weight:700;color:#687069}#veloraLanding>.velora-site-footer{margin-top:0;padding-top:52px}.view>.velora-site-footer{margin-left:calc(clamp(24px,4vw,54px) * -1);margin-right:calc(clamp(24px,4vw,54px) * -1);margin-bottom:calc(clamp(24px,4vw,54px) * -1)}#login>.velora-site-footer,body.ve-login #login .velora-site-footer{display:none!important}@media(max-width:820px){.velora-site-footer{padding:36px 22px 20px}.velora-site-footer__grid{grid-template-columns:1fr 1fr;gap:30px 24px}.velora-site-footer__brand{grid-column:1/-1}.velora-site-footer__bottom{margin-top:30px;align-items:flex-start;flex-direction:column}.view>.velora-site-footer{margin-left:-18px;margin-right:-18px;margin-bottom:-18px}}@media(max-width:520px){.velora-site-footer__grid{grid-template-columns:1fr}.velora-site-footer__brand{grid-column:auto}.velora-site-footer__logo{width:min(260px,100%)}.velora-site-footer__tag{font-size:12px}.velora-site-footer__bottom{font-size:9px}.view>.velora-site-footer{margin-left:-14px;margin-right:-14px;margin-bottom:-14px}}`;
  document.head.appendChild(style);

  function markup(){return `<div class="velora-site-footer__grid"><div class="velora-site-footer__brand"><a class="velora-site-footer__logo" href="/" aria-label="Salesventory home"><img src="${FULL}" alt="Salesventory — Inventory today. A bigger tomorrow."></a><p class="velora-site-footer__tag">One professional workspace for sales, customers, products or services, inventory, purchasing, expenses and business performance.</p></div><div><span class="velora-site-footer__eyebrow">Product</span><nav class="velora-site-footer__links"><a href="/#how">How it works</a><a href="/#features">Features</a><a href="/#pricing">Pricing</a><a href="/#login">Sign in</a></nav></div><div><span class="velora-site-footer__eyebrow">Company</span><nav class="velora-site-footer__links"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/refund-policy">Refund policy</a><a class="velora-site-footer__email" href="mailto:${SUPPORT}">${SUPPORT}</a></nav></div></div><div class="velora-site-footer__bottom"><span>© 2026 Salesventory. All rights reserved.</span><span><b>Inventory today. A bigger tomorrow.</b></span></div>`}
  function makeFooter(kind){const f=document.createElement('footer');f.className='velora-site-footer';f.dataset.veloraFooter=kind;f.innerHTML=markup();return f}
  function ensure(container,kind){if(!container)return;if(container.querySelector(`:scope > .velora-site-footer[data-velora-footer="${kind}"]`))return;container.appendChild(makeFooter(kind))}
  function refresh(){
    patchPage();
    const login=document.getElementById('login');if(login)login.querySelectorAll('.velora-site-footer').forEach(f=>f.remove());
    const landing=document.getElementById('veloraLanding');if(landing)ensure(landing,'landing');
    document.querySelectorAll('#app .view').forEach((view,i)=>ensure(view,'view-'+(view.id||i)));
    patchPage();
  }
  const api={refresh};window.SalesventoryFooters=api;window.SalesDeskFooters=api;window.VeloraFooters=api;
  refresh();[100,350,900,1800,3500].forEach(ms=>setTimeout(refresh,ms));addEventListener('load',refresh,{once:true});addEventListener('modeflow:workspace',()=>setTimeout(refresh,25));document.addEventListener('click',e=>{if(e.target.closest?.('.nav,[data-view],[data-go],[data-ve-login]'))setTimeout(refresh,0)},true);
})();
