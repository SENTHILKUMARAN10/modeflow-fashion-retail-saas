const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const read=p=>fs.readFileSync(p,'utf8');

test('professional operations migration contains adaptive onboarding and branch inventory primitives',()=>{
  const sql=read('supabase/migrations/202609110840_salesdesk_branch_documents_completion.sql');
  for(const token of ['complete_business_onboarding','inventory_transfers','inventory_transfer_items','salesdesk_warehouse_stock','transfer_inventory','create_sales_document_v2','convert_quote_to_order','convert_sales_document_to_invoice','salesdesk_branch_summary']) assert.match(sql,new RegExp(token));
  assert.match(sql,/business_type/);
  assert.match(sql,/module_config/);
  assert.match(sql,/onboarding_completed_at/);
});

test('professional operations UI exposes the complete quote to invoice and warehouse workflow',()=>{
  const js=read('ui/salesdesk-operations-pro-v2.js');
  for(const token of ['Branches & warehouses','Quotes & orders','Transfer stock','convert_quote_to_order','convert_sales_document_to_invoice','complete_business_onboarding','salesdesk_warehouse_stock']) assert.ok(js.includes(token),`missing ${token}`);
  assert.ok(js.includes('Products & services'));
});

test('legacy local-only onboarding is disabled and production operations are loaded',()=>{
  const onboarding=read('onboarding.js');
  const loader=read('responsive-device.js');
  assert.ok(onboarding.includes('SalesDeskLegacyOnboardingDisabled'));
  assert.ok(!onboarding.includes('onboarding-backdrop'));
  assert.ok(loader.includes('salesdesk-operations-pro-v2.js'));
  assert.ok(loader.includes('salesdesk-operations-pro-v2.css'));
});
