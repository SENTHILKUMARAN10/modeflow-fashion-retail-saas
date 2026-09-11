// SalesDesk staging E2E smoke verifier.
// Read-only by default. Writes require explicit staging-only opt-in.
// Required: BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SALESDESK_E2E_EMAIL, SALESDESK_E2E_PASSWORD.
// Optional writes: SALESDESK_E2E_WRITES=true, SALESDESK_E2E_ENV=staging,
// SALESDESK_E2E_BUSINESS_ID, SALESDESK_E2E_PRODUCT_ID.

const need=['BASE_URL','SUPABASE_URL','SUPABASE_ANON_KEY','SALESDESK_E2E_EMAIL','SALESDESK_E2E_PASSWORD'];
for(const k of need)if(!process.env[k]){console.error(`Missing ${k}`);process.exit(2);}
const app=process.env.BASE_URL.replace(/\/$/,'');const sb=process.env.SUPABASE_URL.replace(/\/$/,'');const anon=process.env.SUPABASE_ANON_KEY;
const writes=process.env.SALESDESK_E2E_WRITES==='true';
if(writes&&process.env.SALESDESK_E2E_ENV!=='staging'){console.error('Write-mode E2E is permitted only when SALESDESK_E2E_ENV=staging.');process.exit(2);}
if(writes&&(!process.env.SALESDESK_E2E_BUSINESS_ID||!process.env.SALESDESK_E2E_PRODUCT_ID)){console.error('Write-mode E2E requires dedicated staging business/product IDs.');process.exit(2);}
const pass=m=>console.log('PASS:',m);const fail=(m,d)=>{console.error('FAIL:',m,d??'');process.exitCode=1;};
async function http(url,options={}){const r=await fetch(url,options);const text=await r.text();let body;try{body=text?JSON.parse(text):null}catch{body=text}return{ok:r.ok,status:r.status,body,headers:r.headers};}
async function signIn(){const r=await http(`${sb}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:anon,'content-type':'application/json'},body:JSON.stringify({email:process.env.SALESDESK_E2E_EMAIL,password:process.env.SALESDESK_E2E_PASSWORD})});if(!r.ok||!r.body?.access_token)throw new Error(`Sign-in failed (${r.status})`);return r.body.access_token;}
async function rest(token,path,options={}){return http(`${sb}/rest/v1/${path}`,{...options,headers:{apikey:anon,authorization:`Bearer ${token}`,'content-type':'application/json',...(options.headers||{})}});}
async function rpc(token,name,body){return rest(token,`rpc/${name}`,{method:'POST',body:JSON.stringify(body)});}
function assertOk(r,label){if(r.ok)pass(label);else fail(`${label} (${r.status})`,r.body);}
try{
 const landing=await http(`${app}/`);assertOk(landing,'public landing loads');
 const health=await http(`${app}/api/health`);assertOk(health,'health endpoint responds');if(health.ok&&health.body?.service==='SalesDesk')pass('health identifies SalesDesk');else fail('health service identity',health.body);
 const token=await signIn();pass('dedicated E2E account signs in');
 const membership=await rest(token,'business_members?select=business_id,role,is_active&order=created_at.asc&limit=1');assertOk(membership,'workspace membership loads');const member=membership.body?.[0];if(!member?.business_id)throw new Error('E2E account has no workspace');
 const businessId=process.env.SALESDESK_E2E_BUSINESS_ID||member.business_id;if(businessId!==member.business_id&&writes)throw new Error('Write-mode business ID must match the E2E account workspace');
 const id=encodeURIComponent(businessId);
 for(const [label,path] of [
   ['business profile',`businesses?id=eq.${id}&select=id,name,currency&limit=1`],
   ['products/services',`products?business_id=eq.${id}&select=id,name,is_active&limit=20`],
   ['customers',`customers?business_id=eq.${id}&select=id,name&limit=20`],
   ['invoices',`invoices?business_id=eq.${id}&select=id,invoice_number,total,payment_status&order=created_at.desc&limit=20`],
   ['expenses',`expenses?business_id=eq.${id}&select=id,category,amount&order=created_at.desc&limit=20`],
   ['branches',`branches?business_id=eq.${id}&select=id,name&limit=20`],
   ['automation rules',`automation_rules?business_id=eq.${id}&select=id,name,is_enabled&limit=20`]
 ])assertOk(await rest(token,path),`${label} loads under RLS`);
 const brief=await rpc(token,'salesdesk_daily_brief_v2',{p_business_id:businessId,p_branch_id:null});assertOk(brief,'Daily Brief RPC works');
 if(writes){
   const productId=process.env.SALESDESK_E2E_PRODUCT_ID;const nonce=Date.now();
   const quote=await rpc(token,'create_sales_document_v2',{p_business_id:businessId,p_branch_id:null,p_document_type:'quote',p_customer_name:`E2E Customer ${nonce}`,p_customer_phone:'',p_items:[{product_id:productId,quantity:1,rate:Number(process.env.SALESDESK_E2E_RATE||1)}],p_expiry_date:null,p_notes:'SalesDesk staging E2E'});assertOk(quote,'quotation can be created');
   const quoteId=typeof quote.body==='string'?quote.body:quote.body;if(!quote.ok||!quoteId)throw new Error('Quote ID missing');
   const order=await rpc(token,'convert_quote_to_order',{p_document_id:quoteId});assertOk(order,'quotation converts to sales order');
   const orderId=typeof order.body==='string'?order.body:order.body;if(!order.ok||!orderId)throw new Error('Order ID missing');
   const invoice=await rpc(token,'convert_sales_document_to_invoice',{p_document_id:orderId,p_payment_method:'cash',p_payment_status:'paid'});assertOk(invoice,'sales order converts to invoice');
   const invoiceId=typeof invoice.body==='string'?invoice.body:invoice.body;if(invoice.ok&&invoiceId){const row=await rest(token,`invoices?id=eq.${encodeURIComponent(invoiceId)}&business_id=eq.${id}&select=id,source_document_id,payment_status&limit=1`);if(row.ok&&row.body?.[0]?.source_document_id===orderId)pass('converted invoice is linked to source order');else fail('converted invoice source link',row.body);}
 }
 if(!process.exitCode)console.log(`SalesDesk E2E smoke PASSED (${writes?'staging write mode':'read-only mode'}).`);
}catch(e){console.error('E2E verification could not complete:',e.message);process.exit(2);}
