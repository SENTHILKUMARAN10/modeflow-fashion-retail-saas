// SalesDesk live/staging role-capability verifier.
// Use a dedicated test account and repeat for each role.
// Required: SUPABASE_URL, SUPABASE_ANON_KEY, SALESDESK_ROLE_EMAIL,
// SALESDESK_ROLE_PASSWORD, SALESDESK_EXPECTED_ROLE.
// Optional: SALESDESK_ROLE_BUSINESS_ID. If omitted, the verifier discovers the
// active membership for the expected role automatically.

const need=['SUPABASE_URL','SUPABASE_ANON_KEY','SALESDESK_ROLE_EMAIL','SALESDESK_ROLE_PASSWORD','SALESDESK_EXPECTED_ROLE'];
for(const k of need)if(!process.env[k]){console.error(`Missing ${k}`);process.exit(2);}
const base=process.env.SUPABASE_URL.replace(/\/$/,'');
const anon=process.env.SUPABASE_ANON_KEY;
let business=process.env.SALESDESK_ROLE_BUSINESS_ID||'';
const expected=process.env.SALESDESK_EXPECTED_ROLE;
const allCaps=['workspace.read','reports.read','products.read','customers.read','suppliers.read','products.manage','customers.manage','sales.create','sales.manage','crm.manage','expenses.manage','purchases.manage','finance.manage','inventory.manage','branches.manage','goals.manage','automation.manage'];
const matrix={
 owner:[...allCaps],
 admin:[...allCaps],
 manager:[...allCaps],
 accountant:['workspace.read','reports.read','products.read','customers.read','suppliers.read','expenses.manage','finance.manage'],
 cashier:['workspace.read','reports.read','products.read','customers.read','customers.manage','sales.create'],
 sales:['workspace.read','reports.read','products.read','customers.read','customers.manage','sales.create','sales.manage','crm.manage'],
 staff:['workspace.read','reports.read','products.read','customers.read','suppliers.read','crm.manage']
};
if(!matrix[expected]){console.error('SALESDESK_EXPECTED_ROLE must be owner/admin/manager/accountant/cashier/sales/staff');process.exit(2);}
async function signIn(){
 const r=await fetch(`${base}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:anon,'content-type':'application/json'},body:JSON.stringify({email:process.env.SALESDESK_ROLE_EMAIL,password:process.env.SALESDESK_ROLE_PASSWORD})});
 const d=await r.json();
 if(!r.ok||!d.access_token)throw new Error(`Sign-in failed (${r.status})`);
 return d.access_token;
}
async function request(token,path,body){
 const r=await fetch(`${base}/rest/v1/${path}`,{method:body?'POST':'GET',headers:{apikey:anon,authorization:`Bearer ${token}`,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
 const t=await r.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}
 return{ok:r.ok,status:r.status,body:d};
}
try{
 const token=await signIn();
 const u=await (await fetch(`${base}/auth/v1/user`,{headers:{apikey:anon,authorization:`Bearer ${token}`}})).json();
 let m;
 if(business){
   m=await request(token,`business_members?business_id=eq.${encodeURIComponent(business)}&user_id=eq.${encodeURIComponent(u.id)}&select=business_id,role,is_active&limit=1`);
 }else{
   m=await request(token,`business_members?user_id=eq.${encodeURIComponent(u.id)}&role=eq.${encodeURIComponent(expected)}&is_active=eq.true&select=business_id,role,is_active&limit=2`);
   if(m.ok&&Array.isArray(m.body)&&m.body.length===1)business=m.body[0].business_id;
 }
 if(!m.ok||!m.body?.[0]||!business)throw new Error('Membership not found');
 if(m.body.length>1&&!process.env.SALESDESK_ROLE_BUSINESS_ID)throw new Error('Multiple matching memberships found; set SALESDESK_ROLE_BUSINESS_ID');
 if(m.body[0].role!==expected||m.body[0].is_active===false)throw new Error(`Expected active ${expected} membership`);
 const allowed=new Set(matrix[expected]);let failed=false;
 for(const cap of allCaps){
   const r=await request(token,'rpc/salesdesk_can',{target_business:business,capability:cap});
   if(!r.ok){console.error(`FAIL ${expected}: ${cap} RPC HTTP ${r.status}`);failed=true;continue;}
   const actual=Boolean(r.body);
   const want=allowed.has(cap);
   if(actual!==want){console.error(`FAIL ${expected}: ${cap} expected ${want} got ${actual}`);failed=true;}
   else console.log(`PASS ${expected}: ${cap}=${actual}`);
 }
 if(failed)process.exit(1);
 console.log(`SalesDesk role security PASSED for ${expected}.`);
}catch(e){console.error('Role verification could not complete:',e.message);process.exit(2);}
