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

test('SalesDesk production workspace loads the consolidated market UI', () => {
  const index = read('index.html');
  const directLoader = read('ui/velora-final-v16.js');
  const responsive = read('responsive-device.js');
  assert.match(index, /SalesDesk/);
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
