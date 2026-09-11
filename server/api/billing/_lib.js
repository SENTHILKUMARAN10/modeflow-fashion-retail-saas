import crypto from 'node:crypto';

export const catalog={
  INR:{monthly:{amount:399,label:'₹399 / month',env:'RAZORPAY_PLAN_INR_MONTHLY'},annual:{amount:3990,label:'₹3,990 / year',env:'RAZORPAY_PLAN_INR_ANNUAL'}},
  USD:{monthly:{amount:4.99,label:'$4.99 / month',env:'RAZORPAY_PLAN_USD_MONTHLY'},annual:{amount:49.99,label:'$49.99 / year',env:'RAZORPAY_PLAN_USD_ANNUAL'}}
};
export const json=(res,status,body)=>{res.statusCode=status;res.setHeader('content-type','application/json');res.end(JSON.stringify(body));};
export const billingConfigured=(currency='INR')=>{
  const plans=catalog[currency];return !!(process.env.RAZORPAY_KEY_ID&&process.env.RAZORPAY_KEY_SECRET&&plans&&process.env[plans.monthly.env]&&process.env[plans.annual.env]);
};
export const basic=()=>`Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`;
export const razorpay=async(path,options={})=>{
  if(!process.env.RAZORPAY_KEY_ID||!process.env.RAZORPAY_KEY_SECRET)throw new Error('Razorpay is not configured');
  const r=await fetch(`https://api.razorpay.com/v1${path}`,{...options,headers:{authorization:basic(),'content-type':'application/json',...(options.headers||{})}});
  const data=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(data?.error?.description||data?.error?.reason||'Payment provider request failed');e.status=r.status;e.provider=data?.error||null;throw e;}
  return data;
};
export const supabaseAdmin=async(path,options={})=>{
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY,url=process.env.SUPABASE_URL;
  if(!key||!url)throw new Error('Server database configuration is missing');
  const r=await fetch(`${url}${path}`,{...options,headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json',prefer:'return=representation',...(options.headers||{})}});
  const data=await r.json().catch(()=>null);
  if(!r.ok){const e=new Error(data?.message||data?.error_description||data?.hint||'Database request failed');e.status=r.status;e.data=data;throw e;}
  return data;
};
export const userFromToken=async token=>{
  if(!token)return null;const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return null;
  const r=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,authorization:`Bearer ${token}`}});if(!r.ok)return null;return r.json();
};
export const verifyHmac=(payload,signature,secret)=>{
  if(!secret||!signature)return false;const expected=crypto.createHmac('sha256',secret).update(payload).digest('hex');
  try{return crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(signature));}catch{return false;}
};
export const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
export const ownedBusiness=async(userId,businessId)=>{
  const rows=await supabaseAdmin(`/rest/v1/business_members?business_id=eq.${encodeURIComponent(businessId)}&user_id=eq.${encodeURIComponent(userId)}&is_active=eq.true&select=role&limit=1`);
  return rows?.[0]||null;
};
export const upsertSubscription=async({businessId,providerSubscriptionId,providerPlanId=null,providerPaymentId=null,interval,currency,amount,status,currentEnd=null,nextChargeAt=null,cancelAtPeriodEnd=false,lastPaymentAt=null,lastEventAt=null,lastEventType=null,graceUntil=null,failureCount=null})=>{
  const body={business_id:businessId,provider:'razorpay',provider_subscription_id:providerSubscriptionId,provider_plan_id:providerPlanId,provider_payment_id:providerPaymentId,plan_interval:interval,currency,amount,status,current_period_end:currentEnd?new Date(currentEnd*1000).toISOString():null,next_charge_at:nextChargeAt?new Date(nextChargeAt*1000).toISOString():null,cancel_at_period_end:!!cancelAtPeriodEnd,last_payment_at:lastPaymentAt?new Date(lastPaymentAt*1000).toISOString():null,last_event_at:lastEventAt?new Date(lastEventAt*1000).toISOString():new Date().toISOString(),last_event_type:lastEventType||null,grace_until:graceUntil?new Date(graceUntil*1000).toISOString():null,updated_at:new Date().toISOString()};
  if(Number.isInteger(failureCount))body.failure_count=failureCount;
  return supabaseAdmin('/rest/v1/business_subscriptions?on_conflict=business_id',{method:'POST',headers:{prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(body)});
};
export async function recordBillingEvent({eventId,businessId=null,subscriptionId=null,paymentId=null,eventType,providerStatus=null,amount=null,currency=null,payloadDigest,occurredAt=null}){
  if(!eventId||!eventType||!payloadDigest)throw new Error('Invalid billing event');
  try{
    const rows=await supabaseAdmin('/rest/v1/billing_events',{method:'POST',body:JSON.stringify({provider_event_id:eventId,business_id:businessId,provider:'razorpay',provider_subscription_id:subscriptionId,provider_payment_id:paymentId,event_type:eventType,provider_status:providerStatus,amount,currency,payload_digest:payloadDigest,occurred_at:occurredAt?new Date(occurredAt*1000).toISOString():null})});
    return {duplicate:false,row:rows?.[0]||null};
  }catch(error){
    if(error.status===409||/duplicate|unique/i.test(error.message||''))return {duplicate:true,row:null};throw error;
  }
}
