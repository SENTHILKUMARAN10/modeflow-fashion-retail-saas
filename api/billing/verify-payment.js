import {catalog,json,razorpay,supabaseAdmin,userFromToken,verifyHmac,upsertSubscription} from './_lib.js';

export default async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  try{
    const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(token);
    if(!user?.id) return json(res,401,{error:'Sign in required'});
    const {businessId,razorpay_payment_id,paymentId,razorpay_subscription_id,subscriptionId,razorpay_signature,signature}=req.body||{};
    const pid=razorpay_payment_id||paymentId,sid=razorpay_subscription_id||subscriptionId,sig=razorpay_signature||signature;
    if(!businessId||!pid||!sid||!sig) return json(res,400,{error:'Missing payment confirmation'});
    if(!verifyHmac(`${pid}|${sid}`,sig,process.env.RAZORPAY_KEY_SECRET)) return json(res,400,{error:'Payment signature verification failed'});
    const memberships=await supabaseAdmin(`/rest/v1/business_members?business_id=eq.${encodeURIComponent(businessId)}&user_id=eq.${encodeURIComponent(user.id)}&select=role`);
    if(!memberships?.length) return json(res,403,{error:'Business access denied'});
    const sub=await razorpay(`/subscriptions/${encodeURIComponent(sid)}`);
    if(sub.id!==sid) return json(res,400,{error:'Subscription mismatch'});
    const notes=sub.notes||{},interval=notes.plan_interval||'monthly',currency=notes.currency||'INR';
    if(notes.business_id&&notes.business_id!==businessId) return json(res,400,{error:'Business mismatch'});
    const amount=Number(notes.amount||catalog[currency]?.[interval]?.amount||0);
    const status=['active','authenticated'].includes(sub.status)?sub.status:'authenticated';
    await upsertSubscription({businessId,providerSubscriptionId:sid,interval,currency,amount,status,currentEnd:sub.current_end});
    return json(res,200,{ok:true,status,subscriptionId:sid,currentPeriodEnd:sub.current_end||null});
  }catch(err){console.error(err);return json(res,500,{error:err.message||'Unable to verify payment'});}
}
