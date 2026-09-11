import {json,supabaseAdmin,userFromToken} from './billing/_lib.js';

export default async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  try{
    const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(token);
    if(!user?.id) return json(res,401,{error:'Sign in required'});

    const {businessId,interval='monthly',currency='INR',amount,utr}=req.body||{};
    const cleanUtr=String(utr||'').trim();
    if(!businessId||!['monthly','annual'].includes(interval)||currency!=='INR') return json(res,400,{error:'Invalid payment selection'});
    if(!/^\d{6,22}$/.test(cleanUtr)) return json(res,400,{error:'Enter a valid UPI transaction/reference number'});

    const memberships=await supabaseAdmin(`/rest/v1/business_members?business_id=eq.${encodeURIComponent(businessId)}&user_id=eq.${encodeURIComponent(user.id)}&select=role`);
    if(!memberships?.length) return json(res,403,{error:'Business access denied'});
    if(memberships[0].role!=='owner') return json(res,403,{error:'Only the business owner can manage billing'});

    const expectedAmount=interval==='monthly'?399:3990;
    if(Number(amount)!==expectedAmount) return json(res,400,{error:'Payment amount does not match selected plan'});

    const body={
      business_id:businessId,
      provider:'upi_manual',
      provider_subscription_id:`UPI:${cleanUtr}`,
      plan_interval:interval,
      currency:'INR',
      amount:expectedAmount,
      status:'pending_verification',
      updated_at:new Date().toISOString()
    };
    await supabaseAdmin('/rest/v1/business_subscriptions?on_conflict=business_id',{
      method:'POST',
      headers:{prefer:'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify(body)
    });
    return json(res,200,{ok:true,status:'pending_verification'});
  }catch(err){
    console.error(err);
    return json(res,500,{error:err.message||'Unable to submit payment for verification'});
  }
}
