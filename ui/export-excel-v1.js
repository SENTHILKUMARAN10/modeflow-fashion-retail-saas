// Velora Excel export with date/time range controls
(function(){
  'use strict';
  const qs=s=>document.querySelector(s);
  const n=v=>Number(v||0);
  const text=v=>String(v??'').trim();
  const regions={IN:'India',US:'United States',GB:'United Kingdom',AE:'United Arab Emirates',SG:'Singapore',AU:'Australia',CA:'Canada'};

  function getStore(){try{return typeof store!=='undefined'?store:null}catch{return null}}
  function businessInfo(){
    const b=window.ModeFlowBusiness?.business||{};
    const regionCode=localStorage.getItem('mf_region')||localStorage.getItem('modeflow-region')||'IN';
    const badge=qs('#modeBadge')?.textContent||'';
    const role=badge.match(/\b(owner|manager|staff)\b/i);
    return {id:text(b.id),name:text(b.name)||text(qs('.store-card div b')?.textContent)||'Your business',phone:text(b.phone),address:text(b.address),currency:text(b.currency)||window.ModeFlowCurrency||localStorage.getItem('mf_currency')||'INR',region:regions[regionCode]||regionCode,role:role?role[1].toLowerCase():'owner'};
  }
  async function userName(){
    try{const r=await window.tkCloud?.auth?.user?.();const u=r?.data?.user;return text(u?.user_metadata?.full_name||u?.user_metadata?.name||u?.email)||'Velora user';}catch{return 'Velora user'}
  }
  function parseDate(item){
    const candidates=[item?.ts,item?.created_at,item?.expense_date,item?.date];
    for(const value of candidates){
      if(value===undefined||value===null||value==='')continue;
      let d;
      if(typeof value==='number'||/^\d{11,}$/.test(String(value)))d=new Date(Number(value));
      else d=new Date(value);
      if(!Number.isNaN(d.getTime()))return d;
      const m=String(value).match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
      if(m){d=new Date(`${m[2]} ${m[1]}, ${m[3]} 12:00:00`);if(!Number.isNaN(d.getTime()))return d;}
    }
    return null;
  }
  function inRange(item,range){
    if(!range.start&&!range.end)return true;
    const d=parseDate(item);if(!d)return false;
    if(range.start&&d<range.start)return false;
    if(range.end&&d>range.end)return false;
    return true;
  }
  function startOfDay(d){const x=new Date(d);x.setHours(0,0,0,0);return x}
  function endOfDay(d){const x=new Date(d);x.setHours(23,59,59,999);return x}
  function localInputValue(d){
    const pad=x=>String(x).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function rangeForPreset(preset){
    const now=new Date();
    if(preset==='all')return {start:null,end:null,label:'All time',file:'All-Time'};
    if(preset==='today')return {start:startOfDay(now),end:now,label:'Today',file:'Today'};
    if(preset==='yesterday'){const d=new Date(now);d.setDate(d.getDate()-1);return {start:startOfDay(d),end:endOfDay(d),label:'Yesterday',file:'Yesterday'};}
    if(preset==='7days'){const d=new Date(now);d.setDate(d.getDate()-6);return {start:startOfDay(d),end:now,label:'Last 7 days',file:'Last-7-Days'};}
    if(preset==='month'){return {start:new Date(now.getFullYear(),now.getMonth(),1,0,0,0,0),end:now,label:'This month',file:'This-Month'};}
    return {start:null,end:null,label:'Custom range',file:'Custom'};
  }
  function formatRangeDate(d){return d?d.toLocaleString(undefined,{year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'No limit'}

  function customersFromInvoices(invoices){
    const map=new Map();
    invoices.forEach(i=>{const name=text(i.customer)||'Walk-in customer',phone=text(i.phone),key=(phone||name).toLowerCase();const r=map.get(key)||{name,phone,transactions:0,lifetimeValue:0,lastPurchase:null};r.transactions++;r.lifetimeValue+=n(i.total);const d=parseDate(i);if(d&&(!r.lastPurchase||d>r.lastPurchase))r.lastPurchase=d;map.set(key,r);});
    return [...map.values()].sort((a,b)=>b.lifetimeValue-a.lifetimeValue);
  }
  function paymentMix(invoices){
    const map=new Map();
    invoices.forEach(i=>{const method=text(i.paymentMethod||i.payment_method||'upi').toUpperCase();const r=map.get(method)||{method,transactions:0,amount:0};r.transactions++;r.amount+=n(i.total);map.set(method,r);});
    return [...map.values()].sort((a,b)=>b.amount-a.amount);
  }
  function monthlyPerformance(invoices,expenses){
    const map=new Map();
    const ensure=d=>{if(!d)return null;const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;if(!map.has(key))map.set(key,{key,month:d.toLocaleDateString(undefined,{month:'long',year:'numeric'}),sales:0,cogs:0,expenses:0,transactions:0});return map.get(key)};
    invoices.forEach(i=>{const r=ensure(parseDate(i));if(!r)return;r.sales+=n(i.total);r.cogs+=n(i.cost||i.cost_price)*n(i.qty||i.quantity);r.transactions++;});
    expenses.forEach(e=>{const r=ensure(parseDate(e));if(r)r.expenses+=n(e.amount);});
    return [...map.values()].sort((a,b)=>a.key.localeCompare(b.key)).map(r=>({...r,grossProfit:r.sales-r.cogs,netProfit:r.sales-r.cogs-r.expenses}));
  }
  function ensureXLSX(){
    if(window.XLSX)return Promise.resolve(window.XLSX);
    return new Promise((resolve,reject)=>{const old=document.querySelector('script[data-velora-xlsx]');if(old){old.addEventListener('load',()=>resolve(window.XLSX),{once:true});old.addEventListener('error',reject,{once:true});return;}const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.async=true;s.dataset.veloraXlsx='1';s.onload=()=>window.XLSX?resolve(window.XLSX):reject(new Error('Excel library did not load'));s.onerror=()=>reject(new Error('Could not load Excel exporter'));document.head.appendChild(s);});
  }
  const widths=(ws,a)=>ws['!cols']=a.map(w=>({wch:w}));
  const filter=ws=>{if(ws['!ref'])ws['!autofilter']={ref:ws['!ref']}};
  function currencyCols(ws,cols,count,currency){const fmt=String(currency).toUpperCase()==='USD'?'$#,##0.00':'₹#,##0.00';cols.forEach(c=>{for(let r=2;r<=count+1;r++){const cell=ws[`${c}${r}`];if(cell&&typeof cell.v==='number')cell.z=fmt;}})}

  function injectDialog(){
    if(qs('#veloraExportDialog'))return;
    const style=document.createElement('style');style.id='veloraExportStyle';style.textContent=`
      #veloraExportDialog{border:0;padding:0;background:transparent;max-width:min(92vw,620px);width:620px;color:#17231c}
      #veloraExportDialog::backdrop{background:rgba(8,25,20,.48);backdrop-filter:blur(5px)}
      .vx-card{background:#fffaf0;border:1px solid #d9ceb9;border-radius:28px;overflow:hidden;box-shadow:0 30px 90px rgba(20,55,44,.25);font-family:'Plus Jakarta Sans',sans-serif}
      .vx-head{background:linear-gradient(145deg,#173f34,#1f5b49 65%,#2f755f);color:#fff;padding:28px 30px;display:flex;justify-content:space-between;gap:20px;align-items:flex-start}
      .vx-head small{font-size:10px;letter-spacing:.15em;font-weight:800;color:#dce8e2}.vx-head h3{font:400 30px 'DM Serif Display',Georgia,serif;margin:7px 0 0}.vx-close{border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:#fff;border-radius:999px;padding:9px 13px;cursor:pointer}
      .vx-body{padding:26px 30px}.vx-note{margin:0 0 18px;color:#667069;font-size:13px;line-height:1.55}.vx-presets{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px}.vx-chip{border:1px solid #d9ceb9;background:#f5ecdc;color:#244b3f;border-radius:999px;padding:10px 14px;font-weight:700;cursor:pointer}.vx-chip.active{background:#1f5b49;color:#fff;border-color:#1f5b49}
      .vx-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}.vx-field{display:flex;flex-direction:column;gap:7px}.vx-field span{font-size:10px;letter-spacing:.12em;font-weight:800;color:#6e776f}.vx-field input{width:100%;border:1px solid #d9ceb9;border-radius:14px;background:#fffdf8;padding:13px 14px;font:600 13px 'Plus Jakarta Sans',sans-serif;color:#17231c;outline:none}.vx-field input:focus{border-color:#1f5b49;box-shadow:0 0 0 3px rgba(31,91,73,.1)}
      .vx-range{margin:18px 0 0;padding:14px 16px;border-radius:14px;background:#f1e6d2;color:#4f5c54;font-size:12px;line-height:1.55}.vx-range b{color:#1f5b49}.vx-actions{display:flex;justify-content:flex-end;gap:10px;padding:20px 30px 28px}.vx-cancel,.vx-export{border-radius:14px;padding:13px 18px;font-weight:800;cursor:pointer}.vx-cancel{background:#fffaf0;border:1px solid #d9ceb9;color:#34463e}.vx-export{background:#1f5b49;border:1px solid #1f5b49;color:#fff}.vx-export:disabled{opacity:.55;cursor:wait}
      @media(max-width:640px){.vx-head,.vx-body,.vx-actions{padding-left:20px;padding-right:20px}.vx-fields{grid-template-columns:1fr}.vx-actions{flex-direction:column-reverse}.vx-cancel,.vx-export{width:100%}}
    `;document.head.appendChild(style);
    document.body.insertAdjacentHTML('beforeend',`<dialog id="veloraExportDialog"><div class="vx-card"><div class="vx-head"><div><small>VELORA · BUSINESS EXPORT</small><h3>Choose export period</h3></div><button type="button" class="vx-close" aria-label="Close">Close</button></div><div class="vx-body"><p class="vx-note">Export the complete business report for all time or only a selected date and time period. Current products and stock are always included as a live snapshot.</p><div class="vx-presets"><button type="button" class="vx-chip active" data-range="all">All time</button><button type="button" class="vx-chip" data-range="today">Today</button><button type="button" class="vx-chip" data-range="yesterday">Yesterday</button><button type="button" class="vx-chip" data-range="7days">Last 7 days</button><button type="button" class="vx-chip" data-range="month">This month</button><button type="button" class="vx-chip" data-range="custom">Custom</button></div><div class="vx-fields"><label class="vx-field"><span>FROM DATE & TIME</span><input id="vxFrom" type="datetime-local" disabled></label><label class="vx-field"><span>TO DATE & TIME</span><input id="vxTo" type="datetime-local" disabled></label></div><div id="vxRangeSummary" class="vx-range"><b>Export period:</b> All time</div></div><div class="vx-actions"><button type="button" class="vx-cancel">Cancel</button><button type="button" id="vxExportNow" class="vx-export">Export Excel</button></div></div></dialog>`);
    const d=qs('#veloraExportDialog');d.querySelector('.vx-close').onclick=()=>d.close();d.querySelector('.vx-cancel').onclick=()=>d.close();
    d.addEventListener('click',e=>{if(e.target===d)d.close();});
    d.querySelectorAll('.vx-chip').forEach(b=>b.onclick=()=>selectPreset(b.dataset.range));
    qs('#vxFrom').addEventListener('change',updateRangeSummary);qs('#vxTo').addEventListener('change',updateRangeSummary);
    qs('#vxExportNow').onclick=runSelectedExport;
  }
  let selectedPreset='all';
  function selectPreset(preset){
    selectedPreset=preset;
    qs('#veloraExportDialog').querySelectorAll('.vx-chip').forEach(b=>b.classList.toggle('active',b.dataset.range===preset));
    const from=qs('#vxFrom'),to=qs('#vxTo');
    if(preset==='custom'){
      from.disabled=false;to.disabled=false;
      const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),1,0,0,0,0);
      if(!from.value)from.value=localInputValue(start);if(!to.value)to.value=localInputValue(now);
    }else{
      from.disabled=true;to.disabled=true;
      const r=rangeForPreset(preset);from.value=r.start?localInputValue(r.start):'';to.value=r.end?localInputValue(r.end):'';
    }
    updateRangeSummary();
  }
  function selectedRange(){
    if(selectedPreset!=='custom')return rangeForPreset(selectedPreset);
    const from=qs('#vxFrom').value,to=qs('#vxTo').value;
    const start=from?new Date(from):null,end=to?new Date(to):null;
    if(start&&Number.isNaN(start.getTime()))throw new Error('Choose a valid From date and time.');
    if(end&&Number.isNaN(end.getTime()))throw new Error('Choose a valid To date and time.');
    if(!start&&!end)throw new Error('Choose at least one custom date/time.');
    if(start&&end&&start>end)throw new Error('From date/time cannot be after To date/time.');
    const file=`${start?start.toISOString().slice(0,10):'Start'}-to-${end?end.toISOString().slice(0,10):'Now'}`;
    return {start,end,label:'Custom date & time',file};
  }
  function updateRangeSummary(){
    try{const r=selectedRange();qs('#vxRangeSummary').innerHTML=`<b>Export period:</b> ${r.label}<br><b>From:</b> ${formatRangeDate(r.start)} &nbsp; <b>To:</b> ${formatRangeDate(r.end)}`;}catch(e){qs('#vxRangeSummary').innerHTML=`<b>Check date/time:</b> ${e.message}`;}
  }

  async function exportWorkbook(range){
    const XLSX=await ensureXLSX(),data=getStore();if(!data)throw new Error('Business data is still loading. Please try again.');
    const info=businessInfo(),exportedBy=await userName();
    const products=[...(data.products||[])];
    const invoices=[...(data.invoices||[])].filter(i=>inRange(i,range));
    const expenses=[...(data.expenses||[])].filter(e=>inRange(e,range));
    const customers=customersFromInvoices(invoices),payments=paymentMix(invoices),months=monthlyPerformance(invoices,expenses);
    const sales=invoices.reduce((s,i)=>s+n(i.total),0),cogs=invoices.reduce((s,i)=>s+n(i.cost||i.cost_price)*n(i.qty||i.quantity),0),expenseTotal=expenses.reduce((s,e)=>s+n(e.amount),0);
    const inventoryProducts=products.filter(p=>n(p.stock)<900),inventoryCost=inventoryProducts.reduce((s,p)=>s+n(p.cost||p.cost_price)*n(p.stock),0),inventoryRetail=inventoryProducts.reduce((s,p)=>s+n(p.price||p.selling_price)*n(p.stock),0),lowStock=inventoryProducts.filter(p=>n(p.stock)<=n(p.reorder||p.reorder_level)).length,avgSale=invoices.length?sales/invoices.length:0;
    const wb=XLSX.utils.book_new();wb.Props={Title:`${info.name} - Velora Business Export`,Subject:`Business report - ${range.label}`,Author:'Velora',Company:info.name,CreatedDate:new Date()};

    const summary=[['VELORA BUSINESS EXPORT',''],['Business name',info.name],['Workspace ID',info.id||'—'],['Business phone',info.phone||'—'],['Business address',info.address||'—'],['Region',info.region],['Currency',info.currency],['Access role',info.role],['Exported by',exportedBy],['Exported on',new Date().toLocaleString()],['Export period',range.label],['From',formatRangeDate(range.start)],['To',formatRangeDate(range.end)],['',''],['BUSINESS PERFORMANCE FOR SELECTED PERIOD',''],['Sales',sales],['Cost of goods sold',cogs],['Gross profit',sales-cogs],['Operating expenses',expenseTotal],['Estimated net profit',sales-cogs-expenseTotal],['Transactions',invoices.length],['Customers in period',customers.length],['Average transaction value',avgSale],['',''],['CURRENT BUSINESS SNAPSHOT',''],['Products / services',products.length],['Low-stock items',lowStock],['Inventory cost value',inventoryCost],['Inventory retail value',inventoryRetail]];
    const s1=XLSX.utils.aoa_to_sheet(summary);widths(s1,[36,45]);['B16','B17','B18','B19','B20','B23','B28','B29'].forEach(ref=>{if(s1[ref])s1[ref].z=info.currency==='USD'?'$#,##0.00':'₹#,##0.00'});XLSX.utils.book_append_sheet(wb,s1,'Summary');

    const tr=invoices.map(i=>({'Invoice / Transaction':text(i.id),'Date & Time':parseDate(i)?.toLocaleString()||text(i.date),'Customer':text(i.customer)||'Walk-in customer','Mobile':text(i.phone),'Product / Service':text(i.product),'Quantity':n(i.qty||i.quantity),'Rate':n(i.rate),'Subtotal':n(i.subtotal)||n(i.qty||i.quantity)*n(i.rate),'Discount':n(i.discount),'Total':n(i.total),'Payment Method':text(i.paymentMethod||i.payment_method).toUpperCase(),'Payment Status':text(i.paymentStatus||i.payment_status),'Unit Cost':n(i.cost||i.cost_price),'COGS':n(i.cost||i.cost_price)*n(i.qty||i.quantity),'Gross Profit':n(i.total)-n(i.cost||i.cost_price)*n(i.qty||i.quantity)}));
    const s2=XLSX.utils.json_to_sheet(tr.length?tr:[{'Invoice / Transaction':'No transactions in selected period'}]);widths(s2,[22,22,24,17,28,10,14,14,14,14,18,17,14,14,14]);filter(s2);currencyCols(s2,['G','H','I','J','M','N','O'],tr.length,info.currency);XLSX.utils.book_append_sheet(wb,s2,'Transactions');

    const pr=products.map(p=>{const stock=n(p.stock),service=stock>=900,cost=n(p.cost||p.cost_price),price=n(p.price||p.selling_price),reorder=n(p.reorder||p.reorder_level);return {'SKU':`VL-${String(p.id??'').slice(-8)}`,'Product / Service':text(p.name),'Type':service?'Service':'Product','Cost Price':cost,'Selling Price':price,'Stock':service?'N/A':stock,'Reorder Level':service?'N/A':reorder,'Status':service?'Active':stock<=reorder?'Low stock':'In stock','Inventory Cost Value':service?0:cost*stock,'Inventory Retail Value':service?0:price*stock,'Potential Unit Margin':price-cost};});
    const s3=XLSX.utils.json_to_sheet(pr.length?pr:[{'Product / Service':'No products or services recorded'}]);widths(s3,[16,30,12,15,15,12,15,14,22,23,20]);filter(s3);currencyCols(s3,['D','E','I','J','K'],pr.length,info.currency);XLSX.utils.book_append_sheet(wb,s3,'Products & Services');

    const cr=customers.map(c=>({'Customer':c.name,'Mobile':c.phone,'Transactions in Period':c.transactions,'Spend in Period':c.lifetimeValue,'Average Spend':c.transactions?c.lifetimeValue/c.transactions:0,'Last Purchase in Period':c.lastPurchase?c.lastPurchase.toLocaleString():''}));
    const s4=XLSX.utils.json_to_sheet(cr.length?cr:[{'Customer':'No customer activity in selected period'}]);widths(s4,[28,18,22,18,18,24]);filter(s4);currencyCols(s4,['D','E'],cr.length,info.currency);XLSX.utils.book_append_sheet(wb,s4,'Customers');

    const er=expenses.map(e=>({'Date & Time':parseDate(e)?.toLocaleString()||text(e.date||e.expense_date),'Category':text(e.category),'Amount':n(e.amount),'Notes':text(e.note)}));
    const s5=XLSX.utils.json_to_sheet(er.length?er:[{'Category':'No expenses in selected period'}]);widths(s5,[22,26,16,42]);filter(s5);currencyCols(s5,['C'],er.length,info.currency);XLSX.utils.book_append_sheet(wb,s5,'Expenses');

    const mr=months.map(m=>({'Month':m.month,'Transactions':m.transactions,'Sales':m.sales,'COGS':m.cogs,'Gross Profit':m.grossProfit,'Expenses':m.expenses,'Net Profit':m.netProfit}));
    const s6=XLSX.utils.json_to_sheet(mr.length?mr:[{'Month':'No data in selected period'}]);widths(s6,[22,14,16,16,18,16,18]);filter(s6);currencyCols(s6,['C','D','E','F','G'],mr.length,info.currency);XLSX.utils.book_append_sheet(wb,s6,'Monthly Performance');

    const pay=payments.map(p=>({'Payment Method':p.method,'Transactions':p.transactions,'Amount':p.amount,'Share of Sales %':sales?Number((p.amount/sales*100).toFixed(2)):0}));
    const s7=XLSX.utils.json_to_sheet(pay.length?pay:[{'Payment Method':'No payment data in selected period'}]);widths(s7,[22,14,18,18]);filter(s7);currencyCols(s7,['C'],pay.length,info.currency);XLSX.utils.book_append_sheet(wb,s7,'Payment Mix');

    const alerts=inventoryProducts.filter(p=>n(p.stock)<=n(p.reorder||p.reorder_level)).map(p=>({'Product':text(p.name),'Current Stock':n(p.stock),'Reorder Level':n(p.reorder||p.reorder_level),'Shortage to Reorder':Math.max(0,n(p.reorder||p.reorder_level)-n(p.stock)),'Selling Price':n(p.price||p.selling_price),'Status':'Needs restock'}));
    const s8=XLSX.utils.json_to_sheet(alerts.length?alerts:[{'Product':'No low-stock items'}]);widths(s8,[30,16,16,20,16,18]);filter(s8);currencyCols(s8,['E'],alerts.length,info.currency);XLSX.utils.book_append_sheet(wb,s8,'Stock Alerts');

    const clean=info.name.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,40)||'Business';
    XLSX.writeFile(wb,`Velora-${clean}-${range.file}-${new Date().toISOString().slice(0,10)}.xlsx`,{compression:true});
  }

  async function runSelectedExport(){
    const button=qs('#vxExportNow');
    try{
      const range=selectedRange();button.disabled=true;button.textContent='Preparing Excel…';
      await exportWorkbook(range);
      qs('#veloraExportDialog')?.close();
      if(typeof toast==='function')toast(`${range.label} Excel report exported`);
    }catch(e){console.error(e);if(typeof toast==='function')toast(e.message||'Excel export failed');else alert(e.message||'Excel export failed');}
    finally{button.disabled=false;button.textContent='Export Excel';}
  }

  function bind(){
    injectDialog();
    const button=qs('#exportData');if(!button)return;
    button.title='Export business data to Excel by date and time';button.textContent='Export Excel';
    button.onclick=()=>{selectPreset('all');qs('#veloraExportDialog').showModal();};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  addEventListener('modeflow:workspace',()=>setTimeout(bind,0));
})();
