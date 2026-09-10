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
    const {businessId,role='staff'}=req.body||{},email=cleanEmail(req.body?.email);
    if(!businessId||!email||!email.includes('@')||!roles.has(role))return json(res,400,{error:'Enter a valid email and team role'});
    const membership=await supabaseAdmin(`/rest/v1/business_members?business_id=eq.${encodeURIComponent(businessId)}&user_id=eq.${encodeURIComponent(user.id)}&select=role`);
    if(!membership?.length||!['owner','admin'].includes(membership[0].role))return json(res,403,{error:'Only the owner or an admin can invite team members'});
    const raw=crypto.randomBytes(32).toString('base64url');
    const hash=crypto.createHash('sha256').update(raw).digest('hex');
    const expires=new Date(Date.now()+7*24*60*60*1000).toISOString();
    await supabaseAdmin('/rest/v1/team_invitations',{method:'POST',headers:{prefer:'return=minimal'},body:JSON.stringify({business_id:businessId,email,role,token_hash:hash,expires_at:expires,invited_by:user.id})});
    const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0],host=req.headers['x-forwarded-host']||req.headers.host;
    const origin=process.env.PUBLIC_APP_URL||`${proto}://${host}`;
    return json(res,200,{ok:true,inviteUrl:`${origin.replace(/\/$/,'')}/?invite=${encodeURIComponent(raw)}`,expiresAt:expires,role});
  }catch(error){console.error('team invite failed',error);return json(res,500,{error:error.message||'Unable to create team invitation'});}
}
