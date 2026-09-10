// SalesDesk lightweight production observability. No DOM observers, no secrets.
(function(){
  'use strict';
  if(window.SalesDeskObservability)return;window.SalesDeskObservability=true;
  const sent=[];
  const BUILD='20260910-prod1';
  const activeView=()=>document.querySelector('#app .view.active-view')?.id||document.body.className||'public';
  const allowed=()=>{const now=Date.now();while(sent.length&&now-sent[0]>60000)sent.shift();if(sent.length>=5)return false;sent.push(now);return true;};
  async function report(message,stack,source='web'){
    if(!allowed()||!window.tkCloud?.enabled)return;
    try{
      const {data}=await window.tkCloud.auth.session();
      const token=data?.session?.access_token;if(!token)return;
      const payload={
        businessId:window.ModeFlowBusiness?.id||null,
        source,
        message:String(message||'Unknown client error').slice(0,1000),
        stack:String(stack||'').slice(0,5000),
        context:{path:location.pathname+location.search,view:activeView(),userAgent:navigator.userAgent,online:navigator.onLine,build:BUILD}
      };
      fetch('/api/client-error',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify(payload),keepalive:true}).catch(()=>{});
    }catch{}
  }
  addEventListener('error',e=>report(e.message,e.error?.stack||`${e.filename||''}:${e.lineno||0}:${e.colno||0}`,'window.error'));
  addEventListener('unhandledrejection',e=>{const r=e.reason;report(r?.message||String(r||'Unhandled rejection'),r?.stack||'','unhandledrejection');});
  window.SalesDeskReportError=report;
})();
