import {json,supabaseAdmin,userFromToken} from '../billing/_lib.js';

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  try{
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(token);if(!user?.id)return json(res,401,{error:'Sign in required'});
    const {businessId,targetUserId}=req.body||{};if(!businessId||!targetUserId)return json(res,400,{error:'Business and team member are required'});
    const actors=await supabaseAdmin(`/rest/v1/business_members?business_id=eq.${encodeURIComponent(businessId)}&user_id=eq.${encodeURIComponent(user.id)}&is_active=eq.true&select=role`),actor=actors?.[0];
    if(!actor||!['owner','admin'].includes(actor.role))return json(res,403,{error:'Owner or admin access required'});
    const targets=await supabaseAdmin(`/rest/v1/business_members?business_id=eq.${encodeURIComponent(businessId)}&user_id=eq.${encodeURIComponent(targetUserId)}&select=role`),target=targets?.[0];
    if(!target)return json(res,404,{error:'Team member not found'});
    if(target.role==='owner')return json(res,403,{error:'The business owner cannot be removed'});
    if(actor.role==='admin'&&target.role==='admin')return json(res,403,{error:'Only the owner can remove another admin'});
    await supabaseAdmin(`/rest/v1/business_members?business_id=eq.${encodeURIComponent(businessId)}&user_id=eq.${encodeURIComponent(targetUserId)}`,{method:'PATCH',headers:{prefer:'return=minimal'},body:JSON.stringify({is_active:false,updated_at:new Date().toISOString()})});
    return json(res,200,{ok:true});
  }catch(error){console.error('team removal failed',error);return json(res,500,{error:error.message||'Unable to deactivate team member'});}
}
