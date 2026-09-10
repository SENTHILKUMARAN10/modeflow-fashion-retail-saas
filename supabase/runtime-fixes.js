// Final production UI corrections for Velora.
(function(){
  'use strict';
  const core=window.ModeFlowCore;
  if(!core) return console.error('ModeFlowCore failed to load');
  const qs=s=>document.querySelector(s);
  const qsa=s=>[...document.querySelectorAll(s)];
  const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const regionZones={IN:'Asia/Kolkata',US:'America/New_York',GB:'Europe/London',AE:'Asia/Dubai',SG:'Asia/Singapore',AU:'Australia/Sydney',CA:'America/Toronto'};
  let clientFirstName='';

  function currentRole(){
    const text=qs('#modeBadge')?.textContent||'';
    const match=text.match(/\b(owner|manager|staff)\b/i);
    return match?match[1].toLowerCase():'staff';
  }

  function businessName(){
    return window.ModeFlowBusiness?.business?.name||qs('.store-card div b')?.textContent?.trim()||'Your business';
  }

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
    renderLiveDashboard();
  }

  function applyRoleUI(){
    const cap=core.capabilities(currentRole());
    const add=qs('#addProduct');
    if(add){add.disabled=!cap.manageProducts;add.hidden=!cap.manageProducts;}
    qsa('#inventoryRows .action-btn').forEach(btn=>{btn.hidden=!cap.manageProducts;});
    qsa('#historyRows .action-btn.danger').forEach(btn=>{btn.hidden=!cap.deleteSales;});
    qsa('#expenseList .action-btn.danger').forEach(btn=>{btn.hidden=!cap.deleteExpenses;});
  }

  function renderLiveDashboard(){
    if(typeof store!=='undefined'){
      const month=core.currentMonthSummary(store.invoices||[]);
      const top=core.topProduct(store.invoices||[]);
      const now=new Date();
      const monthName=now.toLocaleDateString('en-IN',{month:'long'}).toUpperCase();
      const hero=qs('#dashboard .hero-card');
      if(hero){
        const kicker=hero.querySelector('.kicker');if(kicker)kicker.textContent=monthName+' PERFORMANCE';
        const amount=hero.querySelector('h3');if(amount)amount.textContent=core.money(month.revenue);
        const description=hero.querySelector('h3 + p');if(description)description.textContent='Net sales this month';
        const trend=hero.querySelector('.trend');if(trend){trend.textContent=month.orders+' order'+(month.orders===1?'':'s')+' this month';trend.classList.remove('positive');}
      }
      const spotlight=qs('#dashboard .spotlight-content div');
      if(spotlight){
        const label=spotlight.querySelector('small');if(label)label.textContent='Top-selling product';
        const name=spotlight.querySelector('strong');if(name)name.textContent=top?.name||'No sales yet';
        const units=spotlight.querySelector('span');if(units)units.textContent=top?`${top.quantity} unit${top.quantity===1?'':'s'} sold`:'Complete a sale to see performance';
      }
    }
    if(qs('#dashboard.active-view')){
      const title=qs('#title');
      if(title)title.textContent=clientFirstName?`${greeting()}, ${clientFirstName}.`:`${greeting()}.`;
    }
    const profile=qs('.profile');if(profile)profile.textContent=core.initials(clientFirstName||businessName());
  }

  function receiptMoney(value){return core.money(Number(value)||0);}

  function renderCloudPreview(){
    if(typeof selectedProduct!=='function') return;
    const p=selectedProduct()||{name:'Product / service'};
    const qty=Math.max(1,Number(qs('#qty')?.value)||1);
    const rate=Number(qs('#rate')?.value)||Number(p.price)||0;
    const totals=core.calculateSale({quantity:qty,rate,discount:qs('#discount')?.value});
    const previewTotal=qs('#previewTotal');if(previewTotal)previewTotal.textContent=core.money(totals.total);
    const preview=qs('#preview');if(!preview)return;

    // Remove every older receipt renderer so only this final Velora preview can be shown.
    qs('#veloraReceiptPreview')?.remove();
    preview.classList.remove('velora-legacy-preview-hidden');
    preview.classList.add('velora-live-receipt');

    const customer=qs('#customerName')?.value?.trim()||'Walk-in customer';
    const phone=qs('#phone')?.value?.trim()||'No mobile number';
    const payment=(qs('#paymentMethod')?.value||'upi').toUpperCase();
    const status=qs('#paymentStatus')?.value||'paid';
    const company=businessName();
    const date=new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});

    preview.innerHTML=`
      <div class="vr-top">
        <div>
          <div class="vr-company">${safe(company)}</div>
          <div class="vr-company-sub">Customer invoice · ${safe(date)}</div>
        </div>
        <div class="vr-brand">
          <span class="vr-mark">V</span>
          <div><b>Velora</b><small>BUSINESS, MADE CLEAR.</small></div>
        </div>
      </div>
      <div class="vr-hero">
        <div><span>RECEIPT PREVIEW</span><h3>A better finish to every sale.</h3></div>
        <div class="vr-status">${safe(status.toUpperCase())}</div>
      </div>
      <div class="vr-meta">
        <div><small>CUSTOMER</small><strong>${safe(customer)}</strong><span>${safe(phone)}</span></div>
        <div><small>PAYMENT</small><strong>${safe(payment)}</strong><span>${safe(status)}</span></div>
      </div>
      <div class="vr-table-head"><span>ITEM</span><span>QTY</span><span>RATE</span><span>AMOUNT</span></div>
      <div class="vr-item"><strong>${safe(p.name)}</strong><span>${qty}</span><span>${receiptMoney(rate)}</span><strong>${receiptMoney(totals.subtotal)}</strong></div>
      <div class="vr-summary">
        <div><span>Subtotal</span><strong>${receiptMoney(totals.subtotal)}</strong></div>
        <div><span>Discount</span><strong>− ${receiptMoney(totals.discount)}</strong></div>
        <div class="vr-total"><span>Total payable</span><strong>${receiptMoney(totals.total)}</strong></div>
      </div>
      <div class="vr-footer">
        <div><span class="vr-logo-word">Velora</span><small>Business, made clear.</small></div>
        <p>Prepared for <b>${safe(company)}</b><br>Thank you for your business.</p>
      </div>`;
  }

  function applyProductionUI(){
    try{renderLiveDashboard();applyRoleUI();renderCloudPreview();}
    catch(err){console.warn('Velora production UI correction failed',err);}
  }

  const originalRenderAll=window.renderAll;
  if(typeof originalRenderAll==='function'){
    window.renderAll=function(){
      const value=originalRenderAll.apply(this,arguments);
      queueMicrotask(applyProductionUI);
      return value;
    };
  }

  ['#qty','#rate','#discount','#customerName','#phone','#paymentMethod','#paymentStatus','#product'].forEach(selector=>{
    const el=qs(selector);
    if(el){el.addEventListener('input',renderCloudPreview);el.addEventListener('change',renderCloudPreview);}
  });

  const originalShare=window.shareInvoice;
  window.shareInvoice=function(invoiceNumber){
    if(typeof store==='undefined')return originalShare?.(invoiceNumber);
    const i=store.invoices.find(x=>x.id===invoiceNumber);if(!i)return;
    const company=businessName();
    const text=`*${company}*\n*Velora Receipt*\n\nInvoice: ${i.id}\nCustomer: ${i.customer||'Walk-in customer'}\n${i.product} × ${i.qty}\nSubtotal: ${core.money(i.subtotal||Number(i.qty)*Number(i.rate))}\nDiscount: ${core.money(i.discount||0)}\n*Total: ${core.money(i.total)}*\nPayment: ${(i.paymentMethod||'upi').toUpperCase()} · ${i.paymentStatus||'paid'}\nDate: ${i.date}\n\nThank you for your business.\nVelora — Business, made clear.`;
    const phone=core.whatsappPhone(i.phone);
    if(phone)return window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`,'_blank','noopener');
    if(typeof toast==='function')toast('Add the customer mobile number before sharing on WhatsApp');
  };

  const originalPrint=window.printInvoice;
  window.printInvoice=function(invoiceNumber){
    if(typeof store==='undefined')return originalPrint?.(invoiceNumber);
    const i=store.invoices.find(x=>x.id===invoiceNumber);if(!i)return;
    const company=businessName();
    const subtotal=Number(i.subtotal||Number(i.qty)*Number(i.rate)||0);
    const discount=Number(i.discount||0);
    const w=open('','_blank','width=820,height=1000');
    if(!w)return typeof toast==='function'&&toast('Allow pop-ups to print invoices');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${safe(i.id)}</title><link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"><style>*{box-sizing:border-box}body{margin:0;background:#f4f0e6;color:#182019;font-family:'Plus Jakarta Sans',Arial,sans-serif;padding:34px}.sheet{max-width:760px;margin:auto;background:#fffaf0;border:1px solid #d8cfbd;border-radius:28px;overflow:hidden;box-shadow:0 24px 70px rgba(31,91,73,.12)}.top{background:#f1e6d2;padding:28px 32px;display:flex;justify-content:space-between;align-items:center;gap:20px}.company{font:400 34px/1 'DM Serif Display',Georgia,serif}.brand{display:flex;align-items:center;gap:10px}.mark{width:42px;height:42px;border-radius:13px;background:#1f5b49;color:white;display:grid;place-items:center;font:400 25px 'DM Serif Display',Georgia,serif}.brandname{font:400 27px 'DM Serif Display',Georgia,serif;color:#1f5b49}.brand small{display:block;font-size:8px;letter-spacing:.15em;color:#6f756f}.hero{background:linear-gradient(145deg,#173f34,#1f5b49 62%,#2a7660);color:white;padding:28px 32px;display:flex;justify-content:space-between;gap:22px}.hero h1{margin:4px 0 0;font:400 32px 'DM Serif Display',Georgia,serif}.hero small{font-size:9px;letter-spacing:.16em;color:#cee0d7}.status{height:max-content;background:#f1e6d2;color:#1f5b49;border-radius:999px;padding:8px 12px;font-size:9px;font-weight:800;letter-spacing:.1em}.body{padding:28px 32px}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:25px}.meta div{background:#f8f1e5;border:1px solid #e4dac8;border-radius:14px;padding:14px}.label{font-size:8px;letter-spacing:.13em;color:#70776f;font-weight:800}.value{margin-top:6px;font-size:12px;font-weight:700;word-break:break-word}.thead,.item{display:grid;grid-template-columns:minmax(0,1.5fr) .35fr .7fr .75fr;gap:12px;align-items:center}.thead{border-top:1px solid #e3d9c8;border-bottom:1px solid #e3d9c8;padding:11px 4px;font-size:8px;letter-spacing:.13em;font-weight:800;color:#70776f}.item{padding:18px 4px;border-bottom:1px solid #ece4d7;font-size:12px}.thead>:last-child,.item>:last-child{text-align:right}.summary{max-width:360px;margin:18px 0 0 auto}.summary>div{display:flex;justify-content:space-between;gap:20px;padding:8px 0;font-size:12px;color:#606860}.summary .total{margin-top:8px;padding:18px 0 0;border-top:2px solid #1f5b49;color:#1f5b49;align-items:end}.total strong{font:400 31px 'DM Serif Display',Georgia,serif}.foot{margin:26px -32px -28px;padding:20px 32px;background:#f1e6d2;display:flex;justify-content:space-between;gap:20px;align-items:end}.foot .velora{font:400 24px 'DM Serif Display',Georgia,serif;color:#1f5b49}.foot p{margin:0;text-align:right;font-size:10px;color:#667069}@media(max-width:650px){body{padding:0}.sheet{border:0;border-radius:0;box-shadow:none}.top,.hero,.body{padding:22px}.meta{grid-template-columns:1fr 1fr}.foot{margin:24px -22px -22px;padding:18px 22px}}@media print{body{background:white;padding:0}.sheet{box-shadow:none;border:0;border-radius:0;max-width:none}}</style></head><body><article class="sheet"><div class="top"><div><div class="company">${safe(company)}</div><div style="margin-top:6px;font-size:10px;color:#6f756f">Customer invoice</div></div><div class="brand"><span class="mark">V</span><div><div class="brandname">Velora</div><small>BUSINESS, MADE CLEAR.</small></div></div></div><div class="hero"><div><small>RECEIPT</small><h1>Thank you for your business.</h1></div><span class="status">${safe((i.paymentStatus||'paid').toUpperCase())}</span></div><div class="body"><div class="meta"><div><div class="label">INVOICE</div><div class="value">${safe(i.id)}</div></div><div><div class="label">DATE</div><div class="value">${safe(i.date)}</div></div><div><div class="label">CUSTOMER</div><div class="value">${safe(i.customer||'Walk-in customer')}</div></div><div><div class="label">MOBILE</div><div class="value">${safe(i.phone||'—')}</div></div></div><div class="thead"><span>ITEM</span><span>QTY</span><span>RATE</span><span>AMOUNT</span></div><div class="item"><strong>${safe(i.product)}</strong><span>${Number(i.qty)||0}</span><span>${core.money(i.rate)}</span><strong>${core.money(subtotal)}</strong></div><div class="summary"><div><span>Subtotal</span><strong>${core.money(subtotal)}</strong></div><div><span>Discount</span><strong>− ${core.money(discount)}</strong></div><div><span>Payment</span><strong>${safe((i.paymentMethod||'upi').toUpperCase())} · ${safe(i.paymentStatus||'paid')}</strong></div><div class="total"><span>Total paid</span><strong>${core.money(i.total)}</strong></div></div><div class="foot"><div><span class="velora">Velora</span><div style="margin-top:4px;font-size:9px;color:#6f756f">Business, made clear.</div></div><p>Prepared for <b>${safe(company)}</b><br>Thank you for choosing us.</p></div></div></article><script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  };

  const badge=qs('#modeBadge');
  if(badge)new MutationObserver(applyProductionUI).observe(badge,{childList:true,subtree:true,characterData:true});
  window.tkCloud?.auth?.onChange?.(()=>setTimeout(resolveClientName,80));
  document.addEventListener('click',e=>{if(e.target.closest?.('.nav[data-view="dashboard"]'))setTimeout(renderLiveDashboard,40)},true);
  setInterval(renderLiveDashboard,30000);
  resolveClientName();
  setTimeout(applyProductionUI,0);
  setTimeout(applyProductionUI,600);
})();