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

test('frontend closes the sale and stock loop through hardened RPCs',()=>{
  const cloud=read('cloud.js');
  const app=read('app.js');
  const index=read('index.html');
  assert.match(cloud,/complete_sale/);
  assert.match(cloud,/delete_sale/);
  assert.match(app,/p_idempotency_key/);
  assert.match(app,/track_stock/);
  assert.match(index,/New sale/);
});

test('legacy local-only onboarding is removed from the production frontend',()=>{
  const index=read('index.html');
  const app=read('app.js');
  assert.doesNotMatch(index,/onboarding\.js|onboarding-backdrop/i);
  assert.doesNotMatch(app,/onboarding-backdrop/i);
  assert.doesNotMatch(app,/SalesDeskLegacyOnboardingDisabled/);
  assert.match(app,/DOMContentLoaded/);
});
