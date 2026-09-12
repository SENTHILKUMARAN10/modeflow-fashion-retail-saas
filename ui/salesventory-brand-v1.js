// Salesventory brand authority — final customer-facing brand, logo, invoices and messaging.
(function(){
  'use strict';
  if(window.SalesventoryBrandV1)return;
  window.SalesventoryBrandV1=true;

  const BRAND='Salesventory';
  const BRAND_UPPER='SALESVENTORY';
  const LOGO='/assets/salesventory-logo.png';
  const SUPPORT='support@salesventory.com';
  let applying=false;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const replace=s=>String(s??'')
    .replace(/SALESDESK/g,BRAND_UPPER).replace(/SalesDesk/g,BRAND).replace(/salesdesk/g,'salesventory')
    .replace(/MODEFLOW/g,BRAND_UPPER).replace(/ModeFlow/g,BRAND).replace(/modeflow/g,'salesventory')
    .replace(/VELORA/g,BRAND_UPPER).replace(/Velora/g,BRAND).replace(/velora/g,'salesventory')
    .replace(/support@(?:salesdesk|velora)\.(?:app|com)/gi,SUPPORT);

  function ensureHead(){
    document.title=replace(document.title||'')||`${BRAND} — Business, made clear.`;
    const description=document.querySelector('meta[name="description"]');
    if(description)description.content=replace(description.content||'');
    document.querySelectorAll('meta[content]').forEach(m=>{if(/salesdesk|modeflow|velora/i.test(m.content||''))m.content=replace(m.content)});
    let icon=document.querySelector('link[rel~="icon"][data-salesventory-icon]');
    if(!icon){icon=document.createElement('link');icon.rel='icon';icon.type='image/png';icon.href=LOGO;icon.dataset.salesventoryIcon='1';document.head.appendChild(icon)}
    let apple=document.querySelector('link[rel="apple-touch-icon"][data-salesventory-icon]');
    if(!apple){apple=document.createElement('link');apple.rel='apple-touch-icon';apple.href=LOGO;apple.dataset.salesventoryIcon='1';document.head.appendChild(apple)}
    if(!document.getElementById('salesventoryBrandStyles')){
      const style=document.createElement('style');style.id='salesventoryBrandStyles';style.textContent=`
        .sv-brand-mark{display:inline-grid!important;place-items:center!important;overflow:visible!important;background:transparent!important;border:0!important;box-shadow:none!important;color:transparent!important;padding:0!important}
        .sv-brand-mark>img{display:block!important;width:100%!important;height:100%!important;object-fit:contain!important}
        .brand-mark.sv-brand-mark,.ve-mark.sv-brand-mark,.velora-site-footer__mark.sv-brand-mark,.vf-mark.sv-brand-mark,.mark.sv-brand-mark{width:42px!important;height:42px!important;min-width:42px!important;border-radius:0!important}
        .brand-mark.small.sv-brand-mark{width:36px!important;height:36px!important;min-width:36px!important}
        .ve-mark.sv-brand-mark{width:42px!important;height:42px!important}
        .velora-site-footer__mark.sv-brand-mark{width:40px!important;height:40px!important}
        .vf-mark.sv-brand-mark{width:46px!important;height:46px!important}
        .brand b,.login-brand strong,.ve-word,.velora-site-footer__word,.vf-brand-name,.sv-wordmark{font-family:'DM Serif Display','Playfair Display',Georgia,serif!important;font-weight:400!important;letter-spacing:-.025em!important}
      `;document.head.appendChild(style);
    }
  }

  function patchText(root=document.body){
    if(!root)return;
    if(root.nodeType===Node.TEXT_NODE){if(/salesdesk|modeflow|velora/i.test(root.nodeValue||''))root.nodeValue=replace(root.nodeValue);return;}
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){const p=n.parentElement;if(!p||/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/i.test(p.tagName))return NodeFilter.FILTER_REJECT;return /salesdesk|modeflow|velora/i.test(n.nodeValue||'')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}});
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(n=>n.nodeValue=replace(n.nodeValue));
    root.querySelectorAll?.('[aria-label],[title],[alt],[placeholder],a[href^="mailto:"]').forEach(el=>{
      ['aria-label','title','alt','placeholder'].forEach(a=>{const v=el.getAttribute(a);if(v&&/salesdesk|modeflow|velora/i.test(v))el.setAttribute(a,replace(v));});
      const href=el.getAttribute('href');if(href&&/^mailto:/i.test(href)&&/salesdesk|modeflow|velora/i.test(href))el.setAttribute('href','mailto:'+SUPPORT);
    });
  }

  function patchMarks(root=document){
    root.querySelectorAll?.('.brand-mark,.ve-mark,.velora-site-footer__mark,.vf-mark,.mark').forEach(el=>{
      if(el.classList.contains('sv-brand-mark')&&el.querySelector('img'))return;
      el.classList.add('sv-brand-mark');el.textContent='';
      const img=document.createElement('img');img.src=LOGO;img.alt='';img.setAttribute('aria-hidden','true');el.appendChild(img);
    });
  }

  function currency(){return window.ModeFlowCurrency==='USD'?'USD':'INR'}
  function money(v){const n=Number(v||0);return currency()==='USD'?'$'+n.toLocaleString('en-US',{maximumFractionDigits:2}):'₹'+n.toLocaleString('en-IN',{maximumFractionDigits:2})}
  function businessName(){const visible=document.querySelector('.store-card div b')?.textContent?.trim()||'';const cloud=window.ModeFlowBusiness?.business?.name?.trim()||'';for(const n of [visible,cloud])if(n&&!/^(Salesventory)( Workspace| Store)?$/i.test(n))return replace(n);return 'Your business'}
  function ownerName(){return document.querySelector('#preview .vf-invoice-client')?.textContent?.trim()||'Account owner'}
  function invoiceById(id){try{return typeof store!=='undefined'?store.invoices?.find?.(x=>String(x.id)===String(id)):null}catch{return null}}
  function phone(v){let p=String(v||'').replace(/\D/g,'');if(p.length===10)p='91'+p;return p}

  function patchInvoiceActions(){
    if(typeof window==='undefined')return;
    window.shareInvoice=function(id){
      const i=invoiceById(id);if(!i)return;const p=phone(i.phone);if(!p){const m='Add the customer mobile number before sharing on WhatsApp';typeof toast==='function'?toast(m):alert(m);return}
      const subtotal=Number(i.subtotal||Number(i.qty||0)*Number(i.rate||0));
      const msg=`*${BRAND}*\n*${ownerName()}*\n\nBusiness: ${businessName()}\nInvoice: ${i.id}\nDate: ${i.date}\nCustomer: ${i.customer||'Walk-in customer'}\nMobile: ${i.phone||'—'}\n\n${i.product} × ${i.qty}\nRate: ${money(i.rate)}\nSubtotal: ${money(subtotal)}\nDiscount: ${money(i.discount||0)}\n*Total: ${money(i.total)}*\nPayment: ${(i.paymentMethod||'upi').toUpperCase()} · ${i.paymentStatus||'paid'}\n\nThank you for your business.\n${BRAND} — Business, made clear.`;
      window.open(`https://wa.me/${p}?text=${encodeURIComponent(msg)}`,'_blank','noopener');
    };
    window.printInvoice=function(id){
      const i=invoiceById(id);if(!i)return;const company=businessName(),owner=ownerName(),subtotal=Number(i.subtotal||Number(i.qty||0)*Number(i.rate||0)),discount=Number(i.discount||0);const w=open('','_blank','width=840,height=1000');if(!w)return;
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${BRAND} · ${esc(i.id)}</title><link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"><style>*{box-sizing:border-box}body{margin:0;background:#efe7d7;color:#182019;font-family:'Plus Jakarta Sans',Arial,sans-serif;padding:34px}.sheet{max-width:760px;margin:auto;background:#fffaf0;border:1px solid #d8cfbd;border-radius:28px;overflow:hidden}.top{background:#f2e7d4;padding:30px 34px;display:flex;justify-content:space-between;gap:24px}.brand{display:flex;gap:14px;align-items:center}.logo{width:52px;height:52px;object-fit:contain}.name{font:400 34px/1 'DM Serif Display',serif;color:#173f34}.owner{margin-top:7px;font-size:11px;font-weight:800;letter-spacing:.09em}.tag,.label{font-size:8px;font-weight:800;letter-spacing:.14em;color:#737a71}.business{text-align:right}.business strong{display:block;margin-top:6px;font:400 22px 'DM Serif Display',serif}.hero{background:linear-gradient(145deg,#153a30,#1f5b49 62%,#2e745e);color:#fff;padding:28px 34px;display:flex;justify-content:space-between;align-items:center}.hero h1{font:400 29px 'DM Serif Display',serif;margin:5px 0}.status{background:#f2e7d4;color:#1f5b49;padding:8px 12px;border-radius:999px;font-size:9px;font-weight:800}.body{padding:30px 34px}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.meta>div{background:#f8f1e5;border:1px solid #e4dac8;border-radius:14px;padding:14px}.value{margin-top:6px;font-size:12px;font-weight:700}.head,.item{display:grid;grid-template-columns:minmax(0,1.5fr) .35fr .7fr .75fr;gap:12px;align-items:center}.head{margin-top:24px;padding:10px 2px;border-top:1px solid #e4dac8;border-bottom:1px solid #e4dac8;font-size:8px;font-weight:800;letter-spacing:.13em;color:#737a71}.item{padding:18px 2px;border-bottom:1px solid #ece3d5;font-size:12px}.item strong:first-child{font:400 18px 'DM Serif Display',serif}.head>:last-child,.item>:last-child{text-align:right}.sum{max-width:360px;margin:18px 0 0 auto}.sum>div{display:flex;justify-content:space-between;padding:8px 0;color:#60685f;font-size:12px}.sum .total{margin-top:8px;padding-top:18px;border-top:2px solid #1f5b49;color:#1f5b49}.total strong{font:400 31px 'DM Serif Display',serif}.foot{margin:26px -34px -30px;padding:20px 34px;background:#f2e7d4;display:flex;justify-content:space-between}.foot b{font:400 22px 'DM Serif Display',serif;color:#1f5b49}.foot p{margin:0;font-size:9px;text-align:right;color:#6a7169}@media print{body{background:#fff;padding:0}.sheet{border:0;border-radius:0}}</style></head><body><article class="sheet"><div class="top"><div class="brand"><img class="logo" src="${location.origin}${LOGO}" alt=""><div><div class="name">${BRAND}</div><div class="owner">${esc(owner)}</div><div class="tag">BUSINESS, MADE CLEAR.</div></div></div><div class="business"><div class="label">BUSINESS</div><strong>${esc(company)}</strong><small>Customer invoice · ${esc(i.date)}</small></div></div><div class="hero"><div><small>${BRAND_UPPER} INVOICE</small><h1>Thank you for your business.</h1></div><span class="status">${esc((i.paymentStatus||'paid').toUpperCase())}</span></div><div class="body"><div class="meta"><div><div class="label">INVOICE</div><div class="value">${esc(i.id)}</div></div><div><div class="label">DATE</div><div class="value">${esc(i.date)}</div></div><div><div class="label">CUSTOMER</div><div class="value">${esc(i.customer||'Walk-in customer')}</div></div><div><div class="label">MOBILE</div><div class="value">${esc(i.phone||'—')}</div></div></div><div class="head"><span>ITEM</span><span>QTY</span><span>RATE</span><span>AMOUNT</span></div><div class="item"><strong>${esc(i.product)}</strong><span>${Number(i.qty)||0}</span><span>${money(i.rate)}</span><strong>${money(subtotal)}</strong></div><div class="sum"><div><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div><span>Discount</span><strong>− ${money(discount)}</strong></div><div><span>Payment</span><strong>${esc((i.paymentMethod||'upi').toUpperCase())} · ${esc(i.paymentStatus||'paid')}</strong></div><div class="total"><span>Total paid</span><strong>${money(i.total)}</strong></div></div><div class="foot"><div><b>${BRAND}</b><div>Business, made clear.</div></div><p>Invoice prepared for ${esc(company)}.<br>Thank you for your business.</p></div></div></article><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();
    };
  }

  function apply(root=document.body){
    if(applying)return;applying=true;
    try{ensureHead();patchText(root||document.body);patchMarks(root?.ownerDocument||document);patchInvoiceActions()}finally{applying=false}
  }

  function boot(){
    apply();
    const observer=new MutationObserver(records=>{
      if(applying)return;
      for(const record of records){
        if(record.type==='characterData')patchText(record.target);
        for(const node of record.addedNodes||[])if(node.nodeType===1||node.nodeType===3)patchText(node);
      }
      apply();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
    [50,180,500,1200,2500,5000].forEach(ms=>setTimeout(apply,ms));
    addEventListener('load',apply,{once:true});
    addEventListener('modeflow:workspace',()=>setTimeout(apply,0));
    document.addEventListener('click',()=>setTimeout(apply,0),true);
  }

  const api={apply,replace,logo:LOGO,name:BRAND};
  window.SalesventoryBrand=api;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
