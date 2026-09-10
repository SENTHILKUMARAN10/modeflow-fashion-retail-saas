// Velora invoice UI v9 — authoritative receipt rendering and sharing
(function(){
  const $=s=>document.querySelector(s);
  const escHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const currency=()=>window.ModeFlowCurrency==='USD'?'$':'₹';
  const fmt=n=>currency()+Number(n||0).toLocaleString(currency()==='₹'?'en-IN':'en-US',{maximumFractionDigits:2});
  const companyName=()=>window.ModeFlowBusiness?.business?.name||$('.store-card b')?.textContent?.trim()||'Your business';
  const currentProduct=()=>{
    try{ if(typeof selectedProduct==='function') return selectedProduct(); }catch{}
    return {name:'Item'};
  };
  function renderVeloraInvoice(){
    const preview=$('#preview'), totalOut=$('#previewTotal');
    if(!preview)return;
    const p=currentProduct()||{name:'Item'};
    const qty=Math.max(0,Number($('#qty')?.value)||0);
    const rate=Math.max(0,Number($('#rate')?.value)||0);
    const discount=Math.max(0,Number($('#discount')?.value)||0);
    const subtotal=qty*rate;
    const total=Math.max(0,subtotal-discount);
    const customer=$('#customerName')?.value?.trim()||'Walk-in customer';
    const phone=$('#phone')?.value?.trim()||'No mobile number';
    const method=($('#paymentMethod')?.value||'upi').toUpperCase();
    const status=$('#paymentStatus')?.value||'paid';
    if(totalOut)totalOut.textContent=fmt(total);
    preview.innerHTML=`
      <div class="velora-receipt-head">
        <div>
          <div class="velora-company">${escHtml(companyName())}</div>
          <div class="velora-powered">Invoice created with <span>Velora</span></div>
        </div>
        <div class="velora-receipt-brand">
          <strong>Velora</strong>
          <small>BUSINESS, MADE CLEAR.</small>
        </div>
      </div>
      <div class="velora-receipt-meta">
        <div><span>CUSTOMER</span><strong>${escHtml(customer)}</strong><small>${escHtml(phone)}</small></div>
        <div><span>PAYMENT</span><strong>${escHtml(method)}</strong><small>${escHtml(status)}</small></div>
      </div>
      <div class="velora-items">
        <div class="velora-line velora-line-head"><span>ITEM</span><span>AMOUNT</span></div>
        <div class="velora-line"><span><b>${escHtml(p.name)}</b><small>${qty} × ${fmt(rate)}</small></span><strong>${fmt(subtotal)}</strong></div>
        <div class="velora-line muted-line"><span>Discount</span><span>− ${fmt(discount)}</span></div>
      </div>
      <div class="velora-total"><div><span>TOTAL PAYABLE</span><small>Inclusive of applied discount</small></div><strong>${fmt(total)}</strong></div>
      <div class="velora-receipt-foot"><span>Thank you for your business.</span><b>Velora</b></div>`;
  }
  window.updatePreview=renderVeloraInvoice;

  function invoiceStore(){try{return typeof store!=='undefined'?store:null}catch{return null}}
  function findInvoice(id){return invoiceStore()?.invoices?.find?.(x=>x.id===id)||null;}
  function invoiceMessage(i){return `*${companyName()}*\n*VELORA INVOICE*\n\nInvoice: ${i.id}\nCustomer: ${i.customer||'Walk-in customer'}\nItem: ${i.product} × ${i.qty}\nSubtotal: ${fmt(i.subtotal||i.qty*i.rate)}\nDiscount: ${fmt(i.discount||0)}\n*Total: ${fmt(i.total)}*\nPayment: ${(i.paymentMethod||'upi').toUpperCase()} · ${i.paymentStatus||'paid'}\nDate: ${i.date}\n\nThank you for your business.\nCreated with Velora`}
  window.shareInvoice=function(id){
    const i=findInvoice(id);if(!i)return;
    let phone=String(i.phone||'').replace(/\D/g,'');
    if(!phone){alert('No customer mobile number is saved for this invoice.');return;}
    if(phone.length===10)phone='91'+phone;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(invoiceMessage(i))}`,'_blank','noopener');
  };
  window.printInvoice=function(id){
    const i=findInvoice(id);if(!i)return;
    const company=companyName(),w=open('','_blank','width=780,height=980');if(!w)return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escHtml(i.id)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"><style>*{box-sizing:border-box}body{margin:0;background:#eee7d7;color:#182019;font-family:'Plus Jakarta Sans',sans-serif;padding:36px}.sheet{max-width:700px;margin:auto;background:#fffdf8;border-radius:28px;overflow:hidden;border:1px solid #d8cfbd;box-shadow:0 24px 70px rgba(24,32,25,.12)}.top{background:linear-gradient(135deg,#153d32,#1f5b49 62%,#2a7660);color:#fff;padding:34px 38px;display:flex;justify-content:space-between;gap:24px}.company{font:400 34px 'DM Serif Display',serif}.sub{margin-top:7px;color:#dce9e2;font-size:12px}.brand{text-align:right}.brand b{display:block;font:400 31px 'DM Serif Display',serif}.brand small{font-size:9px;letter-spacing:.18em;color:#cfe1d8}.body{padding:34px 38px}.meta{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;background:#f4f0e6;border-radius:18px;padding:20px;margin-bottom:24px}.label{font-size:9px;letter-spacing:.14em;font-weight:800;color:#667069}.value{font-weight:700;margin-top:5px}.rows{border-top:1px solid #ded6c8}.row{display:flex;justify-content:space-between;gap:20px;padding:17px 0;border-bottom:1px solid #e7e0d4}.row small{display:block;color:#667069;margin-top:4px}.total{margin-top:24px;background:#1f5b49;color:#fff;border-radius:18px;padding:22px 24px;display:flex;align-items:end;justify-content:space-between;gap:20px}.total span{font-size:10px;letter-spacing:.13em;font-weight:800;color:#dce9e2}.total strong{font:400 34px 'DM Serif Display',serif}.foot{display:flex;justify-content:space-between;gap:20px;padding-top:24px;color:#667069;font-size:11px}.foot b{font:400 18px 'DM Serif Display',serif;color:#1f5b49}@media print{body{background:#fff;padding:0}.sheet{box-shadow:none;border:0;border-radius:0;max-width:none}}</style></head><body><article class="sheet"><div class="top"><div><div class="company">${escHtml(company)}</div><div class="sub">Premium business invoice</div></div><div class="brand"><b>Velora</b><small>BUSINESS, MADE CLEAR.</small></div></div><div class="body"><div class="meta"><div><div class="label">INVOICE</div><div class="value">${escHtml(i.id)}</div></div><div><div class="label">DATE</div><div class="value">${escHtml(i.date)}</div></div><div><div class="label">CUSTOMER</div><div class="value">${escHtml(i.customer||'Walk-in customer')}</div></div><div><div class="label">MOBILE</div><div class="value">${escHtml(i.phone||'—')}</div></div></div><div class="rows"><div class="row"><span><b>${escHtml(i.product)}</b><small>${i.qty} × ${fmt(i.rate)}</small></span><strong>${fmt(i.subtotal||i.qty*i.rate)}</strong></div><div class="row"><span>Discount</span><span>− ${fmt(i.discount||0)}</span></div><div class="row"><span>Payment</span><span>${escHtml((i.paymentMethod||'upi').toUpperCase())} · ${escHtml(i.paymentStatus||'paid')}</span></div></div><div class="total"><div><span>TOTAL PAYABLE</span></div><strong>${fmt(i.total)}</strong></div><div class="foot"><span>Thank you for your business.<br>This invoice was created securely in Velora.</span><b>Velora</b></div></div></article><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();
  };

  const fields=['#qty','#rate','#discount','#customerName','#phone','#paymentMethod','#paymentStatus','#product'];
  fields.forEach(sel=>$(sel)?.addEventListener('input',()=>setTimeout(renderVeloraInvoice,0)));
  $('#product')?.addEventListener('change',()=>setTimeout(renderVeloraInvoice,0));
  addEventListener('modeflow:workspace',()=>setTimeout(renderVeloraInvoice,80));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(renderVeloraInvoice,0),{once:true});else setTimeout(renderVeloraInvoice,0);
  setTimeout(renderVeloraInvoice,900);
})();