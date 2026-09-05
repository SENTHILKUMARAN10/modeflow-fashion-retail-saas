# Thatha Kadai Business OS

A responsive **multi-tenant Billing, Inventory & Business Management SaaS** designed for small retail businesses.

The project began as a real-world billing solution for a Sunday meat shop and was redesigned into a scalable SaaS product to demonstrate frontend engineering, UI/UX, database design, authentication architecture, role-based authorization and business analytics.

## Live demo

https://thatha-kadai-billing.senthilkumaran539.chatgpt.site

> The portfolio demo intentionally supports instant access and browser storage so recruiters can test the complete workflow without creating an account. The repository also includes the production Supabase/PostgreSQL SaaS architecture.

## Core features

- Business performance dashboard
- Invoice generation
- Automatic inventory deduction after billing
- Product and stock management
- Low-stock/reorder alerts
- Customer CRM and purchase history
- Expense management
- Revenue and estimated-profit analytics
- Invoice history
- WhatsApp invoice sharing
- Responsive desktop/mobile UI
- Multi-business SaaS database architecture
- Owner, manager and staff roles
- PostgreSQL Row Level Security for tenant isolation
- Stock movement/audit-ready data model

## SaaS architecture

### Frontend

- HTML5
- CSS3
- JavaScript
- Responsive dashboard UI
- LocalStorage demo adapter

### Production backend design

- Supabase Auth
- PostgreSQL
- Row Level Security (RLS)
- Multi-tenant `business_id` data isolation
- Role-based authorization
- Relational invoice + invoice-item model
- Stock movement ledger

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for system-design decisions and interview talking points.

See [`supabase/schema.sql`](./supabase/schema.sql) for the production database schema and security policies.

## Data model

```text
users
  │
  └── business_members ── businesses
                           ├── products
                           ├── customers
                           ├── invoices ── invoice_items
                           ├── expenses
                           └── stock_movements
```

Every operational record belongs to a business. Database RLS policies prevent users from accessing another business's data.

## Roles

| Role | Permissions |
| --- | --- |
| Owner | Full business control, members, products, invoices, expenses and destructive actions |
| Manager | Manage products, invoices, stock and expenses |
| Staff | Daily billing and customer operations |

## Important engineering decisions

### 1. Multi-tenancy
Rather than building a separate application/database for every shop, records are scoped using `business_id`. A membership table connects authenticated users to businesses.

### 2. Security at the database layer
Frontend route hiding is not considered authorization. Supabase/PostgreSQL Row Level Security determines which rows each authenticated user can read or modify.

### 3. Transaction-safe billing
The production billing flow is designed to create invoice records, invoice line items, stock deductions and stock movement logs in one atomic transaction. This prevents inventory and billing from becoming inconsistent.

### 4. Recruiter-friendly demo mode
A recruiter should not need credentials simply to review a portfolio project. Therefore the hosted portfolio demo remains immediately accessible while the repository documents the secure production architecture separately.

## Business workflow

1. Owner creates products and defines prices/reorder levels.
2. Staff selects a customer and items during billing.
3. System calculates invoice totals.
4. Invoice is created.
5. Inventory is reduced automatically.
6. Customer purchase history updates.
7. Revenue and dashboard metrics update.
8. Low stock generates an alert.
9. Invoice can be shared through WhatsApp.

## Problem solved

Small businesses frequently maintain sales, inventory, customer details and expenses in separate notebooks or spreadsheets. Thatha Kadai Business OS combines those workflows into one simple dashboard, reducing duplicate entry and giving the owner an immediate view of revenue, stock and expenses.

## What I learned

- Designing a responsive SaaS dashboard
- Turning real business requirements into UI workflows
- Relational database modeling
- Multi-tenant application architecture
- Authentication vs authorization
- PostgreSQL Row Level Security
- Inventory consistency and transaction design
- Building recruiter-friendly product demos

## Future roadmap

- Connect hosted UI to Supabase Auth/database
- Transactional invoice RPC / Edge Function
- GST/tax configuration
- PDF invoice generation
- Business logo/custom invoice templates
- CSV/PDF reports
- Monthly sales reports
- Advanced charts and date filters
- Staff invitations
- Audit logs
- Offline-first/PWA support

## Interview summary

**30-second explanation:**

> Thatha Kadai Business OS is a billing and inventory SaaS I designed from a real small-business requirement. It handles invoices, automatic stock deduction, customer history, expenses and analytics. I first built the workflow as a frontend MVP, then designed a production multi-tenant backend using Supabase and PostgreSQL. Every business record is tenant-scoped, and Row Level Security enforces owner, manager and staff permissions at the database layer.

## Resume description

**Business Billing & Inventory SaaS — Frontend / SaaS Project**

Designed and developed a responsive business-management SaaS for invoicing, inventory, customer CRM, expense tracking and sales analytics. Architected a multi-tenant PostgreSQL/Supabase data model with role-based authorization and Row Level Security, automatic inventory updates and WhatsApp invoice sharing.

## Repository

https://github.com/SENTHILKUMARAN10/thatha-kadai
