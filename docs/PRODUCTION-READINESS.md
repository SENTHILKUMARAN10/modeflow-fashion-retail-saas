# SalesDesk Production Readiness Runbook

This runbook defines the release gates for SalesDesk. A green unit-test run alone is not enough for a customer launch.

## 1. Database and migration gate

- Apply migrations to a staging Supabase project first.
- Confirm `202609111300_salesdesk_production_hardening.sql` applies without errors.
- Confirm RLS remains enabled on every tenant-facing table.
- Confirm branch and warehouse ownership triggers reject cross-business references.
- Review `scripts/performance/query-plan.sql` against representative staging data and verify hot queries use expected indexes.

## 2. Tenant-isolation gate

Use two dedicated test accounts belonging to two completely separate test businesses. Store credentials only as protected environment/GitHub secrets.

Run:

```bash
npm run test:isolation
```

Pass condition: neither account can read the other business's records, membership, automation data, business profile, Daily Brief data, or perform a cross-tenant write.

## 3. Role-permission gate

Use dedicated test users. Repeat the verifier for manager, accountant, cashier, sales and staff. Never use customer credentials.

```bash
npm run test:roles
```

Pass condition: the database capability matrix exactly matches the intended role. UI visibility is not considered a security boundary.

## 4. End-to-end staging gate

Read-only smoke mode:

```bash
npm run test:e2e
```

For the full quote -> order -> invoice journey, enable writes only in a disposable staging workspace with `SALESDESK_E2E_ENV=staging` and the explicit write opt-in. The script refuses write mode outside staging.

Pass condition: landing page, health, auth, workspace data, Daily Brief, and the selected transactional journey complete without an authorization or data-integrity failure.

## 5. Backup and restore gate

Create a logical backup:

```bash
SUPABASE_DB_URL='...' scripts/backup/backup.sh
```

The backup process creates the dump, a SHA-256 checksum, and a critical-table row-count manifest. Store all three together in encrypted access-controlled storage.

Restore only into a disposable database:

```bash
BACKUP_FILE='./backups/salesdesk-....dump' \
RESTORE_TEST_DB_URL='...' \
ALLOW_DESTRUCTIVE_RESTORE_TEST=true \
scripts/backup/restore-test.sh
```

Pass condition: checksum is valid, restore completes, critical tables/functions exist, RLS is enabled, and restored table counts match the backup manifest. Delete the disposable restored customer data after verification.

## 6. Performance gate

Run k6 only against staging by default:

```bash
k6 run scripts/load/k6-salesdesk.js
```

The script refuses production-looking targets unless an explicit production-load opt-in is supplied. Transaction writes require an additional explicit opt-in and dedicated high-stock staging product.

Current baseline thresholds:

- overall error rate < 1%
- p95 request duration < 1500 ms
- p99 request duration < 3000 ms
- p95 authenticated dashboard requests < 1500 ms
- p95 sale call < 2200 ms

Do not raise thresholds simply to make a failed test green. Investigate query plans, indexes, payload size, N+1 queries and provider latency first.

## 7. Billing/automation gate

Before production release:

- Razorpay live keys and plan IDs must be configured in the deployment platform, never committed.
- Webhook signature verification must remain enabled.
- Run a real low-value test transaction and confirm subscription activation is driven by provider verification/webhook state.
- Test cancellation, renewal, failed-payment/past-due handling and plan change.
- Configure production email sender/provider.
- Configure Meta WhatsApp Cloud credentials and approved templates if WhatsApp automation is enabled.
- Configure the cron secret and confirm scheduled work executes once without duplicates.

## 8. Release gate

All of the following are required before merging the production branch to `main`:

- `npm run quality` passes.
- Staging migrations pass.
- Tenant isolation passes.
- Role verification passes for every supported non-owner role.
- Staging E2E passes.
- Backup + restore test passes.
- Staging load test meets thresholds.
- Production payment/email/WhatsApp configuration has been verified without exposing secrets.
- Legal/operator/support details are real and reachable.
- Monitoring and health checks are active.

After merge, perform one production deployment and run a read-only smoke test before announcing availability to customers.
