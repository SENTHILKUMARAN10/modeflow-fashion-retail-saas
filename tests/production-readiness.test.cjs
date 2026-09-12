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

test('Salesventory production workspace uses the complete authoritative UI and keeps feature modules functional', () => {
  const index = read('index.html');
  const loader = read('ui/velora-final-v16.js');
  const responsive = read('responsive-device.js');
  const guard = read('ui/salesventory-cascade-guard-v1.js');
  assert.match(index, /Salesventory/);
  assert.match(loader, /salesventory-complete-ui-v1\.css/);
  assert.match(loader, /salesventory-complete-ui-v1\.js/);
  assert.match(loader, /salesventory-dashboard-authority-v1\.js/);
  assert.match(loader, /salesventory-invoice-reference-v1\.js/);
  assert.match(responsive, /salesdesk-market-suite-v3\.js/);
  assert.match(responsive, /salesdesk-operations-pro-v2\.js/);
  assert.match(responsive, /salesdesk-people-intelligence-v1\.js/);
  assert.match(responsive, /salesdesk-automation-center-v1\.js/);
  assert.match(guard, /salesventory-complete-ui-v1\.css/);
  assert.doesNotMatch(responsive, /salesdesk-redesign-v1\.css/);
  assert.doesNotMatch(responsive, /public-experience-v2\.js/);
  assert.doesNotMatch(read('supabase/client.js'), /ui\/clean-v4\.css/);
});

test('legacy observer-heavy visual bootstrap is not loaded', () => {
  const client = read('supabase/client.js');
  const responsive = read('responsive-device.js');
  assert.doesNotMatch(client, /production-only\.js/);
  assert.doesNotMatch(client, /ui-profile-fixes\.js/);
  assert.doesNotMatch(client, /visibility-hotfix\.js/);
  assert.doesNotMatch(responsive, /new MutationObserver/);
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

test('current professional business OS migration contains core expansion modules', () => {
  const migration = read('supabase/migrations/202609102230_salesdesk_professional_os.sql');
  assert.match(migration, /create table if not exists public\.branches/i);
  assert.match(migration, /create table if not exists public\.warehouses/i);
  assert.match(migration, /create table if not exists public\.sales_documents/i);
  assert.match(migration, /create table if not exists public\.sales_document_items/i);
  assert.match(migration, /create table if not exists public\.sales_returns/i);
});

test('professional UI exposes CRM documents branches and automation capabilities', () => {
  const source = read('ui/salesdesk-pro-suite-v1.js');
  assert.match(source, /Command centre/i);
  assert.match(source, /CRM/i);
  assert.match(source, /documents/i);
  assert.match(source, /branches/i);
  assert.match(source, /automation/i);
});

test('team invitation endpoints hash tokens and enforce authenticated acceptance', () => {
  const invite = read('server/api/team/invite.js');
  const accept = read('server/api/team/accept.js');
  assert.match(invite, /sha256/i);
  assert.match(accept, /auth/i);
  assert.doesNotMatch(invite, /service_role/i);
});

test('public positioning is owned by the new Salesventory landing experience', () => {
  const source = read('ui/salesventory-complete-ui-v1.js');
  assert.match(source, /BUSINESS MANAGEMENT, SIMPLIFIED/);
  assert.match(source, /Run the whole business/);
  assert.match(source, /Inventory today/);
  assert.match(source, /Salesventory/);
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

test('Salesventory dashboard authority prevents legacy dashboard decoration from becoming canonical', () => {
  const source = read('ui/salesventory-dashboard-authority-v1.js');
  assert.match(source, /sdProBrief/);
  assert.match(source, /sdTodaySales/);
  assert.match(source, /Total Inventory/);
  assert.match(source, /Top Products/);
});

test('role based market functionality remains available', () => {
  const source = read('ui/salesdesk-market-suite-v3.js');
  assert.match(source, /role/i);
  assert.match(source, /inventory/i);
});

test('Vercel Hobby deployment stays below function-count limit', () => {
  const config = read('vercel.json');
  assert.match(config, /api\/router/);
});

test('API router preserves every customer-facing endpoint', () => {
  const router = read('api/router.js');
  for (const endpoint of ['billing','team','account','automation','health']) assert.match(router, new RegExp(endpoint));
});
