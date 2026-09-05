# SaaS Architecture

## Product goal
Thatha Kadai Business OS is a multi-tenant billing and inventory SaaS for small retail businesses. The public demo runs without signup so recruiters can evaluate the UX instantly; the production architecture uses Supabase Auth + Postgres + Row Level Security.

## Frontend
- Responsive HTML/CSS/JavaScript dashboard
- Billing workflow with automatic stock deduction
- Inventory and reorder alerts
- Customer CRM generated from purchases
- Expense tracking and profit metrics
- Invoice history and WhatsApp sharing
- Local demo persistence for zero-friction portfolio access

## Production backend
Supabase is the recommended backend because it provides:
- Email/password and OAuth authentication
- PostgreSQL database
- Row Level Security (RLS)
- Realtime subscriptions
- Storage for logos/invoice assets
- Server-side functions when privileged logic is required

## Multi-tenancy
Every operational record contains `business_id`. Users join a business through `business_members` and receive one of three roles:
- owner: full control, team management, destructive actions
- manager: manage products, invoices and expenses
- staff: daily billing/customer operations

RLS policies guarantee that authenticated users can only read rows belonging to businesses they are members of. UI filtering alone is never treated as a security boundary.

## Core data model
`businesses -> products/customers/invoices/expenses/stock_movements`

`invoices -> invoice_items`

`businesses <-> users` is many-to-many through `business_members`.

## Invoice transaction design
In production, invoice creation should be performed through a database transaction or server-side function:
1. Validate membership and product stock.
2. Create/find customer.
3. Insert invoice and invoice items.
4. Decrement product stock.
5. Insert stock movement records.
6. Commit all changes atomically.

If any step fails, the transaction rolls back to avoid an invoice existing without matching inventory changes.

## Security decisions
- No production passwords, service-role keys or secrets belong in GitHub.
- Supabase anonymous keys may be exposed only with properly configured RLS; service-role keys remain server-side.
- Authorization is enforced in Postgres policies, not only in JavaScript.
- Owner-only destructive operations are protected with role checks.
- Inputs should be validated on both client and server/database boundaries.

## Scaling path
For larger deployments:
- Move PDF generation to an Edge Function.
- Use object storage for invoice PDFs and business logos.
- Add pagination and indexed queries for large invoice/customer datasets.
- Add audit log events for role changes and destructive operations.
- Add background jobs for scheduled reports and reminders.

## Interview explanation
A concise explanation:

> I started with a browser-only MVP to validate the billing and stock workflows. Then I redesigned it as a multi-tenant SaaS architecture using Supabase. Each row is scoped by a business ID and access is enforced through Postgres Row Level Security. I separated owner, manager and staff permissions, modeled invoices with line items and stock movements, and designed invoice creation to run atomically so billing and inventory cannot become inconsistent.

## Trade-offs
The portfolio demo deliberately retains local storage so a recruiter can open and test the product immediately. The `/supabase/schema.sql` file represents the production data/security architecture and can be connected to a Supabase project without committing secrets.