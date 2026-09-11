import {supabaseAdmin} from '../billing/_lib.js';

const q=v=>encodeURIComponent(v);
const trim=v=>String(v||'').trim();
const digits=v=>trim(v).replace(/[^0-9]/g,'');

export const deliveryConfig=()=>({
  emailConfigured:!!(process.env.RESEND_API_KEY&&process.env.SALESDESK_EMAIL_FROM),
  whatsappConfigured:!!(process.env.WHATSAPP_ACCESS_TOKEN&&process.env.WHATSAPP_PHONE_NUMBER_ID&&process.env.WHATSAPP_GRAPH_VERSION),
  schedulerConfigured:!!process.env.CRON_SECRET
});

async function providerJson(url,options={}){
  const r=await fetch(url,options);
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data?.message||data?.error?.message||data?.error||`Delivery provider failed (${r.status})`);
  return data;
}

async function sendEmail({to,subject,text,html,dedupeKey}){
  if(!deliveryConfig().emailConfigured)throw new Error('Email delivery is not configured');
  if(!trim(to).includes('@'))throw new Error('A valid recipient email is required');
  const data=await providerJson('https://api.resend.com/emails',{
    method:'POST',
    headers:{authorization:`Bearer ${process.env.RESEND_API_KEY}`,'content-type':'application/json','Idempotency-Key':`salesdesk-${dedupeKey}`.slice(0,256)},
    body:JSON.stringify({from:process.env.SALESDESK_EMAIL_FROM,to:[trim(to).toLowerCase()],subject:trim(subject)||'SalesDesk notification',text:trim(text),html:html||undefined})
  });
  return data?.id||null;
}

async function sendWhatsApp({to,templateName,templateLanguage='en_US',templateParams=[]}){
  if(!deliveryConfig().whatsappConfigured)throw new Error('WhatsApp delivery is not configured');
  const phone=digits(to);if(phone.length<8||phone.length>15)throw new Error('A valid WhatsApp number with country code is required');
  if(!trim(templateName))throw new Error('An approved WhatsApp template is required for scheduled messages');
  const parameters=(Array.isArray(templateParams)?templateParams:[]).slice(0,10).map(v=>({type:'text',text:String(v??'').slice(0,1024)}));
  const template={name:trim(templateName),language:{code:trim(templateLanguage)||'en_US'}};
  if(parameters.length)template.components=[{type:'body',parameters}];
  const version=trim(process.env.WHATSAPP_GRAPH_VERSION);
  const url=`https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(process.env.WHATSAPP_PHONE_NUMBER_ID)}/messages`;
  const data=await providerJson(url,{method:'POST',headers:{authorization:`Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,'content-type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:phone,type:'template',template})});
  return data?.messages?.[0]?.id||null;
}

async function existingDelivery(businessId,dedupeKey){
  const rows=await supabaseAdmin(`/rest/v1/automation_deliveries?business_id=eq.${q(businessId)}&dedupe_key=eq.${q(dedupeKey)}&select=id,status,attempt_count&limit=1`);
  return rows?.[0]||null;
}
async function patchDelivery(id,body){return supabaseAdmin(`/rest/v1/automation_deliveries?id=eq.${q(id)}`,{method:'PATCH',headers:{prefer:'return=minimal'},body:JSON.stringify(body)});}

export async function deliverMessage({businessId,ruleId=null,sourceType='automation',sourceId=null,channel='in_app',destination=null,kind='automation',subject='SalesDesk',message,dedupeKey,actionUrl=null,templateName=null,templateLanguage='en_US',templateParams=[],payload={}}){
  if(!businessId||!dedupeKey||!trim(message))throw new Error('Invalid delivery request');
  const previous=await existingDelivery(businessId,dedupeKey);
  if(previous&&['sending','sent','skipped'].includes(previous.status))return {status:'skipped',deduped:true,id:previous.id};
  let rowId=previous?.id||null;
  if(previous){
    await patchDelivery(previous.id,{status:'sending',attempt_count:Number(previous.attempt_count||0)+1,error_message:null,updated_at:new Date().toISOString()});
  }else{
    const rows=await supabaseAdmin('/rest/v1/automation_deliveries',{method:'POST',body:JSON.stringify({business_id:businessId,rule_id:ruleId,source_type:sourceType,source_id:sourceId,channel,destination:destination||null,kind,subject:subject||null,message,dedupe_key:dedupeKey,status:'sending',payload})});
    rowId=rows?.[0]?.id;
  }
  try{
    let providerMessageId=null;
    if(channel==='in_app'){
      const n=await supabaseAdmin(`/rest/v1/business_notifications?business_id=eq.${q(businessId)}&dedupe_key=eq.${q(dedupeKey)}&select=id&limit=1`);
      if(!n?.length)await supabaseAdmin('/rest/v1/business_notifications',{method:'POST',headers:{prefer:'return=minimal'},body:JSON.stringify({business_id:businessId,kind,title:subject||'SalesDesk',message,severity:payload?.severity||'info',action_url:actionUrl||null,dedupe_key:dedupeKey})});
    }else if(channel==='email')providerMessageId=await sendEmail({to:destination,subject,text:message,html:payload?.html,dedupeKey});
    else if(channel==='whatsapp')providerMessageId=await sendWhatsApp({to:destination,templateName,templateLanguage,templateParams});
    else throw new Error('Unsupported delivery channel');
    if(rowId)await patchDelivery(rowId,{status:'sent',provider_message_id:providerMessageId,sent_at:new Date().toISOString(),error_message:null});
    return {status:'sent',id:rowId,providerMessageId};
  }catch(error){
    if(rowId)await patchDelivery(rowId,{status:'failed',error_message:String(error.message||error).slice(0,1000)}).catch(()=>{});
    throw error;
  }
}
