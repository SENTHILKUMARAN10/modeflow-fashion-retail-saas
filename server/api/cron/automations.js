import {json,supabaseAdmin} from '../billing/_lib.js';
import {deliverMessage} from '../automation/_delivery.js';

const q=v=>encodeURIComponent(v);
const nowIso=()=>new Date().toISOString();
const dayKey=()=>nowIso().slice(0,10);
const weekKey=()=>{const d=new Date(),one=new Date(Date.UTC(d.getUTCFullYear(),0,1));return `${d.getUTCFullYear()}-W${Math.ceil((((d-one)/86400000)+one.getUTCDay()+1)/7)}`;};
const rows=async path=>(await supabaseAdmin(path))||[];
const patch=(table,id,body)=>supabaseAdmin(`/rest/v1/${table}?id=eq.${q(id)}`,{method:'PATCH',headers:{prefer:'return=minimal'},body:JSON.stringify(body)});
const rpc=(name,body)=>supabaseAdmin(`/rest/v1/rpc/${name}`,{method:'POST',body:JSON.stringify(body)});
const money=(n,c='INR')=>c==='USD'?`$${Number(n||0).toFixed(2)}`:`₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
const caches=new Map();

async function businessInfo(id){
  if(caches.has(id))return caches.get(id);
  const b=(await rows(`/rest/v1/businesses?id=eq.${q(id)}&select=id,name,email,phone,currency,timezone&limit=1`))?.[0]||null;
  caches.set(id,b);return b;
}
function advance(from,cadence,count=1){
  const d=new Date(from),n=Math.max(1,Number(count)||1);
  if(cadence==='daily')d.setUTCDate(d.getUTCDate()+n);
  else if(cadence==='weekly')d.setUTCDate(d.getUTCDate()+7*n);
  else if(cadence==='monthly')d.setUTCMonth(d.getUTCMonth()+n);
  else if(cadence==='quarterly')d.setUTCMonth(d.getUTCMonth()+3*n);
  else if(cadence==='yearly')d.setUTCFullYear(d.getUTCFullYear()+n);
  else d.setUTCHours(d.getUTCHours()+1);
  return d.toISOString();
}
function interpolateParams(list,ctx){return (Array.isArray(list)?list:['{{business}}','{{title}}','{{message}}']).map(v=>String(v).replaceAll('{{business}}',ctx.business).replaceAll('{{title}}',ctx.title).replaceAll('{{message}}',ctx.message));}
async function send({business,rule=null,sourceType,sourceId,channel,recipient,kind,title,message,dedupeKey,actionUrl,templateName,templateLanguage,templateParams}){
  const destination=channel==='email'?(recipient||business?.email):channel==='whatsapp'?(recipient||business?.phone):null;
  return deliverMessage({businessId:business.id,ruleId:rule?.id||null,sourceType,sourceId,channel,destination,kind,subject:title,message,dedupeKey,actionUrl,templateName,templateLanguage,templateParams,payload:{severity:kind.includes('overdue')||kind.includes('stock')?'warning':'info'}});
}

async function processRecurring(){
  const dueExp=await rows(`/rest/v1/recurring_expense_schedules?is_active=eq.true&next_run_at=lte.${q(nowIso())}&select=id&order=next_run_at.asc&limit=50`);
  const dueInv=await rows(`/rest/v1/recurring_invoice_schedules?is_active=eq.true&next_run_at=lte.${q(nowIso())}&select=id&order=next_run_at.asc&limit=50`);
  let success=0,failed=0,skipped=0;
  for(const x of dueExp){try{const r=await rpc('salesdesk_process_recurring_expense',{p_schedule_id:x.id,p_run_at:nowIso()});if(r?.status==='success')success++;else if(r?.status==='failed')failed++;else skipped++;}catch(e){failed++;console.error('recurring expense failed',x.id,e.message);}}
  for(const x of dueInv){try{const r=await rpc('salesdesk_process_recurring_invoice',{p_schedule_id:x.id,p_run_at:nowIso()});if(r?.status==='success')success++;else if(r?.status==='failed')failed++;else skipped++;}catch(e){failed++;console.error('recurring invoice failed',x.id,e.message);}}
  return {evaluated:dueExp.length+dueInv.length,success,failed,skipped};
}

async function snapshot(businessId,branchId=null){return rpc('salesdesk_report_snapshot',{p_business_id:businessId,p_branch_id:branchId||null});}
function reportMessage(report,b,s){
  const c=b.currency||'INR',label=report.report_type.replaceAll('_',' ');
  return `${b.name} · ${label}\nToday sales: ${money(s.today_sales,c)}\nMonth sales: ${money(s.month_sales,c)}\nMonth expenses: ${money(s.month_expenses,c)}\nReceivables: ${money(s.receivables,c)}\nSupplier payables: ${money(s.payables,c)}\nLow-stock items: ${Number(s.low_stock||0)}\nDue follow-ups: ${Number(s.due_followups||0)}\nTransactions today: ${Number(s.transactions_today||0)}`;
}
async function processReports(){
  const list=await rows(`/rest/v1/scheduled_reports?is_active=eq.true&next_run_at=lte.${q(nowIso())}&select=*&order=next_run_at.asc&limit=100`);
  let sent=0,failed=0;
  for(const r of list){
    try{
      const b=await businessInfo(r.business_id);if(!b)throw new Error('Business not found');
      const s=await snapshot(r.business_id,r.branch_id),title=`SalesDesk · ${r.name}`,message=reportMessage(r,b,s);
      const key=`report:${r.id}:${new Date(r.next_run_at).toISOString()}`;
      const params=[b.name,r.name,money(s.month_sales,b.currency),money(s.month_expenses,b.currency),money(s.receivables,b.currency)];
      await send({business:b,sourceType:'scheduled_report',sourceId:r.id,channel:r.channel,recipient:r.recipient,kind:'scheduled_report',title,message,dedupeKey:key,actionUrl:'/#reports',templateName:r.whatsapp_template,templateLanguage:r.whatsapp_language,templateParams:params});
      await patch('scheduled_reports',r.id,{last_run_at:nowIso(),last_status:'sent',last_error:null,next_run_at:advance(r.next_run_at,r.cadence,r.interval_count)});sent++;
    }catch(e){failed++;console.error('scheduled report failed',r.id,e.message);await patch('scheduled_reports',r.id,{last_run_at:nowIso(),last_status:'failed',last_error:String(e.message||e).slice(0,900)}).catch(()=>{});}
  }
  return {evaluated:list.length,sent,failed};
}

async function ruleSignal(rule,b){
  const bid=rule.business_id,today=dayKey(),c=b.currency||'INR';
  if(rule.trigger_type==='low_stock'){
    const p=await rows(`/rest/v1/products?business_id=eq.${q(bid)}&is_active=eq.true&track_stock=eq.true&select=id,name,stock,reorder_level`),low=p.filter(x=>Number(x.stock)<=Number(x.reorder_level));
    if(!low.length)return null;return {kind:'low_stock',title:`${low.length} stock item${low.length===1?'':'s'} need attention`,message:`${low.slice(0,5).map(x=>x.name).join(', ')}${low.length>5?' and more':''} are at or below their reorder level.`,key:`${rule.id}:${today}:low`,url:'/#stock-control'};
  }
  if(rule.trigger_type==='invoice_overdue'){
    const inv=await rows(`/rest/v1/invoices?business_id=eq.${q(bid)}&payment_status=neq.paid&due_date=lte.${today}&select=id,total,customer_name,due_date`);
    if(!inv.length)return null;const value=inv.reduce((a,x)=>a+Number(x.total||0),0);return {kind:'invoice_overdue',title:`${inv.length} overdue customer payment${inv.length===1?'':'s'}`,message:`${money(value,c)} is attached to invoices at or past their due date.`,key:`${rule.id}:${today}:overdue`,url:'/#receivables'};
  }
  if(rule.trigger_type==='followup_due'){
    const due=await rows(`/rest/v1/customer_followups?business_id=eq.${q(bid)}&status=eq.open&due_at=lte.${q(nowIso())}&select=id,title`);
    if(!due.length)return null;return {kind:'followup_due',title:`${due.length} CRM follow-up${due.length===1?'':'s'} due`,message:`${due.slice(0,4).map(x=>x.title).join(', ')}${due.length>4?' and more':''}`,key:`${rule.id}:${today}:followup`,url:'/#crm'};
  }
  if(rule.trigger_type==='daily_brief'){
    const s=await snapshot(bid);return {kind:'daily_brief',title:'Your SalesDesk Daily Brief',message:reportMessage({report_type:'daily brief'},b,s),key:`${rule.id}:${today}:brief`,url:'/#dashboard'};
  }
  if(rule.trigger_type==='weekly_report'){
    const start=new Date(Date.now()-7*86400000).toISOString(),inv=await rows(`/rest/v1/invoices?business_id=eq.${q(bid)}&created_at=gte.${q(start)}&select=total`),exp=await rows(`/rest/v1/expenses?business_id=eq.${q(bid)}&created_at=gte.${q(start)}&select=amount`),sales=inv.reduce((a,x)=>a+Number(x.total||0),0),expenses=exp.reduce((a,x)=>a+Number(x.amount||0),0);
    return {kind:'weekly_report',title:'Your weekly SalesDesk report',message:`${b.name} · Last 7 days\nSales: ${money(sales,c)}\nExpenses: ${money(expenses,c)}\nCash indicator: ${money(sales-expenses,c)}\nTransactions: ${inv.length}`,key:`${rule.id}:${weekKey()}:weekly`,url:'/#reports'};
  }
  return null;
}
async function processRules(){
  const list=await rows(`/rest/v1/automation_rules?is_enabled=eq.true&or=(next_run_at.is.null,next_run_at.lte.${q(nowIso())})&select=id,business_id,name,trigger_type,channel,config,recipient_email,recipient_phone,next_run_at&limit=500`);
  let sent=0,noSignal=0,failed=0;
  for(const rule of list){
    const next=rule.trigger_type==='weekly_report'?advance(rule.next_run_at||nowIso(),'weekly',1):rule.trigger_type==='daily_brief'?advance(rule.next_run_at||nowIso(),'daily',1):advance(nowIso(),'hourly',1);
    try{
      const b=await businessInfo(rule.business_id);if(!b)throw new Error('Business not found');const signal=await ruleSignal(rule,b);
      if(!signal){noSignal++;await patch('automation_rules',rule.id,{last_run_at:nowIso(),last_status:'no_signal',last_error:null,next_run_at:next});continue;}
      const recipient=rule.channel==='email'?rule.recipient_email:rule.channel==='whatsapp'?rule.recipient_phone:null;
      const ctx={business:b.name,title:signal.title,message:signal.message},params=interpolateParams(rule.config?.whatsapp_params,ctx);
      await send({business:b,rule,sourceType:'automation_rule',sourceId:rule.id,channel:rule.channel,recipient,kind:signal.kind,title:signal.title,message:signal.message,dedupeKey:signal.key,actionUrl:signal.url,templateName:rule.config?.whatsapp_template,templateLanguage:rule.config?.whatsapp_language||'en_US',templateParams:params});
      sent++;await patch('automation_rules',rule.id,{last_run_at:nowIso(),last_status:'sent',last_error:null,next_run_at:next});
    }catch(e){failed++;console.error('automation rule failed',rule.id,e.message);await patch('automation_rules',rule.id,{last_run_at:nowIso(),last_status:'failed',last_error:String(e.message||e).slice(0,900),next_run_at:advance(nowIso(),'hourly',1)}).catch(()=>{});}
  }
  return {evaluated:list.length,sent,noSignal,failed};
}

export default async function handler(req,res){
  if(!['GET','POST'].includes(req.method))return json(res,405,{error:'Method not allowed'});
  const expected=process.env.CRON_SECRET,auth=String(req.headers.authorization||'');
  if(!expected||auth!==`Bearer ${expected}`)return json(res,401,{error:'Unauthorized'});
  try{
    caches.clear();const recurring=await processRecurring(),reports=await processReports(),rules=await processRules();
    return json(res,200,{ok:true,recurring,reports,rules,at:nowIso()});
  }catch(error){console.error('SalesDesk workflow engine failed',error);return json(res,500,{error:'SalesDesk workflow engine failed'});}
}
