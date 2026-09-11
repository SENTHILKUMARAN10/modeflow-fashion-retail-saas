const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

function jsFiles(dir){
  if(!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const p=path.join(dir,entry.name);
    return entry.isDirectory()?jsFiles(p):(entry.isFile()&&entry.name.endsWith('.js')?[p]:[]);
  });
}

test('Vercel Hobby deployment stays below function-count limit',()=>{
  const functions=jsFiles('api');
  assert.ok(functions.length<=12,`api directory would create ${functions.length} functions`);
  assert.ok(functions.includes(path.join('api','router.js')),'consolidated API router is missing');
});

test('API router preserves every customer-facing endpoint',()=>{
  const router=fs.readFileSync('api/router.js','utf8');
  const required=[
    'health','client-error','upi-config','manual-payment','admin-payments','admin-payment-action',
    'account/delete','automation/status','automation/test-delivery','cron/automations',
    'billing/create-subscription','billing/verify-payment','billing/webhook','billing/status','billing/cancel','billing/change-plan','billing/sync',
    'team/invite','team/accept','team/list','team/update','team/remove','team/revoke-invite'
  ];
  for(const route of required) assert.ok(router.includes(`'${route}'`),`missing routed endpoint ${route}`);
  const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
  assert.ok(config.rewrites?.some(r=>r.source==='/api/:path*'&&r.destination.includes('/api/router')),'API rewrite to consolidated router is missing');
});
