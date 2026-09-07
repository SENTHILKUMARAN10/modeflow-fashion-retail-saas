# ModeFlow production audit

This checklist separates what is enforced by the repository from what must be configured in Supabase or another production service.

## Enforced in code / migrations
- Supabase Auth with persistent sessions, email/password, Google OAuth and password recovery.
- Row Level Security for business data.
- Transactional checkout with stock locking and idempotency protection.
- Owner-only sensitive mutations.
- Audit logging for sensitive business changes.
- Realtime updates for products, customers, invoices and expenses.
- Privacy Policy and Terms pages.
- Mobile/tablet/desktop responsive UI.
- No service-role key in browser code.
- CI syntax/security checks.

## Production dashboard configuration still required
These cannot be safely completed from repository code because they require account-level settings or private credentials.

### Supabase SMTP
Configure a production SMTP provider under Supabase Auth email settings. Then test signup verification, resend verification and password reset using a real inbox.

### Backups
Enable the backup/PITR option appropriate to the Supabase plan. Record the recovery objective and perform a restore drill before a large paid rollout.

### Error monitoring
Connect a production error-monitoring service (for example Sentry or an equivalent) using the provider's project configuration. Do not commit private credentials.

### Custom domain
Use a production domain such as `app.modeflow.in` when ready and update Supabase Site URL / Redirect URLs and Google OAuth authorised origins accordingly.

## Required live acceptance test
Use two completely separate test owners (Business A and Business B).

1. Owner A creates Business A and adds Product A.
2. Owner B creates Business B and adds Product B.
3. Owner A must not be able to read/update/delete Product B, customers, invoices, expenses or audit logs.
4. Owner B must not be able to read/update/delete Business A data.
5. Complete one sale in each business and confirm stock changes only in that business.
6. Test a duplicate checkout retry and confirm only one invoice exists.
7. Test logout/login/session restore on Android Chrome and desktop Chrome/Firefox.
8. Test password reset and verification delivery through the configured SMTP provider.

Do not call the system fully production-certified until the live acceptance test, SMTP delivery test and backup restore drill are completed successfully.
