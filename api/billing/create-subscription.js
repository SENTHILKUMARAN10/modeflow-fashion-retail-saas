import {catalog,json,razorpay,supabaseAdmin,userFromToken} from './_lib.js';

export default async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  try{
    const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(token);
    if(!user?.id) return json(res,401,{error:'Sign in required'});
    const {businessId,interval='monthly',currency='INR'}=req.body||{};
    const price=catalog[currency]?.[interval];
    if(!businessId||!price) return json(res,400,{error:'Invalid billing selection'});
    const memberships=await supabaseAdmin(`/rest/v1/business_members?business_id=eq.${encodeURIComponent(businessId)}&user_id=eq.${encodeURIComponent(user.id)}&select=role`);
    if(!memberships?.length) return json(res,403,{error:'Business access denied'});
    if(memberships[0].role!=='owner') return json(res,403,{error:'Only the business owner can manage billing'});
    const planId=process.env[price.env];
    if(!planId) return json(res,503,{error:`Payment plan ${currency} ${interval} is not configured yet`});
    const subscription=await razorpay('/subscriptions',{method:'POST',body:JSON.stringify({plan_id:planId,total_count:interval==='monthly'?120:10,customer_notify:1,notes:{business_id:businessId,user_id:user.id,plan_interval:interval,currency,amount:String(price.amount)}})});
    await supabaseAdmin('/rest/v1/business_subscriptions?on_conflict=business_id',{method:'POST',headers:{prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({business_id:businessId,provider:'razorpay',provider_subscription_id:subscription.id,plan_interval:interval,currency,amount:price.amount,status:'created',updated_at:new Date().toISOString()})});
    return json(res,200,{subscriptionId:subscription.id,keyId:process.env.RAZORPAY_KEY_ID,label:price.label});
  }catch(err){console.error(err);return json(res,500,{error:err.message||'Unable to start payment'});}
}
