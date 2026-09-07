// Production UI corrections layered on top of the existing ModeFlow visual design.
(function(){
  'use strict';
  const core=window.ModeFlowCore;
  if(!core) return console.error('ModeFlowCore failed to load');
  const qs=s=>document.querySelector(s);
  const qsa=s=>[...document.querySelectorAll(s)];
  const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function currentRole(){
    const text=qs('#modeBadge')?.textContent||'';
    const match=text.match(/\b(owner|manager|staff)\b/i);
    return match?match[1].toLowerCase():'staff';
  }

  function businessName(){
    return qs('.store-card div b')?.textContent?.trim()||'ModeFlow Store';
  }

  function applyRoleUI(){
    const cap=core.capabilities(currentRole());
    const add=qs('#addProduct');
    if(add){
      add.disabled=!cap.manageProducts;
      add.hidden=!cap.manageProducts;
    }
    qsa('#inventoryRows .action-btn').forEach(btn=>{btn.hidden=!cap.manageProducts;});
    qsa('#historyRows .action-btn.danger').forEach(btn=>{btn.hidden=!cap.deleteSales;});
    qsa('#expenseList .action-btn.danger').forEach(btn=>{btn.hidden=!cap.deleteExpenses;});
  }

  function renderLiveDashboard(){
    if(typeof store==='undefined') return;
    const month=core.currentMonthSummary(store.invoices||[]);
    const top=core.topProduct(store.invoices||[]);
    const now=new Date();
    const monthName=now.toLocaleDateString('en-IN',{month:'long'}).toUpperCase();
    const hero=qs('#dashboard .hero-card');
    if(hero){
      const kicker=hero.querySelector('.kicker'); if(kicker) kicker.textContent=monthName+' PERFORMANCE';
      const amount=hero.querySelector('h3'); if(amount) amount.textContent=core.money(month.revenue);
      const description=hero.querySelector('h3 + p'); if(description) description.textContent='Net sales this month';
      const trend=hero.querySelector('.trend'); if(trend){trend.textContent=month.orders+' order'+(month.orders===1?'':'s')+' this month';trend.classList.remove('positive');}
    }
    const spotlight=qs('#dashboard .spotlight-content div');
    if(spotlight){
      const label=spotlight.querySelector('small'); if(label) label.textContent='Top-selling product';
      const name=spotlight.querySelector('strong'); if(name) name.textContent=top?.name||'No sales yet';
      const units=spotlight.querySelector('span'); if(units) units.textContent=top?`${top.quantity} unit${top.quantity===1?'':'s'} sold`:'Complete a sale to see performance';
    }
    const cards=qsa('#dashboard .metrics > article');
    if(cards[0]){
      const label=cards[0].querySelector('.metric-top > span'); if(label) label.textContent='Total sales';
      const pill=cards[0].querySelector('.pill'); if(pill){pill.textContent='Live';pill.className='pill neutral';}
      const small=cards[0].querySelector('small'); if(small) small.textContent='Across all recorded orders';
    }
    if(cards[2]){
      const pill=cards[2].querySelector('.pill'); if(pill) pill.textContent='All time';
      const small=cards[2].querySelector('small'); if(small) small.textContent='Recorded retail transactions';
    }
    const title=qs('#title'); if(title&&qs('#dashboard.active-view')) title.textContent='Business overview';
    const profile=qs('.profile'); if(profile) profile.textContent=core.initials(businessName());
  }

  function renderCloudPreview(){
    if(typeof selectedProduct!=='function') return;
    const p=selectedProduct()||{name:'Item'};
    const qty=Number(qs('#qty')?.value)||0;
    const totals=core.calculateSale({quantity:qty,rate:qs('#rate')?.value,discount:qs('#discount')?.value});
    const previewTotal=qs('#previewTotal'); if(previewTotal) previewTotal.textContent=core.money(totals.total);
    const preview=qs('#preview'); if(!preview) return;
    const payment=(qs('#paymentMethod')?.value||'upi').toUpperCase();
    const status=qs('#paymentStatus')?.value||'paid';
    preview.innerHTML=`<div class="bill-head"><div><b style="font-family:Playfair Display,serif;font-size:22px">${safe(businessName())}</b><div class="muted">Powered by ModeFlow</div></div><div class="text-right"><b>RECEIPT</b><div class="muted">ModeFlow POS</div></div></div><p><b>Customer</b><br>${safe(qs('#customerName')?.value||'Walk-in customer')}</p><p class="muted">${safe(qs('#phone')?.value||'No mobile number')}</p><div class="line-item"><span>${safe(p.name)} × ${qty}</span><b>${core.money(totals.subtotal)}</b></div><div class="line-item"><span>Discount</span><span>− ${core.money(totals.discount)}</span></div><div class="line-item"><span>Payment</span><span>${safe(payment)} · ${safe(status)}</span></div><div class="bill-total"><span>Total</span><span>${core.money(totals.total)}</span></div><p class="muted" style="margin-top:28px;font-size:11px">Thank you for your purchase.</p>`;
  }

  function applyProductionUI(){
    try{
      renderLiveDashboard();
      applyRoleUI();
      renderCloudPreview();
    }catch(err){console.warn('ModeFlow production UI correction failed',err);}
  }

  // Ensure every realtime refresh reapplies production labels and permissions.
  const originalRenderAll=window.renderAll;
  if(typeof originalRenderAll==='function'){
    window.renderAll=function(){
      const value=originalRenderAll.apply(this,arguments);
      queueMicrotask(applyProductionUI);
      return value;
    };
  }

  // app.js registered preview listeners before cloud branding was known; run our renderer last.
  ['#qty','#rate','#discount','#customerName','#phone','#paymentMethod','#paymentStatus','#product'].forEach(selector=>{
    const el=qs(selector);
    if(el){el.addEventListener('input',renderCloudPreview);el.addEventListener('change',renderCloudPreview);}
  });

  const originalShare=window.shareInvoice;
  window.shareInvoice=function(invoiceNumber){
    if(typeof store==='undefined') return originalShare?.(invoiceNumber);
    const i=store.invoices.find(x=>x.id===invoiceNumber);
    if(!i) return;
    const text=`${businessName()}\nOrder: ${i.id}\nCustomer: ${i.customer||'Walk-in customer'}\n${i.product} × ${i.qty}\nTotal: ₹${i.total}\nPayment: ${(i.paymentMethod||'upi').toUpperCase()} (${i.paymentStatus||'paid'})\nDate: ${i.date}\nThank you for your purchase!`;
    const phone=core.whatsappPhone(i.phone);
    if(phone) return window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`,'_blank','noopener');
    if(navigator.share) return navigator.share({title:`Order ${i.id}`,text}).catch(()=>{});
    navigator.clipboard?.writeText(text).then(()=>typeof toast==='function'&&toast('Invoice copied to clipboard')).catch(()=>{});
  };

  const originalPrint=window.printInvoice;
  window.printInvoice=function(invoiceNumber){
    if(typeof store==='undefined') return originalPrint?.(invoiceNumber);
    const i=store.invoices.find(x=>x.id===invoiceNumber);
    if(!i) return;
    const w=open('','_blank','width=720,height=900');
    if(!w) return typeof toast==='function'&&toast('Allow pop-ups to print invoices');
    w.document.write(`<!doctype html><html><head><title>${safe(i.id)}</title><style>body{font-family:Arial;padding:42px;color:#171713}.top{display:flex;justify-content:space-between;border-bottom:2px solid #171713;padding-bottom:18px}.row{display:flex;justify-content:space-between;padding:13px 0;border-bottom:1px solid #ddd}.total{font-size:24px;font-weight:700}.muted{color:#777}</style></head><body><div class="top"><div><h2>${safe(businessName())}</h2><div class="muted">Powered by ModeFlow</div></div><div><b>${safe(i.id)}</b><div>${safe(i.date)}</div></div></div><p><b>Customer:</b> ${safe(i.customer||'Walk-in customer')}</p><p><b>Phone:</b> ${safe(i.phone||'—')}</p><div class="row"><span>${safe(i.product)} × ${Number(i.qty)||0}</span><b>${core.money(i.subtotal||Number(i.qty)*Number(i.rate))}</b></div><div class="row"><span>Discount</span><span>− ${core.money(i.discount)}</span></div><div class="row total"><span>Total</span><span>${core.money(i.total)}</span></div><p>Payment: ${safe((i.paymentMethod||'upi').toUpperCase())} · ${safe(i.paymentStatus||'paid')}</p><p class="muted">Thank you for your purchase.</p><script>print()<\/script></body></html>`);
    w.document.close();
  };

  const badge=qs('#modeBadge');
  if(badge) new MutationObserver(applyProductionUI).observe(badge,{childList:true,subtree:true,characterData:true});
  setTimeout(applyProductionUI,0);
})();
