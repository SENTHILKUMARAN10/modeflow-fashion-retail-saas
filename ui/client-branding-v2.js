// Client-first branding layer: Velora stays the service provider; signed-in workspace promotes the client's business.
(function(){
  'use strict';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  let applying=false, ownerName='';

  const placeholder=/^(Velora Workspace|ModeFlow Store|ModeFlow|Velora|Your business|Your Business|Business workspace)$/i;
  function businessName(){
    const cloud=String(window.ModeFlowBusiness?.business?.name||'').trim();
    if(cloud&&!placeholder.test(cloud))return cloud;
    const visible=String($('.store-card div b')?.textContent||'').trim();
    if(visible&&!placeholder.test(visible))return visible;
    try{
      const cached=String(localStorage.getItem('business_name')||localStorage.getItem('modeflow_business_name')||'').trim();
      if(cached&&!placeholder.test(cached))return cached;
    }catch{}
    return 'Your Business';
  }
  function initials(name){return String(name||'Business').trim().split(/\s+/).filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase()||'B';}
  function regionLabel(){
    const map={IN:'India',US:'United States',GB:'United Kingdom',AE:'UAE',SG:'Singapore',AU:'Australia',CA:'Canada'};
    let code='IN';try{code=localStorage.getItem('mf_region')||localStorage.getItem('modeflow-region')||'IN';}catch{}
    return map[code]||code;
  }
  async function resolveOwner(){
    try{
      const r=await window.tkCloud?.auth?.user?.();const u=r?.data?.user;
      const raw=u?.user_metadata?.full_name||u?.user_metadata?.name||u?.email?.split('@')[0]||'';
      ownerName=String(raw).trim();
    }catch{}
    schedule();
  }

  function setText(el,value){if(el&&el.textContent!==value)el.textContent=value;}
  function applyShell(company){
    const app=$('#app');if(!app)return;
    const brand=$('.sidebar .brand');
    setText(brand?.querySelector('.brand-mark'),initials(company));
    setText(brand?.querySelector('b'),company);
    $('#veloraClientName')?.remove();
    $$('.sidebar .velora-client-name').forEach(x=>x.remove());
    setText(brand?.querySelector('small'),'Business workspace');

    const card=$('.store-card');
    setText(card?.querySelector('.store-avatar'),initials(company));
    setText(card?.querySelector('div b'),company);
    setText(card?.querySelector('div small'),`Business · ${regionLabel()}`);
    setText($('.profile'),initials(company));

    if(!app.classList.contains('hidden'))document.title=`${company} — Business Workspace`;

    const dashboard=$('#dashboard');
    if(dashboard&&!$('#clientServiceFooter')){
      dashboard.insertAdjacentHTML('beforeend','<footer id="clientServiceFooter" class="client-service-footer">Secure business workspace <span>·</span> Powered by <b>Velora</b></footer>');
    }
    if(!$('#clientBrandingStyles')){
      const style=document.createElement('style');style.id='clientBrandingStyles';
      style.textContent=`.client-service-footer{margin:34px 0 4px;padding:18px 4px 4px;border-top:1px solid rgba(31,91,73,.12);text-align:center;color:#8a8a80;font:600 10px/1.5 'Plus Jakarta Sans',sans-serif;letter-spacing:.05em}.client-service-footer span{margin:0 7px}.client-service-footer b{font-family:'DM Serif Display',Georgia,serif;font-size:13px;font-weight:400;color:#49675d;letter-spacing:0}.sidebar .brand b{font-family:'DM Serif Display','Playfair Display',Georgia,serif!important;font-size:25px!important;line-height:1.05!important}.sidebar .brand .brand-mark{font-family:'DM Serif Display',Georgia,serif!important}`;
      document.head.appendChild(style);
    }
  }

  function replaceServiceNames(company){
    const app=$('#app');if(!app)return;
    const footer=$('#clientServiceFooter');
    const walker=document.createTreeWalker(app,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      const parent=node.parentElement;if(!parent)return;
      if(footer&&footer.contains(parent))return;
      if(parent.closest('#login'))return;
      const old=node.nodeValue||'';
      const next=old.replace(/\bModeFlow\b/g,company).replace(/\bVelora\b/g,company);
      if(next!==old)node.nodeValue=next;
    });
  }

  function brandInvoice(company){
    const invoice=$('#preview .vf-invoice');if(!invoice)return;
    const mark=invoice.querySelector('.vf-mark');setText(mark,initials(company));
    setText(invoice.querySelector('.vf-brand-name'),company);
    const owner=invoice.querySelector('.vf-invoice-client');
    if(owner)setText(owner,ownerName||'Business owner');
    setText(invoice.querySelector('.vf-brand-tag'),'OFFICIAL BUSINESS INVOICE');
    const businessHead=invoice.querySelector('.vf-business-head');
    if(businessHead){setText(businessHead.querySelector('.vf-label'),'INVOICE');setText(businessHead.querySelector('strong'),'DRAFT');}
    setText(invoice.querySelector('.vf-kicker'),`${company.toUpperCase()} RECEIPT`);
    setText(invoice.querySelector('.vf-hero h3'),`Thank you for choosing ${company}.`);
    const note=invoice.querySelector('.vf-note');if(note)note.innerHTML=`Prepared by <b>${escapeHtml(company)}</b>. Customer, payment and item details update live before the sale is completed.`;
    const footer=invoice.querySelector('.vf-footer');if(footer)footer.innerHTML=`<div><div class="vf-footer-brand">${escapeHtml(company)}</div><small>Customer invoice</small></div><p>Thank you for your business.<br>${escapeHtml(regionLabel())}</p>`;
  }

  function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function money(v){const n=Number(v||0),c=window.ModeFlowCurrency||'INR';return c==='USD'?'$'+n.toLocaleString('en-US',{maximumFractionDigits:2}):'₹'+n.toLocaleString('en-IN',{maximumFractionDigits:2});}
  function invoiceById(id){try{return typeof store!=='undefined'?store.invoices?.find?.(x=>String(x.id)===String(id)):null}catch{return null}}
  function phoneForWhatsApp(v){let p=String(v||'').replace(/\D/g,'');if(p.length===10)p='91'+p;return p;}

  function overrideInvoiceActions(company){
    window.shareInvoice=function(id){
      const i=invoiceById(id);if(!i)return;
      const phone=phoneForWhatsApp(i.phone);
      if(!phone){const m='Add the customer mobile number before sharing on WhatsApp';typeof toast==='function'?toast(m):alert(m);return;}
      const subtotal=Number(i.subtotal||Number(i.qty||0)*Number(i.rate||0));
      const msg=`*${company}*\n*CUSTOMER INVOICE*\n\nInvoice: ${i.id}\nDate: ${i.date}\nCustomer: ${i.customer||'Walk-in customer'}\nMobile: ${i.phone||'—'}\n\n${i.product} × ${i.qty}\nRate: ${money(i.rate)}\nSubtotal: ${money(subtotal)}\nDiscount: ${money(i.discount||0)}\n*Total: ${money(i.total)}*\nPayment: ${(i.paymentMethod||'upi').toUpperCase()} · ${i.paymentStatus||'paid'}\n\nThank you for choosing ${company}.`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank','noopener');
    };
    window.printInvoice=function(id){
      const i=invoiceById(id);if(!i)return;
      const subtotal=Number(i.subtotal||Number(i.qty||0)*Number(i.rate||0)),discount=Number(i.discount||0),w=open('','_blank','width=840,height=1000');if(!w)return;
      const owner=ownerName||'Business owner';
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(company)} · ${escapeHtml(i.id)}</title><link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"><style>*{box-sizing:border-box}body{margin:0;background:#efe7d7;color:#182019;font-family:'Plus Jakarta Sans',Arial,sans-serif;padding:34px}.sheet{max-width:760px;margin:auto;background:#fffaf0;border:1px solid #d8cfbd;border-radius:28px;overflow:hidden}.top{background:#f2e7d4;padding:30px 34px;display:flex;justify-content:space-between;gap:24px;align-items:flex-start}.identity{display:flex;gap:14px;align-items:flex-start}.mark{width:48px;height:48px;border-radius:15px;background:#173f34;color:#fff;display:grid;place-items:center;font:400 26px 'DM Serif Display',Georgia,serif}.company{font:400 34px/1 'DM Serif Display',Georgia,serif;color:#173f34}.owner{margin-top:7px;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.tag{margin-top:5px;font-size:8px;font-weight:800;letter-spacing:.14em;color:#70776f}.metahead{text-align:right}.label{font-size:8px;letter-spacing:.13em;color:#737a71;font-weight:800}.metahead strong{display:block;margin-top:6px;font:400 22px 'DM Serif Display',Georgia,serif}.hero{background:linear-gradient(145deg,#153a30,#1f5b49 62%,#2e745e);color:#fff;padding:28px 34px;display:flex;justify-content:space-between;align-items:center;gap:18px}.hero h1{font:400 29px 'DM Serif Display',Georgia,serif;margin:5px 0}.hero small{letter-spacing:.15em;color:#d7e8df}.status{background:#f2e7d4;color:#1f5b49;padding:8px 12px;border-radius:999px;font-size:9px;font-weight:800}.body{padding:30px 34px}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.meta>div{background:#f8f1e5;border:1px solid #e4dac8;border-radius:14px;padding:14px}.value{margin-top:6px;font-size:12px;font-weight:700}.head,.item{display:grid;grid-template-columns:minmax(0,1.5fr) .35fr .7fr .75fr;gap:12px;align-items:center}.head{margin-top:24px;padding:10px 2px;border-top:1px solid #e4dac8;border-bottom:1px solid #e4dac8;font-size:8px;letter-spacing:.13em;color:#737a71;font-weight:800}.item{padding:18px 2px;border-bottom:1px solid #ece3d5;font-size:12px}.item strong:first-child{font:400 18px 'DM Serif Display',Georgia,serif}.head>:last-child,.item>:last-child{text-align:right}.sum{max-width:360px;margin:18px 0 0 auto}.sum>div{display:flex;justify-content:space-between;gap:20px;padding:8px 0;color:#60685f;font-size:12px}.sum .total{margin-top:8px;padding-top:18px;border-top:2px solid #1f5b49;color:#1f5b49}.total strong{font:400 31px 'DM Serif Display',Georgia,serif}.foot{margin:26px -34px -30px;padding:20px 34px;background:#f2e7d4;display:flex;justify-content:space-between;gap:20px}.foot b{font:400 22px 'DM Serif Display',Georgia,serif;color:#1f5b49}.foot p{margin:0;font-size:9px;color:#6a7169;text-align:right}@media print{body{background:#fff;padding:0}.sheet{border:0;border-radius:0}}</style></head><body><article class="sheet"><div class="top"><div class="identity"><span class="mark">${escapeHtml(initials(company))}</span><div><div class="company">${escapeHtml(company)}</div><div class="owner">${escapeHtml(owner)}</div><div class="tag">OFFICIAL BUSINESS INVOICE</div></div></div><div class="metahead"><div class="label">INVOICE</div><strong>${escapeHtml(i.id)}</strong><small>${escapeHtml(i.date)}</small></div></div><div class="hero"><div><small>${escapeHtml(company.toUpperCase())} RECEIPT</small><h1>Thank you for your business.</h1></div><span class="status">${escapeHtml((i.paymentStatus||'paid').toUpperCase())}</span></div><div class="body"><div class="meta"><div><div class="label">CUSTOMER</div><div class="value">${escapeHtml(i.customer||'Walk-in customer')}</div></div><div><div class="label">MOBILE</div><div class="value">${escapeHtml(i.phone||'—')}</div></div><div><div class="label">PAYMENT</div><div class="value">${escapeHtml((i.paymentMethod||'upi').toUpperCase())}</div></div><div><div class="label">STATUS</div><div class="value">${escapeHtml(i.paymentStatus||'paid')}</div></div></div><div class="head"><span>ITEM</span><span>QTY</span><span>RATE</span><span>AMOUNT</span></div><div class="item"><strong>${escapeHtml(i.product)}</strong><span>${Number(i.qty)||0}</span><span>${money(i.rate)}</span><strong>${money(subtotal)}</strong></div><div class="sum"><div><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div><span>Discount</span><strong>− ${money(discount)}</strong></div><div class="total"><span>Total paid</span><strong>${money(i.total)}</strong></div></div><div class="foot"><div><b>${escapeHtml(company)}</b><div>Customer invoice</div></div><p>Thank you for choosing ${escapeHtml(company)}.<br>${escapeHtml(regionLabel())}</p></div></div></article><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();
    };
  }

  function patchExcel(company){
    const X=window.XLSX;if(!X||X.__clientBrandPatched||typeof X.writeFile!=='function')return;
    const original=X.writeFile.bind(X);
    X.writeFile=function(wb,filename,opts){
      try{
        wb.Props=wb.Props||{};wb.Props.Title=`${company} Business Export`;wb.Props.Subject=`${company} business report`;wb.Props.Author=company;wb.Props.Company=company;
        Object.values(wb.Sheets||{}).forEach(ws=>{Object.keys(ws).forEach(k=>{const c=ws[k];if(c&&typeof c.v==='string'&&/Velora|ModeFlow/i.test(c.v))c.v=c.v.replace(/Velora|ModeFlow/gi,company);});});
        const clean=company.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,40)||'Business';
        filename=String(filename||'Business-Export.xlsx').replace(/^Velora-/i,'').replace(/^ModeFlow-/i,'');
        if(!new RegExp('^'+clean,'i').test(filename))filename=`${clean}-${filename}`;
      }catch{}
      return original(wb,filename,opts);
    };
    X.__clientBrandPatched=true;
  }

  function patchExportDialog(company){
    const d=$('#veloraExportDialog');if(!d)return;
    setText(d.querySelector('.vx-head small'),`${company.toUpperCase()} · BUSINESS EXPORT`);
    const note=d.querySelector('.vx-note');if(note)setText(note,`Export ${company} business records for all time or a selected date and time period. Current products and stock are included as the latest business snapshot.`);
  }

  function applyAll(){
    if(applying)return;applying=true;
    try{
      const company=businessName();
      applyShell(company);
      brandInvoice(company);
      patchExportDialog(company);
      patchExcel(company);
      replaceServiceNames(company);
      overrideInvoiceActions(company);
    }finally{applying=false;}
  }
  let queued=false;
  function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;applyAll();});}

  function bind(){
    resolveOwner();applyAll();
    const app=$('#app');if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true,characterData:true});
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:false});
    addEventListener('modeflow:workspace',()=>{setTimeout(resolveOwner,20);setTimeout(applyAll,80);setTimeout(applyAll,500);});
    document.addEventListener('click',e=>{if(e.target.closest?.('#exportData,[data-view="billing"],.goto-billing,[data-view="dashboard"]'))setTimeout(applyAll,20);},true);
    let tries=0;const timer=setInterval(()=>{applyAll();if(++tries>12)clearInterval(timer);},500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
