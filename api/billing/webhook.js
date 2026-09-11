import {digest,json,recordBillingEvent,supabaseAdmin,upsertSubscription,verifyHmac} from './_lib.js';

export const config={api:{bodyParser:false}};
const rawBody=req=>new Promise((resolve,reject)=>{const chunks=[];req.on('data',c=>chunks.push(c));req.on('end',()=>resolve(Buffer.concat(chunks)));req.on('error',reject);});
const q=v=>encodeURIComponent(v);

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  try{
    const raw=await rawBody(req),signature=req.headers['x-razorpay-signature'];
    if(!verifyHmac(raw,signature,process.env.RAZORPAY_WEBHOOK_SECRET))return json(res,400,{error:'Invalid webhook signature'});
    const event=JSON.parse(raw.toString('utf8')),sub=event?.payload?.subscription?.entity||null,payment=event?.payload?.payment?.entity||null;
    const eventType=String(event?.event||'unknown'),eventId=String(req.headers['x-razorpay-event-id']||`sha256:${digest(raw)}`);
    let businessId=sub?.notes?.business_id||null;
    if(!businessId&&sub?.id){const found=(await supabaseAdmin(`/rest/v1/business_subscriptions?provider_subscription_id=eq.${q(sub.id)}&select=business_id&limit=1`))?.[0];businessId=found?.business_id||null;}
    const recorded=await recordBillingEvent({eventId,businessId,subscriptionId:sub?.id||payment?.subscription_id||null,paymentId:payment?.id||null,eventType,providerStatus:sub?.status||payment?.status||null,amount:payment?.amount?Number(payment.amount)/100:null,currency:payment?.currency||sub?.notes?.currency||null,payloadDigest:digest(raw),occurredAt:event?.created_at||payment?.created_at||null});
    if(recorded.duplicate)return json(res,200,{ok:true,duplicate:true});
    if(!businessId||!sub?.id)return json(res,200,{ok:true,ignored:true});

    const current=(await supabaseAdmin(`/rest/v1/business_subscriptions?business_id=eq.${q(businessId)}&select=plan_interval,currency,amount,failure_count,cancel_at_period_end&limit=1`))?.[0]||{};
    const notes=sub.notes||{},interval=notes.plan_interval||current.plan_interval||'monthly',currency=notes.currency||current.currency||'INR',amount=Number(notes.amount||current.amount||0);
    const map={created:'created',authenticated:'authenticated',active:'active',pending:'past_due',halted:'halted',paused:'paused',cancelled:'cancelled',completed:'completed',expired:'expired'};
    let status=map[sub.status]||current.status||'past_due',failureCount=Number(current.failure_count||0),graceUntil=null,lastPaymentAt=null;
    if(eventType==='payment.failed'||eventType==='subscription.pending'){status='past_due';failureCount+=1;graceUntil=Math.floor(Date.now()/1000)+3*24*60*60;}
    if(eventType==='subscription.charged'||(payment?.status==='captured'&&sub.status==='active')){status='active';failureCount=0;lastPaymentAt=payment?.created_at||event?.created_at||Math.floor(Date.now()/1000);graceUntil=null;}
    if(['subscription.cancelled','subscription.completed','subscription.expired','subscription.halted'].includes(eventType))graceUntil=null;
    await upsertSubscription({businessId,providerSubscriptionId:sub.id,providerPlanId:sub.plan_id||null,providerPaymentId:payment?.id||null,interval,currency,amount,status,currentEnd:sub.current_end,nextChargeAt:sub.charge_at,cancelAtPeriodEnd:status==='cancelled'?false:!!current.cancel_at_period_end,lastPaymentAt,lastEventAt:event?.created_at||Math.floor(Date.now()/1000),lastEventType:eventType,graceUntil,failureCount});
    return json(res,200,{ok:true,status});
  }catch(error){console.error('webhook processing failed',error);return json(res,500,{error:'Webhook processing failed'});}
}
