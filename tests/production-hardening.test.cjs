const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('production hardening migration protects tenant integrity and high-traffic queries',()=>{
  const sql=read('supabase/migrations/202609111300_salesdesk_production_hardening.sql');
  for(const token of ['idx_invoices_receivables_due','idx_followups_business_due_open','idx_inventory_balances_business_product','salesdesk_assert_branch_ownership','salesdesk_assert_warehouse_ownership','relrowsecurity'])assert.ok(sql.includes(token),`missing ${token}`);
  assert.match(sql,/Branch does not belong to this business/);
  assert.match(sql,/Warehouse does not belong to this business/);
});

test('anonymous callers cannot execute tenant security helpers',()=>{
  const sql=read('supabase/migrations/202609111500_salesdesk_restrict_anon_tenant_helpers.sql');
  for(const fn of ['has_business_role','is_business_member','has_active_subscription','salesdesk_has_branch_access','salesdesk_can','salesdesk_role_capabilities']){
    assert.ok(sql.includes(`revoke execute on function public.${fn}`),`missing anon revoke for ${fn}`);
  }
  assert.ok(sql.includes('from anon'));
  assert.ok(sql.includes('to authenticated'));
});

test('tenant verifier covers new production tables and cross-tenant RPC access',()=>{
  const js=read('scripts/verify-tenant-isolation.mjs');
  for(const token of ['recurring_expense_schedules','recurring_invoice_schedules','scheduled_reports','automation_deliveries','automation_executions','salesdesk_role_capabilities','salesdesk_daily_brief_v2'])assert.ok(js.includes(token),`missing ${token}`);
  assert.ok(js.includes('write probe was malformed'));
});

test('role verifier contains the complete SalesDesk permission matrix',()=>{
  const js=read('scripts/verify-role-security.mjs');
  for(const role of ['owner','admin','manager','accountant','cashier','sales','staff'])assert.ok(js.includes(`${role}:`)||js.includes(` ${role}:`),`missing role ${role}`);
  for(const cap of ['sales.create','finance.manage','inventory.manage','automation.manage','crm.manage'])assert.ok(js.includes(cap),`missing capability ${cap}`);
});

test('E2E write mode is explicitly restricted to staging',()=>{
  const js=read('scripts/e2e/api-smoke.mjs');
  assert.ok(js.includes("SALESDESK_E2E_ENV!=='staging'"));
  for(const token of ['create_sales_document_v2','convert_quote_to_order','convert_sales_document_to_invoice','salesdesk_daily_brief_v2'])assert.ok(js.includes(token),`missing journey ${token}`);
});

test('backup and restore scripts verify archive integrity and record parity',()=>{
  const backup=read('scripts/backup/backup.sh'),restore=read('scripts/backup/restore-test.sh');
  assert.ok(backup.includes('sha256sum')&&backup.includes('.counts.tsv')&&backup.includes('pg_restore --list'));
  assert.ok(restore.includes('ALLOW_DESTRUCTIVE_RESTORE_TEST')&&restore.includes('Count mismatch')&&restore.includes('relrowsecurity'));
});

test('load test refuses accidental production traffic',()=>{
  const k6=read('scripts/load/k6-salesdesk.js');
  assert.ok(k6.includes("ALLOW_PRODUCTION_LOAD!=='true'"));
  assert.ok(k6.includes("ALLOW_PRODUCTION_WRITES!=='true'"));
  assert.match(k6,/p\(95\)<1500/);
});

test('query-plan review covers critical dashboards',()=>{
  const sql=read('scripts/performance/query-plan.sql');
  for(const table of ['products','invoices','customer_followups','inventory_balances','business_notifications'])assert.ok(sql.includes(`public.${table}`),`missing ${table}`);
  assert.ok(sql.includes('explain (analyze,buffers,format text)'));
});
