// Velora production polish v9
(function(){
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  let clientName='';
  const regionZones={IN:'Asia/Kolkata',US:'America/New_York',GB:'Europe/London',AE:'Asia/Dubai',SG:'Asia/Singapore',AU:'Australia/Sydney',CA:'America/Toronto'};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const invoiceStore=()=>{try{return typeof store!=='undefined'?store:null}catch{return null}};
  const money=n=>{const c=window.ModeFlowCurrency||'INR';const v=Number(n||0);return c==='USD'?'$'+v.toLocaleString('en-US',{maximumFractionDigits:0}):'₹'+v.toLocaleString('en-IN',{maximumFractionDigits:0});};
  function businessName(){return window.ModeFlowBusiness?.business?.name||$('.store-card b')?.textContent?.trim()||'Your business';}
  async function resolveClientName(){
    try{
      const result=await window.tkCloud?.auth?.user?.();
      const u=result?.data?.user;
      const raw=u?.user_metadata?.full_name||u?.user_metadata?.name||u?.email?.split('@')[0]||'';
      clientName=String(raw).trim().split(/\s+/)[0]||'';
    }catch{}
    updateGreeting();
  }
  function hourForZone(){
    const region=localStorage.getItem('mf_region')||localStorage.getItem('modeflow-region')||'IN';
    const zone=regionZones[region]||Intl.DateTimeFormat().resolvedOptions().timeZone;
    try{return Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hour12:false,timeZone:zone}).format(new Date()));}catch{return new Date().getHours();}
  }
  function updateGreeting(){
    const title=$('#title'),dashboard=$('#dashboard');
    if(!title||!dashboard?.classList.contains('active-view'))return;
    const h=hourForZone(),greeting=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
    title.textContent=clientName?`${greeting}, ${clientName}.`:`${greeting}.`;
  }
  function cleanAdminDuplicates(){
    const items=$$('#mfAdminPaymentsButton');
    items.slice(1).forEach(x=>x.remove());
    if(items[0])items[0].textContent='Admin payments';
  }
  function selectedInvoiceProduct(){
    const id=$('#product')?.value;
    return invoiceStore()?.products?.find?.(p=>String(p.id)===String(id))||{name:$('#product option:checked')?.textContent?.split(' · ')[0]||'Item'};
  }
  function renderPremiumPreview(){
    const preview=$('#preview');if(!preview)return;
    const p=selectedInvoiceProduct();
    const company=businessName();
    const customer=$('#customerName')?.value?.trim()||'Walk-in customer';
    const phone=$('#phone')?.value?.trim()||'No mobile number';
    const qty=Number($('#qty')?.value)||1;
    const rate=Number($('#rate')?.value)||0;
    const discount=Number($('#discount')?.value)||0;
    const subtotal=qty*rate,total=Math.max(0,subtotal-discount);
    const method=($('#paymentMethod')?.value||'upi').toUpperCase();
    const status=$('#paymentStatus')?.value||'paid';
    preview.innerHTML=`<div class="v-invoice-top"><div><div class="v-company">${esc(company)}</div><div class="v-powered">Business receipt · powered by <span>Velora</span></div></div><div class="v-receipt-brand"><b>Velora</b><small>BUSINESS, MADE CLEAR.</small></div></div><div class="v-invoice-meta"><div><small>CUSTOMER</small><strong>${esc(customer)}</strong><span>${esc(phone)}</span></div><div><small>PAYMENT</small><strong>${esc(method)}</strong><span>${esc(status)}</span></div></div><div class="v-line"><div><strong>${esc(p.name)}</strong><span>Qty ${qty} × ${money(rate)}</span></div><b>${money(subtotal)}</b></div><div class="v-summary"><div><span>Subtotal</span><b>${money(subtotal)}</b></div><div><span>Discount</span><b>− ${money(discount)}</b></div></div><div class="v-total"><span>Total payable</span><strong>${money(total)}</strong></div><div class="v-thanks">Thank you for choosing <b>${esc(company)}</b>.<span>Generated securely with Velora.</span></div>`;
  }
  function findInvoice(id){return invoiceStore()?.invoices?.find?.(x=>x.id===id)||null;}
  function invoiceText(i){return `*${businessName()}*\n*Velora Receipt*\n\nInvoice: ${i.id}\nDate: ${i.date}\nCustomer: ${i.customer||'Walk-in customer'}\nMobile: ${i.phone||'—'}\n\n${i.product} × ${i.qty}\nSubtotal: ${money(i.subtotal||i.qty*i.rate)}\nDiscount: ${money(i.discount||0)}\n*Total: ${money(i.total)}*\nPayment: ${(i.paymentMethod||'upi').toUpperCase()} · ${i.paymentStatus||'paid'}\n\nThank you for your business.\nPowered by Velora`;
  }
  window.shareInvoice=function(id){
    const i=findInvoice(id);if(!i)return;
    let phone=String(i.phone||'').replace(/\D/g,'');
    if(!phone){alert('This customer has no mobile number saved. Add a number before sharing on WhatsApp.');return;}
    if(phone.length===10)phone='91'+phone;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(invoiceText(i))}`,'_blank','noopener');
  };
  window.printInvoice=function(id){
    const i=findInvoice(id);if(!i)return;
    const company=businessName(),w=open('','_blank','width=820,height=980');if(!w)return;
    const subtotal=i.subtotal||i.qty*i.rate;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(i.id)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"><style>*{box-sizing:border-box}body{margin:0;background:#efe8d9;color:#17231c;font-family:'Plus Jakarta Sans',sans-serif;padding:42px}.sheet{max-width:720px;margin:auto;background:#fffaf0;border:1px solid #d9ceb9;border-radius:28px;overflow:hidden;box-shadow:0 24px 70px rgba(38,54,45,.12)}.hero{background:linear-gradient(145deg,#173f34,#1f5b49 62%,#2f755f);color:#fff;padding:34px 38px 30px;display:flex;justify-content:space-between;gap:24px}.company{font:400 34px 'DM Serif Display',serif;margin:0}.sub{color:#d9e7df;margin-top:4px;font-size:12px}.velora{font:400 30px 'DM Serif Display',serif;text-align:right}.velora small{display:block;font:700 9px 'Plus Jakarta Sans',sans-serif;letter-spacing:.18em;color:#d9e7df;margin-top:4px}.content{padding:34px 38px}.meta{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;background:#f3eddf;border:1px solid #e2d8c5;border-radius:18px;padding:18px}.label{font-size:9px;letter-spacing:.14em;color:#6b756d;font-weight:800}.value{font-weight:700;margin-top:5px}.item{display:flex;justify-content:space-between;gap:24px;padding:26px 0 18px;border-bottom:1px solid #ddd3c1}.item b{font:400 22px 'DM Serif Display',serif}.item span{color:#687268;font-size:12px}.sum{padding:18px 0}.sum div,.total{display:flex;justify-content:space-between;gap:24px;padding:7px 0}.sum span{color:#687268}.total{margin-top:8px;padding:20px 0;border-top:2px solid #1f5b49;color:#1f5b49}.total span,.total strong{font:400 30px 'DM Serif Display',serif}.footer{margin-top:18px;padding:20px;border-radius:16px;background:#f3eddf;color:#5f6b62;font-size:12px}.footer b{font:400 20px 'DM Serif Display',serif;color:#1f5b49}.tiny{margin-top:8px;font-size:10px;color:#7e867f}@media print{body{background:#fff;padding:0}.sheet{box-shadow:none;border:0;border-radius:0;max-width:none}}</style></head><body><article class="sheet"><div class="hero"><div><h1 class="company">${esc(company)}</h1><div class="sub">Premium business receipt</div></div><div class="velora">Velora<small>BUSINESS, MADE CLEAR.</small></div></div><div class="content"><div class="meta"><div><div class="label">INVOICE NUMBER</div><div class="value">${esc(i.id)}</div></div><div><div class="label">DATE</div><div class="value">${esc(i.date)}</div></div><div><div class="label">CUSTOMER</div><div class="value">${esc(i.customer||'Walk-in customer')}</div></div><div><div class="label">MOBILE</div><div class="value">${esc(i.phone||'—')}</div></div></div><div class="item"><div><b>${esc(i.product)}</b><br><span>Quantity ${i.qty} × ${money(i.rate)}</span></div><strong>${money(subtotal)}</strong></div><div class="sum"><div><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div><span>Discount</span><strong>− ${money(i.discount||0)}</strong></div><div><span>Payment</span><strong>${esc((i.paymentMethod||'upi').toUpperCase())} · ${esc(i.paymentStatus||'paid')}</strong></div></div><div class="total"><span>Total paid</span><strong>${money(i.total)}</strong></div><div class="footer"><b>Velora</b><div>Thank you for your business with ${esc(company)}.</div><div class="tiny">This invoice was generated securely from your Velora workspace.</div></div></div></article><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();
  };
  function bind(){
    resolveClientName();cleanAdminDuplicates();renderPremiumPreview();
    ['input','change'].forEach(evt=>document.addEventListener(evt,e=>{if(e.target.closest?.('#invoiceForm'))setTimeout(renderPremiumPreview,0)},true));
    document.addEventListener('click',e=>{if(e.target.closest?.('.nav[data-view="dashboard"]'))setTimeout(updateGreeting,30)},true);
    addEventListener('modeflow:workspace',()=>setTimeout(()=>{resolveClientName();cleanAdminDuplicates();renderPremiumPreview()},80));
    const footer=$('.side-footer');if(footer)new MutationObserver(cleanAdminDuplicates).observe(footer,{childList:true});
    setInterval(updateGreeting,30000);
    setTimeout(()=>{resolveClientName();cleanAdminDuplicates();renderPremiumPreview()},900);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();