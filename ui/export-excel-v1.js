// Velora complete Excel business export
(function(){
  'use strict';
  const qs=s=>document.querySelector(s);
  const moneyValue=v=>Number(v||0);
  const safeText=v=>String(v??'').trim();
  const regionNames={IN:'India',US:'United States',GB:'United Kingdom',AE:'United Arab Emirates',SG:'Singapore',AU:'Australia',CA:'Canada'};

  function getStore(){
    try{return typeof store!=='undefined'?store:null}catch{return null}
  }

  function businessInfo(){
    const business=window.ModeFlowBusiness?.business||{};
    const regionCode=localStorage.getItem('mf_region')||localStorage.getItem('modeflow-region')||'IN';
    const badge=qs('#modeBadge')?.textContent||'';
    const roleMatch=badge.match(/\b(owner|manager|staff)\b/i);
    return {
      id:safeText(business.id),
      name:safeText(business.name)||safeText(qs('.store-card div b')?.textContent)||'Your business',
      slug:safeText(business.slug),
      phone:safeText(business.phone),
      address:safeText(business.address),
      currency:safeText(business.currency)||window.ModeFlowCurrency||localStorage.getItem('mf_currency')||'INR',
      region:regionNames[regionCode]||regionCode,
      role:roleMatch?roleMatch[1].toLowerCase():'owner'
    };
  }

  async function currentUserName(){
    try{
      const result=await window.tkCloud?.auth?.user?.();
      const u=result?.data?.user;
      return safeText(u?.user_metadata?.full_name||u?.user_metadata?.name||u?.email)||'Velora user';
    }catch{return 'Velora user'}
  }

  function dateValue(item){
    if(item?.ts){const d=new Date(Number(item.ts));if(!Number.isNaN(d.getTime()))return d;}
    if(item?.created_at){const d=new Date(item.created_at);if(!Number.isNaN(d.getTime()))return d;}
    if(item?.date){const d=new Date(item.date);if(!Number.isNaN(d.getTime()))return d;}
    return null;
  }

  function customersFromInvoices(invoices){
    const map=new Map();
    invoices.forEach(i=>{
      const name=safeText(i.customer)||'Walk-in customer';
      const phone=safeText(i.phone);
      const key=(phone||name).toLowerCase();
      const existing=map.get(key)||{name,phone,transactions:0,lifetimeValue:0,lastPurchase:null};
      existing.transactions+=1;
      existing.lifetimeValue+=moneyValue(i.total);
      const d=dateValue(i);
      if(d&&(!existing.lastPurchase||d>existing.lastPurchase))existing.lastPurchase=d;
      map.set(key,existing);
    });
    return [...map.values()].sort((a,b)=>b.lifetimeValue-a.lifetimeValue);
  }

  function paymentMix(invoices){
    const map=new Map();
    invoices.forEach(i=>{
      const method=safeText(i.paymentMethod||i.payment_method||'upi').toUpperCase();
      const row=map.get(method)||{method,transactions:0,amount:0};
      row.transactions+=1;row.amount+=moneyValue(i.total);map.set(method,row);
    });
    return [...map.values()].sort((a,b)=>b.amount-a.amount);
  }

  function monthlyPerformance(invoices,expenses){
    const map=new Map();
    const ensure=d=>{
      if(!d)return null;
      const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if(!map.has(key))map.set(key,{key,month:d.toLocaleDateString('en-US',{month:'long',year:'numeric'}),sales:0,cogs:0,expenses:0,transactions:0});
      return map.get(key);
    };
    invoices.forEach(i=>{const r=ensure(dateValue(i));if(!r)return;r.sales+=moneyValue(i.total);r.cogs+=moneyValue(i.cost||i.cost_price)*moneyValue(i.qty||i.quantity||0);r.transactions+=1;});
    expenses.forEach(e=>{const r=ensure(dateValue(e));if(r)r.expenses+=moneyValue(e.amount);});
    return [...map.values()].sort((a,b)=>a.key.localeCompare(b.key)).map(r=>({...r,grossProfit:r.sales-r.cogs,netProfit:r.sales-r.cogs-r.expenses}));
  }

  function ensureXLSX(){
    if(window.XLSX)return Promise.resolve(window.XLSX);
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-velora-xlsx]');
      if(existing){existing.addEventListener('load',()=>resolve(window.XLSX),{once:true});existing.addEventListener('error',reject,{once:true});return;}
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      s.async=true;s.dataset.veloraXlsx='1';
      s.onload=()=>window.XLSX?resolve(window.XLSX):reject(new Error('Excel library did not load'));
      s.onerror=()=>reject(new Error('Could not load Excel exporter'));
      document.head.appendChild(s);
    });
  }

  function setWidths(ws,widths){ws['!cols']=widths.map(w=>({wch:w}));}
  function addFilter(ws){if(ws['!ref'])ws['!autofilter']={ref:ws['!ref']};}
  function formatCurrencyColumns(ws,columns,rowCount,currency){
    const fmt=String(currency).toUpperCase()==='USD'?'$#,##0.00':'₹#,##0.00';
    columns.forEach(col=>{for(let r=2;r<=rowCount+1;r++){const cell=ws[`${col}${r}`];if(cell&&typeof cell.v==='number')cell.z=fmt;}});
  }

  async function exportWorkbook(){
    const XLSX=await ensureXLSX();
    const data=getStore();
    if(!data)throw new Error('Business data is still loading. Please try again in a moment.');
    const info=businessInfo();
    const exportedBy=await currentUserName();
    const products=[...(data.products||[])];
    const invoices=[...(data.invoices||[])];
    const expenses=[...(data.expenses||[])];
    const customers=customersFromInvoices(invoices);
    const payments=paymentMix(invoices);
    const months=monthlyPerformance(invoices,expenses);

    const sales=invoices.reduce((s,i)=>s+moneyValue(i.total),0);
    const cogs=invoices.reduce((s,i)=>s+moneyValue(i.cost||i.cost_price)*moneyValue(i.qty||i.quantity||0),0);
    const expenseTotal=expenses.reduce((s,e)=>s+moneyValue(e.amount),0);
    const inventoryProducts=products.filter(p=>moneyValue(p.stock)<900);
    const inventoryCost=inventoryProducts.reduce((s,p)=>s+moneyValue(p.cost||p.cost_price)*moneyValue(p.stock),0);
    const inventoryRetail=inventoryProducts.reduce((s,p)=>s+moneyValue(p.price||p.selling_price)*moneyValue(p.stock),0);
    const lowStock=inventoryProducts.filter(p=>moneyValue(p.stock)<=moneyValue(p.reorder||p.reorder_level)).length;
    const avgSale=invoices.length?sales/invoices.length:0;

    const wb=XLSX.utils.book_new();
    wb.Props={Title:`${info.name} - Velora Business Export`,Subject:'Complete business report',Author:'Velora',Company:info.name,CreatedDate:new Date()};

    const summaryRows=[
      ['VELORA BUSINESS EXPORT',''],
      ['Business name',info.name],['Workspace ID',info.id||'—'],['Business phone',info.phone||'—'],['Business address',info.address||'—'],['Region',info.region],['Currency',info.currency],['Access role',info.role],['Exported by',exportedBy],['Exported on',new Date().toLocaleString()],
      ['',''],['BUSINESS PERFORMANCE',''],
      ['Total recorded sales',sales],['Cost of goods sold',cogs],['Gross profit',sales-cogs],['Operating expenses',expenseTotal],['Estimated net profit',sales-cogs-expenseTotal],['Transactions',invoices.length],['Active customers',customers.length],['Average transaction value',avgSale],['Products / services',products.length],['Low-stock items',lowStock],['Inventory cost value',inventoryCost],['Inventory retail value',inventoryRetail]
    ];
    const wsSummary=XLSX.utils.aoa_to_sheet(summaryRows);
    setWidths(wsSummary,[30,42]);
    ['B13','B14','B15','B16','B17','B20','B23','B24'].forEach(ref=>{if(wsSummary[ref])wsSummary[ref].z=info.currency==='USD'?'$#,##0.00':'₹#,##0.00';});
    XLSX.utils.book_append_sheet(wb,wsSummary,'Summary');

    const transactionRows=invoices.map(i=>({
      'Invoice / Transaction':safeText(i.id),
      'Date':safeText(i.date)||dateValue(i)?.toLocaleDateString()||'',
      'Customer':safeText(i.customer)||'Walk-in customer',
      'Mobile':safeText(i.phone),
      'Product / Service':safeText(i.product),
      'Quantity':moneyValue(i.qty||i.quantity),
      'Rate':moneyValue(i.rate),
      'Subtotal':moneyValue(i.subtotal)||moneyValue(i.qty||i.quantity)*moneyValue(i.rate),
      'Discount':moneyValue(i.discount),
      'Total':moneyValue(i.total),
      'Payment Method':safeText(i.paymentMethod||i.payment_method||'').toUpperCase(),
      'Payment Status':safeText(i.paymentStatus||i.payment_status||''),
      'Unit Cost':moneyValue(i.cost||i.cost_price),
      'COGS':moneyValue(i.cost||i.cost_price)*moneyValue(i.qty||i.quantity),
      'Gross Profit':moneyValue(i.total)-(moneyValue(i.cost||i.cost_price)*moneyValue(i.qty||i.quantity))
    }));
    const wsTransactions=XLSX.utils.json_to_sheet(transactionRows.length?transactionRows:[{'Invoice / Transaction':'No transactions recorded'}]);
    setWidths(wsTransactions,[22,16,24,17,28,10,14,14,14,14,18,17,14,14,14]);addFilter(wsTransactions);formatCurrencyColumns(wsTransactions,['G','H','I','J','M','N','O'],transactionRows.length,info.currency);
    XLSX.utils.book_append_sheet(wb,wsTransactions,'Transactions');

    const productRows=products.map(p=>{
      const stock=moneyValue(p.stock),service=stock>=900,cost=moneyValue(p.cost||p.cost_price),price=moneyValue(p.price||p.selling_price),reorder=moneyValue(p.reorder||p.reorder_level);
      return {
        'SKU':`VL-${String(p.id??'').slice(-8)}`,
        'Product / Service':safeText(p.name),
        'Type':service?'Service':'Product',
        'Cost Price':cost,
        'Selling Price':price,
        'Stock':service?'N/A':stock,
        'Reorder Level':service?'N/A':reorder,
        'Status':service?'Active':(stock<=reorder?'Low stock':'In stock'),
        'Inventory Cost Value':service?0:cost*stock,
        'Inventory Retail Value':service?0:price*stock,
        'Potential Unit Margin':price-cost
      };
    });
    const wsProducts=XLSX.utils.json_to_sheet(productRows.length?productRows:[{'Product / Service':'No products or services recorded'}]);
    setWidths(wsProducts,[16,30,12,15,15,12,15,14,22,23,20]);addFilter(wsProducts);formatCurrencyColumns(wsProducts,['D','E','I','J','K'],productRows.length,info.currency);
    XLSX.utils.book_append_sheet(wb,wsProducts,'Products & Services');

    const customerRows=customers.map(c=>({
      'Customer':c.name,'Mobile':c.phone,'Transactions':c.transactions,'Lifetime Value':c.lifetimeValue,'Average Spend':c.transactions?c.lifetimeValue/c.transactions:0,'Last Purchase':c.lastPurchase?c.lastPurchase.toLocaleDateString():''
    }));
    const wsCustomers=XLSX.utils.json_to_sheet(customerRows.length?customerRows:[{'Customer':'No customer history recorded'}]);
    setWidths(wsCustomers,[28,18,14,18,18,18]);addFilter(wsCustomers);formatCurrencyColumns(wsCustomers,['D','E'],customerRows.length,info.currency);
    XLSX.utils.book_append_sheet(wb,wsCustomers,'Customers');

    const expenseRows=expenses.map(e=>({'Date':safeText(e.date)||dateValue(e)?.toLocaleDateString()||'','Category':safeText(e.category),'Amount':moneyValue(e.amount),'Notes':safeText(e.note)}));
    const wsExpenses=XLSX.utils.json_to_sheet(expenseRows.length?expenseRows:[{'Category':'No expenses recorded'}]);
    setWidths(wsExpenses,[17,26,16,42]);addFilter(wsExpenses);formatCurrencyColumns(wsExpenses,['C'],expenseRows.length,info.currency);
    XLSX.utils.book_append_sheet(wb,wsExpenses,'Expenses');

    const monthlyRows=months.map(m=>({'Month':m.month,'Transactions':m.transactions,'Sales':m.sales,'COGS':m.cogs,'Gross Profit':m.grossProfit,'Expenses':m.expenses,'Net Profit':m.netProfit}));
    const wsMonthly=XLSX.utils.json_to_sheet(monthlyRows.length?monthlyRows:[{'Month':'No monthly data yet'}]);
    setWidths(wsMonthly,[22,14,16,16,18,16,18]);addFilter(wsMonthly);formatCurrencyColumns(wsMonthly,['C','D','E','F','G'],monthlyRows.length,info.currency);
    XLSX.utils.book_append_sheet(wb,wsMonthly,'Monthly Performance');

    const paymentRows=payments.map(p=>({'Payment Method':p.method,'Transactions':p.transactions,'Amount':p.amount,'Share of Sales %':sales?Number((p.amount/sales*100).toFixed(2)):0}));
    const wsPayments=XLSX.utils.json_to_sheet(paymentRows.length?paymentRows:[{'Payment Method':'No payment data yet'}]);
    setWidths(wsPayments,[22,14,18,18]);addFilter(wsPayments);formatCurrencyColumns(wsPayments,['C'],paymentRows.length,info.currency);
    XLSX.utils.book_append_sheet(wb,wsPayments,'Payment Mix');

    const alertRows=inventoryProducts.filter(p=>moneyValue(p.stock)<=moneyValue(p.reorder||p.reorder_level)).map(p=>({'Product':safeText(p.name),'Current Stock':moneyValue(p.stock),'Reorder Level':moneyValue(p.reorder||p.reorder_level),'Shortage to Reorder':Math.max(0,moneyValue(p.reorder||p.reorder_level)-moneyValue(p.stock)),'Selling Price':moneyValue(p.price||p.selling_price),'Status':'Needs restock'}));
    const wsAlerts=XLSX.utils.json_to_sheet(alertRows.length?alertRows:[{'Product':'No low-stock items'}]);
    setWidths(wsAlerts,[30,16,16,20,16,18]);addFilter(wsAlerts);formatCurrencyColumns(wsAlerts,['E'],alertRows.length,info.currency);
    XLSX.utils.book_append_sheet(wb,wsAlerts,'Stock Alerts');

    const cleanName=info.name.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,40)||'Business';
    const stamp=new Date().toISOString().slice(0,10);
    XLSX.writeFile(wb,`Velora-${cleanName}-Business-Export-${stamp}.xlsx`,{compression:true});
  }

  function bind(){
    const button=qs('#exportData');
    if(!button)return;
    button.title='Export complete business data to Excel';
    button.textContent='Export Excel';
    button.onclick=async()=>{
      const original=button.textContent;
      button.disabled=true;button.textContent='Preparing Excel…';
      try{await exportWorkbook();if(typeof toast==='function')toast('Complete business Excel exported');}
      catch(error){console.error(error);if(typeof toast==='function')toast(error.message||'Excel export failed');else alert(error.message||'Excel export failed');}
      finally{button.disabled=false;button.textContent=original;}
    };
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  addEventListener('modeflow:workspace',()=>setTimeout(bind,0));
})();
