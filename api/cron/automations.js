import {json,supabaseAdmin} from '../billing/_lib.js';

const qs=v=>encodeURIComponent(v);
const dayKey=()=>new Date().toISOString().slice(0,10);
const weekKey=()=>{const d=new Date(),one=new Date(Date.UTC(d.getUTCFullYear(),0,1));return `${d.getUTCFullYear()}-W${Math.ceil((((d-one)/86400000)+one.getUTCDay()+1)/7)}`;};
async function exists(businessId,key){const rows=await supabaseAdmin(`/rest/v1/business_notifications?business_id=eq.${qs(businessId)}&dedupe_key=eq.${qs(key)}&select=id&limit=1`);return !!rows?.length;}
async function emit(businessId,kind,title,message,severity,key,actionUrl){if(await exists(businessId,key))return false;await supabaseAdmin('/rest/v1/business_notifications',{method:'POST',headers:{prefer:'return=minimal'},body:JSON.stringify({business_id:businessId,kind,title,message,severity,dedupe_key:key,action_url:actionUrl||null})});return true;}
async function rows(path){return (await supabaseAdmin(path))||[];}
async function evaluate(rule){
 const bid=rule.business_id,today=dayKey(),keyBase=`${rule.id}:${today}`;
 if(rule.trigger_type==='low_stock'){
  const products=await rows(`/rest/v1/products?business_id=eq.${qs(bid)}&is_active=eq.true&track_stock=eq.true&select=id,name,stock,reorder_level`),low=products.filter(p=>Number(p.stock)<=Number(p.reorder_level));
  if(low.length)return emit(bid,'low_stock',`${low.length} stock item${low.length===1?'':'s'} need attention`,`${low.slice(0,4).map(x=>x.name).join(', ')}${low.length>4?' and more':''} are at or below their reorder level.`,'warning',`${keyBase}:low`,'/#stock-control');
 }
 if(rule.trigger_type==='invoice_overdue'){
  const inv=await rows(`/rest/v1/invoices?business_id=eq.${qs(bid)}&payment_status=neq.paid&due_date=lte.${today}&select=id,total,customer_name,due_date`);
  if(inv.length){const value=inv.reduce((a,x)=>a+Number(x.total||0),0);return emit(bid,'invoice_overdue',`${inv.length} overdue customer payment${inv.length===1?'':'s'}`,`${value.toFixed(2)} is attached to invoices at or past their due date.`,'warning',`${keyBase}:overdue`,'/#receivables');}
 }
 if(rule.trigger_type==='followup_due'){
  const due=await rows(`/rest/v1/customer_followups?business_id=eq.${qs(bid)}&status=eq.open&due_at=lte.${encodeURIComponent(new Date().toISOString())}&select=id,title`);
  if(due.length)return emit(bid,'followup_due',`${due.length} CRM follow-up${due.length===1?'':'s'} due`,`${due.slice(0,3).map(x=>x.title).join(', ')}${due.length>3?' and more':''}`,'info',`${keyBase}:followup`,'/#crm');
 }
 if(rule.trigger_type==='daily_brief'){
  const start=`${today}T00:00:00.000Z`,inv=await rows(`/rest/v1/invoices?business_id=eq.${qs(bid)}&created_at=gte.${qs(start)}&select=total,payment_status`),exp=await rows(`/rest/v1/expenses?business_id=eq.${qs(bid)}&created_at=gte.${qs(start)}&select=amount`);const sales=inv.reduce((a,x)=>a+Number(x.total||0),0),expenses=exp.reduce((a,x)=>a+Number(x.amount||0),0),open=inv.filter(x=>x.payment_status!=='paid').length;
  return emit(bid,'daily_brief','Your SalesDesk Daily Brief',`Today so far: sales ${sales.toFixed(2)}, expenses ${expenses.toFixed(2)}, ${inv.length} transactions and ${open} open payment${open===1?'':'s'}.`,'info',`${keyBase}:brief`,'/#dashboard');
 }
 if(rule.trigger_type==='weekly_report'&&new Date().getUTCDay()===1){
  const start=new Date(Date.now()-7*86400000).toISOString(),inv=await rows(`/rest/v1/invoices?business_id=eq.${qs(bid)}&created_at=gte.${qs(start)}&select=total`),exp=await rows(`/rest/v1/expenses?business_id=eq.${qs(bid)}&created_at=gte.${qs(start)}&select=amount`);const sales=inv.reduce((a,x)=>a+Number(x.total||0),0),expenses=exp.reduce((a,x)=>a+Number(x.amount||0),0);
  return emit(bid,'weekly_report','Your weekly SalesDesk report',`Last 7 days: sales ${sales.toFixed(2)}, expenses ${expenses.toFixed(2)}, net cash indicator ${(sales-expenses).toFixed(2)}.`,'info',`${rule.id}:${weekKey()}:weekly`,'/#reports');
 }
 return false;
}
export default async function handler(req,res){
 if(!['GET','POST'].includes(req.method))return json(res,405,{error:'Method not allowed'});
 const expected=process.env.CRON_SECRET,auth=String(req.headers.authorization||'');
 if(!expected||auth!==`Bearer ${expected}`)return json(res,401,{error:'Unauthorized'});
 try{
  const rules=await rows('/rest/v1/automation_rules?is_enabled=eq.true&select=id,business_id,name,trigger_type,channel,config&limit=500');
  let emitted=0,failed=0;
  for(const rule of rules){try{if(await evaluate(rule))emitted++;}catch(error){failed++;console.error('automation rule failed',rule.id,error);}}
  return json(res,200,{ok:true,evaluated:rules.length,emitted,failed,at:new Date().toISOString()});
 }catch(error){console.error('automation engine failed',error);return json(res,500,{error:'Automation engine failed'});}
}
