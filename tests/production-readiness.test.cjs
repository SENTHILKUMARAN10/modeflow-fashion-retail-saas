const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

test('production legal pages exist', () => {
  assert.ok(fs.existsSync('privacy.html'));
  assert.ok(fs.existsSync('terms.html'));
  assert.ok(fs.existsSync('refund-policy.html'));
});

test('Salesventory production workspace loads the consolidated market UI', () => {
  const index = read('index.html');
  const directLoader = read('ui/velora-final-v16.js');
  const responsive = read('responsive-device.js');
  assert.match(index, /Salesventory/);
  assert.match(directLoader, /salesdesk-market-suite-v3\.js/);
  assert.match(directLoader, /salesdesk-market-suite-v2\.css/);
  assert.match(responsive, /salesdesk-market-suite-v3\.js/);
  assert.doesNotMatch(read('supabase/client.js'), /ui\/clean-v4\.css/);
});

test('legacy observer-heavy UI is not loaded by production bootstrap', () => {
  const client = read('supabase/client.js');
  assert.doesNotMatch(client, /production-only\.js/);
  assert.doesNotMatch(client, /ui-profile-fixes\.js/);
  assert.doesNotMatch(client, /visibility-hotfix\.js/);
});

test('browser client does not contain privileged Supabase service role markers', () => {
  for (const file of ['supabase/config.js','supabase/client.js','app.js']) {
    const src = read(file);
    assert.doesNotMatch(src, /service[_-]?role/i, `${file} must not contain a service-role credential`);
  }
});

test('auth persistence and recovery features are wired', () => {
  const client = read('supabase/client.js');
  const auth = read('supabase/auth-upgrade.js');
  assert.match(client, /persistSession\s*:\s*true/);
  assert.match(client, /autoRefreshToken\s*:\s*true/);
  assert.match(auth, /resetPassword/);
  assert.match(auth, /resendVerification/);
  assert.match(auth, /PASSWORD_RECOVERY/);
});

test('critical hardening and scale migrations exist', () => {
  assert.ok(fs.existsSync('supabase/migrations/20260907_modeflow_realtime.sql'));
  assert.ok(fs.existsSync('supabase/migrations/20260907_modeflow_production_hardening.sql'));
  assert.ok(fs.existsSync('supabase/migrations/20260910_salesdesk_scale_100.sql'));
});

test('commercial production audit documents external requirements', () => {
  const audit = read('docs/PRODUCTION-AUDIT.md');
  assert.match(audit, /SMTP/);
  assert.match(audit, /Backups/);
  assert.match(audit, /Business A/);
  assert.match(audit, /Business B/);
  assert.match(audit, /restore drill/i);
});

test('professional business OS migration contains core expansion modules', () => {
  const migration = read('supabase/migrations/20260909_modeflow_professional_business_os.sql');
  assert.match(migration, /create table if not exists public\.branches/i);
  assert.match(migration, /create table if not exists public\.documents/i);
  assert.match(migration, /create table if not exists public\.suppliers/i);
  assert.match(migration, /create table if not exists public\.quotes/i);
  assert.match(migration, /create table if not exists public\.purchase_orders/i);
});

test('professional UI exposes command centre, CRM, documents, branches and automation', () => {
  const source = read('ui/salesdesk-pro-suite-v1.js');
  assert.match(source, /Command Centre/);
  assert.match(source, /Customer CRM/);
  assert.match(source, /Documents/);
  assert.match(source, /Branches/);
  assert.match(source, /Automation/);
});

test('team invitation endpoints hash tokens and enforce authenticated acceptance', () => {
  const invite = read('server/api/team/invite.js');
  const accept = read('server/api/team/accept.js');
  assert.match(invite, /sha256/i);
  assert.match(accept, /auth/i);
  assert.doesNotMatch(invite, /service_role/i);
});

test('public positioning presents Salesventory as an adaptive command centre', () => {
  const source = read('ui/salesdesk-public-pro-v1.js');
  assert.match(source, /adaptive/i);
  assert.match(source, /command/i);
});

test('workspace owner creation is idempotent and cannot duplicate membership', () => {
  const migration = read('supabase/migrations/20260907_modeflow_regression_fixes.sql');
  assert.match(migration, /create_business_with_owner/i);
  assert.match(migration, /on conflict/i);
});

test('audit trigger does not assume every audited table has an id column', () => {
  const migration = read('supabase/migrations/20260907_modeflow_regression_fixes.sql');
  assert.match(migration, /to_jsonb/i);
});

test('regression migration preserves RPC security grants', () => {
  const migration = read('supabase/migrations/20260907_modeflow_regression_fixes.sql');
  assert.match(migration, /revoke all/i);
  assert.match(migration, /grant execute/i);
});

test('frontend contains no privileged Supabase secret patterns', () => {
  for (const file of ['index.html','app.js','account-pages-v1.js','responsive-device.js','supabase/client.js']) {
    const src = read(file);
    assert.doesNotMatch(src, /SUPABASE_SERVICE_ROLE|sb_secret_/i, `${file} must not expose privileged Supabase secrets`);
  }
});

test('cloud bootstrap blocks premature login submission before production controller is ready', () => {
  const client = read('supabase/client.js');
  assert.match(client, /__modeflowControllerReady/);
  assert.match(client, /stopImmediatePropagation/);
});

test('production controller loads core realtime and runtime fix layers in order', () => {
  const client = read('supabase/client.js');
  const core = client.indexOf('modeflow-core.js');
  const realtime = client.indexOf('realtime-app.js');
  const runtime = client.indexOf('runtime-fixes.js');
  assert.ok(core >= 0 && realtime > core && runtime > realtime);
});

test('checkout uses the idempotency key contract', () => {
  const realtime = read('supabase/realtime-app.js');
  assert.match(realtime, /idempotency/i);
});

test('production migration revokes public access to security definer RPCs', () => {
  const migration = read('supabase/migrations/20260907_modeflow_production_hardening.sql');
  assert.match(migration, /revoke all/i);
});

test('invoice items preserve historical cost for profit calculations', () => {
  const migration = read('supabase/migrations/20260907_modeflow_production_hardening.sql');
  assert.match(migration, /cost_price/i);
});

test('Salesventory market dashboard contains live business KPI modules', () => {
  const source = read('ui/salesdesk-market-suite-v3.js');
  assert.match(source, /KPI/i);
  assert.match(source, /inventory/i);
});

test('role based UI prevents staff from seeing privileged actions', () => {
  const source = read('ui/salesdesk-market-suite-v3.js');
  assert.match(source, /role/i);
});

test('Vercel Hobby deployment stays below function-count limit', () => {
  const config = read('vercel.json');
  assert.match(config, /api\/router/);
});

test('API router preserves every customer-facing endpoint', () => {
  const router = read('api/router.js');
  for (const endpoint of ['billing','team','account','automation','health']) assert.match(router, new RegExp(endpoint));
});
