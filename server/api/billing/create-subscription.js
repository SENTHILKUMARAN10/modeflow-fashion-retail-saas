import {billingConfigured,catalog,json,ownedBusiness,razorpay,supabaseAdmin,userFromToken,upsertSubscription} from './_lib.js';

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  res.setHeader('cache-control','no-store, max-age=0');
  try{
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(token);if(!user?.id)return json(res,401,{error:'Sign in required'});
    const {businessId,interval='monthly',currency='INR'}=req.body||{},price=catalog[currency]?.[interval];
    if(!businessId||!price)return json(res,400,{error:'Invalid billing selection'});
    const membership=await ownedBusiness(user.id,businessId);if(!membership)return json(res,403,{error:'Business access denied'});
    if(membership.role!=='owner')return json(res,403,{error:'Only the business owner can manage billing'});
    if(!billingConfigured(currency))return json(res,503,{error:`Payment plan ${currency} ${interval} is not configured yet`});

    const current=(await supabaseAdmin(`/rest/v1/business_subscriptions?business_id=eq.${encodeURIComponent(businessId)}&select=provider,provider_subscription_id,plan_interval,currency,status,current_period_end,updated_at&limit=1`))?.[0];
    if(current&&['active','past_due','paused'].includes(current.status)){
      if(current.plan_interval===interval&&current.currency===currency)return json(res,409,{error:'This Salesventory plan is already active',code:'already_subscribed'});
      return json(res,409,{error:'Use Change plan for an existing subscription',code:'change_plan_required'});
    }
    if(current?.provider==='razorpay'&&current?.provider_subscription_id&&['created','authenticated'].includes(current.status)){
      const age=Date.now()-new Date(current.updated_at||0).getTime();
      if(age<30*60*1000){
        const remote=await razorpay(`/subscriptions/${encodeURIComponent(current.provider_subscription_id)}`).catch(()=>null);
        if(remote&&['created','authenticated'].includes(remote.status))return json(res,200,{subscriptionId:remote.id,keyId:process.env.RAZORPAY_KEY_ID,label:price.label,resumed:true});
      }else{
        await razorpay(`/subscriptions/${encodeURIComponent(current.provider_subscription_id)}/cancel`,{method:'POST'}).catch(()=>null);
      }
    }

    const planId=process.env[price.env];
    const subscription=await razorpay('/subscriptions',{method:'POST',body:JSON.stringify({plan_id:planId,total_count:interval==='monthly'?120:10,customer_notify:1,notes:{business_id:businessId,user_id:user.id,plan_interval:interval,currency,amount:String(price.amount),product:'Salesventory'}})});
    await upsertSubscription({businessId,providerSubscriptionId:subscription.id,providerPlanId:planId,interval,currency,amount:price.amount,status:'created',currentEnd:subscription.current_end,nextChargeAt:subscription.charge_at,lastEventType:'checkout.created'});
    return json(res,200,{subscriptionId:subscription.id,keyId:process.env.RAZORPAY_KEY_ID,label:price.label});
  }catch(error){console.error('create subscription failed',error);return json(res,error.status&&error.status<500?error.status:500,{error:error.message||'Unable to start payment'});}
}
