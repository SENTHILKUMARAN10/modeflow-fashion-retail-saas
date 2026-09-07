const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const read=path=>fs.readFileSync(path,'utf8');
const regression=read('supabase/migrations/20260907_modeflow_regression_fixes.sql');

test('workspace owner creation is idempotent and cannot duplicate membership',()=>{
  assert.match(regression,/insert into public\.business_members\(business_id,user_id,role\)/);
  assert.match(regression,/on conflict \(business_id,user_id\) do nothing/);
});

test('audit trigger does not assume every audited table has an id column',()=>{
  assert.match(regression,/v_row := to_jsonb\(NEW\)/);
  assert.match(regression,/v_row := to_jsonb\(OLD\)/);
  assert.match(regression,/v_row->>'business_id'/);
  assert.match(regression,/v_row->>'user_id'/);
  assert.doesNotMatch(regression,/TG_TABLE_NAME='businesses' then NEW\.id else NEW\.business_id/);
  assert.doesNotMatch(regression,/TG_TABLE_NAME='businesses' then OLD\.id else OLD\.business_id/);
});

test('regression migration preserves RPC security grants',()=>{
  assert.match(regression,/revoke all on function public\.create_business_with_owner\(text,text,text,text\) from public, anon;/);
  assert.match(regression,/grant execute on function public\.create_business_with_owner\(text,text,text,text\) to authenticated;/);
  assert.match(regression,/revoke all on function public\.audit_business_change\(\) from public, anon;/);
});
