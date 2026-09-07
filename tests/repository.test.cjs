const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const read=path=>fs.readFileSync(path,'utf8');

test('frontend contains no privileged Supabase secret patterns',()=>{
  const files=['supabase/config.js','supabase/client.js','supabase/realtime-app.js','supabase/runtime-fixes.js'];
  for(const file of files){
    const text=read(file);
    assert.doesNotMatch(text,/service_role|SUPABASE_SERVICE_ROLE|sb_secret_/i,file);
  }
});

test('cloud bootstrap blocks premature login submission before production controller is ready',()=>{
  const client=read('supabase/client.js');
  assert.match(client,/__modeflowControllerReady=false/);
  assert.match(client,/event\.target\?\.id==='cloudLogin'/);
  assert.match(client,/stopImmediatePropagation/);
  assert.match(client,/DOMContentLoaded/);
});

test('production controller loads core realtime and runtime fix layers in order',()=>{
  const client=read('supabase/client.js');
  const core=client.indexOf("supabase/modeflow-core.js?v=");
  const realtime=client.indexOf("supabase/realtime-app.js?v=");
  const fixes=client.indexOf("supabase/runtime-fixes.js?v=");
  assert.ok(core>=0&&realtime>core&&fixes>realtime);
});

test('checkout uses the idempotency key contract',()=>{
  const realtime=read('supabase/realtime-app.js');
  const migration=read('supabase/migrations/20260907_modeflow_production_hardening.sql');
  assert.match(realtime,/p_idempotency_key:idempotencyKey/);
  assert.match(migration,/idempotency_key uuid/);
  assert.match(migration,/uq_invoices_business_idempotency/);
});

test('production migration revokes public access to security definer RPCs',()=>{
  const migration=read('supabase/migrations/20260907_modeflow_production_hardening.sql');
  assert.match(migration,/revoke all on function public\.create_business_with_owner\([^;]+from public, anon;/s);
  assert.match(migration,/revoke all on function public\.complete_sale\([^;]+from public, anon;/s);
  assert.match(migration,/revoke all on function public\.delete_sale\(uuid\) from public, anon;/);
});

test('invoice items preserve historical cost for profit calculations',()=>{
  const migration=read('supabase/migrations/20260907_modeflow_production_hardening.sql');
  const realtime=read('supabase/realtime-app.js');
  assert.match(migration,/add column if not exists cost_price/);
  assert.match(migration,/v_product\.cost_price/);
  assert.match(realtime,/cost:Number\(item\.cost_price\|\|0\)/);
});

test('runtime removes hard-coded demo KPI behaviour from cloud dashboard',()=>{
  const fixes=read('supabase/runtime-fixes.js');
  assert.match(fixes,/currentMonthSummary/);
  assert.match(fixes,/Top-selling product/);
  assert.match(fixes,/Business overview/);
  assert.match(fixes,/Total sales/);
});

test('role based UI prevents staff from seeing privileged actions',()=>{
  const fixes=read('supabase/runtime-fixes.js');
  assert.match(fixes,/capabilities\(currentRole\(\)\)/);
  assert.match(fixes,/#inventoryRows \.action-btn/);
  assert.match(fixes,/#historyRows \.action-btn\.danger/);
  assert.match(fixes,/#expenseList \.action-btn\.danger/);
});
