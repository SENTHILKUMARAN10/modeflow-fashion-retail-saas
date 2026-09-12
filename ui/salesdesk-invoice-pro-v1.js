// Salesventory invoice system — official A4 invoice layout and WhatsApp sharing.
(function(){
'use strict';
window.SalesDeskInvoiceProV1=true;
window.SalesventoryInvoiceV2=true;
const FULL='/assets/salesventory-full-logo.webp';
const ICON='/assets/salesventory-logo.png';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currency=()=>window.ModeFlowCurrency||window.SalesventoryCurrency||'INR';
const money=n=>currency()==='USD'?'$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'₹'+Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const displayNumber=n=>String(n||'').replace(/^SD-/i,'SV-').replace(/^VL-/i,'SV-');
function localInvoice(number){try{return typeof store!=='undefined'?store.invoices?.find?.(x=>String(x.id)===String(number)||displayNumber(x.id)===String(number)):null}catch{return null}}
function business(){
  const b=window.ModeFlowBusiness?.business||window.SalesventoryBusiness?.business||{};
  return {name:b.name||document.querySelector('.store-card div b')?.textContent?.replace(/\s*Workspace\s*$/i,'')||'Your Business',phone:b.phone||'',address:b.address||'',email:b.email||'',gstin:b.gstin||''};
}
function phone(v){let p=String(v||'').replace(/\D/g,'');if(p.length===10)p='91'+p;return p}
async function detail(number){
  const local=localInvoice(number);
  if(!local?.dbId||!window.tkCloud?.client)return{invoice:local,items:local?[{product_name:local.product,quantity:local.qty,rate:local.rate,line_total:local.subtotal||local.qty*local.rate}]:[]};
  const {data,error}=await window.tkCloud.client.from('invoices').select('id,invoice_number,customer_name,customer_phone,subtotal,discount,tax,total,payment_status,payment_method,created_at,due_date,invoice_items(product_name,quantity,rate,line_total,cost_price)').eq('id',local.dbId).single();
  if(error)throw error;return{invoice:data,items:data.invoice_items||[]};
}
function formatDate(value){const d=value?new Date(value):new Date();return Number.isNaN(d.getTime())?String(value||'—'):d.toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'})}
function contactLines(b){
  const lines=[];
  if(b.phone)lines.push(`<div>☎&nbsp; ${esc(b.phone)}</div>`);
  lines.push(`<div>✉&nbsp; ${esc(b.email||'support@salesventory.online')}</div>`);
  lines.push('<div>◎&nbsp; salesventory.online</div>');
  if(b.address)lines.push(`<div>●&nbsp; ${esc(b.address)}</div>`);
  return lines.join('');
}
window.shareInvoice=async function(number){
  try{
    const {invoice:i,items}=await detail(number);if(!i)return;
    const p=phone(i.customer_phone||i.phone);if(!p){const m='Add the customer mobile number before sharing on WhatsApp';return typeof toast==='function'?toast(m):alert(m)}
    const b=business();const lines=items.map(x=>`${x.product_name} × ${Number(x.quantity)} — ${money(x.line_total??Number(x.quantity)*Number(x.rate))}`).join('\n');
    const text=`*${b.name}*\nSalesventory invoice ${displayNumber(i.invoice_number||number)}\n\nCustomer: ${i.customer_name||i.customer||'Walk-in customer'}\n${lines}\n\nSubtotal: ${money(i.subtotal)}\nDiscount: ${money(i.discount||0)}\nTax: ${money(i.tax||0)}\n*Total: ${money(i.total)}*\nPayment: ${(i.payment_method||i.paymentMethod||'upi').toUpperCase()} · ${i.payment_status||i.paymentStatus||'paid'}\n\nThank you for your business.\nInventory today. A bigger tomorrow.`;
    window.open(`https://wa.me/${p}?text=${encodeURIComponent(text)}`,'_blank','noopener');
  }catch(e){typeof toast==='function'?toast(e.message||'Unable to share invoice'):alert(e.message)}
};
window.printInvoice=async function(number){
  try{
    const {invoice:i,items}=await detail(number);if(!i)return;
    const b=business();const invoiceNo=displayNumber(i.invoice_number||number);const issue=formatDate(i.created_at||i.ts||Date.now());const due=formatDate(i.due_date||i.created_at||i.ts||Date.now());
    const subtotal=Number(i.subtotal??items.reduce((a,x)=>a+Number(x.line_total??Number(x.quantity)*Number(x.rate)),0));const tax=Number(i.tax||0);const total=Number(i.total||0);const taxPct=subtotal>0?Math.round(tax/subtotal*10000)/100:0;
    const rows=items.length?items.map(x=>`<tr><td>${esc(x.product_name)}</td><td class="center">${Number(x.quantity||0)}</td><td class="num">${money(x.rate)}</td><td class="num">${money(x.line_total??Number(x.quantity)*Number(x.rate))}</td></tr>`).join(''):`<tr><td>Product or Service</td><td class="center">1</td><td class="num">${money(total)}</td><td class="num">${money(total)}</td></tr>`;
    const customer=i.customer_name||i.customer||'Walk-in customer';const customerPhone=i.customer_phone||i.phone||'';
    const w=open('','_blank','width=960,height=1100');if(!w){const m='Pop-up blocked. Allow pop-ups to print invoices.';return typeof toast==='function'?toast(m):alert(m)}
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(invoiceNo)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"><style>
      @page{size:A4 portrait;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#eee9dc;color:#173f34;font-family:'Plus Jakarta Sans',Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{position:relative;width:210mm;min-height:297mm;margin:0 auto;background:#f5f0e4;padding:14mm 13mm 13mm;overflow:hidden;border:1px solid #d8d0c0}.top{display:flex;justify-content:space-between;align-items:flex-start;gap:16mm}.logo{width:91mm;max-width:54%;height:auto;object-fit:contain;object-position:left top;background:transparent;mix-blend-mode:multiply}.contact{width:62mm;color:#244e42;font-size:9.5pt;line-height:1.55;text-align:left;padding-top:1mm}.invoice-title{font-size:27pt;font-weight:500;letter-spacing:.055em;color:#165542;margin:21mm 0 14mm}.meta{display:grid;grid-template-columns:1fr 1fr;gap:15mm;margin-bottom:11mm}.billto{font-size:10pt;line-height:1.55;color:#263d35}.billto b{display:block;font-size:11pt;margin-bottom:2mm}.facts{display:grid;grid-template-columns:auto 1fr;gap:2.5mm 9mm;align-content:start;font-size:10pt;color:#263d35}.facts b{font-weight:800}.items{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:2mm}.items th{background:#144c3d;color:#fff;border-right:1px solid rgba(255,255,255,.55);font-size:10pt;font-weight:700;padding:4mm 4mm;text-align:left}.items th:nth-child(1){width:46%}.items th:nth-child(2){width:14%;text-align:center}.items th:nth-child(3),.items th:nth-child(4){width:20%;text-align:right}.items td{height:14mm;padding:3.6mm 4mm;border-bottom:1px solid #d7d2c6;background:rgba(255,255,255,.56);font-size:9.5pt;color:#263d35}.items tr:nth-child(even) td{background:rgba(247,245,238,.78)}.items .center{text-align:center}.items .num{text-align:right}.totals{width:45%;margin:11mm 0 0 auto;color:#263d35;font-size:10pt}.totals .line{display:flex;justify-content:space-between;gap:8mm;padding:2.6mm 4mm}.totals .grand{margin-top:1.5mm;background:#cddbcc;font-weight:800;font-size:11.5pt;padding-top:4mm;padding-bottom:4mm}.thanks{position:absolute;left:13mm;bottom:31mm;font-size:10.5pt;font-weight:800;color:#174f40}.tagline{position:absolute;left:13mm;bottom:15mm;font-size:7.5pt;font-weight:600;letter-spacing:.24em;color:#174f40;text-transform:uppercase}.watermark{position:absolute;right:12mm;bottom:13mm;width:57mm;height:auto;opacity:.11;filter:saturate(.65);pointer-events:none}.payment{position:absolute;left:13mm;bottom:23mm;font-size:7.5pt;color:#6a776f}.gst{font-size:7.5pt;color:#66756e;margin-top:2mm}@media screen{body{padding:20px}.page{box-shadow:0 16px 48px rgba(22,55,43,.12)}}@media print{body{background:#f5f0e4;padding:0}.page{border:0;margin:0;box-shadow:none;width:210mm;height:297mm;min-height:297mm}}
    </style></head><body><main class="page"><div class="top"><img class="logo" src="${FULL}" alt="Salesventory"><div class="contact">${contactLines(b)}</div></div><h1 class="invoice-title">INVOICE</h1><section class="meta"><div class="billto"><b>Bill To:</b>${esc(customer)}${customerPhone?`<br>${esc(customerPhone)}`:''}</div><div class="facts"><b>Invoice No:</b><span>${esc(invoiceNo)}</span><b>Issue Date:</b><span>${esc(issue)}</span><b>Due Date:</b><span>${esc(due)}</span></div></section><table class="items"><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><section class="totals"><div class="line"><span>Subtotal</span><span>${money(subtotal)}</span></div><div class="line"><span>Tax (${taxPct}%)</span><span>${money(tax)}</span></div><div class="line grand"><span>Total</span><span>${money(total)}</span></div></section>${b.gstin?`<div class="gst">GSTIN: ${esc(b.gstin)}</div>`:''}<div class="thanks">Thank you for your business.</div><div class="payment">Payment: ${esc(String(i.payment_method||i.paymentMethod||'upi').toUpperCase())} · ${esc(i.payment_status||i.paymentStatus||'paid')}</div><div class="tagline">Inventory today. A bigger tomorrow.</div><img class="watermark" src="${ICON}" alt=""></main><script>addEventListener('load',()=>setTimeout(()=>print(),300),{once:true})<\/script></body></html>`);
    w.document.close();
  }catch(e){typeof toast==='function'?toast(e.message||'Unable to print invoice'):alert(e.message)}
};
})();