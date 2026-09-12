const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('people and permissions migration defines server-enforced role and branch access',()=>{
  const sql=read('supabase/migrations/202609111000_salesdesk_people_permissions_intelligence.sql');
  for(const token of ['business_member_branches','salesdesk_can','salesdesk_has_branch_access','salesdesk_role_capabilities','salesdesk_complete_followup','salesdesk_update_customer_crm','salesdesk_supplier_aging','salesdesk_daily_brief_v2'])assert.ok(sql.includes(token),`missing ${token}`);
  assert.match(sql,/is_active=true/);
  assert.match(sql,/branch scoped invoice access/);
  assert.match(sql,/authorized invoice creation/);
});

test('RPC hardening prevents role bypass through business actions',()=>{
  const sql=read('supabase/migrations/202609111005_salesdesk_role_rpc_hardening.sql');
  for(const token of ['complete_multi_item_sale','complete_sale','record_invoice_payment','create_purchase','receive_purchase','create_sales_document_v2','convert_quote_to_order'])assert.ok(sql.includes(token),`missing ${token}`);
  assert.match(sql,/salesdesk_can\(p_business_id,'sales\.create'\)/);
  assert.match(sql,/salesdesk_has_branch_access/);
});

test('document conversion and analytics are branch scoped',()=>{
  const sql=read('supabase/migrations/202609111006_salesdesk_branch_scoped_intelligence.sql');
  assert.ok(sql.includes('convert_sales_document_to_invoice'));
  assert.ok(sql.includes('salesdesk_daily_brief_v2'));
  assert.ok(sql.includes('salesdesk_supplier_aging'));
  assert.match(sql,/Branch access denied/);
});

test('team APIs protect owner/admin boundaries and branch assignment',()=>{
  const files=['server/api/team/list.js','server/api/team/update.js','server/api/team/remove.js','server/api/team/revoke-invite.js','server/api/team/invite.js','server/api/team/accept.js'];
  for(const f of files)assert.ok(fs.existsSync(f),`missing ${f}`);
  const update=read('server/api/team/update.js'),remove=read('server/api/team/remove.js'),invite=read('server/api/team/invite.js'),accept=read('server/api/team/accept.js');
  assert.match(update,/Only the owner can manage admin access/);
  assert.match(remove,/business owner cannot be removed/);
  assert.match(invite,/branchIds/);
  assert.match(accept,/business_member_branches/);
});

test('frontend respects server-enforced roles and hides privileged actions for staff',()=>{
  const app=read('app.js'),fixes=read('supabase/runtime-fixes.js');
  assert.match(app,/capabilities\(state\.role\)/);
  assert.match(app,/manageProducts/);
  assert.match(app,/deleteSales/);
  assert.match(app,/deleteExpenses/);
  assert.match(fixes,/#inventoryRows \.action-btn/);
  assert.match(fixes,/#historyRows \.action-btn\.danger/);
  assert.match(fixes,/#expenseList \.action-btn\.danger/);
});
