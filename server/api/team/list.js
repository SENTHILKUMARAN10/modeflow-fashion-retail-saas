import {json,supabaseAdmin,userFromToken} from '../billing/_lib.js';

const getAuthUser=async id=>{
  try{return await supabaseAdmin(`/auth/v1/admin/users/${encodeURIComponent(id)}`);}catch{return null;}
};

export default async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  try{
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(token);
    if(!user?.id)return json(res,401,{error:'Sign in required'});
    const businessId=String(req.query?.businessId||'').trim();
    if(!businessId)return json(res,400,{error:'Business is required'});
    const actorRows=await supabaseAdmin(`/rest/v1/business_members?business_id=eq.${encodeURIComponent(businessId)}&user_id=eq.${encodeURIComponent(user.id)}&is_active=eq.true&select=role`);
    const actor=actorRows?.[0];if(!actor)return json(res,403,{error:'Business access denied'});
    const members=await supabaseAdmin(`/rest/v1/business_members?business_id=eq.${encodeURIComponent(businessId)}&select=user_id,role,display_name,job_title,is_active,created_at,updated_at&order=created_at.asc`);
    const branches=await supabaseAdmin(`/rest/v1/branches?business_id=eq.${encodeURIComponent(businessId)}&is_active=eq.true&select=id,name,code&order=name.asc`);
    const assignments=await supabaseAdmin(`/rest/v1/business_member_branches?business_id=eq.${encodeURIComponent(businessId)}&select=user_id,branch_id`);
    const branchMap=new Map();for(const row of assignments||[]){if(!branchMap.has(row.user_id))branchMap.set(row.user_id,[]);branchMap.get(row.user_id).push(row.branch_id);}
    const enriched=await Promise.all((members||[]).map(async m=>{const authUser=await getAuthUser(m.user_id);return{...m,email:authUser?.email||null,name:m.display_name||authUser?.user_metadata?.full_name||authUser?.user_metadata?.name||null,branch_ids:branchMap.get(m.user_id)||[]};}));
    let invitations=[];
    if(['owner','admin'].includes(actor.role))invitations=await supabaseAdmin(`/rest/v1/team_invitations?business_id=eq.${encodeURIComponent(businessId)}&accepted_at=is.null&select=id,email,role,branch_ids,expires_at,created_at&order=created_at.desc`);
    return json(res,200,{members:enriched,branches:branches||[],invitations:invitations||[],actorRole:actor.role});
  }catch(error){console.error('team list failed',error);return json(res,500,{error:error.message||'Unable to load team'});}
}
