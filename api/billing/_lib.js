import crypto from 'node:crypto';

export const catalog={
  INR:{monthly:{amount:399,label:'₹399 / month',env:'RAZORPAY_PLAN_INR_MONTHLY'},annual:{amount:3990,label:'₹3,990 / year',env:'RAZORPAY_PLAN_INR_ANNUAL'}},
  USD:{monthly:{amount:4.99,label:'$4.99 / month',env:'RAZORPAY_PLAN_USD_MONTHLY'},annual:{amount:49.99,label:'$49.99 / year',env:'RAZORPAY_PLAN_USD_ANNUAL'}}
};
export const json=(res,status,body)=>{res.statusCode=status;res.setHeader('content-type','application/json');res.end(JSON.stringify(body));};
export const basic=()=>`Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`;
export const razorpay=async(path,options={})=>{
  const r=await fetch(`https://api.razorpay.com/v1${path}`,{...options,headers:{authorization:basic(),'content-type':'application/json',...(options.headers||{})}});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data?.error?.description||'Payment provider request failed');
  return data;
};
export const supabaseAdmin=async(path,options={})=>{
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY,url=process.env.SUPABASE_URL;
  const r=await fetch(`${url}${path}`,{...options,headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json',prefer:'return=representation',...(options.headers||{})}});
  const data=await r.json().catch(()=>null);
  if(!r.ok) throw new Error(data?.message||data?.error_description||'Database request failed');
  return data;
};
export const userFromToken=async token=>{
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,authorization:`Bearer ${token}`}});
  if(!r.ok) return null;
  return r.json();
};
export const verifyHmac=(payload,signature,secret)=>{
  const expected=crypto.createHmac('sha256',secret).update(payload).digest('hex');
  try{return crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(signature||''));}catch{return false;}
};
export const upsertSubscription=async({businessId,providerSubscriptionId,interval,currency,amount,status,currentEnd})=>{
  const body={business_id:businessId,provider:'razorpay',provider_subscription_id:providerSubscriptionId,plan_interval:interval,currency,amount,status,current_period_end:currentEnd?new Date(currentEnd*1000).toISOString():null,updated_at:new Date().toISOString()};
  return supabaseAdmin('/rest/v1/business_subscriptions?on_conflict=business_id',{method:'POST',headers:{prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(body)});
};
