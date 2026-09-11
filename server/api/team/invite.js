import crypto from 'node:crypto';
import {json,supabaseAdmin,userFromToken} from '../billing/_lib.js';

const cleanEmail=value=>String(value||'').trim().toLowerCase();
const roles=new Set(['admin','manager','accountant','cashier','sales','staff']);

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  try{
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(token);
    if(!user?.id)return json(res,401,{error:'Sign in required'});
    const {businessId,role='staff'}=req.body||{},email=cleanEmail(req.body?.email),branchIds=Array.isArray(req.body?.branchIds)?[...new Set(req.body.branchIds.map(String))]:[];
    if(!businessId||!email||!email.includes('@')||!roles.has(role))return json(res,400,{error:'Enter a valid email and team role'});
    const membership=await supabaseAdmin(`/rest/v1/business_members?business_id=eq.${encodeURIComponent(businessId)}&user_id=eq.${encodeURIComponent(user.id)}&is_active=eq.true&select=role`),actor=membership?.[0];
    if(!actor||!['owner','admin'].includes(actor.role))return json(res,403,{error:'Only the owner or an admin can invite team members'});
    if(actor.role==='admin'&&role==='admin')return json(res,403,{error:'Only the owner can invite another admin'});
    if(branchIds.length){
      const rows=await supabaseAdmin(`/rest/v1/branches?business_id=eq.${encodeURIComponent(businessId)}&id=in.(${branchIds.map(encodeURIComponent).join(',')})&select=id`);
      if((rows||[]).length!==branchIds.length)return json(res,400,{error:'One or more selected branches are invalid'});
    }
    const existing=await supabaseAdmin(`/rest/v1/team_invitations?business_id=eq.${encodeURIComponent(businessId)}&email=eq.${encodeURIComponent(email)}&accepted_at=is.null&select=id`);
    if(existing?.length)await supabaseAdmin(`/rest/v1/team_invitations?id=eq.${encodeURIComponent(existing[0].id)}`,{method:'DELETE',headers:{prefer:'return=minimal'}});
    const raw=crypto.randomBytes(32).toString('base64url'),hash=crypto.createHash('sha256').update(raw).digest('hex'),expires=new Date(Date.now()+7*24*60*60*1000).toISOString();
    await supabaseAdmin('/rest/v1/team_invitations',{method:'POST',headers:{prefer:'return=minimal'},body:JSON.stringify({business_id:businessId,email,role,branch_ids:branchIds,token_hash:hash,expires_at:expires,invited_by:user.id})});
    const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0],host=req.headers['x-forwarded-host']||req.headers.host,origin=process.env.PUBLIC_APP_URL||`${proto}://${host}`;
    return json(res,200,{ok:true,inviteUrl:`${origin.replace(/\/$/,'')}/?invite=${encodeURIComponent(raw)}`,expiresAt:expires,role,branchIds});
  }catch(error){console.error('team invite failed',error);return json(res,500,{error:error.message||'Unable to create team invitation'});}
}
