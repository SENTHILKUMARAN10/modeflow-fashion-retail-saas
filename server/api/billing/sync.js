import {catalog,json,ownedBusiness,razorpay,supabaseAdmin,userFromToken,upsertSubscription} from './_lib.js';

const map={created:'created',authenticated:'authenticated',active:'active',pending:'past_due',halted:'halted',paused:'paused',cancelled:'cancelled',completed:'completed',expired:'expired'};
export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  try{
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(token);if(!user?.id)return json(res,401,{error:'Sign in required'});
    const {businessId}=req.body||{};if(!businessId)return json(res,400,{error:'Business is required'});
    const membership=await ownedBusiness(user.id,businessId);if(!membership)return json(res,403,{error:'Business access denied'});
    if(membership.role!=='owner')return json(res,403,{error:'Only the business owner can sync billing'});
    const current=(await supabaseAdmin(`/rest/v1/business_subscriptions?business_id=eq.${encodeURIComponent(businessId)}&select=*&limit=1`))?.[0];
    if(!current?.provider_subscription_id||current.provider!=='razorpay')return json(res,404,{error:'No Razorpay subscription found'});
    const sub=await razorpay(`/subscriptions/${encodeURIComponent(current.provider_subscription_id)}`),status=map[sub.status]||'past_due';
    const pendingApplied=!!(current.pending_provider_plan_id&&sub.plan_id===current.pending_provider_plan_id),interval=pendingApplied?current.pending_plan_interval:current.plan_interval,currency=current.currency,amount=Number(catalog[currency]?.[interval]?.amount||current.amount||0);
    const graceUntil=status==='past_due'?(current.grace_until?Math.floor(new Date(current.grace_until).getTime()/1000):Math.floor(Date.now()/1000)+3*86400):null;
    await upsertSubscription({businessId,providerSubscriptionId:sub.id,providerPlanId:sub.plan_id||current.provider_plan_id,providerPaymentId:current.provider_payment_id,interval,currency,amount,status,currentEnd:sub.current_end,nextChargeAt:sub.charge_at,cancelAtPeriodEnd:status==='cancelled'?false:!!current.cancel_at_period_end,lastPaymentAt:current.last_payment_at?Math.floor(new Date(current.last_payment_at).getTime()/1000):null,lastEventType:'manual.provider_sync',graceUntil,failureCount:Number(current.failure_count||0)});
    if(pendingApplied)await supabaseAdmin(`/rest/v1/business_subscriptions?business_id=eq.${encodeURIComponent(businessId)}`,{method:'PATCH',headers:{prefer:'return=minimal'},body:JSON.stringify({pending_plan_interval:null,pending_provider_plan_id:null,pending_plan_effective_at:null})});
    return json(res,200,{ok:true,status,planInterval:interval,currentPeriodEnd:sub.current_end||null,pendingApplied});
  }catch(error){console.error('billing sync failed',error);return json(res,error.status&&error.status<500?error.status:500,{error:error.message||'Unable to sync billing'});}
}
