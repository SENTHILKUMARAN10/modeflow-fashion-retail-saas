// Velora production polish v8
(function(){
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  let clientName='';
  const regionZones={IN:'Asia/Kolkata',US:'America/New_York',GB:'Europe/London',AE:'Asia/Dubai',SG:'Asia/Singapore',AU:'Australia/Sydney',CA:'America/Toronto'};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>window.ModeFlowCore?.money?.(n)||('₹'+Number(n||0).toLocaleString('en-IN'));
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
    const next=clientName?`${greeting}, ${clientName}.`:`${greeting}.`;
    if(title.textContent!==next)title.textContent=next;
  }
  function cleanAdminDuplicates(){
    const items=$$('#mfAdminPaymentsButton');
    items.slice(1).forEach(x=>x.remove());
  }
  function setText(el,text){if(el&&el.textContent!==text)el.textContent=text;}
  function polishPreview(){
    const head=$('#preview .bill-head');if(!head)return;
    const left=head.children?.[0],right=head.children?.[1],company=businessName();
    if(left){setText(left.querySelector('b'),company);setText(left.querySelector('.muted'),'Powered by Velora');}
    if(right){setText(right.querySelector('b'),'VELORA RECEIPT');setText(right.querySelector('.muted'),'Business, made clear.');}
  }
  function invoiceStore(){try{return typeof store!=='undefined'?store:null}catch{return null}}
  function findInvoice(id){return invoiceStore()?.invoices?.find?.(x=>x.id===id)||null;}
  function invoiceText(i){
    return `*${businessName()}*\n*VELORA RECEIPT*\n\nInvoice: ${i.id}\nCustomer: ${i.customer||'Walk-in customer'}\n${i.product} × ${i.qty}\nSubtotal: ${money(i.subtotal||i.qty*i.rate)}\nDiscount: ${money(i.discount||0)}\n*Total: ${money(i.total)}*\nPayment: ${(i.paymentMethod||'upi').toUpperCase()} · ${i.paymentStatus||'paid'}\nDate: ${i.date}\n\nThank you for your purchase.\nPowered by Velora`;
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
    const company=businessName(),w=open('','_blank','width=760,height=940');if(!w)return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(i.id)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"><style>*{box-sizing:border-box}body{margin:0;background:#f4f0e6;color:#182019;font-family:'Plus Jakarta Sans',sans-serif;padding:34px}.invoice{max-width:680px;margin:auto;background:#fffdf8;border:1px solid #d9d2c5;border-radius:22px;overflow:hidden}.hero{background:#1f5b49;color:white;padding:28px 32px;display:flex;justify-content:space-between;gap:20px}.hero h1{font:700 30px 'Playfair Display',serif;margin:0 0 6px}.hero p{margin:0;color:#d9e8e0}.tag{text-align:right;font-size:12px;letter-spacing:.12em}.body{padding:30px 32px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding-bottom:22px;border-bottom:1px solid #d9d2c5}.label{font-size:10px;letter-spacing:.12em;color:#697168;font-weight:700}.value{margin-top:5px;font-weight:700}.row{display:flex;justify-content:space-between;gap:20px;padding:15px 0;border-bottom:1px solid #ece7dd}.total{display:flex;justify-content:space-between;gap:20px;padding:22px 0;font:700 27px 'Playfair Display',serif;color:#1f5b49}.foot{border-top:1px solid #d9d2c5;padding-top:18px;color:#697168;font-size:12px}.brand{font:700 18px 'Playfair Display',serif;color:#1f5b49}@media print{body{background:white;padding:0}.invoice{border:0;border-radius:0;max-width:none}}</style></head><body><article class="invoice"><div class="hero"><div><h1>${esc(company)}</h1><p>Receipt powered by Velora</p></div><div class="tag">VELORA<br>BUSINESS, MADE CLEAR.</div></div><div class="body"><div class="meta"><div><div class="label">INVOICE</div><div class="value">${esc(i.id)}</div></div><div><div class="label">DATE</div><div class="value">${esc(i.date)}</div></div><div><div class="label">CUSTOMER</div><div class="value">${esc(i.customer||'Walk-in customer')}</div></div><div><div class="label">MOBILE</div><div class="value">${esc(i.phone||'—')}</div></div></div><div class="row"><span>${esc(i.product)} × ${i.qty}</span><strong>${money(i.subtotal||i.qty*i.rate)}</strong></div><div class="row"><span>Discount</span><span>− ${money(i.discount||0)}</span></div><div class="row"><span>Payment</span><span>${esc((i.paymentMethod||'upi').toUpperCase())} · ${esc(i.paymentStatus||'paid')}</span></div><div class="total"><span>Total</span><span>${money(i.total)}</span></div><div class="foot"><span class="brand">Velora</span><br>Thank you for your business. This receipt was generated from your secure Velora workspace.</div></div></article><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();
  };
  function bind(){
    resolveClientName();cleanAdminDuplicates();polishPreview();
    document.addEventListener('input',e=>{if(e.target.closest?.('#invoiceForm'))setTimeout(polishPreview,0)},true);
    document.addEventListener('click',e=>{if(e.target.closest?.('.nav[data-view="dashboard"]'))setTimeout(updateGreeting,30)},true);
    addEventListener('modeflow:workspace',()=>setTimeout(()=>{resolveClientName();polishPreview();cleanAdminDuplicates()},80));
    const footer=$('.side-footer');if(footer)new MutationObserver(cleanAdminDuplicates).observe(footer,{childList:true});
    setInterval(updateGreeting,30000);
    setTimeout(()=>{resolveClientName();cleanAdminDuplicates();polishPreview()},1200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
