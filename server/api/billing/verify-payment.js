import {catalog,digest,json,ownedBusiness,razorpay,userFromToken,verifyHmac,upsertSubscription,recordBillingEvent} from './_lib.js';

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  res.setHeader('cache-control','no-store, max-age=0');
  try{
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(token);if(!user?.id)return json(res,401,{error:'Sign in required'});
    const {businessId,razorpay_payment_id,paymentId,razorpay_subscription_id,subscriptionId,razorpay_signature,signature}=req.body||{};
    const pid=razorpay_payment_id||paymentId,sid=razorpay_subscription_id||subscriptionId,sig=razorpay_signature||signature;
    if(!businessId||!pid||!sid||!sig)return json(res,400,{error:'Missing payment confirmation'});
    if(!verifyHmac(`${pid}|${sid}`,sig,process.env.RAZORPAY_KEY_SECRET))return json(res,400,{error:'Payment signature verification failed'});
    const membership=await ownedBusiness(user.id,businessId);if(!membership)return json(res,403,{error:'Business access denied'});
    if(membership.role!=='owner')return json(res,403,{error:'Only the business owner can confirm subscription billing'});

    const [sub,payment]=await Promise.all([razorpay(`/subscriptions/${encodeURIComponent(sid)}`),razorpay(`/payments/${encodeURIComponent(pid)}`)]);
    if(sub.id!==sid||payment.id!==pid)return json(res,400,{error:'Payment provider record mismatch'});
    if(payment.subscription_id&&payment.subscription_id!==sid)return json(res,400,{error:'Payment does not belong to this subscription'});
    if(payment.status!=='captured')return json(res,409,{error:'Payment has not been captured yet. Salesventory will activate after provider confirmation.',code:'payment_not_captured'});
    const notes=sub.notes||{},interval=notes.plan_interval||'monthly',currency=notes.currency||payment.currency||'INR';
    if(notes.business_id&&notes.business_id!==businessId)return json(res,400,{error:'Business mismatch'});
    if(!catalog[currency]?.[interval])return json(res,400,{error:'Unknown subscription plan'});
    const amount=Number(notes.amount||catalog[currency][interval].amount||0),status=sub.status==='active'?'active':'authenticated';
    await upsertSubscription({businessId,providerSubscriptionId:sid,providerPlanId:sub.plan_id||null,providerPaymentId:pid,interval,currency,amount,status,currentEnd:sub.current_end,nextChargeAt:sub.charge_at,lastPaymentAt:payment.created_at||Math.floor(Date.now()/1000),lastEventType:'checkout.verified',cancelAtPeriodEnd:false,failureCount:0});
    await recordBillingEvent({eventId:`verify:${sid}:${pid}`,businessId,subscriptionId:sid,paymentId:pid,eventType:'checkout.verified',providerStatus:status,amount:Number(payment.amount||0)/100,currency:payment.currency||currency,payloadDigest:digest(JSON.stringify({sid,pid,status})),occurredAt:payment.created_at}).catch(()=>{});
    return json(res,200,{ok:true,status,subscriptionId:sid,currentPeriodEnd:sub.current_end||null,activationPending:status!=='active'});
  }catch(error){console.error('verify payment failed',error);return json(res,error.status&&error.status<500?error.status:500,{error:error.message||'Unable to verify payment'});}
}
