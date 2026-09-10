import {json,supabaseAdmin,userFromToken} from './_lib.js';

export default async function handler(req,res){
  if(req.method!=='GET') return json(res,405,{error:'Method not allowed'});
  res.setHeader('cache-control','no-store, max-age=0');
  try{
    const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(token);
    if(!user?.id) return json(res,401,{error:'Sign in required'});
    const businessId=String(req.query?.businessId||'').trim();
    if(!businessId) return json(res,400,{error:'Business is required'});
    const membership=await supabaseAdmin(`/rest/v1/business_members?business_id=eq.${encodeURIComponent(businessId)}&user_id=eq.${encodeURIComponent(user.id)}&select=role&limit=1`);
    if(!membership?.length) return json(res,403,{error:'Business access denied'});
    const rows=await supabaseAdmin(`/rest/v1/business_subscriptions?business_id=eq.${encodeURIComponent(businessId)}&select=provider,provider_subscription_id,plan_interval,currency,amount,status,current_period_end,updated_at&limit=1`);
    const sub=rows?.[0]||null;
    return json(res,200,{subscription:sub,role:membership[0].role,billingConfigured:!!(process.env.RAZORPAY_KEY_ID&&process.env.RAZORPAY_KEY_SECRET&&process.env.RAZORPAY_PLAN_INR_MONTHLY&&process.env.RAZORPAY_PLAN_INR_ANNUAL)});
  }catch(error){
    console.error(error);return json(res,500,{error:error.message||'Unable to load billing status'});
  }
}
