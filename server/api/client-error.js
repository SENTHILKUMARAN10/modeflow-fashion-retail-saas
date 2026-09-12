import {json,supabaseAdmin,userFromToken} from './billing/_lib.js';

const clip=(value,max)=>String(value??'').slice(0,max);

export default async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  res.setHeader('cache-control','no-store, max-age=0');
  try{
    const length=Number(req.headers['content-length']||0);
    if(length>32768) return json(res,413,{error:'Payload too large'});
    const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(token);
    if(!user?.id) return json(res,401,{error:'Sign in required'});

    const body=req.body||{};
    const businessId=body.businessId||null;
    if(businessId){
      const membership=await supabaseAdmin(`/rest/v1/business_members?business_id=eq.${encodeURIComponent(businessId)}&user_id=eq.${encodeURIComponent(user.id)}&select=business_id&limit=1`);
      if(!membership?.length) return json(res,403,{error:'Business access denied'});
    }

    const record={
      business_id:businessId,
      user_id:user.id,
      source:clip(body.source||'web',40),
      message:clip(body.message||'Unknown client error',1000),
      stack:clip(body.stack||'',5000)||null,
      context:{
        path:clip(body.context?.path||'',300),
        view:clip(body.context?.view||'',80),
        userAgent:clip(body.context?.userAgent||'',500),
        online:body.context?.online!==false,
        build:clip(body.context?.build||'',80)
      }
    };

    try{
      await supabaseAdmin('/rest/v1/app_error_logs',{method:'POST',headers:{prefer:'return=minimal'},body:JSON.stringify(record)});
    }catch(error){
      // Keep production errors visible in Vercel logs even before the telemetry migration is applied.
      console.error('Salesventory client error telemetry fallback',record,error);
    }
    return json(res,202,{ok:true});
  }catch(error){
    console.error('client-error endpoint failed',error);
    return json(res,500,{error:'Unable to record error'});
  }
}
