import {json,ownedBusiness,razorpay,supabaseAdmin,userFromToken} from './_lib.js';

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  try{
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(token);if(!user?.id)return json(res,401,{error:'Sign in required'});
    const {businessId}=req.body||{};if(!businessId)return json(res,400,{error:'Business is required'});
    const membership=await ownedBusiness(user.id,businessId);if(!membership)return json(res,403,{error:'Business access denied'});
    if(membership.role!=='owner')return json(res,403,{error:'Only the business owner can manage billing'});
    const current=(await supabaseAdmin(`/rest/v1/business_subscriptions?business_id=eq.${encodeURIComponent(businessId)}&select=provider,provider_subscription_id,status,cancel_at_period_end,current_period_end&limit=1`))?.[0];
    if(!current)return json(res,404,{error:'No subscription found'});
    if(current.provider!=='razorpay'||!current.provider_subscription_id)return json(res,409,{error:'This subscription must be managed by SalesDesk support'});
    if(['cancelled','completed','expired'].includes(current.status))return json(res,200,{ok:true,status:current.status,cancelAtPeriodEnd:false});
    if(current.cancel_at_period_end)return json(res,200,{ok:true,status:current.status,cancelAtPeriodEnd:true,currentPeriodEnd:current.current_period_end});
    const sub=await razorpay(`/subscriptions/${encodeURIComponent(current.provider_subscription_id)}/cancel`,{method:'POST',body:JSON.stringify({cancel_at_cycle_end:1})});
    await supabaseAdmin(`/rest/v1/business_subscriptions?business_id=eq.${encodeURIComponent(businessId)}`,{method:'PATCH',headers:{prefer:'return=minimal'},body:JSON.stringify({cancel_at_period_end:true,last_event_type:'customer.cancel_requested',last_event_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
    return json(res,200,{ok:true,status:sub.status||current.status,cancelAtPeriodEnd:true,currentPeriodEnd:current.current_period_end});
  }catch(error){console.error('cancel subscription failed',error);return json(res,error.status&&error.status<500?error.status:500,{error:error.message||'Unable to cancel subscription'});}
}
