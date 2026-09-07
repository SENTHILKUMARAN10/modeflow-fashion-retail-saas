# ModeFlow commercial readiness

## Completed in the product
- Privacy Policy and Terms of Service are public from the login screen.
- First-login onboarding explains Products → New Sale → Analytics.
- Google and email/password auth are wired through Supabase.
- Password reset and email verification flows are wired in the app.
- Business data is scoped by business membership and Row Level Security.
- Production UI no longer exposes demo workspaces.

## Required Supabase dashboard settings before charging customers

### 1. Custom SMTP
ModeFlow already calls Supabase reset-password and verification APIs. For reliable commercial email delivery, configure a custom SMTP provider in Supabase Authentication email settings. Do not store SMTP passwords in this repository.

Verify after setup:
1. Create a new email account.
2. Receive the verification message.
3. Use Forgot password.
4. Receive the reset message.
5. Complete password reset and sign in again.

### 2. Backups
Enable the backup / point-in-time recovery level available for the Supabase plan used for production. Keep a documented restore procedure and perform a restore test before onboarding paying customers.

At minimum, export critical business data regularly and keep backups outside the production database.

### 3. Multi-user isolation smoke test
Use two real test accounts in separate browsers/incognito sessions.

Account A:
- create Product A-only
- create Customer A-only
- create Sale A-only
- create Expense A-only

Account B:
- confirm none of Account A's records are visible
- create B-only equivalents

Return to Account A and confirm none of Account B's records are visible.

Also verify a staff/manager account only has the actions permitted by its role.

## Release rule
Do not call the service fully commercial-ready until custom SMTP is verified, a production backup/restore process is enabled and tested, and the two-account isolation smoke test passes.