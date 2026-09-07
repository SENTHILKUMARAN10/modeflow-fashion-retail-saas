# ModeFlow production rollout

ModeFlow is a static web client backed by Supabase Auth, Postgres, RLS and Realtime. This document defines the minimum production rollout for a real business.

## 1. Required database migrations
Run these in order in the target Supabase project:

1. `supabase/schema.sql` (new environments only)
2. `supabase/migrations/20260907_modeflow_realtime.sql`
3. `supabase/migrations/20260907_modeflow_production_hardening.sql`

Do not expose a Supabase service-role or secret key in browser code. The checked-in `publishableKey` is intentionally public and must be protected by RLS.

## 2. Authentication
- Enable email confirmation for new accounts.
- Set the Site URL and Redirect URLs to the real ModeFlow production URL.
- Require passwords of at least 8 characters; prefer 12+ for business owners.
- Enable MFA in Supabase when available for owner accounts.
- Remove unused auth providers.

## 3. Database/security
- RLS must remain enabled on every business table.
- `create_business_with_owner`, `complete_sale`, and `delete_sale` are executable only by `authenticated` users.
- Invoice creation is transactional and stock is row-locked.
- Checkout uses an idempotency key to reduce duplicate sales during retries.
- Product, invoice, expense and membership mutations are written to `audit_logs`.
- Historical invoice items retain `cost_price` for correct profit reporting.

## 4. Operations
- Enable Supabase daily backups / PITR according to the business recovery requirement and plan level.
- Export business data regularly and test restore procedures.
- Review database usage, auth logs and errors weekly.
- Keep a staging Supabase project for future migrations before applying them to production.

## 5. Hosting
GitHub Pages can host the current static client, but a business production launch should ideally use a host that supports security headers, custom redirects and deployment previews. If GitHub Pages remains in use, keep HTTPS enforced and use a custom domain before public launch.

Recommended response headers when the host supports them:
- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`

## 6. Release checks
Before every release:
- GitHub Actions quality workflow passes.
- Run `supabase/production-healthcheck.sql` and confirm all checks.
- Test owner sign-up, email confirmation, sign-in, sign-out and password reset.
- Test product create/edit/archive.
- Test two-device realtime stock changes.
- Test a sale, verify invoice + stock movement + stock deduction.
- Simulate a repeated checkout request and confirm one invoice only.
- Test owner sale deletion and stock restoration.
- Verify manager/staff cannot perform owner-only actions.
- Verify profit uses historical item cost.
- Test offline mode: writes must be blocked until connectivity returns.
- Verify audit log entries for sensitive actions.

## 7. What production-grade means here
The hardening migration and client changes protect the critical billing/inventory path. A larger commercial rollout should additionally add an external error-monitoring service, automated end-to-end browser tests, a formal backup/restore drill, privacy/terms pages, support workflows, and business-specific tax/invoice compliance before onboarding paying customers.
