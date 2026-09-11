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

test('professional UI exposes command centre, CRM, documents, branches and automation',()=>{
  const js=read('ui/salesdesk-pro-suite-v1.js');
  for(const feature of ['SALESDESK DAILY BRIEF','CRM','QUOTES & ORDERS','BRANCHES & WAREHOUSES','GOALS & AUTOMATION','Invite team member'])assert.match(js,new RegExp(feature.replace(/[&]/g,'&')));
  assert.match(js,/salesdesk_daily_brief/);
  assert.match(js,/create_sales_document/);
  assert.match(js,/create_branch_with_warehouse/);
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

test('public positioning presents SalesDesk as an adaptive command centre',()=>{
  const js=read('ui/salesdesk-public-pro-v1.js');
  assert.match(js,/business command centre/i);
  assert.match(js,/Products, services or both/i);
  assert.match(js,/WhatsApp-ready workflows/i);
  assert.match(js,/not limited to retail/i);
});
