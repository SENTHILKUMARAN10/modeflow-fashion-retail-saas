import {json,supabaseAdmin,userFromToken} from '../billing/_lib.js';

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  try{
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(token);if(!user?.id)return json(res,401,{error:'Sign in required'});
    const {businessId,invitationId}=req.body||{};if(!businessId||!invitationId)return json(res,400,{error:'Invitation is required'});
    const actors=await supabaseAdmin(`/rest/v1/business_members?business_id=eq.${encodeURIComponent(businessId)}&user_id=eq.${encodeURIComponent(user.id)}&is_active=eq.true&select=role`),actor=actors?.[0];
    if(!actor||!['owner','admin'].includes(actor.role))return json(res,403,{error:'Owner or admin access required'});
    const invitations=await supabaseAdmin(`/rest/v1/team_invitations?id=eq.${encodeURIComponent(invitationId)}&business_id=eq.${encodeURIComponent(businessId)}&accepted_at=is.null&select=id,role`),invite=invitations?.[0];
    if(!invite)return json(res,404,{error:'Pending invitation not found'});
    if(actor.role==='admin'&&invite.role==='admin')return json(res,403,{error:'Only the owner can revoke an admin invitation'});
    await supabaseAdmin(`/rest/v1/team_invitations?id=eq.${encodeURIComponent(invitationId)}&business_id=eq.${encodeURIComponent(businessId)}`,{method:'DELETE',headers:{prefer:'return=minimal'}});
    return json(res,200,{ok:true});
  }catch(error){console.error('invite revoke failed',error);return json(res,500,{error:error.message||'Unable to revoke invitation'});}
}
