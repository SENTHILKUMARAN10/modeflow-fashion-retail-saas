import {json,supabaseAdmin,userFromToken} from '../billing/_lib.js';

const roles=new Set(['admin','manager','accountant','cashier','sales','staff']);
const clean=value=>String(value||'').trim();

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  try{
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(token);if(!user?.id)return json(res,401,{error:'Sign in required'});
    const {businessId,targetUserId,role,displayName,jobTitle,isActive=true,branchIds=[]}=req.body||{};
    if(!businessId||!targetUserId||!roles.has(role)||!Array.isArray(branchIds))return json(res,400,{error:'Invalid team update'});
    const actors=await supabaseAdmin(`/rest/v1/business_members?business_id=eq.${encodeURIComponent(businessId)}&user_id=eq.${encodeURIComponent(user.id)}&is_active=eq.true&select=role`),actor=actors?.[0];
    if(!actor||!['owner','admin'].includes(actor.role))return json(res,403,{error:'Owner or admin access required'});
    const targets=await supabaseAdmin(`/rest/v1/business_members?business_id=eq.${encodeURIComponent(businessId)}&user_id=eq.${encodeURIComponent(targetUserId)}&select=role`),target=targets?.[0];
    if(!target)return json(res,404,{error:'Team member not found'});
    if(target.role==='owner')return json(res,403,{error:'The owner role cannot be changed here'});
    if(actor.role==='admin'&&(target.role==='admin'||role==='admin'))return json(res,403,{error:'Only the owner can manage admin access'});
    if(branchIds.length){
      const ids=[...new Set(branchIds.map(String))];
      const rows=await supabaseAdmin(`/rest/v1/branches?business_id=eq.${encodeURIComponent(businessId)}&id=in.(${ids.map(encodeURIComponent).join(',')})&select=id`);
      if((rows||[]).length!==ids.length)return json(res,400,{error:'One or more branch assignments are invalid'});
    }
    await supabaseAdmin(`/rest/v1/business_members?business_id=eq.${encodeURIComponent(businessId)}&user_id=eq.${encodeURIComponent(targetUserId)}`,{method:'PATCH',headers:{prefer:'return=minimal'},body:JSON.stringify({role,display_name:clean(displayName)||null,job_title:clean(jobTitle)||null,is_active:Boolean(isActive),updated_at:new Date().toISOString()})});
    await supabaseAdmin(`/rest/v1/business_member_branches?business_id=eq.${encodeURIComponent(businessId)}&user_id=eq.${encodeURIComponent(targetUserId)}`,{method:'DELETE',headers:{prefer:'return=minimal'}});
    if(branchIds.length)await supabaseAdmin('/rest/v1/business_member_branches',{method:'POST',headers:{prefer:'return=minimal'},body:JSON.stringify([...new Set(branchIds.map(String))].map(branch_id=>({business_id:businessId,user_id:targetUserId,branch_id})))});
    return json(res,200,{ok:true});
  }catch(error){console.error('team update failed',error);return json(res,500,{error:error.message||'Unable to update team member'});}
}
