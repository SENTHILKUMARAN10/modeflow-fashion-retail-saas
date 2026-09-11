import {billingConfigured,json,ownedBusiness,supabaseAdmin,userFromToken} from './_lib.js';

export default async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  res.setHeader('cache-control','no-store, max-age=0');
  try{
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(token);if(!user?.id)return json(res,401,{error:'Sign in required'});
    const businessId=String(req.query?.businessId||'').trim();if(!businessId)return json(res,400,{error:'Business is required'});
    const membership=await ownedBusiness(user.id,businessId);if(!membership)return json(res,403,{error:'Business access denied'});
    const fields='provider,provider_subscription_id,provider_plan_id,plan_interval,currency,amount,status,current_period_end,next_charge_at,cancel_at_period_end,last_payment_at,last_event_at,last_event_type,grace_until,failure_count,pending_plan_interval,pending_provider_plan_id,pending_plan_effective_at,updated_at';
    const sub=(await supabaseAdmin(`/rest/v1/business_subscriptions?business_id=eq.${encodeURIComponent(businessId)}&select=${fields}&limit=1`))?.[0]||null,currency=sub?.currency||'INR';
    return json(res,200,{subscription:sub,role:membership.role,billingConfigured:billingConfigured(currency),billingConfiguredINR:billingConfigured('INR'),billingConfiguredUSD:billingConfigured('USD'),webhookConfigured:!!process.env.RAZORPAY_WEBHOOK_SECRET});
  }catch(error){console.error('billing status failed',error);return json(res,500,{error:error.message||'Unable to load billing status'});}
}
