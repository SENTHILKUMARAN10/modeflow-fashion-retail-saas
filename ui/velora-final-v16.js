// Final visible Velora UI layer. Ensures legacy ModeFlow receipt text can never win again.
(function(){
  'use strict';
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let rendering=false;
  let clientName='';

  function currency(){return window.ModeFlowCurrency==='USD'?'USD':'INR';}
  function money(n){const v=Number(n||0);return currency()==='USD'?'$'+v.toLocaleString('en-US',{maximumFractionDigits:2}):'₹'+v.toLocaleString('en-IN',{maximumFractionDigits:2});}
  function businessName(){return window.ModeFlowBusiness?.business?.name||$('.store-card div b')?.textContent?.trim()||'Your business';}
  function productName(){const text=$('#product option:checked')?.textContent||'Product / service';return text.split(' · ')[0].trim()||'Product / service';}
  function totalData(){const qty=Math.max(1,Number($('#qty')?.value)||1),rate=Number($('#rate')?.value)||0,discount=Math.max(0,Number($('#discount')?.value)||0),subtotal=qty*rate,total=Math.max(0,subtotal-discount);return{qty,rate,discount,subtotal,total};}
  function dateText(){return new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});}

  async function resolveClient(){
    try{
      const result=await window.tkCloud?.auth?.user?.();
      const u=result?.data?.user;
      const raw=u?.user_metadata?.full_name||u?.user_metadata?.name||u?.email?.split('@')[0]||'';
      clientName=String(raw).trim().split(/\s+/)[0]||'';
    }catch{}
    updateClientHeader();
  }

  function updateClientHeader(){
    const brand=$('.sidebar .brand > div');if(!brand)return;
    let el=$('#veloraClientName');
    if(!el){el=document.createElement('strong');el.id='veloraClientName';el.className='velora-client-name';const brandName=brand.querySelector('b');brandName?.insertAdjacentElement('afterend',el);}
    el.textContent=clientName||'Account';
    el.title=clientName||'Signed-in client';
  }

  function renderReceipt(){
    const preview=$('#preview');if(!preview||rendering)return;
    rendering=true;
    try{
      $('#veloraReceiptPreview')?.remove();
      const t=totalData();
      const customer=$('#customerName')?.value?.trim()||'Walk-in customer';
      const phone=$('#phone')?.value?.trim()||'No mobile number';
      const payment=($('#paymentMethod')?.value||'upi').toUpperCase();
      const status=$('#paymentStatus')?.value||'paid';
      const company=businessName();
      const previewTotal=$('#previewTotal');if(previewTotal)previewTotal.textContent=money(t.total);
      preview.classList.remove('velora-legacy-preview-hidden');
      preview.dataset.veloraFinal='16';
      preview.innerHTML=`<article class="vf-invoice">
        <header class="vf-top">
          <div><div class="vf-company">${esc(company)}</div><div class="vf-company-sub">Customer invoice · ${esc(dateText())}</div></div>
          <div class="vf-wordmark"><span class="vf-mark">V</span><div><div class="vf-brand-name">Velora</div><small class="vf-brand-tag">BUSINESS, MADE CLEAR.</small></div></div>
        </header>
        <section class="vf-hero"><div><div class="vf-kicker">VELORA RECEIPT</div><h3>A polished finish to every sale.</h3></div><span class="vf-status">${esc(status.toUpperCase())}</span></section>
        <section class="vf-meta">
          <div class="vf-meta-card"><div class="vf-label">Customer</div><strong>${esc(customer)}</strong><span>${esc(phone)}</span></div>
          <div class="vf-meta-card"><div class="vf-label">Payment</div><strong>${esc(payment)}</strong><span>${esc(status)}</span></div>
          <div class="vf-meta-card"><div class="vf-label">Invoice</div><strong>Draft</strong><span>${esc(dateText())}</span></div>
        </section>
        <section class="vf-items">
          <div class="vf-head"><span>ITEM</span><span>QTY</span><span>RATE</span><span>AMOUNT</span></div>
          <div class="vf-row"><strong>${esc(productName())}</strong><span>${t.qty}</span><span>${money(t.rate)}</span><strong>${money(t.subtotal)}</strong></div>
        </section>
        <section class="vf-summary">
          <div><span>Subtotal</span><strong>${money(t.subtotal)}</strong></div>
          <div><span>Discount</span><strong>− ${money(t.discount)}</strong></div>
          <div class="vf-total"><span>Total payable</span><strong>${money(t.total)}</strong></div>
        </section>
        <div class="vf-note">This receipt is prepared for <b>${esc(company)}</b>. Customer and payment details update live before the sale is completed.</div>
        <footer class="vf-footer"><div><div class="vf-footer-brand">Velora</div><small>Business, made clear.</small></div><p>Sales · Inventory · Customers · Expenses · Analytics<br>Thank you for your business.</p></footer>
      </article>`;
    }finally{rendering=false;}
  }

  function findInvoice(id){try{return typeof store!=='undefined'?store.invoices?.find?.(x=>x.id===id):null}catch{return null}}
  function whatsappPhone(value){let p=String(value||'').replace(/\D/g,'');if(p.length===10)p='91'+p;return p;}

  function applyInvoiceActions(){
    window.shareInvoice=function(id){
      const i=findInvoice(id);if(!i)return;
      const phone=whatsappPhone(i.phone);
      if(!phone){if(typeof toast==='function')toast('Add the customer mobile number before sharing on WhatsApp');else alert('Add the customer mobile number before sharing on WhatsApp');return;}
      const company=businessName();
      const subtotal=Number(i.subtotal||Number(i.qty||0)*Number(i.rate||0));
      const text=`*${company}*\n*Velora Invoice*\n\nInvoice: ${i.id}\nDate: ${i.date}\nCustomer: ${i.customer||'Walk-in customer'}\nMobile: ${i.phone||'—'}\n\n${i.product} × ${i.qty}\nRate: ${money(i.rate)}\nSubtotal: ${money(subtotal)}\nDiscount: ${money(i.discount||0)}\n*Total: ${money(i.total)}*\nPayment: ${(i.paymentMethod||'upi').toUpperCase()} · ${i.paymentStatus||'paid'}\n\nThank you for your business.\nVelora — Business, made clear.`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`,'_blank','noopener');
    };

    window.printInvoice=function(id){
      const i=findInvoice(id);if(!i)return;
      const company=businessName(),subtotal=Number(i.subtotal||Number(i.qty||0)*Number(i.rate||0)),discount=Number(i.discount||0);
      const w=open('','_blank','width=840,height=1000');if(!w)return;
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(i.id)}</title><link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"><style>*{box-sizing:border-box}body{margin:0;background:#efe7d7;color:#182019;font-family:'Plus Jakarta Sans',Arial,sans-serif;padding:34px}.sheet{max-width:760px;margin:auto;background:#fffaf0;border:1px solid #d8cfbd;border-radius:28px;overflow:hidden}.top{background:#f1e6d2;padding:28px 32px;display:flex;justify-content:space-between;gap:20px}.company,.velora{font-family:'DM Serif Display',Georgia,serif;font-weight:400}.company{font-size:34px}.sub{margin-top:6px;color:#70776f;font-size:10px}.velora{font-size:29px;color:#1f5b49}.tag{font-size:8px;letter-spacing:.15em;color:#70776f}.hero{background:linear-gradient(145deg,#173f34,#1f5b49 62%,#2e745e);color:#fff;padding:30px 32px;display:flex;justify-content:space-between;gap:20px}.hero h1{font:400 31px 'DM Serif Display',Georgia,serif;margin:5px 0}.hero small{letter-spacing:.15em;color:#d7e8df}.status{background:#f1e6d2;color:#1f5b49;padding:8px 12px;border-radius:999px;font-size:9px;font-weight:800;height:max-content}.body{padding:28px 32px}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.meta>div{background:#f8f1e5;border:1px solid #e4dac8;border-radius:14px;padding:14px}.label{font-size:8px;letter-spacing:.13em;color:#737a71;font-weight:800}.value{margin-top:6px;font-size:12px;font-weight:700}.head,.item{display:grid;grid-template-columns:minmax(0,1.5fr) .35fr .7fr .75fr;gap:12px;align-items:center}.head{margin-top:24px;padding:10px 2px;border-top:1px solid #e4dac8;border-bottom:1px solid #e4dac8;font-size:8px;letter-spacing:.13em;color:#737a71;font-weight:800}.item{padding:18px 2px;border-bottom:1px solid #ece3d5;font-size:12px}.item strong:first-child{font:400 18px 'DM Serif Display',Georgia,serif}.head>:last-child,.item>:last-child{text-align:right}.sum{max-width:360px;margin:18px 0 0 auto}.sum>div{display:flex;justify-content:space-between;gap:20px;padding:8px 0;color:#60685f;font-size:12px}.sum .total{margin-top:8px;padding-top:18px;border-top:2px solid #1f5b49;color:#1f5b49}.total strong{font:400 31px 'DM Serif Display',Georgia,serif}.foot{margin:26px -32px -28px;padding:20px 32px;background:#f1e6d2;display:flex;justify-content:space-between;align-items:end;gap:20px}.foot .brand{font:400 24px 'DM Serif Display',Georgia,serif;color:#1f5b49}.foot p{margin:0;font-size:9px;text-align:right;color:#6a7169}@media print{body{background:#fff;padding:0}.sheet{border:0;border-radius:0}}</style></head><body><article class="sheet"><div class="top"><div><div class="company">${esc(company)}</div><div class="sub">Customer invoice</div></div><div><div class="velora">Velora</div><div class="tag">BUSINESS, MADE CLEAR.</div></div></div><div class="hero"><div><small>VELORA INVOICE</small><h1>Thank you for your business.</h1></div><span class="status">${esc((i.paymentStatus||'paid').toUpperCase())}</span></div><div class="body"><div class="meta"><div><div class="label">INVOICE</div><div class="value">${esc(i.id)}</div></div><div><div class="label">DATE</div><div class="value">${esc(i.date)}</div></div><div><div class="label">CUSTOMER</div><div class="value">${esc(i.customer||'Walk-in customer')}</div></div><div><div class="label">MOBILE</div><div class="value">${esc(i.phone||'—')}</div></div></div><div class="head"><span>ITEM</span><span>QTY</span><span>RATE</span><span>AMOUNT</span></div><div class="item"><strong>${esc(i.product)}</strong><span>${Number(i.qty)||0}</span><span>${money(i.rate)}</span><strong>${money(subtotal)}</strong></div><div class="sum"><div><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div><span>Discount</span><strong>− ${money(discount)}</strong></div><div><span>Payment</span><strong>${esc((i.paymentMethod||'upi').toUpperCase())} · ${esc(i.paymentStatus||'paid')}</strong></div><div class="total"><span>Total paid</span><strong>${money(i.total)}</strong></div></div><div class="foot"><div><div class="brand">Velora</div><small>Business, made clear.</small></div><p>Invoice prepared for ${esc(company)}.<br>Thank you for your business.</p></div></div></article><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();
    };
  }

  function bind(){
    resolveClient();updateClientHeader();renderReceipt();applyInvoiceActions();
    ['input','change'].forEach(evt=>document.addEventListener(evt,e=>{if(e.target.closest?.('#invoiceForm'))setTimeout(renderReceipt,0)},true));
    document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="billing"],.goto-billing'))setTimeout(renderReceipt,80)},true);
    addEventListener('modeflow:workspace',()=>setTimeout(()=>{resolveClient();updateClientHeader();renderReceipt();applyInvoiceActions()},120));
    const preview=$('#preview');
    if(preview)new MutationObserver(()=>{if(rendering)return;const text=preview.textContent||'';if(preview.dataset.veloraFinal!=='16'||/ModeFlow|Powered by ModeFlow|ModeFlow POS/i.test(text)||!preview.querySelector('.vf-invoice'))setTimeout(renderReceipt,0);}).observe(preview,{childList:true,subtree:true,characterData:true});
    [250,700,1500,3000].forEach(ms=>setTimeout(()=>{resolveClient();updateClientHeader();renderReceipt();applyInvoiceActions()},ms));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
