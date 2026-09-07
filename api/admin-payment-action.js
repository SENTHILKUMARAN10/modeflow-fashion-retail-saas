import {json,supabaseAdmin,userFromToken} from './billing/_lib.js';

function isAdmin(user){
  const allowed=(process.env.MODEFLOW_ADMIN_EMAILS||'')
    .split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
  return !!user?.email && allowed.includes(String(user.email).toLowerCase());
}

export default async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  try{
    const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(token);
    if(!user?.id) return json(res,401,{error:'Sign in required'});
    if(!(process.env.MODEFLOW_ADMIN_EMAILS||'').trim()) return json(res,503,{error:'Admin access is not configured yet'});
    if(!isAdmin(user)) return json(res,403,{error:'Admin access required'});

    const {businessId,action}=req.body||{};
    if(!businessId||!['approve','reject'].includes(action)) return json(res,400,{error:'Invalid admin action'});

    const rows=await supabaseAdmin(`/rest/v1/business_subscriptions?business_id=eq.${encodeURIComponent(businessId)}&select=business_id,plan_interval,status`);
    const current=rows?.[0];
    if(!current) return json(res,404,{error:'Payment request not found'});
    if(current.status!=='pending_verification') return json(res,409,{error:`Payment is already ${current.status}`});

    const update={status:action==='approve'?'active':'rejected',updated_at:new Date().toISOString()};
    if(action==='approve'){
      const end=new Date();
      if(current.plan_interval==='annual') end.setFullYear(end.getFullYear()+1);
      else end.setMonth(end.getMonth()+1);
      update.current_period_end=end.toISOString();
    }

    const result=await supabaseAdmin(`/rest/v1/business_subscriptions?business_id=eq.${encodeURIComponent(businessId)}`,{
      method:'PATCH',
      headers:{prefer:'return=representation'},
      body:JSON.stringify(update)
    });
    return json(res,200,{ok:true,payment:result?.[0]||update});
  }catch(err){
    console.error(err);
    return json(res,500,{error:err.message||'Unable to update payment'});
  }
}
