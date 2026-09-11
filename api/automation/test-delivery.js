import crypto from 'node:crypto';
import {json,supabaseAdmin,userFromToken} from '../billing/_lib.js';
import {deliverMessage} from './_delivery.js';

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  try{
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(token);
    if(!user?.id)return json(res,401,{error:'Sign in required'});
    const {businessId,channel='in_app',destination,templateName,templateLanguage='en_US'}=req.body||{};
    if(!businessId||!['in_app','email','whatsapp'].includes(channel))return json(res,400,{error:'Invalid delivery test'});
    const membership=await supabaseAdmin(`/rest/v1/business_members?business_id=eq.${encodeURIComponent(businessId)}&user_id=eq.${encodeURIComponent(user.id)}&is_active=eq.true&select=role&limit=1`);
    if(!membership?.length||!['owner','admin','manager'].includes(membership[0].role))return json(res,403,{error:'Automation manager access required'});
    const business=(await supabaseAdmin(`/rest/v1/businesses?id=eq.${encodeURIComponent(businessId)}&select=name,email,phone&limit=1`))?.[0]||{};
    const to=destination||(channel==='email'?business.email:channel==='whatsapp'?business.phone:null);
    const key=`test:${crypto.randomUUID()}`;
    const result=await deliverMessage({businessId,sourceType:'delivery_test',channel,destination:to,kind:'delivery_test',subject:'SalesDesk delivery test',message:`SalesDesk delivery is connected for ${business.name||'your business'}.`,dedupeKey:key,templateName,templateLanguage,templateParams:[business.name||'your business','SalesDesk delivery test'],payload:{severity:'success'}});
    return json(res,200,{ok:true,status:result.status});
  }catch(error){console.error('delivery test failed',error);return json(res,500,{error:error.message||'Delivery test failed'});}
}
