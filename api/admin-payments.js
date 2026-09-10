import {json,supabaseAdmin,userFromToken} from './billing/_lib.js';

const adminConfig=()=>process.env.SALES_DESK_ADMIN_EMAILS||process.env.MODEFLOW_ADMIN_EMAILS||'';
function isAdmin(user){
  const allowed=adminConfig().split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
  return !!user?.email && allowed.includes(String(user.email).toLowerCase());
}

export default async function handler(req,res){
  if(req.method!=='GET') return json(res,405,{error:'Method not allowed'});
  res.setHeader('cache-control','no-store, max-age=0');
  try{
    const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(token);
    if(!user?.id) return json(res,401,{error:'Sign in required'});
    if(!adminConfig().trim()) return json(res,503,{error:'Admin access is not configured yet'});
    if(!isAdmin(user)) return json(res,403,{error:'Admin access required'});

    const rows=await supabaseAdmin('/rest/v1/business_subscriptions?select=business_id,provider,provider_subscription_id,plan_interval,currency,amount,status,current_period_end,updated_at,businesses(name)&order=updated_at.desc');
    return json(res,200,{payments:rows||[]});
  }catch(err){
    console.error(err);
    return json(res,500,{error:err.message||'Unable to load payments'});
  }
}
