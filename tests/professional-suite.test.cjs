const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('professional business OS migration contains core expansion modules',()=>{
  const sql=read('supabase/migrations/202609102230_salesdesk_professional_os.sql');
  for(const table of ['branches','warehouses','sales_documents','sales_returns','customer_followups','purchase_payments','team_invitations','business_goals','business_notifications','automation_rules'])assert.match(sql,new RegExp(`create table if not exists public\\.${table}\\b`,'i'),table);
  assert.match(sql,/salesdesk_daily_brief/);
  assert.match(sql,/create_sales_document/);
  assert.match(sql,/create_branch_with_warehouse/);
  assert.match(sql,/enable row level security/i);
});

test('professional workspace keeps sales tooling in one controller with server-enforced expansion modules',()=>{
  const app=read('app.js');
  const index=read('index.html');
  for(const token of ['manageProducts','deleteSales','deleteExpenses'])assert.match(app,new RegExp(token));
  assert.doesNotMatch(index,/ui\/|salesdesk-|velora-/i);
  for(const p of ['dashboard.html','sales.html','products.html','customers.html','suppliers.html','purchases.html','expenses.html','history.html','reports.html','plans.html'])assert.doesNotMatch(read(p),/ui\/|salesdesk-|velora-/i,p);
  assert.doesNotMatch(app,/salesdesk-pro-suite|salesdesk-operations-pro|salesdesk-market-suite/i);
  const people=read('supabase/migrations/202609111000_salesdesk_people_permissions_intelligence.sql');
  assert.match(people,/salesdesk_role_capabilities/);
  assert.match(people,/salesdesk_daily_brief_v2/);
});

test('team invitation endpoints hash tokens and enforce authenticated acceptance',()=>{
  const invite=read('server/api/team/invite.js'),accept=read('server/api/team/accept.js');
  assert.match(invite,/randomBytes\(32\)/);
  assert.match(invite,/sha256/);
  assert.match(invite,/owner.*admin|admin.*owner/s);
  assert.match(accept,/sha256/);
  assert.match(accept,/user\.email/);
  assert.doesNotMatch(invite,/SUPABASE_SERVICE_ROLE_KEY\s*=/);
  assert.doesNotMatch(accept,/SUPABASE_SERVICE_ROLE_KEY\s*=/);
});

test('public positioning presents Salesventory as a calm business workspace',()=>{
  const index=read('index.html');
  assert.match(index,/Salesventory — Inventory today\. A bigger tomorrow/);
  assert.match(index,/not limited to retail/i);
  assert.match(index,/Products, services or both/i);
  assert.match(index,/WhatsApp-ready workflows/i);
});
