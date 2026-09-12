# Salesventory

> **Inventory today. A bigger tomorrow.**

Salesventory is a cloud business-management and inventory SaaS for boutiques, drapers, studios and small retail shops. It brings sales, inventory, customers, services, expenses and business insights into one calm workspace.

This repository contains the production application (a single self-contained frontend), Supabase migrations with Row Level Security, protected API services (billing, team, automation), deployment configuration and automated verification workflows.

## Quick start

The frontend has no build step. Serve the repository root (any static host, or `vercel dev`) and open `index.html`:

- **Demo mode** — click **Try the demo workspace** to explore a fully seeded fashion-retail store (sarees, kurtas, bridal sets, tailoring services) with zero setup.
- **Cloud mode** — sign in with a Supabase account. The first sign-in creates your workspace; billing status is enforced through the secure API (see below).

## Frontend structure

| File | Purpose |
| --- | --- |
| `index.html` | Single-page shell: login, dashboard, sales, catalogue, customers, expenses, transactions, analytics, plans & billing |
| `app.css` | One tokenized design system (plus Jakarta Sans / DM Serif Display), responsive, print + reduced-motion aware |
| `app.js` | One controller: routing, store, cart/checkout, KPI dashboard, reports, roles, plans & billing |
| `cloud.js` | `window.SDCloud` — Supabase auth, workspaces, CRUD, stock-guarded `complete_sale`/`delete_sale` RPCs, realtime |
| `supabase/config.js` | Publishable Supabase config (set your project URL + anon key here) |

## Backend

- `supabase/` — schema, RLS policies, security-definer RPCs and migrations (apply with `supabase db push`).
- `api/` + `server/` — Vercel serverless functions: billing (Razorpay subscriptions, UPI/manual payment verification), team invites, automation delivery, health, admin payment review.
- `scripts/` — tenant-isolation and role-security verification, E2E API smoke, backup helpers.

## Billing notes

Plan status is enforced server-side. The UI treats `authenticated` / `created` as **activation pending** and never as paid access; only `active` unlocks the paid workspace. Manual UPI payments are reviewed by an admin before activation.

## Verification

Requires Node.js ≥ 20.

```bash
npm run test:syntax   # node --check on every frontend/server file
npm test              # 84-test suite (frontend, migrations, server contracts)
npm run test:isolation  # tenant-isolation verification against a connected Supabase project
npm run test:roles     # role-security verification against a connected Supabase project
```

The test suite asserts the security invariants: no `service_role` secrets in the frontend, role-capability gating for staff/manager/owner, idempotent checkout, and billing activation rules.

## Release discipline

Customer releases are validated in Preview and promoted to `main` only after the production-readiness checks pass.