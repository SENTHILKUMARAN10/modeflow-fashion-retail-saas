const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const client=fs.readFileSync('supabase/client.js','utf8');
const auth=fs.readFileSync('supabase/auth-upgrade.js','utf8');
const realtime=fs.readFileSync('supabase/realtime-app.js','utf8');

test('Google OAuth uses Supabase google provider with redirect',()=>{
  assert.match(client,/signInWithOAuth\(\{provider:'google'/);
  assert.match(client,/redirectTo/);
});

test('email signup supplies verification redirect',()=>{
  assert.match(client,/emailRedirectTo:redirectTo/);
});

test('forgot password uses Supabase reset email redirect',()=>{
  assert.match(client,/resetPasswordForEmail\(email,\{redirectTo\}\)/);
});

test('verification resend uses Supabase signup resend flow',()=>{
  assert.match(client,/client\.auth\.resend\(\{type:'signup',email/);
});

test('password recovery is handled by dedicated recovery UI without prompt flow',()=>{
  assert.match(auth,/PASSWORD_RECOVERY/);
  assert.match(auth,/recoveryPassword/);
  assert.doesNotMatch(realtime,/PASSWORD_RECOVERY/);
});

test('production controller loads auth upgrade after core realtime controller',()=>{
  const realtimeIndex=client.indexOf("supabase/realtime-app.js");
  const authIndex=client.indexOf("supabase/auth-upgrade.js");
  assert.ok(realtimeIndex>=0 && authIndex>realtimeIndex);
});
