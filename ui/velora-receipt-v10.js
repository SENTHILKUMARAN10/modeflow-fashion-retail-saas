// Independent Velora receipt renderer. Keeps the legacy preview hidden and renders a stable premium receipt.
(function(){
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const currency=()=>window.ModeFlowCurrency==='USD'?'$':'₹';
  const money=n=>currency()+Number(n||0).toLocaleString(currency()==='$'?'en-US':'en-IN',{maximumFractionDigits:2});
  const company=()=>window.ModeFlowBusiness?.business?.name||$('.store-card b')?.textContent?.trim()||'Your business';
  function selected(){try{return typeof selectedProduct==='function'?selectedProduct():null}catch{return null}}
  function calc(){try{return typeof calcTotal==='function'?calcTotal():0}catch{return 0}}
  function ensure(){
    const legacy=$('#preview'); if(!legacy)return null;
    let el=$('#veloraReceiptPreview');
    if(!el){el=document.createElement('div');el.id='veloraReceiptPreview';el.className='velora-receipt-card';legacy.insertAdjacentElement('afterend',el);}
    legacy.classList.add('velora-legacy-preview-hidden');
    return el;
  }
  function render(){
    const el=ensure();if(!el)return;
    const p=selected()||{name:'Product / service',price:0};
    const qty=Math.max(1,Number($('#qty')?.value)||1);
    const rate=Number($('#rate')?.value)||Number(p.price)||0;
    const discount=Number($('#discount')?.value)||0;
    const subtotal=qty*rate,total=calc();
    const customer=$('#customerName')?.value?.trim()||'Walk-in customer';
    const phone=$('#phone')?.value?.trim()||'No mobile number';
    const method=($('#paymentMethod')?.value||'upi').toUpperCase();
    const status=$('#paymentStatus')?.value||'paid';
    el.innerHTML=`
      <div class="vr-top">
        <div><div class="vr-company">${esc(company())}</div><div class="vr-company-sub">Business invoice</div></div>
        <div class="vr-brand"><span class="vr-mark">V</span><div><b>Velora</b><small>BUSINESS, MADE CLEAR.</small></div></div>
      </div>
      <div class="vr-hero"><div><span>RECEIPT PREVIEW</span><h3>Thank you for your business.</h3></div><div class="vr-status">${esc(status.toUpperCase())}</div></div>
      <div class="vr-meta"><div><small>CUSTOMER</small><strong>${esc(customer)}</strong><span>${esc(phone)}</span></div><div><small>PAYMENT</small><strong>${esc(method)}</strong><span>${esc(status)}</span></div></div>
      <div class="vr-table-head"><span>ITEM</span><span>QTY</span><span>RATE</span><span>AMOUNT</span></div>
      <div class="vr-item"><strong>${esc(p.name)}</strong><span>${qty}</span><span>${money(rate)}</span><strong>${money(subtotal)}</strong></div>
      <div class="vr-summary"><div><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div><span>Discount</span><strong>− ${money(discount)}</strong></div><div class="vr-total"><span>Total payable</span><strong>${money(total)}</strong></div></div>
      <div class="vr-footer"><div><span class="vr-logo-word">Velora</span><small>Secure business workspace</small></div><p>Invoice prepared for <b>${esc(company())}</b>.</p></div>`;
  }
  function bind(){
    ensure();render();
    ['input','change'].forEach(evt=>document.addEventListener(evt,e=>{if(e.target.closest?.('#invoiceForm'))setTimeout(render,0)},true));
    addEventListener('modeflow:workspace',()=>setTimeout(render,80));
    document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="billing"],.goto-billing'))setTimeout(render,60)},true);
    setTimeout(render,500);setTimeout(render,1500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();