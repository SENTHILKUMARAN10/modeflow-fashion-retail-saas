// Salesventory copy correction.
(function(){
  function fix(){document.querySelectorAll('.svl-price-card .tag').forEach(el=>{if(/SALE\s+SVENTORY PRO/i.test(el.textContent||''))el.textContent='SALESVENTORY PRO';});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fix,{once:true});else fix();
  setTimeout(fix,300);
})();
