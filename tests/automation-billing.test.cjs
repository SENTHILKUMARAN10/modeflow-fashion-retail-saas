const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('automation migration contains recurring work, delivery ledger and service-only processors',()=>{
  const sql=read('supabase/migrations/202609111130_salesdesk_automation_billing_completion.sql');
  for(const token of ['billing_events','automation_deliveries','recurring_expense_schedules','recurring_invoice_schedules','scheduled_reports','automation_executions','salesdesk_process_recurring_expense','salesdesk_process_recurring_invoice','salesdesk_report_snapshot'])assert.ok(sql.includes(token),`missing ${token}`);
  assert.ok(!sql.includes('placeholder removed'),'migration still contains the temporary placeholder marker');
  assert.match(sql,/s\.status='active'/);
  assert.doesNotMatch(sql,/s\.status\s+in\s*\([^)]*authenticated/i,'authenticated checkout must not unlock paid writes');
  assert.match(sql,/grant execute on function public\.salesdesk_process_recurring_invoice[\s\S]*service_role/i);
});

test('branch recurring invoices update branch warehouse balances',()=>{
  const sql=read('supabase/migrations/202609111132_salesdesk_recurring_branch_inventory.sql');
  for(const token of ['inventory_balances','warehouse_id','v_wh_default','not w.is_default','Recurring invoice'])assert.ok(sql.includes(token),`missing ${token}`);
});

test('email and WhatsApp delivery adapters are server-side and template based',()=>{
  const js=read('api/automation/_delivery.js');
  assert.ok(js.includes('RESEND_API_KEY'));
  assert.ok(js.includes('WHATSAPP_ACCESS_TOKEN'));
  assert.ok(js.includes('WHATSAPP_PHONE_NUMBER_ID'));
  assert.ok(js.includes("type:'template'"));
  assert.ok(js.includes('automation_deliveries'));
  assert.ok(js.includes('Idempotency-Key'));
});

test('automation worker requires cron secret and processes recurring work and scheduled reports',()=>{
  const js=read('api/cron/automations.js');
  assert.ok(js.includes('CRON_SECRET'));
  for(const token of ['salesdesk_process_recurring_expense','salesdesk_process_recurring_invoice','scheduled_reports','deliverMessage','invoice_overdue','low_stock','daily_brief','weekly_report'])assert.ok(js.includes(token),`missing ${token}`);
});

test('subscription activation requires captured provider payment and webhooks are idempotent',()=>{
  const verify=read('api/billing/verify-payment.js'),webhook=read('api/billing/webhook.js');
  assert.ok(verify.includes("payment.status!=='captured'"));
  assert.ok(verify.includes('verifyHmac'));
  assert.ok(webhook.includes("x-razorpay-event-id"));
  assert.ok(webhook.includes('billing_events'));
  assert.ok(webhook.includes('payment.failed'));
  assert.ok(webhook.includes('subscription.charged'));
});

test('plan changes are scheduled at cycle end and cancellation preserves access until provider event',()=>{
  const change=read('api/billing/change-plan.js'),cancel=read('api/billing/cancel.js');
  assert.ok(change.includes("schedule_change_at:'cycle_end'"));
  assert.ok(change.includes('pending_plan_interval'));
  assert.ok(cancel.includes('cancel_at_period_end:true'));
  assert.ok(!cancel.includes("status:'cancelled'"),'cancel endpoint must not prematurely revoke access');
});

test('automation center is loaded and billing UI does not treat authenticated as active access',()=>{
  const loader=read('responsive-device.js'),ui=read('ui/salesdesk-automation-center-v1.js'),billing=read('account-pages-v1.js');
  assert.ok(loader.includes('salesdesk-automation-center-v1.css'));
  assert.ok(loader.includes('salesdesk-automation-center-v1.js'));
  for(const token of ['Recurring invoices','Recurring expenses','Scheduled reports','WhatsApp'])assert.ok(ui.includes(token),`missing ${token}`);
  assert.ok(billing.includes("pendingActivation=status==='authenticated'"));
  assert.ok(!billing.includes("['active','authenticated'].includes"));
  assert.ok(billing.includes('/api/billing/change-plan'));
  assert.ok(billing.includes('/api/billing/sync'));
});

test('production scheduler invokes only the protected cron endpoint',()=>{
  const yml=read('.github/workflows/salesdesk-automation-cron.yml');
  assert.ok(yml.includes('SALESDESK_CRON_SECRET'));
  assert.ok(yml.includes('/api/cron/automations'));
  assert.ok(yml.includes("cron: '7 * * * *'"));
});
