// SalesDesk live/staging role-capability verifier.
// Run with a dedicated non-owner test account and repeat for each role.
// Required: SUPABASE_URL, SUPABASE_ANON_KEY, SALESDESK_ROLE_EMAIL,
// SALESDESK_ROLE_PASSWORD, SALESDESK_ROLE_BUSINESS_ID, SALESDESK_EXPECTED_ROLE.

const need=['SUPABASE_URL','SUPABASE_ANON_KEY','SALESDESK_ROLE_EMAIL','SALESDESK_ROLE_PASSWORD','SALESDESK_ROLE_BUSINESS_ID','SALESDESK_EXPECTED_ROLE'];
for(const k of need)if(!process.env[k]){console.error(`Missing ${k}`);process.exit(2);}
const base=process.env.SUPABASE_URL.replace(/\/$/,'');const anon=process.env.SUPABASE_ANON_KEY;const business=process.env.SALESDESK_ROLE_BUSINESS_ID;const expected=process.env.SALESDESK_EXPECTED_ROLE;
const matrix={
 owner:['workspace.read','reports.read','products.read','customers.read','suppliers.read','products.manage','customers.manage','sales.create','sales.manage','crm.manage','expenses.manage','purchases.manage','finance.manage','inventory.manage','branches.manage','goals.manage','automation.manage'],
 admin:['workspace.read','reports.read','products.read','customers.read','suppliers.read','products.manage','customers.manage','sales.create','sales.manage','crm.manage','expenses.manage','purchases.manage','finance.manage','inventory.manage','branches.manage','goals.manage','automation.manage'],
 manager:['workspace.read','reports.read','products.read','customers.read','suppliers.read','products.manage','customers.manage','sales.create','sales.manage','crm.manage','expenses.manage','purchases.manage','finance.manage','inventory.manage','branches.manage','goals.manage','automation.manage'],
 accountant:['workspace.read','reports.read','products.read','customers.read','suppliers.read','expenses.manage','finance.manage'],
 cashier:['workspace.read','reports.read','products.read','customers.read','customers.manage','sales.create'],
 sales:['workspace.read','reports.read','products.read','customers.read','customers.manage','sales.create','sales.manage','crm.manage'],
 staff:['workspace.read','reports.read','products.read','customers.read','suppliers.read','crm.manage']
};
if(!matrix[expected]){console.error('SALESDESK_EXPECTED_ROLE must be owner/admin/manager/accountant/cashier/sales/staff');process.exit(2);}
async function signIn(){const r=await fetch(`${base}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:anon,'content-type':'application/json'},body:JSON.stringify({email:process.env.SALESDESK_ROLE_EMAIL,password:process.env.SALESDESK_ROLE_PASSWORD})});const d=await r.json();if(!r.ok||!d.access_token)throw new Error(`Sign-in failed (${r.status})`);return d.access_token;}
async function request(token,path,body){const r=await fetch(`${base}/rest/v1/${path}`,{method:body?'POST':'GET',headers:{apikey:anon,authorization:`Bearer ${token}`,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});const t=await r.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}return{ok:r.ok,status:r.status,body:d};}
try{
 const token=await signIn();
 const m=await request(token,`business_members?business_id=eq.${encodeURIComponent(business)}&user_id=eq.${encodeURIComponent((await (await fetch(`${base}/auth/v1/user`,{headers:{apikey:anon,authorization:`Bearer ${token}`}})).json()).id)}&select=role,is_active&limit=1`);
 if(!m.ok||!m.body?.[0])throw new Error('Membership not found');
 if(m.body[0].role!==expected||m.body[0].is_active===false)throw new Error(`Expected active ${expected} membership`);
 const caps=await request(token,'rpc/salesdesk_role_capabilities',{target_business:business});if(!caps.ok)throw new Error(`Capability RPC failed (${caps.status})`);
 const allowed=new Set(matrix[expected]);let failed=false;
 for(const cap of matrix.owner){const key=cap.replace('.','_');const actual=Boolean(caps.body?.[key]);const want=allowed.has(cap);if(actual!==want){console.error(`FAIL ${expected}: ${cap} expected ${want} got ${actual}`);failed=true;}else console.log(`PASS ${expected}: ${cap}=${actual}`);}
 if(failed)process.exit(1);console.log(`SalesDesk role security PASSED for ${expected}.`);
}catch(e){console.error('Role verification could not complete:',e.message);process.exit(2);}
