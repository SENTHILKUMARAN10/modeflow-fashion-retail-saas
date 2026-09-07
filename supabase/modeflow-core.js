(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.ModeFlowCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const number=value=>Number.isFinite(Number(value))?Number(value):0;

  function money(value,currency){
    const code=currency||globalThis.ModeFlowCurrency||'INR';
    const locale=code==='INR'?'en-IN':'en-US';
    try{return new Intl.NumberFormat(locale,{style:'currency',currency:code,maximumFractionDigits:code==='INR'?0:2}).format(number(value));}
    catch{return (code==='USD'?'$':'₹')+number(value).toLocaleString(locale,{maximumFractionDigits:2});}
  }

  function calculateSale({quantity,rate,discount=0}){
    const qty=number(quantity), price=number(rate), off=number(discount);
    const subtotal=Math.round((qty*price+Number.EPSILON)*100)/100;
    const total=Math.max(0,Math.round((subtotal-off+Number.EPSILON)*100)/100);
    return {quantity:qty,rate:price,discount:off,subtotal,total};
  }

  function validateSale({quantity,rate,discount=0,stock=Infinity}){
    const v=calculateSale({quantity,rate,discount});
    if(!Number.isFinite(Number(quantity))||v.quantity<=0) return 'Enter a valid quantity';
    if(v.quantity>number(stock)) return 'Not enough stock for this sale';
    if(!Number.isFinite(Number(rate))||v.rate<0) return 'Enter a valid selling price';
    if(!Number.isFinite(Number(discount))||v.discount<0) return 'Enter a valid discount';
    if(v.discount>v.subtotal) return 'Discount cannot exceed subtotal';
    return null;
  }

  function currentMonthSummary(invoices,now=new Date()){
    const y=now.getFullYear(),m=now.getMonth();
    const list=(invoices||[]).filter(i=>{
      const d=new Date(Number(i.ts)||i.created_at||0);
      return !Number.isNaN(d.getTime())&&d.getFullYear()===y&&d.getMonth()===m;
    });
    return {revenue:list.reduce((sum,i)=>sum+number(i.total),0),orders:list.length};
  }

  function topProduct(invoices){
    const map=new Map();
    for(const i of invoices||[]){
      const name=String(i.product||'Item').trim()||'Item';
      const row=map.get(name)||{name,quantity:0,revenue:0};
      row.quantity+=number(i.qty);
      row.revenue+=number(i.total);
      map.set(name,row);
    }
    return [...map.values()].sort((a,b)=>b.quantity-a.quantity||b.revenue-a.revenue)[0]||null;
  }

  function initials(value){
    const text=String(value??'').trim();
    if(!text) return 'MF';
    const parts=text.split(/\s+/).filter(Boolean);
    return (parts.slice(0,2).map(x=>x[0]).join('')||'MF').toUpperCase();
  }

  function whatsappPhone(value,countryCode='91'){
    const digits=String(value||'').replace(/\D/g,'');
    if(!digits) return '';
    return digits.length===10?countryCode+digits:digits;
  }

  function friendlyError(error){
    const message=String(error?.message||error||'Something went wrong');
    if(/fetch|network|offline/i.test(message)) return 'Network unavailable. Check your connection and try again.';
    if(/Invalid login credentials/i.test(message)) return 'Email or password is incorrect.';
    if(/Email not confirmed/i.test(message)) return 'Please confirm your email before signing in.';
    if(/subscription required/i.test(message)) return 'An active ModeFlow subscription is required.';
    if(/row-level security|permission denied|not authorized/i.test(message)) return 'Your account does not have permission for this action.';
    return message.length>140?'The operation could not be completed. Please try again.':message;
  }

  function capabilities(role){
    return {
      manageProducts:role==='owner'||role==='manager',
      deleteSales:role==='owner',
      deleteExpenses:role==='owner'
    };
  }

  return {number,money,calculateSale,validateSale,currentMonthSummary,topProduct,initials,whatsappPhone,friendlyError,capabilities};
});