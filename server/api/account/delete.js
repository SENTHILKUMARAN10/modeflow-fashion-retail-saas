import {json,supabaseAdmin,userFromToken} from '../billing/_lib.js';

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  try{
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(token);
    if(!user?.id)return json(res,401,{error:'Sign in required'});
    if(req.body?.confirmation!=='DELETE MY ACCOUNT')return json(res,400,{error:'Type DELETE MY ACCOUNT to confirm permanent deletion'});
    const owned=await supabaseAdmin(`/rest/v1/business_members?user_id=eq.${encodeURIComponent(user.id)}&role=eq.owner&select=business_id`);
    for(const row of owned||[]){
      const members=await supabaseAdmin(`/rest/v1/business_members?business_id=eq.${encodeURIComponent(row.business_id)}&select=user_id&limit=2`);
      if((members||[]).some(m=>m.user_id!==user.id))return json(res,409,{error:'This account owns a business with other team members. Transfer ownership or remove the team before deleting the account.'});
    }
    await supabaseAdmin(`/auth/v1/admin/users/${encodeURIComponent(user.id)}`,{method:'DELETE'});
    return json(res,200,{ok:true});
  }catch(error){console.error('account deletion failed',error);return json(res,500,{error:error.message||'Unable to delete account'});}
}
