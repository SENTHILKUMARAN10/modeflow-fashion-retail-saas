import {billingConfigured,catalog,json,ownedBusiness,razorpay,supabaseAdmin,userFromToken} from './_lib.js';

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  try{
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(token);if(!user?.id)return json(res,401,{error:'Sign in required'});
    const {businessId,interval,currency}=req.body||{},price=catalog[currency]?.[interval];
    if(!businessId||!price)return json(res,400,{error:'Invalid target plan'});
    const membership=await ownedBusiness(user.id,businessId);if(!membership)return json(res,403,{error:'Business access denied'});
    if(membership.role!=='owner')return json(res,403,{error:'Only the business owner can manage billing'});
    if(!billingConfigured(currency))return json(res,503,{error:`Payment plan ${currency} ${interval} is not configured yet`});
    const current=(await supabaseAdmin(`/rest/v1/business_subscriptions?business_id=eq.${encodeURIComponent(businessId)}&select=provider,provider_subscription_id,provider_plan_id,plan_interval,currency,status,current_period_end,cancel_at_period_end,pending_plan_interval&limit=1`))?.[0];
    if(!current||current.provider!=='razorpay'||!current.provider_subscription_id)return json(res,409,{error:'No automated Razorpay subscription is available to change'});
    if(!['active','past_due','paused'].includes(current.status))return json(res,409,{error:'Only an active subscription can change plan'});
    if(current.cancel_at_period_end)return json(res,409,{error:'Remove the cancellation request before changing plan'});
    if(current.currency!==currency)return json(res,409,{error:'Currency changes require a new subscription after the current plan ends'});
    if(current.plan_interval===interval&&!current.pending_plan_interval)return json(res,409,{error:'You are already on this plan'});
    const planId=process.env[price.env];
    const sub=await razorpay(`/subscriptions/${encodeURIComponent(current.provider_subscription_id)}`,{method:'PATCH',body:JSON.stringify({plan_id:planId,schedule_change_at:'cycle_end',customer_notify:1})});
    const effective=sub?.current_end?new Date(sub.current_end*1000).toISOString():current.current_period_end||null;
    await supabaseAdmin(`/rest/v1/business_subscriptions?business_id=eq.${encodeURIComponent(businessId)}`,{method:'PATCH',headers:{prefer:'return=minimal'},body:JSON.stringify({pending_plan_interval:interval,pending_provider_plan_id:planId,pending_plan_effective_at:effective,last_event_type:'customer.plan_change_requested',last_event_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
    return json(res,200,{ok:true,pendingPlanInterval:interval,effectiveAt:effective,status:sub.status||current.status});
  }catch(error){console.error('change plan failed',error);return json(res,error.status&&error.status<500?error.status:500,{error:error.message||'Unable to change plan'});}
}
