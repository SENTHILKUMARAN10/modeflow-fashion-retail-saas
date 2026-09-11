import {json,supabaseAdmin,userFromToken} from '../billing/_lib.js';
import {deliveryConfig} from './_delivery.js';

export default async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  res.setHeader('cache-control','no-store, max-age=0');
  try{
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(token);
    if(!user?.id)return json(res,401,{error:'Sign in required'});
    const businessId=String(req.query?.businessId||'').trim();
    if(!businessId)return json(res,400,{error:'Business is required'});
    const rows=await supabaseAdmin(`/rest/v1/business_members?business_id=eq.${encodeURIComponent(businessId)}&user_id=eq.${encodeURIComponent(user.id)}&is_active=eq.true&select=role&limit=1`);
    if(!rows?.length)return json(res,403,{error:'Business access denied'});
    return json(res,200,{...deliveryConfig(),role:rows[0].role,whatsappRequiresApprovedTemplate:true});
  }catch(error){console.error('automation status failed',error);return json(res,500,{error:'Unable to load automation status'});}
}
