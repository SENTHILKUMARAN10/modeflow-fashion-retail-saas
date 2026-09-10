import crypto from 'node:crypto';
import {json,supabaseAdmin,userFromToken} from '../billing/_lib.js';

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  try{
    const auth=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(auth);
    if(!user?.id||!user?.email)return json(res,401,{error:'Sign in with the invited email first'});
    const raw=String(req.body?.token||'').trim();
    if(raw.length<20)return json(res,400,{error:'Invalid invitation token'});
    const hash=crypto.createHash('sha256').update(raw).digest('hex');
    const rows=await supabaseAdmin(`/rest/v1/team_invitations?token_hash=eq.${encodeURIComponent(hash)}&select=id,business_id,email,role,expires_at,accepted_at&limit=1`);
    const invite=rows?.[0];
    if(!invite)return json(res,404,{error:'Invitation not found or already removed'});
    if(invite.accepted_at)return json(res,409,{error:'This invitation has already been used'});
    if(new Date(invite.expires_at).getTime()<Date.now())return json(res,410,{error:'This invitation has expired'});
    if(String(invite.email).trim().toLowerCase()!==String(user.email).trim().toLowerCase())return json(res,403,{error:'Sign in using the email address that received this invitation'});
    await supabaseAdmin('/rest/v1/business_members?on_conflict=business_id,user_id',{method:'POST',headers:{prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({business_id:invite.business_id,user_id:user.id,role:invite.role})});
    await supabaseAdmin(`/rest/v1/team_invitations?id=eq.${encodeURIComponent(invite.id)}&accepted_at=is.null`,{method:'PATCH',headers:{prefer:'return=minimal'},body:JSON.stringify({accepted_at:new Date().toISOString()})});
    return json(res,200,{ok:true,businessId:invite.business_id,role:invite.role});
  }catch(error){console.error('team invitation acceptance failed',error);return json(res,500,{error:error.message||'Unable to accept team invitation'});}
}
